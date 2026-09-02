import { Readable } from 'node:stream'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import {
  handleProjectLibraryRequest,
  handleProjectNodeRequest,
  PROJECT_LIBRARY_ROOT,
} from '../src/project-library-route.ts'

const TEST_ORIGIN = 'http://127.0.0.1:19473'

function request(method: string, body: unknown): IncomingMessage {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]) as IncomingMessage
  req.method = method
  req.url = '/api/desktop/projects/node'
  req.headers = {
    host: '127.0.0.1:19473',
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
    'sec-fetch-site': 'same-origin',
  }
  Object.defineProperty(req, 'socket', { value: { remoteAddress: '127.0.0.1' } })
  return req
}

function response(): { status: number; body: unknown; writeHead: (status: number) => void; end: (value: string) => void } {
  const result = { status: 0, body: undefined as unknown, writeHead(status: number) { result.status = status }, end(value: string) { result.body = JSON.parse(value) } }
  return result
}

describe('project node operations', () => {
  mkdirSync(PROJECT_LIBRARY_ROOT, { recursive: true })
  const project = mkdtempSync(join(PROJECT_LIBRARY_ROOT, `.dsh-node-test-${randomUUID()}-`))

  afterAll(() => rmSync(project, { recursive: true, force: true }))

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
    mkdirSync(join(project, '.zenwit-project'), { recursive: true })
    writeFileSync(join(project, '.zenwit-project', 'project.json'), JSON.stringify({ version: 2, agentId: 'short-drama' }))
  })

  mkdirSync(join(project, '.zenwit-project'), { recursive: true })
  writeFileSync(join(project, '.zenwit-project', 'project.json'), JSON.stringify({ version: 2, agentId: 'short-drama' }))

  it('creates files and folders, rejects duplicates and traversal', async () => {
    const folder = join(project, 'notes')
    const createFolder = response()
    await handleProjectNodeRequest(request('POST', { path: folder, kind: 'directory' }), createFolder as never, TEST_ORIGIN)
    expect(createFolder.status).toBe(200)
    expect(existsSync(folder)).toBe(true)

    const file = join(folder, 'idea.md')
    const createFile = response()
    await handleProjectNodeRequest(request('POST', { path: file, kind: 'file' }), createFile as never, TEST_ORIGIN)
    expect(readFileSync(file, 'utf8')).toBe('')

    const duplicate = response()
    await handleProjectNodeRequest(request('POST', { path: file, kind: 'file' }), duplicate as never, TEST_ORIGIN)
    expect(duplicate.status).toBe(409)

    const traversal = response()
    await handleProjectNodeRequest(request('POST', { path: `${join(project, 'notes')}/../escape.txt`, kind: 'file' }), traversal as never, TEST_ORIGIN)
    expect(traversal.status).toBe(400)

    const invalidName = response()
    await handleProjectNodeRequest(request('POST', { path: join(project, 'CON.txt'), kind: 'file' }), invalidName as never, TEST_ORIGIN)
    expect(invalidName.status).toBe(400)
  })

  it('renames and recursively deletes a node, but protects metadata', async () => {
    const folder = join(project, 'draft')
    const file = join(folder, 'scene.txt')
    mkdirSync(folder)
    await handleProjectNodeRequest(request('POST', { path: file, kind: 'file' }), response() as never, TEST_ORIGIN)

    const renamed = response()
    await handleProjectNodeRequest(request('PATCH', { path: folder, newName: 'final' }), renamed as never, TEST_ORIGIN)
    expect(renamed.status).toBe(200)
    expect(existsSync(join(project, 'final', 'scene.txt'))).toBe(true)

    const deleted = response()
    await handleProjectNodeRequest(request('DELETE', { path: join(project, 'final') }), deleted as never, TEST_ORIGIN)
    expect(deleted.status).toBe(200)
    expect(existsSync(join(project, 'final'))).toBe(false)

    const metadata = response()
    await handleProjectNodeRequest(request('POST', { path: join(project, '.zenwit-project', 'bad.txt'), kind: 'file' }), metadata as never, TEST_ORIGIN)
    expect(metadata.status).toBe(403)
  })
})

describe('project tag metadata', () => {
  mkdirSync(PROJECT_LIBRARY_ROOT, { recursive: true })
  const projects: string[] = []

  afterEach(() => {
    for (const project of projects.splice(0)) rmSync(project, { recursive: true, force: true })
  })

  function project(name: string): string {
    const path = join(PROJECT_LIBRARY_ROOT, `.dsh-tags-${randomUUID()}-${name}`)
    mkdirSync(join(path, '.zenwit-project'), { recursive: true })
    projects.push(path)
    return path
  }

  it('lists legacy projects with an empty tag collection', async () => {
    const path = project('legacy')
    writeFileSync(join(path, '.zenwit-project', 'project.json'), JSON.stringify({ version: 1, agentId: 'short-drama' }))
    const res = response()
    const req = request('GET', {})
    req.url = '/api/desktop/projects'
    await handleProjectLibraryRequest(req, res as never, TEST_ORIGIN)
    expect(res.status).toBe(200)
    const listed = (res.body as { projects: Array<{ path: string, tags: string[] }> }).projects.find(item => item.path === path)
    expect(listed?.tags).toEqual([])
  })

  it('persists normalized tags when creating a project', async () => {
    const name = `.dsh-tags-${randomUUID()}-created`
    const res = response()
    const req = request('POST', { name, tags: [' 小说 ', '小说', '悬疑'] })
    req.url = '/api/desktop/projects'
    await handleProjectLibraryRequest(req, res as never, TEST_ORIGIN)

    expect(res.status).toBe(200)
    const created = (res.body as { project: { path: string, agentId?: string, tags: string[] } }).project
    projects.push(created.path)
    expect(created).toMatchObject({ agentId: 'short-drama', tags: ['小说', '悬疑'] })
    expect(JSON.parse(readFileSync(join(created.path, '.zenwit-project', 'project.json'), 'utf8'))).toMatchObject({
      version: 2,
      agentId: 'short-drama',
      tags: ['小说', '悬疑'],
    })
  })

  it('updates normalized tags while preserving existing metadata', async () => {
    const path = project('update')
    const metadataPath = join(path, '.zenwit-project', 'project.json')
    writeFileSync(metadataPath, JSON.stringify({ version: 1, agentId: 'short-drama', custom: 'kept' }))
    const res = response()
    const req = request('PATCH', { path, tags: [' 小说 ', '小说', '悬疑'] })
    req.url = '/api/desktop/projects'
    await handleProjectLibraryRequest(req, res as never, TEST_ORIGIN)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ project: { path, agentId: 'short-drama', tags: ['小说', '悬疑'] } })
    expect(JSON.parse(readFileSync(metadataPath, 'utf8'))).toMatchObject({
      version: 2,
      agentId: 'short-drama',
      tags: ['小说', '悬疑'],
      custom: 'kept',
    })
  })

  it('rejects invalid tags and paths outside the project library', async () => {
    const path = project('invalid')
    const invalid = response()
    const invalidRequest = request('PATCH', { path, tags: Array.from({ length: 9 }, (_, index) => `标签${index}`) })
    invalidRequest.url = '/api/desktop/projects'
    await handleProjectLibraryRequest(invalidRequest, invalid as never, TEST_ORIGIN)
    expect(invalid.status).toBe(400)

    const outside = response()
    const outsideRequest = request('PATCH', { path: '/tmp/not-a-zenwit-project', tags: [] })
    outsideRequest.url = '/api/desktop/projects'
    await handleProjectLibraryRequest(outsideRequest, outside as never, TEST_ORIGIN)
    expect(outside.status).toBe(403)
  })

  it('does not list or delete an unregistered sibling directory', async () => {
    const path = join(PROJECT_LIBRARY_ROOT, `.unregistered-${randomUUID()}`)
    mkdirSync(path, { recursive: true })
    projects.push(path)

    const listed = response()
    const listRequest = request('GET', {})
    listRequest.url = '/api/desktop/projects'
    await handleProjectLibraryRequest(listRequest, listed as never, TEST_ORIGIN)
    expect((listed.body as { projects: Array<{ path: string }> }).projects).not.toContainEqual(
      expect.objectContaining({ path }),
    )

    const deleted = response()
    const deleteRequest = request('POST', { path })
    deleteRequest.url = '/api/desktop/projects?action=delete'
    await handleProjectLibraryRequest(deleteRequest, deleted as never, TEST_ORIGIN)
    expect(deleted.status).toBe(404)
    expect(existsSync(path)).toBe(true)
  })

  it('rejects cross-origin and non-JSON mutations', async () => {
    const crossOrigin = request('POST', { name: `blocked-${randomUUID()}` })
    crossOrigin.url = '/api/desktop/projects'
    crossOrigin.headers.origin = 'http://evil.example'
    const forbidden = response()
    await handleProjectLibraryRequest(crossOrigin, forbidden as never, TEST_ORIGIN)
    expect(forbidden.status).toBe(403)

    const wrongType = request('POST', { name: `blocked-${randomUUID()}` })
    wrongType.url = '/api/desktop/projects'
    wrongType.headers['content-type'] = 'text/plain'
    const unsupported = response()
    await handleProjectLibraryRequest(wrongType, unsupported as never, TEST_ORIGIN)
    expect(unsupported.status).toBe(415)
  })
})
