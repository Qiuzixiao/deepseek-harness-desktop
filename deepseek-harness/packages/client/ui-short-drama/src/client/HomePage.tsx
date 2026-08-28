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
      <nav className={css.homeNav} aria-label="主导航">
        <div className={css.navBrand}><strong>ZENWIT</strong><span>/</span><span>CREATIVE SYSTEM</span></div>
        <div className={css.navLinks}><button className={css.navActive} type="button" aria-current="page">首页</button><button type="button">项目库</button><button type="button">灵感库</button><button type="button">设置</button></div>
        <div className={css.navTools}><button type="button" aria-label="搜索">⌕</button><button type="button" aria-label="通知">♧</button><button className={css.avatar} type="button" aria-label="账户菜单">ZW</button></div>
      </nav>
      <header className={css.homeHero}>
        <div className={css.heroCopy}>
          <h2 className={css.heroTitle}>让灵感，<br /><em>成片。</em></h2>
          <p className={css.homeIntro}>从一粒微光开始，搭建你的下一部故事。</p>
          <div className={css.heroButtons}><button className={css.heroPrimary} type="button" onClick={openCreate}>＋ 新建项目</button><button className={css.heroSecondary} type="button">✦ 随机灵感</button></div>
          <div className={css.stats}><div><b>{projects?.filter(p => p.phase === 'Ready').length ?? 0}</b><span>进行中项目</span></div><div><b>{projects?.filter(p => p.phase !== 'Ready').length ?? 0}</b><span>已完成项目</span></div><div><b>86</b><span>灵感收集</span></div></div>
          <div className={css.heroMeta}><span>STORY OS · 01</span><span>● 系统在线</span></div>
        </div>
        <div className={css.orbitStage} aria-hidden="true">
          <div className={`${css.orbit} ${css.orbitOne}`} />
          <div className={`${css.orbit} ${css.orbitTwo}`} />
          <div className={`${css.orbit} ${css.orbitThree}`} />
          <div className={css.orbitCore}><span>ZW</span></div>
          <i className={`${css.particle} ${css.particleOne}`} /><i className={`${css.particle} ${css.particleTwo}`} /><i className={`${css.particle} ${css.particleThree}`} /><i className={`${css.particle} ${css.particleFour}`} />
        </div>
        <aside className={css.quoteCard}><span>“</span><p>每一个好故事，<br />都值得被认真构建。</p><small>ZENWIT · 创作随笔</small><div>●　•　•</div></aside>
      </header>
      <div className={css.contentSplit}>
        <section className={css.libraryColumn}>
          <div className={css.libraryHeader}><div><span className={css.sectionKicker}>PROJECT LIBRARY</span><span className={css.sectionTitle}>项目库　›</span></div><button className={css.viewAll} type="button">查看全部　›</button></div>
          <main className={css.projectGrid}>
        {projects === null ? (
          <>
            <div className={css.projectSkeleton} />
            <div className={css.projectSkeleton} />
            <div className={css.projectSkeleton} />
          </>
        ) : projects.length === 0 ? (
          <div className={css.emptyState}>还没有项目<br /><span>打开一个新的叙事坐标</span></div>
        ) : projects.slice(0, 4).map((project, index) => (
          <button key={project.path} className={css.projectCard} type="button" onClick={() => void onClickProject(project.path)}>
            <span className={`${css.cardCover} ${css[`cover${index % 4}`]}`}><span>{project.phase === 'Ready' ? '进行中' : '构思中'}</span></span>
            <strong className={css.projectName}>{project.name}</strong>
            <span className={css.projectMeta}>{projectMeta(project)}</span>
            <span className={css.projectTime}>{formatTime(project.updatedAt)}</span>
            <span className={css.cardFooter}>♧　{index + 1}<i>•••</i></span>
          </button>
        ))}
          </main>
          <section className={css.quickStart}><h3>快速开始</h3><div className={css.quickGrid}>{[['▤','新建空白项目','从零开始创建你的故事'],['✦','使用模板','从精选模板快速开始'],['♢','生成灵感','AI 为你生成创意点子'],['↥','导入项目','从本地文件导入项目']].map(([icon,title,desc]) => <button type="button" key={title} onClick={title === '新建空白项目' ? openCreate : undefined}><span>{icon}</span><b>{title}</b><small>{desc}</small></button>)}</div></section>
        </section>
        <aside className={css.activity}><div className={css.activityHead}><h3>最近动态</h3><button type="button">查看全部　›</button></div>{['项目「测试剧本」已更新','灵感「雨夜的第七封信」已收藏','项目「a-a-a」已创建','项目「我在唐朝当皇上」已更新'].map((item,index) => <div className={css.activityItem} key={item}><span>{['▣','★','＋','↗'][index]}</span><div><b>{item}</b><small>{index === 0 ? '2 小时前' : index === 1 ? '昨天' : `${index + 1} 天前`}</small></div></div>)}</aside>
      </div>
      {error !== null && <footer className={css.homeActions}><span className={css.homeError}>{error}</span></footer>}

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
