import { type RefObject } from 'react';
import type { ClientContext, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client';
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
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
export declare function apply(ctx: StoryStudioClientContext): void;
export {};
