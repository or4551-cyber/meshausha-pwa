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

describe('suppliersStore.reconcileCatalogProducts — authoritative on initial load', () => {
  beforeEach(() => {
    useSuppliersStore.setState({ products: [], catalogVersion: 0 })
  })

  it('replaces products even when the version is EQUAL (unlike replaceCatalogProducts)', () => {
    const s = useSuppliersStore.getState()
    s.reconcileCatalogProducts([p('a')], 4)
    // גרסה זהה — reconcile עדיין דורס (מנקה מוצרים ישנים/כפולים שהצטברו מקומית)
    s.reconcileCatalogProducts([p('b')], 4)
    expect(useSuppliersStore.getState().products.map(x => x.id)).toEqual(['b'])
    expect(useSuppliersStore.getState().catalogVersion).toBe(4)
  })

  it('advances the version monotonically (Math.max) and never downgrades', () => {
    const s = useSuppliersStore.getState()
    s.reconcileCatalogProducts([p('a')], 5)
    s.reconcileCatalogProducts([p('b')], 3) // גרסה נמוכה יותר
    // המוצרים מתעדכנים לרשימה הטרייה, אך הגרסה לא יורדת מתחת ל-5
    expect(useSuppliersStore.getState().products.map(x => x.id)).toEqual(['b'])
    expect(useSuppliersStore.getState().catalogVersion).toBe(5)
  })

  it('cleans a polluted local store (old + new) down to the authoritative list', () => {
    useSuppliersStore.setState({
      products: [p('new1'), p('new2'), p('old_stale')],
      catalogVersion: 4,
    })
    // הקטלוג המרכזי הטרי (נקי) מגיע באותה גרסה — reconcile מיישר אליו
    useSuppliersStore.getState().reconcileCatalogProducts([p('new1'), p('new2')], 4)
    const ids = useSuppliersStore.getState().products.map(x => x.id)
    expect(ids).toEqual(['new1', 'new2'])
    expect(ids).not.toContain('old_stale')
  })
})
