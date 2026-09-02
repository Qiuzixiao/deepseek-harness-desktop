import { readFileSync, statSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { Service } from '@deepseek-ai/cordis';
import { ScreenplayError } from './errors.js';
import { DEFAULT_SCREENPLAY_LAYOUT, SCREENPLAY_LAYOUT_MARKER, detectScreenplayLayout, } from './layout.js';
import { ScreenplayProjectStore } from './store.js';
import { ScreenplayReferenceStore } from './references/store.js';
const PROJECT_LAYOUT = DEFAULT_SCREENPLAY_LAYOUT.directories;
const LAUNCHER_MARKER = join('.screenplay', 'launcher');
const MATERIALIZED_STATE = join('.screenplay', 'state.json');
function sessionKey(session) {
    return String(session.header.id);
}
function projectSlug(projectName) {
    const slug = projectName.trim()
        .normalize('NFKC')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '-')
        .replace(/\s+/gu, '-')
        .replace(/-+/gu, '-')
        .replace(/^[.-]+|[.-]+$/gu, '')
        .slice(0, 80);
    return slug.length > 0 ? slug : 'short-drama';
}
function absoluteRoot(value, label) {
    if (!isAbsolute(value)) {
        throw new ScreenplayError('INVALID_WORKSPACE', `${label} must be an absolute path`, { value });
    }
    return resolve(value);
}
function projectionOf(snapshot) {
    if (!snapshot.initialized) {
        return {
            initialized: false,
            phase: snapshot.prepared === true ? 'Intake' : 'Uninitialized',
            revision: 0,
            ...(snapshot.projectName === undefined ? {} : { projectName: snapshot.projectName }),
            ...(snapshot.projectRoot === undefined ? {} : { projectRoot: snapshot.projectRoot }),
            ...(snapshot.prepared === true ? { prepared: true } : {}),
        };
    }
    return {
        initialized: true,
        phase: snapshot.phase,
        revision: snapshot.revision,
        projectId: snapshot.projectId,
        projectName: snapshot.projectName,
        ...(snapshot.projectRoot === undefined ? {} : { projectRoot: snapshot.projectRoot }),
        ...(snapshot.pendingChange === undefined ? {} : { pendingChangeId: snapshot.pendingChange.id }),
        ...(snapshot.currentVersion === undefined ? {} : { currentVersionId: snapshot.currentVersion.id }),
        ...(snapshot.writingProgress === undefined ? {} : {
            writingStatus: snapshot.writingProgress.status,
            nextEpisode: snapshot.writingProgress.nextEpisode,
            completedEpisodes: snapshot.writingProgress.completedEpisodes.length,
            totalEpisodes: snapshot.writingProgress.totalEpisodes,
        }),
    };
}
function draftKey(session, projectRoot, episode) {
    return `${sessionKey(session)}:${projectRoot}:${String(episode)}`;
}
function draftContent(draft) {
    const entries = Object.entries(draft.scenes)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, content]) => content.trim())
        .filter(Boolean);
    if (entries.length === 0)
        return '';
    const title = `第${String(draft.episode)}集`;
    const assembled = entries.map((content, index) => {
        const withoutDuplicateTitle = index === 0
            ? content
            : content.replace(new RegExp(`^${title}\\s*`, 'u'), '');
        // A scene can be replaced independently. Keep the formal episode marker
        // only at the end of the assembled draft so an intermediate scene cannot
        // masquerade as a completed episode.
        return index === entries.length - 1
            ? withoutDuplicateTitle
            : withoutDuplicateTitle.replace(/^【本集完】\s*$/gmu, '').trim();
    }).filter(Boolean).join('\n\n');
    return assembled.startsWith(title) ? assembled : `${title}\n\n${assembled}`;
}
function issueFromError(error, artifact) {
    if (error instanceof ScreenplayError) {
        const details = error.details;
        const issues = Array.isArray(details.issues) ? details.issues : [];
        const first = issues[0];
        const missingSections = Array.isArray(details.missingSections) ? details.missingSections : [];
        const location = first !== null && typeof first === 'object'
            ? Object.entries(first)
                .find(([key]) => ['field', 'scene', 'path'].includes(key))?.[1]
            : missingSections.length > 0 ? missingSections.join(', ') : undefined;
        return {
            channel: 'A',
            code: error.code,
            severity: 'error',
            artifact,
            ...(location === undefined ? {} : { location: String(location) }),
            message: error.message,
            repairHint: missingSections.length > 0
                ? `补齐这些结构：${missingSections.join('、')}`
                : '根据校验结果修正草稿后重新校验。',
        };
    }
    return {
        channel: 'A',
        code: 'VALIDATION_FAILED',
        severity: 'error',
        artifact,
        message: error instanceof Error ? error.message : String(error),
        repairHint: '检查当前场景草稿和项目上下文后重试。',
    };
}
export class ScreenplayProjectService extends Service {
    stores = new Map();
    summaries = new Map();
    bindings = new Map();
    referenceStores = new Map();
    episodeDrafts = new Map();
    constructor(context) {
        super(context, 'screenplayProjects');
    }
    contextSummary(session) {
        if (session === undefined) {
            return 'Screenplay project state: unavailable because this session has no Agent.';
        }
        const binding = this.bindingForSession(session);
        if (binding === undefined) {
            const prepared = this.preparedProjectForSession(session);
            if (prepared !== undefined) {
                return [
                    'Screenplay project folder is prepared and bound to this session:',
                    `- project root: ${prepared.projectRoot}`,
                    `- project: ${prepared.projectName}`,
                    '- initialized: false',
                    '- phase: Intake',
                    '- Formal Markdown files have not been created yet. Analyze the current user-provided material and discuss the direction; do not ask the user to create or bind another project.',
                ].join('\n');
            }
            return 'No screenplay project folder is bound to this session. Do not search the Workspace; create the project through screenplay_create_contract after the user confirms the project direction.';
        }
        const summary = this.summaries.get(binding.projectRoot)
            ?? this.materializedSummary(binding.projectRoot);
        if (summary === undefined) {
            return `Screenplay project folder is bound to this session: ${binding.projectRoot}. Call read_project_context before modifying it.`;
        }
        return [
            'Screenplay project state:',
            `- project root: ${binding.projectRoot}`,
            `- initialized: ${String(summary.initialized)}`,
            `- phase: ${summary.phase}`,
            `- revision: ${String(summary.revision)}`,
            ...(summary.projectName === undefined ? [] : [`- project: ${summary.projectName}`]),
            ...(summary.pendingChangeId === undefined ? [] : [`- pending change: ${summary.pendingChangeId}`]),
            ...(summary.currentVersionId === undefined ? [] : [`- current version: ${summary.currentVersionId}`]),
            ...(summary.writingStatus === undefined ? [] : [`- screenplay writing: ${summary.writingStatus}`]),
            ...(summary.nextEpisode === undefined ? [] : [`- next episode: ${String(summary.nextEpisode)}`]),
            ...(summary.totalEpisodes === undefined ? [] : [`- total episodes: ${String(summary.totalEpisodes)}`]),
            '- This summary is advisory. Domain tool results and Workspace events are authoritative.',
        ].join('\n');
    }
    async snapshot(workspaceRoot, view = 'summary') {
        const snapshot = await this.store(workspaceRoot).snapshot(view);
        this.summaries.set(workspaceRoot, projectionOf(snapshot));
        return snapshot;
    }
    bindingForSession(session) {
        const key = sessionKey(session);
        const cached = this.bindings.get(key);
        if (cached !== undefined)
            return cached;
        // rc.2 不持久化自定义 session 事件：绑定以内存 map + 会话 cwd 的
        // state.json 恢复为准（recoverBindingForSession）。
        const recovered = this.recoverBindingForSession(session);
        if (recovered !== undefined)
            this.bindings.set(key, recovered);
        return recovered;
    }
    /**
     * Return the desktop-created project preparation before the first formal
     * artifact set. New sessions carry a durable preparation event; the exact
     * Session cwd plus launcher marker is also accepted as a one-path migration
     * fallback for folders created before this binding event was introduced.
     */
    preparedProjectForSession(session) {
        // rc.2 不持久化自定义 session 事件：桌面端准备的项目目录以
        // .screenplay/launcher 标记 + 会话 cwd 识别。
        const sessionCwd = session.header.cwd;
        if (sessionCwd === undefined || !isAbsolute(sessionCwd))
            return undefined;
        const projectRoot = resolve(sessionCwd);
        try {
            if (!statSync(join(projectRoot, LAUNCHER_MARKER)).isDirectory())
                return undefined;
        }
        catch {
            return undefined;
        }
        return {
            projectName: basename(projectRoot),
            parentRoot: dirname(projectRoot),
            projectRoot,
            createdAt: session.header.createdAt,
        };
    }
    projectRootForSession(session) {
        return this.bindingForSession(session)?.projectRoot ?? this.preparedProjectForSession(session)?.projectRoot;
    }
    /** Reference intake is available as soon as Desktop prepares the project folder. */
    referenceProjectRootForSession(session) {
        return this.bindingForSession(session)?.projectRoot ?? this.preparedProjectForSession(session)?.projectRoot;
    }
    async referenceConflictsForSession(session, names) {
        return this.referenceStoreForSession(session).conflicts(names);
    }
    async saveReferencesForSession(session, files) {
        return this.referenceStoreForSession(session).saveBatch(files);
    }
    async listReferencesForSession(session) {
        return this.referenceStoreForSession(session).list();
    }
    async referenceStructureForSession(session, referenceId) {
        return this.referenceStoreForSession(session).structure(referenceId);
    }
    async readReferenceSelectionForSession(session, selectionId) {
        return this.referenceStoreForSession(session).readSelection(selectionId);
    }
    async readDocumentForSession(session, referenceId, page, pageSize) {
        return this.referenceStoreForSession(session).readDocument(referenceId, page, pageSize);
    }
    async readReferencePreviewForSession(session, path) {
        const projectRoot = this.referenceProjectRootForSession(session);
        if (projectRoot === undefined)
            throw new ScreenplayError('INVALID_WORKSPACE', '请先创建并进入剧本项目');
        return this.readReferencePreviewForProject(projectRoot, path);
    }
    async readReferencePreviewForProject(projectRoot, path) {
        const root = absoluteRoot(projectRoot, 'projectRoot');
        const relativePath = relative(root, resolve(path));
        const parts = relativePath.split(sep);
        const referenceDir = detectScreenplayLayout(root).referenceDir;
        if (parts.length !== 2 || parts[0] !== referenceDir || parts[1] === undefined) {
            throw new ScreenplayError('INVALID_WORKSPACE', '只能预览当前剧本项目参考文件夹中的文件');
        }
        return this.referenceStoreForProject(root).preview(parts[1]);
    }
    referenceContextSummaryForSession(session) {
        const projectRoot = this.referenceProjectRootForSession(session);
        if (projectRoot === undefined)
            return '';
        return this.referenceStoreForSession(session).contextSummary();
    }
    async snapshotForSession(session, view = 'summary') {
        const binding = this.bindingForSession(session);
        if (binding === undefined) {
            const prepared = this.preparedProjectForSession(session);
            if (prepared !== undefined) {
                return {
                    initialized: false,
                    phase: 'Intake',
                    revision: 0,
                    projectName: prepared.projectName,
                    projectRoot: prepared.projectRoot,
                    prepared: true,
                };
            }
            return { initialized: false, phase: 'Uninitialized', revision: 0 };
        }
        const snapshot = await this.snapshot(binding.projectRoot, view);
        return { ...snapshot, projectRoot: binding.projectRoot };
    }
    /**
     * Persist the desktop launcher hand-off before the Agent's first turn. The
     * folder is bound immediately, while formal Markdown artifacts remain absent
     * until screenplay_create_contract succeeds.
     */
    async bindPreparedProject(session, projectRoot, projectName) {
        const normalizedRoot = absoluteRoot(projectRoot, 'prepared screenplay project directory');
        const normalizedName = projectName.trim();
        if (normalizedName.length === 0 || normalizedName !== basename(normalizedRoot)) {
            throw new ScreenplayError('INVALID_WORKSPACE', 'prepared project name must match the project folder name', {
                projectName,
                projectRoot: normalizedRoot,
            });
        }
        const sessionCwd = session.header.cwd;
        if (sessionCwd === undefined || absoluteRoot(sessionCwd, 'session project directory') !== normalizedRoot) {
            throw new ScreenplayError('INVALID_WORKSPACE', 'prepared project directory must match the Session Workspace');
        }
        if (!(await this.isPreparedProjectRoot(normalizedRoot))) {
            throw new ScreenplayError('INVALID_WORKSPACE', 'prepared screenplay project marker is missing', {
                projectRoot: normalizedRoot,
            });
        }
        const prepared = {
            projectName: normalizedName,
            parentRoot: dirname(normalizedRoot),
            projectRoot: normalizedRoot,
            createdAt: Date.now(),
        };
        return prepared;
    }
    /**
     * Prepare a new project directory before the Client creates its Workspace.
     * Filesystem mutation stays on the Host so native directory selection does
     * not need the browse capability merely to create a screenplay project.
     */
    async prepareProject(parentRoot, projectName) {
        const parent = absoluteRoot(parentRoot, 'project parent directory');
        const normalizedName = projectName.trim();
        if (normalizedName.length === 0) {
            throw new ScreenplayError('INVALID_WORKSPACE', 'project name must not be empty');
        }
        const projectRoot = await this.createProjectDirectory(parent, normalizedName);
        await mkdir(join(projectRoot, LAUNCHER_MARKER), { recursive: true, mode: 0o700 });
        await writeFile(join(projectRoot, SCREENPLAY_LAYOUT_MARKER), `${JSON.stringify({ layout: DEFAULT_SCREENPLAY_LAYOUT.id })}\n`, {
            encoding: 'utf8',
            mode: 0o600,
        });
        return { projectRoot };
    }
    async createContract(workspaceRoot, expectedRevision, operationId, projectName, changes, input) {
        return this.mutate(workspaceRoot, store => store.createProject(expectedRevision, operationId, projectName, changes, input));
    }
    async createContractForSession(session, parentRoot, expectedRevision, operationId, projectName, changes, input) {
        const existing = this.bindingForSession(session);
        if (existing !== undefined) {
            const outcome = await this.createContract(existing.projectRoot, expectedRevision, operationId, existing.projectName, changes, input);
            return { ...outcome, binding: existing };
        }
        const parent = absoluteRoot(parentRoot, 'project parent directory');
        const sessionCwd = session.header.cwd;
        if (sessionCwd !== undefined) {
            const preparedRoot = absoluteRoot(sessionCwd, 'session project directory');
            // The desktop launcher has already allocated the authoritative project
            // directory. Its basename may differ from the story title entered later
            // in the Agent discussion, so never create a nested folder merely because
            // those two names differ.
            if (await this.isPreparedProjectRoot(preparedRoot)) {
                const preparedProjectName = basename(preparedRoot);
                const outcome = await this.createContract(preparedRoot, 0, operationId, preparedProjectName, changes, input);
                const projectId = outcome.result.projectId;
                if (typeof projectId !== 'string') {
                    throw new ScreenplayError('INVALID_STATE', 'prepared screenplay project did not return a project id');
                }
                const binding = {
                    projectId,
                    projectName: preparedProjectName,
                    parentRoot: dirname(preparedRoot),
                    projectRoot: preparedRoot,
                    createdAt: Date.now(),
                };
                this.bindings.set(sessionKey(session), binding);
                return {
                    ...outcome,
                    binding,
                    result: { ...outcome.result, projectRoot: preparedRoot },
                };
            }
        }
        if (projectName === undefined) {
            throw new ScreenplayError('INVALID_WORKSPACE', 'screenplay project must be created by the desktop launcher before the Agent creates files');
        }
        const projectRoot = await this.createProjectDirectory(parent, projectName);
        await writeFile(join(projectRoot, SCREENPLAY_LAYOUT_MARKER), `${JSON.stringify({ layout: DEFAULT_SCREENPLAY_LAYOUT.id })}\n`, {
            encoding: 'utf8',
            mode: 0o600,
        });
        const outcome = await this.createContract(projectRoot, 0, operationId, projectName, changes, input);
        const projectId = outcome.result.projectId;
        if (typeof projectId !== 'string') {
            throw new ScreenplayError('INVALID_STATE', 'created screenplay project did not return a project id');
        }
        const binding = {
            projectId,
            projectName: projectName.trim(),
            parentRoot: parent,
            projectRoot,
            createdAt: Date.now(),
        };
        this.bindings.set(sessionKey(session), binding);
        return {
            ...outcome,
            binding,
            result: { ...outcome.result, projectRoot },
        };
    }
    async createOutline(workspaceRoot, expectedRevision, operationId, outlineContent) {
        return this.mutate(workspaceRoot, store => store.createOutline(expectedRevision, operationId, outlineContent));
    }
    async createOutlineBundle(workspaceRoot, expectedRevision, operationId, input) {
        return this.mutate(workspaceRoot, store => store.createOutlineBundle(expectedRevision, operationId, input));
    }
    async createEpisodeOutlineBatch(workspaceRoot, expectedRevision, operationId, input) {
        return this.mutate(workspaceRoot, store => store.createEpisodeOutlineBatch(expectedRevision, operationId, input));
    }
    async finalizeOutlineBundle(workspaceRoot, expectedRevision, operationId, input) {
        return this.mutate(workspaceRoot, store => store.finalizeOutlineBundle(expectedRevision, operationId, input));
    }
    async writingContext(workspaceRoot) {
        return this.store(workspaceRoot).writingContext();
    }
    async readProjectContextForSession(session) {
        return this.snapshotForSession(session, 'summary');
    }
    async readArtifactForSession(session, logicalPath) {
        const projectRoot = this.projectRootForSession(session);
        if (projectRoot === undefined)
            throw new ScreenplayError('INVALID_WORKSPACE', 'no screenplay project is bound to this session');
        if (isAbsolute(logicalPath) || logicalPath.trim().length === 0 || logicalPath.split(/[\\/]/u).includes('..')) {
            throw new ScreenplayError('INVALID_WORKSPACE', 'artifact path must be a non-empty project-relative path', { logicalPath });
        }
        const normalizedPath = posix.normalize(logicalPath.replaceAll('\\', '/'));
        const snapshot = await this.snapshotForSession(session, 'artifacts');
        if (!snapshot.initialized)
            throw new ScreenplayError('NOT_INITIALIZED', 'screenplay project is not initialized');
        const sessionPrefix = `${sessionKey(session)}:${projectRoot}:`;
        const draft = [...this.episodeDrafts.entries()].find(([key, candidate]) => {
            const episodePath = this.store(projectRoot).layout.episodeScreenplayPath(candidate.episode);
            return key.startsWith(sessionPrefix) && episodePath === normalizedPath;
        })?.[1];
        if (draft !== undefined) {
            const value = { ...draft, content: draftContent(draft) };
            return { ok: true, path: normalizedPath, source: 'session-draft', ...value };
        }
        const content = snapshot.artifactContents?.[normalizedPath];
        if (content === undefined) {
            throw new ScreenplayError('INVALID_INPUT', 'artifact does not exist in the bound project', { logicalPath: normalizedPath });
        }
        return { ok: true, path: normalizedPath, source: 'formal', content, revision: snapshot.revision };
    }
    async searchProjectForSession(session, query) {
        if (query.trim().length === 0)
            throw new ScreenplayError('INVALID_INPUT', 'search query must not be empty');
        const snapshot = await this.snapshotForSession(session, 'artifacts');
        if (!snapshot.initialized)
            throw new ScreenplayError('NOT_INITIALIZED', 'screenplay project is not initialized');
        const matches = [];
        for (const [path, content] of Object.entries(snapshot.artifactContents ?? {})) {
            content.split('\n').forEach((line, index) => {
                if (line.includes(query))
                    matches.push({ path, line: index + 1, text: line });
            });
        }
        return { ok: true, query, revision: snapshot.revision, matches };
    }
    async writeSceneForSession(session, episode, sceneNo, content) {
        const projectRoot = this.projectRootForSession(session);
        if (projectRoot === undefined)
            throw new ScreenplayError('INVALID_WORKSPACE', 'no screenplay project is bound to this session');
        if (!Number.isSafeInteger(episode) || episode <= 0 || !Number.isSafeInteger(sceneNo) || sceneNo <= 0) {
            throw new ScreenplayError('VALIDATION_FAILED', 'episode and sceneNo must be positive integers');
        }
        if (content.trim().length === 0)
            throw new ScreenplayError('VALIDATION_FAILED', 'scene content must not be empty');
        const snapshot = await this.snapshotForSession(session, 'summary');
        if (!snapshot.initialized)
            throw new ScreenplayError('NOT_INITIALIZED', 'screenplay project is not initialized');
        if (snapshot.pendingChange !== undefined) {
            throw new ScreenplayError('INVALID_STATE', 'save or discard the pending change first', { pendingChangeId: snapshot.pendingChange.id });
        }
        const progress = snapshot.writingProgress ?? {
            status: 'NotStarted',
            totalEpisodes: snapshot.requirements.episodeCount ?? 0,
            nextEpisode: 1,
            completedEpisodes: [],
            episodes: [],
        };
        if (episode !== progress.nextEpisode) {
            throw new ScreenplayError('INVALID_STATE', 'new screenplay scenes must target the current next episode', {
                expected: progress.nextEpisode,
                actual: episode,
            });
        }
        const key = draftKey(session, projectRoot, episode);
        const current = this.episodeDrafts.get(key);
        if (current !== undefined && current.baseRevision !== snapshot.revision) {
            throw new ScreenplayError('REVISION_CONFLICT', 'the episode draft is based on an older project revision', {
                expected: current.baseRevision,
                actual: snapshot.revision,
            });
        }
        const draft = current === undefined
            ? { episode, baseRevision: snapshot.revision, scenes: {}, updatedAt: Date.now() }
            : { ...current, scenes: { ...current.scenes }, updatedAt: Date.now() };
        draft.scenes[sceneNo] = content.trim();
        this.episodeDrafts.set(key, draft);
        return {
            ok: true,
            episode,
            sceneNo,
            revision: snapshot.revision,
            draft: { ...draft, content: draftContent(draft) },
        };
    }
    async validateEpisodeForSession(session, episode) {
        const projectRoot = this.projectRootForSession(session);
        if (projectRoot === undefined)
            throw new ScreenplayError('INVALID_WORKSPACE', 'no screenplay project is bound to this session');
        const snapshot = await this.snapshotForSession(session, 'artifacts');
        if (!snapshot.initialized)
            throw new ScreenplayError('NOT_INITIALIZED', 'screenplay project is not initialized');
        const store = this.store(projectRoot);
        const logicalPath = store.layout.episodeScreenplayPath(episode);
        const draft = this.episodeDrafts.get(draftKey(session, projectRoot, episode));
        const content = draft === undefined ? snapshot.artifactContents?.[logicalPath] : draftContent(draft);
        if (content === undefined) {
            return {
                ok: false,
                episode,
                revision: snapshot.revision,
                issues: [{
                        channel: 'A',
                        code: 'ARTIFACT_MISSING',
                        severity: 'error',
                        artifact: logicalPath,
                        message: '当前集还没有正式文件或 Session 草稿。',
                        repairHint: '先写入至少一场，再运行 validate_episode。',
                    }],
            };
        }
        try {
            const count = await store.validateEpisodeContent(episode, content);
            return { ok: true, episode, revision: snapshot.revision, issues: [], effectiveCharacterCount: count };
        }
        catch (error) {
            return { ok: false, episode, revision: snapshot.revision, issues: [issueFromError(error, logicalPath)] };
        }
    }
    async diagnoseEpisodeForSession(session, episode) {
        const validation = await this.validateEpisodeForSession(session, episode);
        return {
            ...validation,
            advisory: true,
            reviewAreas: [
                { id: 'hook', prompt: '开场是否立刻建立人物、问题和可验证期待？' },
                { id: 'pressure', prompt: '本集是否持续增加具体压力，且每场都改变情绪账目？' },
                { id: 'reversal', prompt: '反转是否改变事件性质，并能由前文证据回看解释？' },
                { id: 'dialogue', prompt: '对白是否符合人物知情边界，同时具备潜台词和行动目的？' },
                { id: 'cliffhanger', prompt: '集尾是否停在下一笔债的开口，而不是完成态或抽象判断？' },
                { id: 'production', prompt: '场面、动作和信息表达是否具体、可拍且成本合理？' },
            ],
        };
    }
    async commitEpisodeForSession(session, expectedRevision, operationId, episode, continuity) {
        const projectRoot = this.projectRootForSession(session);
        if (projectRoot === undefined)
            throw new ScreenplayError('INVALID_WORKSPACE', 'no screenplay project is bound to this session');
        const store = this.store(projectRoot);
        const committed = await store.findOperationResult(operationId, 'episode-created');
        if (committed !== undefined) {
            return { result: committed, snapshot: await store.snapshot('summary') };
        }
        const draft = this.episodeDrafts.get(draftKey(session, projectRoot, episode));
        if (draft === undefined)
            throw new ScreenplayError('INVALID_STATE', 'there is no session draft for this episode', { episode });
        if (draft.baseRevision !== expectedRevision) {
            throw new ScreenplayError('REVISION_CONFLICT', 'the episode draft is based on an older project revision', {
                expected: draft.baseRevision,
                actual: expectedRevision,
            });
        }
        const validation = await this.validateEpisodeForSession(session, episode);
        if (!validation.ok) {
            throw new ScreenplayError('VALIDATION_FAILED', 'episode A validation failed; formal file was not modified', {
                episode,
                issues: validation.issues,
                written: false,
            });
        }
        const outcome = await this.createEpisodeScreenplay(projectRoot, expectedRevision, operationId, {
            episodeContent: draftContent(draft),
            continuity,
        });
        this.episodeDrafts.delete(draftKey(session, projectRoot, episode));
        return outcome;
    }
    async createEpisodeScreenplay(workspaceRoot, expectedRevision, operationId, input) {
        return this.mutate(workspaceRoot, store => store.createEpisodeScreenplay(expectedRevision, operationId, input));
    }
    async mergeDelivery(workspaceRoot, expectedRevision, operationId) {
        return this.mutate(workspaceRoot, store => store.mergeDelivery(expectedRevision, operationId));
    }
    async prepareChange(workspaceRoot, expectedRevision, operationId, changes) {
        return this.mutate(workspaceRoot, store => store.prepareChange(expectedRevision, operationId, changes));
    }
    async saveChange(workspaceRoot, expectedRevision, operationId, changeId) {
        return this.mutate(workspaceRoot, store => store.saveChange(expectedRevision, operationId, changeId));
    }
    async discardChange(workspaceRoot, expectedRevision, operationId, changeId) {
        return this.mutate(workspaceRoot, store => store.discardChange(expectedRevision, operationId, changeId));
    }
    async restoreVersion(workspaceRoot, expectedRevision, operationId, sourceVersionId) {
        return this.mutate(workspaceRoot, store => store.restoreVersion(expectedRevision, operationId, sourceVersionId));
    }
    store(workspaceRoot) {
        let store = this.stores.get(workspaceRoot);
        if (store === undefined) {
            store = new ScreenplayProjectStore(workspaceRoot, detectScreenplayLayout(workspaceRoot));
            this.stores.set(workspaceRoot, store);
        }
        return store;
    }
    /**
     * Recover an initialized project for the exact Session workspace when the
     * session lacks a durable project-binding event. This deliberately does not
     * search parent folders or enumerate the workspace.
     */
    recoverBindingForSession(session) {
        const prepared = this.preparedProjectForSession(session);
        const sessionCwd = session.header.cwd;
        if (sessionCwd === undefined || !isAbsolute(sessionCwd)) {
            return undefined;
        }
        const projectRoot = prepared?.projectRoot ?? absoluteRoot(sessionCwd, 'session project directory');
        if (prepared !== undefined && projectRoot !== prepared.projectRoot)
            return undefined;
        let state;
        try {
            state = JSON.parse(readFileSync(join(projectRoot, MATERIALIZED_STATE), 'utf8'));
        }
        catch {
            return undefined;
        }
        if (!this.isRecoverableState(state, projectRoot))
            return undefined;
        return {
            projectId: state.projectId,
            projectName: state.projectName,
            parentRoot: dirname(projectRoot),
            projectRoot,
            createdAt: state.updatedAt,
        };
    }
    isRecoverableState(state, projectRoot) {
        return state.schemaVersion === 2
            && typeof state.projectId === 'string'
            && state.projectId.length > 0
            && typeof state.projectName === 'string'
            && state.projectName === basename(projectRoot)
            && Number.isInteger(state.revision)
            && state.revision > 0
            && state.currentVersion !== undefined
            && state.currentVersion.artifacts.length > 0;
    }
    materializedSummary(projectRoot) {
        try {
            const state = JSON.parse(readFileSync(join(projectRoot, MATERIALIZED_STATE), 'utf8'));
            if (!this.isRecoverableState(state, projectRoot))
                return undefined;
            const summary = projectionOf({ initialized: true, ...state, projectRoot });
            this.summaries.set(projectRoot, summary);
            return summary;
        }
        catch {
            return undefined;
        }
    }
    referenceStoreForSession(session) {
        const projectRoot = this.referenceProjectRootForSession(session);
        if (projectRoot === undefined) {
            throw new ScreenplayError('INVALID_WORKSPACE', '请先创建并进入剧本项目');
        }
        return this.referenceStoreForProject(projectRoot);
    }
    referenceStoreForProject(projectRoot) {
        const root = absoluteRoot(projectRoot, 'projectRoot');
        let store = this.referenceStores.get(root);
        if (store === undefined) {
            store = new ScreenplayReferenceStore(root, detectScreenplayLayout(root).referenceDir);
            this.referenceStores.set(root, store);
        }
        return store;
    }
    async createProjectDirectory(parentRoot, projectName) {
        await mkdir(parentRoot, { recursive: true, mode: 0o700 });
        const slug = projectSlug(projectName);
        for (let index = 0; index < 1000; index += 1) {
            const suffix = index === 0 ? '' : `-${String(index + 1)}`;
            const projectRoot = join(parentRoot, `${slug}${suffix}`);
            try {
                await mkdir(projectRoot, { recursive: false, mode: 0o700 });
                await Promise.all(PROJECT_LAYOUT.map(directory => mkdir(join(projectRoot, directory), {
                    recursive: true,
                    mode: 0o700,
                })));
                await mkdir(join(projectRoot, '.screenplay'), { recursive: true, mode: 0o700 });
                return projectRoot;
            }
            catch (error) {
                if (error?.code === 'EEXIST')
                    continue;
                throw error;
            }
        }
        throw new ScreenplayError('INVALID_WORKSPACE', 'could not allocate a unique screenplay project directory', {
            parentRoot,
            projectName,
        });
    }
    async isPreparedProjectRoot(projectRoot) {
        try {
            const marker = await stat(join(projectRoot, LAUNCHER_MARKER));
            return marker.isDirectory();
        }
        catch {
            return false;
        }
    }
    async mutate(workspaceRoot, operation) {
        const store = this.store(workspaceRoot);
        const result = await operation(store);
        const snapshot = await store.snapshot('summary');
        this.summaries.set(workspaceRoot, projectionOf(snapshot));
        return { result, snapshot };
    }
}
export { projectionOf };
