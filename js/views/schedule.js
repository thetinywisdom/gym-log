import { PROGRAM, getWorkout } from '../program.js';
import { store } from '../store.js';
import { programWeek, scheduleSorted, sessionsInWeek } from '../logic.js';
import { todayISO, mondayOf, addDays, fmtDate, addMinutes, DOW_LONG, DOW_SHORT, esc, uid, dowOf } from '../utils.js';
import { ICON, openSheet, closeSheet, toast } from '../ui.js';

let viewMonday = null;

function progressCard() {
  const pw = programWeek(todayISO());
  const end = addDays(PROGRAM.startDate, PROGRAM.weeks * 7 - 1);
  const segs = Array.from({ length: PROGRAM.weeks }, (_, i) => {
    const w = i + 1;
    const cls = [PROGRAM.deloadWeeks.includes(w) ? 'deload' : '', pw.week > w || pw.after ? 'past' : '', pw.week === w ? 'now' : ''].join(' ');
    return `<div class="wk ${cls}" title="Week ${w}${PROGRAM.deloadWeeks.includes(w) ? ' (deload)' : ''}"><span>${w}</span></div>`;
  }).join('');
  let status;
  if (pw.before) status = `Starts ${fmtDate(PROGRAM.startDate)} · in ${pw.daysUntil} day${pw.daysUntil === 1 ? '' : 's'}`;
  else if (pw.after) status = 'Program complete — nice work!';
  else status = `Week ${pw.week} of ${PROGRAM.weeks}${pw.deload ? ' · deload week' : ''}`;
  return `<section class="card">
    <div class="row-between"><h2>${esc(PROGRAM.name)}</h2><span class="muted small">${fmtDate(PROGRAM.startDate, { weekday: false })} – ${fmtDate(end, { weekday: false, year: true })}</span></div>
    <p class="muted">${status}</p>
    <div class="weeks">${segs}</div>
    <div class="legend"><span><i class="lg now"></i>This week</span><span><i class="lg deload"></i>Deload (weeks ${PROGRAM.deloadWeeks.join(', ')})</span></div>
  </section>`;
}

export function renderSchedule(el) {
  const today = todayISO();
  if (!viewMonday) viewMonday = mondayOf(today);
  const items = scheduleSorted();
  const pw = programWeek(viewMonday);
  const logged = sessionsInWeek(viewMonday);
  const mode = store.state.settings.planMode;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(viewMonday, i);
    const dow = dowOf(date);
    const its = items.filter((s) => s.dow === dow);
    const done = logged.filter((s) => s.date === date);
    const chips = its.map((s) => {
      const w = getWorkout(s.workout);
      const isDone = done.some((x) => x.workoutId === s.workout);
      return `<button class="sess ${s.workout} ${isDone ? 'done' : ''}" data-act="edit" data-id="${s.id}">
        <span class="sess-time">${s.time}–${addMinutes(s.time, w.durationMin)}</span>
        <span class="sess-name">${esc(w.name)}</span>
        ${isDone ? `<span class="sess-done">${ICON.check}</span>` : ''}
      </button>`;
    }).join('');
    const extra = done.filter((x) => !its.some((s) => s.workout === x.workoutId))
      .map((x) => `<span class="sess logged-only">${ICON.check} ${esc(getWorkout(x.workoutId).short)} logged</span>`).join('');
    return `<div class="day ${date === today ? 'today' : ''} ${its.length ? '' : 'rest'}">
      <div class="day-label"><b>${DOW_SHORT[dow]}</b><span>${date.slice(8).replace(/^0/, '')}</span></div>
      <div class="day-body">${chips}${extra}${its.length || extra ? '' : '<span class="muted small">Rest</span>'}</div>
    </div>`;
  }).join('');

  el.innerHTML = `${progressCard()}
  <section class="card">
    <div class="row-between"><h2>Weekly plan</h2>
      <div class="seg small inline">
        <button class="${mode === '3day' ? 'on' : ''}" data-act="mode" data-mode="3day">3 days</button>
        <button class="${mode === '4day' ? 'on' : ''}" data-act="mode" data-mode="4day">4 days</button>
      </div>
    </div>
    <div class="week-nav">
      <button class="icon-btn" data-act="wk" data-d="-7" aria-label="Previous week">${ICON.chevL}</button>
      <div class="wk-title"><b>${pw.before ? 'Before program' : pw.after ? 'After program' : `Week ${pw.week}`}</b>
        ${pw.deload ? '<span class="chip deload">Deload</span>' : ''}
        <span class="muted small">${fmtDate(viewMonday, { weekday: false })} – ${fmtDate(addDays(viewMonday, 6), { weekday: false })}</span></div>
      <button class="icon-btn" data-act="wk" data-d="7" aria-label="Next week">${ICON.chevR}</button>
    </div>
    <div class="days">${days}</div>
    <button class="btn ghost block" data-act="add">${ICON.plus} Add session</button>
    <p class="muted small center">Times are JST. Tap a session to change its day or time. Changes apply to every week.</p>
  </section>`;
}

function editSheet(item, isNew) {
  const w = item.workout;
  openSheet(`<div class="sheet-head"><h2>${isNew ? 'Add session' : 'Edit session'}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Close">${ICON.close}</button></div>
    <form class="edit-form" data-id="${item.id}">
      <div class="field"><span>Workout</span>
        <div class="seg">${Object.values(PROGRAM.workouts).map((x) => `<button type="button" class="${x.id === w ? 'on' : ''}" data-act="f-workout" data-w="${x.id}">${esc(x.name)}</button>`).join('')}</div>
      </div>
      <div class="field"><span>Day</span>
        <div class="dow-pick">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<button type="button" class="${d === item.dow ? 'on' : ''}" data-act="f-dow" data-dow="${d}" aria-label="${DOW_LONG[d]}">${DOW_SHORT[d].slice(0, 2)}</button>`).join('')}</div>
      </div>
      <label class="field"><span>Start time (JST)</span><input type="time" name="time" value="${item.time}" step="300" required></label>
      <p class="muted small ends">Ends ${addMinutes(item.time, getWorkout(w).durationMin)} (~${getWorkout(w).durationMin} min)</p>
      <button type="button" class="btn primary block" data-act="f-save">${ICON.check} Save</button>
      ${isNew ? '' : `<button type="button" class="btn danger block" data-act="f-delete">${ICON.trash} Remove session</button>`}
    </form>`, (e) => sheetEvent(e, item, isNew));
}

function sheetEvent(e, item, isNew) {
  const form = document.querySelector('#sheet .edit-form');
  const b = e.target.closest('[data-act]');
  const updateEnds = () => { form.querySelector('.ends').textContent = `Ends ${addMinutes(form.time.value || item.time, getWorkout(item.workout).durationMin)} (~${getWorkout(item.workout).durationMin} min)`; };
  if (e.type === 'change' && e.target.name === 'time') return updateEnds();
  if (!b || e.type !== 'click') return;
  const act = b.dataset.act;
  if (act === 'f-workout') { item.workout = b.dataset.w; form.querySelectorAll('[data-act="f-workout"]').forEach((x) => x.classList.toggle('on', x === b)); updateEnds(); }
  if (act === 'f-dow') { item.dow = +b.dataset.dow; form.querySelectorAll('[data-act="f-dow"]').forEach((x) => x.classList.toggle('on', x === b)); }
  if (act === 'f-save') {
    item.time = form.time.value || item.time;
    const list = store.state.schedule.items;
    if (isNew) list.push(item); else Object.assign(list.find((s) => s.id === item.id), item);
    store.commit({ kind: 'schedule' });
    closeSheet(); toast(`${getWorkout(item.workout).short} · ${DOW_SHORT[item.dow]} ${item.time} saved`);
  }
  if (act === 'f-delete') {
    store.state.schedule.items = store.state.schedule.items.filter((s) => s.id !== item.id);
    store.commit({ kind: 'schedule' });
    closeSheet(); toast('Session removed');
  }
}

export function scheduleClick(e, el, rerender) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'wk') { viewMonday = addDays(viewMonday, +b.dataset.d); return rerender(); }
  if (act === 'mode') {
    const mode = b.dataset.mode;
    if (mode === store.state.settings.planMode) return;
    const label = mode === '4day' ? '4-day plan (Tue, Thu, Sat, Sun)' : '3-day plan (Tue, Thu, Sun)';
    if (!confirm(`Switch to the ${label}? Your weekly sessions will be reset to that template at 20:00.`)) return;
    store.resetSchedule(mode); toast('Schedule updated'); return rerender();
  }
  if (act === 'edit') {
    const item = store.state.schedule.items.find((s) => s.id === b.dataset.id);
    if (item) editSheet({ ...item }, false);
  }
  if (act === 'add') editSheet({ id: uid(), dow: 6, time: '20:00', workout: 'kb' }, true);
}
