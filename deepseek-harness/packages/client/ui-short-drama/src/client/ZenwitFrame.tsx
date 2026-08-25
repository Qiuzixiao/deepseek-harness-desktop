/**
 * Zenwit product frame: the root-slot occupant replacing AppFrame.
 * A persistent top bar carries the brand plus the theme toggle and settings
 * surface (light/dark/system) on every surface, so preference controls are
 * never hidden behind a shadowed AppFrame. Pure component — everything arrives
 * through framework standard props plus the injected project-library + theme
 * faces. The home/workspace switch is Zenwit's own state, but it restores a
 * restored DSH session's workspace on a reload instead of dropping to home.
 */
import { useEffect, useState } from 'react'
import type { GlobalStandardProps, PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import { HomePage } from './HomePage.tsx'
import { Workspace } from './Workspace.tsx'
import css from './zenwit.module.css'

/** Theme face: read the resolved light/dark, switch, and subscribe to changes. */
interface ThemeFace {
  current: () => string
  set: (id: string) => void
  subscribe: (cb: (id: string) => void) => () => void
}

/** Full composed props: global standard kit + injected project-library + theme faces. */
export type ZenwitFrameProps = GlobalStandardProps
  & PropsRenderSlots<'conversation'>
  & {
    list: () => Promise<ProjectSummary[]>
    create: (name: string) => Promise<ProjectSummary>
    openProject: (projectPath: string) => Promise<void>
    closeProject: () => Promise<void>
    theme: ThemeFace
  }

const THEME_OPTIONS = [
  { id: 'light', label: '亮色' },
  { id: 'dark', label: '暗色' },
  { id: 'system', label: '跟随系统' },
] as const

/** Root-slot frame (see module doc). */
export function ZenwitFrame({
  useSessions,
  renderSlot,
  list,
  create,
  openProject,
  closeProject,
  theme,
}: ZenwitFrameProps) {
  const sessionsState = useSessions(s => s)
  const current = sessionsState.current
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [projectPath, setProjectPath] = useState('')
  const [restored, setRestored] = useState(false)
  const [themeMode, setThemeMode] = useState('light')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setThemeMode(theme.current())
    return theme.subscribe(setThemeMode)
  }, [theme])

  // A page reload (or app restart) restores the current DSH session; enter the
  // workspace bound to its cwd instead of dropping back to the home library.
  useEffect(() => {
    if (restored || current === undefined) return
    const cwd = sessionsState.byId[current]?.cwd
    if (cwd === undefined || cwd === '') return
    setProjectPath(cwd)
    setShowWorkspace(true)
    setRestored(true)
    // Re-select the project's main session (non-blank, most recent) rather than
    // trusting the restored 'current', which may be an empty left-over session.
    void openProject(cwd)
  }, [current, restored, sessionsState, openProject])

  const handleOpen = async (projectPath: string) => {
    await openProject(projectPath)
    setProjectPath(projectPath)
    setShowWorkspace(true)
  }
  const handleClose = async () => {
    await closeProject()
    setShowWorkspace(false)
    setProjectPath('')
    setRestored(false)
  }
  const toggleTheme = () => { theme.set(themeMode === 'light' ? 'dark' : 'light') }

  return (
    <div className={css.frame}>
      <div className={css.topbar}>
        <h1 className={css.brand}>Zenwit</h1>
        <span className={css.brandSub}>短剧创作工作台</span>
        <div className={css.topbarSpacer} />
        <button className={css.topButton} type="button" onClick={toggleTheme}>
          {themeMode === 'light' ? '暗色' : '亮色'}
        </button>
        <button className={css.topButton} type="button" onClick={() => setSettingsOpen(true)}>
          设置
        </button>
      </div>
      {showWorkspace && current !== undefined
        ? <Workspace projectPath={projectPath} closeProject={handleClose} renderSlot={renderSlot} />
        : <HomePage list={list} create={create} openProject={handleOpen} />}

      {settingsOpen && (
        <div className={css.modalOverlay} onClick={() => setSettingsOpen(false)}>
          <div className={css.modal} onClick={e => e.stopPropagation()}>
            <h2 className={css.modalTitle}>设置</h2>
            <label className={css.settingsLabel}>主题</label>
            <div className={css.settingsRow}>
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={themeMode === opt.id ? css.settingsActive : css.settingsOption}
                  onClick={() => theme.set(opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className={css.modalActions}>
              <button className={css.modalCancel} type="button" onClick={() => setSettingsOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
