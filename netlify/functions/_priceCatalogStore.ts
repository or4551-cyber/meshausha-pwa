import { getStore } from '@netlify/blobs'
import { createHash } from 'node:crypto'
import {
  CatalogSnapshotSchema,
  ChangeSetSchema,
  type CatalogSnapshot,
  type ChangeSet,
} from '../../shared/priceCatalog/types'

export interface IdempotencyResult {
  changeSetId: string
  version: number
}

export interface PriceCatalogRepository {
  getActive(): Promise<CatalogSnapshot | null>
  getVersion(version: number): Promise<CatalogSnapshot | null>
  saveVersion(snapshot: CatalogSnapshot): Promise<void>
  activateVersion(snapshot: CatalogSnapshot): Promise<void>
  getChangeSet(id: string): Promise<ChangeSet | null>
  saveChangeSet(changeSet: ChangeSet): Promise<void>
  getIdempotencyResult(key: string): Promise<IdempotencyResult | null>
  saveIdempotencyResult(key: string, result: IdempotencyResult): Promise<void>
}

const ACTIVE_KEY = 'active/catalog.json'
const versionKey = (version: number) => 'versions/' + String(version).padStart(8, '0') + '.json'
const changeKey = (id: string) => 'changes/' + id + '.json'
// מפתחות idempotency עוברים hash לפני שמשתמשים בהם בנתיב blob.
const idempotencyKey = (key: string) => 'idempotency/' + createHash('sha256').update(key).digest('hex') + '.json'

// fallback למקרה שהקונטקסט האוטומטי לא זמין — בדיוק כמו settings-api.ts
function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  if (siteID && token) return getStore({ name, siteID, token })
  return getStore(name)
}

export function createBlobPriceCatalogRepository(): PriceCatalogRepository {
  const store = openStore('meshausha-price-catalog')

  const saveVersion = async (snapshot: CatalogSnapshot): Promise<void> => {
    const parsed = CatalogSnapshotSchema.parse(snapshot)
    const existingRaw = await store.get(versionKey(parsed.version), { type: 'json' })
    if (existingRaw) {
      const existing = CatalogSnapshotSchema.parse(existingRaw)
      if (existing.checksum !== parsed.checksum) {
        throw new Error('refusing to overwrite version ' + parsed.version + ' with a different checksum')
      }
      return
    }
    await store.set(versionKey(parsed.version), JSON.stringify(parsed))
  }

  return {
    getActive: async () => {
      const raw = await store.get(ACTIVE_KEY, { type: 'json' })
      return raw ? CatalogSnapshotSchema.parse(raw) : null
    },
    getVersion: async (version) => {
      const raw = await store.get(versionKey(version), { type: 'json' })
      return raw ? CatalogSnapshotSchema.parse(raw) : null
    },
    saveVersion,
    activateVersion: async (snapshot) => {
      const parsed = CatalogSnapshotSchema.parse(snapshot)
      // versions/{n}.json נכתב לפני active/catalog.json
      await saveVersion(parsed)
      await store.set(ACTIVE_KEY, JSON.stringify(parsed))
    },
    getChangeSet: async (id) => {
      const raw = await store.get(changeKey(id), { type: 'json' })
      return raw ? ChangeSetSchema.parse(raw) : null
    },
    saveChangeSet: async (changeSet) => {
      const parsed = ChangeSetSchema.parse(changeSet)
      await store.set(changeKey(parsed.id), JSON.stringify(parsed))
    },
    getIdempotencyResult: async (key) => {
      const raw = await store.get(idempotencyKey(key), { type: 'json' })
      return raw ? (raw as IdempotencyResult) : null
    },
    saveIdempotencyResult: async (key, result) => {
      await store.set(idempotencyKey(key), JSON.stringify(result))
    },
  }
}

// מימוש זהה מבוסס Map לטסטים דטרמיניסטיים (בלי parsing של Zod — מקבל גם snapshots מדומים).
export function createMemoryPriceCatalogRepository(): PriceCatalogRepository {
  let active: CatalogSnapshot | null = null
  const versions = new Map<number, CatalogSnapshot>()
  const changes = new Map<string, ChangeSet>()
  const idempotency = new Map<string, IdempotencyResult>()

  const saveVersion = async (snapshot: CatalogSnapshot): Promise<void> => {
    const existing = versions.get(snapshot.version)
    if (existing && existing.checksum !== snapshot.checksum) {
      throw new Error('refusing to overwrite version ' + snapshot.version + ' with a different checksum')
    }
    versions.set(snapshot.version, snapshot)
  }

  return {
    getActive: async () => active,
    getVersion: async (version) => versions.get(version) ?? null,
    saveVersion,
    activateVersion: async (snapshot) => {
      await saveVersion(snapshot)
      active = snapshot
    },
    getChangeSet: async (id) => changes.get(id) ?? null,
    saveChangeSet: async (changeSet) => { changes.set(changeSet.id, changeSet) },
    getIdempotencyResult: async (key) => idempotency.get(key) ?? null,
    saveIdempotencyResult: async (key, result) => { idempotency.set(key, result) },
  }
}
