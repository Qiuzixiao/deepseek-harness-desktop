/** DLKJB short-drama screenplay syntax highlighting for CodeMirror 6. */
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const dlkjbLanguage = StreamLanguage.define({
  tokenTable: {
    heading: t.heading,
    scene: t.keyword,
    marker: t.emphasis,
    action: t.meta,
    character: t.typeName,
    dialogue: t.string,
  },
  token(stream) {
    if (!stream.sol()) { stream.skipToEnd(); return null }
    const line = stream.string.slice(stream.pos)
    // 集标题：第N集
    if (/^第\d+集\s*$/.test(line)) { stream.skipToEnd(); return 'heading' }
    // 场次头：N-M 地点 时间 内/外
    if (/^\d+-\d+\s+.+\s+[内外]$/.test(line)) { stream.skipToEnd(); return 'scene' }
    // 卡点特写 / 闪回 / 本集完：【…】
    if (/^【[^】]*】/.test(line)) { stream.skipToEnd(); return 'marker' }
    // 动作行：△…
    if (line.startsWith('△')) { stream.skipToEnd(); return 'action' }
    // 人物行：人物：…
    if (/^人物：/.test(line)) { stream.skipToEnd(); return 'character' }
    // 台词：人物名（表演提示/OS/VO）：台词
    if (/^[^\s△【#：]+(?:（[^）]*）)?：/.test(line)) { stream.skipToEnd(); return 'dialogue' }
    stream.skipToEnd()
    return null
  },
})

const dlkjbHighlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: 'bold', color: '#e6c07b', fontSize: '1.15em' },
  { tag: t.keyword, color: '#7aa2f7', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#ff9e64', fontWeight: 'bold' },
  { tag: t.meta, color: '#7dcfff' },
  { tag: t.typeName, color: '#9ece6a', fontWeight: 'bold' },
  { tag: t.string, color: '#c0caf5' },
])

export const dlkjb = [dlkjbLanguage, syntaxHighlighting(dlkjbHighlight)]
