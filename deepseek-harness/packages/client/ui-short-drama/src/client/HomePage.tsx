/**
 * Zenwit home: the project library, backed by the desktop project-library API.
 */
import { useEffect, useState } from 'react'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import css from './zenwit.module.css'

function formatTime(ms: number): string {
  if (ms <= 0) return ''
  const d = new Date(ms)
  return d.toLocaleDateString('zh-CN')
}

function projectMeta(project: ProjectSummary): string {
  const phase = project.phase === 'Ready' ? '创作中' : project.phase === 'ChangePending' ? '待保存' : '构思中'
  if (project.writing !== undefined) {
    return phase + ' · 正文 ' + project.writing.completed + '/' + project.writing.total
  }
  return project.hasContract ? phase : '构思中'
}

/** Home page: project library (with an in-renderer create modal; window.prompt is unavailable in Electron). */
export function HomePage({ list, create, openProject }: { list: () => Promise<ProjectSummary[]>, create: (name: string) => Promise<ProjectSummary>, openProject: (projectPath: string) => Promise<void> }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    let cancelled = false
    list().then(ps => {
      if (!cancelled) setProjects(ps)
    }).catch(e => {
      if (!cancelled) setError(String(e instanceof Error ? e.message : e))
    })
    return () => { cancelled = true }
  }, [list])

  const openCreate = () => { setName(''); setShowCreate(true) }
  const cancelCreate = () => { setShowCreate(false); setName(''); setCreating(false) }

  const onClickProject = async (projectPath: string) => {
    setError(null)
    try {
      await openProject(projectPath)
    } catch (e) {
      setError('打开项目失败：' + String(e instanceof Error ? e.message : e))
    }
  }

  const confirmCreate = async () => {
    const trimmed = name.trim()
    if (trimmed.length === 0 || creating) return
    setCreating(true)
    setError(null)
    try {
      const created = await create(trimmed)
      setProjects(prev => [created, ...(prev ?? [])])
      setShowCreate(false)
      setName('')
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={css.home}>
      <div className={css.homeNoise} aria-hidden="true" />
      <div className={css.homeGlow} aria-hidden="true" />
      <div className={css.particleField} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <header className={css.homeHero}>
        <div className={css.heroCopy}>
          <div className={css.eyebrow}><span className={css.liveDot} /> ZENWIT / CREATIVE SYSTEM</div>
          <h2 className={css.heroTitle}>让灵感，<br /><em>成片。</em></h2>
          <p className={css.homeIntro}>从一粒微光开始，搭建你的下一部故事。</p>
          <div className={css.heroMeta}><span>STORY OS · 01</span><span>● 系统在线</span></div>
        </div>
        <div className={css.orbitStage} aria-hidden="true">
          <div className={`${css.orbit} ${css.orbitOne}`} />
          <div className={`${css.orbit} ${css.orbitTwo}`} />
          <div className={`${css.orbit} ${css.orbitThree}`} />
          <div className={css.orbitCore}><span>ZW</span></div>
          <i className={`${css.particle} ${css.particleOne}`} /><i className={`${css.particle} ${css.particleTwo}`} /><i className={`${css.particle} ${css.particleThree}`} /><i className={`${css.particle} ${css.particleFour}`} />
        </div>
      </header>
      <div className={css.libraryHeader}>
        <div><span className={css.sectionKicker}>PROJECT LIBRARY</span><span className={css.sectionTitle}>你的创作舱</span></div>
        <span className={css.projectCount}>{projects?.length ?? '—'} 个项目</span>
      </div>
      <main className={css.projectGrid}>
        {projects === null ? (
          <>
            <div className={css.projectSkeleton} />
            <div className={css.projectSkeleton} />
            <div className={css.projectSkeleton} />
          </>
        ) : projects.length === 0 ? (
          <div className={css.emptyState}>还没有项目<br /><span>打开一个新的叙事坐标</span></div>
        ) : projects.map(project => (
          <button key={project.path} className={css.projectCard} type="button" onClick={() => void onClickProject(project.path)}>
            <span className={css.cardIndex}>0{projects.indexOf(project) + 1}</span>
            <strong className={css.projectName}>{project.name}</strong>
            <span className={css.projectMeta}>{projectMeta(project)}</span>
            <span className={css.projectTime}>{formatTime(project.updatedAt)}</span>
            <span className={css.cardArrow}>↗</span>
          </button>
        ))}
      </main>
      <footer className={css.homeActions}>
        <button className={css.newButton} type="button" onClick={openCreate} disabled={creating}>
          {creating ? '正在建立坐标…' : '＋ 建立新坐标'}
        </button>
        {error !== null && <span className={css.homeError}>{error}</span>}
      </footer>

      {showCreate && (
        <div className={css.modalOverlay} onClick={cancelCreate}>
          <div className={css.modal} onClick={e => e.stopPropagation()}>
            <h3 className={css.modalTitle}>新建项目</h3>
            <input className={css.modalInput} value={name} onChange={e => setName(e.target.value)} placeholder="项目名称" autoFocus onKeyDown={e => { if (e.key === 'Enter') void confirmCreate() }} />
            <div className={css.modalActions}>
              <button className={css.modalCancel} type="button" onClick={cancelCreate}>取消</button>
              <button className={css.modalConfirm} type="button" onClick={() => void confirmCreate()} disabled={creating}>
                {creating ? '创建中…' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
