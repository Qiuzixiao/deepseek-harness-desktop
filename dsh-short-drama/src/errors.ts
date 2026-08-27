export type ScreenplayErrorCode =
  | 'INVALID_WORKSPACE'
  | 'INVALID_INPUT'
  | 'NOT_INITIALIZED'
  | 'REVISION_CONFLICT'
  | 'OPERATION_CONFLICT'
  | 'INVALID_STATE'
  | 'VALIDATION_FAILED'
  | 'USER_CONFIRMATION_REQUIRED'
  | 'CHANGE_NOT_FOUND'
  | 'VERSION_NOT_FOUND'

export class ScreenplayError extends Error {
  constructor(
    readonly code: ScreenplayErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ScreenplayError'
  }
}
