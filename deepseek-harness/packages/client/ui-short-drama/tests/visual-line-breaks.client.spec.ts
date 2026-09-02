// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/core'
import { getMarkdown } from '@milkdown/kit/utils'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { VisualEditor } from '../src/client/Editor.tsx'
import css from '../src/client/zenwit.module.css'

const mountedEditors: Editor[] = []
const mountedRoots: HTMLDivElement[] = []

afterEach(async () => {
  await Promise.all(mountedEditors.splice(0).map(editor => editor.destroy()))
  mountedRoots.splice(0).forEach(root => root.remove())
  cleanup()
})

describe('visual Markdown line breaks', () => {
  it('renders single source newlines as visible breaks without changing Markdown serialization', async () => {
    const source = '人物：沈时归、测灵长老\n△沈时归走上前。\n弟子甲：听见没？'
    const host = document.createElement('div')
    const visualEditorClass = css.visualEditor
    if (visualEditorClass === undefined) throw new Error('Missing .visualEditor CSS module class')
    host.className = visualEditorClass
    const root = document.createElement('div')
    host.append(root)
    document.body.append(host)
    mountedRoots.push(host)

    const editor = Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, source)
      })
      .use(commonmark)
    mountedEditors.push(editor)

    await editor.create()
    const view = editor.ctx.get(editorViewCtx)

    const softBreaks = view.dom.querySelectorAll('span[data-type="hardbreak"][data-is-inline="true"]')
    expect(softBreaks.length).toBe(2)
    const stylesheet = await readFile(join(
      process.cwd(),
      'packages/client/ui-short-drama/src/client/zenwit.module.css',
    ), 'utf8')
    expect(stylesheet).toMatch(/span\[data-type="hardbreak"\]\[data-is-inline="true"\]\)\s*\{\s*display:\s*block;/u)
    expect(editor.action(getMarkdown())).toBe(source + '\n')
  })

  it('renders basic GFM blocks as structured visual content', async () => {
    const source = [
      '| 名称 | 状态 |',
      '| --- | --- |',
      '| 沈念 | **进行中** |',
      '',
      '- [ ] 待确认',
      '- [x] 已确认',
      '',
      '~~已废弃~~',
    ].join('\n')

    render(createElement(VisualEditor, { initialDoc: source, onChange: () => undefined }))

    await waitFor(() => {
      const visualRoot = document.querySelector('.ProseMirror')
      expect(visualRoot).not.toBeNull()
      if (visualRoot === null) return
      expect(visualRoot.querySelector('table')).not.toBeNull()
      expect(visualRoot.querySelector('li[data-item-type="task"][data-checked="false"]')).not.toBeNull()
      expect(visualRoot.querySelector('li[data-item-type="task"][data-checked="true"]')).not.toBeNull()
      expect(visualRoot.querySelector('del')).not.toBeNull()
    })
  })

  it('keeps basic GFM syntax in the Markdown serializer', async () => {
    const source = '| 名称 | 状态 |\n| --- | --- |\n| 沈念 | **进行中** |\n\n- [ ] 待确认\n\n~~已废弃~~'
    const root = document.createElement('div')
    document.body.append(root)
    mountedRoots.push(root)

    const editor = Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, source)
      })
      .use(commonmark)
      .use(gfm)
    mountedEditors.push(editor)

    await editor.create()
    const markdown = editor.action(getMarkdown())
    expect(markdown).toMatch(/\|\s*名称\s*\|\s*状态\s*\|/)
    expect(markdown).toMatch(/[*-]\s+\[ \]\s+待确认/)
    expect(markdown).toContain('~~已废弃~~')
  })
})
