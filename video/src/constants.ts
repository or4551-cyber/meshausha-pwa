// ─── Colors ───────────────────────────────────────────────────────────────────
export const PRIMARY   = '#8B3A3A';   // אדום כהה
export const SECONDARY = '#F5EDD6';   // קרם
export const ACCENT    = '#A08050';   // חום
export const DARK      = '#2D1515';   // כמעט שחור
export const WHITE     = '#FFFFFF';
export const LIGHT_RED = '#C45A5A';
export const SUCCESS   = '#2D8B5A';
export const WARNING   = '#C47A1A';

// ─── App info ─────────────────────────────────────────────────────────────────
export const APP_NAME = 'משאוושה';
export const APP_SUB  = 'מערכת הזמנות חכמה';

// ─── Timing helpers ───────────────────────────────────────────────────────────
export const FPS = 30;

/** Convert seconds to frames */
export const sec = (s: number) => Math.round(s * FPS);
