/** Headless smoke for the complete published DSH Web profile and renderer manifest. */

import { randomUUID } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { boot } from '@deepseek-ai/dsh-app-boot'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import {
  createLaunchEnvironmentSnapshot,
  DSH_LAUNCH_ENVIRONMENT_KEY,
} from '@deepseek-ai/dsh-launch-environment'
import { CallId } from '@deepseek-ai/dsh-llm'
import { DESKTOP_SETTINGS_NAMESPACE } from '../lib/index.js'
import { installDesktopPnpmRuntime } from '../lib/desktop-runtime-environment.js'
import { installProfilePackageResolver } from '../lib/module-resolution.js'
import { prepareDesktopProfile } from '../lib/profile.js'
import { DesktopProfileService } from '../lib/profile-service.js'
import { SessionId } from '@deepseek-ai/dsh-session'

const BIN_NAME = 'dsh-plugin-desktop-profile-smoke'
const HOST_SERVICE_PLUGIN_NAME = 'dsh-desktop-host-services-smoke-plugin'
const HOST_SERVICE_PROBE_KEY = 'desktopHostServiceProbe'
const home = mkdtempSync(join(tmpdir(), 'dsh-desktop-profile-'))
let ctx
let releasePackageResolver
let pnpmRuntime
let mountedSpec
let nativeThemeSource = 'system'
const trayItems = []

try {
  writeFileSync(join(home, 'settings.yaml'), [
    'dsh-desktop:',
    '  mode: advanced',
    'agent-presets:',
    '  default: short-drama',
    '',
  ].join('\n'))
  const prepared = prepareDesktopProfile('1', home, 'win32')
  const hostServicePluginDir = join(
    prepared.profile.dir,
    'node_modules',
    HOST_SERVICE_PLUGIN_NAME,
  )
  mkdirSync(join(prepared.profile.dir, 'node_modules'), { recursive: true })
  cpSync(
    fileURLToPath(new URL('../tests/fixtures/desktop-host-services-smoke-plugin/', import.meta.url)),
    hostServicePluginDir,
    { recursive: true, force: false, errorOnExist: true },
  )
  const patches = [
    // Deliberately compose the consumer before the desktop-pnpm provider row.
    // Its required injection must keep it pending until that service mounts.
    {
      insert: [{
        id: 'desktop-host-services-smoke-plugin',
        name: HOST_SERVICE_PLUGIN_NAME,
      }],
    },
    ...prepared.patches,
  ]
  const packageRoot = new URL('../', import.meta.url)
  const pnpmBinPath = fileURLToPath(new URL('node_modules/pnpm/bin/pnpm.mjs', packageRoot))
  const electronVersion = JSON.parse(
    readFileSync(new URL('node_modules/electron/package.json', packageRoot), 'utf8'),
  ).version
  pnpmRuntime = installDesktopPnpmRuntime({
    platform: process.platform,
    appExecutable: process.execPath,
    pnpmBinPath,
    electronVersion,
    stateDir: join(home, 'runtime-commands'),
    environment: process.env,
  })
  releasePackageResolver = installProfilePackageResolver(prepared.bareModuleBaseUrl)
  const runtime = {
    platform: 'win32',
    windowsBuild: 22_631,
    locale: 'en',
    updates: {
      isPackaged: false,
      canDownload: true,
      currentVersion: '2.0.0',
      statePath: join(home, 'update-state.json'),
      request: async () => { throw new Error('profile smoke must not perform update requests') },
      confirmDownload: async () => false,
      showManualCheckResult: async () => {},
      downloadAndOpen: async () => {},
      notify: () => {},
    },
    schedule(spec) {
      mountedSpec = spec
      return async () => {}
    },
    async mountScheduled() {
      if (mountedSpec === undefined) throw new Error('desktop shell was not registered')
      runtime.setLocalePreference(mountedSpec.readLocalePreference())
      nativeThemeSource = mountedSpec.readThemeSource()
    },
    show() {},
    registerTrayItem(item) {
      trayItems.push(item)
      return {
        refresh() {},
        dispose() {
          const index = trayItems.indexOf(item)
          if (index >= 0) trayItems.splice(index, 1)
        },
      }
    },
    openTerminal() {},
    setLocalePreference(preference) { runtime.locale = preference ?? 'en' },
    setThemeSource(source) { nativeThemeSource = source },
    async requestRestart() {},
    prepareToQuit() {},
  }
  ctx = await boot(
    BIN_NAME,
    prepared.rootConfig,
    patches,
    async (host) => {
      host.provide(DSH_LAUNCH_ENVIRONMENT_KEY, createLaunchEnvironmentSnapshot([]))
      host.provide('desktopRuntime', runtime)
      host.provide('desktopPnpmBootstrap', {
        activeProfileName: 'desktop',
        activeProfileDir: prepared.profile.dir,
        homeDir: prepared.homeDir,
        appExecutable: process.execPath,
        pnpmBinPath,
        electronVersion,
        nodeBinDir: pnpmRuntime.nodeBinDir,
        nodeShimPath: pnpmRuntime.nodeShimPath,
        clearEnvironmentPath: pnpmRuntime.clearEnvironmentPath,
        dshBootstrapPath: fileURLToPath(new URL('../lib/desktop-cli.js', import.meta.url)),
        installRecoveryStatePath: join(home, 'plugin-install-recovery', 'state.json'),
        generationId: 'profile-smoke-generation',
        externalMarketInstallEnabled: prepared.market.effective === 'dsh-market',
      })
      await host.plugin(DesktopProfileService, {
        current: {
          name: 'desktop',
          dir: prepared.profile.dir,
        },
        list: () => [{
          name: 'desktop',
          dir: prepared.profile.dir,
          exists: true,
          bundles: prepared.profile.layers.map(layer => layer.packageName),
          webCapable: true,
        }],
        persistSelection: () => {},
        requestRestart: () => {},
      })
      provideCmdline(host, {
        args: ['--host', '127.0.0.1', '--port', '0'],
        exit: () => {},
      })
    },
    prepared.bareModuleBaseUrl,
  )
  await runtime.mountScheduled()

  if (ctx.get('desktopPnpm') === undefined) {
    throw new Error('assembled desktop profile is missing the desktop pnpm Host capability')
  }
  if (ctx.desktopProfiles.current.name !== 'desktop'
    || ctx.desktopProfiles.current.dir !== prepared.profile.dir) {
    throw new Error('assembled desktop profile service has the wrong active identity')
  }
  const agentPresets = ctx.get('agentPresets')
  if (agentPresets === undefined) {
    throw new Error('assembled Windows profile is missing the agent preset roster')
  }
  const presetIds = (await agentPresets.list()).map(preset => preset.id)
  if (presetIds.sort().join(',') !== 'cordis,short-drama') {
    throw new Error(`assembled Windows profile exposes unexpected presets: ${presetIds.join(', ')}`)
  }
  if (agentPresets.defaultId !== 'short-drama') {
    throw new Error(`assembled Windows profile selected unsupported default ${agentPresets.defaultId}`)
  }
  const screenplayPreset = await agentPresets.resolve('short-drama')
  if (screenplayPreset.id !== 'short-drama') {
    throw new Error(`assembled Windows profile could not resolve short-drama: ${screenplayPreset.id}`)
  }
  const screenplayHandle = await ctx.agents.create({
    sessionId: SessionId(`short-drama-profile-smoke-${randomUUID()}`),
    setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'short-drama').then(() => undefined),
  })
  try {
    const screenplayTools = new Set(ctx.tools.schemas(screenplayHandle.agent).map(tool => tool.name))
    for (const name of [
      'read',
      'read_image',
      'write',
      'edit',
      'move',
      'delete',
      'glob',
      'grep',
      'web_search',
      'skill',
      'read_document',
      'skill_create',
      'ask_user_question',
    ]) {
      if (!screenplayTools.has(name)) {
        throw new Error(`short-drama Agent is missing composed tool ${name}`)
      }
    }
    const uploadTools = screenplayTools.has('read_document')
    if (!uploadTools) {
      throw new Error('short-drama Agent is missing the dsh-file-upload read_document tool')
    }
    for (const name of [
      'todo_write',
      'exit_plan_mode',
      'screenplay_review_lens',
      'read_project_context',
      'write_episode',
      'screenplay_create_contract',
      'screenplay_create_outline',
      'screenplay_create_episode_outline_batch',
      'screenplay_edit_file',
      'screenplay_merge_delivery',
      'validate_episode',
      'diagnose_episode',
      'bash',
      'pwsh',
      'run_code',
    ]) {
      if (screenplayTools.has(name)) {
        throw new Error(`short-drama Agent unexpectedly exposes removed tool ${name}`)
      }
    }
    const skill = await ctx.skills.get('short-drama-zonggang', { scope: screenplayHandle.agent })
    if (skill?.provider !== 'filesystem' || skill.resourceBase?.kind !== 'directory') {
      throw new Error('short-drama Agent could not load its scoped Skill')
    }
    if (await ctx.skills.get('short-drama-zonggang') !== undefined) {
      throw new Error('short-drama scoped Skill leaked into the global catalog')
    }
    const reference = await ctx.tools.execute({
      callId: CallId('short-drama-skill-reference'),
      name: 'read_skill_reference',
      arguments: {
        skill: 'short-drama-zonggang',
        path: 'references/00_情绪账务引擎.md',
      },
      signal: new AbortController().signal,
      agent: screenplayHandle.agent,
    })
    if (reference.isError
      || reference.value?.provider !== 'filesystem'
      || !String(reference.value?.content).includes('情绪')) {
      throw new Error(`short-drama Agent could not read its Skill reference: ${JSON.stringify(reference)}`)
    }
    for (const path of ['../outside.md', '/tmp/outside.md']) {
      const escaped = await ctx.tools.execute({
        callId: CallId(`short-drama-skill-escape-${path.startsWith('/') ? 'absolute' : 'parent'}`),
        name: 'read_skill_reference',
        arguments: { skill: 'short-drama-zonggang', path },
        signal: new AbortController().signal,
        agent: screenplayHandle.agent,
      })
      if (!escaped.isError || !JSON.stringify(escaped.content).includes('relative to that Skill')) {
        throw new Error(`short-drama Skill reference accepted escaped path ${path}: ${JSON.stringify(escaped)}`)
      }
    }
    const unscoped = await ctx.tools.execute({
      callId: CallId('short-drama-skill-reference-unscoped'),
      name: 'read_skill_reference',
      arguments: {
        skill: 'short-drama-zonggang',
        path: 'references/00_情绪账务引擎.md',
      },
      signal: new AbortController().signal,
    })
    if (!unscoped.isError
      || !JSON.stringify(unscoped.error).includes('Session attached to a Workspace')) {
      throw new Error(`read_skill_reference was callable without an Agent session scope: ${JSON.stringify(unscoped)}`)
    }
  } finally {
    await screenplayHandle.dispose()
  }
  const cordisHandle = await ctx.agents.create({
    sessionId: SessionId(`cordis-skill-isolation-profile-smoke-${randomUUID()}`),
    setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'cordis').then(() => undefined),
  })
  try {
    if (await ctx.skills.get('short-drama-zonggang', { scope: cordisHandle.agent }) !== undefined) {
      throw new Error('short-drama scoped Skill leaked into the cordis Agent catalog')
    }
  } finally {
    await cordisHandle.dispose()
  }
  const hostServiceProbe = ctx.get(HOST_SERVICE_PROBE_KEY)
  if (hostServiceProbe?.current?.name !== 'desktop'
    || hostServiceProbe.current.dir !== prepared.profile.dir
    || hostServiceProbe.pnpm?.serviceName !== 'desktopPnpm'
    || hostServiceProbe.pnpm.lookupRun !== 'function'
    || hostServiceProbe.pnpm.run !== 'function'
    || hostServiceProbe.pnpm.runPlugin !== 'function'
    || hostServiceProbe.pnpm.installPlugin !== 'function'
    || hostServiceProbe.pnpm.recoveredInstallReceiptIds !== 'function'
    || hostServiceProbe.pnpm.acknowledgeRecoveredInstall !== 'function'
    || hostServiceProbe.pnpm.rollbackPluginInstall !== 'function') {
    throw new Error(
      `profile-local Host service plugin produced an unexpected probe: ${JSON.stringify(hostServiceProbe)}`,
    )
  }

  const picker = ctx.directoryPicker.capability()
  if (picker.kind !== 'browse') {
    throw new Error(`assembled Windows profile selected ${picker.kind} directory picker`)
  }
  const listing = await picker.list(home)
  if (listing.path !== home) {
    throw new Error(`assembled Windows browse picker listed ${listing.path} instead of ${home}`)
  }

  const expectedUrl = `http://127.0.0.1:${String(ctx.webServer.port)}/?dsh-desktop-entry=3&dsh-desktop-mode=advanced&dsh-desktop-platform=win32&dsh-desktop-material=off&dsh-desktop-mica=1`
  if (mountedSpec?.url !== expectedUrl) {
    throw new Error(`desktop plugin produced an unexpected renderer URL: ${String(mountedSpec?.url)}`)
  }
  if (mountedSpec?.mode !== 'advanced') {
    throw new Error(`desktop plugin produced an unexpected shell mode: ${String(mountedSpec?.mode)}`)
  }
  if (nativeThemeSource !== 'system') {
    throw new Error(`desktop plugin produced an unexpected native theme source: ${nativeThemeSource}`)
  }
  const desktopSettings = ctx.settings.get(DESKTOP_SETTINGS_NAMESPACE)
  if (desktopSettings?.mode !== 'advanced') {
    throw new Error('assembled Host settings are missing the advanced dsh-desktop mode')
  }
  if (!trayItems.some(item => item.label() === 'Check for Updates…')) {
    throw new Error('assembled desktop profile is missing the update tray command')
  }
  if (trayItems.some(item => item.label() === 'Open Terminal')) {
    throw new Error('assembled desktop profile unexpectedly exposes the terminal tray command')
  }
  if (trayItems.some(item => item.label() === 'Profile: desktop')) {
    throw new Error('assembled desktop profile unexpectedly exposes the launcher profile tray submenu')
  }
  const response = await fetch(expectedUrl)
  const html = await response.text()
  if (response.status !== 200) {
    throw new Error(`assembled Web root returned HTTP ${String(response.status)}`)
  }
  const bootMatch = html.match(/(?:window\.__DSH_BOOT__|globalThis\["__DSH_BOOT__"\]) = (\{.*?\})<\/script>/u)
  if (bootMatch?.[1] === undefined) {
    throw new Error('assembled Web root is missing window.__DSH_BOOT__')
  }
  const graph = JSON.parse(bootMatch[1])
  const ids = new Set(graph.entries.map(entry => entry.id))
  for (const id of [
    'dsh-plugin-desktop',
    'dsh-file-upload',
    '@deepseek-ai/dsh-client-ui-conversation',
    '@deepseek-ai/dsh-client-ui-sidebar',
    '@deepseek-ai/dsh-client-ui-directory-picker-browse',
  ]) {
    if (!ids.has(id)) throw new Error(`assembled advanced Web graph is missing ${id}`)
  }
  for (const id of [
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-directory-picker-native',
  ]) {
    if (ids.has(id)) throw new Error(`assembled advanced Web graph unexpectedly includes ${id}`)
  }
} finally {
  await ctx?.fiber.dispose()
  releasePackageResolver?.()
  pnpmRuntime?.dispose()
  rmSync(home, { recursive: true, force: true })
}
