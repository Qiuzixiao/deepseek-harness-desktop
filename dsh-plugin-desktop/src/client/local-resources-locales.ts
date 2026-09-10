export const zh = {
  nav: '本地资源', title: '本地资源', intro: '查看你的 Skills 和 Agent Presets，导出 ZIP 后可在另一台 Zenwit 导入。',
  skill: 'Skills', preset: 'Agent Presets', search: '搜索名称或说明', refresh: '刷新', import: '导入 ZIP', export: '导出 ZIP',
  empty: '暂无本地资源。', loading: '正在处理…', view: '查看内容', back: '返回列表', files: '文件',
  selectFile: '选择文件查看内容。', binary: '此文件不支持文本预览，导出时会保留原文件。',
  user: '用户空间', shared: '共享 Skills', preview: '导入预览', install: '安装到用户空间', cancel: '取消',
  name: '安装名称', nameHint: '小写字母、数字和连字符；同名时请换一个名称。',
  presetHint: 'Preset 使用本机已有插件。导入后在新会话中选择；原电脑的外部插件和本机路径不会自动迁移。',
  installed: '导入成功，可在新会话中使用。', exported: '已开始下载 ZIP，可发送到另一台电脑。',
  failure: '操作失败：', exportHint: '导出包含资源目录中的文件，不包含 .env、.git 和 node_modules。',
} as const
export type LocalResourcesKey = keyof typeof zh
export const en: Record<LocalResourcesKey, string> = {
  nav: 'Local resources', title: 'Local resources', intro: 'Browse your Skills and Agent Presets. Export a ZIP to import into Zenwit on another computer.',
  skill: 'Skills', preset: 'Agent Presets', search: 'Search name or description', refresh: 'Refresh', import: 'Import ZIP', export: 'Export ZIP',
  empty: 'No local resources yet.', loading: 'Working…', view: 'View contents', back: 'Back to list', files: 'Files',
  selectFile: 'Select a file to view its contents.', binary: 'Text preview is unavailable. The original file will be included in the export.',
  user: 'User space', shared: 'Shared Skills', preview: 'Import preview', install: 'Install to user space', cancel: 'Cancel',
  name: 'Install name', nameHint: 'Lowercase letters, numbers and hyphens. Choose another name if it already exists.',
  presetHint: 'Presets use plugins available on this computer. Select the imported preset in a new session; external plugins and machine-specific paths are not migrated.',
  installed: 'Imported. Available for new sessions.', exported: 'ZIP download started. Share it with another computer.',
  failure: 'Operation failed: ', exportHint: 'Exports include the resource files, excluding .env, .git and node_modules.',
}
