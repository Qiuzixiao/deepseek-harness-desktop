import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CHINESE_SCREENPLAY_LAYOUT, LEGACY_SCREENPLAY_LAYOUT } from '../src/layout.js'
import { ScreenplayProjectStore } from '../src/store.js'
import type { CreateScreenplayArtifactsInput } from '../src/types.js'

const roots: string[] = []

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'screenplay-agent-'))
  roots.push(root)
  return root
}

function contract(title = '测试短剧'): string {
  return [
    `# 《${title}》短剧风格与创作规则`,
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
  ].join('\n').concat('\n')
}

function setting(title = '测试短剧', note = '现实都市'): string {
  return [
    `# 《${title}》核心设定`,
    '## 一、故事世界观',
    note,
    '## 二、核心设定',
    '家庭真相推动主线。',
    '## 三、关键地点',
    '创业公司。',
    '## 四、关键道具（伏笔体系）',
    '旧手机。',
    '## 五、时间线',
    '当代。',
    '## 六、风格底色（一句话）',
    '克制但有爽感。',
  ].join('\n').concat('\n')
}

function mainCharacter(name: string, memory = '冷静创业者'): string {
  return [
    `# ${name}（主要角色）`,
    '## 一句话记忆点',
    memory,
    '',
    '## 基本信息',
    '- **年龄**：29 岁',
    '- **身份**：创业者',
    '- **外貌**：待确认',
    '- **口头禅**：待确认',
    '',
    '## 性格特质',
    '- **核心性格**：克制',
    '- **行为习惯**：待确认',
    '- **内在矛盾**：待确认',
    '- **成长弧光**：待确认',
    '',
    '## 关键经历',
    '- 用户已确认的经历。',
    '',
    '## 人物关系',
    '- **家人**：存在隔阂。',
    '',
    '## 记忆点标签',
    '- **标志动作**：待确认',
    '- **弱点软肋**：待确认',
    '- **代表名场面**：待确认',
    '- **核心标签**：创业者',
  ].join('\n').concat('\n')
}

function legacyMainCharacter(name: string): string {
  return [
    `# ${name}（主要角色）`,
    '## 一句话记忆点',
    '旧项目角色记忆点。',
    '## 基本信息',
    '旧项目基本信息。',
    '## 性格特质',
    '旧项目性格。',
    '## 关键经历',
    '旧项目经历。',
    '## 人物关系',
    '旧项目关系。',
    '## 记忆点标签',
    '旧项目标签。',
  ].join('\n').concat('\n')
}

function otherCharacters(note = '推动家庭冲突'): string {
  return [
    '# 其他关键角色（配角）',
    '## 林母',
    '- **身份**：母亲',
    '- **性格**：直接',
    '- **记忆点**：旧照片',
    `- **作用**：${note}`,
    '## 角色关系图（简要）',
    '林母与顾北辰存在家庭矛盾。',
  ].join('\n').concat('\n')
}

function fullOutline(title = '测试短剧'): string {
  return [
    `# 《${title}》全剧大纲`,
    '',
    '顾北辰正处于家庭关系破裂和事业压力同时逼近的困境，关键证据的出现迫使他重新确认自己想要守住的目标。',
    '',
    '他在苏晚和其他关键人物的推动下逐步面对隐瞒已久的真相，外部阻力不断改变关系、资源和行动方向，最终在最大危机中完成选择并解决核心矛盾。',
  ].join('\n').concat('\n')
}

function episodeOutlines(title = '测试短剧', count = 12): string {
  const lines = [
    `# 《${title}》前 ${String(count)} 集大纲`,
    '',
    '> 单元结构：第 1-3 集完成第一轮身份冲突，后续集数承接主线。',
    '> 每集核心公式：**开场 3 秒钩子 → 冲突升级 → 情绪爆发 → 结尾悬念**。',
    '',
    '---',
  ]
  for (let index = 1; index <= count; index += 1) {
    lines.push(
      '',
      `## 第 ${String(index)} 集《推进${String(index)}》`,
      '',
      '**核心冲突**：顾北辰必须在家庭真相和现实压力之间做出选择。',
      '**情绪定位**：压迫持续增加，主角的态度发生变化。',
      '',
      '- 钩子开场：关键人物带着新的信息出现，打断顾北辰原本的安排。',
      '- 冲突升级：对手利用这条信息改变现场关系，迫使顾北辰采取行动。',
      '- 情绪爆发：顾北辰确认行动后果，第一次公开表达自己的立场。',
      '- **微反转/钩子**：新证据出现，让下一集必须继续处理尚未解决的问题。',
    )
  }
  lines.push('', '---', '', `## 后续主线预告（${String(count)} 集内定向）`, '', '- 顾北辰继续追查证据并面对关系变化。')
  return lines.join('\n').concat('\n')
}

function episodeScript(episode: number, repeats = 15): string {
  const lines = [
    `第${String(episode)}集`,
    '',
    `${String(episode)}-1 客厅 清晨 内`,
    '人物：顾北辰、林母',
    '',
  ]
  for (let index = 1; index <= repeats; index += 1) {
    lines.push(
      `△顾北辰把第${String(index)}份证据放到桌面中央，抬眼等林母回应。`,
      `顾北辰（压低声音）：这件事必须在今天说清楚。`,
      `△林母按住那份证据，没有把手收回去。`,
      '林母：你先告诉我，你准备承担什么结果。',
    )
  }
  lines.push(
    '',
    '【卡点特写：证据已经摆在桌面上，但林母仍然没有交出最后一张照片。】',
    '【本集完】',
  )
  return lines.join('\n').concat('\n')
}

function episodeOutlineBatch(title = '测试短剧', start = 1, end = 5, total = 12): string {
  const lines = [
    `# 《${title}》前 ${String(total)} 集大纲`,
    '',
    '> 单元结构：本批推进主角的第一阶段目标和阻力。',
    '> 每集核心公式：**开场 3 秒钩子 → 冲突升级 → 情绪爆发 → 结尾悬念**。',
    '',
    '---',
  ]
  for (let index = start; index <= end; index += 1) {
    lines.push(
      '',
      `## 第 ${String(index)} 集《推进${String(index)}》`,
      '',
      '**核心冲突**：顾北辰必须在家庭真相和现实压力之间做出选择。',
      '**情绪定位**：压迫持续增加，主角的态度发生变化。',
      '',
      '- 钩子开场：关键人物带着新的信息出现，打断顾北辰原本的安排。',
      '- 冲突升级：对手利用这条信息改变现场关系，迫使顾北辰采取行动。',
      '- 情绪爆发：顾北辰确认行动后果，第一次公开表达自己的立场。',
      '- **微反转/钩子**：新证据出现，让下一集必须继续处理尚未解决的问题。',
    )
  }
  return lines.join('\n').concat('\n')
}

function artifacts(title = '测试短剧'): CreateScreenplayArtifactsInput {
  return {
    contractContent: contract(title),
    settingContent: setting(title),
    mainCharacters: [
      { name: '顾北辰', content: mainCharacter('顾北辰') },
      { name: '苏晚', content: mainCharacter('苏晚', '洞察真相的律师') },
    ],
    otherCharactersContent: otherCharacters(),
  }
}

const requirements = {
  genre: '都市情感',
  audience: '成年短剧用户',
  episodeCount: 12,
  episodeDurationSeconds: 120,
  premise: '创业者在真相公开前修复家庭关系。',
  endingDirection: '完成关系修复并公开真相。',
  constraints: ['不得补写未确认人物事实'],
}

async function readyProject(root: string) {
  const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
  const created = await store.createProject(
    0, 'op-create-project-01', '测试短剧', requirements, artifacts(),
  )
  return { store, created }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('ScreenplayProjectStore', () => {
  it('keeps creation, rename, writing, delivery, and episode repair inside the Chinese layout', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, CHINESE_SCREENPLAY_LAYOUT)

    const created = await store.createProject(
      0, 'op-create-chinese-01', '测试短剧', { ...requirements, episodeCount: 2 }, artifacts(),
    )

    expect(created).toMatchObject({
      createdFiles: [
        '创作合同/creative-contract.md',
        '设定/core-setting.md',
        '人物/主要人物/顾北辰.md',
        '人物/主要人物/苏晚.md',
        '人物/其他人物/other-characters.md',
      ],
    })
    await expect(readFile(join(root, '创作合同', 'creative-contract.md'), 'utf8')).resolves.toBe(contract())
    await expect(readFile(join(root, '人物', '主要人物', '顾北辰.md'), 'utf8')).resolves.toBe(mainCharacter('顾北辰'))
    await expect(readFile(join(root, 'contract', 'creative-contract.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })

    const characterChange = await store.prepareChange(1, 'op-rename-chinese-character', [{
      path: '人物/主要人物/顾北辰.md',
      renameTo: '顾冬装',
      content: mainCharacter('顾冬装'),
    }])
    await store.saveChange(2, 'op-save-chinese-character', (characterChange.pendingChange as { id: string }).id)
    await expect(readFile(join(root, '人物', '主要人物', '顾冬装.md'), 'utf8')).resolves.toBe(mainCharacter('顾冬装'))

    await store.createOutlineBundle(3, 'op-chinese-outline', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines('测试短剧', 2),
    })
    await store.createEpisodeScreenplay(4, 'op-chinese-episode-1', {
      episodeContent: episodeScript(1),
      continuity: { endingState: '第一集结束', openLoops: ['继续'] },
    })
    await store.createEpisodeScreenplay(5, 'op-chinese-episode-2', {
      episodeContent: episodeScript(2),
      continuity: { endingState: '第二集结束', openLoops: [] },
    })
    const delivery = await store.mergeDelivery(6, 'op-chinese-delivery')
    expect(delivery).toMatchObject({ mergedFile: '交付/测试短剧.md' })
    await expect(readFile(join(root, '大纲', 'full-outline.md'), 'utf8')).resolves.toBe(fullOutline())
    await expect(readFile(join(root, '剧本', 'episode-002.md'), 'utf8')).resolves.toBe(episodeScript(2))
    await expect(readFile(join(root, '交付', '测试短剧.md'), 'utf8')).resolves.toContain('第2集')

    const editedEpisode = episodeScript(1).replace('今天说清楚', '今天说得更清楚')
    const episodeChange = await store.prepareChange(7, 'op-edit-chinese-episode', [{
      path: '剧本/episode-001.md',
      content: editedEpisode,
    }])
    await store.saveChange(8, 'op-save-chinese-episode', (episodeChange.pendingChange as { id: string }).id)
    await expect(readFile(join(root, '剧本', 'episode-001.md'), 'utf8')).resolves.toBe(editedEpisode)
    await expect(readFile(join(root, '剧本', 'episode-002.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(root, '交付', '测试短剧.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('creates the complete formal artifact set in one operation', async () => {
    const root = await workspace()
    const { store, created } = await readyProject(root)

    expect(created).toMatchObject({
      ok: true,
      phase: 'Ready',
      revision: 1,
      transitionedThrough: 'ProjectCreated',
      createdFiles: [
        'contract/creative-contract.md',
        'setting/core-setting.md',
        'characters/main/顾北辰.md',
        'characters/main/苏晚.md',
        'characters/other/other-characters.md',
      ],
    })
    expect(await readFile(join(root, 'contract', 'creative-contract.md'), 'utf8')).toBe(contract())
    expect(await readFile(join(root, 'setting', 'core-setting.md'), 'utf8')).toBe(setting())
    expect(await readFile(join(root, 'characters', 'main', '顾北辰.md'), 'utf8'))
      .toBe(mainCharacter('顾北辰'))
    expect(await readFile(join(root, 'characters', 'main', '苏晚.md'), 'utf8'))
      .toBe(mainCharacter('苏晚', '洞察真相的律师'))
    expect(await readFile(join(root, 'characters', 'other', 'other-characters.md'), 'utf8'))
      .toBe(otherCharacters())

    const snapshot = await store.snapshot('artifacts')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.currentVersion?.artifacts).toHaveLength(5)
    expect(Object.keys(snapshot.artifactContents ?? {})).toHaveLength(5)
    expect((await readFile(join(root, '.screenplay', 'events.jsonl'), 'utf8')).trim().split('\n')).toHaveLength(1)
  })

  it('accepts facts-oriented initial artifacts without forcing a complete legacy template', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, CHINESE_SCREENPLAY_LAYOUT)
    const created = await store.createProject(0, 'op-flexible-initial-artifacts', '测试短剧', requirements, {
      contractContent: '# 《测试短剧》创作合同\n\n## 一、项目定位\n由用户确认的项目事实。',
      settingContent: '# 《测试短剧》核心设定\n\n## 世界与边界\n当代城市。',
      mainCharacters: [{
        name: '顾北辰',
        content: '# 顾北辰\n\n## 基本信息\n创业者，其他信息待用户确认。',
      }],
      otherCharactersContent: '# 《测试短剧》其他人物\n\n## 待补人物\n随剧情方向确认。',
    })

    expect(created).toMatchObject({ ok: true, revision: 1 })
  })

  it('uses the explicit project folder name as the canonical title for all initial artifacts', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await store.createProject(
      0,
      'op-canonical-project-title',
      '明确项目名',
      { ...requirements, title: '素材中另一个片名' },
      artifacts('明确项目名'),
    )

    const snapshot = await store.snapshot('full')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.projectName).toBe('明确项目名')
    expect(snapshot.requirements.title).toBe('明确项目名')
    expect(snapshot.artifactContents?.['contract/creative-contract.md']?.split('\n', 1)[0])
      .toBe('# 《明确项目名》短剧风格与创作规则')
  })

  it('creates the full outline and image-format episode outlines together in the corresponding folders', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const created = await store.createOutlineBundle(1, 'op-create-outline-bundle', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines(),
    })

    expect(created).toMatchObject({
      ok: true,
      phase: 'Ready',
      revision: 2,
      stage: 'OutlineReady',
      transitionedThrough: 'OutlineCreated',
      createdFiles: ['outline/full-outline.md', 'episodes/episode-outlines.md'],
    })
    expect(await readFile(join(root, 'outline', 'full-outline.md'), 'utf8')).toBe(fullOutline())
    expect(await readFile(join(root, 'episodes', 'episode-outlines.md'), 'utf8')).toBe(episodeOutlines())
    const snapshot = await store.snapshot('summary')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.currentVersion?.artifacts).toHaveLength(7)
    expect(snapshot.currentVersion?.artifacts.map(artifact => artifact.logicalPath)).toEqual(expect.arrayContaining([
      'outline/full-outline.md',
      'episodes/episode-outlines.md',
    ]))
    expect((await readFile(join(root, '.screenplay', 'events.jsonl'), 'utf8')).trim().split('\n')).toHaveLength(2)
  })

  it('creates the formal full outline first and lets episode batches follow it', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const outlineCreated = await store.createOutline(1, 'op-create-formal-outline', fullOutline())

    expect(outlineCreated).toMatchObject({
      phase: 'Ready',
      stage: 'OutlineReady',
      formalFilesCreated: true,
      createdFiles: ['outline/full-outline.md'],
      readyForNextInstruction: true,
    })
    expect(await readFile(join(root, 'outline', 'full-outline.md'), 'utf8')).toBe(fullOutline())
    await expect(readFile(join(root, 'episodes', 'episode-outlines.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })

    const batch = await store.createEpisodeOutlineBatch(2, 'op-create-formal-episode-batch', {
      startEpisode: 1,
      endEpisode: 5,
      episodeOutlinesContent: episodeOutlineBatch(),
    })
    expect(batch).toMatchObject({
      phase: 'Ready',
      formalFilesCreated: true,
      createdFiles: ['episodes/episode-outlines.md'],
      readyForNextInstruction: true,
    })
    const episodes = await readFile(join(root, 'episodes', 'episode-outlines.md'), 'utf8')
    expect(episodes.match(/^##\s+第\s+\d+\s+集《/gmu)).toHaveLength(5)
  })

  it('accepts a full-outline H1 that contains the project name without fixed decorative wording', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const created = await store.createOutline(1, 'op-flexible-outline-title', [
      '# 测试短剧',
      '',
      '顾北辰在家庭关系和现实压力同时逼近时确认了自己必须解决的核心问题。',
      '',
      '他在阻力持续变化的过程中采取行动，最终承担选择的后果并处理核心矛盾。',
    ].join('\n'))

    expect(created).toMatchObject({ ok: true, stage: 'OutlineReady' })
  })

  it('honors an explicitly requested 1-3 episode batch without changing the total-count title', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const batch = await store.createEpisodeOutlineBatch(1, 'op-explicit-three-episode-batch', {
      startEpisode: 1,
      endEpisode: 3,
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlineBatch('测试短剧', 1, 3, 12),
    })

    expect(batch).toMatchObject({
      phase: 'Ready',
      completedEpisodes: 3,
      nextEpisode: 4,
      remainingEpisodes: 9,
      readyForNextInstruction: true,
    })
    const episodes = await readFile(join(root, 'episodes', 'episode-outlines.md'), 'utf8')
    expect(episodes.split('\n', 1)[0]).toBe('# 《测试短剧》前 12 集大纲')
    expect(episodes.match(/^##\s+第\s+\d+\s+集《/gmu)).toHaveLength(3)
    expect(episodes).toContain('## 第 1 集《推进1》')
    expect(episodes).toContain('## 第 3 集《推进3》')
    expect(episodes).not.toContain('## 第 4 集《推进4》')
  })

  it('reports the batch range separately when the title uses the batch size instead of total episodes', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    await expect(store.createEpisodeOutlineBatch(1, 'op-wrong-batch-title', {
      startEpisode: 1,
      endEpisode: 3,
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlineBatch('测试短剧', 1, 3, 3),
    })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'episode outline title must use the exact project folder name and confirmed total episode count',
      details: {
        issues: expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            totalEpisodes: 12,
            requestedBatch: { startEpisode: 1, endEpisode: 3 },
            titleNumberMeaning: 'confirmed total episode count, not the current batch size',
          }),
        ]),
      },
    })
  })

  it('writes outline files into their corresponding folders after every batch and stops without approval', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const first = await store.createEpisodeOutlineBatch(1, 'op-episode-batch-1', {
      startEpisode: 1,
      endEpisode: 5,
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlineBatch(),
    })

    expect(first).toMatchObject({
      phase: 'Ready',
      stage: 'EpisodeOutlineBatchReady',
      completedEpisodes: 5,
      nextEpisode: 6,
      remainingEpisodes: 7,
      readyForNextInstruction: true,
      formalFilesCreated: true,
      createdFiles: ['outline/full-outline.md', 'episodes/episode-outlines.md'],
      updatedFiles: [],
    })
    expect(await readFile(join(root, 'outline', 'full-outline.md'), 'utf8')).toBe(fullOutline())
    const firstEpisodes = await readFile(join(root, 'episodes', 'episode-outlines.md'), 'utf8')
    expect(firstEpisodes.match(/^##\s+第\s+\d+\s+集《/gmu)).toHaveLength(5)
    expect(firstEpisodes).not.toContain('## 后续主线预告')

    const second = await store.createEpisodeOutlineBatch(2, 'op-episode-batch-2', {
      startEpisode: 6,
      endEpisode: 12,
      episodeOutlinesContent: episodeOutlineBatch('测试短剧', 6, 12),
      forecastContent: '- 顾北辰继续追查证据并面对关系变化。',
    })
    expect(second).toMatchObject({
      phase: 'Ready',
      completedEpisodes: 12,
      nextEpisode: 13,
      remainingEpisodes: 0,
      readyForNextInstruction: true,
      formalFilesCreated: true,
      createdFiles: [],
      updatedFiles: ['episodes/episode-outlines.md'],
      completed: true,
    })
    expect(await readFile(join(root, 'outline', 'full-outline.md'), 'utf8')).toBe(fullOutline())
    const finalEpisodes = await readFile(join(root, 'episodes', 'episode-outlines.md'), 'utf8')
    expect(finalEpisodes).toContain('## 第 1 集《推进1》')
    expect(finalEpisodes).toContain('## 第 12 集《推进12》')
    expect(finalEpisodes.match(/^##\s+第\s+\d+\s+集《/gmu)).toHaveLength(12)
    expect(finalEpisodes).toContain('## 后续主线预告（12 集内定向）')
    const snapshot = await store.snapshot('summary')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.episodeOutlineDraft).toBeUndefined()
    expect(snapshot.currentVersion?.artifacts).toHaveLength(7)
    expect((await readFile(join(root, '.screenplay', 'events.jsonl'), 'utf8')).trim().split('\n')).toHaveLength(3)
  })

  it('creates only the current next screenplay episode as a formal file and advances private continuity', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    await store.createOutlineBundle(1, 'op-writing-outline', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines(),
    })

    const created = await store.createEpisodeScreenplay(2, 'op-create-episode-1', {
      episodeContent: episodeScript(1),
      continuity: {
        endingState: '证据留在桌面，林母扣住最后一张照片。',
        openLoops: ['林母是否交出照片'],
        characterStates: { 顾北辰: '决定当天追问真相' },
      },
    })

    expect(created).toMatchObject({
      phase: 'Ready',
      stage: 'EpisodeReady',
      episode: 1,
      path: 'screenplay/episode-001.md',
      createdFiles: ['screenplay/episode-001.md'],
      writingStatus: 'Writing',
      nextEpisode: 2,
      completedEpisodes: [1],
      readyForNextInstruction: true,
    })
    expect(await readFile(join(root, 'screenplay', 'episode-001.md'), 'utf8')).toBe(episodeScript(1))
    await expect(readFile(join(root, 'screenplay', 'episode-002.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })

    const context = await store.writingContext()
    expect(context).toMatchObject({
      status: 'Writing',
      nextEpisode: 2,
      totalEpisodes: 12,
      currentEpisodeOutline: expect.stringContaining('## 第 2 集《推进2》'),
      previousEpisode: { episode: 1, logicalPath: 'screenplay/episode-001.md' },
    })
  })

  it('rejects a screenplay that tries to skip the state-selected episode or fails the generic format', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    await store.createOutlineBundle(1, 'op-writing-invalid-outline', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines(),
    })

    await expect(store.createEpisodeScreenplay(2, 'op-writing-invalid-1', {
      episodeContent: episodeScript(3),
      continuity: { endingState: '未完成', openLoops: ['继续'] },
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    await expect(readFile(join(root, 'screenplay', 'episode-001.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })

    await expect(store.createEpisodeScreenplay(2, 'op-writing-invalid-2', {
      episodeContent: '第1集\n\n1-1 客厅 清晨 内\n人物：顾北辰\n顾北辰：不合格\n【本集完】\n',
      continuity: { endingState: '未完成', openLoops: [] },
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('uses the explicit save/discard flow for episode edits and resets only affected later episodes', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await store.createProject(0, 'op-edit-project', '测试短剧', { ...requirements, episodeCount: 2 }, artifacts())
    await store.createOutlineBundle(1, 'op-edit-outline', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines('测试短剧', 2),
    })
    await store.createEpisodeScreenplay(2, 'op-edit-episode-1', {
      episodeContent: episodeScript(1),
      continuity: { endingState: '第一集结束', openLoops: ['继续'], },
    })
    await store.createEpisodeScreenplay(3, 'op-edit-episode-2', {
      episodeContent: episodeScript(2),
      continuity: { endingState: '第二集结束', openLoops: ['继续'], },
    })

    const updatedEpisode = episodeScript(1).replace('今天说清楚', '今天说得更清楚')
    const prepared = await store.prepareChange(4, 'op-edit-prepare', [{
      path: 'screenplay/episode-001.md',
      content: updatedEpisode,
    }])
    expect(prepared).toMatchObject({
      phase: 'ChangePending',
      requiresUserDecision: true,
      decision: { options: ['保存修改', '不保存'] },
    })
    expect(await readFile(join(root, 'screenplay', 'episode-001.md'), 'utf8')).toBe(episodeScript(1))

    const saved = await store.saveChange(5, 'op-edit-save', (prepared.pendingChange as { id: string }).id)
    expect(saved).toMatchObject({ phase: 'Ready', changedFiles: ['screenplay/episode-001.md'] })
    expect(await readFile(join(root, 'screenplay', 'episode-001.md'), 'utf8')).toBe(updatedEpisode)
    await expect(readFile(join(root, 'screenplay', 'episode-002.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })
    const snapshot = await store.snapshot('summary')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.writingProgress).toMatchObject({ status: 'Writing', nextEpisode: 2, completedEpisodes: [1] })
  })

  it('merges completed formal episodes into the project-named delivery folder only on explicit delivery', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await store.createProject(0, 'op-one-episode-project', '测试短剧', { ...requirements, episodeCount: 1 }, artifacts())
    await store.createOutlineBundle(1, 'op-one-episode-outline', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines('测试短剧', 1),
    })
    await store.createEpisodeScreenplay(2, 'op-one-episode-create', {
      episodeContent: episodeScript(1),
      continuity: { endingState: '单集结束', openLoops: [] },
    })

    const merged = await store.mergeDelivery(3, 'op-one-episode-merge')
    expect(merged).toMatchObject({
      phase: 'Ready',
      stage: 'DeliveryReady',
      mergedFile: 'deliverables/测试短剧.md',
      createdFiles: ['deliverables/测试短剧.md'],
      completedEpisodes: 1,
    })
    expect(await readFile(join(root, 'deliverables', '测试短剧.md'), 'utf8'))
      .toBe(episodeScript(1))
  })

  it('rejects a non-continuous episode batch without writing formal files', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    await expect(store.createEpisodeOutlineBatch(1, 'op-episode-batch-gap', {
      startEpisode: 2,
      endEpisode: 5,
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlineBatch('测试短剧', 2, 5),
    })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { issues: expect.arrayContaining([expect.objectContaining({ field: 'startEpisode' })]) },
    })
    await expect(readFile(join(root, 'outline', 'full-outline.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects incomplete image-format episode outlines and duplicate bundle creation', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    await expect(store.createOutlineBundle(1, 'op-invalid-outline-bundle', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines().replace('**情绪定位**：', ''),
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })

    await store.createOutlineBundle(1, 'op-create-outline-once', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines(),
    })
    await expect(store.createOutlineBundle(2, 'op-create-outline-twice', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines(),
    })).rejects.toMatchObject({ code: 'INVALID_STATE' })
  })

  it('returns structured validation issues when a detailed episode list is sent as the full outline', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const mixedOutline = [
      '# 《测试短剧》全剧大纲',
      '',
      '第一幕开始，主角面临家庭和事业的双重困境。',
      '',
      '## 第 1 集《开场》',
      '',
      '1. 逐集事件被错误地写进全剧大纲。',
      '',
      '## 第 2 集《升级》',
      '',
      '2. 另一条逐集事件继续展开。',
    ].join('\n')
    await expect(store.createOutlineBundle(1, 'op-mixed-outline-rejected', {
      outlineContent: mixedOutline,
      episodeOutlinesContent: episodeOutlines(),
    })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      details: {
        artifact: 'full-outline',
        written: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ field: 'structure' }),
        ]),
      },
    })
    await expect(readFile(join(root, 'outline', 'full-outline.md'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('uses the existing save-or-discard flow when an outline or episode outline is later modified', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    await store.createOutlineBundle(1, 'op-create-outline-for-edit', {
      outlineContent: fullOutline(),
      episodeOutlinesContent: episodeOutlines(),
    })
    const updatedEpisodes = episodeOutlines().replace(
      '顾北辰必须在家庭真相和现实压力之间做出选择。',
      '顾北辰必须在公开证据和保护关系之间做出选择。',
    )
    const prepared = await store.prepareChange(2, 'op-prepare-episode-edit', [{
      path: 'episodes/episode-outlines.md',
      content: updatedEpisodes,
    }])
    expect(prepared).toMatchObject({
      phase: 'ChangePending',
      requiresUserDecision: true,
      decision: { options: ['保存修改', '不保存'] },
    })
    const saved = await store.saveChange(3, 'op-save-episode-edit', (prepared.pendingChange as { id: string }).id)
    expect(saved).toMatchObject({
      phase: 'Ready',
      changedFiles: ['episodes/episode-outlines.md'],
    })
    expect(await readFile(join(root, 'episodes', 'episode-outlines.md'), 'utf8')).toBe(updatedEpisodes)
  })

  it('rejects duplicate or filesystem-invalid exact major-character filenames', async () => {
    const root = await workspace()
    const duplicate = artifacts()
    duplicate.mainCharacters.push({ name: '顾北辰', content: mainCharacter('顾北辰') })
    await expect(new ScreenplayProjectStore(root).createProject(
      0, 'op-duplicate-name', '测试短剧', requirements, duplicate,
    )).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })

    const invalidRoot = await workspace()
    const invalid = artifacts()
    invalid.mainCharacters = [{ name: '顾/北辰', content: mainCharacter('顾/北辰') }]
    await expect(new ScreenplayProjectStore(invalidRoot).createProject(
      0, 'op-invalid-name-1', '测试短剧', requirements, invalid,
    )).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('rejects files that do not follow the required reference structures', async () => {
    const root = await workspace()
    const invalid = artifacts()
    invalid.settingContent = '# 《测试短剧》核心设定\n'
    await expect(new ScreenplayProjectStore(root).createProject(
      0, 'op-invalid-format', '测试短剧', requirements, invalid,
    )).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      details: {
        artifact: 'core-setting',
        issues: expect.arrayContaining([expect.objectContaining({ field: 'sections' })]),
      },
    })
  })

  it('rejects compressed character content and reports missing field names', async () => {
    const root = await workspace()
    const invalid = artifacts()
    invalid.mainCharacters = [{
      name: '顾北辰',
      content: legacyMainCharacter('顾北辰'),
    }]
    await expect(new ScreenplayProjectStore(root).createProject(
      0, 'op-invalid-character-template', '测试短剧', requirements, invalid,
    )).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'major character 顾北辰 does not match the field-level Markdown template',
      details: {
        issues: expect.arrayContaining([
          expect.objectContaining({
            section: '基本信息',
            missingFields: expect.arrayContaining(['年龄', '身份', '外貌', '口头禅']),
          }),
        ]),
      },
    })
  })

  it('prepares only explicit changes without touching formal files, then saves a complete version', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const updatedCharacter = mainCharacter('顾北辰', '外冷内热的创业者')
    const prepared = await store.prepareChange(1, 'op-prepare-change', [{
      path: 'characters/main/顾北辰.md',
      content: updatedCharacter,
    }])
    expect(prepared).toMatchObject({
      phase: 'ChangePending',
      revision: 2,
      requiresUserDecision: true,
      decision: { options: ['保存修改', '不保存'] },
    })
    expect(await readFile(join(root, 'characters', 'main', '顾北辰.md'), 'utf8'))
      .toBe(mainCharacter('顾北辰'))

    const changeId = (prepared.pendingChange as { id: string }).id
    const saved = await store.saveChange(2, 'op-save-change-01', changeId)
    expect(saved).toMatchObject({
      phase: 'Ready',
      revision: 3,
      changedFiles: ['characters/main/顾北辰.md'],
      transitionedThrough: 'ChangeSaved',
    })
    expect(await readFile(join(root, 'characters', 'main', '顾北辰.md'), 'utf8')).toBe(updatedCharacter)
    expect(await readFile(join(root, 'contract', 'creative-contract.md'), 'utf8')).toBe(contract())
    const snapshot = await store.snapshot('artifacts')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.versions).toHaveLength(2)
    expect(snapshot.currentVersion?.artifacts).toHaveLength(5)
  })

  it('renames a major character only when renameTo is explicit and removes the old formal file on save', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const prepared = await store.prepareChange(1, 'op-prepare-rename', [{
      path: 'characters/main/顾北辰.md',
      renameTo: '顾冬装',
      content: mainCharacter('顾冬装', '改名后的创业者'),
    }])

    expect(prepared).toMatchObject({
      phase: 'ChangePending',
      requiresUserDecision: true,
      renamedFiles: [{
        fromPath: 'characters/main/顾北辰.md',
        toPath: 'characters/main/顾冬装.md',
      }],
      previews: [{
        path: 'characters/main/顾冬装.md',
        fromPath: 'characters/main/顾北辰.md',
        toPath: 'characters/main/顾冬装.md',
      }],
    })
    expect(await readFile(join(root, 'characters', 'main', '顾北辰.md'), 'utf8'))
      .toBe(mainCharacter('顾北辰'))
    await expect(readFile(join(root, 'characters', 'main', '顾冬装.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })

    const changeId = (prepared.pendingChange as { id: string }).id
    const saved = await store.saveChange(2, 'op-save-rename', changeId)
    expect(saved).toMatchObject({
      phase: 'Ready',
      changedFiles: ['characters/main/顾冬装.md'],
      renamedFiles: [{
        fromPath: 'characters/main/顾北辰.md',
        toPath: 'characters/main/顾冬装.md',
      }],
    })
    await expect(readFile(join(root, 'characters', 'main', '顾北辰.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(root, 'characters', 'main', '顾冬装.md'), 'utf8'))
      .toBe(mainCharacter('顾冬装', '改名后的创业者'))
    const snapshot = await store.snapshot('summary')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.currentVersion?.artifacts.map(artifact => artifact.logicalPath))
      .toContain('characters/main/顾冬装.md')
    expect(snapshot.currentVersion?.artifacts.map(artifact => artifact.logicalPath))
      .not.toContain('characters/main/顾北辰.md')
    expect(snapshot.currentVersion?.artifacts.find(artifact => artifact.logicalPath === 'characters/main/顾冬装.md')?.characterName)
      .toBe('顾冬装')
  })

  it('rejects an implicit or conflicting major-character rename', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    await expect(store.prepareChange(1, 'op-rename-conflict', [{
      path: 'characters/main/顾北辰.md',
      renameTo: '苏晚',
      content: mainCharacter('苏晚'),
    }])).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    await expect(store.prepareChange(1, 'op-rename-other-file', [{
      path: 'characters/other/other-characters.md',
      renameTo: '配角新名',
      content: otherCharacters(),
    }])).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    await expect(store.prepareChange(1, 'op-rename-title-only', [{
      path: 'characters/main/顾北辰.md',
      content: mainCharacter('顾冬装'),
    }])).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('restores the old character filename and removes the renamed filename', async () => {
    const root = await workspace()
    const { store, created } = await readyProject(root)
    const originalVersionId = (created.version as { id: string }).id
    const prepared = await store.prepareChange(1, 'op-prepare-rename-restore', [{
      path: 'characters/main/顾北辰.md',
      renameTo: '顾冬装',
      content: mainCharacter('顾冬装'),
    }])
    await store.saveChange(2, 'op-save-rename-restore', (prepared.pendingChange as { id: string }).id)
    await expect(readFile(join(root, 'characters', 'main', '顾冬装.md'), 'utf8')).resolves.toBe(mainCharacter('顾冬装'))

    await store.restoreVersion(3, 'op-restore-before-rename', originalVersionId)
    expect(await readFile(join(root, 'characters', 'main', '顾北辰.md'), 'utf8')).toBe(mainCharacter('顾北辰'))
    await expect(readFile(join(root, 'characters', 'main', '顾冬装.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('discards an explicit modification without changing formal files or versions', async () => {
    const root = await workspace()
    const { store } = await readyProject(root)
    const prepared = await store.prepareChange(1, 'op-prepare-discard', [{
      path: 'characters/other/other-characters.md',
      content: otherCharacters('只提供线索'),
    }])
    const changeId = (prepared.pendingChange as { id: string }).id
    const discarded = await store.discardChange(2, 'op-discard-change', changeId)
    expect(discarded).toMatchObject({
      phase: 'Ready',
      revision: 3,
      transitionedThrough: 'ChangeDiscarded',
    })
    expect(await readFile(join(root, 'characters', 'other', 'other-characters.md'), 'utf8'))
      .toBe(otherCharacters())
    const snapshot = await store.snapshot('summary')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.pendingChange).toBeUndefined()
    expect(snapshot.versions).toHaveLength(1)
  })

  it('restores the entire historical artifact set as a new version', async () => {
    const root = await workspace()
    const { store, created } = await readyProject(root)
    const originalVersionId = (created.version as { id: string }).id
    const prepared = await store.prepareChange(1, 'op-prepare-multi', [
      { path: 'setting/core-setting.md', content: setting('测试短剧', '近未来都市') },
      { path: 'characters/main/苏晚.md', content: mainCharacter('苏晚', '选择公开真相的律师') },
    ])
    await store.saveChange(2, 'op-save-multi-1', (prepared.pendingChange as { id: string }).id)
    expect(await readFile(join(root, 'setting', 'core-setting.md'), 'utf8'))
      .toBe(setting('测试短剧', '近未来都市'))

    const restored = await store.restoreVersion(3, 'op-restore-set-1', originalVersionId)
    expect(restored).toMatchObject({ phase: 'Ready', revision: 4 })
    expect(await readFile(join(root, 'setting', 'core-setting.md'), 'utf8')).toBe(setting())
    expect(await readFile(join(root, 'characters', 'main', '苏晚.md'), 'utf8'))
      .toBe(mainCharacter('苏晚', '洞察真相的律师'))
    const snapshot = await store.snapshot('summary')
    if (!snapshot.initialized) throw new Error('expected initialized snapshot')
    expect(snapshot.currentVersion?.restoredFrom).toBe(originalVersionId)
    expect(snapshot.currentVersion?.artifacts).toHaveLength(5)
  })

  it('is idempotent, rejects stale revisions, and rebuilds materialized state after restart', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    const first = await store.createProject(0, 'op-idempotent-create', '测试短剧', requirements, artifacts())
    const duplicate = await store.createProject(0, 'op-idempotent-create', '不会覆盖', requirements, artifacts())
    expect(duplicate).toEqual(first)
    await expect(store.prepareChange(0, 'op-stale-change-1', [{
      path: 'setting/core-setting.md',
      content: setting('测试短剧', '错误覆盖'),
    }])).rejects.toMatchObject({ code: 'REVISION_CONFLICT' })

    await writeFile(join(root, '.screenplay', 'state.json'), '{broken', 'utf8')
    await writeFile(join(root, 'setting', 'core-setting.md'), 'corrupted', 'utf8')
    const resumed = new ScreenplayProjectStore(root)
    const snapshot = await resumed.snapshot('artifacts')
    expect(snapshot).toMatchObject({ initialized: true, phase: 'Ready', revision: 1 })
    expect(await readFile(join(root, 'setting', 'core-setting.md'), 'utf8')).toBe(setting())
    const repaired = JSON.parse(await readFile(join(root, '.screenplay', 'state.json'), 'utf8')) as { revision: number }
    expect(repaired.revision).toBe(1)
  })
})
