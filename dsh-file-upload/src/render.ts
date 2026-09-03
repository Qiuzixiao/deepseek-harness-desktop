export interface DocumentPage {
  offset: number
  lines: Array<{ number: number; text: string }>
  totalLines: number
}

/** Render the complete requested page into the model-facing tool result. */
export function renderDocumentPage(path: string, value: DocumentPage): string {
  const content = value.lines
    .map((line) => `  ${line.number}: ${line.text}`)
    .join('\n')
  return [
    `### document ${path}`,
    `offset ${value.offset}, ${value.lines.length}/${value.totalLines} lines:`,
    content
  ].join('\n')
}
