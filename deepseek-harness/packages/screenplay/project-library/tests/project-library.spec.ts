import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectLibraryService } from '../src/index.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function root(): string {
  const value = mkdtempSync(join(tmpdir(), 'dsh-project-library-'))
  roots.push(value)
  return value
}

describe('ProjectLibraryService project tags', () => {
  it('reads legacy metadata as an unclassified project', () => {
    const parentRoot = root()
    const projectRoot = join(parentRoot, 'legacy')
    mkdirSync(join(projectRoot, '.zenwit-project'), { recursive: true })
    writeFileSync(join(projectRoot, '.zenwit-project', 'project.json'), JSON.stringify({ version: 1, agentId: 'short-drama' }))
    const service = new ProjectLibraryService(new Context())

    expect(service.list({ root: parentRoot }).projects).toContainEqual(expect.objectContaining({
      path: projectRoot,
      agentId: 'short-drama',
      tags: [],
    }))
  })

  it('normalizes create tags and preserves metadata while updating them', () => {
    const parentRoot = root()
    const service = new ProjectLibraryService(new Context())
    const created = service.create({
      name: '标签项目',
      parentRoot,
      agentId: 'short-drama',
      tags: [' 小说 ', '小说', '悬疑'],
    }).project
    expect(created.tags).toEqual(['小说', '悬疑'])

    const metadataPath = join(created.path, '.zenwit-project', 'project.json')
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as Record<string, unknown>
    writeFileSync(metadataPath, JSON.stringify({ ...metadata, custom: 'kept' }))
    const updated = service.updateTags({ path: created.path, parentRoot, tags: ['连载中'] }).project
    expect(updated).toMatchObject({ agentId: 'short-drama', tags: ['连载中'] })
    expect(JSON.parse(readFileSync(metadataPath, 'utf8'))).toMatchObject({
      version: 2,
      agentId: 'short-drama',
      tags: ['连载中'],
      custom: 'kept',
    })
  })

  it('rejects invalid tags and paths outside the configured root', () => {
    const parentRoot = root()
    const service = new ProjectLibraryService(new Context())
    expect(() => service.create({ name: 'too-many', parentRoot, tags: Array.from({ length: 9 }, (_, index) => `标签${index}`) }))
      .toThrow('at most 8 tags')
    expect(() => service.updateTags({ path: tmpdir(), parentRoot, tags: [] }))
      .toThrow('directly under the project library')
  })
})
