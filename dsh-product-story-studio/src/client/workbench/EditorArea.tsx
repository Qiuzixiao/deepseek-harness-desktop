import React from 'react'
import { useWorkbench } from './StoryStudioWorkbench.js'
import type { OpenFile } from './types.js'

/**
 * Editor area with tabs and content. Shows the currently active file's
 * content in a simple textarea. Dispatches UPDATE_FILE_CONTENT on change
 * and marks the file dirty until explicitly saved.
 */
export function EditorArea() {
  const { state, dispatch } = useWorkbench()

  const activeFile = state.activeFileIndex !== null ? state.openFiles[state.activeFileIndex] : null

  const handleTabClick = (index: number) => {
    dispatch({ type: 'SET_ACTIVE_FILE', index })
  }

  const handleClose = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'CLOSE_FILE', index })
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (state.activeFileIndex === null) return
    dispatch({
      type: 'UPDATE_FILE_CONTENT',
      index: state.activeFileIndex,
      content: e.target.value,
      dirty: true,
    })
  }

  return (
    <>
      {state.openFiles.length > 0 && (
        <div className="storyStudioEditorTabs">
          {state.openFiles.map((file: OpenFile, i: number) => (
            <button
              key={i}
              className="storyStudioEditorTab"
              data-active={i === state.activeFileIndex}
              onClick={() => handleTabClick(i)}
            >
              <span className="storyStudioEditorTabName">{file.name}</span>
              {file.dirty && <span style={{ color: 'var(--dsw-alias-text-secondary)' }}>●</span>}
              <button
                className="storyStudioEditorTabClose"
                onClick={(e) => handleClose(i, e)}
                title="Close"
              >
                ×
              </button>
            </button>
          ))}
        </div>
      )}
      <div className="storyStudioEditorContent">
        {activeFile ? (
          <textarea
            className="storyStudioEditorTextarea"
            value={activeFile.content}
            onChange={handleContentChange}
            spellCheck={false}
          />
        ) : (
          <div style={{ color: 'var(--dsw-alias-text-tertiary)' }}>
            No file open
          </div>
        )}
      </div>
    </>
  )
}
