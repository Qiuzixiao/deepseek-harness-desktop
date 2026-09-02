import { useState, type ReactNode } from 'react'
import type { ChatNodeStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '../contract/chat-nodes.ts'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { IconApiOutline14, IconChevronDownOutline14, IconChevronRightOutline14, IconThinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { isRunningTool } from '../contract/chat-nodes.ts'
import css from './ChatView.module.css'

export type ProcessNode = ChatNode<'tool-call' | 'assistant-step'>

export interface ExecutionGroupProps {
  readonly nodeKeys: readonly string[]
  readonly useSession: ChatViewSlotProps['useSession']
  readonly t: ChatViewSlotProps['t']
  readonly children: ReactNode
}

function counts(nodeStore: ChatNodeStore, nodeKeys: readonly string[]): { tools: number; thinking: number; errors: number; running: boolean } {
  let tools = 0
  let thinking = 0
  let errors = 0
  let running = false
  for (const key of nodeKeys) {
    const candidate = nodeStore.get(key) as ChatNode | undefined
    if (candidate === undefined || !isProcessNode(candidate)) continue
    const node = candidate
    if (node.kind === 'tool-call') {
      tools += 1
      const root = node.data.root
      if (isRunningTool(root)) running = true
      else if (root.isError) errors += 1
      continue
    }
    if (node.data.status === 'running') running = true
    for (const block of node.data.blocks) {
      if (block.kind === 'reasoning') thinking += 1
    }
  }
  return { tools, thinking, errors, running }
}

function countSignature(nodeStore: ChatNodeStore, nodeKeys: readonly string[]): string {
  const stats = counts(nodeStore, nodeKeys)
  return `${stats.running ? 1 : 0}:${stats.tools}:${stats.thinking}:${stats.errors}`
}

export function ExecutionGroup({ nodeKeys, useSession, t, children }: ExecutionGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const signature = useSession(snapshot => countSignature(snapshot.chat.nodes, nodeKeys))
  const [running, tools, thinking, errors] = signature.split(':').map(Number) as [number, number, number, number]
  const stats = { running: running === 1, tools, thinking, errors }
  const parts = [
    stats.tools > 0 ? t('execution.tools', { count: stats.tools }) : null,
    stats.thinking > 0 ? t('execution.thinking', { count: stats.thinking }) : null,
    stats.errors > 0 ? t('execution.errors', { count: stats.errors }) : null,
  ].filter((part): part is string => part !== null)
  const label = parts.join(' · ')

  return (
    <div
      className={css.executionGroup}
      data-testid="execution-group"
      data-state={stats.running ? 'running' : 'done'}
      data-error={stats.errors > 0 || undefined}
      data-chat-anchor-key={expanded ? undefined : nodeKeys[0]}
    >
      <button
        type="button"
        className={css.executionSummary}
        aria-expanded={expanded}
        aria-label={expanded ? t('execution.collapse') : t('execution.expand')}
        onClick={() => { setExpanded(value => !value) }}
      >
        <span className={css.executionChevron} aria-hidden>
          {expanded ? <IconChevronDownOutline14 size={14} /> : <IconChevronRightOutline14 size={14} />}
        </span>
        <span className={css.executionIcon} aria-hidden>
          {stats.thinking > 0 && stats.tools === 0
            ? <IconThinkOutline14 size={14} />
            : <IconApiOutline14 size={14} />}
        </span>
        <span className={css.executionState}>{stats.running ? t('execution.running') : t('execution.done')}</span>
        {label && <span className={css.executionMeta}>{label}</span>}
      </button>
      {expanded && <div className={css.executionDetails}>{children}</div>}
    </div>
  )
}

/** A process-only assistant step can be safely represented by the summary. */
export function isProcessNode(node: ChatNode): node is ProcessNode {
  if (node.kind === 'tool-call') return true
  if (node.kind !== 'assistant-step') return false
  return node.data.blocks.length > 0
    && node.data.blocks.every(block => block.kind === 'reasoning' || block.kind === 'tool-call')
}

/** Process groups are turn-local so separate requests never collapse together. */
export function processTurn(node: ProcessNode): number | undefined {
  if (node.location.kind === 'turn' || node.location.kind === 'step') return node.location.turn.turn
  return undefined
}
