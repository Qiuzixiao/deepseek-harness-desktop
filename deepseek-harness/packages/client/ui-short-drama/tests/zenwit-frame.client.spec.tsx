// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { ZenwitFrame } from '../src/client/ZenwitFrame.tsx'
import type { ZenwitFrameProps } from '../src/client/ZenwitFrame.tsx'

vi.mock('../src/client/HomePage.tsx', () => ({
  HomePage: ({ openProject }: { openProject: (path: string) => Promise<void> }) => (
    <div data-testid="home"><button data-testid="home-open" type="button" onClick={() => void openProject('/Users/tester/ShortDrama/restored-project')}>open</button></div>
  ),
}))

vi.mock('../src/client/Workspace.tsx', () => ({
  Workspace: ({ projectPath, closeProject }: { projectPath: string, closeProject: () => Promise<void> }) => (
    <div data-testid="workspace" data-project-path={projectPath}><button data-testid="workspace-close" type="button" onClick={() => void closeProject()}>close</button></div>
  ),
}))

afterEach(() => {
  cleanup()
  window.sessionStorage.removeItem('zenwit.surface')
})

function sessionState(phase: SessionListState['phase'], current?: SessionId, cwd?: string): SessionListState {
  return {
    ids: current === undefined ? [] : [current],
    byId: current === undefined ? {} : {
      [current]: {
        id: current,
        displayTitle: 'Project session',
        running: false,
        blank: false,
        updatedAt: 1,
        ...(cwd === undefined ? {} : { cwd }),
      },
    },
    current,
    phase,
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

function mount(state: SessionListState) {
  const openProject = vi.fn(async () => {})
  const closeProject = vi.fn(async () => {})
  const renderSlot = vi.fn(() => null)
  const props = {
    useSessions: (selector: (value: SessionListState) => unknown) => selector(state),
    renderSlot,
    list: vi.fn(async () => []),
    create: vi.fn(),
    openProject,
    closeProject,
    openSession: vi.fn(),
    startSession: vi.fn(),
  } as unknown as ZenwitFrameProps
  return { ...render(<ZenwitFrame {...props} />), openProject, closeProject, renderSlot }
}

describe('ZenwitFrame surface navigation', () => {
  it('mounts the native settings owner without a Zenwit top bar', () => {
    const view = mount(sessionState('ready'))
    expect(view.renderSlot).toHaveBeenCalledWith('sidebar', {
      collapsed: true,
      width: 0,
      settingsOnly: true,
    })
    expect(view.queryByText('Zenwit')).toBeNull()
    expect(view.queryByText('短剧创作工作台')).toBeNull()
    expect(view.queryByText('设置')).toBeNull()
  })

  it('starts at the project library when the software opens', () => {
    const view = mount(sessionState('ready', 'session-1' as SessionId, '/Users/tester/ShortDrama/restored-project'))
    expect(view.getByTestId('home')).toBeTruthy()
    expect(view.queryByTestId('workspace')).toBeNull()
  })

  it('does not flash the home page while the persisted session is restoring', () => {
    window.sessionStorage.setItem('zenwit.surface', 'workspace')
    const view = mount(sessionState('pending'))
    expect(view.queryByTestId('home')).toBeNull()
    expect(view.queryByTestId('workspace')).toBeNull()
    expect(view.getByText('正在恢复创作现场')).toBeTruthy()
  })

  it('restores the workspace directly from the persisted current session cwd', () => {
    const path = '/Users/tester/ShortDrama/restored-project'
    window.sessionStorage.setItem('zenwit.surface', 'workspace')
    const view = mount(sessionState('ready', 'session-1' as SessionId, path))
    expect(view.getByTestId('workspace').getAttribute('data-project-path')).toBe(path)
    expect(view.openProject).not.toHaveBeenCalled()
  })

  it('keeps the project library after refresh when the user previously returned home', () => {
    window.sessionStorage.setItem('zenwit.surface', 'home')
    const view = mount(sessionState('ready', 'session-1' as SessionId, '/Users/tester/ShortDrama/restored-project'))
    expect(view.getByTestId('home')).toBeTruthy()
    expect(view.queryByTestId('workspace')).toBeNull()
  })

  it('switches to and persists the workspace after opening a project again', async () => {
    const view = mount(sessionState('ready', 'session-1' as SessionId, '/Users/tester/ShortDrama/restored-project'))
    fireEvent.click(view.getByTestId('home-open'))
    await waitFor(() => expect(view.getByTestId('workspace')).toBeTruthy())
    expect(view.openProject).toHaveBeenCalledWith('/Users/tester/ShortDrama/restored-project')
    expect(window.sessionStorage.getItem('zenwit.surface')).toBe('workspace')
  })

  it('persists the project-library intent when leaving the workspace', async () => {
    window.sessionStorage.setItem('zenwit.surface', 'workspace')
    const view = mount(sessionState('ready', 'session-1' as SessionId, '/Users/tester/ShortDrama/restored-project'))
    fireEvent.click(view.getByTestId('workspace-close'))
    await waitFor(() => expect(view.getByTestId('home')).toBeTruthy())
    expect(view.closeProject).toHaveBeenCalledOnce()
    expect(window.sessionStorage.getItem('zenwit.surface')).toBe('home')
  })

  it('shows the project library when session restoration settles without a selection', () => {
    const view = mount(sessionState('ready'))
    expect(view.getByTestId('home')).toBeTruthy()
    expect(view.queryByTestId('workspace')).toBeNull()
  })
})
