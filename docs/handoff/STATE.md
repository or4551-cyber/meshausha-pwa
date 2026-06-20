# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-06-20 | **שלב נוכחי:** הקמת פרוטוקול שיתוף v1 | **סטטוס:** הושלם

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין, ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, זיהוי כפילויות, שליחה ב-WhatsApp/Email, התראות Push, ייצוא PDF/Excel, ועבודה offline.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + 13 פונקציות Netlify (serverless) + Web Push. ~8,500 שורות.

## איפה עומדים עכשיו
- האפליקציה עובדת ומפותחת לאורך Phases 1–3 (יציבות/אבטחה → UX → כלי הנהלה). הקומיט האחרון: `c88e7d1`.
- **השלב הנוכחי הוסיף תשתית שיתוף-פעולה** בין Claude ל-Codex (ראה JOURNAL מ-2026-06-20). אין שינוי בקוד האפליקציה עצמו.
- שכבת התיאום פעילה: `docs/sync/` (לוח + צ'אט + פרוטוקול), `CLAUDE.md`/`AGENTS.md` בשורש.

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** בדיקה ב-375px, בלי overflow-x, כפתורים 48px, RTL/עברית מלא.
- **State:** 10 stores ב-Zustand עם persistence ל-localStorage; נתונים בענן דרך Netlify Blobs + Dexie offline.
- **Backend:** פונקציות Netlify ב-`netlify/functions/` עם middleware אימות `_auth.ts` (shared-secret).
- **שיתוף סוכנים:** ברירת מחדל SEQUENTIAL (טוקן אחד, OR מעביר); חלוקת עבודה Relay (claude מתכנן/מבקר/פורס, codex מממש); רק claude עושה deploy. כללים מלאים: `docs/sync/PROTOCOL.md`.

## מה נשאר לעשות / חסמים
- ✅ **אימות end-to-end הושלם (2026-06-20):** Codex השיב ב-`docs/sync/CHANNEL.md` עם קוד-סודי 4242 — התקשורת הדו-כיוונית עובדת (Codex קורא protocol+BOARD+shared-brain וכותב חזרה לערוץ).
- משימות מוצר עתידיות: OR יוסיף ל-`docs/sync/BOARD.md` תחת `Next`.
- מגבלה ידועה: ה-hardlink של `~/.codex/shared-brain.md` עלול להישבר אם JARVIS ימחק-וייצור-מחדש את המקור (ולא יערוך-במקום).

## איך מריצים ובודקים
- פיתוח: `npm run dev` (→ http://localhost:5173/). קודי כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- אימות לפני "Done": `npm run build` (ו/או `tsc --noEmit`, `npm run lint`).
- Deploy: דרך Netlify (claude בלבד). remote: `github.com/or4551-cyber/meshausha-pwa`.
- בדיקת ה-hook (Claude): פתיחת סשן חדש בפרויקט אמורה להזריק אוטומטית את STATE.md + BOARD.md + זנב CHANNEL.

## מצב גיט
- ענף: `main`. קומיט אחרון של קוד: `c88e7d1`. השלב הזה מתווסף כ-`[claude] chore: collab protocol v1`.
- remote `origin` מחובר ל-GitHub. `safe.directory` מוגדר.

## יומן שלבים (מהחדש לישן)
- [2026-06-20 — הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים (docs/sync) + תיקוני תשתית גלובליים + תבנית לשימוש חוזר.
