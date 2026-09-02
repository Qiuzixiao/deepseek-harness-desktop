import { mkdir, readFile, readdir, rm, mkdtemp, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import { Session } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineTool } from '@deepseek-ai/dsh-tools'
import { installScreenplayProjectScopeGuard } from '../src/agent.js'
import { ScreenplayProjectService } from '../src/service.js'
import { screenplayToolDefinitions } from '../src/tools.js'
import type { CreateScreenplayArtifactsInput } from '../src/types.js'

const roots: string[] = []

function fakeContext(): Context {
  return { reflect: { provide() {} } } as unknown as Context
}

function session(id: string, cwd: string): Session {
  return Session.create(id as never, [], {
    version: 0,
    id: id as never,
    createdAt: Date.now(),
    cwd,
  })
}

function contract(title: string): string {
  return [
    `# 《${title}》短剧风格与创作规则`,
    '## 一、项目定位',
    '## 二、核心故事与总规划',
    '## 三、人物与关系设定',
    '## 四、节奏规则（硬性要求）',
    '## 五、台词规则',
    '## 六、反转设计规则',
    '## 七、情绪曲线规则',
    '## 八、画面与叙事规则',
    '## 九、内容红线与连续性边界',
    '## 十、交付要求',
    '## 十一、待确认事项',
  ].join('\n')
}

function setting(title: string): string {
  return [
    `# 《${title}》核心设定`,
    '## 一、故事世界观',
    '## 二、核心设定',
    '## 三、关键地点',
    '## 四、关键道具（伏笔体系）',
    '## 五、时间线',
    '## 六、风格底色（一句话）',
  ].join('\n')
}

function character(name: string): string {
  return [
    `# ${name}（主要角色）`,
    '## 一句话记忆点',
    '待确认',
    '## 基本信息',
    '- **年龄**：待确认',
    '- **身份**：待确认',
    '- **外貌**：待确认',
    '- **口头禅**：待确认',
    '## 性格特质',
    '- **核心性格**：待确认',
    '- **行为习惯**：待确认',
    '- **内在矛盾**：待确认',
    '- **成长弧光**：待确认',
    '## 关键经历',
    '- 待确认',
    '## 人物关系',
    '- **关系对象**：待确认',
    '## 记忆点标签',
    '- **标志动作**：待确认',
    '- **弱点软肋**：待确认',
    '- **代表名场面**：待确认',
    '- **核心标签**：待确认',
  ].join('\n')
}

function artifacts(title: string): CreateScreenplayArtifactsInput {
  return {
    contractContent: contract(title),
    settingContent: setting(title),
    mainCharacters: [{ name: '顾北辰', content: character('顾北辰') }],
    otherCharactersContent: [
      '# 其他关键角色（配角）',
      '## 林母',
      '- **身份**：母亲',
      '- **性格**：直接',
      '- **记忆点**：旧照片',
      '- **作用**：推动冲突',
      '## 角色关系图（简要）',
    ].join('\n'),
  }
}

const requirements = {
  genre: '都市情感',
  audience: '成年短剧用户',
  episodeCount: 12,
  episodeDurationSeconds: 120,
  premise: '创业者在真相公开前修复家庭关系。',
  endingDirection: '完成关系修复并公开真相。',
  constraints: [],
}

function fullOutlineFor(title: string): string {
  return [
    `# 《${title}》全剧大纲`,
    '',
    '主角在家庭秘密和现实压力之间重新确认目标，逐步面对真相并完成选择。',
    '',
    '外部阻力持续改变关系和行动方向，最终在危机中解决核心矛盾。',
  ].join('\n').concat('\n')
}

function episodeOutlinesFor(title: string, count: number): string {
  const lines = [
    `# 《${title}》前 ${String(count)} 集大纲`,
    '',
    '> 单元结构：连续推进主线冲突。',
    '> 每集核心公式：开场钩子 → 冲突升级 → 情绪爆发 → 结尾悬念。',
    '',
    '---',
  ]
  for (let episode = 1; episode <= count; episode += 1) {
    lines.push(
      '',
      `## 第 ${String(episode)} 集《推进${String(episode)}》`,
      '',
      '**核心冲突**：主角必须在真相和现实压力之间做出选择。',
      '**情绪定位**：压力增加，态度发生变化。',
      '- 钩子开场：新信息打断原有安排。',
      '- 冲突升级：对手迫使主角采取行动。',
      '- 情绪爆发：主角公开表达立场。',
      '- **微反转/钩子**：新证据留下下一集问题。',
    )
  }
  lines.push('', '---', '', `## 后续主线预告（${String(count)} 集内定向）`, '', '- 继续追查证据。')
  return lines.join('\n').concat('\n')
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('ScreenplayProjectService episode authoring', () => {
  it('writes the formal episode immediately and leaves validation optional', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-scene-authoring-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const current = session('scene-authoring', parent)
    const created = await service.createContractForSession(
      current, parent, 0, 'scene-contract', '场景短剧', requirements, artifacts('场景短剧'),
    )
    const projectRoot = created.binding.projectRoot
    await service.createOutlineBundle(projectRoot, 1, 'scene-outline', {
      outlineContent: fullOutlineFor('场景短剧'),
      episodeOutlinesContent: episodeOutlinesFor('场景短剧', 12),
    })

    const invalid = await service.writeEpisodeForSession(
      current,
      2,
      'episode-direct-invalid',
      1,
      '第1集\n\n1-1 客厅 清晨 内\n人物：顾北辰\n△动作',
      { endingState: '草稿内容已写入', openLoops: [] },
    )
    expect(invalid).toMatchObject({ ok: true, episode: 1, stage: 'EpisodeReady' })
    await expect(service.readArtifactForSession(current, '剧本/第001集.md')).resolves.toMatchObject({ source: 'formal' })
    await expect(service.validateEpisodeForSession(current, 1)).resolves.toMatchObject({ ok: false, issues: [{ channel: 'A' }] })
    await expect(readFile(join(projectRoot, '剧本', '第001集.md'), 'utf8')).resolves.toContain('△动作')
  })

  it('rejects project-relative traversal in domain artifact reads', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-artifact-scope-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const current = session('artifact-scope', parent)
    await expect(service.readArtifactForSession(current, '../outside.md')).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
  })

  it('edits an existing file in one operation without a validation gate', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-direct-edit-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const current = session('direct-edit', parent)
    const created = await service.createContractForSession(
      current, parent, 0, 'direct-edit-contract', '直接修改短剧', requirements, artifacts('直接修改短剧'),
    )
    const projectRoot = created.binding.projectRoot
    await service.createOutlineBundle(projectRoot, 1, 'direct-edit-outline', {
      outlineContent: fullOutlineFor('直接修改短剧'),
      episodeOutlinesContent: episodeOutlinesFor('直接修改短剧', 12),
    })
    await service.writeEpisodeForSession(
      current, 2, 'direct-edit-episode', 1,
      '第1集\n\n1-1 客厅 清晨 内\n人物：顾北辰\n△动作\n顾北辰：开始\n【卡点：秘密】\n【本集完】',
      { endingState: '结尾', openLoops: [] },
    )

    const edited = await service.editFile(projectRoot, 3, 'direct-edit-file', {
      path: '剧本/第001集.md',
      content: '这段内容故意不符合正文格式，但用户要求应立即保存。',
    })
    expect(edited.result).toMatchObject({ ok: true, transitionedThrough: 'ChangeSaved' })
    await expect(readFile(join(projectRoot, '剧本', '第001集.md'), 'utf8'))
      .resolves.toContain('这段内容故意不符合正文格式')
  })
})

describe('ScreenplayProjectService project bindings', () => {
  it('recognizes a Zenwit-created project metadata marker as prepared intake', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-zenwit-prepared-'))
    roots.push(parent)
    const projectRoot = join(parent, 'Zenwit短剧')
    await mkdir(join(projectRoot, '.zenwit-project'), { recursive: true })
    await writeFile(join(projectRoot, '.zenwit-project', 'project.json'), JSON.stringify({ version: 2, agentId: 'short-drama' }))
    const service = new ScreenplayProjectService(fakeContext())
    const current = session('zenwit-prepared-session', projectRoot)

    expect(service.contextSummary(current)).toContain('project folder is prepared and bound')
    const created = await service.createContractForSession(
      current, parent, 0, 'zenwit-prepared-contract', undefined, requirements, artifacts('Zenwit短剧'),
    )

    expect(created.binding.projectRoot).toBe(projectRoot)
    expect(await readFile(join(projectRoot, '创作合同', '创作合同.md'), 'utf8'))
      .toBe(`${contract('Zenwit短剧')}\n`)
  })

  it('previews only uploaded files from the selected project reference folder', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-reference-preview-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const prepared = await service.prepareProject(parent, '参考资料预览')
    const current = session('reference-preview-session', prepared.projectRoot)
    await service.saveReferencesForSession(current, [{
      originalName: '人物资料.txt',
      bytesBase64: Buffer.from('人物资料正文').toString('base64'),
      selection: { purpose: 'character-construction', scope: { kind: 'full' } },
    }])

    await expect(service.readReferencePreviewForSession(
      current,
      join(prepared.projectRoot, '参考文件', '人物资料.txt'),
    )).resolves.toMatchObject({ format: 'text', content: '人物资料正文' })
    await expect(service.readReferencePreviewForProject(
      prepared.projectRoot,
      join(prepared.projectRoot, '.screenplay', 'references', 'manifest.json'),
    )).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    await expect(service.readReferencePreviewForProject(
      prepared.projectRoot,
      join(parent, '越界.txt'),
    )).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
  })

  it('prepares a unique project directory for the desktop Workspace flow', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-prepare-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())

    const prepared = await service.prepareProject(parent, '桌面创建短剧')

    expect(prepared.projectRoot).toBe(join(parent, '桌面创建短剧'))
    expect((await stat(join(prepared.projectRoot, '.screenplay', 'launcher'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '创作合同'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '参考文件'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '设定'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '人物', '主要人物'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '人物', '其他人物'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '大纲'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '分集大纲'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '剧本'))).isDirectory()).toBe(true)
    expect((await stat(join(prepared.projectRoot, '交付'))).isDirectory()).toBe(true)
    expect(JSON.parse(await readFile(join(prepared.projectRoot, '.screenplay', 'layout.json'), 'utf8')))
      .toEqual({ layout: 'zh-CN-v1' })
  })

  it('treats a desktop-prepared folder as bound intake before formal files exist', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-prepared-intake-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const prepared = await service.prepareProject(parent, '已准备短剧')
    const current = session('prepared-intake-session', prepared.projectRoot)

    expect(service.contextSummary(current)).toContain('project folder is prepared and bound')
    expect((await service.snapshotForSession(current)).phase).toBe('Intake')

    await service.bindPreparedProject(current, prepared.projectRoot, '已准备短剧')

    expect(service.contextSummary(current)).toContain('project folder is prepared and bound')
    expect(service.contextSummary(current)).toContain('- project: 已准备短剧')
    expect(service.contextSummary(current)).not.toContain('No screenplay project folder is bound')
    expect(await service.snapshotForSession(current)).toEqual({
      initialized: false,
      phase: 'Intake',
      revision: 0,
      projectName: '已准备短剧',
      projectRoot: prepared.projectRoot,
      prepared: true,
    })

    const restored = Session.create(current.id, current.events, current.header)
    const resumed = new ScreenplayProjectService(fakeContext())
    expect(resumed.contextSummary(restored)).toContain('project folder is prepared and bound')
    expect((await resumed.snapshotForSession(restored)).projectRoot).toBe(prepared.projectRoot)
  })

  it('rejects binding a prepared folder to a different Session Workspace', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-prepared-mismatch-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const prepared = await service.prepareProject(parent, '准备项目')

    await expect(service.bindPreparedProject(
      session('prepared-mismatch-session', parent),
      prepared.projectRoot,
      '准备项目',
    )).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
  })

  it('persists the project binding when the create-contract tool succeeds', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-tool-binding-'))
    roots.push(parent)
    const context = fakeContext()
    const projects = new ScreenplayProjectService(context)
    Object.assign(context, { screenplayProjects: projects })
    const projectRoot = join(parent, '工具绑定短剧')
    await mkdir(join(projectRoot, '.screenplay', 'launcher'), { recursive: true })
    const current = session('tool-binding', projectRoot)
    const createContract = screenplayToolDefinitions(context)
      .find(tool => tool.name === 'screenplay_create_contract')
    if (createContract === undefined) throw new Error('missing screenplay_create_contract tool')

    await createContract.execute({
      expectedRevision: 0,
      operationId: 'create-contract-tool',
      requirements,
      contractContent: contract('工具绑定短剧'),
      settingContent: setting('工具绑定短剧'),
      mainCharacters: [{ name: '顾北辰', content: character('顾北辰') }],
      otherCharactersContent: artifacts('工具绑定短剧').otherCharactersContent,
    }, {
      agent: { session: current },
      concludeTurn() {},
    } as never)

    // rc.2 不持久化自定义 session 事件（外部插件事件无注册面）；绑定以内存 map + state.json 恢复为准。
    expect(current.events.map(event => event.type)).not.toContain('screenplay/project-binding')
    expect(projects.projectRootForSession(current)).toBe(projectRoot)
  })

  it('creates a project subdirectory and restores its binding from state.json at the workspace', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-service-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const current = session('binding-session', parent)
    const outcome = await service.createContractForSession(
      current, parent, 0, 'create-contract-1', '我的短剧', requirements, artifacts('我的短剧'),
    )

    const projectRoot = outcome.binding.projectRoot
    expect(projectRoot).toBe(join(parent, '我的短剧'))
    expect(await readFile(join(projectRoot, '创作合同', '创作合同.md'), 'utf8'))
      .toBe(`${contract('我的短剧')}\n`)
    expect(await readdir(parent)).toEqual(['我的短剧'])

    // rc.2：绑定不依赖自定义 session 事件；新会话从会话 cwd 的
    // .screenplay/state.json 恢复（recoverBindingForSession）。
    const resumed = session('binding-session', projectRoot)
    const restarted = new ScreenplayProjectService(fakeContext())
    expect(restarted.projectRootForSession(resumed)).toBe(projectRoot)
    const snapshot = await restarted.snapshotForSession(resumed, 'artifacts')
    expect(snapshot).toMatchObject({ initialized: true, projectRoot, projectName: '我的短剧' })
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(Object.keys(snapshot.artifactContents ?? {})).toHaveLength(4)
  })

  it('recovers an initialized project from the exact Session workspace without a binding event', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-recover-state-'))
    roots.push(parent)
    const creator = new ScreenplayProjectService(fakeContext())
    const created = await creator.createContractForSession(
      session('recovery-creator', parent),
      parent,
      0,
      'create-recovery-source',
      '可恢复项目',
      requirements,
      artifacts('可恢复项目'),
    )
    const resumed = session('recovery-new-session', created.binding.projectRoot)
    const service = new ScreenplayProjectService(fakeContext())

    expect(service.projectRootForSession(resumed)).toBe(created.binding.projectRoot)
    expect(service.contextSummary(resumed)).toContain('initialized: true')
    expect(service.contextSummary(resumed)).toContain('revision: 1')
    const snapshot = await service.snapshotForSession(resumed, 'artifacts')
    expect(snapshot).toMatchObject({
      initialized: true,
      projectRoot: created.binding.projectRoot,
      projectName: '可恢复项目',
      revision: 1,
    })
    if (!snapshot.initialized) throw new Error('expected recovered initialized snapshot')
    expect(snapshot.artifactContents?.['创作合同/创作合同.md']).toBe(`${contract('可恢复项目')}\n`)
  })

  it('suffixes a colliding project name inside the same Workspace', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-service-collision-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const first = await service.createContractForSession(
      session('collision-1', parent), parent, 0, 'create-contract-1', '重复项目', requirements, artifacts('重复项目'),
    )
    const second = await service.createContractForSession(
      session('collision-2', parent), parent, 0, 'create-contract-2', '重复项目', requirements, artifacts('重复项目'),
    )
    expect(first.binding.projectRoot).toBe(join(parent, '重复项目'))
    expect(second.binding.projectRoot).toBe(join(parent, '重复项目-2'))
  })

  it('reuses a launcher-prepared session directory instead of nesting another project', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-prepared-'))
    roots.push(parent)
    const projectRoot = join(parent, '预创建短剧')
    await mkdir(join(projectRoot, '.screenplay', 'launcher'), { recursive: true })
    const service = new ScreenplayProjectService(fakeContext())
    const outcome = await service.createContractForSession(
      session('prepared-session', projectRoot), parent, 0, 'create-prepared', '预创建短剧', requirements, artifacts('预创建短剧'),
    )

    expect(outcome.binding.projectRoot).toBe(projectRoot)
    expect(outcome.binding.parentRoot).toBe(parent)
    expect(await readFile(join(projectRoot, '创作合同', '创作合同.md'), 'utf8'))
      .toBe(`${contract('预创建短剧')}\n`)
    expect(await readdir(parent)).toEqual(['预创建短剧'])
  })

  it('keeps an existing English-layout project on its legacy paths', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-legacy-layout-'))
    roots.push(parent)
    const projectRoot = join(parent, '旧项目')
    await mkdir(join(projectRoot, '.screenplay', 'launcher'), { recursive: true })
    await mkdir(join(projectRoot, 'contract'), { recursive: true })
    const service = new ScreenplayProjectService(fakeContext())

    const outcome = await service.createContractForSession(
      session('legacy-layout-session', projectRoot),
      parent,
      0,
      'create-legacy-layout',
      '旧项目',
      requirements,
      artifacts('旧项目'),
    )

    expect(outcome.binding.projectRoot).toBe(projectRoot)
    await expect(readFile(join(projectRoot, 'contract', 'creative-contract.md'), 'utf8'))
      .resolves.toBe(`${contract('旧项目')}\n`)
    await expect(readFile(join(projectRoot, '创作合同', '创作合同.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('uses the launcher project folder name as the canonical title', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-prepared-title-'))
    roots.push(parent)
    const projectRoot = join(parent, '大大')
    await mkdir(join(projectRoot, '.screenplay', 'launcher'), { recursive: true })
    const service = new ScreenplayProjectService(fakeContext())
    const outcome = await service.createContractForSession(
      session('prepared-title-session', projectRoot),
      parent,
      0,
      'create-prepared-title',
      '我爸抢先一步',
      { ...requirements, title: '我爸抢先一步' },
      artifacts('大大'),
    )

    expect(outcome.binding.projectRoot).toBe(projectRoot)
    expect(await readFile(join(projectRoot, '创作合同', '创作合同.md'), 'utf8'))
      .toBe(`${contract('大大')}\n`)
    expect(await readdir(parent)).toEqual(['大大'])
  })

  it('does not trust a matching session directory without the launcher marker', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-unmarked-'))
    roots.push(parent)
    const projectRoot = join(parent, '未标记短剧')
    await mkdir(projectRoot, { recursive: true })
    const service = new ScreenplayProjectService(fakeContext())
    const outcome = await service.createContractForSession(
      session('unmarked-session', projectRoot), parent, 0, 'create-unmarked', '未标记短剧', requirements, artifacts('未标记短剧'),
    )

    expect(outcome.binding.projectRoot).toBe(join(parent, '未标记短剧-2'))
  })

  it('does not read the parent Workspace for an unbound session', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-service-unbound-'))
    roots.push(parent)
    const service = new ScreenplayProjectService(fakeContext())
    const snapshot = await service.snapshotForSession(session('unbound', parent), 'full')
    expect(snapshot).toEqual({ initialized: false, phase: 'Uninitialized', revision: 0 })
    expect(service.projectRootForSession(session('unbound', parent))).toBeUndefined()
  })
})

describe('screenplay tool failure feedback', () => {
  it('denies project-scoped generic reads without a bound Session project', async () => {
    const context = new Context()
    await context.plugin(SystemPrompt)
    await context.plugin(ToolRuntime)
    context.tools.register(defineTool({
      name: 'read',
      description: 'test read',
      parameters: { file_path: { type: 'string', required: true } },
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      async execute() { return 'should not run' },
    }))
    installScreenplayProjectScopeGuard(context)

    const result = await context.tools.execute({
      callId: CallId('unbound-project-read'),
      name: 'read',
      arguments: { file_path: 'secret.md' },
      signal: new AbortController().signal,
    })

    expect(result.isError).toBe(true)
    expect(result.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'text', text: expect.stringContaining('open a project') }),
    ]))
  })

  it('allows ordinary writes to files previously recorded as formal artifacts', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'screenplay-generic-formal-write-'))
    roots.push(parent)
    const context = new Context()
    await context.plugin(SystemPrompt)
    await context.plugin(ToolRuntime)
    const projects = new ScreenplayProjectService(context)
    Object.assign(context, { screenplayProjects: projects })
    const current = session('generic-formal-write', parent)
    const created = await projects.createContractForSession(
      current, parent, 0, 'generic-formal-write-contract', '自由写作', requirements, artifacts('自由写作'),
    )
    context.tools.register(defineTool({
      name: 'write',
      description: 'test write',
      parameters: { file_path: { type: 'string', required: true }, content: { type: 'string', required: true } },
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      async execute() { return 'written' },
    }))
    installScreenplayProjectScopeGuard(context)

    const result = await context.tools.execute({
      callId: CallId('generic-formal-write-call'),
      name: 'write',
      arguments: { file_path: '创作合同/创作合同.md', content: '# 用户自己的标题' },
      signal: new AbortController().signal,
      agent: { session: session('generic-formal-write-agent', created.binding.projectRoot) } as never,
    })

    expect(result.isError).toBe(false)
  })

})
