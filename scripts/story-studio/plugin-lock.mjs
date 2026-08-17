import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

const SHA256 = /^[a-f0-9]{64}$/u
const PACKAGE_NAME = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/u
const PLUGIN_ID = /^[a-z0-9][a-z0-9-]*$/u
const MAX_UNCOMPRESSED_ARCHIVE_BYTES = 64 * 1024 * 1024

function fail(message) {
  throw new Error(`story-studio plugin lock: ${message}`)
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a non-empty string`)
  return value
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${label} must be a positive integer`)
  return value
}

export function validatePluginLock(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('root must be an object')
  if (value.schemaVersion !== 1) fail('schemaVersion must be 1')
  const dshRuntime = nonEmptyString(value.dshRuntime, 'dshRuntime')
  if (!Array.isArray(value.plugins) || value.plugins.length === 0) fail('plugins must be a non-empty array')
  const ids = new Set()
  const packages = new Set()
  const plugins = value.plugins.map((entry, index) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) fail(`plugins[${index}] must be an object`)
    const id = nonEmptyString(entry.id, `plugins[${index}].id`)
    const packageName = nonEmptyString(entry.package, `plugins[${index}].package`)
    const version = nonEmptyString(entry.version, `plugins[${index}].version`)
    const source = nonEmptyString(entry.source, `plugins[${index}].source`)
    const sha256 = nonEmptyString(entry.sha256, `plugins[${index}].sha256`)
    const license = nonEmptyString(entry.license, `plugins[${index}].license`)
    const bundleRow = nonEmptyString(entry.bundleRow, `plugins[${index}].bundleRow`)
    if (!PLUGIN_ID.test(id)) fail(`plugins[${index}].id is invalid`)
    if (!PACKAGE_NAME.test(packageName)) fail(`plugins[${index}].package is invalid`)
    if (!SHA256.test(sha256)) fail(`plugins[${index}].sha256 must be lowercase SHA-256`)
    let url
    try { url = new URL(source) } catch { fail(`plugins[${index}].source must be an absolute URL`) }
    if (url.protocol !== 'https:') fail(`plugins[${index}].source must use HTTPS`)
    if (url.username !== '' || url.password !== '') fail(`plugins[${index}].source must not contain credentials`)
    if (!source.endsWith('.tgz')) fail(`plugins[${index}].source must identify a tarball`)
    if (ids.has(id)) fail(`duplicate plugin id ${id}`)
    if (packages.has(packageName)) fail(`duplicate package ${packageName}`)
    ids.add(id)
    packages.add(packageName)
    if (!Array.isArray(entry.nativeBuilds) || entry.nativeBuilds.some(item => typeof item !== 'string' || !PACKAGE_NAME.test(item))) {
      fail(`plugins[${index}].nativeBuilds must contain package names`)
    }
    return Object.freeze({
      id,
      package: packageName,
      version,
      source,
      sha256,
      maxBytes: positiveInteger(entry.maxBytes, `plugins[${index}].maxBytes`),
      license,
      bundleRow,
      nativeBuilds: Object.freeze([...new Set(entry.nativeBuilds)]),
    })
  })
  return Object.freeze({ schemaVersion: 1, dshRuntime, plugins: Object.freeze(plugins) })
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function tarString(bytes, offset, length) {
  const end = bytes.subarray(offset, offset + length).indexOf(0)
  return bytes.subarray(offset, offset + (end < 0 ? length : end)).toString('utf8')
}

function tarOctal(bytes, offset, length, label) {
  const value = tarString(bytes, offset, length).trim()
  if (!/^[0-7]+$/u.test(value)) fail(`tar entry ${label} has invalid size ${JSON.stringify(value)}`)
  const parsed = Number.parseInt(value, 8)
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(`tar entry ${label} has unsafe size`)
  return parsed
}

export function readTarGzipEntries(archive, wanted) {
  let tar
  try {
    tar = gunzipSync(archive, { maxOutputLength: MAX_UNCOMPRESSED_ARCHIVE_BYTES })
  } catch (cause) {
    throw new Error('story-studio plugin lock: invalid or oversized gzip archive', { cause })
  }
  const requested = new Set(wanted)
  const entries = new Map()
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) break
    const name = tarString(header, 0, 100)
    const prefix = tarString(header, 345, 155)
    const path = prefix === '' ? name : `${prefix}/${name}`
    const size = tarOctal(header, 124, 12, path)
    const type = tarString(header, 156, 1)
    const contentOffset = offset + 512
    const next = contentOffset + Math.ceil(size / 512) * 512
    if (next > tar.length) fail(`tar entry ${path} exceeds archive bounds`)
    if ((type === '' || type === '0') && requested.has(path)) {
      if (entries.has(path)) fail(`tar archive contains duplicate entry ${path}`)
      entries.set(path, Buffer.from(tar.subarray(contentOffset, contentOffset + size)))
    }
    offset = next
  }
  return entries
}

function peerCompatibility(peerDependencies, runtime) {
  const dshPeers = Object.entries(peerDependencies ?? {})
    .filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
    .map(([name, range]) => ({ name, range: String(range), exactRuntime: range === runtime }))
  return {
    status: dshPeers.length === 0
      ? 'not-declared'
      : dshPeers.every(peer => peer.exactRuntime) ? 'exact' : 'requires-runtime-smoke',
    peers: dshPeers,
  }
}

export function inspectPluginArchive(bytes, expected, dshRuntime) {
  if (bytes.length > expected.maxBytes) fail(`${expected.package} archive exceeds ${expected.maxBytes} bytes`)
  const digest = sha256(bytes)
  if (digest !== expected.sha256) fail(`${expected.package} SHA-256 is ${digest}, expected ${expected.sha256}`)
  const paths = [
    'package/package.json',
    'package/cordis.patch.yml',
    'package/LICENSE',
    'package/LICENSE.md',
    'package/LICENSE.txt',
    'package/THIRD_PARTY_NOTICES.md',
  ]
  const entries = readTarGzipEntries(bytes, paths)
  const packageBytes = entries.get('package/package.json')
  if (packageBytes === undefined) fail(`${expected.package} archive has no package/package.json`)
  let manifest
  try { manifest = JSON.parse(packageBytes.toString('utf8')) } catch (cause) {
    throw new Error(`story-studio plugin lock: ${expected.package} has invalid package.json`, { cause })
  }
  if (manifest.name !== expected.package) fail(`${expected.package} archive declares name ${String(manifest.name)}`)
  if (manifest.version !== expected.version) fail(`${expected.package} archive declares version ${String(manifest.version)}`)
  if (manifest.license !== expected.license) fail(`${expected.package} archive declares license ${String(manifest.license)}`)
  if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') fail(`${expected.package} does not declare the expected dsh.bundle patch`)
  const patch = entries.get('package/cordis.patch.yml')?.toString('utf8')
  if (patch === undefined) fail(`${expected.package} archive has no cordis.patch.yml`)
  if (!new RegExp(`(?:^|\\n)\\s*- id: ${expected.bundleRow}(?:\\n|$)`, 'u').test(patch)) {
    fail(`${expected.package} patch does not insert row ${expected.bundleRow}`)
  }
  const licensePath = [...entries.keys()].find(path => /^package\/LICENSE(?:\.(?:md|txt))?$/iu.test(path))
  if (licensePath === undefined) fail(`${expected.package} archive has no license text`)
  return Object.freeze({
    id: expected.id,
    package: expected.package,
    version: expected.version,
    bytes: bytes.length,
    sha256: digest,
    license: expected.license,
    licensePath,
    hasThirdPartyNotices: entries.has('package/THIRD_PARTY_NOTICES.md'),
    bundleRow: expected.bundleRow,
    client: manifest.dsh?.client === undefined ? undefined : {
      platform: manifest.dsh.client.platform,
      inject: manifest.dsh.client.inject ?? [],
    },
    compatibility: peerCompatibility(manifest.peerDependencies, dshRuntime),
    nativeBuilds: expected.nativeBuilds,
  })
}

export async function downloadPluginArchive(plugin, request = fetch) {
  const response = await request(plugin.source, { redirect: 'follow', signal: AbortSignal.timeout(60_000) })
  if (!response.ok) fail(`${plugin.package} download returned HTTP ${response.status}`)
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > plugin.maxBytes) {
    fail(`${plugin.package} download declares ${declaredLength} bytes, above ${plugin.maxBytes}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > plugin.maxBytes) fail(`${plugin.package} download exceeds ${plugin.maxBytes} bytes`)
  return bytes
}
