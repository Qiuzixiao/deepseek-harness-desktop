#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse, stringify } from 'yaml'

const usage = () => {
  process.stderr.write([
    'Usage:',
    '  story-project.mjs init <directory> --title <title> [--medium short-drama|novel|undecided]',
    '  story-project.mjs validate <directory>',
    '  story-project.mjs status <directory>',
    '',
  ].join('\n'))
  process.exitCode = 2
}

const args = process.argv.slice(2)
const command = args.shift()
const directory = args.shift()
if (!command || !directory || !['init', 'validate', 'status'].includes(command)) usage()

const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}

const root = resolve(directory)
const projectConfigPath = join(root, '项目配置.yml')
const legacyStoryPath = join(root, 'story.yml')
const mediumValues = new Set(['short-drama', 'novel', 'undecided'])

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
]

const writeIfMissing = (filename, content) => {
  if (!existsSync(filename)) writeFileSync(filename, content)
}

function stableProjectId(title) {
  const ascii = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (ascii) return ascii
  let hash = 2166136261
  for (const char of title) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return `story-${(hash >>> 0).toString(36)}`
}

function init() {
  if (existsSync(projectConfigPath) || existsSync(legacyStoryPath)) throw new Error(`project already exists: ${root}`)
  const title = option('--title')
  if (!title) throw new Error('--title is required')
  const medium = option('--medium', 'undecided')
  if (!mediumValues.has(medium)) throw new Error(`invalid --medium: ${medium}`)
  mkdirSync(root, { recursive: true })
  for (const relative of requiredDirectories) mkdirSync(join(root, relative), { recursive: true })
  const id = stableProjectId(title)
  writeFileSync(projectConfigPath, stringify({
    schemaVersion: 1,
    id,
    title,
    medium,
    language: 'zh-CN',
    status: 'development',
    currentDeliverable: 'brief',
  }))
  writeIfMissing(join(root, '项目说明.md'), `# ${title}\n\n## 原始需求\n\n## 已确认事实\n\n## Agent 假设\n\n## 待确认问题\n\n## 冲突\n\n## 必须保留内容\n\n## 禁止内容\n\n## 本轮交付\n\n## 参考材料边界\n`)
  writeIfMissing(join(root, '故事设定/故事前提.md'), '# 故事前提\n')
  writeIfMissing(join(root, '故事设定/世界规则.md'), '# 世界规则\n')
  writeIfMissing(join(root, '故事设定/时间线.md'), '# 时间线\n')
  writeIfMissing(join(root, '故事设定/写作风格.md'), '# 写作风格\n')
  writeIfMissing(join(root, '参考资料/参考资料索引.md'), '# 参考资料索引\n\n| 文件 | 路径 | 格式 | 用途 | 状态 |\n| --- | --- | --- | --- | --- |\n')
  process.stdout.write(JSON.stringify({ ok: true, command: 'init', path: root, id, medium }) + '\n')
}

function readStory() {
  const path = existsSync(projectConfigPath) ? projectConfigPath : legacyStoryPath
  if (!existsSync(path)) throw new Error(`missing 项目配置.yml (or legacy story.yml): ${root}`)
  const story = parse(readFileSync(path, 'utf8'))
  if (!story || typeof story !== 'object' || Array.isArray(story)) throw new Error('项目配置.yml must contain a map')
  if (story.schemaVersion !== undefined && story.schemaVersion !== 1) throw new Error('项目配置.yml schemaVersion must be 1')
  if (typeof story.id !== 'string' || typeof story.title !== 'string') throw new Error('项目配置.yml requires id and title')
  if (!mediumValues.has(story.medium)) throw new Error('项目配置.yml medium is invalid')
  return { story, legacy: path === legacyStoryPath }
}

function validate() {
  const { story, legacy } = readStory()
  const legacyDirectories = ['bible/characters', 'references/source', 'references/analyses', 'outline/seasons', 'outline/volumes', 'drafts/scripts', 'drafts/chapters', 'reviews/revisions', 'exports', '.story-studio/cache', '.story-studio/indexes']
  const directories = legacy ? legacyDirectories : requiredDirectories
  const missing = directories.filter(relative => !existsSync(join(root, relative)))
  const files = legacy
    ? ['brief.md', 'bible/premise.md', 'bible/world.md', 'bible/timeline.md', 'bible/style.md', 'references/index.md']
    : ['项目说明.md', '故事设定/故事前提.md', '故事设定/世界规则.md', '故事设定/时间线.md', '故事设定/写作风格.md', '参考资料/参考资料索引.md']
  for (const filename of files) {
    if (!existsSync(join(root, filename))) missing.push(filename)
  }
  if (missing.length > 0) throw new Error(`project is missing: ${missing.join(', ')}`)
  process.stdout.write(JSON.stringify({ ok: true, command: 'validate', path: root, id: story.id }) + '\n')
}

function countFiles(relative) {
  const dir = join(root, relative)
  if (!existsSync(dir)) return 0
  return readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isFile()).length
}

function status() {
  const { story, legacy } = readStory()
  const base = legacy
    ? { characters: 'bible/characters', seasonOutlines: 'outline/seasons', volumeOutlines: 'outline/volumes', scriptDrafts: 'drafts/scripts', chapterDrafts: 'drafts/chapters', references: 'references/analyses', reviews: 'reviews' }
    : { characters: '故事设定/人物', seasonOutlines: '故事大纲/季纲', volumeOutlines: '故事大纲/卷纲', scriptDrafts: '正文草稿/短剧', chapterDrafts: '正文草稿/小说', references: '参考资料/分析', reviews: '审校记录' }
  process.stdout.write(JSON.stringify({
    ok: true,
    command: 'status',
    path: root,
    project: story,
    files: {
      characters: countFiles(base.characters),
      seasonOutlines: countFiles(base.seasonOutlines),
      volumeOutlines: countFiles(base.volumeOutlines),
      scriptDrafts: countFiles(base.scriptDrafts),
      chapterDrafts: countFiles(base.chapterDrafts),
      references: countFiles(base.references),
      reviews: countFiles(base.reviews),
    },
  }) + '\n')
}

try {
  if (command === 'init') init()
  else if (command === 'validate') validate()
  else status()
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
