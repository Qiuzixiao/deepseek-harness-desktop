export interface StoryRootDirectoryPickerWindow {
  __DSH_DESKTOP_PICK_DIRECTORY__?: () => Promise<string | null>
  __DSH_DESKTOP_VALIDATE_DIRECTORY__?: (path: string) => Promise<boolean>
}

declare global {
  interface Window extends StoryRootDirectoryPickerWindow {}
}

/** Select a QNovel root through the Desktop admission path when running on Windows. */
export async function pickStoryRootDirectory(
  fallback: () => Promise<string | null>,
  search: string = window.location.search,
  target: StoryRootDirectoryPickerWindow = window,
): Promise<string | null> {
  const platform = new URLSearchParams(search).get('dsh-desktop-platform')
  if (platform !== 'win32') return await fallback()

  const pick = target.__DSH_DESKTOP_PICK_DIRECTORY__
  const validate = target.__DSH_DESKTOP_VALIDATE_DIRECTORY__
  if (typeof pick !== 'function' || typeof validate !== 'function') {
    throw new Error('Windows 原生目录选择器不可用')
  }

  const path = await pick()
  if (path === null) return null
  return await validate(path) ? path : null
}
