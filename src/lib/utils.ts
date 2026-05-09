import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Order } from "../stores/ordersStore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return `₪${price.toFixed(2)}`
}

export function calculateVAT(amount: number, vatRate: number = 0.17): number {
  return amount * vatRate
}

export function calculateTotal(amount: number, vatRate: number = 0.17): number {
  return amount + calculateVAT(amount, vatRate)
}

/**
 * מחזיר Map<productName, number[]> של כמויות חודשיות עבור monthsBack החודשים האחרונים
 * (כולל החודש הנוכחי). הסדר במערך: מהישן לחדש. שימוש: sparkline בכל כרטיס מוצר.
 * עוטף את כל המוצרים בפעם אחת — זול יותר מלחשב per-card.
 */
export function buildProductHistoryMap(
  orders: Order[],
  monthsBack: number = 6,
): Map<string, number[]> {
  const now = new Date()
  // צור N דליים חודשיים. dxKey = year*12+month
  const buckets: number[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push(d.getFullYear() * 12 + d.getMonth())
  }
  const oldestKey = buckets[0]

  const map = new Map<string, number[]>()
  for (const order of orders) {
    if (order.status === 'deleted' || order.status === 'merged') continue
    const d = new Date(order.createdAt)
    const k = d.getFullYear() * 12 + d.getMonth()
    if (k < oldestKey) continue
    const idx = buckets.indexOf(k)
    if (idx < 0) continue
    for (const item of order.items) {
      let arr = map.get(item.name)
      if (!arr) {
        arr = new Array(monthsBack).fill(0)
        map.set(item.name, arr)
      }
      arr[idx] += item.quantity || 0
    }
  }
  return map
}
