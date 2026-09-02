import { realpath, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
/**
 * Read one relative resource from a Skill that is visible to the calling
 * Agent. Skill resources are deliberately separate from arbitrary project
 * files: the caller must name the Skill and cannot turn this into an
 * unrestricted file reader by supplying an absolute path or parent traversal.
 */
export async function readSkillReference(ctx, skillName, resourcePath, cwd, scope) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(skillName)) {
        throw new Error('skill name must use kebab-case');
    }
    if (resourcePath.trim().length === 0 || isAbsolute(resourcePath)
        || resourcePath.split(/[\\/]/u).includes('..')) {
        throw new Error('Skill resource path must be a non-empty path relative to that Skill and cannot contain parent traversal');
    }
    const getService = ctx.get;
    const resolver = (typeof getService === 'function'
        ? getService.call(ctx, 'skills')
        : undefined);
    if (resolver?.get === undefined) {
        throw new Error('Skill filesystem provider is not available');
    }
    const skill = await resolver.get(skillName, {
        ...(cwd === undefined ? {} : { cwd }),
        scope,
    });
    if (skill === undefined) {
        throw new Error(`Skill "${skillName}" is not available in this Session`);
    }
    const resourceBase = skill.resourceBase;
    if (resourceBase?.kind !== 'directory' || typeof resourceBase.path !== 'string' || !isAbsolute(resourceBase.path)) {
        throw new Error('this Skill does not expose local directory resources');
    }
    const base = await realpath(resourceBase.path);
    const target = resolve(base, resourcePath.replaceAll('\\', '/'));
    const resolvedTarget = await realpath(target);
    const baseRelative = relative(base, resolvedTarget);
    if (baseRelative === '..' || baseRelative.startsWith(`..${sep}`) || isAbsolute(baseRelative)) {
        throw new Error('Skill resource path escapes its resourceBase');
    }
    const content = await readFile(resolvedTarget, 'utf8');
    if (content.length > 1024 * 1024) {
        throw new Error('Skill reference is larger than the 1 MiB read limit');
    }
    return {
        ok: true,
        skill: skill.name,
        provider: skill.provider,
        path: resourcePath.replaceAll('\\', '/'),
        content,
    };
}
