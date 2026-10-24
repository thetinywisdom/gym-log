import { PROGRAM, MUSCLES, repLabel, allExercises } from '../program.js';
import { sessionExercises, weeklyMuscleSets, sessionsInWeek } from '../logic.js';
import { bodyMap, exerciseLevels, combinedLevels } from '../muscles.js';
import { muscleListHtml } from './log.js';
import { todayISO, mondayOf, addDays, fmtDate, esc } from '../utils.js';
import { ICON } from '../ui.js';

const st = { mode: 'session', workout: 'kb', optional: false, exId: 'kb-swing', monday: null };

export function setMusclesState(patch) { Object.assign(st, patch); }

export function renderMuscles(el) {
  if (!st.monday) st.monday = mondayOf(todayISO());
  const tabs = [['session', 'Session'], ['exercise', 'Exercise'], ['week', 'This week']];
  let body = '';

  if (st.mode === 'session') {
    const allChoices = Object.fromEntries(PROGRAM.workouts[st.workout].exercises.filter((x) => x.bothSets).map((x) => [x.id, 'both']));
    const exs = sessionExercises(st.workout, { choices: allChoices }, st.optional);
    const lv = combinedLevels(exs);
    body = `<div class="seg">${Object.values(PROGRAM.workouts).map((w) => `<button class="${w.id === st.workout ? 'on' : ''}" data-act="m-workout" data-w="${w.id}">${esc(w.name)}</button>`).join('')}</div>
      ${st.workout === 'kb' ? `<label class="check-row"><input type="checkbox" data-act="m-opt" ${st.optional ? 'checked' : ''}> Include optional exercises</label>` : ''}
      <div class="map-card">${bodyMap(lv)}</div>
      ${legend()}
      ${muscleListHtml({ primary: Object.keys(lv).filter((m) => lv[m] >= 1), secondary: Object.keys(lv).filter((m) => lv[m] < 1) })}
      <h3>Exercises</h3>
      <div class="chip-list">${exs.map((e) => `<button class="pill" data-act="m-ex" data-ex="${e.id}">${esc(e.name)}</button>`).join('')}</div>`;
  } else if (st.mode === 'exercise') {
    const groups = Object.values(PROGRAM.workouts).map((w) => ({ w, exs: allExercises().filter((e) => e.workout === w.id) }));
    const all = groups.flatMap((g) => g.exs);
    const ex = all.find((e) => e.id === st.exId) || all[0];
    body = `${groups.map((g) => `<h3>${esc(g.w.name)}</h3><div class="chip-list scroll">${g.exs.map((e) => `<button class="pill ${e.id === ex.id ? 'on' : ''}" data-act="m-ex" data-ex="${e.id}">${esc(e.name)}</button>`).join('')}</div>`).join('')}
      <div class="map-card"><div class="map-title"><b>${esc(ex.name)}</b><span class="muted small">${ex.sets} × ${repLabel(ex)}${ex.perSide ? '/leg' : ''}</span></div>${bodyMap(exerciseLevels(ex))}</div>
      ${legend()}${muscleListHtml(ex)}`;
  } else {
    const counts = weeklyMuscleSets(st.monday);
    const max = Math.max(8, ...Object.values(counts));
    const lv = {};
    for (const [m, c] of Object.entries(counts)) lv[m] = Math.min(0.98, 0.18 + 0.8 * (c / max));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const n = sessionsInWeek(st.monday).length;
    body = `<div class="week-nav">
        <button class="icon-btn" data-act="m-wk" data-d="-7" aria-label="Previous week">${ICON.chevL}</button>
        <div class="wk-title"><b>${fmtDate(st.monday, { weekday: false })} – ${fmtDate(addDays(st.monday, 6), { weekday: false })}</b><span class="muted small">${n} workout${n === 1 ? '' : 's'} logged</span></div>
        <button class="icon-btn" data-act="m-wk" data-d="7" aria-label="Next week">${ICON.chevR}</button>
      </div>
      <div class="map-card">${bodyMap(lv)}</div>
      <div class="heat-legend"><span>fewer sets</span><i></i><span>more sets</span></div>
      ${sorted.length ? `<div class="bars">${sorted.map(([m, c]) => `<div class="bar-row"><span>${MUSCLES[m]}</span><div class="bar"><i style="width:${(c / max) * 100}%"></i></div><b>${+c.toFixed(1)}</b></div>`).join('')}</div>
        <p class="muted small">Sets per muscle: a primary muscle counts 1 per set, a secondary one counts ½.</p>`
        : '<p class="empty">No workouts logged this week yet.</p>'}`;
  }

  el.innerHTML = `<section class="card">
    <div class="seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${st.mode === k ? 'on' : ''}" data-act="m-mode" data-mode="${k}">${l}</button>`).join('')}</div>
    ${body}
  </section>`;
}

function legend() {
  return '<div class="legend center"><span><i class="lg p"></i>Primary</span><span><i class="lg s"></i>Secondary</span><span><i class="lg n"></i>Not targeted</span></div>';
}

export function musclesClick(e, el, rerender) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'm-mode') st.mode = b.dataset.mode;
  else if (a === 'm-workout') st.workout = b.dataset.w;
  else if (a === 'm-ex') { st.exId = b.dataset.ex; st.mode = 'exercise'; }
  else if (a === 'm-wk') st.monday = addDays(st.monday, +b.dataset.d);
  else if (a === 'm-opt') { st.optional = b.checked; }
  else return;
  rerender();
  if (a === 'm-ex') el.querySelector('.pill.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}
