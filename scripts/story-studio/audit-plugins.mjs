import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { downloadPluginArchive, inspectPluginArchive, validatePluginLock } from './plugin-lock.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const lockPath = resolve(root, 'config/story-studio/plugins.lock.json')

function option(name) {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

const selected = option('--plugin')
const outputDirectory = option('--output-dir')
const lock = validatePluginLock(JSON.parse(await readFile(lockPath, 'utf8')))
const plugins = selected === undefined || selected === 'all'
  ? lock.plugins
  : lock.plugins.filter(plugin => plugin.id === selected)
if (plugins.length === 0) throw new Error(`unknown Story Studio plugin ${JSON.stringify(selected)}`)

const results = []
for (const plugin of plugins) {
  const bytes = await downloadPluginArchive(plugin)
  const inspected = inspectPluginArchive(bytes, plugin, lock.dshRuntime)
  results.push(inspected)
  if (outputDirectory !== undefined) {
    const destination = resolve(outputDirectory, basename(new URL(plugin.source).pathname))
    if (dirname(destination) !== resolve(outputDirectory)) throw new Error('plugin archive destination escaped output directory')
    await mkdir(outputDirectory, { recursive: true })
    await writeFile(destination, bytes, { flag: 'wx' })
  }
}

process.stdout.write(`${JSON.stringify({ dshRuntime: lock.dshRuntime, plugins: results }, undefined, 2)}\n`)
