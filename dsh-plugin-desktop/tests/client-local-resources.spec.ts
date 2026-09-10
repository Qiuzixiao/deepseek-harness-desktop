// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalResourcesSection } from '../src/client/LocalResourcesSection.tsx'
import { localResourcesApi } from '../src/client/local-resources-api.ts'
import { zh } from '../src/client/local-resources-locales.ts'
import type { LocalResource, ResourcePreview } from '../src/local-resources-contract.ts'
import type {} from '../src/client/local-resources.ts'

const item: LocalResource = { key: 'resource-key', id: 'example', kind: 'skill', name: 'example', description: '写作方法', scope: 'user' }
const preview: ResourcePreview = { ...item, files: [{ path: 'SKILL.md', size: 42 }, { path: 'references/中文.md', size: 12 }] }
let root: Root | undefined
let container: HTMLDivElement | undefined
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
async function render() {
  const api = {
    list: vi.fn(async () => ({ resources: [item] })),
    detail: vi.fn(async () => preview),
    read: vi.fn(async (_key: string, path: string) => ({ content: path === 'SKILL.md' ? '# 写作方法' : '中文参考内容' })),
    preview: vi.fn(async () => preview),
    install: vi.fn(async () => preview),
    export: vi.fn(async () => {}),
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root!.render(createElement(LocalResourcesSection, { api, t: key => key in zh ? zh[key as keyof typeof zh] : key } as Parameters<typeof LocalResourcesSection>[0])) })
  return api
}
async function click(text: string) {
  const target = Array.from(container!.querySelectorAll('button')).find(button => button.textContent?.includes(text))
  expect(target, text).toBeDefined()
  await act(async () => { target!.click() })
}
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove(); root = undefined; container = undefined
  vi.restoreAllMocks(); vi.unstubAllGlobals()
})
describe('local resources settings', () => {
  it('browses the resource, switches reference files and exports the selected item', async () => {
    const api = await render()
    expect(container!.textContent).toContain('写作方法')
    await click('查看内容')
    expect(container!.querySelector('pre')!.textContent).toBe('# 写作方法')
    await click('references/中文.md')
    expect(container!.querySelector('pre')!.textContent).toBe('中文参考内容')
    await click('导出 ZIP')
    expect(api.export).toHaveBeenCalledWith(item.key, 'example.skill.zip')
    await click('返回列表')
    await click('Agent Presets')
    expect(container!.textContent).toContain('暂无本地资源')
  })

  it('retries the current detail when Refresh is clicked after a read failure', async () => {
    const api = await render()
    api.detail.mockRejectedValueOnce(new Error('temporary read failure'))
    await click('查看内容')
    expect(container!.querySelector('[role=alert]')!.textContent).toContain('temporary read failure')
    await click('刷新')
    expect(api.detail).toHaveBeenCalledTimes(2)
    expect(container!.querySelector('pre')!.textContent).toBe('# 写作方法')
  })

  it('previews before installation and retains the package after a conflict so the user can retry', async () => {
    const api = await render()
    const input = container!.querySelector<HTMLInputElement>('input[type=file]')!
    const file = new File(['zip'], 'example.zip', { type: 'application/zip' })
    Object.defineProperty(input, 'files', { value: [file] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    expect(api.preview).toHaveBeenCalledWith(file)
    expect(api.install).not.toHaveBeenCalled()
    expect(container!.textContent).toContain('references/中文.md')
    api.install.mockRejectedValueOnce(new Error('already exists'))
    await click('安装到用户空间')
    expect(container!.querySelector('[role=alert]')!.textContent).toContain('already exists')
    await click('安装到用户空间')
    expect(api.list).toHaveBeenCalledTimes(2)
    expect(container!.textContent).toContain('导入成功')
  })

  it('posts ZIP bytes to the same-origin API and surfaces errors', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(preview), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    const file = new File(['zip'], 'example.zip')
    await localResourcesApi.preview(file)
    expect(fetcher).toHaveBeenCalledWith('/api/desktop/local-resources?action=preview', expect.objectContaining({ method: 'POST', body: file, credentials: 'same-origin', headers: { 'content-type': 'application/zip' } }))
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'already exists' }), { status: 400 }))
    await expect(localResourcesApi.install(file, 'example')).rejects.toThrow('already exists')
  })
})
