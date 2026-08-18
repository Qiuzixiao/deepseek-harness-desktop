import { describe, expect, it, vi } from 'vitest'
import { resolveWorkbenchSessionPolicy, resolveWorkbenchSessionRoot } from '../src/workbench-host.ts'

describe('dsh-workbench workspace root', () => {
  it('uses the live session cwd and never falls back to the process directory', () => {
    const sessions = { get: vi.fn((id: string) => id === 'session-1' ? { header: { cwd: '/作品/县城往事' } } : undefined) }
    const policy = { mode: 'workspace-write', workspaceRoot: '/作品/县城往事' }
    const sandboxPolicy = { resolve: vi.fn(() => policy) }

    expect(resolveWorkbenchSessionRoot('session-1', sessions, sandboxPolicy)).toBe('/作品/县城往事')
    expect(resolveWorkbenchSessionPolicy('session-1', sessions, sandboxPolicy)).toBe(policy)
    expect(resolveWorkbenchSessionRoot(null, sessions, sandboxPolicy)).toBeNull()
    expect(resolveWorkbenchSessionRoot('missing', sessions, sandboxPolicy)).toBeNull()
    expect(sandboxPolicy.resolve).toHaveBeenCalledTimes(2)
  })
})
