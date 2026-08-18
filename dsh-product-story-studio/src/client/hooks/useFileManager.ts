/**
 * Story Studio 文件管理 Hook
 * 管理当前打开的文件、编辑器状态和自动保存
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { ProjectFileService } from '../services/ProjectFileService.js'
import type { FileTreeNode } from '../services/ProjectFileService.js'

type ClientContext = Context

/**
 * 打开的文件标签页
 */
export interface FileTab {
  id: string
  path: string
  name: string
  content: string
  isDirty: boolean
  version?: string | undefined
}

/**
 * 文件管理状态
 */
export interface FileManagerState {
  fileTree: FileTreeNode[]
  openFiles: FileTab[]
  activeFileId: string | null
  saveState: 'saved' | 'saving' | 'unsaved'
}

/**
 * 文件管理 Hook
 */
export function useFileManager(ctx: ClientContext | null, projectRoot: string) {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [openFiles, setOpenFiles] = useState<FileTab[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  const fileServiceRef = useRef<ProjectFileService | null>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 初始化文件服务
  useEffect(() => {
    if (!ctx) return
    fileServiceRef.current = new ProjectFileService(ctx)

    // 加载文件树
    fileServiceRef.current.getFileTree().then(tree => {
      setFileTree(tree)
    }).catch(error => {
      console.error('[Story Studio] Failed to load file tree:', error)
    })
  }, [ctx, projectRoot])

  /**
   * 打开文件
   */
  const openFile = useCallback(async (filePath: string) => {
    if (!fileServiceRef.current) return

    try {
      // 检查文件是否已经打开
      const existingFile = openFiles.find(f => f.path === filePath)
      if (existingFile) {
        setActiveFileId(existingFile.id)
        return
      }

      // 读取文件内容
      const scriptFile = await fileServiceRef.current.readFile(filePath)

      if (!scriptFile) {
        console.error('[Story Studio] File not found:', filePath)
        return
      }

      const fileName = filePath.split('/').pop() || filePath
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const newTab: FileTab = {
        id: fileId,
        path: filePath,
        name: fileName,
        content: scriptFile.content,
        isDirty: false,
        version: scriptFile.version,
      }

      setOpenFiles(prev => [...prev, newTab])
      setActiveFileId(fileId)
    } catch (error) {
      console.error('[Story Studio] Failed to open file:', error)
    }
  }, [openFiles])

  /**
   * 关闭文件
   */
  const closeFile = useCallback((fileId: string) => {
    setOpenFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId)

      // 如果关闭的是当前活跃文件，切换到前一个文件
      if (activeFileId === fileId) {
        const closedIndex = prev.findIndex(f => f.id === fileId)
        const newActiveId = newFiles.length > 0
          ? (closedIndex > 0 ? newFiles[closedIndex - 1]?.id : newFiles[0]?.id)
          : null
        setActiveFileId(newActiveId ?? null)
      }

      return newFiles
    })
  }, [activeFileId])

  /**
   * 更新文件内容
   */
  const updateFileContent = useCallback((fileId: string, content: string) => {
    setOpenFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, content, isDirty: true } : f
    ))
    setSaveState('unsaved')

    // 防抖自动保存（1秒后）
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      void saveFile(fileId)
    }, 1000)
  }, [])

  /**
   * 保存文件
   */
  const saveFile = useCallback(async (fileId: string) => {
    if (!fileServiceRef.current) return

    const file = openFiles.find(f => f.id === fileId)
    if (!file) return

    try {
      setSaveState('saving')

      await fileServiceRef.current.writeFile(file.path, file.content)

      setOpenFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, isDirty: false } : f
      ))

      setSaveState('saved')
    } catch (error) {
      console.error('[Story Studio] Failed to save file:', error)
      setSaveState('unsaved')
    }
  }, [openFiles])

  /**
   * 保存所有文件
   */
  const saveAllFiles = useCallback(async () => {
    const dirtyFiles = openFiles.filter(f => f.isDirty)
    await Promise.all(dirtyFiles.map(file => saveFile(file.id)))
  }, [openFiles, saveFile])

  /**
   * 刷新文件树
   */
  const refreshFileTree = useCallback(async () => {
    if (!fileServiceRef.current) return
    try {
      const tree = await fileServiceRef.current.getFileTree()
      setFileTree(tree)
    } catch (error) {
      console.error('[Story Studio] Failed to refresh file tree:', error)
    }
  }, [])

  /**
   * 创建新文件
   */
  const createNewFile = useCallback(async (fileName: string, parentPath?: string) => {
    if (!fileServiceRef.current) {
      console.error('[Story Studio] File service not initialized')
      return false
    }

    try {
      const filePath = parentPath ? `${parentPath}/${fileName}` : `${projectRoot}/${fileName}`
      console.log('[Story Studio] Creating file:', filePath)
      const success = await fileServiceRef.current.createFile(filePath, '')
      console.log('[Story Studio] Create file result:', success)

      if (success) {
        await refreshFileTree()
        await openFile(filePath)
      }

      return success
    } catch (error) {
      console.error('[Story Studio] Failed to create file:', error)
      return false
    }
  }, [projectRoot, refreshFileTree, openFile])

  /**
   * 创建新文件夹
   */
  const createNewFolder = useCallback(async (folderName: string, parentPath?: string) => {
    if (!fileServiceRef.current) return false

    try {
      const folderPath = parentPath ? `${parentPath}/${folderName}` : `${projectRoot}/${folderName}`
      const success = await fileServiceRef.current.createFolder(folderPath)

      if (success) {
        await refreshFileTree()
      }

      return success
    } catch (error) {
      console.error('[Story Studio] Failed to create folder:', error)
      return false
    }
  }, [projectRoot, refreshFileTree])

  /**
   * 删除文件
   */
  const deleteFile = useCallback(async (filePath: string) => {
    if (!fileServiceRef.current) return false

    try {
      const success = await fileServiceRef.current.deleteFile(filePath)

      if (success) {
        // 关闭已打开的文件
        const openFile = openFiles.find(f => f.path === filePath)
        if (openFile) {
          closeFile(openFile.id)
        }

        await refreshFileTree()
      }

      return success
    } catch (error) {
      console.error('[Story Studio] Failed to delete file:', error)
      return false
    }
  }, [openFiles, closeFile, refreshFileTree])

  /**
   * 删除文件夹
   */
  const deleteFolder = useCallback(async (folderPath: string) => {
    if (!fileServiceRef.current) return false

    try {
      const success = await fileServiceRef.current.deleteFolder(folderPath)

      if (success) {
        // 关闭该文件夹下所有打开的文件
        const filesToClose = openFiles.filter(f => f.path.startsWith(folderPath))
        filesToClose.forEach(f => closeFile(f.id))

        await refreshFileTree()
      }

      return success
    } catch (error) {
      console.error('[Story Studio] Failed to delete folder:', error)
      return false
    }
  }, [openFiles, closeFile, refreshFileTree])

  /**
   * 重命名文件或文件夹
   */
  const renameItem = useCallback(async (oldPath: string, newName: string) => {
    if (!fileServiceRef.current) return false

    try {
      const pathParts = oldPath.split('/')
      pathParts[pathParts.length - 1] = newName
      const newPath = pathParts.join('/')

      const success = await fileServiceRef.current.renameFile(oldPath, newPath)

      if (success) {
        // 更新已打开文件的路径
        setOpenFiles(prev => prev.map(f => {
          if (f.path === oldPath) {
            return { ...f, path: newPath, name: newName }
          }
          if (f.path.startsWith(oldPath + '/')) {
            const updatedPath = f.path.replace(oldPath, newPath)
            return { ...f, path: updatedPath }
          }
          return f
        }))

        await refreshFileTree()
      }

      return success
    } catch (error) {
      console.error('[Story Studio] Failed to rename item:', error)
      return false
    }
  }, [refreshFileTree])

  /**
   * 当前活跃的文件
   */
  const activeFile = openFiles.find(f => f.id === activeFileId) ?? null

  return {
    fileTree,
    openFiles,
    activeFile,
    activeFileId,
    saveState,
    openFile,
    closeFile,
    updateFileContent,
    saveFile,
    saveAllFiles,
    setActiveFileId,
    refreshFileTree,
    createNewFile,
    createNewFolder,
    deleteFile,
    deleteFolder,
    renameItem,
  }
}
