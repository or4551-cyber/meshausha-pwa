# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-06-21 | **שלב נוכחי:** מערכת מחירוני ספקים — Task 8 (חיבור frontend) נדחף ופורס | **סטטוס:** Task 8 deployed; הבא Task 9

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין, ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
- האפליקציה חיה. deploy דרך GitHub→Netlify (push ל-`main`).
- **מערכת מחירוני ספקים — Plan 1:**
  - **Tasks 1–7 (backend)** — הושלמו, עברו review, **נדחפו**. מנוע/אחסון/הרשאות/API/Excel.
  - **Task 8 (חיבור frontend)** — הושלם, עבר review (Codex) + **review אדוורסרי פנימי** (תפס BLOCKER race), **נדחף ופורס** (commits 12ef04d→aa84489). האפליקציה קוראת עכשיו מהקטלוג המרכזי.
    - **בטיחות:** version-gate — מכשירים קיימים (`catalogVersion=1`) **לא משתנים**; רק התקנות חדשות מושכות מהקטלוג. fallback ל-`migrateCatalog` כשהקטלוג לא נגיש.
  - **Tasks 9–10** — לא התחילו. Task 9 = מסך אדמין preview/apply. Task 10 = פיוס E2E.
- **קודם (נדחף):** עדכון מחירון טרה פלסט יוני 2026 (88 פריטים) — `356f083`.

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים (אחרי Task 8):** הקטלוג המרכזי (`/api/prices`, Netlify Blobs, גרסאות אימוטביליות) הוא הסמכותי **כשנגיש וגרסתו ≠ catalogVersion המקומי**. `useCatalogSync` מסנכרן בהפעלה + focus/visibility (throttle 30s). כשלא נגיש → `seedStaticProducts` + `migrateCatalog(applyCatalogV1)` (ההתנהגות הישנה, fallback).
- **version-gate:** `replaceCatalogProducts` רץ רק על שינוי גרסה. מכשירים קיימים ב-v1 מדלגים. **⚠️ חוב Task 9:** `replaceCatalogProducts` היא החלפה מלאה — לפני פרסום v2 חובה להעביר כתיבות אדמין לקטלוג, אחרת ימחקו עריכות אדמין שב-settings-api. מתועד בקוד.
- **מערכת מחירונים — backend:** לוגיקה טהורה ב-`shared/priceCatalog/`; API+אחסון+הרשאות ב-`netlify/functions/_priceCatalog*` + `price-*.ts`. הרשאות fail-closed (app=קריאה, gpt+admin=כתיבה), השוואות constant-time.
- **שיתוף סוכנים:** SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**. כללים: `docs/sync/PROTOCOL.md`. SDD: `docs/sdd/`.
- **review אדוורסרי (ultracode):** ב-milestones נוגעי-פרודקשן — workflow רב-סוכני מקביל ל-review של Codex. השתלם (תפס BLOCKER ב-Task 8).

## מה נשאר לעשות / חסמים
1. **Task 9 — Secure Admin Preview and Apply:** מסך אדמין שכותב לקטלוג דרך ה-API (preview→APPROVE→apply). קבצים: `priceAdminSession.ts`, `usePriceAdminSession.ts`, `PriceAdminUnlockModal.tsx`, `PriceManagementPage.tsx`, `AddSupplierPage.tsx`. **חייב לפתור את חוב ה-merge** (כתיבות אדמין לקטלוג) לפני פרסום v2.
2. **Task 10** — פיוס E2E + תיעוד + gate סיום.
3. **env vars ב-Netlify** ל-write/admin/GPT: `PRICE_GPT_TOKEN`, `PRICE_SESSION_SECRET`, `PRICE_ADMIN_SECRET` (`API_TOKEN` כבר קיים).
4. עתידי: Plan 2 (GPT Actions — **כאן ה-GPT מתחבר**), Plan 3 (ייבוא מחירונים), Plan 4 (Production Hardening).

## איך מריצים ובודקים
- פיתוח: `npm run dev` (→ http://localhost:5173/). כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (**39/39**). בתוך sandbox (Codex) — fallback Vitest עם config inline.
- typecheck: `npx tsc --noEmit` (src) + `npx tsc -p tsconfig.check.json --noEmit` (shared/netlify/tests; הקובץ ב-gitignore: extends tsconfig.json, `types:["node","vite/client"]`, include shared/priceCatalog+netlify/functions+tests/priceCatalog).
- אימות לפני "Done": `npm run build` + הטסטים + שני ה-typechecks.
- Deploy: `git push origin main` → Netlify (**claude בלבד, אחרי GO**). remote: `github.com/or4551-cyber/meshausha-pwa`.

## מצב גיט
- ענף: `main`. קומיט אחרון: `aa84489`. **נדחף ל-origin/main** (Tasks 1–8 + תיקונים).
- remote `origin` מחובר ל-GitHub + Netlify. `safe.directory` מוגדר.

## יומן שלבים (מהחדש לישן)
- [2026-06-21 — Task 8: חיבור frontend לקטלוג המרכזי](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync; version-gate; review כפול (Codex + אדוורסרי) תפס BLOCKER race → תוקן; נדחף ופורס.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1, Tasks 1–7)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD; gate + review של Codex תפס 4 blockers + race → תוקנו ואושרו (30/30).
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + מנגנון catalog-version migration; review של codex תפס באג כפילות שתוקן ואומת.
- [2026-06-20 — הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים (docs/sync) + תיקוני תשתית גלובליים + תבנית לשימוש חוזר.
