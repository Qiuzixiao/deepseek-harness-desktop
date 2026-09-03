import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderDocumentPage } from '../src/render.ts'

test('read_document renders every line in the requested page', () => {
  const longLine = `${'x'.repeat(120)} tail`
  const output = renderDocumentPage('notes.txt', {
    offset: 4,
    lines: [
      { number: 4, text: 'fourth line' },
      { number: 5, text: 'fifth line' },
      { number: 6, text: longLine }
    ],
    totalLines: 10
  })

  assert.match(output, /4: fourth line/)
  assert.match(output, /5: fifth line/)
  assert.match(output, new RegExp(`6: ${longLine}`))
})
