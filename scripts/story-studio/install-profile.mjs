import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { profileEnvironment, root, runDsh } from './profile-harness.mjs'

function option(name) {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

async function importResolved(requireFromDesktop, packageName) {
  return await import(pathToFileURL(requireFromDesktop.resolve(packageName)).href)
}

const requireFromDesktop = createRequire(join(root, 'dsh-plugin-desktop', 'package.json'))
const { initProfile, PROFILE_TEMPLATES, readProfileManifest, resolveProfileDir } = await importResolved(
  requireFromDesktop,
  '@deepseek-ai/dsh-app-boot',
)
const { resolveDshHome } = await importResolved(requireFromDesktop, '@deepseek-ai/dsh-home-paths')
const specification = JSON.parse(await readFile(resolve(root, 'config/story-studio/profile.json'), 'utf8'))
const home = resolve(option('--home') ?? resolveDshHome())
const profile = option('--profile') ?? specification.profile
const profileDir = resolveProfileDir(profile, home)
const manifestPath = join(profileDir, 'package.json')
const webBundles = PROFILE_TEMPLATES.web

if (!Array.isArray(webBundles)) throw new Error('installed DSH runtime has no Web Profile template')
if (!existsSync(manifestPath)) initProfile(profileDir, webBundles)

const before = readProfileManifest('story-studio-profile', profileDir)
const beforeBundles = before.dsh?.profile?.bundles ?? []
if (!Array.isArray(beforeBundles)
  || !beforeBundles.includes('@deepseek-ai/dsh-base')
  || !beforeBundles.includes('@deepseek-ai/dsh-web-app')) {
  throw new Error(`profile ${JSON.stringify(profile)} already exists but is not a Web Profile`)
}

const env = profileEnvironment(home)
await runDsh(
  `install Story Studio Profile ${profile}`,
  ['plugin', '--profile', profile, 'add', ...specification.plugins.map(plugin => plugin.source), '--reporter=append-only'],
  { env, timeoutMs: 180_000 },
)

const installed = readProfileManifest('story-studio-profile', profileDir)
const bundles = installed.dsh?.profile?.bundles ?? []
for (const plugin of specification.plugins) {
  if (!(plugin.package in (installed.dependencies ?? {}))) {
    throw new Error(`Story Studio Profile is missing dependency ${plugin.package}`)
  }
  if (!bundles.includes(plugin.package)) {
    throw new Error(`Story Studio Profile is missing bundle ${plugin.package}`)
  }
}

process.stdout.write(`${JSON.stringify({
  home,
  profile,
  profileDir,
  plugins: specification.plugins.map(plugin => ({
    package: plugin.package,
    commit: plugin.commit,
    installed: installed.dependencies?.[plugin.package],
  })),
}, undefined, 2)}\n`)
