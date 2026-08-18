# DSH Desktop repository rules

This repository owns the desktop product around an unmodified DeepSeek Harness checkout.

## Prerequisites and setup

- Use Node.js `^22.19.0` or `>=24.0.0` and the root Yarn `4.18.0` release through Corepack.
- Initialize the pinned upstream checkout with `git submodule update --init --recursive`.
- Install root dependencies with `corepack yarn install --immutable`.

## Build, run, and verify

- Start the desktop development workflow with `corepack yarn dev`.
- Build the desktop package with `corepack yarn build`.
- Run unit tests with `corepack yarn test`.
- Run type checking with `corepack yarn typecheck`.
- Run the complete headless gate with `corepack yarn check`.
- Run upstream operations through the root scripts, such as `corepack yarn upstream:build`.
- Run a single test inside `dsh-plugin-desktop` with `yarn workspace dsh-plugin-desktop exec vitest run <path-to-test>` (or `vitest run -t "<name>"` for a name filter).
- `dsh-plugin-desktop` also exposes targeted verification scripts beyond `test`/`typecheck`: `verify:closure`, `verify:cli`, `verify:loader`, `verify:profile`, and `verify:licenses` (run via `yarn workspace dsh-plugin-desktop run <script>`). Its own `check` script runs build, typecheck, test, and all `verify:*` scripts in sequence.

## Architecture

DSH Desktop is a thin Electron host around the official DSH Host. Electron's main process starts the Host as a Cordis generation; the Host serves an ordinary Web UI over a loopback HTTP/WebSocket carrier. There is no separate renderer IPC plugin system, and no Electron APIs are exposed to the page.

Boot sequence: Electron acquires the single-instance lock and reads Desktop's private profile/mode state → the Launcher resolves the active profile (without rewriting user profiles just to list them) → the Host Cordis root starts Loader entries, registering Desktop services before third-party plugins can read them → official `dsh-base`, `dsh-web-app`, and the profile's third-party bundles form the Web carrier → the Host binds a loopback port and Electron creates a `BrowserWindow` on that same origin → only after the Web surface loads does Electron create the tray and commit the profile's last-known-good state. Any profile or mode switch disposes the current generation and starts a new one; service references, window objects, and subprocess handles must never be cached across generations.

Two public Cordis services form the supported third-party integration contract (see `dsh-plugin-desktop/docs/plugin-services.md`):
- `desktopProfiles` (`dsh-plugin-desktop/profile-service`) — `current` (immutable per generation), `list()` (read-only), `select(name)` (persists a pending target and restarts).
- `desktopPnpm` (`dsh-plugin-desktop/pnpm`) — `run()` for raw pnpm, `runPlugin()` for DSH-CLI-mediated plugin add/remove/update with profile reconciliation. Only one package operation runs per generation.

`desktopRuntime` and `desktopPnpmBootstrap` are Launcher-private/Desktop-internal and are not a third-party API surface.

Compatibility mode runs the upstream default Web Client unmodified (no Desktop layout/root/sidebar/conversation overrides). Advanced mode installs Desktop-owned layout, frame, and native materials via profile composition, while still respecting upstream and third-party slots.

Packaged builds use Electron Builder with `app.asar`; native/physical-path dependencies (pnpm, node-pty, Windows ACL) live in `app.asar.unpacked`, and profile fallbacks must never symlink into unresolvable virtual ASAR paths.

- `deepseek-harness/` is a pinned upstream Git submodule. Never edit files inside it from a desktop feature branch.
- `dsh-plugin-desktop/` owns the Cordis Host and Client faces, Electron bootstrap, packaging, and release tests.
- `dsh-community-fabric/` owns the community interoperability RFC. Until schemas and a reviewed reference adapter exist, it remains a private documentation scaffold and must not declare loadable DSH or package entry points.
- `dsh-community-market/` owns the community-market shell. Until its runtime is implemented, it remains a private documentation scaffold and must not declare loadable DSH or package entry points.
- The outer repository and all owned packages use the root Yarn release with `nodeLinker: node-modules`.
- The upstream submodule keeps its own pnpm workspace. Run upstream commands through the root `upstream:*` scripts, whose Yarn portable-shell commands enter the submodule before invoking Corepack.
- Compatibility mode must run the upstream default client without overrides. Advanced presentation belongs to desktop-owned client plugins and may replace documented slots or services through profile composition.
- Keep graphical application launch explicit. Builds, typechecks, unit tests, and Loader smokes must remain headless-safe.
- Commit before major changes of direction and keep the submodule pin update separate from desktop behavior changes.
- Keep the repository topology and package-manager split consistent with the [owning Agent Note](.agents/notes/implemented/process/2026-08-15-pinned-upstream-and-isolated-yarn-workspace.md).
