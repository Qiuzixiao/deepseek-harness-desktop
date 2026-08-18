import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createRoot } from 'react-dom/client'
import type { ClientContext, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import {
  IconCloseOutline16, IconFolderClose16, IconPlusOutline16, Menu, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { styles } from './styles.ts'
import { StoryStudioWorkbench, workbenchStyles } from './workbench/index.js'
import { StoryStudioRouter } from './StoryStudioRouter.js'
import { storyStudioAppStyles } from './StoryStudioApp.js'

const CHANNEL = '/story-studio'
const CREATE_ID = 'story-studio:create'

interface StoryStudioDescription {
  projectRoot: string
}

interface CreatedProject extends StoryStudioDescription {
  name: string
  path: string
}

interface ProjectService {
  describe(): Promise<StoryStudioDescription>
  create(name: string): Promise<CreatedProject>
  register(project: CreatedProject): Promise<WorkspaceView>
}

type StoryStudioClientContext = ClientContext & { connection: ConnectionHandle }

interface EmptyWorkspaceOwnerProps {
  open: boolean
  anchorRef?: RefObject<HTMLElement>
  selectedId?: WorkspaceId
  onPick: (workspaceId: WorkspaceId) => void
  onClose: () => void
}

interface SidebarFooterActionOwnerProps {
  wide: boolean
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation.hero.workspace': { kind: 'single'; scope: 'root'; owner: EmptyWorkspaceOwnerProps }
    'sidebar.footer.action': { kind: 'list'; scope: 'root'; owner: SidebarFooterActionOwnerProps }
  }
}

type ProjectPickerProps = PropsRuntime<'conversation.hero.workspace'>
type CreateActionProps = PropsRuntime<'sidebar.footer.action'>

declare global {
  interface Window {
    __DSH_WORKBENCH__?: { mount(params: Record<string, unknown>): void }
  }
}

function StoryStudioShellOverlay({ service, onCreated }: {
  service: ProjectService
  onCreated: (workspace: WorkspaceView) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* 旧UI已移除，保留创建项目对话框功能 */}
      <CreateProjectDialog
        open={open}
        service={service}
        onClose={() => { setOpen(false) }}
        onCreated={onCreated}
      />
    </>
  )
}

function installStyles(): () => void {
  const current = document.querySelector<HTMLStyleElement>('style[data-story-studio]')
  const element = current ?? document.createElement('style')
  element.dataset.storyStudio = ''
  element.textContent = styles
  if (current === null) document.head.appendChild(element)

  const wbCurrent = document.querySelector<HTMLStyleElement>('style[data-story-studio-workbench]')
  const wbElement = wbCurrent ?? document.createElement('style')
  wbElement.dataset.storyStudioWorkbench = ''
  wbElement.textContent = workbenchStyles
  if (wbCurrent === null) document.head.appendChild(wbElement)

  const appCurrent = document.querySelector<HTMLStyleElement>('style[data-story-studio-app]')
  const appElement = appCurrent ?? document.createElement('style')
  appElement.dataset.storyStudioApp = ''
  appElement.textContent = storyStudioAppStyles
  if (appCurrent === null) document.head.appendChild(appElement)

  return () => {
    element.remove()
    wbElement.remove()
    appElement.remove()
  }
}

function projectPathWithin(root: string, path: string): boolean {
  const normalize = (value: string): string => value.replace(/\\/gu, '/').replace(/\/+$/gu, '').toLocaleLowerCase()
  const base = normalize(root)
  const target = normalize(path)
  return target === base || target.startsWith(`${base}/`)
}

function CreateProjectDialog({ open, service, onClose, onCreated }: {
  open: boolean
  service: ProjectService
  onClose: () => void
  onCreated: (workspace: WorkspaceView) => void
}) {
  const [name, setName] = useState('')
  const [projectRoot, setProjectRoot] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setError(undefined)
    void service.describe().then(value => { setProjectRoot(value.projectRoot) }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
    window.setTimeout(() => { inputRef.current?.focus() }, 0)
  }, [open, service])

  const submit = useCallback(async () => {
    const title = name.trim()
    if (title === '' || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const project = await service.create(title)
      const workspace = await service.register(project)
      onCreated(workspace)
      onClose()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }, [busy, name, onClose, onCreated, service])

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose() }}
      title="新建作品"
      closeLabel="关闭"
      className="storyStudioDialog"
      headless
    >
      <div className="storyStudioDialogHeader">
        <div className="storyStudioDialogIdentity">
          <span className="storyStudioDialogMark">SS</span>
          <div>
            <h2 className="storyStudioDialogTitle">新建作品</h2>
            <p className="storyStudioDialogSubtitle">从一个名字开始，自动建立完整的创作空间</p>
          </div>
        </div>
        <button
          type="button"
          className="storyStudioDialogClose"
          aria-label="关闭"
          disabled={busy}
          onClick={onClose}
        >
          <IconCloseOutline16 size={16} />
        </button>
      </div>

      <div className="storyStudioDialogBody">
        <div className="storyStudioForm">
          <label className="storyStudioField">
            <span className="storyStudioLabel">作品名称</span>
            <input
              ref={inputRef}
              className="storyStudioInput"
              value={name}
              maxLength={80}
              placeholder="例如：父子同心"
              disabled={busy}
              onChange={event => { setName(event.target.value) }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submit()
                }
              }}
            />
            <span className="storyStudioFieldHint">之后可以在项目中继续调整剧名和创作方向</span>
          </label>

          <div className="storyStudioLocation">
            <div className="storyStudioLocationIcon"><IconFolderClose16 size={18} /></div>
            <div className="storyStudioLocationText">
              <span className="storyStudioLocationLabel">保存位置</span>
              <span className="storyStudioLocationPath">
                {projectRoot === '' ? '正在读取作品保存位置...' : projectRoot}
              </span>
            </div>
            <span className="storyStudioLocationTag">自动管理</span>
          </div>
          {error !== undefined && <p className="storyStudioError" role="alert">{error}</p>}
        </div>
      </div>

      <div className="storyStudioDialogFooter">
        <button type="button" className="storyStudioDialogCancel" disabled={busy} onClick={onClose}>取消</button>
        <button
          type="button"
          className="storyStudioDialogSubmit"
          disabled={busy || name.trim() === ''}
          onClick={() => { void submit() }}
        >
          <IconPlusOutline16 size={15} />
          {busy ? '正在创建...' : '创建作品'}
        </button>
      </div>
    </Modal>
  )
}

function StoryProjectPicker(props: ProjectPickerProps & { service: ProjectService }) {
  const { service } = props
  const [createOpen, setCreateOpen] = useState(false)
  const [projectRoot, setProjectRoot] = useState('')
  const workspaces = props.useWorkspaces(state => state.items)

  useEffect(() => {
    void service.describe().then(value => { setProjectRoot(value.projectRoot) }).catch(() => {})
  }, [service])

  const projects = useMemo(
    () => projectRoot === '' ? workspaces : workspaces.filter(item => projectPathWithin(projectRoot, item.path)),
    [projectRoot, workspaces],
  )
  const items = projects.map(project => ({
    id: project.workspaceId,
    label: project.title,
    icon: <IconFolderClose16 size={16} />,
  }))

  return (
    <>
      <Menu
        open={props.open && !createOpen}
        anchor={null}
        items={items.length === 0 ? [{ type: 'label' as const, id: 'empty', text: '还没有作品' }] : items}
        footer={[{ id: CREATE_ID, label: '新建作品', icon: <IconPlusOutline16 size={16} /> }]}
        selectedId={props.selectedId}
        portal
        getAnchorRect={() => props.anchorRef?.current?.getBoundingClientRect() ?? null}
        onClose={props.onClose}
        onSelect={(id) => {
          if (id === CREATE_ID) {
            props.onClose()
            setCreateOpen(true)
            return
          }
          props.onPick(id as WorkspaceId)
        }}
      />
      <CreateProjectDialog
        open={createOpen}
        service={service}
        onClose={() => { setCreateOpen(false) }}
        onCreated={workspace => { props.onPick(workspace.workspaceId) }}
      />
    </>
  )
}

function CreateProjectAction(props: CreateActionProps & { service: ProjectService; start: (id: WorkspaceId) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="storyStudioCreateAction"
        data-wide={props.wide || undefined}
        aria-label="新建作品"
        title="新建作品"
        onClick={() => { setOpen(true) }}
      >
        <IconPlusOutline16 size={16} />
        {props.wide && <span>新建作品</span>}
      </button>
      <CreateProjectDialog
        open={open}
        service={props.service}
        onClose={() => { setOpen(false) }}
        onCreated={workspace => { props.start(workspace.workspaceId) }}
      />
    </>
  )
}

function unwrap<T>(result: unknown): T {
  if (typeof result !== 'object' || result === null || !('ok' in result)) throw new Error('Story Studio 服务返回了无效结果')
  const response = result as { ok: boolean; value?: T; error?: { message?: string } }
  if (!response.ok) throw new Error(response.error?.message ?? 'Story Studio 操作失败')
  if (response.value === undefined) throw new Error('Story Studio 服务没有返回结果')
  return response.value
}

export const name = 'dsh-product-story-studio'
export const inject = ['slots', 'workspaces', 'connection']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation.session': { kind: 'single'; scope: 'session'; owner: ConversationSessionOwnerProps }
  }
}

interface ConversationSessionOwnerProps {
  sessionId: string
}

/**
 * Own the `conversation.session` slot only while the active session's `cwd`
 * falls under the Story Studio deployment project root. `single` slots are
 * exclusive at registration time and do not fall back on a `null` render
 * (see `ui-slots`'s `register()`), so ownership must be created and disposed
 * dynamically as the active session changes, handing the slot back to
 * `ui-conversation`'s default implementation whenever no Story Studio
 * session is active.
 */
export function bindStoryStudioSessionSlot(ctx: StoryStudioClientContext, service: ProjectService): void {
  const sessions = ctx.get('sessions')
  if (sessions?.list === undefined) return

  let projectRoot: string | undefined
  void service.describe().then(value => { projectRoot = value.projectRoot }).catch(() => {})

  let owned: (() => void) | undefined
  let ownedSessionId: string | undefined

  const isStoryStudioSession = (cwd: string | undefined): boolean =>
    projectRoot !== undefined && projectRoot !== '' && cwd !== undefined && cwd !== '' && projectPathWithin(projectRoot, cwd)

  const reconcile = () => {
    const snapshot = sessions.list.getSnapshot() as { current?: string; byId?: Record<string, { cwd?: string }> }
    const currentId = snapshot.current
    const cwd = currentId !== undefined ? snapshot.byId?.[currentId]?.cwd : undefined

    console.log('[Story Studio] reconcile:', { currentId, cwd, projectRoot, ownedSessionId })

    if (currentId !== undefined && currentId === ownedSessionId) return

    if (owned !== undefined) {
      console.log('[Story Studio] releasing slot ownership')
      owned()
      owned = undefined
      ownedSessionId = undefined
    }

    if (currentId !== undefined && isStoryStudioSession(cwd)) {
      console.log('[Story Studio] taking slot ownership')
      owned = ctx.slots.inject('conversation.session', () => ctx.slots.register(
        { name: 'conversation.session', priority: 100 },
        () => <StoryStudioWorkbenchPlaceholder sessionId={currentId} />,
      ))
      ownedSessionId = currentId
    }
  }

  ctx.effect(() => {
    reconcile()
    return sessions.list.subscribe(reconcile)
  }, 'story-studio: conversation.session dynamic ownership')

  ctx.effect(() => () => {
    if (owned !== undefined) {
      owned()
      owned = undefined
      ownedSessionId = undefined
    }
  }, 'story-studio: conversation.session ownership teardown')
}

function StoryStudioWorkbenchPlaceholder({ sessionId }: { sessionId: string }) {
  return <StoryStudioWorkbench sessionId={sessionId} />
}

function mountWorkbench(ctx: StoryStudioClientContext): void {
  const sessions = ctx.get('sessions')
  const locale = ctx.get('locale')
  const layout = ctx.get('layout')
  let useSessions: ((selector: (snapshot: unknown) => unknown) => unknown) | undefined
  if (sessions?.list !== undefined && typeof sessions.list.subscribe === 'function' && typeof sessions.list.getSnapshot === 'function') {
    useSessions = (selector) => {
      const snapshot = React.useSyncExternalStore(sessions.list.subscribe, sessions.list.getSnapshot)
      return selector(snapshot)
    }
  }
  const mount = () => {
    if (typeof window !== 'undefined' && typeof window.__DSH_WORKBENCH__?.mount === 'function') {
      window.__DSH_WORKBENCH__.mount({ slots: ctx.slots, locale, NS: 'workbench', React, layout, useSessions })
    }
  }
  let script = document.querySelector<HTMLScriptElement>('script[data-dsh-workbench-bundle]')
  if (script === null) {
    script = document.createElement('script')
    script.src = '/wb/workbench-client.js'
    script.dataset.dshWorkbenchBundle = '1'
    document.head.appendChild(script)
  }
  script.addEventListener('load', mount)
  mount()
}

export function apply(ctx: StoryStudioClientContext): void {
  ctx.effect(installStyles, 'story-studio: styles')

  // 渲染 Story Studio 应用界面
  ctx.effect(() => {
    const root = document.createElement('div')
    root.id = 'story-studio-root'
    document.body.appendChild(root)

    // 将 ClientContext 暴露给 StoryStudioApp
    ;(window as any).__dshClientContext = ctx

    const reactRoot = createRoot(root)
    reactRoot.render(<StoryStudioRouter />)
    console.log('[Story Studio] App rendered')

    return () => {
      reactRoot.unmount()
      root.remove()
      delete (window as any).__dshClientContext
    }
  }, 'story-studio: render app')

  // Don't mount workbench here - let StoryStudioRouter handle it
  // mountWorkbench(ctx)

  const service: ProjectService = {
    describe: async () => unwrap<StoryStudioDescription>(await ctx.connection.rpc.call(CHANNEL, 'describe', {})),
    create: async projectName => unwrap<CreatedProject>(await ctx.connection.rpc.call(CHANNEL, 'createProject', { name: projectName })),
    register: async project => {
      let workspace = await ctx.workspaces.create({ path: project.path })
      if (workspace.title !== project.name) workspace = await ctx.workspaces.rename(workspace.workspaceId, project.name)
      return workspace
    },
  }

  bindStoryStudioSessionSlot(ctx, service)

  ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register(
    { name: 'conversation.hero.workspace', priority: -200 },
    props => <StoryProjectPicker {...props} service={service} />,
  ))

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    { name: 'sidebar.footer.action', id: 'story-studio-create', order: -100 },
    props => <CreateProjectAction {...props} service={service} start={id => { ctx.workspaces.startSession(id) }} />,
  ))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'story-studio-product-entry', order: -100 },
    () => <StoryStudioShellOverlay service={service} onCreated={workspace => { ctx.workspaces.startSession(workspace.workspaceId) }} />,
  ))
}
