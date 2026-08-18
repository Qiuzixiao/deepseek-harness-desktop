/** One directory entry as returned by the `listDir` op. */
export interface WorkbenchEntry {
    name: string;
    type: 'file' | 'directory';
    size?: number;
}
/** Successful `describe` result: the resolved workspace root for a session. */
export interface WorkbenchDescribe {
    root: string;
    rootName: string;
    sessionId: string | null;
}
/** Successful `readFile` result: text content plus its optimistic-concurrency version. */
export interface WorkbenchFileContent {
    content: string;
    version: string;
}
/** Successful `writeFile`/`createFile` result: the operation performed and resulting version. */
export interface WorkbenchWriteResult {
    operation: string;
    version: string;
}
/** Successful `createDir` result: the created directory's path. */
export interface WorkbenchCreateDirResult {
    path: string;
}
/** Client for the Story Studio workbench's file operations, scoped to one session. */
export interface WorkbenchClient {
    describe(): Promise<WorkbenchDescribe>;
    listDir(path?: string): Promise<WorkbenchEntry[]>;
    readFile(path: string): Promise<WorkbenchFileContent>;
    writeFile(path: string, content: string, expected?: string): Promise<WorkbenchWriteResult>;
    createFile(path: string): Promise<WorkbenchWriteResult>;
    createDir(parent: string, name: string): Promise<WorkbenchCreateDirResult>;
}
/**
 * Build a workbench client bound to one session's sandbox root.
 * @param sessionId - the active DSH session; the Host resolves this
 * session's `header.cwd` as the fence root for every operation (see
 * `workbench-host.ts`'s `policyOf`/`rootFor`).
 */
export declare function createWorkbenchClient(sessionId: string): WorkbenchClient;
