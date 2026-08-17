# Story Studio Product Bundle

This private workspace owns the install-time Story Studio Profile composition.
Its production dependencies are packaged with DSH Desktop and resolved through
the installation fallback, so end users do not run plugin installation commands
or contact GitHub when the Profile starts.

The bundle mounts these installer-owned capabilities:

- `dsh-drop-to-path`, pinned to commit `a00a5a2e18fd89e829b1c96f2f2e85af67366e10`;
- `dsh-rich-file-reader@0.3.1` for DOCX, PDF, Office, image, and OCR tools;
- `dsh-better-sidebar@0.12.3` for the authoring file tree, editor, preview, Git diff, and terminal surfaces;
- `dsh-checkpoint-rewind@0.5.1` for checkpoint, diff, and approval-gated rewind, with a repository-owned DSH `rc.7` Settings/tool lifecycle patch.

Every dependency retains its upstream license in the packaged application. The
desktop package gate verifies the Host and Client entries, Story Studio Skills,
and architecture-specific native assets before an installer is accepted.
