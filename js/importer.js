// Merges js/history-import.js into the store: once per import version per device, idempotent,
// replacing only older imported copies and never touching sessions you logged or deleted.
// Imported sessions sync through the normal path (sync.js pushes local sessions the server doesn't have).
import { IMPORT, IMPORTED_SESSIONS } from './history-import.js';
import { findExercise } from './program.js';
import { store } from './store.js';

export const importId = (s) => `import-${s.date}-${s.slug}`;

/** Parse 'W19x5' / 'F47x6' / 'D30x4' / '47x8' / '10' (bodyweight reps) into a stored set. */
export function parseSet(str, { perBell = false, equip } = {}) {
  const m = /^([WFD]?)(?:([\d.]+)x)?(\d+)$/.exec(str);
  if (!m) throw new Error(`bad imported set ${str}`);
  const logged = m[2] != null ? Number(m[2]) : null;
  const weight = logged != null && perBell ? Math.round((logged / 2) * 100) / 100 : logged;
  return {
    reps: Number(m[3]), weight,
    ...(m[1] ? { type: m[1] } : {}),
    ...(perBell && logged != null ? { loggedWeight: logged } : {}),
    ...(equip ? { equip } : {}),
  };
}

/** Build the stored session for one imported record: every set, with set types (W/F/D). */
export function buildSession(rec) {
  const startedAt = Date.parse(`${rec.date}T${rec.time}:00+09:00`);
  return {
    id: importId(rec),
    workoutId: rec.workoutId,
    name: rec.name,
    date: rec.date,
    startedAt,
    savedAt: startedAt + rec.durationMin * 60000,
    updatedAt: IMPORT.updatedAt,
    durationMin: rec.durationMin,
    imported: { source: IMPORT.source, batch: IMPORT.id, version: IMPORT.version, location: rec.location, volumeKg: rec.volumeKg, prs: rec.prs },
    exercises: rec.exercises.map((x) => {
      const def = findExercise(x.id);
      return {
        id: x.id, name: def?.name || x.shown, ...(x.equip ? { equip: x.equip } : {}),
        sets: x.sets.map((str) => parseSet(str, { perBell: x.perBell, equip: x.equip })),
        imported: { shown: x.shown, ...(x.perBell ? { perBell: true } : {}), ...(x.flag ? { flag: x.flag } : {}) },
      };
    }),
  };
}

const userSessionOn = (st, date, workoutId) =>
  Object.values(st.sessions).some((s) => !s.imported && s.date === date && s.workoutId === workoutId);

/**
 * Add or upgrade the imported sessions on this device. Runs once per IMPORT.version per device.
 *  - missing id → added, unless you deleted it (tombstone) or logged that workout yourself that day;
 *  - id present and still an older imported copy (e.g. v1 best-set-only) → replaced in place, same id;
 *  - anything else (already current, or not an imported session) → left alone.
 * Returns { added, replaced }.
 */
export function applyHistoryImport() {
  const st = store.state;
  try { if (localStorage.getItem('fitlog.noImport') === '1') return { added: [], replaced: [] }; } catch {}
  st.imports ||= {};
  if ((st.imports[IMPORT.id]?.version || 0) >= IMPORT.version) return { added: [], replaced: [] };
  const added = [], replaced = [], skipped = [];
  for (const rec of IMPORTED_SESSIONS) {
    const id = importId(rec);
    const cur = st.sessions[id];
    if (st.deleted[id]) { skipped.push(id); continue; }
    if (cur) {
      if (cur.imported && (cur.imported.version || 1) < IMPORT.version) { st.sessions[id] = buildSession(rec); replaced.push(id); }
      else skipped.push(id);
      continue;
    }
    if (userSessionOn(st, rec.date, rec.workoutId)) { skipped.push(id); continue; }
    st.sessions[id] = buildSession(rec);
    added.push(id);
  }
  st.imports[IMPORT.id] = { version: IMPORT.version, at: Date.now(), added, replaced, skipped };
  const changed = [...added, ...replaced];
  if (changed.length) changed.forEach((id) => store.commit({ kind: 'session', id }));
  else store.persist();
  return { added, replaced };
}

/**
 * After the first cloud sync: if a session you logged yourself (on another device) covers the same
 * workout on the same day as an imported one, drop the imported copy so nothing shows twice.
 */
export function reconcileImports() {
  const st = store.state;
  for (const s of Object.values(st.sessions)) {
    if (s.imported && userSessionOn(st, s.date, s.workoutId)) store.deleteSession(s.id);
  }
}
