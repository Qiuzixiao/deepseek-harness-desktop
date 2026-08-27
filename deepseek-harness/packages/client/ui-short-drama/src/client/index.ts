/**
 * Zenwit product shell, browser half: one register() call shadows the shipped
 * AppFrame in the runtime's built-in 'root' slot (priority -1, rank ascending,
 * lowest renders) and seats ZenwitFrame as the product frame.
 *
 * ZenwitFrame owns both surface states: no current session renders the home
 * project library; a current session renders the three-pane screenplay
 * workspace (structure tree | editor | AI chat).
 */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-remotes/client'
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import type {} from '@deepseek-ai/dsh-screenplay-project-library/remote'
import { ZenwitFrame } from './ZenwitFrame.tsx'
import { registerProjectFileSource } from './project-file-source.ts'

// The product frame owns the two runtime children it renders. Their SlotMap
// contracts come from ui-layout's type-only client import above; only the
// runtime declaration below lives in this product shell.

/** Required services (cordis fiber inject — the loader passes all module exports as an object plugin). */
// ui-conversation now injects on the 'conversation' slot (order-independent).
export const inject = ['slots', 'inputTriggers', 'sessions', 'conversation']

/**
 * Demo fallback rows used while the running desktop has not yet mounted the
 * projectLibrary Remote (the api-remotes assembly that mounts it ships later).
 */
const DEMO_PROJECTS: ProjectSummary[] = [
  { name: '外卖员的千万现金', path: 'demo-1', layout: 'zh-CN-v1', phase: 'Ready', revision: 3, updatedAt: Date.now(), hasContract: true, writing: { completed: 3, total: 24 } },
  { name: '重生之我是外卖骑手', path: 'demo-2', layout: 'zh-CN-v1', phase: 'Intake', revision: 0, updatedAt: Date.now() - 86400000, hasContract: false },
]

/**
 * Client plugin body: register ZenwitFrame into 'root' with a lower shadow
 * priority than the shipped AppFrame (default 0), replacing the whole shell,
 * and inject the project-library read/write faces (falling back to demo data
 * when the running desktop has not mounted the Remote yet).
 * @param ctx - client root context.
 */
const PROJECT_LIBRARY_API = '/api/desktop/projects'

export function apply(ctx: ClientContext): void {
  ctx.effect(() => registerProjectFileSource(ctx), 'ui-short-drama: @ project-file source')
  ctx.effect(() => {
    const source: InputTriggerSource = {
      trigger: '@', name: 'local-selection', order: -1,
      candidates: async () => [],
      onPick: () => undefined,
      codec: {
        clipboardText: () => '选中文本',
        async serialize(ref) {
          const value = JSON.parse(ref) as { text?: unknown }
          if (typeof value.text !== 'string') throw new Error('局部选区引用无效')
          return value.text
        },
      },
    }
    return (ctx as unknown as { get: (name: string) => { registerSource(source: InputTriggerSource): () => void } }).get('inputTriggers').registerSource(source)
  }, 'ui-short-drama: local selection reference source')
  // The DSH Desktop serves a private loopback project-library API; when it is
  // absent (e.g. an unpatched installed desktop) the faces fall back to demo data.
  const list = async (): Promise<ProjectSummary[]> => {
    try {
      const res = await fetch(PROJECT_LIBRARY_API)
      if (!res.ok) return DEMO_PROJECTS
      const body = await res.json() as { projects?: ProjectSummary[] }
      return body.projects ?? []
    } catch {
      return DEMO_PROJECTS
    }
  }
  const create = async (name: string): Promise<ProjectSummary> => {
    try {
      const res = await fetch(PROJECT_LIBRARY_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) })
      if (!res.ok) throw new Error('projectLibrary.create failed: ' + res.status)
      const body = await res.json() as { project: ProjectSummary }
      return body.project
    } catch {
      return { name, path: 'demo-' + name, layout: 'zh-CN-v1', phase: 'Intake', revision: 0, updatedAt: Date.now(), hasContract: false }
    }
  }
  // Open a project: register its directory as a Workspace and connect its
  // blank/reusable session, so ZenwitFrame flips to the three-pane workspace.
  const openProject = async (projectPath: string): Promise<void> => {
    const workspaces = (ctx as unknown as { get: (name: string) => {
      create(input: { path: string }): Promise<{ workspaceId: string }>
      connectWorkspace(workspaceId: string): Promise<unknown>
    } }).get('workspaces')
    const sessions = (ctx as unknown as { get: (name: string) => {
      open(id: string): void
      list: {
        getSnapshot(): { ids: string[], byId: Record<string, { id: string, cwd?: string, blank?: boolean, updatedAt?: number, agentPreset?: string }>, phase: string }
        subscribe(fn: () => void): () => void
      }
    } }).get('sessions')
    // The list starts 'pending' until the host baseline lands; scanning it
    // before then always finds nothing and misreads "not yet loaded" as "no
    // prior session", silently opening a fresh one over the project's real
    // history. Wait for 'ready' once, the same subscribe-and-recheck idiom
    // startInitialSelection uses, before doing any reuse scan below.
    if (sessions.list.getSnapshot().phase !== 'ready') {
      await new Promise<void>((resolve) => {
        const unsubscribe = sessions.list.subscribe(() => {
          if (sessions.list.getSnapshot().phase !== 'ready') return
          unsubscribe()
          resolve()
        })
      })
    }
    // create is idempotent; retry the whole sequence while the workspace list
    // snapshot or the renderer-host connection catch up.
    let lastError: unknown
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const view = await workspaces.create({ path: projectPath })
        if (typeof view.workspaceId !== 'string' || view.workspaceId.length === 0) {
          throw new Error('workspaces.create 未返回 workspaceId')
        }
        // Reuse the project's bound screenplay session (cwd === projectPath). Zenwit
        // is a screenplay product, so ONLY a session that actually ran the
        // screenplay agent (screenplay-v1) is reusable: a legacy 'standard'
        // session carries no DLKJB instruction and would silently regress the
        // output format, so it is never reused. Among screenplay-v1 sessions we
        // prefer one with a real conversation (non-blank), newest among them;
        // if none exists, the connectWorkspace fall-through creates one from the
        // deployment's default preset (screenplay-v1).
        const list = sessions.list.getSnapshot()
        let best: { id: string, blank?: boolean, updatedAt?: number, agentPreset?: string } | undefined
        for (const id of list.ids) {
          const summary = list.byId[id]
          if (summary === undefined || summary.cwd !== projectPath) continue
          if (summary.agentPreset !== 'screenplay-v1') continue
          if (best === undefined) { best = summary; continue }
          if (summary.blank === false && best.blank !== false) { best = summary; continue }
          if (summary.blank === true && best.blank === false) continue
          if ((summary.updatedAt ?? 0) > (best.updatedAt ?? 0)) best = summary
        }
        if (best !== undefined) {
          sessions.open(best.id)
          return
        }
        const connected = await workspaces.connectWorkspace(view.workspaceId)
        if (typeof connected !== 'string' || connected.length === 0) {
          throw new Error('connectWorkspace 未返回 sessionId: ' + JSON.stringify(connected))
        }
        // connectWorkspace creates/reuses the session but does NOT select it;
        // selecting it is what flips ZenwitFrame to the workspace surface.
        sessions.open(connected)
        return
      } catch (error) {
        lastError = error
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  const closeProject = (): Promise<void> => {
    const sessions = (ctx as unknown as { get: (name: string) => { clear(): void } }).get('sessions')
    sessions.clear()
    return Promise.resolve()
  }

  // Switch the current session without leaving the workspace surface, so the
  // history list (Workspace.tsx) can reopen a past session for this project.
  const openSession = (id: string): void => {
    const sessions = (ctx as unknown as { get: (name: string) => { open(id: string): void } }).get('sessions')
    sessions.open(id)
  }

  const startSession = (workspaceId: string): void => {
    const workspaces = (ctx as unknown as { get: (name: string) => { startSession(id: string): void } }).get('workspaces')
    workspaces.startSession(workspaceId)
  }

  /** Put an explicit local-edit context into a session draft without submitting it. */
  const addSelectionToConversation = async (target: 'current' | 'new', context: string): Promise<void> => {
    const sessions = ctx.sessions
    const workspaces = (ctx as unknown as { get: (name: string) => {
      list: { getSnapshot(): { items: Array<{ workspaceId: WorkspaceId, sessionIds: readonly SessionId[] }> } }
    } }).get('workspaces')
    const conversation = (ctx as unknown as { get: (name: string) => {
      input: { for(scope: ClientContext): { state: { getSnapshot(): { draft: string } }, setDraft(text: string): void, appendReference(reference: { source: string, ref: string, label: string, clipboardText: string, title?: string }): void } }
    } }).get('conversation')
    const current = sessions.list.getSnapshot().current
    const workspace = workspaces.list.getSnapshot().items.find(item => current !== undefined && item.sessionIds.includes(current))
    const id = target === 'current'
      ? current
      : workspace === undefined ? undefined : await sessions.create({ workspaceId: workspace.workspaceId })
    if (id === undefined) throw new Error('没有可用对话可添加选中文本')
    const scope = sessions.scope(id)
    if (scope === undefined) throw new Error('新对话尚未就绪')
    const input = conversation.input.for(scope)
    const draft = input.state.getSnapshot().draft
    if (draft !== '') input.setDraft(draft + '\n')
    input.appendReference({ source: 'local-selection', ref: JSON.stringify({ text: context }), label: '选中文本', clipboardText: '选中文本', title: context })
    if (target === 'new') sessions.open(id)
  }

  ctx.effect(() => {
    const dispose = ctx.slots.register({
      name: 'root',
      priority: -1,
      children: {
        'sidebar': { kind: 'single', scope: 'root' },
        'conversation': { kind: 'single', scope: 'session-maybe' },
      },
      inject: () => ({
        list,
        create,
        openProject,
        openSession,
        startSession,
        addSelectionToConversation,
        closeProject,
      }),
    }, ZenwitFrame)
    return () => {
      dispose()
    }
  }, 'ui-short-drama: Zenwit root registration')
}
