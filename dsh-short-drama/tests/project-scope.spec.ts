import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { Session } from '@deepseek-ai/dsh-session'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { apply } from '../src/agent.js'
import { assertProjectPath, isProjectFileTool, pathArguments } from '../src/project-scope.js'

const roots: string[] = []

function session(id: string, cwd: string): Session {
  return Session.create(id as never, [], {
    version: 0,
    id: id as never,
    createdAt: Date.now(),
    cwd,
  })
}

function projectTools(): Map<string, ToolDefinition> {
  const registered = new Map<string, ToolDefinition>()
  const context = {
    systemPrompt: { section() {} },
    tools: { register(tool: ToolDefinition) { registered.set(tool.name, tool) } },
    on() {},
  } as unknown as Context
  apply(context)
  return registered
}

async function executeProjectTool(
  tool: ToolDefinition,
  args: Record<string, unknown>,
  current: Session,
): Promise<unknown> {
  return tool.execute(args, { agent: { session: current } } as never)
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('project-scoped generic reads', () => {
  it('accepts project-relative files and rejects traversal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-scope-'))
    roots.push(root)
    await writeFile(join(root, 'story.md'), 'story')
    const current = session('scope-1', root)
    await expect(assertProjectPath(current, root, 'story.md')).resolves.toMatch(/story\.md$/u)
    await expect(assertProjectPath(current, root, '../outside.md')).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    await expect(assertProjectPath(current, root, '/tmp/outside.md')).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
  })

  it('accepts a new file whose nested parent directories do not exist yet', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-scope-new-tree-'))
    roots.push(root)
    const current = session('scope-new-tree', root)

    await expect(assertProjectPath(current, root, '创作规划/阶段一/总纲.md'))
      .resolves.toBe(join(await realpath(root), '创作规划', '阶段一', '总纲.md'))
  })

  it('rejects a symlink that resolves outside the project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-scope-root-'))
    const outside = await mkdtemp(join(tmpdir(), 'short-drama-scope-outside-'))
    roots.push(root, outside)
    await writeFile(join(outside, 'secret.md'), 'secret')
    await symlink(outside, join(root, 'linked'))
    const current = session('scope-2', root)
    await expect(assertProjectPath(current, root, 'linked/secret.md')).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    await mkdir(join(root, 'nested'))
    await expect(assertProjectPath(current, root, 'nested/new.md')).resolves.toMatch(/nested\/new\.md$/u)
  })

  it('accepts an absolute path only when it resolves inside the bound project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-scope-absolute-'))
    roots.push(root)
    await writeFile(join(root, 'story.md'), 'story')
    const current = session('scope-absolute', root)
    await expect(assertProjectPath(current, root, join(root, 'story.md'))).resolves.toMatch(/story\.md$/u)
    await expect(assertProjectPath(current, root, join(tmpdir(), 'outside.md'))).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
  })

  it('leaves uploaded-document paths outside the project scope guard', () => {
    expect(isProjectFileTool('read_document')).toBe(false)
    expect(pathArguments('read_document', { file_path: '/tmp/source.docx' })).toEqual([])
  })

  it('scopes ordinary writes, edits, moves, and deletes to the bound project', () => {
    expect(isProjectFileTool('write')).toBe(true)
    expect(isProjectFileTool('edit')).toBe(true)
    expect(pathArguments('write', { file_path: '规则/规则.md', content: 'x' })).toEqual(['规则/规则.md'])
    expect(pathArguments('edit', { file_path: '规则/规则.md', old_string: 'x', new_string: 'y' })).toEqual(['规则/规则.md'])
    expect(pathArguments('move', { source_path: '旧名.md', destination_path: '资料/新名.md' }))
      .toEqual(['旧名.md', '资料/新名.md'])
    expect(pathArguments('delete', { file_path: '废稿.md' })).toEqual(['废稿.md'])
  })

  it('renames files and creates the destination parent only when needed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-move-'))
    roots.push(root)
    await writeFile(join(root, 'old.md'), 'content')
    const current = session('move-file', root)
    const move = projectTools().get('move')
    if (move === undefined) throw new Error('move tool was not registered')

    await expect(executeProjectTool(move, {
      source_path: 'old.md',
      destination_path: '资料/新名称.md',
    }, current)).resolves.toEqual({
      source_path: 'old.md',
      destination_path: '资料/新名称.md',
    })
    await expect(readFile(join(root, '资料', '新名称.md'), 'utf8')).resolves.toBe('content')
    await expect(readFile(join(root, 'old.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('deletes project files and directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-delete-'))
    roots.push(root)
    await mkdir(join(root, '废稿'))
    await writeFile(join(root, '废稿', '一.md'), 'content')
    const current = session('delete-file', root)
    const remove = projectTools().get('delete')
    if (remove === undefined) throw new Error('delete tool was not registered')

    await expect(executeProjectTool(remove, { file_path: '废稿' }, current))
      .resolves.toEqual({ file_path: '废稿' })
    await expect(readFile(join(root, '废稿', '一.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not overwrite an existing move destination', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-move-collision-'))
    roots.push(root)
    await writeFile(join(root, 'source.md'), 'source')
    await writeFile(join(root, 'target.md'), 'target')
    const move = projectTools().get('move')
    if (move === undefined) throw new Error('move tool was not registered')

    await expect(executeProjectTool(move, {
      source_path: 'source.md',
      destination_path: 'target.md',
    }, session('move-collision', root))).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    await expect(readFile(join(root, 'source.md'), 'utf8')).resolves.toBe('source')
    await expect(readFile(join(root, 'target.md'), 'utf8')).resolves.toBe('target')
  })

  it('rejects move and delete outside the project or against project metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-mutations-'))
    const outside = await mkdtemp(join(tmpdir(), 'short-drama-mutations-outside-'))
    roots.push(root, outside)
    await writeFile(join(root, 'inside.md'), 'content')
    await symlink(outside, join(root, 'outside-link'))
    const current = session('mutation-guard', root)
    const tools = projectTools()
    const move = tools.get('move')
    const remove = tools.get('delete')
    if (move === undefined || remove === undefined) throw new Error('project mutation tools were not registered')

    await expect(executeProjectTool(move, {
      source_path: 'inside.md',
      destination_path: '../outside.md',
    }, current)).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    await expect(executeProjectTool(move, {
      source_path: 'inside.md',
      destination_path: 'outside-link/moved.md',
    }, current)).rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    await expect(executeProjectTool(remove, { file_path: '.' }, current))
      .rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    for (const metadataPath of ['.screenplay', '.screenplay/state.json', '.zenwit-project', '.zenwit-project/project.json']) {
      await expect(executeProjectTool(remove, { file_path: metadataPath }, current))
        .rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
    }
  })
})
