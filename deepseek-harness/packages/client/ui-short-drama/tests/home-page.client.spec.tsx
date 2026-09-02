// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import { HomePage } from '../src/client/HomePage.tsx'

const created: ProjectSummary = {
  name: '新项目', path: '/Projects/new-project', updatedAt: 1, agentId: 'short-drama', tags: ['小说'],
}

const projects: ProjectSummary[] = [
  { name: '较早项目', path: '/Projects/older', updatedAt: 1, tags: ['小说'] },
  { name: 'Agent 项目', path: '/Projects/agent', agentId: 'short-drama', updatedAt: 3, tags: ['小说', '悬疑'] },
  { name: '最新项目', path: '/Projects/latest', updatedAt: 5, tags: [] },
]

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mount(overrides: Partial<ComponentProps<typeof HomePage>> = {}) {
  const props: ComponentProps<typeof HomePage> = {
    list: vi.fn(async () => projects),
    create: vi.fn(async () => created),
    updateProjectTags: vi.fn(async (path, tags) => ({ ...projects.find(project => project.path === path)!, tags })),
    deleteProject: vi.fn(async () => {}),
    openProject: vi.fn(async () => {}),
    openLibrary: vi.fn(),
    agentNames: { 'short-drama': '短剧创作' },
    ...overrides,
  }
  return { ...render(<HomePage {...props} />), props }
}

describe('HomePage project organization', () => {
  it('creates a tagged project and opens it in the workspace', async () => {
    const create = vi.fn(async () => created)
    const openProject = vi.fn(async () => {})
    mount({ list: vi.fn(async () => []), create, openProject })
    fireEvent.click(screen.getByRole('button', { name: /新建项目/ }))
    fireEvent.change(screen.getByPlaceholderText('项目名称'), { target: { value: '新项目' } })
    fireEvent.change(screen.getByRole('textbox', { name: '输入新标签' }), { target: { value: '小说' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '输入新标签' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith('新项目', ['小说']))
    await waitFor(() => expect(openProject).toHaveBeenCalledWith(created.path))
  })

  it('builds tag filters with counts and keeps untagged projects under 未分类', async () => {
    mount()
    expect(await screen.findByRole('heading', { name: '最近项目' })).toBeTruthy()
    expect(screen.queryByText('已绑定 Agent')).toBeNull()
    expect(screen.queryByText('未绑定 Agent')).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: /小说 2/ }))
    expect(screen.getByRole('button', { name: /较早项目/ })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Agent 项目/ }).filter(button => !button.getAttribute('aria-label')?.startsWith('删除项目')).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('button', { name: /最新项目/ }).filter(button => !button.getAttribute('aria-label')?.startsWith('删除项目')).length).toBe(0)
    fireEvent.click(screen.getByRole('option', { name: /未分类 1/ }))
    expect(screen.getAllByRole('button', { name: /最新项目/ }).filter(button => !button.getAttribute('aria-label')?.startsWith('删除项目')).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('button', { name: /Agent 项目/ }).filter(button => !button.getAttribute('aria-label')?.startsWith('删除项目')).length).toBe(0)
  })

  it('searches tag text and renders the Agent preset display name', async () => {
    mount()
    await waitFor(() => expect(screen.getAllByRole('button', { name: /最新项目/ }).length).toBeGreaterThan(0))
    fireEvent.change(screen.getByRole('textbox', { name: '搜索项目' }), { target: { value: '悬疑' } })
    expect(screen.getAllByRole('button', { name: /Agent 项目/ }).filter(button => !button.getAttribute('aria-label')?.startsWith('删除项目')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('短剧创作').length).toBeGreaterThan(0)
    expect(screen.queryByText('short-drama')).toBeNull()
    expect(screen.queryByText('最新项目')).toBeNull()
  })

  it('falls back to the Agent id when its display name is unavailable', async () => {
    mount({ agentNames: {} })
    expect(await screen.findByText('short-drama')).toBeTruthy()
  })

  it('adds and removes tags from the selected project detail', async () => {
    const updateProjectTags = vi.fn(async (_path: string, tags: string[]) => ({ ...projects[1]!, tags }))
    mount({ updateProjectTags })
    fireEvent.click((await screen.findByText('Agent 项目')).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    fireEvent.click(screen.getByRole('button', { name: '移除标签：小说' }))
    fireEvent.change(screen.getByRole('textbox', { name: '输入新标签' }), { target: { value: '连载中' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '输入新标签' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(updateProjectTags).toHaveBeenCalledWith('/Projects/agent', ['悬疑', '连载中']))
    expect(await screen.findAllByLabelText('项目标签：悬疑、连载中')).toHaveLength(1)
  })

  it('keeps the tag editor open when saving fails', async () => {
    mount({ updateProjectTags: vi.fn(async () => { throw new Error('offline') }) })
    fireEvent.click((await screen.findByText('Agent 项目')).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    fireEvent.click(screen.getByRole('button', { name: '移除标签：小说' }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect((await screen.findByRole('alert')).textContent).toContain('保存项目标签失败')
    expect(screen.getByRole('textbox', { name: '输入新标签' })).toBeTruthy()
  })

  it('selects the newest project and opens it from the detail panel', async () => {
    const openProject = vi.fn(async () => {})
    mount({ openProject })
    await screen.findByRole('heading', { name: '最新项目' })
    fireEvent.click(screen.getByRole('button', { name: '打开工作台' }))
    await waitFor(() => expect(openProject).toHaveBeenCalledWith('/Projects/latest'))
  })

  it('deletes the selected project after confirmation', async () => {
    const deleteProject = vi.fn(async () => {})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mount({ deleteProject })
    await screen.findByRole('heading', { name: '最新项目' })
    fireEvent.click(screen.getByRole('button', { name: '删除项目：最新项目' }))
    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('/Projects/latest'))
    expect(screen.queryByRole('heading', { name: '最新项目' })).toBeNull()
  })

  it('keeps the inspiration entry disabled', async () => {
    mount({ list: vi.fn(async () => []) })
    const inspiration = await screen.findByRole('button', { name: /灵感库/ })
    expect(inspiration).toHaveProperty('disabled', true)
    expect(inspiration.getAttribute('aria-disabled')).toBe('true')
  })

  it('opens the shared settings owner from the top navigation', async () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent')
    mount({ list: vi.fn(async () => []) })
    fireEvent.click(await screen.findByRole('button', { name: '设置' }))
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dsh:settings-open' }))
  })
})
