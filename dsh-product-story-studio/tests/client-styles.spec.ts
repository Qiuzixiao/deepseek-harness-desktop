import { describe, expect, it } from 'vitest'
import { styles } from '../src/client/styles.ts'

describe('QNovel sidebar and brand presentation contract', () => {
  it('moves only the product action beside New Session and leaves shared footer actions pinned below', () => {
    expect(styles).toContain('[class~="hHd-Xa_root"]:not([class~="hHd-Xa_collapsed"]) [class~="hHd-Xa_newSession"]')
    expect(styles).not.toContain('[class~="hHd-Xa_footerActions"]{position:absolute')
    expect(styles).toContain('.qNovelCreateSlotHost[data-wide=true]{position:absolute')
    expect(styles).toContain('.qNovelCreateSlotHost[data-wide=true]{position:absolute;z-index:4;top:74px;left:calc(50% + 2px)')
    expect(styles).toContain('.qNovelCreateSlotHost:not([data-wide=true]){display:none}')
  })

  it('uses QNovel identity in the official logo and empty-state hero slots', () => {
    expect(styles).toContain('content:"QNovel"')
    expect(styles).toContain('content:"把故事，写成作品"')
    expect(styles).toContain('content:"Beta"')
    expect(styles).toContain('url("/wb/qnovel/icon-qnovel.svg")')
    expect(styles).toContain('[class*="_fishHitbox"] [class*="_fish"]{visibility:visible!important;width:34px;height:34px;color:transparent!important;fill:transparent!important;stroke:transparent!important;background:url("/wb/qnovel/icon-qnovel.svg")')
    expect(styles).toContain('[class*="logoRow"] [class*="brand"]{position:absolute;left:50%;transform:translateX(-50%);flex:none')
    expect(styles).toContain('[class*="logoRow"] [class*="brand"]>*{display:none')
    expect(styles).toContain('[class*="logoRow"] [class*="toggle"]:has([class*="railFish"])::before')
    expect(styles).toContain('background:url("/wb/qnovel/icon-qnovel.svg") center/contain no-repeat')
  })
})
