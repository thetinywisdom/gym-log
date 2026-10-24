// Lazy exercise registry. Each definition lives in its own module and is only fetched when needed.
export const EXERCISES = {
  'kb-swing': () => import('./kb-swing.js'),
  'goblet-squat': () => import('./goblet-squat.js'),
  'kb-rdl': () => import('./kb-rdl.js'),
  'reverse-lunge': () => import('./reverse-lunge.js'),
  'kb-oblique': () => import('./kb-oblique.js'),
  'kb-around': () => import('./kb-around.js'),
  'kb-halo': () => import('./kb-halo.js'),
  'push-up': () => import('./push-up.js'),
  'triceps-overhead': () => import('./triceps-overhead.js'),
  'triceps-pushdown': () => import('./triceps-pushdown.js'),
  'hammer-curl': () => import('./hammer-curl.js'),
  'hammer-curl-kb': () => import('./hammer-curl-kb.js'),
  'chest-press': () => import('./chest-press.js'),
  'iso-row': () => import('./iso-row.js'),
  'lat-pulldown': () => import('./lat-pulldown.js'),
  'shoulder-press': () => import('./shoulder-press.js'),
  'chest-fly': () => import('./chest-fly.js'),
  'reverse-fly': () => import('./reverse-fly.js'),
};

// gym-log program.js ids → animation ids
export const ALIASES = {
  'kb-triceps-ext': 'triceps-overhead',
  'triceps-ext': 'triceps-pushdown',
  'kb-hammer-curl': 'hammer-curl',
  'pull-slot': 'iso-row',
};

export const resolveId = (id) => (EXERCISES[id] ? id : ALIASES[id] || id);
export const hasAnimation = (id) => !!EXERCISES[resolveId(id)];

export async function loadExercise(id) {
  const rid = resolveId(id);
  const f = EXERCISES[rid];
  if (!f) throw new Error('No animation for exercise "' + id + '"');
  const mod = await f();
  return { id: rid, ...mod.default };
}
