/**
 * The file-upload plugin owns server-side upload and document tools.
 * Attachment intake and presentation belong to ui-conversation's single
 * composer path, so this client face intentionally registers no button,
 * dock, drag overlay, clipboard listener, or private attachment store.
 */
export const inject: readonly string[] = []

export function apply(): void {}

declare const module: { exports: unknown } | undefined
if (typeof module !== 'undefined' && module !== null) {
  module.exports = { apply, inject }
}
