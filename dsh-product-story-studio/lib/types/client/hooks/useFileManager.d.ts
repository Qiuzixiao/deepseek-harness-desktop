import type { Context } from '@deepseek-ai/cordis';
import type { FileTreeNode } from '../services/ProjectFileService.js';
type ClientContext = Context;
/**
 * 打开的文件标签页
 */
export interface FileTab {
    id: string;
    path: string;
    name: string;
    content: string;
    isDirty: boolean;
    version?: string | undefined;
}
/**
 * 文件管理状态
 */
export interface FileManagerState {
    fileTree: FileTreeNode[];
    openFiles: FileTab[];
    activeFileId: string | null;
    saveState: 'saved' | 'saving' | 'unsaved';
}
/**
 * 文件管理 Hook
 */
export declare function useFileManager(ctx: ClientContext | null, projectRoot: string): {
    fileTree: FileTreeNode[];
    openFiles: FileTab[];
    activeFile: FileTab | null;
    activeFileId: string | null;
    saveState: "saved" | "saving" | "unsaved";
    openFile: (filePath: string) => Promise<void>;
    closeFile: (fileId: string) => void;
    updateFileContent: (fileId: string, content: string) => void;
    saveFile: (fileId: string) => Promise<void>;
    saveAllFiles: () => Promise<void>;
    setActiveFileId: import("react").Dispatch<import("react").SetStateAction<string | null>>;
    refreshFileTree: () => Promise<void>;
    createNewFile: (fileName: string, parentPath?: string) => Promise<boolean>;
    createNewFolder: (folderName: string, parentPath?: string) => Promise<boolean>;
    deleteFile: (filePath: string) => Promise<boolean>;
    deleteFolder: (folderPath: string) => Promise<boolean>;
    renameItem: (oldPath: string, newName: string) => Promise<boolean>;
};
export {};
