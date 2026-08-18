import { useWorkbench } from './StoryStudioWorkbench.js'
import type { WorkbenchEntry } from '../wb-client.js'

/**
 * File tree sidebar showing the current workspace directory structure.
 * Clicking a file dispatches OPEN_FILE to load it into the editor.
 */
export function FileTree() {
  const { state, dispatch } = useWorkbench()

  const handleClick = async (entry: WorkbenchEntry) => {
    if (entry.type === 'file') {
      const fullPath = entry.name
      try {
        const result = await state.client.readFile(fullPath)
        dispatch({
          type: 'OPEN_FILE',
          path: fullPath,
          name: entry.name,
          content: result.content,
          version: result.version,
        })
      } catch (error) {
        console.error('Failed to read file:', error)
      }
    }
  }

  return (
    <div className="storyStudioFileTree">
      {state.entries.length === 0 ? (
        <div className="storyStudioEmpty">No files</div>
      ) : (
        state.entries.map((entry, i: number) => (
          <div
            key={i}
            className="storyStudioFileTreeItem"
            data-selected={state.selectedPath === entry.name}
            onClick={() => handleClick(entry)}
          >
            <div className="storyStudioFileTreeIcon">
              {entry.type === 'directory' ? '📁' : '📄'}
            </div>
            <div className="storyStudioFileTreeName">{entry.name}</div>
          </div>
        ))
      )}
    </div>
  )
}
