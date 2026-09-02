export type ReferenceFormat = 'text' | 'markdown' | 'docx' | 'pdf';
export type ReferencePurpose = 'story-facts' | 'plot-structure' | 'character-relationships' | 'character-construction' | 'dialogue-style' | 'pacing-hooks' | 'custom';
export type ReferenceScope = {
    kind: 'full';
} | {
    kind: 'pages';
    pages: number[];
} | {
    kind: 'heading';
    heading: string;
} | {
    kind: 'paragraphs';
    start: number;
    end: number;
} | {
    kind: 'selected-text';
    text: string;
};
export interface ReferenceUploadSelection {
    purpose: ReferencePurpose;
    scope: ReferenceScope;
    userInstruction?: string;
}
export interface ReferenceUploadFile {
    originalName: string;
    bytesBase64: string;
    replaceExisting?: boolean;
    selection: ReferenceUploadSelection;
}
export interface ReferenceParagraph {
    index: number;
    start: number;
    end: number;
}
export interface ReferenceHeading {
    level: number;
    title: string;
    start: number;
    end?: number;
}
export interface ReferencePage {
    page: number;
    start: number;
    end: number;
}
export interface ReferenceDocumentStructure {
    paragraphs: ReferenceParagraph[];
    headings?: ReferenceHeading[];
    pages?: ReferencePage[];
}
export interface ParsedReferenceDocument {
    format: ReferenceFormat;
    content: string;
    structure: ReferenceDocumentStructure;
}
/** Parsed, user-facing preview while the original upload remains unchanged. */
export interface ReferencePreview {
    originalName: string;
    format: ReferenceFormat;
    content: string;
    structure: ReferenceDocumentStructure;
}
/** One bounded page returned by the model-facing document reader. */
export interface ReferenceDocumentPage {
    referenceId: string;
    originalName: string;
    format: ReferenceFormat;
    page: number;
    pageSize: number;
    totalPages: number;
    content: string;
    hasMore: boolean;
    nextPage?: number;
}
export interface ReferenceRecord {
    referenceId: string;
    originalName: string;
    format: ReferenceFormat;
    bytes: number;
    sha256: string;
    createdAt: number;
    updatedAt: number;
}
export interface ReferenceSelectionRecord extends ReferenceUploadSelection {
    selectionId: string;
    referenceId: string;
    originalName: string;
    content: string;
    contentDigest: string;
    createdAt: number;
}
export interface ReferenceUploadResult {
    references: ReferenceRecord[];
    selections: ReferenceSelectionRecord[];
}
