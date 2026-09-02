// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import { ProjectLibraryPage } from '../src/client/ProjectLibraryPage.tsx'

const projects: ProjectSummary[] = Array.from({ length: 6 }, (_, index) => ({
  name: `项目 ${index + 1}`,
  path: `/ShortDrama/project-${index + 1}`,
  updatedAt: index + 1,
  ...(index === 0 ? { agentId: 'short-drama' } : {}),
  tags: index === 0 ? ['小说', '悬疑'] : [],
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ProjectLibraryPage', () => {
  it('shows every project returned by the library scan', async () => {
    render(<ProjectLibraryPage list={vi.fn(async () => projects)} openProject={vi.fn()} deleteProject={vi.fn()} onBack={vi.fn()} agentNames={{ 'short-drama': '短剧创作' }} />)
    expect(await screen.findAllByText(/项目 \d/)).toHaveLength(6)
    expect(screen.getByText('短剧创作')).toBeTruthy()
    expect(screen.getAllByLabelText('项目标签：小说、悬疑')).toHaveLength(1)
  })

  it('deletes a confirmed project and removes it from the visible list', async () => {
    const deleteProject = vi.fn(async () => {})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProjectLibraryPage list={vi.fn(async () => projects)} openProject={vi.fn()} deleteProject={deleteProject} onBack={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: '删除项目：项目 1' }))
    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('/ShortDrama/project-1'))
    expect(screen.queryByText('项目 1')).toBeNull()
    expect(screen.getByText('5 个项目')).toBeTruthy()
  })

  it('keeps the project when deletion is cancelled', async () => {
    const deleteProject = vi.fn(async () => {})
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ProjectLibraryPage list={vi.fn(async () => projects)} openProject={vi.fn()} deleteProject={deleteProject} onBack={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: '删除项目：项目 1' }))
    expect(deleteProject).not.toHaveBeenCalled()
    expect(screen.getByText('项目 1')).toBeTruthy()
  })
})
