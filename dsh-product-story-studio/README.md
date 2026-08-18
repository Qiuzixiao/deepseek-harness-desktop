# QNovel Product Bundle

This private workspace owns the install-time QNovel Beta composition. Internal
package, profile, and preset identifiers retain Story Studio names for
compatibility.
Its production dependencies are packaged with DSH Desktop and resolved through
the installation fallback, so end users do not run plugin installation commands
or contact GitHub when the Profile starts.

The bundle owns name-only project creation and mounts these installer-owned capabilities:

- `dsh-drop-to-path`, pinned to commit `a00a5a2e18fd89e829b1c96f2f2e85af67366e10`;
- `dsh-rich-file-reader@0.3.1` for DOCX and text-layer PDF reference extraction; spreadsheet, presentation, and OCR production are not MVP acceptance requirements;
- the bundled `dsh-workbench` authoring surface for the right-side Explorer, Monaco editor, tabs, and Markdown preview;
- `dsh-checkpoint-rewind@0.5.1` for checkpoint, diff, and approval-gated rewind, with a repository-owned DSH `rc.7` Settings/tool lifecycle patch.

Every dependency retains its upstream license in the packaged application. The
desktop package gate verifies the Host and Client entries, Story Studio Skills,
and architecture-specific native assets before an installer is accepted.

The current MVP requires a first-run choice of one configurable global root,
stores that setting in the official Settings document, and creates every work
under it. It registers
the directory as a DSH Workspace, keeps the official conversation in the center,
and reuses Better Sidebar for the right-hand file tree and preview. Professional
DOCX/PDF layout export is intentionally out of scope.
