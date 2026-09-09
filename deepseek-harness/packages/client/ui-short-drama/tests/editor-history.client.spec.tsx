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
  const fetchMock = vi.fn(async (input: string, _init?: RequestInit) => new Response(JSON.stringify(input.includes('/structure?')
    ? { path: '/project', root: 'Project', tree: ['one', 'two'].map(name => ({ name: `${name}.md`, path: `/project/${name}.md`, kind: 'file', detail: '' })) }
    : { content: 'Original' }), { status: 200, headers: { 'content-type': 'application/json' } }))
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
