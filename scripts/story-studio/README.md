# Story Studio composition spike

This directory owns the disposable Profile tooling used to evaluate exact third-party DSH plugin artifacts before they can enter the Story Studio product composition.

## Commands

```sh
corepack yarn story-studio:test
corepack yarn story-studio:plugins:audit
corepack yarn story-studio:plugins:smoke --plugin <id|all>
corepack yarn story-studio:rich-file-reader:smoke --skip-ocr
corepack yarn story-studio:profile:install
```

`audit-plugins.mjs` downloads the HTTPS tarballs pinned by `config/story-studio/plugins.lock.json`, enforces size and SHA-256, and verifies package identity, license text, DSH bundle metadata, Cordis row, Client face, peer declarations, and native build allowlist.

`profile-smoke.mjs` creates a temporary DSH home, initializes a Web Profile through the official DSH CLI, installs the selected tarballs in one pnpm operation, verifies bundle reconciliation and the composed config, starts the real `rc.7` Web Host, fetches its loopback root, checks the Client manifest, stops the process group, and removes the temporary home. Pass `--keep` only when an investigation needs the printed temporary path.

The smoke does not read or write the user's ordinary DSH home. It currently exercises the system-Node Web Host, not the packaged Electron native ABI, browser visual behavior, or plugin-specific mutations.

`rich-file-reader-smoke.mjs` performs the plugin-specific behavior check with generated Chinese DOCX and PDF fixtures. Word and text-layer PDF parsing are required to pass. Chinese scanned-PDF OCR is intentionally separate because the current plugin does not bundle a fixed Simplified Chinese language pack; `--skip-ocr` runs the stable product gate.

`install-profile.mjs` is a developer-only repair tool for older DSH Homes. Normal packaged installs create the `story-studio` Profile and ship the pinned `dsh-drop-to-path` dependency from the Electron application tree; users do not run this command or download a plugin. Pass `--home <temporary-home>` for an isolated installation check.

## Lock changes

Do not edit a hash based only on registry metadata. Download the exact artifact, inspect it, compute SHA-256, review its license and install scripts, update one lock entry, then run its individual smoke and the full combination smoke. Keep a plugin lock update separate from Story Studio behavior changes.
