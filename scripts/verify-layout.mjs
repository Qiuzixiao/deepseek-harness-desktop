import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const run = (command, args, cwd = root) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim()
const fail = message => { throw new Error(`verify-layout: ${message}`) }

const workspace = readJson('package.json')
const plugin = readJson('dsh-plugin-desktop/package.json')
const fabric = readJson('dsh-community-fabric/package.json')
const market = readJson('dsh-community-market/package.json')
const harnessPackage = readJson('deepseek-harness/package.json')
const integratedSourceOverrides = new Map([
  ['@deepseek-ai/dsh-client-ui-short-drama', 'file:../deepseek-harness/packages/client/ui-short-drama'],
  ['@deepseek-ai/dsh-screenplay-project-library', 'file:../deepseek-harness/packages/screenplay/project-library'],
])
const desktopWorkspaceDependencies = new Map([
  ['dsh-file-upload', 'workspace:*'],
  ['dsh-short-drama', 'workspace:*'],
  ['dsh-skill-authoring', 'workspace:*'],
])

if (workspace.packageManager !== 'yarn@4.18.0') {
  fail('the product workspace must pin yarn@4.18.0')
}
if (JSON.stringify(workspace.workspaces) !== JSON.stringify([
  'dsh-plugin-desktop',
  'dsh-file-upload',
  'dsh-short-drama',
  'dsh-skill-authoring',
  'dsh-community-fabric',
  'dsh-community-market',
])) {
  fail('the root Yarn workspace must contain the desktop, file-upload, short-drama, skill-authoring, community-fabric, and community-market packages')
}
for (const [name, manifest] of [
  ['dsh-plugin-desktop', plugin],
  ['dsh-community-fabric', fabric],
  ['dsh-community-market', market],
]) {
  if (manifest.packageManager !== undefined) fail(`${name} must inherit the root Yarn release`)
}
if (fabric.name !== 'dsh-community-fabric') fail('the Fabric workspace must own dsh-community-fabric')
if (market.name !== 'dsh-community-market') fail('the market workspace must own dsh-community-market')
const claudePath = resolve(root, 'CLAUDE.md')
const claudeStat = lstatSync(claudePath)
// Windows checkouts materialize the symlink as a regular file holding the
// target name; accept both forms so the pointer stays verified on every host.
const claudeTarget = claudeStat.isSymbolicLink()
  ? readlinkSync(claudePath)
  : readFileSync(claudePath, 'utf8').trim()
if (claudeTarget !== 'AGENTS.md') {
  fail('CLAUDE.md must link to the outer repository AGENTS.md')
}
for (const legacyFile of [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'dsh-plugin-desktop/pnpm-lock.yaml',
  'dsh-plugin-desktop/pnpm-workspace.yaml',
  'dsh-community-fabric/pnpm-lock.yaml',
  'dsh-community-fabric/pnpm-workspace.yaml',
  'dsh-community-market/pnpm-lock.yaml',
  'dsh-community-market/pnpm-workspace.yaml',
]) {
  if (existsSync(resolve(root, legacyFile))) fail(`${legacyFile} must not exist`)
}
if (typeof harnessPackage.packageManager !== 'string' || !harnessPackage.packageManager.startsWith('pnpm@')) {
  fail('the integrated Harness source tree must retain its pnpm package manager')
}

for (const [owner, manifest] of [
  ['root', workspace],
  ['desktop', plugin],
  ['fabric', fabric],
  ['market', market],
]) {
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'resolutions']) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (typeof range !== 'string') continue
      const isAllowedIntegratedSourceOverride = owner === 'desktop'
        && field === 'dependencies'
        && integratedSourceOverrides.get(name) === range
      const isAllowedDesktopWorkspaceDependency = owner === 'desktop'
        && field === 'dependencies'
        && desktopWorkspaceDependencies.get(name) === range
      if ((/^(?:workspace|portal|link):/u.test(range) && !isAllowedDesktopWorkspaceDependency)
        || (range.startsWith('file:') && range.includes('deepseek-harness') && !isAllowedIntegratedSourceOverride)) {
        fail(`${owner} ${field}.${name} bypasses the published DSH package boundary`)
      }
    }
  }
}

const [mode] = run('git', ['ls-files', '--stage', '--', 'deepseek-harness']).split(/\s+/u)
if (mode === '160000') fail('deepseek-harness must be an integrated source directory, not a Git submodule')
if (existsSync(resolve(root, 'deepseek-harness/.git'))) fail('deepseek-harness must not retain a nested Git metadata file')
process.stdout.write(`verify-layout: Yarn workspace and integrated Harness source (${harnessPackage.version}) are consistent\n`)
