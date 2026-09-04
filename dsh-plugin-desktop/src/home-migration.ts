/** Migrate legacy DeepSeek Harness user data into Zenwit's default home. */

import { cpSync, existsSync, lstatSync, renameSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/** Result of checking or performing the legacy-home migration. */
export type LegacyHomeMigrationResult =
  | { readonly status: 'not-needed'; readonly target: string; readonly legacy: string }
  | { readonly status: 'migrated'; readonly target: string; readonly legacy: string }
  | { readonly status: 'deferred'; readonly target: string; readonly legacy: string }
  | { readonly status: 'failed'; readonly target: string; readonly legacy: string; readonly error: unknown }

/** Inputs for the one-time legacy-home migration. */
export interface LegacyHomeMigrationOptions {
  /** OS home used to derive both default directory names. */
  readonly homeDirectory?: string
  /** Environment consulted for an explicit DSH_HOME override. */
  readonly environment?: NodeJS.ProcessEnv
  /** Platform-specific startup behavior. */
  readonly platform?: NodeJS.Platform
  /** Copy implementation seam used by focused tests. */
  readonly copy?: (source: string, target: string) => void
}

/**
 * Copy the old ~/.dsh home to ~/.zenwit when the user has not explicitly
 * configured DSH_HOME and the new default has not been created yet.
 *
 * The legacy directory is never removed or modified. Windows defers the copy
 * because synchronously traversing a live user home can block startup for a
 * long time or fail on locked/junction files; callers should use the legacy
 * directory as an explicit DSH_HOME fallback for that result.
 */
export function migrateLegacyDshHome(
  options: LegacyHomeMigrationOptions = {},
): LegacyHomeMigrationResult {
  const homeDirectory = options.homeDirectory ?? homedir()
  const environment = options.environment ?? process.env
  const target = resolve(join(homeDirectory, '.zenwit'))
  const legacy = resolve(join(homeDirectory, '.dsh'))
  const configured = environment.DSH_HOME
  if (configured !== undefined && configured.trim().length > 0) {
    return { status: 'not-needed', target, legacy }
  }
  if (existsSync(target) || !existsSync(legacy)) {
    return { status: 'not-needed', target, legacy }
  }
  if (options.platform === 'win32') {
    return { status: 'deferred', target, legacy }
  }
  const staging = `${target}.migration-${process.pid}-${randomUUID()}`
  try {
    const legacyStat = lstatSync(legacy)
    if (!legacyStat.isDirectory()) {
      return { status: 'not-needed', target, legacy }
    }
    ;(options.copy ?? ((source, destination) => cpSync(source, destination, {
      recursive: true,
      force: false,
      errorOnExist: true,
      preserveTimestamps: true,
      verbatimSymlinks: true,
    })))(legacy, staging)
    if (existsSync(target)) {
      rmSync(staging, { recursive: true, force: true })
      return { status: 'not-needed', target, legacy }
    }
    renameSync(staging, target)
    return { status: 'migrated', target, legacy }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    return { status: 'failed', target, legacy, error }
  }
}

/** Keep startup usable when a legacy-home copy cannot be completed. */
export function applyLegacyHomeFallback(
  result: LegacyHomeMigrationResult,
  environment: NodeJS.ProcessEnv,
): void {
  if (result.status !== 'deferred' && result.status !== 'failed') return
  if (environment.DSH_HOME === undefined || environment.DSH_HOME.trim().length === 0) {
    environment.DSH_HOME = result.legacy
  }
}
