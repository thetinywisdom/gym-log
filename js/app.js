import { store } from './store.js';
import { initSheet, initRestbar, ICON, keepAwake } from './ui.js';
import { renderLog, logClick, logChange } from './views/log.js';
import { renderSchedule, scheduleClick } from './views/schedule.js';
import { renderMuscles, musclesClick } from './views/muscles.js';
import { renderHistory, historyClick } from './views/history.js';
import { renderSettings, settingsClick, settingsChange } from './views/settings.js';
import { initSync, onSyncStatus, syncEnabled } from './sync.js';
import { initWatch, closeWatch } from './watch.js';
import { applyHistoryImport } from './importer.js';

const ROUTES = {
  log: { title: 'Today', render: renderLog, click: logClick, change: logChange },
  schedule: { title: 'Schedule', render: renderSchedule, click: scheduleClick },
  muscles: { title: 'Muscles', render: renderMuscles, click: musclesClick, change: musclesClick },
  history: { title: 'History', render: renderHistory, click: historyClick },
  settings: { title: 'Settings', render: renderSettings, click: settingsClick, change: settingsChange },
};

const view = document.getElementById('view');
let current = 'log';

function routeFromHash() {
  const r = location.hash.replace(/^#\/?/, '');
  return ROUTES[r] ? r : 'log';
}

function render() {
  const r = ROUTES[current];
  document.getElementById('title').textContent = r.title;
  document.title = `${r.title} · Fitlog`;
  document.querySelectorAll('.tabbar a').forEach((a) => a.setAttribute('aria-current', a.dataset.route === current ? 'page' : 'false'));
  document.getElementById('settings-link').classList.toggle('on', current === 'settings');
  view.dataset.route = current;
  r.render(view);
}

function navigate() {
  const next = routeFromHash();
  const changed = next !== current;
  current = next;
  if (current !== 'log') keepAwake(false);
  closeWatch();
  render();
  if (changed) window.scrollTo(0, 0);
}

view.addEventListener('click', (e) => ROUTES[current].click?.(e, view, render));
view.addEventListener('change', (e) => ROUTES[current].change?.(e, view, render));
window.addEventListener('hashchange', navigate);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && current === 'log') keepAwake(true); });

// Re-render on data changes (not on draft keystrokes; log view updates itself in place).
store.subscribe((ch) => { if (ch.kind !== 'draft') render(); });
onSyncStatus((s) => {
  const dot = document.getElementById('sync-dot');
  dot.hidden = false; dot.dataset.state = s.state;
  if (current === 'settings') render();
});

// Chrome: icons into the static shell
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICON[el.dataset.icon]; });

// One-time import of the workouts logged in the previous app (js/history-import.js). Idempotent.
try { applyHistoryImport(); } catch (e) { console.error('History import failed', e); }

initSheet();
initWatch();
initRestbar();
current = routeFromHash();
render();
if (syncEnabled) initSync();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e)));
}
