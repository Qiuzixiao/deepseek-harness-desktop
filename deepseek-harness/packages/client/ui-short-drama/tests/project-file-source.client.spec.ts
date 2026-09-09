import { afterEach, expect, it, vi } from 'vitest'
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { registerProjectFileSource } from '../src/client/project-file-source.ts'

afterEach(() => vi.unstubAllGlobals())

it('keeps a short file label while preserving the complete path and model context', async () => {
  let source!: InputTriggerSource
  registerProjectFileSource({
    get(name: string) {
      if (name === 'sessions') return { list: { getSnapshot: () => ({ byId: { s1: { cwd: '/project' } } }) } }
      if (name === 'inputTriggers') return { registerSource(value: InputTriggerSource) { source = value; return () => {} } }
      throw new Error(name)
    },
  } as never)
  const picked = source.onPick({
    candidate: { name: '目录/很长的文件名.md' },
    session: { sessionId: 's1' },
  } as Parameters<InputTriggerSource['onPick']>[0])
  expect(picked).toMatchObject({
    insert: { label: '文件', title: '/project/目录/很长的文件名.md', ref: '/project/目录/很长的文件名.md' },
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ content: '文件正文' }) })))
  expect(await source.codec!.serialize('/project/目录/A&B.md', new AbortController().signal))
    .toBe('<file_reference path="/project/目录/A&amp;B.md">\n文件正文\n</file_reference>')
})
