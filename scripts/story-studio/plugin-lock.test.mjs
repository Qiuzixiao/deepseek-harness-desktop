import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import test from 'node:test'
import { inspectPluginArchive, readTarGzipEntries, sha256, validatePluginLock } from './plugin-lock.mjs'

function tarEntry(path, content) {
  const body = Buffer.from(content)
  const header = Buffer.alloc(512)
  header.write(path, 0, 100, 'utf8')
  header.write('0000644\0', 100, 8, 'ascii')
  header.write('0000000\0', 108, 8, 'ascii')
  header.write('0000000\0', 116, 8, 'ascii')
  header.write(`${body.length.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii')
  header.write('00000000000\0', 136, 12, 'ascii')
  header.fill(0x20, 148, 156)
  header.write('0', 156, 1, 'ascii')
  header.write('ustar\0', 257, 6, 'ascii')
  header.write('00', 263, 2, 'ascii')
  const checksum = [...header].reduce((sum, value) => sum + value, 0)
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512)
  return Buffer.concat([header, body, padding])
}

function archive(manifest = {}) {
  const packageJson = JSON.stringify({
    name: 'fixture-plugin',
    version: '1.2.3',
    license: 'MIT',
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['slots'] } },
    peerDependencies: { '@deepseek-ai/dsh-tools': '0.1.0-rc.6' },
    ...manifest,
  })
  return gzipSync(Buffer.concat([
    tarEntry('package/package.json', packageJson),
    tarEntry('package/cordis.patch.yml', '- insert:\n    - id: fixture-row\n      name: fixture-plugin\n'),
    tarEntry('package/LICENSE', 'MIT License\n'),
    Buffer.alloc(1024),
  ]))
}

function expected(bytes) {
  return {
    id: 'fixture',
    package: 'fixture-plugin',
    version: '1.2.3',
    source: 'https://example.test/fixture-plugin-1.2.3.tgz',
    sha256: sha256(bytes),
    maxBytes: 1024 * 1024,
    license: 'MIT',
    bundleRow: 'fixture-row',
    nativeBuilds: [],
  }
}

test('validates and freezes a reproducible plugin lock', () => {
  const bytes = archive()
  const lock = validatePluginLock({ schemaVersion: 1, dshRuntime: '0.1.0-rc.7', plugins: [expected(bytes)] })
  assert.equal(lock.plugins[0].package, 'fixture-plugin')
  assert.equal(Object.isFrozen(lock.plugins[0]), true)
})

test('the checked-in lock pins the three stage-zero candidates', () => {
  const path = resolve(import.meta.dirname, '../../config/story-studio/plugins.lock.json')
  const lock = validatePluginLock(JSON.parse(readFileSync(path, 'utf8')))
  assert.equal(lock.dshRuntime, '0.1.0-rc.7')
  assert.deepEqual(lock.plugins.map(plugin => plugin.id), [
    'rich-file-reader',
    'better-sidebar',
    'checkpoint-rewind',
  ])
})

test('rejects duplicate packages and non-HTTPS sources', () => {
  const bytes = archive()
  const plugin = expected(bytes)
  assert.throws(() => validatePluginLock({
    schemaVersion: 1,
    dshRuntime: '0.1.0-rc.7',
    plugins: [plugin, { ...plugin, id: 'other' }],
  }), /duplicate package/u)
  assert.throws(() => validatePluginLock({
    schemaVersion: 1,
    dshRuntime: '0.1.0-rc.7',
    plugins: [{ ...plugin, source: 'http://example.test/plugin.tgz' }],
  }), /must use HTTPS/u)
})

test('reads only requested regular tar entries', () => {
  const bytes = archive()
  const entries = readTarGzipEntries(bytes, ['package/package.json'])
  assert.equal(entries.size, 1)
  assert.equal(JSON.parse(entries.get('package/package.json')).name, 'fixture-plugin')
})

test('audits package identity, license, bundle row, client face, and compatibility', () => {
  const bytes = archive()
  const inspected = inspectPluginArchive(bytes, expected(bytes), '0.1.0-rc.7')
  assert.deepEqual(inspected.client, { platform: 'web', inject: ['slots'] })
  assert.equal(inspected.bundleRow, 'fixture-row')
  assert.equal(inspected.compatibility.status, 'requires-runtime-smoke')
  assert.equal(inspected.hasThirdPartyNotices, false)
})

test('rejects a modified archive and a mismatched package manifest', () => {
  const bytes = archive()
  assert.throws(() => inspectPluginArchive(Buffer.concat([bytes, Buffer.from('changed')]), expected(bytes), '0.1.0-rc.7'), /SHA-256/u)
  const wrong = archive({ version: '9.9.9' })
  assert.throws(() => inspectPluginArchive(wrong, expected(wrong), '0.1.0-rc.7'), /declares version/u)
})
