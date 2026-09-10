import { LOCAL_RESOURCES_PATH, type LocalResource, type ResourcePreview } from '../local-resources-contract.ts'

export function resourceUrl(action: string, params: Record<string, string> = {}): string {
  return `${LOCAL_RESOURCES_PATH}?${new URLSearchParams({ action, ...params })}`
}
async function request<T>(action: string, params: Record<string, string> = {}, file?: File): Promise<T> {
  const response = await fetch(resourceUrl(action, params), {
    credentials: 'same-origin',
    ...(file ? { method: 'POST', headers: { 'content-type': 'application/zip' }, body: file } : {}),
  })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Resource operation failed.')
  return data
}
export const localResourcesApi = {
  list: () => request<{ resources: LocalResource[] }>('list'),
  detail: (key: string) => request<ResourcePreview>('detail', { key }),
  read: (key: string, path: string) => request<{ content: string | null }>('read', { key, path }),
  preview: (file: File) => request<ResourcePreview>('preview', {}, file),
  install: (file: File, name: string) => request<ResourcePreview>('import', { name }, file),
  async export(key: string, name: string): Promise<void> {
    const response = await fetch(resourceUrl('export', { key }), { credentials: 'same-origin' })
    if (!response.ok) {
      const data = await response.json() as { error?: string }
      throw new Error(data.error ?? 'Export failed.')
    }
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Keep the blob alive until the browser has accepted the download.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
export type LocalResourcesApi = typeof localResourcesApi
