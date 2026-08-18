import React from 'react';
import type { StoryStudioWorkbenchProps, WorkbenchState, WorkbenchAction } from './types.js';
export declare function useWorkbench(): {
    state: WorkbenchState;
    dispatch: React.Dispatch<WorkbenchAction>;
};
/**
 * Root workbench component for Story Studio projects. Renders a three-panel
 * layout: file tree (left), editor tabs (center), and preview/collab (right).
 * Mounts only when the active session's cwd falls under the Story Studio
 * project root (see bindStoryStudioSessionSlot in ../index.tsx).
 */
export declare function StoryStudioWorkbench({ sessionId }: StoryStudioWorkbenchProps): React.JSX.Element;
