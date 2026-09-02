/** Build an unsigned macOS DMG smoke artifact on a native macOS host. */

import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withoutMacReleaseSecrets } from './release-preflight.ts'
import {
  prepareInstalledMacArm64Runtime,
  prepareInstalledMacUniversalRuntime,
} from './mac-universal.ts'

export type MacSmokeTarget = 'universal' | 'arm64'

/** Injectable native macOS packaging boundary used by focused tests. */
export interface MacSmokePackageOptions {
  /** Environment inherited by the packaging command. */
  readonly env: NodeJS.ProcessEnv
  /** Platform executing the package build. */
  readonly platform: NodeJS.Platform
  /** Node architecture executing the package build. */
  readonly arch: string
  /** Node version executing the package build. */
  readonly nodeVersion: string
  /** Repository root containing the Yarn workspace. */
  readonly workspaceRoot: string
  /** Desktop package root containing electron-builder configuration. */
  readonly desktopRoot: string
  /** Dedicated smoke output directory, isolated from signed release artifacts. */
  readonly outputDir: string
  /** Remove only the dedicated generated smoke output before packaging. */
  readonly resetOutput: () => void
  /** Validate and prepare both architecture-specific runtime trees. */
  readonly prepareRuntime: () => void
  /** Absolute electron-builder CLI module. */
  readonly builderCli: string
  /** Absolute packaged-DMG verification script. */
  readonly verifier: string
  /** Node executable used to run package-local scripts. */
  readonly nodeExecutable: string
  /** Electron target architecture; defaults to the universal smoke package. */
  readonly target?: MacSmokeTarget
  /** Execute one packaging command. */
  readonly run: (
    command: string,
    args: readonly string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
  ) => void
  /** Report non-secret packaging progress. */
  readonly log: (message: string) => void
}

function run(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
  }
}

export function createMacSmokePackageOptions(
  target: MacSmokeTarget = 'universal',
): MacSmokePackageOptions {
  const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const workspaceRoot = resolve(desktopRoot, '..')
  const require = createRequire(import.meta.url)
  const outputDir = resolve(desktopRoot, 'dist', target === 'arm64' ? 'mac-arm64' : 'mac-smoke')
  return {
    env: process.env,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    workspaceRoot,
    desktopRoot,
    outputDir,
    resetOutput: () => rmSync(outputDir, { recursive: true, force: true }),
    prepareRuntime: () => {
      if (target === 'arm64') prepareInstalledMacArm64Runtime(desktopRoot)
      else prepareInstalledMacUniversalRuntime(desktopRoot)
    },
    builderCli: require.resolve('electron-builder/cli.js'),
    verifier: fileURLToPath(new URL('./verify-mac-smoke.ts', import.meta.url)),
    nodeExecutable: process.execPath,
    target,
    run,
    log: message => console.log(message),
  }
}

function defaultOptions(): MacSmokePackageOptions {
  return createMacSmokePackageOptions()
}

/**
 * Run the headless release gates and package one unsigned macOS DMG smoke.
 *
 * The signed and notarized release stays a manual step on a credentialed
 * machine; this smoke exists so macOS packaging regressions fail in CI before
 * a manual release. The universal target exercises both Intel and Apple
 * Silicon packaging in one artifact.
 * @param options - Injectable process and command boundaries.
 */
export function packageMacSmoke(options: MacSmokePackageOptions = defaultOptions()): void {
  if (options.platform !== 'darwin') {
    throw new Error('macOS DMG smoke must be built on a native macOS host')
  }
  if (options.arch !== 'x64' && options.arch !== 'arm64') {
    throw new Error(`macOS DMG smoke requires x64 or arm64 Node; received ${options.arch}`)
  }
  const versionMatch = /^(\d+)\.(\d+)\./u.exec(options.nodeVersion)
  const major = Number(versionMatch?.[1])
  const minor = Number(versionMatch?.[2])
  if (!((major === 22 && minor >= 19) || major === 24)) {
    throw new Error(
      `macOS DMG smoke requires Node 22.19+ or Node 24.x with bundled Corepack; received ${options.nodeVersion}`,
    )
  }

  const cleanEnvironment = withoutMacReleaseSecrets(options.env)
  const target = options.target ?? 'universal'
  options.log(
    target === 'arm64'
      ? 'Building an unsigned macOS arm64 DMG smoke.'
      : 'Building an unsigned macOS DMG smoke; signing and notarization are release-only steps.',
  )
  if (options.env.DSH_PACKAGE_CHECK_ALREADY_RAN !== '1') {
    options.run(
      'corepack',
      ['yarn', 'workspace', 'dsh-plugin-desktop', 'check:mac-package'],
      options.workspaceRoot,
      cleanEnvironment,
    )
  } else {
    options.log('Skipping the macOS package preflight; the package gate already passed.')
  }
  options.resetOutput()
  options.prepareRuntime()
  const architectureArgs = target === 'arm64' ? ['--arm64'] : ['--universal']
  const verifierArgs = target === 'arm64'
    ? [options.verifier, options.outputDir, 'arm64']
    : [options.verifier, options.outputDir]
  options.run(
    options.nodeExecutable,
    [
      options.builderCli,
      '--mac',
      'dmg',
      ...architectureArgs,
      '--publish',
      'never',
      '--config.mac.notarize=false',
      '--config.npmRebuild=false',
      `--config.directories.output=${options.outputDir}`,
    ],
    options.desktopRoot,
    {
      ...cleanEnvironment,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  )
  options.run(
    options.nodeExecutable,
    verifierArgs,
    options.desktopRoot,
    cleanEnvironment,
  )
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    packageMacSmoke()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
