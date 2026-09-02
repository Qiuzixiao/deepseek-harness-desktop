import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import { SCREENPLAY_AGENT_PROMPT } from '../src/prompt.js'
import { explicitAbsolutePaths, skillCreateInstruction } from '../src/agent.js'
import { screenplayToolDefinitions } from '../src/tools.js'

describe('screenplay-v1 composition', () => {
  it('does not rely on persisted custom session events (rc.2 out-of-repo constraint)', () => {
    // rc.2 的 KNOWN_SESSION_EVENT_TYPES 是仓库内生成集合，外部插件事件没有注册面
    // （见 dsh-session known-event-types 文档）；append 无法打 ignorable 标记，
    // 因此持久化自定义事件会导致重启拒读。内核的持久化权威源是 .screenplay/state.json。
    expect(KNOWN_SESSION_EVENT_TYPES).toEqual(expect.objectContaining({
      has: expect.any(Function),
    }))
    expect([
      'screenplay/project-binding',
      'screenplay/project-prepared',
      'screenplay/state-snapshot',
    ].every(type => KNOWN_SESSION_EVENT_TYPES.has(type))).toBe(false)
  })

  it('exposes domain tools for open project-scoped authoring', () => {
    const definitions = screenplayToolDefinitions({} as Context)
    const names = definitions.map(tool => tool.name)
    expect(names.slice(0, 7)).toEqual([
      'read_project_context',
      'read_artifact',
      'search_project',
      'skill_inspect',
      'skill_create',
      'write_scene',
      'validate_episode',
    ])
    expect(names).toEqual(expect.arrayContaining([
      'screenplay_list_references',
      'screenplay_get_reference_structure',
      'screenplay_read_reference_selection',
      'screenplay_search_reference_selection',
      'screenplay_read_reference_document',
      'screenplay_merge_delivery',
      'screenplay_prepare_change',
      'screenplay_save_change',
      'screenplay_discard_change',
      'screenplay_restore_version',
    ]))
    expect(names).not.toContain('bash')
    expect(names).not.toContain('run_code')

    const createContract = definitions.find(tool => tool.name === 'screenplay_create_contract')
    const parameters = createContract?.parameters as {
      properties?: {
        requirements?: { required?: string[] }
        mainCharacters?: { items?: { required?: string[] } }
      }
    }
    expect(parameters.properties?.requirements?.required).toEqual([
      'genre', 'audience', 'episodeCount', 'episodeDurationSeconds', 'premise', 'endingDirection',
    ])
    expect(parameters.properties?.mainCharacters?.items?.required).toEqual(['name', 'content'])
  })

  it('ships the open-agent composition and minimal runtime prompt', async () => {
    const preset = await readFile(new URL('../managed-presets/screenplay-v1/agent.cordis.yml', import.meta.url), 'utf8')
    expect(preset).toContain('name: dsh-short-drama/agent')
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-ask-user'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-skill-filesystem'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-skill'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-fs'")
    expect(preset).toContain('allowMutations: false')
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-fs-search'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-todo'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-plan-mode'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-subagent'")
    expect(preset).toContain('toolFilter:\n      allow:\n        - read')
    expect(preset).not.toContain('tool-bash')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('open loop')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('creative direction')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('project files as facts')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('Skill')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('skill_source_inspect')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('skill_source_read')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('M1-M7')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('不得主动搜索')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('四幕二十拍')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('确认生成本批集纲')
  })

  it('turns the explicit skill-create command into a bounded model instruction', () => {
    expect(skillCreateInstruction('')).toContain('只读取用户明确提供或选择的资料')
    expect(skillCreateInstruction('只关注对白风格')).toContain('用户补充要求：只关注对白风格')
    expect(skillCreateInstruction('')).toContain('直接安装 Skill')
    expect(skillCreateInstruction('')).not.toContain('草稿')
    expect(skillCreateInstruction('')).not.toContain('等待用户确认')
  })

  it('recognizes POSIX, Windows drive and UNC Skill source paths', () => {
    expect(explicitAbsolutePaths('读取 /tmp/source.md')).toContain('/tmp/source.md')
    expect(explicitAbsolutePaths('读取 "C:\\Users\\writer\\source notes.docx"')).toContain('C:\\Users\\writer\\source notes.docx')
    expect(explicitAbsolutePaths('读取 \\\\server\\share\\source.pdf')).toContain('\\\\server\\share\\source.pdf')
  })
})
