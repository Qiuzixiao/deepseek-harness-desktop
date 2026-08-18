import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { parse } from 'yaml'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const presetRoot = join(packageRoot, 'resources', 'agent-presets', 'story-studio')

function skillFrontmatter(name: string): Record<string, unknown> {
  const source = readFileSync(join(presetRoot, 'skills', name, 'SKILL.md'), 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---\n/u)
  if (match?.[1] === undefined) throw new Error(`${name} has no YAML frontmatter`)
  return parse(match[1]) as Record<string, unknown>
}

describe('Story Studio preset', () => {
  it('uses the QNovel Beta name in the desktop conversation header', () => {
    const preset = parse(readFileSync(join(presetRoot, 'preset.yml'), 'utf8')) as Record<string, unknown>
    expect(preset.name).toBe('QNovel Beta')
  })

  it('stays derived from the installed DSH standard preset', () => {
    execFileSync(process.execPath, [join(packageRoot, 'scripts', 'generate-story-studio-preset.mjs'), '--check'])
  })

  it('loads as a complete Cordis composition with the product persona and skill root', () => {
    const rows = loadOverlayPatches(
      'story-studio-preset-test',
      join(presetRoot, 'agent.cordis.yml'),
    )
    expect(rows.find(row => row.id === 'persona')).toEqual(expect.objectContaining({
      name: '@deepseek-ai/dsh-persona',
      config: expect.objectContaining({ text: expect.stringContaining('你是 QNovel') }),
    }))
    expect(rows.find(row => row.id === 'skill-filesystem')).toEqual(expect.objectContaining({
      name: '@deepseek-ai/dsh-skill-filesystem',
      config: expect.objectContaining({ customSkillDirs: expect.any(Array) }),
    }))
    expect(rows.map(row => row.id)).toEqual(expect.arrayContaining([
      'tool-fs',
      'tool-fs-search',
      'tool-skill',
      'delegation',
      'tool-ask-user',
      'tool-web',
    ]))
    const delegation = rows.find(row => row.id === 'delegation')?.config
    expect(Array.isArray(delegation) ? delegation.map(row => row.id) : []).toEqual(expect.arrayContaining([
      'tool-subagent',
      'tool-workflow',
    ]))
  })

  it('publishes valid model-invocable Story Studio skills', () => {
    for (const [name, description] of [
      ['story-intake', '模糊故事想法'],
      ['story-project', '作品目录'],
      ['short-drama-writing', '短剧'],
      ['novel-writing', '小说'],
      ['reference-analysis', '参考材料'],
      ['story-review', '审校'],
    ] as const) {
      expect(skillFrontmatter(name)).toEqual(expect.objectContaining({ name, description: expect.stringContaining(description) }))
    }
  })
})
