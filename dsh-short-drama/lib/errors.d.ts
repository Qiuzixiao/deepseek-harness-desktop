import { HarnessError } from '@deepseek-ai/dsh-llm';
export type ScreenplayErrorCode = 'INVALID_WORKSPACE' | 'INVALID_INPUT' | 'NOT_INITIALIZED' | 'REVISION_CONFLICT' | 'OPERATION_CONFLICT' | 'INVALID_STATE' | 'VALIDATION_FAILED' | 'USER_CONFIRMATION_REQUIRED' | 'CHANGE_NOT_FOUND' | 'VERSION_NOT_FOUND';
export declare class ScreenplayError extends HarnessError {
    readonly details: Record<string, unknown>;
    readonly code: ScreenplayErrorCode;
    constructor(code: ScreenplayErrorCode, message: string, details?: Record<string, unknown>);
}
/** Keep Store errors structured while making their repair contract visible to the model at the tool boundary. */
export declare function screenplayToolError(error: unknown): unknown;
