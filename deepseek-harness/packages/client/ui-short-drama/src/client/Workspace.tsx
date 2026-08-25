/**
 * Zenwit workspace: three-pane screenplay surface.
 * Left: back + real file/dir structure tree (folders vs files, word counts,
 * expandable to reveal each folder's contents). Center: CodeMirror editor.
 * Right: AI chat (reused DSH conversation). The tree maps the project folder
 * directly, so everything on disk is visible.
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
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
  renderSlot: PropsRenderSlots<'conversation'>['renderSlot']
}

/** Three-pane workspace (see module doc). */
export function Workspace({ projectPath, closeProject, renderSlot }: WorkspaceProps) {
  const [structure, setStructure] = useState<StructureResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<OpenFile | null>(null)
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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

  /** Recursive tree render: a folder expands to reveal its real contents. */
  const renderNodes = (nodes: TreeNode[]): ReactNode[] => nodes.map(node => {
    const isOpen = expanded.has(node.path)
    return (
      <li key={node.path}>
        <div
          className={css.structureNode + (node.kind === 'dir' ? ' ' + css.structureDir : ' ' + css.structureFile)}
          onClick={() => void onOpenNode(node)}>
          <span className={css.structureIcon}>{node.kind === 'dir' ? (isOpen ? '▾' : '▸') : '·'}</span>
          <span className={css.structureLabel}>{node.name}</span>
          {node.detail !== '' && <span className={css.structureDetail}>{node.detail}</span>}
        </div>
        {node.kind === 'dir' && isOpen && node.children !== undefined && (
          <ul className={css.structureChildren}>{renderNodes(node.children)}</ul>
        )}
      </li>
    )
  })

  return (
    <div className={css.workspace}>
      <aside className={css.paneStructure}>
        <button className={css.backButton} type="button" onClick={() => void closeProject()}>
          ← 返回项目库
        </button>
        <div className={css.paneTitle}>{structure?.root ?? '项目工作台'}</div>
        {loadError !== null && <div className={css.structureError}>{loadError}</div>}
        <ul className={css.structureList}>
          {structure === null ? (
            <li className={css.structureNode}>加载结构…</li>
          ) : renderNodes(structure.tree)}
        </ul>
        <div className={css.paneFooter}>阶段：{structure?.phase ?? '…'} · rev {structure?.revision ?? 0}</div>
      </aside>
      <section className={css.paneEditor}>
        <div className={css.editorHeader}>
          <span className={css.paneTitle}>{openFile === null ? '文档编辑器' : openFile.name}</span>
          {openFile !== null && (
            <div className={css.editorHeaderActions}>
              <button className={css.toggleButton} type="button" onClick={() => setPreview(p => !p)}>
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
          <Editor key={openFile.path} initialDoc={openFile.content} mode={openFile.path.includes('/剧本/') || /episode-\d+\.md$/.test(openFile.path) ? 'dlkjb' : 'markdown'} onChange={doc => { setDraft(doc); setDirty(true); setSaveStatus(null) }} />
        )}
        {saveStatus !== null && <div className={css.saveStatus}>{saveStatus}</div>}
      </section>
      <aside className={css.paneChat}>
        {renderSlot('conversation', {})}
      </aside>
    </div>
  )
}
