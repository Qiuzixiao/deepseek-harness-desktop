/** Build a signed Windows x64 NSIS installer on a native Windows host. */

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertWindowsPackageHost,
  createWindowsPackageOptions,
  type WindowsPackageOptions,
  withoutWindowsSigningSecrets,
} from './package-win.ts'

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed
}

function environmentValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const key = Object.keys(env).find(candidate => candidate.toUpperCase() === name)
  return key === undefined ? undefined : nonEmpty(env[key])
}

/** Keep signing material private while exposing only the selected Windows credentials to Builder. */
export function windowsSigningEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const link = environmentValue(env, 'WIN_CSC_LINK') ?? environmentValue(env, 'CSC_LINK')
  const password = environmentValue(env, 'WIN_CSC_KEY_PASSWORD') ?? environmentValue(env, 'CSC_KEY_PASSWORD')
  if (link === undefined) {
    throw new Error('Windows signing requires WIN_CSC_LINK (a .pfx/.p12 path or data URL)')
  }
  if (password === undefined) {
    throw new Error('Windows signing requires WIN_CSC_KEY_PASSWORD')
  }
  return {
    ...withoutWindowsSigningSecrets(env),
    WIN_CSC_LINK: link,
    WIN_CSC_KEY_PASSWORD: password,
  }
}

/** Run the package gate, create a signed NSIS installer, and verify its PE files. */
export function packageWindowsSignedInstaller(
  options: WindowsPackageOptions = createWindowsPackageOptions(),
): void {
  assertWindowsPackageHost(options, 'signed installer')

  const signingEnvironment = windowsSigningEnvironment(options.env)
  const checkEnvironment = withoutWindowsSigningSecrets(options.env)
  options.log('Building a Windows x64 NSIS installer with Authenticode signing.')
  if (options.env.DSH_PACKAGE_CHECK_ALREADY_RAN !== '1') {
    options.run(
      options.commandShell,
      ['/d', '/s', '/c', 'corepack yarn workspace dsh-plugin-desktop check:win-package'],
      options.workspaceRoot,
      checkEnvironment,
    )
  } else {
    options.log('Skipping the Windows package preflight; the package gate already passed.')
  }

  options.run(
    options.nodeExecutable,
    [
      options.builderCli,
      '--win',
      'nsis',
      '--x64',
      '--publish',
      'never',
      '--config.win.signExecutable=true',
      '--config.npmRebuild=false',
    ],
    options.desktopRoot,
    signingEnvironment,
  )
  options.run(
    options.nodeExecutable,
    [options.verifier],
    options.desktopRoot,
    checkEnvironment,
  )
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    packageWindowsSignedInstaller()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
