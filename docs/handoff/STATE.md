# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-06-21 | **שלב נוכחי:** Plan 2 (GPT Actions) **הושלם ואומת חי** | **סטטוס:** חי בפרודקשן; הבא Plan 3 (ייבוא מחירונים)

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין (9999), ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline. בנוסף — מערכת מחירוני ספקים מרכזית (מקור-אמת יחיד, מגורסן) עם מסך אדמין ו-GPT פרטי שמחובר אליה.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
- **🤖 Plan 2 (GPT Actions) הושלם ואומת חי (2026-06-21, deploy `6a382d3f`).** GPT פרטי ב-ChatGPT מחובר לקטלוג:
  קורא מחירים חיים, מציג preview עם אזהרות, מבצע שינוי מאושר (preview→אישור→apply) שמגורסן והפיך ומגיע
  לקטלוג שכל הסניפים קוראים. **אומת מקצה-לקצה:** OR ביקש מה-GPT "תוריד פטל ל-2" → גרסה עלתה ל-4, פטל=2,
  history `v1:1→v2:2→v3:3→v4:2`. ה-GPT דיווח הצלחה נקייה.
- **🎉 Task 9a (מסך אדמין כותב לקטלוג) פרוס ואומת (deploy `6a380dad`).** preview/apply, session ממיחזור 9999.
- **לפני זה (אותו יום):** Tasks 1–8 (קריאה מהקטלוג); פיוס 291 מוצרים; מחירון טרה פלסט יוני 2026 חי.
- **הבא:** Plan 3 (ייבוא מחירונים), Plan 4 (Hardening + שקילת auto-deploy).

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים — הקטלוג המרכזי הוא מקור-אמת יחיד.** קריאה: `useCatalogSync` מסנכרן בהפעלה + focus/visibility,
  `replaceCatalogProducts` הוא **full-replace מונוטוני** (מחליף רק אם `version > catalogVersion` המקומי). כתיבה:
  כל פעולות-האדמין עוברות `commitCatalogOperations` → preview/apply. לוחות-זמנים/סניפים של ספקים נשארים ב-settings-api.
- **session-אדמין לכתיבה:** כניסה ב-9999 → `/api/price-auth` ממיר PIN ל-token חתום (HMAC, 8h). הסוד
  (`PRICE_ADMIN_SECRET=9999`) בשרת בלבד. ההנפקה ב-`App.tsx` (useEffect על `user.isAdmin`, מ-`user.branchCode`) —
  מכסה כניסה טרייה ושחזור מ-persist. PWA: ניקוי cache לא מנקה localStorage; commit מקפיץ version → סנכרון מונוטוני דורס stale.
- **🤖 GPT פרטי (Plan 2):** GPT ב-ChatGPT עם Action שמצביע על `https://meshaushapp.netlify.app`, אימות Bearer עם
  `PRICE_GPT_TOKEN` (role=gpt, write). הסכמה+הוראות ב-`docs/gpt/`. שתי שכבות הגנה: טוקן ייעודי + אישור דו-שלבי
  שהשרת אוכף (preview → confirmation="APPROVE" → apply). **תשובת `apply` לפי role:** GPT מקבל תשובה **קלה**
  (version + `changed[]` בלבד) כי snapshot מלא (~130KB) חורג מגבול ChatGPT Actions; אדמין מקבל snapshot מלא
  (האפליקציה צריכה `result.products`). ראה `_priceCatalogRouter.ts → buildApplyResponse`.
- **idempotency:** `CommitAttempt {idempotencyKey, changeSetId?}` יציב על-פני ניסיונות-חוזרים; ניסיון-חוזר עושה
  **resume** מאותו changeSet. preview חדש רק אם ה-changeSet לא-ישים (404/410/stale_version/version_conflict).
- **backend מחירונים:** לוגיקה טהורה ב-`shared/priceCatalog/`; API+אחסון+הרשאות ב-`netlify/functions/_priceCatalog*`
  + `price-*.ts`. הרשאות fail-closed (app=read, gpt/admin=write). `price-auth.ts` מנפיק session (rate-limited 5/15דק').
- **מגבלות ChatGPT Actions (חובה לכל Action עתידי):** OpenAPI **3.1.x**; description לפעולה **≤300 תווים**;
  בלי `nullable`; **תשובה ≤~100KB** (החזר תמצית/עימוד, לא אוסף מלא); **Action אחד לכל דומיין** ב-GPT.
- **שיתוף סוכנים:** SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**.
  **OR מריץ כתיבות-כסף (דרך ה-GPT/UI), Claude מאמת מהשרת (קריאה בלבד)** — הסוכן לא מבצע כתיבות-כסף בפרודקשן בעצמו.

## מה נשאר לעשות / חסמים
1. **Plan 3 — ייבוא מחירונים:** העלאת קובץ מחירון (xlsx) → המרה ל-ChangeSet → preview/apply. עתידי.
2. **בדיקת-עשן UI ל-Task 9a:** Playwright — login 9999 → עריכת מחיר → שמירה → אימות גרסה חדשה.
3. **ניקוי מינורי (לא חוסם):** באנר warnings (#8), auto-retry apply על 429 (#7), הודעת no_session על rate-limit (#14).
4. **אופציונלי GPT:** עדכון הסכמה ב-ChatGPT ל-`ApplyResult` (לא חובה — התיקון בצד-שרת עובד עם הסכמה הקיימת);
   פרסום openapi לכתובת ל-Import-from-URL במקום הדבקה.
5. עתידי: Plan 4 (Hardening + שקילת auto-deploy).

## איך מריצים ובודקים
- פיתוח: `npm run dev`. כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (**73/73**). typecheck: `npx tsc --noEmit` (src) + `npx tsc -p tsconfig.check.json --noEmit`
  (gitignored; types:["node","vite/client"], include shared/netlify/tests).
- **Deploy לפרודקשן (ידני, CLI — claude בלבד, אחרי GO מפורש):**
  ```
  $env:VITE_API_TOKEN = "<Netlify env VITE_API_TOKEN>"   # חובה לפני build, אחרת auth נשבר
  $env:NETLIFY_AUTH_TOKEN = "<Netlify env NETLIFY_TOKEN>"
  npm run build
  npx --yes netlify-cli@latest deploy --prod --no-build --dir dist --functions netlify/functions --site 62cbac42-9bb2-4814-808b-0ef4b78928b5
  ```
  אימות קריאה: `GET /api/prices/catalog/version`, `/api/prices/products?q=...` (עם `Authorization: Bearer <PRICE_GPT_TOKEN>`).
- **בדיקת ה-GPT (OR):** שיחה עם ה-GPT הפרטי — שאלת מחיר; שינוי מאושר; ביטול. Claude מאמת מהשרת (version/price/history).
- **env ב-Netlify (siteId 62cbac42-...):** API_TOKEN/VITE_API_TOKEN/NETLIFY_TOKEN/GOOGLE_*,
  `PRICE_ADMIN_SECRET=9999`, `PRICE_SESSION_SECRET`, `PRICE_GPT_TOKEN` (כולם מוגדרים). functions קולטים env רק ב-deploy.
- remote: `github.com/or4551-cyber/meshausha-pwa`. פרודקשן: `meshaushapp.netlify.app`. תוכנית PRO.

## מצב גיט
- ענף: `main`. קומיט אחרון: `e7e3776` ([claude] fix(plan2): apply LIGHT response) + עדכון handoff זה.
- פרודקשן מסונכרן: deploy אחרון `6a382d3f` (כולל תיקון ה-apply הקל). אומת חי (פטל v4=2).
- **עדיין לא נדחף ל-remote** — לדחוף `git push origin main` (אחרי GO).

## יומן שלבים (מהחדש לישן)
- [2026-06-21 — Plan 2: חיבור GPT פרטי לקטלוג](JOURNAL/2026-06-21-plan2-gpt-integration.md) — GPT Actions (read+preview/apply); סאגת הקמה ב-ChatGPT (3.1+300char+dup-domain); באג apply 130KB שנתפס בבדיקה חיה → תשובה קלה לפי role; אומת פטל 3→2 גרסה 4.
- [2026-06-21 — Task 9a: מסך אדמין כותב לקטלוג](JOURNAL/2026-06-21-task9a-admin-catalog-writes.md) — preview/apply, session ממיחזור 9999; Codex תפס BLOCKER ב-idempotency → resume מ-changeSet; נפרס+אומת; סאגת env.
- [2026-06-21 — פריסה ראשונה + פיוס + גילוי חסם billing](JOURNAL/2026-06-21-first-deploy-and-reconciliation.md) — הכל עלה לאוויר; 21 מוצרים חיים נשמרו בפיוס; סיבת השורש לאי-פריסה: חריגת קרדיט Netlify.
- [2026-06-21 — Task 8: חיבור frontend לקטלוג המרכזי](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync; review כפול תפס BLOCKER race → תוקן.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1, Tasks 1–7)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD; review של Codex תפס 4 blockers + race → תוקנו.
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + catalog-version migration; codex תפס באג כפילות שתוקן.
- [2026-06-20 — הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים + תיקוני תשתית גלובליים.
