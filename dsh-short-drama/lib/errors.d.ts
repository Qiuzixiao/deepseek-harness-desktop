export type ScreenplayErrorCode = 'INVALID_WORKSPACE' | 'INVALID_INPUT' | 'NOT_INITIALIZED' | 'REVISION_CONFLICT' | 'OPERATION_CONFLICT' | 'INVALID_STATE' | 'VALIDATION_FAILED' | 'USER_CONFIRMATION_REQUIRED' | 'CHANGE_NOT_FOUND' | 'VERSION_NOT_FOUND';
export declare class ScreenplayError extends Error {
    readonly code: ScreenplayErrorCode;
    readonly details: Record<string, unknown>;
    constructor(code: ScreenplayErrorCode, message: string, details?: Record<string, unknown>);
}
