import { access, mkdir, readdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { constants } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { stringify } from 'yaml'

export const PROJECT_SCHEMA_VERSION = 1
export const DEFAULT_PROJECTS_DIRECTORY = 'QNovel作品'

export interface StoryProjectConfig {
  projectRoot?: string
}

export interface StoryProjectDescription {
  projectRoot: string
}

export interface CreatedStoryProject extends StoryProjectDescription {
  name: string
  path: string
}

const requiredDirectories = [
  '故事设定/人物',
  '参考资料/原始资料',
  '参考资料/分析',
  '故事大纲/季纲',
  '故事大纲/分集大纲',
  '故事大纲/卷纲',
  '故事大纲/章节大纲',
  '正文草稿/短剧',
  '正文草稿/小说',
  '审校记录/修订',
  '导出',
  '.qnovel/缓存',
  '.qnovel/索引',
] as const

const initialFiles = (name: string): ReadonlyArray<readonly [string, string]> => [
  ['项目配置.yml', stringify({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: projectId(name),
    title: name,
    medium: 'undecided',
    language: 'zh-CN',
    status: 'development',
    currentDeliverable: 'brief',
  })],
  ['项目说明.md', `# ${name}\n\n## 原始需求\n\n## 已确认事实\n\n## Agent 假设\n\n## 待确认问题\n\n## 本轮交付\n\n## 参考材料边界\n`],
  ['故事设定/故事前提.md', '# 故事前提\n'],
  ['故事设定/世界规则.md', '# 世界规则\n'],
  ['故事设定/时间线.md', '# 时间线\n'],
  ['故事设定/写作风格.md', '# 写作风格\n'],
  ['参考资料/参考资料索引.md', '# 参考资料索引\n\n| 文件 | 路径 | 格式 | 用途 | 状态 |\n| --- | --- | --- | --- | --- |\n'],
]

export function resolveProjectRoot(
  config: StoryProjectConfig = {},
  home = homedir(),
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const configured = config.projectRoot?.trim()
  const environmentRoot = environment.QNOVEL_PROJECTS_ROOT?.trim()
    || environment.STORY_STUDIO_PROJECTS_ROOT?.trim()
  const root = configured === undefined || configured === ''
    ? environmentRoot === undefined || environmentRoot === ''
      ? join(home, 'Documents', DEFAULT_PROJECTS_DIRECTORY)
      : environmentRoot
    : configured
  return resolve(root)
}

/** Ensure a selected global directory exists and is writable. */
export async function ensureProjectRoot(path: string): Promise<string> {
  const candidate = path.trim()
  if (candidate === '') throw new Error('请选择 QNovel 作品目录')
  if (!isAbsolute(candidate)) throw new Error('作品目录必须是绝对路径')
  const projectRoot = resolve(candidate)
  await mkdir(projectRoot, { recursive: true })
  await access(projectRoot, constants.R_OK | constants.W_OK)
  return projectRoot
}

export function normalizeProjectName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('项目名称必须是文本')
  const name = value.trim().replace(/\s+/gu, ' ')
  if (name.length === 0) throw new Error('请输入项目名称')
  if (name.length > 80) throw new Error('项目名称不能超过 80 个字符')
  if (name === '.' || name === '..') throw new Error('项目名称无效')
  if (/[\u0000-\u001f/\\:*?"<>|]/u.test(name)) throw new Error('项目名称包含文件系统不支持的字符')
  return name
}

export function projectDirectoryName(name: string): string {
  const segment = normalizeProjectName(name).replace(/[. ]+$/u, '')
  if (segment.length === 0) throw new Error('项目名称无效')
  return segment
}

export function projectId(name: string): string {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '')
  if (ascii !== '') return ascii
  let hash = 2166136261
  for (const char of name) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return `story-${(hash >>> 0).toString(36)}`
}

export async function createStoryProject(
  config: StoryProjectConfig,
  inputName: unknown,
): Promise<CreatedStoryProject> {
  const name = normalizeProjectName(inputName)
  const projectRoot = resolveProjectRoot(config)
  await mkdir(projectRoot, { recursive: true })

  const directoryName = projectDirectoryName(name)
  const existing = await readdir(projectRoot, { withFileTypes: true })
  if (existing.some(entry => entry.name.toLocaleLowerCase() === directoryName.toLocaleLowerCase())) {
    throw new Error(`项目“${name}”已经存在`)
  }

  const path = join(projectRoot, directoryName)
  if (!isAbsolute(path) || resolve(path) === projectRoot) throw new Error('项目路径无效')
  await mkdir(path, { recursive: false })
  for (const relative of requiredDirectories) await mkdir(join(path, relative), { recursive: true })
  for (const [relative, content] of initialFiles(name)) {
    await writeFile(join(path, relative), content, { encoding: 'utf8', flag: 'wx' })
  }
  return { name, path, projectRoot }
}
