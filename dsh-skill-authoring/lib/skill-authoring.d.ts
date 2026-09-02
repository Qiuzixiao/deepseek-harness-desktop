export type SkillScope = 'project' | 'user';
export type SkillResourceKind = 'references' | 'scripts' | 'assets';
export interface SkillSourceRef {
    sourceId: string;
    label: string;
    kind: 'project-file' | 'reference-selection' | 'version' | 'user-note' | 'attachment';
    excerpt?: string;
}
export interface SkillResource {
    kind: SkillResourceKind;
    path: string;
    content: string;
}
export interface SaveSkillInput {
    name: string;
    description: string;
    scope: SkillScope;
    instructions: string;
    whenToUse?: string;
    sources?: SkillSourceRef[];
    resources?: SkillResource[];
}
export interface PublishedSkill {
    name: string;
    scope: SkillScope;
    directory: string;
    skillFile: string;
}
export interface SkillInspection {
    name: string;
    scope: SkillScope;
    skillFile: string;
    valid: boolean;
    content?: string;
    reason?: string;
}
export declare function resolveUserSkillRoot(env?: Record<string, string | undefined>): string;
export declare class SkillAuthoringStore {
    readonly projectRoot: string;
    constructor(projectRoot: string);
    save(input: SaveSkillInput): Promise<PublishedSkill>;
    inspect(name: string): Promise<SkillInspection | undefined>;
    private skillRoot;
    /**
     * SKILL.md frontmatter is restricted to the Agent Skills standard keys plus
     * the Claude Code `when_to_use` extension. No provenance, scope, version, or
     * source bookkeeping leaks into the portable skill directory.
     */
    private skillFile;
}
