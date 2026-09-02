import { HarnessError } from '@deepseek-ai/dsh-llm'

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

export class ScreenplayError extends HarnessError {
  declare readonly code: ScreenplayErrorCode

  constructor(
    code: ScreenplayErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message, code)
    this.name = 'ScreenplayError'
  }
}

function preview(value: unknown): string {
  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch {
    serialized = String(value)
  }
  return serialized.length <= 800 ? serialized : `${serialized.slice(0, 800)}...`
}

function issueLocation(issue: Record<string, unknown>): string | undefined {
  for (const key of ['location', 'field', 'scene', 'path']) {
    if (issue[key] !== undefined) return String(issue[key])
  }
  return undefined
}

/** Keep Store errors structured while making their repair contract visible to the model at the tool boundary. */
export function screenplayToolError(error: unknown): unknown {
  if (!(error instanceof ScreenplayError)) return error
  const issues = Array.isArray(error.details.issues)
    ? error.details.issues.filter((issue): issue is Record<string, unknown> => issue !== null && typeof issue === 'object')
    : []
  if (issues.length === 0) return error

  const artifact = typeof error.details.artifact === 'string' ? error.details.artifact : 'screenplay-project'
  const lines = [error.message, `artifact: ${artifact}`]
  for (const [index, issue] of issues.slice(0, 5).entries()) {
    const location = issueLocation(issue)
    if (issues.length > 1) lines.push(`issue: ${String(index + 1)}`)
    if (location !== undefined) lines.push(`location: ${location}`)
    if (issue.expected !== undefined) lines.push(`expected: ${preview(issue.expected)}`)
    if (issue.actual !== undefined) lines.push(`actual: ${preview(issue.actual)}`)
    const explicitHint = typeof issue.repairHint === 'string'
      ? issue.repairHint
      : typeof error.details.repairHint === 'string' ? error.details.repairHint : undefined
    lines.push(`repairHint: ${explicitHint ?? `correct ${location ?? 'the artifact'} to match the expected value, then retry once`}`)
  }
  if (error.details.written === false) lines.push('formalFilesChanged: false')
  return new HarnessError(lines.join('\n'), error.code, { cause: error })
}
