import type { Context } from '@deepseek-ai/cordis'
import type { JsonValue, Session } from '@deepseek-ai/dsh-session'
import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import { ScreenplayError } from './errors.js'
import type {
  CreateEpisodeOutlineBatchInput,
  CreateEpisodeScreenplayInput,
  CreateScreenplayArtifactsInput,
  RequirementsChanges,
  ScreenplayChangeInput,
} from './types.js'

const mutationParameters = {
  expectedRevision: {
    type: 'integer',
    required: true,
    description: 'Latest project revision returned by screenplay_get_state or the prior mutation.',
  },
  operationId: {
    type: 'string',
    required: true,
    description: 'Unique idempotency key. Reuse it only when retrying the same uncertain operation.',
  },
} as const

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function text(value: JsonValue): Array<{ type: 'text', text: string }> {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

function session(exec: ToolRunContext): Session {
  const current = exec.agent?.session
  if (current === undefined) {
    throw new ScreenplayError('INVALID_WORKSPACE', 'screenplay tools require a Session attached to a Workspace')
  }
  return current
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
    genre: { type: 'string' },
    audience: { type: 'string' },
    episodeCount: { type: 'integer' },
    episodeDurationSeconds: {
      type: 'integer',
      description: '用户选择的单集成片秒数。标准预估：90 秒约 1200-1500 字，60 秒约 800-1200 字，120 秒约 1200-1800 字。',
    },
    premise: { type: 'string' },
    endingDirection: { type: 'string' },
    constraints: { type: 'array', items: { type: 'string' } },
  },
} as const

export function screenplayToolDefinitions(ctx: Context): ToolDefinition[] {
  return [
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
      name: 'screenplay_get_state',
      description: 'Read authoritative screenplay state only when resuming, modifying, restoring, or preparing a stateful write. Do not call it merely to analyze fresh user-supplied material.',
      parameters: {
        view: {
          type: 'string',
          enum: ['summary', 'artifacts', 'full'],
          description: 'summary is compact; artifacts includes all current formal Markdown contents.',
          default: 'summary',
        },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      isConcurrencySafe: () => true,
      execute: async (args, exec) => {
        const snapshot = await ctx.screenplayProjects.snapshotForSession(session(exec), args.view ?? 'summary')
        return toJson(snapshot)
      },
      ...presentation('读取短剧项目状态', 'read'),
    }),
    defineTool({
      name: 'screenplay_diagnose',
      description: 'Run the 70-item revision checklist diagnosis over the current formal artifacts: mechanical checks (forbidden terms, abstract action lines, episode length vs the selected duration tier, front-heavy trend, empty episode-outline fields, pending character fields, open continuity loops, writing progress) plus a methodology checklist requiring model judgment (four-act beat progression, protagonist engine, antagonist pressure line, neutral-event mirror, supporting-cast function, opening hook, suspense/information gap, reversal recovery, cliffhanger, dialogue knowledge boundary, foreshadowing recovery, deliverable sell point). Use it before modifications, before delivery, or when the user asks for a script diagnosis. Returns issues, checklist, and counts; the Agent turns it into prioritized revision advice.',
      parameters: {},
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      isConcurrencySafe: () => true,
      execute: async (_args, exec) => toJson(await ctx.screenplayProjects.diagnose(projectWorkspace(ctx, exec))),
      ...presentation('短剧项目诊断（70 项清单）', 'read'),
    }),
    defineTool({
      name: 'screenplay_create_contract',
      description: 'After discussion and explicit direction confirmation, create the whole initial screenplay artifact set in one operation: creative contract, core setting, one exact-name file per major character, and one combined other-characters file. No approval or intermediate draft flow is used.',
      parameters: {
        ...mutationParameters,
        confirmation: {
          type: 'string',
          required: true,
          enum: ['确认并创建全部文件'],
          description: 'Must be the exact option selected by the user in ask_user_question. Never infer or fabricate this value.',
        },
        requirements: requirementsSchema,
        contractContent: { type: 'string', required: true, description: 'Complete creative-contract Markdown.' },
        settingContent: { type: 'string', required: true, description: 'Complete core-setting Markdown.' },
        mainCharacters: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string', description: 'Exact character name, also used as the filename.' },
              content: { type: 'string', description: 'Complete major-character Markdown.' },
            },
          },
        },
        otherCharactersContent: { type: 'string', required: true, description: 'All secondary characters in one Markdown file.' },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        if (args.confirmation !== '确认并创建全部文件') {
          throw new ScreenplayError(
            'USER_CONFIRMATION_REQUIRED',
            '必须先通过 ask_user_question 获得用户“确认并创建全部文件”的明确选择',
          )
        }
        const outcome = await ctx.screenplayProjects.createContractForSession(
          session(exec),
          parentWorkspace(exec),
          args.expectedRevision,
          args.operationId,
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
      description: 'After the user discusses and confirms the whole-series direction, write the formal 大纲/full-outline.md file for new projects; legacy projects keep their existing path. Do not ask for a generation confirmation; after the write result, stop and wait for the user’s next instruction.',
      parameters: {
        ...mutationParameters,
        outlineContent: {
          type: 'string',
          required: true,
          description: 'Complete 2-6 paragraph whole-series outline Markdown titled with the exact project folder name.',
        },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        const outcome = await ctx.screenplayProjects.createOutline(
          projectWorkspace(ctx, exec),
          args.expectedRevision,
          args.operationId,
          args.outlineContent,
        )
        return toJson(outcome.result)
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
        const outcome = await ctx.screenplayProjects.createEpisodeOutlineBatch(
          projectWorkspace(ctx, exec),
          args.expectedRevision,
          args.operationId,
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
      name: 'screenplay_get_writing_context',
      description: 'Read the current formal screenplay writing context: the next episode outline, the previous formal episode, continuity state, and the existing formal Markdown artifacts. This is the only context read needed to continue screenplay writing; do not search the Workspace.',
      parameters: {},
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      isConcurrencySafe: () => true,
      execute: async (_args, exec) => {
        const result = await ctx.screenplayProjects.writingContext(projectWorkspace(ctx, exec))
        return toJson(result)
      },
      ...presentation('读取正文创作上下文', 'read'),
    }),
    defineTool({
      name: 'screenplay_create_episode',
      description: 'After the user explicitly starts screenplay writing, create exactly the current next episode as a formal Markdown file in 剧本/episode-NNN.md for new projects; legacy projects keep their existing path. The store selects the episode from writing progress; the Agent cannot skip, batch, or pre-generate episodes. The content must follow the generic screenplay format and pass structural and duration checks. On success, stop and wait for the user’s next instruction; there is no approval or draft stage.',
      parameters: {
        ...mutationParameters,
        episodeContent: {
          type: 'string',
          required: true,
          description: 'Complete formal screenplay Markdown for the current next episode only. Use generic scene/action/dialogue/OS/VO/flashback rules; do not add genre-specific templates, shot lists, or author commentary.',
        },
        continuity: {
          type: 'object',
          required: true,
          additionalProperties: false,
          properties: {
            endingState: { type: 'string', description: 'Visible end state and the next episode handoff.' },
            openLoops: { type: 'array', items: { type: 'string' }, description: 'Unresolved questions or consequences that remain open.' },
            characterStates: { type: 'object', additionalProperties: true },
            relationshipStates: { type: 'object', additionalProperties: true },
            activeObjects: { type: 'object', additionalProperties: true },
          },
        },
      },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        const outcome = await ctx.screenplayProjects.createEpisodeScreenplay(
          projectWorkspace(ctx, exec),
          args.expectedRevision,
          args.operationId,
          {
            episodeContent: args.episodeContent as string,
            continuity: args.continuity as unknown as CreateEpisodeScreenplayInput['continuity'],
          } as CreateEpisodeScreenplayInput,
        )
        return toJson(outcome.result)
      },
      ...presentation('生成正式剧本正文'),
    }),
    defineTool({
      name: 'screenplay_merge_delivery',
      description: 'Only when the user explicitly requests final delivery, validate every completed formal episode and merge them in order into 交付/<project folder name>.md for new projects; legacy projects keep their existing path. This is a formal delivery file, not a draft or approval artifact.',
      parameters: { ...mutationParameters },
      output: { schema: { type: 'json' }, render: (_args, value) => text(value) },
      execute: async (args, exec) => {
        const outcome = await ctx.screenplayProjects.mergeDelivery(
          projectWorkspace(ctx, exec), args.expectedRevision, args.operationId,
        )
        return toJson(outcome.result)
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
        const outcome = await ctx.screenplayProjects.prepareChange(
          projectWorkspace(ctx, exec),
          args.expectedRevision,
          args.operationId,
          args.changes as ScreenplayChangeInput[],
        )
        return toJson(outcome.result)
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
        const outcome = await ctx.screenplayProjects.saveChange(
          projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.changeId,
        )
        return toJson(outcome.result)
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
        const outcome = await ctx.screenplayProjects.discardChange(
          projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.changeId,
        )
        return toJson(outcome.result)
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
        const outcome = await ctx.screenplayProjects.restoreVersion(
          projectWorkspace(ctx, exec), args.expectedRevision, args.operationId, args.sourceVersionId,
        )
        return toJson(outcome.result)
      },
      ...presentation('恢复短剧项目版本'),
    }),
  ]
}
