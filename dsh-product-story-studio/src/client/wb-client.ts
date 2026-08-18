import type { Context } from 'cordis'
import React from 'react'

let workbenchMounted = false

export interface WorkbenchEntry {
  name: string
  path: string
  type: 'file' | 'directory'
}

export interface WorkbenchClient {
  describe: () => Promise<{ root: string; rootName: string }>
  listDir: (path?: string) => Promise<WorkbenchEntry[]>
  readFile: (path: string) => Promise<{ content: string; version: number }>
  writeFile: (path: string, content: string) => Promise<void>
  createFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
  createDirectory: (path: string) => Promise<void>
}

export function createWorkbenchClient(sessionId: string): WorkbenchClient {
  const ctx = (window as any).__dshClientContext as Context
  const CHANNEL = 'story-studio'

  return {
    describe: async () => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'describe', {})
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
    listDir: async (path?: string) => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'listDir', { path })
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
    readFile: async (path: string) => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'readFile', { path })
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
    writeFile: async (path: string, content: string) => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'writeFile', { path, content })
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
    createFile: async (path: string, content: string) => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'createFile', { path, content })
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
    deleteFile: async (path: string) => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'deleteFile', { path })
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
    renameFile: async (oldPath: string, newPath: string) => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'renameFile', { oldPath, newPath })
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
    createDirectory: async (path: string) => {
      const result = await ctx.connection.rpc.call(CHANNEL, 'createDirectory', { path })
      if (result.error) throw new Error(result.error.message)
      return result.result
    },
  }
}

export function mountWorkbench(ctx: Context): void {
  if (workbenchMounted) {
    console.log('[wb-client] Workbench already mounted')
    return
  }

  console.log('[Story Studio] Mounting DSH workbench')

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
    if (typeof window !== 'undefined' && typeof (window as any).__DSH_WORKBENCH__?.mount === 'function') {
      (window as any).__DSH_WORKBENCH__.mount({ slots: ctx.slots, locale, NS: 'workbench', React, layout, useSessions })
      workbenchMounted = true
      console.log('[wb-client] DSH workbench mounted')
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

export function unmountWorkbench(): void {
  if (!workbenchMounted) {
    console.log('[wb-client] Workbench not mounted, nothing to unmount')
    return
  }

  console.log('[wb-client] Unmounting workbench')

  // Remove DSH workbench elements
  const workbenchRoot = document.querySelector('[data-dsh-workbench-root]')
  if (workbenchRoot) {
    workbenchRoot.remove()
  }

  workbenchMounted = false
}
