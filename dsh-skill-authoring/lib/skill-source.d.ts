declare const MAX_FILES = 500;
declare const MAX_FILE_BYTES: number;
declare const MAX_READ_CHARS = 100000;
export declare function inspectSkillSource(path: string): Promise<Record<string, unknown>>;
export declare function readSkillSource(path: string, offset?: number, limit?: number): Promise<Record<string, unknown>>;
export declare function isInsidePath(root: string, candidate: string): boolean;
export { MAX_FILE_BYTES, MAX_FILES, MAX_READ_CHARS };
