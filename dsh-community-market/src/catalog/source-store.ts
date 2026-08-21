import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import type { MarketInstallReceipt } from '../api-types.js'
import type { CatalogSnapshot } from '../contracts/generated/catalog-snapshot.js'
import { validateLocalSourceRecords } from '../contracts/validate.js'
import type { CatalogSourceStore, LocalSourceRecord } from '../contracts/types.js'

/** The desktop product ships one reviewed catalog, not a user-configurable source list. */
export const QNOVEL_CATALOG_HOSTNAME = 'plugins.zenwit.cn'

export const QNOVEL_CATALOG_SOURCE: LocalSourceRecord = {
  sourceRecordId: '0198f152-4f80-7b22-bf15-6c1084fa6e51',
  registrationKind: 'user-added',
  adapterId: 'market.standard-http-v1',
  providerId: 'com.qnovel.plugins',
  manifestUrl: `https://${QNOVEL_CATALOG_HOSTNAME}/v1/catalog-source.json`,
  manifest: {
    manifestVersion: '1.0.0',
    providerId: 'com.qnovel.plugins',
    name: 'QNovel Plugin Market',
    description: 'Official QNovel plugin catalog.',
    homepage: `https://${QNOVEL_CATALOG_HOSTNAME}`,
    attribution: { name: 'QNovel', url: `https://${QNOVEL_CATALOG_HOSTNAME}` },
    transport: { kind: 'https-json', endpoint: `https://${QNOVEL_CATALOG_HOSTNAME}/v1/plugins`, method: 'GET' },
    query: { supported: ['q', 'category', 'cursor', 'limit'], defaultLimit: 50, maxLimit: 100, sorts: [] },
  },
  enabled: true,
  order: 0,
}

export interface MarketCatalogCache {
  readonly version: 1
  readonly sourceRecordId: string
  readonly locale: string
  readonly savedAt: string
  readonly snapshot: CatalogSnapshot
  readonly categories: readonly string[]
  readonly scannedAt: string
  readonly expiresAt: string
  readonly providerRevision?: string
}

export interface MarketSettingsDocument {
  readonly sources: readonly LocalSourceRecord[]
  readonly installReceipts?: readonly MarketInstallReceipt[]
  readonly catalogCache?: MarketCatalogCache
}

/**
 * Reconcile legacy multi-enabled settings into the single active-source model.
 * The first enabled record by user order wins. An all-disabled registry keeps
 * its explicit no-selection state.
 */
export function normalizeActiveSourceRecords(
  records: readonly LocalSourceRecord[],
): readonly LocalSourceRecord[] {
  const ordered = [...records].sort((left, right) => left.order - right.order)
  const activeSourceRecordId = ordered.find(record => record.enabled)?.sourceRecordId
  return ordered.map(record => ({
    ...record,
    enabled: record.sourceRecordId === activeSourceRecordId,
  }))
}

export class SettingsCatalogSourceStore implements CatalogSourceStore {
  constructor(private readonly scope: SettingsScope<MarketSettingsDocument>) {}

  async load(): Promise<readonly LocalSourceRecord[]> {
    const records = [...this.scope.get().sources]
    validateLocalSourceRecords(records)
    return normalizeActiveSourceRecords(records)
  }

  async save(records: readonly LocalSourceRecord[]): Promise<void> {
    const normalized = normalizeActiveSourceRecords(records)
    validateLocalSourceRecords(normalized)
    await this.scope.update({ sources: normalized })
  }
}

/** Ignores legacy source settings so QNovel always loads its official catalog. */
export class QNovelCatalogSourceStore implements CatalogSourceStore {
  async load(): Promise<readonly LocalSourceRecord[]> {
    return [QNOVEL_CATALOG_SOURCE]
  }

  async save(): Promise<void> {
    throw new Error('QNovel plugin catalog is managed by QNovel')
  }
}

export class MemoryCatalogSourceStore implements CatalogSourceStore {
  private records: readonly LocalSourceRecord[] = []

  async load(): Promise<readonly LocalSourceRecord[]> {
    return this.records
  }

  async save(records: readonly LocalSourceRecord[]): Promise<void> {
    const normalized = normalizeActiveSourceRecords(records)
    validateLocalSourceRecords(normalized)
    this.records = normalized.map(record => ({ ...record }))
  }
}
