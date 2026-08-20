import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { FileSystem, FsError, FsVersion, type FsDirEntry, type FsEditOutcome, type FsEditRequest, type FsInfo, type FsPathInfo, type FsTarget, type FsWriteOutcome } from '@deepseek-ai/dsh-fs'
import * as SkillFileSystem from '@deepseek-ai/dsh-skill-filesystem'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const realPresetSkills = ['idea', 'novel-writing', 'reference-analysis', 'short-drama-writing', 'story-intake', 'story-project', 'story-review']

const SKILL_SOURCE = `---
name: %NAME%
description: 演示技能
---
# 演示

用这个技能做演示。
`

type FileSystemClass = new (ctx: Context) => FileSystem

/**
 * A `ctx.fs` backend that serves an in-memory copy of the packaged Story Studio
 * skill tree, throwing the production bigint TypeError for anything still inside
 * `app.asar` (Electron's ASAR fs patch rejects `fs.stat({ bigint: true })`).
 */
function makePackagedSkillsFileSystem(unpackedRoot: string): FileSystemClass {
  const files = new Map<string, string>()
  const directories = new Set<string>([unpackedRoot])
  for (const name of realPresetSkills) {
    const skillDir = join(unpackedRoot, name)
    directories.add(skillDir)
    files.set(join(skillDir, 'SKILL.md'), SKILL_SOURCE.replaceAll('%NAME%', name))
  }

  return class PackagedSkillsFileSystem extends FileSystem {
    private isUnpacked(path: string): boolean {
      return path === unpackedRoot || path.startsWith(`${unpackedRoot}${sep}`)
    }

    private throwAsarBigint(path: string): never {
      throw new TypeError(`Cannot mix BigInt and other types, use explicit conversions (while probing ${path})`)
    }

    override async resolve(path: string): Promise<FsTarget> {
      return { targetKey: path as never, displayPath: path }
    }

    override processPath(target: FsTarget): string { return String(target.targetKey) }

    override fileUrl(target: FsTarget): string { return `file://${target.targetKey}` }

    override contains(parent: FsTarget, child: FsTarget): boolean {
      return child.targetKey === parent.targetKey || String(child.targetKey).startsWith(`${parent.targetKey}/`)
    }

    override async stat(target: FsTarget): Promise<FsInfo | undefined> {
      const path = String(target.targetKey)
      if (!this.isUnpacked(path)) this.throwAsarBigint(path)
      if (directories.has(path)) return { version: FsVersion('test'), type: 'directory', size: 0 }
      if (files.has(path)) {
        const size = files.get(path)?.length
        return size === undefined ? { version: FsVersion('test'), type: 'file' } : { version: FsVersion('test'), type: 'file', size }
      }
      return undefined
    }

    override async lstat(path: string): Promise<FsPathInfo | undefined> {
      if (directories.has(path)) return { version: FsVersion('test'), type: 'directory', size: 0 }
      if (files.has(path)) {
        const size = files.get(path)?.length
        return size === undefined ? { version: FsVersion('test'), type: 'file' } : { version: FsVersion('test'), type: 'file', size }
      }
      return undefined
    }

    override async readText(target: FsTarget): Promise<string> {
      const path = String(target.targetKey)
      if (!this.isUnpacked(path)) this.throwAsarBigint(path)
      const content = files.get(path)
      if (content === undefined) throw new FsError('not found', 'FS_NOT_FOUND')
      return content
    }

    override async streamText(_target: FsTarget): Promise<AsyncIterable<string>> {
      throw new Error('not used in skill discovery tests')
    }

    override async readBytes(_target: FsTarget, _signal: AbortSignal | undefined, _maxBytes: number): Promise<Uint8Array> {
      throw new Error('not used in skill discovery tests')
    }

    override async listDir(target: FsTarget): Promise<FsDirEntry[]> {
      const path = String(target.targetKey)
      if (!this.isUnpacked(path)) this.throwAsarBigint(path)
      const children = [...directories.values()].filter(child => dirname(child) === path)
      if (path !== unpackedRoot) children.push(join(path, 'SKILL.md'))
      return children
        .sort((left, right) => left.localeCompare(right))
        .map(childPath => {
          const name = childPath.split(sep).pop() as string
          const type = directories.has(childPath) ? 'directory' : 'file'
          const size = type === 'file' ? (files.get(childPath)?.length ?? 0) : undefined
          return {
            name,
            type,
            target: { targetKey: childPath as never, displayPath: childPath },
            version: FsVersion('test'),
            ...(size === undefined ? {} : { size }),
          }
        })
    }

    override async writeText(_target: FsTarget, _content: string): Promise<FsWriteOutcome> {
      throw new Error('not used in skill discovery tests')
    }

    override async editText(_target: FsTarget, _request: FsEditRequest): Promise<FsEditOutcome> {
      throw new Error('not used in skill discovery tests')
    }
  }
}

const asarPath = join(packageRoot, 'resources', 'app.asar', 'resources', 'agent-presets', 'story-studio', 'skills')
const unpackedPath = join(packageRoot, 'resources', 'app.asar.unpacked', 'resources', 'agent-presets', 'story-studio', 'skills')

async function mount(fsClass: FileSystemClass, customSkillDirs: string[]): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(fsClass)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(SkillFileSystem, {
    dshHome: join(packageRoot, 'tests', '.tmp', 'dsh'),
    agentsHome: join(packageRoot, 'tests', '.tmp', 'agents'),
    customSkillDirs,
    includeDefaultRoots: false,
    watch: false,
  })
  return ctx
}

describe('Story Studio skill discovery on packaged paths', () => {
  it('discovers the seven preset skills from an app.asar.unpacked root', async () => {
    const ctx = await mount(makePackagedSkillsFileSystem(unpackedPath), [unpackedPath])
    expect((await ctx.skills.list()).map(skill => skill.name)).toEqual(realPresetSkills)
    for (const name of ['story-intake', 'story-project']) {
      const skill = await ctx.skills.get(name)
      expect(skill).toMatchObject({ name, description: '演示技能' })
      expect(skill?.resourceBase).toEqual({ kind: 'directory', path: join(unpackedPath, name) })
    }
  })

  it('skips a root that stays inside app.asar instead of the unpacked directory', async () => {
    const ctx = await mount(makePackagedSkillsFileSystem(unpackedPath), [asarPath])
    // asarPath 不在 unpacked 树内 → listDir 抛生产环境同款 TypeError → provider 被跳过
    expect(await ctx.skills.snapshot()).toEqual({ skills: [], complete: false })
  })
})
