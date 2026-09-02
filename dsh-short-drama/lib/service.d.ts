import { type Context, Service } from '@deepseek-ai/cordis';
import type { Session } from '@deepseek-ai/dsh-session';
import type { ReferenceDocumentPage, ReferencePreview, ReferenceUploadFile } from './references/types.js';
import type { CreateOutlineBundleInput, CreateEpisodeScreenplayInput, CreateEpisodeOutlineBatchInput, CreateScreenplayArtifactsInput, EpisodeDiagnosisResult, EpisodeValidationResult, FinalizeOutlineBundleInput, RequirementsChanges, ScreenplayChangeInput, ScreenplayProjectBinding, ScreenplayProjectPreparation, ScreenplayProjectSnapshot, ScreenplayProjectionValue } from './types.js';
declare module '@deepseek-ai/cordis' {
    interface Context {
        screenplayProjects: ScreenplayProjectService;
    }
}
declare function projectionOf(snapshot: ScreenplayProjectSnapshot): ScreenplayProjectionValue;
export declare class ScreenplayProjectService extends Service {
    private readonly stores;
    private readonly summaries;
    private readonly bindings;
    private readonly referenceStores;
    private readonly episodeDrafts;
    constructor(context: Context);
    contextSummary(session: Session | undefined): string;
    snapshot(workspaceRoot: string, view?: 'summary' | 'artifacts' | 'full' | 'contract'): Promise<ScreenplayProjectSnapshot>;
    bindingForSession(session: Session): ScreenplayProjectBinding | undefined;
    /**
     * Return the desktop-created project preparation before the first formal
     * artifact set. New sessions carry a durable preparation event; the exact
     * Session cwd plus launcher marker is also accepted as a one-path migration
     * fallback for folders created before this binding event was introduced.
     */
    preparedProjectForSession(session: Session): ScreenplayProjectPreparation | undefined;
    projectRootForSession(session: Session): string | undefined;
    /** Reference intake is available as soon as Desktop prepares the project folder. */
    referenceProjectRootForSession(session: Session): string | undefined;
    referenceConflictsForSession(session: Session, names: readonly string[]): Promise<string[]>;
    saveReferencesForSession(session: Session, files: readonly ReferenceUploadFile[]): Promise<import("./references/types.js").ReferenceUploadResult>;
    listReferencesForSession(session: Session): Promise<import("./references/types.js").ReferenceRecord[]>;
    referenceStructureForSession(session: Session, referenceId: string): Promise<unknown>;
    readReferenceSelectionForSession(session: Session, selectionId: string): Promise<import("./references/types.js").ReferenceSelectionRecord>;
    readDocumentForSession(session: Session, referenceId: string, page?: number, pageSize?: number): Promise<ReferenceDocumentPage>;
    readReferencePreviewForSession(session: Session, path: string): Promise<ReferencePreview>;
    readReferencePreviewForProject(projectRoot: string, path: string): Promise<ReferencePreview>;
    referenceContextSummaryForSession(session: Session): string;
    snapshotForSession(session: Session, view?: 'summary' | 'artifacts' | 'full' | 'contract'): Promise<ScreenplayProjectSnapshot>;
    /**
     * Persist the desktop launcher hand-off before the Agent's first turn. The
     * folder is bound immediately, while formal Markdown artifacts remain absent
     * until screenplay_create_contract succeeds.
     */
    bindPreparedProject(session: Session, projectRoot: string, projectName: string): Promise<ScreenplayProjectPreparation>;
    /**
     * Prepare a new project directory before the Client creates its Workspace.
     * Filesystem mutation stays on the Host so native directory selection does
     * not need the browse capability merely to create a screenplay project.
     */
    prepareProject(parentRoot: string, projectName: string): Promise<{
        projectRoot: string;
    }>;
    createContract(workspaceRoot: string, expectedRevision: number, operationId: string, projectName: string, changes: RequirementsChanges, input: CreateScreenplayArtifactsInput): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    createContractForSession(session: Session, parentRoot: string, expectedRevision: number, operationId: string, projectName: string | undefined, changes: RequirementsChanges, input: CreateScreenplayArtifactsInput): Promise<{
        binding: ScreenplayProjectBinding;
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    createOutline(workspaceRoot: string, expectedRevision: number, operationId: string, outlineContent: string): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    createOutlineBundle(workspaceRoot: string, expectedRevision: number, operationId: string, input: CreateOutlineBundleInput): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    createEpisodeOutlineBatch(workspaceRoot: string, expectedRevision: number, operationId: string, input: CreateEpisodeOutlineBatchInput): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    finalizeOutlineBundle(workspaceRoot: string, expectedRevision: number, operationId: string, input: FinalizeOutlineBundleInput): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    writingContext(workspaceRoot: string): Promise<Record<string, unknown>>;
    readProjectContextForSession(session: Session): Promise<ScreenplayProjectSnapshot>;
    readArtifactForSession(session: Session, logicalPath: string): Promise<Record<string, unknown>>;
    searchProjectForSession(session: Session, query: string): Promise<Record<string, unknown>>;
    writeSceneForSession(session: Session, episode: number, sceneNo: number, content: string): Promise<Record<string, unknown>>;
    validateEpisodeForSession(session: Session, episode: number): Promise<EpisodeValidationResult>;
    diagnoseEpisodeForSession(session: Session, episode: number): Promise<EpisodeDiagnosisResult>;
    commitEpisodeForSession(session: Session, expectedRevision: number, operationId: string, episode: number, continuity: CreateEpisodeScreenplayInput['continuity']): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    createEpisodeScreenplay(workspaceRoot: string, expectedRevision: number, operationId: string, input: CreateEpisodeScreenplayInput): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    mergeDelivery(workspaceRoot: string, expectedRevision: number, operationId: string): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    prepareChange(workspaceRoot: string, expectedRevision: number, operationId: string, changes: ScreenplayChangeInput[]): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    saveChange(workspaceRoot: string, expectedRevision: number, operationId: string, changeId: string): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    discardChange(workspaceRoot: string, expectedRevision: number, operationId: string, changeId: string): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    restoreVersion(workspaceRoot: string, expectedRevision: number, operationId: string, sourceVersionId: string): Promise<{
        result: Record<string, unknown>;
        snapshot: ScreenplayProjectSnapshot;
    }>;
    private store;
    /**
     * Recover an initialized project for the exact Session workspace when the
     * session lacks a durable project-binding event. This deliberately does not
     * search parent folders or enumerate the workspace.
     */
    private recoverBindingForSession;
    private isRecoverableState;
    private materializedSummary;
    private referenceStoreForSession;
    private referenceStoreForProject;
    private createProjectDirectory;
    private isPreparedProjectRoot;
    private mutate;
}
export { projectionOf };
