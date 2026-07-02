import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveSuppliersToCloud } from '../lib/cloudApi'

export interface Product {
  id: string
  name: string
  supplier: string
  price: number
  category?: string
  adminOnly?: boolean
  // שדות מקור-קטלוג (אופציונליים; מאוכלסים כשהמוצר מגיע מהקטלוג המרכזי דרך useCatalogSync)
  supplierId?: string
  supplierSku?: string
  packageQuantity?: number
  unit?: string
  unitPrice?: number
  effectiveFrom?: string
  sourceId?: string
  updatedAt?: string
}

export interface DaySchedule {
  day: number // 0 = ראשון, 1 = שני, וכו'
  branchCodes: string[] // קודי הסניפים שמזמינים ביום הזה
  notificationTime: string // פורמט: "HH:MM"
}

export interface Supplier {
  id: string
  name: string
  schedules: DaySchedule[] // לוח זמנים לפי יום עם סניפים ספציפיים
  description: string
  logo?: string
  email?: string
  contactPerson?: string
  phone?: string
  createdAt: string
}

interface SuppliersState {
  suppliers: Supplier[]
  products: Product[]
  catalogVersion: number
  adminPhone: string
  setAdminPhone: (phone: string) => void
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  seedStaticProducts: (products: Product[]) => void
  seedStaticSuppliers: (suppliers: Supplier[]) => void
  loadCloudData: (suppliers: Supplier[], products: Product[]) => void
  migrateCatalog: (version: number, transform: (products: Product[]) => Product[]) => void
  replaceCatalogProducts: (products: Product[], version: number) => void
  reconcileCatalogProducts: (products: Product[], version: number) => void
  getSupplierById: (id: string) => Supplier | undefined
  getProductsBySupplier: (supplierName: string) => Product[]
  getAllSuppliers: () => Supplier[]
  getAllProducts: () => Product[]
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      products: [],
      catalogVersion: 0,
      adminPhone: '',

      setAdminPhone: (phone) => {
        set({ adminPhone: phone })
      },

      // מחזיר את ה-promise של שמירת-הענן כדי שהקורא (AddSupplierPage) יוכל להמתין ולחשוף
      // כשל שמירה (לוחות-זמנים) במקום לבלוע אותו. אם אין צורך בהמתנה — אפשר להתעלם מה-promise.
      addSupplier: (supplier) => {
        const newSupplier: Supplier = {
          ...supplier,
          id: `supplier_${Date.now()}`,
          createdAt: new Date().toISOString()
        }
        set((state) => ({ suppliers: [...state.suppliers, newSupplier] }))
        const s = get()
        return saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products })
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updates } : s)
        }))
        const s = get()
        saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
      },

      deleteSupplier: (id) => {
        const supplier = get().suppliers.find(s => s.id === id)
        if (supplier) {
          set((state) => ({
            suppliers: state.suppliers.filter(s => s.id !== id),
            products: state.products.filter(p => p.supplier !== supplier.name)
          }))
          const s = get()
          saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
        }
      },

      // זורע ספקים סטטיים — מוסיף רק אם עדיין לא קיימים (לפי ID)
      seedStaticSuppliers: (suppliers) => {
        set((state) => {
          const existingIds = new Set(state.suppliers.map(s => s.id))
          const toAdd = suppliers.filter(s => !existingIds.has(s.id))
          if (toAdd.length === 0) return state
          return { suppliers: [...state.suppliers, ...toAdd] }
        })
      },

      // זורע מוצרים סטטיים — מוסיף רק מוצרים חסרים (לפי supplier+name).
      // שומר על עדכוני מחיר/מחיקות/הוספות שביצע האדמין — לעולם לא דורס.
      seedStaticProducts: (products) => {
        set((state) => {
          const existingKeys = new Set(state.products.map(p => `${p.supplier}|${p.name}`))
          const toAdd = products.filter(p => !existingKeys.has(`${p.supplier}|${p.name}`))
          if (toAdd.length === 0) return state
          return { products: [...state.products, ...toAdd] }
        })
      },

      // ממזג ספקים+מוצרים מהענן עם המצב המקומי:
      // - ספקים: הענן הוא המקור (כולל לוחות זמנים שאדמין הגדיר ממכשיר אחר)
      // - מוצרים: המקומי מנצח לכל (supplier+name) — שומר על עריכות שטרם הספיקו להגיע לענן.
      //   מוצרים בענן שאינם מקומית — מתווספים (סנכרון ממכשיר אחר).
      //   מוצרים מקומיים שאינם בענן — נשמרים (הוספות חדשות של אדמין).
      loadCloudData: (suppliers, products) => {
        set(state => {
          const keyOf = (p: Product) => `${p.supplier}|${p.name}`
          const localMap = new Map(state.products.map(p => [keyOf(p), p]))
          const cloudKeys = new Set(products.map(keyOf))
          const merged: Product[] = products.map(cp => localMap.get(keyOf(cp)) ?? cp)
          state.products.forEach(lp => {
            if (!cloudKeys.has(keyOf(lp))) merged.push(lp)
          })
          return { suppliers, products: merged, adminPhone: state.adminPhone }
        })
      },

      // הגירת קטלוג לפי גרסה: כשגרסת הקטלוג עולה, מריץ transform (אידמפוטנטי) על רשימת המוצרים
      // ומסנכרן לענן. הגרסה נקבעת *רק אחרי שמירה מוצלחת לענן* — כך שכשל שמירה (offline)
      // יגרום לניסיון חוזר בטעינה הבאה במקום להשאיר ענן לא מסונכרן. רץ פעם אחת לכל מכשיר.
      migrateCatalog: (version, transform) => {
        if (get().catalogVersion >= version) return
        set((state) => ({ products: transform(state.products) }))
        const s = get()
        saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products })
          .then(() => set({ catalogVersion: version }))
          .catch(console.error)
      },

      // מחליף את כל המוצרים ברשימה הסמכותית מהקטלוג המרכזי וקובע את גרסת הקטלוג.
      // נקרא ע"י useCatalogSync (אחרי sync) וע"י usePriceAdminSession (אחרי commit מוצלח).
      // אינו שומר ל-settings-api — הקטלוג המרכזי הוא מקור-האמת (ה-cloud) למוצרים.
      //
      // ✅ Task 9: כל כתיבות האדמין על מוצרים עוברות עכשיו דרך הקטלוג (preview/apply),
      // לכן החלפה מלאה (full-replace) בטוחה — הקטלוג כולל את כל המצב הנכון. מכשירים
      // ישנים מתכנסים לקטלוג בעדכון הגרסה הבא. (לוחות-זמנים/סניפים של ספקים עדיין
      // ב-settings-api ואינם מושפעים — replaceCatalogProducts נוגע ב-products בלבד.)
      //
      // מונוטוני: מחליף **רק** אם הגרסה הנכנסת חדשה ממש מהמקומית. שני כותבים (commit אדמין
      // ו-syncCatalog ברקע) יכולים להסתיים מחוץ-לסדר; שמירה לא-מונוטונית הייתה מחזירה
      // snapshot ישן ומדרדרת מחיר שזה-עתה נשמר. apply תמיד מפיק version+1, כך שעדכון
      // לגיטימי לעולם לא נדחה.
      replaceCatalogProducts: (products, version) => {
        set((state) => (version > state.catalogVersion ? { products, catalogVersion: version } : state))
      },

      // reconcile בטעינה ראשונית: מחיל את הקטלוג המרכזי הטרי כמקור-אמת **תמיד** (גם אם הגרסה זהה
      // למקומית), כי הקטלוג נמשך זה-עתה במלואו והוא לא-stale. זה מנקה מוצרים ישנים/כפולים שהצטברו
      // מקומית (למשל שמות פרה-עדכון שהגיעו מ-settings-api דרך loadCloudData). בניגוד ל-replaceCatalogProducts
      // המונוטוני (לרענון focus/visibility, שם עלול להיות race מול commit), כאן ההחלפה חד-משמעית.
      // הגרסה מתקדמת מונוטונית (Math.max) כדי לא לרדת מגרסה מקומית גבוהה יותר.
      reconcileCatalogProducts: (products, version) => {
        set((state) => ({ products, catalogVersion: Math.max(state.catalogVersion, version) }))
      },

      getSupplierById: (id) => {
        return get().suppliers.find(s => s.id === id)
      },

      getProductsBySupplier: (supplierName) => {
        return get().products.filter(p => p.supplier === supplierName)
      },

      getAllSuppliers: () => {
        return get().suppliers
      },

      getAllProducts: () => {
        return get().products
      }
    }),
    {
      name: 'meshausha-suppliers'
    }
  )
)
