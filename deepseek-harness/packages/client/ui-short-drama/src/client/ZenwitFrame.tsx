/**
 * Zenwit product frame: the root-slot occupant replacing AppFrame.
 * It keeps the native DSH settings owner mounted without adding a second
 * product bar. Pure component — everything arrives through framework standard
 * props plus the injected project-library faces. The current surface is renderer-scoped:
 * a reload keeps the page the user was viewing, while a new app process starts
 * at the project library even if the DSH runtime restores a session.
 */
import { useEffect, useState } from 'react'
import type { GlobalStandardProps, PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import { HomePage } from './HomePage.tsx'
import { ProjectLibraryPage } from './ProjectLibraryPage.tsx'
import { Workspace } from './Workspace.tsx'
import css from './zenwit.module.css'

const SURFACE_STORAGE_KEY = 'zenwit.surface'

type Surface = 'home' | 'library' | 'workspace'

function readSurface(): Surface {
  try {
    const stored = window.sessionStorage.getItem(SURFACE_STORAGE_KEY)
    return stored === 'workspace' || stored === 'library' ? stored : 'home'
  } catch {
    // Storage can be unavailable in privacy-restricted renderer contexts. A
    // safe default is the project library, not an implicitly opened session.
    return 'home'
  }
}

function writeSurface(surface: Surface): void {
  try {
    window.sessionStorage.setItem(SURFACE_STORAGE_KEY, surface)
  } catch {
    // Storage can be unavailable in privacy-restricted renderer contexts.
  }
}

/** Full composed props: global standard kit + injected project-library faces. */
export type ZenwitFrameProps = GlobalStandardProps
  & PropsRenderSlots<'conversation' | 'sidebar'>
  & {
    list: () => Promise<ProjectSummary[]>
    create: (name: string, tags: string[]) => Promise<ProjectSummary>
    updateProjectTags: (projectPath: string, tags: string[]) => Promise<ProjectSummary>
    listAgentNames: () => Promise<Record<string, string>>
    deleteProject: (projectPath: string) => Promise<void>
    openProject: (projectPath: string) => Promise<void>
    closeProject: () => Promise<void>
    openSession: (id: string) => void
    startSession: (workspaceId: string) => void
    addSelectionToConversation: (target: 'current' | 'new', context: string) => Promise<void>
  }

/** Root-slot frame (see module doc). */
export function ZenwitFrame({
  useSessions,
  useWorkspaces,
  renderSlot,
  list,
  create,
  updateProjectTags,
  listAgentNames,
  deleteProject,
  openProject,
  closeProject,
  openSession,
  startSession,
  addSelectionToConversation,
}: ZenwitFrameProps) {
  const sessionsState = useSessions(s => s)
  const current = sessionsState.current
  const projectPath = current === undefined ? undefined : sessionsState.byId[current]?.cwd
  const [surface, setSurface] = useState<Surface>(readSurface)
  const [agentNames, setAgentNames] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    void listAgentNames().then(names => { if (!cancelled) setAgentNames(names) })
    return () => { cancelled = true }
  }, [listAgentNames])

  const handleOpen = async (path: string): Promise<void> => {
    await openProject(path)
    writeSurface('workspace')
    setSurface('workspace')
  }

  const handleHome = (): void => {
    writeSurface('home')
    setSurface('home')
  }

  const handleLibrary = (): void => {
    writeSurface('library')
    setSurface('library')
  }

  const handleClose = async (): Promise<void> => {
    await closeProject()
    writeSurface('home')
    setSurface('home')
  }

  const content = surface === 'home'
    ? <HomePage list={list} create={create} updateProjectTags={updateProjectTags} deleteProject={deleteProject} openProject={handleOpen} openLibrary={handleLibrary} agentNames={agentNames} />
    : surface === 'library'
      ? <ProjectLibraryPage list={list} openProject={handleOpen} deleteProject={deleteProject} onBack={handleHome} agentNames={agentNames} />
    : sessionsState.phase === 'pending'
      ? (
          <main className={css.restoreSurface} aria-live="polite">
            <span className={css.restoreIndicator} aria-hidden="true" />
            <span>正在恢复创作现场</span>
          </main>
        )
      : projectPath !== undefined && projectPath !== ''
        ? (
            <Workspace
              projectPath={projectPath}
              closeProject={handleClose}
              renderSlot={renderSlot}
              useSessions={useSessions}
              useWorkspaces={useWorkspaces}
              openSession={openSession}
              startSession={startSession}
              addSelectionToConversation={addSelectionToConversation}
            />
          )
        : <HomePage list={list} create={create} updateProjectTags={updateProjectTags} deleteProject={deleteProject} openProject={handleOpen} openLibrary={handleLibrary} agentNames={agentNames} />

  return (
    <div className={css.frame} data-zenwit-frame="true">
      {content}
      {surface !== 'workspace' && (
        renderSlot('sidebar', { collapsed: true, width: 0, settingsOnly: true, settingsOnlyInline: true })
      )}
    </div>
  )
}
