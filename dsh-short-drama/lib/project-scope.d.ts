import type { Session } from '@deepseek-ai/dsh-session';
export declare function assertProjectPath(session: Session, projectRoot: string, candidate: string, label?: string): Promise<string>;
export declare function assertProjectMutationPath(session: Session, projectRoot: string, candidate: string, label?: string): Promise<string>;
/** Keep new creative files below a category; existing root files remain editable. */
export declare function assertProjectFileDestination(projectRoot: string, absolute: string, allowExisting: boolean): Promise<void>;
export declare function pathArguments(name: string, args: unknown): string[];
export declare function isProjectFileTool(name: string): boolean;
export declare function isProjectMutationTool(name: string): boolean;
