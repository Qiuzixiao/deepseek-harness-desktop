import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import { PERSONA_ORDER, PERSONA_SECTION } from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import { SCREENPLAY_AGENT_PROMPT } from './prompt.js'
import type {} from './service.js'
import { screenplayToolDefinitions } from './tools.js'

export const name = 'screenplay-agent'

export const inject = ['tools', 'systemPrompt', 'screenplayProjects']

const ALLOWED_TOOLS = new Set([
  'ask_user_question',
  'screenplay_get_state',
  'screenplay_diagnose',
  'screenplay_create_contract',
  'screenplay_create_outline',
  'screenplay_create_episode_outline_batch',
  'screenplay_get_writing_context',
  'screenplay_create_episode',
  'screenplay_merge_delivery',
  'screenplay_prepare_change',
  'screenplay_save_change',
  'screenplay_discard_change',
  'screenplay_restore_version',
  'screenplay_list_references',
  'screenplay_get_reference_structure',
  'screenplay_read_reference_selection',
  'screenplay_search_reference_selection',
])

export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: PERSONA_SECTION,
    order: PERSONA_ORDER,
    text: SCREENPLAY_AGENT_PROMPT,
  })
  ctx.systemPrompt.context({
    name: 'screenplay:project-state',
    order: 20,
    text: context => {
      const session = context.agent?.session
      if (session === undefined) return ctx.screenplayProjects.contextSummary(undefined)
      const project = ctx.screenplayProjects.contextSummary(session)
      const references = ctx.screenplayProjects.referenceContextSummaryForSession(session)
      return references.length === 0 ? project : `${project}\n${references}`
    },
  })
  for (const definition of screenplayToolDefinitions(ctx)) ctx.tools.register(definition)
  ctx.tools.guard(exec => ALLOWED_TOOLS.has(exec.name)
    ? undefined
    : 'ScreenplayAgent only accepts the current user input, screenplay state, and ask_user_question; file search and generic tools are disabled.')
}
