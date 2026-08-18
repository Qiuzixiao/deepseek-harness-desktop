import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Story Studio 的会话上下文
 * 包含剧本创作所需的上下文信息
 */
export interface StorySessionContext {
    /** 当前项目 ID */
    projectId: string;
    /** 项目名称 */
    projectName: string;
    /** 当前编辑的剧本文件 */
    currentFile?: string;
    /** 剧本内容（作为上下文） */
    scriptContent?: string;
    /** 人物信息 */
    characters?: Array<{
        name: string;
        description: string;
    }>;
}
/**
 * AI 响应的思考步骤
 */
export interface ThinkingStep {
    id: string;
    description: string;
    status: 'pending' | 'active' | 'complete';
}
/**
 * 使用 Story Studio 会话的 Hook
 * @param ctx - DSH Client Context
 * @param sessionContext - 剧本创作上下文
 */
export declare function useStorySession(ctx: ClientContext, sessionContext: StorySessionContext): {
    sessionId: string | null;
    isThinking: boolean;
    thinkingSteps: ThinkingStep[];
    lastResponse: string;
    sendMessage: (userMessage: string) => Promise<void>;
};
