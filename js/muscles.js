// Hand-made SVG body map (front + back). Each muscle group is addressable via data-m="<id>".
// Paths describe the figure's LEFT half of the canvas (x < 100); the right half is mirrored.
import { MUSCLES } from './program.js';

const SIL = {
  // body silhouette half (base layer)
  front: 'M100 47 L92 47 Q91 56 88 58 Q72 62 60 64 Q46 68 43 84 Q40 100 41 116 Q37 132 37 150 Q31 176 33 212 Q29 226 32 238 Q37 247 44 244 Q49 236 47 224 L47 214 Q54 190 59 158 Q61 140 63 124 Q66 152 70 188 Q64 205 63 222 Q60 262 66 300 Q68 312 67 322 Q61 350 66 384 Q67 400 64 414 Q62 424 72 426 Q82 426 82 418 Q80 406 81 398 Q90 368 89 340 Q88 328 91 316 Q96 288 98 252 Q99 240 100 236 Z',
  back:  'M100 47 L92 47 Q91 56 88 58 Q72 62 60 64 Q46 68 43 84 Q40 100 41 116 Q37 132 37 150 Q31 176 33 212 Q29 226 32 238 Q37 247 44 244 Q49 236 47 224 L47 214 Q54 190 59 158 Q61 140 63 124 Q66 152 70 188 Q64 205 63 222 Q60 262 66 300 Q68 312 67 322 Q61 350 66 384 Q67 400 64 414 Q62 424 72 426 Q82 426 82 418 Q80 406 81 398 Q90 368 89 340 Q88 328 91 316 Q96 288 98 252 Q99 240 100 236 Z',
};

const FRONT = {
  traps:      ['M90 55 Q86 60 72 63 Q82 65 91 64 Z'],
  sideDelts:  ['M62 66 Q48 68 45 84 Q43 98 46 110 Q49 100 52 92 Q54 78 62 70 Z'],
  frontDelts: ['M66 65 Q73 66 74 70 Q68 80 64 92 Q58 100 50 106 Q52 92 55 82 Q58 72 66 65 Z'],
  chest:      ['M99 70 Q86 66 76 70 Q68 80 64 94 Q63 104 68 110 Q80 118 92 116 Q99 113 99 106 Z'],
  lats:       ['M64 100 Q61 112 66 128 Q68 120 72 116 Q66 112 64 100 Z'],
  biceps:     ['M60 104 Q53 108 50 116 Q47 130 49 142 Q53 147 57 143 Q61 128 61 112 Z'],
  brachialis: ['M49 132 Q46 140 46 150 L52 152 Q50 146 49 142 Z', 'M57 143 Q58 148 57 153 L60 150 Q61 140 60 130 Z'],
  triceps:    ['M46 106 Q42 118 42 132 Q43 142 46 150 Q45 136 48 120 Z'],
  forearms:   ['M45 154 Q38 168 37 186 Q36 200 37 212 L44 212 Q48 192 53 176 Q57 164 58 155 Q52 158 45 154 Z', 'M58 156 Q56 170 52 184 Q48 198 46 212 L47 212 Q53 196 57 180 Q60 166 60 156 Z'],
  abs:        ['M99 120 L88 120 Q85 128 86 138 Q86 168 89 196 Q93 206 99 210 Z'],
  obliques:   ['M85 120 Q74 120 69 124 Q68 152 72 182 Q78 196 87 204 Q84 172 83 140 Q83 128 85 120 Z'],
  quads:      ['M71 196 Q64 214 64 240 Q63 270 68 296 Q72 308 78 312 Q76 286 77 260 Q78 232 82 214 Q76 206 71 196 Z',
               'M83 216 Q79 236 79 262 Q79 290 80 312 Q86 316 91 310 Q94 296 92 274 Q91 248 90 226 Q87 220 83 216 Z'],
  adductors:  ['M91 226 Q95 230 98 234 Q97 254 94 274 Q92 250 91 226 Z'],
  calves:     ['M69 328 Q64 348 66 372 Q68 390 72 402 L76 402 Q75 370 77 340 Q75 330 69 328 Z',
               'M79 332 Q86 336 88 352 Q88 374 82 396 L78 402 Q77 370 79 332 Z'],
};

const BACK = {
  traps:      ['M99 50 L92 50 Q90 58 84 61 Q74 64 66 66 Q80 70 88 82 Q93 96 96 120 L99 124 Z'],
  sideDelts:  ['M62 66 Q48 68 45 84 Q43 98 46 110 Q49 100 52 92 Q54 78 62 70 Z'],
  rearDelts:  ['M66 66 Q60 70 56 80 Q52 92 50 106 Q56 100 62 92 Q68 82 76 72 Z'],
  midBack:    ['M78 72 Q70 82 66 94 Q72 104 84 104 Q90 104 92 100 Q90 88 86 80 Q83 75 78 72 Z'],
  lats:       ['M65 98 Q62 116 68 140 Q74 160 84 174 Q90 180 94 178 Q93 152 94 132 Q92 116 88 106 Q74 108 65 98 Z'],
  lowerBack:  ['M99 128 L96 126 Q94 150 94 176 Q94 192 96 204 L99 206 Z'],
  obliques:   ['M69 146 Q68 170 72 190 Q80 198 92 200 Q92 190 93 182 Q84 176 76 164 Q72 156 69 146 Z'],
  triceps:    ['M58 102 Q50 106 47 118 Q44 132 46 148 Q52 152 58 148 Q62 132 62 114 Q61 106 58 102 Z'],
  forearms:   ['M45 154 Q38 168 37 186 Q36 200 37 212 L44 212 Q48 192 53 176 Q57 164 58 155 Q52 158 45 154 Z', 'M58 156 Q56 170 52 184 Q48 198 46 212 L47 212 Q53 196 57 180 Q60 166 60 156 Z'],
  glutes:     ['M99 208 L95 206 Q80 202 72 208 Q65 220 66 236 Q68 252 80 256 Q92 258 99 252 Z'],
  hamstrings: ['M68 258 Q64 276 66 296 Q68 310 74 316 Q78 290 81 262 Q74 262 68 258 Z',
               'M83 262 Q81 290 78 316 Q86 318 90 310 Q95 290 95 262 Q89 263 83 262 Z'],
  adductors:  ['M96 258 Q98 262 98 268 Q97 282 94 292 Q96 274 96 258 Z'],
  calves:     ['M70 326 Q63 342 65 362 Q68 374 74 378 Q79 366 80 348 Q80 334 77 326 Z',
               'M81 328 Q86 330 89 342 Q90 358 86 370 Q83 378 79 378 Q82 362 82 346 Z',
               'M67 372 Q68 392 72 404 L80 404 Q84 392 86 374 Q80 384 76 384 Q70 382 67 372 Z'],
};

// Decorative anatomy lines (not interactive)
const DETAIL = {
  front: 'M99 140 L87 140 M99 160 L87.5 160 M99 180 L88.5 180 M76 318 Q80 322 86 318',
  back: 'M99 60 L99 124',
};

function half(view, paths, levels) {
  let s = `<path class="sil" d="${SIL[view]}"/>`;
  for (const [m, list] of Object.entries(paths)) {
    const v = levels[m] || 0;
    const cls = v >= 0.99 ? 'm on primary' : v > 0 ? 'm on' : 'm';
    const style = v > 0 ? ` style="--lvl:${v.toFixed(3)}"` : '';
    for (const d of list) s += `<path class="${cls}" data-m="${m}"${style} d="${d}"><title>${MUSCLES[m]}</title></path>`;
  }
  s += `<path class="detail" d="${DETAIL[view]}"/>`;
  return s;
}

function figure(view, paths, label, levels) {
  const h = half(view, paths, levels);
  const head = '<ellipse class="sil" cx="100" cy="28" rx="14" ry="17"/><path class="sil" d="M93 40 L107 40 L108 52 L92 52 Z"/>';
  return `<svg class="body-svg" viewBox="20 6 160 426" role="img" aria-label="${label}">
    ${head}<g>${h}</g><g transform="matrix(-1 0 0 1 200 0)">${h}</g>
  </svg>`;
}

/** levels: { muscleId: 0..1 } (1 = primary). Returns an HTML string with front + back views. */
export function bodyMap(levels = {}, { caption = true } = {}) {
  return `<div class="bodymap">
    <figure>${figure('front', FRONT, 'Front view', levels)}${caption ? '<figcaption>Front</figcaption>' : ''}</figure>
    <figure>${figure('back', BACK, 'Back view', levels)}${caption ? '<figcaption>Back</figcaption>' : ''}</figure>
  </div>`;
}

/** Levels for one exercise: primary = 1, secondary = 0.42 */
export function exerciseLevels(ex) {
  const l = {};
  (ex.secondary || []).forEach((m) => (l[m] = 0.42));
  (ex.primary || []).forEach((m) => (l[m] = 1));
  return l;
}

/** Combined levels for a list of exercises: primary anywhere wins. */
export function combinedLevels(list) {
  const l = {};
  for (const ex of list) {
    for (const [m, v] of Object.entries(exerciseLevels(ex))) l[m] = Math.max(l[m] || 0, v);
  }
  return l;
}

export const MUSCLE_IDS = Object.keys(MUSCLES);
export const ALL_PATH_IDS = [...new Set([...Object.keys(FRONT), ...Object.keys(BACK)])];
