import * as XLSX from 'xlsx'
import type { CatalogProduct, CatalogSnapshot } from '../../shared/priceCatalog/types'

const SUMMARY_SHEET = 'סיכום'

// שמות גיליון ב-Excel מוגבלים ל-31 תווים ואסורים בהם : \ / ? * [ ]. מבטיח ייחודיות.
function sanitizeSheetName(name: string, used: Set<string>): string {
  const base = (name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31)) || 'גיליון'
  let candidate = base
  let counter = 2
  while (used.has(candidate)) {
    const suffix = ' ' + counter
    candidate = base.slice(0, 31 - suffix.length) + suffix
    counter++
  }
  used.add(candidate)
  return candidate
}

export function buildCatalogWorkbook(snapshot: CatalogSnapshot): Buffer {
  const workbook = XLSX.utils.book_new()
  const suppliers = [...snapshot.suppliers].sort((a, b) => a.name.localeCompare(b.name, 'he'))

  const productsBySupplier = new Map<string, CatalogProduct[]>()
  for (const product of snapshot.products) {
    const list = productsBySupplier.get(product.supplierId) ?? []
    list.push(product)
    productsBySupplier.set(product.supplierId, list)
  }

  // ---- גיליון סיכום ----
  const summaryRows = suppliers.map(supplier => {
    const list = productsBySupplier.get(supplier.id) ?? []
    return {
      'ספק': supplier.name,
      'מוצרים פעילים': list.filter(p => p.active).length,
      'תאריך מחירון אחרון': supplier.lastPriceListAt ?? '',
      'מוצרים ללא כמות אריזה': list.filter(p => p.packageQuantity === null).length,
      'גרסת קטלוג': snapshot.version,
    }
  })
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
  if (summarySheet['!ref']) summarySheet['!autofilter'] = { ref: summarySheet['!ref'] }
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, SUMMARY_SHEET)

  // ---- גיליון לכל ספק ----
  const used = new Set<string>([SUMMARY_SHEET])
  for (const supplier of suppliers) {
    const list = [...(productsBySupplier.get(supplier.id) ?? [])].sort((a, b) => {
      const byCategory = (a.category ?? '').localeCompare(b.category ?? '', 'he')
      return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name, 'he')
    })
    const rows = list.map(product => ({
      'קוד פנימי': product.id,
      'מק״ט ספק': product.supplierSku ?? '',
      'מוצר': product.name,
      'קטגוריה': product.category ?? '',
      'מחיר אריזה לפני מע״מ': product.packagePrice,
      'כמות באריזה': product.packageQuantity ?? '',
      'יחידה': product.unit ?? '',
      'מחיר ליחידה': product.unitPrice ?? '',
      'תאריך תחולה': product.effectiveFrom ?? '',
      'עודכן לאחרונה': product.updatedAt,
      'סטטוס': product.active ? 'פעיל' : 'לא פעיל',
      'מקור': product.sourceId,
    }))
    const sheet = XLSX.utils.json_to_sheet(rows)
    if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] }
    sheet['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 36 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
      { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 10 },
    ]
    XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(supplier.name, used))
  }

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}
