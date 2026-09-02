import type { Context } from '@deepseek-ai/cordis';
export declare const name = "screenplay-agent";
export declare const inject: string[];
/** Allow one informed repair, then break argument-guessing loops until the Agent inspects current state. */
export declare function installScreenplayFailureGuard(ctx: Context): void;
/** Keep generic filesystem reads inside the Session's bound screenplay project. */
export declare function installScreenplayProjectScopeGuard(ctx: Context): void;
export declare function apply(ctx: Context): void;
