import { useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { LocalResource, ResourceKind, ResourcePreview } from '../local-resources-contract.ts'
import type { LocalResourcesApi } from './local-resources-api.ts'

type Props = PropsRuntime<'settings.section'> & PropsLocale<'desktop.resources'> & InjectFace<{ api: LocalResourcesApi }>
const button = 'dshDesktopSettingsButton'

export function LocalResourcesSection({ api, t }: Props) {
  const [items, setItems] = useState<LocalResource[]>([])
  const [kind, setKind] = useState<ResourceKind>('skill')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<LocalResource | null>(null)
  const [detail, setDetail] = useState<ResourcePreview | null>(null)
  const [filePath, setFilePath] = useState('')
  const [content, setContent] = useState<string | null>('')
  const [pending, setPending] = useState<{ file: File; preview: ResourcePreview } | null>(null)
  const [name, setName] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const generation = useRef(0)

  useEffect(() => {
    let active = true
    setBusy(true)
    api.list().then(result => { if (active) setItems(result.resources) })
      .catch(cause => { if (active) setError(String(cause instanceof Error ? cause.message : cause)) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false; generation.current++ }
  }, [api])

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('')
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setBusy(false) }
  }
  async function refresh() { setItems((await api.list()).resources) }
  async function open(item: LocalResource) {
    setDetail(null); setSelected(item); setFilePath(''); setContent('')
    const result = await api.detail(item.key)
    setDetail(result)
    const path = item.kind === 'skill' ? 'SKILL.md' : 'agent.cordis.yml'
    if (result.files.some(file => file.path === path)) await read(item.key, path)
  }
  async function read(key: string, path: string) {
    const current = ++generation.current
    setFilePath(path); setContent('')
    const result = await api.read(key, path)
    if (generation.current === current) setContent(result.content)
  }
  const filtered = items.filter(item => item.kind === kind && `${item.name} ${item.id} ${item.description} ${item.scope}`.toLowerCase().includes(search.toLowerCase()))
  const scope = (value: string) => value === 'user' || value === 'shared' ? t(value) : value

  return <section className="dshDesktopSettings dshLocalResources" aria-busy={busy}>
    <header className="dshDesktopSettingsHeader"><h2>{t('title')}</h2><p>{t('intro')}</p></header>
    <div className="dshDesktopSettingsForm">
      <button className={button} disabled={busy} onClick={() => fileInput.current?.click()}>{t('import')}</button>
      <button className={button} disabled={busy} onClick={() => void run(async () => { await refresh(); if (selected && !pending) await open(selected) })}>{t('refresh')}</button>
      <input ref={fileInput} type="file" accept=".zip,application/zip" hidden onChange={event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void run(async () => {
          const preview = await api.preview(file)
          setPending({ file, preview }); setName(preview.id)
        })
      }} />
      {busy && <span role="status">{t('loading')}</span>}
    </div>
    {error && <p className="dshDesktopSettingsError" role="alert">{t('failure')}{error}</p>}
    {message && <p role="status">{message}</p>}
    {pending ? <div className="dshDesktopSettingsGroup">
      <h3>{t('preview')} · {pending.preview.name}</h3>
      <p className="dshDesktopSettingsHint">{t(pending.preview.kind)} · {pending.preview.description}</p>
      <label className="dshLocalResourceName">{t('name')}<input className="dshDesktopSettingsInput" value={name} maxLength={64} disabled={busy} onChange={event => setName(event.target.value)} /></label>
      <p className="dshDesktopSettingsHint">{t('nameHint')}</p>
      {pending.preview.kind === 'preset' && <p className="dshDesktopSettingsHint">{t('presetHint')}</p>}
      <ul className="dshLocalResourceFileList" aria-label={t('files')}>{pending.preview.files.map(file => <li key={file.path}>{file.path} <small>{file.size.toLocaleString()} B</small></li>)}</ul>
      <div className="dshDesktopSettingsForm">
        <button className={button} disabled={busy || !name.trim()} onClick={() => void run(async () => {
          await api.install(pending.file, name)
          setKind(pending.preview.kind); setPending(null); setSelected(null); setDetail(null)
          await refresh(); setMessage(t('installed'))
        })}>{t('install')}</button>
        <button className={button} disabled={busy} onClick={() => { setPending(null); setError('') }}>{t('cancel')}</button>
      </div>
    </div> : selected ? <div className="dshDesktopSettingsGroup">
      <div className="dshDesktopSettingsForm">
        <button className={button} disabled={busy} onClick={() => { generation.current++; setSelected(null); setDetail(null); setError('') }}>{t('back')}</button>
        <button className={button} disabled={busy} onClick={() => void run(async () => {
          await api.export(selected.key, `${selected.id}.${selected.kind}.zip`); setMessage(t('exported'))
        })}>{t('export')}</button>
      </div>
      <h3>{selected.name}</h3>
      <p className="dshDesktopSettingsHint">{selected.description}</p>
      <p className="dshDesktopSettingsHint">{t('exportHint')}</p>
      {selected.kind === 'preset' && <p className="dshDesktopSettingsHint">{t('presetHint')}</p>}
      <div className="dshLocalResourceViewer">
        <nav aria-label={t('files')}>{detail?.files.map(file => <button key={file.path} className="dshLocalResourceFile" aria-current={filePath === file.path ? 'true' : undefined} disabled={busy} onClick={() => void run(() => read(selected.key, file.path))}>{file.path}</button>)}</nav>
        <div className="dshLocalResourceContent"><strong>{filePath}</strong><pre>{busy ? t('loading') : content === null ? t('binary') : filePath ? content : t('selectFile')}</pre></div>
      </div>
    </div> : <>
      <div className="dshDesktopSettingsForm" role="group" aria-label={t('title')}>
        {(['skill', 'preset'] as const).map(value => <button key={value} className={button} aria-pressed={kind === value} onClick={() => setKind(value)}>{t(value)} <small>({items.filter(item => item.kind === value).length})</small></button>)}
      </div>
      <input className="dshDesktopSettingsInput" aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => setSearch(event.target.value)} />
      <div className="dshDesktopSettingsList">
        {!busy && filtered.length === 0 && <p className="dshDesktopSettingsHint">{t('empty')}</p>}
        {filtered.map(item => <button key={item.key} className="dshDesktopSettingsChoice" data-actionable="true" disabled={busy} onClick={() => void run(() => open(item))}>
          <span className="dshLocalResourceSummary"><strong>{item.name}</strong><span>{item.description}</span><small>{scope(item.scope)} · {item.id}</small></span><span>{t('view')}</span>
        </button>)}
      </div>
    </>}
  </section>
}
