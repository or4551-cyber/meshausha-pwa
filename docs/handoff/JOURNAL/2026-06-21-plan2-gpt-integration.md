# שלב: Plan 2 — חיבור GPT פרטי לקטלוג (GPT Actions) — 2026-06-21

## מטרת השלב
OR ביקש "להתחיל את Plan 2 עכשיו" — לחבר GPT פרטי ב-ChatGPT לקטלוג המחירים המרכזי, כך
שאפשר לשאול אותו מחירים בשפה טבעית ולעדכן מחירים דרך שיחה (עם אישור מפורש). זה מימוש
שער-היציאה של Plan 2 מה-roadmap: "שיחה חדשה קוראת מחירים חיים ומבצעת שינוי מאושר שמגיע לאפליקציה."

## מה נבנה בפועל (קבצים עיקריים)
- `docs/gpt/openapi.yaml` — סכמת OpenAPI **3.1.0** ל-GPT Actions (9 פעולות: getCatalogVersion,
  listSuppliers, searchProducts, getProduct, getProductHistory, previewChanges, applyChange
  [x-openai-isConsequential], revertPreview, createExportLink). תשובת apply = `ApplyResult` (קלה).
- `docs/gpt/gpt-instructions.md` — הוראות ל-GPT (זרימת preview→אישור→apply, דוגמאות עברית).
- `docs/gpt/SETUP.md` — מדריך הקמה ב-ChatGPT + בדיקת קבלה + פתרון תקלות.
- `netlify/functions/_priceCatalogRouter.ts` — **תיקון מרכזי:** `buildApplyResponse(role, snapshot, change)`
  — אדמין מקבל snapshot מלא (האפליקציה מעדכנת חנות מקומית מ-`result.products`); GPT מקבל תשובה קלה.
- `tests/priceCatalog/router.test.ts` — +2 טסטים (GPT-light כולל replay; admin-full). 73/73.
- `PRICE_GPT_TOKEN` ב-Netlify (context=all, scope functions) — טוקן הכתיבה הייעודי של ה-GPT.

## הדרך: מה נוסה, מה עבד, מה נכשל ולמה
1. **חבילת ה-Actions** (openapi+הוראות+setup) כבר נבנתה ב-commit `6fff41b` (סוף הסשן הקודם).
2. OR הוסיף `PRICE_GPT_TOKEN` ל-Netlify ידנית (כמו PRICE_SESSION_SECRET — ה-API לא שומר secret-masked).
3. **redeploy** (`6a38212d`) כי functions קולטים env רק ב-deploy. אומת חי מול ה-API עם הטוקן:
   version/suppliers/search OK, טוקן-שגוי→401, preview→201 (write-role). הכל ירוק.
4. **OR התחיל לבנות את ה-GPT ב-ChatGPT** — וכאן צצה **סאגת הקמה** (3 חסמים רצופים שתיקנתי תוך כדי):
   - **א. OpenAPI 3.0.3 נדחה** — ChatGPT דורש 3.1.x. גם: `previewChanges` description באורך 321 > גבול 300
     תווים של ChatGPT. גם: `nullable: true` לא חוקי ב-3.1. **תיקון** (`29b87ca`): bump ל-3.1.0, קיצור כל
     התיאורים מתחת ל-300, הסרת `nullable` (השדות נשארו עם type בסיסי — מקובל).
   - **ב. "Action sets cannot have duplicate domains"** — OR לחץ "Create new action" כשכבר היה Action קיים
     עם אותו דומיין. הפתרון: לערוך את ה-Action הקיים (להחליף סכמה) במקום ליצור חדש / למחוק את הכפיל.
   - **ג. ההדבקה עצמה** — OR התקשה בתחילה למצוא/לנקות את תיבת ה-Schema. הודרך צעד-צעד (Ctrl+A→Delete→paste).
     בסוף 9 הפעולות זוהו.
5. **בדיקת קבלה #1 (קריאה)** — "כמה עולה פטל?" → ה-GPT החזיר 2 ₪ + ספק. ✅
6. **בדיקת קבלה #2 (שינוי) — כאן נתפס באג חי קריטי:** "תעלה את הפטל ל-3" → preview מושלם (2→3, +50%, ⚠️) →
   אישור → ה-GPT אמר **"העדכון לא הצליח בגלל תקלה בקבלת התשובה מהשרת"**. אבל בדיקה מהשרת הראתה
   ש**השינוי דווקא נחת** (גרסה 3, פטל=3, history v3). כלומר false-negative בצד ChatGPT.
7. **חקירה:** `apply` החזיר `json(200, next)` = **CatalogSnapshot מלא** (291 מוצרים). מדדתי: ~130KB.
   ChatGPT Actions לא מסוגל לעבד תשובה כזו (גבול ~100KB) → "תקלה בקבלת התשובה" אף שה-HTTP היה 200.
   הקריאות עבדו כי `search` מחזיר רק התאמות (מעט).
8. **תיקון (TDD, `e7e3776`):** `buildApplyResponse` מפצל לפי role — GPT מקבל רק
   version/previousVersion/changeSetId/checksum + `changed[]` (המוצרים שהשתנו). אדמין ממשיך snapshot מלא
   (האפליקציה תלויה בו). הוטמע בכל 3 נקודות-ההחזרה של apply (replay/recovery/normal). 73/73, tsc נקי, build ירוק.
9. **deploy** (`6a382d3f`) + **בדיקת קבלה #2 חוזרת:** "תוריד את הפטל ל-2" → preview (3→2, -33%, ⚠️) → אישור →
   **הפעם ה-GPT דיווח הצלחה נקייה** ("✅ עודכן, גרסה 4"). אומת מהשרת: version=4, פטל=2, history v1:1→v2:2→v3:3→v4:2. ✅

## כיוונים שעלו בשיחה ולא מומשו (+ למה)
- **Import from URL** במקום הדבקת הסכמה — הצעתי לפרסם את ה-openapi לכתובת ציבורית כדי ש-OR ייבא בלחיצה אחת.
  לא מומש כי OR הסתדר בסוף עם ההדבקה (החסם האמיתי היה תוכן הסכמה, לא מנגנון ההדבקה). נשאר כאופציה לעתיד.
- **עדכון הסכמה ב-ChatGPT אחרי תיקון ה-apply** — לא נדרש: התיקון בצד-שרת והתשובה הקלה עובדת עם הסכמה הישנה
  (ChatGPT סלחני ל-response schema). עדכון `ApplyResult` ב-openapi נעשה לתיעוד/נכונות, לא חובה ל-GPT הקיים.
- **בדיקת revert מלאה** ("בטל את השינוי האחרון") — לא הורצה: ביטול ה-v4 היה מחזיר פטל ל-3 (לא רצוי), ונתיב ה-apply
  כבר אומת מקצה-לקצה + יש unit-tests ל-revert. נשאר ל-OR לשימוש אמיתי בשטח.

## באגים שהתגלו ותוקנו
- **OpenAPI נדחה ע"י ChatGPT** → 3.0.3 לא נתמך + description 321>300 + nullable לא-חוקי → 3.1.0 + קיצור + הסרת nullable (`29b87ca`).
- **Duplicate domain** → שני Actions על אותו דומיין → לערוך קיים / למחוק כפיל (הדרכה, לא קוד).
- **apply 130KB → "תקלה בקבלת התשובה" למרות הצלחה** → snapshot מלא חורג מגבול ChatGPT → תשובה קלה לפי role (`e7e3776`).
  זה הבאג המשמעותי: התגלה **רק** בבדיקה חיה מול ChatGPT (יוניט-טסטים לא תופסים מגבלת-פלטפורמה חיצונית).

## החלטות שהתקבלו (+ נימוק)
- **תשובת apply לפי role:** GPT=קל, admin=מלא. נימוק: ChatGPT חונק על תשובות גדולות; האפליקציה צריכה את
  המוצרים המלאים כדי לעדכן את החנות המקומית (`replaceCatalogProducts`). פיצול לפי role מספק את שניהם בלי regression.
- **OR מריץ את כתיבות-הכסף (דרך ה-GPT), Claude מאמת מהשרת (קריאה בלבד).** נימוק: הסוכן לא מבצע כתיבות-כסף
  בפרודקשן בעצמו (guardrail); האימות הוא קריאת מקור-האמת (version/price/history).
- **PRICE_GPT_TOKEN דרך הדאשבורד + redeploy ידני.** נימוק: functions snapshot-ים env ב-deploy; ה-MCP API לא
  שומר secret-masked (כמו ב-Task 9a).

## קומיטים רלוונטיים
- `e7e3776` [claude] fix(plan2): apply LIGHT response for gpt role (ChatGPT ~130KB limit)
- `29b87ca` [claude] fix(plan2): openapi 3.1.0 + descriptions <=300 for ChatGPT validator
- `b2c427d` [claude] docs(plan2): backend deployed+verified live; PRICE_GPT_TOKEN set
- `6fff41b` [claude] feat(plan2): GPT Actions package (openapi + instructions + setup)

## לקחים לשלב הבא
- **מגבלות ChatGPT Actions (לזכור לכל Action עתידי):** OpenAPI חייב **3.1.x**; description לפעולה **≤300 תווים**;
  `nullable` לא חוקי (השתמש ב-type בסיסי או `[type,"null"]`); **תשובה ≤~100KB** (אל תחזיר אוסף מלא — החזר תמצית/עימוד);
  **Action אחד לכל דומיין** ב-GPT.
- **באגים של פלטפורמה חיצונית מתגלים רק בבדיקה חיה.** היוניט-טסטים היו ירוקים וה-apply עבד מושלם — הבעיה
  הייתה במגבלת ChatGPT. שווה לבדוק קצה-לקצה מול הפלטפורמה האמיתית, לא רק מול ה-API.
- **deploy דורש GO מפורש בכל פעם** (ה-classifier חוסם "הוספתי" כ-GO). תכנן זאת בזרימה.
- אם רוצים לבדוק revert בשטח — זכור שהוא מחזיר את הגרסה הקודמת (יבטל תיקון נכון אם זה השינוי האחרון).
