import { type RefObject } from 'react';
import type { ClientContext, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-runtime/client';
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
interface StoryStudioDescription {
    projectRoot: string;
}
interface CreatedProject extends StoryStudioDescription {
    name: string;
    path: string;
}
interface ProjectService {
    describe(): Promise<StoryStudioDescription>;
    create(name: string): Promise<CreatedProject>;
    register(project: CreatedProject): Promise<WorkspaceView>;
}
type StoryStudioClientContext = ClientContext & {
    connection: ConnectionHandle;
};
interface EmptyWorkspaceOwnerProps {
    open: boolean;
    anchorRef?: RefObject<HTMLElement>;
    selectedId?: WorkspaceId;
    onPick: (workspaceId: WorkspaceId) => void;
    onClose: () => void;
}
interface SidebarFooterActionOwnerProps {
    wide: boolean;
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'conversation.hero.workspace': {
            kind: 'single';
            scope: 'root';
            owner: EmptyWorkspaceOwnerProps;
        };
        'sidebar.footer.action': {
            kind: 'list';
            scope: 'root';
            owner: SidebarFooterActionOwnerProps;
        };
    }
}
declare global {
    interface Window {
        __DSH_WORKBENCH__?: {
            mount(params: Record<string, unknown>): void;
        };
    }
}
export declare const name = "dsh-product-story-studio";
export declare const inject: string[];
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'conversation.session': {
            kind: 'single';
            scope: 'session';
            owner: ConversationSessionOwnerProps;
        };
    }
}
interface ConversationSessionOwnerProps {
    sessionId: string;
}
/**
 * Own the `conversation.session` slot only while the active session's `cwd`
 * falls under the Story Studio deployment project root. `single` slots are
 * exclusive at registration time and do not fall back on a `null` render
 * (see `ui-slots`'s `register()`), so ownership must be created and disposed
 * dynamically as the active session changes, handing the slot back to
 * `ui-conversation`'s default implementation whenever no Story Studio
 * session is active.
 */
export declare function bindStoryStudioSessionSlot(ctx: StoryStudioClientContext, service: ProjectService): void;
export declare function apply(ctx: StoryStudioClientContext): void;
export {};
