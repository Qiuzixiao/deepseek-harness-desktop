import type { ReactNode } from 'react'
import { SessionLogDownloadDialog, type SessionLogDownloadDialogProps } from './Dialog.tsx'

/**
 * Render the Session-scoped export result dialog.
 *
 * Session export is initiated through the `/export` command. Keeping only the
 * result dialog here avoids a duplicate trigger in the Session Header while
 * preserving progress and failure feedback for command-initiated downloads.
 *
 * @param props - Session runtime, download controller, and localized dialog copy.
 * @returns the Session-scoped dialog contribution.
 */
export function SessionLogDownloadHeaderAction(props: SessionLogDownloadDialogProps): ReactNode {
  return <SessionLogDownloadDialog {...props} />
}
