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
//    perSide    true → reps are per leg / per side
//    step       weight stepper increment in kg (default 2.5)
//    rest       [min, max] rest in seconds after each set
//    optional   true → hidden unless toggled on in the log
//    primary / secondary   muscle ids (see MUSCLES below)
//    options    for "A or B" slots: the user picks one per session
//
//  Muscle ids:
//    chest, frontDelts, sideDelts, rearDelts, traps, lats, midBack, lowerBack,
//    biceps, brachialis, triceps, forearms, abs, obliques, glutes, quads,
//    hamstrings, adductors, calves

const SHOULDERS = ['frontDelts', 'sideDelts', 'rearDelts'];
const REST_KB = [60, 90];
const REST_HEAVY = [90, 120];

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
        { id: 'reverse-lunge', name: 'Reverse Lunge', sets: 3, reps: 8, perSide: true, weight: 11, kettlebell: true, rest: REST_KB,
          primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors', 'calves'] },
        { id: 'kb-oblique', name: 'KB Oblique', sets: 3, reps: 12, weight: 31, rest: REST_KB,
          note: 'Weight as logged in your app.',
          primary: ['obliques'], secondary: ['abs', 'lowerBack'] },
        { id: 'kb-around', name: 'KB Around', sets: 3, reps: 12, weight: 31, rest: REST_KB,
          note: 'Around-the-body pass. Weight as logged in your app.',
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
      durationMin: 50,
      exercises: [
        { id: 'chest-press', name: 'Chest Press', sets: 3, reps: [6, 8], weight: 42.5, rest: REST_HEAVY,
          primary: ['chest'], secondary: ['triceps', 'frontDelts'] },
        { id: 'iso-row', name: 'Iso-Lateral Row', sets: 3, reps: [6, 8], weight: 45, rest: REST_HEAVY,
          primary: ['lats', 'midBack'], secondary: ['biceps', 'rearDelts'] },
        { id: 'shoulder-press', name: 'Shoulder Press', sets: 3, reps: [6, 8], weight: 70, rest: REST_HEAVY,
          note: 'Weight as logged in your app.',
          primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'chest'] },
        { id: 'triceps-ext', name: 'Triceps Extension', sets: 3, reps: [8, 10], weight: 21.25, step: 1.25, rest: REST_HEAVY,
          primary: ['triceps'], secondary: [] },
        { id: 'fly-or-pulldown', name: 'Chest Fly or Lat Pulldown', sets: 3, reps: [10, 12], weight: null, rest: REST_HEAVY,
          options: [
            { id: 'chest-fly', name: 'Chest Fly', primary: ['chest'], secondary: ['frontDelts'] },
            { id: 'lat-pulldown', name: 'Lat Pulldown', primary: ['lats'], secondary: ['biceps', 'rearDelts'] },
          ] },
        { id: 'hammer-curl', name: 'Hammer Curl', sets: 3, reps: [8, 12], weight: 20, rest: REST_HEAVY,
          primary: ['brachialis', 'biceps'], secondary: ['forearms'] },
      ],
    },
  },

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
  return out;
}

/** For an "A or B" slot, returns a full exercise object for the chosen option. */
export function resolveOption(slot, optionId, workoutId) {
  const o = slot.options.find((x) => x.id === optionId) || slot.options[0];
  const { options, ...base } = slot;
  return { ...base, ...o, slot: slot.id, workout: workoutId };
}

export function findExercise(id) { return allExercises().find((e) => e.id === id); }
export function repRange(ex) { return Array.isArray(ex.reps) ? ex.reps : [ex.reps, ex.reps]; }
export function repLabel(ex) { const [a, b] = repRange(ex); return a === b ? `${a}` : `${a}–${b}`; }
