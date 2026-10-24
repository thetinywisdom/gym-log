// ============================================================
//  PROGRAM DATA — edit this file to change your training plan.
//  Source: Fitness Bot "Home Training Plan" (Oct 2026).
// ============================================================
//
//  Exercise fields
//    id         unique, stable id (history is keyed by it — don't rename once you've logged)
//    name       display name
//    sets       number of working sets
//    reps       number, or [min, max] for a rep range
//    weight     starting weight in kg (null = bodyweight / not set yet)
//    bodyweight true → reps only, no weight input
//    perSide    'leg' | 'side' | 'direction' → reps are per leg / side / direction (true = 'leg')
//    note       short cue shown on the exercise card
//    legacyWeights  { old: new } — if the last logged weight is `old`, prefill `new` instead
//    step       weight stepper increment in kg (default 2.5)
//    rest       [min, max] rest in seconds after each set
//    optional   true → hidden unless toggled on in the log
//    primary / secondary   muscle ids (see MUSCLES below)
//    options    for "A or B" slots: the user picks one per session (history stays per option id)
//    bothSets   on an options slot: offer "Both free" = log this many sets of every option
//    weight: null on a non-bodyweight exercise = blank; you type it the first time, then the last weight is used
//
//  Muscle ids:
//    chest, frontDelts, sideDelts, rearDelts, traps, lats, midBack, lowerBack,
//    biceps, brachialis, triceps, forearms, abs, obliques, glutes, quads,
//    hamstrings, adductors, calves

const SHOULDERS = ['frontDelts', 'sideDelts', 'rearDelts'];
const REST_KB = [60, 90];
const REST_HEAVY = [90, 120];
const REST_2MIN = [120, 120];

export const PROGRAM = {
  name: '12-Week Home Training',
  startDate: '2026-10-26', // Monday, week 1
  weeks: 12,
  deloadWeeks: [4, 8, 12],
  deloadHint: 'Deload week — keep it easy: drop a set or use ~10–20% less weight.',
  progressionRule: 'When every set hits the top of the rep range, add 2.5 kg or move to the next kettlebell size.',
  kettlebellSizes: [8, 10, 11, 12, 13, 14, 15.5, 16, 18, 20, 22, 24, 28, 32],
  timezone: 'Asia/Tokyo',

  workouts: {
    kb: {
      id: 'kb',
      name: 'Kettlebell + Legs',
      short: 'KB + Legs',
      durationMin: 65,
      exercises: [
        { id: 'kb-swing', name: 'KB Swing', sets: 3, reps: 15, weight: 15.5, kettlebell: true, rest: REST_KB,
          primary: ['glutes', 'hamstrings'], secondary: ['lowerBack', 'abs', ...SHOULDERS] },
        { id: 'goblet-squat', name: 'Goblet Squat', sets: 3, reps: 10, weight: 15.5, kettlebell: true, rest: REST_HEAVY,
          primary: ['quads', 'glutes'], secondary: ['adductors', 'abs', 'traps', 'midBack'] },
        { id: 'kb-rdl', name: 'KB Romanian Deadlift', sets: 3, reps: 10, weight: 15.5, kettlebell: true, rest: REST_HEAVY,
          primary: ['hamstrings', 'glutes'], secondary: ['lowerBack', 'forearms'] },
        { id: 'reverse-lunge', name: 'Reverse Lunge', sets: 3, reps: 8, perSide: 'leg', weight: 11, kettlebell: true, rest: REST_KB,
          note: 'Goblet hold at chest',
          primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors', 'calves'] },
        // One 15.5 kg bell. Older logs recorded 31 kg (both sides added up) → prefill 15.5.
        { id: 'kb-oblique', name: 'KB Oblique', sets: 3, reps: 12, perSide: 'side', weight: 15.5, kettlebell: true, rest: REST_KB,
          note: 'Standing side bend, one bell', legacyWeights: { 31: 15.5 },
          primary: ['obliques'], secondary: ['abs', 'lowerBack'] },
        { id: 'kb-around', name: 'KB Around', sets: 3, reps: 12, perSide: 'direction', weight: 15.5, kettlebell: true, rest: REST_KB,
          note: 'Around-the-body pass, one bell', legacyWeights: { 31: 15.5 },
          primary: ['abs', 'obliques'], secondary: [...SHOULDERS, 'forearms'] },
        { id: 'kb-halo', name: 'KB Halo', sets: 3, reps: 12, weight: 11, kettlebell: true, rest: REST_KB,
          primary: SHOULDERS, secondary: ['traps', 'midBack', 'abs', 'triceps'] },
        { id: 'push-up', name: 'Push Up', sets: 2, reps: 10, weight: null, bodyweight: true, rest: REST_KB,
          primary: ['chest'], secondary: ['triceps', 'frontDelts', 'abs'] },
        { id: 'kb-triceps-ext', name: 'Triceps Extension (KB)', sets: 2, reps: 12, weight: 11, step: 1.25, optional: true, rest: REST_KB,
          primary: ['triceps'], secondary: [] },
        { id: 'kb-hammer-curl', name: 'Hammer Curl (KB)', sets: 2, reps: 12, weight: 11, optional: true, rest: REST_KB,
          primary: ['brachialis', 'biceps'], secondary: ['forearms'] },
      ],
    },

    upper: {
      id: 'upper',
      name: 'Upper Body',
      short: 'Upper',
      durationMin: 55, // ~50–55 min
      exercises: [
        { id: 'chest-press', name: 'Chest Press', sets: 3, reps: [6, 8], weight: 42.5, rest: REST_2MIN,
          primary: ['chest'], secondary: ['triceps', 'frontDelts'] },
        // Pull slot: pick whichever machine is free. "Both free" logs bothSets of each.
        // History & progress stay per exercise (iso-row / lat-pulldown).
        { id: 'pull-slot', name: 'Pull', hint: 'Pick whichever machine is free', sets: 4, reps: [6, 8], rest: REST_2MIN,
          bothSets: 3, bothLabel: 'Both free',
          options: [
            { id: 'iso-row', name: 'Iso-Lateral Row', weight: 45,
              primary: ['lats', 'midBack'], secondary: ['biceps', 'rearDelts'] },
            { id: 'lat-pulldown', name: 'Lat Pulldown', weight: null,
              primary: ['lats'], secondary: ['biceps', 'rearDelts', 'traps'] },
          ] },
        { id: 'shoulder-press', name: 'Shoulder Press', sets: 3, reps: [6, 8], weight: 70, rest: REST_2MIN,
          primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'chest'] },
        { id: 'chest-fly', name: 'Chest Fly', sets: 3, reps: [10, 12], weight: null, rest: [90, 90], note: 'Pec-deck',
          primary: ['chest'], secondary: ['frontDelts'] },
        { id: 'reverse-fly', name: 'Reverse Fly', sets: 3, reps: [12, 15], weight: null, rest: [60, 90], note: 'Reverse pec-deck',
          primary: ['rearDelts'], secondary: ['traps', 'midBack'] },
        // id kept as 'triceps-ext' so history carries over.
        { id: 'triceps-ext', name: 'Triceps Pushdown (cable)', sets: 3, reps: [8, 10], weight: 21.25, step: 1.25, rest: [90, 90],
          note: 'Cable, start at chest height',
          primary: ['triceps'], secondary: [] },
      ],
    },
  },

  // Exercises no longer in the plan. Never logged in new sessions, but their history stays
  // visible (History → Exercises) under their workout.
  retired: [
    { id: 'hammer-curl', name: 'Hammer Curl (gym)', workout: 'upper', sets: 3, reps: [8, 12], weight: 20, rest: [60, 90],
      primary: ['brachialis', 'biceps'], secondary: ['forearms'] },
  ],

  // Default weekly schedules. dow: 0 = Sunday … 6 = Saturday. Times are JST.
  schedules: {
    '3day': [
      { dow: 2, time: '20:00', workout: 'kb' },
      { dow: 4, time: '20:00', workout: 'upper' },
      { dow: 0, time: '20:00', workout: 'kb' },
    ],
    '4day': [
      { dow: 2, time: '20:00', workout: 'kb' },
      { dow: 4, time: '20:00', workout: 'upper' },
      { dow: 6, time: '20:00', workout: 'kb' },
      { dow: 0, time: '20:00', workout: 'upper' },
    ],
  },
};

export const MUSCLES = {
  chest: 'Chest',
  frontDelts: 'Front delts',
  sideDelts: 'Side delts',
  rearDelts: 'Rear delts',
  traps: 'Traps / upper back',
  lats: 'Lats',
  midBack: 'Mid back',
  lowerBack: 'Lower back',
  biceps: 'Biceps',
  brachialis: 'Brachialis',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs / core',
  obliques: 'Obliques',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  adductors: 'Adductors',
  calves: 'Calves',
};

// ---------- helpers ----------
export function getWorkout(id) { return PROGRAM.workouts[id]; }

/** Flattened list of every loggable exercise (options expanded), with slot info. */
export function allExercises() {
  const out = [];
  for (const w of Object.values(PROGRAM.workouts)) {
    for (const ex of w.exercises) {
      if (ex.options) for (const o of ex.options) out.push(resolveOption(ex, o.id, w.id));
      else out.push({ ...ex, workout: w.id });
    }
  }
  for (const r of PROGRAM.retired || []) out.push({ ...r, retired: true });
  return out;
}

/** For an "A or B" slot, returns a full exercise object for the chosen option. */
export function resolveOption(slot, optionId, workoutId, sets) {
  const o = slot.options.find((x) => x.id === optionId) || slot.options[0];
  const { options, id, name, hint, bothSets, bothLabel, ...base } = slot;
  return { ...base, weight: null, ...o, sets: sets ?? slot.sets, minSets: Math.min(slot.sets, bothSets ?? slot.sets), slot: slot.id, workout: workoutId };
}

/** Exercises for a slot given a choice: one option, or all options when choice === 'both'. */
export function resolveSlot(slot, choice, workoutId) {
  if (choice === 'both' && slot.bothSets) return slot.options.map((o) => resolveOption(slot, o.id, workoutId, slot.bothSets));
  return [resolveOption(slot, choice, workoutId)];
}

export function findExercise(id) { return allExercises().find((e) => e.id === id); }
export function repRange(ex) { return Array.isArray(ex.reps) ? ex.reps : [ex.reps, ex.reps]; }
/** Rest label: [120,120] → "2 min", [90,90] → "90s", [60,90] → "60–90s". */
export function restLabel([a, b]) {
  const one = (x) => (x >= 120 && x % 60 === 0 ? `${x / 60} min` : `${x}s`);
  return a === b ? one(a) : `${a}–${b}s`;
}
/** 'leg' | 'side' | 'direction' | '' */
export function sideOf(ex) { return ex.perSide === true ? 'leg' : ex.perSide || ''; }
/** "3 × 12 each side" */
export function setsLabel(ex) { const s = sideOf(ex); return `${ex.sets} × ${repLabel(ex)}${s ? ` each ${s}` : ''}`; }
export function repLabel(ex) { const [a, b] = repRange(ex); return a === b ? `${a}` : `${a}–${b}`; }
