import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LEGACY_SCREENPLAY_LAYOUT } from '../src/layout.js'
import { ScreenplayProjectStore } from '../src/store.js'

const roots: string[] = []

function contract(title: string): string {
  return [
    `# 《${title}》短剧风格与创作规则`,
    '## 一、项目定位', '## 二、核心故事与总规划', '## 三、人物与关系设定',
    '## 四、节奏规则（硬性要求）', '## 五、台词规则', '## 六、反转设计规则',
    '## 七、情绪曲线规则', '## 八、画面与叙事规则', '## 九、内容红线与连续性边界',
    '## 十、交付要求', '## 十一、待确认事项',
  ].join('\n').concat('\n')
}

function setting(title: string): string {
  return [
    `# 《${title}》核心设定`,
    '## 一、故事世界观', '现实都市。', '## 二、核心设定', '家庭真相。',
    '## 三、关键地点', '客厅。', '## 四、关键道具（伏笔体系）', '旧照片。',
    '## 五、时间线', '当代。', '## 六、风格底色（一句话）', '由用户决定。',
  ].join('\n').concat('\n')
}

async function project(): Promise<ScreenplayProjectStore> {
  const root = await mkdtemp(join(tmpdir(), 'screenplay-validation-'))
  roots.push(root)
  const store = new ScreenplayProjectStore(root, LEGACY_SCREENPLAY_LAYOUT)
  await store.createProject(0, 'validation-project', '校验短剧', {
    genre: '都市', audience: '短剧用户', episodeCount: 1, episodeDurationSeconds: 120,
    premise: '追查真相。', endingDirection: '公开真相。', constraints: [],
  }, {
    contractContent: contract('校验短剧'), settingContent: setting('校验短剧'),
    mainCharacters: [{
      name: '顾北辰',
      content: '# 顾北辰（主要角色）\n## 一句话记忆点\n创业者\n## 基本信息\n- **年龄**：29\n- **身份**：创业者\n- **外貌**：普通\n- **口头禅**：无\n## 性格特质\n- **核心性格**：克制\n- **行为习惯**：记录\n- **内在矛盾**：信任\n- **成长弧光**：坦诚\n## 关键经历\n- 失去信任\n## 人物关系\n- **家人**：林母\n## 记忆点标签\n- **标志动作**：看照片\n- **弱点软肋**：家人\n- **代表名场面**：公开真相\n- **核心标签**：创业者\n',
    }],
    otherCharactersContent: '# 其他关键角色（配角）\n## 林母\n- **身份**：母亲\n- **性格**：直接\n- **记忆点**：旧照片\n- **作用**：守住秘密\n## 角色关系图（简要）\n林母与顾北辰有矛盾。\n',
  })
  return store
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('signal-channel-A episode validation', () => {
  it('does not expose the removed methodology diagnosis API', async () => {
    const store = await project()
    expect('diagnose' in store).toBe(false)
  })

  it('validates episode structure without producing creative checklist items', async () => {
    const store = await project()
    await expect(store.validateEpisodeContent(1, '第1集\n')).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    const validator = store as unknown as { validateEpisodeContent: (episode: number, content: string) => Promise<number> }
    await expect(validator.validateEpisodeContent(1, '第1集\n')).rejects.toThrow(/episode screenplay/)
  })

  it('accepts the compact third-person episode-outline form without legacy analysis fields', async () => {
    const store = await project()
    await expect(store.createOutlineBundle(1, 'compact-outlines', {
      outlineContent: '# 《校验短剧》全剧大纲\n\n主角在家庭秘密和现实压力之间确认目标。\n\n他通过行动面对阻力并完成选择。\n',
      episodeOutlinesContent: '# 《校验短剧》分集大纲\n\n### 第1集\n\n导语：顾北辰必须在公开证据和保护家人之间做出选择。\n\n顾北辰带着证据找到林母，林母拒绝交出最后一张照片，他决定公开已经确认的部分真相。\n',
    })).resolves.toMatchObject({ ok: true, stage: 'OutlineReady' })
  })
})
