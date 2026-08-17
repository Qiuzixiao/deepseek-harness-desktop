import {
  createProfileHome,
  installLockedPlugins,
  readPluginLock,
  removeProfileHome,
  runWebProfile,
} from './profile-harness.mjs'

const lock = await readPluginLock()

function option(name) {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function flag(name) {
  return process.argv.includes(name)
}

const selected = option('--plugin') ?? 'all'
const keep = flag('--keep')
const plugins = selected === 'all' ? lock.plugins : lock.plugins.filter(plugin => plugin.id === selected)
if (plugins.length === 0) throw new Error(`unknown Story Studio plugin ${JSON.stringify(selected)}`)

const home = await createProfileHome()
try {
  const { env, results, bundles } = await installLockedPlugins({ home, lock, plugins })
  const expectedClients = results.filter(result => result.client?.platform === 'web').map(result => result.package)
  const web = await runWebProfile(env, expectedClients)
  process.stdout.write(`${JSON.stringify({
    dshRuntime: lock.dshRuntime,
    home: keep ? home : undefined,
    plugins: results,
    bundles,
    web,
  }, undefined, 2)}\n`)
} finally {
  if (!keep) await removeProfileHome(home)
}
