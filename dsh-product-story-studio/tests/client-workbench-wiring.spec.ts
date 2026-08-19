import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const clientSource = readFileSync(fileURLToPath(new URL('../src/client/index.tsx', import.meta.url)), 'utf8')

describe('QNovel workbench workspace following', () => {
  it('waits for the sessions service before mounting the workbench bridge', () => {
    expect(clientSource).toContain("export const inject = ['slots', 'sessions', 'workspaces', 'connection']")
  })
})
