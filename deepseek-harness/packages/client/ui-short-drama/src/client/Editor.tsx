/** CodeMirror 6 editor, remounted per document via React key. */
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { defaultValueCtx, Editor as MilkdownEditor, rootCtx } from '@milkdown/core'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { commonmark } from '@milkdown/preset-commonmark'
import { dlkjb } from './dlkjb-language.ts'
import css from './zenwit.module.css'

export type EditorMode = 'markdown' | 'dlkjb'

export interface EditorProps {
  initialDoc: string
  onChange: (doc: string) => void
  mode?: EditorMode
}

/** Editor (keyed by the parent per open document). */
export function Editor({ initialDoc, onChange, mode = 'markdown' }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateListener = EditorView.updateListener.of(updateEvent => {
      if (updateEvent.docChanged) onChange(updateEvent.state.doc.toString())
    })
    const view = new EditorView({
      doc: initialDoc,
      extensions: [basicSetup, mode === 'dlkjb' ? dlkjb : markdown(), updateListener],
      parent: host.current!,
    })
    return () => view.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={host} className={css.editor} />
}

interface VisualEditorProps {
  initialDoc: string
  onChange: (doc: string) => void
}

/** Typora-style Markdown editing surface. The document remains Markdown at the boundary. */
function VisualEditorInner({ initialDoc, onChange }: VisualEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEditor((root) => MilkdownEditor.make()
    .config(ctx => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, initialDoc)
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdownText) => onChangeRef.current(markdownText))
    })
    .use(commonmark)
    .use(listener), [])

  return <div className={css.visualEditor}><Milkdown /></div>
}

/** MilkdownProvider owns the editor context for the visual editor instance. */
export function VisualEditor(props: VisualEditorProps) {
  return <MilkdownProvider><VisualEditorInner {...props} /></MilkdownProvider>
}
