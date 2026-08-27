import type { ScreenplayLayoutId } from './layout.js';
export declare const SCREENPLAY_SCHEMA_VERSION = 2;
export type ScreenplayPhase = 'Uninitialized' | 'Intake' | 'ChangePending' | 'Ready';
export interface ScreenplayRequirements {
    title?: string;
    genre?: string;
    audience?: string;
    episodeCount?: number;
    episodeDurationSeconds?: number;
    premise?: string;
    endingDirection?: string;
    constraints: string[];
}
export interface RequirementsChanges {
    title?: string;
    genre?: string;
    audience?: string;
    episodeCount?: number;
    episodeDurationSeconds?: number;
    premise?: string;
    endingDirection?: string;
    constraints?: string[];
}
export type ScreenplayArtifactKind = 'creative-contract' | 'core-setting' | 'main-character' | 'other-characters' | 'full-outline' | 'episode-outlines' | 'episode-screenplay' | 'merged-screenplay';
export interface MainCharacterInput {
    name: string;
    content: string;
}
export interface CreateScreenplayArtifactsInput {
    contractContent: string;
    settingContent: string;
    mainCharacters: MainCharacterInput[];
    otherCharactersContent: string;
}
export interface CreateOutlineBundleInput {
    outlineContent: string;
    episodeOutlinesContent: string;
}
export interface CreateEpisodeOutlineBatchInput {
    startEpisode: number;
    endEpisode: number;
    /** Required for the first batch; omitted once the internal draft exists. */
    outlineContent?: string;
    /** Image-format Markdown containing only the requested episode range. */
    episodeOutlinesContent: string;
    /** Required only for the final batch; becomes the complete-file forecast section. */
    forecastContent?: string;
}
export interface FinalizeOutlineBundleInput {
    forecastContent: string;
}
export interface EpisodeOutlineBatch {
    startEpisode: number;
    endEpisode: number;
    content: string;
    sha256: string;
    createdAt: number;
}
export interface EpisodeOutlineDraft {
    totalEpisodes: number;
    nextEpisode: number;
    outlineContent: string;
    batches: EpisodeOutlineBatch[];
}
/**
 * Private continuity data carried from one completed screenplay episode to
 * the next. It is never written into a user-facing Markdown artifact.
 */
export interface ScreenplayContinuityState {
    endingState: string;
    openLoops: string[];
    characterStates?: Record<string, string>;
    relationshipStates?: Record<string, string>;
    activeObjects?: Record<string, string>;
}
export interface ScreenplayEpisodeRecord {
    episode: number;
    logicalPath: string;
    sha256: string;
    effectiveCharacterCount: number;
    continuity: ScreenplayContinuityState;
    createdAt: number;
}
export interface ScreenplayWritingProgress {
    status: 'NotStarted' | 'Writing' | 'Completed';
    totalEpisodes: number;
    nextEpisode: number;
    completedEpisodes: number[];
    episodes: ScreenplayEpisodeRecord[];
    continuity?: ScreenplayContinuityState;
}
export interface CreateEpisodeScreenplayInput {
    episodeContent: string;
    continuity: ScreenplayContinuityState;
}
export interface ScreenplayVersionArtifact {
    kind: ScreenplayArtifactKind;
    logicalPath: string;
    versionRelativePath: string;
    sha256: string;
    characterName?: string;
}
export interface ScreenplayVersion {
    id: string;
    revision: number;
    artifacts: ScreenplayVersionArtifact[];
    restoredFrom?: string;
    createdAt: number;
}
export interface ScreenplayChangeInput {
    path: string;
    content: string;
    /** Only supplied when the user explicitly asks to rename a major character. */
    renameTo?: string;
}
export interface PendingArtifactChange {
    /** Destination logical path after the change. */
    logicalPath: string;
    /** Existing logical path before the change; omitted for an in-place edit. */
    fromLogicalPath?: string;
    kind: ScreenplayArtifactKind;
    beforeVersionRelativePath: string;
    afterRelativePath: string;
    sha256: string;
    characterName?: string;
}
export interface PendingChange {
    id: string;
    baseVersionId: string;
    changes: PendingArtifactChange[];
    createdAt: number;
}
export interface ScreenplayProjectBinding {
    projectId: string;
    projectName: string;
    parentRoot: string;
    projectRoot: string;
    createdAt: number;
}
/**
 * A desktop-created project directory before the first formal artifact set
 * exists. This event binds the session to the selected folder without
 * pretending that the creative contract has already been written.
 */
export interface ScreenplayProjectPreparation {
    projectName: string;
    parentRoot: string;
    projectRoot: string;
    createdAt: number;
}
export interface ScreenplayProjectState {
    schemaVersion: typeof SCREENPLAY_SCHEMA_VERSION;
    /** Added without a schema bump; old state files infer the legacy layout. */
    layout?: ScreenplayLayoutId;
    projectId: string;
    projectName: string;
    phase: Exclude<ScreenplayPhase, 'Uninitialized'>;
    revision: number;
    requirements: ScreenplayRequirements;
    writingProgress?: ScreenplayWritingProgress;
    pendingChange?: PendingChange;
    episodeOutlineDraft?: EpisodeOutlineDraft;
    currentVersion?: ScreenplayVersion;
    versions: ScreenplayVersion[];
    updatedAt: number;
}
export interface UninitializedSnapshot {
    initialized: false;
    phase: 'Uninitialized' | 'Intake';
    revision: 0;
    projectRoot?: string;
    projectName?: string;
    prepared?: boolean;
}
export interface InitializedSnapshot extends ScreenplayProjectState {
    initialized: true;
    artifactContents?: Record<string, string>;
    projectRoot?: string;
}
export type ScreenplayProjectSnapshot = UninitializedSnapshot | InitializedSnapshot;
export interface ScreenplayEvent {
    schemaVersion: typeof SCREENPLAY_SCHEMA_VERSION;
    seq: number;
    revision: number;
    operationId: string;
    type: 'project-created' | 'outline-created' | 'episode-outline-batch-created' | 'episode-created' | 'delivery-merged' | 'change-prepared' | 'change-saved' | 'change-discarded' | 'version-restored';
    time: number;
    state: ScreenplayProjectState;
    result: Record<string, unknown>;
}
export interface ScreenplayProjectionValue {
    initialized: boolean;
    phase: ScreenplayPhase;
    revision: number;
    projectId?: string;
    projectName?: string;
    projectRoot?: string;
    prepared?: boolean;
    pendingChangeId?: string;
    currentVersionId?: string;
    writingStatus?: ScreenplayWritingProgress['status'];
    nextEpisode?: number;
    completedEpisodes?: number;
    totalEpisodes?: number;
}
export interface ChangePreview {
    path: string;
    oldText: string;
    newText: string;
    fromPath?: string;
    toPath?: string;
}
/** 70 项清单诊断：机械检查发现的一个问题。 */
export interface ScreenplayDiagnosticIssue {
    severity: 'error' | 'warning' | 'info';
    category: 'forbidden-terms' | 'abstract-action' | 'episode-length' | 'front-heavy' | 'episode-outline-field' | 'character-pending' | 'continuity-loops' | 'writing-progress';
    message: string;
    path?: string;
    detail?: Record<string, unknown>;
}
/** 70 项清单诊断：需要模型判断的方法论检查项。 */
export interface ScreenplayChecklistItem {
    id: string;
    label: string;
    status: 'check';
}
/** screenplay_diagnose 的返回结构。 */
export interface ScreenplayDiagnosis {
    ok: true;
    projectName: string;
    revision: number;
    phase: string;
    issues: ScreenplayDiagnosticIssue[];
    checklist: ScreenplayChecklistItem[];
    summary: {
        errorCount: number;
        warningCount: number;
        infoCount: number;
    };
}
