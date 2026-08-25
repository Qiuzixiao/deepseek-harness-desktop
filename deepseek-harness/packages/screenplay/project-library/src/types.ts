/** Project-library Remote vocabulary: project summaries and creation results. */

export type ProjectLibraryPhase = 'Intake' | 'Ready' | 'ChangePending'

export interface ProjectWritingProgress {
  completed: number
  total: number
}

export interface ProjectSummary {
  /** Directory basename — the single canonical project title. */
  name: string
  /** Absolute project directory path. */
  path: string
  /** Layout marker ('zh-CN-v1' for new projects). */
  layout: 'zh-CN-v1' | 'legacy-en-v1'
  phase: ProjectLibraryPhase
  revision: number
  updatedAt: number
  /** Whether the formal contract artifact set exists. */
  hasContract: boolean
  writing?: ProjectWritingProgress
}

export interface ProjectLibrarySnapshot {
  root: string
  projects: ProjectSummary[]
}

export interface ProjectCreated {
  project: ProjectSummary
}
