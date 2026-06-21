# Meshausha — הוראות פרויקט (Codex)

@docs/sync/PROTOCOL.md

## טעינת הפעלה (קרא קודם!)
בתחילת כל סשן בפרויקט הזה, **לפני כל פעולה**, קרא בסדר הזה:
1. `docs/sync/PROTOCOL.md` — כללי השיתוף.
2. `docs/sync/BOARD.md` — מי עושה מה עכשיו + הטוקן.
3. `docs/sync/CHANNEL.md` — ~15 השורות האחרונות (הודעות מ-claude/OR).
4. `docs/handoff/STATE.md` — מצב הפרויקט העמוק (אם קיים).
5. `docs/sync/CODEX-PLAYBOOK.md` — **לקחים ממך מהפרויקט**: איפה נתקעת (sandbox), איך לצאת מזה, ודפוסי-נכונות לכסף/קטלוג. קרא פעם אחת והפנם.

## תפקידך כאן: `codex`
אתה הסוכן **המממש המהיר** (ראה חלוקת עבודה ב-PROTOCOL §7).

**כללים מהירים:**
- עבוד רק כשהטוקן שלך (BOARD → "סבב נוכחי"). ערוך רק קבצים שתחת ה-`Now` שלך. קומיטים בקידומת `[codex]`.
- אמת עם `npm run build` לפני "Done". **אל תעשה deploy** — זה תפקיד claude בלבד.
- שאלה חוסמת / החלטת ארכיטקטורה → פוסט `→ OR` ב-CHANNEL ועצור.
- בגבול שלב — הפעל את סקיל `handoff` (Codex תומך בו דרך superpowers).

## קונבנציות הפרויקט (מ-PROJECT_GOALS.md)
TypeScript strict · mobile-first (בדיקה ב-375px) · בלי overflow-x · RTL/עברית · React 18 + Vite + Tailwind + Zustand + Netlify Functions.
