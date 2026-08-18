import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { type StoryProjectConfig } from './project.ts';
export declare const name = "dsh-product-story-studio";
export declare const inject: string[];
export declare const QNOVEL_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
export interface QNovelSettings {
    /** User-selected parent directory containing all QNovel works. */
    projectsRoot: string;
}
export declare const QNovelSettingsSchema: Schema<QNovelSettings>;
export declare const Config: Schema<StoryProjectConfig>;
interface RpcSuccess<T> {
    ok: true;
    value: T;
}
interface RpcFailure {
    ok: false;
    error: {
        code: 'internal';
        message: string;
        details: Record<string, never>;
    };
}
export type StoryStudioRpcHandler = (endpoint: string, payload: unknown) => Promise<RpcSuccess<unknown> | RpcFailure>;
export declare function createStoryStudioRpcHandler(config?: StoryProjectConfig, readConfig?: () => StoryProjectConfig): StoryStudioRpcHandler;
export declare function apply(ctx: Context, config?: StoryProjectConfig): void;
export { createStoryProject, ensureProjectRoot, normalizeProjectName, projectDirectoryName, projectId, resolveProjectRoot, } from './project.ts';
export type { CreatedStoryProject, StoryProjectConfig, StoryProjectDescription } from './project.ts';
