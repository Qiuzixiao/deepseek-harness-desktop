import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  createStoryProject,
  ensureProjectRoot,
  resolveProjectRoot,
  type StoryProjectConfig,
} from './project.ts'
import * as workbench from './workbench-host.ts'

export const name = 'dsh-product-story-studio'
export const inject = ['connection', 'webServer', 'fs', 'sandboxPolicy', 'sessions', 'settings']

export const QNOVEL_SETTINGS_NAMESPACE = settingsNamespace('qnovel')

export interface QNovelSettings {
  /** User-selected parent directory containing all QNovel works. */
  projectsRoot: string
}

export const QNovelSettingsSchema: Schema<QNovelSettings> = Schema.object({
  projectsRoot: Schema.string().default('').description('QNovel 作品目录；首次启动时必须选择'),
})

export const Config: Schema<StoryProjectConfig> = Schema.object({
  projectRoot: Schema.string().default('').description('兼容用作品目录；QNovel 首次启动后以 qnovel.projectsRoot 为准'),
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

export function createStoryStudioRpcHandler(
  config: StoryProjectConfig = {},
  readConfig: () => StoryProjectConfig = () => config,
): StoryStudioRpcHandler {
  return async (endpoint, payload) => {
    try {
      const currentConfig = readConfig()
      if (endpoint === 'describe') {
        const configured = currentConfig.projectRoot?.trim() ?? ''
        return success({
          projectRoot: configured === '' ? '' : resolveProjectRoot(currentConfig),
          configured: configured !== '',
        })
      }
      if (endpoint === 'validateProjectRoot') {
        const path = typeof payload === 'object' && payload !== null && 'path' in payload
          ? (payload as { path?: unknown }).path
          : undefined
        if (typeof path !== 'string') throw new Error('请选择 QNovel 作品目录')
        return success({ projectRoot: await ensureProjectRoot(path) })
      }
      if (endpoint === 'createProject') {
        const name = typeof payload === 'object' && payload !== null && 'name' in payload
          ? (payload as { name?: unknown }).name
          : undefined
        if ((currentConfig.projectRoot?.trim() ?? '') === '') throw new Error('请先选择 QNovel 作品目录')
        return success(await createStoryProject(currentConfig, name))
      }
      throw new Error(`未知的 Story Studio 操作：${endpoint}`)
    } catch (error: unknown) {
      return failure(error)
    }
  }
}

export function apply(ctx: Context, config: StoryProjectConfig = {}): void {
  const settings = ctx.settings.register(QNOVEL_SETTINGS_NAMESPACE, QNovelSettingsSchema)
  const readConfig = (): StoryProjectConfig => {
    const projectsRoot = settings.get().projectsRoot.trim()
    return projectsRoot === ''
      ? config
      : { projectRoot: projectsRoot }
  }
  workbench.apply(ctx)
  ctx.effect(
    () => ctx.connection.rpc.handle('/story-studio', createStoryStudioRpcHandler(config, readConfig), { authority: 'loopback' }),
    'story-studio: project rpc',
  )
}

export {
  createStoryProject,
  ensureProjectRoot,
  normalizeProjectName,
  projectDirectoryName,
  projectId,
  resolveProjectRoot,
} from './project.ts'
export type { CreatedStoryProject, StoryProjectConfig, StoryProjectDescription } from './project.ts'
