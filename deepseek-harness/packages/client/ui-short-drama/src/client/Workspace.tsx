/**
 * Zenwit workspace: three-pane screenplay surface.
 * Left: project navigation, real file tree, and native settings. Center:
 * visual Markdown editing with an opt-in CodeMirror source mode. Right: session
 * controls plus the reused DSH conversation. Both column boundaries resize.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { GlobalStandardProps, PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconChevronDownOutline14, IconNewChatOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  ArrowLeft, ChevronDown, ChevronRight, File, FileJson, FileText,
  Folder, FolderOpen, ScrollText, X,
} from 'lucide-react'
import { Editor, VisualEditor } from './Editor.tsx'
import css from './zenwit.module.css'

/** One real tree node: a directory or file under the project root. */
interface TreeNode {
  name: string
  path: string
  kind: 'file' | 'dir'
  /** Word count for .md files, byte size for others, '' for directories. */
  detail: string
  children?: TreeNode[]
}

interface StructureResponse {
  path: string
  phase: string
  revision: number
  nextEpisode: number
  tree: TreeNode[]
  root: string
}

interface OpenDocument {
  path: string
  name: string
  content: string
  draft: string
  dirty: boolean
  saving: boolean
  saveStatus: string | null
  visualMode: boolean
}

/** One workspace pane props. */
export interface WorkspaceProps {
  projectPath: string
  closeProject: () => Promise<void>
  renderSlot: PropsRenderSlots<'conversation' | 'sidebar'>['renderSlot']
  useSessions: GlobalStandardProps['useSessions']
  useWorkspaces: GlobalStandardProps['useWorkspaces']
  openSession: (id: string) => void
  startSession: (workspaceId: string) => void
}

const LEFT_DEFAULT = 240
const LEFT_MIN = 190
const LEFT_MAX = 360
const RIGHT_DEFAULT = 500
const RIGHT_MIN = 300
const RIGHT_MAX = 520

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

interface ResizeHandleProps {
  label: string
  value: number
  onStart: () => void
  onDrag: (delta: number) => void
}

/** Window-tracked column handle; drag deltas stay based on the gesture origin. */
function ResizeHandle({ label, value, onStart, onDrag }: ResizeHandleProps) {
  const origin = useRef(0)
  const [dragging, setDragging] = useState(false)
  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    origin.current = event.clientX
    onStart()
    setDragging(true)
  }, [onStart])

  useEffect(() => {
    if (!dragging) return
    const onPointerMove = (event: PointerEvent): void => {
      event.preventDefault()
      onDrag(event.clientX - origin.current)
    }
    const onPointerUp = (event: PointerEvent): void => {
      onDrag(event.clientX - origin.current)
      setDragging(false)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [dragging, onDrag])

  return (
    <div
      className={css.resizeHandle}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={Math.round(value)}
      data-dragging={dragging || undefined}
      tabIndex={0}
      onPointerDown={onPointerDown}
    >
      <span className={css.resizeLine} />
    </div>
  )
}

/** Three-pane workspace (see module doc). */
export function Workspace({
  projectPath, closeProject, renderSlot, useSessions, useWorkspaces, openSession, startSession,
}: WorkspaceProps) {
  const sessionsState = useSessions(s => s)
  const currentSessionId = sessionsState.current
  const projectWorkspace = useWorkspaces(s => s.items).find(w => w.path === projectPath)
  const [historyOpen, setHistoryOpen] = useState(false)
  const history = projectWorkspace === undefined
    ? []
    : projectWorkspace.sessionIds
      .map(id => sessionsState.byId[id])
      .filter((s): s is NonNullable<typeof s> => s !== undefined && !s.blank)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  const [structure, setStructure] = useState<StructureResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<OpenDocument[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [pendingClosePath, setPendingClosePath] = useState<string | null>(null)
  const [autoSave, setAutoSave] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT)
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT)
  const leftDragBase = useRef(LEFT_DEFAULT)
  const rightDragBase = useRef(RIGHT_DEFAULT)
  const documentsRef = useRef(documents)
  documentsRef.current = documents
  const activeDocument = documents.find(document => document.path === activePath) ?? null

  const reloadStructure = async (): Promise<StructureResponse | null> => {
    try {
      const res = await fetch('/api/desktop/projects/structure?path=' + encodeURIComponent(projectPath))
      if (!res.ok) throw new Error('structure ' + res.status)
      const data = await res.json() as StructureResponse
      setStructure(data)
      return data
    } catch (e) {
      setLoadError(String(e instanceof Error ? e.message : e))
      return null
    }
  }

  useEffect(() => { void reloadStructure() }, [projectPath])

  // The AI writes screenplay files through the kernel; those changes are not
  // visible to this pane's single on-open fetch. Poll the tree while open so
  // newly written episodes/characters appear without a manual reload. Read-only.
  useEffect(() => {
    const timer = setInterval(() => { void reloadStructure() }, 2000)
    return () => clearInterval(timer)
  }, [projectPath])

  const openFilePath = async (path: string, name: string) => {
    const existing = documentsRef.current.find(document => document.path === path)
    if (existing !== undefined) {
      setActivePath(path)
      return
    }
    try {
      const res = await fetch('/api/desktop/projects/file?path=' + encodeURIComponent(path))
      if (res.status === 404) {
        setDocuments(previous => [...previous, { path, name, content: '', draft: '', dirty: false, saving: false, saveStatus: null, visualMode: true }])
        setActivePath(path)
        return
      }
      if (!res.ok) throw new Error('read ' + res.status)
      const body = await res.json() as { content: string }
      setDocuments(previous => [...previous, { path, name, content: body.content, draft: body.content, dirty: false, saving: false, saveStatus: null, visualMode: true }])
      setActivePath(path)
    } catch (e) {
      setDocuments(previous => previous.map(document => document.path === path ? { ...document, saveStatus: '打开失败：' + String(e instanceof Error ? e.message : e) } : document))
    }
  }

  const onOpenNode = async (node: TreeNode) => {
    if (node.kind === 'dir') {
      setExpanded(prev => {
        const next = new Set(prev)
        if (next.has(node.path)) next.delete(node.path); else next.add(node.path)
        return next
      })
      return
    }
    await openFilePath(node.path, node.name)
  }

  const saveDocument = async (path: string): Promise<boolean> => {
    const file = documentsRef.current.find(document => document.path === path)
    if (file === undefined || file.saving) return false
    const content = file.draft
    setDocuments(previous => previous.map(document => document.path === path ? { ...document, saving: true, saveStatus: null } : document))
    try {
      const res = await fetch('/api/desktop/projects/file', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: file.path, content }),
      })
      if (!res.ok) throw new Error('save ' + res.status)
      setDocuments(previous => previous.map(document => document.path === path
        ? { ...document, content, dirty: document.draft !== content, saving: false, saveStatus: '已保存' }
        : document))
      void reloadStructure()
      return true
    } catch (e) {
      setDocuments(previous => previous.map(document => document.path === path
        ? { ...document, saving: false, saveStatus: '保存失败：' + String(e instanceof Error ? e.message : e) }
        : document))
      return false
    }
  }

  useEffect(() => {
    if (!autoSave) return
    const timers = documents.filter(document => document.dirty && !document.saving).map(document =>
      window.setTimeout(() => { void saveDocument(document.path) }, 800))
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [autoSave, documents])

  const closeDocument = async (path: string, discard = false) => {
    const document = documentsRef.current.find(item => item.path === path)
    if (document === undefined) return
    if (document.dirty && !discard) {
      setPendingClosePath(path)
      return
    }
    const index = documentsRef.current.findIndex(item => item.path === path)
    const remaining = documentsRef.current.filter(item => item.path !== path)
    setDocuments(remaining)
    if (activePath === path) setActivePath(remaining[Math.min(index, remaining.length - 1)]?.path ?? null)
  }

  const confirmSaveAndClose = async () => {
    if (pendingClosePath === null) return
    const path = pendingClosePath
    setPendingClosePath(null)
    if (await saveDocument(path)) await closeDocument(path, true)
  }

  const renderFileIcon = (node: TreeNode): ReactNode => {
    const iconProps = { size: 15, strokeWidth: 1.7, 'aria-hidden': true as const }
    if (/\.json$/i.test(node.name)) return <FileJson {...iconProps} />
    if (node.path.includes('/剧本/') || /episode-\d+\.md$/i.test(node.name)) {
      return <ScrollText {...iconProps} />
    }
    if (/\.(md|mdx)$/i.test(node.name)) return <FileText {...iconProps} />
    return <File {...iconProps} />
  }

  /** Recursive tree render: a folder expands to reveal its real contents. */
  const renderNodes = (nodes: TreeNode[]): ReactNode[] => nodes.map(node => {
    const isOpen = expanded.has(node.path)
    const isSelected = node.kind === 'file' && activePath === node.path
    return (
      <li key={node.path} role="none">
        <button
          type="button"
          role="treeitem"
          aria-expanded={node.kind === 'dir' ? isOpen : undefined}
          aria-current={isSelected ? 'page' : undefined}
          className={
            css.structureNode
            + (node.kind === 'dir' ? ' ' + css.structureDir : ' ' + css.structureFile)
            + (isSelected ? ' ' + css.structureNodeSelected : '')
          }
          title={node.path}
          onClick={() => void onOpenNode(node)}>
          <span className={css.structureChevron} aria-hidden="true">
            {node.kind === 'dir'
              ? isOpen ? <ChevronDown size={13} strokeWidth={2} /> : <ChevronRight size={13} strokeWidth={2} />
              : null}
          </span>
          <span className={css.structureIcon} aria-hidden="true">
            {node.kind === 'dir'
              ? isOpen ? <FolderOpen size={16} strokeWidth={1.7} /> : <Folder size={16} strokeWidth={1.7} />
              : renderFileIcon(node)}
          </span>
          <span className={css.structureLabel}>{node.name}</span>
          {node.detail !== '' && <span className={css.structureDetail}>{node.detail}</span>}
        </button>
        {node.kind === 'dir' && isOpen && node.children !== undefined && (
          <ul className={css.structureChildren} role="group">{renderNodes(node.children)}</ul>
        )}
      </li>
    )
  })

  const resizeLeft = useCallback((delta: number) => {
    setLeftWidth(clamp(leftDragBase.current + delta, LEFT_MIN, LEFT_MAX))
  }, [])
  const resizeRight = useCallback((delta: number) => {
    setRightWidth(clamp(rightDragBase.current - delta, RIGHT_MIN, RIGHT_MAX))
  }, [])

  return (
    <div
      className={css.workspace}
      data-testid="workspace-grid"
      style={{ gridTemplateColumns: `${leftWidth}px 14px minmax(0, 1fr) 14px ${rightWidth}px` }}
    >
      <div className={css.leftRail}>
        <aside className={css.paneStructure} aria-label="文件目录">
          <div className={css.structureHeader}>
            <button className={css.backButton} type="button" onClick={() => void closeProject()}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              <span>项目库</span>
            </button>
            <div className={css.structureTitle} title={structure?.root ?? '项目工作台'}>
              {structure?.root ?? '项目工作台'}
            </div>
          </div>
          {loadError !== null && <div className={css.structureError}>{loadError}</div>}
          <ul className={css.structureList} role="tree" aria-label="项目文件">
            {structure === null ? (
              <li className={css.structureNode}>加载结构…</li>
            ) : renderNodes(structure.tree)}
          </ul>
          <div className={css.paneFooter}>阶段：{structure?.phase ?? '…'} · rev {structure?.revision ?? 0}</div>
        </aside>
        <div className={css.workspaceSettings}>
          {renderSlot('sidebar', {
            collapsed: false,
            width: leftWidth,
            settingsOnly: true,
            settingsOnlyInline: true,
          })}
        </div>
      </div>
      <ResizeHandle
        label="调整文件目录宽度"
        value={leftWidth}
        onStart={() => { leftDragBase.current = leftWidth }}
        onDrag={resizeLeft}
      />
      <section className={css.paneEditor} aria-label="文档编辑器">
        <div className={css.editorHeader}>
          <span className={css.paneTitle}>{activeDocument === null ? '文档编辑器' : activeDocument.name}</span>
          {activeDocument !== null && (
            <div className={css.editorHeaderActions}>
              <button className={css.toggleButton} type="button" onClick={() => setDocuments(previous => previous.map(document => document.path === activeDocument.path ? { ...document, visualMode: !document.visualMode } : document))}>
                {activeDocument.visualMode ? '源码' : '可视化'}
              </button>
              <label className={css.autoSaveToggle} title="自动保存编辑内容">
                <input type="checkbox" checked={autoSave} onChange={event => setAutoSave(event.target.checked)} />
                自动保存
              </label>
              <button className={css.saveButton} type="button" onClick={() => void saveDocument(activeDocument.path)} disabled={activeDocument.saving}>
                {activeDocument.saving ? '保存中…' : activeDocument.dirty ? '保存 *' : '保存'}
              </button>
            </div>
          )}
        </div>
        <div className={css.documentTabs} role="tablist" aria-label="已打开文档">
          {documents.map(document => (
            <div key={document.path} className={css.documentTab + (document.path === activePath ? ' ' + css.documentTabActive : '')}>
              <button type="button" role="tab" aria-selected={document.path === activePath} className={css.documentTabSelect} title={document.path} onClick={() => setActivePath(document.path)}>
                <span className={css.documentTabName}>{document.name}</span>
                {document.dirty && <span className={css.documentTabDirty} aria-label="未保存">*</span>}
              </button>
              <button type="button" className={css.documentTabClose} aria-label={`关闭 ${document.name}`} title="关闭文档" onClick={event => { event.stopPropagation(); void closeDocument(document.path) }}>
                <X size={13} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {activeDocument === null ? (
          <div className={css.editorPlaceholder}>点击左侧文件打开，或展开目录查看内容</div>
        ) : activeDocument.visualMode ? (
          <VisualEditor key={activeDocument.path} initialDoc={activeDocument.draft} onChange={doc => setDocuments(previous => previous.map(document => document.path === activeDocument.path ? { ...document, draft: doc, dirty: true, saveStatus: null } : document))} />
        ) : (
          <Editor key={activeDocument.path} initialDoc={activeDocument.draft} mode={activeDocument.path.includes('/剧本/') || /episode-\d+\.md$/.test(activeDocument.path) ? 'dlkjb' : 'markdown'} onChange={doc => setDocuments(previous => previous.map(document => document.path === activeDocument.path ? { ...document, draft: doc, dirty: true, saveStatus: null } : document))} />
        )}
        {activeDocument?.saveStatus !== null && activeDocument !== null && <div className={css.saveStatus}>{activeDocument.saveStatus}</div>}
        {pendingClosePath !== null && (
          <div className={css.closeDialogOverlay} role="presentation">
            <div className={css.closeDialog} role="dialog" aria-modal="true" aria-labelledby="close-document-title">
              <h2 id="close-document-title">文档尚未保存</h2>
              <p>要保存对「{documents.find(document => document.path === pendingClosePath)?.name ?? ''}」的修改吗？</p>
              <div className={css.closeDialogActions}>
                <button type="button" className={css.closeDialogCancel} onClick={() => setPendingClosePath(null)}>取消</button>
                <button type="button" className={css.closeDialogDiscard} onClick={() => { const path = pendingClosePath; setPendingClosePath(null); void closeDocument(path, true) }}>放弃修改</button>
                <button type="button" className={css.closeDialogSave} onClick={() => void confirmSaveAndClose()}>保存并关闭</button>
              </div>
            </div>
          </div>
        )}
      </section>
      <ResizeHandle
        label="调整对话区域宽度"
        value={rightWidth}
        onStart={() => { rightDragBase.current = rightWidth }}
        onDrag={resizeRight}
      />
      <aside className={css.paneChat} aria-label="对话">
        <div className={css.conversationBar}>
          <button
            className={css.conversationAction}
            type="button"
            disabled={projectWorkspace === undefined}
            onClick={() => {
              if (projectWorkspace === undefined) return
              setHistoryOpen(false)
              startSession(projectWorkspace.workspaceId)
            }}
          >
            <IconNewChatOutline16 size={15} />
            <span>新建对话</span>
          </button>
          <button
            className={css.conversationAction}
            type="button"
            aria-expanded={historyOpen}
            onClick={() => { setHistoryOpen(open => !open) }}
          >
            <span>历史对话（{history.length}）</span>
            <IconChevronDownOutline14 className={historyOpen ? css.historyChevronOpen : undefined} />
          </button>
        </div>
        {historyOpen && (
          <div className={css.historyPopover}>
            {history.length === 0 ? (
              <div className={css.historyEmpty}>暂无历史对话</div>
            ) : (
              <ul className={css.historyList}>
                {history.map(session => (
                  <li key={session.id}>
                    <button
                      className={css.historyItem + (session.id === currentSessionId ? ' ' + css.historyItemActive : '')}
                      type="button"
                      aria-label={`打开历史对话：${session.displayTitle}`}
                      onClick={() => {
                        setHistoryOpen(false)
                        openSession(session.id)
                      }}
                    >
                      <span className={css.historyItemTitle}>{session.displayTitle}</span>
                      <span className={css.historyItemTime}>{new Date(session.updatedAt).toLocaleString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {renderSlot('conversation', {})}
      </aside>
    </div>
  )
}
