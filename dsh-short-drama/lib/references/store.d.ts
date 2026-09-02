import type { ReferenceRecord, ReferenceSelectionRecord, ReferenceUploadFile, ReferenceUploadResult, ReferencePreview, ReferenceDocumentPage } from './types.js';
export declare class ScreenplayReferenceStore {
    readonly projectRoot: string;
    readonly visibleRoot: string;
    readonly internalRoot: string;
    private readonly manifestPath;
    private saveQueue;
    constructor(projectRoot: string, referenceDir: string);
    conflicts(names: readonly string[]): Promise<string[]>;
    list(): Promise<ReferenceRecord[]>;
    /** Compact, model-facing metadata; document bodies never enter the prompt. */
    contextSummary(): string;
    structure(referenceId: string): Promise<unknown>;
    preview(originalName: string): Promise<ReferencePreview>;
    /** Read a bounded paragraph page without exposing the stored source path. */
    readDocument(referenceId: string, page?: number, pageSize?: number): Promise<ReferenceDocumentPage>;
    readSelection(selectionId: string): Promise<ReferenceSelectionRecord>;
    saveBatch(files: readonly ReferenceUploadFile[]): Promise<ReferenceUploadResult>;
    private saveBatchLocked;
    private manifest;
}
