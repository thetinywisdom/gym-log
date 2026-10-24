// Merges js/history-import.js into the store: once per device, idempotent, never touching user-logged sessions.
// Imported sessions sync through the normal path (sync.js pushes local sessions the server doesn't have).
import { IMPORT, IMPORTED_SESSIONS } from './history-import.js';
import { findExercise } from './program.js';
import { store } from './store.js';

export const importId = (s) => `import-${s.date}-${s.slug}`;

/** Build the stored session for one imported record. Best set = the one real set; the rest are count-only. */
export function buildSession(rec) {
  const dayStart = Date.parse(`${rec.date}T00:00:00+09:00`);
  return {
    id: importId(rec),
    workoutId: rec.workoutId,
    name: rec.name,
    date: rec.date,
    savedAt: dayStart + (rec.order || 1) * 60000, // start of day: anything you log that day sorts as newer
    updatedAt: IMPORT.updatedAt,
    durationMin: rec.durationMin,
    imported: { source: IMPORT.source, batch: IMPORT.id, version: IMPORT.version, location: rec.location, volumeKg: rec.volumeKg, prs: rec.prs },
    exercises: rec.exercises.map((x) => {
      const def = findExercise(x.id);
      const real = { reps: x.reps, weight: x.weight, best: true, ...(x.equip ? { equip: x.equip } : {}) };
      const rest = Array.from({ length: x.sets - 1 }, () => ({ unknown: true, reps: null, weight: null, ...(x.equip ? { equip: x.equip } : {}) }));
      return {
        id: x.id, name: def?.name || x.shown, ...(x.equip ? { equip: x.equip } : {}),
        sets: [real, ...rest],
        imported: { shown: x.shown, setCount: x.sets, ...(x.logged != null ? { loggedWeight: x.logged } : {}), ...(x.flag ? { flag: x.flag } : {}) },
      };
    }),
  };
}

const userSessionOn = (st, date, workoutId) =>
  Object.values(st.sessions).some((s) => !s.imported && s.date === date && s.workoutId === workoutId);

/**
 * Add the imported sessions this device hasn't seen. Skips an id that already exists, one you deleted
 * (tombstone), and one where you already logged the same workout on the same day yourself.
 * Runs only once per IMPORT.version per device. Returns the ids added.
 */
export function applyHistoryImport() {
  const st = store.state;
  try { if (localStorage.getItem('fitlog.noImport') === '1') return []; } catch {}
  st.imports ||= {};
  if ((st.imports[IMPORT.id]?.version || 0) >= IMPORT.version) return [];
  const added = [], skipped = [];
  for (const rec of IMPORTED_SESSIONS) {
    const id = importId(rec);
    if (st.sessions[id] || st.deleted[id] || userSessionOn(st, rec.date, rec.workoutId)) { skipped.push(id); continue; }
    st.sessions[id] = buildSession(rec);
    added.push(id);
  }
  st.imports[IMPORT.id] = { version: IMPORT.version, at: Date.now(), added, skipped };
  if (added.length) added.forEach((id) => store.commit({ kind: 'session', id }));
  else store.persist();
  return added;
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
