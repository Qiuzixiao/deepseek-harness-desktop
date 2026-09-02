export type SkillDraftScope = 'project' | 'user';
export type SkillEntryCategory = 'method' | 'workflow' | 'principle' | 'case' | 'counterexample' | 'term' | 'story-fact';
export type SkillResourceKind = 'references' | 'scripts' | 'assets';
export interface SkillSource {
    sourceId: string;
    label: string;
    kind: 'project-file' | 'reference-selection' | 'version' | 'user-note' | 'attachment';
    excerpt?: string;
}
export interface SkillDraftEntry {
    category: SkillEntryCategory;
    text: string;
    reusable: boolean;
    sourceIds: string[];
}
export interface SkillResource {
    kind: SkillResourceKind;
    path: string;
    content: string;
}
export interface SkillDraft {
    draftId: string;
    name?: string;
    description?: string;
    whenToUse?: string;
    scope?: SkillDraftScope;
    applicableTo: string[];
    instructions: string;
    entries: SkillDraftEntry[];
    sources: SkillSource[];
    resources: SkillResource[];
    uncertainty: string[];
    content: string;
    version: number;
    createdAt: number;
    updatedAt: number;
}
export interface CreateSkillDraftInput {
    name?: string;
    description?: string;
    whenToUse?: string;
    scope?: SkillDraftScope;
    applicableTo?: string[];
    instructions?: string;
    entries?: SkillDraftEntry[];
    sources?: SkillSource[];
    resources?: SkillResource[];
    uncertainty?: string[];
}
export interface InstallSkillInput extends CreateSkillDraftInput {
    name: string;
    description: string;
    scope: SkillDraftScope;
}
export interface UpdateSkillDraftInput extends CreateSkillDraftInput {
    draftId: string;
}
export interface PublishSkillInput {
    draftId: string;
    name: string;
    description: string;
    scope: SkillDraftScope;
    whenToUse?: string;
    applicableTo?: string[];
    confirmation: '确认发布 Skill';
}
export interface PublishedSkill {
    name: string;
    scope: SkillDraftScope;
    directory: string;
    skillFile: string;
    version: number;
    sourceIds: string[];
}
export interface SkillInspection {
    name: string;
    scope: SkillDraftScope;
    skillFile: string;
    valid: boolean;
    content?: string;
    reason?: string;
}
export declare function resolveUserSkillRoot(env?: Record<string, string | undefined>): string;
export declare class SkillAuthoringStore {
    readonly projectRoot: string;
    private readonly draftRoot;
    constructor(projectRoot: string);
    createDraft(input: CreateSkillDraftInput): Promise<SkillDraft>;
    install(input: InstallSkillInput): Promise<PublishedSkill>;
    private buildDraft;
    updateDraft(input: UpdateSkillDraftInput): Promise<SkillDraft>;
    discardDraft(draftId: string): Promise<{
        draftId: string;
        discarded: true;
    }>;
    inspect(draftId?: string, name?: string): Promise<SkillDraft | SkillInspection | undefined>;
    publish(input: PublishSkillInput): Promise<PublishedSkill>;
    private publishDraft;
    private normalizeEntries;
    private normalizeSources;
    private skillRoot;
    private writeDraft;
    private skillFile;
    private openaiYaml;
}
