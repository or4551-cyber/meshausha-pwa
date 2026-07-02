# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-07-02 | **שלב נוכחי:** תיקון 3 באגים שדיווח האדמין | **סטטוס:** **שלושת הבאגים תוקנו ואומתו חי** (OR בחר "להשלים באג 1 ואז לפרוס הכול יחד"). **ממתין ל-GO לפריסה.** טרם נפרס, טרם קומיט.

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין (9999), ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline. בנוסף — מערכת מחירוני ספקים מרכזית (מקור-אמת יחיד, מגורסן) עם מסך אדמין ו-GPT פרטי שמחובר אליה.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו (שלב 2026-07-01)
שלושה באגים שדיווח האדמין. **working tree כולל שינויים לא-מוקמטים ולא-פרוסים:**
- **✅ באג 3 (דליפת מחירים) — תוקן ואומת חי.** `SendOrderModal.tsx:136` `showPrice: isAdmin`→`false`. ההודעה לספק לא כוללת מחירים (אומת ב-Playwright: טקסט wa.me = שם+כמות בלבד). האדמין עדיין רואה מחירים בממשק.
- **✅ באג 2 (חיפוש לא מסנן) — אובחן; אינו באג קוד.** לוגיקת החיפוש ב-`OrdersPage` תקינה (אומת ב-dev+prod: "כפפות"→90:4, "קערה"→5). התסמין אצל OR = **service worker שמגיש bundle ישן**. פתרון: rebuild+redeploy. **בנוסף** תוקן `OrdersPage.tsx:22` — האדמין רואה עכשיו גם מוצרי `adminOnly` (תיקון-לוואי, לא הסיבה).
- **✅ באג 1 (כפילות טרה פלסט) — תוקן ואומת מול נתוני פרודקשן חיים.** סיבת-שורש: `useCatalogSync` מיזג מוצרים ישנים מ-settings-api (41 שמות פרה-עדכון) על גבי ה-90 הנקיים, והקטלוג המרכזי דרס רק כשהגרסה שונה (וכשהמכשיר על 4=הקטלוג — דילג). **תיקון:** (א) `loadCloudData(suppliers, [])` — לא ממזגים יותר מוצרים מ-settings-api; (ב) `reconcileCatalogProducts` חדש + reconcile בטעינה ראשונית — מחיל את הקטלוג המרכזי הטרי תמיד (גם בגרסה זהה). **אומת:** מכשיר מזוהם (v4 + 4 מוצרים ישנים מזויפים) → אחרי רענון (dev מ-proxy לפרודקשן) → טרה=90, אפס כפילויות, הפייקים נעלמו.

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים — הקטלוג המרכזי הוא מקור-אמת יחיד.** קריאה: `useCatalogSync` מסנכרן בהפעלה + focus/visibility, `replaceCatalogProducts` הוא **full-replace מונוטוני** (מחליף רק אם `version > catalogVersion` המקומי). כתיבה: כל פעולות-האדמין עוברות `commitCatalogOperations` → preview/apply. **⚠️ ידע חדש (2026-07-01):** אף שהמוצרים עברו לקטלוג המרכזי, `useCatalogSync` עדיין ממזג `data.products` מ-settings-api (הישן) דרך `loadCloudData` — וזה מקור הכפילויות (ראה באג 1). `catalogVersion` משותף לשני מנגנונים (הקטלוג המרכזי + `migrateCatalog`) — אסור לבלבל ביניהם.
- **session-אדמין לכתיבה:** כניסה ב-9999 → `/api/price-auth` ממיר PIN ל-token חתום (HMAC, 8h). הסוד (`PRICE_ADMIN_SECRET=9999`) בשרת בלבד. ההנפקה ב-`App.tsx`.
- **🤖 GPT פרטי (Plan 2):** GPT ב-ChatGPT עם Action ל-`https://meshaushapp.netlify.app`, אימות Bearer עם `PRICE_GPT_TOKEN`. זרימת preview→אישור→apply שהשרת אוכף. **מגבלות ChatGPT Actions:** OpenAPI 3.1.x; description ≤300 תווים; בלי `nullable`; תשובה ≤~100KB; Action אחד לכל דומיין.
- **backend מחירונים:** לוגיקה טהורה ב-`shared/priceCatalog/`; API+אחסון+הרשאות ב-`netlify/functions/_priceCatalog*` + `price-*.ts`. הרשאות fail-closed (app=read, gpt/admin=write).
- **שיתוף סוכנים:** SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**. **OR מריץ כתיבות-כסף/דאטה-פרודקשן (דרך ה-GPT/UI), Claude מאמת מהשרת (קריאה בלבד).**

## מה נשאר לעשות / חסמים
1. **פריסה (deploy) — החסם היחיד שנותר.** שלושת התיקונים ב-working tree, מאומתים, ממתינים ל-GO מפורש מ-OR. הפריסה תפתור מיידית גם את באג 2 (bundle ישן) וגם באג 1 (reconcile ינקה מכשירים קיימים בטעינה הבאה). deploy = claude בלבד, דרך ה-CLI המתועד למטה.
2. **אופציונלי — ניקוי settings-api:** אפשר למחוק את 41 מוצרי הטרה הישנים מ-settings-api (כתיבת-דאטה — OR מריץ). לא חובה: התיקון כבר מפסיק למזג אותם ו-reconcile דורס. רק היגיינה.
3. **אחרי deploy:** לוודא בפרודקשן — חיפוש מסנן (SW התעדכן; hard-reload אם תקוע), אין כפילות טרה, הודעה לספק בלי מחירים.
4. **תוכנית שדרוג (roadmap)** — הוצגה ל-OR לבחירה: Tier1 (חיזוק SW, dedup הגנתי), Tier2 (חיפוש חכם, אנליטיקה), Tier3 (GPT בתוך-האפליקציה אמיתי — כרגע `chatbotAI.ts` הוא keyword-matching; ו-אוטומציות n8n מעל ה-Netlify Functions). כל פריט = שלב נפרד.
5. עתידי (מלפני): Plan 3 (ייבוא מחירונים xlsx), Plan 4 (Hardening + auto-deploy).

## איך מריצים ובודקים
- פיתוח: `npm run dev`. כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test`. typecheck: `npx tsc --noEmit` (עבר עם השינויים הנוכחיים). build: `npm run build` (עבר).
- **בדיקת קטלוג/settings-api חיים (קריאה):** טוקן app ב-`.env` (`VITE_API_TOKEN`). endpoints: `GET /api/prices/catalog/version`, `/api/prices/products?includeInactive=true`, `/.netlify/functions/settings-api?type=suppliers` (עם `Authorization: Bearer`).
- **Deploy לפרודקשן (ידני, CLI — claude בלבד, אחרי GO מפורש):**
  ```
  $env:VITE_API_TOKEN = "<Netlify env VITE_API_TOKEN>"
  $env:NETLIFY_AUTH_TOKEN = "<Netlify env NETLIFY_TOKEN>"
  npm run build
  npx --yes netlify-cli@latest deploy --prod --no-build --dir dist --functions netlify/functions --site 62cbac42-9bb2-4814-808b-0ef4b78928b5
  ```
- remote: `github.com/or4551-cyber/meshausha-pwa`. פרודקשן: `meshaushapp.netlify.app`. תוכנית PRO.

## מצב גיט
- ענף: `main`. **working tree לא-נקי (לא מוקמט, לא פרוס):**
  - `src/components/SendOrderModal.tsx` — באג 3 (`showPrice: false`).
  - `src/pages/OrdersPage.tsx` — באג 2 (adminOnly לאדמין).
  - `src/hooks/useCatalogSync.ts` + `src/stores/suppliersStore.ts` — באג 1 (stop-merge + `reconcileCatalogProducts`).
  - `docs/handoff/*` — מסמכי מסירה.
  - `src/data/products.ts` ו-`vite.config.ts` — **הוחזרו למצב מקורי** (הבאמפ וה-proxy הזמני בוטלו; לא ב-diff).
- typecheck נקי, build עובר. פרודקשן: deploy אחרון `6a382d3f`. הקטלוג המרכזי על גרסה 4 (נקי).

## יומן שלבים (מהחדש לישן)
- [2026-07-01 — תיקון 3 באגים שדיווח האדמין](JOURNAL/2026-07-01-admin-bugfixes-search-price-duplicates.md) — באג 3 (מחירים) תוקן+אומת; באג 2 (חיפוש) אובחן כ-bundle ישן (הקוד תקין)+תיקון adminOnly; באג 1 (כפילות) — סיבת-שורש בנתונים חיים (קטלוג מרכזי נקי v4; settings-api מחזיק 41 מוצרים ישנים שממוזגים), הבאמפ הוחזר, תיקון ממתין ל-GO. + רודמאפ שדרוג.
- [2026-06-21 — Plan 2: חיבור GPT פרטי לקטלוג](JOURNAL/2026-06-21-plan2-gpt-integration.md) — GPT Actions (read+preview/apply); סאגת הקמה ב-ChatGPT (3.1+300char+dup-domain); באג apply 130KB → תשובה קלה לפי role; אומת פטל 3→2 גרסה 4.
- [2026-06-21 — Task 9a: מסך אדמין כותב לקטלוג](JOURNAL/2026-06-21-task9a-admin-catalog-writes.md) — preview/apply, session ממיחזור 9999; Codex תפס BLOCKER ב-idempotency → resume מ-changeSet.
- [2026-06-21 — פריסה ראשונה + פיוס + חסם billing](JOURNAL/2026-06-21-first-deploy-and-reconciliation.md) — הכל עלה לאוויר; 21 מוצרים חיים נשמרו בפיוס; סיבת אי-פריסה: חריגת קרדיט Netlify.
- [2026-06-21 — Task 8: חיבור frontend לקטלוג](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync; review תפס BLOCKER race → תוקן.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD; 4 blockers + race → תוקנו.
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + catalog-version migration; codex תפס באג כפילות שתוקן.
- [2026-06-20 — הקמת פרוטוקול שיתוף Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים + תיקוני תשתית גלובליים.
