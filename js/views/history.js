import { PROGRAM, getWorkout, allExercises, MUSCLES, findExercise, entryEquip, equipOption } from '../program.js';
import { store } from '../store.js';
import { historyFor, bestFor, readyToProgress, workingSets } from '../logic.js';
import { fmtDate, esc, fmtKg } from '../utils.js';
import { ICON, openSheet, closeSheet, toast } from '../ui.js';
import { bodyMap, exerciseLevels } from '../muscles.js';

let mode = 'sessions';
const open = new Set();

const volumeCalc = (s) => s.exercises.reduce((v, e) => v + e.sets.reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0), 0);
/** Exercise name as logged, plus its equipment ("Hammer Curl · Dumbbells") for exercises with variants. */
function entryLabel(e) {
  const def = findExercise(e.id);
  if (!def?.equip) return esc(e.name);
  const eq = equipOption(def, entryEquip(def, e));
  return `${esc(def.name)} <span class="equip-tag">· ${esc(eq.name)}</span>`;
}
const equipName = (def, equip) => (def?.equip && equip ? equipOption(def, equip).name : '');
/** Imported sessions keep the volume the other app reported (it counted push-ups at body weight). */
const volume = (s) => (s.imported?.volumeKg != null ? s.imported.volumeKg : volumeCalc(s));
const SET_TYPES = { W: 'Warm-up', F: 'To failure', D: 'Drop set' };
/** One set: "47×8", bodyweight "10"; warm-up / failure / drop sets get a small letter badge (W/F/D). */
const fmtSet = (x) => {
  const v = x.weight == null ? `${x.reps}` : `${fmtKg(x.weight)}×${x.reps}`;
  const t = SET_TYPES[x.type];
  const logged = x.loggedWeight != null ? ` title="logged as ${fmtKg(x.loggedWeight)} kg (both bells)"` : '';
  return `<span class="set${t ? ` st-${x.type.toLowerCase()}` : ''}"${logged}>${t ? `<b class="st-badge" title="${t}">${x.type}</b>` : ''}${v}</span>`;
};
const fmtSets = (sets) => sets.map(fmtSet).join(' · ');
/** Notes for imported exercises: per-bell conversion, or a weight that may be both dumbbells added up. */
function impNote(e) {
  const i = e.imported; if (!i) return '';
  const logged = e.sets.find((x) => x.loggedWeight != null);
  if (i.perBell && logged) return `<span class="imp-ex-note">per bell · logged as ${fmtKg(logged.loggedWeight)} kg</span>`;
  if (i.flag) return `<span class="imp-ex-note">as logged · ${esc(i.flag)}</span>`;
  return '';
}
const importedTag = '<span class="tag imp-tag">imported</span>';
/** Working sets (warm-ups don't count). */
const setCount = (s) => s.exercises.reduce((n, e) => n + workingSets(e.sets).length, 0);

export function renderHistory(el) {
  const sessions = store.sessionList();
  let body;
  if (mode === 'sessions') {
    body = sessions.length ? sessions.map((s) => {
      const w = getWorkout(s.workoutId);
      const isOpen = open.has(s.id);
      return `<article class="card hist ${isOpen ? 'open' : ''}">
        <button class="hist-head" data-act="toggle" data-id="${s.id}">
          <span class="hist-date"><b>${fmtDate(s.date, { weekday: false }).split(' ')[1]}</b><small>${fmtDate(s.date, { weekday: false }).split(' ')[0]}</small></span>
          <span class="hist-main"><b>${esc(s.imported && s.name ? s.name : w ? w.name : s.workoutId)}${s.imported ? importedTag : ''}</b><span class="muted small">${fmtDate(s.date)} · ${setCount(s)} sets · ${Math.round(volume(s)).toLocaleString()} kg volume${s.durationMin ? ` · ${s.durationMin} min` : ''}${s.imported?.prs ? ` · ${s.imported.prs} PR${s.imported.prs === 1 ? '' : 's'}` : ''}</span></span>
          <span class="chev">${ICON.chevR}</span>
        </button>
        ${isOpen ? `<div class="hist-body">${s.exercises.map((e) => `<div class="hist-ex"><span>${entryLabel(e)}${impNote(e)}</span><span class="muted hist-sets">${fmtSets(e.sets)}</span></div>`).join('')}
          ${s.imported ? `<p class="muted small imp-note">Imported from your previous app, every set as logged there. W = warm-up (not counted), F = to failure, D = drop set. Volume and PRs as that app reported them.</p>` : ''}
          <button class="btn danger small" data-act="del" data-id="${s.id}">${ICON.trash} Delete workout</button></div>` : ''}
      </article>`;
    }).join('') : '<p class="empty">No workouts yet. Log your first session on the Today tab.</p>';
  } else {
    const seen = new Set();
    const exs = allExercises().filter((e) => (seen.has(e.id) ? false : seen.add(e.id)) && (!e.retired || historyFor(e.id).length));
    body = Object.values(PROGRAM.workouts).map((w) => `<h3>${esc(w.name)}</h3>
      <div class="card list">${exs.filter((e) => e.workout === w.id).map((e) => {
        const h = historyFor(e.id); const best = bestFor(e.id);
        return `<button class="list-row" data-act="ex" data-ex="${e.id}">
          <span><b>${esc(e.name)}</b><span class="muted small">${e.legacy ? 'Earlier app · ' : e.retired ? 'Removed from plan · ' : ''}${h.length ? `${h.length} session${h.length === 1 ? '' : 's'} · last ${fmtDate(h[0].date, { weekday: false })}` : 'Not logged yet'}</span></span>
          <span class="right">${!e.retired && readyToProgress(e) ? `<span class="badge ready sm">${ICON.up}</span>` : ''}${best && best.weight != null ? `<b>${fmtKg(best.weight)} kg</b>` : h.length ? `<b>${Math.max(...h.flatMap((x) => x.sets.map((s) => s.reps)))} reps</b>` : '<span class="muted">—</span>'}</span>
        </button>`;
      }).join('')}</div>`).join('');
  }
  el.innerHTML = `<div class="seg">
      <button class="${mode === 'sessions' ? 'on' : ''}" data-act="mode" data-mode="sessions">Workouts</button>
      <button class="${mode === 'exercises' ? 'on' : ''}" data-act="mode" data-mode="exercises">Exercises</button>
    </div>${body}`;
}

function sparkline(points) {
  if (points.length < 2) return '';
  const W = 300, H = 70, pad = 6;
  const ys = points.map((p) => p.v); const min = Math.min(...ys), max = Math.max(...ys);
  const rng = max - min || 1;
  const xy = points.map((p, i) => [pad + (i * (W - 2 * pad)) / (points.length - 1), H - pad - ((p.v - min) / rng) * (H - 2 * pad)]);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${xy.map((p) => p.join(',')).join(' ')}"/>${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</svg>`;
}

function exerciseSheet(id) {
  const ex = allExercises().find((e) => e.id === id);
  const h = historyFor(id);
  const best = bestFor(id);
  const pts = h.slice(0, 12).reverse().map((x) => ({ v: ex.bodyweight ? Math.max(...x.sets.map((s) => s.reps)) : Math.max(...x.sets.map((s) => s.weight || 0)) }));
  openSheet(`<div class="sheet-head"><div><h2>${esc(ex.name)}</h2><p class="muted">${best && best.weight != null ? `Best ${fmtKg(best.weight)} kg × ${best.reps} (${fmtDate(best.date, { weekday: false })})` : h.length ? 'Bodyweight' : 'No sessions yet'}</p></div><button class="icon-btn" data-act="sheet-close" aria-label="Close">${ICON.close}</button></div>
    ${readyToProgress(ex) ? `<div class="badge ready">${ICON.up} Ready to progress — ${esc(PROGRAM.progressionRule)}</div>` : ''}
    ${pts.length > 1 ? `<div class="spark-wrap"><span class="muted small">${ex.bodyweight ? 'Top reps' : 'Top weight (kg)'} per session</span>${sparkline(pts)}</div>` : ''}
    <div class="card list flat">${h.length ? h.slice(0, 10).map((x) => `<div class="list-row static"><span>${fmtDate(x.date)}${equipName(ex, x.equip) ? ` <span class="equip-tag">· ${esc(equipName(ex, x.equip))}</span>` : ''}</span><span class="muted">${fmtSets(x.sets)}${x.imported ? ` ${importedTag}` : ''}</span></div>`).join('') : '<p class="empty">Log this exercise to see its history.</p>'}</div>
    <details class="mini-map"><summary>${ICON.body} Muscles worked</summary>${bodyMap(exerciseLevels(ex))}</details>`);
}

export function historyClick(e, el, rerender) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'mode') { mode = b.dataset.mode; return rerender(); }
  if (a === 'toggle') { open.has(b.dataset.id) ? open.delete(b.dataset.id) : open.add(b.dataset.id); return rerender(); }
  if (a === 'del') {
    if (!confirm('Delete this workout from your history?')) return;
    store.deleteSession(b.dataset.id); toast('Workout deleted');
  }
  if (a === 'ex') exerciseSheet(b.dataset.ex);
}
