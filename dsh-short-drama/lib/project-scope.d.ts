import type { Session } from '@deepseek-ai/dsh-session';
export declare function assertProjectPath(session: Session, projectRoot: string, candidate: string, label?: string): Promise<string>;
export declare function assertProjectMutationPath(session: Session, projectRoot: string, candidate: string, label?: string): Promise<string>;
export declare function pathArguments(name: string, args: unknown): string[];
export declare function isProjectFileTool(name: string): boolean;
