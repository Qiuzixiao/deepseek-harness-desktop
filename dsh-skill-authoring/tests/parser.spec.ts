import { describe, expect, it } from 'vitest'
import { parseSkillSource } from '../src/parser.js'

describe('parseSkillSource', () => {
  it('parses markdown into content and structure', async () => {
    const parsed = await parseSkillSource('guide.md', new TextEncoder().encode('# Heading\n\nBody text.\n'))
    expect(parsed.format).toBe('markdown')
    expect(parsed.content).toContain('Heading')
    expect(parsed.structure.headings).toEqual([
      { level: 1, title: 'Heading', start: 0, end: 9 },
    ])
    expect(parsed.structure.paragraphs).toHaveLength(2)
  })

  it('parses plain text', async () => {
    const parsed = await parseSkillSource('notes.txt', new TextEncoder().encode('Only plain text.'))
    expect(parsed.format).toBe('text')
    expect(parsed.content).toBe('Only plain text.')
  })

  it('rejects empty files', async () => {
    await expect(parseSkillSource('notes.txt', new Uint8Array())).rejects.toThrow('不能为空')
  })

  it('rejects unsupported extensions', async () => {
    await expect(parseSkillSource('notes.json', new TextEncoder().encode('{}'))).rejects.toThrow('仅支持')
  })
})
