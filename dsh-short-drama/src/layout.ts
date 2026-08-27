import { existsSync, readFileSync } from 'node:fs'
import { join, posix } from 'node:path'

/** Stable on-disk layout identifiers. Existing projects keep their layout. */
export type ScreenplayLayoutId = 'zh-CN-v1' | 'legacy-en-v1'

export interface ScreenplayPathLayout {
  readonly id: ScreenplayLayoutId
  readonly referenceDir: string
  readonly contractDir: string
  readonly settingDir: string
  readonly charactersDir: string
  readonly mainCharactersDir: string
  readonly otherCharactersDir: string
  readonly outlineDir: string
  readonly episodesDir: string
  readonly screenplayDir: string
  readonly deliverablesDir: string
  readonly directories: readonly string[]
  readonly contractFile: string
  readonly settingFile: string
  readonly otherCharactersFile: string
  readonly outlineFile: string
  readonly episodeOutlinesFile: string
  mainCharacterPath(name: string): string
  episodeScreenplayPath(episode: number): string
  deliverablePath(projectName: string): string
}

function defineLayout(
  id: ScreenplayLayoutId,
  values: Omit<ScreenplayPathLayout, 'id' | 'directories' | 'contractFile' | 'settingFile' | 'otherCharactersFile' | 'outlineFile' | 'episodeOutlinesFile' | 'mainCharacterPath' | 'episodeScreenplayPath' | 'deliverablePath'>,
): ScreenplayPathLayout {
  const directories = [
    values.referenceDir,
    values.contractDir,
    values.settingDir,
    values.mainCharactersDir,
    values.otherCharactersDir,
    values.outlineDir,
    values.episodesDir,
    values.screenplayDir,
    values.deliverablesDir,
  ]
  return {
    id,
    ...values,
    directories,
    contractFile: posix.join(values.contractDir, 'creative-contract.md'),
    settingFile: posix.join(values.settingDir, 'core-setting.md'),
    otherCharactersFile: posix.join(values.otherCharactersDir, 'other-characters.md'),
    outlineFile: posix.join(values.outlineDir, 'full-outline.md'),
    episodeOutlinesFile: posix.join(values.episodesDir, 'episode-outlines.md'),
    mainCharacterPath: name => posix.join(values.mainCharactersDir, `${name}.md`),
    episodeScreenplayPath: episode => posix.join(values.screenplayDir, `episode-${String(episode).padStart(3, '0')}.md`),
    deliverablePath: projectName => posix.join(values.deliverablesDir, `${projectName}.md`),
  }
}

export const LEGACY_SCREENPLAY_LAYOUT = defineLayout('legacy-en-v1', {
  referenceDir: '参考文件',
  contractDir: 'contract',
  settingDir: 'setting',
  charactersDir: 'characters',
  mainCharactersDir: posix.join('characters', 'main'),
  otherCharactersDir: posix.join('characters', 'other'),
  outlineDir: 'outline',
  episodesDir: 'episodes',
  screenplayDir: 'screenplay',
  deliverablesDir: 'deliverables',
})

export const CHINESE_SCREENPLAY_LAYOUT = defineLayout('zh-CN-v1', {
  referenceDir: '参考文件',
  contractDir: '创作合同',
  settingDir: '设定',
  charactersDir: '人物',
  mainCharactersDir: posix.join('人物', '主要人物'),
  otherCharactersDir: posix.join('人物', '其他人物'),
  outlineDir: '大纲',
  episodesDir: '分集大纲',
  screenplayDir: '剧本',
  deliverablesDir: '交付',
})

export const DEFAULT_SCREENPLAY_LAYOUT = CHINESE_SCREENPLAY_LAYOUT
export const SCREENPLAY_LAYOUT_MARKER = posix.join('.screenplay', 'layout.json')

export function screenplayLayoutOf(id: ScreenplayLayoutId): ScreenplayPathLayout {
  return id === 'zh-CN-v1' ? CHINESE_SCREENPLAY_LAYOUT : LEGACY_SCREENPLAY_LAYOUT
}

function validLayoutId(value: unknown): value is ScreenplayLayoutId {
  return value === 'zh-CN-v1' || value === 'legacy-en-v1'
}

/** Detect a project's persisted layout, then fall back to its visible folders. */
export function detectScreenplayLayout(
  workspaceRoot: string,
  fallback: ScreenplayPathLayout = DEFAULT_SCREENPLAY_LAYOUT,
): ScreenplayPathLayout {
  const markerPath = join(workspaceRoot, SCREENPLAY_LAYOUT_MARKER)
  try {
    const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as { layout?: unknown }
    if (validLayoutId(marker.layout)) return screenplayLayoutOf(marker.layout)
  } catch {
    // A missing or old marker is resolved by the state/folder fallback below.
  }

  let hasStateWithoutLayout = false
  try {
    const state = JSON.parse(readFileSync(join(workspaceRoot, '.screenplay', 'state.json'), 'utf8')) as { layout?: unknown }
    if (validLayoutId(state.layout)) return screenplayLayoutOf(state.layout)
    hasStateWithoutLayout = true
  } catch {
    // The state file is optional during the launcher intake phase.
  }
  // State files created before layout profiles existed always used English paths.
  if (hasStateWithoutLayout) return LEGACY_SCREENPLAY_LAYOUT

  const hasChinese = existsSync(join(workspaceRoot, CHINESE_SCREENPLAY_LAYOUT.contractDir))
    || existsSync(join(workspaceRoot, CHINESE_SCREENPLAY_LAYOUT.screenplayDir))
  const hasLegacy = existsSync(join(workspaceRoot, LEGACY_SCREENPLAY_LAYOUT.contractDir))
    || existsSync(join(workspaceRoot, LEGACY_SCREENPLAY_LAYOUT.screenplayDir))
  if (hasChinese && !hasLegacy) return CHINESE_SCREENPLAY_LAYOUT
  if (hasLegacy && !hasChinese) return LEGACY_SCREENPLAY_LAYOUT
  return fallback
}
