// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { Workspace } from '../src/client/Workspace.tsx'
import type { WorkspaceProps } from '../src/client/Workspace.tsx'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => <article data-testid="preview">{text}</article>,
  IconChevronDownOutline14: () => <span />,
  IconNewChatOutline16: () => <span />,
}))

vi.mock('../src/client/Editor.tsx', () => ({
  Editor: () => <div data-testid="editor" />,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mountWorkspace() {
  const openSession = vi.fn()
  const startSession = vi.fn()
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
        path: '/project', phase: 'Writing', revision: 3, nextEpisode: 2, root: 'Project',
        tree: [
          {
            name: '剧本', path: '/project/剧本', kind: 'dir', detail: '', children: [
              { name: 'episode-1.md', path: '/project/剧本/episode-1.md', kind: 'file', detail: '1200 字' },
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
  } as unknown as WorkspaceProps
  return { ...render(<Workspace {...props} />), openSession, startSession }
}

describe('Zenwit workspace layout', () => {
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

    fireEvent.click(within(chat).getByRole('button', { name: '历史对话（2）' }))
    expect(within(chat).getByRole('button', { name: '打开历史对话：历史对话' })).toBeTruthy()
    fireEvent.click(within(chat).getByRole('button', { name: '新建对话' }))
    expect(view.startSession).toHaveBeenCalledWith('workspace-1')
  })

  it('opens every file in CodeMirror and keeps rendered preview available', async () => {
    mountWorkspace()
    fireEvent.click(await screen.findByRole('treeitem', { name: '剧本' }))
    fireEvent.click(await screen.findByText('episode-1.md'))
    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: /episode-1\.md/ }).getAttribute('aria-current')).toBe('page')
    })
    expect(await screen.findByTestId('editor')).toBeTruthy()
    expect(screen.queryByTestId('preview')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '预览' }))
    expect(screen.getByTestId('preview').textContent).toBe('# 第一集')
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
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
