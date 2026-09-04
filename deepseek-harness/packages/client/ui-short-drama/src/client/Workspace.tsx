/**
 * Zenwit workspace: three-pane project surface.
 * Left: project navigation, real file tree, and native settings. Center:
 * visual Markdown editing with an opt-in CodeMirror source mode. Right: session
 * controls plus the reused DSH conversation. Both column boundaries resize.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import type { GlobalStandardProps, PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { IconNewChatOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  ArrowLeft, ChevronDown, ChevronRight, File, FileJson, FileText,
  Folder, FolderOpen, History, X, FilePlus, FolderPlus, RefreshCw, ChevronsDownUp,
  Copy, Pencil, Trash2, MessageSquare, Code2, Eye, Save,
  FolderSearch, MoreHorizontal, Terminal,
} from 'lucide-react'
import { Editor, VisualEditor, type DocumentSelection } from './Editor.tsx'
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
  tree: TreeNode[]
  root: string
  agentId?: string
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

interface PersistedDocumentTabs {
  activePath: string | null
  documents: Array<Pick<OpenDocument, 'path' | 'name' | 'visualMode'>>
}

interface NodeDialogState {
  mode: 'file' | 'directory' | 'rename'
  targetPath: string
  initialName: string
}

interface ContextMenuState {
  node: TreeNode | null
  x: number
  y: number
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
  addSelectionToConversation: (target: 'current' | 'new', context: string) => Promise<void>
}

const LEFT_DEFAULT = 240
const LEFT_MIN = 190
const LEFT_MAX = 360
const RIGHT_DEFAULT = 500
const RIGHT_MIN = 300
const RIGHT_MAX = 520
const DOCUMENT_TABS_STORAGE_PREFIX = 'zenwit.document-tabs.'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function nodePath(parent: string, name: string): string {
  const separator = parent.includes('\\') && !parent.includes('/') ? '\\' : '/'
  return parent.replace(/[/\\]$/u, '') + separator + name
}

function nodeBasename(path: string): string {
  return path.split(/[/\\]/u).pop() ?? ''
}

function descendantSuffix(path: string, parent: string): string | null {
  if (path === parent) return ''
  return path.startsWith(parent + '/') || path.startsWith(parent + '\\')
    ? path.slice(parent.length)
    : null
}

/** Accept only a file lexically below the active project root. */
function isProjectFilePath(path: string, projectPath: string): boolean {
  const normalizedPath = path.replaceAll('\\', '/')
  const normalizedProject = projectPath.replace(/[\\/]+$/u, '').replaceAll('\\', '/')
  if (normalizedPath === normalizedProject || !normalizedPath.startsWith(normalizedProject + '/')) return false
  return normalizedPath.slice(normalizedProject.length + 1).split('/').every(segment => segment !== '..')
}

function readPersistedTabs(projectPath: string): PersistedDocumentTabs | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DOCUMENT_TABS_STORAGE_PREFIX + projectPath) ?? 'null') as Partial<PersistedDocumentTabs> | null
    if (parsed === null || !Array.isArray(parsed.documents)) return null
    const documents = parsed.documents.filter((item): item is PersistedDocumentTabs['documents'][number] =>
      typeof item?.path === 'string' && typeof item.name === 'string' && typeof item.visualMode === 'boolean')
    const activePath = typeof parsed.activePath === 'string' && documents.some(item => item.path === parsed.activePath) ? parsed.activePath : documents[0]?.path ?? null
    return { activePath, documents }
  } catch {
    return null
  }
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
  addSelectionToConversation,
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
  const tabsRestoredRef = useRef(false)
  documentsRef.current = documents
  const activeDocument = documents.find(document => document.path === activePath) ?? null
  const agentLabel = structure?.agentId === 'short-drama'
    ? '短剧创作'
    : structure?.agentId ?? '未绑定 Agent'
  const [selection, setSelection] = useState<(DocumentSelection & { path: string }) | null>(null)
  const [selectionBusy, setSelectionBusy] = useState(false)
  const [nodeDialog, setNodeDialog] = useState<NodeDialogState | null>(null)
  const [nodeName, setNodeName] = useState('')
  const [nodeBusy, setNodeBusy] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const importPickerRef = useRef<HTMLInputElement | null>(null)
  const importTargetRef = useRef(projectPath)
  const selectionPopoverRef = useRef<HTMLDivElement>(null)
  const conversationControlRef = useRef<HTMLDivElement>(null)
  const historyPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('scroll', close, true) }
  }, [])

  const reloadStructure = async (): Promise<StructureResponse | null> => {
    try {
      const res = await fetch('/api/desktop/projects/structure?path=' + encodeURIComponent(projectPath))
      if (!res.ok) throw new Error('structure ' + res.status)
      const data = await res.json() as StructureResponse
      setStructure(data)
      setLoadError(null)
      return data
    } catch (e) {
      setLoadError(String(e instanceof Error ? e.message : e))
      return null
    }
  }

  useEffect(() => { void reloadStructure() }, [projectPath])

  useEffect(() => {
    if (selection?.path !== activePath) setSelection(null)
  }, [activePath, selection?.path])

  useEffect(() => {
    if (selection === null) return
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      if (selectionPopoverRef.current?.contains(event.target as Node)) return
      setSelection(null)
    }
    window.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [selection])

  useEffect(() => {
    if (!historyOpen) return
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target as Node
      if (conversationControlRef.current?.contains(target) || historyPopoverRef.current?.contains(target)) return
      setHistoryOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setHistoryOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsidePointer)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [historyOpen])

  const selectionContext = selection === null || activeDocument === null ? '' : [
    `文件：${selection.path}`,
    `范围：第 ${selection.startLine}-${selection.endLine} 行`,
    '选中内容：',
    '---',
    selection.text,
    '---',
  ].join('\n')

  const submitSelection = async (target: 'current' | 'new'): Promise<void> => {
    if (selection === null || selectionBusy) return
    setSelectionBusy(true)
    try {
      await addSelectionToConversation(target, selectionContext)
      setSelection(null)
    } finally {
      setSelectionBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const persisted = readPersistedTabs(projectPath)
    if (persisted === null || persisted.documents.length === 0) {
      tabsRestoredRef.current = true
      return
    }
    void Promise.all(persisted.documents.map(async (item): Promise<OpenDocument | null> => {
      try {
        const response = await fetch('/api/desktop/projects/file?path=' + encodeURIComponent(item.path))
        if (!response.ok) return null
        const body = await response.json() as { content?: unknown }
        if (typeof body.content !== 'string') return null
        return { ...item, content: body.content, draft: body.content, dirty: false, saving: false, saveStatus: null }
      } catch {
        return null
      }
    })).then(restored => {
      if (cancelled) return
      const valid = restored.filter((document): document is OpenDocument => document !== null)
      setDocuments(current => {
        const currentPaths = new Set(current.map(document => document.path))
        return [...valid.filter(document => !currentPaths.has(document.path)), ...current]
      })
      setActivePath(current => current ?? (valid.some(document => document.path === persisted.activePath) ? persisted.activePath : valid[0]?.path ?? null))
      tabsRestoredRef.current = true
      if (valid.length === 0) window.localStorage.removeItem(DOCUMENT_TABS_STORAGE_PREFIX + projectPath)
    })
    return () => { cancelled = true }
  }, [projectPath])

  useEffect(() => {
    if (!tabsRestoredRef.current) return
    const key = DOCUMENT_TABS_STORAGE_PREFIX + projectPath
    if (documents.length === 0) {
      window.localStorage.removeItem(key)
      return
    }
    const persisted: PersistedDocumentTabs = {
      activePath,
      documents: documents.map(({ path, name, visualMode }) => ({ path, name, visualMode })),
    }
    window.localStorage.setItem(key, JSON.stringify(persisted))
  }, [activePath, documents, projectPath])

  // Agent file writes are not visible to this pane's single on-open fetch.
  // Poll while open so newly written project files appear without a manual reload.
  useEffect(() => {
    const timer = setInterval(() => { void reloadStructure() }, 2000)
    return () => clearInterval(timer)
  }, [projectPath])

  const openFilePath = useCallback(async (path: string, name: string): Promise<boolean> => {
    const existing = documentsRef.current.find(document => document.path === path)
    if (existing !== undefined) {
      setActivePath(path)
      return true
    }
    try {
      const res = await fetch('/api/desktop/projects/file?path=' + encodeURIComponent(path))
      if (res.status === 404) {
        setDocuments(previous => [...previous, { path, name, content: '', draft: '', dirty: false, saving: false, saveStatus: null, visualMode: true }])
        setActivePath(path)
        return true
      }
      if (!res.ok) throw new Error('read ' + res.status)
      const body = await res.json() as { content: string }
      setDocuments(previous => [...previous, { path, name, content: body.content, draft: body.content, dirty: false, saving: false, saveStatus: null, visualMode: true }])
      setActivePath(path)
      return true
    } catch (e) {
      setDocuments(previous => previous.map(document => document.path === path ? { ...document, saveStatus: '打开失败：' + String(e instanceof Error ? e.message : e) } : document))
      return false
    }
  }, [])

  const openFileInWorkspace = useCallback(async (path: string): Promise<boolean> => {
    if (!isProjectFilePath(path, projectPath)) return false
    return openFilePath(path, nodeBasename(path))
  }, [openFilePath, projectPath])

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

  const openNodeDialog = (mode: NodeDialogState['mode'], targetPath: string, initialName = '') => {
    setContextMenu(null)
    setNodeName(initialName)
    setNodeDialog({ mode, targetPath, initialName })
  }

  const nodeRequest = async (method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>): Promise<{ path?: string }> => {
    const response = await fetch('/api/desktop/projects/node', {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({})) as { path?: string, error?: string }
    if (!response.ok) throw new Error(payload.error ?? `操作失败（${response.status}）`)
    return payload
  }

  const submitNodeDialog = async () => {
    if (nodeDialog === null || nodeName.trim() === '' || nodeBusy) return
    setNodeBusy(true)
    setLoadError(null)
    try {
      if (nodeDialog.mode === 'rename') {
        const oldPath = nodeDialog.targetPath
        const result = await nodeRequest('PATCH', { path: oldPath, newName: nodeName.trim() })
        const nextPath = result.path ?? oldPath
        setDocuments(previous => previous.map(document => {
          const suffix = descendantSuffix(document.path, oldPath)
          if (suffix === null) return document
          return { ...document, path: nextPath + suffix, ...(suffix === '' ? { name: nodeName.trim() } : {}) }
        }))
        setActivePath(current => {
          if (current === null) return null
          const suffix = descendantSuffix(current, oldPath)
          return suffix === null ? current : nextPath + suffix
        })
      } else {
        await nodeRequest('POST', { path: nodePath(nodeDialog.targetPath, nodeName.trim()), kind: nodeDialog.mode })
      }
      setNodeDialog(null)
      setNodeName('')
      await reloadStructure()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally { setNodeBusy(false) }
  }

  const deleteNode = async (node: TreeNode) => {
    setContextMenu(null)
    const label = node.kind === 'dir' ? '文件夹及其全部内容' : '文件'
    if (!window.confirm(`确定删除${label}“${node.name}”？此操作不可撤销。`)) return
    try {
      await nodeRequest('DELETE', { path: node.path })
      const remaining = documentsRef.current.filter(document => descendantSuffix(document.path, node.path) === null)
      setDocuments(remaining)
      setActivePath(current => current !== null && descendantSuffix(current, node.path) !== null ? remaining[0]?.path ?? null : current)
      await reloadStructure()
    } catch (error) { setLoadError(error instanceof Error ? error.message : String(error)) }
  }

  const copyNodePath = async (path: string) => {
    setContextMenu(null)
    try { await navigator.clipboard.writeText(path) } catch { setLoadError('复制路径失败') }
  }

  const addNodeToChat = async (node: TreeNode) => {
    setContextMenu(null)
    if (node.kind !== 'file') return
    try {
      const response = await fetch('/api/desktop/projects/file?path=' + encodeURIComponent(node.path))
      if (!response.ok) throw new Error('读取文件失败')
      const body = await response.json() as { content: string }
      await addSelectionToConversation('current', `文件：${node.path}\n\n${body.content}`)
    } catch (error) { setLoadError(error instanceof Error ? error.message : String(error)) }
  }

  const openImportPicker = (targetPath: string): void => {
    setContextMenu(null)
    importTargetRef.current = targetPath
    importPickerRef.current?.click()
  }

  const importFiles = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    setLoadError(null)
    let imported = false
    try {
      for (const file of files) {
        const query = new URLSearchParams({
          projectPath,
          destinationPath: importTargetRef.current,
          name: file.name,
        })
        const response = await fetch('/api/desktop/projects/import?' + query.toString(), {
          method: 'POST',
          body: file,
        })
        const payload = await response.json().catch(() => ({})) as { error?: string }
        if (!response.ok) {
          if (response.status === 409) throw new Error(`同名文件已存在：${file.name}`)
          if (response.status === 413) throw new Error(`文件不能超过 100 MiB：${file.name}`)
          throw new Error(payload.error ?? `${file.name}：导入失败（${response.status}）`)
        }
        imported = true
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      if (imported) await reloadStructure()
    }
  }

  const nativeProjectAction = async (action: 'reveal' | 'terminal', path: string) => {
    setContextMenu(null)
    try {
      const response = await fetch(`/api/desktop/projects/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? `${action === 'reveal' ? '打开 Finder' : '打开终端'}失败`)
    } catch (error) { setLoadError(error instanceof Error ? error.message : String(error)) }
  }

  const parentPath = (path: string): string => path.replace(/[/\\][^/\\]*$/u, '') || projectPath

  const openProjectMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    setContextMenu({ node: null, x: Math.max(8, rect.right - 184), y: rect.bottom + 6 })
  }

  const renderFileIcon = (node: TreeNode): ReactNode => {
    const iconProps = { size: 15, strokeWidth: 1.7, 'aria-hidden': true as const }
    if (/\.json$/i.test(node.name)) return <FileJson {...iconProps} />
    if (/\.(md|mdx)$/i.test(node.name)) return <FileText {...iconProps} />
    return <File {...iconProps} />
  }

  /** Recursive tree render: a folder expands to reveal its real contents. */
  const renderNodes = (nodes: TreeNode[]): ReactNode[] => nodes.map(node => {
    const isOpen = expanded.has(node.path)
    const isSelected = node.kind === 'file' && activePath === node.path
    const isDirty = node.kind === 'file' && documents.some(document => document.path === node.path && document.dirty)
    const detail = node.kind === 'dir'
      ? node.children !== undefined && node.children.length > 0 ? `${node.children.length} 项` : ''
      : node.detail === '0 B' ? '空白' : node.detail
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
          onClick={() => void onOpenNode(node)}
          onContextMenu={event => { event.preventDefault(); event.stopPropagation(); setContextMenu({ node, x: event.clientX, y: event.clientY }) }}>
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
          {isDirty && <span className={css.structureDirty} title="有未保存的修改" aria-label="有未保存的修改" />}
          {detail !== '' && <span className={css.structureDetail} aria-hidden="true">{detail}</span>}
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
            <div className={css.structureNavRow}>
              <button className={css.backButton} type="button" onClick={() => void closeProject()}>
                <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
                <span>项目库</span>
              </button>
            </div>
            <div
              className={css.structureIdentity}
              title={structure?.root ?? '项目工作台'}
              onContextMenu={event => { event.preventDefault(); setContextMenu({ node: null, x: event.clientX, y: event.clientY }) }}
            >
              <span className={css.structureProjectIcon} aria-hidden="true"><FolderOpen size={17} strokeWidth={1.7} /></span>
              <span className={css.structureIdentityText}>
                <span className={css.structureEyebrow}>当前项目</span>
                <strong className={css.structureTitle}>{structure?.root ?? '项目工作台'}</strong>
              </span>
            </div>
          </div>
          <div className={css.structureSectionBar}>
            <span className={css.structureSectionTitle}>项目文件</span>
            <div className={css.structureToolbar}>
              <button type="button" title="新建文件" aria-label="新建文件" onClick={() => openNodeDialog('file', projectPath)}><FilePlus size={15} /></button>
              <button type="button" title="项目操作" aria-label="项目操作" aria-haspopup="menu" aria-expanded={contextMenu?.node === null} onClick={openProjectMenu}><MoreHorizontal size={16} /></button>
            </div>
          </div>
          <input ref={importPickerRef} type="file" multiple hidden onChange={event => { void importFiles(event) }} />
          {loadError !== null && (
            <div className={css.structureError} role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={() => void reloadStructure()}>重试</button>
            </div>
          )}
          <ul className={css.structureList} role="tree" aria-label="项目文件" aria-busy={structure === null} onContextMenu={event => { if (event.target === event.currentTarget) { event.preventDefault(); setContextMenu({ node: null, x: event.clientX, y: event.clientY }) } }}>
            {structure === null ? (
              <li className={css.structureLoading} aria-label="正在加载项目文件">
                <span /><span /><span />
              </li>
            ) : structure.tree.length === 0 ? (
              <li className={css.structureEmpty} role="none">
                <FileText size={20} strokeWidth={1.5} aria-hidden="true" />
                <strong>还没有文件</strong>
                <button type="button" onClick={() => openNodeDialog('file', projectPath)}>新建第一个文件</button>
              </li>
            ) : renderNodes(structure.tree)}
          </ul>
          <div className={css.paneFooter}>
            <span className={css.agentStatusDot} data-active={structure?.agentId !== undefined || undefined} aria-hidden="true" />
            <span className={css.agentStatusLabel}>Agent</span>
            <strong>{agentLabel}</strong>
          </div>
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
      {contextMenu !== null && (
        <div className={css.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} role="menu" onPointerDown={event => event.stopPropagation()}>
          <button type="button" role="menuitem" onClick={() => openImportPicker(contextMenu.node?.kind === 'dir' ? contextMenu.node.path : contextMenu.node === null ? projectPath : parentPath(contextMenu.node.path))}><FilePlus size={14} />导入文档</button>
          <button type="button" role="menuitem" onClick={() => openNodeDialog('file', contextMenu.node?.kind === 'dir' ? contextMenu.node.path : projectPath)}><FilePlus size={14} />新建文件</button>
          <button type="button" role="menuitem" onClick={() => openNodeDialog('directory', contextMenu.node?.kind === 'dir' ? contextMenu.node.path : projectPath)}><FolderPlus size={14} />新建文件夹</button>
          {contextMenu.node !== null && <>
            {contextMenu.node.kind === 'file' && <button type="button" role="menuitem" onClick={() => { setContextMenu(null); void onOpenNode(contextMenu.node as TreeNode) }}><FileText size={14} />打开</button>}
            {contextMenu.node.kind === 'dir' && <button type="button" role="menuitem" onClick={() => { setContextMenu(null); void onOpenNode(contextMenu.node as TreeNode) }}><FolderOpen size={14} />展开/折叠</button>}
            <button type="button" role="menuitem" onClick={() => openNodeDialog('rename', contextMenu.node!.path, nodeBasename(contextMenu.node!.path))}><Pencil size={14} />重命名</button>
            <button type="button" role="menuitem" onClick={() => void deleteNode(contextMenu.node as TreeNode)}><Trash2 size={14} />删除</button>
            <button type="button" role="menuitem" onClick={() => void copyNodePath(contextMenu.node!.path)}><Copy size={14} />复制路径</button>
            <button type="button" role="menuitem" onClick={() => void nativeProjectAction('reveal', contextMenu.node!.path)}><FolderSearch size={14} />在 Finder 中显示</button>
            <button type="button" role="menuitem" onClick={() => void nativeProjectAction('terminal', contextMenu.node!.kind === 'dir' ? contextMenu.node!.path : parentPath(contextMenu.node!.path))}><Terminal size={14} />在终端中打开</button>
            {contextMenu.node.kind === 'file' && <button type="button" role="menuitem" onClick={() => void addNodeToChat(contextMenu.node as TreeNode)}><MessageSquare size={14} />添加到聊天</button>}
          </>}
          {contextMenu.node === null && <button type="button" role="menuitem" onClick={() => void nativeProjectAction('reveal', projectPath)}><FolderSearch size={14} />在 Finder 中显示</button>}
          {contextMenu.node === null && <button type="button" role="menuitem" onClick={() => { setContextMenu(null); setExpanded(new Set()) }}><ChevronsDownUp size={14} />全部折叠</button>}
          <button type="button" role="menuitem" onClick={() => { setContextMenu(null); void reloadStructure() }}><RefreshCw size={14} />刷新</button>
        </div>
      )}
      {nodeDialog !== null && (
        <div className={css.nodeDialogOverlay} role="presentation" onClick={() => { if (!nodeBusy) setNodeDialog(null) }}>
          <form className={css.nodeDialog} role="dialog" aria-modal="true" onSubmit={event => { event.preventDefault(); void submitNodeDialog() }} onClick={event => event.stopPropagation()}>
            <h2>{nodeDialog.mode === 'rename' ? '重命名' : nodeDialog.mode === 'file' ? '新建文件' : '新建文件夹'}</h2>
            <input value={nodeName} onChange={event => setNodeName(event.target.value)} autoFocus placeholder={nodeDialog.mode === 'file' ? '例如：大纲.md' : '名称'} />
            <div className={css.nodeDialogActions}><button type="button" onClick={() => setNodeDialog(null)} disabled={nodeBusy}>取消</button><button type="submit" disabled={nodeBusy || nodeName.trim() === ''}>{nodeBusy ? '处理中…' : '确定'}</button></div>
          </form>
        </div>
      )}
      <ResizeHandle
        label="调整文件目录宽度"
        value={leftWidth}
        onStart={() => { leftDragBase.current = leftWidth }}
        onDrag={resizeLeft}
      />
      <section className={css.paneEditor} aria-label="文档编辑器">
        <div className={css.editorToolbar}>
          <div className={css.documentTabsViewport}>
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
              {documents.length === 0 && <span className={css.documentTabsEmpty}>未打开文档</span>}
            </div>
          </div>
          {activeDocument !== null && (
            <div className={css.editorHeaderActions}>
              <button
                className={css.toggleButton}
                type="button"
                title={activeDocument.visualMode ? '切换到源码编辑' : '切换到可视化编辑'}
                onClick={() => setDocuments(previous => previous.map(document => document.path === activeDocument.path ? { ...document, visualMode: !document.visualMode } : document))}
              >
                {activeDocument.visualMode ? <Code2 size={14} strokeWidth={1.9} aria-hidden="true" /> : <Eye size={14} strokeWidth={1.9} aria-hidden="true" />}
                {activeDocument.visualMode ? '源码' : '可视化'}
              </button>
              <label className={css.autoSaveToggle} title="自动保存编辑内容">
                <input type="checkbox" aria-label="自动保存" checked={autoSave} onChange={event => setAutoSave(event.target.checked)} />
                <span className={css.autoSaveSwitch} aria-hidden="true" />
                <span className={css.autoSaveLabel}>自动保存</span>
              </label>
              <button className={css.saveButton} type="button" onClick={() => void saveDocument(activeDocument.path)} disabled={activeDocument.saving}>
                <Save size={14} strokeWidth={2} aria-hidden="true" />
                {activeDocument.saving ? '保存中…' : activeDocument.dirty ? '保存 *' : '保存'}
              </button>
            </div>
          )}
        </div>
        {activeDocument === null ? (
          <div className={css.editorPlaceholder}>点击左侧文件打开，或展开目录查看内容</div>
        ) : activeDocument.visualMode ? (
          <VisualEditor key={activeDocument.path} initialDoc={activeDocument.draft} onSelectionChange={next => { if (next !== null) setSelection({ ...next, path: activeDocument.path }) }} onChange={doc => setDocuments(previous => previous.map(document => document.path === activeDocument.path ? { ...document, draft: doc, dirty: true, saveStatus: null } : document))} />
        ) : (
          <Editor key={activeDocument.path} initialDoc={activeDocument.draft} mode="markdown" onSelectionChange={next => { if (next !== null) setSelection({ ...next, path: activeDocument.path }) }} onChange={doc => setDocuments(previous => previous.map(document => document.path === activeDocument.path ? { ...document, draft: doc, dirty: true, saveStatus: null } : document))} />
        )}
        {selection !== null && activeDocument !== null && (
          <div ref={selectionPopoverRef} className={css.selectionPopover} style={{ left: `clamp(12px, ${selection.rect.left}px, calc(100% - 372px))`, top: `clamp(58px, ${selection.rect.bottom + 8}px, calc(100% - 118px))` }} role="dialog" aria-label="局部编辑">
            <div className={css.selectionPopoverActions}>
              <button type="button" onClick={() => void submitSelection('current')} disabled={selectionBusy}>添加到当前对话</button>
              <button type="button" onClick={() => void submitSelection('new')} disabled={selectionBusy}>在新会话打开</button>
            </div>
          </div>
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
          <div ref={conversationControlRef} className={css.conversationControl}>
            <button
              className={`${css.conversationAction} ${css.conversationPrimary}`}
              type="button"
              disabled={projectWorkspace === undefined}
              onClick={() => {
                if (projectWorkspace === undefined) return
                setHistoryOpen(false)
                startSession(projectWorkspace.workspaceId)
              }}
            >
              <IconNewChatOutline16 size={15} />
              <span className={css.conversationPrimaryLabel}>新建对话</span>
            </button>
            <button
              className={`${css.conversationAction} ${css.conversationHistoryAction}`}
              type="button"
              aria-label={`历史对话（${history.length}）`}
              aria-expanded={historyOpen}
              title={`历史对话（${history.length}）`}
              onClick={() => { setHistoryOpen(open => !open) }}
            >
              <History size={15} strokeWidth={1.9} aria-hidden="true" />
              <span className={css.historyCount} aria-hidden="true">{history.length}</span>
            </button>
          </div>
        </div>
        {historyOpen && (
          <div ref={historyPopoverRef} className={css.historyPopover}>
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
        {/* The project shell already binds this session to projectPath; keep
            both generic hero controls available for non-Zenwit shells. */}
        {renderSlot('conversation', {
          showWorkspacePicker: false,
          showHeroHeadline: false,
          openFileInWorkspace,
        })}
      </aside>
    </div>
  )
}
