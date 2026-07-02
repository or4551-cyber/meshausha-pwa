import { describe, expect, it } from 'vitest'
import {
  PRODUCTS,
  TERRA_PLAST_PRODUCTS,
  TERRA_PLAST_SUPPLIER,
  applyCatalogV1,
  type Product,
} from '../../src/data/products'

// מגן-כפילויות (guard) על קטלוג-המקור הסטטי. נכשל אם עדכון-מחירון עתידי יכניס כפילות
// ל-src/data/products.ts — בדיוק המקור של "משפחת באג 1" (טרה פלסט הופיע פעמיים).
// זה שער-איכות שרץ ב-`npm test` לפני deploy.

function duplicatesBy<T>(items: T[], keyOf: (x: T) => string): string[] {
  const counts = new Map<string, number>()
  for (const it of items) {
    const k = keyOf(it)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, c]) => c > 1).map(([k, c]) => `${c}× ${k}`)
}

const keyName = (p: Product) => `${p.supplier}|${p.name}`
const keyId = (p: Product) => p.id

describe('products catalog — no duplicates (guards Bug 1 class)', () => {
  it('PRODUCTS has no duplicate supplier|name', () => {
    const dups = duplicatesBy(PRODUCTS, keyName)
    expect(dups, `כפילות supplier|name ב-PRODUCTS:\n${dups.join('\n')}`).toEqual([])
  })

  it('PRODUCTS has no duplicate id', () => {
    const dups = duplicatesBy(PRODUCTS, keyId)
    expect(dups, `כפילות id ב-PRODUCTS:\n${dups.join('\n')}`).toEqual([])
  })

  it('TERRA_PLAST_PRODUCTS (authoritative list) has no duplicate name or id', () => {
    expect(duplicatesBy(TERRA_PLAST_PRODUCTS, p => p.name)).toEqual([])
    expect(duplicatesBy(TERRA_PLAST_PRODUCTS, keyId)).toEqual([])
  })
})

describe('applyCatalogV1 — cleans + idempotent', () => {
  const oldTerra: Product[] = [
    { id: 'old_a', name: 'שם-טרה-ישן א', supplier: TERRA_PLAST_SUPPLIER, price: 5 },
    { id: 'old_b', name: 'שם-טרה-ישן ב', supplier: TERRA_PLAST_SUPPLIER, price: 6 },
  ]
  const other: Product = { id: 'x1', name: 'מוצר אחר', supplier: 'ספק אחר', price: 9 }

  it('removes stale Terra products and restores the authoritative Terra list (no dupes)', () => {
    const polluted = [...PRODUCTS, ...oldTerra]
    const cleaned = applyCatalogV1(polluted)
    const terra = cleaned.filter(p => p.supplier === TERRA_PLAST_SUPPLIER)
    expect(terra.length).toBe(TERRA_PLAST_PRODUCTS.length)
    expect(duplicatesBy(terra, p => p.name)).toEqual([])
    // המוצרים הישנים המזויפים נעלמו
    expect(cleaned.some(p => p.id === 'old_a' || p.id === 'old_b')).toBe(false)
  })

  it('is idempotent (running twice yields the same result)', () => {
    const once = applyCatalogV1([...PRODUCTS, ...oldTerra, other])
    const twice = applyCatalogV1(once)
    expect(twice.map(keyId).sort()).toEqual(once.map(keyId).sort())
  })

  it('preserves non-Terra products (e.g. other suppliers untouched)', () => {
    const cleaned = applyCatalogV1([...PRODUCTS, other])
    expect(cleaned.some(p => p.id === 'x1')).toBe(true)
  })
})
