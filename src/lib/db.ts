import Dexie, { type Table } from 'dexie'
import type { CartItem } from '../stores/cartStore'

export interface PendingOrder {
  id?: number // auto-increment
  branch: string
  branchCode: string
  items: CartItem[]
  notes: string
  totalPrice: number
  createdAt: string
  synced: boolean
}

class MeshaushaDB extends Dexie {
  pendingOrders!: Table<PendingOrder>

  constructor() {
    super('MeshaushaDB')
    this.version(1).stores({
      pendingOrders: '++id, branchCode, synced, createdAt',
    })
  }
}

export const db = new MeshaushaDB()

export async function savePendingOrder(order: Omit<PendingOrder, 'id' | 'synced'>) {
  return db.pendingOrders.add({ ...order, synced: false })
}

export async function getPendingOrders(branchCode?: string) {
  if (branchCode) {
    return db.pendingOrders.where({ branchCode, synced: false }).toArray()
  }
  return db.pendingOrders.where('synced').equals(0).toArray()
}

export async function markOrderSynced(id: number) {
  return db.pendingOrders.update(id, { synced: true })
}

export async function countPendingOrders(branchCode?: string) {
  if (branchCode) {
    return db.pendingOrders.where({ branchCode, synced: false }).count()
  }
  return db.pendingOrders.where('synced').equals(0).count()
}
