/** Build an ad-hoc signed Apple Silicon macOS DMG smoke artifact. */

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createMacSmokePackageOptions,
  packageMacSmoke,
} from './package-mac.ts'

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    packageMacSmoke(createMacSmokePackageOptions('arm64'))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
