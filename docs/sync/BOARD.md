# לוח עבודה (BOARD) — מצב חי

> עדכן את השורה שלך **לפני** שאתה נוגע בקוד. ערוך רק קבצים שמופיעים תחת ה-`Now` שלך.
> כללים מלאים: `docs/sync/PROTOCOL.md`.

**סבב נוכחי:** פנוי — אף סוכן לא מחזיק את הטוקן. Plan 2 backend פרוס+אומת; ממתין ל-OR שיבנה את ה-GPT ב-ChatGPT (אין משימת-קוד פתוחה).

## Now (בעבודה כרגע)
| Agent  | משימה | קבצים/אזור נתבע (claimed) | Branch | עודכן (local) |
|--------|-------|---------------------------|--------|----------------|
| claude | — | — | — | — |
| codex  | — | — | — | — |

## Next (תור — לא התחיל)
- [ ] בדיקת קבלה Plan 2 (OR בשיחה עם ה-GPT: שאלת מחיר → שינוי מאושר → ביטול) → claude מאמת מהצד של השרת
- [ ] _(OR יוסיף משימות נוספות כאן)_

## Done (הושלם ואומת — החדש למעלה)
- [x] 2026-06-21 — Plan 2 backend: חבילת GPT Actions (`docs/gpt/openapi.yaml`+`gpt-instructions.md`+`SETUP.md`) + `PRICE_GPT_TOKEN` ב-Netlify + redeploy (`6a38212d`) — `claude` — אומת חי מול ה-API: version/suppliers/search עם הטוקן OK, טוקן-שגוי→401, preview→201 (write-role). נשאר: OR בונה את ה-GPT ב-ChatGPT.
- [x] 2026-06-21 — מערכת מחירוני ספקים Task 9a (מסך אדמין כותב לקטלוג דרך preview/apply; session ממיחזור PIN 9999) — `claude` — review של `codex` תפס BLOCKER ב-idempotency → תוקן (resume מ-changeSet) + אישר. אומת בפרודקשן: auth 9999→token, bad→401, preview-write OK. 71/71 tests
- [x] 2026-06-20 — איתור+ייבוא התוכנית המאושרת המלאה (spec+roadmap+plan-1, 1696 שורות) מ-`GPT מחירונים` ל-`docs/sdd/` — `claude`
- [x] 2026-06-20 — מערכת מחירוני ספקים Task 2 (Pure Catalog Change Engine: normalization + engine preview/apply/revert) — `claude` — אומת: 8/8 טסטים, tsc+shared typecheck נקי
- [x] 2026-06-20 — מערכת מחירוני ספקים Task 1 (test runner Vitest + סכמות Zod לקטלוג) — כתב `codex`, אומת+קובע `claude` (npm test 3/3 עובר מחוץ ל-sandbox, build ירוק). חסמי ה-sandbox היו סביבתיים בלבד.
- [x] 2026-06-20 — עדכון מחירון טרה פלסט יוני 2026 (88 פריטים + 4 כפפות סלטים + migrateCatalog) — `claude` (review: `codex` תפס BLOCKER כפילות → תוקן) — אומת: build ירוק, tsc נקי, בדיקת ריצה (0 דופים, אידמפוטנטי)
- [x] 2026-06-20 — הקמת פרוטוקול שיתוף פעולה v1 (docs/sync + CLAUDE/AGENTS stubs) — `claude` — אומת: קבצים נוצרו, build לא הושפע
