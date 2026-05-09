import { useEffect, useMemo, useState } from 'react'
import { useOrdersStore, type Order } from '../stores/ordersStore'
import { getOrdersFromCloud } from '../lib/cloudApi'

/** מחזיר רשימת הזמנות ממוזגת (ענן + מקומי). שומר API קודם ל-callers שלא צריכים isLoading. */
export function useAdminOrders(): Order[] {
  return useAdminOrdersWithLoading().orders
}

/** גרסה מורחבת שגם חושפת את isLoading — לשימוש בדפים שמראים skeleton. */
export function useAdminOrdersWithLoading(): { orders: Order[]; isLoading: boolean } {
  const { getAllOrders } = useOrdersStore()
  const localOrders = getAllOrders()
  const [cloudOrders, setCloudOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getOrdersFromCloud()
      .then(setCloudOrders)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const orders = useMemo(() => {
    const merged = new Map<string, Order>()
    cloudOrders.forEach(o => merged.set(o.id, o))
    localOrders.forEach(o => { if (!merged.has(o.id)) merged.set(o.id, o) })
    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [cloudOrders, localOrders])

  return { orders, isLoading }
}
