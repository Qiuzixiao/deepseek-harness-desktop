import { describe, expect, it, vi } from 'vitest'
import {
  pickStoryRootDirectory,
  type StoryRootDirectoryPickerWindow,
} from '../src/client/directory-picker.ts'

function windowsBridge(overrides: Partial<StoryRootDirectoryPickerWindow> = {}): StoryRootDirectoryPickerWindow {
  return {
    __DSH_DESKTOP_PICK_DIRECTORY__: async () => 'C:\\QNovel',
    __DSH_DESKTOP_VALIDATE_DIRECTORY__: async () => true,
    ...overrides,
  }
}

describe('QNovel project-root directory selection', () => {
  it('uses the Desktop native bridge and validates the selected Windows path', async () => {
    const fallback = vi.fn(async () => 'fallback')
    const pick = vi.fn(async () => 'D:\\Stories')
    const validate = vi.fn(async () => true)

    await expect(pickStoryRootDirectory(
      fallback,
      '?dsh-desktop-platform=win32',
      windowsBridge({
        __DSH_DESKTOP_PICK_DIRECTORY__: pick,
        __DSH_DESKTOP_VALIDATE_DIRECTORY__: validate,
      }),
    )).resolves.toBe('D:\\Stories')

    expect(fallback).not.toHaveBeenCalled()
    expect(pick).toHaveBeenCalledOnce()
    expect(validate).toHaveBeenCalledWith('D:\\Stories')
  })

  it('keeps cancellation and rejected Windows volumes out of QNovel settings', async () => {
    const fallback = vi.fn(async () => 'fallback')
    const validate = vi.fn(async () => false)

    await expect(pickStoryRootDirectory(
      fallback,
      '?dsh-desktop-platform=win32',
      windowsBridge({ __DSH_DESKTOP_PICK_DIRECTORY__: async () => null, __DSH_DESKTOP_VALIDATE_DIRECTORY__: validate }),
    )).resolves.toBeNull()
    expect(validate).not.toHaveBeenCalled()

    await expect(pickStoryRootDirectory(
      fallback,
      '?dsh-desktop-platform=win32',
      windowsBridge({ __DSH_DESKTOP_VALIDATE_DIRECTORY__: validate }),
    )).resolves.toBeNull()
    expect(validate).toHaveBeenCalledWith('C:\\QNovel')
    expect(fallback).not.toHaveBeenCalled()
  })

  it('fails clearly when the Windows Desktop bridge is unavailable', async () => {
    const fallback = vi.fn(async () => 'fallback')

    await expect(pickStoryRootDirectory(
      fallback,
      '?dsh-desktop-platform=win32',
      {},
    )).rejects.toThrow('Windows 原生目录选择器不可用')
    expect(fallback).not.toHaveBeenCalled()
  })

  it('retains the composed workspace picker outside Windows Desktop', async () => {
    const fallback = vi.fn(async () => '/Users/writer/QNovel')

    await expect(pickStoryRootDirectory(
      fallback,
      '?dsh-desktop-platform=darwin',
      {},
    )).resolves.toBe('/Users/writer/QNovel')
    expect(fallback).toHaveBeenCalledOnce()
  })
})
