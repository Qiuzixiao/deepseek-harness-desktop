export declare const PROJECT_SCHEMA_VERSION = 1;
export declare const DEFAULT_PROJECTS_DIRECTORY = "QNovel\u4F5C\u54C1";
export interface StoryProjectConfig {
    projectRoot?: string;
}
export interface StoryProjectDescription {
    projectRoot: string;
}
export interface CreatedStoryProject extends StoryProjectDescription {
    name: string;
    path: string;
}
export declare function resolveProjectRoot(config?: StoryProjectConfig, home?: string, environment?: NodeJS.ProcessEnv): string;
/** Ensure a selected global directory exists and is writable. */
export declare function ensureProjectRoot(path: string): Promise<string>;
export declare function normalizeProjectName(value: unknown): string;
export declare function projectDirectoryName(name: string): string;
export declare function projectId(name: string): string;
export declare function createStoryProject(config: StoryProjectConfig, inputName: unknown): Promise<CreatedStoryProject>;
