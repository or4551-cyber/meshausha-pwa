import { z } from 'zod'

export const CatalogUnitSchema = z.enum(['unit', 'kg', 'liter', 'roll', 'pack'])

export const CatalogSupplierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  active: z.boolean(),
  pricesExcludeVat: z.literal(true),
  lastPriceListAt: z.string().datetime().nullable(),
})

export const CatalogProductSchema = z.object({
  id: z.string().min(1),
  supplierId: z.string().min(1),
  supplierSku: z.string().min(1).nullable(),
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  aliases: z.array(z.string()),
  category: z.string().min(1).nullable(),
  packagePrice: z.number().finite().positive(),
  packageQuantity: z.number().finite().positive().nullable(),
  unit: CatalogUnitSchema.nullable(),
  unitPrice: z.number().finite().positive().nullable(),
  effectiveFrom: z.string().datetime().nullable(),
  active: z.boolean(),
  adminOnly: z.boolean(),
  sourceId: z.string().min(1),
  updatedAt: z.string().datetime(),
})

export const CatalogSnapshotSchema = z.object({
  version: z.number().int().positive(),
  previousVersion: z.number().int().positive().nullable(),
  changeSetId: z.string().min(1),
  createdAt: z.string().datetime(),
  checksum: z.string().min(1),
  suppliers: z.array(CatalogSupplierSchema),
  products: z.array(CatalogProductSchema),
})

const ProductPatchSchema = CatalogProductSchema.pick({
  supplierSku: true,
  name: true,
  normalizedName: true,
  aliases: true,
  category: true,
  packagePrice: true,
  packageQuantity: true,
  unit: true,
  unitPrice: true,
  effectiveFrom: true,
  active: true,
  adminOnly: true,
  sourceId: true,
  updatedAt: true,
}).partial()

export const ChangeOperationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('addSupplier'), supplier: CatalogSupplierSchema }),
  z.object({ type: z.literal('addProduct'), product: CatalogProductSchema }),
  z.object({
    type: z.literal('updateProduct'),
    productId: z.string().min(1),
    patch: ProductPatchSchema,
  }),
  z.object({ type: z.literal('deactivateProduct'), productId: z.string().min(1) }),
])

export const ChangeSetSchema = z.object({
  id: z.string().min(1),
  baseVersion: z.number().int().positive(),
  source: z.enum(['admin', 'gpt', 'import', 'revert']),
  operations: z.array(ChangeOperationSchema).min(1),
  warnings: z.array(z.string()),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  status: z.enum(['pending', 'applied', 'expired', 'failed']),
  appliedVersion: z.number().int().positive().nullable(),
})

export type CatalogUnit = z.infer<typeof CatalogUnitSchema>
export type CatalogSupplier = z.infer<typeof CatalogSupplierSchema>
export type CatalogProduct = z.infer<typeof CatalogProductSchema>
export type CatalogSnapshot = z.infer<typeof CatalogSnapshotSchema>
export type ChangeOperation = z.infer<typeof ChangeOperationSchema>
export type ChangeSet = z.infer<typeof ChangeSetSchema>
