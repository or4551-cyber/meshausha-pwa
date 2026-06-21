# CODEX PLAYBOOK — לקחים מפרויקט משאוושה (איך לעבוד אפקטיבי כאן)

> **Codex — קרא אותי בתחילת סשן** (אחרי PROTOCOL/BOARD/CHANNEL/STATE). המסמך הזה נכתב ע"י `claude`
> מתוך ההיסטוריה האמיתית של הפרויקט (git log, CHANNEL.md, JOURNAL), כדי שתעבוד טוב יותר —
> בדגש על **איפה נתקעת, למה, ואיך לצאת מזה**. בלי המצאות; כל מקרה מקושר לקומיט/תאריך.

---

## 0. הערת-אמת (חשוב לקרוא קודם)
ההיסטוריה מראה תמונה מדויקת: **ה-review הסטטי שלך בפרויקט היה חזק** — תפסת BLOCKERs אמיתיים שוב ושוב
(ראה §3). **דפוס-הכשל החוזר שלך לא היה לוגי — הוא היה סביבתי (ה-sandbox).** לכן המסמך הזה לא "מתקן
חשיבה", אלא נותן לך: (א) איך להתגבר על מגבלות ה-sandbox; (ב) מה להעביר ל-`claude` כי ה-sandbox חוסם;
(ג) דפוסי-נכונות חוזרים שהפרויקט חשף, שתפנים כמממש.

---

## 1. דפוס-הכשל המרכזי שלך: ה-sandbox 🧱
בכל משימה כמעט (Task 1, Plan 1 core, Task 8, Task 9a) דיווחת אותו כשל:
> `npm test` / `npm run build` הרגילים נכשלים אצלי ב-Codex sandbox/ACL בזמן טעינת config:
> `Cannot read directory "../../.."`, לפני איסוף הטסטים / טעינת Vite. וגם: `git commit` נחסם
> (אין כתיבה ל-`.git/index.lock`); subagent/reviewer לא החזירו report בזמן.

**סיבת השורש:** ל-sandbox שלך יש הגבלות ACL על `C:\Users\OR` והוא לא יכול לעבור דירקטוריות-הורה
(`../../..`) שבהן Vite/Vitest מחפשים config; וגם אין לו כתיבה ל-`.git/`.

**מה זה *לא*:** זה **לא** באג בקוד. אל תפרש כשל-tooling של ה-sandbox ככשל אמיתי, ואל תשנה קוד כדי
"לעקוף" אותו. את זה עשית נכון — תמשיך.

**איך להתגבר (הטכניקה שעבדה לך — תיעוד לעצמך):**
- **טסטים:** הרץ Vitest עם config inline + `cache:false` (במקום הטעינה הרגילה). כך הרצת בפועל את
  `tests/**/*.test.ts` (לדוגמה: 70/70 ב-Task 9a) גם כשה-runner הרגיל נפל.
- **build:** הרץ Vite עם config inline (סימנת הצלחה `CODEX_VITE_BUILD_OK=1`).
- **typecheck:** `npx.cmd tsc --noEmit` ו-`npx.cmd tsc -p tsconfig.check.json` רצו ישירות בלי בעיה.
- **תמיד דווח בבירור ב-CHANNEL**: "הכשל סביבתי (sandbox/ACL), ה-fallback עבר X/X" — בדיוק כמו שעשית.
  זה מאפשר ל-claude לאמת מהר במקום לנחש.

---

## 2. איפה `claude` הצליח ממקום שה-sandbox חסם אותך
לא כי claude "יותר טוב" — אלא כי הוא **רץ מחוץ ל-sandbox** (גישת-קבצים מלאה) + יש לו MCP. תנצל את זה:
נתב אליו את מה שה-sandbox חוסם.

| מה שה-sandbox חסם אצלך | claude עושה את זה כי | המסקנה ל-relay |
|---|---|---|
| `npm test` / `npm run build` רגילים | רץ נייטיב, ללא ACL → 73/73 + build ירוק | claude הוא **מקור-האמת ל-"ירוק"**; ה-fallback שלך הוא אינדיקציה |
| `git commit` / `push` (נחסם `.git/index.lock`) | כתיבה מלאה ל-`.git` | **claude מבצע commit/push** (ואתה מסמן Done ב-BOARD; הוא קומט) |
| deploy | Netlify CLI + טוקנים, מחוץ ל-sandbox | **רק claude עושה deploy** (כבר בפרוטוקול §7) |
| אימות חי בפרודקשן | MCP: Netlify env reader, Playwright, curl ל-API החי | claude מאמת live; אתה מאמת קוד |

**הכלל:** review + ניתוח סטטי = החוזקה שלך. ריצה-אמיתית/commit/deploy/אימות-חי = נתב ל-claude.

---

## 3. החוזקה שלך שהוכחה — review סטטי עמוק 💪
זה לא מחמאה ריקה — זה תיעוד כדי שתדע שזה התפקיד הכי בעל-ערך שלך כאן. BLOCKERs אמיתיים שתפסת:
- **מחירון טרה פלסט (2026-06-20):** דה-דופליקציה — `seedStaticProducts`+`applyCatalogV1` יצרו 8 כפפות
  במקום 4 (זיהוי לפי supplier+name מול id); ועדכון כפפות לפי id בלי בדיקת supplier → התנגשות-id חוצה-ספק.
- **Plan 1 core (2026-06-21, הודעה 06:20):** 4 blockers + race — (1) seed-write לפני auth (מפר fail-closed);
  (2) idempotency replay לא אימת ש-key שייך ל-changeId; (3) revert no-op → 500 במקום 409; (4) השוואת-סוד
  לא constant-time (early-return על length + gate `length>=8`); ועוד race של save/activate → 500 במקום 409.
- **Task 8:** suppliers לא נבדק מול version (drift); "central catalog always wins" לא נאכף כש-`catalogVersion>0`.
- **Task 9a (BLOCKER מצוין):** ה-idempotency לא שרד "apply הצליח אך התשובה אבדה → retry": `commitCatalogOperations`
  תמיד עשה preview חדש → changeId חדש → `409 idempotency_key_conflict`. הצעת את התיקון (resume מ-changeSet שמור).
  גם הערת hardening: לא לעשות re-preview על `not_pending`/`idempotency_key_conflict`.

**שמור את האיכות הזו.** כשאתה מבקר קוד של claude — חפש בדיוק את הסוגים האלה (money/idempotency/auth/concurrency).

---

## 4. דפוסי-נכונות חוזרים שהפרויקט חשף (הפנם אותם כמממש)
אלה הכללים שחזרו כ-BLOCKERs. כשאתה כותב קוד שנוגע בכסף/קטלוג — בדוק את עצמך מולם:

1. **Idempotency חייב לשרוד "בוצע אך התשובה אבדה → המשתמש לחץ שוב".** אל תייצר מזהה-פעולה חדש ב-retry;
   שמור את ה-`changeSet.id` אחרי preview ראשון, וב-retry נסה `apply(sameChangeId, sameKey)` קודם → replay/recovery
   מחזיר snapshot במקום conflict. preview חדש **רק** אם ה-changeSet בוודאות לא ישים (404/410/stale_version/version_conflict),
   **לא** על not_pending/idempotency_key_conflict.
2. **Auth לפני כל כתיבה/seed.** fail-closed: בקשה לא-מאומתת מקבלת 401 בלי שום side-effect (גם לא seed ראשון).
3. **השוואת סודות constant-time.** SHA-256 digest קבוע 32B + `timingSafeEqual`; בלי early-return על אורך, בלי gate
   תלוי-קלט (`length>=8`).
4. **התנגשויות גרסה/concurrency → 409, לא 500.** עטוף save/activate ב-try/catch ומפה 'refusing to overwrite' → `version_conflict`.
5. **מגבלות פלטפורמה חיצונית מתגלות רק בבדיקה חיה.** הבאג הכי גדול ב-Plan 2 (apply החזיר ~130KB → ChatGPT
   Actions "תקלה בקבלת התשובה" למרות שהכתיבה הצליחה) **לא נתפס ע"י יוניט-טסטים** — רק בבדיקה חיה מול ChatGPT.
   מגבלות ChatGPT Actions לזכור: OpenAPI 3.1.x; description לפעולה ≤300 תווים; בלי `nullable`; תשובה ≤~100KB;
   Action אחד לכל דומיין. (פתרון שיושם: תשובה קלה לפי role.)
6. **PWA stale-cache:** ניקוי cache לא מנקה localStorage. עריכה אופטימית ישנה יכולה לשרוד; הגנה = full-replace
   **מונוטוני** (`version > catalogVersion`) + session שמונפק גם בשחזור-persist (לא רק בכניסה טרייה).

---

## 5. צ'ק-ליסט מהיר לפני "Done" / לפני שמסיימים review
- [ ] הרצת אימות (גם אם דרך fallback inline) — וכתבת ב-CHANNEL "סביבתי, fallback X/X עבר".
- [ ] לא שינית קוד כדי לעקוף את ה-sandbox.
- [ ] קוד שנוגע בכסף/קטלוג → עבר את §4 (idempotency-resume, auth-first, constant-time, 409-not-500).
- [ ] commit/push/deploy/אימות-חי → השארת ל-claude (לא ניסית לעקוף את `.git`/deploy).
- [ ] עדכנת BOARD (Now→Done) ופוסט סיום ב-CHANNEL.

---
*נכתב 2026-06-21 בסיום Plan 2. מקורות: `git log`, `docs/sync/CHANNEL.md`, `docs/handoff/JOURNAL/`.*
