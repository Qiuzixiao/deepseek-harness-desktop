/** Advanced-shell panel state shared by the root slot and layout-service adapter. */
export interface DesktopLayoutSnapshot {
  /** Preferred sidebar width; zero means the compact rail. */
  sidebar: number
  /** Preferred details width; zero means closed. */
  details: number
  /** Preferred Workbench Explorer width; zero means the compact rail. */
  explorer: number
  /** Whether the current viewport is below the automatic-collapse breakpoint. */
  narrow: boolean
  /** Manual narrow-screen override that temporarily expands the rail. */
  narrowExpanded: boolean
}

/** Column geometry after preserving the center surface. */
export interface DesktopColumns {
  /** Rendered sidebar width. */
  sidebar: number
  /** Rendered center width. */
  center: number
  /** Rendered details width. */
  details: number
  /** Rendered Explorer width. */
  explorer: number
}

/** Compatibility-mode compact rail used by the upstream Windows sidebar. */
export const SIDEBAR_COLLAPSED = 56
/** Wider compact rail reserved for the desktop-owned macOS sidebar. */
export const MACOS_SIDEBAR_COLLAPSED = 90
export const SIDEBAR_DEFAULT = 280
export const SIDEBAR_MIN = 264
export const SIDEBAR_MAX = 420
export const SIDEBAR_AUTO_COLLAPSE = 1024
export const DETAILS_DEFAULT = 360
export const DETAILS_MIN = 300
export const DETAILS_MAX = 520
export const EXPLORER_DEFAULT = 320
export const EXPLORER_MIN = 240
export const EXPLORER_MAX = 480
export const CENTER_MIN = 640

/**
 * Resolve three desktop columns without allowing details to squeeze the conversation below its floor.
 * @param viewport - available frame width.
 * @param sidebar - sidebar preference, where zero selects the compact rail.
 * @param details - details preference, where zero closes the panel.
 * @returns rendered column widths.
 */
export function computeDesktopColumns(
  viewport: number,
  sidebar: number,
  explorerOrDetails: number,
  detailsOrCollapsed: number = 0,
  collapsedWidth: number = SIDEBAR_COLLAPSED,
): DesktopColumns {
  // Keep the old three-argument helper contract for desktop layout tests and callers.
  const legacy = arguments.length < 5
  const explorer = legacy ? 0 : explorerOrDetails
  const details = legacy ? explorerOrDetails : detailsOrCollapsed
  if (legacy) collapsedWidth = arguments.length === 4 ? detailsOrCollapsed : SIDEBAR_COLLAPSED
  const sidebarWidth = sidebar === 0 ? collapsedWidth : clamp(sidebar, SIDEBAR_MIN, SIDEBAR_MAX)
  const preferredDetails = details === 0 ? 0 : clamp(details, DETAILS_MIN, DETAILS_MAX)
  const explorerWidth = explorer === 0 ? 28 : clamp(explorer, EXPLORER_MIN, EXPLORER_MAX)
  if (sidebarWidth + explorerWidth + preferredDetails + CENTER_MIN <= viewport) {
    return { sidebar: sidebarWidth, center: viewport - sidebarWidth - explorerWidth - preferredDetails, explorer: explorerWidth, details: preferredDetails }
  }
  const reducedDetails = preferredDetails === 0 ? 0 : Math.max(DETAILS_MIN, viewport - sidebarWidth - explorerWidth - CENTER_MIN)
  if (sidebarWidth + explorerWidth + reducedDetails + CENTER_MIN <= viewport) {
    return { sidebar: sidebarWidth, center: CENTER_MIN, explorer: explorerWidth, details: reducedDetails }
  }
  const reducedExplorer = explorerWidth === 28 ? 28 : Math.max(EXPLORER_MIN, viewport - sidebarWidth - CENTER_MIN)
  if (sidebarWidth + reducedExplorer + CENTER_MIN <= viewport) {
    return { sidebar: sidebarWidth, center: CENTER_MIN, explorer: reducedExplorer, details: 0 }
  }
  return { sidebar: sidebarWidth, center: Math.max(0, viewport - sidebarWidth - 28), explorer: 28, details: 0 }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Small observable panel controller used by the advanced root registration. */
export class DesktopLayoutState {
  private snapshot: DesktopLayoutSnapshot = Object.freeze({
    sidebar: SIDEBAR_DEFAULT,
    details: 0,
    explorer: EXPLORER_DEFAULT,
    narrow: false,
    narrowExpanded: false,
  })
  private readonly listeners = new Set<() => void>()

  /** @returns the immutable current panel snapshot. */
  getSnapshot(): DesktopLayoutSnapshot {
    return this.snapshot
  }

  /** @param listener - callback notified after a snapshot replacement. @returns its disposer. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Toggle the wide sidebar and the platform-selected compact rail. */
  toggleSidebar(): void {
    if (this.snapshot.narrow) {
      this.publish({ ...this.snapshot, narrowExpanded: !this.snapshot.narrowExpanded })
      return
    }
    this.publish({ ...this.snapshot, sidebar: this.snapshot.sidebar === 0 ? SIDEBAR_DEFAULT : 0 })
  }

  /** @param narrow - whether the frame is below the automatic-collapse breakpoint. */
  setNarrow(narrow: boolean): void {
    if (this.snapshot.narrow === narrow) return
    this.publish({ ...this.snapshot, narrow, narrowExpanded: false })
  }

  /** Open details at its default width. */
  openDetails(): void {
    if (this.snapshot.details === 0) this.publish({ ...this.snapshot, details: DETAILS_DEFAULT })
  }

  /** Close details while keeping its slot mounted. */
  closeDetails(): void {
    if (this.snapshot.details !== 0) this.publish({ ...this.snapshot, details: 0 })
  }

  toggleExplorer(): void {
    this.publish({ ...this.snapshot, explorer: this.snapshot.explorer === 0 ? EXPLORER_DEFAULT : 0 })
  }

  /** @param width - requested sidebar width from a resize gesture. */
  setSidebar(width: number): void {
    this.publish({ ...this.snapshot, sidebar: clamp(width, SIDEBAR_MIN, SIDEBAR_MAX) })
  }

  /** @param width - requested details width from a resize gesture. */
  setDetails(width: number): void {
    this.publish({ ...this.snapshot, details: clamp(width, DETAILS_MIN, DETAILS_MAX) })
  }

  setExplorer(width: number): void {
    this.publish({ ...this.snapshot, explorer: clamp(width, EXPLORER_MIN, EXPLORER_MAX) })
  }

  private publish(next: DesktopLayoutSnapshot): void {
    this.snapshot = Object.freeze(next)
    for (const listener of this.listeners) listener()
  }
}
