import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStoryStudioRpcHandler } from '../src/index.ts'
import { createStoryProject, normalizeProjectName, resolveProjectRoot } from '../src/project.ts'

describe('Story Studio project creation', () => {
  it('creates a complete project below the configured global root from only a name', async () => {
    const home = await mkdtemp(join(tmpdir(), 'story-studio-products-'))
    const root = join(home, '我的作品')
    const result = await createStoryProject({ projectRoot: root }, '父子同心')

    expect(result).toEqual({ name: '父子同心', path: join(root, '父子同心'), projectRoot: root })
    expect(await readFile(join(result.path, 'brief.md'), 'utf8')).toContain('## 原始需求')
    expect(await readFile(join(result.path, 'story.yml'), 'utf8')).toContain('title: 父子同心')
    expect(await readFile(join(result.path, 'bible', 'timeline.md'), 'utf8')).toContain('时间线')
  })

  it('rejects duplicate and unsafe project names', async () => {
    const home = await mkdtemp(join(tmpdir(), 'story-studio-duplicates-'))
    await createStoryProject({ projectRoot: home }, '同名作品')
    await expect(createStoryProject({ projectRoot: home }, '同名作品')).rejects.toThrow('已经存在')
    expect(() => normalizeProjectName('../逃逸')).toThrow('不支持的字符')
  })

  it('uses one stable global projects directory by default', () => {
    expect(resolveProjectRoot({}, '/Users/writer', {})).toBe('/Users/writer/Documents/Story Studio')
    expect(resolveProjectRoot({}, '/Users/writer', { STORY_STUDIO_PROJECTS_ROOT: '/Volumes/Writing' }))
      .toBe('/Volumes/Writing')
  })
})

describe('Story Studio project RPC', () => {
  it('describes the root and creates a project through the production handler', async () => {
    const root = await mkdtemp(join(tmpdir(), 'story-studio-rpc-'))
    const handle = createStoryStudioRpcHandler({ projectRoot: root })

    await expect(handle('describe', {})).resolves.toEqual({ ok: true, value: { projectRoot: root } })
    await expect(handle('createProject', { name: '县城往事' })).resolves.toEqual({
      ok: true,
      value: { name: '县城往事', path: join(root, '县城往事'), projectRoot: root },
    })
    expect(await readFile(join(root, '县城往事', 'story.yml'), 'utf8')).toContain('title: 县城往事')
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
