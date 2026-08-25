/** Zenwit project library Remote service: scan/create screenplay projects. */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { ProjectCreated, ProjectLibrarySnapshot, ProjectSummary } from './types.js'

/** Default project-library root when no explicit root is configured. */
export const DEFAULT_PROJECT_ROOT = join(homedir(), 'ShortDrama')

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

function readSummary(dir: string): ProjectSummary | undefined {
  const marker = join(dir, LAYOUT_MARKER)
  const launcher = join(dir, LAUNCHER_MARKER)
  let layout: ProjectSummary['layout'] = 'zh-CN-v1'
  try {
    const parsed = JSON.parse(readFileSync(marker, 'utf8')) as { layout?: string }
    if (parsed.layout === 'zh-CN-v1' || parsed.layout === 'legacy-en-v1') layout = parsed.layout
  } catch {
    // fall through to launcher/state detection
  }
  const hasMarker = existsSync(launcher) || existsSync(join(dir, '创作合同'))
  if (!hasMarker) return undefined

  const base: Omit<ProjectSummary, 'phase' | 'revision' | 'updatedAt' | 'hasContract'> = {
    name: basename(dir),
    path: dir,
    layout,
  }
  try {
    const state = JSON.parse(readFileSync(join(dir, STATE_FILE), 'utf8')) as {
      phase?: string
      revision?: number
      updatedAt?: number
      writingProgress?: { status?: string, completedEpisodes?: number[], totalEpisodes?: number }
    }
    const phase: ProjectSummary['phase'] =
      state.phase === 'ChangePending' ? 'ChangePending'
        : state.phase === 'Ready' ? 'Ready'
          : 'Intake'
    const progress = state.writingProgress
    const writing = progress !== undefined && typeof progress.totalEpisodes === 'number'
      ? {
        completed: progress.completedEpisodes?.length ?? 0,
        total: progress.totalEpisodes,
      }
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
    return {
      ...base,
      phase: 'Intake',
      revision: 0,
      updatedAt: statSync(dir).mtimeMs,
      hasContract: false,
    }
  }
}

/** Remote-only service exposing the Zenwit project library. */
export class ProjectLibraryService extends TypertRemoteService {
  static inject = []

  constructor(ctx: Context) {
    super(ctx, 'projectLibrary')
  }

  /**
   * Scan the project-library root for screenplay projects.
   * @param request - optional explicit root override (defaults to ~/ShortDrama).
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
   * Create a new screenplay project directory (launcher marker + layout marker
   * + zh-CN-v1 subdirectories) under the library root.
   * @param request - the project name; the directory basename is the single
   *   canonical title.
   * @returns the created project summary (Intake).
   */
  @Remote('create')
  create(request: { name: string; parentRoot?: string }): ProjectCreated {
    const name = request?.name?.trim()
    if (name === undefined || name.length === 0) {
      throw new Error('project name must not be empty')
    }
    const parent = request?.parentRoot?.trim() || DEFAULT_PROJECT_ROOT
    mkdirSync(parent, { recursive: true })
    const slug = projectSlug(name)
    let projectRoot = join(parent, slug)
    for (let index = 1; index < 1000; index += 1) {
      if (!existsSync(projectRoot)) break
      projectRoot = join(parent, slug + '-' + String(index + 1))
    }
    mkdirSync(projectRoot, { recursive: false })
    mkdirSync(join(projectRoot, '.screenplay'), { recursive: true })
    mkdirSync(join(projectRoot, LAUNCHER_MARKER), { recursive: true })
    for (const directory of PROJECT_DIRECTORIES) {
      mkdirSync(join(projectRoot, directory), { recursive: true })
    }
    const layoutPath = join(projectRoot, LAYOUT_MARKER)
    if (!existsSync(layoutPath)) {
      writeFileSync(layoutPath, JSON.stringify({ layout: 'zh-CN-v1' }) + '\n')
    }
    const project = readSummary(projectRoot)
    if (project === undefined) {
      throw new Error('created project directory could not be summarized: ' + projectRoot)
    }
    return { project }
  }
}
