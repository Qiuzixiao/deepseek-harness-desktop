import type { WorkbenchClient, WorkbenchEntry } from '../wb-client.js';
/** Props passed to the root StoryStudioWorkbench component. */
export interface StoryStudioWorkbenchProps {
    sessionId: string;
}
/** Internal workbench state shared across panels via React context. */
export interface WorkbenchState {
    client: WorkbenchClient;
    root: string;
    rootName: string;
    entries: WorkbenchEntry[];
    selectedPath: string | null;
    openFiles: OpenFile[];
    activeFileIndex: number | null;
}
/** One open file tab in the editor area. */
export interface OpenFile {
    path: string;
    name: string;
    content: string;
    version: string;
    dirty: boolean;
}
/** Actions dispatched to update workbench state. */
export type WorkbenchAction = {
    type: 'SET_ROOT';
    root: string;
    rootName: string;
} | {
    type: 'SET_ENTRIES';
    entries: WorkbenchEntry[];
} | {
    type: 'SELECT_PATH';
    path: string | null;
} | {
    type: 'OPEN_FILE';
    path: string;
    name: string;
    content: string;
    version: string;
} | {
    type: 'CLOSE_FILE';
    index: number;
} | {
    type: 'SET_ACTIVE_FILE';
    index: number;
} | {
    type: 'UPDATE_FILE_CONTENT';
    index: number;
    content: string;
    dirty: boolean;
} | {
    type: 'MARK_FILE_SAVED';
    index: number;
    version: string;
};
