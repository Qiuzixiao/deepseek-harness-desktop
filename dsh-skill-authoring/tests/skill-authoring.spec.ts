import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveUserSkillRoot, SkillAuthoringStore } from '../src/skill-authoring.js'

const roots: string[] = []
const homes: string[] = []
const originalDshHome = process.env.DSH_HOME

afterEach(async () => {
  await Promise.all([...roots.splice(0), ...homes.splice(0)].map(root => rm(root, { recursive: true, force: true })))
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
})

describe('SkillAuthoringStore', () => {
  it('saves a user-scope Skill directly without a draft file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    const home = await mkdtemp(join(tmpdir(), 'skill-authoring-home-'))
    roots.push(root); homes.push(home)
    process.env.DSH_HOME = home
    const store = new SkillAuthoringStore(root)
    const installed = await store.save({
      name: 'direct-guidance',
      description: 'Apply this guidance directly.',
      scope: 'user',
      instructions: 'Use the supplied guidance selectively.',
    })
    await expect(readFile(installed.skillFile, 'utf8')).resolves.toContain('name: direct-guidance')
    await expect(readFile(join(home, 'skills', 'direct-guidance', 'SKILL.md'), 'utf8')).resolves.toContain('Use the supplied guidance selectively.')
  })

  it('saves a project-scope Skill under .zenwit/skills', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    roots.push(root)
    const store = new SkillAuthoringStore(root)
    const installed = await store.save({
      name: 'project-guidance',
      description: 'Project-specific guidance.',
      scope: 'project',
      instructions: 'Follow the project conventions.',
    })
    expect(installed.directory).toBe(join(root, '.zenwit', 'skills', 'project-guidance'))
    await expect(readFile(join(root, '.zenwit', 'skills', 'project-guidance', 'SKILL.md'), 'utf8')).resolves.toContain('Follow the project conventions.')
  })

  it('does not duplicate a resource kind already present in its path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    const home = await mkdtemp(join(tmpdir(), 'skill-authoring-home-'))
    roots.push(root); homes.push(home)
    process.env.DSH_HOME = home
    const store = new SkillAuthoringStore(root)
    const installed = await store.save({
      name: 'prefixed-reference',
      description: 'Use an explicitly prefixed reference path.',
      scope: 'user',
      instructions: 'Read `references/topic.md` before applying this Skill.',
      resources: [{ kind: 'references', path: 'references/topic.md', content: '# Topic\n' }],
    })
    await expect(readFile(join(installed.directory, 'references', 'topic.md'), 'utf8')).resolves.toBe('# Topic')
    await expect(readFile(join(installed.directory, 'references', 'references', 'topic.md'), 'utf8')).rejects.toThrow()
  })

  it('rejects installation when SKILL.md references a missing resource', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    const home = await mkdtemp(join(tmpdir(), 'skill-authoring-home-'))
    roots.push(root); homes.push(home)
    process.env.DSH_HOME = home
    const store = new SkillAuthoringStore(root)

    await expect(store.save({
      name: 'missing-reference',
      description: 'This Skill has an invalid resource route.',
      scope: 'user',
      instructions: 'Read `references/missing.md` before applying this Skill.',
    })).rejects.toThrow('引用的资源不存在')
    await expect(readFile(join(home, 'skills', 'missing-reference', 'SKILL.md'), 'utf8')).rejects.toThrow()
  })

  it('rejects a conflicting resource path whose kind is another resource kind', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    roots.push(root)
    const store = new SkillAuthoringStore(root)
    await expect(store.save({
      name: 'conflicting-resource',
      description: 'This Skill has a path conflict.',
      scope: 'user',
      instructions: 'Read `assets/note.md`.',
      resources: [{ kind: 'references', path: 'assets/note.md', content: '# Note\n' }],
    })).rejects.toThrow('path conflicts with its kind')
  })

  it('emits a standard SKILL.md with the Claude Code when_to_use extension', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    const home = await mkdtemp(join(tmpdir(), 'skill-authoring-home-'))
    roots.push(root); homes.push(home)
    process.env.DSH_HOME = home
    const store = new SkillAuthoringStore(root)
    const installed = await store.save({
      name: 'extended-skill',
      description: 'A Skill with a usage hint.',
      scope: 'user',
      instructions: 'Apply the hint.',
      whenToUse: 'Only when the user asks for it.',
    })
    const skill = await readFile(installed.skillFile, 'utf8')
    expect(skill).toContain('name: extended-skill')
    expect(skill).toContain(`when_to_use: "Only when the user asks for it."`)
    expect(skill).toContain('license: MIT')
    expect(skill).not.toContain('metadata:')
    expect(skill).not.toContain('provenance:')
    expect(skill).not.toContain('whenToUse:')
  })

  it('uses the shared Zenwit home resolution for user Skills', () => {
    expect(resolveUserSkillRoot({ DSH_HOME: '' })).toBe(join(homedir(), '.zenwit', 'skills'))
    expect(resolveUserSkillRoot({ DSH_HOME: 'does-not-matter' })).toBe(join(resolve('does-not-matter'), 'skills'))
  })
})
