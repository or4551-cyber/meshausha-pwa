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
