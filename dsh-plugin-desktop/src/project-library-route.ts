/** Strict loopback HTTP handlers for the Zenwit project library API. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync, type Dirent,
} from 'node:fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { randomBytes } from 'node:crypto'
import { homedir } from 'node:os'

/** Default project-library root (user projects are shared across instances). */
export const PROJECT_LIBRARY_ROOT = join(homedir(), 'ShortDrama')

const LAYOUT_MARKER = join('.screenplay', 'layout.json')
const LAUNCHER_MARKER = join('.screenplay', 'launcher')
const STATE_FILE = join('.screenplay', 'state.json')

/** Project subdirectories created for a new screenplay project (zh-CN-v1 layout). */
const PROJECT_DIRECTORIES = [
  '参考文件',
  '创作合同',
  '设定',
  join('人物', '主要人物'),
  join('人物', '其他人物'),
  '大纲',
  '分集大纲',
  '剧本',
  '交付',
] as const

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
  layout: 'zh-CN-v1' | 'legacy-en-v1'
  phase: 'Intake' | 'Ready' | 'ChangePending'
  revision: number
  updatedAt: number
  hasContract: boolean
  writing?: { completed: number, total: number }
}

function readSummary(dir: string): ProjectSummary | undefined {
  const launcher = join(dir, LAUNCHER_MARKER)
  const hasMarker = existsSync(launcher) || existsSync(join(dir, '创作合同'))
  if (!hasMarker) return undefined
  let layout: ProjectSummary['layout'] = 'zh-CN-v1'
  try {
    const parsed = JSON.parse(readFileSync(join(dir, LAYOUT_MARKER), 'utf8')) as { layout?: string }
    if (parsed.layout === 'zh-CN-v1' || parsed.layout === 'legacy-en-v1') layout = parsed.layout
  } catch {
    // fall through
  }
  const base = { name: basename(dir), path: dir, layout }
  try {
    const state = JSON.parse(readFileSync(join(dir, STATE_FILE), 'utf8')) as {
      phase?: string, revision?: number, updatedAt?: number,
      writingProgress?: { completedEpisodes?: number[], totalEpisodes?: number },
    }
    const phase: ProjectSummary['phase'] = state.phase === 'ChangePending' ? 'ChangePending'
      : state.phase === 'Ready' ? 'Ready' : 'Intake'
    const p = state.writingProgress
    const writing = p !== undefined && typeof p.totalEpisodes === 'number'
      ? { completed: p.completedEpisodes?.length ?? 0, total: p.totalEpisodes }
      : undefined
    return {
      ...base,
      phase,
      revision: typeof state.revision === 'number' ? state.revision : 0,
      updatedAt: typeof state.updatedAt === 'number' ? state.updatedAt : 0,
      hasContract: existsSync(join(dir, '创作合同', 'creative-contract.md')),
      ...(writing === undefined ? {} : { writing }),
    }
  } catch {
    return { ...base, phase: 'Intake', revision: 0, updatedAt: statSync(dir).mtimeMs, hasContract: false }
  }
}

function finishJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(value))
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch (error) { reject(error) }
    })
    req.on('error', reject)
  })
}

/** GET /api/desktop/projects — list screenplay projects under the library root. */
export async function handleProjectLibraryListRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') return finishJson(res, 405, { error: 'method not allowed' })
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
export async function handleProjectLibraryCreateRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') return finishJson(res, 405, { error: 'method not allowed' })
  let body: unknown
  try { body = await readBody(req) } catch { return finishJson(res, 400, { error: 'invalid JSON body' }) }
  const rawName = typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>).name
    : undefined
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (name.length === 0) return finishJson(res, 400, { error: 'project name must not be empty' })
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
    mkdirSync(join(projectRoot, '.screenplay'), { recursive: true })
    mkdirSync(join(projectRoot, LAUNCHER_MARKER), { recursive: true })
    for (const directory of PROJECT_DIRECTORIES) mkdirSync(join(projectRoot, directory), { recursive: true })
    const layoutPath = join(projectRoot, LAYOUT_MARKER)
    if (!existsSync(layoutPath)) writeFileSync(layoutPath, JSON.stringify({ layout: 'zh-CN-v1' }) + '\n')
  } catch (error) {
    return finishJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
  const project = readSummary(projectRoot)
  if (project === undefined) return finishJson(res, 500, { error: 'created project could not be summarized' })
  return finishJson(res, 200, { project })
}


/** Route dispatch: GET lists, POST creates. */
export async function handleProjectLibraryRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'GET') return handleProjectLibraryListRequest(req, res)
  if (req.method === 'POST') return handleProjectLibraryCreateRequest(req, res)
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
        && e.name !== '.screenplay'
        && e.name !== 'screenplay.project.json'
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
      .filter(e => e.name !== '.DS_Store' && e.name !== '.screenplay'
        && e.name !== 'screenplay.project.json' && !e.name.startsWith('.'))
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

/** A directory is a registered screenplay project when it carries the launcher marker. */
function hasProjectMarker(dir: string): boolean {
  return existsSync(join(dir, LAUNCHER_MARKER)) || existsSync(join(dir, '创作合同'))
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

/** True when a path descends from a project's .screenplay state directory. */
function isInsideStateDir(project: string, target: string): boolean {
  return relative(project, canonicalPath(target)).split(sep).includes('.screenplay')
}

/** Resolve the enclosing registered screenplay project for a file, or undefined outside the library. */
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

/**
 * GET /api/desktop/projects/structure?path=<projectDir> — recursively map the
 * project's real file tree onto the structure surface. The state file is only
 * a hint for phase/revision/nextEpisode; existence comes from the disk so the
 * tree always reflects what is actually in the project folder.
 */
export async function handleProjectLibraryStructureRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') return finishJson(res, 405, { error: 'method not allowed' })
  const url = new URL(req.url ?? '', 'http://localhost')
  const projectPath = url.searchParams.get('path')
  if (projectPath === null || projectPath.length === 0) {
    return finishJson(res, 400, { error: 'path query is required' })
  }
  if (!isProjectPath(projectPath)) {
    return finishJson(res, 403, { error: 'path outside project library' })
  }
  let phase = 'Intake'
  let revision = 0
  let nextEpisode = 1
  try {
    const state = JSON.parse(readFileSync(join(projectPath, STATE_FILE), 'utf8')) as {
      phase?: string, revision?: number,
      writingProgress?: { nextEpisode?: number },
    }
    if (typeof state.phase === 'string') phase = state.phase
    if (typeof state.revision === 'number') revision = state.revision
    const wp = state.writingProgress
    if (typeof wp?.nextEpisode === 'number') nextEpisode = wp.nextEpisode
  } catch {
    // no state.json — fall back to the real directory scan below
  }
  const tree = scanDir(projectPath)
  return finishJson(res, 200, { path: projectPath, phase, revision, nextEpisode, tree, root: basename(projectPath) })
}

/** GET /api/desktop/projects/resources?path=<projectDir> — files for @ references. */
export async function handleProjectLibraryResourcesRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') return finishJson(res, 405, { error: 'method not allowed' })
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
export async function handleProjectFileRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '', 'http://localhost')
  if (req.method === 'GET') {
    const filePath = url.searchParams.get('path')
    if (filePath === null || filePath.length === 0) return finishJson(res, 400, { error: 'path query is required' })
    const project = enclosingProjectRoot(filePath)
    if (project === undefined) return finishJson(res, 403, { error: 'path outside a registered screenplay project' })
    const target = canonicalPath(filePath)
    if (isInsideStateDir(project, target)) return finishJson(res, 403, { error: 'cannot read .screenplay state' })
    try {
      const content = readFileSync(target, 'utf8')
      return finishJson(res, 200, { content })
    } catch {
      return finishJson(res, 404, { error: 'file not found' })
    }
  }
  if (req.method === 'POST') {
    let body: unknown
    try { body = await readBody(req) } catch { return finishJson(res, 400, { error: 'invalid JSON body' }) }
    const b = body as Record<string, unknown>
    const filePath = typeof b.path === 'string' ? b.path : ''
    const content = typeof b.content === 'string' ? b.content : ''
    if (filePath.length === 0) return finishJson(res, 400, { error: 'path is required' })
    // Writes stay inside a registered screenplay project, are limited to .md
    // content files, and never touch the kernel-owned .screenplay state dir.
    if (extname(filePath) !== '.md') return finishJson(res, 403, { error: 'only .md files are writable' })
    const project = enclosingProjectRoot(filePath)
    if (project === undefined) return finishJson(res, 403, { error: 'path outside a registered screenplay project' })
    const target = canonicalPath(filePath)
    if (isInsideStateDir(project, target)) return finishJson(res, 403, { error: 'cannot write into .screenplay state' })
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
    return statSync(realPath).isDirectory() && existsSync(join(realPath, LAUNCHER_MARKER))
  } catch {
    return false
  }
}
