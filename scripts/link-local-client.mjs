import { existsSync, lstatSync, mkdirSync, readlinkSync, renameSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
/**
 * Client packages changed in this checkout must all resolve to the integrated
 * Harness source during Desktop development. Linking only the product shell
 * leaves the native settings/layout/sidebar owners on the installed release,
 * which makes the top-level Settings event appear to do nothing.
 */
const LOCAL_CLIENT_PACKAGES = [
  'modules',
  'runtime',
  'ui-layout',
  'ui-settings-general',
  'ui-short-drama',
  'ui-sidebar',
  'ui-conversation',
]

/**
 * The Web shell owns the platform module seed (React, ui-slots, and
 * dsh-client-web-react).  It must come from the same Harness build as the
 * dynamically loaded client bundles; otherwise a source bundle can fail at
 * runtime with "missed the module table" while requiring web-react.
 */
const LOCAL_WEB_FRONTEND = {
  packageName: '@deepseek-ai/dsh-web-frontend',
  source: resolve(root, 'deepseek-harness/apps/web'),
  builtMarker: 'dist/index.html',
}

for (const packageDir of LOCAL_CLIENT_PACKAGES) {
  const source = resolve(root, `deepseek-harness/packages/client/${packageDir}`)
  const packageName = `@deepseek-ai/dsh-client-${packageDir}`
  const target = resolve(root, `dsh-plugin-desktop/node_modules/${packageName}`)

  if (!existsSync(resolve(source, 'lib/client.js'))) {
    throw new Error(`link-local-client: missing built client bundle at ${resolve(source, 'lib/client.js')}`)
  }

  mkdirSync(dirname(target), { recursive: true })
  if (existsSync(target)) {
    const stat = lstatSync(target)
    if (stat.isSymbolicLink()) {
      if (resolve(dirname(target), readlinkSync(target)) === source) continue
      rmSync(target, { recursive: true, force: true })
    } else {
      const backup = `${target}.installed-backup`
      if (!existsSync(backup)) renameSync(target, backup)
      else rmSync(target, { recursive: true, force: true })
    }
  }
  symlinkSync(source, target, 'junction')
  process.stdout.write(`link-local-client: ${target} -> ${source}\n`)
}

{
  const { packageName, source, builtMarker } = LOCAL_WEB_FRONTEND
  const target = resolve(root, `dsh-plugin-desktop/node_modules/${packageName}`)
  if (!existsSync(resolve(source, builtMarker))) {
    throw new Error(`link-local-client: missing built Web frontend at ${resolve(source, builtMarker)}`)
  }
  mkdirSync(dirname(target), { recursive: true })
  if (existsSync(target)) {
    const stat = lstatSync(target)
    if (stat.isSymbolicLink()) {
      if (resolve(dirname(target), readlinkSync(target)) === source) {
        process.stdout.write(`link-local-client: ${target} already points to ${source}\n`)
      } else {
        rmSync(target, { recursive: true, force: true })
      }
    } else {
      const backup = `${target}.installed-backup`
      if (!existsSync(backup)) renameSync(target, backup)
      else rmSync(target, { recursive: true, force: true })
    }
  }
  if (!existsSync(target)) {
    symlinkSync(source, target, 'junction')
    process.stdout.write(`link-local-client: ${target} -> ${source}\n`)
  }
}
