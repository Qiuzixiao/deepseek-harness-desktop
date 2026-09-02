import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Session } from '@deepseek-ai/dsh-session'
import { assertProjectPath, isProjectReadTool, pathArguments } from '../src/project-scope.js'

const roots: string[] = []

function session(id: string, cwd: string): Session {
  return Session.create(id as never, [], {
    version: 0,
    id: id as never,
    createdAt: Date.now(),
    cwd,
  })
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

  it('guards read_document file_path arguments with the same project boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'short-drama-scope-document-'))
    const outside = await mkdtemp(join(tmpdir(), 'short-drama-scope-document-outside-'))
    roots.push(root, outside)
    const outsideDocument = join(outside, 'source.docx')
    await writeFile(outsideDocument, 'outside')
    const current = session('scope-document', root)

    expect(isProjectReadTool('read_document')).toBe(true)
    const candidates = pathArguments('read_document', { file_path: outsideDocument })
    expect(candidates).toEqual([outsideDocument])
    await expect(assertProjectPath(current, root, candidates[0] as string, 'read_document path'))
      .rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
  })
})
