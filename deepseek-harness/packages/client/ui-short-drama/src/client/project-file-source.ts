import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'

interface Resource { name: string, path: string, detail: string }

const RESOURCE_API = '/api/desktop/projects/resources'
const FILE_API = '/api/desktop/projects/file'
const MAX_CONTEXT_BYTES = 120_000

function sessionCwd(ctx: ClientContext, sessionId: string): string | undefined {
  const sessions = (ctx as unknown as { get: (name: string) => { list: { getSnapshot(): { byId: Record<string, { cwd?: string }> } } } }).get('sessions')
  return sessions.list.getSnapshot().byId[sessionId]?.cwd
}

function fileIcon(name: string): string {
  if (/\.json$/iu.test(name)) return '{}'
  if (/\.(?:md|markdown)$/iu.test(name)) return 'M'
  return '↳'
}

function fileName(path: string): string {
  return path.split(/[\\/]/u).at(-1) ?? path
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/gu, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char)
}

/** Register project files as a real @ reference source in the existing input pipeline. */
export function registerProjectFileSource(ctx: ClientContext): () => void {
  const source: InputTriggerSource = {
    trigger: '@',
    name: 'project-file',
    order: 0,
    async candidates(session, { query, signal }) {
      const cwd = sessionCwd(ctx, String(session.sessionId))
      if (cwd === undefined) return []
      const response = await fetch(`${RESOURCE_API}?path=${encodeURIComponent(cwd)}`, { signal })
      if (!response.ok) return []
      const body = await response.json() as { resources?: Resource[] }
      return (body.resources ?? [])
        .filter(resource => resource.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
        .map(resource => ({ name: resource.name, description: resource.detail, icon: fileIcon(resource.name) }))
    },
    onPick({ candidate, session }) {
      const cwd = sessionCwd(ctx, String(session.sessionId))
      if (cwd === undefined) return undefined
      const relative = candidate.name.replaceAll('\\', '/')
      const path = cwd + '/' + relative
      return {
        insert: {
          source: 'project-file',
          ref: path,
          label: fileName(relative),
          clipboardText: '@' + relative,
          icon: fileIcon(relative),
          title: relative,
        },
      }
    },
    codec: {
      clipboardText: ref => '@' + ref,
      async serialize(ref, signal) {
        const response = await fetch(`${FILE_API}?path=${encodeURIComponent(ref)}`, { signal })
        if (!response.ok) throw new Error(`项目文件读取失败（${String(response.status)}）`)
        const body = await response.json() as { content?: unknown }
        if (typeof body.content !== 'string') throw new Error('项目文件内容无效')
        if (new TextEncoder().encode(body.content).byteLength > MAX_CONTEXT_BYTES) {
          throw new Error('项目文件过大，无法作为上下文引用（上限 120 KB）')
        }
        const label = ref.split(/[\\/]/u).slice(-2).join('/')
        return `<file_reference path="${escapeXml(label)}">\n${body.content}\n</file_reference>`
      },
    },
  }
  const triggers = (ctx as unknown as { get: (name: string) => { registerSource(source: InputTriggerSource): () => void } }).get('inputTriggers')
  return triggers.registerSource(source)
}
