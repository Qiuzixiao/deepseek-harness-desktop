export declare const PROJECT_SCHEMA_VERSION = 1;
export declare const DEFAULT_PROJECTS_DIRECTORY = "Story Studio";
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
export declare function normalizeProjectName(value: unknown): string;
export declare function projectDirectoryName(name: string): string;
export declare function projectId(name: string): string;
export declare function createStoryProject(config: StoryProjectConfig, inputName: unknown): Promise<CreatedStoryProject>;
