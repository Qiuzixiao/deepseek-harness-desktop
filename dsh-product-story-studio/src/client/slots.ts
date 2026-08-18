/**
 * Story Studio slot declarations
 *
 * Extends DSH's slot map to add Story Studio specific slots
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    // Story Studio occupies conversation slot via chain selector
    'conversation': {
      kind: 'chain'
      scope: 'session-maybe'
      owner?: {
        sessionId?: string
        projectPath?: string
      }
    }

    // Story Studio internal slots
    'story-studio.file-tree': {
      kind: 'single'
      scope: 'session'
      owner: {
        projectPath: string
        sessionId: string
      }
    }

    'story-studio.editor': {
      kind: 'single'
      scope: 'session'
      owner: {
        projectPath: string
        sessionId: string
        currentFile?: string
      }
    }
  }
}

export {}
