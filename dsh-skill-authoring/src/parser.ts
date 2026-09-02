import { extname } from 'node:path'
import mammoth from 'mammoth'

export type SkillSourceFormat = 'text' | 'markdown' | 'docx' | 'pdf'

export interface SkillSourceParagraph {
  index: number
  start: number
  end: number
}

export interface SkillSourceHeading {
  level: number
  title: string
  start: number
  end?: number
}

export interface SkillSourcePage {
  page: number
  start: number
  end: number
}

export interface SkillSourceStructure {
  paragraphs: SkillSourceParagraph[]
  headings?: SkillSourceHeading[]
  pages?: SkillSourcePage[]
}

export interface ParsedSkillSource {
  format: SkillSourceFormat
  content: string
  structure: SkillSourceStructure
}

const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_SOURCE_PAGES = 500

function assertUsableBytes(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) throw new Error('资料文件不能为空')
  if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('单个资料文件不能超过 20 MB')
}

function structureOf(content: string): SkillSourceStructure {
  const paragraphs: SkillSourceParagraph[] = []
  const headings: SkillSourceHeading[] = []
  const expression = /[^\n]+/gu
  let match: RegExpExecArray | null
  let index = 1
  while ((match = expression.exec(content)) !== null) {
    const text = match[0]!
    const start = match.index
    const end = start + text.length
    paragraphs.push({ index, start, end })
    const heading = /^(#{1,6})\s+(.+)$/u.exec(text.trim())
    if (heading !== null) headings.push({ level: heading[1]!.length, title: heading[2]!.trim(), start, end })
    index += 1
  }
  return {
    paragraphs,
    ...(headings.length === 0 ? {} : { headings }),
  }
}

function decodeText(bytes: Uint8Array): string {
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096))
  const nulCount = sample.reduce((total, value) => total + (value === 0 ? 1 : 0), 0)
  if (nulCount > Math.max(2, sample.length / 100)) throw new Error('文件不是可读的 UTF-8 文本')
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/u, '')
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gisu, (_whole, level: string, body: string) => `${'#'.repeat(Number(level))} ${stripHtml(body)}\n\n`)
    .replace(/<li[^>]*>(.*?)<\/li>/gisu, (_whole, body: string) => `- ${stripHtml(body)}\n`)
    .replace(/<p[^>]*>(.*?)<\/p>/gisu, (_whole, body: string) => `${stripHtml(body)}\n\n`)
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<[^>]+>/gu, '')
    .replace(/&nbsp;/gu, ' ')
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/gu, '').replace(/&nbsp;/gu, ' ').replace(/&amp;/gu, '&').trim()
}

async function parsePdf(bytes: Uint8Array): Promise<ParsedSkillSource> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = bytes instanceof Buffer ? Uint8Array.from(bytes) : bytes
  const loadingTask = pdfjs.getDocument({ data, disableFontFace: true })
  try {
    const pdf = await loadingTask.promise
    if (pdf.numPages > MAX_SOURCE_PAGES) throw new Error(`PDF 页数不能超过 ${String(MAX_SOURCE_PAGES)} 页`)
    let content = ''
    const pages: NonNullable<SkillSourceStructure['pages']> = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const text = await page.getTextContent()
      const pageText = text.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/gu, ' ')
        .trim()
      const start = content.length
      if (content.length > 0) content += '\n\n'
      content += `## 第 ${String(pageNumber)} 页\n\n${pageText}`
      pages.push({ page: pageNumber, start, end: content.length })
    }
    if (!content.replace(/^## 第 \d+ 页$/gmu, '').trim()) {
      throw new Error('PDF 没有可读文本层，请先进行 OCR 再上传')
    }
    return { format: 'pdf', content, structure: { ...structureOf(content), pages } }
  } finally {
    await loadingTask.destroy()
  }
}

export async function parseSkillSource(originalName: string, bytes: Uint8Array): Promise<ParsedSkillSource> {
  assertUsableBytes(bytes)
  const extension = extname(originalName).toLowerCase()
  if (extension === '.txt' || extension === '.md') {
    const content = decodeText(bytes).trim()
    if (content.length === 0) throw new Error('资料文件没有可读文本')
    return { format: extension === '.md' ? 'markdown' : 'text', content, structure: structureOf(content) }
  }
  if (extension === '.docx') {
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })
    const content = htmlToMarkdown(result.value)
    if (content.length === 0) throw new Error('DOCX 没有可读文本')
    return { format: 'docx', content, structure: structureOf(content) }
  }
  if (extension === '.pdf') return parsePdf(bytes)
  throw new Error('仅支持 TXT、Markdown、DOCX 和带文本层的 PDF 文件')
}
