import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
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
  it('installs directly without creating a draft file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    const home = await mkdtemp(join(tmpdir(), 'skill-authoring-home-'))
    roots.push(root); homes.push(home)
    process.env.DSH_HOME = home
    const store = new SkillAuthoringStore(root)
    const installed = await store.install({
      name: 'direct-guidance',
      description: 'Apply this guidance directly.',
      scope: 'user',
      instructions: 'Use the supplied guidance selectively.',
      sources: [{ sourceId: 'note-1', label: 'notes.md', kind: 'attachment' }],
    })
    await expect(readFile(installed.skillFile, 'utf8')).resolves.toContain('name: direct-guidance')
    await expect(readFile(join(home, 'skills', 'direct-guidance', 'SKILL.md'), 'utf8')).resolves.toContain('Use the supplied guidance selectively.')
    await expect(readFile(join(root, '.screenplay', 'skill-drafts'), 'utf8')).rejects.toThrow()
  })

  it('does not duplicate a resource kind already present in its path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    const home = await mkdtemp(join(tmpdir(), 'skill-authoring-home-'))
    roots.push(root); homes.push(home)
    process.env.DSH_HOME = home
    const store = new SkillAuthoringStore(root)
    const installed = await store.install({
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

    await expect(store.install({
      name: 'missing-reference',
      description: 'This Skill has an invalid resource route.',
      scope: 'user',
      instructions: 'Read `references/missing.md` before applying this Skill.',
    })).rejects.toThrow('引用的资源不存在')
    await expect(readFile(join(home, 'skills', 'missing-reference', 'SKILL.md'), 'utf8')).rejects.toThrow()
  })

  it('publishes dynamic instructions and only requested supporting resources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    const home = await mkdtemp(join(tmpdir(), 'skill-authoring-home-'))
    roots.push(root); homes.push(home)
    process.env.DSH_HOME = home
    const store = new SkillAuthoringStore(root)
    const draft = await store.createDraft({
      instructions: 'Use the supplied notes selectively. Preserve explicit user choices and identify uncertain claims.',
      sources: [{ sourceId: 'attachment-1', label: 'notes.md', kind: 'attachment' }],
      resources: [{ kind: 'references', path: 'notes.md', content: '# Notes\n\nKeep the advice conditional.\n' }],
    })
    const published = await store.publish({ draftId: draft.draftId, name: 'notes-guidance', description: 'Apply supplied notes when drafting or reviewing content.', scope: 'user', confirmation: '确认发布 Skill' })
    const skill = await readFile(published.skillFile, 'utf8')
    expect(skill).toContain('name: notes-guidance')
    expect(skill).toContain('metadata:')
    expect(skill).toContain(draft.instructions)
    expect(skill).not.toContain('whenToUse:')
    await expect(readFile(join(root, '.screenplay', 'skill-drafts', `${draft.draftId}.json`), 'utf8')).rejects.toThrow()
    await expect(readFile(join(published.directory, 'references', 'notes.md'), 'utf8')).resolves.toContain('Keep the advice conditional.')
    await expect(readFile(join(published.directory, 'agents', 'openai.yaml'), 'utf8')).resolves.toContain('allow_implicit_invocation: true')
  })

  it('updates and cancels an unpublished draft without touching source files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-authoring-'))
    roots.push(root)
    const store = new SkillAuthoringStore(root)
    const draft = await store.createDraft({ instructions: 'First version.' })
    const updated = await store.updateDraft({ draftId: draft.draftId, instructions: 'Second version.' })
    expect(updated.draftId).toBe(draft.draftId)
    expect(updated.version).toBe(2)
    expect((await store.inspect(draft.draftId) as { instructions: string }).instructions).toBe('Second version.')
    expect(await readdir(join(root, '.screenplay', 'skill-drafts'))).toEqual([`${draft.draftId}.json`])
    await expect(store.discardDraft(draft.draftId)).resolves.toEqual({ draftId: draft.draftId, discarded: true })
    await expect(store.inspect(draft.draftId)).rejects.toThrow('不存在')
  })

  it('uses the shared Zenwit home resolution for user Skills', () => {
    expect(resolveUserSkillRoot({ DSH_HOME: '' })).toBe(join(homedir(), '.zenwit', 'skills'))
    expect(resolveUserSkillRoot({ DSH_HOME: '~/.zenwit' })).toBe(join(homedir(), '.zenwit', 'skills'))
    expect(resolveUserSkillRoot({ DSH_HOME: './relative-home' })).toBe(join(resolve('./relative-home'), 'skills'))
  })
})
