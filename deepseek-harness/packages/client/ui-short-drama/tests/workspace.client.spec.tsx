// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { Workspace } from '../src/client/Workspace.tsx'
import type { WorkspaceProps } from '../src/client/Workspace.tsx'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  IconChevronDownOutline14: () => <span />,
  IconNewChatOutline16: () => <span />,
}))

vi.mock('../src/client/Editor.tsx', () => ({
  Editor: () => <div data-testid="editor" />,
  VisualEditor: ({ initialDoc, onSelectionChange }: { initialDoc: string, onSelectionChange?: (selection: unknown) => void }) => <div data-testid="visual-editor">{initialDoc}<button type="button" onClick={() => onSelectionChange?.({ text: '第一集', from: 2, to: 5, startLine: 1, endLine: 1, rect: { left: 10, top: 10, right: 40, bottom: 30 } })}>选择文本</button></div>,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  window.localStorage.clear()
})

function mountWorkspace() {
  const openSession = vi.fn()
  const startSession = vi.fn()
  const addSelectionToConversation = vi.fn(async () => {})
  const state = {
    current: 'session-1' as SessionId,
    phase: 'ready',
    ids: ['session-1', 'session-2'],
    byId: {
      'session-1': { id: 'session-1', displayTitle: '当前对话', blank: false, updatedAt: 2 },
      'session-2': { id: 'session-2', displayTitle: '历史对话', blank: false, updatedAt: 1 },
    },
  }
  const workspaceState = {
    items: [{
      workspaceId: 'workspace-1',
      path: '/project',
      title: 'Project',
      sessionIds: ['session-1', 'session-2'],
    }],
  }
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.includes('/structure?')) {
      return new Response(JSON.stringify({
        path: '/project', root: 'Project', agentId: 'short-drama',
        tree: [
          {
              name: '剧本', path: '/project/剧本', kind: 'dir', detail: '', children: [
                { name: 'episode-1.md', path: '/project/剧本/episode-1.md', kind: 'file', detail: '1200 字' },
                { name: 'episode-2.md', path: '/project/剧本/episode-2.md', kind: 'file', detail: '900 字' },
            ],
          },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ content: '# 第一集' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }))
  const props = {
    projectPath: '/project',
    closeProject: vi.fn(async () => {}),
    renderSlot: vi.fn((slot: string) => slot === 'sidebar'
      ? <button type="button">原生设置</button>
      : <div data-testid="conversation" />),
    useSessions: (selector: (value: typeof state) => unknown) => selector(state),
    useWorkspaces: (selector: (value: typeof workspaceState) => unknown) => selector(workspaceState),
    openSession,
    startSession,
    addSelectionToConversation,
  } as unknown as WorkspaceProps
  return {
    ...render(<Workspace {...props} />),
    openSession,
    startSession,
    addSelectionToConversation,
    renderSlot: props.renderSlot,
  }
}

describe('Zenwit workspace layout', () => {
  it('creates nodes and exposes daily file actions through the application menu', async () => {
    mountWorkspace()
    const files = screen.getByRole('complementary', { name: '文件目录' })
    fireEvent.click(await within(files).findByRole('button', { name: '新建文件' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '想法.md' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '确定' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/desktop/projects/node', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ path: '/project/想法.md', kind: 'file' }),
    })))

    fireEvent.click(within(files).getByRole('button', { name: '项目操作' }))
    const projectMenu = screen.getByRole('menu')
    expect(within(projectMenu).getByRole('menuitem', { name: '新建文件夹' })).toBeTruthy()
    expect(within(projectMenu).getByRole('menuitem', { name: '刷新' })).toBeTruthy()
    expect(within(projectMenu).getByRole('menuitem', { name: '全部折叠' })).toBeTruthy()
    fireEvent.pointerDown(document.body)

    fireEvent.click(within(files).getByRole('treeitem', { name: '剧本' }))
    const file = within(files).getByRole('treeitem', { name: /episode-1\.md/ })
    fireEvent.contextMenu(file, { clientX: 20, clientY: 30 })
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: '重命名' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '在 Finder 中显示' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '在终端中打开' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '添加到聊天' })).toBeTruthy()
  })

  it('imports a native file from the tree context menu and refreshes the structure', async () => {
    mountWorkspace()
    const files = screen.getByRole('complementary', { name: '文件目录' })
    fireEvent.contextMenu(files.querySelector('[role="tree"]')!, { clientX: 20, clientY: 30 })
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: '导入文档' }))
    const picker = files.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['docx'], '示例2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    fireEvent.change(picker, { target: { files: [file] } })
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/desktop/projects/import?projectPath=%2Fproject&destinationPath=%2Fproject&name=%E7%A4%BA%E4%BE%8B2.docx', expect.objectContaining({
      method: 'POST',
      body: file,
    })))
  })

  it('closes an open file tab after confirmed deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mountWorkspace()
    const files = screen.getByRole('complementary', { name: '文件目录' })
    fireEvent.click(await within(files).findByRole('treeitem', { name: '剧本' }))
    const file = within(files).getByRole('treeitem', { name: /episode-1\.md/ })
    fireEvent.click(file)
    await screen.findByRole('tab', { name: 'episode-1.md' })
    fireEvent.contextMenu(file, { clientX: 20, clientY: 30 })
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: '删除' }))
    await waitFor(() => expect(screen.queryByRole('tab', { name: 'episode-1.md' })).toBeNull())
    expect(fetch).toHaveBeenCalledWith('/api/desktop/projects/node', expect.objectContaining({ method: 'DELETE' }))
  })

  it('keeps files and settings on the left and conversation controls on the right', async () => {
    const view = mountWorkspace()
    const files = screen.getByRole('complementary', { name: '文件目录' })
    const chat = screen.getByRole('complementary', { name: '对话' })

    expect(await within(files).findByRole('tree', { name: '项目文件' })).toBeTruthy()
    expect(within(files).queryByText('screenplay.project.json')).toBeNull()
    expect(within(files).getByRole('button', { name: '项目库' })).toBeTruthy()
    const scripts = within(files).getByRole('treeitem', { name: '剧本' })
    expect(scripts.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(scripts)
    expect(within(files).getByText('episode-1.md')).toBeTruthy()
    expect(scripts.getAttribute('aria-expanded')).toBe('true')
    expect(within(files).queryByText(/历史会话/)).toBeNull()
    expect(screen.getByRole('button', { name: '原生设置' })).toBeTruthy()
    expect(within(chat).getByRole('button', { name: '新建对话' })).toBeTruthy()
    expect(view.renderSlot).toHaveBeenCalledWith('conversation', expect.objectContaining({
      showWorkspacePicker: false,
      showHeroHeadline: false,
      openFileInWorkspace: expect.any(Function),
    }))

    const historyButton = within(chat).getByRole('button', { name: '历史对话（2）' })
    expect(historyButton.getAttribute('title')).toBe('历史对话（2）')
    expect(within(historyButton).getByText('2')).toBeTruthy()
    fireEvent.click(historyButton)
    expect(within(chat).getByRole('button', { name: '打开历史对话：历史对话' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(within(chat).queryByRole('button', { name: '打开历史对话：历史对话' })).toBeNull()
    fireEvent.click(historyButton)
    fireEvent.pointerDown(document.body)
    expect(within(chat).queryByRole('button', { name: '打开历史对话：历史对话' })).toBeNull()
    fireEvent.click(within(chat).getByRole('button', { name: '新建对话' }))
    expect(view.startSession).toHaveBeenCalledWith('workspace-1')
  })

  it('opens Markdown in visual mode and keeps source mode available', async () => {
    mountWorkspace()
    fireEvent.click(await screen.findByRole('treeitem', { name: '剧本' }))
    fireEvent.click(await screen.findByText('episode-1.md'))
    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: /episode-1\.md/ }).getAttribute('aria-current')).toBe('page')
    })
    expect(await screen.findByTestId('visual-editor')).toBeTruthy()
    expect(screen.queryByTestId('editor')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '源码' }))
    expect(screen.getByTestId('editor')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '可视化' }))
    expect(screen.getByTestId('visual-editor')).toBeTruthy()
  })

  it('exposes an in-workspace opener for project files and declines outside paths', async () => {
    const view = mountWorkspace()
    const renderSlotMock = view.renderSlot as unknown as { mock: { calls: Array<[string, object]> } }
    const conversationCall = renderSlotMock.mock.calls.find(([slot]) => slot === 'conversation')
    const owner = conversationCall?.[1] as { openFileInWorkspace?: (path: string) => Promise<boolean> } | undefined
    expect(owner?.openFileInWorkspace).toBeTypeOf('function')
    expect(await owner!.openFileInWorkspace!('/project/剧本/episode-1.md')).toBe(true)
    await waitFor(() => expect(screen.getByRole('tab', { name: 'episode-1.md' })).toBeTruthy())
    expect(await owner!.openFileInWorkspace!('/other/notes.md')).toBe(false)
    expect(await owner!.openFileInWorkspace!('/project/../other/notes.md')).toBe(false)
  })

  it('adds a selected passage to the current conversation draft without sending', async () => {
    const view = mountWorkspace()
    fireEvent.click(await screen.findByRole('treeitem', { name: '剧本' }))
    fireEvent.click(await screen.findByText('episode-1.md'))
    fireEvent.click(await screen.findByRole('button', { name: '选择文本' }))
    const dialog = await screen.findByRole('dialog', { name: '局部编辑' })
    fireEvent.click(within(dialog).getByRole('button', { name: '添加到当前对话' }))
    await waitFor(() => expect(view.addSelectionToConversation).toHaveBeenCalledWith('current', expect.not.stringContaining('用户指令')))
    expect(view.addSelectionToConversation).toHaveBeenCalledWith('current', expect.stringContaining('文件：/project/剧本/episode-1.md'))
  })

  it('keeps multiple documents in independent tabs and reuses an existing tab', async () => {
    mountWorkspace()
    fireEvent.click(await screen.findByRole('treeitem', { name: '剧本' }))
    fireEvent.click(await screen.findByRole('treeitem', { name: /episode-1\.md/ }))
    fireEvent.click(await screen.findByRole('treeitem', { name: /episode-2\.md/ }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'episode-2.md' })).toBeTruthy())
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    fireEvent.click(screen.getByRole('treeitem', { name: /episode-1\.md/ }))
    expect(screen.getByRole('tab', { name: 'episode-1.md' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('treeitem', { name: /episode-1\.md/ }))
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })

  it('closes an unchanged tab and activates the remaining document', async () => {
    mountWorkspace()
    fireEvent.click(await screen.findByRole('treeitem', { name: '剧本' }))
    fireEvent.click(await screen.findByRole('treeitem', { name: /episode-1\.md/ }))
    fireEvent.click(await screen.findByRole('treeitem', { name: /episode-2\.md/ }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'episode-2.md' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '关闭 episode-2.md' }))
    expect(screen.queryByRole('tab', { name: 'episode-2.md' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'episode-1.md' }).getAttribute('aria-selected')).toBe('true')
  })

  it('restores open tabs, active document, and editor mode for the project', async () => {
    window.localStorage.setItem('zenwit.document-tabs./project', JSON.stringify({
      activePath: '/project/剧本/episode-2.md',
      documents: [
        { path: '/project/剧本/episode-1.md', name: 'episode-1.md', visualMode: true },
        { path: '/project/剧本/episode-2.md', name: 'episode-2.md', visualMode: false },
      ],
    }))
    mountWorkspace()
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2))
    expect(screen.getByRole('tab', { name: 'episode-2.md' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('editor')).toBeTruthy()
  })

  it('resizes all three panes through the two column handles', async () => {
    mountWorkspace()
    const workspace = screen.getByTestId('workspace-grid')
    expect(workspace.style.gridTemplateColumns).toContain('500px')
    const leftHandle = screen.getByRole('separator', { name: '调整文件目录宽度' })
    fireEvent.pointerDown(leftHandle, { pointerId: 1, clientX: 240 })
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 300 })
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 300 })
    await waitFor(() => expect(workspace.style.gridTemplateColumns).toContain('300px'))

    const rightHandle = screen.getByRole('separator', { name: '调整对话区域宽度' })
    fireEvent.pointerDown(rightHandle, { pointerId: 2, clientX: 900 })
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 850 })
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 850 })
    await waitFor(() => expect(workspace.style.gridTemplateColumns).toContain('520px'))
  })
})
