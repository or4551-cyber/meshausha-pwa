# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).

- **עודכן:** 2026-07-23 | **שלב נוכחי:** ⏸️ **האפליקציה מוקפאת (mothballed)** | **סטטוס:** **מוקפא — OR סיים את העסקתו במשאוושה. שום דבר לא נמחק; הכול הפיך.**

## ⏸️ מצב ההקפאה — מה זה אומר בפועל
- **כל 4 האתרים נעולים בסיסמה** (מחזירים 401 לכל גולש/GPT): `meshaushapp` (הראשי) + `meshausha`, `meshausha01`, `meshios` (ישנים, נמצאו חיים ונעולים גם).
- **🔑 הסיסמה:** `Meshausha-Frozen-2026` — שמורה גם ב-`C:\Users\OR\קודקס\משאוושה\ARCHIVE-2026-07-23\README-הקפאה.md`.
- **המיילים האוטומטיים לספקים כובו** — התזמון הוער **בשני מקומות**: `netlify.toml` וגם `export const config` בתוך `scheduled-invoice-send.ts` + `scheduled-followup.ts` (מלכודת: הוא היה מוגדר בשניהם!). אומת: `netlify functions:list --json` → schedule ריק.
- **גיבוי מלא מקומי** (מחוץ לריפו): `קודקס\משאוושה\ARCHIVE-2026-07-23\` — כל משתני הסביבה/סודות, עותק `.env`, ו-**580 blobs** מכל 6 ה-stores (547 הזמנות, מחירון, push, gmail-tokens, calendar). 0 שגיאות.
- **הדאטה בענן לא זז** — הכול עדיין ב-Netlify Blobs של האתר.
- **מנוי Netlify Pro לא שונה** (הוראת OR: "הכול נשאר כמו שהוא") — הוא מכסה את כל 25 האתרים בחשבון, לא רק משאוושה.
- **ה-GPT "מחירוני משאוושה" ב-ChatGPT** קיים אך מנוטרל דה-פקטו (ה-API מאחורי הסיסמה → 401).

## 🔄 החזרה לחיים (3 צעדים)
1. הסרת הסיסמה: Netlify UI → Site configuration → Access & security → Site protection (לכל אתר שרוצים), או `netlify api updateSite` עם `"password": null`.
2. הפעלת המיילים: uncomment ב-3 קבצים — `netlify.toml` + שני קבצי `scheduled-*.ts` (כולל שורת `import type { Config }`).
3. `npm run build` + deploy (פקודה למטה). זהו — הדאטה מעולם לא זז.

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין (9999), ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline. בנוסף — מערכת מחירוני ספקים מרכזית (מקור-אמת יחיד, מגורסן) + GPT פרטי (ChatGPT) שמחובר אליה.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + **Netlify Blobs (אין Supabase!)** + Web Push.

## ארכיטקטורה והחלטות בתוקף (רלוונטי אם הפרויקט יוחזר לחיים)
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים — הקטלוג המרכזי הוא מקור-אמת יחיד.** `useCatalogSync`; `replaceCatalogProducts` full-replace מונוטוני. כתיבה: אדמין+GPT דרך preview→apply.
- **מקור הזמנות — Netlify Blobs store `meshausha-orders`** (`orders-api.ts`). `item.price` לפני מע"מ; `totalPrice` כולל מע"מ 17%.
- **session-אדמין לכתיבה:** 9999 → `/api/price-auth` → token חתום (HMAC, 8h).
- **GPT פרטי:** Action ל-`https://meshaushapp.netlify.app`, Bearer `PRICE_GPT_TOKEN`, 13 operations. קונפיג: `docs/gpt/{openapi.yaml,gpt-instructions.md}`.
- **תובנות הזמנות:** השרת מחשב, ה-GPT מציג; מנוע טהור `shared/orderInsights/`; spend לפני מע"מ; app→403.
- **backend:** לוגיקה טהורה ב-`shared/`; API+אחסון+הרשאות ב-`netlify/functions/`. הרשאות fail-closed.
- **שיתוף סוכנים (בזמנו):** Claude מתכנן/פורס, Codex מממש; ראה `docs/sync/`. לא רלוונטי בזמן ההקפאה.

## מה נשאר לעשות / חסמים
- **כלום — הפרויקט מוקפא בכוונה.** אין לפתוח/לשנות בלי בקשה מפורשת של OR.
- אופציה עתידית ל-OR (היגיינה, לא דחוף): ניתוק הרשאת ה-OAuth של Gmail בחשבון גוגל (myaccount.google.com → Security → Third-party access) — כרגע ממילא כלום לא ניגש אליה.
- הרודמאפ שהיה פתוח לפני ההקפאה (GPT סבב 3 / צ'אט-AI פנימי) — מושהה ללא מועד.

## איך מריצים ובודקים
- פיתוח מקומי (עובד גם בזמן הקפאה): `npm run dev`. כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (**121 ירוקים**). typecheck: `npx tsc --noEmit`. build: `npm run build`.
- **אימות מצב ההקפאה:** `Invoke-WebRequest https://meshaushapp.netlify.app` → חייב להחזיר **401**.
- **Deploy לפרודקשן (רק אם OR ביקש להחיות):**
  ```
  npm run build
  netlify deploy --prod --no-build
  ```
  (התיקייה מקושרת לאתר; `VITE_API_TOKEN` נטען מ-.env בזמן build.)
- remote: `github.com/or4551-cyber/meshausha-pwa`. פרודקשן: `meshaushapp.netlify.app` (נעול). Site ID: `62cbac42-9bb2-4814-808b-0ef4b78928b5`.

## מצב גיט
- ענף: `main`, **מסונכרן מלא עם origin** (כל קומיטי העבר + קומיטי ההקפאה נדחפו).
- קומיטים אחרונים: `0292ba4` (כיבוי תזמון גם בקוד) · `1beebad` (כיבוי תזמון ב-toml + .gitignore) · `d3e937c` (GPT סבב 2).
- **פרודקשן: הפריסה האחרונה = גרסת ההקפאה** (deploy `6a6278ab`, 2026-07-23) — זהה פונקציונלית ל-`6a47ee24` אך ללא קרונים.

## יומן שלבים (מהחדש לישן)
- [2026-07-23 — הקפאת האפליקציה (mothball)](JOURNAL/2026-07-23-mothball-app-frozen.md) — OR סיים העסקה; גיבוי 580 blobs+סודות, כיבוי קרונים (toml+קוד!), נעילת 4 אתרים בסיסמה, אימות 401/כניסה. שום דבר לא נמחק.
- [2026-07-04 — שדרוג GPT סבב 2: תובנות הזמנות](JOURNAL/2026-07-04-gpt-order-insights.md) — 3 endpoints קריאה + מנוע-חישוב טהור; נפרס `6a47ee24`, OR אישר.
- [2026-07-02 — שדרוג GPT סבב 1: ייבוא מחירונים](JOURNAL/2026-07-02-gpt-price-import.md) — `imports/preview` + מנוע-התאמה; נפרס `6a4649c5`.
- [2026-07-02 — שדרוג שכבה 1: אמינות](JOURNAL/2026-07-02-reliability-layer.md) — באנר PWA update + מגן-כפילויות. נפרס `6a461e88`.
- [2026-07-01 — תיקון 3 באגים שדיווח האדמין](JOURNAL/2026-07-01-admin-bugfixes-search-price-duplicates.md) — מחירים/חיפוש(SW ישן)/כפילות.
- [2026-06-21 — Plan 2: חיבור GPT פרטי לקטלוג](JOURNAL/2026-06-21-plan2-gpt-integration.md) — GPT Actions; סאגת הקמה ב-ChatGPT.
- [2026-06-21 — Task 9a: מסך אדמין כותב לקטלוג](JOURNAL/2026-06-21-task9a-admin-catalog-writes.md) — preview/apply; BLOCKER ב-idempotency.
- [2026-06-21 — פריסה ראשונה + פיוס + חסם billing](JOURNAL/2026-06-21-first-deploy-and-reconciliation.md) — הכל עלה לאוויר; שדרוג ל-Pro.
- [2026-06-21 — Task 8: חיבור frontend לקטלוג](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD.
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + migration.
- [2026-06-20 — הקמת פרוטוקול שיתוף Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים.
