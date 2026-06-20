# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-06-20 | **שלב נוכחי:** עדכון מחירון טרה פלסט יוני 2026 | **סטטוס:** הושלם ונדחף (Netlify deploy)

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין, ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + 13 פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
- האפליקציה חיה ומפותחת (Phases 1–3). deploy דרך GitHub→Netlify (push ל-`main` מפעיל בנייה).
- **השלב האחרון:** קטלוג טרה פלסט עודכן למחירון יוני 2026 (88 פריטים) + הכפפות הכפולות תחת 'סלטים משאוושה'.
  נדחף ב-`356f083`; Netlify אמור לבנות ולפרוס לכל הסניפים (יקבלו ברענון הבא דרך מנגנון ההגירה).
- שכבת שיתוף-פעולה פעילה: `docs/sync/` (BOARD+CHANNEL+PROTOCOL), `CLAUDE.md`/`AGENTS.md` בשורש.

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** בדיקה ב-375px, בלי overflow-x, RTL/עברית מלא.
- **נתוני ספקים/מוצרים:** seed סטטי ב-`src/data/products.ts` → Zustand store (`meshausha-suppliers` ב-localStorage) → ענן (Netlify Blobs, `settings-api`). **`seedStaticProducts` לעולם לא דורס מחיר קיים** (דדופ לפי `supplier|name`).
- **עדכון קטלוג שמגיע למכשירים קיימים:** דרך `CATALOG_VERSION` + `migrateCatalog(version, transform)` ([suppliersStore.ts](../../src/stores/suppliersStore.ts)). הטרנספורם (`applyCatalogV1` ב-[products.ts](../../src/data/products.ts)) חייב להיות **אידמפוטנטי** (remove+add, לא patch) כדי לא ליצור כפילויות מה-seed. הגרסה נקבעת רק אחרי שמירת ענן מוצלחת. נקרא כצעד אחרון ב-`App.tsx` (אחרי מיזוג הענן).
- **שיתוף סוכנים:** ברירת מחדל SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); רק claude עושה deploy. כללים: `docs/sync/PROTOCOL.md`.

## מה נשאר לעשות / חסמים
- **לאמת את ה-deploy ב-Netlify** (שהבנייה עברה) ולבדוק בפרודקשן (אדמין 9999 → `/admin/prices`) שמוצר טרה פלסט מדגם מציג מחיר חדש.
- מועמד עתידי (נדחה): מסך אדמין לייבוא מחירון (`fileParser.ts` קיים) — לעדכונים חוזרים בלי קוד.
- 'סלטים משאוושה' מכיל עותק של פריטי האריזה של טרה פלסט (sm65–sm105); הפעם עודכנו שם רק הכפפות.

## איך מריצים ובודקים
- פיתוח: `npm run dev` (→ http://localhost:5173/). קודי כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- אימות לפני "Done": `npm run build` + `npx tsc --noEmit`.
- Deploy: `git push origin main` → Netlify (claude בלבד). remote: `github.com/or4551-cyber/meshausha-pwa`.
- בדיקת קטלוג טרה פלסט: ב-store, `getProductsBySupplier('טרה פלסט (משאוושה)')` אמור להחזיר 88 פריטים בדיוק, בלי כפולים.

## מצב גיט
- ענף: `main`. קומיט אחרון: `356f083` ([claude] feat: עדכון מחירון טרה פלסט יוני 2026), נדחף ל-origin.
- remote `origin` מחובר ל-GitHub + Netlify. `safe.directory` מוגדר.

## יומן שלבים (מהחדש לישן)
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + מנגנון catalog-version migration; review של codex תפס באג כפילות שתוקן ואומת.
- [2026-06-20 — הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים (docs/sync) + תיקוני תשתית גלובליים + תבנית לשימוש חוזר.
