import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { inspectSkillSource, readSkillSource } from '../src/skill-source.js'

describe('skill external sources', () => {
  it('inspects a user-provided folder and reads a bounded document chunk', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-source-'))
    await mkdir(join(root, 'nested'))
    await writeFile(join(root, 'notes.md'), '# 方法\n\n先观察冲突，再设计反转。')
    await writeFile(join(root, 'nested', 'facts.txt'), '只读资料')
    await writeFile(join(root, 'ignored.json'), '{"secret":true}')

    const listing = await inspectSkillSource(root)
    expect(listing).toMatchObject({ sourcePath: await realpath(root), kind: 'directory' })
    expect((listing.files as Array<{ relativePath: string }>).map(file => file.relativePath)).toEqual(['nested/facts.txt', 'notes.md'])

    const chunk = await readSkillSource(join(root, 'notes.md'), 0, 6)
    expect(chunk).toMatchObject({ format: 'markdown', hasMore: true, nextOffset: 6 })
    expect(String(chunk.content)).toContain('# 方法')
  })

  it('rejects unsupported files and directories passed to the reader', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-source-invalid-'))
    await writeFile(join(root, 'data.json'), '{}')
    await expect(readSkillSource(join(root, 'data.json'))).rejects.toThrow('只支持')
    await expect(readSkillSource(root)).rejects.toThrow('必须是文件')
  })
})
