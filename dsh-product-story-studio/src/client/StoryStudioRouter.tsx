import { useState, useEffect } from 'react'
import type { Context } from 'cordis'
import { ProjectsPage } from './ProjectsPage.js'
import { StoryStudioApp } from './StoryStudioApp.js'
import { mountWorkbench, unmountWorkbench } from './wb-client.js'

export function StoryStudioRouter() {
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null)
  const [ctx, setCtx] = useState<Context | null>(null)

  // Get client context
  useEffect(() => {
    const clientCtx = (window as any).__dshClientContext as Context | undefined
    if (clientCtx) {
      setCtx(clientCtx)
    }
  }, [])

  // Load last project from localStorage
  useEffect(() => {
    const lastProject = localStorage.getItem('story-studio:last-project')
    console.log('[StoryStudioRouter] Last project from localStorage:', lastProject)
    if (lastProject) {
      setCurrentProjectPath(lastProject)
    }
  }, [])

  // Mount/unmount workbench based on whether we're in a project
  useEffect(() => {
    if (!ctx) return

    if (currentProjectPath) {
      console.log('[StoryStudioRouter] Mounting workbench for project:', currentProjectPath)
      mountWorkbench(ctx)
    } else {
      console.log('[StoryStudioRouter] Unmounting workbench (on projects page)')
      unmountWorkbench()
    }
  }, [ctx, currentProjectPath])

  const handleSelectProject = (path: string) => {
    console.log('[StoryStudioRouter] Selecting project:', path)
    setCurrentProjectPath(path)
    localStorage.setItem('story-studio:last-project', path)
  }

  const handleCreateProject = (name: string) => {
    console.log('[StoryStudioRouter] Creating project:', name)
    const projectPath = `/Users/qiuzixiao/StoryStudio/${name}`
    setCurrentProjectPath(projectPath)
    localStorage.setItem('story-studio:last-project', projectPath)
  }

  const handleBackToProjects = () => {
    console.log('[StoryStudioRouter] Returning to projects page')
    setCurrentProjectPath(null)
    localStorage.removeItem('story-studio:last-project')
  }

  if (!currentProjectPath) {
    console.log('[StoryStudioRouter] Rendering ProjectsPage')
    return <ProjectsPage onSelectProject={handleSelectProject} onCreateProject={handleCreateProject} />
  }

  console.log('[StoryStudioRouter] Rendering StoryStudioApp with path:', currentProjectPath)
  return <StoryStudioApp projectPath={currentProjectPath} onBackToProjects={handleBackToProjects} />
}
