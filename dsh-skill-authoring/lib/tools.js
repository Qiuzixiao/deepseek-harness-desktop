import { defineTool } from '@deepseek-ai/dsh-tools';
import { SkillAuthoringStore } from './skill-authoring.js';
import { inspectSkillSource, readSkillSource } from './skill-source.js';
import { readSkillReference } from './skill-reference.js';
function toJson(value) {
    return JSON.parse(JSON.stringify(value));
}
function text(value) {
    return [{ type: 'text', text: JSON.stringify(value, null, 2) }];
}
function session(exec) {
    return agent(exec).session;
}
function agent(exec) {
    const current = exec.agent;
    if (current === undefined)
        throw new Error('skill tools require a Session attached to a Workspace');
    return current;
}
function sessionCwd(exec) {
    const cwd = session(exec).header.cwd;
    if (cwd === undefined)
        throw new Error('skill tools require a Session Workspace');
    return cwd;
}
function presentation(title, kind = 'edit') {
    return {
        presentCall: () => ({ card: 'generic', title, kind }),
        presentResult: () => ({ card: 'generic', title: `${title}完成` }),
    };
}
export function skillToolDefinitions(ctx) {
    return [
        defineTool({
            name: 'skill_inspect',
            description: '检查已安装 Skill 的结构和位置。只读，不会修改项目资料或 Skill 文件。',
            parameters: {
                name: { type: 'string', required: true, description: '要检查的已有 Skill 名称。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await new SkillAuthoringStore(sessionCwd(exec)).inspect(args.name)),
            ...presentation('检查 Skill', 'read'),
        }),
        defineTool({
            name: 'skill_create',
            description: '根据用户明确提供的资料直接安装标准 Agent Skill。一次调用完成内容整理、结构校验和原子写入；默认安装到 user 作用域。只输出标准 Agent Skills 结构（SKILL.md + 可选 references/scripts/assets），不生成草稿、不需要确认指令。',
            parameters: {
                name: { type: 'string', required: true, description: 'kebab-case Skill 名称。' },
                description: { type: 'string', required: true, description: 'Skill 简短说明。' },
                scope: { type: 'string', enum: ['user', 'project'], description: '保存作用域；默认 user。' },
                whenToUse: { type: 'string', description: 'Claude Code 触发描述（when_to_use）。' },
                instructions: { type: 'string', required: true, description: 'Skill instructions 正文。只写会改变 Agent 决策的内容。' },
                resources: {
                    type: 'array',
                    description: '按需生成的 supporting resources；path 相对于所选 kind 目录，若重复带有同名 kind 前缀会自动归一化。',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            kind: { type: 'string', enum: ['references', 'scripts', 'assets'], required: true },
                            path: { type: 'string', required: true },
                            content: { type: 'string', required: true },
                        },
                    },
                },
                sources: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            sourceId: { type: 'string', required: true },
                            label: { type: 'string', required: true },
                            kind: { type: 'string', enum: ['project-file', 'reference-selection', 'version', 'user-note', 'attachment'], required: true },
                            excerpt: { type: 'string' },
                        },
                    },
                },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                if (typeof args.instructions !== 'string')
                    throw new Error('安装 Skill 需要 instructions');
                const input = {
                    name: args.name,
                    description: args.description,
                    scope: args.scope ?? 'user',
                    instructions: args.instructions,
                };
                if (typeof args.whenToUse === 'string')
                    input.whenToUse = args.whenToUse;
                if (Array.isArray(args.sources))
                    input.sources = args.sources;
                if (Array.isArray(args.resources))
                    input.resources = args.resources;
                const installed = await new SkillAuthoringStore(sessionCwd(exec)).save(input);
                // The authoring store writes directly to disk, so no filesystem mutation
                // event is guaranteed to reach the Skill watcher before the UI asks again.
                // Emit the registry's standard invalidation signal immediately.
                ctx.emit('skills/change');
                return toJson(installed);
            },
            ...presentation('创建 Skill', 'edit'),
        }),
        defineTool({
            name: 'skill_source_inspect',
            description: '扫描用户在 /skill-create 中明确提供的本地文件或文件夹，只返回受控文件清单和大小；不会读取项目外的其他路径，也不会修改资料。',
            parameters: {
                path: { type: 'string', required: true, description: '用户明确提供的本地绝对路径。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args) => toJson(await inspectSkillSource(args.path)),
            ...presentation('扫描 Skill 资料', 'read'),
        }),
        defineTool({
            name: 'skill_source_read',
            description: '读取已由 skill_source_inspect 列出的用户资料文件，按 offset/limit 返回受控文本；支持 TXT、Markdown、DOCX 和带文本层 PDF。',
            parameters: {
                path: { type: 'string', required: true, description: 'skill_source_inspect 返回清单中的文件绝对路径。' },
                offset: { type: 'integer', description: '文本字符起点，默认 0。' },
                limit: { type: 'integer', description: '最多返回字符数，默认 50000，最大 100000。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args) => toJson(await readSkillSource(args.path, args.offset, args.limit)),
            ...presentation('读取 Skill 资料', 'read'),
        }),
        defineTool({
            name: 'read_skill_reference',
            description: 'Read one relative reference file from a Skill that is visible in this Agent scope. The path is resolved only against that Skill\'s own resourceBase; project paths and absolute paths are rejected.',
            parameters: {
                skill: { type: 'string', required: true, description: 'Exact Skill name from the loaded Skill catalog.' },
                path: { type: 'string', required: true, description: 'Relative path such as references/project-objects.md.' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => {
                const current = agent(exec);
                const scope = current;
                return toJson(await readSkillReference(ctx, args.skill, args.path, session(exec).header.cwd, scope));
            },
            ...presentation('读取 Skill 参考', 'read'),
        }),
    ];
}
