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

// Packages with desktop-owned Yarn patches stay installed from the patched
// RC artifact. Overlaying their unpatched local builds would silently erase
// the markers verified by dsh-plugin-desktop/tests/package.spec.ts.
const LOCAL_PACKAGES = [
  // The productized default home lives in the integrated Harness source. Keep
  // the Desktop runtime on that implementation while retaining the installed
  // RC2 manifest for the current package graph.
  ['@deepseek-ai/dsh-home-paths', 'packages/util/home-paths', ['lib/index.js', 'lib/invariant.js', 'lib/types']],
  // Host tool behavior is part of the short-drama preset contract as well:
  // keep the local `allowMutations` registration boundary in sync with the
  // integrated Harness build used by Desktop development and profile smokes.
  ['@deepseek-ai/dsh-tool-fs', 'packages/fs/tool-fs', ['lib/index.js']],
  ['@deepseek-ai/dsh-client-modules', 'packages/client/modules', ['lib']],
  ['@deepseek-ai/dsh-client-runtime', 'packages/client/runtime', ['lib']],
  // Keep the shared UI/runtime faces in the same build generation as the
  // feature bundles. Leaving these installed RC artifacts in place causes
  // runtime-only failures such as `useDismissOnOutsidePointer is not a
  // function` when ui-conversation was built against newer exports.
  ['@deepseek-ai/dsh-client-ui-primitives', 'packages/client/ui-primitives', ['lib']],
  ['@deepseek-ai/dsh-client-ui-tool', 'packages/client/ui-tool', ['lib']],
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
  // The UI command client and Host command registry form one Remote ABI. Both
  // must be materialized together or a fresh source build can reintroduce the
  // RC5 two-argument client beside the RC2 three-argument Host contract.
  ['@deepseek-ai/dsh-commands', 'packages/interaction/commands', ['lib']],
  ['@deepseek-ai/dsh-client-ui-commands', 'packages/client/ui-commands', ['lib']],
  ['@deepseek-ai/dsh-client-ui-skill', 'packages/client/ui-skill', ['lib']],
  ['@deepseek-ai/dsh-client-ui-subagent', 'packages/client/ui-subagent', ['lib']],
  ['@deepseek-ai/dsh-client-ui-goal', 'packages/client/ui-goal', ['lib']],
  ['@deepseek-ai/dsh-client-ui-agent-preset', 'packages/client/ui-agent-preset', ['lib']],
  ['@deepseek-ai/dsh-client-ui-plan', 'packages/client/ui-plan', ['lib']],
  ['@deepseek-ai/dsh-client-ui-user-questions', 'packages/client/ui-user-questions', ['lib']],
  ['@deepseek-ai/dsh-client-ui-workflow-run', 'packages/client/ui-workflow-run', ['lib']],
  ['@deepseek-ai/dsh-client-ui-deliverables', 'packages/client/ui-deliverables', ['lib']],
  ['@deepseek-ai/dsh-client-ui-cordis', 'packages/extensions/ui-cordis', ['lib']],
  ['@deepseek-ai/dsh-client-ui-short-drama', 'packages/client/ui-short-drama', ['lib']],
  ['@deepseek-ai/dsh-client-ui-sidebar', 'packages/client/ui-sidebar', ['lib']],
  ['@deepseek-ai/dsh-client-ui-attachment', 'packages/client/ui-attachment', ['lib']],
  ['@deepseek-ai/dsh-client-ui-conversation', 'packages/client/ui-conversation', ['lib']],
  // Session export's browser contribution is locally patched to keep command
  // export feedback without the duplicate Header trigger.
  ['@deepseek-ai/dsh-session-log-export', 'packages/session-query/session-log-export', ['lib/client.js']],
  ['@deepseek-ai/dsh-screenplay-project-library', 'packages/screenplay/project-library', ['lib']],
  ['@deepseek-ai/dsh-web-frontend', 'apps/web', ['dist']],
  ['@deepseek-ai/dsh-web-app', 'packages/bundle/web-app', ['cordis.patch.yml']],
]

function readManifest(path) {
  return JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf8'))
}

function assertCommandsAbi(packageRoot, label) {
  const remote = resolve(packageRoot, 'lib/typert.remote-client.d.ts')
  const source = readFileSync(remote, 'utf8')
  if (!/execute:\s*\(agentId:\s*SessionId,\s*line:\s*string,\s*images:/u.test(source)) {
    throw new Error(`link-local-client: ${label} dsh-commands Remote ABI must include images (RC2)`)
  }
}

function assertUiCommandsAbi(packageRoot, label) {
  const client = readFileSync(resolve(packageRoot, 'lib/client.js'), 'utf8')
  if (!/remote\.commands\.execute\(session\.sessionId, line,\s*\[\]\)/u.test(client)) {
    throw new Error(`link-local-client: ${label} ui-commands must call the RC2 three-argument Remote ABI`)
  }
}

function restoreInstalledPackage(target, requiredVersion = expectedVersion) {
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
  if (requiredVersion !== null && manifest.version !== requiredVersion) {
    throw new Error(
      `link-local-client: ${manifest.name} must remain ${requiredVersion}, found ${manifest.version}`,
    )
  }
}

assertCommandsAbi(resolve(harnessRoot, 'packages/interaction/commands'), 'source')
assertUiCommandsAbi(resolve(harnessRoot, 'packages/client/ui-commands'), 'source')

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

  if (packageName === '@deepseek-ai/dsh-commands') assertCommandsAbi(target, 'materialized')
  if (packageName === '@deepseek-ai/dsh-client-ui-commands') assertUiCommandsAbi(target, 'materialized')

  process.stdout.write(`link-local-client: materialized ${packageName} (${overlays.join(', ')})\n`)
}

// The core bundle has no Zenwit overlay and must remain the installed RC2 package.
restoreInstalledPackage(resolve(desktopModules, '@deepseek-ai/dsh-base'))
