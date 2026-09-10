import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { LocalResourcesSection } from './LocalResourcesSection.tsx'
import { localResourcesApi } from './local-resources-api.ts'
import { en, zh, type LocalResourcesKey } from './local-resources-locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'desktop.resources': LocalResourcesKey }
}
export function applyLocalResources(ctx: ClientContext): void {
  const namespace = 'desktop.resources'
  const t = ctx.locale.bind(namespace)
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }), 'desktop: local resource dictionaries')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'local-resources', order: 95,
    label: () => t('nav'), locale: namespace, inject: () => ({ api: localResourcesApi }),
  }, LocalResourcesSection))
}
