import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
export declare function explicitAbsolutePaths(rawInput: string): string[];
/** Arm the Skill-only external source reader with paths explicitly present in /skill-create input. */
export declare function registerSkillSourceAuthorization(agent: Agent, rawInput: string): void;
/** User-facing steering text used by the explicit `/skill-create` entrypoint. */
export declare function skillCreateInstruction(rawInput: string): string;
/** Keep Skill-only external source reads inside the paths the user explicitly authorized. */
export declare function installSkillSourceScopeGuard(ctx: Context): void;
export declare function apply(ctx: Context): void;
