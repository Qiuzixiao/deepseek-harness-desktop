import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrateLegacyDshHome } from '../src/home-migration.ts'

describe('legacy home migration', () => {
  it('copies ~/.dsh to ~/.zenwit without removing the legacy home', () => {
    const root = mkdtempSync(join(tmpdir(), 'zenwit-home-migration-'))
    const legacy = join(root, '.dsh')
    mkdirSync(legacy)
    writeFileSync(join(legacy, 'settings.yaml'), 'theme: dark\n')

    const result = migrateLegacyDshHome({ homeDirectory: root, environment: {} })

    expect(result.status).toBe('migrated')
    expect(readFileSync(join(root, '.zenwit', 'settings.yaml'), 'utf8')).toBe('theme: dark\n')
    expect(readFileSync(join(legacy, 'settings.yaml'), 'utf8')).toBe('theme: dark\n')
  })

  it('does not migrate when DSH_HOME is explicitly configured', () => {
    const calls: string[][] = []
    const result = migrateLegacyDshHome({
      homeDirectory: homedir(),
      environment: { DSH_HOME: '~/.custom-dsh' },
      copy: (source, target) => { calls.push([source, target]) },
    })

    expect(result.status).toBe('not-needed')
    expect(calls).toEqual([])
  })

  it('reports a copy failure without deleting the legacy home', () => {
    const root = mkdtempSync(join(tmpdir(), 'zenwit-home-migration-failure-'))
    mkdirSync(join(root, '.dsh'))
    const result = migrateLegacyDshHome({
      homeDirectory: root,
      environment: {},
      copy: () => { throw new Error('copy failed') },
    })

    expect(result.status).toBe('failed')
    expect(result.legacy).toBe(join(root, '.dsh'))
    expect(existsSync(join(root, '.zenwit'))).toBe(false)
  })
})
