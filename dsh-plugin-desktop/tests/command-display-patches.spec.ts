import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const commandsPatch = readFileSync(new URL('../../patches/dsh-client-ui-commands@0.1.0-rc.7.patch', import.meta.url), 'utf8')
const inputTriggerPatch = readFileSync(new URL('../../patches/dsh-client-ui-input-trigger@0.1.0-rc.7.patch', import.meta.url), 'utf8')

describe('desktop command display patches', () => {
  it('adds a display-only label while retaining the command name', () => {
    expect(commandsPatch).toContain('name: c.name,')
    expect(commandsPatch).toContain('displayName: display.resolve(c.name, locale).label')
    expect(commandsPatch).toContain('description: display?.resolve(c.name, locale)?.description ?? c.description')
    expect(commandsPatch).not.toContain('name: display.resolve(c.name, locale).label')
  })

  it('renders displayName without changing the pick payload', () => {
    expect(inputTriggerPatch).toContain('children: item.displayName ?? item.name')
    expect(inputTriggerPatch).toContain('readonly displayName?: string;')
    expect(inputTriggerPatch).not.toContain('candidate: { name: displayName }')
  })
})
