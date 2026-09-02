import type { Context } from '@deepseek-ai/cordis'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { PERSONA_ORDER, PERSONA_SECTION } from '@deepseek-ai/dsh-system-prompt'
import type { PostToolDecision, PreToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { realpath } from 'node:fs/promises'
import { isAbsolute, resolve, win32 } from 'node:path'
import { SCREENPLAY_AGENT_PROMPT } from './prompt.js'
import { assertProjectPath, isProjectReadTool, pathArguments } from './project-scope.js'
import { isInsidePath } from './skill-source.js'
import type {} from './service.js'
import { screenplayToolDefinitions } from './tools.js'

export const name = 'screenplay-agent'

export const inject = ['tools', 'systemPrompt', 'screenplayProjects']

const SKILL_SOURCE_TOOLS = new Set(['skill_source_inspect', 'skill_source_read'])
const skillSourceAuthorizations = new WeakMap<Agent, Set<string>>()

export function explicitAbsolutePaths(rawInput: string): string[] {
  const quoted = [...rawInput.matchAll(/["']((?:\/|[A-Za-z]:[\\/]|\\\\)[^"']+)["']/gu)].map(match => match[1])
  const linePaths = rawInput.split(/\r?\n/u).map(line => {
    const start = line.indexOf('/')
    return start < 0 ? undefined : line.slice(start).trim().replace(/[，。！？；：].*$/u, '')
  })
  const unquoted = [...rawInput.matchAll(/(?:^|[\s(])((?:\/|[A-Za-z]:[\\/]|\\\\)[^\s"'<>，。！？；：]+)/gu)].map(match => match[1])
  return [...new Set([...quoted, ...linePaths, ...unquoted]
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.replace(/[，。！？；：]+$/gu, ''))
    .filter(value => value.length > 1 && (isAbsolute(value) || win32.isAbsolute(value))))]
}

/** Arm the Skill-only external source reader with paths explicitly present in /skill-create input. */
export function registerSkillSourceAuthorization(agent: Agent, rawInput: string): void {
  const paths = explicitAbsolutePaths(rawInput)
  skillSourceAuthorizations.set(agent, new Set(paths.map(path => resolve(path))))
}

function clearSkillSourceAuthorization(agent: Agent): void {
  skillSourceAuthorizations.delete(agent)
}

async function assertSkillSourcePath(agent: Agent, candidate: string): Promise<void> {
  if (!isAbsolute(candidate)) throw new Error('Skill 资料路径必须是用户明确提供的绝对路径')
  const roots = skillSourceAuthorizations.get(agent)
  if (roots === undefined || roots.size === 0) {
    throw new Error('请在 /skill-create 命令中明确提供要读取的文件或文件夹路径')
  }
  const target = await realpath(resolve(candidate))
  for (const root of roots) {
    try {
      if (isInsidePath(await realpath(root), target)) return
    } catch {
      // A stale authorized path is rejected below with the same bounded error.
    }
  }
  throw new Error('Skill 资料路径不在用户明确授权的资料范围内')
}

/** User-facing steering text used by the explicit `/skill-create` entrypoint. */
export function skillCreateInstruction(rawInput: string): string {
  const suffix = rawInput.trim()
  return suffix.length === 0
    ? '开始资料创建 Skill 流程：只读取用户明确提供或选择的资料，分类可复用经验与具体项目事实，整理来源、不确定性和适用范围后，直接安装 Skill。'
    : `开始资料创建 Skill 流程。用户补充要求：${suffix}\n只读取用户明确提供或选择的资料，整理来源、不确定性和适用范围后，直接安装 Skill。`
}

function registerSkillCreateCommand(ctx: Context): void {
  ctx.inject(['commands'], commandCtx => {
    const commands = (commandCtx as Context & { commands: { register(definition: {
      name: string
      description: string
      input: { hint: string }
      handler(invocation: { agent: Agent, rawInput: string }): { kind: 'success', text: string }
    }): () => void } }).commands
    commands.register({
      name: 'skill-create',
      description: '创建可复用 Skill',
      input: { hint: '[补充资料范围或适用范围]' },
      handler: ({ agent, rawInput }) => {
        registerSkillSourceAuthorization(agent, rawInput)
        agent.steer(createUserMessage({
          content: [{ type: 'text', text: skillCreateInstruction(rawInput) }],
          source: { kind: 'user' },
        }))
        return { kind: 'success', text: 'Skill 创建流程已启动。请继续提供或选择要分析的资料。' }
      },
    })
  })
}

const GENERIC_MUTATIONS = new Set(['write', 'edit', 'str_replace_editor', 'bash', 'pwsh', 'run_code'])
const VALIDATED_MUTATIONS = new Set([
  'write_scene',
  'commit_episode',
  'screenplay_create_contract',
  'screenplay_create_outline',
  'screenplay_create_episode_outline_batch',
  'screenplay_merge_delivery',
  'screenplay_prepare_change',
  'screenplay_save_change',
  'screenplay_discard_change',
  'screenplay_restore_version',
  'skill_create',
])
const DIAGNOSTIC_TOOLS = new Set([
  'read_project_context',
  'read_artifact',
  'search_project',
  'validate_episode',
  'diagnose_episode',
  'skill_inspect',
])

interface FailureChain {
  tool: string
  signature: string
  count: number
  diagnosticRequired: boolean
}

const LOOP_BREAK_REASON = 'same structural validation failed twice consecutively'

function validationSignature(exec: ToolExecution, result: Readonly<ToolExecutionResult>): string | undefined {
  if (!result.isError || result.error.info?.code !== 'VALIDATION_FAILED' || !VALIDATED_MUTATIONS.has(exec.name)) {
    return undefined
  }
  const summary = result.error.message.split('\n', 1)[0]?.trim()
  return summary === undefined || summary.length === 0 ? undefined : `${exec.name}:${summary}`
}

/** Allow one informed repair, then break argument-guessing loops until the Agent inspects current state. */
export function installScreenplayFailureGuard(ctx: Context): void {
  const chains = new WeakMap<Agent, FailureChain>()

  ctx.on('tools/pre-execute', async (exec: ToolExecution, next): Promise<PreToolDecision> => {
    const current = exec.agent === undefined ? undefined : chains.get(exec.agent)
    if (current?.diagnosticRequired === true && exec.name === current.tool) {
      return {
        kind: 'deny',
        reason: `${LOOP_BREAK_REASON} for ${exec.name}; call read_project_context or another relevant read/diagnostic tool before retrying`,
      }
    }
    return next()
  })

  ctx.on('tools/post-execute', async (exec, result, next): Promise<PostToolDecision> => {
    const downstream = await next()
    if (exec.agent === undefined) return downstream
    const current = chains.get(exec.agent)
    if (current?.diagnosticRequired === true) {
      if (DIAGNOSTIC_TOOLS.has(exec.name) && !result.isError) chains.delete(exec.agent)
      return downstream
    }
    const signature = validationSignature(exec, result)
    if (signature === undefined) {
      chains.delete(exec.agent)
      return downstream
    }
    const count = current?.signature === signature ? current.count + 1 : 1
    const chain: FailureChain = {
      tool: exec.name,
      signature,
      count,
      diagnosticRequired: count >= 2,
    }
    chains.set(exec.agent, chain)
    if (!chain.diagnosticRequired) return downstream

    const reminder = createUserMessage({
      content: [{
        type: 'text',
        text: `${LOOP_BREAK_REASON} for ${exec.name}. Stop changing arguments by trial and error. Read the returned artifact/location/expected/actual/repairHint fields, then call read_project_context or another relevant read/diagnostic tool before one evidence-based retry. Do not ask the user unless a material creative fact is genuinely missing.`,
      }],
      source: { kind: 'plugin', plugin: 'screenplay-agent', form: 'notice', summary: `${exec.name} validation loop` },
    })
    const additionalContexts = [reminder, ...downstream.additionalContexts ?? []]
    return downstream.kind === 'block'
      ? { kind: 'block', feedback: downstream.feedback, additionalContexts }
      : { ...downstream, additionalContexts }
  })

  ctx.on('agent/pre-step', ({ agent, messages }, next): Promise<PreStepDecision> => {
    if (messages.some(message => message.source.kind === 'user')) chains.delete(agent)
    return next()
  })
}

/** Keep generic filesystem reads inside the Session's bound screenplay project. */
export function installScreenplayProjectScopeGuard(ctx: Context): void {
  ctx.on('tools/post-execute', async (exec, result, next): Promise<PostToolDecision> => {
    const downstream = await next()
    if (exec.name === 'skill_create' && exec.agent !== undefined && !result.isError) {
      clearSkillSourceAuthorization(exec.agent)
    }
    return downstream
  })

  ctx.on('tools/pre-execute', async (exec: ToolExecution, next): Promise<PreToolDecision> => {
    if (SKILL_SOURCE_TOOLS.has(exec.name)) {
      if (exec.agent === undefined) return { kind: 'deny', reason: 'Skill 资料读取需要当前 Agent Session' }
      const candidates = typeof exec.arguments === 'object' && exec.arguments !== null
        && typeof (exec.arguments as Record<string, unknown>).path === 'string'
        ? [(exec.arguments as Record<string, string>).path]
        : []
      try {
        if (candidates.length !== 1) throw new Error('Skill 资料读取需要一个文件或文件夹路径')
        await assertSkillSourcePath(exec.agent, candidates[0] as string)
      } catch (error: unknown) {
        return { kind: 'deny', reason: error instanceof Error ? error.message : String(error) }
      }
      return next()
    }
    if (!isProjectReadTool(exec.name)) return next()
    if (exec.agent?.session === undefined) {
      return { kind: 'deny', reason: 'bind a screenplay project before using project-scoped file tools' }
    }
    const projectRoot = ctx.screenplayProjects.projectRootForSession(exec.agent.session)
    if (projectRoot === undefined) {
      return { kind: 'deny', reason: 'bind a screenplay project before using project-scoped file tools' }
    }
    try {
      for (const candidate of pathArguments(exec.name, exec.arguments)) {
        await assertProjectPath(exec.agent.session, projectRoot, candidate, `${exec.name} path`)
      }
    } catch (error: unknown) {
      return { kind: 'deny', reason: error instanceof Error ? error.message : String(error) }
    }
    return next()
  })
}

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
  registerSkillCreateCommand(ctx)
  installScreenplayFailureGuard(ctx)
  ctx.on('tools/pre-execute', async (exec: ToolExecution, next): Promise<PreToolDecision> => {
    if (GENERIC_MUTATIONS.has(exec.name)) {
      return { kind: 'deny', reason: 'short-drama Agent exposes formal writes through domain tools only' }
    }
    return next()
  })
  installScreenplayProjectScopeGuard(ctx)
}
