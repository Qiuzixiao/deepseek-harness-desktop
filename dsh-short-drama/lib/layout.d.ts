/** Stable on-disk layout identifiers. Existing projects keep their layout. */
export type ScreenplayLayoutId = 'zh-CN-v1' | 'legacy-en-v1';
export interface ScreenplayPathLayout {
    readonly id: ScreenplayLayoutId;
    readonly referenceDir: string;
    readonly contractDir: string;
    readonly settingDir: string;
    readonly charactersDir: string;
    readonly mainCharactersDir: string;
    readonly otherCharactersDir: string;
    readonly outlineDir: string;
    readonly episodesDir: string;
    readonly screenplayDir: string;
    readonly deliverablesDir: string;
    readonly directories: readonly string[];
    readonly contractFile: string;
    readonly settingFile: string;
    readonly otherCharactersFile: string;
    readonly outlineFile: string;
    readonly episodeOutlinesFile: string;
    mainCharacterPath(name: string): string;
    episodeScreenplayPath(episode: number): string;
    deliverablePath(projectName: string): string;
}
export declare const LEGACY_SCREENPLAY_LAYOUT: ScreenplayPathLayout;
export declare const CHINESE_SCREENPLAY_LAYOUT: ScreenplayPathLayout;
export declare const DEFAULT_SCREENPLAY_LAYOUT: ScreenplayPathLayout;
export declare const SCREENPLAY_LAYOUT_MARKER: string;
export declare function screenplayLayoutOf(id: ScreenplayLayoutId): ScreenplayPathLayout;
/** Detect a project's persisted layout, then fall back to its visible folders. */
export declare function detectScreenplayLayout(workspaceRoot: string, fallback?: ScreenplayPathLayout): ScreenplayPathLayout;
