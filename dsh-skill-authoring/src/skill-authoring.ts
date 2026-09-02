import { randomUUID } from 'node:crypto'
import { access, lstat, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

export type SkillScope = 'project' | 'user'
export type SkillResourceKind = 'references' | 'scripts' | 'assets'
export interface SkillSourceRef { sourceId: string; label: string; kind: 'project-file' | 'reference-selection' | 'version' | 'user-note' | 'attachment'; excerpt?: string }
export interface SkillResource { kind: SkillResourceKind; path: string; content: string }
export interface SaveSkillInput {
  name: string
  description: string
  scope: SkillScope
  instructions: string
  whenToUse?: string
  sources?: SkillSourceRef[]
  resources?: SkillResource[]
}
export interface PublishedSkill { name: string; scope: SkillScope; directory: string; skillFile: string }
export interface SkillInspection { name: string; scope: SkillScope; skillFile: string; valid: boolean; content?: string; reason?: string }

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const RESOURCE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/u
const RESOURCE_KINDS = ['references', 'scripts', 'assets'] as const
const MAX_TEXT = 100_000

export function resolveUserSkillRoot(env: Record<string, string | undefined> = process.env): string {
  const configured = env.DSH_HOME?.trim()
  return join(resolveDshHome(configured === undefined || configured === '' ? '~/.zenwit' : configured, env), 'skills')
}

function assertSkillName(name: string): string {
  const value = name.trim()
  if (!SKILL_NAME.test(value) || value.length > 64) throw new Error('Skill 名称必须是 64 字符以内的 kebab-case')
  return value
}
function cleanText(value: string, label: string): string {
  const text = value.trim()
  if (text.length === 0 || text.length > MAX_TEXT) throw new Error(`${label}不能为空且不能超过 ${String(MAX_TEXT)} 个字符`)
  return text
}
function safeRoot(value: string, label: string): string {
  if (!isAbsolute(value)) throw new Error(`${label}必须是绝对路径`)
  return resolve(value)
}
function normalizeResource(resource: SkillResource): SkillResource {
  if (!RESOURCE_KINDS.includes(resource.kind)) throw new Error('Skill supporting resource kind is invalid')
  const rawPath = resource.path.trim()
  const kindPrefix = `${resource.kind}/`
  const path = rawPath.startsWith(kindPrefix) ? rawPath.slice(kindPrefix.length) : rawPath
  if (!RESOURCE_PATH.test(path) || path.startsWith('/') || path.split('/').includes('..')) throw new Error('Skill supporting resource path is invalid')
  const declaredPrefix = path.split('/')[0]
  if (RESOURCE_KINDS.some(kind => kind !== resource.kind && kind === declaredPrefix)) {
    throw new Error('Skill supporting resource path conflicts with its kind')
  }
  return { kind: resource.kind, path, content: cleanText(resource.content, 'Skill supporting resource') }
}

export class SkillAuthoringStore {
  readonly projectRoot: string
  constructor(projectRoot: string) { this.projectRoot = safeRoot(projectRoot, 'projectRoot') }

  async save(input: SaveSkillInput): Promise<PublishedSkill> {
    const name = assertSkillName(input.name)
    const description = cleanText(input.description, 'Skill 描述')
    const instructions = cleanText(input.instructions, 'Skill instructions')
    const resources = (input.resources ?? []).map(normalizeResource)
    const whenToUse = input.whenToUse === undefined ? undefined : cleanText(input.whenToUse, 'Skill 使用场景')
    const root = this.skillRoot(input.scope)
    const directory = join(root, name)
    if (await exists(join(directory, 'SKILL.md'))) throw new Error(`同名 Skill 已存在：${name}`)

    const staging = join(root, `.staging-${randomUUID()}`)
    await mkdir(staging, { recursive: true, mode: 0o700 })
    try {
      await writeFile(join(staging, 'SKILL.md'), this.skillFile({
        name,
        description,
        instructions,
        ...(whenToUse === undefined ? {} : { whenToUse }),
      }), { encoding: 'utf8', mode: 0o600 })
      for (const resource of resources) {
        const resourcePath = join(staging, resource.kind, resource.path)
        await mkdir(resolve(resourcePath, '..'), { recursive: true, mode: 0o700 })
        await writeFile(resourcePath, resource.content, { encoding: 'utf8', mode: 0o600 })
      }
      await assertNoSymlinks(staging)
      await validateSkill(staging)
      await mkdir(root, { recursive: true, mode: 0o700 })
      await rename(staging, directory)
    } catch (error) {
      await rm(staging, { recursive: true, force: true })
      if ((error as NodeJS.ErrnoException | undefined)?.code === 'EEXIST') throw new Error(`同名 Skill 已存在：${name}`)
      throw error
    }
    return { name, scope: input.scope, directory, skillFile: join(directory, 'SKILL.md') }
  }

  async inspect(name: string): Promise<SkillInspection | undefined> {
    const safeName = assertSkillName(name)
    for (const scope of ['project', 'user'] as const) {
      const file = join(this.skillRoot(scope), safeName, 'SKILL.md')
      if (!await exists(file)) continue
      try {
        const info = await lstat(file)
        if (info.isSymbolicLink()) return { name: safeName, scope, skillFile: file, valid: false, reason: 'SKILL.md 符号链接不受支持' }
        const content = await readFile(file, 'utf8')
        const valid = /^---\n[\s\S]*?\n---\n/u.test(content) && /(?:^|\n)name:\s*[a-z0-9]+(?:-[a-z0-9]+)*/u.test(content) && /(?:^|\n)description:\s*\S+/u.test(content)
        return { name: safeName, scope, skillFile: file, valid, content, ...(valid ? {} : { reason: '缺少有效 YAML frontmatter、name 或 description' }) }
      } catch {
        return { name: safeName, scope, skillFile: file, valid: false, reason: 'Skill 文件无法读取' }
      }
    }
    return undefined
  }

  private skillRoot(scope: SkillScope): string {
    return scope === 'project' ? join(this.projectRoot, '.zenwit', 'skills') : resolveUserSkillRoot()
  }

  /**
   * SKILL.md frontmatter is restricted to the Agent Skills standard keys plus
   * the Claude Code `when_to_use` extension. No provenance, scope, version, or
   * source bookkeeping leaks into the portable skill directory.
   */
  private skillFile(draft: { name: string; description: string; instructions: string; whenToUse?: string }): string {
    const lines = ['---', `name: ${draft.name}`, `description: ${JSON.stringify(draft.description)}`]
    if (draft.whenToUse !== undefined) lines.push(`when_to_use: ${JSON.stringify(draft.whenToUse)}`)
    lines.push('license: MIT', '---', '', draft.instructions.trim(), '')
    return lines.join('\n')
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    const info = await stat(path)
    return info.isFile() || info.isDirectory()
  } catch {
    return false
  }
}
async function assertNoSymlinks(root: string): Promise<void> {
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      const info = await lstat(path)
      if (info.isSymbolicLink()) throw new Error('Skill 输出不能包含符号链接')
      if (info.isDirectory()) await visit(path)
    }
  }
  await visit(root)
}
function referencedResources(body: string): string[] {
  const inline = [...body.matchAll(/`((?:references|scripts|assets)\/[a-zA-Z0-9][a-zA-Z0-9._/-]*)`/gu)]
  const links = [...body.matchAll(/\]\(((?:references|scripts|assets)\/[a-zA-Z0-9][a-zA-Z0-9._/-]*)\)/gu)]
  return [...new Set([...inline, ...links].map(match => match[1] as string))]
}
async function validateSkill(directory: string): Promise<void> {
  const body = await readFile(join(directory, 'SKILL.md'), 'utf8')
  if (!/^---\n[\s\S]*?\n---\n/u.test(body) || !/(?:^|\n)name:\s*[a-z0-9]+(?:-[a-z0-9]+)*/u.test(body) || !/(?:^|\n)description:\s*\S+/u.test(body)) throw new Error('生成的 Skill 不符合标准 frontmatter')
  if (/\[TODO:/u.test(body)) throw new Error('生成的 Skill 仍包含 TODO 占位符')
  for (const resourcePath of referencedResources(body)) {
    try {
      if (!(await lstat(join(directory, resourcePath))).isFile()) throw new Error('not a file')
    } catch {
      throw new Error(`Skill 引用的资源不存在：${resourcePath}`)
    }
  }
}
