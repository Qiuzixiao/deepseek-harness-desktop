import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import { createStoryProject, resolveProjectRoot, type StoryProjectConfig } from './project.ts'

export const name = 'dsh-product-story-studio'
export const inject = ['connection']

export const Config: Schema<StoryProjectConfig> = Schema.object({
  projectRoot: Schema.string().default('').description('作品统一保存目录；留空时使用“文稿/Story Studio”'),
})

interface RpcSuccess<T> {
  ok: true
  value: T
}

interface RpcFailure {
  ok: false
  error: { code: 'internal'; message: string; details: Record<string, never> }
}

export type StoryStudioRpcHandler = (endpoint: string, payload: unknown) => Promise<RpcSuccess<unknown> | RpcFailure>

function success<T>(value: T): RpcSuccess<T> {
  return { ok: true, value }
}

function failure(error: unknown): RpcFailure {
  return {
    ok: false,
    error: {
      code: 'internal',
      message: error instanceof Error ? error.message : String(error),
      details: {},
    },
  }
}

export function createStoryStudioRpcHandler(config: StoryProjectConfig = {}): StoryStudioRpcHandler {
  return async (endpoint, payload) => {
    try {
      if (endpoint === 'describe') return success({ projectRoot: resolveProjectRoot(config) })
      if (endpoint === 'createProject') {
        const name = typeof payload === 'object' && payload !== null && 'name' in payload
          ? (payload as { name?: unknown }).name
          : undefined
        return success(await createStoryProject(config, name))
      }
      throw new Error(`未知的 Story Studio 操作：${endpoint}`)
    } catch (error: unknown) {
      return failure(error)
    }
  }
}

export function apply(ctx: Context, config: StoryProjectConfig = {}): void {
  ctx.effect(
    () => ctx.connection.rpc.handle('/story-studio', createStoryStudioRpcHandler(config), { authority: 'loopback' }),
    'story-studio: project rpc',
  )
}

export { createStoryProject, normalizeProjectName, projectDirectoryName, resolveProjectRoot } from './project.ts'
export type { CreatedStoryProject, StoryProjectConfig, StoryProjectDescription } from './project.ts'
