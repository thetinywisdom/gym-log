import { PROGRAM } from '../program.js';
import { store } from '../store.js';
import { syncEnabled, getSyncStatus, signIn, signOutUser } from '../sync.js';
import { todayISO, esc } from '../utils.js';
import { ICON, toast } from '../ui.js';

export const APP_VERSION = '1.1.0';

function syncCard() {
  if (!syncEnabled) return '';
  const s = getSyncStatus();
  const label = { loading: 'Connecting…', 'signed-out': 'Not signed in', syncing: 'Syncing…', synced: 'Synced', error: 'Sync problem' }[s.state] || s.state;
  return `<section class="card">
    <h2>${ICON.cloud} Cloud sync</h2>
    <p class="muted">Sign in with Google to back up and sync your log across devices (Firestore). Data stays on this device too.</p>
    <div class="sync-status ${s.state}"><i></i>${esc(label)}${s.user ? ` · ${esc(s.user.email || s.user.name)}` : ''}</div>
    ${s.error ? `<p class="error small">${esc(s.error)}</p>` : ''}
    ${s.user ? '<button class="btn ghost block" data-act="signout">Sign out</button>'
      : s.state === 'signed-out' || s.state === 'error' ? '<button class="btn primary block" data-act="signin">Sign in with Google</button>' : ''}
  </section>`;
}

const toggle = (key, label, hint) => `<label class="set-toggle"><span><b>${label}</b>${hint ? `<span class="muted small">${hint}</span>` : ''}</span>
  <span class="switch"><input type="checkbox" data-setting="${key}" ${store.state.settings[key] ? 'checked' : ''}><span></span></span></label>`;

export function renderSettings(el) {
  const n = Object.keys(store.state.sessions).length;
  el.innerHTML = `${syncCard()}
  <section class="card">
    <h2>Backup</h2>
    <p class="muted">${n} workout${n === 1 ? '' : 's'} stored on this device${syncEnabled ? '' : ' (local only)'}. Export a backup file now and then, especially before clearing browser data.</p>
    <button class="btn primary block" data-act="export">Export JSON backup</button>
    <label class="btn ghost block file-btn">Import JSON backup<input type="file" accept="application/json,.json" data-act="import" hidden></label>
  </section>
  <section class="card">
    <h2>Preferences</h2>
    ${toggle('sound', 'Rest timer sound', 'Beep when rest is over')}
    ${toggle('vibrate', 'Vibration', 'Buzz on set done and when rest ends (Android)')}
    ${toggle('keepAwake', 'Keep screen on while logging', 'Uses the Screen Wake Lock API where supported')}
  </section>
  <section class="card">
    <h2>Program</h2>
    <p class="muted small">${esc(PROGRAM.name)} · starts ${PROGRAM.startDate} · ${PROGRAM.weeks} weeks · deload weeks ${PROGRAM.deloadWeeks.join(', ')}.</p>
    <p class="muted small">Progression: ${esc(PROGRAM.progressionRule)}</p>
    <p class="muted small">Edit <code>js/program.js</code> to change exercises, sets, weights or muscles.</p>
  </section>
  <section class="card">
    <h2>Danger zone</h2>
    <button class="btn danger block" data-act="reset">${ICON.trash} Erase all data on this device</button>
  </section>
  <p class="muted small center">Fitlog v${APP_VERSION} · times in JST (Asia/Tokyo)</p>`;
}

export function settingsClick(e, el, rerender) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'signin') signIn();
  if (a === 'signout') signOutUser();
  if (a === 'export') {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `fitlog-backup-${todayISO()}.json` });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup exported');
  }
  if (a === 'reset') {
    if (!confirm('Erase every workout, your schedule and settings from this device? This cannot be undone.')) return;
    if (!confirm('Really erase everything? Export a backup first if unsure.')) return;
    store.resetAll(); toast('All local data erased');
  }
}

export function settingsChange(e, el, rerender) {
  const t = e.target;
  if (t.dataset.setting) { store.state.settings[t.dataset.setting] = t.checked; store.commit({ kind: 'settings' }); return; }
  if (t.dataset.act === 'import' && t.files[0]) {
    const file = t.files[0];
    file.text().then((txt) => {
      if (!confirm('Import this backup? Workouts are merged; schedule and settings are replaced by the backup.')) return;
      const n = store.importJSON(txt);
      toast(`Imported ${n} workout${n === 1 ? '' : 's'}`);
    }).catch((err) => { console.warn(err); alert(`Import failed: ${err.message}`); })
      .finally(() => { t.value = ''; });
  }
}
