import { type ScreenplayPathLayout } from './layout.js';
import { type CreateEpisodeOutlineBatchInput, type CreateEpisodeScreenplayInput, type CreateOutlineBundleInput, type CreateScreenplayArtifactsInput, type RequirementsChanges, type ScreenplayChangeInput, type ScreenplayEvent, type ScreenplayProjectSnapshot } from './types.js';
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
    /** Return the persisted result for an idempotency key. */
    findOperationResult(operationId: string, expectedType: ScreenplayEvent['type']): Promise<Record<string, unknown> | undefined>;
    createProject(expectedRevision: number, operationId: string, projectName: string, changes: RequirementsChanges, input: CreateScreenplayArtifactsInput): Promise<Record<string, unknown>>;
    createOutline(expectedRevision: number, operationId: string, outlineContent: string): Promise<Record<string, unknown>>;
    createEpisodeOutlineBatch(expectedRevision: number, operationId: string, input: CreateEpisodeOutlineBatchInput): Promise<Record<string, unknown>>;
    createOutlineBundle(expectedRevision: number, operationId: string, input: CreateOutlineBundleInput): Promise<Record<string, unknown>>;
    writingContext(): Promise<Record<string, unknown>>;
    /** Validate episode content without mutating state or materializing a version. */
    validateEpisodeContent(episode: number, content: string): Promise<number>;
    createEpisodeScreenplay(expectedRevision: number, operationId: string, input: CreateEpisodeScreenplayInput): Promise<Record<string, unknown>>;
    mergeDelivery(expectedRevision: number, operationId: string): Promise<Record<string, unknown>>;
    prepareChange(expectedRevision: number, operationId: string, requestedChanges: ScreenplayChangeInput[], validate?: boolean): Promise<Record<string, unknown>>;
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
