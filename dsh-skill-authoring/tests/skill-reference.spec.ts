import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { readSkillReference } from '../src/skill-reference.js'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function fakeContext(base: string): Context {
  return {
    get(name: string) {
      if (name === 'skills') {
        return {
          get: async (skillName: string) => skillName === 'notes'
            ? { name: skillName, provider: 'filesystem', resourceBase: { kind: 'directory', path: base } }
            : undefined,
        }
      }
      return undefined
    },
  } as unknown as Context
}

describe('readSkillReference', () => {
  it('reads a relative reference inside the Skill resourceBase', async () => {
    const base = await mkdtemp(join(tmpdir(), 'skill-reference-'))
    roots.push(base)
    await mkdir(join(base, 'references'))
    await writeFile(join(base, 'references', 'topic.md'), '# Topic\nBody.\n')

    const result = await readSkillReference(fakeContext(base), 'notes', 'references/topic.md', undefined, 'project' as never)
    expect(result).toMatchObject({ ok: true, skill: 'notes', provider: 'filesystem', path: 'references/topic.md' })
    expect(String(result.content)).toContain('# Topic')
  })

  it('rejects parent traversal', async () => {
    const base = await mkdtemp(join(tmpdir(), 'skill-reference-'))
    roots.push(base)
    await expect(readSkillReference(fakeContext(base), 'notes', '../outside.md', undefined, 'project' as never))
      .rejects.toThrow('parent traversal')
  })

  it('rejects an unknown Skill', async () => {
    const base = await mkdtemp(join(tmpdir(), 'skill-reference-'))
    roots.push(base)
    await expect(readSkillReference(fakeContext(base), 'missing', 'references/topic.md', undefined, 'project' as never))
      .rejects.toThrow('is not available')
  })
})
