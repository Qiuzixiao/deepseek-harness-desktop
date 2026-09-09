// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.ts'

vi.mock('../src/client/project-file-source.ts', () => ({
  registerProjectFileSource: vi.fn(() => () => {}),
}))

describe('Zenwit root registration', () => {
  it('serializes a selection as a file card while retaining captured context for the model', async () => {
    let serialize!: (ref: string) => Promise<string>
    const ctx = {
      get(name: string) {
        if (name === 'connection') return { api: {} }
        if (name === 'inputTriggers') return { registerSource(source: { codec: { serialize: typeof serialize } }) { serialize = source.codec.serialize; return () => {} } }
        throw new Error(name)
      },
      effect: (factory: () => unknown) => factory(),
      slots: { register: () => () => {} },
    }
    apply(ctx as never)
    const text = '文件：/project/提案.md\n范围：第 21-21 行\n选中内容：\n裁决：有条件通过。'
    const result = await serialize(JSON.stringify({ text, label: '注释', path: '/project/提案.md' }))
    expect(result).toBe(`<file_reference path="/project/提案.md" kind="annotation">\n${text}\n</file_reference>`)
    expect(await serialize(JSON.stringify({ text: '已有草稿选区' }))).toContain('path="选中文本"')
    await expect(serialize('{}')).rejects.toThrow('局部选区引用无效')
  })

  beforeEach(() => {
    window.history.replaceState({}, '', '/?dsh-desktop-mode=advanced')
  })

  it('declares every child slot rendered by ZenwitFrame in advanced mode', () => {
    let rootOptions: { children?: unknown } | undefined
    const ctx = {
      get(name: string) {
        if (name === 'connection') return { api: { agentPresets: { list: vi.fn() } } }
        if (name === 'inputTriggers') return { registerSource: vi.fn(() => () => {}) }
        throw new Error(`unexpected service ${name}`)
      },
      effect(factory: () => unknown) {
        return factory()
      },
      slots: {
        register(options: { children?: unknown }) {
          rootOptions = options
          return () => {}
        },
      },
    }

    apply(ctx as never)

    expect(rootOptions?.children).toEqual({
      sidebar: { kind: 'single', scope: 'root' },
      conversation: { kind: 'single', scope: 'session-maybe' },
    })
  })
})
