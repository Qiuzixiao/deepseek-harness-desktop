import { access, mkdtemp, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseReferenceDocument } from '../src/references/parser.js'
import { ScreenplayReferenceStore } from '../src/references/store.js'

function textPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${String(Buffer.byteLength(stream))} >>\nstream\n${stream}\nendstream`,
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body))
    body += `${String(index + 1)} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`
  body += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF\n`
  return Buffer.from(body)
}

describe('screenplay references', () => {
  it('parses UTF-8 text into numbered paragraphs', async () => {
    const parsed = await parseReferenceDocument('人物资料.txt', new TextEncoder().encode('第一段\n\n第二段'))
    expect(parsed.format).toBe('text')
    expect(parsed.structure.paragraphs).toHaveLength(2)
  })

  it('rejects unsupported formats', async () => {
    await expect(parseReferenceDocument('图片.png', new Uint8Array([1, 2, 3]))).rejects.toThrow('仅支持')
  })

  it('keeps the exact original filename and persists only the selected range', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    const source = '一、故事事实\n\n二、风格参考'
    const result = await store.saveBatch([{
      originalName: '原名素材.md',
      bytesBase64: Buffer.from(source).toString('base64'),
      selection: {
        purpose: 'story-facts',
        scope: { kind: 'paragraphs', start: 1, end: 1 },
      },
    }])
    expect(await readFile(join(projectRoot, '参考文件', '原名素材.md'), 'utf8')).toBe(source)
    expect(result.selections[0]?.content).toBe('一、故事事实')
    expect(await store.conflicts(['原名素材.md'])).toEqual(['原名素材.md'])
  })

  it('returns parsed previews without changing the original reference file', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    const source = '人物设定\n第二行保持换行'
    await store.saveBatch([{
      originalName: '人物资料.txt',
      bytesBase64: Buffer.from(source).toString('base64'),
      selection: { purpose: 'character-construction', scope: { kind: 'full' } },
    }])

    await expect(store.preview('人物资料.txt')).resolves.toMatchObject({
      originalName: '人物资料.txt',
      format: 'text',
      content: source,
      structure: { paragraphs: expect.any(Array) },
    })
    expect(await readFile(join(projectRoot, '参考文件', '人物资料.txt'), 'utf8')).toBe(source)
    await expect(access(join(projectRoot, '.screenplay', 'references', 'manifest.json'))).resolves.toBeUndefined()
  })

  it('returns Markdown previews in the normalized renderer format', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    await store.saveBatch([{
      originalName: '结构.md',
      bytesBase64: Buffer.from('# 第一章\n\n内容').toString('base64'),
      selection: { purpose: 'plot-structure', scope: { kind: 'full' } },
    }])

    const markdown = await store.preview('结构.md')
    expect(markdown.format).toBe('markdown')
    expect(markdown.content).toContain('# 第一章')
    expect(markdown.structure.headings).toEqual(expect.arrayContaining([expect.objectContaining({ title: '第一章' })]))
    await expect(store.preview('不存在.pdf')).rejects.toThrow('参考文件不存在')
  })

  it('returns a DOCX preview while preserving the uploaded binary', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    const fixture = fileURLToPath(new URL('../node_modules/mammoth/test/test-data/single-paragraph.docx', import.meta.url))
    const bytes = await readFile(fixture)
    await store.saveBatch([{
      originalName: '人物小传.docx',
      bytesBase64: bytes.toString('base64'),
      selection: { purpose: 'character-construction', scope: { kind: 'full' } },
    }])

    const preview = await store.preview('人物小传.docx')
    expect(preview.format).toBe('docx')
    expect(preview.content.length).toBeGreaterThan(0)
    expect(await readFile(join(projectRoot, '参考文件', '人物小传.docx'))).toEqual(bytes)
  })

  it('accepts Buffer-backed PDFs and returns a page-aware preview', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    const bytes = textPdf('PDF Preview Text')
    await store.saveBatch([{
      originalName: '故事资料.pdf',
      bytesBase64: bytes.toString('base64'),
      selection: { purpose: 'story-facts', scope: { kind: 'full' } },
    }])

    const preview = await store.preview('故事资料.pdf')
    expect(preview.format).toBe('pdf')
    expect(preview.content).toContain('## 第 1 页')
    expect(preview.content).toContain('PDF Preview Text')
    expect(preview.structure.pages).toEqual([expect.objectContaining({ page: 1 })])
    expect(await readFile(join(projectRoot, '参考文件', '故事资料.pdf'))).toEqual(bytes)
  })

  it('requires explicit replacement for a same-name file', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    const upload = {
      originalName: '设定.txt',
      bytesBase64: Buffer.from('旧设定').toString('base64'),
      selection: { purpose: 'story-facts' as const, scope: { kind: 'full' as const } },
    }
    await store.saveBatch([upload])
    await expect(store.saveBatch([{ ...upload, bytesBase64: Buffer.from('新设定').toString('base64') }]))
      .rejects.toThrow('同名文件已存在')
  })

  it('rejects path-like opaque ids and malformed upload ranges', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    await expect(store.structure('../manifest')).rejects.toThrow('参考文件 ID无效')
    await expect(store.saveBatch([{
      originalName: '设定.txt',
      bytesBase64: 'not-base64',
      selection: { purpose: 'story-facts', scope: { kind: 'full' } },
    }])).rejects.toThrow('内容编码无效')
    await expect(store.saveBatch([{
      originalName: '设定.txt',
      bytesBase64: Buffer.from('一段').toString('base64'),
      selection: { purpose: 'story-facts', scope: { kind: 'paragraphs', start: 2, end: 1 } },
    }])).rejects.toThrow('段落范围无效')
    await expect(store.saveBatch([{
      originalName: '设定.txt',
      bytesBase64: Buffer.from('一段').toString('base64'),
      selection: { purpose: 'story-facts', scope: { kind: 'pages', pages: [1, 1] } },
    }])).rejects.toThrow('页码范围无效')
    await expect(store.saveBatch([{
      originalName: '设定.txt',
      bytesBase64: Buffer.from('一段').toString('base64'),
      selection: { purpose: 'story-facts', scope: { kind: 'pages', pages: [501] } },
    }])).rejects.toThrow('页码范围无效')
  })

  it('drops old selections when a reference is replaced', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    const first = await store.saveBatch([{
      originalName: '设定.txt',
      bytesBase64: Buffer.from('旧事实\n旧补充').toString('base64'),
      selection: { purpose: 'story-facts', scope: { kind: 'paragraphs', start: 1, end: 1 } },
    }])
    const oldSelectionId = first.selections[0]!.selectionId
    await expect(store.readSelection(oldSelectionId)).resolves.toMatchObject({ content: '旧事实' })
    const second = await store.saveBatch([{
      originalName: '设定.txt',
      bytesBase64: Buffer.from('新事实').toString('base64'),
      replaceExisting: true,
      selection: { purpose: 'story-facts', scope: { kind: 'full' } },
    }])
    expect(second.selections[0]?.content).toBe('新事实')
    await expect(store.readSelection(oldSelectionId)).rejects.toThrow('参考范围不存在')
  })

  it('serializes concurrent saves without losing either reference', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'screenplay-reference-'))
    const store = new ScreenplayReferenceStore(projectRoot, '参考文件')
    const upload = (name: string, content: string) => ({
      originalName: name,
      bytesBase64: Buffer.from(content).toString('base64'),
      selection: { purpose: 'story-facts' as const, scope: { kind: 'full' as const } },
    })
    await Promise.all([
      store.saveBatch([upload('甲.txt', '甲')]),
      store.saveBatch([upload('乙.txt', '乙')]),
    ])
    expect((await store.list()).map(reference => reference.originalName).sort()).toEqual(['乙.txt', '甲.txt'].sort())
  })
})
