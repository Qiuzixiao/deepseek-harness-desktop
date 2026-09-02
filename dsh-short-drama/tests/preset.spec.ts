import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import * as agentEntry from '../src/agent.js'
import * as packageEntry from '../src/index.js'
import { SCREENPLAY_AGENT_PROMPT } from '../src/prompt.js'

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

  it('does not register screenplay content or validation tools', () => {
    const registered: string[] = []
    const context = {
      systemPrompt: { section() {}, context() {} },
      tools: { register(tool: { name: string }) { registered.push(tool.name) } },
      on() {},
      screenplayProjects: {},
    } as unknown as Context

    agentEntry.apply(context)

    expect(registered).toEqual(['move', 'delete'])
    expect(registered.some(name => name.startsWith('screenplay_'))).toBe(false)
  })

  it('keeps the package root on the current Agent entry instead of the legacy Host', () => {
    expect(packageEntry.name).toBe(agentEntry.name)
    expect(packageEntry.apply).toBe(agentEntry.apply)
    expect(packageEntry).not.toHaveProperty('ScreenplayProjectService')
    expect(packageEntry).not.toHaveProperty('ScreenplayProjectStore')
  })

  it('ships the open-agent composition and minimal runtime prompt', async () => {
    const preset = await readFile(new URL('../managed-presets/screenplay-v1/agent.cordis.yml', import.meta.url), 'utf8')
    const desktopPreset = await readFile(new URL('../../dsh-plugin-desktop/resources/agent-presets/short-drama/agent.cordis.yml', import.meta.url), 'utf8')
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-web'")
    expect(desktopPreset).toContain("name: '@deepseek-ai/dsh-tool-web'")
    expect(preset).toContain('name: dsh-short-drama/agent')
    expect(preset).toContain("name: '@deepseek-ai/dsh-skill-filesystem'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-skill'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-fs'")
    expect(preset).toContain('allowMutations: true')
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-fs-search'")
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-ask-user'")
    expect(desktopPreset).toContain("name: '@deepseek-ai/dsh-tool-ask-user'")
    expect(preset).not.toContain("name: '@deepseek-ai/dsh-tool-todo'")
    expect(preset).not.toContain("name: '@deepseek-ai/dsh-plan-mode'")
    expect(preset).not.toContain("name: '@deepseek-ai/dsh-tool-subagent'")
    expect(preset).not.toContain('tool-bash')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('open loop')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('creative direction')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('project files as facts')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('Skill')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('write')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('edit')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('move')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('delete')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('arguments as a JSON\nobject')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('inspect the existing project tree')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('User-specified path')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('Do not create a complete empty directory tree')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('Do not create a structure-planning document')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('user-owned creative choice')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('Never use it to ask permission to write')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('one concise question at a time')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('If the user cancels')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('explicitly confirmed the exact file')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('screenplay_')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('validate_episode')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('2-6')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('skill_source_inspect')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('skill_source_read')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('M1-M7')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('不得主动搜索')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('四幕二十拍')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('channel-B')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('确认生成本批集纲')
  })
})
