// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { applyAdvancedShell } from '../src/client/advanced-shell.ts'

vi.mock('../src/client/layout-service.ts', () => ({
  provideDesktopLayout: vi.fn(() => () => {}),
}))

vi.mock('../src/client/styles.ts', () => ({
  installAdvancedStyles: vi.fn(() => () => {}),
}))

vi.mock('../src/client/theme-presenter.ts', () => ({
  DesktopThemePresenter: class {
    apply = vi.fn()
    dispose = vi.fn()
  },
}))

describe('desktop advanced shell', () => {
  it('leaves root ownership to the Zenwit product frame', () => {
    const register = vi.fn(() => () => {})
    const ctx = {
      effect(factory: () => unknown) {
        return factory()
      },
      slots: { register },
      theme: {
        getTheme: vi.fn(() => ({ active: { colorScheme: 'light', tokens: {} } })),
      },
      on: vi.fn(() => () => {}),
      reflect: { provide: vi.fn(() => () => {}) },
    }

    applyAdvancedShell(ctx as never, {
      mode: 'advanced',
      platform: 'darwin',
      material: 'transparent',
      micaSupported: false,
    })

    expect(register).not.toHaveBeenCalled()
  })
})
