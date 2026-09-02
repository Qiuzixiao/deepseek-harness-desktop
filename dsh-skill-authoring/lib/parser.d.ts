export type SkillSourceFormat = 'text' | 'markdown' | 'docx' | 'pdf';
export interface SkillSourceParagraph {
    index: number;
    start: number;
    end: number;
}
export interface SkillSourceHeading {
    level: number;
    title: string;
    start: number;
    end?: number;
}
export interface SkillSourcePage {
    page: number;
    start: number;
    end: number;
}
export interface SkillSourceStructure {
    paragraphs: SkillSourceParagraph[];
    headings?: SkillSourceHeading[];
    pages?: SkillSourcePage[];
}
export interface ParsedSkillSource {
    format: SkillSourceFormat;
    content: string;
    structure: SkillSourceStructure;
}
export declare function parseSkillSource(originalName: string, bytes: Uint8Array): Promise<ParsedSkillSource>;
