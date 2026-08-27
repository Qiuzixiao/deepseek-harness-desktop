import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const desktopModules = resolve(root, 'dsh-plugin-desktop/node_modules')
const harnessRoot = resolve(root, 'deepseek-harness')
const expectedVersion = '0.1.1-rc.2'

const LOCAL_PACKAGES = [
  ['@deepseek-ai/dsh-client-modules', 'packages/client/modules', ['lib']],
  ['@deepseek-ai/dsh-client-runtime', 'packages/client/runtime', ['lib']],
  // Keep the shared UI/runtime faces in the same build generation as the
  // feature bundles. Leaving these installed RC artifacts in place causes
  // runtime-only failures such as `useDismissOnOutsidePointer is not a
  // function` when ui-conversation was built against newer exports.
  ['@deepseek-ai/dsh-client-ui-primitives', 'packages/client/ui-primitives', ['lib']],
  ['@deepseek-ai/dsh-client-ui-tool', 'packages/client/ui-tool', ['lib']],
  ['@deepseek-ai/dsh-client-ui-workspace', 'packages/client/ui-workspace', ['lib']],
  ['@deepseek-ai/dsh-client-ui-jobs', 'packages/client/ui-jobs', ['lib']],
  ['@deepseek-ai/dsh-client-ui-input-trigger', 'packages/client/ui-input-trigger', ['lib']],
  ['@deepseek-ai/dsh-client-ui-settings', 'packages/client/ui-settings', ['lib']],
  ['@deepseek-ai/dsh-client-ui-layout', 'packages/client/ui-layout', ['lib']],
  ['@deepseek-ai/dsh-client-ui-settings-general', 'packages/client/ui-settings-general', ['lib']],
  ['@deepseek-ai/dsh-client-ui-settings-models', 'packages/client/ui-settings-models', ['lib']],
  ['@deepseek-ai/dsh-client-ui-settings-plugins', 'packages/client/ui-settings-plugins', ['lib']],
  ['@deepseek-ai/dsh-client-ui-permission-presets', 'packages/client/ui-permission-presets', ['lib']],
  ['@deepseek-ai/dsh-client-ui-message-feedback', 'packages/client/ui-message-feedback', ['lib']],
  ['@deepseek-ai/dsh-client-ui-model-selection', 'packages/client/ui-model-selection', ['lib']],
  ['@deepseek-ai/dsh-client-ui-commands', 'packages/client/ui-commands', ['lib']],
  ['@deepseek-ai/dsh-client-ui-skill', 'packages/client/ui-skill', ['lib']],
  ['@deepseek-ai/dsh-client-ui-subagent', 'packages/client/ui-subagent', ['lib']],
  ['@deepseek-ai/dsh-client-ui-goal', 'packages/client/ui-goal', ['lib']],
  ['@deepseek-ai/dsh-client-ui-agent-preset', 'packages/client/ui-agent-preset', ['lib']],
  ['@deepseek-ai/dsh-client-ui-plan', 'packages/client/ui-plan', ['lib']],
  ['@deepseek-ai/dsh-client-ui-user-questions', 'packages/client/ui-user-questions', ['lib']],
  ['@deepseek-ai/dsh-client-ui-trajectory', 'packages/client/ui-trajectory', ['lib']],
  ['@deepseek-ai/dsh-client-ui-workflow-run', 'packages/client/ui-workflow-run', ['lib']],
  ['@deepseek-ai/dsh-client-ui-deliverables', 'packages/client/ui-deliverables', ['lib']],
  ['@deepseek-ai/dsh-client-ui-cordis', 'packages/extensions/ui-cordis', ['lib']],
  ['@deepseek-ai/dsh-client-ui-short-drama', 'packages/client/ui-short-drama', ['lib']],
  ['@deepseek-ai/dsh-client-ui-sidebar', 'packages/client/ui-sidebar', ['lib']],
  ['@deepseek-ai/dsh-client-ui-conversation', 'packages/client/ui-conversation', ['lib']],
  ['@deepseek-ai/dsh-screenplay-project-library', 'packages/screenplay/project-library', ['lib']],
  ['@deepseek-ai/dsh-web-frontend', 'apps/web', ['dist']],
  ['@deepseek-ai/dsh-web-app', 'packages/bundle/web-app', ['cordis.patch.yml']],
]

function readManifest(path) {
  return JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf8'))
}

function restoreInstalledPackage(target) {
  const backup = `${target}.installed-backup`

  if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
    rmSync(target, { force: true })
  }

  if (!existsSync(target)) {
    if (!existsSync(backup)) {
      throw new Error(`link-local-client: missing installed package at ${target}`)
    }
    renameSync(backup, target)
  }

  if (lstatSync(target).isSymbolicLink()) {
    throw new Error(`link-local-client: refusing source symlink at ${target}`)
  }

  const manifest = readManifest(target)
  if (manifest.version !== expectedVersion) {
    throw new Error(
      `link-local-client: ${manifest.name} must remain ${expectedVersion}, found ${manifest.version}`,
    )
  }
}

for (const [packageName, sourcePath, overlays] of LOCAL_PACKAGES) {
  const source = resolve(harnessRoot, sourcePath)
  const target = resolve(desktopModules, packageName)
  restoreInstalledPackage(target)

  for (const overlay of overlays) {
    const sourceEntry = resolve(source, overlay)
    const targetEntry = resolve(target, overlay)
    if (!existsSync(sourceEntry)) {
      throw new Error(`link-local-client: missing built source at ${sourceEntry}`)
    }
    rmSync(targetEntry, { recursive: true, force: true })
    mkdirSync(dirname(targetEntry), { recursive: true })
    cpSync(sourceEntry, targetEntry, { recursive: true })
  }

  process.stdout.write(`link-local-client: materialized ${packageName} (${overlays.join(', ')})\n`)
}

// The core bundle has no Zenwit overlay and must remain the installed RC2 package.
restoreInstalledPackage(resolve(desktopModules, '@deepseek-ai/dsh-base'))
