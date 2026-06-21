# הקמת ה-GPT הפרטי "מחירוני משאוושה" — מדריך

מטרה: GPT פרטי ב-ChatGPT שקורא מחירים חיים מהקטלוג ומעדכן אותם אחרי אישור מפורש.
דורש מנוי **ChatGPT Plus/Pro/Team** (יצירת GPT דורשת מנוי בתשלום).

---

## שלב 1 — הוספת הטוקן ל-Netlify (אתה)
ב-Netlify → אתר `meshaushapp` → **Site configuration → Environment variables → Add a variable**:
- **Key:** `PRICE_GPT_TOKEN`
- **Value:** `gpt_2815b7edf7849a12a1f311e2b4860650be2b38e2c891fe7d083a0cdc2e0c50e7`
- **Secret:** לא חובה (כמו שאר הסודות שלך) · **Scopes:** All (או Functions) · **Same value for all contexts**

אחרי שתיצור — כתוב לי "הוספתי GPT token", ואני **אפרוס מחדש** (ה-functions קולטים env רק ב-deploy).

> אותו ערך טוקן בדיוק ייכנס גם ב-ChatGPT (שלב 3, Authentication). שמור אותו.

## שלב 2 — צור GPT חדש
ב-ChatGPT → **Explore GPTs → + Create** (או chatgpt.com/gpts/editor) → לשונית **Configure**:
- **Name:** מחירוני משאוושה
- **Description:** עוזר לניהול מחירוני ספקים — שאלות מחיר ועדכונים מאושרים.
- **Instructions:** הדבק את **כל** התוכן מ-`docs/gpt/gpt-instructions.md`.
- **Capabilities:** אפשר לכבות Web Search / DALL·E / Code Interpreter (לא נחוצים).

## שלב 3 — חבר את ה-Actions
ב-Configure → גלול ל-**Actions → Create new action**:
1. **Authentication:** בחר **API Key** → **Auth Type: Bearer** → הדבק את הטוקן מ-שלב 1
   (`gpt_2815...`).
2. **Schema:** הדבק את כל התוכן מ-`docs/gpt/openapi.yaml` (או ייבא מ-URL אם תעלה אותו).
3. ודא ש-ChatGPT מזהה את הפעולות (תראה רשימה: getCatalogVersion, searchProducts, previewChanges,
   applyChange וכו'). פעולת `applyChange` תסומן כ"consequential" (תדרוש אישור נוסף ב-ChatGPT) — זה רצוי.
4. **Privacy policy:** אפשר לשים קישור פנימי/מקום-שומר (נדרש שדה כלשהו לפרסום-עצמי).

## שלב 4 — שמור והשאר פרטי
שמור (Save) → **Only me** (פרטי לך בלבד). אין צורך לפרסם.

## שלב 5 — בדיקת קבלה (אתה, בשיחה עם ה-GPT)
1. **שאלת מחיר:** "כמה עולה פטל בגלון?" → צריך לחזור: 2 ₪ (לפני מע"מ), ספק יבולי שדה תמרה.
2. **שינוי מאושר (הפיך):** "תוריד את הפטל בחזרה ל-1" → ה-GPT יציג preview (2→1, ‎-50%‎) ויבקש אישור →
   אשר → ה-GPT מבצע. אמת שהקטלוג עלה לגרסה הבאה (אני אבדוק מהצד שלי, או תשאל אותו "מה הגרסה?").
3. **ביטול:** "בטל את השינוי האחרון" → preview-ביטול → אישור → בוצע.

אם כל השלושה עובדים — **Plan 2 הושלם** (Exit gate: שיחה חדשה קוראת מחירים חיים ומבצעת שינוי מאושר
שמגיע לאפליקציה). דווח לי ואאמת מהצד של השרת.

---

## פתרון תקלות
- **401 unauthorized מה-Action:** הטוקן ב-ChatGPT לא תואם ל-`PRICE_GPT_TOKEN` ב-Netlify, או שלא פרסתי
  מחדש אחרי הוספת הטוקן. ודא שהערכים זהים + שביקשת ממני redeploy.
- **400 missing_idempotency_key ב-apply:** ה-GPT שכח כותרת Idempotency-Key — ההוראות אומרות לו להפיק
  ערך ייחודי; אם חוזר, הזכר לו בשיחה.
- **409 stale_version:** מישהו עדכן במקביל; ההוראות אומרות ל-GPT לקרוא version שוב ולעשות preview מחדש.
- **ה-GPT "ממציא" מחיר:** הזכר לו לחפש דרך ה-Action (searchProducts) ולא להסתמך על זיכרון.

## אבטחה — תזכורת
- `PRICE_GPT_TOKEN` חי רק ב-Netlify וב-הגדרות ה-GPT. לא בקוד ה-Frontend.
- ה-GPT פרטי לך בלבד.
- כל שינוי דורש preview + apply עם confirmation="APPROVE" (אכיפת-שרת) — אין כתיבה בלי אישור מפורש.
- אם הטוקן דולף: צור חדש (כמו בשלב 1), עדכן בשני המקומות, ובקש ממני redeploy.
