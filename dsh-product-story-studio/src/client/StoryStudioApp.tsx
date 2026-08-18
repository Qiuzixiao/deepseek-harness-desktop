import { useState, useEffect } from 'react'
import { useStorySession } from './hooks/useStorySession.js'
import { useFileManager } from './hooks/useFileManager.js'
import type { Context } from '@deepseek-ai/cordis'
import type { FileTreeNode } from './services/ProjectFileService.js'

/**
 * 获取 DSH Client Context
 */
function useClientContext(): Context | null {
  const [ctx, setCtx] = useState<Context | null>(null)

  useEffect(() => {
    // 从 window 获取 context
    const clientCtx = (window as any).__dshClientContext as Context | undefined
    if (clientCtx) {
      setCtx(clientCtx)
    }
  }, [])

  return ctx
}

/**
 * 文件树节点组件
 */
function FileTreeNodeComponent({
  node,
  level,
  onFileClick,
  activeFilePath,
}: {
  node: FileTreeNode
  level: number
  onFileClick: (path: string) => void
  activeFilePath?: string | undefined
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0)

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded)
    } else {
      onFileClick(node.path)
    }
  }

  const isActive = node.type === 'file' && node.path === activeFilePath

  return (
    <>
      <button
        className={`ss-tree-row ${isActive ? 'active' : ''} ${level > 0 ? 'ss-tree-indent' : ''}`}
        onClick={handleClick}
      >
        <span>{node.type === 'folder' ? (isExpanded ? '▼' : '▶') : '▧'}</span>
        <span className="ss-label">{node.name}</span>
        {node.type === 'folder' && node.children && (
          <span className="ss-meta">{node.children.length}</span>
        )}
      </button>
      {node.type === 'folder' && isExpanded && node.children && (
        <>
          {node.children.map(child => (
            <FileTreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
            />
          ))}
        </>
      )}
    </>
  )
}

/**
 * Story Studio 完整应用界面
 * 基于 Bento 卡片式工作台设计
 */

interface StoryStudioAppProps {
  projectPath: string
  onBackToProjects: () => void
}

export function StoryStudioApp({ projectPath, onBackToProjects }: StoryStudioAppProps) {
  const [activeSection, setActiveSection] = useState('works')
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [activeRightTab, setActiveRightTab] = useState('assistant')
  const [promptInput, setPromptInput] = useState('')
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file')

  // 集成文件管理
  const ctx = useClientContext()
  console.log('[Story Studio] Context in StoryStudioApp:', ctx)

  // 使用传入的项目路径
  console.log('[Story Studio] Project root:', projectPath)

  const fileManager = useFileManager(ctx, projectPath)

  // 集成会话管理
  const sessionHook = ctx && fileManager.activeFile ? useStorySession(ctx, {
    projectId: 'fuzitongxin-001',
    projectName: '父子同心',
    currentFile: fileManager.activeFile.name,
    scriptContent: fileManager.activeFile.content,
  }) : null

  // 发送消息处理
  const handleSendMessage = () => {
    if (!promptInput.trim() || !sessionHook) return
    sessionHook.sendMessage(promptInput)
    setPromptInput('')
  }

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 处理新建文件/文件夹
  const handleCreateNew = async () => {
    if (!newFileName.trim()) return

    const success = newFileType === 'file'
      ? await fileManager.createNewFile(newFileName)
      : await fileManager.createNewFolder(newFileName)

    if (success) {
      setShowNewFileDialog(false)
      setNewFileName('')
    }
  }

  // 显示新建对话框
  const showCreateDialog = (type: 'file' | 'folder') => {
    setNewFileType(type)
    setNewFileName('')
    setShowNewFileDialog(true)
  }

  return (
    <div className="story-studio-app">
      {/* macOS 窗口拖拽区域 - 为窗口控制按钮留出左侧空间 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 80,
        right: 0,
        height: '40px',
        WebkitAppRegion: 'drag',
        zIndex: 9999,
        pointerEvents: 'none',
      } as any} />

      {/* SVG Icons */}
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <symbol id="icon-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="m20 20-4-4"></path>
        </symbol>
        <symbol id="icon-wand" viewBox="0 0 24 24">
          <path d="m15 4 5 5L7 22H2v-5Z"></path>
          <path d="m14 5 5 5M6 7V3M4 5h4M19 18v4M17 20h4"></path>
        </symbol>
        <symbol id="icon-plus" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5v14"></path>
        </symbol>
        <symbol id="icon-book" viewBox="0 0 24 24">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path>
        </symbol>
        <symbol id="icon-list" viewBox="0 0 24 24">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
        </symbol>
        <symbol id="icon-users" viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
        </symbol>
        <symbol id="icon-globe" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path>
        </symbol>
        <symbol id="icon-paperclip" viewBox="0 0 24 24">
          <path d="m20.5 11.5-8.6 8.6a5 5 0 0 1-7.1-7.1l9-9a3.5 3.5 0 0 1 5 5l-8.7 8.7a2 2 0 0 1-2.8-2.8l8-8"></path>
        </symbol>
        <symbol id="icon-check" viewBox="0 0 24 24">
          <path d="m5 12 4 4L19 6"></path>
        </symbol>
        <symbol id="icon-settings" viewBox="0 0 24 24">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path>
        </symbol>
        <symbol id="icon-panel" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <path d="M15 3v18"></path>
        </symbol>
        <symbol id="icon-x" viewBox="0 0 24 24">
          <path d="m6 6 12 12M18 6 6 18"></path>
        </symbol>
        <symbol id="icon-arrow-up" viewBox="0 0 24 24">
          <path d="M12 19V5M5 12l7-7 7 7"></path>
        </symbol>
        <symbol id="icon-chevron-down" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6"></path>
        </symbol>
      </svg>

      {/* 顶栏 */}
      <header className="ss-topbar">
        <div className="ss-brand-mark">S</div>
        <div className="ss-brand-name">
          Story Studio <span>beta</span>
        </div>
        <div className="ss-project-heading">
          <strong>父子同心</strong>
          <span className="ss-divider"></span>
          <span className="ss-save-state">
            {fileManager.saveState === 'saving' && '保存中...'}
            {fileManager.saveState === 'saved' && '已保存'}
            {fileManager.saveState === 'unsaved' && '未保存'}
          </span>
        </div>
        <div className="ss-top-actions">
          <button className="ss-icon-button" title="搜索">
            <svg className="ss-ui-icon"><use href="#icon-search"></use></svg>
          </button>
          <button className="ss-compact-button">
            <svg className="ss-ui-icon"><use href="#icon-wand"></use></svg>
            AI 助手
          </button>
          <button className="ss-primary-button">
            <svg className="ss-ui-icon"><use href="#icon-plus"></use></svg>
            新建作品
          </button>
        </div>
      </header>

      {/* 工作区 */}
      <div className={`ss-workspace ${!rightPanelOpen ? 'right-closed' : ''}`}>
        {/* 左侧导航栏 */}
        <nav className="ss-rail">
          <button
            className={`ss-rail-button ${activeSection === 'works' ? 'active' : ''}`}
            onClick={() => setActiveSection('works')}
            title="作品"
          >
            <svg className="ss-nav-icon"><use href="#icon-book"></use></svg>
          </button>
          <button
            className={`ss-rail-button ${activeSection === 'outline' ? 'active' : ''}`}
            onClick={() => setActiveSection('outline')}
            title="大纲"
          >
            <svg className="ss-nav-icon"><use href="#icon-list"></use></svg>
          </button>
          <button
            className={`ss-rail-button ${activeSection === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveSection('characters')}
            title="人物"
          >
            <svg className="ss-nav-icon"><use href="#icon-users"></use></svg>
          </button>
          <button
            className={`ss-rail-button ${activeSection === 'world' ? 'active' : ''}`}
            onClick={() => setActiveSection('world')}
            title="世界"
          >
            <svg className="ss-nav-icon"><use href="#icon-globe"></use></svg>
          </button>
          <button
            className={`ss-rail-button ${activeSection === 'references' ? 'active' : ''}`}
            onClick={() => setActiveSection('references')}
            title="资料"
          >
            <svg className="ss-nav-icon"><use href="#icon-paperclip"></use></svg>
          </button>
          <button
            className={`ss-rail-button ${activeSection === 'review' ? 'active' : ''}`}
            onClick={() => setActiveSection('review')}
            title="审稿"
          >
            <svg className="ss-nav-icon"><use href="#icon-check"></use></svg>
          </button>
          <div className="ss-rail-spacer"></div>
          <button className="ss-rail-button" title="设置">
            <svg className="ss-nav-icon"><use href="#icon-settings"></use></svg>
          </button>
        </nav>

        {/* 项目库面板 */}
        <aside className="ss-library">
          <div className="ss-panel-heading">
            <h2>作品</h2>
            <button className="ss-icon-button" title="更多">⋯</button>
          </div>

          <div className="ss-project-switcher">
            <div className="ss-project-switcher-top">
              <div className="ss-project-cover">父子</div>
              <div className="ss-project-meta">
                <strong>父子同心</strong>
                <span>男频短剧 · 第一季 · 50 集</span>
              </div>
              <button className="ss-icon-button" title="切换作品">
                <svg className="ss-ui-icon"><use href="#icon-chevron-down"></use></svg>
              </button>
            </div>
            <div className="ss-progress-line">
              <span style={{ width: '34%' }}></span>
            </div>
          </div>

          <div className="ss-library-content">
            <div className="ss-section-label">
              <span>项目结构</span>
              <button
                className="ss-section-action"
                onClick={() => showCreateDialog('file')}
                title="新建文件"
              >
                ＋
              </button>
            </div>

            {/* 渲染文件树 */}
            {fileManager.fileTree.map(node => (
              <FileTreeNodeComponent
                key={node.id}
                node={node}
                level={0}
                onFileClick={fileManager.openFile}
                activeFilePath={fileManager.activeFile?.path}
              />
            ))}

            {fileManager.openFiles.length > 0 && (
              <>
                <div className="ss-section-label" style={{ marginTop: '16px' }}>
                  <span>最近编辑</span>
                  <span></span>
                </div>
                {fileManager.openFiles.slice(0, 5).map(file => (
                  <button
                    key={file.id}
                    className={`ss-library-row ${file.id === fileManager.activeFileId ? 'active' : ''}`}
                    onClick={() => fileManager.setActiveFileId(file.id)}
                  >
                    <span>◎</span>
                    <span className="ss-label">{file.name}</span>
                    <span className="ss-meta">{file.isDirty ? '未保存' : '已保存'}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="ss-library-footer">
            <span className="ss-status-dot"></span>
            <span>项目目录已同步</span>
          </div>
        </aside>

        {/* 编辑器主区域 */}
        <main className="ss-stage">
          <div className="ss-editor-toolbar">
            <div className="ss-breadcrumb">
              {fileManager.activeFile ? (
                <>
                  <strong>{fileManager.activeFile.name}</strong>
                </>
              ) : (
                <span>未选择文件</span>
              )}
            </div>
            <button className="ss-icon-button"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              title="切换右侧面板"
            >
              <svg className="ss-ui-icon"><use href="#icon-panel"></use></svg>
            </button>
          </div>

          <div className="ss-editor-scroll">
            {fileManager.activeFile ? (
              <article className="ss-writing-sheet">
                <div className="ss-document-kicker">
                  {/* 文档标签 */}
                </div>
                <h1 className="ss-document-title">
                  {fileManager.activeFile.name}
                </h1>
                <div className="ss-document-meta">
                  <span>{fileManager.activeFile.isDirty ? '未保存' : '已保存'}</span>
                  <span>{fileManager.activeFile.content.length} 字</span>
                  <span>
                    {/* 最后修改时间 */}
                  </span>
                </div>
                <textarea
                  className="ss-editor-body"
                  value={fileManager.activeFile.content}
                  onChange={(e) => fileManager.updateFileContent(fileManager.activeFile!.id, e.target.value)}
                  placeholder="开始编写剧本..."
                  style={{
                    width: '100%',
                    minHeight: '600px',
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    padding: 0,
                    background: 'transparent',
                  }}
                />
              </article>
            ) : (
              <div className="ss-writing-sheet" style={{ textAlign: 'center', paddingTop: '100px', color: '#999' }}>
                <p>请从左侧选择一个文件开始编辑</p>
              </div>
            )}
          </div>

          <div className="ss-stage-footer">
            <span>Markdown</span>
            <span>UTF-8</span>
            <span>{fileManager.activeFile?.content.length || 0} 字</span>
          </div>
        </main>

        {/* 右侧协作台 */}
        {rightPanelOpen && (
          <aside className="ss-right-panel">
            <div className="ss-right-tabs">
              <button
                className={`ss-right-tab ${activeRightTab === 'assistant' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('assistant')}
              >
                协作台
              </button>
              <button
                className={`ss-right-tab ${activeRightTab === 'context' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('context')}
              >
                本集资料
              </button>
              <button
                className={`ss-right-tab ${activeRightTab === 'files' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('files')}
              >
                文件
              </button>
              <button
                className="ss-right-close"
                onClick={() => setRightPanelOpen(false)}
                title="关闭"
              >
                <svg className="ss-ui-icon"><use href="#icon-x"></use></svg>
              </button>
            </div>

            {activeRightTab === 'assistant' && (
              <div className="ss-right-view ss-assistant-view">
                <div className="ss-operation-header">
                  <div>
                    <strong>第 17 集 · 创作任务</strong>
                    <span>父亲先赢一次，保留集尾大回报</span>
                  </div>
                  <span className="ss-operation-status">
                    {sessionHook?.isThinking ? '进行中' : '就绪'}
                  </span>
                </div>

                <div className="ss-assistant-scroll">
                  {sessionHook?.isThinking && (
                    <div className="ss-thinking-surface">
                      <div className="ss-thinking-steps">
                        {sessionHook.thinkingSteps.map(step => (
                          <div
                            key={step.id}
                            className={`ss-plan-step ${step.status}`}
                          >
                            <span className="ss-plan-marker">
                              {step.status === 'complete' && (
                                <svg className="ss-ui-icon"><use href="#icon-check"></use></svg>
                              )}
                            </span>
                            <span>{step.description}</span>
                            {step.status === 'active' && <em>进行中</em>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionHook?.lastResponse && (
                    <div className="ss-generation-result">
                      <div className="ss-result-heading">
                        <span>建议场次</span>
                        <span>可插入正文</span>
                      </div>
                      <div className="ss-result-content">
                        {sessionHook.lastResponse}
                      </div>
                      <div className="ss-result-actions">
                        <button className="ss-accept">
                          <svg className="ss-ui-icon"><use href="#icon-plus"></use></svg>
                          插入正文
                        </button>
                        <button onClick={() => sessionHook.sendMessage('继续写下一场')}>
                          继续写
                        </button>
                        <button onClick={() => sessionHook.sendMessage('优化对白，让它更生动')}>
                          改对白
                        </button>
                        <button>收起</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ss-prompt-composer">
                  <div className="ss-prompt-context">
                    <span>当前文稿</span>
                    <span>S01-E017</span>
                    <span>赵大河</span>
                  </div>
                  <div className="ss-prompt-box">
                    <textarea
                      placeholder="继续创作，或修改当前内容"
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!sessionHook || sessionHook.isThinking}
                    ></textarea>
                    <div className="ss-prompt-footer">
                      <button className="ss-prompt-tool" title="添加资料">
                        <svg className="ss-ui-icon"><use href="#icon-paperclip"></use></svg>
                      </button>
                      <button className="ss-prompt-model">
                        创作模式
                        <svg className="ss-ui-icon"><use href="#icon-chevron-down"></use></svg>
                      </button>
                      <button
                        className="ss-send-button"
                        title="发送"
                        onClick={handleSendMessage}
                        disabled={!sessionHook || sessionHook.isThinking || !promptInput.trim()}
                      >
                        <svg className="ss-ui-icon"><use href="#icon-arrow-up"></use></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRightTab === 'context' && (
              <div className="ss-right-view ss-context-view">
                <div className="ss-context-section">
                  <div className="ss-context-title">
                    出场人物 <span>3 人</span>
                  </div>
                  <div className="ss-character-row">
                    <div className="ss-avatar">赵</div>
                    <div>
                      <strong>赵大河</strong>
                      <span>38 岁 · 失业工人 · 可听见儿子心声</span>
                    </div>
                  </div>
                  <div className="ss-character-row">
                    <div className="ss-avatar">川</div>
                    <div>
                      <strong>赵小川</strong>
                      <span>17 岁 · 重生者 · 自信但仍稚嫩</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRightTab === 'files' && (
              <div className="ss-right-view ss-files-view">
                <div className="ss-files-root">/Users/qiuzixiao/Documents/Story Studio/父子同心</div>
                <div className="ss-file-row">⌄　▰　scripts</div>
                <div className="ss-file-row ss-file-indent-1">▧　S01-E017.md</div>
                <div className="ss-file-row ss-file-indent-1">▧　S01-E018.md</div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 新建文件/文件夹对话框 */}
      {showNewFileDialog && (
        <div className="ss-dialog-overlay" onClick={() => setShowNewFileDialog(false)}>
          <div className="ss-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ss-dialog-header">
              <h3>{newFileType === 'file' ? '新建文件' : '新建文件夹'}</h3>
              <button
                className="ss-icon-button"
                onClick={() => setShowNewFileDialog(false)}
                title="关闭"
              >
                <svg className="ss-ui-icon"><use href="#icon-x"></use></svg>
              </button>
            </div>
            <div className="ss-dialog-body">
              <input
                type="text"
                className="ss-dialog-input"
                placeholder={newFileType === 'file' ? '文件名（如：第01集.md）' : '文件夹名'}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNew()
                  } else if (e.key === 'Escape') {
                    setShowNewFileDialog(false)
                  }
                }}
                autoFocus
              />
            </div>
            <div className="ss-dialog-footer">
              <button
                className="ss-compact-button"
                onClick={() => setShowNewFileDialog(false)}
              >
                取消
              </button>
              <button
                className="ss-primary-button"
                onClick={handleCreateNew}
                disabled={!newFileName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const storyStudioAppStyles = `
/* 隐藏 AdvancedFrame 的默认组件 */
.dshDesktopSidebarSurface {
  display: none !important;
}

.dshDesktopFrame > aside {
  display: none !important;
}

/* ============================================================
   Story Studio · Bento 卡片式工作台
   ============================================================ */
:root {
  --ss-bg: #EEEEF0;
  --ss-bg-2: #F5F5F7;
  --ss-surface: #FFFFFF;
  --ss-surface-2: #FAFAFC;
  --ss-dark: #1D1D1F;
  --ss-dark-2: #2C2C2E;
  --ss-ink: #1D1D1F;
  --ss-text: #424245;
  --ss-muted: #6E6E73;
  --ss-faint: #AEAEB2;
  --ss-hairline: #E8E8ED;
  --ss-hairline-strong: #D8D8E0;
  --ss-brand: #0071E3;
  --ss-brand-hover: #0077ED;
  --ss-brand-deep: #0062C4;
  --ss-brand-soft: #EAF2FE;
  --ss-green: #1FA958;
  --ss-green-soft: #EAF8F0;
  --ss-orange: #F08A24;
  --ss-orange-soft: #FDF3E7;
  --ss-shadow-sm: 0 1px 2px rgba(0, 0, 0, .05);
  --ss-shadow: 0 2px 8px rgba(0, 0, 0, .05), 0 12px 32px rgba(0, 0, 0, .06);
  --ss-shadow-float: 0 8px 24px rgba(0, 0, 0, .10), 0 2px 8px rgba(0, 0, 0, .07);
  --ss-shadow-paper: 0 2px 8px rgba(0, 0, 0, .06), 0 24px 48px rgba(0, 0, 0, .10);
  --ss-r-card: 22px;
  --ss-r-lg: 28px;
  --ss-r-md: 16px;
  --ss-r-sm: 12px;
  --ss-r-pill: 100px;
  --ss-sans: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --ss-mono: 'Geist Mono', 'SF Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
  --ss-writing: 'Songti SC', 'STSong', 'Noto Serif CJK SC', 'Source Han Serif SC', serif;
  --ss-ease: cubic-bezier(.22, 1, .36, 1);
}

.story-studio-app {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding: 40px 14px 14px 14px;
  background: var(--ss-bg);
  color: var(--ss-text);
  font: 14px/1.45 var(--ss-sans);
  -webkit-font-smoothing: antialiased;
  z-index: 100;
  box-sizing: border-box;
}

.story-studio-app *,
.story-studio-app *::before,
.story-studio-app *::after {
  box-sizing: border-box;
}

/* ============ 顶栏 ============ */
.ss-topbar {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 7px 8px 7px 80px;
  background: var(--ss-surface);
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-lg);
  box-shadow: var(--ss-shadow);
  z-index: 4;
}

.ss-brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(180deg, #0A84FF, #0062C4);
  color: #fff;
  font: 800 19px/1 var(--ss-sans);
  letter-spacing: -.02em;
  box-shadow: 0 4px 12px rgba(0, 113, 227, .3);
}

.ss-brand-name {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding: 0 4px 0 2px;
  color: var(--ss-ink);
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -.01em;
}

.ss-brand-name span {
  color: var(--ss-brand);
  font: 600 9px/1 var(--ss-mono);
  letter-spacing: .14em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 99px;
  background: var(--ss-brand-soft);
}

.ss-project-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 6px;
}

.ss-project-heading strong {
  overflow: hidden;
  color: var(--ss-ink);
  font-size: 13.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-divider {
  width: 1px;
  height: 16px;
  border-radius: 99px;
  background: var(--ss-hairline-strong);
}

.ss-save-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border-radius: 99px;
  background: var(--ss-surface-2);
  color: var(--ss-muted);
  font-size: 11px;
  white-space: nowrap;
}

.ss-save-state::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ss-green);
  box-shadow: 0 0 0 3px var(--ss-green-soft);
}

.ss-top-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

/* ============ 按钮 ============ */
.ss-icon-button,
.ss-compact-button,
.ss-primary-button,
.ss-rail-button,
.ss-right-tab,
.ss-right-close,
.ss-prompt-tool,
.ss-prompt-model,
.ss-send-button {
  border: 0;
  cursor: pointer;
  transition: transform 170ms var(--ss-ease), background-color 170ms var(--ss-ease), color 170ms var(--ss-ease), box-shadow 170ms var(--ss-ease);
}

.ss-icon-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 12px;
  background: transparent;
  color: var(--ss-muted);
}

.ss-icon-button:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-icon-button:active {
  transform: scale(.92);
}

.ss-compact-button,
.ss-primary-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 15px;
  border-radius: 99px;
  font-size: 12.5px;
  font-weight: 600;
}

.ss-compact-button {
  border: 1px solid var(--ss-hairline);
  background: var(--ss-surface);
  color: var(--ss-text);
}

.ss-compact-button:hover {
  border-color: var(--ss-hairline-strong);
  background: var(--ss-surface-2);
  transform: translateY(-1px);
}

.ss-primary-button {
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 113, 227, .28);
}

.ss-primary-button:hover {
  background: var(--ss-brand-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 113, 227, .34);
}

.ss-ui-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.ss-nav-icon {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

/* ============ 工作区 ============ */
.ss-workspace {
  --lib-w: 264px;
  --right-w: 348px;
  display: flex;
  align-items: stretch;
  min-height: 0;
  min-width: 0;
}

/* ============ 导航栏 ============ */
.ss-rail {
  display: flex;
  min-height: 0;
  flex: 0 0 66px;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  margin-right: 14px;
  padding: 14px 9px;
  border-radius: var(--ss-r-card);
  background: var(--ss-dark);
  color: #98989D;
  box-shadow: var(--ss-shadow);
}

.ss-rail-button {
  position: relative;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 15px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: color 170ms var(--ss-ease), background-color 170ms var(--ss-ease), transform 170ms var(--ss-ease), box-shadow 170ms var(--ss-ease);
}

.ss-rail-button:hover {
  background: rgba(255, 255, 255, .09);
  color: #F5F5F7;
  transform: translateY(-1px);
}

.ss-rail-button.active {
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 5px 14px rgba(0, 113, 227, .4);
}

.ss-rail-spacer {
  flex: 1;
}

/* ============ 项目库 ============ */
.ss-library {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 0 0 var(--lib-w);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow);
}

.ss-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 0 10px 0 18px;
}

.ss-panel-heading h2 {
  margin: 0;
  color: var(--ss-ink);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -.02em;
}

.ss-project-switcher {
  margin: 0 12px 14px;
  padding: 14px;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface-2);
}

.ss-project-switcher-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ss-project-cover {
  display: grid;
  width: 38px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px 12px 12px 5px;
  background: var(--ss-dark);
  color: #fff;
  font: 700 13px var(--ss-writing);
  box-shadow: 0 4px 10px rgba(29, 29, 31, .2);
}

.ss-project-meta {
  min-width: 0;
  flex: 1;
}

.ss-project-meta strong,
.ss-project-meta span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-project-meta strong {
  color: var(--ss-ink);
  font-size: 13px;
  font-weight: 700;
}

.ss-project-meta span {
  margin-top: 3px;
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-progress-line {
  height: 6px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--ss-hairline);
}

.ss-progress-line span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ss-brand), #0A84FF);
  transition: width 500ms var(--ss-ease);
}

.ss-library-content {
  min-height: 0;
  overflow: auto;
  padding: 0 10px 14px;
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 10px;
  color: var(--ss-muted);
  font: 600 10px/1 var(--ss-sans);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.ss-tree-row,
.ss-library-row {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ss-text);
  cursor: pointer;
  text-align: left;
  transition: background-color 150ms var(--ss-ease), color 150ms var(--ss-ease), transform 150ms var(--ss-ease);
}

.ss-tree-row:hover,
.ss-library-row:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
  transform: translateX(2px);
}

.ss-tree-row.active,
.ss-library-row.active {
  background: var(--ss-brand-soft);
  color: var(--ss-brand-deep);
  font-weight: 600;
}

.ss-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-meta {
  color: var(--ss-faint);
  font: 500 10.5px/1 var(--ss-mono);
  white-space: nowrap;
}

.ss-tree-indent {
  padding-left: 28px;
}

.ss-library-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-top: 1px solid var(--ss-hairline);
  background: var(--ss-surface-2);
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ss-green);
  box-shadow: 0 0 0 3px var(--ss-green-soft);
}

/* ============ 编辑器 ============ */
.ss-stage {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow);
}

.ss-editor-toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ss-hairline);
  background: var(--ss-surface);
}

.ss-breadcrumb {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--ss-muted);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-breadcrumb strong {
  color: var(--ss-text);
  font-weight: 600;
}

.ss-editor-scroll {
  min-height: 0;
  overflow: auto;
  padding: 24px 18px 40px;
  background: var(--ss-bg-2);
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-writing-sheet {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 280px);
  margin: 0 auto;
  padding: 54px clamp(32px, 5vw, 68px) 84px;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-lg);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow-paper);
}

.ss-writing-sheet::before {
  content: "";
  position: absolute;
  top: 0;
  right: 18%;
  left: 18%;
  height: 3px;
  border-radius: 0 0 6px 6px;
  background: linear-gradient(90deg, var(--ss-brand), #0A84FF);
}

.ss-document-kicker {
  color: var(--ss-brand);
  font: 600 10.5px/1 var(--ss-mono);
  letter-spacing: .14em;
  text-transform: uppercase;
}

.ss-document-title {
  margin: 14px 0 8px;
  color: var(--ss-ink);
  font: 800 30px/1.22 var(--ss-sans);
  letter-spacing: -.03em;
}

.ss-document-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--ss-hairline);
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-document-meta span:first-child {
  color: var(--ss-brand-deep);
  font-weight: 700;
  padding: 4px 11px;
  border-radius: 99px;
  background: var(--ss-brand-soft);
}

.ss-editor-body {
  margin-top: 30px;
  color: #2B2B2E;
  font: 17px/2.1 var(--ss-writing);
  min-height: 500px;
}

.ss-stage-footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  min-height: 42px;
  border-top: 1px solid var(--ss-hairline);
  background: var(--ss-surface-2);
  color: var(--ss-muted);
  font: 500 10.5px/1 var(--ss-mono);
}

.ss-stage-footer span:last-child {
  margin-left: auto;
}

/* ============ 右侧面板 ============ */
.ss-right-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 0 0 var(--right-w);
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow);
  transition: flex-basis 260ms var(--ss-ease), width 260ms var(--ss-ease), opacity 200ms var(--ss-ease);
}

.ss-workspace.right-closed .ss-right-panel {
  display: none;
}

.ss-right-tabs {
  display: flex;
  align-items: stretch;
  gap: 4px;
  padding: 8px 10px 0;
  background: var(--ss-surface-2);
}

.ss-right-tab {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 36px;
  border-radius: 11px;
  background: transparent;
  color: var(--ss-muted);
  font-size: 12px;
  font-weight: 500;
}

.ss-right-tab:hover {
  color: var(--ss-ink);
  background: rgba(255, 255, 255, .7);
}

.ss-right-tab.active {
  background: var(--ss-surface);
  color: var(--ss-ink);
  font-weight: 700;
  box-shadow: var(--ss-shadow-sm);
}

.ss-right-close {
  width: 34px;
  height: 34px;
  margin-left: 3px;
  border-radius: 11px;
  background: transparent;
  color: var(--ss-muted);
}

.ss-right-close:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-right-view {
  display: grid;
  min-height: 0;
}

.ss-assistant-view {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.ss-operation-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--ss-hairline);
}

.ss-operation-header strong {
  display: block;
  color: var(--ss-ink);
  font-size: 13.5px;
  font-weight: 700;
}

.ss-operation-header div > span {
  display: block;
  margin-top: 5px;
  color: var(--ss-muted);
  font-size: 11px;
  line-height: 1.5;
}

.ss-operation-status {
  color: var(--ss-green) !important;
  font-size: 10.5px !important;
  font-weight: 700;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--ss-green-soft);
}

.ss-assistant-scroll {
  min-height: 0;
  overflow: auto;
  padding: 18px 16px 22px;
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-thinking-surface {
  overflow: hidden;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface-2);
}

.ss-thinking-steps {
  position: relative;
  display: grid;
  gap: 0;
  padding: 6px 14px 12px;
}

.ss-thinking-steps::before {
  content: "";
  position: absolute;
  top: 12px;
  bottom: 22px;
  left: 25px;
  width: 1px;
  background: var(--ss-hairline);
}

.ss-plan-step {
  position: relative;
  display: grid;
  min-height: 36px;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: var(--ss-faint);
  font-size: 11px;
  line-height: 1.45;
}

.ss-plan-step.complete {
  color: var(--ss-muted);
}

.ss-plan-step.active {
  color: var(--ss-ink);
  font-weight: 600;
}

.ss-plan-marker {
  position: relative;
  display: grid;
  width: 14px;
  height: 14px;
  margin: 0 auto;
  place-items: center;
  border: 1px solid var(--ss-hairline-strong);
  border-radius: 50%;
  background: var(--ss-surface);
  color: #fff;
  z-index: 1;
}

.ss-plan-marker .ss-ui-icon {
  width: 9px;
  height: 9px;
  stroke-width: 2.6;
}

.ss-plan-step.complete .ss-plan-marker {
  border-color: var(--ss-green);
  background: var(--ss-green);
}

.ss-plan-step.active .ss-plan-marker {
  border-color: var(--ss-brand);
  background: var(--ss-brand);
  box-shadow: 0 0 0 4px var(--ss-brand-soft);
}

.ss-plan-step em {
  color: var(--ss-brand);
  font-size: 9.5px;
  font-style: normal;
  font-weight: 700;
}

.ss-generation-result {
  margin-top: 16px;
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow-sm);
}

.ss-result-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  color: var(--ss-brand-deep);
  font-size: 11.5px;
  font-weight: 700;
}

.ss-result-heading span:last-child {
  color: var(--ss-green);
  font-size: 10px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 99px;
  background: var(--ss-green-soft);
}

.ss-result-content {
  position: relative;
  margin: 0 14px;
  padding: 12px 14px 12px 21px;
  border-radius: 12px;
  background: var(--ss-brand-soft);
  color: var(--ss-text);
  font: 13px/1.85 var(--ss-writing);
}

.ss-result-content::before {
  content: "";
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 12px;
  width: 3px;
  border-radius: 99px;
  background: var(--ss-brand);
}

.ss-result-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 12px 14px 14px;
}

.ss-result-actions button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid var(--ss-hairline);
  border-radius: 99px;
  background: var(--ss-surface);
  color: var(--ss-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 170ms var(--ss-ease);
}

.ss-result-actions button:hover {
  border-color: var(--ss-hairline-strong);
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-result-actions .ss-accept {
  grid-column: 1 / -1;
  min-height: 34px;
  border-color: transparent;
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 113, 227, .26);
  font-weight: 600;
}

.ss-result-actions .ss-accept:hover {
  background: var(--ss-brand-hover);
}

.ss-prompt-composer {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--ss-hairline);
  background: var(--ss-surface-2);
}

.ss-prompt-context {
  display: flex;
  gap: 9px;
  margin: 0 3px 8px;
  color: var(--ss-muted);
  font-size: 10px;
}

.ss-prompt-context span {
  padding: 3px 9px;
  border-radius: 99px;
  background: var(--ss-surface);
}

.ss-prompt-box {
  padding: 10px 10px 8px 14px;
  border: 1px solid var(--ss-hairline-strong);
  border-radius: var(--ss-r-md);
  background: var(--ss-surface);
  box-shadow: var(--ss-shadow-sm);
}

.ss-prompt-box textarea {
  display: block;
  width: 100%;
  height: 40px;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ss-text);
  font-size: 12px;
  line-height: 1.55;
  font-family: inherit;
}

.ss-prompt-box textarea::placeholder {
  color: var(--ss-faint);
}

.ss-prompt-footer {
  display: flex;
  align-items: center;
  gap: 3px;
}

.ss-prompt-tool,
.ss-prompt-model {
  height: 28px;
  border-radius: 9px;
  background: transparent;
  color: var(--ss-muted);
  font-size: 11px;
}

.ss-prompt-tool {
  width: 28px;
}

.ss-prompt-model {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
}

.ss-prompt-tool:hover,
.ss-prompt-model:hover {
  background: var(--ss-bg-2);
  color: var(--ss-ink);
}

.ss-send-button {
  display: grid;
  width: 32px;
  height: 32px;
  margin-left: auto;
  place-items: center;
  border-radius: 12px;
  background: var(--ss-brand);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 113, 227, .28);
}

.ss-send-button:hover {
  background: var(--ss-brand-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 113, 227, .34);
}

/* 本集资料视图 */
.ss-context-view,
.ss-files-view {
  overflow: auto;
  padding: 8px 16px 26px;
  scrollbar-width: thin;
  scrollbar-color: var(--ss-hairline-strong) transparent;
}

.ss-context-section {
  padding: 16px 0 18px;
  border-bottom: 1px solid var(--ss-hairline);
}

.ss-context-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
  color: var(--ss-ink);
  font-size: 12px;
  font-weight: 700;
}

.ss-context-title span {
  color: var(--ss-muted);
  font: 500 10px/1 var(--ss-mono);
}

.ss-character-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
}

.ss-avatar {
  display: inline-grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  background: var(--ss-brand-soft);
  color: var(--ss-brand-deep);
  font: 700 11px var(--ss-writing);
}

.ss-character-row strong,
.ss-character-row span {
  display: block;
}

.ss-character-row strong {
  color: var(--ss-text);
  font-size: 11.5px;
}

.ss-character-row span {
  margin-top: 3px;
  color: var(--ss-muted);
  font-size: 10px;
}

/* 文件视图 */
.ss-files-root {
  margin: 10px 0 14px;
  padding: 10px 12px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--ss-bg-2);
  color: var(--ss-muted);
  font: 400 10px/1.5 var(--ss-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-file-row {
  min-height: 32px;
  padding: 8px 11px;
  border-radius: 11px;
  color: var(--ss-text);
  font-size: 11px;
  cursor: pointer;
}

.ss-file-row:hover {
  background: var(--ss-brand-soft);
  color: var(--ss-brand-deep);
}

.ss-file-indent-1 {
  padding-left: 27px;
}

/* ============ 对话框 ============ */
.ss-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.ss-dialog {
  width: 90%;
  max-width: 440px;
  background: var(--ss-surface);
  border: 1px solid var(--ss-hairline);
  border-radius: var(--ss-r-card);
  box-shadow: var(--ss-shadow-float);
  animation: ss-dialog-in 200ms var(--ss-ease);
}

@keyframes ss-dialog-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.ss-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--ss-hairline);
}

.ss-dialog-header h3 {
  margin: 0;
  color: var(--ss-ink);
  font-size: 16px;
  font-weight: 700;
}

.ss-dialog-body {
  padding: 20px;
}

.ss-dialog-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ss-hairline-strong);
  border-radius: var(--ss-r-sm);
  background: var(--ss-surface-2);
  color: var(--ss-ink);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 170ms var(--ss-ease), background-color 170ms var(--ss-ease);
}

.ss-dialog-input:focus {
  border-color: var(--ss-brand);
  background: var(--ss-surface);
}

.ss-dialog-input::placeholder {
  color: var(--ss-faint);
}

.ss-dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--ss-hairline);
}

.ss-section-action {
  border: 0;
  background: transparent;
  color: var(--ss-brand);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  transition: color 170ms var(--ss-ease), background-color 170ms var(--ss-ease);
}

.ss-section-action:hover {
  color: var(--ss-brand-hover);
  background: var(--ss-brand-soft);
  border-radius: 6px;
}
`
