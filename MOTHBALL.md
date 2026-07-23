# ⏸️ הפרויקט מוקפא (MOTHBALLED) — קרא לפני כל פעולה!

> **עדכון אחרון:** 2026-07-23 · OR סיים את העסקתו במשאוושה. האפליקציה הוקפאה בכוונה — **נעולה, לא מחוקה.**
> **אסור לפרוס מחדש / להסיר את הנעילה בלי בקשה מפורשת של OR.**

## 🔑 הסיסמה לאתרים הנעולים
```
Meshausha-Frozen-2026
```

## מצב נוכחי (מה בדיוק קפוא)
| מה | מצב |
|---|---|
| `https://meshaushapp.netlify.app` (הראשי) | 🔒 נעול בסיסמה — כל גולש מקבל 401 |
| 3 אתרים ישנים: `meshausha` · `meshausha01` · `meshios` (netlify.app) | 🔒 נעולים באותה סיסמה |
| מיילים אוטומטיים לספקים (2 קרונים יומיים) | ⛔ כבויים — הוערו **בשני מקומות**: `netlify.toml` **וגם** `export const config` בתוך `netlify/functions/scheduled-invoice-send.ts` + `scheduled-followup.ts` |
| הנתונים (Netlify Blobs — הזמנות, מחירון, טוקנים) | ✅ במקומם בענן, לא נגעו בהם |
| GPT "מחירוני משאוושה" ב-ChatGPT | קיים אך מנוטרל (ה-API חסום בסיסמה) |
| מנוי Netlify Pro | לא שונה (משרת את כל חשבון or4551, לא רק את משאוושה) |

## 💾 גיבוי מלא מקומי
`C:\Users\OR\קודקס\משאוושה\ARCHIVE-2026-07-23\`
(מסונכרן גם ללפטופ דרך Syncthing — שיתוף "קודקס")
- `netlify-env-vars.json` — כל הסודות/משתני הסביבה מ-Netlify
- `local-dotenv-backup.env` — עותק ה-.env המקומי
- `blobs/` — **580 קבצים** מכל 6 ה-stores (547 הזמנות, 14 גרסאות מחירון, push, gmail-tokens, calendar) — אומת: 0 שגיאות, 0 ריקים
- `_mothball-dump-blobs.mjs` — סקריפט הגיבוי (להרצה חוזרת: להעתיק לתיקיית הפרויקט, `node`)
- `README-הקפאה.md` — עותק ההוראות המלא

## 🔄 החזרה לחיים — בדיוק 3 צעדים (רק באישור OR!)
1. **הסרת הסיסמה** מכל אתר שמחזירים: Netlify UI → Site configuration → Access & security → Site protection → Remove.
   או ב-CLI: `netlify api updateSite --data '{\"site_id\":\"62cbac42-9bb2-4814-808b-0ef4b78928b5\",\"body\":{\"password\":null}}'`
2. **הפעלת המיילים מחדש** (אם רוצים): uncomment ב-**3 קבצים** — `netlify.toml` + שני קבצי ה-`scheduled-*.ts` (כולל שורת `import type { Config }`).
3. **פריסה:** `npm run build` ואז `netlify deploy --prod --no-build` (התיקייה מקושרת; Site ID `62cbac42-9bb2-4814-808b-0ef4b78928b5`).

הדאטה מעולם לא זז — אין צורך בשחזור נתונים.

## הקשר מלא
- תמונת מצב: [docs/handoff/STATE.md](docs/handoff/STATE.md)
- סיפור ההקפאה המלא (כולל המלכודות): [docs/handoff/JOURNAL/2026-07-23-mothball-app-frozen.md](docs/handoff/JOURNAL/2026-07-23-mothball-app-frozen.md)
