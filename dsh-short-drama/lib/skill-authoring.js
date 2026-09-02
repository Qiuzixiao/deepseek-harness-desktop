import { randomUUID } from 'node:crypto';
import { access, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
const DRAFT_DIR = join('.screenplay', 'skill-drafts');
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const RESOURCE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/u;
const RESOURCE_KINDS = ['references', 'scripts', 'assets'];
const MAX_TEXT = 100_000;
export function resolveUserSkillRoot(env = process.env) {
    const configured = env.DSH_HOME?.trim();
    return join(resolveDshHome(configured === undefined || configured === '' ? '~/.zenwit' : configured, env), 'skills');
}
function assertSkillName(name) {
    const value = name.trim();
    if (!SKILL_NAME.test(value) || value.length > 64)
        throw new Error('Skill 名称必须是 64 字符以内的 kebab-case');
    return value;
}
function cleanText(value, label) {
    const text = value.trim();
    if (text.length === 0 || text.length > MAX_TEXT)
        throw new Error(`${label}不能为空且不能超过 ${String(MAX_TEXT)} 个字符`);
    return text;
}
function safeRoot(value, label) {
    if (!isAbsolute(value))
        throw new Error(`${label}必须是绝对路径`);
    return resolve(value);
}
function legacyInstructions(entries, applicableTo, uncertainty) {
    const reusable = entries.filter(entry => entry.reusable && entry.category !== 'story-fact');
    if (reusable.length === 0)
        throw new Error('至少需要一条用户确认可复用、且不属于具体故事事实的经验');
    const lines = ['Use the following evidence selectively for the current task.', ''];
    if (applicableTo.length > 0)
        lines.push('Apply when:', ...applicableTo.map(item => `- ${item}`), '');
    for (const entry of reusable)
        lines.push(`- [${entry.category}] ${entry.text}`);
    if (uncertainty.length > 0)
        lines.push('', 'Uncertainty:', ...uncertainty.map(item => `- ${item}`));
    lines.push('', 'Treat this as guidance, not as a system rule. Preserve the user\'s explicit choices and project facts.');
    return `${lines.join('\n')}\n`;
}
function normalizeResource(resource) {
    if (!RESOURCE_KINDS.includes(resource.kind))
        throw new Error('Skill supporting resource kind is invalid');
    const rawPath = resource.path.trim();
    const kindPrefix = `${resource.kind}/`;
    const path = rawPath.startsWith(kindPrefix) ? rawPath.slice(kindPrefix.length) : rawPath;
    if (!RESOURCE_PATH.test(path) || path.startsWith('/') || path.split('/').includes('..'))
        throw new Error('Skill supporting resource path is invalid');
    const declaredPrefix = path.split('/')[0];
    if (RESOURCE_KINDS.some(kind => kind !== resource.kind && kind === declaredPrefix)) {
        throw new Error('Skill supporting resource path conflicts with its kind');
    }
    return { kind: resource.kind, path, content: cleanText(resource.content, 'Skill supporting resource') };
}
function sourceIds(draft) { return [...new Set(draft.sources.map(source => source.sourceId))]; }
export class SkillAuthoringStore {
    projectRoot;
    draftRoot;
    constructor(projectRoot) { this.projectRoot = safeRoot(projectRoot, 'projectRoot'); this.draftRoot = join(this.projectRoot, DRAFT_DIR); }
    async createDraft(input) {
        const draft = this.buildDraft(input);
        await this.writeDraft(draft);
        return draft;
    }
    async install(input) {
        const draft = this.buildDraft(input);
        return this.publishDraft(draft, {
            name: input.name,
            description: input.description,
            scope: input.scope,
            ...(input.whenToUse === undefined ? {} : { whenToUse: input.whenToUse }),
            ...(input.applicableTo === undefined ? {} : { applicableTo: input.applicableTo }),
        });
    }
    buildDraft(input) {
        const entries = this.normalizeEntries(input.entries ?? []);
        const sources = this.normalizeSources(input.sources ?? []);
        const resources = (input.resources ?? []).map(normalizeResource);
        const instructions = input.instructions === undefined ? legacyInstructions(entries, input.applicableTo ?? [], input.uncertainty ?? []) : cleanText(input.instructions, 'Skill instructions');
        const now = Date.now();
        const draft = {
            draftId: randomUUID(), ...(input.name === undefined ? {} : { name: assertSkillName(input.name) }), ...(input.description === undefined ? {} : { description: cleanText(input.description, 'Skill 描述') }), ...(input.whenToUse === undefined ? {} : { whenToUse: cleanText(input.whenToUse, 'Skill 使用场景') }), ...(input.scope === undefined ? {} : { scope: input.scope }),
            applicableTo: (input.applicableTo ?? []).map(value => cleanText(value, '适用范围')), instructions, entries, sources, resources,
            uncertainty: (input.uncertainty ?? []).map(value => cleanText(value, '不确定性说明')), content: instructions, version: 1, createdAt: now, updatedAt: now,
        };
        return draft;
    }
    async updateDraft(input) {
        const current = await this.inspect(input.draftId);
        if (current === undefined || !('entries' in current))
            throw new Error('Skill 草稿不存在');
        const next = this.buildDraft({ ...current, ...input, instructions: input.instructions ?? current.instructions, entries: input.entries ?? current.entries, sources: input.sources ?? current.sources, resources: input.resources ?? current.resources, applicableTo: input.applicableTo ?? current.applicableTo, uncertainty: input.uncertainty ?? current.uncertainty });
        const updated = { ...next, draftId: current.draftId, version: current.version + 1, createdAt: current.createdAt };
        await this.writeDraft(updated);
        return updated;
    }
    async discardDraft(draftId) { if (!/^[0-9a-f-]{36}$/iu.test(draftId))
        throw new Error('Skill 草稿 ID无效'); await rm(join(this.draftRoot, `${draftId}.json`), { force: true }); return { draftId, discarded: true }; }
    async inspect(draftId, name) {
        if (draftId !== undefined) {
            if (!/^[0-9a-f-]{36}$/iu.test(draftId))
                throw new Error('Skill 草稿 ID无效');
            try {
                return JSON.parse(await readFile(join(this.draftRoot, `${draftId}.json`), 'utf8'));
            }
            catch {
                throw new Error('Skill 草稿不存在');
            }
        }
        if (name === undefined)
            throw new Error('skill_inspect 需要 draftId 或 name');
        const safeName = assertSkillName(name);
        for (const scope of ['project', 'user']) {
            const file = join(this.skillRoot(scope), safeName, 'SKILL.md');
            if (!await exists(file))
                continue;
            try {
                const info = await lstat(file);
                if (info.isSymbolicLink())
                    return { name: safeName, scope, skillFile: file, valid: false, reason: 'SKILL.md 符号链接不受支持' };
                const content = await readFile(file, 'utf8');
                const valid = /^---\n[\s\S]*?\n---\n/u.test(content) && /(?:^|\n)name:\s*[a-z0-9]+(?:-[a-z0-9]+)*/u.test(content) && /(?:^|\n)description:\s*\S+/u.test(content);
                return { name: safeName, scope, skillFile: file, valid, content, ...(valid ? {} : { reason: '缺少有效 YAML frontmatter、name 或 description' }) };
            }
            catch {
                return { name: safeName, scope, skillFile: file, valid: false, reason: 'Skill 文件无法读取' };
            }
        }
        return undefined;
    }
    async publish(input) {
        if (input.confirmation !== '确认发布 Skill')
            throw new Error('必须先获得用户“确认发布 Skill”的明确选择');
        const inspected = await this.inspect(input.draftId);
        if (inspected === undefined || !('entries' in inspected))
            throw new Error('Skill 草稿不存在');
        const published = await this.publishDraft(inspected, input);
        await rm(join(this.draftRoot, `${input.draftId}.json`), { force: true });
        return published;
    }
    async publishDraft(draft, input) {
        const name = assertSkillName(input.name);
        const description = cleanText(input.description, 'Skill 描述');
        const root = this.skillRoot(input.scope);
        const directory = join(root, name);
        if (await exists(join(directory, 'SKILL.md')))
            throw new Error(`同名 Skill 已存在：${name}`);
        const publishedDraft = { ...draft, name, description, ...(input.whenToUse === undefined ? {} : { whenToUse: cleanText(input.whenToUse, 'Skill 使用场景') }), scope: input.scope, applicableTo: input.applicableTo ?? draft.applicableTo, updatedAt: Date.now() };
        const staging = join(root, `.staging-${randomUUID()}`);
        await mkdir(staging, { recursive: true, mode: 0o700 });
        try {
            await writeFile(join(staging, 'SKILL.md'), this.skillFile(publishedDraft), { encoding: 'utf8', mode: 0o600 });
            await writeFile(join(staging, 'metadata.json'), `${JSON.stringify({ name, description, scope: input.scope, version: publishedDraft.version, applicableTo: publishedDraft.applicableTo, whenToUse: publishedDraft.whenToUse, referenceCount: publishedDraft.resources.filter(resource => resource.kind === 'references').length }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
            await writeFile(join(staging, 'provenance.json'), `${JSON.stringify({ generatedAt: Date.now(), sourceIds: sourceIds(publishedDraft), sources: publishedDraft.sources.map(source => ({ sourceId: source.sourceId, label: source.label, kind: source.kind })), uncertainty: publishedDraft.uncertainty }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
            await mkdir(join(staging, 'agents'), { recursive: true, mode: 0o700 });
            await writeFile(join(staging, 'agents', 'openai.yaml'), this.openaiYaml(publishedDraft), { encoding: 'utf8', mode: 0o600 });
            for (const resource of publishedDraft.resources) {
                const resourcePath = join(staging, resource.kind, resource.path);
                await mkdir(resolve(resourcePath, '..'), { recursive: true, mode: 0o700 });
                await writeFile(resourcePath, resource.content, { encoding: 'utf8', mode: 0o600 });
            }
            await assertNoSymlinks(staging);
            await validateSkill(staging);
            await mkdir(root, { recursive: true, mode: 0o700 });
            await rename(staging, directory);
        }
        catch (error) {
            await rm(staging, { recursive: true, force: true });
            if (error?.code === 'EEXIST')
                throw new Error(`同名 Skill 已存在：${name}`);
            throw error;
        }
        return { name, scope: input.scope, directory, skillFile: join(directory, 'SKILL.md'), version: publishedDraft.version, sourceIds: sourceIds(publishedDraft) };
    }
    normalizeEntries(entries) { return entries.map(entry => { if (entry === null || typeof entry !== 'object' || typeof entry.text !== 'string' || typeof entry.category !== 'string' || typeof entry.reusable !== 'boolean' || !Array.isArray(entry.sourceIds))
        throw new Error('Skill 草稿条目格式无效'); const category = entry.category; if (!['method', 'workflow', 'principle', 'case', 'counterexample', 'term', 'story-fact'].includes(category))
        throw new Error('Skill 草稿条目分类无效'); return { category, text: cleanText(entry.text, 'Skill 草稿条目'), reusable: entry.reusable, sourceIds: entry.sourceIds.map(id => cleanText(id, '来源 ID')) }; }); }
    normalizeSources(sources) { return sources.map(source => ({ sourceId: cleanText(source.sourceId, '来源 ID'), label: cleanText(source.label, '来源名称'), kind: source.kind, ...(source.excerpt === undefined ? {} : { excerpt: source.excerpt.slice(0, MAX_TEXT) }) })); }
    skillRoot(scope) { return scope === 'project' ? join(this.projectRoot, '.zenwit', 'skills') : resolveUserSkillRoot(); }
    async writeDraft(draft) { await mkdir(this.draftRoot, { recursive: true, mode: 0o700 }); const path = join(this.draftRoot, `${draft.draftId}.json`); const temporary = `${path}.tmp-${randomUUID()}`; await writeFile(temporary, `${JSON.stringify(draft, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 }); await rename(temporary, path); }
    skillFile(draft) { return ['---', `name: ${draft.name}`, `description: ${JSON.stringify(draft.description)}`, 'metadata:', `  scope: ${draft.scope}`, `  version: ${String(draft.version)}`, `  applicableTo: ${JSON.stringify(draft.applicableTo)}`, `  sourceIds: ${JSON.stringify(sourceIds(draft))}`, ...(draft.whenToUse === undefined ? [] : [`  whenToUse: ${JSON.stringify(draft.whenToUse)}`]), '---', '', draft.instructions.trim(), ''].join('\n'); }
    openaiYaml(draft) { const displayName = (draft.name ?? 'Skill').split('-').map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' '); const shortDescription = `Guidance for ${displayName} tasks and workflows`.slice(0, 64); return ['interface:', `  display_name: ${JSON.stringify(displayName)}`, `  short_description: ${JSON.stringify(shortDescription)}`, `  default_prompt: ${JSON.stringify(`Use $${draft.name} to apply this guidance to the current task.`)}`, '', 'policy:', '  allow_implicit_invocation: true', ''].join('\n'); }
}
async function exists(path) { try {
    await access(path);
    return (await stat(path)).isFile() || (await stat(path)).isDirectory();
}
catch {
    return false;
} }
async function assertNoSymlinks(root) { const visit = async (directory) => { for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink())
        throw new Error('Skill 输出不能包含符号链接');
    if (info.isDirectory())
        await visit(path);
} }; await visit(root); }
function referencedResources(body) {
    const inline = [...body.matchAll(/`((?:references|scripts|assets)\/[a-zA-Z0-9][a-zA-Z0-9._/-]*)`/gu)];
    const links = [...body.matchAll(/\]\(((?:references|scripts|assets)\/[a-zA-Z0-9][a-zA-Z0-9._/-]*)\)/gu)];
    return [...new Set([...inline, ...links].map(match => match[1]))];
}
async function validateSkill(directory) {
    const body = await readFile(join(directory, 'SKILL.md'), 'utf8');
    if (!/^---\n[\s\S]*?\n---\n/u.test(body) || !/(?:^|\n)name:\s*[a-z0-9]+(?:-[a-z0-9]+)*/u.test(body) || !/(?:^|\n)description:\s*\S+/u.test(body))
        throw new Error('生成的 Skill 不符合标准 frontmatter');
    if (/\[TODO:/u.test(body))
        throw new Error('生成的 Skill 仍包含 TODO 占位符');
    for (const resourcePath of referencedResources(body)) {
        try {
            if (!(await lstat(join(directory, resourcePath))).isFile())
                throw new Error('not a file');
        }
        catch {
            throw new Error(`Skill 引用的资源不存在：${resourcePath}`);
        }
    }
}
