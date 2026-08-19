import { describe, expect, it, vi } from 'vitest'
import {
  commandDisplayService,
  provideCommandDisplay,
} from '../src/client/command-display.ts'

describe('desktop command display copy', () => {
  it('localizes managed commands only for the Chinese locale', () => {
    expect(commandDisplayService.resolve('compact', 'zh')).toEqual({
      label: '压缩',
      description: '压缩较早的对话历史',
    })
    expect(commandDisplayService.resolve('compact', 'en')).toBeUndefined()
  })

  it('keeps commands outside the mapping unchanged', () => {
    expect(commandDisplayService.resolve('custom-command', 'zh')).toBeUndefined()
    expect(commandDisplayService.resolve('compact', 'fr')).toBeUndefined()
  })

  it('registers and releases the desktop-owned service with the effect lifetime', () => {
    const dispose = vi.fn()
    const provide = vi.fn(() => dispose)
    const context = { reflect: { provide } }

    const release = provideCommandDisplay(context as never)

    expect(provide).toHaveBeenCalledWith('commandDisplay', commandDisplayService)
    expect(dispose).not.toHaveBeenCalled()
    release()
    expect(dispose).toHaveBeenCalledOnce()
  })
})
