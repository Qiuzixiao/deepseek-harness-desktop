import { useWorkbench } from './StoryStudioWorkbench.js'

/**
 * Right panel showing a simple markdown-style preview of the active file's
 * content. This is a naive plain-text/line-break renderer; a real markdown
 * parser can replace this later if needed.
 */
export function PreviewPanel() {
  const { state } = useWorkbench()

  const activeFile = state.activeFileIndex !== null ? state.openFiles[state.activeFileIndex] : null

  if (!activeFile) {
    return (
      <div className="storyStudioPreviewPanel">
        <div style={{ color: 'var(--dsw-alias-text-tertiary)', fontSize: '13px' }}>
          No preview available
        </div>
      </div>
    )
  }

  return (
    <div className="storyStudioPreviewPanel">
      <div className="storyStudioPreviewContent">
        {activeFile.content.split('\n').map((line: string, i: number) => (
          <p key={i}>{line || ' '}</p>
        ))}
      </div>
    </div>
  )
}
