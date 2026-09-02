import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, LoaderCircle, Settings, Trash2 } from 'lucide-react'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import { ProjectTags } from './ProjectTagEditor.tsx'
import css from './zenwit.module.css'

function formatTime(ms: number): string {
  if (ms <= 0) return ''
  return new Date(ms).toLocaleDateString('zh-CN')
}

function projectTags(project: ProjectSummary): string[] { return Array.isArray(project.tags) ? project.tags : [] }
function projectMeta(project: ProjectSummary, names: Readonly<Record<string, string>>): string {
  return project.agentId === undefined ? '未指定创作助手' : names[project.agentId] ?? project.agentId
}

export interface ProjectLibraryPageProps {
  list: () => Promise<ProjectSummary[]>
  openProject: (projectPath: string) => Promise<void>
  deleteProject: (projectPath: string) => Promise<void>
  onBack: () => void
  agentNames?: Readonly<Record<string, string>>
}

/** Full project library surface. The page owns a fresh scan so mutations are visible immediately. */
export function ProjectLibraryPage({ list, openProject, deleteProject, onBack, agentNames = {} }: ProjectLibraryPageProps) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openingPath, setOpeningPath] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    list().then(value => {
      if (!cancelled) setProjects(value)
    }).catch(cause => {
      if (!cancelled) setError(String(cause instanceof Error ? cause.message : cause))
    })
    return () => { cancelled = true }
  }, [list])

  const handleOpen = async (path: string) => {
    if (openingPath !== null || deletingPath !== null) return
    setError(null)
    setOpeningPath(path)
    try {
      await openProject(path)
    } catch (cause) {
      setError('打开项目失败：' + String(cause instanceof Error ? cause.message : cause))
    } finally {
      setOpeningPath(null)
    }
  }

  const handleDelete = async (project: ProjectSummary) => {
    if (openingPath !== null || deletingPath !== null) return
    if (!window.confirm(`确定删除项目“${project.name}”？项目文件夹中的内容将被永久删除。`)) return
    setError(null)
    setDeletingPath(project.path)
    try {
      await deleteProject(project.path)
      setProjects(previous => previous?.filter(item => item.path !== project.path) ?? [])
    } catch (cause) {
      setError('删除项目失败：' + String(cause instanceof Error ? cause.message : cause))
    } finally {
      setDeletingPath(null)
    }
  }

  return (
    <main className={css.libraryPage}>
      <header className={css.libraryPageHeader}>
        <button className={css.backButton} type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>返回首页</span>
        </button>
        <div>
          <span className={css.sectionKicker}>PROJECT LIBRARY</span>
          <h1 className={css.libraryPageTitle}>全部项目</h1>
        </div>
        <div className={css.libraryPageTools}>
          <span className={css.libraryPageCount}>{projects?.length ?? 0} 个项目</span>
          <button
            className={css.librarySettingsButton}
            type="button"
            aria-haspopup="dialog"
            aria-label="设置"
            onClick={() => window.dispatchEvent(new Event('dsh:settings-open'))}
          >
            <Settings size={15} aria-hidden="true" />
          </button>
        </div>
      </header>
      {error !== null && <p className={css.libraryPageError} role="alert">{error}</p>}
      <section className={css.libraryPageGrid} aria-label="全部项目" aria-busy={projects === null}>
        {projects === null ? (
          <>
            <div className={css.projectSkeleton} />
            <div className={css.projectSkeleton} />
            <div className={css.projectSkeleton} />
            <div className={css.projectSkeleton} />
          </>
        ) : projects.length === 0 ? (
          <div className={css.emptyState}>还没有项目<br /><span>返回首页创建第一个项目</span></div>
        ) : projects.map((project, index) => {
          const busy = openingPath === project.path || deletingPath === project.path
          return (
            <article className={`${css.projectCard} ${css.projectCardContainer}`} key={project.path}>
              <button className={css.projectCardMain} type="button" onClick={() => void handleOpen(project.path)} disabled={busy || openingPath !== null || deletingPath !== null}>
                <span className={`${css.cardCover} ${css[`cover${index % 4}`]}`}><span>工作区</span></span>
                <strong className={css.projectName}>{project.name}</strong>
                <span className={css.projectMeta}>{projectMeta(project, agentNames)}</span>
                <ProjectTags tags={projectTags(project)} limit={3} ariaLabel={`项目标签：${projectTags(project).join('、')}`} />
                <span className={css.projectTime}>{formatTime(project.updatedAt)}</span>
                <span className={css.cardFooter}>打开工作台 <ArrowUpRight size={13} aria-hidden="true" /></span>
              </button>
              <button className={css.projectDelete} type="button" aria-label={`删除项目：${project.name}`} onClick={() => void handleDelete(project)} disabled={busy || openingPath !== null || deletingPath !== null}>
                {deletingPath === project.path ? <LoaderCircle className={css.buttonSpinner} size={15} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
              </button>
            </article>
          )
        })}
      </section>
      {openingPath !== null && (
        <div className={css.transitionOverlay} role="status" aria-live="polite">
          <LoaderCircle className={css.loadingSpinner} size={24} aria-hidden="true" />
          <span>正在打开工作台…</span>
        </div>
      )}
    </main>
  )
}
