import React, { useState } from 'react'

interface StoryStudioRootProps {
  projectPath: string
  sessionId: string
  fileService?: {
    listDir: (path?: string) => Promise<Array<{ name: string; path: string; type: string }>>
    readFile: (path: string) => Promise<{ content: string; version: number }>
    writeFile: (path: string, content: string) => Promise<void>
  }
}

/**
 * Story Studio Root Component
 *
 * Three-column layout:
 * - Left: File tree
 * - Center: Editor
 * - Right: AI conversation (reuses DSH's conversation component)
 */
export function StoryStudioRoot({ projectPath, sessionId, fileService }: StoryStudioRootProps) {
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [files, setFiles] = useState<Array<{ name: string; path: string; type: string }>>([])

  // Load file tree on mount
  React.useEffect(() => {
    if (fileService) {
      fileService.listDir(projectPath).then(setFiles).catch(console.error)
    }
  }, [projectPath, fileService])

  // Load file content when selected
  const handleFileSelect = async (filePath: string) => {
    if (!fileService) return

    try {
      const { content } = await fileService.readFile(filePath)
      setCurrentFile(filePath)
      setFileContent(content)
    } catch (error) {
      console.error('Failed to load file:', error)
    }
  }

  // Save file content
  const handleSave = async () => {
    if (!fileService || !currentFile) return

    try {
      await fileService.writeFile(currentFile, fileContent)
      alert('保存成功')
    } catch (error) {
      console.error('Failed to save file:', error)
      alert('保存失败')
    }
  }

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      background: '#1e1e1e',
      color: '#d4d4d4',
    }}>
      {/* Left: File Tree */}
      <div style={{
        width: '250px',
        borderRight: '1px solid #333',
        padding: '16px',
        overflowY: 'auto',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#888' }}>
          项目文件
        </h3>
        <div>
          {files.map(file => (
            <div
              key={file.path}
              onClick={() => file.type === 'file' && handleFileSelect(file.path)}
              style={{
                padding: '8px',
                cursor: file.type === 'file' ? 'pointer' : 'default',
                borderRadius: '4px',
                marginBottom: '4px',
                background: currentFile === file.path ? '#37373d' : 'transparent',
                ':hover': {
                  background: '#2a2d2e',
                },
              }}
            >
              {file.type === 'directory' ? '📁' : '📄'} {file.name}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Editor */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #333',
      }}>
        {currentFile ? (
          <>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '13px', color: '#888' }}>
                {currentFile.split('/').pop()}
              </span>
              <button
                onClick={handleSave}
                style={{
                  padding: '6px 12px',
                  background: '#0e639c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                保存 (⌘S)
              </button>
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              style={{
                flex: 1,
                background: '#1e1e1e',
                color: '#d4d4d4',
                border: 'none',
                padding: '16px',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                resize: 'none',
                outline: 'none',
              }}
              placeholder="选择文件开始编辑..."
            />
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: '14px',
          }}>
            从左侧选择文件开始编辑
          </div>
        )}
      </div>

      {/* Right: AI Conversation Panel */}
      <div style={{
        width: '400px',
        display: 'flex',
        flexDirection: 'column',
        background: '#252526',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #333',
          fontSize: '13px',
          color: '#888',
        }}>
          AI 助手
        </div>
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
        }}>
          <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.6' }}>
            AI对话功能正在开发中...
            <br /><br />
            这里将集成DSH的conversation组件，
            提供智能剧本创作辅助。
          </p>
        </div>
      </div>
    </div>
  )
}
