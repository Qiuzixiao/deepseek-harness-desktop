import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LEGACY_SCREENPLAY_LAYOUT } from '../src/layout.js'
import { ScreenplayProjectStore } from '../src/store.js'
import type { CreateScreenplayArtifactsInput } from '../src/types.js'

const roots: string[] = []

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'screenplay-diagnose-'))
  roots.push(root)
  return root
}

function contract(title = '诊断短剧'): string {
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

function setting(title = '诊断短剧'): string {
  return [
    `# 《${title}》核心设定`,
    '## 一、故事世界观',
    '现实都市。',
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

function mainCharacter(name: string): string {
  return [
    `# ${name}（主要角色）`,
    '## 一句话记忆点',
    '冷静创业者。',
    '## 基本信息',
    '- **年龄**：29 岁',
    '- **身份**：创业者',
    '- **外貌**：待确认',
    '- **口头禅**：待确认',
    '## 性格特质',
    '- **核心性格**：克制',
    '- **行为习惯**：待确认',
    '- **内在矛盾**：待确认',
    '- **成长弧光**：待确认',
    '## 关键经历',
    '- 用户已确认的经历。',
    '## 人物关系',
    '- **家人**：存在隔阂。',
    '## 记忆点标签',
    '- **标志动作**：待确认',
    '- **弱点软肋**：待确认',
    '- **代表名场面**：待确认',
    '- **核心标签**：创业者',
  ].join('\n').concat('\n')
}

function otherCharacters(): string {
  return [
    '# 其他关键角色（配角）',
    '## 林母',
    '- **身份**：母亲',
    '- **性格**：直接',
    '- **记忆点**：旧照片',
    '- **作用**：推动家庭冲突',
    '## 角色关系图（简要）',
    '林母与顾北辰存在家庭矛盾。',
  ].join('\n').concat('\n')
}

function artifacts(title = '诊断短剧'): CreateScreenplayArtifactsInput {
  return {
    contractContent: contract(title),
    settingContent: setting(title),
    mainCharacters: [
      { name: '顾北辰', content: mainCharacter('顾北辰') },
      { name: '苏晚', content: mainCharacter('苏晚') },
    ],
    otherCharactersContent: otherCharacters(),
  }
}

const requirements = {
  genre: '都市情感',
  audience: '成年短剧用户',
  episodeCount: 2,
  episodeDurationSeconds: 120,
  premise: '创业者在真相公开前修复家庭关系。',
  endingDirection: '完成关系修复并公开真相。',
  constraints: ['不得补写未确认人物事实'],
}

function episodeOutlines(title = '诊断短剧', count = 2): string {
  const lines = [
    `# 《${title}》前 ${String(count)} 集大纲`,
    '',
    '> 单元结构：前 2 集完成第一轮身份冲突。',
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
      '**情绪定位**：压迫持续增加。',
      '- 钩子开场：顾北辰把证据推到桌面中央。',
      '- 冲突升级：林母提出新的条件。',
      '- 情绪爆发：顾北辰首次说出真实诉求。',
      '- **微反转/钩子**：最后一张照片被扣住。',
    )
  }
  lines.push(
    '',
    '## 后续主线预告（集数内定向）',
    '',
    '- 前 2 集之后，家庭真相进一步公开，主角与林母的关系走向不可逆变化。',
  )
  return lines.join('\n').concat('\n')
}

function validEpisode(episode: number): string {
  const lines = [
    `第${String(episode)}集`,
    '',
    `${String(episode)}-1 客厅 清晨 内`,
    '人物：顾北辰、林母',
    '',
  ]
  for (let index = 1; index <= 15; index += 1) {
    lines.push(
      `△顾北辰把第${String(index)}份证据放到桌面中央，抬眼等林母回应。`,
      '顾北辰（压低声音）：这件事必须在今天说清楚。',
      '△林母按住那份证据，没有把手收回去。',
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


afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('screenplay_diagnose（70 项清单）', () => {
  it('rejects diagnosis before the project is initialized', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await expect(store.diagnose()).rejects.toMatchObject({ code: 'NOT_INITIALIZED' })
  })

  it('returns the methodology checklist and pending-character findings on a fresh project', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await store.createProject(0, 'op-diagnose-01', '诊断短剧', requirements, artifacts())
    const diagnosis = await store.diagnose() as { ok: boolean, checklist: Array<{ id: string }>, issues: Array<{ category: string }>, summary: { errorCount: number } }
    expect(diagnosis.ok).toBe(true)
    expect(diagnosis.checklist).toHaveLength(12)
    expect(diagnosis.checklist.map(item => item.id)).toContain('four-act')
    expect(diagnosis.checklist.map(item => item.id)).toContain('neutral-event')
    expect(diagnosis.checklist.map(item => item.id)).toContain('deliverable-sell')
    expect(diagnosis.issues.some(issue => issue.category === 'character-pending')).toBe(true)
    expect(diagnosis.summary.errorCount).toBe(0)
  })

  it('flags abstract action lines introduced through the modification flow', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await store.createProject(0, 'op-diagnose-02', '诊断短剧', requirements, artifacts())
    await store.createOutlineBundle(1, 'op-diagnose-outline', {
      outlineContent: '# 《诊断短剧》全剧大纲\n\n顾北辰正处于家庭关系破裂的困境，关键证据的出现迫使他在真相与压力之间做出选择。\n\n他在各方压力下逐步面对隐瞒已久的真相，最终在最大危机中完成选择并解决核心矛盾。\n',
      episodeOutlinesContent: episodeOutlines(),
    })
    await store.createEpisodeScreenplay(2, 'op-diagnose-episode', {
      episodeContent: validEpisode(1),
      continuity: { endingState: '证据在桌', openLoops: ['照片去向'] },
    })

    // 修改流程引入一条抽象动作行（写时校验不拦截），诊断应发现它
    const polluted = validEpisode(1).replace('顾北辰（压低声音）：这件事必须在今天说清楚。', '△他意识到事情不对。\n顾北辰（压低声音）：这件事必须在今天说清楚。')
    const change = await store.prepareChange(3, 'op-diagnose-pollute', [{
      path: 'screenplay/episode-001.md',
      content: polluted,
    }])
    await store.saveChange(4, 'op-diagnose-save', (change.pendingChange as { id: string }).id)

    const diagnosis = await store.diagnose() as {
      issues: Array<{ category: string, severity: string }>
      summary: { errorCount: number, warningCount: number }
    }
    expect(diagnosis.issues.some(issue => issue.category === 'abstract-action')).toBe(true)
    expect(diagnosis.summary.warningCount).toBeGreaterThan(0)
  })

  it('flags empty episode-outline fields', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await store.createProject(0, 'op-diagnose-04', '诊断短剧', requirements, artifacts())
    // 集纲校验只检查字段是否存在，空值可写入；诊断应标记空值字段
    const outlinesWithEmptyHook = episodeOutlines().replace('- 钩子开场：顾北辰把证据推到桌面中央。', '- 钩子开场：')
    await store.createOutlineBundle(1, 'op-diagnose-outline-04', {
      outlineContent: '# 《诊断短剧》全剧大纲\n\n顾北辰正处于家庭关系破裂的困境，关键证据的出现迫使他在真相与压力之间做出选择。\n\n他在各方压力下逐步面对隐瞒已久的真相，最终在最大危机中完成选择并解决核心矛盾。\n',
      episodeOutlinesContent: outlinesWithEmptyHook,
    })

    const diagnosis = await store.diagnose() as { issues: Array<{ category: string }> }
    expect(diagnosis.issues.some(issue => issue.category === 'episode-outline-field')).toBe(true)
  })

  it('does not flag a compliant episode', async () => {
    const root = await workspace()
    const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
    await store.createProject(0, 'op-diagnose-03', '诊断短剧', requirements, artifacts())
    await store.createOutlineBundle(1, 'op-diagnose-outline-03', {
      outlineContent: '# 《诊断短剧》全剧大纲\n\n顾北辰正处于家庭关系破裂的困境，关键证据的出现迫使他在真相与压力之间做出选择。\n\n他在各方压力下逐步面对隐瞒已久的真相，最终在最大危机中完成选择并解决核心矛盾。\n',
      episodeOutlinesContent: episodeOutlines(),
    })
    await store.createEpisodeScreenplay(2, 'op-diagnose-episode-03', {
      episodeContent: validEpisode(1),
      continuity: { endingState: '证据在桌', openLoops: ['照片去向'] },
    })

    const diagnosis = await store.diagnose() as { issues: Array<{ category: string }> }
    expect(diagnosis.issues.some(issue => issue.category === 'forbidden-terms')).toBe(false)
    expect(diagnosis.issues.some(issue => issue.category === 'abstract-action')).toBe(false)
    expect(diagnosis.issues.some(issue => issue.category === 'episode-length')).toBe(false)
  })
})
