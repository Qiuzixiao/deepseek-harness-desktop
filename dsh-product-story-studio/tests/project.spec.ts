import { access, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStoryStudioRpcHandler } from '../src/index.ts'
import { createStoryProject, ensureProjectRoot, normalizeProjectName, projectId, resolveProjectRoot } from '../src/project.ts'

describe('Story Studio project creation', () => {
  it('creates a complete project below the configured global root from only a name', async () => {
    const home = await mkdtemp(join(tmpdir(), 'story-studio-products-'))
    const root = join(home, '我的作品')
    const result = await createStoryProject({ projectRoot: root }, '父子同心')

    expect(result).toEqual({ name: '父子同心', path: join(root, '父子同心'), projectRoot: root })
    const brief = await readFile(join(result.path, '项目说明.md'), 'utf8')
    expect(brief).toContain('## 原始需求')
    expect(brief).toContain('## 冲突')
    expect(brief).toContain('## 必须保留内容')
    expect(brief).toContain('## 禁止内容')
    expect(await readFile(join(result.path, '项目配置.yml'), 'utf8')).toContain('title: 父子同心')
    expect(await readFile(join(result.path, '故事设定', '时间线.md'), 'utf8')).toContain('时间线')
    expect(await readFile(join(result.path, '灵感速记', '灵感速记.md'), 'utf8')).toContain('灵感速记')
    await expect(access(join(result.path, '.qnovel', '缓存'))).resolves.toBeUndefined()
    await expect(access(join(result.path, '.qnovel', '索引'))).resolves.toBeUndefined()
  })

  it('rejects duplicate and unsafe project names', async () => {
    const home = await mkdtemp(join(tmpdir(), 'story-studio-duplicates-'))
    await createStoryProject({ projectRoot: home }, '同名作品')
    await expect(createStoryProject({ projectRoot: home }, '同名作品')).rejects.toThrow('已经存在')
    expect(() => normalizeProjectName('../逃逸')).toThrow('不支持的字符')
  })

  it('uses one stable global projects directory by default', () => {
    const home = join(tmpdir(), 'writer')
    const configuredRoot = join(home, 'configured')
    const legacyConfiguredRoot = join(home, 'legacy-configured')
    expect(resolveProjectRoot({}, home, {})).toBe(resolve(home, 'Documents', 'QNovel作品'))
    expect(resolveProjectRoot({}, home, { QNOVEL_PROJECTS_ROOT: configuredRoot })).toBe(resolve(configuredRoot))
    expect(resolveProjectRoot({}, home, { STORY_STUDIO_PROJECTS_ROOT: legacyConfiguredRoot }))
      .toBe(resolve(legacyConfiguredRoot))
  })

  it('uses a stable identifier for Chinese project names', () => {
    expect(projectId('1998父子局')).toBe('1998')
    expect(projectId('父子同心')).toMatch(/^story-[a-z0-9]+$/u)
  })
})

describe('Story Studio project RPC', () => {
  it('describes the root and creates a project through the production handler', async () => {
    const root = await mkdtemp(join(tmpdir(), 'story-studio-rpc-'))
    const handle = createStoryStudioRpcHandler({ projectRoot: root })

    await expect(handle('describe', {})).resolves.toEqual({ ok: true, value: { projectRoot: root, configured: true } })
    await expect(handle('createProject', { name: '县城往事' })).resolves.toEqual({
      ok: true,
      value: { name: '县城往事', path: join(root, '县城往事'), projectRoot: root },
    })
    expect(await readFile(join(root, '县城往事', '项目配置.yml'), 'utf8')).toContain('title: 县城往事')
  })

  it('requires a configured root and validates a selected absolute directory', async () => {
    const handle = createStoryStudioRpcHandler()
    await expect(handle('describe', {})).resolves.toEqual({ ok: true, value: { projectRoot: '', configured: false } })
    await expect(handle('createProject', { name: '未选择目录' })).resolves.toMatchObject({
      ok: false,
      error: { message: '请先选择 QNovel 作品目录' },
    })
    await expect(handle('validateProjectRoot', { path: 'relative/path' })).resolves.toMatchObject({
      ok: false,
      error: { message: '作品目录必须是绝对路径' },
    })
    const selected = await mkdtemp(join(tmpdir(), 'qnovel-selected-'))
    await expect(handle('validateProjectRoot', { path: selected })).resolves.toEqual({
      ok: true,
      value: { projectRoot: selected },
    })
    await expect(ensureProjectRoot(selected)).resolves.toBe(selected)
  })

  it('returns stable RPC failures for invalid and unknown operations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'story-studio-rpc-errors-'))
    const handle = createStoryStudioRpcHandler({ projectRoot: root })

    await expect(handle('createProject', {})).resolves.toMatchObject({
      ok: false,
      error: { code: 'internal', message: '项目名称必须是文本' },
    })
    await expect(handle('deleteEverything', {})).resolves.toMatchObject({
      ok: false,
      error: { code: 'internal', message: '未知的 Story Studio 操作：deleteEverything' },
    })
  })
})
