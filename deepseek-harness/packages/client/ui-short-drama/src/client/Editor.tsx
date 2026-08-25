/** CodeMirror 6 editor, remounted per document via React key. */
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
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
