/** File-backed resource inventory and portable ZIPs. Never loads preset code. */
import { createHash, randomUUID } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'
import { lstat, mkdir, readdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import AdmZip from 'adm-zip'
import { parseDocument } from 'yaml'
import type { LocalResource, ResourceKind, ResourcePreview } from './local-resources-contract.ts'

export const MAX_RESOURCE_ZIP = 20 * 1024 * 1024
const MAX_FILE = 10 * 1024 * 1024
const MAX_TOTAL = 50 * 1024 * 1024
const MAX_FILES = 2000
const MAIN = { skill: 'SKILL.md', preset: 'agent.cordis.yml' } as const
const OMIT = /^(?:\.git|node_modules|\.DS_Store|\.env(?:\..*)?)$/u
const ID = /^[a-z0-9][a-z0-9-]*$/u

export interface ResourceRoot {
  path: string
  kind: ResourceKind
  scope: string
  /** System preset roots reserve names but are not user-managed. */
  hidden?: boolean
  install?: boolean
}
interface DiskFile { path: string; size: number; mode: number }
interface FileData { path: string; data: Buffer; mode: number }
interface Archive { preview: ResourcePreview; files: FileData[] }

function fail(message: string): never { throw new Error(message) }
function validId(id: string, kind?: ResourceKind): void {
  if ((kind === 'skill' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) || !ID.test(id) || id.length > 64 || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/iu.test(id)) fail('Use a name of up to 64 lowercase letters, numbers and hyphens.')
}
function validPath(path: string): void {
  if (path.length > 500 || path.split('/').some(part => !part || part === '.' || part === '..'
    || /[<>:"\\|?*\u0000-\u001f]/u.test(part) || /[. ]$/u.test(part)
    || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/iu.test(part))) fail('The resource contains an unsupported file path.')
}
function yaml(text: string): unknown {
  // Unknown tags (including !!js) remain data; no constructors or plugins run.
  const document = parseDocument(text, { uniqueKeys: true })
  if (document.errors.length) fail('The resource contains invalid YAML.')
  return document.toJS({ maxAliasCount: 50 }) as unknown
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function skillHeader(text: string): { header: string; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/u.exec(text)
  if (!match) fail('SKILL.md must contain YAML name and description fields.')
  return { header: match[1]!, body: match[2]! }
}
function summary(kind: ResourceKind, id: string, files: FileData[], strict: boolean): ResourcePreview {
  const main = files.find(file => file.path === MAIN[kind])
  if (!main) fail(`Missing ${MAIN[kind]}.`)
  let metadata: Record<string, unknown> = {}
  if (kind === 'skill') {
    metadata = record(yaml(skillHeader(main.data.toString('utf8')).header))
    if (typeof metadata.name !== 'string' || typeof metadata.description !== 'string' || !metadata.description.trim()) fail('Skill name and description are required.')
    if (strict && metadata.name !== id) fail('The Skill name must match its folder name.')
  } else {
    const rows = yaml(main.data.toString('utf8'))
    const checkRows = (value: unknown, depth = 0): void => {
      if (depth > 30 || !Array.isArray(value)) fail('Preset configuration must be a list of plugin entries.')
      for (const item of value) {
        const row = record(item)
        if (typeof row.name !== 'string' || !row.name.trim()) fail('A preset plugin entry is missing its name.')
        if (row.group === true) checkRows(row.config, depth + 1)
      }
    }
    checkRows(rows)
    const info = files.find(file => file.path === 'preset.yml')
    if (info) metadata = record(yaml(info.data.toString('utf8')))
  }
  return { kind, id, name: typeof metadata.name === 'string' ? metadata.name : id,
    description: typeof metadata.description === 'string' ? metadata.description : '',
    files: files.map(file => ({ path: file.path, size: file.data.length })) }
}
async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}
/** Resolve the configured root first: shared roots may intentionally be links. */
async function resourceDirectory(root: string, id: string): Promise<string> {
  const canonicalRoot = await realpath(root)
  const path = join(canonicalRoot, id)
  const info = await lstat(path)
  const directory = await realpath(path)
  if (!info.isDirectory() || info.isSymbolicLink() || dirname(directory) !== canonicalRoot) {
    fail('Resource directories must stay inside their configured root.')
  }
  return directory
}
async function scanTree(directory: string): Promise<DiskFile[]> {
  const files: DiskFile[] = []
  let count = 0
  async function visit(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (OMIT.test(entry.name)) continue
      if (++count > MAX_FILES) fail('The resource contains too many files.')
      const path = join(dir, entry.name)
      const name = relative(directory, path).split(sep).join('/')
      validPath(name)
      const stat = await lstat(path)
      if (stat.isSymbolicLink()) fail('Symbolic links cannot be shared. Copy the actual resource files first.')
      if (stat.isDirectory()) { await visit(path); continue }
      if (!stat.isFile()) fail('Only regular resource files are supported.')
      files.push({ path: name, size: stat.size, mode: stat.mode })
    }
  }
  await visit(directory)
  return files.sort((a, b) => a.path.localeCompare(b.path))
}
async function readResourceFile(directory: string, path: string): Promise<Buffer> {
  validPath(path)
  let target = directory
  for (const part of path.split('/')) {
    if (OMIT.test(part)) fail('This file is excluded from resource sharing.')
    target = join(target, part)
    if ((await lstat(target)).isSymbolicLink()) fail('Symbolic links cannot be shared. Copy the actual resource files first.')
  }
  const canonical = await realpath(target)
  if (!canonical.startsWith(directory + sep)) fail('File is outside the resource directory.')
  const info = await lstat(canonical)
  if (!info.isFile() || info.size > MAX_FILE) fail('The resource exceeds the supported size (10 MB per file).')
  const data = await readFile(canonical)
  if (data.length !== info.size) fail('A resource file changed while being read. Try again.')
  return data
}
async function readTree(directory: string): Promise<FileData[]> {
  const entries = await scanTree(directory)
  if (entries.reduce((total, file) => total + file.size, 0) > MAX_TOTAL) fail('The resource exceeds the supported size (50 MB total).')
  const files: FileData[] = []
  for (const file of entries) files.push({ path: file.path, mode: file.mode, data: await readResourceFile(directory, file.path) })
  return files
}

export class LocalResources {
  constructor(private readonly roots: () => readonly ResourceRoot[]) {}

  async list(): Promise<LocalResource[]> {
    const result: LocalResource[] = []
    const seen = new Set<string>()
    for (const root of this.roots()) {
      if (root.hidden || !await exists(root.path)) continue
      for (const entry of await readdir(root.path, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || !ID.test(entry.name)) continue
        const directory = join(root.path, entry.name)
        const key = createHash('sha256').update(root.kind + '\0' + resolve(directory)).digest('hex')
        if (seen.has(key)) continue
        seen.add(key)
        let name = entry.name
        let description = ''
        try {
          const actual = await resourceDirectory(root.path, entry.name)
          const mainPath = join(actual, root.kind === 'skill' ? 'SKILL.md' : 'preset.yml')
          const stat = await lstat(mainPath)
          if (stat.isFile() && !stat.isSymbolicLink() && stat.size <= MAX_FILE) {
            const text = await readFile(mainPath, 'utf8')
            const data = record(yaml(root.kind === 'skill' ? skillHeader(text).header : text))
            if (typeof data.name === 'string') name = data.name
            if (typeof data.description === 'string') description = data.description
          }
        } catch { /* Damaged resources remain visible and addressable. */ }
        result.push({ key, kind: root.kind, id: entry.name, name, description, scope: root.scope })
      }
    }
    return result
  }

  private async locate(key: string): Promise<{ resource: LocalResource; directory: string }> {
    const resource = (await this.list()).find(item => item.key === key)
    if (!resource) fail('Resource no longer exists. Refresh the list.')
    const root = this.roots().find(root => !root.hidden && root.kind === resource.kind
      && createHash('sha256').update(root.kind + '\0' + resolve(root.path, resource.id)).digest('hex') === key)
    if (!root) fail('Resource directory is unavailable.')
    return { resource, directory: await resourceDirectory(root.path, resource.id) }
  }

  async detail(key: string): Promise<ResourcePreview> {
    const { resource, directory } = await this.locate(key)
    const files = await scanTree(directory)
    return { ...resource, files: files.map(file => ({ path: file.path, size: file.size })) }
  }

  async read(key: string, path: string): Promise<{ content: string | null }> {
    validPath(path)
    const { directory } = await this.locate(key)
    const data = await readResourceFile(directory, path)
    try {
      return { content: data.includes(0) ? null : new TextDecoder('utf-8', { fatal: true }).decode(data) }
    } catch { return { content: null } }
  }

  async export(key: string): Promise<{ name: string; data: Buffer }> {
    const { resource, directory } = await this.locate(key)
    validId(resource.id, resource.kind)
    const files = await readTree(directory)
    summary(resource.kind, resource.id, files, true)
    const archive = new AdmZip()
    for (const file of files) archive.addFile(`${resource.id}/${file.path}`, file.data, '', file.mode)
    const data = archive.toBuffer()
    if (data.length > MAX_RESOURCE_ZIP) fail('The ZIP exceeds 20 MB.')
    return { name: `${resource.id}.${resource.kind}.zip`, data }
  }

  private unpack(data: Buffer): Archive {
    if (data.length > MAX_RESOURCE_ZIP) fail('The ZIP exceeds 20 MB.')
    const entries = new AdmZip(data).getEntries()
    if (entries.length > MAX_FILES) fail('The ZIP contains too many files.')
    const names = new Set<string>()
    let bytes = 0
    let folder: string | undefined
    const files: FileData[] = []
    for (const entry of entries) {
      const path = entry.entryName.replace(/\/$/u, '')
      validPath(path)
      const lower = path.normalize('NFC').toLowerCase()
      if (names.has(lower)) fail('The ZIP contains duplicate file paths.')
      names.add(lower)
      const parts = path.split('/')
      folder ??= parts[0]!
      if (folder !== parts[0]) fail('The ZIP must contain one resource folder.')
      const type = (entry.attr >>> 16) & 0o170000
      if (type && type !== 0o100000 && type !== 0o040000) fail('ZIP links and special files are not supported.')
      if (entry.header.encrypted) fail('Encrypted ZIP files are not supported.')
      if (entry.isDirectory) continue
      if (parts.length < 2) fail('The ZIP must contain one resource folder.')
      if (parts.some(part => OMIT.test(part))) fail('Remove .env files, .git and node_modules before importing.')
      if (entry.header.size > MAX_FILE || (bytes += entry.header.size) > MAX_TOTAL) fail('The ZIP exceeds the supported uncompressed size.')
      // adm-zip bounds inflation by the declared size except when it is zero.
      if (entry.header.size === 0 && entry.header.method === 8) {
        if (inflateRawSync(entry.getCompressedData(), { maxOutputLength: 1 }).length !== 0) fail('Invalid ZIP file size.')
      }
      const content = entry.getData()
      if (content.length !== entry.header.size) fail('Invalid ZIP file size.')
      files.push({ path: parts.slice(1).join('/'), data: content, mode: entry.attr >>> 16 })
    }
    if (!folder) fail('The ZIP is empty.')
    validId(folder)
    const skill = files.some(file => file.path === MAIN.skill)
    const preset = files.some(file => file.path === MAIN.preset)
    if (skill === preset) fail('The folder must contain either SKILL.md or agent.cordis.yml.')
    validId(folder, skill ? 'skill' : 'preset')
    return { preview: summary(skill ? 'skill' : 'preset', folder, files, true), files }
  }

  preview(data: Buffer): ResourcePreview { return this.unpack(data).preview }

  async install(data: Buffer, newId?: string): Promise<ResourcePreview> {
    const { preview, files } = this.unpack(data)
    const id = newId?.trim() || preview.id
    validId(id, preview.kind)
    const roots = this.roots().filter(root => root.kind === preview.kind)
    const root = roots.find(root => root.install && !root.hidden)
    if (!root) fail('The user resource directory is unavailable.')
    // Reserve names across system, user and project roots: no silent shadowing.
    for (const candidate of roots) {
      if (await exists(candidate.path) && (await readdir(candidate.path)).some(name => name.toLowerCase() === id.toLowerCase())) {
        fail('A resource with this name already exists. Choose another name.')
      }
    }
    await mkdir(root.path, { recursive: true, mode: 0o700 })
    const canonicalRoot = await realpath(root.path)
    const staging = join(canonicalRoot, `.import-${randomUUID()}`)
    const destination = join(canonicalRoot, id)
    await mkdir(staging, { mode: 0o700 })
    try {
      for (const file of files) {
        let content = file.data
        if (preview.kind === 'skill' && file.path === 'SKILL.md' && id !== preview.id) {
          const { header, body } = skillHeader(content.toString('utf8'))
          const document = parseDocument(header)
          document.set('name', id)
          content = Buffer.from(`---\n${document.toString()}---\n${body}`)
        }
        const target = join(staging, file.path)
        await mkdir(dirname(target), { recursive: true, mode: 0o700 })
        await writeFile(target, content, { flag: 'wx', mode: 0o600 | (file.mode & 0o100) })
      }
      if (await exists(destination)) fail('A resource with this name already exists. Choose another name.')
      await rename(staging, destination)
    } finally { await rm(staging, { recursive: true, force: true }) }
    return { ...preview, id, ...(preview.kind === 'skill' ? { name: id } : {}) }
  }
}
