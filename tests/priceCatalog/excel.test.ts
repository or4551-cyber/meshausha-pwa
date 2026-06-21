import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildCatalogWorkbook } from '../../netlify/functions/_priceCatalogExcel'
import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'
import { PRODUCTS, INITIAL_SUPPLIERS } from '../../src/data/products'

describe('catalog Excel export', () => {
  it('creates summary plus one sheet per supplier', () => {
    const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, '2026-06-20T00:00:00.000Z')
    const workbook = XLSX.read(buildCatalogWorkbook(seed), { type: 'buffer' })
    expect(workbook.SheetNames).toHaveLength(9)
    expect(workbook.SheetNames[0]).toBe('סיכום')
  })

  it('exports every product exactly once with pre-VAT package price', () => {
    const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, '2026-06-20T00:00:00.000Z')
    const workbook = XLSX.read(buildCatalogWorkbook(seed), { type: 'buffer' })
    const rows = workbook.SheetNames.slice(1).flatMap(name =>
      XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name]),
    )
    expect(rows).toHaveLength(291)
    expect(rows.every(row => typeof row['מחיר אריזה לפני מע״מ'] === 'number')).toBe(true)
  })
})
