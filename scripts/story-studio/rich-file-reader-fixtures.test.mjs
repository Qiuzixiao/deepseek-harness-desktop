import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createJpegScanPdf,
  createUnicodeTextPdf,
  jpegDimensions,
  normalizedOcrText,
} from './rich-file-reader-fixtures.mjs'

const ONE_PIXEL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=',
  'base64',
)

test('builds a two-page PDF with explicit Unicode mappings', () => {
  const pdf = createUnicodeTextPdf(['第一集 父亲失业', '第二集 儿子重生'])
  assert.equal(pdf.subarray(0, 8).toString('ascii'), '%PDF-1.4')
  assert.match(pdf.toString('ascii'), /\/Count 2/u)
  assert.match(pdf.toString('ascii'), /<7b2c>/u)
  assert.match(pdf.toString('ascii'), /startxref/u)
})

test('wraps a JPEG in an image-only PDF', () => {
  assert.deepEqual(jpegDimensions(ONE_PIXEL_JPEG), { width: 1, height: 1 })
  const pdf = createJpegScanPdf(ONE_PIXEL_JPEG)
  assert.match(pdf.toString('latin1'), /\/Subtype \/Image/u)
  assert.match(pdf.toString('latin1'), /\/Filter \/DCTDecode/u)
})

test('normalizes spacing and OCR punctuation without discarding Han text', () => {
  assert.equal(normalizedOcrText('第 一 集 ”父亲 听见 儿子 心声'), '第一集父亲听见儿子心声')
})
