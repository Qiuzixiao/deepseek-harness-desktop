import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { ClientContext, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  IconCloseOutline16, IconFolderClose16, IconPlusOutline16, Menu, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { styles } from './styles.ts'

const CHANNEL = '/story-studio'

interface StoryStudioDescription {
  projectRoot: string
  configured: boolean
}

interface CreatedProject extends StoryStudioDescription {
  name: string
  path: string
}

interface ProjectService {
  describe(): Promise<StoryStudioDescription>
  create(name: string): Promise<CreatedProject>
  register(project: CreatedProject): Promise<WorkspaceView>
  pickRoot(): Promise<string | null>
  configureRoot(path: string): Promise<string>
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

interface QNovelSettingsRowInjected {
  readRoot: () => Promise<string>
  chooseRoot: () => Promise<string | null>
}

function QNovelSettingsRow({ readRoot, chooseRoot }: QNovelSettingsRowInjected) {
  const [root, setRoot] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const load = useCallback(() => {
    void readRoot().then(setRoot).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }, [readRoot])
  useEffect(load, [load])

  const changeRoot = async () => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    try {
      const selected = await chooseRoot()
      if (selected !== null) setRoot(selected)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="qNovelSettingsRow" data-slot="settings.general.item">
      <div className="qNovelSettingsText">
        <div className="qNovelSettingsTitle">作品目录</div>
        <div className="qNovelSettingsDescription">
          {error ?? '新建作品会保存到这个目录；已有作品不会自动搬迁。'}
        </div>
        <div className="qNovelSettingsPath" title={root}>{root === '' ? '尚未选择' : root}</div>
      </div>
      <button type="button" className="qNovelSettingsButton" disabled={busy} onClick={() => { void changeRoot() }}>
        {busy ? '选择中…' : '更改目录'}
      </button>
    </div>
  )
}

function StoryStudioShellOverlay({ service }: { service: ProjectService }) {
  const [configured, setConfigured] = useState<boolean | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'QNovel Beta'
    return () => { document.title = previousTitle }
  }, [])
  const refresh = useCallback(() => {
    void service.describe().then(value => { setConfigured(value.configured) }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }, [service])
  useEffect(refresh, [refresh])

  const chooseRoot = async () => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    try {
      const selected = await service.pickRoot()
      if (selected !== null) {
        await service.configureRoot(selected)
        setConfigured(true)
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="qNovelBrandOverlay" aria-hidden="true">QNovel</div>
      {configured === false && (
        <Modal open onClose={() => {}} title="选择作品目录" closeLabel="关闭" className="qNovelOnboarding" headless>
          <div className="qNovelOnboardingHeader">
            <span className="qNovelOnboardingMark">Q</span>
            <div>
              <h2>先选择作品目录</h2>
              <p>QNovel 会把每个作品独立保存到这个目录中。</p>
            </div>
          </div>
          <div className="qNovelOnboardingBody">
            <p>请选择一个专用文件夹，例如“文档 / QNovel作品”。取消选择不会进入完整创作界面。</p>
            {error !== undefined && <p className="storyStudioError" role="alert">{error}</p>}
          </div>
          <div className="qNovelOnboardingFooter">
            <button type="button" className="storyStudioDialogSubmit" disabled={busy} onClick={() => { void chooseRoot() }}>
              <IconFolderClose16 size={15} />
              {busy ? '正在验证…' : '选择作品目录'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function installStyles(): () => void {
  const current = document.querySelector<HTMLStyleElement>('style[data-story-studio]')
  const element = current ?? document.createElement('style')
  element.dataset.storyStudio = ''
  element.textContent = styles
  if (current === null) document.head.appendChild(element)
  return () => { element.remove() }
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
          <span className="storyStudioDialogMark">Q</span>
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
        open={props.open}
        anchor={null}
        items={items.length === 0 ? [{ type: 'label' as const, id: 'empty', text: '还没有作品' }] : items}
        selectedId={props.selectedId}
        portal
        getAnchorRect={() => props.anchorRef?.current?.getBoundingClientRect() ?? null}
        onClose={props.onClose}
        onSelect={id => { props.onPick(id as WorkspaceId) }}
      />
    </>
  )
}

function CreateProjectAction(props: CreateActionProps & { service: ProjectService; start: (id: WorkspaceId) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="qNovelCreateSlotHost" data-wide={props.wide || undefined}>
        <button
          type="button"
          className="storyStudioCreateAction"
          aria-label="新建作品"
          title="新建作品"
          onClick={() => { setOpen(true) }}
        >
          <IconPlusOutline16 size={16} />
          {props.wide && <span>新建作品</span>}
        </button>
      </div>
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

async function readQNovelRoot(connection: ConnectionHandle): Promise<string> {
  const response = await connection.api.settings.describe({})
  if (!response.result.ok) throw new Error(response.result.error.message)
  const namespace = response.result.value.namespaces.find(item => item.ns === 'qnovel')
  const value = namespace?.value
  if (typeof value !== 'object' || value === null || !('projectsRoot' in value)) return ''
  const root = (value as { projectsRoot?: unknown }).projectsRoot
  return typeof root === 'string' ? root : ''
}

export const name = 'dsh-product-story-studio'
export const inject = ['slots', 'workspaces', 'connection']

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
      window.__DSH_WORKBENCH__.mount({
        slots: ctx.slots,
        locale,
        NS: 'workbench',
        React,
        layout,
        useSessions,
        slotInject: (key: string, callback: () => unknown) => ctx.slots.inject(key as never, callback as never),
      })
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
  mountWorkbench(ctx)

  const service: ProjectService = {
    describe: async () => unwrap<StoryStudioDescription>(await ctx.connection.rpc.call(CHANNEL, 'describe', {})),
    create: async projectName => unwrap<CreatedProject>(await ctx.connection.rpc.call(CHANNEL, 'createProject', { name: projectName })),
    pickRoot: () => ctx.workspaces.pickDirectory(),
    configureRoot: async path => {
      const validated = unwrap<{ projectRoot: string }>(await ctx.connection.rpc.call(CHANNEL, 'validateProjectRoot', { path }))
      const response = await ctx.connection.api.settings.mutate({
        ns: 'qnovel',
        ops: [{ op: 'set', path: ['projectsRoot'], value: validated.projectRoot }],
      })
      if (!response.result.ok) throw new Error(response.result.error.message)
      return validated.projectRoot
    },
    register: async project => {
      let workspace = await ctx.workspaces.create({ path: project.path })
      if (workspace.title !== project.name) workspace = await ctx.workspaces.rename(workspace.workspaceId, project.name)
      return workspace
    },
  }

  ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register(
    { name: 'conversation.hero.workspace', priority: -200 },
    props => <StoryProjectPicker {...props} service={service} />,
  ))

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    { name: 'sidebar.footer.action', id: 'story-studio-create', order: -100 },
    props => <CreateProjectAction {...props} service={service} start={id => { ctx.workspaces.startSession(id) }} />,
  ))

  ctx.slots.inject('settings.general.item', () => ctx.slots.register(
    { name: 'settings.general.item', id: 'qnovel-projects-root', order: -100 },
    () => <QNovelSettingsRow
      readRoot={() => readQNovelRoot(ctx.connection)}
      chooseRoot={async () => {
        const selected = await service.pickRoot()
        if (selected !== null) await service.configureRoot(selected)
        return selected
      }}
    />,
  ))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'story-studio-product-entry', order: -100 },
    () => <StoryStudioShellOverlay service={service} />,
  ))
}
