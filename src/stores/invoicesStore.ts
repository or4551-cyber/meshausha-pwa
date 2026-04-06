import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface InvoiceItem {
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
}

export interface Invoice {
  id: string
  supplierId: string
  supplierName: string
  branchCode: string
  branchName: string
  month: string // פורמט: "2026-01"
  year: number
  items: InvoiceItem[]
  totalAmount: number
  fileName: string
  fileUrl: string
  uploadedAt: string
  uploadedBy: string
  notes?: string
}

export interface PriceDiscrepancy {
  productName: string
  supplierName: string
  branchName: string
  month: string
  priceInApp: number
  priceInInvoice: number
  difference: number
  percentageDiff: number
}

interface InvoicesState {
  invoices: Invoice[]
  addInvoice: (invoice: Omit<Invoice, 'id' | 'uploadedAt'>) => void
  updateInvoice: (id: string, updates: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  getInvoicesBySupplier: (supplierId: string) => Invoice[]
  getInvoicesByBranch: (branchCode: string) => Invoice[]
  getInvoicesByMonth: (month: string) => Invoice[]
  analyzeInvoice: (invoiceId: string) => PriceDiscrepancy[]
  getAllDiscrepancies: () => PriceDiscrepancy[]
}

export const useInvoicesStore = create<InvoicesState>()(
  persist(
    (set, get) => ({
      invoices: [],

      addInvoice: (invoice) => {
        const newInvoice: Invoice = {
          ...invoice,
          id: `invoice_${Date.now()}`,
          uploadedAt: new Date().toISOString()
        }
        
        set((state) => ({
          invoices: [...state.invoices, newInvoice]
        }))
      },

      updateInvoice: (id, updates) => {
        set((state) => ({
          invoices: state.invoices.map(inv => 
            inv.id === id ? { ...inv, ...updates } : inv
          )
        }))
      },

      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter(inv => inv.id !== id)
        }))
      },

      getInvoicesBySupplier: (supplierId) => {
        return get().invoices.filter(inv => inv.supplierId === supplierId)
      },

      getInvoicesByBranch: (branchCode) => {
        return get().invoices.filter(inv => inv.branchCode === branchCode)
      },

      getInvoicesByMonth: (month) => {
        return get().invoices.filter(inv => inv.month === month)
      },

      analyzeInvoice: (invoiceId) => {
        const invoice = get().invoices.find(inv => inv.id === invoiceId)
        if (!invoice) return []

        const discrepancies: PriceDiscrepancy[] = []
        
        // כאן תהיה הלוגיקה להשוואת מחירים
        // נממש בשלב הבא עם חיבור ל-suppliersStore
        
        return discrepancies
      },

      getAllDiscrepancies: () => {
        const allDiscrepancies: PriceDiscrepancy[] = []
        
        get().invoices.forEach(invoice => {
          const invoiceDiscrepancies = get().analyzeInvoice(invoice.id)
          allDiscrepancies.push(...invoiceDiscrepancies)
        })
        
        return allDiscrepancies
      }
    }),
    {
      name: 'meshausha-invoices'
    }
  )
)
