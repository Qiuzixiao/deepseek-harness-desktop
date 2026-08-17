import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../..')

test('pins the Story Studio Profile and Drop to Path commit', async () => {
  const specification = JSON.parse(await readFile(resolve(root, 'config/story-studio/profile.json'), 'utf8'))
  assert.equal(specification.profile, 'story-studio')
  assert.equal(specification.plugins.length, 2)
  const plugin = specification.plugins[0]
  assert.equal(plugin.package, '@dsh-external/dsh-drop-to-path')
  assert.match(plugin.commit, /^[0-9a-f]{40}$/u)
  assert.equal(
    plugin.source,
    `git+https://github.com/loudMore/dsh-drop-to-path.git#${plugin.commit}`,
  )
  assert.deepEqual(specification.plugins[1], {
    package: 'dsh-rich-file-reader',
    source: 'https://github.com/shixiliya1/dsh-rich-file-reader/releases/download/v0.3.1/dsh-rich-file-reader-0.3.1.tgz',
    version: '0.3.1',
  })
})
