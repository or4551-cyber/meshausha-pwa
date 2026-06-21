# שלב: Task 8 — חיבור ה-frontend לקטלוג המחירים המרכזי — 2026-06-21

## מטרת השלב
לחבר את האפליקציה החיה (9 סניפים) לקטלוג המחירים המרכזי שנבנה ב-Tasks 1–7: שהאפליקציה **תקרא** מוצרים מהקטלוג המרכזי (במקום רק מה-seed הסטטי), עם רענון ב-focus/visibility, ובצורה **בטוחה שלא תשבור** מכשירים קיימים. זה הצעד הראשון שנוגע בקוד שרץ אצל הסניפים.

## מה נבנה בפועל (קבצים עיקריים)
- `src/lib/priceCatalogAdapter.ts` (חדש) — `catalogProductToLegacy` + `adaptCatalogSnapshot`: ממיר `CatalogProduct`/`CatalogSnapshot` ל-`Product` הישן. null→undefined, active בלבד, מדלג (עם console.warn) על מוצר שספקו חסר.
- `src/lib/priceCatalogApi.ts` (חדש) — client קריאה ל-`/api/prices` (תפקיד app, אותו `VITE_API_TOKEN`). `getCatalogVersion` (בדיקה זולה) + `fetchActiveCatalog` (משיכת קטלוג מלא בעימוד limit=200+offset, מבטל על אי-עקביות גרסה ב-suppliers או ב-products). מחזיר `null` על כל כשל.
- `src/hooks/useCatalogSync.ts` (חדש) — ההוק המרכזי. זריעה מיידית → adminPhone → לוחות-זמנים (settings-api) → קטלוג מרכזי. רושם listeners ל-focus/visibility **רק אחרי** שההפעלה הראשונית הסתיימה. throttle 30s, cleanup, fallback ל-`migrateCatalog`.
- `src/stores/suppliersStore.ts` — `Product` הורחב בשדות קטלוג אופציונליים; `replaceCatalogProducts(products, version)`. נשמר נתיב השמירה הישן (saveSuppliersToCloud) ב-updateProduct/deleteProduct.
- `src/App.tsx` — קורא `useCatalogSync()` במקום ה-`useEffect` המוטמע.
- `netlify/functions/_priceCatalogRouter.ts` — `offset` pagination לחיפוש products (270 > 200 cap), מחזיר total/offset.
- `tests/priceCatalog/adapter.test.ts` (4) + `api.test.ts` (4, fetch מדומה) + router offset (1). סה"כ 39/39.

## הדרך: מה נוסה, מה עבד, מה נכשל ולמה
1. **בדיקת drift קריטית לפני הכל:** האם ה-seed המרכזי (מ-`PRODUCTS`) תואם למצב החי? אימתתי ש-`PRODUCTS` כבר מכיל את כפפות סלטים החדשות (sm102–105 @125, שורות 325–328) → אין drift, `applyCatalogV1` אידמפוטנטי.
2. **עיצוב בטוח (version-gate):** מכשירים קיימים כבר ב-`catalogVersion=1` (מהגירת טרה פלסט), והקטלוג המרכזי הוא v1 → ההוק **מדלג** על ההחלפה. Task 8 משפיע בפועל רק על התקנות חדשות. המעבר המלא לכל המכשירים יקרה ב-v2 (Task 9).
3. **גילוי ש-Task 8 לא אינרטי:** האפליקציה כבר שולחת `VITE_API_TOKEN` כ-bearer, ו-price-catalog מאמת app-read מול אותו `API_TOKEN` → הקריאה לקטלוג עובדת בפרודקשן (לא אינרטי). זה העלה את הסטייקס וחיזק את העיצוב הבטוח.
4. **review כפול תפס BLOCKER:** הרצתי review אדוורסרי משלי (workflow, 6 ממדים, 25 סוכנים) **במקביל** ל-review של Codex. ה-review שלי תפס **באג race** ש-Codex ואני פספסנו; Codex תפס חוסר בדיקת-גרסה ב-suppliers (שה-review שלי אישר עצמאית). תיקנתי הכל, Codex עשה re-review ואישר.

## כיוונים שעלו בשיחה ולא מומשו (+ למה)
- **deploy של Task 8+9 יחד** — נשקל; OR בחר **Task 8 לבד** (צעד בטוח, "הנחת צינור" — מכשירים קיימים לא מרגישים, מקים את תשתית הסנכרון). Task 9 כצעד נפרד.
- **הסרת saveSuppliersToCloud מ-updateProduct (plan Step 4)** — נדחתה ל-Task 9: הסרה עכשיו הייתה שוברת עריכות אדמין.
- **smart-merge ב-replaceCatalogProducts (שימור עריכות אדמין)** — נדחה ל-Task 9: "preserve no-sourceId" לא עובד כי גם ה-seed חסר sourceId (היה יוצר כפילויות). הפתרון הנכון הוא העברת כתיבות אדמין ל-API ב-Task 9.

## באגים שהתגלו ותוקנו
1. **BLOCKER — race** (`useCatalogSync`): listeners ל-focus/visibility נרשמו מיד, ו-`initialLoad` היה fire-and-forget → focus יכל להריץ syncCatalog בזמן ש-`loadCloudData` עוד באוויר ולדרוס את הקטלוג. **תיקון:** listeners נרשמים רק ב-`.finally` של initialLoad + cancelled guard. (תפס ה-review האדוורסרי.)
2. **major×3 — version-gate fallback שבור:** `migrateCatalog` רץ רק כש-`getCatalogVersion()==null`. אם הוא הצליח אבל `fetchActiveCatalog` נכשל → `catalogVersion` נשאר 0, `applyCatalogV1` לא רץ, products ישנים נשארו. **תיקון:** `syncCatalog` עוקב `replaced`; בהפעלה ראשונית אם לא בוצעה החלפה → מריץ `migrateCatalog` כ-baseline (אידמפוטנטי).
3. **major — suppliers version:** `fetchActiveCatalog` לא בדק `supBody.version`. **תיקון:** `return null` על אי-התאמה + 4 טסטים. (תפסו Codex + ה-review האדוורסרי.)
4. **minor:** דילוג שקט על מוצר בלי ספק → `console.warn`.

## החלטות שהתקבלו (+ נימוק)
- **version-gate כעיקרון בטיחות:** מכשירים קיימים לא משתנים; "central always wins" מדויק רק לגרסה חדשה. נימוק: deploy בטוח לאפליקציה חיה בלי רגרסיה.
- **Task 8 לבד (OR):** צעד אינקרמנטלי בטוח; Task 9 נפרד.
- **review אדוורסרי במקביל ל-Codex (ultracode):** השתלם — תפס BLOCKER ש-review יחיד פספס.

## קומיטים רלוונטיים
- `aa84489` [claude] docs(sync): Task 8 hardening — request codex re-review
- `82b64ae` [claude] fix: harden Task 8 sync — race + version-gate fallback + version consistency
- `7a3da80` [claude] docs(sync): Task 8 gate — request codex review
- `12ef04d` [claude] feat: sync app with central price catalog (Task 8)
(נדחפו ל-origin/main; Netlify בונה.)

## לקחים לשלב הבא (Task 9 — Secure Admin Preview and Apply)
- **חוב חובה לפני פרסום v2:** `replaceCatalogProducts` היא החלפה מלאה. Task 9 חייב להעביר כתיבות אדמין (updateProduct/deleteProduct/addProducts ב-PriceManagementPage/AddSupplierPage) לקטלוג המרכזי דרך ה-API (preview/apply), אחרת פרסום v2 ימחק עריכות/הוספות אדמין שקיימות רק ב-settings-api. ההערה מתועדת בקוד ב-`replaceCatalogProducts`.
- **ה-write client מחכה:** previewChange/applyChange/createRevertPreview/createExportLink — לא נבנו ב-Task 8 (אין צרכן). Task 9 בונה אותם + `priceAdminSession.ts` + `usePriceAdminSession` + `PriceAdminUnlockModal`.
- **לוגין אדמין:** `price-auth.ts` (קיים) מנפיק סשן HMAC; מסך האדמין צריך לקרוא לו עם `PRICE_ADMIN_SECRET`.
- **env vars ב-Netlify** עדיין נדרשים להפעלה מלאה: `PRICE_GPT_TOKEN`, `PRICE_SESSION_SECRET`, `PRICE_ADMIN_SECRET` (ל-write/admin/GPT). `API_TOKEN` כבר קיים (app-read עובד).
- **typecheck ה-API:** `tsconfig.check.json` עכשיו `types:["node","vite/client"]` (טסטים מייבאים src עם import.meta.env). הקובץ ב-gitignore.
