import { describe, expect, it } from 'vitest'
import { styles } from '../src/client/styles.ts'

describe('QNovel sidebar and brand presentation contract', () => {
  it('keeps the only product action in the top row beside New Session', () => {
    expect(styles).toContain('[class~="hHd-Xa_root"]:not([class~="hHd-Xa_collapsed"]) [class~="hHd-Xa_newSession"]')
    expect(styles).toContain('[class~="hHd-Xa_root"]:not([class~="hHd-Xa_collapsed"]) [class~="hHd-Xa_footerActions"]')
    expect(styles).toContain('[class~="hHd-Xa_footerActions"] > *{width:100%;height:38px}')
    expect(styles).toContain('top:74px')
    expect(styles).toContain('left:calc(50% + 2px)')
    expect(styles).toContain('.qNovelCreateSlotHost:not([data-wide=true]){display:none}')
  })

  it('uses QNovel identity in the official logo and empty-state hero slots', () => {
    expect(styles).toContain('content:"QNovel"')
    expect(styles).toContain('content:"把故事，写成作品"')
    expect(styles).toContain('content:"Beta"')
    expect(styles).toContain('url("/wb/qnovel/icon-qnovel.svg")')
    expect(styles).toContain('url("/wb/qnovel/Qnovel.svg")')
    expect(styles).toContain('[class*="logoRow"] [class*="brand"]{position:absolute;left:50%;transform:translateX(-50%);flex:none')
    expect(styles).toContain('[class*="logoRow"] [class*="brand"]>*{display:none')
  })
})
