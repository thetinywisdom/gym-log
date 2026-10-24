// Derived data: history lookups, progression checks, schedule & program-week math.
import { PROGRAM, getWorkout, resolveSlot, repRange, findExercise, entryEquip, withEquip } from './program.js';
import { store } from './store.js';
import { todayISO, daysBetween, addDays, dowOf, mondayOf } from './utils.js';

/** Sets that count: everything except warm-ups. */
export const workingSets = (sets) => sets.filter((x) => x.type !== 'W');

/** All logged entries for an exercise, newest first: [{date, sessionId, sets, equip}].
 *  With `equipId`, only entries done with that equipment (exercises with equipment variants). */
export function historyFor(exId, equipId) {
  const out = [];
  const def = findExercise(exId);
  for (const s of store.sessionList()) {
    const e = s.exercises.find((x) => x.id === exId);
    if (!e || !e.sets.length) continue;
    const equip = entryEquip(def, e);
    if (equipId && equip && equip !== equipId) continue;
    // Working sets only: warm-ups (type 'W', from imported history) never count for prefill, bests or progress.
    const sets = workingSets(e.sets);
    if (!sets.length) continue;
    out.push({ date: s.date, sessionId: s.id, sets, equip, ...(s.imported ? { imported: true } : {}) });
  }
  return out;
}

export function lastFor(exId, equipId) { return historyFor(exId, equipId)[0] || null; }

export function bestFor(exId, equipId) {
  let best = null;
  for (const h of historyFor(exId, equipId)) {
    for (const st of h.sets) {
      if (st.weight != null && (best == null || st.weight > best.weight || (st.weight === best.weight && st.reps > best.reps))) {
        best = { weight: st.weight, reps: st.reps, date: h.date };
      }
    }
  }
  return best;
}

/** Ready to progress when the last time every planned set hit the top of the rep range. */
export function readyToProgress(ex) {
  const last = lastFor(ex.id, ex.equipId);
  if (!last) return false;
  const top = repRange(ex)[1];
  return last.sets.length >= (ex.minSets ?? ex.sets) && last.sets.every((s) => (s.reps || 0) >= top);
}

export function nextWeight(ex, w) {
  if (ex.kettlebell) {
    const next = PROGRAM.kettlebellSizes.find((k) => k > w);
    return { weight: Math.round((w + 2.5) * 100) / 100, kb: next ?? null };
  }
  return { weight: Math.round((w + 2.5) * 100) / 100 };
}

/** Prefilled sets for an exercise: target reps (range → low end) + last logged weight or plan weight. */
export function prefillSets(ex) {
  const last = lastFor(ex.id, ex.equipId); // per equipment: dumbbell and kettlebell weights don't mix
  const reps = repRange(ex)[0];
  return Array.from({ length: ex.sets }, (_, i) => {
    let weight = ex.bodyweight ? null : ex.weight;
    if (!ex.bodyweight && last) {
      const ls = last.sets[i] || last.sets[last.sets.length - 1];
      if (ls && ls.weight != null) weight = ex.legacyWeights?.[ls.weight] ?? ls.weight;
    }
    return { reps, weight, done: false };
  });
}

/** Equipment choice for an exercise: this workout's pick, else the user's last pick (synced setting), else default. */
export function equipChoice(ex, draftEquip) {
  if (!ex.equip) return null;
  return draftEquip?.[ex.id] || store.state.settings.equip?.[ex.id] || ex.equip.default;
}

/** The exercise objects for a workout given the per-session choices. */
export function sessionExercises(workoutId, { choices = {}, optionalOn = {}, equip } = {}, includeOptional = false) {
  const w = getWorkout(workoutId);
  return w.exercises
    .filter((ex) => includeOptional || !ex.optional || optionalOn[ex.id])
    .flatMap((ex) => (ex.options ? resolveSlot(ex, choices[ex.id], workoutId)
      : [{ ...(ex.equip ? withEquip(ex, equipChoice(ex, equip)) : ex), workout: workoutId }]));
}

// ---------- program weeks ----------
export function programWeek(iso = todayISO()) {
  const d = daysBetween(PROGRAM.startDate, iso);
  if (d < 0) return { week: 0, before: true, daysUntil: -d };
  const week = Math.floor(d / 7) + 1;
  return { week, after: week > PROGRAM.weeks, deload: PROGRAM.deloadWeeks.includes(week) };
}

export function isDeloadWeek(week) { return PROGRAM.deloadWeeks.includes(week); }

// ---------- schedule ----------
const dowOrder = (dow) => (dow + 6) % 7; // Monday first
export function scheduleSorted() {
  return [...store.state.schedule.items].sort((a, b) => dowOrder(a.dow) - dowOrder(b.dow) || a.time.localeCompare(b.time));
}
export function scheduledOn(iso) {
  const dow = dowOf(iso);
  return scheduleSorted().filter((s) => s.dow === dow);
}
/** Next scheduled item on or after iso (within 7 days). */
export function nextScheduled(iso = todayISO()) {
  for (let i = 0; i < 7; i++) {
    const d = addDays(iso, i);
    const items = scheduledOn(d);
    if (items.length) return { date: d, item: items[0], inDays: i };
  }
  return null;
}

export function sessionsInWeek(mondayISO) {
  const end = addDays(mondayISO, 6);
  return store.sessionList().filter((s) => s.date >= mondayISO && s.date <= end);
}

/** Sets per muscle for a list of sessions. Primary counts 1 set, secondary 0.5. */
export function weeklyMuscleSets(mondayISO = mondayOf(todayISO())) {
  const counts = {};
  for (const s of sessionsInWeek(mondayISO)) {
    for (const e of s.exercises) {
      const ex = findExercise(e.id);
      if (!ex) continue;
      const n = workingSets(e.sets).length;
      for (const m of ex.primary || []) counts[m] = (counts[m] || 0) + n;
      for (const m of ex.secondary || []) counts[m] = (counts[m] || 0) + n * 0.5;
    }
  }
  return counts;
}
