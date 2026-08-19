import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

export interface CommandDisplayCopy {
  readonly label: string
  readonly description: string
}

export interface CommandDisplayService {
  resolve(name: string, locale: string): CommandDisplayCopy | undefined
}

const zh: Readonly<Record<string, CommandDisplayCopy>> = {
  checkpoint: { label: '检查点', description: '保存当前工作区和会话状态' },
  compact: { label: '压缩', description: '压缩较早的对话历史' },
  export: { label: '导出', description: '下载当前会话日志' },
  feedback: { label: '反馈', description: '记录当前会话反馈' },
  goal: { label: '目标', description: '设置或查看长期任务目标' },
  permission: { label: '权限', description: '切换权限预设' },
  plan: { label: '计划', description: '进入或退出计划模式' },
  rewind: { label: '回溯', description: '返回到之前的对话状态' },
  model: { label: '模型', description: '切换当前会话的模型' },
}

export const commandDisplayService: CommandDisplayService = {
  resolve(name, locale) {
    return locale === 'zh' ? zh[name] : undefined
  },
}

export function provideCommandDisplay(ctx: ClientContext): () => void {
  const dispose = ctx.reflect.provide('commandDisplay', commandDisplayService)
  return () => { void dispose() }
}
