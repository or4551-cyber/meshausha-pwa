# GPT Round 2 — Order Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing ChatGPT price-GPT read-only insight endpoints that answer questions about orders/expenses/trends per branch and per supplier, computed on the server.

**Architecture:** A pure aggregation engine over `OrderRecord[]` (`shared/orderInsights/`), a pure request router (`router.ts`), and a thin Netlify function (`insights-api.ts`) that authorizes (reusing `authorizePriceRequest`), loads the `meshausha-orders` blob store, and calls the router. Three GET endpoints (`summary`, `top-products`, `overview`) surface as three read operations in the GPT's existing Action.

**Tech Stack:** TypeScript (strict), Netlify Functions, `@netlify/blobs`, Zod not required (read-only, params validated by allow-lists), Vitest (node env), OpenAPI 3.1.0.

**Spec:** `docs/sdd/spec-gpt-insights.md` (approved).

## Global Constraints

- **⚠️ Hebrew project root — the Write/Edit tools mangle Hebrew file paths.** Project root is `C:\Users\OR\קודקס\משאוושה\Meshausha`. For EVERY file create/modify: write the content to an ASCII scratchpad path with the Write tool, then `cp` it into place with the Bash tool (`cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && cp <scratch> <dest>`). For surgical edits to existing Hebrew-path files (openapi.yaml, gpt-instructions.md, netlify.toml), use a Python patch script run via Bash. Never pass a Hebrew path to Write/Edit directly.
- **Amounts are pre-VAT** (`Σ item.price×quantity`); `spendWithVat = round(exVat × 1.17, 2)`. Every response carries a `note` saying so.
- **Active order = `status ∈ {pending, dispatched}`**; `deleted`/`merged` excluded everywhere.
- **Supplier breakdown is item-level** (an order may span suppliers).
- **Optional fields with no value are OMITTED, never `null`** (OpenAPI has no `nullable`).
- **Timezone for all period math: `Asia/Jerusalem`** (DST-aware).
- **Read-only:** only GET; no write operations; no `x-openai-isConsequential`.
- **Auth:** reuse `authorizePriceRequest(event, 'read', env, now)`; allow `role ∈ {gpt, admin}`; `role==='app'` → 403; no token → 401.
- **OpenAPI:** stays `3.1.0`; every `description` ≤ 300 chars; no `nullable` anywhere.
- **Response size < 100KB** always (all responses are aggregated).
- Tests live in `tests/orderInsights/`. Run a single file with `npx vitest run tests/orderInsights/<file>`.

---

## File Structure

- `shared/orderInsights/types.ts` — **new**. All interfaces + literal unions (no runtime logic).
- `shared/orderInsights/period.ts` — **new**. `resolvePeriod`, `resolveExplicit`, plus exported `israelParts` + `HE_MONTHS` reused by the engine.
- `shared/orderInsights/engine.ts` — **new**. `computeSummary`, `computeTopProducts`, `computeOverview` + internal helpers.
- `shared/orderInsights/router.ts` — **new**. Pure `routeInsights(req, orders, nowISO)` — param allow-lists, role gate, dispatch.
- `netlify/functions/insights-api.ts` — **new**. Handler: OPTIONS/CORS, auth, load blob store, call `routeInsights`.
- `netlify.toml` — **modify**. Add `/api/insights/*` redirect before the SPA `/*` redirect.
- `docs/gpt/openapi.yaml` — **modify**. 3 read operations + response schemas.
- `docs/gpt/gpt-instructions.md` — **modify**. "שאלות על הזמנות ותובנות" section.
- `tests/orderInsights/period.test.ts`, `engine.test.ts`, `router.test.ts` — **new**.

---

### Task 1: Types + period resolution

**Files:**
- Create: `shared/orderInsights/types.ts`
- Create: `shared/orderInsights/period.ts`
- Test: `tests/orderInsights/period.test.ts`

**Interfaces:**
- Produces: `OrderRecord`, `OrderItemRecord`, `PeriodPreset`, `ResolvedRange`, `GroupBy`, `TopBy`, `SummaryQuery`, `TopProductsQuery`, and all result interfaces (below). `resolvePeriod(preset: PeriodPreset, nowISO: string): ResolvedRange`, `resolveExplicit(fromDate: string, toDate: string): ResolvedRange`, `israelParts(instant: Date): { year:number; month:number; day:number; weekday:number }`, `HE_MONTHS: string[]`.

- [ ] **Step 1: Write `types.ts`** (scratchpad → cp). Full content:

```ts
export interface OrderItemRecord {
  productId?: string
  name: string
  supplier: string
  price: number      // ex-VAT
  quantity: number
}

export interface OrderRecord {
  id: string
  branch: string
  branchCode: string
  items: OrderItemRecord[]
  notes?: string
  createdAt: string  // ISO UTC (…Z)
  totalPrice?: number
  status: 'pending' | 'dispatched' | 'deleted' | 'merged'
}

export type PeriodPreset =
  | 'today' | 'yesterday' | 'this_week' | 'last_week'
  | 'this_month' | 'last_month' | 'last_30d' | 'last_90d'
  | 'this_quarter' | 'last_quarter' | 'ytd' | 'all'

export interface ResolvedRange { from: string; to: string; label: string }

export type GroupBy = 'none' | 'supplier' | 'branch' | 'month' | 'weekday'
export type TopBy = 'quantity' | 'spend'

export interface SummaryQuery {
  period?: PeriodPreset; from?: string; to?: string
  groupBy?: GroupBy; branchCode?: string; supplier?: string; limit?: number
}
export interface TopProductsQuery {
  period?: PeriodPreset; from?: string; to?: string
  by?: TopBy; branchCode?: string; supplier?: string; limit?: number
}

export interface SummaryGroup { key: string; label: string; spendExVat: number; spendWithVat: number; orders: number; units: number }
export interface SummaryResult {
  range: ResolvedRange; groupBy: GroupBy
  filters: { branchCode?: string; supplier?: string }
  totals: { spendExVat: number; spendWithVat: number; orders: number; units: number }
  groups: SummaryGroup[]; note: string
}
export interface TopProduct { productId?: string; name: string; supplier: string; units: number; spendExVat: number; orders: number }
export interface TopProductsResult { range: ResolvedRange; by: TopBy; filters: { branchCode?: string; supplier?: string }; products: TopProduct[]; note: string }
export interface BranchOverview { branchCode: string; branch: string; lastOrderAt?: string; pendingOrders: number; thisMonthSpendExVat: number }
export interface OverviewResult {
  now: string
  pending: { orders: number; spendExVat: number }
  today: { orders: number; spendExVat: number }
  thisWeek: { orders: number; spendExVat: number }
  thisMonth: { orders: number; spendExVat: number }
  branches: BranchOverview[]
  topSuppliersThisMonth: { supplier: string; spendExVat: number }[]
}
```

- [ ] **Step 2: Write the failing test** `tests/orderInsights/period.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolvePeriod, resolveExplicit } from '../../shared/orderInsights/period'

describe('resolvePeriod (Asia/Jerusalem, DST-aware)', () => {
  it('this_month in July (IDT, UTC+3) spans Israel-local month boundaries', () => {
    const r = resolvePeriod('this_month', '2026-07-15T09:00:00.000Z')
    expect(r.from).toBe('2026-06-30T21:00:00.000Z') // 1 Jul 00:00 +03:00
    expect(r.to).toBe('2026-07-31T21:00:00.000Z')   // 1 Aug 00:00 +03:00
    expect(r.label).toBe('יולי 2026')
  })
  it('this_month in January (IST, UTC+2) uses the winter offset', () => {
    const r = resolvePeriod('this_month', '2026-01-15T09:00:00.000Z')
    expect(r.from).toBe('2025-12-31T22:00:00.000Z') // 1 Jan 00:00 +02:00
    expect(r.to).toBe('2026-01-31T22:00:00.000Z')
  })
  it('last_month steps back one calendar month', () => {
    const r = resolvePeriod('last_month', '2026-07-15T09:00:00.000Z')
    expect(r.from).toBe('2026-05-31T21:00:00.000Z')
    expect(r.to).toBe('2026-06-30T21:00:00.000Z')
    expect(r.label).toBe('יוני 2026')
  })
  it('last_30d is a rolling window ending now', () => {
    const now = '2026-07-15T09:00:00.000Z'
    const r = resolvePeriod('last_30d', now)
    expect(r.to).toBe(now)
    expect(r.from).toBe(new Date(Date.parse(now) - 30 * 86400000).toISOString())
  })
  it('all starts at the epoch', () => {
    const r = resolvePeriod('all', '2026-07-15T09:00:00.000Z')
    expect(r.from).toBe('1970-01-01T00:00:00.000Z')
  })
})

describe('resolveExplicit', () => {
  it('treats to-date as inclusive (adds one day) at Israel midnight', () => {
    const r = resolveExplicit('2026-07-01', '2026-07-31')
    expect(r.from).toBe('2026-06-30T21:00:00.000Z')
    expect(r.to).toBe('2026-07-31T21:00:00.000Z')
  })
})
```

- [ ] **Step 3: Run it — expect FAIL** (module not found): `npx vitest run tests/orderInsights/period.test.ts`

- [ ] **Step 4: Write `period.ts`** (scratchpad → cp). Full content:

```ts
import type { PeriodPreset, ResolvedRange } from './types'

export const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
export const HE_WEEKDAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
const TZ = 'Asia/Jerusalem'
const DAY = 86400000

export function israelParts(instant: Date): { year: number; month: number; day: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { year: +p.year, month: +p.month, day: +p.day, weekday: wd[p.weekday] }
}

function tzOffsetMs(instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  let hour = +p.hour
  if (hour === 24) hour = 0
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second)
  return asUTC - instant.getTime()
}

// UTC instant of Israel-local midnight for (y, m[1-based], d). Overflow in d/m is normalized by Date.UTC.
function israelMidnightUTC(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0)
  const offset = tzOffsetMs(new Date(guess))
  return new Date(guess - offset)
}

export function resolvePeriod(preset: PeriodPreset, nowISO: string): ResolvedRange {
  const now = new Date(nowISO)
  const { year: y, month: m, day: d, weekday: wd } = israelParts(now)
  const iso = (dt: Date) => dt.toISOString()
  const mid = israelMidnightUTC
  switch (preset) {
    case 'today':      return { from: iso(mid(y, m, d)),     to: iso(mid(y, m, d + 1)), label: 'היום' }
    case 'yesterday':  return { from: iso(mid(y, m, d - 1)), to: iso(mid(y, m, d)),     label: 'אתמול' }
    case 'this_week':  { const s = mid(y, m, d - wd); return { from: iso(s), to: iso(new Date(s.getTime() + 7 * DAY)), label: 'השבוע' } }
    case 'last_week':  { const cur = mid(y, m, d - wd); const s = new Date(cur.getTime() - 7 * DAY); return { from: iso(s), to: iso(cur), label: 'שבוע שעבר' } }
    case 'this_month': return { from: iso(mid(y, m, 1)), to: iso(mid(y, m + 1, 1)), label: `${HE_MONTHS[m - 1]} ${y}` }
    case 'last_month': { const pm = m === 1 ? 12 : m - 1; const py = m === 1 ? y - 1 : y; return { from: iso(mid(py, pm, 1)), to: iso(mid(y, m, 1)), label: `${HE_MONTHS[pm - 1]} ${py}` } }
    case 'last_30d':   return { from: iso(new Date(now.getTime() - 30 * DAY)), to: iso(now), label: '30 הימים האחרונים' }
    case 'last_90d':   return { from: iso(new Date(now.getTime() - 90 * DAY)), to: iso(now), label: '90 הימים האחרונים' }
    case 'this_quarter': { const qs = Math.floor((m - 1) / 3) * 3 + 1; return { from: iso(mid(y, qs, 1)), to: iso(mid(y, qs + 3, 1)), label: `רבעון ${Math.floor((m - 1) / 3) + 1}/${y}` } }
    case 'last_quarter': { const cqs = Math.floor((m - 1) / 3) * 3 + 1; return { from: iso(mid(y, cqs - 3, 1)), to: iso(mid(y, cqs, 1)), label: 'רבעון קודם' } }
    case 'ytd':        return { from: iso(mid(y, 1, 1)), to: iso(now), label: `מתחילת ${y}` }
    case 'all':        return { from: '1970-01-01T00:00:00.000Z', to: iso(now), label: 'כל הזמן' }
  }
}

export function resolveExplicit(fromDate: string, toDate: string): ResolvedRange {
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  return {
    from: israelMidnightUTC(fy, fm, fd).toISOString(),
    to: israelMidnightUTC(ty, tm, td + 1).toISOString(), // inclusive end day
    label: `${fromDate} – ${toDate}`,
  }
}
```

- [ ] **Step 5: Run — expect PASS**: `npx vitest run tests/orderInsights/period.test.ts`

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && git add shared/orderInsights/types.ts shared/orderInsights/period.ts tests/orderInsights/period.test.ts && git commit -m "feat(insights): OrderRecord types + Asia/Jerusalem period resolution"
```

---

### Task 2: engine — computeSummary

**Files:**
- Create: `shared/orderInsights/engine.ts`
- Test: `tests/orderInsights/engine.test.ts`

**Interfaces:**
- Consumes: types from Task 1; `resolvePeriod`, `resolveExplicit`, `israelParts`, `HE_MONTHS`, `HE_WEEKDAYS` from `period.ts`.
- Produces: `computeSummary(orders: OrderRecord[], query: SummaryQuery, nowISO: string): SummaryResult`. Internal helpers `isActive`, `inRange`, `orderSubtotal`, `round2`, `withVat`, `buildGroups`, `groupKey` (later tasks in this file rely on these helpers existing — do not rename).

- [ ] **Step 1: Write the failing test** `tests/orderInsights/engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeSummary } from '../../shared/orderInsights/engine'
import type { OrderRecord } from '../../shared/orderInsights/types'

const NOW = '2026-07-15T09:00:00.000Z' // this_month = July 2026

const orders: OrderRecord[] = [
  { id: 'o1', branch: 'רמלה', branchCode: '101', createdAt: '2026-07-03T08:00:00.000Z', status: 'dispatched', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 5 },
    { productId: 'p2', name: 'מגש', supplier: 'ניר', price: 20, quantity: 2 },
  ] },
  { id: 'o2', branch: 'לוד', branchCode: '102', createdAt: '2026-07-10T08:00:00.000Z', status: 'pending', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 3 },
  ] },
  { id: 'o3', branch: 'רמלה', branchCode: '101', createdAt: '2026-06-20T08:00:00.000Z', status: 'dispatched', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 100 },
  ] },
  { id: 'o4', branch: 'לוד', branchCode: '102', createdAt: '2026-07-05T08:00:00.000Z', status: 'deleted', items: [
    { productId: 'p2', name: 'מגש', supplier: 'ניר', price: 20, quantity: 50 },
  ] },
]

describe('computeSummary', () => {
  it('totals + supplier groups for this_month, excluding out-of-range and deleted', () => {
    const r = computeSummary(orders, { period: 'this_month', groupBy: 'supplier' }, NOW)
    expect(r.range.label).toBe('יולי 2026')
    expect(r.totals).toEqual({ spendExVat: 120, spendWithVat: 140.4, orders: 2, units: 10 })
    expect(r.groups.map(g => [g.key, g.spendExVat, g.orders, g.units])).toEqual([['טרה', 80, 2, 8], ['ניר', 40, 1, 2]])
  })

  it('supplier filter narrows to item-level and groups by branch', () => {
    const r = computeSummary(orders, { period: 'this_month', groupBy: 'branch', supplier: 'טרה' }, NOW)
    expect(r.filters).toEqual({ supplier: 'טרה' })
    expect(r.totals.spendExVat).toBe(80)
    expect(r.groups.map(g => [g.key, g.spendExVat])).toEqual([['101', 50], ['102', 30]])
  })

  it('groupBy none returns totals only', () => {
    const r = computeSummary(orders, { period: 'this_month', groupBy: 'none' }, NOW)
    expect(r.groups).toEqual([])
    expect(r.totals.spendExVat).toBe(120)
  })

  it('empty range yields zeros, not an error', () => {
    const r = computeSummary(orders, { from: '2020-01-01', to: '2020-01-31' }, NOW)
    expect(r.totals).toEqual({ spendExVat: 0, spendWithVat: 0, orders: 0, units: 0 })
    expect(r.groups).toEqual([])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**: `npx vitest run tests/orderInsights/engine.test.ts`

- [ ] **Step 3: Write `engine.ts`** (scratchpad → cp) with the shared helpers + `computeSummary`:

```ts
import type {
  OrderRecord, OrderItemRecord, SummaryQuery, SummaryResult, SummaryGroup,
  GroupBy, ResolvedRange,
} from './types'
import { resolvePeriod, resolveExplicit, israelParts, HE_MONTHS, HE_WEEKDAYS } from './period'

const NOTE_EXVAT = 'סכומים לפני מע"מ; spendWithVat = ×1.17'

export function isActive(o: OrderRecord): boolean {
  return o.status === 'pending' || o.status === 'dispatched'
}
export function inRange(o: OrderRecord, range: ResolvedRange): boolean {
  return o.createdAt >= range.from && o.createdAt < range.to // ISO-UTC strings sort chronologically
}
export function orderSubtotal(o: OrderRecord): number {
  return o.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
}
export const round2 = (n: number): number => Math.round(n * 100) / 100
export const withVat = (exVat: number): number => round2(exVat * 1.17)

function rangeFor(q: { period?: string; from?: string; to?: string }, nowISO: string): ResolvedRange {
  return q.from && q.to ? resolveExplicit(q.from, q.to) : resolvePeriod((q.period as any) ?? 'this_month', nowISO)
}

function groupKey(o: OrderRecord, it: OrderItemRecord, groupBy: GroupBy): { key: string; label: string } {
  switch (groupBy) {
    case 'supplier': return { key: it.supplier, label: it.supplier }
    case 'branch':   return { key: o.branchCode, label: o.branch }
    case 'month':    { const p = israelParts(new Date(o.createdAt)); return { key: `${p.year}-${String(p.month).padStart(2, '0')}`, label: `${HE_MONTHS[p.month - 1]} ${p.year}` } }
    case 'weekday':  { const wd = israelParts(new Date(o.createdAt)).weekday; return { key: String(wd), label: HE_WEEKDAYS[wd] } }
    default:         return { key: 'all', label: 'הכל' }
  }
}

function buildGroups(scoped: OrderRecord[], groupBy: GroupBy, supplierFilter?: string): SummaryGroup[] {
  if (groupBy === 'none') return []
  const map = new Map<string, { label: string; spend: number; units: number; orders: Set<string> }>()
  for (const o of scoped) {
    for (const it of o.items) {
      if (supplierFilter && it.supplier !== supplierFilter) continue
      const { key, label } = groupKey(o, it, groupBy)
      let g = map.get(key)
      if (!g) { g = { label, spend: 0, units: 0, orders: new Set() }; map.set(key, g) }
      g.spend += (Number(it.price) || 0) * (Number(it.quantity) || 0)
      g.units += Number(it.quantity) || 0
      g.orders.add(o.id)
    }
  }
  return [...map.entries()].map(([key, g]) => ({
    key, label: g.label, spendExVat: round2(g.spend), spendWithVat: withVat(g.spend), orders: g.orders.size, units: g.units,
  }))
}

export function computeSummary(orders: OrderRecord[], query: SummaryQuery, nowISO: string): SummaryResult {
  const range = rangeFor(query, nowISO)
  const groupBy = query.groupBy ?? 'none'
  const limit = query.limit ?? 50
  const filters: { branchCode?: string; supplier?: string } = {}
  if (query.branchCode) filters.branchCode = query.branchCode
  if (query.supplier) filters.supplier = query.supplier

  const scoped = orders.filter(o => isActive(o) && inRange(o, range) && (!query.branchCode || o.branchCode === query.branchCode))

  let spend = 0, units = 0
  const orderIds = new Set<string>()
  for (const o of scoped) {
    for (const it of o.items) {
      if (query.supplier && it.supplier !== query.supplier) continue
      spend += (Number(it.price) || 0) * (Number(it.quantity) || 0)
      units += Number(it.quantity) || 0
      orderIds.add(o.id)
    }
  }

  const groups = buildGroups(scoped, groupBy, query.supplier)
    .sort((a, b) => b.spendExVat - a.spendExVat)
    .slice(0, limit)

  return {
    range, groupBy, filters,
    totals: { spendExVat: round2(spend), spendWithVat: withVat(spend), orders: orderIds.size, units },
    groups, note: NOTE_EXVAT,
  }
}
```

- [ ] **Step 4: Run — expect PASS**: `npx vitest run tests/orderInsights/engine.test.ts`

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && git add shared/orderInsights/engine.ts tests/orderInsights/engine.test.ts && git commit -m "feat(insights): computeSummary aggregation engine"
```

---

### Task 3: engine — computeTopProducts

**Files:**
- Modify: `shared/orderInsights/engine.ts` (append)
- Test: `tests/orderInsights/engine.test.ts` (append a describe block)

**Interfaces:**
- Consumes: helpers from Task 2 (`isActive`, `inRange`, `round2`), `rangeFor`.
- Produces: `computeTopProducts(orders: OrderRecord[], query: TopProductsQuery, nowISO: string): TopProductsResult`.

- [ ] **Step 1: Append the failing test** to `tests/orderInsights/engine.test.ts` (add import of `computeTopProducts` to the existing import line):

```ts
// add to the import from engine: import { computeSummary, computeTopProducts } from ...
describe('computeTopProducts', () => {
  it('aggregates by productId and sorts by the chosen metric', () => {
    const t = computeTopProducts(orders, { period: 'this_month', by: 'quantity' }, NOW)
    expect(t.by).toBe('quantity')
    expect(t.products[0]).toMatchObject({ productId: 'p1', units: 8, spendExVat: 80, orders: 2 })
    expect(t.products[1]).toMatchObject({ productId: 'p2', units: 2, spendExVat: 40 })
  })
  it('respects limit', () => {
    const t = computeTopProducts(orders, { period: 'this_month', by: 'spend', limit: 1 }, NOW)
    expect(t.products).toHaveLength(1)
    expect(t.products[0].productId).toBe('p1')
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`computeTopProducts` not exported): `npx vitest run tests/orderInsights/engine.test.ts`

- [ ] **Step 3: Append to `engine.ts`** (add `TopProductsQuery, TopProductsResult` to the type import at the top, then append):

```ts
export function computeTopProducts(orders: OrderRecord[], query: TopProductsQuery, nowISO: string): TopProductsResult {
  const range = rangeFor(query, nowISO)
  const by = query.by ?? 'spend'
  const limit = Math.min(query.limit ?? 10, 50)
  const filters: { branchCode?: string; supplier?: string } = {}
  if (query.branchCode) filters.branchCode = query.branchCode
  if (query.supplier) filters.supplier = query.supplier

  const scoped = orders.filter(o => isActive(o) && inRange(o, range) && (!query.branchCode || o.branchCode === query.branchCode))
  const map = new Map<string, { productId?: string; name: string; supplier: string; units: number; spend: number; orders: Set<string> }>()
  for (const o of scoped) {
    for (const it of o.items) {
      if (query.supplier && it.supplier !== query.supplier) continue
      const key = it.productId || `${it.name}|${it.supplier}`
      let p = map.get(key)
      if (!p) { p = { productId: it.productId, name: it.name, supplier: it.supplier, units: 0, spend: 0, orders: new Set() }; map.set(key, p) }
      p.units += Number(it.quantity) || 0
      p.spend += (Number(it.price) || 0) * (Number(it.quantity) || 0)
      p.orders.add(o.id)
    }
  }
  const products = [...map.values()]
    .map(p => ({ ...(p.productId ? { productId: p.productId } : {}), name: p.name, supplier: p.supplier, units: p.units, spendExVat: round2(p.spend), orders: p.orders.size }))
    .sort((a, b) => (by === 'quantity' ? b.units - a.units : b.spendExVat - a.spendExVat))
    .slice(0, limit)
  return { range, by, filters, products, note: 'סכומים לפני מע"מ' }
}
```

- [ ] **Step 4: Run — expect PASS**: `npx vitest run tests/orderInsights/engine.test.ts`

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && git add shared/orderInsights/engine.ts tests/orderInsights/engine.test.ts && git commit -m "feat(insights): computeTopProducts"
```

---

### Task 4: engine — computeOverview

**Files:**
- Modify: `shared/orderInsights/engine.ts` (append)
- Test: `tests/orderInsights/engine.test.ts` (append)

**Interfaces:**
- Consumes: helpers from Task 2 (`isActive`, `inRange`, `orderSubtotal`, `round2`), `resolvePeriod`.
- Produces: `computeOverview(orders: OrderRecord[], nowISO: string): OverviewResult`.

- [ ] **Step 1: Append the failing test** (add `computeOverview` to the engine import):

```ts
describe('computeOverview', () => {
  it('summarizes pending/today/week/month, branches by recency, top suppliers', () => {
    const ov = computeOverview(orders, NOW)
    expect(ov.pending).toEqual({ orders: 1, spendExVat: 30 })       // o2 only
    expect(ov.thisMonth).toEqual({ orders: 2, spendExVat: 120 })    // o1 + o2
    expect(ov.branches[0].branchCode).toBe('102')                   // o2 Jul10 latest
    expect(ov.branches.find(b => b.branchCode === '101')?.thisMonthSpendExVat).toBe(90) // o1 only, o3 is June
    expect(ov.topSuppliersThisMonth).toEqual([{ supplier: 'טרה', spendExVat: 80 }, { supplier: 'ניר', spendExVat: 40 }])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**: `npx vitest run tests/orderInsights/engine.test.ts`

- [ ] **Step 3: Append to `engine.ts`** (add `OverviewResult` to type import; note `resolvePeriod` is already imported):

```ts
export function computeOverview(orders: OrderRecord[], nowISO: string): OverviewResult {
  const today = resolvePeriod('today', nowISO)
  const week = resolvePeriod('this_week', nowISO)
  const month = resolvePeriod('this_month', nowISO)
  const active = orders.filter(isActive)

  const sumRange = (range: typeof today) => {
    let spend = 0; const ids = new Set<string>()
    for (const o of active) if (inRange(o, range)) { spend += orderSubtotal(o); ids.add(o.id) }
    return { orders: ids.size, spendExVat: round2(spend) }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const pending = { orders: pendingOrders.length, spendExVat: round2(pendingOrders.reduce((s, o) => s + orderSubtotal(o), 0)) }

  const branchMap = new Map<string, { branch: string; lastOrderAt?: string; pendingOrders: number; monthSpend: number }>()
  for (const o of active) {
    let b = branchMap.get(o.branchCode)
    if (!b) { b = { branch: o.branch, pendingOrders: 0, monthSpend: 0 }; branchMap.set(o.branchCode, b) }
    if (!b.lastOrderAt || o.createdAt > b.lastOrderAt) b.lastOrderAt = o.createdAt
    if (o.status === 'pending') b.pendingOrders++
    if (inRange(o, month)) b.monthSpend += orderSubtotal(o)
  }
  const branches = [...branchMap.entries()]
    .map(([branchCode, b]) => ({ branchCode, branch: b.branch, ...(b.lastOrderAt ? { lastOrderAt: b.lastOrderAt } : {}), pendingOrders: b.pendingOrders, thisMonthSpendExVat: round2(b.monthSpend) }))
    .sort((a, b) => (b.lastOrderAt ?? '').localeCompare(a.lastOrderAt ?? ''))

  const supMap = new Map<string, number>()
  for (const o of active) if (inRange(o, month)) for (const it of o.items) supMap.set(it.supplier, (supMap.get(it.supplier) ?? 0) + (Number(it.price) || 0) * (Number(it.quantity) || 0))
  const topSuppliersThisMonth = [...supMap.entries()].map(([supplier, spend]) => ({ supplier, spendExVat: round2(spend) })).sort((a, b) => b.spendExVat - a.spendExVat).slice(0, 5)

  return { now: nowISO, pending, today: sumRange(today), thisWeek: sumRange(week), thisMonth: sumRange(month), branches, topSuppliersThisMonth }
}
```

- [ ] **Step 4: Run — expect PASS**: `npx vitest run tests/orderInsights/engine.test.ts`

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && git add shared/orderInsights/engine.ts tests/orderInsights/engine.test.ts && git commit -m "feat(insights): computeOverview"
```

---

### Task 5: pure router

**Files:**
- Create: `shared/orderInsights/router.ts`
- Test: `tests/orderInsights/router.test.ts`

**Interfaces:**
- Consumes: `computeSummary`, `computeTopProducts`, `computeOverview`; types.
- Produces: `routeInsights(req: InsightsRequest, orders: OrderRecord[], nowISO: string): InsightsResponse` where `InsightsRequest = { method: string; path: string; query: Record<string,string|undefined>; role: 'app'|'admin'|'gpt' }` and `InsightsResponse = { statusCode: number; body: string }`.

- [ ] **Step 1: Write the failing test** `tests/orderInsights/router.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { routeInsights } from '../../shared/orderInsights/router'
import type { OrderRecord } from '../../shared/orderInsights/types'

const NOW = '2026-07-15T09:00:00.000Z'
const orders: OrderRecord[] = [
  { id: 'o1', branch: 'רמלה', branchCode: '101', createdAt: '2026-07-03T08:00:00.000Z', status: 'dispatched', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 5 },
    { productId: 'p2', name: 'מגש', supplier: 'ניר', price: 20, quantity: 2 },
  ] },
  { id: 'o2', branch: 'לוד', branchCode: '102', createdAt: '2026-07-10T08:00:00.000Z', status: 'pending', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 3 },
  ] },
]
const base = { method: 'GET', path: '/api/insights/summary', query: {}, role: 'gpt' as const }

describe('routeInsights', () => {
  it('forbids the app role (cross-branch analytics is admin/gpt only)', () => {
    expect(routeInsights({ ...base, role: 'app' }, orders, NOW).statusCode).toBe(403)
  })
  it('rejects non-GET', () => {
    expect(routeInsights({ ...base, method: 'POST' }, orders, NOW).statusCode).toBe(405)
  })
  it('404 on unknown path', () => {
    expect(routeInsights({ ...base, path: '/api/insights/nope' }, orders, NOW).statusCode).toBe(404)
  })
  it('400 on invalid period', () => {
    expect(routeInsights({ ...base, query: { period: 'bogus' } }, orders, NOW).statusCode).toBe(400)
  })
  it('200 summary returns correct totals', () => {
    const res = routeInsights({ ...base, query: { period: 'this_month', groupBy: 'supplier' } }, orders, NOW)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).totals.spendExVat).toBe(120)
  })
  it('overview response stays well under 100KB for ~450 orders', () => {
    const many: OrderRecord[] = Array.from({ length: 450 }, (_, i) => ({
      id: 'x' + i, branch: 'רמלה', branchCode: String(101 + (i % 9)), createdAt: '2026-07-0' + (1 + (i % 9)) + 'T08:00:00.000Z',
      status: 'dispatched', items: [{ productId: 'p' + (i % 20), name: 'פריט', supplier: 'ספק' + (i % 8), price: 5, quantity: 3 }],
    }))
    const res = routeInsights({ ...base, path: '/api/insights/overview' }, many, NOW)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeLessThan(100000)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**: `npx vitest run tests/orderInsights/router.test.ts`

- [ ] **Step 3: Write `router.ts`** (scratchpad → cp):

```ts
import type { OrderRecord, GroupBy, TopBy, PeriodPreset } from './types'
import { computeSummary, computeTopProducts, computeOverview } from './engine'

export interface InsightsRequest {
  method: string
  path: string
  query: Record<string, string | undefined>
  role: 'app' | 'admin' | 'gpt'
}
export interface InsightsResponse { statusCode: number; body: string }

const VALID_PERIOD = new Set(['today','yesterday','this_week','last_week','this_month','last_month','last_30d','last_90d','this_quarter','last_quarter','ytd','all'])
const VALID_GROUP = new Set(['none','supplier','branch','month','weekday'])
const VALID_BY = new Set(['quantity','spend'])

const resp = (statusCode: number, body: unknown): InsightsResponse => ({ statusCode, body: JSON.stringify(body) })

export function routeInsights(req: InsightsRequest, orders: OrderRecord[], nowISO: string): InsightsResponse {
  if (req.role === 'app') return resp(403, { error: 'forbidden' })
  if (req.method !== 'GET') return resp(405, { error: 'method_not_allowed' })

  const seg = req.path.replace(/^\/api\/insights\/?/, '').split('/').filter(Boolean)
  const q = req.query
  const limit = q.limit ? Number(q.limit) : undefined
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) return resp(400, { error: 'invalid_param', param: 'limit' })
  if (q.period && !VALID_PERIOD.has(q.period)) return resp(400, { error: 'invalid_param', param: 'period' })

  if (seg[0] === 'summary') {
    if (q.groupBy && !VALID_GROUP.has(q.groupBy)) return resp(400, { error: 'invalid_param', param: 'groupBy' })
    return resp(200, computeSummary(orders, { period: q.period as PeriodPreset, from: q.from, to: q.to, groupBy: q.groupBy as GroupBy, branchCode: q.branchCode, supplier: q.supplier, limit }, nowISO))
  }
  if (seg[0] === 'top-products') {
    if (q.by && !VALID_BY.has(q.by)) return resp(400, { error: 'invalid_param', param: 'by' })
    return resp(200, computeTopProducts(orders, { period: q.period as PeriodPreset, from: q.from, to: q.to, by: q.by as TopBy, branchCode: q.branchCode, supplier: q.supplier, limit }, nowISO))
  }
  if (seg[0] === 'overview') {
    return resp(200, computeOverview(orders, nowISO))
  }
  return resp(404, { error: 'not_found' })
}
```

- [ ] **Step 4: Run — expect PASS**: `npx vitest run tests/orderInsights/router.test.ts`

- [ ] **Step 5: Full suite + typecheck**: `npx vitest run tests/orderInsights && npx tsc --noEmit` (expect all green, 0 TS errors).

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && git add shared/orderInsights/router.ts tests/orderInsights/router.test.ts && git commit -m "feat(insights): pure request router (role gate + param validation)"
```

---

### Task 6: Netlify function + routing

**Files:**
- Create: `netlify/functions/insights-api.ts`
- Modify: `netlify.toml` (add redirect)

**Interfaces:**
- Consumes: `authorizePriceRequest` from `./_priceCatalogAuth`; `routeInsights` from `../../shared/orderInsights/router`; `OrderRecord` type.
- Produces: HTTP endpoint at `/api/insights/*`. No unit test (blob I/O); verified by `tsc`, `build`, and live check in Task 8.

- [ ] **Step 1: Write `insights-api.ts`** (scratchpad → cp):

```ts
import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { authorizePriceRequest } from './_priceCatalogAuth'
import { routeInsights } from '../../shared/orderInsights/router'
import type { OrderRecord } from '../../shared/orderInsights/types'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  return siteID && token ? getStore({ name, siteID, token }) : getStore(name)
}

// נורמול הנתיב ל-/api/insights/... גם כשמופעל כ-/.netlify/functions/insights-api/...
function normalizePath(rawPath: string): string {
  if (rawPath.startsWith('/api/insights')) return rawPath
  const marker = '/insights-api'
  const i = rawPath.indexOf(marker)
  return '/api/insights' + (i >= 0 ? rawPath.slice(i + marker.length) : '')
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const auth = authorizePriceRequest(
    { headers: event.headers, queryStringParameters: event.queryStringParameters },
    'read',
    { API_TOKEN: process.env.API_TOKEN, PRICE_GPT_TOKEN: process.env.PRICE_GPT_TOKEN, PRICE_SESSION_SECRET: process.env.PRICE_SESSION_SECRET },
    Date.now(),
  )
  if (!auth) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'unauthorized' }) }

  try {
    const store = openStore('meshausha-orders')
    const { blobs } = await store.list()
    const raw = await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' })))
    const orders = raw.filter(Boolean) as OrderRecord[]

    const res = routeInsights(
      { method: event.httpMethod, path: normalizePath(event.path), query: event.queryStringParameters ?? {}, role: auth.role },
      orders,
      new Date().toISOString(),
    )
    return { statusCode: res.statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: res.body }
  } catch {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal_error' }) }
  }
}
```

- [ ] **Step 2: Add the redirect to `netlify.toml`** via Python patch (run in Bash). Inserts the `/api/insights/*` rule immediately before the `/api/price-auth` rule (both must precede the SPA `/*`):

```python
# scratchpad/patch_toml.py
import io, sys
path = "netlify.toml"
s = io.open(path, "r", encoding="utf-8").read()
anchor = '[[redirects]]\n  from = "/api/price-auth"'
block = '''[[redirects]]
  from = "/api/insights/*"
  to = "/.netlify/functions/insights-api/:splat"
  status = 200
  force = true

'''
if anchor not in s: print("!! anchor not found"); sys.exit(1)
if "/api/insights/*" in s: print("already patched"); sys.exit(0)
s = s.replace(anchor, block + anchor, 1)
io.open(path, "w", encoding="utf-8", newline="\n").write(s)
print("netlify.toml patched")
```

Run: `cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && python "<scratch>/patch_toml.py"`

- [ ] **Step 3: Typecheck + build** (expect 0 errors): `cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && npx tsc --noEmit && npm run build`

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && git add netlify/functions/insights-api.ts netlify.toml && git commit -m "feat(insights): Netlify function + /api/insights routing"
```

---

### Task 7: GPT config (openapi + instructions)

**Files:**
- Modify: `docs/gpt/openapi.yaml`
- Modify: `docs/gpt/gpt-instructions.md`

**Interfaces:**
- Consumes: the live `/api/insights/*` endpoints (Task 6).
- Produces: 3 read operations (`getInsightsSummary`, `getTopProducts`, `getInsightsOverview`) in the GPT's existing Action; a Hebrew usage section.

- [ ] **Step 1: Patch `openapi.yaml`** via Python (run in Bash). Adds 3 paths before `components:\n  securitySchemes:` and 3 schemas at EOF. Asserts each description ≤300:

```python
# scratchpad/patch_openapi_insights.py
import io, sys
p = "docs/gpt/openapi.yaml"
s = io.open(p, "r", encoding="utf-8").read()

d_sum = 'סיכום הוצאות/כמויות הזמנות בטווח זמן, עם פילוח לפי ספק/סניף/חודש/יום (groupBy). period (this_month/last_month/last_30d/this_quarter/ytd/all וכו׳) או from+to (YYYY-MM-DD). סכומים לפני מע"מ (spendWithVat=×1.17). סינון אופציונלי: branchCode/supplier. מחזיר totals+groups ממוינים.'
d_top = 'המוצרים המובילים בהזמנות בטווח זמן, לפי כמות (by=quantity) או כסף (by=spend). period או from+to; סינון אופציונלי branchCode/supplier; limit (ברירת מחדל 10, מקס׳ 50). סכומים לפני מע"מ. מחזיר שם/ספק/כמות/סכום/מס׳ הזמנות.'
d_ov  = 'תמונת מצב עכשווית של ההזמנות: ממתינות, סכומי היום/השבוע/החודש, פירוט לכל סניף (הזמנה אחרונה + ממתינות + הוצאת החודש), וספקים מובילים החודש. סכומים לפני מע"מ. בלי פרמטרים.'
for name, d in [('summary', d_sum), ('top', d_top), ('overview', d_ov)]:
    assert len(d) <= 300, "%s description too long: %d" % (name, len(d))
    print(name, "desc len", len(d))

paths = '''  /api/insights/summary:
    get:
      operationId: getInsightsSummary
      summary: סיכום הזמנות/הוצאות
      description: '%s'
      parameters:
        - { name: period, in: query, schema: { type: string, enum: [today, yesterday, this_week, last_week, this_month, last_month, last_30d, last_90d, this_quarter, last_quarter, ytd, all] } }
        - { name: from, in: query, schema: { type: string, description: 'YYYY-MM-DD (עם to)' } }
        - { name: to, in: query, schema: { type: string } }
        - { name: groupBy, in: query, schema: { type: string, enum: [none, supplier, branch, month, weekday] } }
        - { name: branchCode, in: query, schema: { type: string } }
        - { name: supplier, in: query, schema: { type: string } }
        - { name: limit, in: query, schema: { type: integer } }
      responses:
        "200": { description: סיכום, content: { application/json: { schema: { $ref: "#/components/schemas/InsightsSummary" } } } }
  /api/insights/top-products:
    get:
      operationId: getTopProducts
      summary: מוצרים מובילים
      description: '%s'
      parameters:
        - { name: period, in: query, schema: { type: string, enum: [today, yesterday, this_week, last_week, this_month, last_month, last_30d, last_90d, this_quarter, last_quarter, ytd, all] } }
        - { name: from, in: query, schema: { type: string } }
        - { name: to, in: query, schema: { type: string } }
        - { name: by, in: query, schema: { type: string, enum: [quantity, spend] } }
        - { name: branchCode, in: query, schema: { type: string } }
        - { name: supplier, in: query, schema: { type: string } }
        - { name: limit, in: query, schema: { type: integer } }
      responses:
        "200": { description: מוצרים מובילים, content: { application/json: { schema: { $ref: "#/components/schemas/TopProducts" } } } }
  /api/insights/overview:
    get:
      operationId: getInsightsOverview
      summary: תמונת מצב הזמנות
      description: '%s'
      responses:
        "200": { description: תמונת מצב, content: { application/json: { schema: { $ref: "#/components/schemas/InsightsOverview" } } } }

''' % (d_sum, d_top, d_ov)

marker = "\ncomponents:\n  securitySchemes:"
if marker not in s: print("!! components marker not found"); sys.exit(1)
s = s.replace(marker, "\n" + paths + "components:\n  securitySchemes:", 1)

schemas = '''
    InsightsSummary:
      type: object
      properties:
        range: { type: object, properties: { from: { type: string }, to: { type: string }, label: { type: string } } }
        groupBy: { type: string }
        filters: { type: object, properties: { branchCode: { type: string }, supplier: { type: string } } }
        totals: { type: object, properties: { spendExVat: { type: number }, spendWithVat: { type: number }, orders: { type: integer }, units: { type: number } } }
        groups:
          type: array
          items:
            type: object
            properties: { key: { type: string }, label: { type: string }, spendExVat: { type: number }, spendWithVat: { type: number }, orders: { type: integer }, units: { type: number } }
        note: { type: string }
    TopProducts:
      type: object
      properties:
        range: { type: object, properties: { from: { type: string }, to: { type: string }, label: { type: string } } }
        by: { type: string }
        products:
          type: array
          items:
            type: object
            properties: { productId: { type: string }, name: { type: string }, supplier: { type: string }, units: { type: number }, spendExVat: { type: number }, orders: { type: integer } }
        note: { type: string }
    InsightsOverview:
      type: object
      properties:
        now: { type: string }
        pending: { type: object, properties: { orders: { type: integer }, spendExVat: { type: number } } }
        today: { type: object, properties: { orders: { type: integer }, spendExVat: { type: number } } }
        thisWeek: { type: object, properties: { orders: { type: integer }, spendExVat: { type: number } } }
        thisMonth: { type: object, properties: { orders: { type: integer }, spendExVat: { type: number } } }
        branches:
          type: array
          items:
            type: object
            properties: { branchCode: { type: string }, branch: { type: string }, lastOrderAt: { type: string }, pendingOrders: { type: integer }, thisMonthSpendExVat: { type: number } }
        topSuppliersThisMonth:
          type: array
          items:
            type: object
            properties: { supplier: { type: string }, spendExVat: { type: number } }
'''
if not s.endswith("\n"): s += "\n"
s = s + schemas
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("openapi.yaml patched")
```

Run: `cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && python "<scratch>/patch_openapi_insights.py"`

- [ ] **Step 2: Validate the openapi** (js-yaml is a dev dep of the project). Run:

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && node -e '
const yaml = require("js-yaml"); const fs = require("fs");
const doc = yaml.load(fs.readFileSync("docs/gpt/openapi.yaml","utf8"));
if (doc.openapi !== "3.1.0") throw new Error("openapi != 3.1.0: " + doc.openapi);
const ops = [];
for (const [p, m] of Object.entries(doc.paths)) for (const [verb, op] of Object.entries(m)) { ops.push(op.operationId); if ((op.description||"").length > 300) throw new Error("desc>300: " + op.operationId); }
if (!ops.includes("getInsightsSummary") || !ops.includes("getTopProducts") || !ops.includes("getInsightsOverview")) throw new Error("missing insight ops: " + ops.join(","));
if (fs.readFileSync("docs/gpt/openapi.yaml","utf8").includes("nullable")) throw new Error("nullable present");
console.log("OK — operations:", ops.length, ops.join(", "));
'
```
Expected: `OK — operations: 13 getCatalogVersion, ... getInsightsSummary, getTopProducts, getInsightsOverview`

- [ ] **Step 3: Append the instructions section** to `docs/gpt/gpt-instructions.md` via Python (appends at EOF):

```python
# scratchpad/patch_instructions_insights.py
import io
p = "docs/gpt/gpt-instructions.md"
g = io.open(p, "r", encoding="utf-8").read()
section = '''

## שאלות על הזמנות ותובנות (קריאה בלבד)
כשמשתמש שואל על הזמנות/הוצאות/מגמות של הרשת:
1. בחר endpoint: כסף/פילוח → `getInsightsSummary`; "מה הכי מזמינים / כמויות" → `getTopProducts`; "מה קורה עכשיו / ממתין / היום" → `getInsightsOverview`.
2. תרגם את הזמן ל-`period` (this_month/last_month/last_30d/last_90d/this_week/this_quarter/last_quarter/ytd/all/today/yesterday) — **אל תחשב תאריכים בעצמך**. לטווח מדויק העבר `from`+`to` בפורמט YYYY-MM-DD.
3. ב-summary: `groupBy` = supplier/branch/month/weekday. סינון: `branchCode` או `supplier` (שם מדויק כפי שמופיע בנתונים; אם לא בטוח — הרץ summary לפי supplier וקח את השם משם).
4. הצג את המספרים כפי שחזרו. **ציין תמיד "לפני מע"מ".** לכולל-מע"מ השתמש ב-`spendWithVat` (או ×1.17). **אל תמציא מספרים** — אם `groups` ריק או המספרים 0, אמור "אין נתונים לתקופה".
5. הצע העמקה טבעית: אחרי סיכום-ספק → "רוצה לראות מה הכי הזמנו מהספק?" (`getTopProducts` עם `supplier`).

> הפעולות האלה **קריאה בלבד** — לא משנות דבר. הנתונים מכל הסניפים, למנהל בלבד.
'''
if "## שאלות על הזמנות ותובנות" in g:
    print("already present")
else:
    if not g.endswith("\n"): g += "\n"
    io.open(p, "w", encoding="utf-8", newline="\n").write(g + section)
    print("instructions patched")
```

Run: `cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && python "<scratch>/patch_instructions_insights.py"`

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && git add docs/gpt/openapi.yaml docs/gpt/gpt-instructions.md && git commit -m "feat(insights): GPT read operations + Hebrew usage instructions"
```

---

### Task 8: Deploy + live verify + handoff (Claude only, after explicit GO)

**Not a code task** — gated on OR saying GO. No file edits except handoff docs.

- [ ] **Step 1:** Full green gate: `cd "/c/Users/OR/קודקס/משאוושה/Meshausha" && npm test && npx tsc --noEmit && npm run build`.
- [ ] **Step 2:** After **explicit GO** from OR — deploy (Claude only) with the command in `docs/handoff/STATE.md` ("Deploy לפרודקשן").
- [ ] **Step 3:** Live verify against production with `PRICE_GPT_TOKEN` (read token from `docs/gpt/SETUP.md` at runtime; never print it): `GET /api/insights/overview` → `pending.orders ≈ 94`, body < 100KB; `GET /api/insights/summary?period=this_month&groupBy=supplier` → sane numbers; `GET /api/insights/summary` with the **app** token → 403.
- [ ] **Step 4:** Copy `docs/gpt/openapi.yaml` + `docs/gpt/gpt-instructions.md` to `C:\Users\OR\Desktop\gpt-update\`. Guide OR (step-by-step) to paste both into ChatGPT and confirm `getInsightsSummary`/`getTopProducts`/`getInsightsOverview` appear in the Action's operation list.
- [ ] **Step 5:** OR acceptance test (a real question, e.g. "כמה הוצאנו החודש על טרה פלסט?").
- [ ] **Step 6:** Run the `handoff` skill (new JOURNAL entry + STATE.md update + commit).

---

## Self-Review

**Spec coverage:** summary/top-products/overview → Tasks 2/3/4 + router 5 + function 6; period presets + Asia/Jerusalem DST → Task 1; item-level supplier split → Task 2 test; VAT convention → helpers Task 2; active-only + deleted/merged excluded → Task 2 test; auth gpt/admin + app→403 → Task 5 test + function 6; response <100KB → Task 5 test; routing redirect → Task 6; GPT config (3.1.0, ≤300, no nullable, no isConsequential) → Task 7 validation; omit-not-null → types (optional props) + engine spreads. All spec sections mapped.

**Placeholder scan:** No TBD/TODO; every code step has full code; every command has expected output.

**Type consistency:** `routeInsights(req, orders, nowISO)`, `computeSummary/TopProducts(orders, query, nowISO)`, `computeOverview(orders, nowISO)`, helper names (`isActive`,`inRange`,`orderSubtotal`,`round2`,`withVat`,`buildGroups`,`groupKey`,`rangeFor`) are used identically across Tasks 2–6. Response shapes match the `types.ts` interfaces from Task 1.
