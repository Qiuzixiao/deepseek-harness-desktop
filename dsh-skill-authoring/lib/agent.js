import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { realpath } from 'node:fs/promises';
import { isAbsolute, resolve, win32 } from 'node:path';
import { isInsidePath } from './skill-source.js';
import { skillToolDefinitions } from './tools.js';
const SKILL_SOURCE_TOOLS = new Set(['skill_source_inspect', 'skill_source_read']);
const skillSourceAuthorizations = new WeakMap();
export function explicitAbsolutePaths(rawInput) {
    const quoted = [...rawInput.matchAll(/["']((?:\/|[A-Za-z]:[\\/]|\\\\)[^"']+)["']/gu)].map(match => match[1]);
    const linePaths = rawInput.split(/\r?\n/u).map(line => {
        const start = line.indexOf('/');
        return start < 0 ? undefined : line.slice(start).trim().replace(/[，。！？；：].*$/u, '');
    });
    const unquoted = [...rawInput.matchAll(/(?:^|[\s(])((?:\/|[A-Za-z]:[\\/]|\\\\)[^\s"'<>，。！？；：]+)/gu)].map(match => match[1]);
    return [...new Set([...quoted, ...linePaths, ...unquoted]
            .filter((value) => typeof value === 'string')
            .map(value => value.replace(/[，。！？；：]+$/u, ''))
            .filter(value => value.length > 1 && (isAbsolute(value) || win32.isAbsolute(value))))];
}
/** Arm the Skill-only external source reader with paths explicitly present in /skill-create input. */
export function registerSkillSourceAuthorization(agent, rawInput) {
    const paths = explicitAbsolutePaths(rawInput);
    skillSourceAuthorizations.set(agent, new Set(paths.map(path => resolve(path))));
}
function clearSkillSourceAuthorization(agent) {
    skillSourceAuthorizations.delete(agent);
}
async function assertSkillSourcePath(agent, candidate) {
    if (!isAbsolute(candidate))
        throw new Error('Skill 资料路径必须是用户明确提供的绝对路径');
    const roots = skillSourceAuthorizations.get(agent);
    if (roots === undefined || roots.size === 0) {
        throw new Error('请在 /skill-create 命令中明确提供要读取的文件或文件夹路径');
    }
    const target = await realpath(resolve(candidate));
    for (const root of roots) {
        try {
            if (isInsidePath(await realpath(root), target))
                return;
        }
        catch {
            // A stale authorized path is rejected below with the same bounded error.
        }
    }
    throw new Error('Skill 资料路径不在用户明确授权的资料范围内');
}
/** User-facing steering text used by the explicit `/skill-create` entrypoint. */
export function skillCreateInstruction(rawInput) {
    const suffix = rawInput.trim();
    return suffix.length === 0
        ? '开始资料创建 Skill 流程：只读取用户明确提供或选择的资料，分类可复用经验与具体项目事实，整理来源、不确定性和适用范围后，直接安装 Skill。'
        : `开始资料创建 Skill 流程。用户补充要求：${suffix}\n只读取用户明确提供或选择的资料，整理来源、不确定性和适用范围后，直接安装 Skill。`;
}
function registerSkillCreateCommand(ctx) {
    ctx.inject(['commands'], commandCtx => {
        const commands = commandCtx.commands;
        commands.register({
            name: 'skill-create',
            description: '创建可复用 Skill',
            input: { hint: '[补充资料范围或适用范围]' },
            handler: ({ agent, rawInput }) => {
                registerSkillSourceAuthorization(agent, rawInput);
                agent.steer(createUserMessage({
                    content: [{ type: 'text', text: skillCreateInstruction(rawInput) }],
                    source: { kind: 'user' },
                }));
                return { kind: 'success', text: 'Skill 创建流程已启动。请继续提供或选择要分析的资料。' };
            },
        });
    });
}
/** Keep Skill-only external source reads inside the paths the user explicitly authorized. */
export function installSkillSourceScopeGuard(ctx) {
    ctx.on('tools/post-execute', async (exec, result, next) => {
        const downstream = await next();
        if (exec.name === 'skill_create' && exec.agent !== undefined && !result.isError) {
            clearSkillSourceAuthorization(exec.agent);
        }
        return downstream;
    });
    ctx.on('tools/pre-execute', async (exec, next) => {
        if (!SKILL_SOURCE_TOOLS.has(exec.name))
            return next();
        if (exec.agent === undefined)
            return { kind: 'deny', reason: 'Skill 资料读取需要当前 Agent Session' };
        const candidates = typeof exec.arguments === 'object' && exec.arguments !== null
            && typeof exec.arguments.path === 'string'
            ? [exec.arguments.path]
            : [];
        try {
            if (candidates.length !== 1)
                throw new Error('Skill 资料读取需要一个文件或文件夹路径');
            await assertSkillSourcePath(exec.agent, candidates[0]);
        }
        catch (error) {
            return { kind: 'deny', reason: error instanceof Error ? error.message : String(error) };
        }
        return next();
    });
}
export function apply(ctx) {
    for (const definition of skillToolDefinitions(ctx))
        ctx.tools.register(definition);
    registerSkillCreateCommand(ctx);
    installSkillSourceScopeGuard(ctx);
}
