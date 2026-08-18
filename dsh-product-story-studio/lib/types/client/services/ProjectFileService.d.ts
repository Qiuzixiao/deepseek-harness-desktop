import type { Context } from '@deepseek-ai/cordis';
/**
 * 文件树节点
 */
export interface FileTreeNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileTreeNode[];
}
/**
 * 文件内容
 */
export interface FileContent {
    path: string;
    content: string;
    version?: string;
}
/**
 * 项目文件服务
 * Client 层通过 RPC 调用 Host 层的文件操作
 */
export declare class ProjectFileService {
    private ctx;
    private rpcChannel;
    constructor(ctx: Context);
    /**
     * 调用 RPC 方法
     */
    private callRpc;
    /**
     * 获取文件树
     */
    getFileTree(): Promise<FileTreeNode[]>;
    /**
     * 读取文件内容
     */
    readFile(filePath: string): Promise<FileContent | null>;
    /**
     * 写入文件内容
     */
    writeFile(filePath: string, content: string): Promise<boolean>;
    /**
     * 创建新文件
     */
    createFile(filePath: string, content?: string): Promise<boolean>;
    /**
     * 创建文件夹
     */
    createFolder(folderPath: string): Promise<boolean>;
    /**
     * 删除文件
     */
    deleteFile(filePath: string): Promise<boolean>;
    /**
     * 删除文件夹
     */
    deleteFolder(folderPath: string): Promise<boolean>;
    /**
     * 重命名文件或文件夹
     */
    renameFile(oldPath: string, newPath: string): Promise<boolean>;
    /**
     * 检查文件是否存在
     */
    fileExists(filePath: string): Promise<boolean>;
}
