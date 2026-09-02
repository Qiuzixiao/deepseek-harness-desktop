import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { PERSONA_ORDER, PERSONA_SECTION } from '@deepseek-ai/dsh-system-prompt';
import { SCREENPLAY_AGENT_PROMPT } from './prompt.js';
import { assertProjectPath, isProjectReadTool, pathArguments } from './project-scope.js';
import { screenplayToolDefinitions } from './tools.js';
export const name = 'screenplay-agent';
export const inject = ['tools', 'systemPrompt', 'screenplayProjects'];
const GENERIC_MUTATIONS = new Set(['write', 'edit', 'str_replace_editor', 'bash', 'pwsh', 'run_code']);
const VALIDATED_MUTATIONS = new Set([
    'write_scene',
    'commit_episode',
    'screenplay_create_contract',
    'screenplay_create_outline',
    'screenplay_create_episode_outline_batch',
    'screenplay_merge_delivery',
    'screenplay_prepare_change',
    'screenplay_save_change',
    'screenplay_discard_change',
    'screenplay_restore_version',
]);
const DIAGNOSTIC_TOOLS = new Set([
    'read_project_context',
    'read_artifact',
    'search_project',
    'validate_episode',
    'diagnose_episode',
]);
const LOOP_BREAK_REASON = 'same structural validation failed twice consecutively';
function validationSignature(exec, result) {
    if (!result.isError || result.error.info?.code !== 'VALIDATION_FAILED' || !VALIDATED_MUTATIONS.has(exec.name)) {
        return undefined;
    }
    const summary = result.error.message.split('\n', 1)[0]?.trim();
    return summary === undefined || summary.length === 0 ? undefined : `${exec.name}:${summary}`;
}
/** Allow one informed repair, then break argument-guessing loops until the Agent inspects current state. */
export function installScreenplayFailureGuard(ctx) {
    const chains = new WeakMap();
    ctx.on('tools/pre-execute', async (exec, next) => {
        const current = exec.agent === undefined ? undefined : chains.get(exec.agent);
        if (current?.diagnosticRequired === true && exec.name === current.tool) {
            return {
                kind: 'deny',
                reason: `${LOOP_BREAK_REASON} for ${exec.name}; call read_project_context or another relevant read/diagnostic tool before retrying`,
            };
        }
        return next();
    });
    ctx.on('tools/post-execute', async (exec, result, next) => {
        const downstream = await next();
        if (exec.agent === undefined)
            return downstream;
        const current = chains.get(exec.agent);
        if (current?.diagnosticRequired === true) {
            if (DIAGNOSTIC_TOOLS.has(exec.name) && !result.isError)
                chains.delete(exec.agent);
            return downstream;
        }
        const signature = validationSignature(exec, result);
        if (signature === undefined) {
            chains.delete(exec.agent);
            return downstream;
        }
        const count = current?.signature === signature ? current.count + 1 : 1;
        const chain = {
            tool: exec.name,
            signature,
            count,
            diagnosticRequired: count >= 2,
        };
        chains.set(exec.agent, chain);
        if (!chain.diagnosticRequired)
            return downstream;
        const reminder = createUserMessage({
            content: [{
                    type: 'text',
                    text: `${LOOP_BREAK_REASON} for ${exec.name}. Stop changing arguments by trial and error. Read the returned artifact/location/expected/actual/repairHint fields, then call read_project_context or another relevant read/diagnostic tool before one evidence-based retry. Do not ask the user unless a material creative fact is genuinely missing.`,
                }],
            source: { kind: 'plugin', plugin: 'screenplay-agent', form: 'notice', summary: `${exec.name} validation loop` },
        });
        const additionalContexts = [reminder, ...downstream.additionalContexts ?? []];
        return downstream.kind === 'block'
            ? { kind: 'block', feedback: downstream.feedback, additionalContexts }
            : { ...downstream, additionalContexts };
    });
    ctx.on('agent/pre-step', ({ agent, messages }, next) => {
        if (messages.some(message => message.source.kind === 'user'))
            chains.delete(agent);
        return next();
    });
}
/** Keep generic filesystem reads inside the Session's bound screenplay project. */
export function installScreenplayProjectScopeGuard(ctx) {
    ctx.on('tools/pre-execute', async (exec, next) => {
        if (!isProjectReadTool(exec.name))
            return next();
        if (exec.agent?.session === undefined) {
            return { kind: 'deny', reason: 'bind a screenplay project before using project-scoped file tools' };
        }
        const projectRoot = ctx.screenplayProjects.projectRootForSession(exec.agent.session);
        if (projectRoot === undefined) {
            return { kind: 'deny', reason: 'bind a screenplay project before using project-scoped file tools' };
        }
        try {
            for (const candidate of pathArguments(exec.name, exec.arguments)) {
                await assertProjectPath(exec.agent.session, projectRoot, candidate, `${exec.name} path`);
            }
        }
        catch (error) {
            return { kind: 'deny', reason: error instanceof Error ? error.message : String(error) };
        }
        return next();
    });
}
export function apply(ctx) {
    ctx.systemPrompt.section({
        name: PERSONA_SECTION,
        order: PERSONA_ORDER,
        text: SCREENPLAY_AGENT_PROMPT,
    });
    ctx.systemPrompt.context({
        name: 'screenplay:project-state',
        order: 20,
        text: context => {
            const session = context.agent?.session;
            if (session === undefined)
                return ctx.screenplayProjects.contextSummary(undefined);
            const project = ctx.screenplayProjects.contextSummary(session);
            const references = ctx.screenplayProjects.referenceContextSummaryForSession(session);
            return references.length === 0 ? project : `${project}\n${references}`;
        },
    });
    for (const definition of screenplayToolDefinitions(ctx))
        ctx.tools.register(definition);
    installScreenplayFailureGuard(ctx);
    ctx.on('tools/pre-execute', async (exec, next) => {
        if (GENERIC_MUTATIONS.has(exec.name)) {
            return { kind: 'deny', reason: 'short-drama Agent exposes formal writes through domain tools only' };
        }
        return next();
    });
    installScreenplayProjectScopeGuard(ctx);
}
