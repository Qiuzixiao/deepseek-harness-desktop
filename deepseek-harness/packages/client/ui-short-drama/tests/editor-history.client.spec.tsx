// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { VisualEditor, type EditorHistory, type EditorNavigation } from '../src/client/Editor.tsx'
import { Workspace, type WorkspaceProps } from '../src/client/Workspace.tsx'

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  const createRange = document.createRange.bind(document)
  vi.spyOn(document, 'createRange').mockImplementation(() => {
    const range = createRange()
    range.getClientRects = () => [] as unknown as DOMRectList
    range.getBoundingClientRect = () => new DOMRect()
    return range
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.localStorage.clear() })

it('undoes and redoes a visual paste through commands and keyboard shortcuts', async () => {
  let history: EditorHistory | null = null
  const onChange = vi.fn()
  const { container } = render(<VisualEditor initialDoc={'Original\n'} onChange={onChange} onHistoryChange={next => { history = next }} />)
  await waitFor(() => expect(history).not.toBeNull())
  expect(history!.canUndo).toBe(false)
  const editor = container.querySelector('[contenteditable="true"]') as HTMLElement
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? 'Inserted ' : '', files: [], types: ['text/plain'] } })
  await waitFor(() => expect(history!.canUndo).toBe(true))
  expect(editor.textContent).toContain('Inserted')
  act(() => history!.undo())
  await waitFor(() => expect(editor.textContent).toBe('Original'))
  await waitFor(() => expect(history!.canRedo).toBe(true))
  act(() => history!.redo())
  await waitFor(() => expect(editor.textContent).toContain('Inserted'))
  fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true })
  await waitFor(() => expect(editor.textContent).toBe('Original'))
  fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  await waitFor(() => expect(editor.textContent).toContain('Inserted'))
  await waitFor(() => expect(onChange).toHaveBeenCalled())
})

it('finds text across paragraph boundaries and reports the active match', async () => {
  let navigation: EditorNavigation | null = null
  const { container } = render(<VisualEditor initialDoc={'第一段\n第二段'} onChange={() => {}} onNavigationChange={next => { navigation = next }} />)
  await waitFor(() => expect(navigation).not.toBeNull())
  expect(navigation!.find('第一段\n第二段', 'first')).toEqual({ index: 1, total: 1 })
  expect(container.querySelector('[contenteditable="true"]')?.textContent).toContain('第一段')
  expect(navigation!.find('不存在', 'count')).toEqual({ index: 0, total: 0 })
})

it('reveals each active search highlight while focus stays in the search input and clears stale highlights', async () => {
  let navigation: EditorNavigation | null = null
  const onChange = vi.fn()
  const { container } = render(<><input aria-label="search fixture" /><VisualEditor initialDoc={'# 周念\n\n周念一\n\n周念二\n\n周念三\n\n周念四'} onChange={onChange} onNavigationChange={next => { navigation = next }} /></>)
  await waitFor(() => expect(navigation).not.toBeNull())
  const input = screen.getByRole('textbox', { name: 'search fixture' })
  input.focus()
  const scroll = vi.mocked(Element.prototype.scrollIntoView)
  for (let index = 1; index <= 5; index += 1) {
    act(() => { expect(navigation!.find('周念', index === 1 ? 'first' : 'next')).toEqual({ index, total: 5 }) })
    const current = container.querySelector('[data-search-current="true"]')!
    expect(current.textContent).toBe('周念')
    expect(container.querySelectorAll('[data-search-current="false"]')).toHaveLength(4)
    expect(scroll.mock.contexts.at(-1)).toBe(current)
    expect(scroll).toHaveBeenLastCalledWith({ block: 'center', inline: 'nearest', behavior: 'instant' })
    expect(document.activeElement).toBe(input)
  }
  act(() => { expect(navigation!.find('周念', 'previous')).toEqual({ index: 4, total: 5 }) })
  act(() => { navigation!.find('', 'first') })
  expect(container.querySelector('[data-search-current]')).toBeNull()
  act(() => { navigation!.find('周念', 'first'); navigation!.find('不存在', 'first') })
  expect(container.querySelector('[data-search-current]')).toBeNull()
  expect(onChange).not.toHaveBeenCalled()
})

it('keeps visual history across autosave and document switches and clears dirty when undo reaches the saved content', async () => {
  const disk = new Map<string, string>()
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body as string)
      disk.set(body.path, body.content)
      return Response.json({ ok: true })
    }
    return Response.json(input.includes('/structure?')
      ? { path: '/project', root: 'Project', tree: ['one', 'two'].map(name => ({ name: `${name}.md`, path: `/project/${name}.md`, kind: 'file', detail: '' })) }
      : { content: disk.get(new URL(input, 'http://localhost').searchParams.get('path')!) ?? 'Original' })
  })
  vi.stubGlobal('fetch', fetchMock)
  const props = {
    projectPath: '/project', closeProject: vi.fn(), renderSlot: () => null,
    useSessions: (select: (state: unknown) => unknown) => select({ ids: [], byId: {} }),
    useWorkspaces: (select: (state: unknown) => unknown) => select({ items: [] }),
  } as unknown as WorkspaceProps
  const { container } = render(<Workspace {...props} />)
  fireEvent.click(await screen.findByText('one.md'))
  await waitFor(() => expect(container.querySelector('[contenteditable="true"]')).not.toBeNull())
  const editor = container.querySelector('[contenteditable="true"]') as HTMLElement
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? 'Inserted ' : '', files: [], types: ['text/plain'] } })
  await waitFor(() => expect(screen.getByRole('button', { name: '撤销' }).hasAttribute('disabled')).toBe(false))
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true), { timeout: 2000 })
  await waitFor(() => expect(screen.getByText('已保存')).toBeTruthy())
  fireEvent.click(screen.getByRole('checkbox', { name: '自动保存' }))
  fireEvent.click(screen.getByText('two.md'))
  await waitFor(() => expect(container.querySelectorAll('[contenteditable="true"]').length).toBe(2))
  expect(screen.getByRole('button', { name: '撤销' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('tab', { name: 'one.md' }))
  fireEvent.click(screen.getByRole('button', { name: '撤销' }))
  expect(editor.textContent).toBe('Original')
  expect(within(screen.getByRole('tab', { name: /one.md/ })).getByLabelText('未保存')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '重做' }))
  expect(editor.textContent).toContain('Inserted')
  expect(screen.getByRole('tab', { name: 'one.md' })).toBeTruthy()
  expect(document.activeElement).toBe(editor)
})

it('blocks leaving with unsaved edits and keeps the project open after a save failure', async () => {
  const fetchMock = vi.fn(async (input: string, _init?: RequestInit) => _init?.method === 'POST' ? new Response('{}', { status: 500 }) : new Response(JSON.stringify(input.includes('/structure?')
    ? { path: '/project', root: 'Project', tree: ['one', 'two'].map(name => ({ name: `${name}.md`, path: `/project/${name}.md`, kind: 'file', detail: '' })) }
    : { content: 'Original' }), { status: 200, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  const closeProject = vi.fn(async () => {})
  const props = {
    projectPath: '/project', closeProject, renderSlot: () => null,
    useSessions: (select: (state: unknown) => unknown) => select({ ids: [], byId: {} }),
    useWorkspaces: (select: (state: unknown) => unknown) => select({ items: [] }),
  } as unknown as WorkspaceProps
  const { container } = render(<Workspace {...props} />)
  fireEvent.click(await screen.findByText('one.md'))
  await waitFor(() => expect(container.querySelector('[contenteditable="true"]')).not.toBeNull())
  const editor = container.querySelector('[contenteditable="true"]') as HTMLElement
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? 'Inserted ' : '', files: [], types: ['text/plain'] } })
  await waitFor(() => expect(screen.getByRole('button', { name: '撤销' }).hasAttribute('disabled')).toBe(false))
  fireEvent.click(screen.getByRole('checkbox', { name: '自动保存' }))
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '项目库' }))
  fireEvent.click(screen.getByRole('button', { name: '保存并离开' }))
  await screen.findByRole('alert')
  expect(closeProject).not.toHaveBeenCalled()
  expect(editor.textContent).toContain('Inserted')
  fireEvent.click(screen.getByRole('button', { name: '取消' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: '重试保存' })).toBeTruthy()
})

it('does not close a document when new edits arrive during save', async () => {
  let completeSave!: (response: Response) => void
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (init?.method === 'POST') return await new Promise<Response>(resolve => { completeSave = resolve })
    return Response.json(input.includes('/structure?')
      ? { path: '/project', root: 'Project', tree: [{ name: 'one.md', path: '/project/one.md', kind: 'file', detail: '' }] }
      : { content: 'Original' })
  })
  vi.stubGlobal('fetch', fetchMock)
  const closeProject = vi.fn(async () => {})
  const props = {
    projectPath: '/project', closeProject, renderSlot: () => null,
    useSessions: (select: (state: unknown) => unknown) => select({ ids: [], byId: {} }),
    useWorkspaces: (select: (state: unknown) => unknown) => select({ items: [] }),
  } as unknown as WorkspaceProps
  const { container } = render(<Workspace {...props} />)
  fireEvent.click(await screen.findByText('one.md'))
  await waitFor(() => expect(container.querySelector('[contenteditable="true"]')).not.toBeNull())
  const editor = container.querySelector('[contenteditable="true"]') as HTMLElement
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? 'Inserted ' : '', files: [], types: ['text/plain'] } })
  await waitFor(() => expect(screen.getByRole('button', { name: '撤销' }).hasAttribute('disabled')).toBe(false))
  fireEvent.click(screen.getByRole('checkbox', { name: '自动保存' }))
  fireEvent.click(screen.getByRole('button', { name: '关闭 one.md' }))
  fireEvent.click(screen.getByRole('button', { name: '保存并关闭' }))
  await waitFor(() => expect(completeSave).toBeTypeOf('function'))
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? 'Newer ' : '', files: [], types: ['text/plain'] } })
  await act(async () => { completeSave(Response.json({ ok: true })) })
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(editor.textContent).toContain('Newer')
  expect(within(screen.getByRole('tab', { name: /one.md/ })).getByLabelText('未保存')).toBeTruthy()
})


it('applies external content to the real visual editor without emitting edits or retaining stale undo', async () => {
  let history: EditorHistory | null = null
  let navigation: EditorNavigation | null = null
  const onChange = vi.fn()
  const props = { initialDoc: '阿豪', onChange, onHistoryChange: (next: EditorHistory | null) => { history = next }, onNavigationChange: (next: EditorNavigation | null) => { navigation = next } }
  const view = render(<VisualEditor {...props} />)
  await waitFor(() => expect(history).not.toBeNull())
  const editor = view.container.querySelector('[contenteditable="true"]')!
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? '旧稿' : '', files: [], types: ['text/plain'] } })
  await waitFor(() => expect(history!.canUndo).toBe(true))
  onChange.mockClear()
  view.rerender(<VisualEditor {...props} externalUpdate={{ content: '# 顾长林' }} />)
  await waitFor(() => expect(editor.textContent).toBe('顾长林'))
  expect(onChange).not.toHaveBeenCalled()
  expect(history!.canUndo).toBe(false)
  expect(navigation!.headings()[0]?.title).toBe('顾长林')
  act(() => { history!.undo() })
  expect(editor.textContent).toBe('顾长林')
})

async function syncFixture() {
  const disk = new Map([['/project/one.md', '阿豪'], ['/project/two.md', '第二集']])
  const fetchMock = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    if (input.includes('/structure?')) return Response.json({ path: '/project', root: 'Project', tree: [...disk.keys()].map(path => ({ name: path.split('/').at(-1), path, kind: 'file', detail: '' })) })
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body as string)
      if (body.action) return Response.json({ ok: true })
      const current = disk.get(body.path) ?? null
      if (body.expectedContent !== current) return Response.json({ content: current }, { status: 409 })
      disk.set(body.path, body.content)
      return Response.json({ ok: true })
    }
    const path = new URL(input, 'http://localhost').searchParams.get('path')!
    return Response.json({ content: disk.get(path) ?? null }, { status: disk.has(path) ? 200 : 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  const props = {
    projectPath: '/project', closeProject: vi.fn(), renderSlot: () => null,
    useSessions: (select: (state: unknown) => unknown) => select({ ids: [], byId: {} }),
    useWorkspaces: (select: (state: unknown) => unknown) => select({ items: [] }),
  } as unknown as WorkspaceProps
  const view = render(<Workspace {...props} />)
  fireEvent.click(await screen.findByText('one.md'))
  await waitFor(() => expect(view.container.querySelector('[contenteditable="true"]')?.textContent).toBe('阿豪'))
  const editor = view.container.querySelector('[contenteditable="true"]') as HTMLElement
  return { ...view, disk, editor, fetchMock }
}

it('updates the real visual buffer after an agent write and does not autosave the old buffer', async () => {
  const { disk, editor, fetchMock } = await syncFixture()
  disk.set('/project/one.md', '# 顾长林')
  fireEvent.focus(window)
  await waitFor(() => expect(editor.textContent).toBe('顾长林'))
  expect(screen.getByText('已同步外部修改')).toBeTruthy()
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
  expect(screen.getByRole('button', { name: '撤销' }).hasAttribute('disabled')).toBe(true)
})

it('backs up local edits before adopting an external version and keeps both files', async () => {
  const { disk, editor, fetchMock } = await syncFixture()
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? '本地修改' : '', files: [], types: ['text/plain'] } })
  const local = editor.textContent
  disk.set('/project/one.md', '顾长林')
  fireEvent.focus(window)
  await screen.findByText('文件已在外部修改，本地修改已保留，自动保存已暂停。')
  expect(editor.textContent).toBe(local)
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.body && JSON.parse(init.body as string).action === 'draft')).toBe(true))
  expect(disk.get('/project/one.md')).toBe('顾长林')
  fireEvent.click(screen.getByRole('button', { name: '查看并处理' }))
  fireEvent.click(screen.getByRole('button', { name: '保留本地副本并采用磁盘版本' }))
  await waitFor(() => expect(editor.textContent).toBe('顾长林'))
  expect([...disk.entries()].some(([path, content]) => path.includes('本地副本') && content.includes('本地修改'))).toBe(true)
})

it('rejects a stale manual save even before the next poll', async () => {
  const { disk, editor } = await syncFixture()
  fireEvent.click(screen.getByRole('checkbox', { name: '自动保存' }))
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? '本地修改' : '', files: [], types: ['text/plain'] } })
  disk.set('/project/one.md', '外部新稿')
  fireEvent.click(screen.getByRole('button', { name: '保存 *' }))
  await screen.findByText('文件已在外部修改，本地修改已保留，自动保存已暂停。')
  expect(disk.get('/project/one.md')).toBe('外部新稿')
  expect(editor.textContent).toContain('本地修改')
})

it('retains a removed file in the editor and does not recreate it silently', async () => {
  const { disk, editor } = await syncFixture()
  disk.delete('/project/one.md')
  fireEvent.focus(window)
  await screen.findByText('文件已删除或移动，当前内容仍保留。')
  expect(editor.textContent).toBe('阿豪')
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(disk.has('/project/one.md')).toBe(false)
})

it('defers external replacement during composition and protects edits made during a pending read', async () => {
  const { disk, editor, fetchMock } = await syncFixture()
  fireEvent.compositionStart(editor)
  disk.set('/project/one.md', '新版本')
  fireEvent.focus(window)
  await act(async () => {})
  expect(editor.textContent).toBe('阿豪')
  fireEvent.compositionEnd(editor)
  await waitFor(() => expect(editor.textContent).toBe('新版本'))
  const original = fetchMock.getMockImplementation()!
  let completeRead!: (response: Response) => void
  fetchMock.mockImplementation(async (input, init) => input.includes('sync=1') ? await new Promise(resolve => { completeRead = resolve }) : original(input, init))
  fireEvent.focus(window)
  await waitFor(() => expect(completeRead).toBeTypeOf('function'))
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? '本地修改' : '', files: [], types: ['text/plain'] } })
  await act(async () => completeRead(Response.json({ content: '过期响应' })))
  expect(editor.textContent).toContain('本地修改')
  expect(editor.textContent).not.toContain('过期响应')
})

it('keeps both the local buffer and conflict open if saving a backup fails', async () => {
  const { disk, editor, fetchMock } = await syncFixture()
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === 'text/plain' ? '本地修改' : '', files: [], types: ['text/plain'] } })
  disk.set('/project/one.md', '外部新稿')
  fireEvent.focus(window)
  await screen.findByText('文件已在外部修改，本地修改已保留，自动保存已暂停。')
  const original = fetchMock.getMockImplementation()!
  fetchMock.mockImplementation(async (input, init) => init?.method === 'POST' && !JSON.parse(init.body as string).action
    ? Response.json({ error: 'disk full' }, { status: 500 }) : original(input, init))
  fireEvent.click(screen.getByRole('button', { name: '查看并处理' }))
  fireEvent.click(screen.getByRole('button', { name: '保留本地副本并采用磁盘版本' }))
  await waitFor(() => expect(screen.getAllByText(/本地副本保存失败/).length).toBeGreaterThan(0))
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(editor.textContent).toContain('本地修改')
  expect(disk.get('/project/one.md')).toBe('外部新稿')
})

it('restores a persisted local draft without silently overwriting the current disk version', async () => {
  window.localStorage.setItem('zenwit.document-tabs./project', JSON.stringify({ activePath: '/project/one.md', documents: [{ path: '/project/one.md', name: 'one.md', visualMode: true }] }))
  const writes = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    if (init?.method === 'POST') { writes(JSON.parse(init.body as string)); return Response.json({ ok: true }) }
    return Response.json(input.includes('/structure?') ? { path: '/project', root: 'Project', tree: [] } : { content: '磁盘新稿', recovery: { content: '待恢复本地稿', baseline: '旧版' } })
  }))
  const props = { projectPath: '/project', closeProject: vi.fn(), renderSlot: () => null, useSessions: (s: (v: unknown) => unknown) => s({ ids: [], byId: {} }), useWorkspaces: (s: (v: unknown) => unknown) => s({ items: [] }) } as unknown as WorkspaceProps
  const { container } = render(<Workspace {...props} />)
  await waitFor(() => expect(container.querySelector('[contenteditable="true"]')?.textContent).toBe('待恢复本地稿'))
  expect(screen.getByText('文件已在外部修改，本地修改已保留，自动保存已暂停。')).toBeTruthy()
  expect(writes.mock.calls.every(([body]) => body.action === 'draft')).toBe(true)
})

it('updates an inactive document without replacing the active document', async () => {
  const { disk, editor, container } = await syncFixture()
  fireEvent.click(screen.getByRole('treeitem', { name: /two.md/ }))
  await waitFor(() => expect(container.querySelectorAll('[contenteditable="true"]').length).toBe(2))
  disk.set('/project/one.md', '后台更新')
  fireEvent.focus(window)
  await waitFor(() => expect(editor.textContent).toBe('后台更新'))
  expect(screen.getByRole('tab', { name: 'two.md' }).getAttribute('aria-selected')).toBe('true')
  expect(container.querySelectorAll('[contenteditable="true"]')[1]?.textContent).toBe('第二集')
})

it('updates from a pushed file notification with polling disabled and closes the subscription', async () => {
  const streams: EventTarget[] = []
  const close = vi.fn()
  vi.stubGlobal('EventSource', class extends EventTarget {
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor(public url: string) { super(); streams.push(this) }
    close = close
  })
  const interval = window.setInterval.bind(window)
  vi.spyOn(window, 'setInterval').mockImplementation((handler, timeout, ...args) => (timeout === 30000 || timeout === 500 ? 0 : interval(handler, timeout, ...args)) as unknown as ReturnType<typeof setInterval>)
  const { disk, editor, unmount } = await syncFixture()
  expect(streams).toHaveLength(1)
  disk.set('/project/one.md', '推送后的新正文')
  act(() => { (streams[0] as EventSource).onmessage?.(new MessageEvent('message', { data: 'changed' })) })
  await waitFor(() => expect(editor.textContent).toBe('推送后的新正文'))
  unmount()
  expect(close).toHaveBeenCalledTimes(1)
})

it('drains a notification arriving during an in-flight read and reconciles reconnects without polling', async () => {
  let stream!: EventSource
  vi.stubGlobal('EventSource', class {
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor() { stream = this as unknown as EventSource }
    close() {}
  })
  const interval = window.setInterval.bind(window)
  vi.spyOn(window, 'setInterval').mockImplementation((handler, timeout, ...args) => (timeout === 30000 || timeout === 500 ? 0 : interval(handler, timeout, ...args)) as unknown as ReturnType<typeof setInterval>)
  const { disk, editor, fetchMock } = await syncFixture()
  const original = fetchMock.getMockImplementation()!
  let complete!: (response: Response) => void
  let delayNext = true
  fetchMock.mockImplementation(async (input, init) => {
    if (input.includes('sync=1') && delayNext) {
      delayNext = false
      return await new Promise(resolve => { complete = resolve })
    }
    return original(input, init)
  })
  act(() => { stream.onmessage?.(new MessageEvent('message', { data: 'changed' })) })
  await waitFor(() => expect(complete).toBeTypeOf('function'))
  disk.set('/project/one.md', '连续写入的最终版本')
  act(() => { stream.onmessage?.(new MessageEvent('message', { data: 'changed' })) })
  await act(async () => complete(Response.json({ content: '阿豪' })))
  await waitFor(() => expect(editor.textContent).toBe('连续写入的最终版本'))
  disk.set('/project/one.md', '断线期间的修改')
  act(() => { stream.onmessage?.(new MessageEvent('message', { data: 'ready' })) })
  await waitFor(() => expect(editor.textContent).toBe('断线期间的修改'))
})
