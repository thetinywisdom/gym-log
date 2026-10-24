// ============================================================
//  HISTORY IMPORT — workouts logged in another app before Fitlog (Oct 4–22, 2026, JST).
//  v2 (Fitlog v1.3.3): every set, from the user's detailed session screenshots
//  (workout-screenshots/detailed, 13 scrolled views stitched into 8 sessions, checked by hand).
//  Set strings: 'W19x5' = warm-up 19 kg × 5, 'F47x6' = to failure, 'D30x4' = drop set,
//  '47x8' = normal set, '10' = 10 bodyweight reps. Weights are kg as logged in that app.
//  Each session's volume was re-added from these sets and matches the app's total (see README).
//
//  Merged into the store on load (js/importer.js): stable ids, never duplicated, never
//  overwriting a session you logged, never re-adding one you deleted. Bump IMPORT.version
//  (and IMPORT.updatedAt) when this file changes and the change should replace the copies
//  devices already imported.
// ============================================================

export const IMPORT = {
  id: 'other-app-2026-10',
  version: 2,
  source: 'Other app session screenshots',
  // Fixed so every device writes byte-identical docs (no sync ping-pong). Later than v1's
  // 1792790400000 so the detailed copy replaces the best-set copy through normal sync.
  updatedAt: Date.parse('2026-10-24T15:00:00+09:00'),
};

// Exercises that are not in the current program. History renders them by name
// (History → Exercises lists them under "Removed from plan"). Names as in the other app.
export const LEGACY_EXERCISES = [
  { id: 'legacy-bicep-curl', name: 'Bicep Curl (Dumbbell)', workout: 'upper', sets: 1, reps: 8, weight: null, rest: [60, 90],
    primary: ['biceps'], secondary: ['brachialis', 'forearms'] },
  { id: 'legacy-overhead-press', name: 'Overhead Press (Dumbbell)', workout: 'upper', sets: 3, reps: 8, weight: null, rest: [90, 120],
    primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'traps'] },
  { id: 'legacy-tricep-kickback', name: 'Tricep Kickback', workout: 'upper', sets: 2, reps: 8, weight: null, rest: [60, 90],
    primary: ['triceps'], secondary: [] },
  // Gym dumbbell triceps extension (Oct 4, 16 kg). Kept apart from the home 'Triceps Extension (KB)'
  // so a gym dumbbell weight never prefills or progresses the home exercise.
  { id: 'legacy-db-triceps-ext', name: 'Triceps Extension (Dumbbell)', workout: 'upper', sets: 2, reps: 8, weight: null, rest: [60, 90],
    primary: ['triceps'], secondary: [] },
  { id: 'legacy-kb-russian-twist', name: 'Kettlebell Russian Twist', workout: 'kb', sets: 3, reps: 12, weight: null, rest: [60, 90],
    primary: ['obliques', 'abs'], secondary: [] },
  { id: 'legacy-kb-bent-over-row', name: 'Bent Over Row Kettlebell', workout: 'kb', sets: 3, reps: 10, weight: null, rest: [60, 90],
    primary: ['lats', 'midBack'], secondary: ['biceps', 'rearDelts', 'lowerBack'] },
  { id: 'legacy-kb-clean-thruster', name: 'Clean Thruster Kettlebell', workout: 'kb', sets: 3, reps: 8, weight: null, rest: [60, 90],
    primary: ['quads', 'glutes', 'frontDelts'], secondary: ['triceps', 'hamstrings', 'abs', 'traps'] },
  { id: 'legacy-kb-lunge', name: 'Lunge Kettlebell', workout: 'kb', sets: 3, reps: 10, weight: null, rest: [60, 90],
    primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors'] },
];

// e(id, name as shown in the other app, sets, extra)
// extra.perBell: the app logged both bells added up (26 = 2 × 13); stored per bell, logged value kept.
// extra.flag: weight kept as logged but it may be both dumbbells added up.
// extra.equip: equipment variant for exercises that have one.
const e = (id, shown, sets, extra = {}) => ({ id, shown, sets, ...extra });
const x = (n, s) => Array(n).fill(s);
const COMBINED = 'possibly both dumbbells added up';

// time = start time shown in the other app (JST).
export const IMPORTED_SESSIONS = [
  { date: '2026-10-04', time: '21:18', slug: 'upper', workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 76, volumeKg: 5031, prs: 3, exercises: [
    e('lat-pulldown', 'Lat Pulldown (Cable)', ['W19x5', 'W33x5', '47x7', '47x8', '47x6', 'F47x6']),
    e('chest-press', 'Chest Press (Machine)', ['35x8', '37.5x8', '35x8']),
    e('shoulder-press', 'Shoulder Press (Machine)', ['35x8', '40x8', '50x8']),
    e('reverse-fly', 'Reverse Fly (Machine)', ['33x8', 'F33x8', 'F26x8']),
    e('chest-fly', 'Chest Fly', ['40x8', 'F40x8', 'F33x6']),
    e('legacy-db-triceps-ext', 'Triceps Extension (Dumbbell)', ['16x8', '16x5']),
    e('legacy-bicep-curl', 'Bicep Curl (Dumbbell)', ['F20x6'], { flag: COMBINED }),
  ] },
  { date: '2026-10-07', time: '21:20', slug: 'kb', workoutId: 'kb', name: 'Evening Workout', location: 'home', durationMin: 59, volumeKg: 3210, prs: 15, exercises: [
    e('kb-swing', 'Kettlebell Swing', ['10x15', '10x20', '13x12', '13x12']),
    e('kb-oblique', 'Kettlebell Oblique', x(4, '26x12'), { perBell: true }),
    e('kb-around', 'Kettlebell Around', x(4, '13x12')), // logged per bell already
    e('kb-halo', 'Kettlebell Halo', ['13x12', '10x8', '10x8']),
    e('legacy-kb-russian-twist', 'Kettlebell Russian Twist', x(3, '10x12')),
  ] },
  { date: '2026-10-09', time: '20:24', slug: 'upper', workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 48, volumeKg: 4418, prs: 2, exercises: [
    e('chest-press', 'Chest Press (Machine)', ['35x8', '37.5x8', '37.5x6', '37.5x2']),
    e('shoulder-press', 'Shoulder Press (Machine)', ['60x5', '50x6', '50x6']),
    e('lat-pulldown', 'Lat Pulldown (Cable)', ['47x8', '47x8', '47x6']),
    e('chest-fly', 'Chest Fly', ['40x8', 'F40x8', 'F40x7']),
    e('reverse-fly', 'Reverse Fly (Machine)', ['33x6', '40x2', '33x6', '26x8']),
  ] },
  { date: '2026-10-11', time: '18:51', slug: 'kb', workoutId: 'kb', name: 'Home Kettlebell', location: 'home', durationMin: 68, volumeKg: 5345, prs: 8, exercises: [
    e('kb-swing', 'Kettlebell Swing', x(4, '13x15')),
    e('kb-oblique', 'Kettlebell Oblique', ['26x15', ...x(3, '26x12')], { perBell: true }),
    e('kb-around', 'Kettlebell Around', x(4, '26x12'), { perBell: true }),
    e('kb-halo', 'Kettlebell Halo', ['13x12', '13x6', '13x8']),
    e('push-up', 'Push Up', ['10', '10', '5']),
  ] },
  // Oct 15 had two sessions: Home Kettlebell 2 at 1:18, Upper Body at 18:55.
  { date: '2026-10-15', time: '01:18', slug: 'kb2', workoutId: 'kb', name: 'Home Kettlebell 2', location: 'home', durationMin: 21, volumeKg: 1925, prs: 12, exercises: [
    e('legacy-kb-bent-over-row', 'Bent Over Row Kettlebell', x(3, '15.5x10')),
    e('kb-swing', 'Kettlebell Swing', ['15.5x15', '13x15', '13x15']),
    e('legacy-kb-clean-thruster', 'Clean Thruster Kettlebell', x(3, '15.5x8')),
    e('legacy-kb-lunge', 'Lunge Kettlebell', x(3, '15.5x10')),
  ] },
  { date: '2026-10-15', time: '18:55', slug: 'upper', workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 48, volumeKg: 3825, prs: 5, exercises: [
    e('chest-fly', 'Chest Fly', ['42.5x2', '40x6', '40x8', '40x8']),
    e('iso-row', 'Iso-Lateral Row (Machine)', ['40x8', '60x8', '40x8']),
    e('chest-press', 'Chest Press (Machine)', ['30x8', '40x5', '40x3', 'D30x4']),
    e('legacy-overhead-press', 'Overhead Press (Dumbbell)', ['20x8', '20x8', '20x6'], { flag: COMBINED }),
    e('legacy-tricep-kickback', 'Tricep Kickback', x(2, '20x8'), { flag: COMBINED }),
    e('hammer-curl', 'Hammer Curl (Dumbbell)', ['20x8', '20x7'], { flag: COMBINED }), // gym hammer curl (retired)
  ] },
  { date: '2026-10-20', time: '23:06', slug: 'kb', workoutId: 'kb', name: 'Home Kettlebell', location: 'home', durationMin: 55, volumeKg: 4313, prs: 5, exercises: [
    e('kb-swing', 'Kettlebell Swing', ['15.5x10', '15.5x15', '15.5x15']),
    e('kb-oblique', 'Kettlebell Oblique', ['31x8', '31x12', '31x12'], { perBell: true }),
    e('kb-around', 'Kettlebell Around', x(3, '31x12'), { perBell: true }),
    e('kb-halo', 'Kettlebell Halo', x(3, '11x12')),
    e('push-up', 'Push Up', ['10']),
    e('kb-triceps-ext', 'Triceps Extension (Dumbbell)', x(2, '11x12')),
    e('kb-hammer-curl', 'Hammer Curl (Dumbbell)', x(2, '11x12'), { equip: 'db' }),
  ] },
  { date: '2026-10-22', time: '21:58', slug: 'upper', workoutId: 'upper', name: 'Upper Body', location: 'gym', durationMin: 40, volumeKg: 3238, prs: 7, exercises: [
    e('chest-press', 'Chest Press (Machine)', ['42.5x6', '40x6', '37.5x8']),
    e('iso-row', 'Iso-Lateral Row (Machine)', ['45x5', '45x6', '40x6']),
    e('shoulder-press', 'Shoulder Press (Machine)', ['70x6', '60x8', '60x6']),
    e('triceps-ext', 'Triceps Extension', ['21.25x6', '21.25x8', '18.75x8']),
  ] },
];
