### Task 1: Test Runner and Catalog Schemas

**Files:**
- Modify: package.json
- Modify: package-lock.json
- Create: vitest.config.ts
- Create: shared/priceCatalog/types.ts
- Create: tests/priceCatalog/types.test.ts

**Interfaces:**
- Produces: CatalogSupplierSchema, CatalogProductSchema, CatalogSnapshotSchema, ChangeOperationSchema, ChangeSetSchema and their inferred TypeScript types.
- Consumes: zod already present in package.json.

- [ ] **Step 1: Install the compatible test runner and add scripts**

Run:

    npm.cmd install --save-dev vitest@2.1.9

Then add these package.json scripts:

    "test": "vitest run",
    "test:watch": "vitest"

Create vitest.config.ts:

    import { defineConfig } from 'vitest/config'

    export default defineConfig({
      test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        clearMocks: true,
      },
    })

Expected: package-lock.json records vitest 2.1.9 and npm exits 0.

- [ ] **Step 2: Write the failing schema tests**

Create tests/priceCatalog/types.test.ts:

    import { describe, expect, it } from 'vitest'
    import {
      CatalogProductSchema,
      CatalogSnapshotSchema,
      ChangeOperationSchema,
    } from '../../shared/priceCatalog/types'

    const product = {
      id: 'tp1',
      supplierId: 'terra-plast',
      supplierSku: null,
      name: 'גביע 1000',
      normalizedName: 'גביע 1000',
      aliases: [],
      category: 'אריזות',
      packagePrice: 150,
      packageQuantity: 500,
      unit: 'unit',
      unitPrice: 0.3,
      effectiveFrom: null,
      active: true,
      adminOnly: false,
      sourceId: 'seed-v1',
      updatedAt: '2026-06-20T00:00:00.000Z',
    }

    describe('catalog schemas', () => {
      it('accepts a valid product and rejects non-positive prices', () => {
        expect(CatalogProductSchema.parse(product)).toEqual(product)
        expect(() => CatalogProductSchema.parse({ ...product, packagePrice: 0 })).toThrow()
      })

      it('requires the snapshot checksum and complete arrays', () => {
        const parsed = CatalogSnapshotSchema.parse({
          version: 1,
          previousVersion: null,
          changeSetId: 'seed-v1',
          createdAt: '2026-06-20T00:00:00.000Z',
          checksum: 'abc123',
          suppliers: [],
          products: [product],
        })
        expect(parsed.version).toBe(1)
      })

      it('accepts only explicit change-operation variants', () => {
        expect(ChangeOperationSchema.parse({
          type: 'updateProduct',
          productId: 'tp1',
          patch: { packagePrice: 160 },
        }).type).toBe('updateProduct')
        expect(() => ChangeOperationSchema.parse({ type: 'deleteForever', productId: 'tp1' })).toThrow()
      })
    })

- [ ] **Step 3: Run the test to verify it fails**

Run:

    npm.cmd test -- tests/priceCatalog/types.test.ts

Expected: FAIL because shared/priceCatalog/types.ts does not exist.

- [ ] **Step 4: Implement the schemas and types**

Create shared/priceCatalog/types.ts with these exact public shapes:

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

- [ ] **Step 5: Run tests and type checks**

Run:

    npm.cmd test -- tests/priceCatalog/types.test.ts
    npx.cmd tsc --noEmit

Expected: the schema test passes and TypeScript exits 0.

- [ ] **Step 6: Commit**

    git add package.json package-lock.json vitest.config.ts shared/priceCatalog/types.ts tests/priceCatalog/types.test.ts
    git commit -m "[codex] chore: add price catalog schemas and test runner"

---

