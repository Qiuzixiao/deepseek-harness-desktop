import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const workbenchClientPath = fileURLToPath(new URL('../assets/workbench/workbench-client.js', import.meta.url))

describe('dsh-workbench client bootstrap', () => {
  it('retries the empty state until a restored session exposes its workspace', async () => {
    const source = await readFile(workbenchClientPath, 'utf8')
    expect(source).toContain("ui.tree = { empty: true, error: 'no-workspace-selected' }")
    expect(source).toContain('void bootstrap()')
    expect(source).toContain('}, 500)')
    expect(source).toContain('if (retryTimer !== null) clearTimeout(retryTimer)')
  })
})
