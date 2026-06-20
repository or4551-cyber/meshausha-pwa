# Price Catalog Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build the versioned supplier-price source of truth, connect the Meshausha app to it, route admin price mutations through preview/apply, and generate the central Excel workbook.

**Architecture:** A pure shared TypeScript domain layer validates catalog data and applies immutable change sets. Netlify Functions expose authenticated read/write endpoints backed by immutable version blobs plus an active snapshot. The React app keeps its current Product shape through an adapter, uses the cloud catalog as authoritative when online, and preserves its persisted cache when offline.

**Tech Stack:** React 18, TypeScript 5.3 strict, Vite 5, Zustand 4, Netlify Functions, Netlify Blobs 10, Zod 3.22, xlsx 0.18, Vitest 2.1.9, Node 20.

## Global Constraints

- Work in C:\Users\OR\קודקס\משאוושה\Meshausha.
- Before any edit, OR must transfer the collaboration token to codex; update docs/sync/BOARD.md and append the START message to docs/sync/CHANNEL.md.
- Default workflow is sequential on main. Do not create a worktree or parallel branch unless OR explicitly authorizes it.
- Commits use the prefix [codex].
- Codex never deploys; Claude reviews and deploys.
- TypeScript remains strict; do not add any.
- Preserve the legacy UI meaning of Product.price: package price before VAT.
- The central catalog stores prices before VAT.
- Mobile-first, Hebrew RTL, verified at 375px with no horizontal overflow.
- Every write uses preview then apply; apply is version-checked and idempotent.
- The app keeps its last successful catalog when offline.
- Plan 1 does not implement XLSX/CSV/PDF/image imports or configure the Custom GPT; those are Plans 2 and 3 in the roadmap.

---

## Locked File Structure

### Shared catalog domain

- Create shared/priceCatalog/types.ts — Zod schemas and shared types only.
- Create shared/priceCatalog/normalization.ts — browser-safe name normalization and unit-price calculation.
- Create shared/priceCatalog/engine.ts — pure validation, preview, apply, checksum, and revert logic.
- Create shared/priceCatalog/legacySeed.ts — deterministic conversion from current app suppliers/products into catalog v1.

### Netlify backend

- Create netlify/functions/_priceCatalogStore.ts — Blob storage interface and implementation.
- Create netlify/functions/_priceCatalogAuth.ts — app-read, GPT-write, and signed admin-session authorization.
- Create netlify/functions/_priceRateLimit.ts — login throttling.
- Create netlify/functions/_priceCatalogRouter.ts — pure HTTP route handling with injected repository and clock.
- Create netlify/functions/_priceCatalogExcel.ts — workbook generation.
- Create netlify/functions/price-auth.ts — admin PIN exchange for a signed price-admin session.
- Create netlify/functions/price-catalog.ts — production handler composition.
- Create netlify/functions/price-export.ts — authenticated or short-lived signed Excel download.

### Frontend integration

- Create src/lib/priceCatalogApi.ts — typed API client.
- Create src/lib/priceCatalogAdapter.ts — CatalogProduct to legacy Product adapter.
- Create src/lib/priceAdminSession.ts — sessionStorage handling for the signed admin token.
- Create src/hooks/usePriceAdminSession.ts — unlock state and server exchange.
- Create src/components/PriceAdminUnlockModal.tsx — styled second-factor prompt for catalog writes.
- Create src/hooks/useCatalogSync.ts — startup and foreground-resume synchronization.
- Modify src/stores/suppliersStore.ts — authoritative catalog replacement and removal of direct product-cloud writes.
- Modify src/App.tsx — call useCatalogSync instead of the current inline product merge/migration flow.
- Modify src/pages/admin/PriceManagementPage.tsx — preview/apply mutations and explicit confirmation.
- Modify src/pages/admin/AddSupplierPage.tsx — create catalog supplier/products through preview/apply.
- Modify src/lib/cloudApi.ts — keep schedule/settings APIs but remove product-price persistence from this module.
- Modify netlify.toml — place price API redirects before the SPA catch-all.

### Tests and configuration

- Create vitest.config.ts.
- Modify package.json and package-lock.json.
- Create tests/priceCatalog/types.test.ts.
- Create tests/priceCatalog/engine.test.ts.
- Create tests/priceCatalog/legacySeed.test.ts.
- Create tests/priceCatalog/store.test.ts.
- Create tests/priceCatalog/auth.test.ts.
- Create tests/priceCatalog/router.test.ts.
- Create tests/priceCatalog/excel.test.ts.
- Create tests/priceCatalog/adapter.test.ts.
- Create tests/priceCatalog/reconciliation.test.ts.

---

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

### Task 2: Pure Catalog Change Engine

**Files:**
- Create: shared/priceCatalog/normalization.ts
- Create: shared/priceCatalog/engine.ts
- Create: tests/priceCatalog/engine.test.ts

**Interfaces:**
- Consumes: CatalogSnapshot, ChangeOperation, ChangeSet from shared/priceCatalog/types.ts.
- Produces: normalizeCatalogName and calculateUnitPrice from normalization.ts; createChangeSet, applyChangeSet, createRevertChangeSet, verifySnapshotIntegrity from engine.ts.

- [ ] **Step 1: Write failing engine tests**

Create tests/priceCatalog/engine.test.ts:

    import { describe, expect, it } from 'vitest'
    import {
      applyChangeSet,
      createChangeSet,
      createRevertChangeSet,
    } from '../../shared/priceCatalog/engine'
    import {
      calculateUnitPrice,
      normalizeCatalogName,
    } from '../../shared/priceCatalog/normalization'
    import type { CatalogSnapshot } from '../../shared/priceCatalog/types'

    const active: CatalogSnapshot = {
      version: 1,
      previousVersion: null,
      changeSetId: 'seed-v1',
      createdAt: '2026-06-20T00:00:00.000Z',
      checksum: 'seed',
      suppliers: [{
        id: 'terra',
        name: 'טרה פלסט',
        aliases: [],
        active: true,
        pricesExcludeVat: true,
        lastPriceListAt: null,
      }],
      products: [{
        id: 'tp1',
        supplierId: 'terra',
        supplierSku: null,
        name: 'גביע 1000',
        normalizedName: 'גביע 1000',
        aliases: [],
        category: null,
        packagePrice: 150,
        packageQuantity: 500,
        unit: 'unit',
        unitPrice: 0.3,
        effectiveFrom: null,
        active: true,
        adminOnly: false,
        sourceId: 'seed-v1',
        updatedAt: '2026-06-20T00:00:00.000Z',
      }],
    }

    describe('catalog engine', () => {
      it('normalizes Hebrew punctuation and whitespace', () => {
        expect(normalizeCatalogName('  גביע  1,000  יח׳ ')).toBe('גביע 1000 יח')
      })

      it('calculates unit price only when quantity exists', () => {
        expect(calculateUnitPrice(150, 500)).toBe(0.3)
        expect(calculateUnitPrice(150, null)).toBeNull()
      })

      it('previews without mutating and warns on a change above 20 percent', () => {
        const change = createChangeSet(active, [{
          type: 'updateProduct',
          productId: 'tp1',
          patch: { packagePrice: 200 },
        }], {
          id: 'change-1',
          source: 'admin',
          now: '2026-06-20T10:00:00.000Z',
          expiresAt: '2026-06-20T10:10:00.000Z',
        })
        expect(active.products[0].packagePrice).toBe(150)
        expect(change.warnings[0]).toContain('33.33%')
      })

      it('applies once against the expected base version', () => {
        const change = createChangeSet(active, [{
          type: 'updateProduct',
          productId: 'tp1',
          patch: { packagePrice: 160 },
        }], {
          id: 'change-2',
          source: 'admin',
          now: '2026-06-20T10:00:00.000Z',
          expiresAt: '2026-06-20T10:10:00.000Z',
        })
        const next = applyChangeSet(active, change, '2026-06-20T10:01:00.000Z')
        expect(next.version).toBe(2)
        expect(next.products[0].packagePrice).toBe(160)
        expect(() => applyChangeSet(next, change, '2026-06-20T10:02:00.000Z')).toThrow('base version')
      })

      it('creates a revert change set that restores the previous snapshot', () => {
        const revert = createRevertChangeSet(
          { ...active, version: 2, previousVersion: 1, products: [{ ...active.products[0], packagePrice: 160 }] },
          active,
          {
            id: 'revert-2',
            now: '2026-06-20T11:00:00.000Z',
            expiresAt: '2026-06-20T11:10:00.000Z',
          },
        )
        expect(revert.source).toBe('revert')
        expect(revert.operations).toContainEqual({
          type: 'updateProduct',
          productId: 'tp1',
          patch: expect.objectContaining({ packagePrice: 150 }),
        })
      })
    })

- [ ] **Step 2: Run the test to verify it fails**

Run:

    npm.cmd test -- tests/priceCatalog/engine.test.ts

Expected: FAIL because the shared price-catalog engine modules do not exist.

- [ ] **Step 3: Implement the engine**

Create shared/priceCatalog/normalization.ts:

    export function normalizeCatalogName(value: string): string {
      return value
        .normalize('NFKC')
        .replace(/[׳']/g, '')
        .replace(/,/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    }

    export function calculateUnitPrice(price: number, quantity: number | null): number | null {
      if (quantity === null) return null
      return Math.round((price / quantity) * 10000) / 10000
    }

Create shared/priceCatalog/engine.ts. Implement these exact signatures:

    import { createHash } from 'node:crypto'
    import {
      CatalogSnapshotSchema,
      ChangeSetSchema,
      type CatalogSnapshot,
      type ChangeOperation,
      type ChangeSet,
    } from './types'
    import { calculateUnitPrice, normalizeCatalogName } from './normalization'

    export function snapshotChecksum(snapshot: Omit<CatalogSnapshot, 'checksum'>): string {
      return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
    }

    export interface ChangeSetContext {
      id: string
      source: ChangeSet['source']
      now: string
      expiresAt: string
    }

    export function createChangeSet(
      active: CatalogSnapshot,
      operations: ChangeOperation[],
      context: ChangeSetContext,
    ): ChangeSet {
      const productById = new Map(active.products.map(product => [product.id, product]))
      const warnings: string[] = []
      for (const operation of operations) {
        if (operation.type !== 'updateProduct') continue
        const previous = productById.get(operation.productId)
        if (!previous) throw new Error('unknown product ' + operation.productId)
        const nextPrice = operation.patch.packagePrice
        if (nextPrice !== undefined) {
          const pct = ((nextPrice - previous.packagePrice) / previous.packagePrice) * 100
          if (Math.abs(pct) > 20) warnings.push(operation.productId + ': price change ' + pct.toFixed(2) + '%')
        }
      }
      return ChangeSetSchema.parse({
        id: context.id,
        baseVersion: active.version,
        source: context.source,
        operations,
        warnings,
        createdAt: context.now,
        expiresAt: context.expiresAt,
        status: 'pending',
        appliedVersion: null,
      })
    }

The same file must:

- Reject duplicate supplier IDs, product IDs, and supplierSku values within one supplier.
- Reject product references to unknown supplier IDs.
- Recompute normalizedName and unitPrice whenever name, price, quantity, or unit changes.
- Treat deactivateProduct as active=false, never physical deletion.
- Build the new snapshot without mutating active.
- Set version=active.version+1 and previousVersion=active.version.
- Compute checksum after all fields except checksum are finalized.
- Reject expired, non-pending, or base-version-mismatched change sets.
- Build createRevertChangeSet by diffing active against the requested previous snapshot.

- [ ] **Step 4: Run focused and full tests**

Run:

    npm.cmd test -- tests/priceCatalog/engine.test.ts
    npm.cmd test
    npx.cmd tsc --noEmit

Expected: all tests pass; TypeScript exits 0.

- [ ] **Step 5: Commit**

    git add shared/priceCatalog/normalization.ts shared/priceCatalog/engine.ts tests/priceCatalog/engine.test.ts
    git commit -m "[codex] feat: add immutable price catalog change engine"

---

### Task 3: Deterministic Legacy Seed and Reconciliation

**Files:**
- Create: shared/priceCatalog/legacySeed.ts
- Create: tests/priceCatalog/legacySeed.test.ts
- Create: tests/priceCatalog/reconciliation.test.ts
- Read only: src/data/products.ts

**Interfaces:**
- Consumes: current PRODUCTS and INITIAL_SUPPLIERS plus CatalogSnapshot types.
- Produces: createCatalogSeed(legacySuppliers, legacyProducts, now): CatalogSnapshot.

- [ ] **Step 1: Write the failing seed test**

Create tests/priceCatalog/legacySeed.test.ts:

    import { describe, expect, it } from 'vitest'
    import { PRODUCTS, INITIAL_SUPPLIERS } from '../../src/data/products'
    import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'

    describe('legacy seed', () => {
      it('reconciles every current supplier and product exactly once', () => {
        const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, '2026-06-20T00:00:00.000Z')
        expect(seed.version).toBe(1)
        expect(seed.suppliers).toHaveLength(8)
        expect(seed.products).toHaveLength(270)
        expect(new Set(seed.products.map(product => product.id)).size).toBe(270)
        expect(seed.products.every(product => product.packagePrice > 0)).toBe(true)
      })

      it('preserves legacy IDs and package prices', () => {
        const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, '2026-06-20T00:00:00.000Z')
        for (const legacy of PRODUCTS) {
          const product = seed.products.find(candidate => candidate.id === legacy.id)
          expect(product?.packagePrice).toBe(legacy.price)
        }
      })
    })

- [ ] **Step 2: Run the test to verify it fails**

Run:

    npm.cmd test -- tests/priceCatalog/legacySeed.test.ts

Expected: FAIL because createCatalogSeed is missing.

- [ ] **Step 3: Implement the seed adapter**

Create shared/priceCatalog/legacySeed.ts with public input contracts that match, but do not import, Zustand types:

    import { snapshotChecksum } from './engine'
    import { normalizeCatalogName } from './normalization'
    import {
      CatalogSnapshotSchema,
      type CatalogSnapshot,
    } from './types'

    export interface LegacySupplierSeed {
      id: string
      name: string
    }

    export interface LegacyProductSeed {
      id: string
      name: string
      supplier: string
      price: number
      category?: string
      adminOnly?: boolean
    }

    export function createCatalogSeed(
      legacySuppliers: LegacySupplierSeed[],
      legacyProducts: LegacyProductSeed[],
      now: string,
    ): CatalogSnapshot {
      const supplierByName = new Map(legacySuppliers.map(supplier => [supplier.name, supplier]))
      const suppliers = legacySuppliers.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        aliases: [],
        active: true,
        pricesExcludeVat: true as const,
        lastPriceListAt: null,
      }))
      const products = legacyProducts.map(product => {
        const supplier = supplierByName.get(product.supplier)
        if (!supplier) throw new Error('missing supplier for ' + product.id + ': ' + product.supplier)
        return {
          id: product.id,
          supplierId: supplier.id,
          supplierSku: null,
          name: product.name,
          normalizedName: normalizeCatalogName(product.name),
          aliases: [],
          category: product.category ?? null,
          packagePrice: product.price,
          packageQuantity: null,
          unit: null,
          unitPrice: null,
          effectiveFrom: null,
          active: true,
          adminOnly: product.adminOnly ?? false,
          sourceId: 'seed-v1',
          updatedAt: now,
        }
      })
      const withoutChecksum = {
        version: 1,
        previousVersion: null,
        changeSetId: 'seed-v1',
        createdAt: now,
        suppliers,
        products,
      }
      return CatalogSnapshotSchema.parse({
        ...withoutChecksum,
        checksum: snapshotChecksum(withoutChecksum),
      })
    }

snapshotChecksum uses this checksum-free input type:

    export type ChecksumInput = Omit<CatalogSnapshot, 'checksum'>
    export function snapshotChecksum(snapshot: ChecksumInput): string

- [ ] **Step 4: Add a full reconciliation test**

Create tests/priceCatalog/reconciliation.test.ts that builds the seed and asserts:

    expect(seed.products.map(p => p.id).sort()).toEqual(PRODUCTS.map(p => p.id).sort())
    expect(seed.products.reduce((sum, p) => sum + p.packagePrice, 0))
      .toBeCloseTo(PRODUCTS.reduce((sum, p) => sum + p.price, 0), 6)
    expect(new Set(seed.products.map(p => p.supplierId))).toEqual(new Set(seed.suppliers.map(s => s.id)))

Also assert the expected supplier product counts:

    expect(Object.fromEntries(
      seed.suppliers.map(supplier => [
        supplier.name,
        seed.products.filter(product => product.supplierId === supplier.id).length,
      ]),
    )).toEqual({
      'חטיפי אלקיים': 2,
      'מוטיפוד בע"מ': 1,
      'טרה פלסט (משאוושה)': 88,
      'יבולי שדה תמרה': 41,
      'תפוכן': 4,
      'קוקה קולה': 26,
      'סלטים משאוושה': 105,
      'נט פארם- מתקלות': 3,
    })

- [ ] **Step 5: Run tests**

Run:

    npm.cmd test -- tests/priceCatalog/legacySeed.test.ts tests/priceCatalog/reconciliation.test.ts
    npm.cmd test
    npx.cmd tsc --noEmit

Expected: 270/270 IDs and prices reconcile; all tests pass.

- [ ] **Step 6: Commit**

    git add shared/priceCatalog/legacySeed.ts tests/priceCatalog/legacySeed.test.ts tests/priceCatalog/reconciliation.test.ts shared/priceCatalog/engine.ts
    git commit -m "[codex] feat: reconcile existing products into catalog seed"

---

### Task 4: Versioned Blob Repository

**Files:**
- Create: netlify/functions/_priceCatalogStore.ts
- Create: tests/priceCatalog/store.test.ts

**Interfaces:**
- Consumes: CatalogSnapshot and ChangeSet.
- Produces: PriceCatalogRepository, createBlobPriceCatalogRepository, createMemoryPriceCatalogRepository.

- [ ] **Step 1: Write failing repository tests**

Create tests/priceCatalog/store.test.ts:

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
    })

- [ ] **Step 2: Run the test to verify it fails**

Run:

    npm.cmd test -- tests/priceCatalog/store.test.ts

Expected: FAIL because the repository module is missing.

- [ ] **Step 3: Implement repository contracts and keys**

Create netlify/functions/_priceCatalogStore.ts with:

    import { getStore } from '@netlify/blobs'
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

Use these exact blob keys:

    active/catalog.json
    versions/00000001.json
    changes/{changeSetId}.json
    idempotency/{sha256-of-key}.json

createBlobPriceCatalogRepository must:

- Open store meshausha-price-catalog using SITE_ID/NETLIFY_TOKEN fallback exactly like settings-api.ts.
- Parse every read through the Zod schema.
- Reject overwriting an existing version with a different checksum.
- Write versions/{n}.json before active/catalog.json.
- Hash idempotency keys before using them in blob paths.

createMemoryPriceCatalogRepository must implement the same interface with Maps for deterministic tests.

- [ ] **Step 4: Add recovery behavior**

Add a test where activateVersion succeeds but saveChangeSet status update is retried. The repository must allow the router to recover by observing:

    active.changeSetId === requestedChangeSet.id

The active snapshot is authoritative; retrying apply returns the already-active version rather than creating version+1.

- [ ] **Step 5: Run tests**

Run:

    npm.cmd test -- tests/priceCatalog/store.test.ts
    npm.cmd test

Expected: repository and full suites pass.

- [ ] **Step 6: Commit**

    git add netlify/functions/_priceCatalogStore.ts tests/priceCatalog/store.test.ts
    git commit -m "[codex] feat: add versioned price catalog repository"

---

### Task 5: Price API Authentication and Admin Session

**Files:**
- Create: netlify/functions/_priceCatalogAuth.ts
- Create: netlify/functions/_priceRateLimit.ts
- Create: netlify/functions/price-auth.ts
- Create: tests/priceCatalog/auth.test.ts

**Interfaces:**
- Produces: authorizePriceRequest(event, access, env, now), issueAdminSession(now, env), verifyAdminSession(token, now, env), checkLoginRateLimit.
- Consumes: API_TOKEN for app reads, PRICE_GPT_TOKEN for GPT reads/writes, PRICE_ADMIN_SECRET and PRICE_SESSION_SECRET for admin sessions.

- [ ] **Step 1: Write failing authorization tests**

Create tests/priceCatalog/auth.test.ts:

    import { describe, expect, it } from 'vitest'
    import {
      authorizePriceRequest,
      issueAdminSession,
      verifyAdminSession,
    } from '../../netlify/functions/_priceCatalogAuth'

    const env = {
      API_TOKEN: 'app-read',
      PRICE_GPT_TOKEN: 'gpt-secret',
      PRICE_SESSION_SECRET: 'session-secret-at-least-32-characters',
    }

    describe('price catalog auth', () => {
      it('allows app token to read but not write', () => {
        const event = { headers: { authorization: 'Bearer app-read' }, queryStringParameters: null }
        expect(authorizePriceRequest(event, 'read', env, 1)).toEqual({ role: 'app' })
        expect(authorizePriceRequest(event, 'write', env, 1)).toBeNull()
      })

      it('allows the GPT token to read and write', () => {
        const event = { headers: { authorization: 'Bearer gpt-secret' }, queryStringParameters: null }
        expect(authorizePriceRequest(event, 'write', env, 1)).toEqual({ role: 'gpt' })
      })

      it('issues an expiring signed admin session', () => {
        const token = issueAdminSession(1_000, env)
        expect(verifyAdminSession(token, 1_001, env)?.role).toBe('admin')
        expect(verifyAdminSession(token, 1_000 + 8 * 60 * 60 * 1000 + 1, env)).toBeNull()
      })

      it('fails closed when required write secrets are missing', () => {
        const event = { headers: {}, queryStringParameters: null }
        expect(authorizePriceRequest(event, 'write', {}, 1)).toBeNull()
      })
    })

- [ ] **Step 2: Run the tests to verify failure**

Run:

    npm.cmd test -- tests/priceCatalog/auth.test.ts

Expected: FAIL because the auth module is missing.

- [ ] **Step 3: Implement HMAC sessions and role separation**

In _priceCatalogAuth.ts:

- Use node:crypto createHmac and timingSafeEqual.
- Encode payload and signature with base64url.
- Session payload is { role: 'admin', exp: number } with an 8-hour expiry.
- read accepts API_TOKEN, PRICE_GPT_TOKEN, or a valid admin session.
- write accepts only PRICE_GPT_TOKEN or a valid admin session.
- Do not accept tokens from query parameters except the dedicated short-lived export token implemented in Task 7.
- Return null for absent environment secrets; never copy the old fail-open behavior.

Public types:

    export type PriceAccess = 'read' | 'write'
    export type PriceRole = 'app' | 'admin' | 'gpt'
    export interface PriceAuthResult { role: PriceRole }

- [ ] **Step 4: Implement login throttling and price-auth**

_priceRateLimit.ts stores counters in meshausha-price-catalog with key:

    rate-limit/login/{sha256(clientIp)}.json

Rules:

- Maximum 5 failed attempts per 15-minute window.
- A successful login deletes/resets the counter.
- Responses never reveal whether PRICE_ADMIN_SECRET is configured.

price-auth.ts:

- OPTIONS returns 204.
- POST only; body must be { secret: string } and secret must contain at least 8 characters.
- Compare secret to PRICE_ADMIN_SECRET with timing-safe comparison.
- On success return { token, expiresAt }.
- On failure return 401; when limited return 429 with Retry-After.
- Never log the PIN, token, or request body.

- [ ] **Step 5: Run tests and build**

Run:

    npm.cmd test -- tests/priceCatalog/auth.test.ts
    npm.cmd test
    npm.cmd run build

Expected: tests pass and production build succeeds.

- [ ] **Step 6: Commit**

    git add netlify/functions/_priceCatalogAuth.ts netlify/functions/_priceRateLimit.ts netlify/functions/price-auth.ts tests/priceCatalog/auth.test.ts
    git commit -m "[codex] feat: secure price catalog reads and writes"

---

### Task 6: Catalog HTTP Router and Netlify Handler

**Files:**
- Create: netlify/functions/_priceCatalogRouter.ts
- Create: netlify/functions/price-catalog.ts
- Modify: netlify/functions/_priceCatalogStore.ts
- Modify: netlify.toml
- Create: tests/priceCatalog/router.test.ts

**Interfaces:**
- Consumes: PriceCatalogRepository, auth roles, createChangeSet, applyChangeSet, createRevertChangeSet, createCatalogSeed.
- Produces: routePriceCatalog(request, dependencies): Promise<PriceApiResponse> and the production Netlify handler.

- [ ] **Step 1: Write failing router tests**

Create tests/priceCatalog/router.test.ts:

    import { beforeEach, describe, expect, it } from 'vitest'
    import { createMemoryPriceCatalogRepository } from '../../netlify/functions/_priceCatalogStore'
    import { routePriceCatalog } from '../../netlify/functions/_priceCatalogRouter'
    import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'
    import { PRODUCTS, INITIAL_SUPPLIERS } from '../../src/data/products'

    const now = '2026-06-20T12:00:00.000Z'

    describe('price catalog router', () => {
      const repo = createMemoryPriceCatalogRepository()

      beforeEach(async () => {
        repo.clear()
        const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, now)
        await repo.saveVersion(seed)
        await repo.activateVersion(seed)
      })

      it('searches active products without returning inactive products by default', async () => {
        const response = await routePriceCatalog({
          method: 'GET',
          path: '/api/prices/products',
          query: { q: 'כפפות' },
          headers: {},
          body: null,
          auth: { role: 'app' },
        }, { repo, now: () => now, id: () => 'generated-id' })
        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.body).products.length).toBeGreaterThan(0)
      })

      it('creates a preview without changing active version', async () => {
        const response = await routePriceCatalog({
          method: 'POST',
          path: '/api/prices/changes/preview',
          query: {},
          headers: {},
          body: JSON.stringify({
            source: 'admin',
            baseVersion: 1,
            operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 160 } }],
          }),
          auth: { role: 'admin' },
        }, { repo, now: () => now, id: () => 'change-1' })
        expect(response.statusCode).toBe(201)
        expect((await repo.getActive())?.version).toBe(1)
      })

      it('applies once and replays the same idempotency result', async () => {
        await routePriceCatalog({
          method: 'POST',
          path: '/api/prices/changes/preview',
          query: {},
          headers: {},
          body: JSON.stringify({
            source: 'admin',
            baseVersion: 1,
            operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 160 } }],
          }),
          auth: { role: 'admin' },
        }, { repo, now: () => now, id: () => 'change-1' })
        const request = {
          method: 'POST' as const,
          path: '/api/prices/changes/change-1/apply',
          query: {},
          headers: { 'idempotency-key': 'apply-change-1' },
          body: JSON.stringify({ confirmation: 'APPROVE' }),
          auth: { role: 'admin' as const },
        }
        const first = await routePriceCatalog(request, { repo, now: () => now, id: () => 'unused' })
        const second = await routePriceCatalog(request, { repo, now: () => now, id: () => 'unused' })
        expect(JSON.parse(first.body).version).toBe(2)
        expect(JSON.parse(second.body).version).toBe(2)
        expect((await repo.getActive())?.version).toBe(2)
      })

      it('rejects stale previews and app-role writes', async () => {
        const forbidden = await routePriceCatalog({
          method: 'POST',
          path: '/api/prices/changes/preview',
          query: {},
          headers: {},
          body: '{}',
          auth: { role: 'app' },
        }, { repo, now: () => now, id: () => 'unused' })
        expect(forbidden.statusCode).toBe(403)
      })
    })

- [ ] **Step 2: Run the test to verify it fails**

Run:

    npm.cmd test -- tests/priceCatalog/router.test.ts

Expected: FAIL because the router is missing.

- [ ] **Step 3: Implement the pure router**

Create _priceCatalogRouter.ts with these contracts:

    import type { PriceRole } from './_priceCatalogAuth'
    import type { PriceCatalogRepository } from './_priceCatalogStore'

    export interface PriceApiRequest {
      method: 'GET' | 'POST' | 'OPTIONS'
      path: string
      query: Record<string, string | undefined>
      headers: Record<string, string | undefined>
      body: string | null
      auth: { role: PriceRole }
    }

    export interface PriceApiResponse {
      statusCode: number
      headers: Record<string, string>
      body: string
    }

    export interface PriceRouterDependencies {
      repo: PriceCatalogRepository
      now: () => string
      id: () => string
    }

    export async function routePriceCatalog(
      request: PriceApiRequest,
      dependencies: PriceRouterDependencies,
    ): Promise<PriceApiResponse>

Implement exact behavior:

- GET /api/prices/suppliers returns active snapshot version and suppliers.
- GET /api/prices/products supports q, supplierId, category, includeInactive=false, limit default 50 and maximum 200.
- GET /api/prices/products/{id} returns one product or 404.
- GET /api/prices/products/{id}/history uses repo.listVersions() and emits only versions in which price/package fields changed.
- GET /api/prices/catalog/version returns version, checksum, and createdAt.
- POST /api/prices/changes/preview requires admin or gpt role, validates body with Zod, requires baseVersion to equal active.version, creates a 10-minute ChangeSet, persists it, and returns 201.
- POST /api/prices/changes/{id}/apply requires admin or gpt role, Idempotency-Key, and body confirmation exactly APPROVE.
- apply checks idempotency first, validates pending/expiry/base version, creates the immutable next version, saves it, activates it, marks the ChangeSet applied, stores the idempotency result, and returns 200.
- If active.changeSetId already equals the requested ChangeSet ID, return the active version and persist the missing idempotency result.
- POST /api/prices/changes/{id}/revert-preview loads the version before the applied change and creates a new pending reverse ChangeSet; revert is never an in-place overwrite.
- Invalid JSON is 400, unauthorized role is 403, missing resource is 404, stale version is 409, expired preview is 410, and unexpected failure is 500 with { error: 'internal_error' }.
- Never include stack traces, tokens, or environment values in responses.

Extend PriceCatalogRepository with:

    listVersions(): Promise<CatalogSnapshot[]>
    clear(): void

clear exists only on the memory implementation; type it as optional if necessary:

    clear?(): void

Sort listVersions by version ascending.

- [ ] **Step 4: Compose the production handler and seed-on-first-read**

Create price-catalog.ts:

- Open the Blob repository.
- If getActive returns null, call createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, new Date().toISOString()), save version 1, then activate it.
- Determine read/write access from method and route before calling authorizePriceRequest.
- Normalize Netlify event.path to /api/prices/... even when invoked as /.netlify/functions/price-catalog/....
- Use crypto.randomUUID for IDs.
- Return OPTIONS 204 with Content-Type and configured CORS headers.

Add redirects before the existing /* SPA redirect in netlify.toml:

    [[redirects]]
      from = "/api/prices/*"
      to = "/.netlify/functions/price-catalog/:splat"
      status = 200
      force = true

    [[redirects]]
      from = "/api/price-auth"
      to = "/.netlify/functions/price-auth"
      status = 200
      force = true

- [ ] **Step 5: Run tests and build**

Run:

    npm.cmd test -- tests/priceCatalog/router.test.ts
    npm.cmd test
    npm.cmd run build

Expected: all tests pass and the app builds.

- [ ] **Step 6: Commit**

    git add netlify/functions/_priceCatalogRouter.ts netlify/functions/price-catalog.ts netlify/functions/_priceCatalogStore.ts netlify.toml tests/priceCatalog/router.test.ts
    git commit -m "[codex] feat: expose versioned price catalog API"

---

### Task 7: Central Excel Workbook and Signed Download Link

**Files:**
- Create: netlify/functions/_priceCatalogExcel.ts
- Create: netlify/functions/price-export.ts
- Modify: netlify/functions/_priceCatalogAuth.ts
- Modify: netlify/functions/_priceCatalogRouter.ts
- Modify: netlify.toml
- Create: tests/priceCatalog/excel.test.ts

**Interfaces:**
- Consumes: CatalogSnapshot.
- Produces: buildCatalogWorkbook(snapshot): Buffer, issueExportToken(version, now, env), verifyExportToken(token, now, env).

- [ ] **Step 1: Write failing workbook tests**

Create tests/priceCatalog/excel.test.ts:

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
        expect(rows).toHaveLength(270)
        expect(rows.every(row => typeof row['מחיר אריזה לפני מע״מ'] === 'number')).toBe(true)
      })
    })

- [ ] **Step 2: Run the test to verify failure**

Run:

    npm.cmd test -- tests/priceCatalog/excel.test.ts

Expected: FAIL because _priceCatalogExcel.ts is missing.

- [ ] **Step 3: Implement workbook generation**

buildCatalogWorkbook must:

- Create the first sheet named סיכום.
- Create one unique, sanitized sheet per supplier; Excel sheet names are limited to 31 characters and cannot contain : \ / ? * [ ].
- Sort suppliers by Hebrew locale name and products by category then name.
- Summary columns: ספק, מוצרים פעילים, תאריך מחירון אחרון, מוצרים ללא כמות אריזה, גרסת קטלוג.
- Supplier columns: קוד פנימי, מק״ט ספק, מוצר, קטגוריה, מחיר אריזה לפני מע״מ, כמות באריזה, יחידה, מחיר ליחידה, תאריך תחולה, עודכן לאחרונה, סטטוס, מקור.
- Use numeric cells for prices and quantities, not formatted strings containing ₪.
- Add autofilter and column widths.
- Write type buffer with bookType xlsx.

- [ ] **Step 4: Add signed export links**

Add HMAC export tokens with payload:

    { purpose: 'price-export', version: number, exp: number }

Expiry is 5 minutes. Add POST /api/prices/export-link to the router; admin/gpt only. It returns:

    { url: '/api/prices/export.xlsx?token=...', expiresAt: '...' }

Create price-export.ts:

- Accept GET only.
- Verify the export token and load the exact version in its payload.
- Return 410 for expired links and 404 for absent versions.
- Return workbook bytes as base64 with isBase64Encoded=true.
- Headers: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, attachment filename meshausha-price-catalog-v{version}.xlsx, Cache-Control no-store.

Add this redirect above both the /api/prices/* redirect and the SPA catch-all:

    [[redirects]]
      from = "/api/prices/export.xlsx"
      to = "/.netlify/functions/price-export"
      status = 200
      force = true

- [ ] **Step 5: Run tests and build**

Run:

    npm.cmd test -- tests/priceCatalog/excel.test.ts tests/priceCatalog/auth.test.ts tests/priceCatalog/router.test.ts
    npm.cmd test
    npm.cmd run build

Expected: workbook has 9 sheets and 270 product rows; all tests/build pass.

- [ ] **Step 6: Commit**

    git add netlify/functions/_priceCatalogExcel.ts netlify/functions/price-export.ts netlify/functions/_priceCatalogAuth.ts netlify/functions/_priceCatalogRouter.ts netlify.toml tests/priceCatalog/excel.test.ts tests/priceCatalog/auth.test.ts tests/priceCatalog/router.test.ts
    git commit -m "[codex] feat: export central supplier price workbook"

---

### Task 8: Frontend Catalog Adapter and Foreground Sync

**Files:**
- Create: src/lib/priceCatalogApi.ts
- Create: src/lib/priceCatalogAdapter.ts
- Create: src/hooks/useCatalogSync.ts
- Modify: src/stores/suppliersStore.ts:1-181
- Modify: src/App.tsx:1-84
- Modify: src/lib/cloudApi.ts:11-21
- Create: tests/priceCatalog/adapter.test.ts

**Interfaces:**
- Consumes: GET /api/prices/catalog/version and GET /api/prices/products.
- Produces: CatalogProduct to current Product conversion, fetchActiveCatalog, refreshCatalog, replaceCatalogProducts.

- [ ] **Step 1: Write the failing adapter test**

Create tests/priceCatalog/adapter.test.ts:

    import { describe, expect, it } from 'vitest'
    import { catalogProductToLegacy } from '../../src/lib/priceCatalogAdapter'

    describe('catalog frontend adapter', () => {
      it('preserves the legacy price and supplier fields', () => {
        const product = catalogProductToLegacy({
          id: 'tp1',
          supplierId: 'terra',
          supplierSku: null,
          name: 'גביע',
          normalizedName: 'גביע',
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
        }, {
          id: 'terra',
          name: 'טרה פלסט',
          aliases: [],
          active: true,
          pricesExcludeVat: true,
          lastPriceListAt: null,
        })
        expect(product).toMatchObject({
          id: 'tp1',
          supplier: 'טרה פלסט',
          price: 150,
          packageQuantity: 500,
          unitPrice: 0.3,
        })
      })
    })

- [ ] **Step 2: Run the test to verify failure**

Run:

    npm.cmd test -- tests/priceCatalog/adapter.test.ts

Expected: FAIL because priceCatalogAdapter.ts is missing.

- [ ] **Step 3: Implement the adapter and typed API client**

priceCatalogAdapter.ts exports:

    export interface LegacyCatalogProduct {
      id: string
      name: string
      supplier: string
      price: number
      category?: string
      adminOnly?: boolean
      supplierId: string
      supplierSku?: string
      packageQuantity?: number
      unit?: CatalogUnit
      unitPrice?: number
      effectiveFrom?: string
      sourceId: string
      updatedAt: string
    }

    export function catalogProductToLegacy(
      product: CatalogProduct,
      supplier: CatalogSupplier,
    ): LegacyCatalogProduct

priceCatalogApi.ts:

- Reuse the retry behavior of apiClient.ts without sending write tokens in query strings.
- fetchActiveCatalog first gets version, then paginates products with limit=200 and includeInactive=true; suppliers come from GET suppliers.
- Return null on network failure so the cache remains untouched.
- Expose getCatalogVersion, fetchActiveCatalog, previewChange, applyChange, createRevertPreview, createExportLink.
- applyChange requires the signed admin session token and sends Idempotency-Key.

- [ ] **Step 4: Make the Zustand catalog cache authoritative-by-replacement**

Modify Product in suppliersStore.ts to extend LegacyCatalogProduct fields while preserving all existing required fields.

Add:

    replaceCatalogProducts: (products: Product[], version: number) => void

Implementation:

    replaceCatalogProducts: (products, version) => {
      set({ products, catalogVersion: version })
    }

Remove saveSuppliersToCloud calls from updateProduct, deleteProduct, and addProducts. In Task 9 those methods are removed or replaced by API mutations. Keep supplier schedule/contact persistence through saveSuppliersToCloud, but change cloudApi.ts types so suppliers-data no longer claims products are authoritative.

Change loadCloudData so it updates suppliers/schedules only; it must not merge cloud products into a newer central catalog.

- [ ] **Step 5: Implement useCatalogSync**

useCatalogSync must:

- Seed INITIAL_SUPPLIERS and PRODUCTS immediately for first-run/offline safety.
- Load supplier schedules from settings-api independently.
- Fetch the central catalog; replace products only after a complete successful response.
- Skip replacement if the returned version equals catalogVersion.
- Register visibilitychange and window focus listeners.
- On visible/focus, refresh if the last successful check is older than 30 seconds.
- Never clear cached products on error.
- Clean up listeners on unmount.

Modify App.tsx:

    function App() {
      const { isAuthenticated, user } = useAuthStore()
      useCatalogSync()

Remove the inline product merge/migrate effect and its CATALOG_VERSION/applyCatalogV1 imports. Keep adminPhone loading either inside the hook or a small settings-only effect.

- [ ] **Step 6: Run tests, build, and manual offline check**

Run:

    npm.cmd test -- tests/priceCatalog/adapter.test.ts
    npm.cmd test
    npm.cmd run build

Manual:

1. Start npm.cmd run dev.
2. Open at 375px.
3. Verify products load.
4. Disable network and reload; persisted products remain.
5. Restore network and refocus; version check occurs without duplicate products.

Expected: no horizontal overflow, no empty catalog offline, no duplicate IDs.

- [ ] **Step 7: Commit**

    git add src/lib/priceCatalogApi.ts src/lib/priceCatalogAdapter.ts src/hooks/useCatalogSync.ts src/stores/suppliersStore.ts src/App.tsx src/lib/cloudApi.ts tests/priceCatalog/adapter.test.ts
    git commit -m "[codex] feat: sync app with central price catalog"

---

### Task 9: Secure Admin Preview and Apply

**Files:**
- Create: src/lib/priceAdminSession.ts
- Create: src/hooks/usePriceAdminSession.ts
- Create: src/components/PriceAdminUnlockModal.tsx
- Modify: src/pages/admin/PriceManagementPage.tsx:1-220
- Modify: src/pages/admin/AddSupplierPage.tsx:20-124
- Modify: src/stores/suppliersStore.ts

**Interfaces:**
- Consumes: POST /api/price-auth, previewChange, applyChange, refreshCatalog.
- Produces: signed admin session in sessionStorage, a separate catalog-write unlock UI, and two-step mutations.

- [ ] **Step 1: Add price-admin session helpers**

Create priceAdminSession.ts:

    const KEY = 'meshausha-price-admin-session'

    export interface PriceAdminSession {
      token: string
      expiresAt: string
    }

    export function savePriceAdminSession(session: PriceAdminSession): void {
      sessionStorage.setItem(KEY, JSON.stringify(session))
    }

    export function getPriceAdminToken(now = Date.now()): string | null {
      const raw = sessionStorage.getItem(KEY)
      if (!raw) return null
      try {
        const session = JSON.parse(raw) as PriceAdminSession
        if (Date.parse(session.expiresAt) <= now) {
          sessionStorage.removeItem(KEY)
          return null
        }
        return session.token
      } catch {
        sessionStorage.removeItem(KEY)
        return null
      }
    }

    export function clearPriceAdminSession(): void {
      sessionStorage.removeItem(KEY)
    }

- [ ] **Step 2: Add the separate price-catalog unlock**

Add authenticatePriceAdmin(secret) to priceCatalogApi.ts. It posts { secret } to /api/price-auth and returns PriceAdminSession.

Create usePriceAdminSession with:

    export interface PriceAdminSessionController {
      token: string | null
      isUnlockOpen: boolean
      error: string | null
      unlock(secret: string): Promise<boolean>
      requireToken(): Promise<string>
      closeUnlock(): void
      lock(): void
    }

Create PriceAdminUnlockModal:

- RTL bottom sheet on 375px, max height 90vh.
- Password input with autocomplete current-password.
- Text: “סיסמת מחירונים” and “קוד האדמין הרגיל אינו מספיק לשינוי מחירים”.
- Submit calls unlock; cancel performs no write.
- Never persist the secret itself; only the 8-hour signed session goes to sessionStorage.

PriceManagementPage and AddSupplierPage require both the existing admin route guard and a valid price-admin session before any preview/apply. The public 9999 value remains navigation-only.

- [ ] **Step 3: Replace immediate product edits with preview/confirm/apply**

In PriceManagementPage.tsx:

- Add savingId and error state.
- handleSave becomes async.
- Build updateProduct operation using packagePrice.
- Call previewChange with the current catalogVersion.
- Show ConfirmDialog with old price, new price, percent change, and any warnings.
- On confirmation call applyChange with crypto.randomUUID idempotency key.
- Refresh the catalog from the returned version.
- On cancellation, do not call apply.
- On 409, show “המחירון השתנה מאז פתיחת המסך — טוען מחדש” and refresh.
- On missing/expired admin session, route to /login.

The confirmation description must be built explicitly:

    const changePct = ((nextPrice - currentPrice) / currentPrice) * 100
    const description = [
      'מחיר קודם: ' + formatPrice(currentPrice),
      'מחיר חדש: ' + formatPrice(nextPrice),
      'שינוי: ' + changePct.toFixed(1) + '%',
      'המחירים לפני מע״מ',
      ...preview.warnings,
    ].join('\n')

Deletion becomes deactivateProduct and the button label/title changes from מחק to השבת.

adminOnly toggles also use preview/apply.

- [ ] **Step 4: Route supplier/product creation through the catalog**

In AddSupplierPage.tsx make handleSubmit async:

1. Build addSupplier plus addProduct operations.
2. Each new product gets crypto.randomUUID, normalizedName from shared/priceCatalog/normalization.ts, packagePrice from parsed price, packageQuantity/unit null, and sourceId admin.
3. Preview the complete change set and show counts and warnings.
4. Apply only after confirmation.
5. After successful catalog apply, save schedules/contact metadata through addSupplier in suppliersStore.
6. If schedule save fails, keep the catalog version and show a warning that scheduling must be retried; do not attempt to delete the catalog supplier.

This task does not replace the existing CSV/TXT AddSupplier parser; the richer import pipeline is Plan 3.

- [ ] **Step 5: Remove bypass mutations from suppliersStore**

After both pages use the API:

- Remove updateProduct, deleteProduct, and addProducts from SuppliersState.
- Remove their implementations and direct product writes to settings-api.
- Search for remaining callers:

    rg -n "updateProduct|deleteProduct|addProducts" src

Expected: no caller remains outside the new API client/pages.

- [ ] **Step 6: Verify behavior**

Run:

    npm.cmd test
    npx.cmd tsc --noEmit
    npm.cmd run build
    npm.cmd run lint

Manual at 375px:

1. Admin opens the price page, enters the separate price-catalog secret, and receives a price session.
2. Editing a price opens old/new confirmation.
3. Cancel leaves catalog version unchanged.
4. Confirm creates version+1 and refreshes the row.
5. Deactivate hides product from branch order view but remains visible to admin/history.
6. Branch PIN cannot open admin page or call write endpoint.

Expected: all commands pass; no direct settings-api product write occurs.

- [ ] **Step 7: Commit**

    git add src/lib/priceAdminSession.ts src/hooks/usePriceAdminSession.ts src/components/PriceAdminUnlockModal.tsx src/lib/priceCatalogApi.ts src/pages/admin/PriceManagementPage.tsx src/pages/admin/AddSupplierPage.tsx src/stores/suppliersStore.ts
    git commit -m "[codex] feat: require preview and approval for price edits"

---

### Task 10: End-to-End Reconciliation, Documentation, and Review Gate

**Files:**
- Modify: .env.example
- Modify: README.md
- Create: docs/price-catalog/OPERATIONS.md
- Modify: docs/sync/BOARD.md
- Append: docs/sync/CHANNEL.md
- Update via handoff skill only: docs/handoff/STATE.md and docs/handoff/JOURNAL/

**Interfaces:**
- Consumes: every deliverable from Tasks 1-9.
- Produces: operator setup, acceptance evidence, rollback instructions, and review-ready commit history.

- [ ] **Step 1: Document required environment variables**

Add to .env.example without real values:

    # Price catalog
    PRICE_GPT_TOKEN=
    PRICE_ADMIN_SECRET=
    PRICE_SESSION_SECRET=
    APP_ORIGIN=

Document:

- PRICE_GPT_TOKEN: at least 32 random bytes; never VITE-prefixed.
- PRICE_ADMIN_SECRET: separate private passphrase for catalog writes; it must not equal the public 9999 app PIN and must be at least 8 characters.
- PRICE_SESSION_SECRET: at least 32 random bytes for HMAC sessions and export links.
- APP_ORIGIN: production origin allowed for browser requests.
- Existing API_TOKEN/VITE_API_TOKEN remains app-read access only for the price API.

- [ ] **Step 2: Write operations and rollback documentation**

Create docs/price-catalog/OPERATIONS.md with exact procedures:

1. Seed verification: GET /api/prices/catalog/version and expected version/checksum.
2. Product-count reconciliation: 270 total and per-supplier counts from Task 3.
3. Admin mutation smoke test using preview then apply.
4. Excel export and product-count check.
5. Revert procedure: create revert-preview, inspect, apply with a new Idempotency-Key.
6. Emergency rollback: activate a previous immutable version only through a dedicated one-time maintenance script or reviewed API operation; never edit active/catalog.json by hand.
7. Secret rotation for PRICE_GPT_TOKEN and PRICE_SESSION_SECRET.
8. Failure rule: do not deploy when reconciliation, test, lint, build, or mobile checks fail.

- [ ] **Step 3: Run the complete verification suite**

Run:

    npm.cmd test
    npx.cmd tsc --noEmit
    npm.cmd run lint
    npm.cmd run build

Expected:

- All Vitest suites pass.
- TypeScript exits 0.
- ESLint exits with 0 warnings.
- Vite production build succeeds.

Run the deterministic reconciliation test separately and save its terminal output in the task notes:

    npm.cmd test -- tests/priceCatalog/reconciliation.test.ts --reporter=verbose

Expected: 270 products, 8 suppliers, all IDs/prices reconciled.

- [ ] **Step 4: Perform browser acceptance at 375px**

Use the in-app browser skill against the local Vite server:

- Login with one branch PIN and verify order products/prices.
- Login as admin and verify preview/cancel/apply.
- Verify no horizontal overflow.
- Simulate background/foreground after an applied change; new version appears.
- Simulate offline reload; last successful catalog remains.
- Download Excel and verify 9 sheets and 270 rows.

Capture exact findings in docs/price-catalog/OPERATIONS.md under Acceptance Evidence.

- [ ] **Step 5: Request independent code review**

Invoke superpowers:requesting-code-review. Review focus:

- No product-price bypass remains.
- App read token cannot write.
- GPT/admin tokens are never bundled in frontend code.
- Preview cannot mutate.
- Apply is version-checked and idempotent.
- Seed reconciliation is exact.
- Excel count and prices match the active snapshot.
- Offline cache behavior does not overwrite the cloud.

Fix every blocker, rerun Step 3 and Step 4, then create a final fix commit if required:

    git add shared/priceCatalog netlify/functions src/lib/priceCatalogApi.ts src/lib/priceCatalogAdapter.ts src/lib/priceAdminSession.ts src/hooks/useCatalogSync.ts src/hooks/usePriceAdminSession.ts src/components/PriceAdminUnlockModal.tsx src/stores/suppliersStore.ts src/App.tsx src/pages/admin/PriceManagementPage.tsx src/pages/admin/AddSupplierPage.tsx tests/priceCatalog docs/price-catalog
    git commit -m "[codex] fix: address price catalog review findings"

- [ ] **Step 6: Close the collaboration phase**

Follow docs/sync/PROTOCOL.md:

1. Move the task from codex Now to Done with commit hashes and verification commands.
2. Append the END message to CHANNEL.
3. Invoke the handoff skill to update docs/handoff/STATE.md and JOURNAL.
4. Return the token to OR/Claude.
5. Do not push or deploy; Claude performs final review and deployment after OR approval.

---

## Plan 1 Completion Gate

Plan 1 is complete only when:

- The active catalog contains exactly the reconciled 270 products and 8 suppliers.
- Every app price read comes from the central catalog when online.
- Offline use retains the last successful central catalog.
- Admin price changes require preview and explicit confirmation.
- App-read credentials cannot mutate prices.
- Each apply creates one immutable version and can be reverted.
- Excel contains summary plus 8 supplier sheets and exactly 270 product rows.
- npm.cmd test, npx.cmd tsc --noEmit, npm.cmd run lint, and npm.cmd run build all pass.
- Mobile acceptance at 375px passes.
- Independent review has no unresolved blockers.
- Codex has not deployed.
