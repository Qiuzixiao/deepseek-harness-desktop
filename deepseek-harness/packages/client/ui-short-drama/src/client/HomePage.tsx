/**
 * Zenwit home: a compact project control surface backed by the desktop
 * project-library API.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ChevronRight, Clock3, FolderOpen, LoaderCircle, Plus, Search,
  Settings, Sparkles, Tags, Trash2, X,
} from 'lucide-react'
import type { ProjectSummary } from '@deepseek-ai/dsh-screenplay-project-library/types'
import { ProjectTagEditor, ProjectTags } from './ProjectTagEditor.tsx'
import css from './zenwit.module.css'

type ProjectFilter = 'all' | 'untagged' | `tag:${string}`

function formatTime(ms: number): string {
  if (ms <= 0) return '暂无更新时间'
  return new Date(ms).toLocaleDateString('zh-CN')
}

function projectTags(project: ProjectSummary): string[] {
  return Array.isArray(project.tags) ? project.tags : []
}

function agentName(project: ProjectSummary, names: Readonly<Record<string, string>>): string {
  return project.agentId === undefined ? '未指定创作助手' : names[project.agentId] ?? project.agentId
}

function projectMatches(project: ProjectSummary, query: string, agentNames: Readonly<Record<string, string>>): boolean {
  const normalized = query.trim().toLocaleLowerCase()
  if (normalized === '') return true
  return [project.name, project.path, project.agentId ?? '', agentName(project, agentNames), ...projectTags(project)]
    .some(value => value.toLocaleLowerCase().includes(normalized))
}

function tagsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((tag, index) => tag === right[index])
}

/** Home page: project search, filtering, creation and selected-project actions. */
export function HomePage({
  list,
  create,
  updateProjectTags,
  deleteProject,
  openProject,
  openLibrary,
  agentNames = {},
}: {
  list: () => Promise<ProjectSummary[]>
  create: (name: string, tags: string[]) => Promise<ProjectSummary>
  updateProjectTags: (projectPath: string, tags: string[]) => Promise<ProjectSummary>
  deleteProject: (projectPath: string) => Promise<void>
  openProject: (projectPath: string) => Promise<void>
  openLibrary: () => void
  agentNames?: Readonly<Record<string, string>>
}) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [opening, setOpening] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingTags, setSavingTags] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [createTags, setCreateTags] = useState<string[]>([])
  const [editingTags, setEditingTags] = useState(false)
  const [tagDraft, setTagDraft] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    list().then(value => {
      if (cancelled) return
      const sorted = [...value].sort((a, b) => b.updatedAt - a.updatedAt)
      setProjects(sorted)
      setSelectedPath(previous => previous !== null && sorted.some(project => project.path === previous)
        ? previous
        : sorted[0]?.path ?? null)
    }).catch(cause => {
      if (!cancelled) setError(String(cause instanceof Error ? cause.message : cause))
    })
    return () => { cancelled = true }
  }, [list])

  const sortedProjects = useMemo(() => [...(projects ?? [])].sort((a, b) => b.updatedAt - a.updatedAt), [projects])
  const tagOptions = useMemo(() => {
    const tags = new Map<string, { label: string, count: number }>()
    for (const project of sortedProjects) {
      for (const tag of projectTags(project)) {
        const key = tag.toLocaleLowerCase()
        const current = tags.get(key)
        tags.set(key, { label: current?.label ?? tag, count: (current?.count ?? 0) + 1 })
      }
    }
    return [...tags.entries()]
      .map(([key, value]) => ({ key: `tag:${key}` as const, ...value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'))
  }, [sortedProjects])
  const allTags = useMemo(() => tagOptions.map(option => option.label), [tagOptions])
  const visibleProjects = useMemo(() => sortedProjects.filter(project => {
    const matchesFilter = filter === 'all'
      || (filter === 'untagged'
        ? projectTags(project).length === 0
        : projectTags(project).some(tag => `tag:${tag.toLocaleLowerCase()}` === filter))
    return matchesFilter && projectMatches(project, query, agentNames)
  }), [agentNames, filter, query, sortedProjects])
  // Keep the detail pane aligned with the filtered list. When the current
  // selection is filtered out, promote the first visible project instead of
  // showing a stale detail record that is no longer in context.
  const selectedProject = visibleProjects.find(project => project.path === selectedPath)
    ?? visibleProjects[0]
    ?? null

  useEffect(() => {
    if (filter.startsWith('tag:') && !tagOptions.some(option => option.key === filter)) setFilter('all')
  }, [filter, tagOptions])

  useEffect(() => {
    setEditingTags(false)
    setTagDraft(selectedProject === null ? [] : projectTags(selectedProject))
  }, [selectedProject?.path])

  const openCreate = () => { setName(''); setCreateTags([]); setShowCreate(true) }
  const cancelCreate = () => { setShowCreate(false); setName(''); setCreateTags([]); setCreating(false) }

  const onOpenProject = async (project: ProjectSummary | null) => {
    if (project === null || opening || creating || deleting || savingTags) return
    setSelectedPath(project.path)
    setError(null)
    setOpening(true)
    try {
      await openProject(project.path)
    } catch (cause) {
      setError('打开项目失败：' + String(cause instanceof Error ? cause.message : cause))
    } finally {
      setOpening(false)
    }
  }

  const onDeleteProject = async (project: ProjectSummary | null) => {
    if (project === null || opening || creating || deleting || savingTags) return
    if (!window.confirm(`确定删除项目“${project.name}”？项目文件夹中的内容将被永久删除。`)) return
    setError(null)
    setDeleting(true)
    try {
      await deleteProject(project.path)
      setProjects(previous => {
        const next = previous?.filter(item => item.path !== project.path) ?? []
        setSelectedPath(next[0]?.path ?? null)
        return next
      })
    } catch (cause) {
      setError('删除项目失败：' + String(cause instanceof Error ? cause.message : cause))
    } finally {
      setDeleting(false)
    }
  }

  const confirmCreate = async () => {
    const trimmed = name.trim()
    if (trimmed.length === 0 || creating || opening || deleting) return
    setCreating(true)
    setError(null)
    try {
      const created = await create(trimmed, createTags)
      setProjects(previous => [created, ...(previous ?? [])])
      setSelectedPath(created.path)
      setShowCreate(false)
      setName('')
      setCreateTags([])
      setOpening(true)
      try {
        await openProject(created.path)
      } catch (cause) {
        setError('项目已创建，但打开工作台失败：' + String(cause instanceof Error ? cause.message : cause))
      } finally {
        setOpening(false)
      }
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause))
    } finally {
      setCreating(false)
    }
  }

  const saveProjectTags = async (): Promise<void> => {
    if (selectedProject === null || savingTags || tagsEqual(projectTags(selectedProject), tagDraft)) {
      setEditingTags(false)
      return
    }
    setSavingTags(true)
    setError(null)
    try {
      const updated = await updateProjectTags(selectedProject.path, tagDraft)
      setProjects(previous => previous?.map(project => project.path === updated.path ? updated : project) ?? [])
      setTagDraft(projectTags(updated))
      setEditingTags(false)
    } catch (cause) {
      setError('保存项目标签失败：' + String(cause instanceof Error ? cause.message : cause))
    } finally {
      setSavingTags(false)
    }
  }

  const filterOptions: Array<{ key: ProjectFilter, label: string, count: number }> = [
    { key: 'all', label: '全部项目', count: sortedProjects.length },
    ...tagOptions,
    { key: 'untagged', label: '未分类', count: sortedProjects.filter(project => projectTags(project).length === 0).length },
  ]

  return (
    <main className={css.home}>
      <header className={css.homeNav}>
        <div className={css.navBrand} aria-label="Zenwit">
          <span className={css.brandMark} aria-hidden="true">Z</span>
          <strong>ZENWIT</strong>
          <span className={css.brandDivider} aria-hidden="true" />
          <span className={css.brandContext}>创作工作台</span>
        </div>
        <nav className={css.navLinks} aria-label="主导航">
          <button className={css.navActive} type="button" aria-current="page">首页</button>
          <button type="button" onClick={openLibrary}>项目库</button>
          <button type="button" aria-disabled="true" disabled title="灵感库开发中">
            灵感库 <span className={css.navComingSoon}>开发中</span>
          </button>
        </nav>
        <div className={css.navTools}>
          <button
            className={css.settingsButton}
            type="button"
            aria-haspopup="dialog"
            onClick={() => window.dispatchEvent(new Event('dsh:settings-open'))}
          >
            <Settings size={15} aria-hidden="true" />
            <span>设置</span>
          </button>
          <label className={css.searchBox}>
            <Search size={15} aria-hidden="true" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索项目" aria-label="搜索项目" />
          </label>
          <button className={css.newProjectButton} type="button" onClick={openCreate}>
            <Plus size={15} aria-hidden="true" />
            <span>新建项目</span>
          </button>
        </div>
      </header>

      <section className={css.homeIntro} aria-labelledby="home-title">
        <div>
          <span className={css.sectionKicker}>ZENWIT / PROJECTS</span>
          <h1 id="home-title">继续你的创作</h1>
          <p>从最近打开的项目开始，回到故事现场。</p>
        </div>
        <div className={css.introRule} aria-hidden="true" />
      </section>

      <section className={css.homeBody}>
        <aside className={css.filterPanel} aria-label="项目筛选">
          <div className={css.panelHeading}><Tags size={15} aria-hidden="true" /><span>项目标签</span></div>
          <div className={css.filterList} role="listbox" aria-label="项目标签">
            {filterOptions.map(option => (
              <button
                key={option.key}
                className={`${css.filterOption} ${filter === option.key ? css.filterOptionActive : ''}`}
                type="button"
                role="option"
                aria-selected={filter === option.key}
                aria-label={`${option.label} ${option.count}`}
                onClick={() => setFilter(option.key)}
              >
                <span>{option.label}</span><span className={css.filterCount}>{option.count}</span>
              </button>
            ))}
          </div>
          <div className={css.filterFooter}>
            <span className={css.statusDot} aria-hidden="true" />
            <span>本地项目库已连接</span>
          </div>
        </aside>

        <section className={css.projectPanel} aria-labelledby="project-list-title">
          <div className={css.panelHeader}>
            <div>
              <span className={css.sectionKicker}>RECENT PROJECTS</span>
              <h2 id="project-list-title">最近项目</h2>
            </div>
            <button className={css.textAction} type="button" onClick={openLibrary}>查看全部 <ChevronRight size={14} aria-hidden="true" /></button>
          </div>
          <div className={css.projectList}>
            {projects === null ? (
              <>
                <div className={css.projectRowSkeleton} />
                <div className={css.projectRowSkeleton} />
                <div className={css.projectRowSkeleton} />
              </>
            ) : visibleProjects.length === 0 ? (
              <div className={css.emptyState}>
                <FolderOpen size={22} aria-hidden="true" />
                <strong>{sortedProjects.length === 0 ? '还没有项目' : '没有匹配的项目'}</strong>
                <span>{sortedProjects.length === 0 ? '创建一个项目，开始搭建你的故事。' : '尝试更换搜索词或项目范围。'}</span>
                {sortedProjects.length === 0 && <button className={css.emptyAction} type="button" onClick={openCreate}><Plus size={14} aria-hidden="true" />创建项目</button>}
              </div>
            ) : visibleProjects.map(project => (
              <button
                key={project.path}
                className={`${css.projectRow} ${selectedProject?.path === project.path ? css.projectRowActive : ''}`}
                type="button"
                aria-pressed={selectedProject?.path === project.path}
                onClick={() => setSelectedPath(project.path)}
              >
                <span className={css.projectGlyph} aria-hidden="true"><FolderOpen size={17} strokeWidth={1.8} /></span>
                <span className={css.projectRowMain}>
                  <strong>{project.name}</strong>
                  <span className={css.projectRowMeta}>
                    <small>{agentName(project, agentNames)}</small>
                    <ProjectTags tags={projectTags(project)} />
                  </span>
                </span>
                <span className={css.projectRowTime}><Clock3 size={13} aria-hidden="true" />{formatTime(project.updatedAt)}</span>
                <ChevronRight className={css.projectRowChevron} size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <aside className={css.detailPanel} aria-label="项目详情">
          {selectedProject === null ? (
            <div className={css.detailEmpty}><Sparkles size={20} aria-hidden="true" /><span>选择一个项目查看详情</span></div>
          ) : (
            <>
              <div className={css.detailHeader}><span className={css.sectionKicker}>SELECTED PROJECT</span><span className={css.detailIndex}>01</span></div>
              <div className={css.detailIdentity}><span className={css.detailGlyph} aria-hidden="true"><FolderOpen size={20} /></span><h2>{selectedProject.name}</h2></div>
              <dl className={css.detailFacts}>
                <div><dt>创作助手</dt><dd>{agentName(selectedProject, agentNames)}</dd></div>
                <div><dt>最近更新</dt><dd>{formatTime(selectedProject.updatedAt)}</dd></div>
                <div><dt>项目路径</dt><dd title={selectedProject.path}>{selectedProject.path}</dd></div>
              </dl>
              <section className={css.detailTags} aria-label="项目标签">
                <div className={css.detailTagsHeader}>
                  <span>项目标签</span>
                  {!editingTags && (
                    <button type="button" onClick={() => { setTagDraft(projectTags(selectedProject)); setEditingTags(true) }}>
                      <Plus size={12} aria-hidden="true" />{projectTags(selectedProject).length === 0 ? '添加标签' : '编辑'}
                    </button>
                  )}
                </div>
                {!editingTags ? (
                  projectTags(selectedProject).length === 0
                    ? <span className={css.detailTagsEmpty}>未分类</span>
                    : <ProjectTags tags={projectTags(selectedProject)} limit={8} ariaLabel={`项目标签：${projectTags(selectedProject).join('、')}`} />
                ) : (
                  <div className={css.detailTagEditor}>
                    <ProjectTagEditor value={tagDraft} suggestions={allTags} disabled={savingTags} onChange={setTagDraft} />
                    <div className={css.detailTagActions}>
                      <button type="button" disabled={savingTags} onClick={() => { setTagDraft(projectTags(selectedProject)); setEditingTags(false) }}>取消</button>
                      <button type="button" disabled={savingTags} onClick={() => void saveProjectTags()}>
                        {savingTags ? <LoaderCircle className={css.buttonSpinner} size={12} aria-hidden="true" /> : null}
                        {savingTags ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
              <div className={css.detailActions}>
                <button className={css.detailPrimary} type="button" onClick={() => void onOpenProject(selectedProject)} disabled={opening || creating || deleting || savingTags}>
                  {opening ? <LoaderCircle className={css.buttonSpinner} size={15} aria-hidden="true" /> : <FolderOpen size={15} aria-hidden="true" />}
                  {opening ? '正在打开…' : '打开工作台'}
                </button>
                <button className={css.detailDelete} type="button" aria-label={`删除项目：${selectedProject.name}`} onClick={() => void onDeleteProject(selectedProject)} disabled={opening || creating || deleting || savingTags}>
                  {deleting ? <LoaderCircle className={css.buttonSpinner} size={15} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
                </button>
              </div>
            </>
          )}
        </aside>
      </section>

      {error !== null && <p className={css.homeError} role="alert">{error}</p>}

      {showCreate && (
        <div className={css.modalOverlay} onClick={cancelCreate}>
          <div className={css.modal} onClick={event => event.stopPropagation()}>
            <div className={css.modalHeader}><span className={css.sectionKicker}>NEW PROJECT</span><button className={css.modalClose} type="button" aria-label="关闭" onClick={cancelCreate}><X size={15} aria-hidden="true" /></button></div>
            <h2 className={css.modalTitle}>创建项目</h2>
            <p className={css.modalDescription}>为新的创作现场命名。</p>
            <input className={css.modalInput} value={name} onChange={event => setName(event.target.value)} placeholder="项目名称" autoFocus onKeyDown={event => { if (event.key === 'Enter') void confirmCreate() }} />
            <div className={css.modalTagField}>
              <span>项目标签 <small>可选</small></span>
              <ProjectTagEditor value={createTags} suggestions={allTags} disabled={creating} onChange={setCreateTags} />
            </div>
            <div className={css.modalActions}>
              <button className={css.modalCancel} type="button" onClick={cancelCreate}>取消</button>
              <button className={css.modalConfirm} type="button" onClick={() => void confirmCreate()} disabled={creating}>
                {creating ? <><LoaderCircle className={css.buttonSpinner} size={14} aria-hidden="true" />创建中…</> : <><Plus size={14} aria-hidden="true" />创建项目</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {opening && (
        <div className={css.transitionOverlay} role="status" aria-live="polite">
          <LoaderCircle className={css.loadingSpinner} size={20} aria-hidden="true" />
          <span>正在打开工作台…</span>
        </div>
      )}
    </main>
  )
}
