import { describe, expect, it } from 'vitest'
import { createMemoryPriceCatalogRepository } from '../../netlify/functions/_priceCatalogStore'
import type { CatalogSnapshot, ChangeSet } from '../../shared/priceCatalog/types'

describe('price catalog repository', () => {
  it('writes an immutable version before activating it', async () => {
    const repo = createMemoryPriceCatalogRepository()
    const snapshot = { version: 1 } as CatalogSnapshot
    await repo.saveVersion(snapshot)
    expect(await repo.getActive()).toBeNull()
    await repo.activateVersion(snapshot)
    expect((await repo.getActive())?.version).toBe(1)
    expect((await repo.getVersion(1))?.version).toBe(1)
  })

  it('persists change sets and idempotency results', async () => {
    const repo = createMemoryPriceCatalogRepository()
    const change = { id: 'c1' } as ChangeSet
    await repo.saveChangeSet(change)
    expect((await repo.getChangeSet('c1'))?.id).toBe('c1')
    await repo.saveIdempotencyResult('key-1', { changeSetId: 'c1', version: 2 })
    expect(await repo.getIdempotencyResult('key-1')).toEqual({ changeSetId: 'c1', version: 2 })
  })

  it('exposes the active change set id for idempotent recovery', async () => {
    const repo = createMemoryPriceCatalogRepository()
    const snapshot = { version: 2, changeSetId: 'c9' } as CatalogSnapshot
    await repo.activateVersion(snapshot)
    expect((await repo.getActive())?.changeSetId).toBe('c9')
  })
})
