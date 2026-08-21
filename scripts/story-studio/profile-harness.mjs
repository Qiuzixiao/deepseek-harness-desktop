import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { downloadPluginArchive, inspectPluginArchive, validatePluginLock } from './plugin-lock.mjs'

export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const desktopRoot = resolve(root, 'dsh-plugin-desktop')
const dshBin = resolve(desktopRoot, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
const toolBin = resolve(desktopRoot, 'node_modules/.bin')
const lockPath = resolve(root, 'config/story-studio/plugins.lock.json')

export async function readPluginLock() {
  return validatePluginLock(JSON.parse(await readFile(lockPath, 'utf8')))
}

export function profileEnvironment(home) {
  return {
    ...process.env,
    DSH_HOME: home,
    PATH: [toolBin, dirname(process.execPath), process.env.PATH ?? ''].filter(Boolean).join(delimiter),
  }
}

function hasExited(child) {
  return child.exitCode !== null || child.signalCode !== null
}

function signalProcessGroup(child, signal) {
  if (child.pid === undefined) return
  const pid = process.platform === 'win32' ? child.pid : -child.pid
  try { process.kill(pid, signal) } catch {}
}

async function waitForExit(child, timeoutMs) {
  if (hasExited(child)) return true
  return await new Promise(resolveExit => {
    let settled = false
    const finish = exited => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.off('error', onError)
      child.off('exit', onExit)
      resolveExit(exited)
    }
    const onError = () => finish(true)
    const onExit = () => finish(true)
    const timer = setTimeout(() => finish(false), timeoutMs)
    child.once('error', onError)
    child.once('exit', onExit)
    if (hasExited(child)) finish(true)
  })
}

async function terminateProcessGroup(child, label) {
  if (hasExited(child) || child.pid === undefined) return
  signalProcessGroup(child, 'SIGTERM')
  if (await waitForExit(child, 5_000)) return
  signalProcessGroup(child, 'SIGKILL')
  if (!await waitForExit(child, 5_000)) throw new Error(`${label} did not exit after SIGKILL`)
}

export async function runDsh(label, args, options = {}) {
  process.stderr.write(`[story-studio spike] ${label}\n`)
  const child = spawn(process.execPath, [dshBin, ...args], {
    cwd: root,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  const timeoutMs = options.timeoutMs ?? 120_000
  const outcome = await new Promise(resolveExit => {
    let settled = false
    const finish = result => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.off('error', onError)
      child.off('exit', onExit)
      resolveExit(result)
    }
    const onError = error => finish({ error })
    const onExit = (code, signal) => finish({ code, signal })
    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs)
    child.once('error', onError)
    child.once('exit', onExit)
  })
  if (outcome.error !== undefined) throw outcome.error
  if (outcome.timedOut === true) {
    await terminateProcessGroup(child, label)
    throw new Error(`${label} timed out after ${timeoutMs}ms\n${stdout}${stderr}`)
  }
  if (outcome.code !== 0) {
    const reason = outcome.code === null ? `signal ${String(outcome.signal)}` : `code ${String(outcome.code)}`
    throw new Error(`${label} exited with ${reason}\n${stdout}${stderr}`)
  }
  return { stdout, stderr }
}

export async function createProfileHome(prefix = 'story-studio-profile-smoke-') {
  return await mkdtemp(join(tmpdir(), prefix))
}

export async function removeProfileHome(home) {
  await rm(home, { recursive: true, force: true })
}

export async function installLockedPlugins({ home, lock, plugins, profile = 'web' }) {
  const archiveDir = join(home, 'archives')
  const env = profileEnvironment(home)
  await mkdir(archiveDir, { recursive: true })
  await runDsh('profile initialization', ['plugin', '--profile', profile, 'install'], { env })
  const profileDir = join(home, 'profiles', profile)
  const workspacePath = join(profileDir, 'pnpm-workspace.yaml')
  const workspace = await readFile(workspacePath, 'utf8')
  if (/^allowBuilds:/mu.test(workspace)) throw new Error('new temporary profile unexpectedly contains allowBuilds')
  const nativeBuilds = [...new Set(plugins.flatMap(plugin => plugin.nativeBuilds))]
  const allowBuilds = nativeBuilds.length === 0
    ? ''
    : `allowBuilds:\n${nativeBuilds.map(name => `  ${JSON.stringify(name)}: true`).join('\n')}\n`
  await writeFile(workspacePath, `${workspace.trimEnd()}\n${allowBuilds}`)

  const archivePaths = []
  const results = []
  for (const plugin of plugins) {
    process.stderr.write(`[story-studio spike] download and inspect ${plugin.package}@${plugin.version}\n`)
    const bytes = await downloadPluginArchive(plugin)
    results.push(inspectPluginArchive(bytes, plugin, lock.dshRuntime))
    const archivePath = join(archiveDir, basename(new URL(plugin.source).pathname))
    await writeFile(archivePath, bytes, { flag: 'wx' })
    archivePaths.push(archivePath)
  }
  await runDsh(
    `install ${plugins.map(plugin => plugin.package).join(', ')}`,
    ['plugin', '--profile', profile, 'add', ...archivePaths, '--reporter=append-only'],
    { env, timeoutMs: 180_000 },
  )

  const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
  const bundles = manifest.dsh?.profile?.bundles ?? []
  for (const plugin of plugins) {
    if (!(plugin.package in (manifest.dependencies ?? {}))) throw new Error(`profile dependencies are missing ${plugin.package}`)
    if (!bundles.includes(plugin.package)) throw new Error(`profile bundles are missing ${plugin.package}`)
  }
  const dump = await runDsh('profile dump', ['--profile', profile, '--dump-config'], { env })
  for (const plugin of plugins) {
    if (!dump.stdout.includes(`id: ${plugin.bundleRow}`)) throw new Error(`profile dump is missing row ${plugin.bundleRow}`)
  }
  return { env, profileDir, results, bundles }
}

export async function runWebProfile(env, expectedClients, inspect) {
  const child = spawn(process.execPath, [dshBin, '--profile', 'web', '--port', '0'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  })
  let output = ''
  let settled = false
  let timer
  const ready = new Promise((resolveReady, reject) => {
    timer = setTimeout(() => reject(new Error(`Web profile did not become ready\n${output}`)), 30_000)
    const observe = chunk => {
      output += chunk.toString()
      const match = output.match(/dsh web:\s+(http:\/\/[^\s]+)/u)
      if (match?.[1] !== undefined && !settled) {
        settled = true
        clearTimeout(timer)
        resolveReady(match[1])
      }
    }
    child.stdout.on('data', observe)
    child.stderr.on('data', observe)
    child.once('error', reject)
    child.once('exit', code => {
      if (!settled) reject(new Error(`Web profile exited ${String(code)} before readiness\n${output}`))
    })
  })
  try {
    const url = await ready
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const html = await response.text()
    if (!response.ok) throw new Error(`Web profile returned HTTP ${response.status}`)
    const boot = html.match(/(?:window\.__DSH_BOOT__|globalThis\["__DSH_BOOT__"\])\s*=\s*(\{.*?\})<\/script>/u)?.[1]
    if (boot === undefined) throw new Error('Web profile root has no client manifest')
    const manifest = JSON.parse(boot)
    const clients = new Set(manifest.entries.map(entry => entry.id))
    for (const packageName of expectedClients) {
      if (!clients.has(packageName)) throw new Error(`Web client manifest is missing ${packageName}`)
    }
    const inspected = inspect === undefined ? undefined : await inspect(url)
    return {
      url,
      clients: [...clients].filter(id => expectedClients.includes(id)),
      ...(inspected === undefined ? {} : { inspected }),
    }
  } finally {
    clearTimeout(timer)
    await terminateProcessGroup(child, 'Web profile')
  }
}
