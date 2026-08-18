import React, { useReducer, useEffect, createContext, useContext } from 'react'
import { createWorkbenchClient } from '../wb-client.js'
import type { WorkbenchEntry } from '../wb-client.js'
import type { StoryStudioWorkbenchProps, WorkbenchState, WorkbenchAction, OpenFile } from './types.js'
import { FileTree } from './FileTree.js'
import { EditorArea } from './EditorArea.js'
import { PreviewPanel } from './PreviewPanel.js'

const WorkbenchContext = createContext<{
  state: WorkbenchState
  dispatch: React.Dispatch<WorkbenchAction>
} | null>(null)

export function useWorkbench() {
  const context = useContext(WorkbenchContext)
  if (!context) throw new Error('useWorkbench must be used within StoryStudioWorkbench')
  return context
}

function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'SET_ROOT':
      return { ...state, root: action.root, rootName: action.rootName }
    case 'SET_ENTRIES':
      return { ...state, entries: action.entries }
    case 'SELECT_PATH':
      return { ...state, selectedPath: action.path }
    case 'OPEN_FILE': {
      const existing = state.openFiles.findIndex((f: OpenFile) => f.path === action.path)
      if (existing !== -1) {
        return { ...state, activeFileIndex: existing }
      }
      const newFiles = [...state.openFiles, {
        path: action.path,
        name: action.name,
        content: action.content,
        version: action.version,
        dirty: false,
      }]
      return { ...state, openFiles: newFiles, activeFileIndex: newFiles.length - 1 }
    }
    case 'CLOSE_FILE': {
      const newFiles = state.openFiles.filter((_: OpenFile, i: number) => i !== action.index)
      let newActive = state.activeFileIndex
      if (newActive !== null) {
        if (newActive === action.index) {
          newActive = newFiles.length > 0 ? Math.min(action.index, newFiles.length - 1) : null
        } else if (newActive > action.index) {
          newActive -= 1
        }
      }
      return { ...state, openFiles: newFiles, activeFileIndex: newActive }
    }
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFileIndex: action.index }
    case 'UPDATE_FILE_CONTENT': {
      const newFiles: OpenFile[] = [...state.openFiles]
      const file = newFiles[action.index]
      if (!file) return state
      newFiles[action.index] = { path: file.path, name: file.name, version: file.version, content: action.content, dirty: action.dirty }
      return { ...state, openFiles: newFiles }
    }
    case 'MARK_FILE_SAVED': {
      const newFiles: OpenFile[] = [...state.openFiles]
      const file = newFiles[action.index]
      if (!file) return state
      newFiles[action.index] = { path: file.path, name: file.name, content: file.content, version: action.version, dirty: false }
      return { ...state, openFiles: newFiles }
    }
    default:
      return state
  }
}

/**
 * Root workbench component for Story Studio projects. Renders a three-panel
 * layout: file tree (left), editor tabs (center), and preview/collab (right).
 * Mounts only when the active session's cwd falls under the Story Studio
 * project root (see bindStoryStudioSessionSlot in ../index.tsx).
 */
export function StoryStudioWorkbench({ sessionId }: StoryStudioWorkbenchProps) {
  const client = createWorkbenchClient(sessionId)

  const [state, dispatch] = useReducer(workbenchReducer, {
    client,
    root: '',
    rootName: '',
    entries: [],
    selectedPath: null,
    openFiles: [],
    activeFileIndex: null,
  })

  useEffect(() => {
    void client.describe().then((result: { root: string; rootName: string }) => {
      dispatch({ type: 'SET_ROOT', root: result.root, rootName: result.rootName })
    })
  }, [sessionId])

  useEffect(() => {
    if (state.root) {
      void client.listDir().then((entries: WorkbenchEntry[]) => {
        dispatch({ type: 'SET_ENTRIES', entries })
      })
    }
  }, [state.root])

  return (
    <WorkbenchContext.Provider value={{ state, dispatch }}>
      <div className="storyStudioWorkbenchRoot" data-session-id={sessionId}>
        <div className="storyStudioWorkbenchLayout">
          <div className="storyStudioWorkbenchSidebar">
            <FileTree />
          </div>
          <div className="storyStudioWorkbenchMain">
            <EditorArea />
          </div>
          <div className="storyStudioWorkbenchPanel">
            <PreviewPanel />
          </div>
        </div>
      </div>
    </WorkbenchContext.Provider>
  )
}
