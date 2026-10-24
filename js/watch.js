// "Watch" sheet: one shared 3D exercise player (anim/), lazy-loaded on first open.
// Three.js (~700 KB) is only fetched the first time you tap ▶ Watch; afterwards the same
// player (one WebGL context) is reused and switched with setExercise().
import { hasAnimation, resolveId } from '../anim/exercises/index.js';
import { ICON } from './ui.js';
import { esc } from './utils.js';

let player = null;      // shared player instance
let loading = null;     // Promise while the module/player is being created
let current = null;     // app exercise id currently shown
let tabs = [];          // [{ id, name }]

export const canWatch = (id) => hasAnimation(id);

function root() { return document.getElementById('watch'); }

function renderTabs() {
  const el = root().querySelector('.watch-tabs');
  el.hidden = tabs.length < 2;
  el.innerHTML = tabs.length < 2 ? '' : tabs.map((t) => `<button role="tab" class="${t.id === current ? 'on' : ''}" aria-selected="${t.id === current}" data-act="watch-pick" data-ex="${esc(t.id)}">${esc(t.name)}</button>`).join('');
}

async function show(id) {
  current = id; renderTabs();
  const stage = root().querySelector('.watch-stage');
  if (!player) {
    loading ||= import('../anim/src/player.js').then(({ createExercisePlayer }) => {
      player = createExercisePlayer(stage, resolveId(id), { autoplay: true, tint: 'all' });
      return player.ready;
    });
    try { await loading; } catch (err) {
      loading = null; player = null;
      stage.innerHTML = `<p class="watch-err">Couldn't load the animation (${esc(err.message || err)}). Check your connection and try again.</p>`;
      return;
    }
    if (current !== id) return show(current);
  } else {
    await player.setExercise(resolveId(id));
  }
  if (root().classList.contains('open') && current === id) player.play();
}

/**
 * Open the watch sheet.
 * @param {{id:string,name:string}[]} list  exercises to offer (tabs when more than one)
 * @param {string} [startId]
 */
export function openWatch(list, startId) {
  tabs = list.filter((x) => canWatch(x.id));
  if (!tabs.length) return;
  const r = root();
  const id = tabs.some((t) => t.id === startId) ? startId : tabs[0].id;
  r.hidden = false;
  requestAnimationFrame(() => r.classList.add('open'));
  document.body.classList.add('no-scroll');
  show(id);
}

export function closeWatch() {
  const r = root();
  if (r.hidden) return;
  r.classList.remove('open');
  player?.pause();
  if (!document.getElementById('sheet').classList.contains('open')) document.body.classList.remove('no-scroll');
  setTimeout(() => { if (!r.classList.contains('open')) r.hidden = true; }, 220);
}

export function initWatch() {
  const r = document.createElement('div');
  r.id = 'watch'; r.className = 'sheet watch'; r.hidden = true;
  r.innerHTML = `<div class="sheet-backdrop"></div>
    <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="Exercise animation">
      <div class="sheet-grip"></div>
      <div class="watch-head"><div class="seg small watch-tabs" role="tablist" hidden></div>
        <button class="icon-btn" data-act="watch-close" aria-label="Close">${ICON.close}</button></div>
      <div class="watch-stage"></div>
    </div>`;
  document.body.appendChild(r);
  r.addEventListener('click', (e) => {
    if (e.target.matches('.sheet-backdrop') || e.target.closest('[data-act="watch-close"]')) return closeWatch();
    const b = e.target.closest('[data-act="watch-pick"]');
    if (b && b.dataset.ex !== current) show(b.dataset.ex);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !r.hidden) closeWatch(); });
}

/** QA/debug hook. */
export const _watchState = () => ({ player, current, tabs: tabs.map((t) => t.id) });
