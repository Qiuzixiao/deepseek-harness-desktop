# Agent Note: Integrated Harness RC2 development boundary

Status: implemented

English | [中文](2026-08-26-integrated-harness-rc2-development-boundary.zh.md)

## Problem

Zenwit changes both Desktop-owned code and selected packages in the integrated `deepseek-harness/` source tree. The outer repository installs the Desktop product with Yarn 4, while the integrated Harness source retains its pnpm workspace. Linking a pnpm workspace package into `dsh-plugin-desktop/node_modules` lets TypeScript follow the package realpath into the pnpm dependency tree. Desktop then sees two React declaration sets and incompatible Cordis `Context`, event, and slot augmentations. The initial duplicate-identifier errors cascade into misleading missing-service and missing-slot errors before Electron starts; deleting `$DSH_HOME` cannot affect this compiler failure.

Zenwit also adds `@deepseek-ai/dsh-screenplay-project-library`, which is not an official published RC2 package. The Web composition cannot load that Host row unless the package is part of the Desktop installation closure.

## Decision

The Desktop dependency closure is fixed to the published DSH `0.1.1-rc.2` family. `scripts/link-local-client.mjs` restores physical Yarn-installed RC2 packages, rejects a wrong installed version, and copies only selected built outputs from the integrated source. It never replaces a Desktop package with a source symlink and never copies a workspace manifest over a published manifest.

The locally owned screenplay project-library uses a Yarn `file:` dependency and is materialized as a physical package. The Zenwit Web composition is copied into the installed Web bundle and retains `openBrowser: false`, so an Electron launch cannot open an external browser. The Web frontend `dist` is also copied rather than linked.

`corepack yarn dev` builds the community package and integrated Harness source, materializes the local outputs, builds Desktop, and launches through `dsh-plugin-desktop/scripts/dev.mjs`. That launcher defaults `DSH_HOME` to `~/.dsh-dev` only when the caller did not provide a value. `start` keeps normal production home semantics. Development and production profiles therefore do not select each other's plugin sets or records.

The integrated Harness source is product-owned and editable because Zenwit lives there, but it remains an independent pnpm workspace. The outer Yarn workspace must not absorb it. Desktop and Harness versions will not be upgraded beyond RC2 for this product line unless a future explicit decision replaces this note.

## Verification

The acceptance loop is:

```sh
corepack yarn install --immutable
corepack yarn workspace dsh-plugin-desktop typecheck
corepack yarn workspace dsh-plugin-desktop test
corepack yarn workspace dsh-plugin-desktop verify:loader
corepack yarn workspace dsh-plugin-desktop verify:profile
corepack yarn dev
```

After `dev`, the Electron window must show the real Zenwit surface, and the latest lifecycle run must contain `renderer.boot.completed` and `startup.run.completed` with `rendererStatus: healthy`. The Desktop `@deepseek-ai` package directory must contain no symlink into `deepseek-harness/`, and each materialized DSH manifest must report `0.1.1-rc.2`.

On 2026-08-26 this loop passed with 78 test files, 791 passing tests, four skipped tests, both Loader smokes, immutable Yarn installation, and a healthy Zenwit renderer.

## Known source metadata debt

Some `package.json` files in the integrated Harness source still report the imported `0.1.0-rc.5` label. The Desktop installation and runtime closure are protected by physical RC2 manifests and version checks, so this label no longer contaminates TypeScript or startup. It does mean that repository-wide source provenance is not yet fully normalized to the official RC2 snapshot. Do not claim that this metadata debt is complete, do not hide it by rewriting version strings alone, and do not reintroduce source links as a workaround. A future source-normalization change must preserve Zenwit changes and verify the full loop above.

## Consequences

Local Harness edits require `source:build` or `source:bundle` before Desktop consumes them. Copying a focused artifact is slightly slower than a symlink but produces deterministic package resolution and matches the deployment boundary. `~/.dsh` and `~/.dsh-dev` are runtime data, not build inputs; cleaning either directory is a profile/data reset, never a TypeScript repair step.
