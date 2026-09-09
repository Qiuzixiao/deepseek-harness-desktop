# Agent Note: Visual editor undo and document lifetime

Status: implemented

## Problem

The visual editor had no history plugin. Switching document tabs destroyed the editor, discarding native history, cursor position, and scroll position. Delayed Markdown listeners could leave the workspace draft behind the visible document during immediate save or mode switching.

## Decision

Milkdown uses its existing kit history plugin and native ProseMirror grouping and shortcuts. The toolbar exposes undo and redo with availability from native history. An editor-owned ProseMirror view plugin publishes Markdown and history availability synchronously after document transactions. Returning to the opening document emits the original Markdown bytes, avoiding a formatting-only dirty flag after undo.

Each open document retains its editor under a hidden wrapper while another tab is active. Closing a tab releases its editor and commands. Source mode retains its existing CodeMirror history across tab switches. Saving changes the saved baseline without resetting either editor; dirty state compares the current draft with that baseline.

## Limits

Switching between source and visual modes replaces the editor and resets its native history. Closing a document, leaving the workspace, or restarting the application also ends its history. Open tabs consume editor memory even while hidden; no persistent revision store is introduced.

## Verification

The real Milkdown component tests exercise paste, command and keyboard undo/redo, autosave, independent document history, switching back to the original tab, focus restoration, and comparison with saved content. Browser verification uses the actual Workspace component with deterministic file responses.

## Save and leave protection

Save requests are exclusive per open document. A completed request updates the saved baseline and compares it with the latest draft; save-and-close leaves the tab open if newer edits remain. A failed save stays visible and pauses automatic retries until an explicit retry or subsequent edit. Leaving the project prompts to save, discard, or cancel. The browser unload guard covers refresh/navigation, while normal native exit checks that guard before teardown and offers return-to-workspace or explicit discard. Native window close hides the live workspace. Process termination signals bypass interactive confirmation; crash recovery remains pending.
