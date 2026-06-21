// סנכרון קטלוג המוצרים עם הקטלוג המרכזי — בהפעלה וברענון focus/visibility.
//
// עיצוב בטוח (לא שובר את האפליקציה החיה):
// 1. זורע PRODUCTS/INITIAL_SUPPLIERS מיד — בטיחות first-run/offline.
// 2. טוען adminPhone ולוחות-זמנים של ספקים מ-settings-api (כמו הקוד הקודם).
// 3. הקטלוג המרכזי הוא הסמכותי למוצרים — *רק כשהוא נגיש וגרסתו שונה מהמקומית*.
//    כשאינו נגיש (offline/401) — נופל חזרה ל-migrateCatalog(applyCatalogV1) הקיים,
//    כך שאין רגרסיה: מכשירים בלי גישה לקטלוג מתנהגים בדיוק כמו לפני Task 8.
// 4. לעולם לא מאפס מוצרים שמורים בשגיאה. מחליף רק אחרי תשובה מלאה ומוצלחת.

import { useEffect, useRef } from 'react'
import { useSuppliersStore } from '../stores/suppliersStore'
import { PRODUCTS, INITIAL_SUPPLIERS, CATALOG_VERSION, applyCatalogV1 } from '../data/products'
import { getAdminPhoneFromCloud, getSuppliersFromCloud } from '../lib/cloudApi'
import { fetchActiveCatalog, getCatalogVersion } from '../lib/priceCatalogApi'

const REFRESH_THROTTLE_MS = 30_000

export function useCatalogSync(): void {
  const lastCheckRef = useRef(0)
  const runningRef = useRef(false)

  useEffect(() => {
    // מונע ריצות חופפות (focus יכול לירות פעמיים) ומכבד throttle לרענוני focus/visibility.
    async function syncCatalog(initial: boolean): Promise<void> {
      if (runningRef.current) return
      const now = Date.now()
      if (!initial && now - lastCheckRef.current < REFRESH_THROTTLE_MS) return
      lastCheckRef.current = now
      runningRef.current = true
      try {
        // בדיקת גרסה זולה (בקשה אחת) קודם
        const versionInfo = await getCatalogVersion()
        if (!versionInfo) {
          // קטלוג מרכזי לא נגיש → fallback לזרימה הישנה (רק בהפעלה הראשונה),
          // כדי שמכשיר offline עדיין יקבל את תיקון הכפפות.
          if (initial) useSuppliersStore.getState().migrateCatalog(CATALOG_VERSION, applyCatalogV1)
          return
        }
        if (versionInfo.version === useSuppliersStore.getState().catalogVersion) return
        // הגרסה שונה — משוך את הקטלוג המלא והחלף
        const catalog = await fetchActiveCatalog()
        if (!catalog) return
        if (catalog.version === useSuppliersStore.getState().catalogVersion) return
        useSuppliersStore.getState().replaceCatalogProducts(catalog.products, catalog.version)
      } finally {
        runningRef.current = false
      }
    }

    const store = useSuppliersStore.getState()

    // 1. זריעה מיידית
    store.seedStaticSuppliers(INITIAL_SUPPLIERS)
    store.seedStaticProducts(PRODUCTS)

    // 2. adminPhone מהענן
    if (!store.adminPhone) {
      getAdminPhoneFromCloud()
        .then(phone => { if (phone) useSuppliersStore.getState().setAdminPhone(phone) })
        .catch(() => {})
    }

    // 3+4: ראשית ספקים/לוחות-זמנים מ-settings-api (כמו הקוד הקודם), ורק *אחר כך* הקטלוג
    // המרכזי — סדר זה מבטיח שההחלפה הסמכותית מהקטלוג (כשנגיש) תמיד גוברת על מיזוג ה-products
    // הישן של loadCloudData, בלי race. כשהקטלוג לא נגיש — נשמרת בדיוק ההתנהגות הקודמת.
    async function initialLoad(): Promise<void> {
      try {
        const data = await getSuppliersFromCloud()
        const hasSchedules = data?.suppliers?.some((s: { schedules?: unknown[] }) => (s.schedules?.length ?? 0) > 0)
        if (hasSchedules && data) {
          const st = useSuppliersStore.getState()
          st.loadCloudData(data.suppliers, data.products ?? [])
          st.seedStaticSuppliers(INITIAL_SUPPLIERS)
          st.seedStaticProducts(PRODUCTS)
        }
      } catch {
        /* settings-api לא נגיש — נמשיך לקטלוג המרכזי / fallback */
      }
      await syncCatalog(true)
    }
    void initialLoad()

    const onVisibility = () => { if (document.visibilityState === 'visible') void syncCatalog(false) }
    const onFocus = () => { void syncCatalog(false) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
