import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { parseSkillSource } from './parser.js';
const MAX_FILES = 500;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_READ_CHARS = 100_000;
const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.docx', '.pdf']);
function formatFor(path) {
    const extension = extname(path).toLowerCase();
    if (extension === '.docx')
        return 'docx';
    if (extension === '.pdf')
        return 'pdf';
    if (extension === '.md' || extension === '.markdown')
        return 'markdown';
    if (extension === '.txt')
        return 'text';
    return undefined;
}
async function sourceTarget(path) {
    if (!isAbsolute(path) || path.trim().length === 0)
        throw new Error('资料路径必须是绝对路径');
    const target = await realpath(resolve(path));
    const info = await stat(target);
    if (!info.isDirectory() && !info.isFile())
        throw new Error('资料路径必须是文件或文件夹');
    return { path: target, info };
}
async function collectFiles(root) {
    const result = [];
    const visit = async (directory) => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules')
                continue;
            const path = resolve(directory, entry.name);
            if (entry.isDirectory()) {
                await visit(path);
            }
            else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
                result.push(path);
                if (result.length > MAX_FILES)
                    throw new Error(`资料文件不能超过 ${String(MAX_FILES)} 个`);
            }
        }
    };
    await visit(root);
    return result.sort();
}
export async function inspectSkillSource(path) {
    const target = await sourceTarget(path);
    const files = target.info.isFile() ? [target.path] : await collectFiles(target.path);
    const entries = await Promise.all(files.map(async (filePath) => {
        const info = await stat(filePath);
        if (info.size > MAX_FILE_BYTES)
            return {
                path: filePath,
                relativePath: relative(target.info.isFile() ? resolve(target.path, '..') : target.path, filePath),
                format: formatFor(filePath),
                bytes: info.size,
                readable: false,
                reason: `文件超过 ${String(MAX_FILE_BYTES)} 字节限制`,
            };
        return {
            path: filePath,
            relativePath: relative(target.info.isFile() ? resolve(target.path, '..') : target.path, filePath),
            format: formatFor(filePath),
            bytes: info.size,
            readable: formatFor(filePath) !== undefined,
        };
    }));
    return { sourcePath: target.path, kind: target.info.isDirectory() ? 'directory' : 'file', files: entries };
}
export async function readSkillSource(path, offset = 0, limit = 50_000) {
    const target = await sourceTarget(path);
    if (!target.info.isFile())
        throw new Error('资料读取路径必须是文件；先使用 skill_source_inspect 查看文件清单');
    const format = formatFor(target.path);
    if (format === undefined)
        throw new Error('只支持 TXT、Markdown、DOCX 和带文本层 PDF 资料');
    if (target.info.size > MAX_FILE_BYTES)
        throw new Error(`文件超过 ${String(MAX_FILE_BYTES)} 字节限制`);
    if (!Number.isInteger(offset) || offset < 0)
        throw new Error('offset 必须是非负整数');
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_READ_CHARS)
        throw new Error(`limit 必须在 1-${String(MAX_READ_CHARS)} 之间`);
    const parsed = await parseSkillSource(basename(target.path), await readFile(target.path));
    const content = parsed.content.slice(offset, offset + limit);
    return {
        path: target.path,
        format: parsed.format,
        offset,
        limit,
        content,
        hasMore: offset + content.length < parsed.content.length,
        nextOffset: offset + content.length < parsed.content.length ? offset + content.length : undefined,
    };
}
export function isInsidePath(root, candidate) {
    const value = relative(root, candidate);
    return value === '' || (value !== '..' && !value.startsWith(`..${sep}`) && !isAbsolute(value));
}
export { MAX_FILE_BYTES, MAX_FILES, MAX_READ_CHARS };
