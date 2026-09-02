import type { Context } from '@deepseek-ai/cordis';
import { installSkillSourceScopeGuard } from './agent.js';
/**
 * dsh-skill-authoring — a standalone Skill authoring plugin.
 *
 * Registers the standard Agent Skills toolset (skill_inspect, skill_create,
 * skill_source_inspect, skill_source_read, read_skill_reference) plus the
 * `/skill-create` entrypoint and the Skill-only external-source scope guard,
 * independent of any particular Agent. Any Agent preset that mounts this
 * plugin gets the same Skill authoring surface, and every installed Skill is
 * written to the standard Agent Skills layout that the Claude Code and Codex
 * loaders both discover.
 */
/** Cordis plugin name — matches the row ID in cordis.patch.yml. */
export declare const name = "dsh-skill-authoring";
/** Services required by this plugin. */
export declare const inject: string[];
export declare function apply(ctx: Context): void;
export { SkillAuthoringStore } from './skill-authoring.js';
export type { PublishedSkill, SaveSkillInput, SkillInspection, SkillResource, SkillResourceKind, SkillScope, SkillSourceRef, } from './skill-authoring.js';
export { parseSkillSource } from './parser.js';
export type { ParsedSkillSource, SkillSourceFormat, SkillSourceHeading, SkillSourcePage, SkillSourceParagraph, SkillSourceStructure } from './parser.js';
export { inspectSkillSource, readSkillSource } from './skill-source.js';
export { readSkillReference } from './skill-reference.js';
export { skillToolDefinitions } from './tools.js';
export { explicitAbsolutePaths, registerSkillSourceAuthorization, skillCreateInstruction } from './agent.js';
export { installSkillSourceScopeGuard };
