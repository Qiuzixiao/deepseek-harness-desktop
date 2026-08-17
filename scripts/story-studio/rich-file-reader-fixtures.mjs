const PDF_HEADER = Buffer.from('%PDF-1.4\n%StoryStudio\n', 'ascii')

function xml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function paragraph(text) {
  return `<w:p><w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`
}

export function createChineseDocxFixture({ zipSync, strToU8 }) {
  const scenes = Array.from({ length: 180 }, (_, index) => {
    const number = String(index + 1).padStart(3, '0')
    return paragraph(`第${number}场 乡下清晨：父亲听见儿子心声，决定抢先寻找县城商机。`)
  }).join('')
  const document = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    paragraph('《父子同心：第一季》'),
    paragraph('第一集 失业那天，我听见了儿子的心声'),
    '<w:tbl><w:tr>',
    `<w:tc>${paragraph('人物')}</w:tc><w:tc>${paragraph('关系')}</w:tc>`,
    '</w:tr><w:tr>',
    `<w:tc>${paragraph('周建国')}</w:tc><w:tc>${paragraph('父亲')}</w:tc>`,
    '</w:tr><w:tr>',
    `<w:tc>${paragraph('周小川')}</w:tc><w:tc>${paragraph('重生儿子')}</w:tc>`,
    '</w:tr></w:tbl>',
    scenes,
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    paragraph('第二幕 县城机会：父子第一次在同一条商路上交锋。'),
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>',
    '</w:body></w:document>',
  ].join('')
  const entries = {
    '[Content_Types].xml': strToU8([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
      '</Types>',
    ].join('')),
    '_rels/.rels': strToU8([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
      '</Relationships>',
    ].join('')),
    'word/document.xml': strToU8(document),
    'word/_rels/document.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'),
  }
  return Buffer.from(zipSync(entries, { level: 6 }))
}

function codeUnitHex(character) {
  const point = character.codePointAt(0)
  if (point <= 0xffff) return point.toString(16).padStart(4, '0')
  const adjusted = point - 0x10000
  const high = 0xd800 + (adjusted >> 10)
  const low = 0xdc00 + (adjusted & 0x3ff)
  return `${high.toString(16)}${low.toString(16)}`
}

function pdfStream(dictionary, bytes) {
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`, 'ascii'),
    bytes,
    Buffer.from('\nendstream', 'ascii'),
  ])
}

function assemblePdf(objects) {
  const chunks = [PDF_HEADER]
  const offsets = [0]
  let length = PDF_HEADER.length
  for (const [index, object] of objects.entries()) {
    offsets.push(length)
    const block = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, 'ascii'),
      Buffer.isBuffer(object) ? object : Buffer.from(object, 'ascii'),
      Buffer.from('\nendobj\n', 'ascii'),
    ])
    chunks.push(block)
    length += block.length
  }
  const xrefOffset = length
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join('')
  chunks.push(Buffer.from(xref, 'ascii'))
  return Buffer.concat(chunks)
}

export function createUnicodeTextPdf(pageTexts) {
  if (!Array.isArray(pageTexts) || pageTexts.length !== 2) throw new Error('the Story Studio text PDF fixture requires two pages')
  const characters = [...pageTexts.join('')]
  const codes = characters.map((_, index) => (index + 1).toString(16).padStart(4, '0'))
  let cursor = 0
  const pageStreams = pageTexts.map(text => {
    const count = [...text].length
    const encoded = codes.slice(cursor, cursor + count).join('')
    cursor += count
    return Buffer.from(`BT\n/F1 24 Tf\n72 700 Td\n<${encoded}> Tj\nET\n`, 'ascii')
  })
  const mappings = characters.map((character, index) => (
    `<${codes[index]}> <${codeUnitHex(character)}>`
  )).join('\n')
  const cmap = Buffer.from([
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /StoryStudio def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
    `${characters.length} beginbfchar`,
    mappings,
    'endbfchar',
    'endcmap',
    'CMapName currentdict /CMap defineresource pop',
    'end',
    'end',
    '',
  ].join('\n'), 'ascii')
  return assemblePdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    pdfStream('', pageStreams[0]),
    pdfStream('', pageStreams[1]),
    '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /Identity-H /DescendantFonts [8 0 R] /ToUnicode 9 0 R >>',
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /CIDToGIDMap /Identity >>',
    pdfStream('', cmap),
  ])
}

export function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('scan fixture is not a JPEG')
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('invalid JPEG marker')
    const marker = bytes[offset + 1]
    offset += 2
    if (marker === 0xd8 || marker === 0xd9) continue
    const length = bytes.readUInt16BE(offset)
    if (length < 2 || offset + length > bytes.length) throw new Error('invalid JPEG segment')
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) }
    }
    offset += length
  }
  throw new Error('JPEG has no supported frame header')
}

export function createJpegScanPdf(jpeg, dimensions = jpegDimensions(jpeg)) {
  const content = Buffer.from('q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n', 'ascii')
  return assemblePdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
    pdfStream('', content),
    pdfStream(`/Type /XObject /Subtype /Image /Width ${dimensions.width} /Height ${dimensions.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, jpeg),
  ])
}

export function normalizedOcrText(value) {
  return value.replace(/[^\p{Script=Han}a-z0-9]/giu, '')
}
