import type { Context } from '@deepseek-ai/cordis';
export declare const name = "screenplay-agent";
export declare const inject: string[];
/** Keep ordinary filesystem operations inside the Session workspace. */
export declare function installScreenplayProjectScopeGuard(ctx: Context): void;
export declare function apply(ctx: Context): void;
