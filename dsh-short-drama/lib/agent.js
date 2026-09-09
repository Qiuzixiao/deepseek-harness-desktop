import { lstat, mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PERSONA_ORDER, PERSONA_SECTION } from '@deepseek-ai/dsh-system-prompt';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { ScreenplayError } from './errors.js';
import { SCREENPLAY_AGENT_PROMPT } from './prompt.js';
import { assertProjectFileDestination, assertProjectMutationPath, assertProjectPath, isProjectFileTool, isProjectMutationTool, pathArguments } from './project-scope.js';
export const name = 'screenplay-agent';
export const inject = ['tools', 'systemPrompt'];
/** Keep ordinary filesystem operations inside the Session workspace. */
export function installScreenplayProjectScopeGuard(ctx) {
    ctx.on('tools/pre-execute', async (exec, next) => {
        if (!isProjectFileTool(exec.name))
            return next();
        const session = exec.agent?.session;
        const projectRoot = session?.header.cwd;
        if (session === undefined || projectRoot === undefined)
            return { kind: 'deny', reason: 'open a project before using project files' };
        try {
            for (const candidate of pathArguments(exec.name, exec.arguments)) {
                const assertPath = isProjectMutationTool(exec.name) ? assertProjectMutationPath : assertProjectPath;
                const absolute = await assertPath(session, projectRoot, candidate, `${exec.name} path`);
                if (exec.name === 'write')
                    await assertProjectFileDestination(projectRoot, absolute, true);
            }
            if (exec.name === 'move') {
                const [source, destination] = pathArguments(exec.name, exec.arguments);
                if (source !== undefined && destination !== undefined) {
                    const sourcePath = await assertProjectMutationPath(session, projectRoot, source);
                    const destinationPath = await assertProjectMutationPath(session, projectRoot, destination);
                    if (!(await lstat(sourcePath)).isDirectory())
                        await assertProjectFileDestination(projectRoot, destinationPath, false);
                }
            }
        }
        catch (error) {
            return { kind: 'deny', reason: error instanceof Error ? error.message : String(error) };
        }
        return next();
    });
}
function currentProject(exec) {
    const session = exec.agent?.session;
    const projectRoot = session?.header.cwd;
    if (session === undefined || projectRoot === undefined) {
        throw new ScreenplayError('INVALID_WORKSPACE', 'open a project before changing project files');
    }
    return { projectRoot, session };
}
function installProjectMutationTools(ctx) {
    ctx.tools.register(defineTool({
        name: 'move',
        description: 'Rename or move one file or directory inside the current project.',
        parameters: {
            source_path: { type: 'string', required: true, description: 'Existing project-relative source path.' },
            destination_path: { type: 'string', required: true, description: 'New project-relative destination path.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    source_path: { type: 'string', required: true },
                    destination_path: { type: 'string', required: true },
                },
            },
            render: (_args, value) => [{ type: 'text', text: `Moved ${value.source_path} to ${value.destination_path}.` }],
        },
        async execute(args, exec) {
            const { projectRoot, session } = currentProject(exec);
            const source = await assertProjectMutationPath(session, projectRoot, args.source_path, 'move source_path');
            const destination = await assertProjectMutationPath(session, projectRoot, args.destination_path, 'move destination_path');
            if (!(await lstat(source)).isDirectory())
                await assertProjectFileDestination(projectRoot, destination, false);
            if (source === destination)
                return args;
            try {
                await lstat(destination);
                throw new ScreenplayError('INVALID_WORKSPACE', 'move destination already exists', { destination_path: args.destination_path });
            }
            catch (error) {
                if (error?.code !== 'ENOENT')
                    throw error;
            }
            await mkdir(dirname(destination), { recursive: true });
            await rename(source, destination);
            return args;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'delete',
        description: 'Permanently delete one file or directory inside the current project. Confirm with the user before calling this tool.',
        parameters: {
            file_path: { type: 'string', required: true, description: 'Project-relative file or directory path to delete.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: { file_path: { type: 'string', required: true } },
            },
            render: (_args, value) => [{ type: 'text', text: `Deleted ${value.file_path}.` }],
        },
        async execute(args, exec) {
            const { projectRoot, session } = currentProject(exec);
            const target = await assertProjectMutationPath(session, projectRoot, args.file_path, 'delete file_path');
            await rm(target, { recursive: true });
            return args;
        },
    }));
}
export function apply(ctx) {
    ctx.systemPrompt.section({
        name: PERSONA_SECTION,
        order: PERSONA_ORDER,
        text: SCREENPLAY_AGENT_PROMPT,
    });
    installProjectMutationTools(ctx);
    installScreenplayProjectScopeGuard(ctx);
}
