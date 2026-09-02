import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
export declare const name = "screenplay-agent";
export declare const inject: string[];
export declare function explicitAbsolutePaths(rawInput: string): string[];
/** Arm the Skill-only external source reader with paths explicitly present in /skill-create input. */
export declare function registerSkillSourceAuthorization(agent: Agent, rawInput: string): void;
/** User-facing steering text used by the explicit `/skill-create` entrypoint. */
export declare function skillCreateInstruction(rawInput: string): string;
/** Allow one informed repair, then break argument-guessing loops until the Agent inspects current state. */
export declare function installScreenplayFailureGuard(ctx: Context): void;
/** Keep generic filesystem reads inside the Session's bound screenplay project. */
export declare function installScreenplayProjectScopeGuard(ctx: Context): void;
export declare function apply(ctx: Context): void;
