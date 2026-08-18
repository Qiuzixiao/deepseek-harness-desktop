/**
 * 项目文件 RPC 服务
 * 在 Host 层提供文件操作接口，供 Client 层调用
 */
import type { Context } from '@deepseek-ai/cordis'
import { readdir, readFile, writeFile, mkdir, unlink, rm, rename, stat } from 'node:fs/promises'
import type {} from '@deepseek-ai/dsh-fs'

/**
 * 文件树节点
 */
export interface FileTreeNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileTreeNode[]
}

/**
 * 文件内容
 */
export interface FileContent {
  path: string
  content: string
  version?: string
}

interface RpcSuccess<T> {
  ok: true
  value: T
}

interface RpcFailure {
  ok: false
  error: { code: 'internal'; message: string; details: Record<string, never> }
}

type ProjectFileRpcHandler = (endpoint: string, payload: unknown) => Promise<RpcSuccess<unknown> | RpcFailure>

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

/**
 * 创建项目文件 RPC 处理器
 */
export function createProjectFileRpcHandler(_ctx: Context, projectRoot: string): ProjectFileRpcHandler {
  return async (endpoint, payload) => {
    try {
      if (endpoint === 'getFileTree') {
        const files = await readdir(projectRoot, { withFileTypes: true })
        const tree: FileTreeNode[] = []

        for (const file of files) {
          if (file.name.startsWith('.')) continue

          const filePath = `${projectRoot}/${file.name}`
          const node: FileTreeNode = {
            id: file.name,
            name: file.name,
            type: file.isDirectory() ? 'folder' : 'file',
            path: filePath,
          }

          if (file.isDirectory()) {
            const subFiles = await readdir(filePath, { withFileTypes: true })
            node.children = subFiles
              .filter((f) => !f.name.startsWith('.'))
              .map((f) => ({
                id: `${file.name}/${f.name}`,
                name: f.name,
                type: f.isDirectory() ? 'folder' : 'file',
                path: `${filePath}/${f.name}`,
              }))
          }

          tree.push(node)
        }

        return success(tree)
      }

      if (endpoint === 'readFile') {
        const filePath = typeof payload === 'string' ? payload : ''
        const content = await readFile(filePath, 'utf-8')
        return success({
          path: filePath,
          content,
        } satisfies FileContent)
      }

      if (endpoint === 'writeFile') {
        const { filePath, content } = payload as { filePath: string; content: string }
        await writeFile(filePath, content, 'utf-8')
        return success(true)
      }

      if (endpoint === 'createFile') {
        const { filePath, content = '' } = payload as { filePath: string; content?: string }
        // 检查文件是否已存在
        try {
          await stat(filePath)
          throw new Error('文件已存在')
        } catch {
          // 文件不存在，可以创建
        }
        await writeFile(filePath, content, 'utf-8')
        return success(true)
      }

      if (endpoint === 'createFolder') {
        const { folderPath } = payload as { folderPath: string }
        await mkdir(folderPath, { recursive: true })
        return success(true)
      }

      if (endpoint === 'deleteFile') {
        const { filePath } = payload as { filePath: string }
        await unlink(filePath)
        return success(true)
      }

      if (endpoint === 'deleteFolder') {
        const { folderPath } = payload as { folderPath: string }
        await rm(folderPath, { recursive: true })
        return success(true)
      }

      if (endpoint === 'renameFile') {
        const { oldPath, newPath } = payload as { oldPath: string; newPath: string }
        await rename(oldPath, newPath)
        return success(true)
      }

      if (endpoint === 'fileExists') {
        const filePath = typeof payload === 'string' ? payload : ''
        try {
          await stat(filePath)
          return success(true)
        } catch {
          return success(false)
        }
      }

      throw new Error(`未知的文件操作：${endpoint}`)
    } catch (error: unknown) {
      return failure(error)
    }
  }
}
