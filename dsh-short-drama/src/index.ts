import type { Context } from '@deepseek-ai/cordis'
import { ScreenplayProjectService } from './service.js'

export const name = 'screenplay-host'

export function apply(ctx: Context): void {
  new ScreenplayProjectService(ctx)
}

export { ScreenplayError } from './errors.js'
export {
  CHINESE_SCREENPLAY_LAYOUT,
  DEFAULT_SCREENPLAY_LAYOUT,
  LEGACY_SCREENPLAY_LAYOUT,
  detectScreenplayLayout,
} from './layout.js'
export type { ScreenplayLayoutId, ScreenplayPathLayout } from './layout.js'
export { ScreenplayProjectService } from './service.js'
export { ScreenplayProjectStore } from './store.js'
export { ScreenplayReferenceStore } from './references/store.js'
export type * from './references/types.js'
export type * from './types.js'
