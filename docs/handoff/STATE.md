# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-06-21 | **שלב נוכחי:** מערכת מחירוני ספקים — ליבת backend (Plan 1, Tasks 1–7) | **סטטוס:** הושלם, עבר review של Codex, **לא נדחף עדיין** (ממתין ל-GO של OR)

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין, ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
- האפליקציה חיה ומפותחת. deploy דרך GitHub→Netlify (push ל-`main` מפעיל בנייה לכל הסניפים).
- **השלב הנוכחי — מערכת מחירוני ספקים, ליבת backend (Tasks 1–7):** הושלמה ב-TDD, עברה review בלתי-תלוי של Codex (תפס 4 blockers + race → כולם תוקנו → re-review אישר). **30/30 טסטים, typecheck + build ירוקים.**
  - **הכול אינרטי** — שום קוד frontend לא משתמש בזה עדיין; אין השפעה על האפליקציה החיה.
  - **10 קומיטים מקומיים לא נדחפו** — ממתינים ל-GO של OR ל-push (push = deploy, §6).
- שכבת שיתוף-פעולה פעילה: `docs/sync/` (BOARD+CHANNEL+PROTOCOL), `CLAUDE.md`/`AGENTS.md` בשורש.
- **קודם (נדחף):** קטלוג טרה פלסט עודכן למחירון יוני 2026 (88 פריטים) — `356f083`.

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** בדיקה ב-375px, בלי overflow-x, RTL/עברית מלא.
- **נתוני ספקים/מוצרים (הקיים):** seed סטטי ב-`src/data/products.ts` → Zustand store (`meshausha-suppliers` ב-localStorage) → ענן (Netlify Blobs, `settings-api`). **`seedStaticProducts` לעולם לא דורס מחיר** (דדופ לפי `supplier|name`). עדכון שמגיע למכשירים קיימים: `CATALOG_VERSION` + `migrateCatalog(version, transform)`; הטרנספורם חייב להיות **אידמפוטנטי** (remove+add).
- **מערכת מחירוני ספקים (החדש, backend):**
  - **מודל מתוקנן אימוטבילי:** CatalogSnapshot עם version+checksum; שינויים דרך ChangeSet (preview→apply), apply יוצר snapshot חדש (לא מוטט). מקורות: admin|gpt|import|revert.
  - **לוגיקה טהורה ב-`shared/priceCatalog/`** (engine/normalization/legacySeed/types) — נבדקת בטסטים, חוצת-סביבה.
  - **אחסון:** `_priceCatalogStore.ts` — Netlify Blobs (גרסאות אימוטביליות) + מימוש Memory לטסטים.
  - **API:** `_priceCatalogRouter.ts` (טהור) + `price-catalog.ts` (handler). חיפוש/preview/apply(idempotent)/revert/export. נתיב `/api/prices/*`.
  - **הרשאות fail-closed:** `_priceCatalogAuth.ts` — app=קריאה בלבד, gpt+admin=קריאה+כתיבה. סשני HMAC. השוואת סודות **constant-time** (sha256 digest + timingSafeEqual).
  - **Excel:** `_priceCatalogExcel.ts` + `price-export.ts` — חוברת מרכזית (סיכום + גיליון/ספק), קישור הורדה חתום קצר-מועד.
- **שיתוף סוכנים:** ברירת מחדל SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**. כללים: `docs/sync/PROTOCOL.md`. עבודה לפי SDD: `docs/sdd/` (spec+roadmap+plan-1) + tracker ב-`progress.md`.

## מה נשאר לעשות / חסמים
1. **GO של OR ל-push** של 10 הקומיטים (הגייט עבר; Codex אישר). אחרי push → Netlify בונה (הפונקציות נוספות, אינרטיות).
2. **Task 8 — Frontend Catalog Adapter + Foreground Sync** (נוגע באפליקציה החיה): `src/lib/priceCatalogAdapter.ts` (חדש), `suppliersStore.ts`, `App.tsx`, hook `useCatalogSync`. **review + GO לפני deploy.**
3. **Task 9** — מסך אדמין preview/apply מאובטח. **Task 10** — פיוס E2E + תיעוד + gate סיום.
4. **env vars ב-Netlify** לפני שה-API פעיל בפרודקשן: `API_TOKEN`, `PRICE_GPT_TOKEN`, `PRICE_SESSION_SECRET`, `PRICE_ADMIN_SECRET` (בלעדיהם: fail-closed 401).
5. עתידי: Plan 2 (GPT Actions), Plan 3 (ייבוא מחירונים XLSX/PDF), Plan 4 (Production Hardening).

## איך מריצים ובודקים
- פיתוח: `npm run dev` (→ http://localhost:5173/). קודי כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (Vitest, **30/30**). בתוך sandbox (Codex) — fallback Vitest עם config inline (ה-loader נחסם ב-ACL).
- typecheck של ה-build: `npx tsc --noEmit` (כיסוי `src` בלבד). typecheck של ה-backend (shared/netlify/tests): `npx tsc -p tsconfig.check.json --noEmit` (הקובץ ב-`.gitignore` — צור אם חסר: extends tsconfig.json, `types:["node"]`, include shared/priceCatalog+netlify/functions+tests/priceCatalog).
- אימות לפני "Done": `npm run build` + הטסטים + typecheck.
- Deploy: `git push origin main` → Netlify (**claude בלבד, אחרי GO**). remote: `github.com/or4551-cyber/meshausha-pwa`.

## מצב גיט
- ענף: `main`. קומיט אחרון: `7eb1afc` ([claude] fix: address codex core review — 4 blockers + race).
- **10 קומיטים לפני `origin/main`, לא נדחפו** (Tasks 1–7 + תיקוני review + docs). ממתין ל-GO של OR.
- remote `origin` מחובר ל-GitHub + Netlify. `safe.directory` מוגדר.

## יומן שלבים (מהחדש לישן)
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1, Tasks 1–7)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD; gate + review של Codex תפס 4 blockers + race → תוקנו ואושרו (30/30).
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + מנגנון catalog-version migration; review של codex תפס באג כפילות שתוקן ואומת.
- [2026-06-20 — הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים (docs/sync) + תיקוני תשתית גלובליים + תבנית לשימוש חוזר.
