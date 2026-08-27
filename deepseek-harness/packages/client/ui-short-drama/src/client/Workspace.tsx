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
  IconChevronDownOutline14, IconNewChatOutline16, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  ArrowLeft, ChevronDown, ChevronRight, File, FileJson, FileText,
  Folder, FolderOpen, ScrollText,
} from 'lucide-react'
import { Editor } from './Editor.tsx'
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

interface OpenFile {
  path: string
  name: string
  content: string
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
  const [openFile, setOpenFile] = useState<OpenFile | null>(null)
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT)
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT)
  const leftDragBase = useRef(LEFT_DEFAULT)
  const rightDragBase = useRef(RIGHT_DEFAULT)

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
    setPreview(false)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/desktop/projects/file?path=' + encodeURIComponent(path))
      if (res.status === 404) {
        setOpenFile({ path, name, content: '' })
        setDraft('')
        setDirty(false)
        return
      }
      if (!res.ok) throw new Error('read ' + res.status)
      const body = await res.json() as { content: string }
      setOpenFile({ path, name, content: body.content })
      setDraft(body.content)
      setDirty(false)
    } catch (e) {
      setSaveStatus('打开失败：' + String(e instanceof Error ? e.message : e))
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

  const onSave = async () => {
    if (openFile === null || saving) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/desktop/projects/file', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: openFile.path, content: draft }),
      })
      if (!res.ok) throw new Error('save ' + res.status)
      setOpenFile({ ...openFile, content: draft })
      setDirty(false)
      setSaveStatus('已保存')
      void reloadStructure()
    } catch (e) {
      setSaveStatus('保存失败：' + String(e instanceof Error ? e.message : e))
    } finally {
      setSaving(false)
    }
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
    const isSelected = node.kind === 'file' && openFile?.path === node.path
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
          <span className={css.paneTitle}>{openFile === null ? '文档编辑器' : openFile.name}</span>
          {openFile !== null && (
            <div className={css.editorHeaderActions}>
              <button className={css.toggleButton} type="button" onClick={() => setPreview(value => !value)}>
                {preview ? '编辑' : '预览'}
              </button>
              <button className={css.saveButton} type="button" onClick={() => void onSave()} disabled={saving}>
                {saving ? '保存中…' : dirty ? '保存 *' : '保存'}
              </button>
            </div>
          )}
        </div>
        {openFile === null ? (
          <div className={css.editorPlaceholder}>点击左侧文件打开，或展开目录查看内容</div>
        ) : preview ? (
          <div className={css.previewContainer}><MarkdownText text={draft} /></div>
        ) : (
          <Editor key={openFile.path} initialDoc={draft} mode={openFile.path.includes('/剧本/') || /episode-\d+\.md$/.test(openFile.path) ? 'dlkjb' : 'markdown'} onChange={doc => { setDraft(doc); setDirty(true); setSaveStatus(null) }} />
        )}
        {saveStatus !== null && <div className={css.saveStatus}>{saveStatus}</div>}
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
