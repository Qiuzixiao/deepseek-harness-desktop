import type { Context } from '@deepseek-ai/cordis';
import type { ScopeKey } from '@deepseek-ai/dsh-scope';
/**
 * Read one relative resource from a Skill that is visible to the calling
 * Agent. Skill resources are deliberately separate from arbitrary project
 * files: the caller must name the Skill and cannot turn this into an
 * unrestricted file reader by supplying an absolute path or parent traversal.
 */
export declare function readSkillReference(ctx: Context, skillName: string, resourcePath: string, cwd: string | undefined, scope: ScopeKey): Promise<Record<string, unknown>>;
