import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import { SCREENPLAY_AGENT_PROMPT } from '../src/prompt.js'
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

  it('exposes only the screenplay domain tools', () => {
    const names = screenplayToolDefinitions({} as Context).map(tool => tool.name)
    expect(names).toEqual([
      'screenplay_list_references',
      'screenplay_get_reference_structure',
      'screenplay_read_reference_selection',
      'screenplay_search_reference_selection',
      'screenplay_get_state',
      'screenplay_diagnose',
      'screenplay_create_contract',
      'screenplay_create_outline',
      'screenplay_create_episode_outline_batch',
      'screenplay_get_writing_context',
      'screenplay_create_episode',
      'screenplay_merge_delivery',
      'screenplay_prepare_change',
      'screenplay_save_change',
      'screenplay_discard_change',
      'screenplay_restore_version',
    ])
    expect(names).not.toContain('bash')
    expect(names).not.toContain('run_code')
  })

  it('ships the selected prompt and the question interaction row', async () => {
    const preset = await readFile(new URL('../managed-presets/screenplay-v1/agent.cordis.yml', import.meta.url), 'utf8')
    expect(preset).toContain('name: dsh-short-drama/agent')
    expect(preset).toContain("name: '@deepseek-ai/dsh-tool-ask-user'")
    expect(preset).not.toContain('tool-bash')
    expect(preset).not.toContain('subagent')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不得主动搜索、遍历或读取 Workspace 文件')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不得主动搜索、遍历或读取 Workspace 文件')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('项目已经“prepared/bound”且 phase 为 Intake')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不得再次要求用户点击“新建剧本项目”')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_save_change')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_create_contract')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_create_outline')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_create_episode_outline_batch')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_get_writing_context')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_create_episode')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_merge_delivery')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('screenplay_finalize_outline_bundle')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('确认生成本批集纲')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('确认生成完整大纲和集纲')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('大纲/full-outline.md')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('分集大纲/episode-outlines.md')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('前 N 集大纲')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('项目文件夹名同时也是全项目唯一的正式标题和故事片名')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('每集成片时长和单集剧本字数采用哪一档？')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('90 秒/集（约 1200-1500 字）')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('60 秒/集（约 800-1200 字）')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('120 秒/集（约 1200-1800 字）')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('320-380 字')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('讨论全剧主线和分集推进')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('每轮最多处理一个连续集纲批次')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('用户说“第 1-3 集”就提交第 1-3 集')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('只有用户没有明确批次范围或数量时，才调用 ask_user_question')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('生成 3 集”“生成 5 集”“生成最多 10 集”和“自定义集数”四个选项')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('“前 N 集”表示项目已经确认的总集数')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('直接写入正式大纲文件')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('立即结束本轮并等待用户下一步指令')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不得把内容称为“讨论稿”“草稿”')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('后续修改只能针对已经存在的正式文件')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('核心冲突')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('微反转/钩子')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('确认并创建全部文件')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不能自行宣布“方向已确认”')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('首次创建没有审批')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('只有用户明确指出要修改已有文件或其中某一部分时')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('必须立即调用 ask_user_question')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('只修改角色文件')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('同步修改相关文件')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('取消本次改名')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不得搜索 Workspace')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('renameTo')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('每轮最多执行一个有状态的短剧操作')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不一次性产出整个项目')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('新素材或新需求的第一轮先直接分析用户输入')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('# 《项目文件夹名》短剧风格与创作规则')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('人物/主要人物/<角色名>.md')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('- **年龄**：')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('- **外貌**：')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('- **成长弧光**：')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('- **代表名场面**：')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('不得把多个字段压成一段话')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('# 《项目文件夹名》核心设定')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('screenplay_stage_artifact')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('screenplay_create_diff')
    expect(SCREENPLAY_AGENT_PROMPT).not.toContain('打脸框')
    // 方法论融合断言
    expect(SCREENPLAY_AGENT_PROMPT).toContain('## 方法论参考（短剧编剧方法论）')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('五元组')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('四幕二十拍')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('中性事件镜像')
    expect(SCREENPLAY_AGENT_PROMPT).toContain('screenplay_diagnose')
  })
})
