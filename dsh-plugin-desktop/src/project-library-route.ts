/** Strict loopback HTTP handlers for the Zenwit project library API. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync, type Dirent,
} from 'node:fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import { normalizeProjectTags, readProjectTags } from '@deepseek-ai/dsh-screenplay-project-library/types'
import { BodyTooLargeError, isJsonRequest, isSameOriginLoopbackRequest, readJson } from './desktop-http-security.ts'

/** Default project-library root (user projects are shared across instances). */
export const PROJECT_LIBRARY_ROOT = join(homedir(), 'Projects')

const PROJECT_METADATA_DIR = '.zenwit-project'
const PROJECT_METADATA_FILE = join(PROJECT_METADATA_DIR, 'project.json')
const MAX_PROJECT_BODY_BYTES = 2 * 1024 * 1024
const INVALID_BODY = Symbol('invalid project body')

function projectSlug(name: string): string {
  const slug = name.trim()
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '-')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^[.-]+|[.-]+$/gu, '')
    .slice(0, 80)
  return slug.length > 0 ? slug : 'short-drama'
}

interface ProjectSummary {
  name: string
  path: string
  agentId?: string
  tags: string[]
  updatedAt: number
}

function readSummary(dir: string): ProjectSummary | undefined {
  if (!hasProjectMarker(dir)) return undefined
  let agentId: string | undefined
  let tags: string[] = []
  try {
    const metadata = JSON.parse(readFileSync(join(dir, PROJECT_METADATA_FILE), 'utf8')) as { agentId?: unknown, tags?: unknown }
    if (typeof metadata.agentId === 'string' && metadata.agentId.trim() !== '') agentId = metadata.agentId.trim()
    tags = readProjectTags(metadata.tags)
  } catch {
    // Metadata is optional for existing folders.
  }
  const base = { name: basename(dir), path: dir, tags, ...(agentId === undefined ? {} : { agentId }) }
  try {
    return { ...base, updatedAt: statSync(dir).mtimeMs }
  } catch {
    return undefined
  }
}

function readMetadata(projectRoot: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(readFileSync(join(projectRoot, PROJECT_METADATA_FILE), 'utf8')) as unknown
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function writeProjectMetadata(projectRoot: string, metadata: Record<string, unknown>): void {
  const metadataDir = join(projectRoot, PROJECT_METADATA_DIR)
  const metadataPath = join(projectRoot, PROJECT_METADATA_FILE)
  mkdirSync(metadataDir, { recursive: true })
  const temporary = join(metadataDir, `.project-${randomBytes(6).toString('hex')}.tmp`)
  writeFileSync(temporary, JSON.stringify({ ...metadata, version: 2 }) + '\n')
  renameSync(temporary, metadataPath)
}

function finishJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  })
  res.end(JSON.stringify(value))
}

function authorize(req: IncomingMessage, res: ServerResponse, expectedOrigin: string, mutating: boolean): boolean {
  if (isSameOriginLoopbackRequest(req, expectedOrigin, mutating)) return true
  finishJson(res, 403, { error: 'forbidden' })
  return false
}

async function readBody(req: IncomingMessage, res: ServerResponse): Promise<unknown | typeof INVALID_BODY> {
  if (!isJsonRequest(req)) {
    finishJson(res, 415, { error: 'content type must be application/json' })
    return INVALID_BODY
  }
  try {
    return await readJson(req, MAX_PROJECT_BODY_BYTES)
  } catch (error) {
    const tooLarge = error instanceof BodyTooLargeError
    finishJson(res, tooLarge ? 413 : 400, { error: tooLarge ? 'request body is too large' : 'invalid JSON body' })
    return INVALID_BODY
  }
}

/** GET /api/desktop/projects — list screenplay projects under the library root. */
export async function handleProjectLibraryListRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (req.method !== 'GET') return finishJson(res, 405, { error: 'method not allowed' })
  if (!authorize(req, res, expectedOrigin, false)) return
  const root = PROJECT_LIBRARY_ROOT
  let children: string[] = []
  try {
    children = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
  } catch {
    children = []
  }
  const projects = children
    .map(name => readSummary(join(root, name)))
    .filter((summary): summary is ProjectSummary => summary !== undefined)
    .sort((a, b) => b.updatedAt - a.updatedAt)
  return finishJson(res, 200, { root, projects })
}

/** POST /api/desktop/projects — create a new screenplay project directory. */
export async function handleProjectLibraryCreateRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (req.method !== 'POST') return finishJson(res, 405, { error: 'method not allowed' })
  if (!authorize(req, res, expectedOrigin, true)) return
  const body = await readBody(req, res)
  if (body === INVALID_BODY) return
  const rawName = typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>).name
    : undefined
  const rawAgentId = typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>).agentId
    : undefined
  const rawTags = typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>).tags
    : undefined
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (name.length === 0) return finishJson(res, 400, { error: 'project name must not be empty' })
  let tags: string[]
  try { tags = normalizeProjectTags(rawTags ?? []) } catch (error) {
    return finishJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
  }
  const parent = PROJECT_LIBRARY_ROOT
  let projectRoot = ''
  try {
    mkdirSync(parent, { recursive: true })
    const slug = projectSlug(name)
    projectRoot = join(parent, slug)
    for (let index = 1; index < 1000; index += 1) {
      if (!existsSync(projectRoot)) break
      projectRoot = join(parent, slug + '-' + String(index + 1))
    }
    mkdirSync(join(projectRoot, PROJECT_METADATA_DIR), { recursive: true })
    const agentId = typeof rawAgentId === 'string' && rawAgentId.trim() !== '' ? rawAgentId.trim() : 'short-drama'
    writeProjectMetadata(projectRoot, { agentId, tags })
  } catch (error) {
    return finishJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
  const project = readSummary(projectRoot)
  if (project === undefined) return finishJson(res, 500, { error: 'created project could not be summarized' })
  return finishJson(res, 200, { project })
}

/** PATCH /api/desktop/projects — replace one project's user-owned tags. */
export async function handleProjectTagsUpdateRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (req.method !== 'PATCH') return finishJson(res, 405, { error: 'method not allowed' })
  if (!authorize(req, res, expectedOrigin, true)) return
  const body = await readBody(req, res)
  if (body === INVALID_BODY) return
  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}
  if (typeof record.path !== 'string' || record.path.trim().length === 0) {
    return finishJson(res, 400, { error: 'project path is required' })
  }
  let tags: string[]
  try { tags = normalizeProjectTags(record.tags) } catch (error) {
    return finishJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
  }
  const root = canonicalPath(PROJECT_LIBRARY_ROOT)
  const target = canonicalPath(record.path.trim())
  if (target === root || dirname(target) !== root || !isInsideLibrary(target)) {
    return finishJson(res, 403, { error: 'path must be a registered project directly under the project library' })
  }
  if (!hasProjectMarker(target)) return finishJson(res, 404, { error: 'project does not exist' })
  try {
    writeProjectMetadata(target, { ...readMetadata(target), tags })
  } catch (error) {
    return finishJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
  const project = readSummary(target)
  if (project === undefined) return finishJson(res, 500, { error: 'updated project could not be summarized' })
  return finishJson(res, 200, { project })
}

/** POST /api/desktop/projects/delete — permanently remove one project directory. */
export async function handleProjectLibraryDeleteRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (req.method !== 'POST') return finishJson(res, 405, { error: 'method not allowed' })
  if (!authorize(req, res, expectedOrigin, true)) return
  const body = await readBody(req, res)
  if (body === INVALID_BODY) return
  const rawPath = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).path : undefined
  if (typeof rawPath !== 'string' || rawPath.trim().length === 0) return finishJson(res, 400, { error: 'project path is required' })
  const root = canonicalPath(PROJECT_LIBRARY_ROOT)
  const target = canonicalPath(rawPath.trim())
  if (target === root || dirname(target) !== root || !isInsideLibrary(target)) {
    return finishJson(res, 403, { error: 'path must be a registered project directly under the project library' })
  }
  if (!hasProjectMarker(target)) return finishJson(res, 404, { error: 'project does not exist' })
  try {
    rmSync(target, { recursive: true, force: false })
  } catch (error) {
    return finishJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
  return finishJson(res, 200, { ok: true, path: target })
}


/** Route dispatch: GET lists, POST creates. */
export async function handleProjectLibraryRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (req.method === 'GET') return handleProjectLibraryListRequest(req, res, expectedOrigin)
  if (req.method === 'PATCH') return handleProjectTagsUpdateRequest(req, res, expectedOrigin)
  if (req.method === 'POST') {
    const url = new URL(req.url ?? '', 'http://localhost')
    if (url.searchParams.get('action') === 'delete') return handleProjectLibraryDeleteRequest(req, res, expectedOrigin)
    return handleProjectLibraryCreateRequest(req, res, expectedOrigin)
  }
  return finishJson(res, 405, { error: 'method not allowed' })
}

/** One real tree node: a directory or file under the project root. */
export interface TreeNode {
  name: string
  path: string
  kind: 'file' | 'dir'
  /** Word count for .md files, byte size for others, '' for directories. */
  detail: string
  children?: TreeNode[]
}

/** Rough word count (CJK chars + Latin words) for a markdown file. */
function wordCount(file: string): number {
  try {
    const text = readFileSync(file, 'utf8')
    const cjk = text.match(/[一-鿿]/g)?.length ?? 0
    const latin = text.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length
    return cjk + latin
  } catch {
    return 0
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileDetail(file: string): string {
  try {
    return extname(file) === '.md' ? wordCount(file) + ' 字' : formatBytes(statSync(file).size)
  } catch {
    return ''
  }
}

/** Recursively scan user-facing project content (skips private state and generated manifest files). */
function scanDir(dir: string, depth = 0): TreeNode[] {
  if (depth > 8) return []
  let entries: Dirent[] = []
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.name !== '.DS_Store'
        && !e.name.startsWith('.'))
  } catch {
    return []
  }
  const dirs = entries.filter(e => e.isDirectory())
  const files = entries.filter(e => !e.isDirectory())
  const ordered = [...dirs, ...files].sort((a, b) => a.name.localeCompare(b.name))
  return ordered.map(e => {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      return { name: e.name, path: full, kind: 'dir' as const, detail: '', children: scanDir(full, depth + 1) }
    }
    return {
      name: extname(e.name) === '.md' ? e.name.replace(/\.md$/, '') : e.name,
      path: full,
      kind: 'file' as const,
      detail: fileDetail(full),
    }
  })
}

export interface ProjectResource {
  name: string
  path: string
  kind: 'file'
  detail: string
}

/** Flatten user-editable text files for the @ resource picker. */
function scanResources(dir: string, root: string, depth = 0): ProjectResource[] {
  if (depth > 8) return []
  let entries: Dirent[] = []
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.name !== '.DS_Store' && !e.name.startsWith('.'))
  } catch {
    return []
  }
  const result: ProjectResource[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...scanResources(full, root, depth + 1))
      continue
    }
    if (!/\.(?:md|markdown|txt|json|yaml|yml)$/iu.test(entry.name)) continue
    const relativePath = relative(root, full).split(sep).join('/')
    result.push({ name: relativePath, path: full, kind: 'file', detail: fileDetail(full) })
  }
  return result
}

/** A project is a direct library child with readable Zenwit project metadata. */
function hasProjectMarker(dir: string): boolean {
  try {
    const canonical = canonicalPath(dir)
    if (dirname(canonical) !== canonicalPath(PROJECT_LIBRARY_ROOT) || !statSync(canonical).isDirectory()) return false
    const metadata = JSON.parse(readFileSync(join(canonical, PROJECT_METADATA_FILE), 'utf8')) as unknown
    return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
  } catch {
    return false
  }
}

/**
 * Resolve a path to its canonical real location (realpath with ancestor
 * fallback for a not-yet-existing file). Symlinks are resolved so a link
 * escaping the library root cannot smuggle a read or write across it.
 */
function canonicalPath(p: string): string {
  try { return realpathSync(p) } catch { /* fall through */ }
  let current = resolve(p)
  const tail: string[] = []
  while (!existsSync(current)) {
    const parent = dirname(current)
    if (parent === current) break
    tail.unshift(basename(current))
    current = parent
  }
  try { return join(realpathSync(current), ...tail) } catch { return resolve(p) }
}

/** True when a path descends from a project's private metadata directory. */
function isInsideStateDir(project: string, target: string): boolean {
  return relative(project, canonicalPath(target)).split(sep).includes(PROJECT_METADATA_DIR)
}

function validNodeName(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const stem = value.split('.', 1)[0]?.toUpperCase()
  return value.trim() !== ''
    && value === value.trim()
    && value !== '.' && value !== '..'
    && !/[<>:"/\\|?*\0\u0000-\u001f]/u.test(value)
    && !/[. ]$/u.test(value)
    && !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(stem ?? '')
    && value !== PROJECT_METADATA_DIR
}

function hasTraversalSegment(value: string): boolean {
  return value.split(/[\\/]+/u).some(segment => segment === '.' || segment === '..')
}

/** Resolve the enclosing project for a file, or undefined outside the library. */
function enclosingProjectRoot(filePath: string): string | undefined {
  const root = canonicalPath(PROJECT_LIBRARY_ROOT)
  const canonical = canonicalPath(filePath)
  if (canonical !== root && !canonical.startsWith(root + sep)) return undefined
  let dir = dirname(canonical)
  while (true) {
    if (hasProjectMarker(dir)) return dir
    if (dir === root || dirname(dir) === dir) return undefined
    dir = dirname(dir)
  }
}

function projectForNodePath(filePath: string): string | undefined {
  const target = canonicalPath(filePath)
  if (isProjectPath(target)) return target
  return enclosingProjectRoot(target)
}

/** Validate an existing project file or directory for native desktop actions. */
export function isSafeProjectPath(filePath: string): boolean {
  const target = canonicalPath(filePath)
  const project = projectForNodePath(target)
  return project !== undefined && existsSync(target) && !isInsideStateDir(project, target)
}

function nodeError(res: ServerResponse, status: number, message: string): void {
  finishJson(res, status, { error: message })
}

/** POST/PATCH/DELETE /api/desktop/projects/node — daily file operations. */
export async function handleProjectNodeRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (!authorize(req, res, expectedOrigin, true)) return
  const body = await readBody(req, res)
  if (body === INVALID_BODY) return
  const value = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}
  const rawPath = value.path
  if (typeof rawPath !== 'string' || rawPath.trim() === '') return nodeError(res, 400, 'path is required')
  const path = rawPath.trim()
  if (hasTraversalSegment(path)) return nodeError(res, 400, 'path traversal is not allowed')

  if (req.method === 'POST') {
    const kind = value.kind
    if (kind !== 'file' && kind !== 'directory') return nodeError(res, 400, 'kind must be file or directory')
    const parent = canonicalPath(dirname(path))
    const project = projectForNodePath(parent)
    if (project === undefined || isInsideStateDir(project, parent)) return nodeError(res, 403, 'path outside project')
    if (!validNodeName(basename(path))) return nodeError(res, 400, 'invalid node name')
    const target = join(parent, basename(path))
    if (!isInsideLibrary(target) || existsSync(target)) return nodeError(res, existsSync(target) ? 409 : 403, existsSync(target) ? 'a node with that name already exists' : 'path outside project')
    try {
      if (kind === 'directory') mkdirSync(target)
      else writeFileSync(target, '')
      return finishJson(res, 200, { ok: true, path: target, node: { name: basename(target), path: target, kind } })
    } catch (error) { return nodeError(res, 500, error instanceof Error ? error.message : String(error)) }
  }

  const project = projectForNodePath(path)
  const target = canonicalPath(path)
  if (project === undefined || target === project || isInsideStateDir(project, target)) return nodeError(res, 403, 'cannot modify this path')
  if (!existsSync(target)) return nodeError(res, 404, 'node not found')

  if (req.method === 'PATCH') {
    if (!validNodeName(value.newName)) return nodeError(res, 400, 'invalid node name')
    const next = join(dirname(target), value.newName)
    if (!isInsideLibrary(next) || existsSync(next)) return nodeError(res, existsSync(next) ? 409 : 403, existsSync(next) ? 'a node with that name already exists' : 'path outside project')
    try {
      const kind = statSync(target).isDirectory() ? 'directory' : 'file'
      renameSync(target, next)
      return finishJson(res, 200, { ok: true, path: next, node: { name: basename(next), path: next, kind } })
    }
    catch (error) { return nodeError(res, 500, error instanceof Error ? error.message : String(error)) }
  }

  if (req.method === 'DELETE') {
    try { rmSync(target, { recursive: true, force: false }); return finishJson(res, 200, { ok: true, path: target }) }
    catch (error) { return nodeError(res, 500, error instanceof Error ? error.message : String(error)) }
  }
  return finishJson(res, 405, { error: 'method not allowed' })
}

/**
 * GET /api/desktop/projects/structure?path=<projectDir> — recursively map the
 * project's real file tree onto the structure surface.
 */
export async function handleProjectLibraryStructureRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (req.method !== 'GET') return finishJson(res, 405, { error: 'method not allowed' })
  if (!authorize(req, res, expectedOrigin, false)) return
  const url = new URL(req.url ?? '', 'http://localhost')
  const projectPath = url.searchParams.get('path')
  if (projectPath === null || projectPath.length === 0) {
    return finishJson(res, 400, { error: 'path query is required' })
  }
  if (!isProjectPath(projectPath)) {
    return finishJson(res, 403, { error: 'path outside project library' })
  }
  const metadata = (() => {
    try { return JSON.parse(readFileSync(join(projectPath, PROJECT_METADATA_FILE), 'utf8')) as { agentId?: unknown } } catch { return {} }
  })()
  const tree = scanDir(projectPath)
  return finishJson(res, 200, { path: projectPath, tree, root: basename(projectPath), ...(typeof metadata.agentId === 'string' ? { agentId: metadata.agentId } : {}) })
}

/** GET /api/desktop/projects/resources?path=<projectDir> — files for @ references. */
export async function handleProjectLibraryResourcesRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  if (req.method !== 'GET') return finishJson(res, 405, { error: 'method not allowed' })
  if (!authorize(req, res, expectedOrigin, false)) return
  const url = new URL(req.url ?? '', 'http://localhost')
  const projectPath = url.searchParams.get('path')
  if (projectPath === null || projectPath.length === 0) return finishJson(res, 400, { error: 'path query is required' })
  if (!isProjectPath(projectPath)) return finishJson(res, 403, { error: 'path outside project library' })
  return finishJson(res, 200, { resources: scanResources(projectPath, projectPath) })
}

/**
 * GET /api/desktop/projects/file?path=<absFile> — read a project file.
 * POST /api/desktop/projects/file — write a project file (atomic-ish).
 */
export async function handleProjectFileRequest(req: IncomingMessage, res: ServerResponse, expectedOrigin: string): Promise<void> {
  const url = new URL(req.url ?? '', 'http://localhost')
  if (req.method === 'GET') {
    if (!authorize(req, res, expectedOrigin, false)) return
    const filePath = url.searchParams.get('path')
    if (filePath === null || filePath.length === 0) return finishJson(res, 400, { error: 'path query is required' })
    const project = enclosingProjectRoot(filePath)
    if (project === undefined) return finishJson(res, 403, { error: 'path outside a project' })
    const target = canonicalPath(filePath)
    if (isInsideStateDir(project, target)) return finishJson(res, 403, { error: 'cannot read project metadata' })
    try {
      const content = readFileSync(target, 'utf8')
      return finishJson(res, 200, { content })
    } catch {
      return finishJson(res, 404, { error: 'file not found' })
    }
  }
  if (req.method === 'POST') {
    if (!authorize(req, res, expectedOrigin, true)) return
    const body = await readBody(req, res)
    if (body === INVALID_BODY) return
    const b = body as Record<string, unknown>
    const filePath = typeof b.path === 'string' ? b.path : ''
    const content = typeof b.content === 'string' ? b.content : ''
    if (filePath.length === 0) return finishJson(res, 400, { error: 'path is required' })
    // Writes stay inside a registered project and never touch its metadata.
    const project = enclosingProjectRoot(filePath)
    if (project === undefined) return finishJson(res, 403, { error: 'path outside a project' })
    const target = canonicalPath(filePath)
    if (isInsideStateDir(project, target)) return finishJson(res, 403, { error: 'cannot write project metadata' })
    const parent = dirname(target)
    if (!existsSync(parent)) return finishJson(res, 400, { error: 'parent directory does not exist' })
    // Atomic write: temp file in the same directory, then rename over the target.
    const tmp = join(parent, '.' + basename(target) + '.' + randomBytes(6).toString('hex') + '.tmp')
    try {
      writeFileSync(tmp, content)
      renameSync(tmp, target)
      return finishJson(res, 200, { ok: true })
    } catch (error) {
      try { if (existsSync(tmp)) renameSync(tmp, target) } catch { /* ignore */ }
      return finishJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
    }
  }
  return finishJson(res, 405, { error: 'method not allowed' })
}

function isInsideLibrary(filePath: string): boolean {
  const root = resolve(PROJECT_LIBRARY_ROOT)
  const target = resolve(filePath)
  if (target !== root && !target.startsWith(root + sep)) return false
  try {
    const realRoot = realpathSync(root)
    const realTarget = realpathSync(target)
    return realTarget === realRoot || realTarget.startsWith(realRoot + sep)
  } catch {
    // For a new file, validate the nearest existing parent instead.
    try {
      const realRoot = realpathSync(root)
      let parent = target
      while (!existsSync(parent)) {
        const next = resolve(parent, '..')
        if (next === parent) return false
        parent = next
      }
      const realParent = realpathSync(parent)
      return realParent === realRoot || realParent.startsWith(realRoot + sep)
    } catch {
      return false
    }
  }
}

function isProjectPath(projectPath: string): boolean {
  if (!isInsideLibrary(projectPath)) return false
  try {
    const realPath = realpathSync(projectPath)
    return hasProjectMarker(realPath)
  } catch {
    return false
  }
}
