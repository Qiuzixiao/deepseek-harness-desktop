/**
 * 项目文件 RPC 服务
 * 在 Host 层提供文件操作接口，供 Client 层调用
 */
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
interface RpcSuccess<T> {
    ok: true;
    value: T;
}
interface RpcFailure {
    ok: false;
    error: {
        code: 'internal';
        message: string;
        details: Record<string, never>;
    };
}
type ProjectFileRpcHandler = (endpoint: string, payload: unknown) => Promise<RpcSuccess<unknown> | RpcFailure>;
/**
 * 创建项目文件 RPC 处理器
 */
export declare function createProjectFileRpcHandler(ctx: Context, projectRoot: string): ProjectFileRpcHandler;
export {};
