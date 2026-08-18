/**
 * Story Studio 会话管理 Hook
 * 为剧本创作提供专门的会话管理和 AI 交互能力
 */
import { useEffect, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

/**
 * Story Studio 的会话上下文
 * 包含剧本创作所需的上下文信息
 */
export interface StorySessionContext {
  /** 当前项目 ID */
  projectId: string
  /** 项目名称 */
  projectName: string
  /** 当前编辑的剧本文件 */
  currentFile?: string
  /** 剧本内容（作为上下文） */
  scriptContent?: string
  /** 人物信息 */
  characters?: Array<{
    name: string
    description: string
  }>
}

/**
 * AI 响应的思考步骤
 */
export interface ThinkingStep {
  id: string
  description: string
  status: 'pending' | 'active' | 'complete'
}

/**
 * 使用 Story Studio 会话的 Hook
 * @param ctx - DSH Client Context
 * @param sessionContext - 剧本创作上下文
 */
export function useStorySession(
  ctx: ClientContext,
  sessionContext: StorySessionContext
) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [lastResponse, setLastResponse] = useState<string>('')

  // 创建或获取会话
  useEffect(() => {
    const initSession = async () => {
      try {
        // 检查是否已有该项目的活跃会话
        const existingSessionId = await findProjectSession(ctx, sessionContext.projectId)

        if (existingSessionId) {
          setSessionId(existingSessionId)
        } else {
          // 创建新会话
          const newSessionId = await createProjectSession(ctx, sessionContext)
          setSessionId(newSessionId)
        }
      } catch (error) {
        console.error('[Story Studio] Failed to initialize session:', error)
      }
    }

    initSession()
  }, [ctx, sessionContext.projectId])

  /**
   * 发送用户消息到 AI
   * @param userMessage - 用户输入的提示词
   */
  const sendMessage = async (userMessage: string) => {
    if (!sessionId) {
      console.warn('[Story Studio] No active session')
      return
    }

    setIsThinking(true)
    setLastResponse('')
    setThinkingSteps([
      { id: '1', description: '读取当前剧本内容', status: 'active' },
      { id: '2', description: '分析创作需求', status: 'pending' },
      { id: '3', description: '生成内容建议', status: 'pending' },
    ])

    try {
      // 构建完整的上下文消息
      const contextMessage = buildContextMessage(sessionContext)
      const fullMessage = contextMessage ? `${contextMessage}\n\n${userMessage}` : userMessage

      // 获取会话绑定
      const binding = ctx.sessions.binding(sessionId)
      if (!binding?.session) {
        throw new Error('Session binding not found')
      }

      const session = binding.session

      // 模拟思考步骤更新（这些会在真实实现中通过监听会话状态来更新）
      setTimeout(() => {
        setThinkingSteps([
          { id: '1', description: '读取当前剧本内容', status: 'complete' },
          { id: '2', description: '分析创作需求', status: 'active' },
          { id: '3', description: '生成内容建议', status: 'pending' },
        ])
      }, 500)

      // 发送提示消息到会话
      // prompt 方法接受 PromptContentPart[] 数组
      const result = await session.prompt(
        [{ type: 'text', text: fullMessage }],
        'queue' // 或 'steer' 用于中断当前回合
      )

      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to send prompt')
      }

      // 订阅会话状态变化以获取 AI 响应
      // 使用 session.subscribe 监听会话变化
      const unsubscribe = session.subscribe(() => {
        const snapshot = session.getSnapshot()

        // 检查是否有新的助手消息
        if (snapshot.nodes && snapshot.nodes.length > 0) {
          const lastNode = snapshot.nodes[snapshot.nodes.length - 1]

          if (lastNode && lastNode.kind === 'assistant' && 'blocks' in lastNode && lastNode.blocks) {
            // 提取文本内容
            const textContent = lastNode.blocks
              .filter((block: any) => block.kind === 'text')
              .map((block: any) => block.text)
              .join('\n')

            if (textContent) {
              setLastResponse(textContent)
              setThinkingSteps([
                { id: '1', description: '读取当前剧本内容', status: 'complete' },
                { id: '2', description: '分析创作需求', status: 'complete' },
                { id: '3', description: '生成内容建议', status: 'complete' },
              ])
              setIsThinking(false)
              unsubscribe()
            }
          }
        }

        // 检查是否仍在处理中
        if (snapshot.running) {
          // 保持 isThinking 状态
          setThinkingSteps([
            { id: '1', description: '读取当前剧本内容', status: 'complete' },
            { id: '2', description: '分析创作需求', status: 'complete' },
            { id: '3', description: '生成内容建议', status: 'active' },
          ])
        }
      })

      // 设置超时保护
      setTimeout(() => {
        unsubscribe()
        if (isThinking) {
          setIsThinking(false)
          console.warn('[Story Studio] Response timeout')
        }
      }, 60000) // 60 秒超时

    } catch (error) {
      console.error('[Story Studio] Failed to send message:', error)
      setIsThinking(false)
      setThinkingSteps([])
    }
  }

  return {
    sessionId,
    isThinking,
    thinkingSteps,
    lastResponse,
    sendMessage,
  }
}

/**
 * 查找项目对应的会话
 */
async function findProjectSession(
  ctx: ClientContext,
  projectId: string
): Promise<string | null> {
  try {
    // 搜索包含项目 ID 的会话
    const result = await ctx.sessions.search(
      `project:${projectId}`,
      new AbortController().signal
    )

    if (result.ok && result.value.items.length > 0) {
      return result.value.items[0].sessionId
    }

    return null
  } catch (error) {
    console.error('[Story Studio] Failed to find project session:', error)
    return null
  }
}

/**
 * 为项目创建新会话
 */
async function createProjectSession(
  ctx: ClientContext,
  _sessionContext: StorySessionContext
): Promise<string> {
  try {
    // 获取工作区列表
    const workspaceList = ctx.workspaces.list.getSnapshot()

    if (workspaceList.items.length === 0) {
      throw new Error('No workspace available')
    }

    // 使用第一个工作区（或者可以创建专门的 Story Studio 工作区）
    const defaultWorkspace = workspaceList.items[0]

    // 创建新会话
    ctx.workspaces.startSession(defaultWorkspace.id)

    // 等待新会话出现在列表中
    // 注意：startSession 是异步的，但不返回 session ID
    // 我们需要通过监听 sessions.list 来获取新创建的会话
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('Timeout waiting for new session'))
      }, 5000)

      const unsubscribe = ctx.sessions.list.subscribe(() => {
        const snapshot = ctx.sessions.list.getSnapshot() as {
          current?: string
          byId?: Record<string, any>
        }

        // 获取当前会话 ID
        if (snapshot.current) {
          clearTimeout(timeout)
          unsubscribe()
          resolve(snapshot.current)
        }
      })
    })
  } catch (error) {
    console.error('[Story Studio] Failed to create project session:', error)
    throw error
  }
}

/**
 * 构建上下文消息
 * 将剧本内容、人物信息等转换为上下文提示
 */
function buildContextMessage(context: StorySessionContext): string {
  const parts: string[] = []

  parts.push(`# 项目：${context.projectName}`)

  if (context.currentFile) {
    parts.push(`\n当前文件：${context.currentFile}`)
  }

  if (context.scriptContent) {
    parts.push(`\n## 当前剧本内容\n\n${context.scriptContent}`)
  }

  if (context.characters && context.characters.length > 0) {
    parts.push(`\n## 人物信息`)
    context.characters.forEach(char => {
      parts.push(`\n- ${char.name}：${char.description}`)
    })
  }

  return parts.join('\n')
}
