import { useId, useState } from 'react'
import { Plus, Tag, X } from 'lucide-react'
import css from './zenwit.module.css'

// Keep these presentation limits aligned with the project-library wire
// contract. Runtime validation remains authoritative in the Remote and HTTP
// handlers; duplicating the small constants here keeps this client bundle
// within the cross-plugin purity boundary.
const PROJECT_TAG_LIMIT = 8
const PROJECT_TAG_MAX_LENGTH = 24

function tagKey(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase()
}

export function ProjectTags({ tags, limit = 2, ariaLabel }: { tags: readonly string[], limit?: number, ariaLabel?: string }) {
  if (tags.length === 0) return null
  const visible = tags.slice(0, limit)
  const remaining = tags.length - visible.length
  return (
    <span className={css.projectTags} {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}>
      {visible.map(tag => <span className={css.projectTag} key={tagKey(tag)}>{tag}</span>)}
      {remaining > 0 && <span className={css.projectTagMore}>+{remaining}</span>}
    </span>
  )
}

export function ProjectTagEditor({
  value,
  suggestions,
  disabled = false,
  onChange,
}: {
  value: readonly string[]
  suggestions: readonly string[]
  disabled?: boolean
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const messageId = useId()
  const selected = new Set(value.map(tagKey))
  const available = suggestions.filter(tag => !selected.has(tagKey(tag)))

  const add = (candidate: string): void => {
    const tag = candidate.normalize('NFKC').trim()
    if (tag === '') return
    if ([...tag].length > PROJECT_TAG_MAX_LENGTH) {
      setMessage(`标签不能超过 ${PROJECT_TAG_MAX_LENGTH} 个字符`)
      return
    }
    if (selected.has(tagKey(tag))) {
      setDraft('')
      setMessage(null)
      return
    }
    if (value.length >= PROJECT_TAG_LIMIT) {
      setMessage(`每个项目最多添加 ${PROJECT_TAG_LIMIT} 个标签`)
      return
    }
    onChange([...value, tag])
    setDraft('')
    setMessage(null)
  }

  const remove = (tag: string): void => {
    const key = tagKey(tag)
    onChange(value.filter(item => tagKey(item) !== key))
    setMessage(null)
  }

  return (
    <div className={css.tagEditor}>
      {value.length > 0 && (
        <div className={css.tagEditorSelected} aria-label="已选标签">
          {value.map(tag => (
            <span className={css.tagEditorChip} key={tagKey(tag)}>
              <Tag size={11} aria-hidden="true" />
              <span>{tag}</span>
              <button type="button" aria-label={`移除标签：${tag}`} disabled={disabled} onClick={() => remove(tag)}>
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={css.tagEditorInputRow}>
        <input
          value={draft}
          disabled={disabled || value.length >= PROJECT_TAG_LIMIT}
          maxLength={PROJECT_TAG_MAX_LENGTH}
          placeholder={value.length >= PROJECT_TAG_LIMIT ? '已达到标签上限' : '输入新标签'}
          aria-label="输入新标签"
          aria-describedby={message === null ? undefined : messageId}
          onChange={event => { setDraft(event.target.value); setMessage(null) }}
          onKeyDown={event => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            add(draft)
          }}
        />
        <button type="button" aria-label="添加标签" disabled={disabled || draft.trim() === ''} onClick={() => add(draft)}>
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
      {message !== null && <span className={css.tagEditorMessage} id={messageId} role="alert">{message}</span>}
      {available.length > 0 && (
        <div className={css.tagSuggestions} aria-label="已有标签">
          <span>已有标签</span>
          <div>
            {available.map(tag => (
              <button type="button" key={tagKey(tag)} disabled={disabled} onClick={() => add(tag)}>{tag}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
