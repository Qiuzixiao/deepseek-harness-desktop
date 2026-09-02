import { defineTool } from '@deepseek-ai/dsh-tools';
import { screenplayToolError, ScreenplayError } from './errors.js';
const mutationParameters = {
    expectedRevision: {
        type: 'integer',
        required: true,
        description: 'Latest project revision returned by read_project_context or the prior mutation.',
    },
    operationId: {
        type: 'string',
        required: true,
        description: 'Unique idempotency key. Reuse it only when retrying the same uncertain operation.',
    },
};
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
    if (current === undefined) {
        throw new ScreenplayError('INVALID_WORKSPACE', 'screenplay tools require a Session attached to a Workspace');
    }
    return current;
}
function projectWorkspace(ctx, exec) {
    const projectRoot = ctx.screenplayProjects.projectRootForSession(session(exec));
    if (projectRoot === undefined) {
        throw new ScreenplayError('INVALID_WORKSPACE', 'no screenplay project is bound to this session; discuss and confirm the project before creating it');
    }
    return projectRoot;
}
function parentWorkspace(exec) {
    const cwd = session(exec).header.cwd;
    if (cwd === undefined) {
        throw new ScreenplayError('INVALID_WORKSPACE', 'screenplay project creation requires a Session Workspace');
    }
    return cwd;
}
function presentation(title, kind = 'edit') {
    return {
        presentCall: () => ({ card: 'generic', title, kind }),
        presentResult: () => ({ card: 'generic', title: `${title}完成` }),
    };
}
const requirementsSchema = {
    type: 'object',
    required: true,
    additionalProperties: false,
    properties: {
        title: { type: 'string', description: '正式项目标题，必须与桌面端已经确定的项目文件夹名一致；不得另行命名或再次询问。' },
        genre: { type: 'string', required: true },
        audience: { type: 'string', required: true },
        episodeCount: { type: 'integer', required: true },
        episodeDurationSeconds: {
            type: 'integer',
            required: true,
            description: '用户选择的单集成片秒数。标准预估：90 秒约 1200-1500 字，60 秒约 800-1200 字，120 秒约 1200-1800 字。',
        },
        premise: { type: 'string', required: true },
        endingDirection: { type: 'string', required: true },
        constraints: { type: 'array', items: { type: 'string' } },
    },
};
export function screenplayToolDefinitions(ctx) {
    const definitions = [
        defineTool({
            name: 'read_project_context',
            description: 'Read the compact state of the screenplay project currently bound to this Session.',
            parameters: {},
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (_args, exec) => toJson(await ctx.screenplayProjects.readProjectContextForSession(session(exec))),
            ...presentation('读取项目上下文', 'read'),
        }),
        defineTool({
            name: 'read_artifact',
            description: 'Read one project-relative formal artifact, or the current Session-local episode draft when it exists.',
            parameters: {
                path: { type: 'string', required: true, description: 'Project-relative artifact path.' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.readArtifactForSession(session(exec), args.path)),
            ...presentation('读取短剧文件', 'read'),
        }),
        defineTool({
            name: 'search_project',
            description: 'Search text in formal artifacts of the currently bound screenplay project.',
            parameters: {
                query: { type: 'string', required: true, description: 'Literal text to search for.' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.searchProjectForSession(session(exec), args.query)),
            ...presentation('搜索项目文件', 'read'),
        }),
        defineTool({
            name: 'skill_inspect',
            description: '检查已安装 Skill 的结构、来源和作用域。只读，不会修改项目资料或 Skill 文件。',
            parameters: {
                name: { type: 'string', required: true, description: '要检查的已有 Skill 名称。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.inspectSkillForSession(session(exec), undefined, args.name)),
            ...presentation('检查 Skill', 'read'),
        }),
        defineTool({
            name: 'skill_create',
            description: '根据用户明确提供的资料直接安装 Skill。一次调用完成内容整理、结构校验和原子写入；默认安装到 user 作用域，不生成草稿、不需要确认指令，不声明额外文件、Shell、网络或正式项目写入权限。',
            parameters: {
                name: { type: 'string', required: true, description: 'kebab-case Skill 名称。' },
                description: { type: 'string', required: true, description: 'Skill 简短说明。' },
                whenToUse: { type: 'string', description: '触发描述。' },
                scope: { type: 'string', enum: ['user', 'project'], description: '保存作用域；默认 user。' },
                applicableTo: { type: 'array', items: { type: 'string' }, description: '适用题材或任务范围。' },
                uncertainty: { type: 'array', items: { type: 'string' }, description: '证据不足或可能遗漏的说明。' },
                instructions: { type: 'string', description: '根据实际资料编写的 Skill instructions。不要套用固定章节；只写会改变 Agent 决策的内容。' },
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
                entries: {
                    type: 'array',
                    description: '从资料中分类后的候选经验。story-fact 或 reusable=false 的条目不会进入发布内容。',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            category: { type: 'string', enum: ['method', 'workflow', 'principle', 'case', 'counterexample', 'term', 'story-fact'], required: true },
                            text: { type: 'string', required: true },
                            reusable: { type: 'boolean', required: true },
                            sourceIds: { type: 'array', items: { type: 'string' }, required: true },
                        },
                    },
                },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                if (!Array.isArray(args.entries) && typeof args.instructions !== 'string')
                    throw new ScreenplayError('INVALID_INPUT', '安装 Skill 需要 instructions 或资料分类 entries');
                return toJson(await ctx.screenplayProjects.installSkillForSession(session(exec), {
                    name: args.name,
                    description: args.description,
                    scope: args.scope ?? 'user',
                    ...(args.whenToUse === undefined ? {} : { whenToUse: args.whenToUse }),
                    ...(args.applicableTo === undefined ? {} : { applicableTo: args.applicableTo }),
                    ...(args.entries === undefined ? {} : { entries: args.entries }),
                    ...(args.instructions === undefined ? {} : { instructions: args.instructions }),
                    ...(args.sources === undefined ? {} : { sources: args.sources }),
                    ...(args.resources === undefined ? {} : { resources: args.resources }),
                    ...(args.uncertainty === undefined ? {} : { uncertainty: args.uncertainty }),
                }));
            },
            ...presentation('创建 Skill', 'edit'),
        }),
        defineTool({
            name: 'write_scene',
            description: 'Write or replace one scene in the current Session-local episode draft. This does not modify formal files.',
            parameters: {
                episode: { type: 'integer', required: true },
                sceneNo: { type: 'integer', required: true },
                content: { type: 'string', required: true, description: 'The complete Markdown content of this scene.' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.writeSceneForSession(session(exec), args.episode, args.sceneNo, args.content)),
            ...presentation('写入场景'),
        }),
        defineTool({
            name: 'validate_episode',
            description: 'Run signal-channel-A mechanical validation against an episode draft or formal episode.',
            parameters: { episode: { type: 'integer', required: true } },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.validateEpisodeForSession(session(exec), args.episode)),
            ...presentation('校验剧集', 'read'),
        }),
        defineTool({
            name: 'skill_source_inspect',
            description: '扫描用户在 /skill-create 中明确提供的本地文件或文件夹，只返回受控文件清单和大小；不会读取项目外的其他路径，也不会修改资料。',
            parameters: {
                path: { type: 'string', required: true, description: '用户明确提供的本地绝对路径。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.inspectSkillSourceForSession(session(exec), args.path)),
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
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.readSkillSourceForSession(session(exec), args.path, args.offset, args.limit)),
            ...presentation('读取 Skill 资料', 'read'),
        }),
        defineTool({
            name: 'diagnose_episode',
            description: 'Return signal-channel-A results and mark the episode for optional Agent, Skill, or read-only lens review. Channel B advice never blocks a user decision.',
            parameters: { episode: { type: 'integer', required: true } },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.diagnoseEpisodeForSession(session(exec), args.episode)),
            ...presentation('诊断剧集', 'read'),
        }),
        defineTool({
            name: 'commit_episode',
            description: 'After the user chooses the direction, validate and atomically commit the current Session-local episode draft as a formal version.',
            parameters: {
                ...mutationParameters,
                episode: { type: 'integer', required: true },
                continuity: {
                    type: 'object',
                    required: true,
                    additionalProperties: false,
                    properties: {
                        endingState: { type: 'string', required: true },
                        openLoops: { type: 'array', required: true, items: { type: 'string' } },
                        characterStates: { type: 'object', additionalProperties: true },
                        relationshipStates: { type: 'object', additionalProperties: true },
                        activeObjects: { type: 'object', additionalProperties: true },
                    },
                },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.commitEpisodeForSession(session(exec), args.expectedRevision, args.operationId, args.episode, args.continuity)),
            ...presentation('提交正式剧集'),
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
                return toJson(await ctx.screenplayProjects.readSkillReferenceForSession(current.session, args.skill, args.path, scope));
            },
            ...presentation('读取 Skill 参考', 'read'),
        }),
        defineTool({
            name: 'screenplay_list_references',
            description: '列出当前剧本项目已上传的参考文件元数据。不返回路径或文件内容。',
            parameters: {},
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (_args, exec) => toJson(await ctx.screenplayProjects.listReferencesForSession(session(exec))),
            ...presentation('列出参考文件', 'read'),
        }),
        defineTool({
            name: 'screenplay_get_reference_structure',
            description: '仅读取指定参考文件的页码、标题和段落结构，用于请用户选择参考范围；不返回全文。',
            parameters: {
                referenceId: { type: 'string', required: true, description: '由 screenplay_list_references 返回的参考文件 ID。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.referenceStructureForSession(session(exec), args.referenceId)),
            ...presentation('读取参考文件结构', 'read'),
        }),
        defineTool({
            name: 'screenplay_read_reference_selection',
            description: '读取当前项目参考索引中指定 selectionId 对应的内容。用户在聊天框中说明参考要求；禁止搜索 Workspace。',
            parameters: {
                selectionId: { type: 'string', required: true, description: '由当前项目参考上下文或 screenplay_list_references 提供的 selectionId。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.readReferenceSelectionForSession(session(exec), args.selectionId)),
            ...presentation('读取用户选定范围', 'read'),
        }),
        defineTool({
            name: 'screenplay_read_reference_document',
            description: '按页读取当前项目参考索引中的 TXT、Markdown、DOCX 或带文本层 PDF。只返回一页受控文本和分页元数据；不会读取 Workspace 或未授权路径。',
            parameters: {
                referenceId: { type: 'string', required: true, description: '由 screenplay_list_references 返回的参考文件 ID。' },
                page: { type: 'integer', description: '从 1 开始的页码，默认 1。' },
                pageSize: { type: 'integer', description: '每次读取的页数（PDF）或段落数（其他格式），默认分别为 1 或 20，最大 100。' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => toJson(await ctx.screenplayProjects.readDocumentForSession(session(exec), args.referenceId, args.page, args.pageSize)),
            ...presentation('读取文档分页', 'read'),
        }),
        defineTool({
            name: 'screenplay_search_reference_selection',
            description: '仅在用户已选定的参考范围内搜索文字；不会搜索 Workspace 或未授权的文件部分。',
            parameters: {
                selectionId: { type: 'string', required: true },
                query: { type: 'string', required: true },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            isConcurrencySafe: () => true,
            execute: async (args, exec) => {
                const selection = await ctx.screenplayProjects.readReferenceSelectionForSession(session(exec), args.selectionId);
                const query = args.query.trim();
                if (query.length === 0)
                    throw new ScreenplayError('INVALID_INPUT', '搜索内容不能为空');
                const matches = [];
                let offset = 0;
                while (matches.length < 20) {
                    const found = selection.content.indexOf(query, offset);
                    if (found < 0)
                        break;
                    matches.push({ start: found, excerpt: selection.content.slice(Math.max(0, found - 80), found + query.length + 80) });
                    offset = found + query.length;
                }
                return toJson({ selectionId: selection.selectionId, query, matches });
            },
            ...presentation('搜索用户选定范围', 'read'),
        }),
        defineTool({
            name: 'screenplay_create_contract',
            description: 'After discussion and explicit direction confirmation, atomically create the initial screenplay artifact set: creative contract, core setting, one exact-name file per major character, and one combined other-characters file. Each Markdown artifact needs an H1 and at least one H2 facts section; contract and setting H1s contain the project folder name, and each major-character H1 starts with its exact name. No fixed creative methodology or legacy section list is required.',
            parameters: {
                ...mutationParameters,
                confirmation: {
                    type: 'string',
                    required: true,
                    enum: ['确认并创建全部文件'],
                    description: 'Must be the exact option selected by the user in ask_user_question. Never infer or fabricate this value.',
                },
                requirements: requirementsSchema,
                contractContent: { type: 'string', required: true, description: 'Creative-contract Markdown: H1 containing the exact project folder name, followed by at least one H2 section of confirmed project facts.' },
                settingContent: { type: 'string', required: true, description: 'Core-setting Markdown: H1 containing the exact project folder name, followed by at least one H2 section of confirmed setting facts.' },
                mainCharacters: {
                    type: 'array',
                    required: true,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            name: { type: 'string', required: true, description: 'Exact character name, also used as the filename.' },
                            content: { type: 'string', required: true, description: 'Major-character Markdown: H1 starting with the exact character name, followed by at least one H2 facts section.' },
                        },
                    },
                },
                otherCharactersContent: { type: 'string', required: true, description: 'All secondary characters in one Markdown file with an H1 and at least one H2 facts section.' },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                if (args.confirmation !== '确认并创建全部文件') {
                    throw new ScreenplayError('USER_CONFIRMATION_REQUIRED', '必须先通过 ask_user_question 获得用户“确认并创建全部文件”的明确选择');
                }
                const outcome = await ctx.screenplayProjects.createContractForSession(session(exec), parentWorkspace(exec), args.expectedRevision, args.operationId, undefined, args.requirements, {
                    contractContent: args.contractContent,
                    settingContent: args.settingContent,
                    mainCharacters: args.mainCharacters,
                    otherCharactersContent: args.otherCharactersContent,
                });
                return toJson(outcome.result);
            },
            ...presentation('创建短剧项目文件'),
        }),
        defineTool({
            name: 'screenplay_create_outline',
            description: 'After the user discusses and confirms the whole-series direction, write the formal 大纲/full-outline.md file for new projects; legacy projects keep their existing path. Do not ask for a generation confirmation; after the write result, stop and wait for the user’s next instruction.',
            parameters: {
                ...mutationParameters,
                outlineContent: {
                    type: 'string',
                    required: true,
                    description: 'Complete 2-6 paragraph whole-series outline Markdown. Its first H1 must contain the exact project folder name returned by read_project_context; decorative wording such as book-title marks or “全剧大纲” is optional.',
                },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                const outcome = await ctx.screenplayProjects.createOutline(projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.outlineContent);
                return toJson(outcome.result);
            },
            ...presentation('生成正式大纲'),
        }),
        defineTool({
            name: 'screenplay_create_episode_outline_batch',
            description: 'After the formal full outline exists, write exactly the continuous episode range requested by the user, or exactly the count selected through ask_user_question when the user did not specify a range. Never infer, expand, or replace the user’s range with the default batch. The batch is written into the formal 分集大纲/episode-outlines.md file for new projects; legacy projects keep their existing path. Later batches update the same formal file. Do not ask for a generation confirmation; after the write result, stop and wait for the user’s next instruction.',
            parameters: {
                ...mutationParameters,
                startEpisode: { type: 'integer', required: true, description: 'The next ungenerated episode number, determined by the runtime and the user’s explicit range.' },
                endEpisode: { type: 'integer', required: true, description: 'The end of exactly the user-requested or user-selected continuous batch; at most 10 episodes. Never silently change it to a default range.' },
                outlineContent: {
                    type: 'string',
                    description: 'Legacy compatibility only: if the formal outline file does not yet exist, the first batch may include the 2-6 paragraph whole-series outline. The normal flow calls screenplay_create_outline first and omits this field.',
                },
                episodeOutlinesContent: {
                    type: 'string',
                    required: true,
                    description: 'Image-format Markdown for exactly the requested continuous range. The canonical title uses the exact project folder name and confirmed total episode count (《project folder name》前 totalEpisodes 集大纲); that number is not the batch size. Include the image header and all six fields for every episode in this batch.',
                },
                forecastContent: {
                    type: 'string',
                    description: 'Required only in the final batch: the complete “后续主线预告” Markdown content.',
                },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                const outcome = await ctx.screenplayProjects.createEpisodeOutlineBatch(projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, {
                    startEpisode: args.startEpisode,
                    endEpisode: args.endEpisode,
                    ...(args.outlineContent === undefined ? {} : { outlineContent: args.outlineContent }),
                    episodeOutlinesContent: args.episodeOutlinesContent,
                    ...(args.forecastContent === undefined ? {} : { forecastContent: args.forecastContent }),
                });
                return toJson(outcome.result);
            },
            ...presentation('生成本批集纲'),
        }),
        defineTool({
            name: 'screenplay_merge_delivery',
            description: 'Only when the user explicitly requests final delivery, validate every completed formal episode and merge them in order into 交付/<project folder name>.md for new projects; legacy projects keep their existing path. This is a formal delivery file, not a draft or approval artifact.',
            parameters: { ...mutationParameters },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                const outcome = await ctx.screenplayProjects.mergeDelivery(projectWorkspace(ctx, exec), args.expectedRevision, args.operationId);
                return toJson(outcome.result);
            },
            ...presentation('合并正式剧本交付文件'),
        }),
        defineTool({
            name: 'screenplay_prepare_change',
            description: 'Apply only the files and sections the user explicitly asked to modify, including an explicit major-character rename through renameTo, then hold the result for the immediate 保存修改/不保存 choice. This is one user-facing action, not a staging, validation, Diff, or approval pipeline.',
            parameters: {
                ...mutationParameters,
                changes: {
                    type: 'array',
                    required: true,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            path: { type: 'string', description: 'Exact existing project-relative Markdown path.' },
                            renameTo: {
                                type: 'string',
                                description: 'New exact name for an explicitly renamed major character. Omit for an in-place content edit.',
                            },
                            content: { type: 'string', description: 'Complete updated content for this file.' },
                        },
                    },
                },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                const outcome = await ctx.screenplayProjects.prepareChange(projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.changes);
                return toJson(outcome.result);
            },
            ...presentation('准备指定修改'),
        }),
        defineTool({
            name: 'screenplay_save_change',
            description: 'Save the pending explicit modification as a complete new artifact-set version only after the user chooses 保存修改.',
            parameters: {
                ...mutationParameters,
                changeId: { type: 'string', required: true },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                const outcome = await ctx.screenplayProjects.saveChange(projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.changeId);
                return toJson(outcome.result);
            },
            ...presentation('保存修改'),
        }),
        defineTool({
            name: 'screenplay_discard_change',
            description: 'Discard the pending explicit modification after the user chooses 不保存. Formal files and version history remain unchanged.',
            parameters: {
                ...mutationParameters,
                changeId: { type: 'string', required: true },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                const outcome = await ctx.screenplayProjects.discardChange(projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.changeId);
                return toJson(outcome.result);
            },
            ...presentation('不保存修改'),
        }),
        defineTool({
            name: 'screenplay_restore_version',
            description: 'Restore the complete contract, setting, and character artifact set from a historical version when the user explicitly requests it.',
            parameters: {
                ...mutationParameters,
                sourceVersionId: { type: 'string', required: true },
            },
            output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
            execute: async (args, exec) => {
                const outcome = await ctx.screenplayProjects.restoreVersion(projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.sourceVersionId);
                return toJson(outcome.result);
            },
            ...presentation('恢复短剧项目版本'),
        }),
    ];
    return definitions.map((definition) => {
        const execute = definition.execute.bind(definition);
        return {
            ...definition,
            async execute(args, exec) {
                try {
                    return await execute(args, exec);
                }
                catch (error) {
                    throw screenplayToolError(error);
                }
            },
        };
    });
}
