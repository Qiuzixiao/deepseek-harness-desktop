/** `command` namespace dictionaries (the popupSelect shell's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'search.placeholder': '搜索…',
  'search.aria': '筛选选项',
  'status.loading': '正在加载选项…',
  'status.applying': '正在应用…',
  'status.empty': '无选项',
  'overlay.aria': '/{command} 选项',
  'listbox.aria': '/{command} 匹配项',
  'label.export': '导出',
  'label.feedback': '反馈',
  'label.goal': '目标',
  'label.permission': '权限',
  'label.plan': '计划',
  'label.compact': '压缩',
  'label.skill-create': '创建 Skill',
  'label.model': '模型',
  'description.export': '下载当前会话日志为 ZIP 压缩包',
  'description.feedback': '记录关于当前会话的反馈',
  'description.goal': '设置或查看长期任务目标',
  'description.permission': '切换权限预设（沙箱模式和审批策略）',
  'description.plan': '进入或退出计划模式',
  'description.compact': '压缩较早的会话历史',
} satisfies Record<string, string>

/** The command namespace key union. */
export type CommandKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
  'label.export': 'export',
  'label.feedback': 'feedback',
  'label.goal': 'goal',
  'label.permission': 'permission',
  'label.plan': 'plan',
  'label.compact': 'compact',
  'label.skill-create': 'skill-create',
  'label.model': 'model',
  'description.export': 'Download this Session log as a ZIP archive',
  'description.feedback': 'Record feedback about this session',
  'description.goal': 'Set or view the goal for a long-running task',
  'description.permission': 'Switch the permission preset (sandbox mode + approval policy)',
  'description.plan': 'Enter or leave plan mode',
  'description.compact': 'Compact older conversation history',
} satisfies Record<CommandKey, string>
