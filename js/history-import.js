// ============================================================
//  HISTORY IMPORT — workouts logged in another app before Fitlog (Oct 4–22, 2026, JST).
//  Source: the user's History screenshots (workout-screenshots/1–4), checked by hand.
//  That app's History list only shows, per exercise, the number of sets and the BEST set.
//  So each exercise stores its best set as the one real set and the rest as count-only
//  placeholders ({ unknown: true }) — no numbers are invented.
//
//  Merged into the store once per device on load (js/importer.js): stable ids, never
//  duplicated, never overwriting a session you logged, and synced through the normal path.
//  Bump IMPORT.version if this file changes and the change should reach devices that
//  already imported it.
// ============================================================

export const IMPORT = {
  id: 'other-app-2026-10',
  version: 1,
  source: 'Other app History screenshots',
  // Fixed so every device writes byte-identical docs (no sync ping-pong) and any later
  // edit or delete by the user always wins.
  updatedAt: 1792790400000, // 2026-10-24 06:20 JST
};

// Exercises that are not in the current program. History renders them by name
// (History → Exercises lists them under "Removed from plan").
export const LEGACY_EXERCISES = [
  { id: 'legacy-bicep-curl', name: 'Bicep Curl (dumbbell)', workout: 'upper', sets: 1, reps: 8, weight: null, rest: [60, 90],
    primary: ['biceps'], secondary: ['brachialis', 'forearms'] },
  { id: 'legacy-overhead-press', name: 'Overhead Press', workout: 'upper', sets: 3, reps: 8, weight: null, rest: [90, 120],
    primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'traps'] },
  { id: 'legacy-tricep-kickback', name: 'Tricep Kickback', workout: 'upper', sets: 2, reps: 8, weight: null, rest: [60, 90],
    primary: ['triceps'], secondary: [] },
  { id: 'legacy-kb-russian-twist', name: 'KB Russian Twist', workout: 'kb', sets: 3, reps: 12, weight: null, rest: [60, 90],
    primary: ['obliques', 'abs'], secondary: [] },
  { id: 'legacy-kb-bent-over-row', name: 'KB Bent Over Row', workout: 'kb', sets: 3, reps: 10, weight: null, rest: [60, 90],
    primary: ['lats', 'midBack'], secondary: ['biceps', 'rearDelts', 'lowerBack'] },
  { id: 'legacy-kb-clean-thruster', name: 'KB Clean & Thruster', workout: 'kb', sets: 3, reps: 8, weight: null, rest: [60, 90],
    primary: ['quads', 'glutes', 'frontDelts'], secondary: ['triceps', 'hamstrings', 'abs', 'traps'] },
  { id: 'legacy-kb-lunge', name: 'KB Lunge', workout: 'kb', sets: 3, reps: 10, weight: null, rest: [60, 90],
    primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors'] },
];

// e(id, name as shown in the other app, sets, best weight kg (null = bodyweight), best reps, extra)
// extra.logged = weight as it was logged when it differs (side bend / around logged both sides added up).
const e = (id, shown, sets, weight, reps, extra = {}) => ({ id, shown, sets, weight, reps, ...extra });

// order = position within the day (higher = later); the other app lists newest first.
export const IMPORTED_SESSIONS = [
  { date: '2026-10-04', slug: 'upper', workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 76, volumeKg: 5031, prs: 3, exercises: [
    e('lat-pulldown', 'Lat Pulldown (C…', 4, 47, 8),
    e('chest-press', 'Chest Press (M…', 3, 37.5, 8),
    e('shoulder-press', 'Shoulder Press…', 3, 50, 8),
    e('reverse-fly', 'Reverse Fly (Ma…', 3, 33, 8),
    e('chest-fly', 'Chest Fly', 3, 40, 8),
    e('triceps-ext', 'Triceps Extensi…', 2, 16, 8),
    e('legacy-bicep-curl', 'Bicep Curl (Du…', 1, 20, 6, { flag: 'possibly both dumbbells added up' }),
  ] },
  { date: '2026-10-07', slug: 'kb', workoutId: 'kb', name: 'Evening Workout', location: 'home', durationMin: 59, volumeKg: 3210, prs: 15, exercises: [
    e('kb-swing', 'Kettlebell Swing', 4, 13, 12),
    e('kb-oblique', 'Kettlebell Oblique', 4, 13, 12, { logged: 26 }),
    e('kb-around', 'Kettlebell Around', 4, 13, 12), // logged per bell already
    e('kb-halo', 'Kettlebell Halo', 3, 13, 12),
    e('legacy-kb-russian-twist', 'Kettlebell Russi…', 3, 10, 12),
  ] },
  { date: '2026-10-09', slug: 'upper', workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 48, volumeKg: 4418, prs: 2, exercises: [
    e('chest-press', 'Chest Press (M…', 4, 37.5, 8),
    e('shoulder-press', 'Shoulder Press…', 3, 60, 5),
    e('lat-pulldown', 'Lat Pulldown (C…', 3, 47, 8),
    e('chest-fly', 'Chest Fly', 3, 40, 8),
    e('reverse-fly', 'Reverse Fly (Ma…', 4, 40, 2),
  ] },
  { date: '2026-10-11', slug: 'kb', workoutId: 'kb', name: 'Home Kettlebell', location: 'home', durationMin: 68, volumeKg: 5345, prs: 8, exercises: [
    e('kb-swing', 'Kettlebell Swing', 4, 13, 15),
    e('kb-oblique', 'Kettlebell Oblique', 4, 13, 15, { logged: 26 }),
    e('kb-around', 'Kettlebell Around', 4, 13, 12, { logged: 26 }),
    e('kb-halo', 'Kettlebell Halo', 3, 13, 12),
    e('push-up', 'Push Up', 3, null, 10),
  ] },
  // Oct 15 had two sessions. The other app lists Upper Body above Home Kettlebell 2 (newest first),
  // so Home Kettlebell 2 is treated as the earlier one. Start times are not shown.
  { date: '2026-10-15', slug: 'kb2', order: 1, workoutId: 'kb', name: 'Home Kettlebell 2', location: 'home', durationMin: 21, volumeKg: 1925, prs: 12, exercises: [
    e('legacy-kb-bent-over-row', 'Bent Over Row…', 3, 15.5, 10),
    e('kb-swing', 'Kettlebell Swing', 3, 15.5, 15),
    e('legacy-kb-clean-thruster', 'Clean Thruster…', 3, 15.5, 8),
    e('legacy-kb-lunge', 'Lunge Kettlebell', 3, 15.5, 10),
  ] },
  { date: '2026-10-15', slug: 'upper', order: 2, workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 48, volumeKg: 3825, prs: 5, exercises: [
    e('chest-fly', 'Chest Fly', 4, 42.5, 2),
    e('iso-row', 'Iso-Lateral Row…', 3, 60, 8),
    e('chest-press', 'Chest Press (M…', 4, 40, 5),
    e('legacy-overhead-press', 'Overhead Press…', 3, 20, 8),
    e('legacy-tricep-kickback', 'Tricep Kickback', 2, 20, 8, { flag: 'possibly both dumbbells added up' }),
    e('hammer-curl', 'Hammer Curl (…', 2, 20, 8, { flag: 'possibly both dumbbells added up' }),
  ] },
  { date: '2026-10-20', slug: 'kb', workoutId: 'kb', name: 'Home Kettlebell', location: 'home', durationMin: 55, volumeKg: 4313, prs: 5, exercises: [
    e('kb-swing', 'Kettlebell Swing', 3, 15.5, 15),
    e('kb-oblique', 'Kettlebell Oblique', 3, 15.5, 12, { logged: 31 }),
    e('kb-around', 'Kettlebell Around', 3, 15.5, 12, { logged: 31 }),
    e('kb-halo', 'Kettlebell Halo', 3, 11, 12),
    e('push-up', 'Push Up', 1, null, 10),
    e('kb-triceps-ext', 'Triceps Extensi…', 2, 11, 12),
    e('kb-hammer-curl', 'Hammer Curl (…', 2, 11, 12, { equip: 'kb' }),
  ] },
  { date: '2026-10-22', slug: 'upper', workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 40, volumeKg: 3238, prs: 7, exercises: [
    e('chest-press', 'Chest Press (M…', 3, 42.5, 6),
    e('iso-row', 'Iso-Lateral Row…', 3, 45, 6),
    e('shoulder-press', 'Shoulder Press…', 3, 70, 6),
    e('triceps-ext', 'Triceps Extension', 3, 21.25, 8),
  ] },
];
