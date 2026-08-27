import { extname } from 'node:path';
import mammoth from 'mammoth';
const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
const MAX_REFERENCE_PAGES = 500;
function assertUsableBytes(bytes) {
    if (bytes.byteLength === 0)
        throw new Error('参考文件不能为空');
    if (bytes.byteLength > MAX_REFERENCE_BYTES)
        throw new Error('单个参考文件不能超过 20 MB');
}
function structureOf(content) {
    const paragraphs = [];
    const headings = [];
    const expression = /[^\n]+/gu;
    let match;
    let index = 1;
    while ((match = expression.exec(content)) !== null) {
        const text = match[0];
        const start = match.index;
        const end = start + text.length;
        paragraphs.push({ index, start, end });
        const heading = /^(#{1,6})\s+(.+)$/u.exec(text.trim());
        if (heading !== null)
            headings.push({ level: heading[1].length, title: heading[2].trim(), start, end });
        index += 1;
    }
    return {
        paragraphs,
        ...(headings.length === 0 ? {} : { headings }),
    };
}
function decodeText(bytes) {
    const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
    const nulCount = sample.reduce((total, value) => total + (value === 0 ? 1 : 0), 0);
    if (nulCount > Math.max(2, sample.length / 100))
        throw new Error('文件不是可读的 UTF-8 文本');
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/u, '');
}
function htmlToMarkdown(html) {
    return html
        .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gisu, (_whole, level, body) => `${'#'.repeat(Number(level))} ${stripHtml(body)}\n\n`)
        .replace(/<li[^>]*>(.*?)<\/li>/gisu, (_whole, body) => `- ${stripHtml(body)}\n`)
        .replace(/<p[^>]*>(.*?)<\/p>/gisu, (_whole, body) => `${stripHtml(body)}\n\n`)
        .replace(/<br\s*\/?>/giu, '\n')
        .replace(/<[^>]+>/gu, '')
        .replace(/&nbsp;/gu, ' ')
        .replace(/&amp;/gu, '&')
        .replace(/&lt;/gu, '<')
        .replace(/&gt;/gu, '>')
        .replace(/&quot;/gu, '"')
        .replace(/\n{3,}/gu, '\n\n')
        .trim();
}
function stripHtml(value) {
    return value.replace(/<[^>]+>/gu, '').replace(/&nbsp;/gu, ' ').replace(/&amp;/gu, '&').trim();
}
async function parsePdf(bytes) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // pdf.js rejects Node Buffer instances even though Buffer extends Uint8Array.
    const data = bytes instanceof Buffer
        ? Uint8Array.from(bytes)
        : bytes;
    const loadingTask = pdfjs.getDocument({ data, disableFontFace: true });
    try {
        const pdf = await loadingTask.promise;
        if (pdf.numPages > MAX_REFERENCE_PAGES)
            throw new Error(`PDF 页数不能超过 ${String(MAX_REFERENCE_PAGES)} 页`);
        let content = '';
        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const text = await page.getTextContent();
            const pageText = text.items
                .map(item => ('str' in item ? item.str : ''))
                .join(' ')
                .replace(/\s+/gu, ' ')
                .trim();
            const start = content.length;
            if (content.length > 0)
                content += '\n\n';
            content += `## 第 ${String(pageNumber)} 页\n\n${pageText}`;
            pages.push({ page: pageNumber, start, end: content.length });
        }
        if (!content.replace(/^## 第 \d+ 页$/gmu, '').trim()) {
            throw new Error('PDF 没有可读文本层，请先进行 OCR 再上传');
        }
        return { format: 'pdf', content, structure: { ...structureOf(content), pages } };
    }
    finally {
        await loadingTask.destroy();
    }
}
export async function parseReferenceDocument(originalName, bytes) {
    assertUsableBytes(bytes);
    const extension = extname(originalName).toLowerCase();
    if (extension === '.txt' || extension === '.md') {
        const content = decodeText(bytes).trim();
        if (content.length === 0)
            throw new Error('参考文件没有可读文本');
        return { format: extension === '.md' ? 'markdown' : 'text', content, structure: structureOf(content) };
    }
    if (extension === '.docx') {
        const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
        const content = htmlToMarkdown(result.value);
        if (content.length === 0)
            throw new Error('DOCX 没有可读文本');
        return { format: 'docx', content, structure: structureOf(content) };
    }
    if (extension === '.pdf')
        return parsePdf(bytes);
    throw new Error('仅支持 TXT、Markdown、DOCX 和带文本层的 PDF 文件');
}
