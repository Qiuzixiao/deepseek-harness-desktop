import { realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { Session } from '@deepseek-ai/dsh-session'
import { ScreenplayError } from './errors.js'

const READ_TOOLS = new Set(['read', 'read_image', 'read_document', 'glob', 'grep'])

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

function assertRelativePath(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new ScreenplayError('INVALID_WORKSPACE', `${label} must be a non-empty project path`, { value })
  }
  if (!isAbsolute(value) && value.split(/[\\/]/u).includes('..')) {
    throw new ScreenplayError('INVALID_WORKSPACE', `${label} cannot contain parent traversal`, { value })
  }
}

export async function assertProjectPath(
  session: Session,
  projectRoot: string,
  candidate: string,
  label = 'path',
): Promise<string> {
  assertRelativePath(candidate, label)
  const sessionCwd = session.header.cwd
  if (sessionCwd === undefined || resolve(sessionCwd) !== resolve(projectRoot)) {
    throw new ScreenplayError('INVALID_WORKSPACE', 'the Session Workspace must be the bound screenplay project')
  }
  const root = await realpath(projectRoot)
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(root, candidate)
  let checked: string
  try {
    checked = await realpath(absolute)
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException | undefined)?.code !== 'ENOENT') throw error
    checked = await realpath(dirname(absolute))
  }
  if (!isInside(root, checked)) {
    throw new ScreenplayError('INVALID_WORKSPACE', 'path escapes the bound screenplay project', { candidate })
  }
  return absolute
}

export function pathArguments(name: string, args: unknown): string[] {
  if (!READ_TOOLS.has(name) || args === null || typeof args !== 'object') return []
  const values = args as Record<string, unknown>
  if (name === 'read' || name === 'read_image' || name === 'read_document') {
    return typeof values.file_path === 'string' ? [values.file_path] : []
  }
  return typeof values.path === 'string' ? [values.path] : ['.']
}

export function isProjectReadTool(name: string): boolean {
  return READ_TOOLS.has(name)
}
