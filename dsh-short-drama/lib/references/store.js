import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, copyFile, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseReferenceDocument } from './parser.js';
const MAX_REFERENCE_NAME_LENGTH = 255;
const MAX_REFERENCE_PAGES = 500;
const MAX_BASE64_LENGTH = Math.ceil((20 * 1024 * 1024) / 3) * 4;
const OPAQUE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PURPOSES = new Set([
    'story-facts',
    'plot-structure',
    'character-relationships',
    'character-construction',
    'dialogue-style',
    'pacing-hooks',
    'custom',
]);
function safeOriginalName(value) {
    const name = value.normalize('NFC');
    if (name.length === 0 || name.length > MAX_REFERENCE_NAME_LENGTH || basename(name) !== name || name === '.' || name === '..' || /[\u0000-\u001F\u007F/\\]/u.test(name)) {
        throw new Error('参考文件名无效');
    }
    return name;
}
function safeOpaqueId(value, label) {
    if (!OPAQUE_ID_PATTERN.test(value))
        throw new Error(`${label}无效`);
    return value;
}
function decodeBase64(value, name) {
    if (value.length === 0 || value.length > MAX_BASE64_LENGTH || value.length % 4 !== 0
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
        throw new Error(`${name} 的内容编码无效`);
    }
    const bytes = Buffer.from(value, 'base64');
    if (bytes.length === 0 || bytes.length > 20 * 1024 * 1024)
        throw new Error(`${name} 的内容编码无效`);
    return bytes;
}
function validateSelection(selection) {
    if (selection === null || typeof selection !== 'object' || Array.isArray(selection))
        throw new Error('参考文件选区无效');
    const value = selection;
    if (typeof value.purpose !== 'string' || !PURPOSES.has(value.purpose)) {
        throw new Error('参考文件用途无效');
    }
    if (value.userInstruction !== undefined && (typeof value.userInstruction !== 'string' || value.userInstruction.length > 4000)) {
        throw new Error('参考文件说明无效');
    }
    const scope = value.scope;
    if (scope === null || typeof scope !== 'object' || Array.isArray(scope))
        throw new Error('参考文件范围无效');
    const range = scope;
    if (range.kind === 'full')
        return;
    if (range.kind === 'pages') {
        if (!Array.isArray(range.pages) || range.pages.length === 0 || range.pages.length > MAX_REFERENCE_PAGES
            || !range.pages.every(page => Number.isInteger(page) && page > 0 && page <= MAX_REFERENCE_PAGES)
            || new Set(range.pages).size !== range.pages.length)
            throw new Error('参考文件页码范围无效');
        return;
    }
    if (range.kind === 'heading') {
        if (typeof range.heading !== 'string' || range.heading.trim().length === 0 || range.heading.length > 500)
            throw new Error('参考文件标题范围无效');
        return;
    }
    if (range.kind === 'paragraphs') {
        if (!Number.isInteger(range.start) || !Number.isInteger(range.end)
            || range.start < 1 || range.end < range.start
            || range.end - range.start >= 10_000)
            throw new Error('参考文件段落范围无效');
        return;
    }
    if (range.kind === 'selected-text') {
        if (typeof range.text !== 'string' || range.text.trim().length === 0 || range.text.length > 1_000_000)
            throw new Error('参考文件选中文本无效');
        return;
    }
    throw new Error('参考文件范围无效');
}
async function writeAtomic(path, content) {
    const temporary = `${path}.tmp-${randomUUID()}`;
    try {
        await writeFile(temporary, content, { mode: 0o600 });
        await rename(temporary, path);
    }
    finally {
        await rm(temporary, { force: true });
    }
}
async function exists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}
function paragraphSelection(document, start, end) {
    const spans = document.structure.paragraphs.filter(item => item.index >= start && item.index <= end);
    if (spans.length === 0)
        throw new Error('指定段落不存在');
    return spans.map(span => document.content.slice(span.start, span.end)).join('\n\n');
}
function selectedContent(document, scope) {
    if (scope.kind === 'full')
        return document.content;
    if (scope.kind === 'pages') {
        if (document.structure.pages === undefined)
            throw new Error('只有 PDF 可按页码选择');
        const pages = new Set(scope.pages);
        const spans = document.structure.pages.filter(page => pages.has(page.page));
        if (spans.length !== pages.size || spans.length === 0)
            throw new Error('指定页码不存在');
        return spans.map(span => document.content.slice(span.start, span.end)).join('\n\n');
    }
    if (scope.kind === 'heading') {
        const heading = document.structure.headings?.find(item => item.title === scope.heading);
        if (heading === undefined)
            throw new Error('指定标题或章节不存在');
        const following = document.structure.headings?.find(item => item.start > heading.start && item.level <= heading.level);
        return document.content.slice(heading.start, following?.start ?? document.content.length).trim();
    }
    if (scope.kind === 'paragraphs')
        return paragraphSelection(document, scope.start, scope.end);
    const needle = scope.text.trim();
    if (needle.length === 0 || !document.content.includes(needle))
        throw new Error('选中文本不在文件内');
    return needle;
}
export class ScreenplayReferenceStore {
    projectRoot;
    visibleRoot;
    internalRoot;
    manifestPath;
    saveQueue = Promise.resolve();
    constructor(projectRoot, referenceDir) {
        this.projectRoot = projectRoot;
        this.visibleRoot = join(projectRoot, referenceDir);
        this.internalRoot = join(projectRoot, '.screenplay', 'references');
        this.manifestPath = join(this.internalRoot, 'manifest.json');
    }
    async conflicts(names) {
        const conflicts = [];
        for (const raw of names) {
            const name = safeOriginalName(raw);
            if (await exists(join(this.visibleRoot, name)))
                conflicts.push(name);
        }
        return conflicts;
    }
    async list() {
        return (await this.manifest()).references;
    }
    /** Compact, model-facing metadata; document bodies never enter the prompt. */
    contextSummary() {
        let manifest;
        try {
            manifest = JSON.parse(readFileSync(this.manifestPath, 'utf8'));
        }
        catch {
            return '';
        }
        if (manifest.version !== 1 || manifest.references.length === 0)
            return '';
        let selections = [];
        try {
            selections = readFileSync(join(this.internalRoot, 'selections.jsonl'), 'utf8')
                .split('\n')
                .filter(Boolean)
                .map(line => JSON.parse(line));
        }
        catch {
            // The manifest is still useful when an interrupted write left no selection log.
        }
        return [
            'User-uploaded screenplay reference files available for this session (metadata only):',
            ...manifest.references.map(reference => {
                const fileSelections = selections.filter(selection => selection.referenceId === reference.referenceId);
                return `- ${reference.originalName} (referenceId=${reference.referenceId})${fileSelections.length === 0 ? '' : `; selectionIds=${fileSelections.map(selection => selection.selectionId).join(', ')}`}`;
            }),
            'The user message is the authority for what to do with these files. Read a selection only when the user asks for it; never expose this metadata block as user-message text.',
        ].join('\n');
    }
    async structure(referenceId) {
        const safeId = safeOpaqueId(referenceId, '参考文件 ID');
        return JSON.parse(await readFile(join(this.internalRoot, 'parsed', safeId, 'structure.json'), 'utf8'));
    }
    async preview(originalName) {
        const name = safeOriginalName(originalName);
        const manifest = await this.manifest();
        const record = manifest.references.find(reference => reference.originalName === name);
        if (record === undefined)
            throw new Error('参考文件不存在');
        const parsedRoot = join(this.internalRoot, 'parsed', safeOpaqueId(record.referenceId, '参考文件 ID'));
        const [content, structureText] = await Promise.all([
            readFile(join(parsedRoot, 'content.md'), 'utf8'),
            readFile(join(parsedRoot, 'structure.json'), 'utf8'),
        ]);
        return {
            originalName: record.originalName,
            format: record.format,
            content,
            structure: JSON.parse(structureText),
        };
    }
    /** Read a bounded paragraph page without exposing the stored source path. */
    async readDocument(referenceId, page = 1, pageSize) {
        const safeId = safeOpaqueId(referenceId, '参考文件 ID');
        if (!Number.isInteger(page) || page < 1 || page > 10_000)
            throw new Error('文档页码无效');
        const manifest = await this.manifest();
        const record = manifest.references.find(item => item.referenceId === safeId);
        if (record === undefined)
            throw new Error('参考文件不存在');
        const parsedRoot = join(this.internalRoot, 'parsed', safeId);
        const [content, structureText] = await Promise.all([
            readFile(join(parsedRoot, 'content.md'), 'utf8'),
            readFile(join(parsedRoot, 'structure.json'), 'utf8'),
        ]);
        const structure = JSON.parse(structureText);
        const units = structure.pages === undefined
            ? structure.paragraphs.map(span => ({ start: span.start, end: span.end }))
            : structure.pages.map(span => ({ start: span.start, end: span.end }));
        const effectivePageSize = pageSize ?? (structure.pages === undefined ? 20 : 1);
        if (!Number.isInteger(effectivePageSize) || effectivePageSize < 1 || effectivePageSize > 100)
            throw new Error('文档分页大小无效');
        const totalPages = Math.max(1, Math.ceil(units.length / effectivePageSize));
        if (page > totalPages)
            throw new Error('指定文档页不存在');
        const startIndex = (page - 1) * effectivePageSize;
        const spans = units.slice(startIndex, startIndex + effectivePageSize);
        const selected = spans.map(span => content.slice(span.start, span.end)).join('\n\n').trim();
        const hasMore = page < totalPages;
        return {
            referenceId: safeId,
            originalName: record.originalName,
            format: record.format,
            page,
            pageSize: effectivePageSize,
            totalPages,
            content: selected,
            hasMore,
            ...(hasMore ? { nextPage: page + 1 } : {}),
        };
    }
    async readSelection(selectionId) {
        const safeId = safeOpaqueId(selectionId, '参考范围 ID');
        const lines = await readFile(join(this.internalRoot, 'selections.jsonl'), 'utf8').catch(() => '');
        for (const line of lines.split('\n')) {
            if (line.length === 0)
                continue;
            const record = JSON.parse(line);
            if (record.selectionId === safeId)
                return record;
        }
        throw new Error('参考范围不存在');
    }
    async saveBatch(files) {
        const previous = this.saveQueue;
        let release;
        this.saveQueue = new Promise(resolve => { release = resolve; });
        await previous;
        try {
            return await this.saveBatchLocked(files);
        }
        finally {
            release();
        }
    }
    async saveBatchLocked(files) {
        if (files.length === 0)
            throw new Error('请先选择参考文件');
        const duplicate = files.map(file => safeOriginalName(file.originalName)).find((name, index, all) => all.indexOf(name) !== index);
        if (duplicate !== undefined)
            throw new Error(`本次选择包含同名文件：${duplicate}`);
        const prepared = await Promise.all(files.map(async (file) => {
            const originalName = safeOriginalName(file.originalName);
            if (typeof file.bytesBase64 !== 'string')
                throw new Error(`${originalName} 的内容编码无效`);
            const bytes = decodeBase64(file.bytesBase64, originalName);
            validateSelection(file.selection);
            const document = await parseReferenceDocument(originalName, bytes);
            const content = selectedContent(document, file.selection.scope).trim();
            if (content.length === 0)
                throw new Error(`${originalName} 的选定范围没有文本`);
            const existsAlready = await exists(join(this.visibleRoot, originalName));
            if (existsAlready && file.replaceExisting !== true)
                throw new Error(`同名文件已存在：${originalName}`);
            return { file, originalName, bytes, document, content };
        }));
        await mkdir(this.visibleRoot, { recursive: true, mode: 0o700 });
        await mkdir(join(this.internalRoot, 'parsed'), { recursive: true, mode: 0o700 });
        const manifest = await this.manifest();
        const oldManifestText = await readFile(this.manifestPath, 'utf8').catch(() => undefined);
        const oldSelectionsText = await readFile(join(this.internalRoot, 'selections.jsonl'), 'utf8').catch(() => undefined);
        const oldSelections = oldSelectionsText === undefined ? [] : oldSelectionsText.split('\n').filter(Boolean).map(line => JSON.parse(line));
        const stageRoot = join(this.internalRoot, `.staging-${randomUUID()}`);
        const backupRoot = join(this.internalRoot, `.backup-${randomUUID()}`);
        await mkdir(stageRoot, { recursive: true, mode: 0o700 });
        await mkdir(backupRoot, { recursive: true, mode: 0o700 });
        await mkdir(join(stageRoot, 'files'), { recursive: true, mode: 0o700 });
        await mkdir(join(stageRoot, 'parsed'), { recursive: true, mode: 0o700 });
        await mkdir(join(backupRoot, 'files'), { recursive: true, mode: 0o700 });
        await mkdir(join(backupRoot, 'parsed'), { recursive: true, mode: 0o700 });
        const now = Date.now();
        const records = [];
        const selections = [];
        const committed = [];
        try {
            for (const item of prepared) {
                const prior = manifest.references.find(record => record.originalName === item.originalName);
                const referenceId = prior?.referenceId ?? randomUUID();
                const parsedDir = join(stageRoot, 'parsed', referenceId);
                await mkdir(parsedDir, { recursive: true, mode: 0o700 });
                await writeFile(join(stageRoot, 'files', item.originalName), item.bytes, { mode: 0o600 });
                await writeFile(join(parsedDir, 'content.md'), item.document.content, { mode: 0o600 });
                await writeFile(join(parsedDir, 'structure.json'), `${JSON.stringify(item.document.structure, null, 2)}\n`, { mode: 0o600 });
                const record = {
                    referenceId,
                    originalName: item.originalName,
                    format: item.document.format,
                    bytes: item.bytes.length,
                    sha256: digest(item.bytes),
                    createdAt: prior?.createdAt ?? now,
                    updatedAt: now,
                };
                const selection = {
                    selectionId: randomUUID(),
                    referenceId,
                    originalName: item.originalName,
                    ...item.file.selection,
                    content: item.content,
                    contentDigest: digest(item.content),
                    createdAt: now,
                };
                records.push(record);
                selections.push(selection);
            }
            for (const item of prepared) {
                const record = records.find(entry => entry.originalName === item.originalName);
                const state = {
                    originalName: item.originalName,
                    referenceId: record.referenceId,
                    visibleBackup: false,
                    parsedBackup: false,
                    visibleInstalled: false,
                    parsedInstalled: false,
                };
                committed.push(state);
                if (await exists(join(this.visibleRoot, item.originalName))) {
                    await copyFile(join(this.visibleRoot, item.originalName), join(backupRoot, 'files', item.originalName));
                    state.visibleBackup = true;
                    await rm(join(this.visibleRoot, item.originalName), { force: true });
                }
                if (await exists(join(this.internalRoot, 'parsed', record.referenceId))) {
                    await rename(join(this.internalRoot, 'parsed', record.referenceId), join(backupRoot, 'parsed', record.referenceId));
                    state.parsedBackup = true;
                }
                await rename(join(stageRoot, 'files', item.originalName), join(this.visibleRoot, item.originalName));
                state.visibleInstalled = true;
                await rename(join(stageRoot, 'parsed', record.referenceId), join(this.internalRoot, 'parsed', record.referenceId));
                state.parsedInstalled = true;
            }
            const replacedReferenceIds = new Set(records.map(record => manifest.references.find(previous => previous.originalName === record.originalName)?.referenceId).filter((value) => value !== undefined));
            const nextManifest = {
                version: 1,
                references: [...manifest.references.filter(record => !records.some(next => next.originalName === record.originalName)), ...records],
            };
            const nextSelections = [...oldSelections.filter(selection => !replacedReferenceIds.has(selection.referenceId)), ...selections];
            await writeAtomic(this.manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
            await writeAtomic(join(this.internalRoot, 'selections.jsonl'), nextSelections.map(value => `${JSON.stringify(value)}\n`).join(''));
            return { references: records, selections };
        }
        catch (error) {
            for (const item of committed) {
                if (item.visibleInstalled || item.visibleBackup) {
                    await rm(join(this.visibleRoot, item.originalName), { force: true });
                }
                if (item.visibleBackup) {
                    await rename(join(backupRoot, 'files', item.originalName), join(this.visibleRoot, item.originalName));
                }
                if (item.parsedInstalled || item.parsedBackup) {
                    await rm(join(this.internalRoot, 'parsed', item.referenceId), { recursive: true, force: true });
                }
                if (item.parsedBackup) {
                    await rename(join(backupRoot, 'parsed', item.referenceId), join(this.internalRoot, 'parsed', item.referenceId));
                }
            }
            if (oldManifestText === undefined)
                await rm(this.manifestPath, { force: true });
            else
                await writeAtomic(this.manifestPath, oldManifestText);
            const selectionsPath = join(this.internalRoot, 'selections.jsonl');
            if (oldSelectionsText === undefined)
                await unlink(selectionsPath).catch(() => undefined);
            else
                await writeAtomic(selectionsPath, oldSelectionsText);
            throw error;
        }
        finally {
            await rm(stageRoot, { recursive: true, force: true });
            await rm(backupRoot, { recursive: true, force: true });
        }
    }
    async manifest() {
        await mkdir(this.internalRoot, { recursive: true, mode: 0o700 });
        try {
            const value = JSON.parse(await readFile(this.manifestPath, 'utf8'));
            return value.version === 1 && Array.isArray(value.references) ? value : { version: 1, references: [] };
        }
        catch {
            return { version: 1, references: [] };
        }
    }
}
