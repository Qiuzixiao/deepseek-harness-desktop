import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { ScreenplayError } from './errors.js';
// `read_document` is the file-upload reader and intentionally accepts an
// attachment outside the bound project. Project filesystem tools stay scoped.
const PROJECT_TOOLS = new Set(['read', 'read_image', 'glob', 'grep', 'write', 'edit', 'move', 'delete']);
function isInside(root, target) {
    const rel = relative(root, target);
    return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
function assertRelativePath(value, label) {
    if (value.trim().length === 0) {
        throw new ScreenplayError('INVALID_WORKSPACE', `${label} must be a non-empty project path`, { value });
    }
    if (!isAbsolute(value) && value.split(/[\\/]/u).includes('..')) {
        throw new ScreenplayError('INVALID_WORKSPACE', `${label} cannot contain parent traversal`, { value });
    }
}
async function realpathNearestExisting(target) {
    let current = target;
    while (true) {
        try {
            return await realpath(current);
        }
        catch (error) {
            if (error?.code !== 'ENOENT')
                throw error;
            const parent = dirname(current);
            if (parent === current)
                throw error;
            current = parent;
        }
    }
}
export async function assertProjectPath(session, projectRoot, candidate, label = 'path') {
    assertRelativePath(candidate, label);
    const sessionCwd = session.header.cwd;
    if (sessionCwd === undefined || resolve(sessionCwd) !== resolve(projectRoot)) {
        throw new ScreenplayError('INVALID_WORKSPACE', 'the Session Workspace must be the bound project');
    }
    const root = await realpath(projectRoot);
    const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(root, candidate);
    const checked = await realpathNearestExisting(absolute);
    if (!isInside(root, checked)) {
        throw new ScreenplayError('INVALID_WORKSPACE', 'path escapes the bound project', { candidate });
    }
    const relativePath = relative(root, absolute);
    if (relativePath === '.screenplay'
        || relativePath.startsWith(`.screenplay${sep}`)
        || relativePath === '.zenwit-project'
        || relativePath.startsWith(`.zenwit-project${sep}`)) {
        throw new ScreenplayError('INVALID_WORKSPACE', 'project metadata is not editable through generic file tools', { candidate });
    }
    return absolute;
}
export async function assertProjectMutationPath(session, projectRoot, candidate, label = 'path') {
    const absolute = await assertProjectPath(session, projectRoot, candidate, label);
    if (relative(await realpath(projectRoot), absolute) === '') {
        throw new ScreenplayError('INVALID_WORKSPACE', 'the project root cannot be moved or deleted');
    }
    return absolute;
}
export function pathArguments(name, args) {
    if (!PROJECT_TOOLS.has(name) || args === null || typeof args !== 'object')
        return [];
    const values = args;
    if (name === 'read' || name === 'read_image' || name === 'write' || name === 'edit') {
        return typeof values.file_path === 'string' ? [values.file_path] : [];
    }
    if (name === 'move') {
        return [values.source_path, values.destination_path].filter((value) => typeof value === 'string');
    }
    if (name === 'delete')
        return typeof values.file_path === 'string' ? [values.file_path] : [];
    return typeof values.path === 'string' ? [values.path] : ['.'];
}
export function isProjectFileTool(name) {
    return PROJECT_TOOLS.has(name);
}
