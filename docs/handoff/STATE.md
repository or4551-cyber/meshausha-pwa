# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-06-21 | **שלב נוכחי:** מערכת מחירוני ספקים — Tasks 1–8 **פרוסים וחיים** | **סטטוס:** חי בפרודקשן; הבא Task 9

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין, ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
- **🎉 פריסה ראשונה מאז 9 במאי בוצעה (2026-06-21) ואומתה.** כל העבודה חיה אצל הסניפים:
  - מחירון טרה פלסט יוני 2026 + תיקון כפפות (₪22→₪125).
  - ליבת הקטלוג (Tasks 1–7) + Task 8 (האפליקציה קוראת מהקטלוג המרכזי).
  - **פיוס:** הקטלוג מכיל 291 מוצרים (270 + 21 שהיו חיים ונשמרו). אומת בפרודקשן: `catalog/version=1`, `total=291`, settings-api 200.
- **Tasks 9–10** — לא התחילו. Task 9 = מסך אדמין preview/apply (כתיבה לקטלוג).
- **חשוב — שתי בעיות שהתגלו ותוקנו** (ראה JOURNAL 2026-06-21-first-deploy): (1) **חסם billing** ב-Netlify (חריגת dev plan) חסם פריסות מאז מאי → OR שדרג ל-PRO. (2) הפריסה ידנית (CLI), לא אוטומטית מ-GitHub.

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים:** הקטלוג המרכזי (`/api/prices`, Netlify Blobs, גרסאות אימוטביליות) הוא הסמכותי כשנגיש וגרסתו ≠ catalogVersion המקומי. `useCatalogSync` מסנכרן בהפעלה + focus/visibility. fallback ל-`migrateCatalog(applyCatalogV1)` כשלא נגיש.
- **קוד-הזרע (`src/data/products.ts`) = 291 מוצרים** = מצב פרודקשן מפויס + מחירון יוני 2026. ⚠️ **חוב Task 9:** `replaceCatalogProducts` היא החלפה מלאה — לפני פרסום v2 חובה שהקטלוג יכיל את כל המצב הנכון (כבר מפויס) + שכתיבות אדמין יעברו לקטלוג.
- **מערכת מחירונים backend:** לוגיקה טהורה ב-`shared/priceCatalog/`; API+אחסון+הרשאות ב-`netlify/functions/_priceCatalog*` + `price-*.ts`. הרשאות fail-closed.
- **שיתוף סוכנים:** SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**. review אדוורסרי (ultracode) ב-milestones נוגעי-פרודקשן.

## מה נשאר לעשות / חסמים
1. **Task 9 — Secure Admin Preview and Apply:** מסך אדמין שכותב לקטלוג דרך ה-API. **החלטת OR: בלי סיסמת-מחירים נפרדת** (9999 מספיק) → auto-session מסוד מוטמע. קבצים: `priceAdminSession.ts`, `usePriceAdminSession.ts`, `PriceManagementPage.tsx`, `AddSupplierPage.tsx`. צריך גם להוסיף ל-priceCatalogApi.ts את ה-write client.
2. **env vars חסרים ל-Task 9** (הוסף דרך Netlify MCP `manage-env-vars`, siteId 62cbac42-9bb2-4814-808b-0ef4b78928b5): `PRICE_SESSION_SECRET`, `PRICE_ADMIN_SECRET`, `PRICE_GPT_TOKEN`. (`API_TOKEN`/`VITE_API_TOKEN` כבר קיימים.)
3. **Task 10** — פיוס E2E + תיעוד.
4. עתידי: Plan 2 (GPT Actions — כאן ה-GPT מתחבר), Plan 3 (ייבוא מחירונים), Plan 4 (Hardening + שקילת auto-deploy).

## איך מריצים ובודקים
- פיתוח: `npm run dev`. כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (**39/39**). typecheck: `npx tsc --noEmit` (src) + `npx tsc -p tsconfig.check.json --noEmit` (gitignored; types:["node","vite/client"], include shared/netlify/tests).
- **Deploy לפרודקשן (ידני, CLI — claude בלבד, אחרי GO):**
  ```
  $env:VITE_API_TOKEN = "<Netlify env VITE_API_TOKEN>"   # חובה לפני build, אחרת auth נשבר
  $env:NETLIFY_AUTH_TOKEN = "<Netlify env NETLIFY_TOKEN>"
  npm run build
  npx --yes netlify-cli@latest deploy --prod --no-build --dir dist --functions netlify/functions --site 62cbac42-9bb2-4814-808b-0ef4b78928b5
  ```
  סודות זמינים דרך Netlify MCP `manage-env-vars getAllEnvVars`. אימות: `GET /api/prices/catalog/version` + `/api/prices/products?limit=1&includeInactive=true`.
- remote: `github.com/or4551-cyber/meshausha-pwa`. פרודקשן: `meshaushapp.netlify.app` (site 62cbac42-...). תוכנית PRO.

## מצב גיט
- ענף: `main`. קומיט אחרון: `a326e30` (reconcile seed). **נדחף ל-origin/main + נפרס לפרודקשן.**
- GitHub ופרודקשן מסונכרנים ל-`a326e30`.

## יומן שלבים (מהחדש לישן)
- [2026-06-21 — פריסה ראשונה + פיוס + גילוי חסם billing](JOURNAL/2026-06-21-first-deploy-and-reconciliation.md) — הכל עלה לאוויר; 21 מוצרים חיים נשמרו בפיוס; סיבת השורש לאי-פריסה: חריגת קרדיט Netlify.
- [2026-06-21 — Task 8: חיבור frontend לקטלוג המרכזי](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync; review כפול תפס BLOCKER race → תוקן.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1, Tasks 1–7)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD; review של Codex תפס 4 blockers + race → תוקנו (30/30).
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + catalog-version migration; codex תפס באג כפילות שתוקן.
- [2026-06-20 — הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים + תיקוני תשתית גלובליים.
