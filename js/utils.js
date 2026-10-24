// Date helpers pinned to Asia/Tokyo (JST, UTC+9, no DST).
const JST_OFFSET = 9 * 3600e3;
export const DAY_MS = 86400e3;
export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const pad = (n) => String(n).padStart(2, '0');

export function todayISO(now = Date.now()) {
  const t = new Date(now + JST_OFFSET);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export function nowTimeJST(now = Date.now()) {
  const t = new Date(now + JST_OFFSET);
  return `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}
export function isoToUTC(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
export function utcToISO(ms) { const t = new Date(ms); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; }
export function addDays(iso, n) { return utcToISO(isoToUTC(iso) + n * DAY_MS); }
export function dowOf(iso) { return new Date(isoToUTC(iso)).getUTCDay(); }
export function daysBetween(a, b) { return Math.round((isoToUTC(b) - isoToUTC(a)) / DAY_MS); }
/** Monday of the week containing iso. */
export function mondayOf(iso) { const d = dowOf(iso); return addDays(iso, d === 0 ? -6 : 1 - d); }
export function fmtDate(iso, { weekday = true, year = false } = {}) {
  const t = new Date(isoToUTC(iso));
  let s = `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}`;
  if (weekday) s = `${DOW_SHORT[t.getUTCDay()]}, ${s}`;
  if (year) s += `, ${t.getUTCFullYear()}`;
  return s;
}
export function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (h * 60 + m + mins) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtKg = (w) => (w == null || w === '' ? '—' : `${+(+w).toFixed(2)}`);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function fmtSecs(s) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; }
