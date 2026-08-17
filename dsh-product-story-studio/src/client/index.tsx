import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { ClientContext, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import {
  Button, IconFolderClose16, IconPlusOutline16, Menu, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { styles } from './styles.ts'

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
      description="输入作品名称后，Story Studio 会自动建立完整的创作目录。"
      footer={(
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={busy || name.trim() === ''} onClick={() => { void submit() }}>
            {busy ? '正在创建...' : '创建作品'}
          </Button>
        </>
      )}
    >
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
        </label>
        <div className="storyStudioPath">
          <IconFolderClose16 size={16} />
          <span>{projectRoot === '' ? '正在读取作品保存位置...' : projectRoot}</span>
        </div>
        {error !== undefined && <p className="storyStudioError" role="alert">{error}</p>}
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

export function apply(ctx: StoryStudioClientContext): void {
  ctx.effect(installStyles, 'story-studio: styles')

  const service: ProjectService = {
    describe: async () => unwrap<StoryStudioDescription>(await ctx.connection.rpc.call(CHANNEL, 'describe', {})),
    create: async projectName => unwrap<CreatedProject>(await ctx.connection.rpc.call(CHANNEL, 'createProject', { name: projectName })),
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
}
