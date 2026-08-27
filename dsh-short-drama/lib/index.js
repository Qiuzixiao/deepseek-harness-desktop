import { ScreenplayProjectService } from './service.js';
export const name = 'screenplay-host';
export function apply(ctx) {
    new ScreenplayProjectService(ctx);
}
export { ScreenplayError } from './errors.js';
export { CHINESE_SCREENPLAY_LAYOUT, DEFAULT_SCREENPLAY_LAYOUT, LEGACY_SCREENPLAY_LAYOUT, detectScreenplayLayout, } from './layout.js';
export { ScreenplayProjectService } from './service.js';
export { ScreenplayProjectStore } from './store.js';
export { ScreenplayReferenceStore } from './references/store.js';
