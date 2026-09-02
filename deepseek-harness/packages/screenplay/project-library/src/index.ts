/** Zenwit project library Remote service: scan/create screenplay projects. */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  normalizeProjectTags, readProjectTags,
  type ProjectCreated, type ProjectLibrarySnapshot, type ProjectSummary,
} from './types.js'

/** Default project-library root when no explicit root is configured. */
export const DEFAULT_PROJECT_ROOT = join(homedir(), 'Projects')
const PROJECT_METADATA_DIR = '.zenwit-project'
const PROJECT_METADATA_FILE = join(PROJECT_METADATA_DIR, 'project.json')

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

function readSummary(dir: string): ProjectSummary | undefined {
  try { if (!statSync(dir).isDirectory()) return undefined } catch { return undefined }
  let agentId: string | undefined
  let tags: string[] = []
  try {
    const parsed = JSON.parse(readFileSync(join(dir, PROJECT_METADATA_FILE), 'utf8')) as { agentId?: unknown, tags?: unknown }
    if (typeof parsed.agentId === 'string' && parsed.agentId.trim() !== '') agentId = parsed.agentId.trim()
    tags = readProjectTags(parsed.tags)
  } catch {
    // Metadata is optional for existing folders.
  }
  const summary: ProjectSummary = { name: basename(dir), path: dir, updatedAt: statSync(dir).mtimeMs, tags }
  if (agentId !== undefined) summary.agentId = agentId
  return summary
}

function writeMetadata(projectRoot: string, patch: { agentId?: string, tags: string[] }): void {
  const metadataPath = join(projectRoot, PROJECT_METADATA_FILE)
  let current: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(readFileSync(metadataPath, 'utf8')) as unknown
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) current = parsed as Record<string, unknown>
  } catch {
    // A missing metadata file is created below.
  }
  mkdirSync(dirname(metadataPath), { recursive: true })
  const next = { ...current, version: 2, ...(patch.agentId ? { agentId: patch.agentId } : {}), tags: patch.tags }
  const temporary = `${metadataPath}.tmp-${process.pid}-${Date.now()}`
  writeFileSync(temporary, JSON.stringify(next) + '\n')
  renameSync(temporary, metadataPath)
}

/** Remote-only service exposing the Zenwit project library. */
export class ProjectLibraryService extends TypertRemoteService {
  static inject = []

  constructor(ctx: Context) {
    super(ctx, 'projectLibrary')
  }

  /**
   * Scan the project-library root for projects.
   * @param request - optional explicit root override (defaults to ~/Projects).
   * @returns the resolved root and every detected project summary.
   */
  @Remote('list')
  list(request: { root?: string }): ProjectLibrarySnapshot {
    const root = request?.root?.trim() || DEFAULT_PROJECT_ROOT
    let children: string[] = []
    try {
      children = readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
    } catch {
      children = []
    }
    const projects = children
      .map(name => readSummary(join(root, name)))
      .filter((summary): summary is ProjectSummary => summary !== undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    return { root, projects }
  }

  /**
   * Create an empty project directory and its private metadata.
   */
  @Remote('create')
  create(request: { name: string; parentRoot?: string; agentId?: string; tags?: string[] }): ProjectCreated {
    const name = request?.name?.trim()
    if (name === undefined || name.length === 0) {
      throw new Error('project name must not be empty')
    }
    // Validate user-owned metadata before touching the filesystem. This keeps
    // rejected requests from leaving an empty project directory behind.
    const tags = normalizeProjectTags(request?.tags ?? [])
    const parent = request?.parentRoot?.trim() || DEFAULT_PROJECT_ROOT
    mkdirSync(parent, { recursive: true })
    const slug = projectSlug(name)
    let projectRoot = join(parent, slug)
    for (let index = 1; index < 1000; index += 1) {
      if (!existsSync(projectRoot)) break
      projectRoot = join(parent, slug + '-' + String(index + 1))
    }
    mkdirSync(join(projectRoot, PROJECT_METADATA_DIR), { recursive: true })
    const agentId = request?.agentId?.trim()
    writeMetadata(projectRoot, { ...(agentId ? { agentId } : {}), tags })
    const project = readSummary(projectRoot)
    if (project === undefined) {
      throw new Error('created project directory could not be summarized: ' + projectRoot)
    }
    return { project }
  }

  /** Update user-owned project tags without changing its Agent binding. */
  @Remote('updateTags')
  updateTags(request: { path: string; parentRoot?: string; tags: string[] }): ProjectCreated {
    const parent = resolve(request?.parentRoot?.trim() || DEFAULT_PROJECT_ROOT)
    const projectRoot = resolve(request?.path?.trim() || '')
    if (projectRoot === parent || dirname(projectRoot) !== parent) {
      throw new Error('project path must be directly under the project library')
    }
    const summary = readSummary(projectRoot)
    if (summary === undefined) throw new Error('project does not exist')
    writeMetadata(projectRoot, {
      ...(summary.agentId === undefined ? {} : { agentId: summary.agentId }),
      tags: normalizeProjectTags(request.tags),
    })
    const project = readSummary(projectRoot)
    if (project === undefined) throw new Error('updated project could not be summarized')
    return { project }
  }
}

// Cordis loader entries resolve the package's default export as the plugin
// callback. Keep the named export for typed consumers and expose the service
// class as the runtime plugin entry used by the host profile.
export default ProjectLibraryService
