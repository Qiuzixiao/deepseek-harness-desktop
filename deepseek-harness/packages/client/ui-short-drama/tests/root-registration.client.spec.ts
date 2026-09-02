// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.ts'

vi.mock('../src/client/project-file-source.ts', () => ({
  registerProjectFileSource: vi.fn(() => () => {}),
}))

describe('Zenwit root registration', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?dsh-desktop-mode=advanced')
  })

  it('declares every child slot rendered by ZenwitFrame in advanced mode', () => {
    let rootOptions: { children?: unknown } | undefined
    const ctx = {
      get(name: string) {
        if (name === 'connection') return { api: { agentPresets: { list: vi.fn() } } }
        if (name === 'inputTriggers') return { registerSource: vi.fn(() => () => {}) }
        throw new Error(`unexpected service ${name}`)
      },
      effect(factory: () => unknown) {
        return factory()
      },
      slots: {
        register(options: { children?: unknown }) {
          rootOptions = options
          return () => {}
        },
      },
    }

    apply(ctx as never)

    expect(rootOptions?.children).toEqual({
      sidebar: { kind: 'single', scope: 'root' },
      conversation: { kind: 'single', scope: 'session-maybe' },
    })
  })
})
