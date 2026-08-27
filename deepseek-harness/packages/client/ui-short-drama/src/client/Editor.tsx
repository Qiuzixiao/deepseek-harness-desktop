/** CodeMirror 6 editor, remounted per document via React key. */
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { defaultValueCtx, editorViewCtx, Editor as MilkdownEditor, rootCtx } from '@milkdown/core'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { commonmark } from '@milkdown/preset-commonmark'
import { dlkjb } from './dlkjb-language.ts'
import css from './zenwit.module.css'

export type EditorMode = 'markdown' | 'dlkjb'

/** A non-empty editor selection, positioned in viewport coordinates. */
export interface DocumentSelection {
  /** The selected text as it appears in the editor. */
  text: string
  /** Start offset in the editor document. */
  from: number
  /** End offset in the editor document. */
  to: number
  /** One-based line containing the selection start. */
  startLine: number
  /** One-based line containing the selection end. */
  endLine: number
  /** Bounding viewport rectangle for the selection. */
  rect: { left: number, top: number, right: number, bottom: number }
}

export interface EditorProps {
  initialDoc: string
  onChange: (doc: string) => void
  onSelectionChange?: (selection: DocumentSelection | null) => void
  mode?: EditorMode
}

function selectionRect(from: { left: number, top: number, right: number, bottom: number }, to: { left: number, top: number, right: number, bottom: number }) {
  return {
    left: Math.min(from.left, to.left),
    top: Math.min(from.top, to.top),
    right: Math.max(from.right, to.right),
    bottom: Math.max(from.bottom, to.bottom),
  }
}

/** Editor (keyed by the parent per open document). */
export function Editor({ initialDoc, onChange, onSelectionChange, mode = 'markdown' }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  onChangeRef.current = onChange
  onSelectionChangeRef.current = onSelectionChange

  useEffect(() => {
    let pointerSelecting = false
    let selectionTimer: number | undefined
    const emitSelection = (view: EditorView): void => {
      const { main } = view.state.selection
      if (main.empty) {
        onSelectionChangeRef.current?.(null)
        return
      }
      const fromRect = view.coordsAtPos(main.from)
      const toRect = view.coordsAtPos(main.to)
      if (fromRect === null || toRect === null) {
        onSelectionChangeRef.current?.(null)
        return
      }
      const document = view.state.doc
      onSelectionChangeRef.current?.({ text: document.sliceString(main.from, main.to), from: main.from, to: main.to, startLine: document.lineAt(main.from).number, endLine: document.lineAt(main.to).number, rect: selectionRect(fromRect, toRect) })
    }
    const scheduleSelection = (view: EditorView): void => {
      if (pointerSelecting) return
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer)
      selectionTimer = window.setTimeout(() => {
        selectionTimer = undefined
        emitSelection(view)
      }, 180)
    }
    const updateListener = EditorView.updateListener.of(updateEvent => {
      if (updateEvent.docChanged) onChangeRef.current(updateEvent.state.doc.toString())
      if (!updateEvent.selectionSet) return
      scheduleSelection(updateEvent.view)
    })
    const view = new EditorView({
      doc: initialDoc,
      extensions: [basicSetup, mode === 'dlkjb' ? dlkjb : markdown(), updateListener],
      parent: host.current!,
    })
    const clearSelection = (): void => onSelectionChangeRef.current?.(null)
    const beginPointerSelection = (): void => {
      pointerSelecting = true
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer)
    }
    const endPointerSelection = (): void => {
      pointerSelecting = false
      window.requestAnimationFrame(() => emitSelection(view))
    }
    view.dom.addEventListener('blur', clearSelection)
    view.dom.addEventListener('pointerdown', beginPointerSelection)
    view.dom.addEventListener('pointerup', endPointerSelection)
    view.dom.addEventListener('pointercancel', endPointerSelection)
    return () => {
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer)
      view.dom.removeEventListener('blur', clearSelection)
      view.dom.removeEventListener('pointerdown', beginPointerSelection)
      view.dom.removeEventListener('pointerup', endPointerSelection)
      view.dom.removeEventListener('pointercancel', endPointerSelection)
      view.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={host} className={css.editor} />
}

interface VisualEditorProps {
  initialDoc: string
  onChange: (doc: string) => void
  onSelectionChange?: (selection: DocumentSelection | null) => void
}

/** Typora-style Markdown editing surface. The document remains Markdown at the boundary. */
function VisualEditorInner({ initialDoc, onChange, onSelectionChange }: VisualEditorProps) {
  const onChangeRef = useRef(onChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const selectionTimer = useRef<number | undefined>(undefined)
  onChangeRef.current = onChange
  onSelectionChangeRef.current = onSelectionChange
  useEffect(() => () => {
    if (selectionTimer.current !== undefined) window.clearTimeout(selectionTimer.current)
  }, [])
  useEditor((root) => MilkdownEditor.make()
    .config(ctx => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, initialDoc)
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdownText) => onChangeRef.current(markdownText))
      ctx.get(listenerCtx).selectionUpdated((selectionCtx, selection) => {
        if (selectionTimer.current !== undefined) window.clearTimeout(selectionTimer.current)
        selectionTimer.current = window.setTimeout(() => {
          selectionTimer.current = undefined
          if (selection.empty) {
            onSelectionChangeRef.current?.(null)
            return
          }
          const view = selectionCtx.get(editorViewCtx)
          const { from, to } = selection
          onSelectionChangeRef.current?.({
            text: view.state.doc.textBetween(from, to, '\n'), from, to,
            startLine: view.state.doc.textBetween(0, from, '\n').split('\n').length,
            endLine: view.state.doc.textBetween(0, to, '\n').split('\n').length,
            rect: selectionRect(view.coordsAtPos(from), view.coordsAtPos(to)),
          })
        }, 180)
      })
      ctx.get(listenerCtx).blur(() => {
        if (selectionTimer.current !== undefined) window.clearTimeout(selectionTimer.current)
        selectionTimer.current = undefined
        onSelectionChangeRef.current?.(null)
      })
    })
    .use(commonmark)
    .use(listener), [])

  return <div className={css.visualEditor}><Milkdown /></div>
}

/** MilkdownProvider owns the editor context for the visual editor instance. */
export function VisualEditor(props: VisualEditorProps) {
  return <MilkdownProvider><VisualEditorInner {...props} /></MilkdownProvider>
}
