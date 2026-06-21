import { describe, expect, it, beforeEach, vi } from 'vitest'

// ה-store משתמש ב-zustand persist (localStorage). בסביבת node מספקים stub בזיכרון לפני הייבוא.
vi.hoisted(() => {
  const m = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  }
})

import { useSuppliersStore, type Product } from '../../src/stores/suppliersStore'

const p = (id: string): Product => ({ id, name: id, supplier: 'S', price: 10 })

describe('suppliersStore.replaceCatalogProducts — monotonic', () => {
  beforeEach(() => {
    useSuppliersStore.setState({ products: [], catalogVersion: 0 })
  })

  it('applies a strictly newer version', () => {
    useSuppliersStore.getState().replaceCatalogProducts([p('a')], 3)
    expect(useSuppliersStore.getState().catalogVersion).toBe(3)
    expect(useSuppliersStore.getState().products.map(x => x.id)).toEqual(['a'])
  })

  it('ignores an older version (out-of-order sync cannot clobber a just-committed snapshot)', () => {
    const s = useSuppliersStore.getState()
    s.replaceCatalogProducts([p('a')], 5)
    s.replaceCatalogProducts([p('b')], 4) // ישן — מתעלם
    expect(useSuppliersStore.getState().catalogVersion).toBe(5)
    expect(useSuppliersStore.getState().products.map(x => x.id)).toEqual(['a'])
  })

  it('ignores an equal version (idempotent)', () => {
    const s = useSuppliersStore.getState()
    s.replaceCatalogProducts([p('a')], 5)
    s.replaceCatalogProducts([p('c')], 5) // שווה — מתעלם
    expect(useSuppliersStore.getState().products.map(x => x.id)).toEqual(['a'])
  })
})
