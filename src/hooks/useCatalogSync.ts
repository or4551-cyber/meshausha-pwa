// סנכרון קטלוג המוצרים עם הקטלוג המרכזי — בהפעלה וברענון focus/visibility.
//
// עיצוב בטוח (לא שובר את האפליקציה החיה):
// 1. זורע PRODUCTS/INITIAL_SUPPLIERS מיד — בטיחות first-run/offline.
// 2. טוען adminPhone ולוחות-זמנים של ספקים מ-settings-api (כמו הקוד הקודם).
// 3. הקטלוג המרכזי הוא הסמכותי למוצרים — *רק כשהוא נגיש וגרסתו שונה מהמקומית*.
//    כשההחלפה הסמכותית לא קרתה (offline/401/כשל משיכה) — נופל חזרה ל-migrateCatalog(applyCatalogV1)
//    הקיים *בכל הפעלה ראשונית*, כך שאין רגרסיה: catalogVersion ותיקון הכפפות מובטחים תמיד,
//    בדיוק כמו לפני Task 8 (שם migrateCatalog רץ ב-.finally ללא תנאי).
// 4. ה-listeners ל-focus/visibility נרשמים *רק אחרי* שההפעלה הראשונית הסתיימה — כדי שלא יווצר
//    race שבו רענון focus מחליף products בזמן ש-loadCloudData עדיין באוויר.
// 5. לעולם לא מאפס מוצרים שמורים בשגיאה. מחליף רק אחרי תשובה מלאה ומוצלחת.

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
    let cancelled = false
    let detach: () => void = () => {}

    // מסנכרן products עם הקטלוג המרכזי (מקור-האמת).
    // - הפעלה ראשונית (initial): מושך את הקטלוג המלא ומחיל אותו **תמיד** (reconcile) אם הצליח —
    //   כך מכשירים עם מוצרים ישנים/כפולים שהצטברו מקומית מתנקים מיד, בלי תלות בשוויון-גרסה.
    // - רענון focus/visibility (לא-initial): החלפה מונוטונית וזולה (בקשת-גרסה קלה; משיכה מלאה רק אם
    //   הגרסה השתנתה) — כדי לא ליצור churn/race מול commit ברקע.
    // - אם הקטלוג המרכזי לא נגיש בהפעלה ראשונית (offline/כשל) — נופל ל-migrateCatalog הישן (fallback).
    async function syncCatalog(initial: boolean): Promise<void> {
      if (runningRef.current) return
      const now = Date.now()
      if (!initial && now - lastCheckRef.current < REFRESH_THROTTLE_MS) return
      lastCheckRef.current = now
      runningRef.current = true
      try {
        let replaced = false
        if (initial) {
          // reconcile סמכותי: הקטלוג נמשך זה-עתה במלואו והוא טרי (לא-stale) → מחילים תמיד.
          const catalog = await fetchActiveCatalog()
          if (catalog && catalog.products.length > 0) {
            useSuppliersStore.getState().reconcileCatalogProducts(catalog.products, catalog.version)
            replaced = true
          }
        } else {
          const versionInfo = await getCatalogVersion()
          if (versionInfo && versionInfo.version !== useSuppliersStore.getState().catalogVersion) {
            const catalog = await fetchActiveCatalog()
            if (catalog && catalog.version !== useSuppliersStore.getState().catalogVersion) {
              useSuppliersStore.getState().replaceCatalogProducts(catalog.products, catalog.version)
              replaced = true
            }
          }
        }
        // baseline: בהפעלה ראשונית, אם הקטלוג המרכזי לא נגיש (offline/כשל משיכה) — מריץ את ההגירה
        // הישנה. אידמפוטנטי (catalogVersion>=1 → no-op), ולכן בטוח להריץ תמיד.
        if (initial && !replaced) {
          useSuppliersStore.getState().migrateCatalog(CATALOG_VERSION, applyCatalogV1)
        }
      } finally {
        runningRef.current = false
      }
    }

    async function initialLoad(): Promise<void> {
      const store = useSuppliersStore.getState()

      // 1. זריעה מיידית
      store.seedStaticSuppliers(INITIAL_SUPPLIERS)
      store.seedStaticProducts(PRODUCTS)

      // 2. adminPhone מהענן (לא חוסם)
      if (!store.adminPhone) {
        getAdminPhoneFromCloud()
          .then(phone => { if (phone && !cancelled) useSuppliersStore.getState().setAdminPhone(phone) })
          .catch(() => {})
      }

      // 3. ספקים/לוחות-זמנים מ-settings-api (מקור-האמת ללוחות זמנים, כמו הקוד הקודם)
      try {
        const data = await getSuppliersFromCloud()
        const hasSchedules = data?.suppliers?.some((s: { schedules?: unknown[] }) => (s.schedules?.length ?? 0) > 0)
        if (hasSchedules && data && !cancelled) {
          const st = useSuppliersStore.getState()
          // ⚠️ מוצרים לא מגיעים יותר מ-settings-api — הקטלוג המרכזי הוא מקור-האמת היחיד למוצרים.
          // settings-api עדיין מחזיק רשימת-מוצרים ישנה (שמות פרה-עדכון), ומיזוגה היה מקור הכפילויות
          // (למשל טרה פלסט: 90 חדשים + עד-41 ישנים). מכאן ואילך מושכים ממנו ספקים/לוחות-זמנים בלבד.
          st.loadCloudData(data.suppliers, [])
          st.seedStaticSuppliers(INITIAL_SUPPLIERS)
          st.seedStaticProducts(PRODUCTS)
        }
      } catch {
        /* settings-api לא נגיש — נמשיך לקטלוג המרכזי / fallback */
      }

      // 4. קטלוג מרכזי (הסמכותי למוצרים כשנגיש) — רץ *אחרי* loadCloudData, סדר דטרמיניסטי.
      if (!cancelled) await syncCatalog(true)
    }

    // רושמים את ה-listeners רק אחרי שההפעלה הראשונית הסתיימה — מונע race עם loadCloudData.
    void initialLoad().finally(() => {
      if (cancelled) return
      const onVisibility = () => { if (document.visibilityState === 'visible') void syncCatalog(false) }
      const onFocus = () => { void syncCatalog(false) }
      document.addEventListener('visibilitychange', onVisibility)
      window.addEventListener('focus', onFocus)
      detach = () => {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('focus', onFocus)
      }
    })

    return () => { cancelled = true; detach() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
