import { type ScreenplayPathLayout } from './layout.js';
import { type CreateEpisodeOutlineBatchInput, type CreateEpisodeScreenplayInput, type CreateOutlineBundleInput, type CreateScreenplayArtifactsInput, type FinalizeOutlineBundleInput, type RequirementsChanges, type ScreenplayChangeInput, type ScreenplayProjectSnapshot } from './types.js';
/** Legacy exports remain stable for callers that use the low-level Store directly. */
export declare const CONTRACT_FILE: string;
export declare const SETTING_FILE: string;
export declare const OTHER_CHARACTERS_FILE: string;
export declare const OUTLINE_FILE: string;
export declare const EPISODE_OUTLINES_FILE: string;
export declare const SCREENPLAY_DIR: string;
export declare const DELIVERABLE_DIR: string;
export declare class ScreenplayProjectStore {
    readonly workspaceRoot: string;
    readonly layout: ScreenplayPathLayout;
    readonly privateRoot: string;
    readonly eventsPath: string;
    readonly statePath: string;
    constructor(workspaceRoot: string, layout?: ScreenplayPathLayout);
    snapshot(view?: 'summary' | 'artifacts' | 'full' | 'contract'): Promise<ScreenplayProjectSnapshot>;
    /**
     * 70 项清单诊断：对当前正式文件跑机械检查，并给出需模型判断的方法论检查项。
     * 机械项：正文禁词/抽象动作行/字数档位/头重脚轻/集纲字段空值/角色待确认/连续性环。
     * checklist 项：四幕功能段、人物发动机、反派压力、中性事件、配角功能、
     * 开场钩子、悬念信息差、反转兑现、集尾卡点、对白知情边界、伏笔回收、卖点交付。
     */
    diagnose(): Promise<Record<string, unknown>>;
    createProject(expectedRevision: number, operationId: string, projectName: string, changes: RequirementsChanges, input: CreateScreenplayArtifactsInput): Promise<Record<string, unknown>>;
    createOutline(expectedRevision: number, operationId: string, outlineContent: string): Promise<Record<string, unknown>>;
    createEpisodeOutlineBatch(expectedRevision: number, operationId: string, input: CreateEpisodeOutlineBatchInput): Promise<Record<string, unknown>>;
    createOutlineBundle(expectedRevision: number, operationId: string, input: CreateOutlineBundleInput): Promise<Record<string, unknown>>;
    finalizeOutlineBundle(expectedRevision: number, operationId: string, input: FinalizeOutlineBundleInput): Promise<Record<string, unknown>>;
    writingContext(): Promise<Record<string, unknown>>;
    createEpisodeScreenplay(expectedRevision: number, operationId: string, input: CreateEpisodeScreenplayInput): Promise<Record<string, unknown>>;
    mergeDelivery(expectedRevision: number, operationId: string): Promise<Record<string, unknown>>;
    prepareChange(expectedRevision: number, operationId: string, requestedChanges: ScreenplayChangeInput[]): Promise<Record<string, unknown>>;
    saveChange(expectedRevision: number, operationId: string, changeId: string): Promise<Record<string, unknown>>;
    discardChange(expectedRevision: number, operationId: string, changeId: string): Promise<Record<string, unknown>>;
    restoreVersion(expectedRevision: number, operationId: string, sourceVersionId: string): Promise<Record<string, unknown>>;
    private mutate;
    private requireState;
    private requirePendingChange;
    private readEvents;
    private readVersionContents;
    private materialize;
    private readRelative;
    private writeRelative;
    private safeRelative;
}
