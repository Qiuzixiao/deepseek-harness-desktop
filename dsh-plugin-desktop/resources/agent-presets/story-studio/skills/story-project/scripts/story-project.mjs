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
const storyPath = join(root, 'story.yml')
const mediumValues = new Set(['short-drama', 'novel', 'undecided'])

const requiredDirectories = [
  'bible/characters',
  'references/source',
  'references/analyses',
  'outline/seasons',
  'outline/volumes',
  'drafts/scripts',
  'drafts/chapters',
  'reviews/revisions',
  'exports',
  '.story-studio/cache',
  '.story-studio/indexes',
]

const writeIfMissing = (filename, content) => {
  if (!existsSync(filename)) writeFileSync(filename, content)
}

function init() {
  if (existsSync(storyPath)) throw new Error(`project already exists: ${storyPath}`)
  const title = option('--title')
  if (!title) throw new Error('--title is required')
  const medium = option('--medium', 'undecided')
  if (!mediumValues.has(medium)) throw new Error(`invalid --medium: ${medium}`)
  mkdirSync(root, { recursive: true })
  for (const relative of requiredDirectories) mkdirSync(join(root, relative), { recursive: true })
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `story-${Date.now()}`
  writeFileSync(storyPath, stringify({
    schemaVersion: 1,
    id,
    title,
    medium,
    language: 'zh-CN',
    status: 'development',
    currentDeliverable: 'brief',
  }))
  writeIfMissing(join(root, 'brief.md'), `# ${title}\n\n## 原始需求\n\n## 已确认事实\n\n## Agent 假设\n\n## 待确认问题\n\n## 本轮交付\n\n## 参考材料边界\n`)
  writeIfMissing(join(root, 'bible/premise.md'), '# 故事前提\n')
  writeIfMissing(join(root, 'bible/world.md'), '# 世界与规则\n')
  writeIfMissing(join(root, 'bible/timeline.md'), '# 时间线\n')
  writeIfMissing(join(root, 'bible/style.md'), '# 写法与调性\n')
  writeIfMissing(join(root, 'references/index.md'), '# 参考材料索引\n\n| 文件 | 路径 | 格式 | 用途 | 状态 |\n| --- | --- | --- | --- | --- |\n')
  process.stdout.write(JSON.stringify({ ok: true, command: 'init', path: root, id, medium }) + '\n')
}

function readStory() {
  if (!existsSync(storyPath)) throw new Error(`missing story.yml: ${storyPath}`)
  const story = parse(readFileSync(storyPath, 'utf8'))
  if (!story || typeof story !== 'object' || Array.isArray(story)) throw new Error('story.yml must contain a map')
  if (story.schemaVersion !== 1) throw new Error('story.yml schemaVersion must be 1')
  if (typeof story.id !== 'string' || typeof story.title !== 'string') throw new Error('story.yml requires id and title')
  if (!mediumValues.has(story.medium)) throw new Error('story.yml medium is invalid')
  return story
}

function validate() {
  const story = readStory()
  const missing = requiredDirectories.filter(relative => !existsSync(join(root, relative)))
  for (const filename of ['brief.md', 'bible/premise.md', 'bible/world.md', 'bible/timeline.md', 'bible/style.md', 'references/index.md']) {
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
  const story = readStory()
  process.stdout.write(JSON.stringify({
    ok: true,
    command: 'status',
    path: root,
    project: story,
    files: {
      characters: countFiles('bible/characters'),
      seasonOutlines: countFiles('outline/seasons'),
      volumeOutlines: countFiles('outline/volumes'),
      scriptDrafts: countFiles('drafts/scripts'),
      chapterDrafts: countFiles('drafts/chapters'),
      references: countFiles('references/analyses'),
      reviews: countFiles('reviews'),
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
