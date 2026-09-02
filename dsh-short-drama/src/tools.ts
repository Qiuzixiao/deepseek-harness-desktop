import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { JsonValue, Session } from '@deepseek-ai/dsh-session'
import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import { screenplayToolError, ScreenplayError } from './errors.js'
import type {
  CreateEpisodeOutlineBatchInput,
  CreateEpisodeScreenplayInput,
  CreateScreenplayArtifactsInput,
  RequirementsChanges,
} from './types.js'

const mutationParameters = {
  expectedRevision: {
    type: 'integer',
    description: 'Optional. The system uses the current project revision when omitted.',
  },
  operationId: {
    type: 'string',
    description: 'Optional. The system generates an idempotency key when omitted.',
  },
} as const

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function text(value: JsonValue): Array<{ type: 'text', text: string }> {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

function session(exec: ToolRunContext): Session {
  return agent(exec).session
}

function agent(exec: ToolRunContext): NonNullable<ToolRunContext['agent']> {
  const current = exec.agent
  if (current === undefined) {
    throw new ScreenplayError('INVALID_WORKSPACE', 'screenplay tools require a Session attached to a Workspace')
  }
  return current
}

async function mutationArgs(ctx: Context, exec: ToolRunContext, args: Record<string, unknown>): Promise<{ expectedRevision: number, operationId: string }> {
  const snapshot = await ctx.screenplayProjects.readProjectContextForSession(session(exec))
  const expectedRevision = typeof args.expectedRevision === 'number' ? args.expectedRevision : snapshot.revision
  const operationId = typeof args.operationId === 'string' && args.operationId.trim().length >= 8
    ? args.operationId
    : randomUUID()
  return { expectedRevision, operationId }
}

function projectWorkspace(ctx: Context, exec: ToolRunContext): string {
  const projectRoot = ctx.screenplayProjects.projectRootForSession(session(exec))
  if (projectRoot === undefined) {
    throw new ScreenplayError(
      'INVALID_WORKSPACE',
      'no screenplay project is bound to this session; discuss and confirm the project before creating it',
    )
  }
  return projectRoot
}

function parentWorkspace(exec: ToolRunContext): string {
  const cwd = session(exec).header.cwd
  if (cwd === undefined) {
    throw new ScreenplayError('INVALID_WORKSPACE', 'screenplay project creation requires a Session Workspace')
  }
  return cwd
}

function presentation(title: string, kind: 'read' | 'edit' = 'edit') {
  return {
    presentCall: () => ({ card: 'generic' as const, title, kind }),
    presentResult: () => ({ card: 'generic' as const, title: `${title}完成` }),
  }
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
} as const

export function screenplayToolDefinitions(ctx: Context): ToolDefinition[] {
  const definitions: ToolDefinition[] = [
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
      description: 'Read one project-relative formal artifact from the current project.',
      parameters: {
        path: { type: 'string', required: true, description: 'Project-relative artifact path.' },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      isConcurrencySafe: () => true,
      execute: async (args, exec) => toJson(await ctx.screenplayProjects.readArtifactForSession(session(exec), args.path as string)),
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
      execute: async (args, exec) => toJson(await ctx.screenplayProjects.searchProjectForSession(session(exec), args.query as string)),
      ...presentation('搜索项目文件', 'read'),
    }),
    defineTool({
      name: 'write_episode',
      description: 'Write one complete episode directly to the formal project screenplay file. The file is immediately visible to the user; no Session draft, confirmation, or automatic validation is used.',
      parameters: {
        ...mutationParameters,
        episode: { type: 'integer', required: true },
        episodeContent: { type: 'string', required: true, description: 'Complete Markdown content of the episode.' },
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
      execute: async (args, exec) => {
        const mutation = await mutationArgs(ctx, exec, args)
        return toJson(await ctx.screenplayProjects.writeEpisodeForSession(
          session(exec), mutation.expectedRevision, mutation.operationId, args.episode as number,
          args.episodeContent as string, args.continuity as CreateEpisodeScreenplayInput['continuity'],
        ))
      },
      ...presentation('写入正式剧集'),
    }),
    defineTool({
      name: 'validate_episode',
      description: 'Optionally run signal-channel-A mechanical validation against a formal episode.',
      parameters: { episode: { type: 'integer', required: true } },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      isConcurrencySafe: () => true,
      execute: async (args, exec) => toJson(await ctx.screenplayProjects.validateEpisodeForSession(session(exec), args.episode as number)),
      ...presentation('校验剧集', 'read'),
    }),
    defineTool({
      name: 'diagnose_episode',
      description: 'Return signal-channel-A results and mark the episode for optional Agent, Skill, or read-only lens review. Channel B advice never blocks a user decision.',
      parameters: { episode: { type: 'integer', required: true } },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      isConcurrencySafe: () => true,
      execute: async (args, exec) => toJson(await ctx.screenplayProjects.diagnoseEpisodeForSession(session(exec), args.episode as number)),
      ...presentation('诊断剧集', 'read'),
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
      execute: async (args, exec) => toJson(await ctx.screenplayProjects.readDocumentForSession(
        session(exec), args.referenceId as string, args.page as number | undefined, args.pageSize as number | undefined,
      )),
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
        const selection = await ctx.screenplayProjects.readReferenceSelectionForSession(session(exec), args.selectionId)
        const query = args.query.trim()
        if (query.length === 0) throw new ScreenplayError('INVALID_INPUT', '搜索内容不能为空')
        const matches: Array<{ start: number, excerpt: string }> = []
        let offset = 0
        while (matches.length < 20) {
          const found = selection.content.indexOf(query, offset)
          if (found < 0) break
          matches.push({ start: found, excerpt: selection.content.slice(Math.max(0, found - 80), found + query.length + 80) })
          offset = found + query.length
        }
        return toJson({ selectionId: selection.selectionId, query, matches })
      },
      ...presentation('搜索用户选定范围', 'read'),
    }),
    defineTool({
      name: 'screenplay_create_contract',
      description: 'When the user directs the project setup, atomically create the initial screenplay artifact set: creative contract, core setting, one exact-name file per major character, and one combined other-characters file. Each Markdown artifact needs an H1 and at least one H2 facts section; contract and setting H1s contain the project folder name, and each major-character H1 starts with the formal character name (a nickname or role label may follow). No separate confirmation token or fixed creative methodology is required.',
      parameters: {
        ...mutationParameters,
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
              content: { type: 'string', required: true, description: 'Major-character Markdown: H1 starting with the formal character name; a nickname or role label may follow, followed by at least one H2 facts section.' },
            },
          },
        },
        otherCharactersContent: { type: 'string', required: true, description: 'All secondary characters in one Markdown file with an H1 and at least one H2 facts section.' },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        const mutation = await mutationArgs(ctx, exec, args)
        const outcome = await ctx.screenplayProjects.createContractForSession(
          session(exec),
          parentWorkspace(exec),
          mutation.expectedRevision,
          mutation.operationId,
          undefined,
          args.requirements as RequirementsChanges,
          {
            contractContent: args.contractContent,
            settingContent: args.settingContent,
            mainCharacters: args.mainCharacters,
            otherCharactersContent: args.otherCharactersContent,
          } as CreateScreenplayArtifactsInput,
        )
        return toJson(outcome.result)
      },
      ...presentation('创建短剧项目文件'),
    }),
    defineTool({
      name: 'screenplay_create_outline',
      description: 'After the user discusses and confirms the whole-series direction, write the formal 大纲/总纲.md file for new projects; legacy projects keep their existing path. Do not ask for a generation confirmation; after the write result, stop and wait for the user’s next instruction.',
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
        const mutation = await mutationArgs(ctx, exec, args)
        const outcome = await ctx.screenplayProjects.createOutline(
          projectWorkspace(ctx, exec),
          mutation.expectedRevision,
          mutation.operationId,
          args.outlineContent,
        )
        return toJson(outcome.result)
      },
      ...presentation('生成正式大纲'),
    }),
    defineTool({
      name: 'screenplay_create_episode_outline_batch',
      description: 'After the formal full outline exists, write exactly the continuous episode range requested by the user, or exactly the count selected through ask_user_question when the user did not specify a range. Never infer, expand, or replace the user’s range with the default batch. The batch is written into the formal 分集大纲/分集大纲.md file for new projects; legacy projects keep their existing path. Later batches update the same formal file. Do not ask for a generation confirmation; after the write result, stop and wait for the user’s next instruction.',
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
          description: 'Markdown for exactly the requested continuous range. Use either the legacy image-format fields or the compact form `### 第N集` (an optional subtitle is fine), `导语：...`, and one complete third-person story paragraph per episode. Common list/bold decoration around 导语 is accepted. The title should contain the exact project folder name; do not treat a batch-size number as the total episode count.',
        },
        forecastContent: {
          type: 'string',
          description: 'Required only in the final batch: the complete “后续主线预告” Markdown content.',
        },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        const mutation = await mutationArgs(ctx, exec, args)
        const outcome = await ctx.screenplayProjects.createEpisodeOutlineBatch(
          projectWorkspace(ctx, exec),
          mutation.expectedRevision,
          mutation.operationId,
          {
            startEpisode: args.startEpisode,
            endEpisode: args.endEpisode,
            ...(args.outlineContent === undefined ? {} : { outlineContent: args.outlineContent }),
            episodeOutlinesContent: args.episodeOutlinesContent,
            ...(args.forecastContent === undefined ? {} : { forecastContent: args.forecastContent }),
          } as CreateEpisodeOutlineBatchInput,
        )
        return toJson(outcome.result)
      },
      ...presentation('生成本批集纲'),
    }),
    defineTool({
      name: 'screenplay_merge_delivery',
      description: 'Only when the user explicitly requests final delivery, validate every completed formal episode and merge them in order into 交付/<project folder name>.md for new projects; legacy projects keep their existing path. This is a formal delivery file, not a draft or approval artifact.',
      parameters: { ...mutationParameters },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        const mutation = await mutationArgs(ctx, exec, args)
        const outcome = await ctx.screenplayProjects.mergeDelivery(
          projectWorkspace(ctx, exec), mutation.expectedRevision, mutation.operationId,
        )
        return toJson(outcome.result)
      },
      ...presentation('合并正式剧本交付文件'),
    }),
    defineTool({
      name: 'screenplay_edit_file',
      description: 'Modify one existing project file and save it immediately as a new formal version. The system keeps the previous version for recovery; there is no draft or save/discard step.',
      parameters: {
        ...mutationParameters,
        path: { type: 'string', required: true, description: 'Exact existing project-relative Markdown path.' },
        renameTo: {
          type: 'string',
          description: 'New exact name for an explicitly renamed major character. Omit for an in-place content edit.',
        },
        content: { type: 'string', required: true, description: 'Complete updated content for this file.' },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        const mutation = await mutationArgs(ctx, exec, args)
        const outcome = await ctx.screenplayProjects.editFile(
          projectWorkspace(ctx, exec), mutation.expectedRevision, mutation.operationId,
          { path: args.path as string, content: args.content as string, ...(args.renameTo === undefined ? {} : { renameTo: args.renameTo as string }) },
        )
        return toJson(outcome.result)
      },
      ...presentation('直接修改文件'),
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
        const mutation = await mutationArgs(ctx, exec, args)
        const outcome = await ctx.screenplayProjects.restoreVersion(
          projectWorkspace(ctx, exec), mutation.expectedRevision, mutation.operationId, args.sourceVersionId,
        )
        return toJson(outcome.result)
      },
      ...presentation('恢复短剧项目版本'),
    }),
  ]
  return definitions.map((definition): ToolDefinition => {
    const execute = definition.execute.bind(definition)
    return {
      ...definition,
      async execute(args, exec) {
        try {
          return await execute(args, exec)
        } catch (error: unknown) {
          throw screenplayToolError(error)
        }
      },
    }
  })
}
