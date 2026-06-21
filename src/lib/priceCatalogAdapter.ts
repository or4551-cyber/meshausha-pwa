// ממיר את מודל הקטלוג המרכזי (CatalogProduct/CatalogSnapshot) למודל ה-Product הישן
// שבו האפליקציה משתמשת (store/הזמנות). שדות nullable של הקטלוג ממופים ל-undefined
// (לא null) כדי שלא ידלפו null-ים למבנה הישן.

import type {
  CatalogProduct,
  CatalogSupplier,
  CatalogSnapshot,
  CatalogUnit,
} from '../../shared/priceCatalog/types'

export interface LegacyCatalogProduct {
  id: string
  name: string
  supplier: string
  price: number
  category?: string
  adminOnly?: boolean
  // שדות מקור-קטלוג (קיימים רק כשהמוצר הגיע מהקטלוג המרכזי)
  supplierId: string
  supplierSku?: string
  packageQuantity?: number
  unit?: CatalogUnit
  unitPrice?: number
  effectiveFrom?: string
  sourceId: string
  updatedAt: string
}

// null → undefined, כדי לא לזהם את ה-Product הישן ב-null-ים.
function orUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

export function catalogProductToLegacy(
  product: CatalogProduct,
  supplier: CatalogSupplier,
): LegacyCatalogProduct {
  return {
    id: product.id,
    name: product.name,
    supplier: supplier.name,
    price: product.packagePrice,
    category: orUndefined(product.category),
    adminOnly: product.adminOnly,
    supplierId: product.supplierId,
    supplierSku: orUndefined(product.supplierSku),
    packageQuantity: orUndefined(product.packageQuantity),
    unit: orUndefined(product.unit),
    unitPrice: orUndefined(product.unitPrice),
    effectiveFrom: orUndefined(product.effectiveFrom),
    sourceId: product.sourceId,
    updatedAt: product.updatedAt,
  }
}

// ממיר snapshot (או חלקיו: suppliers+products) לרשימת Product ישנים. כולל רק מוצרים
// פעילים (active), ומדלג על מוצר שספקו חסר (אינטגריטי). מקבל Pick כדי שה-API client
// יוכל להרכיב את התוצאה מעמודים (pagination) בלי לזייף snapshot מלא.
export function adaptCatalogSnapshot(
  snapshot: Pick<CatalogSnapshot, 'suppliers' | 'products'>,
): LegacyCatalogProduct[] {
  const supplierById = new Map(snapshot.suppliers.map(s => [s.id, s]))
  const out: LegacyCatalogProduct[] = []
  for (const product of snapshot.products) {
    if (!product.active) continue
    const supplier = supplierById.get(product.supplierId)
    if (!supplier) {
      // לא אמור לקרות (אינטגריטי השרת מבטיח ספק לכל מוצר). מתעדים כדי שלא ייעלם בשקט.
      console.warn(`[catalog] מדלג על מוצר ${product.id}: ספק ${product.supplierId} חסר ב-snapshot`)
      continue
    }
    out.push(catalogProductToLegacy(product, supplier))
  }
  return out
}
