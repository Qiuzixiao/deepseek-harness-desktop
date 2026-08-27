import { mkdir, readFile, readdir, rm, mkdtemp, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { Session } from '@deepseek-ai/dsh-session'
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

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('ScreenplayProjectService project bindings', () => {
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
      confirmation: '确认并创建全部文件',
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
    expect(await readFile(join(projectRoot, '创作合同', 'creative-contract.md'), 'utf8'))
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
    expect(snapshot.artifactContents?.['创作合同/creative-contract.md']).toBe(`${contract('可恢复项目')}\n`)
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
    expect(await readFile(join(projectRoot, '创作合同', 'creative-contract.md'), 'utf8'))
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
    await expect(readFile(join(projectRoot, '创作合同', 'creative-contract.md'), 'utf8'))
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
    expect(await readFile(join(projectRoot, '创作合同', 'creative-contract.md'), 'utf8'))
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
