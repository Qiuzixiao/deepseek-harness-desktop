import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink } from 'node:fs/promises'
import { isAbsolute, join, posix, relative, resolve, sep } from 'node:path'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { ScreenplayError } from './errors.js'
import {
  LEGACY_SCREENPLAY_LAYOUT,
  detectScreenplayLayout,
  type ScreenplayPathLayout,
} from './layout.js'
import {
  MAIN_CHARACTER_FIELDS,
  MAIN_CHARACTER_SECTIONS,
  OTHER_CHARACTER_FIELDS,
  fieldValues,
  hasMainCharacterFieldTemplate,
  isPresentFieldValue,
  sectionBody,
} from './character-template.js'
import {
  SCREENPLAY_SCHEMA_VERSION,
  type ChangePreview,
  type CreateEpisodeOutlineBatchInput,
  type CreateEpisodeScreenplayInput,
  type CreateOutlineBundleInput,
  type CreateScreenplayArtifactsInput,
  type EpisodeOutlineBatch,
  type EpisodeOutlineDraft,
  type FinalizeOutlineBundleInput,
  type PendingArtifactChange,
  type RequirementsChanges,
  type ScreenplayArtifactKind,
  type ScreenplayChangeInput,
  type ScreenplayContinuityState,
  type ScreenplayEpisodeRecord,
  type ScreenplayEvent,
  type ScreenplayProjectSnapshot,
  type ScreenplayProjectState,
  type ScreenplayRequirements,
  type ScreenplayVersion,
  type ScreenplayVersionArtifact,
} from './types.js'

const PROJECT_FILE = 'screenplay.project.json'
const PRIVATE_DIR = '.screenplay'
const EVENTS_FILE = 'events.jsonl'
const STATE_FILE = 'state.json'

/** Legacy exports remain stable for callers that use the low-level Store directly. */
export const CONTRACT_FILE = LEGACY_SCREENPLAY_LAYOUT.contractFile
export const SETTING_FILE = LEGACY_SCREENPLAY_LAYOUT.settingFile
export const OTHER_CHARACTERS_FILE = LEGACY_SCREENPLAY_LAYOUT.otherCharactersFile
export const OUTLINE_FILE = LEGACY_SCREENPLAY_LAYOUT.outlineFile
export const EPISODE_OUTLINES_FILE = LEGACY_SCREENPLAY_LAYOUT.episodeOutlinesFile
export const SCREENPLAY_DIR = LEGACY_SCREENPLAY_LAYOUT.screenplayDir
export const DELIVERABLE_DIR = LEGACY_SCREENPLAY_LAYOUT.deliverablesDir

const LEGACY_CONTRACT_SECTIONS = [
  '## 一、项目定位',
  '## 二、核心故事与总规划',
  '## 三、人物与关系设定',
  '## 四、节奏规则（硬性要求）',
  '## 五、台词规则',
  '## 六、反转设计规则',
  '## 七、情绪曲线规则',
  '## 八、画面与叙事规则',
  '## 九、内容红线与连续性边界',
  '## 十、交付要求',
  '## 十一、待确认事项',
] as const

const LEGACY_SETTING_SECTIONS = [
  '## 一、故事世界观',
  '## 二、核心设定',
  '## 三、关键地点',
  '## 四、关键道具（伏笔体系）',
  '## 五、时间线',
  '## 六、风格底色（一句话）',
] as const

const LEGACY_EPISODE_OUTLINE_FIELDS = [
  '**核心冲突**：',
  '**情绪定位**：',
  '- 钩子开场：',
  '- 冲突升级：',
  '- 情绪爆发：',
  '- **微反转/钩子**：',
] as const

const RESERVED_FILENAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu
const MAX_EPISODE_OUTLINE_BATCH_SIZE = 10

function episodeScreenplayPath(layout: ScreenplayPathLayout, episode: number): string {
  return layout.episodeScreenplayPath(episode)
}

function deliverablePath(layout: ScreenplayPathLayout, projectName: string): string {
  return layout.deliverablePath(projectName)
}

function effectiveCharacterCount(content: string): number {
  return Array.from(content.replace(/\s/gu, '')).length
}

function episodeLengthRange(durationSeconds: number | undefined): { min: number, max: number } {
  if (durationSeconds === 60) return { min: 800, max: 1200 }
  if (durationSeconds === 90) return { min: 1200, max: 1500 }
  if (durationSeconds === 120) return { min: 1200, max: 1800 }
  return { min: 1200, max: 2000 }
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT'
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function stableId(prefix: string, operationId: string, digest = ''): string {
  return `${prefix}-${sha256(`${operationId}:${digest}`).slice(0, 16)}`
}

function normalizeContent(content: string, label: string): string {
  const normalized = content.trimEnd().concat('\n')
  if (normalized.trim().length === 0) {
    throw new ScreenplayError('INVALID_STATE', `${label} must not be empty`)
  }
  return normalized
}

function normalizeString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  return normalized.length === 0 ? undefined : normalized
}

function normalizeRequirements(
  current: ScreenplayRequirements,
  changes: RequirementsChanges,
): ScreenplayRequirements {
  const next: ScreenplayRequirements = {
    ...current,
    constraints: changes.constraints?.map(value => value.trim()).filter(Boolean) ?? current.constraints,
  }
  for (const key of ['title', 'genre', 'audience', 'premise', 'endingDirection'] as const) {
    if (changes[key] === undefined) continue
    const value = normalizeString(changes[key])
    if (value === undefined) delete next[key]
    else next[key] = value
  }
  if (changes.episodeCount !== undefined) next.episodeCount = changes.episodeCount
  if (changes.episodeDurationSeconds !== undefined) {
    next.episodeDurationSeconds = changes.episodeDurationSeconds
  }
  return next
}

function requireSections(content: string, sections: readonly string[], label: string): void {
  const missing = sections.filter(section => !content.includes(section))
  if (missing.length > 0) {
    throw new ScreenplayError('VALIDATION_FAILED', `${label} is missing required Markdown sections`, {
      missingSections: missing,
    })
  }
}

/** The project name is a file-system fact, while the wording after it is user-owned. */
function hasProjectHeading(content: string, projectName: string | undefined): boolean {
  const firstLine = content.split('\n', 1)[0]?.trim() ?? ''
  return /^#\s+\S/u.test(firstLine)
    && (projectName === undefined || firstLine.includes(projectName))
}

/** New projects use a small facts-oriented Markdown contract; legacy sections remain readable. */
function validateFlexibleArtifact(content: string, label: string, projectName?: string): void {
  if (!hasProjectHeading(content, projectName)) {
    validationFailure(`${label} must start with an H1 containing the confirmed project name`, label as ScreenplayArtifactKind, [{
      field: 'title',
      expected: projectName === undefined ? '# <title>' : `# <title containing ${projectName}>`,
      actual: content.split('\n', 1)[0]?.trim() ?? '',
    }])
  }
  const headings = content.match(/^##\s+\S.+$/gmu) ?? []
  if (headings.length === 0) {
    validationFailure(`${label} must contain at least one level-two facts section`, label as ScreenplayArtifactKind, [{
      field: 'sections',
      expected: 'at least one ## section',
    }])
  }
}

function validateCreativeContract(content: string, projectName?: string): void {
  const legacyCount = LEGACY_CONTRACT_SECTIONS.filter(section => content.includes(section)).length
  if (legacyCount === LEGACY_CONTRACT_SECTIONS.length) return
  validateFlexibleArtifact(content, 'creative-contract', projectName)
}

function validateCoreSetting(content: string, projectName?: string): void {
  const legacyCount = LEGACY_SETTING_SECTIONS.filter(section => content.includes(section)).length
  if (legacyCount === LEGACY_SETTING_SECTIONS.length) return
  validateFlexibleArtifact(content, 'core-setting', projectName)
}

function validateMainCharacterTemplate(content: string, characterName: string): void {
  requireSections(content, MAIN_CHARACTER_SECTIONS, `major character ${characterName}`)
  const issues: Array<Record<string, unknown>> = []
  const memoryBody = sectionBody(content, '## 一句话记忆点').trim()
  if (memoryBody.length === 0) issues.push({ section: '一句话记忆点', issue: 'empty' })

  for (const [section, fields] of Object.entries(MAIN_CHARACTER_FIELDS) as Array<[keyof typeof MAIN_CHARACTER_FIELDS, readonly string[]]>) {
    const values = fieldValues(sectionBody(content, `## ${section}`))
    const missing = fields.filter(field => !values.has(field))
    const empty = fields.filter(field => {
      const entries = values.get(field)
      return entries !== undefined && entries.some(value => !isPresentFieldValue(value))
    })
    if (missing.length > 0 || empty.length > 0) {
      issues.push({
        section,
        ...(missing.length === 0 ? {} : { missingFields: missing }),
        ...(empty.length === 0 ? {} : { emptyFields: empty }),
      })
    }
  }

  const experiences = sectionBody(content, '## 关键经历').match(/^\s*-\s+\S.*$/gmu) ?? []
  if (experiences.length === 0) issues.push({ section: '关键经历', issue: 'requires at least one list item' })

  const relationships = fieldValues(sectionBody(content, '## 人物关系'))
  if (relationships.size === 0 || [...relationships.values()].every(values => values.every(value => !isPresentFieldValue(value)))) {
    issues.push({ section: '人物关系', issue: 'requires at least one relationship field' })
  }

  if (issues.length > 0) {
    validationFailure(
      `major character ${characterName} does not match the field-level Markdown template`,
      'main-character',
      issues,
    )
  }
}

function validateOtherCharacterTemplate(content: string): void {
  if (!content.includes('# 其他关键角色（配角）') || !content.includes('## 角色关系图（简要）')) {
    validationFailure('other characters file does not match the required Markdown format', 'other-characters', [{
      field: 'structure',
      expected: '# 其他关键角色（配角） and ## 角色关系图（简要）',
    }])
  }
  const roleHeadings = [...content.matchAll(/^##\s+(.+?)\s*$/gmu)]
    .map(match => match[1]?.trim())
    .filter((heading): heading is string => heading !== undefined && heading !== '角色关系图（简要）')
  const issues: Array<Record<string, unknown>> = []
  if (roleHeadings.length === 0) issues.push({ issue: 'at least one secondary character is required' })
  for (const heading of roleHeadings) {
    const values = fieldValues(sectionBody(content, `## ${heading}`))
    const missing = OTHER_CHARACTER_FIELDS.filter(field => !values.has(field))
    const empty = OTHER_CHARACTER_FIELDS.filter(field => {
      const entries = values.get(field)
      return entries !== undefined && entries.some(value => !isPresentFieldValue(value))
    })
    if (missing.length > 0 || empty.length > 0) {
      issues.push({
        character: heading,
        ...(missing.length === 0 ? {} : { missingFields: missing }),
        ...(empty.length === 0 ? {} : { emptyFields: empty }),
      })
    }
  }
  if (issues.length > 0) {
    validationFailure('other characters file does not match the field-level Markdown template', 'other-characters', issues)
  }
}

function validationFailure(
  message: string,
  artifact: ScreenplayArtifactKind,
  issues: Array<Record<string, unknown>>,
): never {
  throw new ScreenplayError('VALIDATION_FAILED', message, {
    artifact,
    issues,
    written: false,
  })
}

function episodeOutlineBlock(content: string, episode: number): string | undefined {
  const headings = episodeOutlineHeadings(content)
  const heading = headings.find(candidate => candidate.number === episode)
  if (heading === undefined || heading.index === undefined) return undefined
  const next = headings.find(candidate => (candidate.index ?? 0) > heading.index!)
  const forecast = content.indexOf('\n## 后续主线预告', heading.index)
  const candidates = [next?.index ?? content.length]
  if (forecast >= 0) candidates.push(forecast)
  const end = Math.min(...candidates)
  return content.slice(heading.index, end).trim()
}

interface EpisodeOutlineHeading {
  number: number
  index: number
  style: 'legacy' | 'compact'
}

function episodeOutlineHeadings(content: string): EpisodeOutlineHeading[] {
  const headings: EpisodeOutlineHeading[] = []
  for (const match of content.matchAll(/^##\s+第\s*(\d+)\s*集《[^》]+》\s*$/gmu)) {
    if (match.index !== undefined && match[1] !== undefined) {
      headings.push({ number: Number(match[1]), index: match.index, style: 'legacy' })
    }
  }
  for (const match of content.matchAll(/^###\s+第\s*(\d+)\s*集\s*$/gmu)) {
    if (match.index !== undefined && match[1] !== undefined) {
      headings.push({ number: Number(match[1]), index: match.index, style: 'compact' })
    }
  }
  return headings.sort((left, right) => left.index - right.index)
}

function validateCompactEpisodeOutlineBlock(content: string, episode: number): void {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
  const intro = lines.findIndex(line => /^导语：\S.*$/u.test(line))
  if (intro < 0) {
    validationFailure(`episode ${String(episode)} compact outline is missing 导语`, 'episode-outlines', [{
      field: `episode-${String(episode)}`,
      expected: '导语：一句话核心冲突、选择、反转或关系变化',
    }])
  }
  const storyLines = lines.slice(intro + 1).filter(line => line !== '---')
  if (storyLines.length === 0) {
    validationFailure(`episode ${String(episode)} compact outline has no third-person story`, 'episode-outlines', [{
      field: `episode-${String(episode)}`,
      expected: 'a complete third-person episode narrative after 导语',
    }])
  }
  const analysisLabels = /^(?:核心冲突|情绪定位|钩子开场|冲突升级|情绪爆发|微反转\/钩子)\s*[：:]/u
  if (storyLines.some(line => analysisLabels.test(line))) {
    validationFailure(`episode ${String(episode)} compact outline must be narrative rather than analysis fields`, 'episode-outlines', [{
      field: `episode-${String(episode)}`,
      expected: 'third-person narrative without analysis labels',
    }])
  }
}

function normalizeContinuity(value: ScreenplayContinuityState): ScreenplayContinuityState {
  if (value === null || typeof value !== 'object'
    || typeof value.endingState !== 'string'
    || !Array.isArray(value.openLoops)
    || value.openLoops.some(item => typeof item !== 'string')) {
    throw new ScreenplayError('VALIDATION_FAILED', 'continuity requires an endingState and an array of openLoops', {
      field: 'continuity',
      written: false,
    })
  }
  const normalizeMap = (map: Record<string, string> | undefined): Record<string, string> | undefined => {
    if (map === undefined) return undefined
    if (map === null || typeof map !== 'object'
      || Object.entries(map).some(([key, item]) => key.trim().length === 0 || typeof item !== 'string')) {
      throw new ScreenplayError('VALIDATION_FAILED', 'continuity maps must contain string keys and values', {
        field: 'continuity',
        written: false,
      })
    }
    return Object.fromEntries(Object.entries(map).map(([key, item]) => [key.trim(), item.trim()]))
  }
  const characterStates = normalizeMap(value.characterStates)
  const relationshipStates = normalizeMap(value.relationshipStates)
  const activeObjects = normalizeMap(value.activeObjects)
  return {
    endingState: value.endingState.trim(),
    openLoops: value.openLoops.map(item => item.trim()).filter(Boolean),
    ...(characterStates === undefined ? {} : { characterStates }),
    ...(relationshipStates === undefined ? {} : { relationshipStates }),
    ...(activeObjects === undefined ? {} : { activeObjects }),
  }
}

function validateEpisodeScreenplay(
  content: string,
  episode: number,
  durationSeconds: number | undefined,
): number {
  const lines = content.trim().split('\n').map(line => line.trimEnd())
  if (lines[0]?.trim() !== `第${String(episode)}集`) {
    validationFailure('episode screenplay must start with the exact episode title', 'episode-screenplay', [{
      field: 'title',
      expected: `第${String(episode)}集`,
      actual: lines[0] ?? '',
    }])
  }
  if (lines.at(-1)?.trim() !== '【本集完】') {
    validationFailure('episode screenplay must end with 【本集完】', 'episode-screenplay', [{
      field: 'ending',
      expected: '【本集完】',
      actual: lines.at(-1) ?? '',
    }])
  }
  const scenePattern = new RegExp(`^${String(episode)}-\\d+\\s+.+\\s+(?:内|外)$`, 'u')
  const sceneIndexes = lines
    .map((line, index) => scenePattern.test(line.trim()) ? index : -1)
    .filter(index => index >= 0)
  if (sceneIndexes.length === 0) {
    validationFailure('episode screenplay must contain at least one valid scene header', 'episode-screenplay', [{
      field: 'sceneHeaders',
      expected: `${String(episode)}-1 地点 时间 内/外`,
      actual: 'none',
    }])
  }
  const sceneNumbers = sceneIndexes.map(index => Number(lines[index]?.match(new RegExp(`^${String(episode)}-(\\d+)`, 'u'))?.[1]))
  const expectedSceneNumbers = Array.from({ length: sceneNumbers.length }, (_value, index) => index + 1)
  if (sceneNumbers.some((number, index) => number !== expectedSceneNumbers[index])) {
    validationFailure('scene numbers must be sequential starting at 1', 'episode-screenplay', [{
      field: 'sceneHeaders',
      expected: expectedSceneNumbers,
      actual: sceneNumbers,
    }])
  }
  const dialoguePattern = /^[^#\[\]△\s][^：\n]{0,40}(?:（(?:表演提示|OS|VO)）)?：.+$/u
  for (const index of sceneIndexes) {
    const nextScene = sceneIndexes.find(candidate => candidate > index)
    const block = lines.slice(index, nextScene ?? lines.length)
    if (!block.some(line => /^人物：.+/u.test(line.trim()))) {
      validationFailure('each scene must declare its actual speaking characters', 'episode-screenplay', [{
        field: 'characters',
        scene: lines[index],
      }])
    }
    if (!block.some(line => line.trim().startsWith('△'))) {
      validationFailure('each scene must contain a performable action line beginning with △', 'episode-screenplay', [{
        field: 'actions',
        scene: lines[index],
      }])
    }
    if (!block.some(line => !/^人物：/u.test(line.trim()) && dialoguePattern.test(line.trim()))) {
      validationFailure('each scene must contain character dialogue', 'episode-screenplay', [{
        field: 'dialogue',
        scene: lines[index],
      }])
    }
  }
  const actionLines = lines.filter(line => line.trim().startsWith('△'))
  if (actionLines.length === 0) {
    validationFailure('episode screenplay must contain performable action lines beginning with △', 'episode-screenplay', [{
      field: 'actions',
      expected: 'at least one action line',
    }])
  }
  const dialogueLines = lines.filter(line => !/^人物：/u.test(line.trim()) && dialoguePattern.test(line.trim()))
  if (dialogueLines.length === 0) {
    validationFailure('episode screenplay must contain character dialogue', 'episode-screenplay', [{
      field: 'dialogue',
      expected: '人物：台词',
    }])
  }
  const flashbacks = lines.filter(line => line.trim() === '【闪回】').length
  const flashbackEnds = lines.filter(line => line.trim() === '【闪回结束】').length
  if (flashbacks !== flashbackEnds) {
    validationFailure('flashback markers must be paired', 'episode-screenplay', [{
      field: 'flashback',
      starts: flashbacks,
      ends: flashbackEnds,
    }])
  }
  if (/分镜|镜头语言|分镜脚本|镜号|作者说明|写作说明|制作指令/u.test(content)) {
    validationFailure('episode screenplay must remain generic screenplay prose without shot or author instructions', 'episode-screenplay', [{
      field: 'forbiddenTerms',
    }])
  }
  if (!lines.some(line => /^【卡点(?:特写)?[：:]/u.test(line.trim()))) {
    validationFailure('episode screenplay must contain an explicit card-point marker', 'episode-screenplay', [{
      field: 'cardPoint',
      expected: '【卡点：...】 or 【卡点特写：...】',
    }])
  }
  const count = effectiveCharacterCount(content)
  const range = episodeLengthRange(durationSeconds)
  if (count < range.min || count > range.max) {
    validationFailure('episode screenplay effective character count is outside the selected duration range', 'episode-screenplay', [{
      field: 'effectiveCharacterCount',
      expected: range,
      actual: count,
    }])
  }
  return count
}

function validateRequirements(requirements: ScreenplayRequirements): void {
  const requiredStrings = ['title', 'genre', 'audience', 'premise', 'endingDirection'] as const
  const missing = requiredStrings.filter(key => requirements[key]?.trim().length === 0 || requirements[key] === undefined)
  if (missing.length > 0) {
    throw new ScreenplayError('VALIDATION_FAILED', 'screenplay requirements are incomplete', { missing })
  }
  if (!Number.isSafeInteger(requirements.episodeCount) || (requirements.episodeCount ?? 0) <= 0
    || !Number.isSafeInteger(requirements.episodeDurationSeconds)
    || (requirements.episodeDurationSeconds ?? 0) <= 0) {
    throw new ScreenplayError('VALIDATION_FAILED', 'episode count and duration must be positive integers')
  }
}

function validateCharacterName(name: string): string {
  if (typeof name !== 'string' || name !== name.trim() || name.length === 0) {
    throw new ScreenplayError('VALIDATION_FAILED', 'major character name must be non-empty and have no surrounding spaces', {
      name,
    })
  }
  if (name === '.' || name === '..' || name.length > 100
    || /[<>:"/\\|?*\u0000-\u001F]/u.test(name)
    || /[. ]$/u.test(name)
    || RESERVED_FILENAMES.test(name)) {
    throw new ScreenplayError('VALIDATION_FAILED', 'major character name cannot be used as an exact filename', {
      name,
    })
  }
  return name
}

function mainCharacterPath(layout: ScreenplayPathLayout, name: string): string {
  return layout.mainCharacterPath(name)
}

function validateFullOutline(content: string, projectName: string | undefined): void {
  if (projectName === undefined) {
    throw new ScreenplayError('INVALID_STATE', 'full outline validation requires the project name')
  }
  const firstLine = content.split('\n', 1)[0]?.trim()
  if (firstLine === undefined || !/^#(?!#)\s+\S/u.test(firstLine) || !firstLine.includes(projectName)) {
    validationFailure('full outline must start with an H1 containing the exact project folder name', 'full-outline', [{
      field: 'title',
      expected: `an H1 containing ${projectName}`,
      actual: firstLine ?? '',
    }])
  }
  const paragraphs = content.slice(content.indexOf('\n') + 1).trim()
    .split(/\n\s*\n/u).map(paragraph => paragraph.trim()).filter(Boolean)
  const episodeHeadings = content.match(/^##\s+第\s*\d+\s*集《/gmu) ?? []
  const numberedEntries = content.match(/^\s*\d+\.\s+/gmu) ?? []
  const forbiddenLabels = content.match(/^\s*(?:OS|VO|旁白)\s*[:：]/gmu) ?? []
  if (episodeHeadings.length > 0 || numberedEntries.length > 6 || forbiddenLabels.length > 0) {
    validationFailure('full outline must be a concise whole-series narrative, not a detailed episode list', 'full-outline', [{
      field: 'structure',
      expected: '2-6 natural paragraphs without episode headings, numbered episode entries, OS, or VO labels',
      actual: {
        episodeHeadingCount: episodeHeadings.length,
        numberedEntryCount: numberedEntries.length,
        forbiddenLabelCount: forbiddenLabels.length,
      },
    }])
  }
  if (paragraphs.length < 2 || paragraphs.length > 6) {
    validationFailure('full outline must contain 2 to 6 natural paragraphs', 'full-outline', [{
      field: 'paragraphCount',
      expected: '2-6',
      actual: paragraphs.length,
    }])
  }
}

function validateEpisodeOutlines(
  content: string,
  projectName: string | undefined,
  episodeCount: number | undefined,
): void {
  if (projectName === undefined || episodeCount === undefined) {
    throw new ScreenplayError('INVALID_STATE', 'episode outline validation requires project name and episode count')
  }
  const firstLine = content.split('\n', 1)[0]?.trim() ?? ''
  if (!hasProjectHeading(content, projectName) || !/(?:大纲|集纲|分集)/u.test(firstLine)) {
    validationFailure('episode outline title must contain the exact project folder name', 'episode-outlines', [{
      field: 'title',
      expected: `# <title containing ${projectName}>`,
      actual: firstLine,
      projectName,
      totalEpisodes: episodeCount,
    }])
  }
  const headings = episodeOutlineHeadings(content)
  if (headings.length !== episodeCount) {
    validationFailure('episode outline count does not match the confirmed episode count', 'episode-outlines', [{
      field: 'episodeCount',
      expected: episodeCount,
      actual: headings.length,
    }])
  }
  const numbers = headings.map(heading => heading.number)
  const expectedNumbers = Array.from({ length: episodeCount }, (_value, index) => index + 1)
  if (numbers.some((number, index) => number !== expectedNumbers[index])
    || new Set(numbers).size !== numbers.length) {
    validationFailure('episode outline headings must be unique and sequential from episode 1', 'episode-outlines', [{
      field: 'episodeHeadings',
      expected: expectedNumbers,
      actual: numbers,
    }])
  }
  const usesLegacy = headings.some(heading => heading.style === 'legacy')
  if (usesLegacy && firstLine !== `# 《${projectName}》前 ${String(episodeCount)} 集大纲`) {
    validationFailure('episode outline title must use the exact project folder name and confirmed total episode count', 'episode-outlines', [{
      field: 'title',
      expected: `# 《${projectName}》前 ${String(episodeCount)} 集大纲`,
      actual: firstLine,
      totalEpisodes: episodeCount,
      titleNumberMeaning: 'confirmed total episode count, not the current batch size',
    }])
  }
  if (usesLegacy) {
    const missingHeaderFields = [
      '> 单元结构：',
      '> 每集核心公式：',
      '## 后续主线预告',
    ].filter(field => !content.includes(field))
    if (missingHeaderFields.length > 0) {
      validationFailure('legacy episode outlines are missing required header or forecast fields', 'episode-outlines', [{
        field: 'header',
        missing: missingHeaderFields,
      }])
    }
    for (const [index] of headings.entries()) {
      const episode = outlineSegment(content, headings, index)
      const missing = LEGACY_EPISODE_OUTLINE_FIELDS.filter(field => !episode.includes(field))
      if (missing.length > 0) {
        validationFailure(`episode ${String(index + 1)} is missing legacy outline fields`, 'episode-outlines', [{
          field: `episode-${String(index + 1)}`,
          missingFields: missing,
        }])
      }
    }
  } else {
    for (const [index, heading] of headings.entries()) {
      validateCompactEpisodeOutlineBlock(outlineSegment(content, headings, index), heading.number)
    }
  }
}

function validateEpisodeOutlineBatch(
  content: string,
  projectName: string | undefined,
  totalEpisodes: number | undefined,
  startEpisode: number,
  endEpisode: number,
): void {
  if (projectName === undefined || totalEpisodes === undefined) {
    throw new ScreenplayError('INVALID_STATE', 'episode outline batch validation requires project name and episode count')
  }
  const firstLine = content.split('\n', 1)[0]?.trim() ?? ''
  if (!hasProjectHeading(content, projectName) || !/(?:大纲|集纲|分集)/u.test(firstLine)) {
    validationFailure('episode outline title must contain the exact project folder name', 'episode-outlines', [{
      field: 'title',
      expected: `# <title containing ${projectName}>`,
      actual: firstLine,
      projectName,
      totalEpisodes,
      requestedBatch: { startEpisode, endEpisode },
    }])
  }
  const headings = episodeOutlineHeadings(content)
  const expectedCount = endEpisode - startEpisode + 1
  if (headings.length !== expectedCount) {
    validationFailure('episode outline batch count does not match the requested range', 'episode-outlines', [{
      field: 'episodeCount',
      expected: expectedCount,
      actual: headings.length,
      requestedRange: { startEpisode, endEpisode },
    }])
  }
  const numbers = headings.map(heading => heading.number)
  const expectedNumbers = Array.from({ length: expectedCount }, (_value, index) => startEpisode + index)
  if (numbers.some((number, index) => number !== expectedNumbers[index])
    || new Set(numbers).size !== numbers.length) {
    validationFailure('episode outline batch headings must be sequential and match the requested range', 'episode-outlines', [{
      field: 'episodeHeadings',
      expected: expectedNumbers,
      actual: numbers,
    }])
  }
  if (headings.some(heading => heading.style === 'legacy')
    && firstLine !== `# 《${projectName}》前 ${String(totalEpisodes)} 集大纲`) {
    validationFailure('episode outline title must use the exact project folder name and confirmed total episode count', 'episode-outlines', [{
      field: 'title',
      expected: `# 《${projectName}》前 ${String(totalEpisodes)} 集大纲`,
      actual: firstLine,
      totalEpisodes,
      requestedBatch: { startEpisode, endEpisode },
      titleNumberMeaning: 'confirmed total episode count, not the current batch size',
    }])
  }
  if (headings.some(heading => heading.style === 'legacy')) {
    const missingHeaderFields = ['> 单元结构：', '> 每集核心公式：'].filter(field => !content.includes(field))
    if (missingHeaderFields.length > 0) {
      validationFailure('legacy episode outline batch is missing required header fields', 'episode-outlines', [{
        field: 'header',
        missing: missingHeaderFields,
      }])
    }
    for (const [index] of headings.entries()) {
      const episode = outlineSegment(content, headings, index)
      const missing = LEGACY_EPISODE_OUTLINE_FIELDS.filter(field => !episode.includes(field))
      if (missing.length > 0) {
        validationFailure(`episode ${String(startEpisode + index)} is missing legacy outline fields`, 'episode-outlines', [{
          field: `episode-${String(startEpisode + index)}`,
          missingFields: missing,
        }])
      }
    }
  } else {
    for (const [index, heading] of headings.entries()) {
      validateCompactEpisodeOutlineBlock(outlineSegment(content, headings, index), heading.number)
    }
  }
}

function outlineSegment(content: string, headings: readonly EpisodeOutlineHeading[], index: number): string {
  const heading = headings[index]
  if (heading === undefined) return ''
  const end = headings[index + 1]?.index ?? content.length
  const forecast = content.indexOf('\n## 后续主线预告', heading.index)
  return content.slice(heading.index, Math.min(end, forecast >= 0 ? forecast : content.length))
}

function batchHeader(content: string): string {
  const firstEpisode = episodeOutlineHeadings(content)[0]?.index ?? -1
  if (firstEpisode < 0) return content.trim()
  return content.slice(0, firstEpisode).trim()
}

function batchEpisodes(content: string): string[] {
  const headings = episodeOutlineHeadings(content)
  return headings.map((_heading, index) => outlineSegment(content, headings, index)
    .trim().replace(/\n---\s*$/u, '').trim())
}

function buildEpisodeOutlines(
  totalEpisodes: number,
  draft: EpisodeOutlineDraft,
  forecastContent: string,
): string {
  const firstBatch = draft.batches[0]
  if (firstBatch === undefined) {
    throw new ScreenplayError('INVALID_STATE', 'episode outline draft has no batches')
  }
  const forecast = forecastContent.trim()
  if (forecast.length === 0) {
    throw new ScreenplayError('VALIDATION_FAILED', 'forecastContent must not be empty', {
      artifact: 'episode-outlines',
      issues: [{ field: 'forecastContent', expected: 'non-empty Markdown', actual: forecastContent }],
      written: false,
    })
  }
  return [
    batchHeader(firstBatch.content),
    ...draft.batches.flatMap(batch => batchEpisodes(batch.content)),
    '---',
    `## 后续主线预告（${String(totalEpisodes)} 集内定向）`,
    forecast,
  ].join('\n\n').concat('\n')
}

function buildEpisodeOutlineDraftContent(draft: EpisodeOutlineDraft): string {
  const firstBatch = draft.batches[0]
  if (firstBatch === undefined) {
    throw new ScreenplayError('INVALID_STATE', 'episode outline draft has no batches')
  }
  return [
    batchHeader(firstBatch.content),
    ...draft.batches.flatMap(batch => batchEpisodes(batch.content)),
  ].join('\n\n').concat('\n')
}

function validateContent(
  kind: ScreenplayArtifactKind,
  content: string,
  characterName?: string,
  projectName?: string,
  episodeCount?: number,
  episodeNumber?: number,
  durationSeconds?: number,
  allowLegacyMainCharacterTemplate = false,
): void {
  switch (kind) {
    case 'creative-contract':
      validateCreativeContract(content, projectName)
      return
    case 'core-setting':
      validateCoreSetting(content, projectName)
      return
    case 'main-character': {
      if (characterName === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'main-character artifact is missing its character name')
      }
      const firstLine = content.split('\n', 1)[0]?.trim()
      if (firstLine !== `# ${characterName}` && !firstLine?.startsWith(`# ${characterName}（`)) {
        throw new ScreenplayError('VALIDATION_FAILED', 'major character heading must start with the exact character name', {
          characterName,
        })
      }
      const legacySections = MAIN_CHARACTER_SECTIONS.filter(section => content.includes(section)).length
      if (legacySections === MAIN_CHARACTER_SECTIONS.length) {
        if (allowLegacyMainCharacterTemplate && !hasMainCharacterFieldTemplate(content)) {
          validateFlexibleArtifact(content, 'main-character')
        } else {
          validateMainCharacterTemplate(content, characterName)
        }
      } else {
        validateFlexibleArtifact(content, 'main-character')
      }
      return
    }
    case 'other-characters':
      if (content.includes('# 其他关键角色（配角）') && content.includes('## 角色关系图（简要）')) {
        validateOtherCharacterTemplate(content)
      } else {
        validateFlexibleArtifact(content, 'other-characters')
      }
      return
    case 'full-outline':
      validateFullOutline(content, projectName)
      return
    case 'episode-outlines':
      validateEpisodeOutlines(content, projectName, episodeCount)
      return
    case 'episode-screenplay':
      if (episodeNumber === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'episode-screenplay artifact is missing its episode number')
      }
      validateEpisodeScreenplay(content, episodeNumber, durationSeconds)
      return
    case 'merged-screenplay':
      if (!content.startsWith('第1集')) {
        throw new ScreenplayError('VALIDATION_FAILED', 'merged screenplay must start with 第1集')
      }
      return
  }
}

function cloneState(state: ScreenplayProjectState): ScreenplayProjectState {
  return structuredClone(state)
}

function episodeNumberFromPath(layout: ScreenplayPathLayout, logicalPath: string): number {
  if (posix.dirname(logicalPath) !== layout.screenplayDir) return NaN
  return Number(posix.basename(logicalPath).match(/^episode-(\d+)\.md$/u)?.[1] ?? NaN)
}

function writingProgressAfterEpisodeEdit(
  layout: ScreenplayPathLayout,
  progress: ScreenplayProjectState['writingProgress'],
  changedPaths: string[],
  changedContents: Map<string, string> = new Map(),
): ScreenplayProjectState['writingProgress'] {
  if (progress === undefined) return undefined
  const changedEpisodes = changedPaths
    .map(path => episodeNumberFromPath(layout, path))
    .filter(Number.isSafeInteger)
  if (changedEpisodes.length === 0) return progress
  const earliest = Math.min(...changedEpisodes)
  const retained = progress.episodes
    .filter(record => record.episode <= earliest)
    .map(record => {
      const content = changedContents.get(record.logicalPath)
      return content === undefined
        ? record
        : { ...record, sha256: sha256(content), effectiveCharacterCount: effectiveCharacterCount(content) }
    })
  const previous = retained.at(-1)
  const nextEpisode = earliest + 1
  return {
    status: nextEpisode > progress.totalEpisodes ? 'Completed' : 'Writing',
    totalEpisodes: progress.totalEpisodes,
    nextEpisode,
    completedEpisodes: retained.map(record => record.episode),
    episodes: retained,
    ...(previous === undefined ? {} : { continuity: previous.continuity }),
  }
}

function stateResult(state: ScreenplayProjectState, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ok: true,
    projectId: state.projectId,
    phase: state.phase,
    revision: state.revision,
    ...extra,
  }
}

function artifactDigest(artifacts: Array<Pick<ScreenplayVersionArtifact, 'logicalPath' | 'sha256'>>): string {
  return sha256(artifacts.map(artifact => `${artifact.logicalPath}:${artifact.sha256}`).join('\n'))
}

export class ScreenplayProjectStore {
  readonly workspaceRoot: string
  readonly layout: ScreenplayPathLayout
  readonly privateRoot: string
  readonly eventsPath: string
  readonly statePath: string

  constructor(workspaceRoot: string, layout?: ScreenplayPathLayout) {
    if (!isAbsolute(workspaceRoot)) {
      throw new ScreenplayError('INVALID_WORKSPACE', 'screenplay workspace must be an absolute path', {
        workspaceRoot,
      })
    }
    this.workspaceRoot = resolve(workspaceRoot)
    this.layout = layout ?? detectScreenplayLayout(this.workspaceRoot)
    this.privateRoot = join(this.workspaceRoot, PRIVATE_DIR)
    this.eventsPath = join(this.privateRoot, EVENTS_FILE)
    this.statePath = join(this.privateRoot, STATE_FILE)
  }

  async snapshot(view: 'summary' | 'artifacts' | 'full' | 'contract' = 'summary'): Promise<ScreenplayProjectSnapshot> {
    const events = await this.readEvents()
    const state = events.at(-1)?.state
    if (state === undefined) return { initialized: false, phase: 'Uninitialized', revision: 0 }
    await this.materialize(state, events.at(-2)?.state)
    const snapshot: ScreenplayProjectSnapshot = { initialized: true, ...cloneState(state) }
    if (view !== 'summary' && state.currentVersion !== undefined) {
      snapshot.artifactContents = await this.readVersionContents(state.currentVersion)
    }
    return snapshot
  }

  /**
   * Return the persisted result for an idempotency key without requiring the
   * caller to replay the operation's inputs. This is used when a Session-local
   * draft was consumed by a successful commit but the client needs to retry a
   * lost response.
   */
  async findOperationResult(
    operationId: string,
    expectedType: ScreenplayEvent['type'],
  ): Promise<Record<string, unknown> | undefined> {
    const events = await this.readEvents()
    const existing = events.find(event => event.operationId === operationId)
    if (existing === undefined) return undefined
    if (existing.type !== expectedType) {
      throw new ScreenplayError('OPERATION_CONFLICT', 'operationId was already used for another operation', {
        operationId,
        existingType: existing.type,
        requestedType: expectedType,
      })
    }
    return structuredClone(existing.result)
  }

  async createProject(
    expectedRevision: number,
    operationId: string,
    projectName: string,
    changes: RequirementsChanges,
    input: CreateScreenplayArtifactsInput,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'project-created', async (current, revision, time) => {
      if (current !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'screenplay project already exists; use the explicit modification flow')
      }
      const normalizedName = projectName.trim()
      if (normalizedName.length === 0) {
        throw new ScreenplayError('INVALID_STATE', 'projectName must not be empty')
      }
      const requirements = normalizeRequirements({ constraints: [] }, changes)
      // The desktop-created project folder name is the single canonical title
      // for the screenplay. Do not allow a second story title to diverge from it.
      requirements.title = normalizedName
      validateRequirements(requirements)

      const sources: Array<{
        kind: ScreenplayArtifactKind
        logicalPath: string
        content: string
        characterName?: string
      }> = [
        {
          kind: 'creative-contract',
          logicalPath: this.layout.contractFile,
          content: normalizeContent(input.contractContent, 'creative contract content'),
        },
        {
          kind: 'core-setting',
          logicalPath: this.layout.settingFile,
          content: normalizeContent(input.settingContent, 'core setting content'),
        },
      ]

      if (input.mainCharacters.length === 0) {
        throw new ScreenplayError('VALIDATION_FAILED', 'at least one major character is required')
      }
      const names = new Set<string>()
      for (const character of input.mainCharacters) {
        if (character === null || typeof character !== 'object'
          || typeof character.name !== 'string' || typeof character.content !== 'string') {
          throw new ScreenplayError('VALIDATION_FAILED', 'each major character requires a name and content')
        }
        const name = validateCharacterName(character.name)
        const collisionKey = name.normalize('NFKC').toLocaleLowerCase('zh-CN')
        if (names.has(collisionKey)) {
          throw new ScreenplayError('VALIDATION_FAILED', 'major character names must be unique as filenames', { name })
        }
        names.add(collisionKey)
        sources.push({
          kind: 'main-character',
          logicalPath: mainCharacterPath(this.layout, name),
          content: normalizeContent(character.content, `major character ${name}`),
          characterName: name,
        })
      }
      sources.push({
        kind: 'other-characters',
        logicalPath: this.layout.otherCharactersFile,
        content: normalizeContent(input.otherCharactersContent, 'other characters content'),
      })

      for (const source of sources) {
        validateContent(source.kind, source.content, source.characterName, normalizedName)
      }
      if (!hasProjectHeading(sources[0]?.content ?? '', normalizedName)
        || !hasProjectHeading(sources[1]?.content ?? '', normalizedName)) {
        throw new ScreenplayError(
          'VALIDATION_FAILED',
          'creative contract and core setting titles must contain the exact confirmed project name',
        )
      }
      const sourceDigests = sources.map(source => ({ logicalPath: source.logicalPath, sha256: sha256(source.content) }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(sourceDigests))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const source of sources) {
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, source.logicalPath)
        await this.writeRelative(versionRelativePath, source.content)
        artifacts.push({
          kind: source.kind,
          logicalPath: source.logicalPath,
          versionRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const state: ScreenplayProjectState = {
        schemaVersion: SCREENPLAY_SCHEMA_VERSION,
        layout: this.layout.id,
        projectId: stableId('project', operationId, this.workspaceRoot),
        projectName: normalizedName,
        phase: 'Ready',
        revision,
        requirements,
        currentVersion: version,
        versions: [version],
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          version,
          createdFiles: artifacts.map(artifact => artifact.logicalPath),
          transitionedThrough: 'ProjectCreated',
        }),
      }
    })
  }

  async createOutline(
    expectedRevision: number,
    operationId: string,
    outlineContent: string,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'outline-created', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', {
          pendingChangeId: previous.pendingChange.id,
        })
      }
      const currentVersion = previous.currentVersion
      if (currentVersion === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the project has no formal artifact set')
      }
      if (currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.outlineFile)) {
        throw new ScreenplayError('INVALID_STATE', 'the full outline already exists; use the explicit modification flow')
      }
      if (currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.episodeOutlinesFile)) {
        throw new ScreenplayError('INVALID_STATE', 'episode outlines exist without a formal full outline')
      }
      if (!currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.contractFile)
        || !currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.settingFile)
        || !currentVersion.artifacts.some(artifact => artifact.kind === 'main-character')
        || !currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.otherCharactersFile)) {
        throw new ScreenplayError('INVALID_STATE', 'creative contract, setting, and character artifacts must exist before creating the full outline')
      }
      if (typeof outlineContent !== 'string') {
        throw new ScreenplayError('VALIDATION_FAILED', 'outlineContent is required')
      }
      const content = normalizeContent(outlineContent, 'full outline content')
      if (previous.episodeOutlineDraft?.outlineContent !== undefined
        && previous.episodeOutlineDraft.outlineContent !== content) {
        validationFailure('the full outline does not match the outline already discussed for the episode batches', 'full-outline', [{
          field: 'outlineContent',
          expected: previous.episodeOutlineDraft.outlineContent,
          actual: content,
        }])
      }
      validateContent('full-outline', content, undefined, previous.projectName, previous.requirements.episodeCount)

      const sources: Array<{
        kind: ScreenplayArtifactKind
        logicalPath: string
        content: string
        characterName?: string
      }> = []
      for (const artifact of currentVersion.artifacts) {
        sources.push({
          kind: artifact.kind,
          logicalPath: artifact.logicalPath,
          content: await this.readRelative(artifact.versionRelativePath),
          ...(artifact.characterName === undefined ? {} : { characterName: artifact.characterName }),
        })
      }
      sources.push({ kind: 'full-outline', logicalPath: this.layout.outlineFile, content })
      const sourceDigests = sources.map(source => ({ logicalPath: source.logicalPath, sha256: sha256(source.content) }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(sourceDigests))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const source of sources) {
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, source.logicalPath)
        await this.writeRelative(versionRelativePath, source.content)
        artifacts.push({
          kind: source.kind,
          logicalPath: source.logicalPath,
          versionRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const state: ScreenplayProjectState = {
        ...cloneState(previous),
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          version,
          stage: 'OutlineReady',
          formalFilesCreated: true,
          createdFiles: [this.layout.outlineFile],
          readyForNextInstruction: true,
          transitionedThrough: 'OutlineCreated',
        }),
      }
    })
  }

  async createEpisodeOutlineBatch(
    expectedRevision: number,
    operationId: string,
    input: CreateEpisodeOutlineBatchInput,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'episode-outline-batch-created', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', {
          pendingChangeId: previous.pendingChange.id,
        })
      }
      const currentVersion = previous.currentVersion
      if (currentVersion === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the project has no formal artifact set')
      }
      if (!currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.contractFile)
        || !currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.settingFile)
        || !currentVersion.artifacts.some(artifact => artifact.kind === 'main-character')
        || !currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.otherCharactersFile)) {
        throw new ScreenplayError('INVALID_STATE', 'creative contract, setting, and character artifacts must exist before creating episode outlines')
      }
      if (input === null || typeof input !== 'object'
        || !Number.isSafeInteger(input.startEpisode)
        || !Number.isSafeInteger(input.endEpisode)
        || typeof input.episodeOutlinesContent !== 'string'
        || (input.outlineContent !== undefined && typeof input.outlineContent !== 'string')
        || (input.forecastContent !== undefined && typeof input.forecastContent !== 'string')) {
        throw new ScreenplayError('VALIDATION_FAILED', 'episode outline batch requires a range and Markdown content')
      }
      const totalEpisodes = previous.requirements.episodeCount
      if (totalEpisodes === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the project has no confirmed episode count')
      }
      const draft = previous.episodeOutlineDraft
      if (draft !== undefined && draft.totalEpisodes !== totalEpisodes) {
        throw new ScreenplayError('INVALID_STATE', 'episode outline draft does not match the confirmed episode count', {
          expected: totalEpisodes,
          actual: draft.totalEpisodes,
        })
      }
      const startEpisode = input.startEpisode
      const endEpisode = input.endEpisode
      const expectedStart = draft?.nextEpisode ?? 1
      if (startEpisode !== expectedStart) {
        validationFailure(
          'episode outline batch must continue from the next ungenerated episode',
          'episode-outlines',
          [{
            field: 'startEpisode',
            expected: expectedStart,
            actual: startEpisode,
          }],
        )
      }
      const existingEpisodeArtifact = currentVersion.artifacts.find(
        artifact => artifact.logicalPath === this.layout.episodeOutlinesFile,
      )
      if (existingEpisodeArtifact !== undefined && draft === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'episode outlines already exist; use the explicit modification flow')
      }
      if (endEpisode < startEpisode || endEpisode > totalEpisodes
        || endEpisode - startEpisode + 1 > MAX_EPISODE_OUTLINE_BATCH_SIZE) {
        validationFailure(
          'episode outline batch range is outside the allowed size',
          'episode-outlines',
          [{
            field: 'episodeRange',
            expected: {
              startAt: startEpisode,
              endAtMost: totalEpisodes,
              maxBatchSize: MAX_EPISODE_OUTLINE_BATCH_SIZE,
            },
            actual: { startEpisode, endEpisode },
          }],
        )
      }
      const existingOutlineArtifact = currentVersion.artifacts.find(
        artifact => artifact.logicalPath === this.layout.outlineFile,
      )
      const existingOutlineContent = existingOutlineArtifact === undefined
        ? undefined
        : await this.readRelative(existingOutlineArtifact.versionRelativePath)
      const outlineContent = input.outlineContent === undefined
        ? draft?.outlineContent ?? existingOutlineContent
        : normalizeContent(input.outlineContent, 'full outline content')
      if (outlineContent === undefined) {
        throw new ScreenplayError('VALIDATION_FAILED', 'the first episode outline batch must include the whole-series outline')
      }
      if (draft?.outlineContent !== undefined && input.outlineContent !== undefined
        && normalizeContent(input.outlineContent, 'full outline content') !== draft.outlineContent) {
        validationFailure('the whole-series outline cannot change while episode batches are in progress', 'full-outline', [{
          field: 'outlineContent',
          expected: draft.outlineContent,
          actual: input.outlineContent,
        }])
      }
      validateFullOutline(outlineContent, previous.projectName)
      const batchContent = normalizeContent(input.episodeOutlinesContent, 'episode outline batch content')
      validateEpisodeOutlineBatch(
        batchContent,
        previous.projectName,
        totalEpisodes,
        startEpisode,
        endEpisode,
      )
      const batch: EpisodeOutlineBatch = {
        startEpisode,
        endEpisode,
        content: batchContent,
        sha256: sha256(batchContent),
        createdAt: time,
      }
      const nextDraft: EpisodeOutlineDraft = {
        totalEpisodes,
        nextEpisode: endEpisode + 1,
        outlineContent,
        batches: [...(draft?.batches ?? []), batch],
      }
      const complete = endEpisode === totalEpisodes
      let episodeOutlinesContent: string
      if (complete) {
        if (input.forecastContent === undefined || input.forecastContent.trim().length === 0) {
          validationFailure('the final episode-outline batch requires forecastContent', 'episode-outlines', [{
            field: 'forecastContent',
            expected: 'non-empty Markdown',
            actual: input.forecastContent ?? '',
          }])
        }
        episodeOutlinesContent = normalizeContent(
          buildEpisodeOutlines(totalEpisodes, nextDraft, input.forecastContent),
          'episode outlines content',
        )
        validateContent('episode-outlines', episodeOutlinesContent, undefined, previous.projectName, totalEpisodes)
      } else {
        episodeOutlinesContent = normalizeContent(
          buildEpisodeOutlineDraftContent(nextDraft),
          'episode outline progress content',
        )
        validateEpisodeOutlineBatch(
          episodeOutlinesContent,
          previous.projectName,
          totalEpisodes,
          1,
          endEpisode,
        )
      }
      const sources: Array<{
        kind: ScreenplayArtifactKind
        logicalPath: string
        content: string
        characterName?: string
      }> = []
      for (const artifact of currentVersion.artifacts) {
        if (artifact.logicalPath === this.layout.outlineFile || artifact.logicalPath === this.layout.episodeOutlinesFile) continue
        sources.push({
          kind: artifact.kind,
          logicalPath: artifact.logicalPath,
          content: await this.readRelative(artifact.versionRelativePath),
          ...(artifact.characterName === undefined ? {} : { characterName: artifact.characterName }),
        })
      }
      sources.push({ kind: 'full-outline', logicalPath: this.layout.outlineFile, content: outlineContent })
      sources.push({ kind: 'episode-outlines', logicalPath: this.layout.episodeOutlinesFile, content: episodeOutlinesContent })
      const sourceDigests = sources.map(source => ({ logicalPath: source.logicalPath, sha256: sha256(source.content) }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(sourceDigests))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const source of sources) {
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, source.logicalPath)
        await this.writeRelative(versionRelativePath, source.content)
        artifacts.push({
          kind: source.kind,
          logicalPath: source.logicalPath,
          versionRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const state: ScreenplayProjectState = {
        ...cloneState(previous),
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        updatedAt: time,
      }
      if (complete) delete state.episodeOutlineDraft
      else state.episodeOutlineDraft = nextDraft
      const createdFiles = [
        ...(existingOutlineArtifact === undefined ? [this.layout.outlineFile] : []),
        ...(existingEpisodeArtifact === undefined ? [this.layout.episodeOutlinesFile] : []),
      ]
      const updatedFiles = existingEpisodeArtifact === undefined ? [] : [this.layout.episodeOutlinesFile]
      return {
        state,
        result: stateResult(state, {
          stage: 'EpisodeOutlineBatchReady',
          batch: { startEpisode, endEpisode },
          completedEpisodes: endEpisode,
          nextEpisode: endEpisode + 1,
          remainingEpisodes: totalEpisodes - endEpisode,
          readyForNextInstruction: true,
          formalFilesCreated: true,
          createdFiles,
          updatedFiles,
          ...(complete ? { completed: true } : {}),
          transitionedThrough: 'EpisodeOutlineBatchCreated',
        }),
      }
    })
  }

  async createOutlineBundle(
    expectedRevision: number,
    operationId: string,
    input: CreateOutlineBundleInput,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'outline-created', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', {
          pendingChangeId: previous.pendingChange.id,
        })
      }
      if (previous.episodeOutlineDraft !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'episode outline batches are in progress; finalize the batch draft before creating formal files')
      }
      const currentVersion = previous.currentVersion
      if (currentVersion === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the project has no formal artifact set')
      }
      if (currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.outlineFile
        || artifact.logicalPath === this.layout.episodeOutlinesFile)) {
        throw new ScreenplayError('INVALID_STATE', 'outline and episode outlines already exist; use the explicit modification flow')
      }
      if (!currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.contractFile)
        || !currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.settingFile)
        || !currentVersion.artifacts.some(artifact => artifact.kind === 'main-character')
        || !currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.otherCharactersFile)) {
        throw new ScreenplayError('INVALID_STATE', 'creative contract, setting, and character artifacts must exist before creating outlines')
      }
      if (input === null || typeof input !== 'object'
        || typeof input.outlineContent !== 'string' || typeof input.episodeOutlinesContent !== 'string') {
        throw new ScreenplayError('VALIDATION_FAILED', 'outline and episode outline content are required')
      }
      const outlineContent = normalizeContent(input.outlineContent, 'full outline content')
      const episodeOutlinesContent = normalizeContent(input.episodeOutlinesContent, 'episode outlines content')
      validateContent('full-outline', outlineContent, undefined, previous.projectName, previous.requirements.episodeCount)
      validateContent(
        'episode-outlines',
        episodeOutlinesContent,
        undefined,
        previous.projectName,
        previous.requirements.episodeCount,
      )

      const sources: Array<{
        kind: ScreenplayArtifactKind
        logicalPath: string
        content: string
        characterName?: string
      }> = []
      for (const artifact of currentVersion.artifacts) {
        sources.push({
          kind: artifact.kind,
          logicalPath: artifact.logicalPath,
          content: await this.readRelative(artifact.versionRelativePath),
          ...(artifact.characterName === undefined ? {} : { characterName: artifact.characterName }),
        })
      }
      sources.push({ kind: 'full-outline', logicalPath: this.layout.outlineFile, content: outlineContent })
      sources.push({
        kind: 'episode-outlines',
        logicalPath: this.layout.episodeOutlinesFile,
        content: episodeOutlinesContent,
      })
      const sourceDigests = sources.map(source => ({ logicalPath: source.logicalPath, sha256: sha256(source.content) }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(sourceDigests))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const source of sources) {
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, source.logicalPath)
        await this.writeRelative(versionRelativePath, source.content)
        artifacts.push({
          kind: source.kind,
          logicalPath: source.logicalPath,
          versionRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const state: ScreenplayProjectState = {
        ...cloneState(previous),
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          version,
          stage: 'OutlineReady',
          createdFiles: [this.layout.outlineFile, this.layout.episodeOutlinesFile],
          transitionedThrough: 'OutlineCreated',
        }),
      }
    })
  }

  async finalizeOutlineBundle(
    expectedRevision: number,
    operationId: string,
    input: FinalizeOutlineBundleInput,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'outline-created', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', {
          pendingChangeId: previous.pendingChange.id,
        })
      }
      const currentVersion = previous.currentVersion
      if (currentVersion === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the project has no formal artifact set')
      }
      if (currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.outlineFile
        || artifact.logicalPath === this.layout.episodeOutlinesFile)) {
        throw new ScreenplayError('INVALID_STATE', 'outline and episode outlines already exist; use the explicit modification flow')
      }
      const draft = previous.episodeOutlineDraft
      const totalEpisodes = previous.requirements.episodeCount
      if (draft === undefined || totalEpisodes === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'episode outline batches must be completed before finalization')
      }
      if (draft.totalEpisodes !== totalEpisodes || draft.nextEpisode !== totalEpisodes + 1) {
        throw new ScreenplayError('INVALID_STATE', 'episode outline batches are incomplete', {
          expected: { totalEpisodes, nextEpisode: totalEpisodes + 1 },
          actual: { totalEpisodes: draft.totalEpisodes, nextEpisode: draft.nextEpisode },
        })
      }
      if (input === null || typeof input !== 'object' || typeof input.forecastContent !== 'string') {
        throw new ScreenplayError('VALIDATION_FAILED', 'forecastContent is required to finalize episode outlines')
      }
      const outlineContent = normalizeContent(draft.outlineContent, 'full outline content')
      const episodeOutlinesContent = normalizeContent(
        buildEpisodeOutlines(totalEpisodes, draft, input.forecastContent),
        'episode outlines content',
      )
      validateContent('full-outline', outlineContent, undefined, previous.projectName, totalEpisodes)
      validateContent('episode-outlines', episodeOutlinesContent, undefined, previous.projectName, totalEpisodes)

      const sources: Array<{
        kind: ScreenplayArtifactKind
        logicalPath: string
        content: string
        characterName?: string
      }> = []
      for (const artifact of currentVersion.artifacts) {
        sources.push({
          kind: artifact.kind,
          logicalPath: artifact.logicalPath,
          content: await this.readRelative(artifact.versionRelativePath),
          ...(artifact.characterName === undefined ? {} : { characterName: artifact.characterName }),
        })
      }
      sources.push({ kind: 'full-outline', logicalPath: this.layout.outlineFile, content: outlineContent })
      sources.push({
        kind: 'episode-outlines',
        logicalPath: this.layout.episodeOutlinesFile,
        content: episodeOutlinesContent,
      })
      const sourceDigests = sources.map(source => ({ logicalPath: source.logicalPath, sha256: sha256(source.content) }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(sourceDigests))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const source of sources) {
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, source.logicalPath)
        await this.writeRelative(versionRelativePath, source.content)
        artifacts.push({
          kind: source.kind,
          logicalPath: source.logicalPath,
          versionRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const { episodeOutlineDraft: _episodeOutlineDraft, ...base } = cloneState(previous)
      const state: ScreenplayProjectState = {
        ...base,
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          version,
          stage: 'OutlineReady',
          createdFiles: [this.layout.outlineFile, this.layout.episodeOutlinesFile],
          completedEpisodes: totalEpisodes,
          transitionedThrough: 'OutlineFinalized',
        }),
      }
    })
  }

  async writingContext(): Promise<Record<string, unknown>> {
    const snapshot = await this.snapshot('artifacts')
    if (!snapshot.initialized || snapshot.currentVersion === undefined) {
      throw new ScreenplayError('NOT_INITIALIZED', 'screenplay project is not initialized')
    }
    const outlineArtifact = snapshot.currentVersion.artifacts.find(artifact => artifact.logicalPath === this.layout.outlineFile)
    const episodeOutlinesArtifact = snapshot.currentVersion.artifacts.find(
      artifact => artifact.logicalPath === this.layout.episodeOutlinesFile,
    )
    if (outlineArtifact === undefined || episodeOutlinesArtifact === undefined) {
      throw new ScreenplayError('INVALID_STATE', 'formal full outline and episode outlines must exist before screenplay writing')
    }
    const totalEpisodes = snapshot.requirements.episodeCount
    if (totalEpisodes === undefined) {
      throw new ScreenplayError('INVALID_STATE', 'the project has no confirmed episode count')
    }
    const progress = snapshot.writingProgress ?? {
      status: 'NotStarted' as const,
      totalEpisodes,
      nextEpisode: 1,
      completedEpisodes: [],
      episodes: [],
    }
    const outlineContent = snapshot.artifactContents?.[this.layout.outlineFile]
    const episodeOutlinesContent = snapshot.artifactContents?.[this.layout.episodeOutlinesFile]
    if (outlineContent === undefined || episodeOutlinesContent === undefined) {
      throw new ScreenplayError('INVALID_STATE', 'formal outline content is unavailable')
    }
    const currentEpisode = progress.nextEpisode
    const currentOutline = currentEpisode <= totalEpisodes
      ? episodeOutlineBlock(episodeOutlinesContent, currentEpisode)
      : undefined
    const previousRecord = progress.episodes.find(record => record.episode === currentEpisode - 1)
    const previousPath = previousRecord?.logicalPath
    const previousContent = previousPath === undefined ? undefined : snapshot.artifactContents?.[previousPath]
    return {
      ok: true,
      projectName: snapshot.projectName,
      revision: snapshot.revision,
      status: progress.status,
      nextEpisode: currentEpisode,
      totalEpisodes,
      completedEpisodes: progress.completedEpisodes,
      currentEpisodeOutline: currentOutline,
      previousEpisode: previousContent === undefined ? undefined : {
        episode: currentEpisode - 1,
        logicalPath: previousPath,
        content: previousContent,
        continuity: previousRecord?.continuity,
      },
      continuity: progress.continuity,
      formalArtifacts: snapshot.artifactContents,
      fullOutline: outlineContent,
      selectedDurationSeconds: snapshot.requirements.episodeDurationSeconds,
      readyForNextInstruction: true,
    }
  }

  /** Validate episode content without mutating state or materializing a version. */
  async validateEpisodeContent(episode: number, content: string): Promise<number> {
    const snapshot = await this.snapshot('summary')
    if (!snapshot.initialized) {
      throw new ScreenplayError('NOT_INITIALIZED', 'screenplay project is not initialized')
    }
    if (!Number.isSafeInteger(episode) || episode <= 0) {
      throw new ScreenplayError('VALIDATION_FAILED', 'episode must be a positive integer', { episode })
    }
    return validateEpisodeScreenplay(
      normalizeContent(content, `episode ${String(episode)} screenplay content`),
      episode,
      snapshot.requirements.episodeDurationSeconds,
    )
  }

  async createEpisodeScreenplay(
    expectedRevision: number,
    operationId: string,
    input: CreateEpisodeScreenplayInput,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'episode-created', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', {
          pendingChangeId: previous.pendingChange.id,
        })
      }
      const currentVersion = previous.currentVersion
      if (currentVersion === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the project has no formal artifact set')
      }
      const totalEpisodes = previous.requirements.episodeCount
      if (totalEpisodes === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the project has no confirmed episode count')
      }
      const outlineArtifact = currentVersion.artifacts.find(artifact => artifact.logicalPath === this.layout.episodeOutlinesFile)
      if (outlineArtifact === undefined || !currentVersion.artifacts.some(artifact => artifact.logicalPath === this.layout.outlineFile)) {
        throw new ScreenplayError('INVALID_STATE', 'formal outline and episode outlines must exist before screenplay writing')
      }
      const progress = previous.writingProgress ?? {
        status: 'NotStarted' as const,
        totalEpisodes,
        nextEpisode: 1,
        completedEpisodes: [],
        episodes: [],
      }
      if (progress.totalEpisodes !== totalEpisodes) {
        throw new ScreenplayError('INVALID_STATE', 'writing progress does not match the confirmed episode count', {
          expected: totalEpisodes,
          actual: progress.totalEpisodes,
        })
      }
      if (progress.status === 'Completed' || progress.nextEpisode > totalEpisodes) {
        throw new ScreenplayError('INVALID_STATE', 'all screenplay episodes have already been generated', {
          totalEpisodes,
          nextEpisode: progress.nextEpisode,
        })
      }
      if (input === null || typeof input !== 'object' || typeof input.episodeContent !== 'string') {
        throw new ScreenplayError('VALIDATION_FAILED', 'episodeContent is required')
      }
      const episode = progress.nextEpisode
      const logicalPath = episodeScreenplayPath(this.layout, episode)
      if (currentVersion.artifacts.some(artifact => artifact.logicalPath === logicalPath)) {
        throw new ScreenplayError('INVALID_STATE', 'the current episode file already exists; use the explicit modification flow', {
          episode,
          path: logicalPath,
        })
      }
      const outlinesContent = await this.readRelative(outlineArtifact.versionRelativePath)
      const currentOutline = episodeOutlineBlock(outlinesContent, episode)
      if (currentOutline === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'the current episode outline is missing', {
          episode,
          path: this.layout.episodeOutlinesFile,
        })
      }
      const content = normalizeContent(input.episodeContent, `episode ${String(episode)} screenplay content`)
      const count = validateEpisodeScreenplay(content, episode, previous.requirements.episodeDurationSeconds)
      const continuity = normalizeContinuity(input.continuity)
      const sources: Array<{
        kind: ScreenplayArtifactKind
        logicalPath: string
        content: string
        characterName?: string
      }> = []
      for (const artifact of currentVersion.artifacts) {
        sources.push({
          kind: artifact.kind,
          logicalPath: artifact.logicalPath,
          content: await this.readRelative(artifact.versionRelativePath),
          ...(artifact.characterName === undefined ? {} : { characterName: artifact.characterName }),
        })
      }
      sources.push({ kind: 'episode-screenplay', logicalPath, content })
      const sourceDigests = sources.map(source => ({ logicalPath: source.logicalPath, sha256: sha256(source.content) }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(sourceDigests))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const source of sources) {
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, source.logicalPath)
        await this.writeRelative(versionRelativePath, source.content)
        artifacts.push({
          kind: source.kind,
          logicalPath: source.logicalPath,
          versionRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
      }
      const record: ScreenplayEpisodeRecord = {
        episode,
        logicalPath,
        sha256: sha256(content),
        effectiveCharacterCount: count,
        continuity,
        createdAt: time,
      }
      const nextEpisode = episode + 1
      const nextProgress = {
        status: nextEpisode > totalEpisodes ? 'Completed' as const : 'Writing' as const,
        totalEpisodes,
        nextEpisode,
        completedEpisodes: [...progress.completedEpisodes, episode],
        episodes: [...progress.episodes, record],
        continuity,
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const state: ScreenplayProjectState = {
        ...cloneState(previous),
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        writingProgress: nextProgress,
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          stage: 'EpisodeReady',
          episode,
          path: logicalPath,
          createdFiles: [logicalPath],
          effectiveCharacterCount: count,
          currentEpisodeOutline: currentOutline,
          writingStatus: nextProgress.status,
          completedEpisodes: nextProgress.completedEpisodes,
          nextEpisode,
          remainingEpisodes: totalEpisodes - episode,
          readyForNextInstruction: true,
          transitionedThrough: 'EpisodeCreated',
        }),
      }
    })
  }

  async mergeDelivery(
    expectedRevision: number,
    operationId: string,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'delivery-merged', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', {
          pendingChangeId: previous.pendingChange.id,
        })
      }
      const progress = previous.writingProgress
      const totalEpisodes = previous.requirements.episodeCount
      const currentVersion = previous.currentVersion
      if (progress === undefined || progress.status !== 'Completed' || totalEpisodes === undefined || currentVersion === undefined) {
        throw new ScreenplayError('INVALID_STATE', 'all screenplay episodes must be formally generated before delivery')
      }
      const sourceEntries: Array<{ episode: number, logicalPath: string, content: string }> = []
      for (let episode = 1; episode <= totalEpisodes; episode += 1) {
      const logicalPath = episodeScreenplayPath(this.layout, episode)
        const artifact = currentVersion.artifacts.find(candidate => candidate.logicalPath === logicalPath)
        if (artifact === undefined) {
          throw new ScreenplayError('INVALID_STATE', 'a screenplay episode is missing before delivery', { episode, logicalPath })
        }
        const content = await this.readRelative(artifact.versionRelativePath)
        validateEpisodeScreenplay(content, episode, previous.requirements.episodeDurationSeconds)
        sourceEntries.push({ episode, logicalPath, content })
      }
      const mergedPath = deliverablePath(this.layout, previous.projectName)
      const mergedContent = sourceEntries.map(entry => entry.content.trimEnd()).join('\n\n').concat('\n')
      const sources: Array<{
        kind: ScreenplayArtifactKind
        logicalPath: string
        content: string
        characterName?: string
      }> = []
      for (const artifact of currentVersion.artifacts) {
        if (artifact.logicalPath === mergedPath) continue
        sources.push({
          kind: artifact.kind,
          logicalPath: artifact.logicalPath,
          content: await this.readRelative(artifact.versionRelativePath),
          ...(artifact.characterName === undefined ? {} : { characterName: artifact.characterName }),
        })
      }
      sources.push({ kind: 'merged-screenplay', logicalPath: mergedPath, content: mergedContent })
      const sourceDigests = sources.map(source => ({ logicalPath: source.logicalPath, sha256: sha256(source.content) }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(sourceDigests))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const source of sources) {
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, source.logicalPath)
        await this.writeRelative(versionRelativePath, source.content)
        artifacts.push({
          kind: source.kind,
          logicalPath: source.logicalPath,
          versionRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const state: ScreenplayProjectState = {
        ...cloneState(previous),
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          stage: 'DeliveryReady',
          mergedFile: mergedPath,
          createdFiles: currentVersion.artifacts.some(artifact => artifact.logicalPath === mergedPath) ? [] : [mergedPath],
          updatedFiles: currentVersion.artifacts.some(artifact => artifact.logicalPath === mergedPath) ? [mergedPath] : [],
          completedEpisodes: totalEpisodes,
          readyForNextInstruction: true,
          transitionedThrough: 'DeliveryMerged',
        }),
      }
    })
  }

  async prepareChange(
    expectedRevision: number,
    operationId: string,
    requestedChanges: ScreenplayChangeInput[],
  ): Promise<Record<string, unknown>> {
    if (requestedChanges.length === 0) {
      throw new ScreenplayError('INVALID_STATE', 'at least one explicit file change is required')
    }
    return this.mutate(expectedRevision, operationId, 'change-prepared', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', {
          pendingChangeId: previous.pendingChange.id,
        })
      }
      const version = previous.currentVersion
      if (version === undefined) throw new ScreenplayError('INVALID_STATE', 'the project has no formal artifact set')

      const seen = new Set<string>()
      const seenTargets = new Set<string>()
      const pendingSources: Array<{
        artifact: ScreenplayVersionArtifact
        logicalPath: string
        fromLogicalPath?: string
        characterName?: string
        content: string
        oldText: string
      }> = []
      for (const requested of requestedChanges) {
        if (requested === null || typeof requested !== 'object'
          || typeof requested.path !== 'string' || typeof requested.content !== 'string') {
          throw new ScreenplayError('VALIDATION_FAILED', 'each modification requires an exact path and content')
        }
        if (requested.renameTo !== undefined && typeof requested.renameTo !== 'string') {
          throw new ScreenplayError('VALIDATION_FAILED', 'renameTo must be a string when supplied')
        }
        if (requested.path !== requested.path.trim() || seen.has(requested.path)) {
          throw new ScreenplayError('VALIDATION_FAILED', 'change paths must be exact, unique project-relative paths', {
            path: requested.path,
          })
        }
        seen.add(requested.path)
        const artifact = version.artifacts.find(candidate => candidate.logicalPath === requested.path)
        if (artifact === undefined) {
          throw new ScreenplayError('VALIDATION_FAILED', 'only an existing generated screenplay file can be modified', {
            path: requested.path,
            availablePaths: version.artifacts.map(candidate => candidate.logicalPath),
          })
        }
        const renameTo = requested.renameTo
        if (renameTo !== undefined && artifact.kind !== 'main-character') {
          throw new ScreenplayError('VALIDATION_FAILED', 'only a major-character file can be renamed', {
            path: requested.path,
          })
        }
        const nextCharacterName = renameTo ?? artifact.characterName
        if (artifact.kind === 'main-character' && nextCharacterName === undefined) {
          throw new ScreenplayError('INVALID_STATE', 'main-character artifact is missing its character name', {
            path: requested.path,
          })
        }
        if (nextCharacterName !== undefined) validateCharacterName(nextCharacterName)
        const targetPath = renameTo === undefined
          ? requested.path
          : mainCharacterPath(this.layout, nextCharacterName as string)
        if (renameTo !== undefined) {
          if (renameTo === artifact.characterName) {
            throw new ScreenplayError('VALIDATION_FAILED', 'the new character name must differ from the current name', {
              path: requested.path,
              characterName: artifact.characterName,
            })
          }
          if (version.artifacts.some(candidate => candidate.logicalPath === targetPath)) {
            throw new ScreenplayError('VALIDATION_FAILED', 'the new character name is already in use', {
              path: targetPath,
            })
          }
        }
        if (seenTargets.has(targetPath)) {
          throw new ScreenplayError('VALIDATION_FAILED', 'change targets must be unique project-relative paths', {
            path: targetPath,
          })
        }
        seenTargets.add(targetPath)
        const content = normalizeContent(requested.content, `change content for ${requested.path}`)
        const oldText = await this.readRelative(artifact.versionRelativePath)
        const episodeNumber = artifact.kind === 'episode-screenplay'
          ? episodeNumberFromPath(this.layout, requested.path)
          : undefined
        validateContent(
          artifact.kind,
          content,
          nextCharacterName,
          previous.projectName,
          previous.requirements.episodeCount,
          Number.isSafeInteger(episodeNumber) ? episodeNumber : undefined,
          previous.requirements.episodeDurationSeconds,
          artifact.kind === 'main-character' && !hasMainCharacterFieldTemplate(oldText),
        )
        if (artifact.kind === 'creative-contract' && !hasProjectHeading(content, previous.projectName)) {
          throw new ScreenplayError('VALIDATION_FAILED', 'creative contract title must keep the exact project name')
        }
        if (artifact.kind === 'core-setting' && !hasProjectHeading(content, previous.projectName)) {
          throw new ScreenplayError('VALIDATION_FAILED', 'core setting title must keep the exact project name')
        }
        if (content === oldText) {
          throw new ScreenplayError('VALIDATION_FAILED', 'the requested modification does not change the file', {
            path: requested.path,
          })
        }
        pendingSources.push({
          artifact,
          logicalPath: targetPath,
          ...(targetPath === requested.path ? {} : { fromLogicalPath: requested.path }),
          ...(nextCharacterName === undefined ? {} : { characterName: nextCharacterName }),
          content,
          oldText,
        })
      }

      const changeDigest = sha256(pendingSources.map(source => `${source.fromLogicalPath ?? source.artifact.logicalPath}->${source.logicalPath}:${sha256(source.content)}`).join('\n'))
      const changeId = stableId('change', operationId, changeDigest)
      const changes: PendingArtifactChange[] = []
      const previews: ChangePreview[] = []
      for (const source of pendingSources) {
        const afterRelativePath = join(PRIVATE_DIR, 'pending', changeId, source.logicalPath)
        await this.writeRelative(afterRelativePath, source.content)
        changes.push({
          logicalPath: source.logicalPath,
          ...(source.fromLogicalPath === undefined ? {} : { fromLogicalPath: source.fromLogicalPath }),
          kind: source.artifact.kind,
          beforeVersionRelativePath: source.artifact.versionRelativePath,
          afterRelativePath,
          sha256: sha256(source.content),
          ...(source.characterName === undefined ? {} : { characterName: source.characterName }),
        })
        previews.push({
          path: source.logicalPath,
          oldText: source.oldText,
          newText: source.content,
          ...(source.fromLogicalPath === undefined ? {} : {
            fromPath: source.fromLogicalPath,
            toPath: source.logicalPath,
          }),
        })
      }
      const pendingChange = { id: changeId, baseVersionId: version.id, changes, createdAt: time }
      const state: ScreenplayProjectState = {
        ...cloneState(previous),
        phase: 'ChangePending',
        revision,
        pendingChange,
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          pendingChange,
          previews,
          requiresUserDecision: true,
          decision: { kind: 'save-or-discard', options: ['保存修改', '不保存'] },
          ...(changes.some(change => change.fromLogicalPath !== undefined) ? {
            renamedFiles: changes
              .filter(change => change.fromLogicalPath !== undefined)
              .map(change => ({ fromPath: change.fromLogicalPath, toPath: change.logicalPath })),
          } : {}),
        }),
      }
    })
  }

  async saveChange(
    expectedRevision: number,
    operationId: string,
    changeId: string,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'change-saved', async (current, revision, time) => {
      const previous = this.requireState(current)
      const pending = this.requirePendingChange(previous, changeId)
      const currentVersion = previous.currentVersion
      if (currentVersion === undefined || currentVersion.id !== pending.baseVersionId) {
        throw new ScreenplayError('INVALID_STATE', 'the pending change is not based on the current version')
      }
      const replacements = new Map(pending.changes.map(change => [change.fromLogicalPath ?? change.logicalPath, change]))
      const changedEpisodeFile = pending.changes.some(change => Number.isSafeInteger(
        episodeNumberFromPath(this.layout, change.logicalPath),
      ))
      const changedEpisodeNumbers = pending.changes
        .map(change => episodeNumberFromPath(this.layout, change.logicalPath))
        .filter(Number.isSafeInteger)
      const earliestChangedEpisode = changedEpisodeNumbers.length === 0 ? undefined : Math.min(...changedEpisodeNumbers)
      const nextEntries: Array<{ artifact: ScreenplayVersionArtifact, content: string }> = []
      for (const artifact of currentVersion.artifacts) {
        if (changedEpisodeFile && artifact.kind === 'merged-screenplay') continue
        if (earliestChangedEpisode !== undefined && artifact.kind === 'episode-screenplay') {
          const episodeNumber = episodeNumberFromPath(this.layout, artifact.logicalPath)
          if (Number.isSafeInteger(episodeNumber) && episodeNumber > earliestChangedEpisode) continue
        }
        const replacement = replacements.get(artifact.logicalPath)
        const content = await this.readRelative(replacement?.afterRelativePath ?? artifact.versionRelativePath)
        nextEntries.push({
          artifact: {
            ...artifact,
            ...(replacement === undefined ? {} : {
              logicalPath: replacement.logicalPath,
              ...(replacement.characterName === undefined ? {} : { characterName: replacement.characterName }),
            }),
          },
          content,
        })
      }
      const digestEntries = nextEntries.map(({ artifact, content }) => ({
        logicalPath: artifact.logicalPath,
        sha256: sha256(content),
      }))
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(digestEntries))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const entry of nextEntries) {
        const { artifact, content } = entry
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, artifact.logicalPath)
        await this.writeRelative(versionRelativePath, content)
        artifacts.push({ ...artifact, versionRelativePath, sha256: sha256(content) })
      }
      const version: ScreenplayVersion = { id: versionId, revision, artifacts, createdAt: time }
      const { pendingChange: _pendingChange, ...base } = cloneState(previous)
      const changedContents = new Map<string, string>()
      for (const change of pending.changes) {
        changedContents.set(change.logicalPath, await this.readRelative(change.afterRelativePath))
      }
      const nextWritingProgress = writingProgressAfterEpisodeEdit(
        this.layout,
        previous.writingProgress,
        pending.changes.map(change => change.logicalPath),
        changedContents,
      )
      const state: ScreenplayProjectState = {
        ...base,
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        ...(nextWritingProgress === undefined ? {} : { writingProgress: nextWritingProgress }),
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          savedChangeId: changeId,
          changedFiles: pending.changes.map(change => change.logicalPath),
          ...(pending.changes.some(change => change.fromLogicalPath !== undefined) ? {
            renamedFiles: pending.changes
              .filter(change => change.fromLogicalPath !== undefined)
              .map(change => ({ fromPath: change.fromLogicalPath, toPath: change.logicalPath })),
          } : {}),
          version,
          transitionedThrough: 'ChangeSaved',
        }),
      }
    })
  }

  async discardChange(
    expectedRevision: number,
    operationId: string,
    changeId: string,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'change-discarded', (current, revision, time) => {
      const previous = this.requireState(current)
      const pending = this.requirePendingChange(previous, changeId)
      const { pendingChange: _pendingChange, ...base } = cloneState(previous)
      const state: ScreenplayProjectState = {
        ...base,
        phase: 'Ready',
        revision,
        updatedAt: time,
      }
      return {
        state,
        result: stateResult(state, {
          discardedChangeId: changeId,
          unchangedFiles: pending.changes.map(change => change.fromLogicalPath ?? change.logicalPath),
          transitionedThrough: 'ChangeDiscarded',
        }),
      }
    })
  }

  async restoreVersion(
    expectedRevision: number,
    operationId: string,
    sourceVersionId: string,
  ): Promise<Record<string, unknown>> {
    return this.mutate(expectedRevision, operationId, 'version-restored', async (current, revision, time) => {
      const previous = this.requireState(current)
      if (previous.pendingChange !== undefined) {
        throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change before restoring a version')
      }
      const source = previous.versions.find(version => version.id === sourceVersionId)
      if (source === undefined) {
        throw new ScreenplayError('VERSION_NOT_FOUND', `version "${sourceVersionId}" was not found`)
      }
      const versionId = stableId(`v${String(revision)}`, operationId, artifactDigest(source.artifacts))
      const artifacts: ScreenplayVersionArtifact[] = []
      for (const artifact of source.artifacts) {
        const content = await this.readRelative(artifact.versionRelativePath)
        const versionRelativePath = join(PRIVATE_DIR, 'versions', versionId, artifact.logicalPath)
        await this.writeRelative(versionRelativePath, content)
        artifacts.push({ ...artifact, versionRelativePath, sha256: sha256(content) })
      }
      const version: ScreenplayVersion = {
        id: versionId,
        revision,
        artifacts,
        restoredFrom: sourceVersionId,
        createdAt: time,
      }
      const state: ScreenplayProjectState = {
        ...cloneState(previous),
        phase: 'Ready',
        revision,
        currentVersion: version,
        versions: [...previous.versions, version],
        updatedAt: time,
      }
      return { state, result: stateResult(state, { version }) }
    })
  }

  private async mutate(
    expectedRevision: number,
    operationId: string,
    type: ScreenplayEvent['type'],
    transition: (
      current: ScreenplayProjectState | undefined,
      revision: number,
      time: number,
    ) => Promise<{ state: ScreenplayProjectState, result: Record<string, unknown> }>
      | { state: ScreenplayProjectState, result: Record<string, unknown> },
  ): Promise<Record<string, unknown>> {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new ScreenplayError('REVISION_CONFLICT', 'expectedRevision must be a non-negative integer')
    }
    if (operationId.trim().length < 8) {
      throw new ScreenplayError('OPERATION_CONFLICT', 'operationId must contain at least 8 characters')
    }
    await mkdir(this.privateRoot, { recursive: true, mode: 0o700 })
    return withFileLock(this.eventsPath, async () => {
      const events = await this.readEvents()
      const duplicate = events.find(event => event.operationId === operationId)
      if (duplicate !== undefined) {
        if (duplicate.type !== type) {
          throw new ScreenplayError('OPERATION_CONFLICT', 'operationId was already used for another operation', {
            operationId,
            existingType: duplicate.type,
            requestedType: type,
          })
        }
        return structuredClone(duplicate.result)
      }
      const current = events.at(-1)?.state
      const currentRevision = current?.revision ?? 0
      if (expectedRevision !== currentRevision) {
        throw new ScreenplayError('REVISION_CONFLICT', 'screenplay project revision changed', {
          expectedRevision,
          currentRevision,
        })
      }
      const revision = currentRevision + 1
      const time = Date.now()
      const transitioned = await transition(current === undefined ? undefined : cloneState(current), revision, time)
      if (transitioned.state.revision !== revision) {
        throw new ScreenplayError('INVALID_STATE', 'transition produced an invalid revision')
      }
      const event: ScreenplayEvent = {
        schemaVersion: SCREENPLAY_SCHEMA_VERSION,
        seq: events.length,
        revision,
        operationId,
        type,
        time,
        state: cloneState(transitioned.state),
        result: structuredClone(transitioned.result),
      }
      const nextEvents = [...events, event]
      await writeFileAtomic(this.eventsPath, `${nextEvents.map(item => JSON.stringify(item)).join('\n')}\n`, {
        mode: 0o600,
        dirMode: 0o700,
      })
      await this.materialize(event.state, current)
      return structuredClone(event.result)
    })
  }

  private requireState(state: ScreenplayProjectState | undefined): ScreenplayProjectState {
    if (state === undefined) throw new ScreenplayError('NOT_INITIALIZED', 'screenplay project is not initialized')
    return state
  }

  private requirePendingChange(state: ScreenplayProjectState, changeId: string) {
    const pending = state.pendingChange
    if (pending === undefined || pending.id !== changeId) {
      throw new ScreenplayError('CHANGE_NOT_FOUND', `pending change "${changeId}" was not found`)
    }
    return pending
  }

  private async readEvents(): Promise<ScreenplayEvent[]> {
    let text: string
    try {
      text = await readFile(this.eventsPath, 'utf8')
    } catch (error) {
      if (isMissing(error)) return []
      throw error
    }
    const events: ScreenplayEvent[] = []
    for (const [index, line] of text.split('\n').entries()) {
      if (line.trim().length === 0) continue
      const parsed = JSON.parse(line) as ScreenplayEvent
      if (parsed.schemaVersion !== SCREENPLAY_SCHEMA_VERSION || parsed.seq !== events.length) {
        throw new ScreenplayError('INVALID_STATE', `invalid screenplay event at line ${String(index + 1)}`)
      }
      if (parsed.revision !== events.length + 1 || parsed.state.revision !== parsed.revision) {
        throw new ScreenplayError('INVALID_STATE', `invalid screenplay revision at line ${String(index + 1)}`)
      }
      events.push(parsed)
    }
    return events
  }

  private async readVersionContents(version: ScreenplayVersion): Promise<Record<string, string>> {
    const entries = await Promise.all(version.artifacts.map(async artifact => [
      artifact.logicalPath,
      await this.readRelative(artifact.versionRelativePath),
    ] as const))
    return Object.fromEntries(entries)
  }

  private async materialize(
    state: ScreenplayProjectState,
    previousState?: ScreenplayProjectState,
  ): Promise<void> {
    await writeFileAtomic(this.statePath, `${JSON.stringify(state, null, 2)}\n`, {
      mode: 0o600,
      dirMode: 0o700,
    })
    if (state.currentVersion !== undefined) {
      for (const artifact of state.currentVersion.artifacts) {
        const content = await this.readRelative(artifact.versionRelativePath)
        await writeFileAtomic(join(this.workspaceRoot, artifact.logicalPath), content, {
          mode: 0o600,
          dirMode: 0o700,
        })
      }
    }
    const currentPaths = new Set(state.currentVersion?.artifacts.map(artifact => artifact.logicalPath) ?? [])
    const stalePaths = previousState?.currentVersion?.artifacts
      .map(artifact => artifact.logicalPath)
      .filter(path => !currentPaths.has(path)) ?? []
    for (const stalePath of stalePaths) {
      try {
        await unlink(join(this.workspaceRoot, stalePath))
      } catch (error) {
        if (!isMissing(error)) throw error
      }
    }
    await writeFileAtomic(join(this.workspaceRoot, PROJECT_FILE), `${JSON.stringify({
      schemaVersion: state.schemaVersion,
      projectId: state.projectId,
      projectName: state.projectName,
      phase: state.phase,
      revision: state.revision,
      currentVersionId: state.currentVersion?.id ?? null,
      files: state.currentVersion?.artifacts.map(artifact => artifact.logicalPath) ?? [],
    }, null, 2)}\n`, { mode: 0o600, dirMode: 0o700 })
  }

  private async readRelative(relativePath: string): Promise<string> {
    return readFile(this.safeRelative(relativePath), 'utf8')
  }

  private async writeRelative(relativePath: string, content: string): Promise<void> {
    await writeFileAtomic(this.safeRelative(relativePath), content, {
      mode: 0o600,
      dirMode: 0o700,
    })
  }

  private safeRelative(relativePath: string): string {
    const target = resolve(this.workspaceRoot, relativePath)
    const fromRoot = relative(this.workspaceRoot, target)
    if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
      throw new ScreenplayError('INVALID_STATE', 'screenplay state contains a path outside its workspace', {
        relativePath,
      })
    }
    return target
  }
}
