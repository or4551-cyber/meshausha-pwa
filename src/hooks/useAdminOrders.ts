import { useEffect, useMemo, useState } from 'react'
import { useOrdersStore, type Order } from '../stores/ordersStore'
import { getOrdersFromCloud } from '../lib/cloudApi'

export function useAdminOrders(): Order[] {
  const { getAllOrders } = useOrdersStore()
  const localOrders = getAllOrders()
  const [cloudOrders, setCloudOrders] = useState<Order[]>([])

  useEffect(() => {
    getOrdersFromCloud().then(setCloudOrders).catch(() => {})
  }, [])

  return useMemo(() => {
    const merged = new Map<string, Order>()
    cloudOrders.forEach(o => merged.set(o.id, o))
    localOrders.forEach(o => { if (!merged.has(o.id)) merged.set(o.id, o) })
    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [cloudOrders, localOrders])
}
