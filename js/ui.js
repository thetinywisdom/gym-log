import { restLabel } from './program.js';
// Small UI helpers: icons, toast, bottom sheet, confirm, rest timer.
import { fmtSecs } from './utils.js';
import { store } from './store.js';

const sv = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
export const ICON = {
  log: sv('<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>'),
  schedule: sv('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
  muscles: sv('<circle cx="12" cy="4.5" r="2"/><path d="M5 8.5c2.3.8 4.6 1.2 7 1.2s4.7-.4 7-1.2M12 9.7V15m0 0-2.5 6.5M12 15l2.5 6.5M9 10l-.5 5M15 10l.5 5"/>'),
  history: sv('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7.5V12l3 2"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.4"'),
  minus: sv('<path d="M5 12h14"/>', 'stroke-width="2.4"'),
  chevL: sv('<path d="M15 5l-7 7 7 7"/>'),
  chevR: sv('<path d="M9 5l7 7-7 7"/>'),
  close: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  body: sv('<circle cx="12" cy="4.5" r="2"/><path d="M5 8.5c2.3.8 4.6 1.2 7 1.2s4.7-.4 7-1.2M12 9.7V15m0 0-2.5 6.5M12 15l2.5 6.5"/>'),
  up: sv('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  cloud: sv('<path d="M7 18a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19 11a3.5 3.5 0 0 1-.5 7z"/>'),
};

// ---------- toast ----------
let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---------- bottom sheet ----------
let sheetHandler = null;
export function openSheet(html, handler) {
  const root = document.getElementById('sheet');
  root.querySelector('.sheet-body').innerHTML = html;
  sheetHandler = handler || null;
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('open'));
  document.body.classList.add('no-scroll');
}
export function closeSheet() {
  const root = document.getElementById('sheet');
  root.classList.remove('open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => { if (!root.classList.contains('open')) root.hidden = true; }, 220);
  sheetHandler = null;
}
export function initSheet() {
  const root = document.getElementById('sheet');
  root.addEventListener('click', (e) => {
    if (e.target.matches('.sheet-backdrop') || e.target.closest('[data-act="sheet-close"]')) return closeSheet();
    if (sheetHandler) sheetHandler(e);
  });
  root.addEventListener('change', (e) => sheetHandler && sheetHandler(e));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !root.hidden) closeSheet(); });
}

// ---------- rest timer ----------
const timer = { end: 0, min: 0, max: 0, start: 0, label: '', tick: null, finished: false };
let audioCtx;

function beep() {
  if (!store.state.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [0, 0.22].forEach((d) => {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      o.start(t + d); o.stop(t + d + 0.2);
    });
  } catch { /* ignore */ }
}

function renderTimer() {
  const bar = document.getElementById('restbar');
  const now = Date.now();
  const elapsed = (now - timer.start) / 1000;
  const left = (timer.end - now) / 1000;
  const total = (timer.end - timer.start) / 1000;
  bar.querySelector('.rest-time').textContent = left > 0 ? fmtSecs(left) : 'Go!';
  bar.querySelector('.rest-fill').style.transform = `scaleX(${Math.min(1, elapsed / total)})`;
  const ready = elapsed >= timer.min;
  bar.classList.toggle('ready', ready);
  bar.querySelector('.rest-label').textContent = left <= 0 ? 'Rest over — next set'
    : ready ? `Ready when you are · ${timer.label}` : `Rest · ${timer.label}`;
  if (left <= 0 && !timer.finished) {
    timer.finished = true;
    beep();
    if (store.state.settings.vibrate && navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => { if (timer.finished) stopRest(); }, 5000);
  }
}

export function startRest([min, max], label) {
  timer.start = Date.now(); timer.min = min; timer.max = max; timer.end = timer.start + max * 1000;
  timer.label = label; timer.finished = false;
  const bar = document.getElementById('restbar');
  bar.hidden = false; bar.classList.add('show');
  bar.querySelector('.rest-range').textContent = restLabel([min, max]);
  clearInterval(timer.tick);
  timer.tick = setInterval(renderTimer, 250);
  renderTimer();
}
export function stopRest() {
  clearInterval(timer.tick); timer.finished = false;
  const bar = document.getElementById('restbar');
  bar.classList.remove('show'); bar.hidden = true;
}
export function initRestbar() {
  const bar = document.getElementById('restbar');
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'rest-skip') return stopRest();
    const d = +b.dataset.delta;
    if (d) { timer.end += d * 1000; timer.finished = false; if (timer.end < Date.now()) timer.end = Date.now(); renderTimer(); }
  });
}

// ---------- screen wake lock while logging ----------
let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && store.state.settings.keepAwake && 'wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}
