import { mkdtemp, mkdir, readFile, readdir, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import AdmZip from 'adm-zip'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalResources, type ResourceRoot } from '../src/local-resources.ts'
import { handleLocalResourcesRequest } from '../src/local-resources-route.ts'

const temporary: string[] = []
async function setup() {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'zenwit-resources-')))
  temporary.push(home)
  const roots: ResourceRoot[] = [
    { path: join(home, 'skills'), kind: 'skill', scope: 'user', install: true },
    { path: join(home, 'presets'), kind: 'preset', scope: 'user', install: true },
    { path: join(home, 'system'), kind: 'preset', scope: 'system', hidden: true },
    { path: join(home, 'project/skills'), kind: 'skill', scope: 'project' },
  ]
  return { home, roots, resources: new LocalResources(() => roots) }
}
async function put(home: string, path: string, content: string | Buffer, mode = 0o600) {
  const target = join(home, path)
  await mkdir(join(target, '..'), { recursive: true })
  await writeFile(target, content, { mode })
}
const skill = '---\nname: example\ndescription: Example skill\n---\nRead references/中文.md\n'
function archive(files: Record<string, string>): Buffer {
  const zip = new AdmZip()
  for (const [path, content] of Object.entries(files)) zip.addFile(path, Buffer.from(content))
  return zip.toBuffer()
}
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

describe('local resource sharing', () => {
  it('views, exports and imports through linked Skill and preset roots', async () => {
    const a = await setup(); const b = await setup()
    for (const current of [a, b]) {
      await mkdir(join(current.home, 'actual'), { recursive: true })
      for (const name of ['skills', 'presets']) {
        await mkdir(join(current.home, 'actual', name))
        await symlink(join(current.home, 'actual', name), join(current.home, name), process.platform === 'win32' ? 'junction' : 'dir')
      }
    }
    await put(a.home, 'skills/example/SKILL.md', skill)
    await put(a.home, 'presets/writer/agent.cordis.yml', '- name: example\n')
    const items = await a.resources.list()
    expect(items.find(item => item.kind === 'skill')!.description).toBe('Example skill')
    for (const item of items) {
      const detail = await a.resources.detail(item.key)
      expect(detail.files).toHaveLength(1)
      expect((await a.resources.read(item.key, detail.files[0]!.path)).content).toBeTruthy()
      const zip = await a.resources.export(item.key)
      await b.resources.install(zip.data)
    }
    expect(await b.resources.list()).toHaveLength(2)
  })

  it('does not follow a resource directory replaced with a link outside its root', async () => {
    const { home, resources } = await setup()
    await put(home, 'skills/example/SKILL.md', skill)
    const [item] = await resources.list()
    await rename(join(home, 'skills/example'), join(home, 'outside'))
    await symlink(join(home, 'outside'), join(home, 'skills/example'), process.platform === 'win32' ? 'junction' : 'dir')
    await expect(resources.detail(item!.key)).rejects.toThrow()
    await expect(resources.export(item!.key)).rejects.toThrow()
  })

  it('can inspect the main file when an unrelated attachment exceeds export limits', async () => {
    const { home, resources } = await setup()
    await put(home, 'skills/example/SKILL.md', skill)
    await put(home, 'skills/example/assets/large.bin', Buffer.alloc(10 * 1024 * 1024 + 1))
    const [item] = await resources.list()
    expect((await resources.detail(item!.key)).files).toHaveLength(2)
    expect(await resources.read(item!.key, 'SKILL.md')).toEqual({ content: skill })
    await expect(resources.export(item!.key)).rejects.toThrow('size')
  })

  it('round-trips a Skill into a different user home, including references, binary assets and executable scripts', async () => {
    const a = await setup(); const b = await setup()
    await put(a.home, 'skills/example/SKILL.md', skill)
    await put(a.home, 'skills/example/references/中文.md', '参考内容')
    await put(a.home, 'skills/example/assets/image.bin', Buffer.from([0, 1, 255]))
    await put(a.home, 'skills/example/scripts/run.sh', '#!/bin/sh\necho ok\n', 0o700)
    await put(a.home, 'skills/example/.env', 'DO_NOT_EXPORT=secret')
    const [item] = await a.resources.list()
    expect(item).toMatchObject({ name: 'example', description: 'Example skill', scope: 'user' })
    expect(await a.resources.read(item!.key, 'references/中文.md')).toEqual({ content: '参考内容' })
    expect(await a.resources.read(item!.key, 'assets/image.bin')).toEqual({ content: null })
    const zip = await a.resources.export(item!.key)
    expect(b.resources.preview(zip.data).files.map(file => file.path)).not.toContain('.env')
    await b.resources.install(zip.data)
    expect(await readFile(join(b.home, 'skills/example/SKILL.md'), 'utf8')).toBe(skill)
    expect(await readFile(join(b.home, 'skills/example/assets/image.bin'))).toEqual(Buffer.from([0, 1, 255]))
    if (process.platform !== 'win32') expect((await stat(join(b.home, 'skills/example/scripts/run.sh'))).mode & 0o100).toBe(0o100)
    expect(await b.resources.list()).toHaveLength(1)
  })

  it('round-trips a preset and nested Skills without evaluating !!js expressions', async () => {
    const a = await setup(); const b = await setup()
    const composition = '- name: "@deepseek-ai/dsh-skill-filesystem"\n  config:\n    customSkillDirs:\n      - !!js "throw new Error(\'must not run\')"\n'
    await put(a.home, 'presets/writer/agent.cordis.yml', composition)
    await put(a.home, 'presets/writer/preset.yml', 'name: 我的写作助手\ndescription: 写作\n')
    await put(a.home, 'presets/writer/skills/example/SKILL.md', skill)
    const [item] = await a.resources.list()
    const zip = await a.resources.export(item!.key)
    expect(b.resources.preview(zip.data)).toMatchObject({ kind: 'preset', name: '我的写作助手' })
    await b.resources.install(zip.data)
    expect(await readFile(join(b.home, 'presets/writer/agent.cordis.yml'), 'utf8')).toBe(composition)
    expect(await readFile(join(b.home, 'presets/writer/skills/example/SKILL.md'), 'utf8')).toBe(skill)
  })

  it('keeps same-name resources in different scopes visible and refuses overwrites; rename updates Skill frontmatter', async () => {
    const { home, resources } = await setup()
    await put(home, 'skills/example/SKILL.md', skill)
    await put(home, 'project/skills/example/SKILL.md', skill)
    const items = await resources.list()
    expect(items).toHaveLength(2)
    expect(new Set(items.map(item => item.key)).size).toBe(2)
    const zip = await resources.export(items[0]!.key)
    await expect(resources.install(zip.data)).rejects.toThrow('already exists')
    await resources.install(zip.data, 'example-copy')
    expect(await readFile(join(home, 'skills/example-copy/SKILL.md'), 'utf8')).toContain('name: example-copy')
    expect(await readFile(join(home, 'skills/example/SKILL.md'), 'utf8')).toBe(skill)
  })

  it('shares existing preset IDs that contain consecutive hyphens', async () => {
    const { home, resources } = await setup()
    await put(home, 'presets/my--writer/agent.cordis.yml', '- name: example\n')
    const [item] = await resources.list()
    expect(item!.id).toBe('my--writer')
    const zip = await resources.export(item!.key)
    expect(resources.preview(zip.data).id).toBe('my--writer')
  })

  it('bounds decompression even when a corrupt ZIP declares zero bytes', async () => {
    const { resources } = await setup()
    const zip = new AdmZip(archive({ 'example/SKILL.md': skill, 'example/large.txt': 'x'.repeat(100_000) }))
    zip.getEntry('example/large.txt')!.header.size = 0
    await expect(resources.install(zip.toBuffer())).rejects.toThrow()
  })

  it('reserves bundled preset IDs and never exposes bundled presets as user resources', async () => {
    const { home, resources } = await setup()
    await put(home, 'system/writer/agent.cordis.yml', '- name: example\n')
    expect(await resources.list()).toEqual([])
    await expect(resources.install(archive({ 'writer/agent.cordis.yml': '- name: example\n' }))).rejects.toThrow('already exists')
  })

  it('lists damaged resources so their contents can still be inspected', async () => {
    const { home, resources } = await setup()
    await put(home, 'presets/broken/agent.cordis.yml', 'broken: [')
    const [item] = await resources.list()
    expect((await resources.detail(item!.key)).files).toHaveLength(1)
    expect(await resources.read(item!.key, 'agent.cordis.yml')).toEqual({ content: 'broken: [' })
    await expect(resources.export(item!.key)).rejects.toThrow('invalid YAML')
  })

  it('rejects malformed, ambiguous and oversized packages before creating any files', async () => {
    const { home, resources } = await setup()
    for (const data of [Buffer.from('not a zip'), archive({ 'example/notes.md': 'missing main' }),
      archive({ 'example/SKILL.md': skill, 'example/agent.cordis.yml': '[]' }),
      archive({ 'example/SKILL.md': skill, 'example/huge.txt': 'x'.repeat(10 * 1024 * 1024 + 1) }),
      archive({ 'example/SKILL.md': skill, 'example/A.md': 'a', 'example/a.md': 'b' }),
      archive({ 'example/SKILL.md': skill, 'example/.env': 'secret' }),
      archive({ 'example/SKILL.md': skill, 'example/nul.txt': 'bad' }),
    ]) await expect(resources.install(data)).rejects.toThrow()
    expect(await readdir(home)).toEqual([])
  })

  it('rejects traversal, symlinks and unknown resource keys', async () => {
    const { home, resources } = await setup()
    await put(home, 'skills/example/SKILL.md', skill)
    const [item] = await resources.list()
    await expect(resources.read(item!.key, '../outside')).rejects.toThrow('path')
    await expect(resources.detail('unknown')).rejects.toThrow('no longer exists')
    if (process.platform !== 'win32') {
      await put(home, 'private.txt', 'private')
      await symlink(join(home, 'private.txt'), join(home, 'skills/example/link'))
      await expect(resources.export(item!.key)).rejects.toThrow('Symbolic links')
    }
    const zip = new AdmZip()
    zip.addFile('example/SKILL.md', Buffer.from(skill))
    zip.addFile('example/link', Buffer.from('../private'))
    zip.getEntry('example/link')!.attr = (0o120777 << 16) >>> 0
    await expect(resources.install(zip.toBuffer())).rejects.toThrow('links')
    const traversal = archive({ 'example/SKILL.md': skill, 'example/xx/file': 'oops' })
    // Rewrite both ZIP names without relying on the writer's own sanitization.
    const tampered = Buffer.from(traversal.toString('latin1').replaceAll('example/xx/file', 'example/../file'), 'latin1')
    await expect(resources.install(tampered)).rejects.toThrow('path')
  })

  it('cleans up a partially staged import when archive paths conflict', async () => {
    const { home, resources } = await setup()
    const zip = archive({ 'example/SKILL.md': skill, 'example/references': 'file', 'example/references/a.md': 'nested' })
    await expect(resources.install(zip)).rejects.toThrow()
    expect(await readdir(join(home, 'skills'))).toEqual([])
  })
})

const ORIGIN = 'http://127.0.0.1:19473'
function request(method: string, action: string, data: Buffer = Buffer.alloc(0), origin = ORIGIN): IncomingMessage {
  const req = Readable.from([data]) as IncomingMessage
  req.method = method; req.url = `/api/desktop/local-resources?action=${action}`
  req.headers = { host: '127.0.0.1:19473', origin, 'content-type': 'application/zip', 'sec-fetch-site': 'same-origin' }
  Object.defineProperty(req, 'socket', { value: { remoteAddress: '127.0.0.1' } })
  return req
}
function response() {
  const result = { status: 0, body: Buffer.alloc(0), writeHead(status: number) { result.status = status }, end(body: string | Buffer) { result.body = Buffer.from(body) } }
  return result
}
describe('local resource endpoint', () => {
  it('serves the full preview/install/list/detail/read/export workflow', async () => {
    const { resources } = await setup()
    const zip = archive({ 'example/SKILL.md': skill })
    for (const action of ['preview', 'import']) {
      const res = response()
      await handleLocalResourcesRequest(request('POST', action, zip), res as unknown as ServerResponse, ORIGIN, resources)
      expect(res.status).toBe(200)
    }
    const [item] = await resources.list()
    for (const action of ['list', `detail&key=${item!.key}`, `read&key=${item!.key}&path=SKILL.md`, `export&key=${item!.key}`]) {
      const res = response()
      await handleLocalResourcesRequest(request('GET', action), res as unknown as ServerResponse, ORIGIN, resources)
      expect(res.status).toBe(200)
      if (action.startsWith('export')) expect(resources.preview(res.body).id).toBe('example')
    }
  })
  it('rejects foreign origins and invalid packages without modifying the user directory', async () => {
    const { home, resources } = await setup()
    const res = response()
    await handleLocalResourcesRequest(request('POST', 'import', Buffer.alloc(0), 'https://example.com'), res as unknown as ServerResponse, ORIGIN, resources)
    expect(res.status).toBe(403)
    const invalid = response()
    await handleLocalResourcesRequest(request('POST', 'preview', Buffer.from('bad')), invalid as unknown as ServerResponse, ORIGIN, resources)
    expect(invalid.status).toBe(400)
    expect(await readdir(home)).toEqual([])
  })
})
