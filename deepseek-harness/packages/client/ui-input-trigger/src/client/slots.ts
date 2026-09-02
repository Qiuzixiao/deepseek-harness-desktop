/**
 * Overlay-slot contract surface of the slash plugin. The
 * 'conversation.input.overlay' slot is OWNED by the ui-conversation composer
 * entry (declaring is claiming: anchor, children declaration, lifecycle),
 * but the SlotMap type merge lives here: the owner package depends on this
 * one, so the dependency direction admits no reverse type import, and a
 * type-erased registration is ruled out. The owner's
 * program picks this merge up transitively through its ui-input-trigger imports.
 */
// Type-only edge: the SlotMap augmentation below merges into this package's interface.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { MenuState } from '../core/contract.ts'
import type { ReactNode } from 'react'

/** A non-trigger action shown at the top of a programmatically opened menu. */
export interface MenuAction {
  readonly id: string
  readonly label: string
  readonly icon?: ReactNode
  readonly disabled?: boolean
  readonly onSelect: () => void
}

/** Owner-supplied actions for the shared trigger menu. */
export interface MenuViewOwnerProps {
  readonly actions?: readonly MenuAction[]
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * The InputBar floating overlay anchor: MenuView (this package) and the
     * popupSelect shell (ui-commands) contribute list entries; each reads its
     * own store and renders null while closed. Declared (children table) by
     * ui-conversation's composer entry; the anchor hides with the input
     * under a takeover.
     */
    'conversation.input.overlay': { kind: 'list'; scope: 'session'; owner: MenuViewOwnerProps }
  }
}

/** Injected business face of the MenuView overlay entry (copy rides the standard locale seat, not this face). */
export interface MenuViewInjected {
  /** The service's menu state store (read-only here; MenuView subscribes). */
  menu: SnapshotStore<MenuState>
  /**
   * Pointer pick routed back through the service pipeline.
   * @param source - source (group) name.
   * @param index - candidate index within the group.
   */
  onPick: (source: string, index: number) => void
  /** Dismiss the menu (external pointer outside the composer area). */
  onDismiss: () => void
  /** Programmatic launcher state; actions render only for the plus menu. */
  launcher: SnapshotStore<string | null>
}
