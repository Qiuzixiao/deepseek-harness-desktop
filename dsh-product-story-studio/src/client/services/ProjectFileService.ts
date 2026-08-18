import type { Context } from '@deepseek-ai/cordis'

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

/**
 * 项目文件服务
 * Client 层通过 RPC 调用 Host 层的文件操作
 */
export class ProjectFileService {
  private ctx: Context
  private rpcChannel = '/story-studio-files'

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /**
   * 调用 RPC 方法
   */
  private async callRpc<T>(endpoint: string, payload?: unknown): Promise<T> {
    try {
      const result = await this.ctx.connection.rpc.call(this.rpcChannel, endpoint, payload)

      if (!result || typeof result !== 'object') {
        throw new Error('Invalid RPC response')
      }

      const response = result as { ok: boolean; value?: T; error?: { message: string } }

      if (response.ok && response.value !== undefined) {
        return response.value
      }

      throw new Error(response.error?.message || 'RPC call failed')
    } catch (error) {
      console.error(`[ProjectFileService] RPC call failed: ${endpoint}`, error)
      throw error
    }
  }

  /**
   * 获取文件树
   */
  async getFileTree(): Promise<FileTreeNode[]> {
    return await this.callRpc<FileTreeNode[]>('getFileTree')
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath: string): Promise<FileContent | null> {
    try {
      return await this.callRpc<FileContent>('readFile', filePath)
    } catch {
      return null
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      return await this.callRpc<boolean>('writeFile', { filePath, content })
    } catch {
      return false
    }
  }

  /**
   * 创建新文件
   */
  async createFile(filePath: string, content: string = ''): Promise<boolean> {
    try {
      return await this.callRpc<boolean>('createFile', { filePath, content })
    } catch {
      return false
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(folderPath: string): Promise<boolean> {
    try {
      return await this.callRpc<boolean>('createFolder', { folderPath })
    } catch {
      return false
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      return await this.callRpc<boolean>('deleteFile', { filePath })
    } catch {
      return false
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(folderPath: string): Promise<boolean> {
    try {
      return await this.callRpc<boolean>('deleteFolder', { folderPath })
    } catch {
      return false
    }
  }

  /**
   * 重命名文件或文件夹
   */
  async renameFile(oldPath: string, newPath: string): Promise<boolean> {
    try {
      return await this.callRpc<boolean>('renameFile', { oldPath, newPath })
    } catch {
      return false
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.callRpc<boolean>('fileExists', filePath)
    } catch {
      return false
    }
  }
}
