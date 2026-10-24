import { PROGRAM, getWorkout, repRange, repLabel, restLabel, resolveSlot, MUSCLES, setsLabel, sideOf } from '../program.js';
import { store } from '../store.js';
import { prefillSets, lastFor, readyToProgress, nextWeight, sessionExercises, programWeek, scheduledOn, nextScheduled, bestFor } from '../logic.js';
import { todayISO, fmtDate, addMinutes, esc, fmtKg, uid, DOW_SHORT } from '../utils.js';
import { ICON, toast, openSheet, closeSheet, startRest, stopRest, keepAwake } from '../ui.js';
import { bodyMap, exerciseLevels, combinedLevels } from '../muscles.js';
import { canWatch, openWatch } from '../watch.js';

const r2 = (n) => Math.round(n * 100) / 100;

function defaultWorkout() {
  const today = todayISO();
  const s = scheduledOn(today)[0];
  if (s) return s.workout;
  return nextScheduled(today)?.item.workout || 'kb';
}

function newDraft(workoutId) {
  return { id: uid(), workoutId, date: todayISO(), startedAt: Date.now(), choices: {}, optionalOn: {}, sets: {} };
}

function draftHasProgress(d) {
  return d && Object.values(d.sets).some((arr) => arr.some((s) => s.done));
}

function getDraft() {
  let d = store.state.draft;
  // A stale, untouched draft from another day gets refreshed.
  if (d && d.date !== todayISO() && !draftHasProgress(d)) d = null;
  if (!d) { d = newDraft(defaultWorkout()); store.state.draft = d; }
  for (const ex of activeExercises(d, true)) ensureSets(d, ex);
  return d;
}

function ensureSets(d, ex) {
  let arr = d.sets[ex.id];
  if (!Array.isArray(arr)) arr = d.sets[ex.id] = prefillSets(ex);
  // Planned set count can change (e.g. pull slot 4 sets ↔ "Both free" 3 sets, or an older saved draft):
  if (arr.length < ex.sets) arr.push(...prefillSets(ex).slice(arr.length));
  while (arr.length > ex.sets && !arr[arr.length - 1].done) arr.pop();
  return arr;
}

function activeExercises(d, includeOptional = false) {
  return sessionExercises(d.workoutId, d, includeOptional);
}

function saveDraft() { store.commit({ kind: 'draft' }); }

function counts(d) {
  let done = 0, total = 0;
  for (const ex of activeExercises(d)) {
    const arr = ensureSets(d, ex);
    total += arr.length; done += arr.filter((s) => s.done).length;
  }
  return { done, total };
}

// ---------------- render ----------------
export function renderLog(el) {
  const d = getDraft();
  const w = getWorkout(d.workoutId);
  const today = todayISO();
  const pw = programWeek(d.date);
  const sched = scheduledOn(today);
  const thisSched = sched.find((s) => s.workout === d.workoutId) || sched[0];
  const next = nextScheduled(today);
  const { done, total } = counts(d);
  const allEx = sessionExercises(d.workoutId, d, true);

  let schedLine;
  if (thisSched) schedLine = `Scheduled today ${thisSched.time}–${addMinutes(thisSched.time, getWorkout(thisSched.workout).durationMin)} · ~${w.durationMin} min`;
  else if (next) schedLine = `Rest day · next: ${DOW_SHORT[next.item.dow]} ${next.item.time} ${getWorkout(next.item.workout).short}`;
  else schedLine = `~${w.durationMin} min`;

  const weekChip = pw.before ? `<span class="chip">Program starts in ${pw.daysUntil} day${pw.daysUntil === 1 ? '' : 's'}</span>`
    : pw.after ? '<span class="chip">Program complete</span>'
    : `<span class="chip">Week ${pw.week} of ${PROGRAM.weeks}</span>${pw.deload ? '<span class="chip deload">Deload</span>' : ''}`;

  el.innerHTML = `
  <section class="hero card">
    <div class="eyebrow">${fmtDate(today)} ${weekChip}</div>
    <h1>${esc(w.name)}</h1>
    <p class="muted">${esc(schedLine)}</p>
    <div class="seg" role="tablist" aria-label="Workout">
      ${Object.values(PROGRAM.workouts).map((x) => `<button role="tab" class="${x.id === d.workoutId ? 'on' : ''}" data-act="pick-workout" data-w="${x.id}">${esc(x.name)}</button>`).join('')}
    </div>
    <div class="progress"><div class="progress-fill" style="transform:scaleX(${total ? done / total : 0})"></div></div>
    <div class="hero-foot">
      <span class="muted"><b class="sets-done">${done}</b> / <span class="sets-total">${total}</span> sets</span>
      <button class="btn small ghost" data-act="session-map">${ICON.body} Session muscles</button>
    </div>
  </section>
  ${pw.deload ? `<div class="note deload-note">${esc(PROGRAM.deloadHint)}</div>` : ''}
  ${d.date !== today ? `<div class="note">Unsaved workout from ${fmtDate(d.date)} — save or discard it below.</div>` : ''}
  <div class="ex-list">
    ${w.exercises.map((slot) => slotHtml(d, slot)).join('')}
  </div>
  <section class="card finish">
    <label class="field"><span>Workout date</span><input type="date" data-f="date" value="${d.date}" max="${today}"></label>
    <button class="btn primary block" data-act="save">${ICON.check} Finish &amp; save workout</button>
    <button class="btn ghost block" data-act="discard">Discard</button>
  </section>`;
  keepAwake(true);
}

function slotHtml(d, slot) {
  if (!slot.options) return exerciseCard(d, slot, { ...slot, workout: d.workoutId });
  const choice = slotChoice(slot, d.choices[slot.id]);
  const exs = resolveSlot(slot, choice, d.workoutId);
  const btns = [...slot.options.map((o) => [o.id, o.name]), ...(slot.bothSets ? [['both', slot.bothLabel || 'Both']] : [])];
  const sub = choice === 'both' ? `${slot.bothSets} sets of each` : `${slot.sets} × ${repLabel(slot)}`;
  return `<section class="slot card" data-slot="${slot.id}">
    <div class="slot-head"><b>${esc(slot.name)} slot</b><span class="muted small">${esc(slot.hint || 'Pick one')} · ${esc(sub)}</span></div>
    <div class="seg small slot-pick" role="radiogroup" aria-label="${esc(slot.name)} slot">${btns.map(([id, label]) => `<button role="radio" aria-checked="${id === choice}" class="${id === choice ? 'on' : ''}" data-act="pick-option" data-slot="${slot.id}" data-opt="${id}">${esc(label)}</button>`).join('')}</div>
  </section>
  ${exs.map((ex) => exerciseCard(d, slot, ex)).join('')}`;
}

function slotChoice(slot, c) {
  if (c === 'both' && slot.bothSets) return 'both';
  return slot.options.some((o) => o.id === c) ? c : slot.options[0].id;
}

function exerciseCard(d, slot, ex) {
  const isOff = slot.optional && !d.optionalOn[slot.id];
  const sets = ensureSets(d, ex);
  const last = lastFor(ex.id);
  const ready = readyToProgress(ex);
  const allDone = sets.length && sets.every((s) => s.done);
  const target = `${setsLabel(ex)}${ex.bodyweight ? ' · bodyweight' : ex.weight != null ? ` · ${fmtKg(ex.weight)} kg` : ''}`;
  const lastTxt = last ? `Last ${fmtDate(last.date, { weekday: false })}: ${last.sets.map((s) => (ex.bodyweight || s.weight == null ? s.reps : `${fmtKg(s.weight)}×${s.reps}`)).join(', ')}`
    : ex.bodyweight ? 'First time' : ex.weight == null ? 'First time — type the weight you use' : 'First time — plan weight prefilled';
  let readyHtml = '';
  const lw0 = ready ? (last.sets[0].weight ?? ex.weight) : null;
  if (ready && !ex.bodyweight && lw0 == null) readyHtml = `<span class="badge ready">${ICON.up} Ready to progress · add weight</span>`;
  else if (ready && !ex.bodyweight) {
    const lw = lw0;
    const nw = nextWeight(ex, lw);
    readyHtml = `<button class="badge ready" data-act="progress" data-ex="${ex.id}" data-w="${nw.weight}">${ICON.up} Ready to progress · tap for ${fmtKg(nw.weight)} kg${nw.kb && nw.kb !== nw.weight ? ` (or ${fmtKg(nw.kb)} kg bell)` : ''}</button>`;
  } else if (ready) readyHtml = `<span class="badge ready">${ICON.up} Ready to progress · add reps</span>`;

  return `<article class="ex card ${allDone ? 'all-done' : ''} ${isOff ? 'off' : ''} ${slot.options ? 'in-slot' : ''}" data-ex="${ex.id}" data-slot="${slot.id}">
    <header class="ex-head">
      <button class="ex-title" data-act="ex-map" data-ex="${ex.id}" aria-label="Show muscles for ${esc(ex.name)}">
        <span class="ex-name">${esc(ex.name)}${slot.optional ? ' <span class="tag">optional</span>' : ''}</span>
        <span class="ex-target">${esc(target)} · rest ${restLabel(ex.rest)}</span>
        <span class="ex-muscles">${ex.primary.map((m) => MUSCLES[m]).join(', ')}</span>
      </button>
      ${slot.optional
        ? `<label class="switch" aria-label="Include ${esc(ex.name)}"><input type="checkbox" data-act="toggle-opt" data-slot="${slot.id}" ${isOff ? '' : 'checked'}><span></span></label>`
        : `<button class="icon-btn" data-act="ex-map" data-ex="${ex.id}" aria-label="Muscles">${ICON.body}</button>`}
    </header>
    ${isOff ? '' : `
    <div class="ex-meta">${canWatch(ex.id) ? `<button class="watch-btn" data-act="watch" data-ex="${ex.id}" aria-label="Watch how to do ${esc(ex.name)}">${ICON.play} Watch</button>` : ''}${readyHtml}<span class="muted small">${esc(lastTxt)}</span>${ex.note ? `<span class="muted small">${esc(ex.note)}</span>` : ''}</div>
    <div class="sets ${ex.bodyweight ? 'bw' : ''}">
      <div class="set-head"><span>Set</span>${ex.bodyweight ? '' : '<span>Weight kg</span>'}<span>Reps${sideOf(ex) ? ` / ${sideOf(ex)}` : ''}</span><span></span></div>
      ${sets.map((s, i) => setRow(ex, s, i)).join('')}
    </div>`}
  </article>`;
}

function setRow(ex, s, i) {
  const step = ex.step || 2.5;
  return `<div class="set-row ${s.done ? 'done' : ''}" data-i="${i}">
    <span class="set-no">${i + 1}</span>
    ${ex.bodyweight ? '' : `<div class="stepper">
      <button data-act="step" data-f="weight" data-d="${-step}" aria-label="Less weight">${ICON.minus}</button>
      <input inputmode="decimal" enterkeyhint="done" data-f="weight" value="${s.weight ?? ''}" placeholder="kg" aria-label="Weight set ${i + 1}">
      <button data-act="step" data-f="weight" data-d="${step}" aria-label="More weight">${ICON.plus}</button>
    </div>`}
    <div class="stepper">
      <button data-act="step" data-f="reps" data-d="-1" aria-label="Fewer reps">${ICON.minus}</button>
      <input inputmode="numeric" enterkeyhint="done" data-f="reps" value="${s.reps ?? ''}" aria-label="Reps set ${i + 1}">
      <button data-act="step" data-f="reps" data-d="1" aria-label="More reps">${ICON.plus}</button>
    </div>
    <button class="done-btn" data-act="done" aria-pressed="${s.done}" aria-label="Set ${i + 1} done">${ICON.check}</button>
  </div>`;
}

// ---------------- events ----------------
function exFromCard(d, card) {
  const id = card.dataset.ex;
  return sessionExercises(d.workoutId, d, true).find((e) => e.id === id);
}

function updateCounters(el, d) {
  const { done, total } = counts(d);
  el.querySelector('.sets-done').textContent = done;
  el.querySelector('.sets-total').textContent = total;
  el.querySelector('.progress-fill').style.transform = `scaleX(${total ? done / total : 0})`;
}

export function logClick(e, el, rerender) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const d = store.state.draft;
  const act = b.dataset.act;
  const card = b.closest('.ex');

  if (act === 'pick-workout') {
    if (b.dataset.w === d.workoutId) return;
    if (draftHasProgress(d) && !confirm('Switch workout? Sets you have marked done will be cleared.')) return;
    store.state.draft = newDraft(b.dataset.w); saveDraft(); stopRest(); return rerender();
  }
  if (act === 'pick-option') {
    const slot = getWorkout(d.workoutId).exercises.find((x) => x.id === b.dataset.slot);
    const prev = slot ? resolveSlot(slot, d.choices[slot.id], d.workoutId) : [];
    const lost = prev.filter((ex) => !resolveSlot(slot, b.dataset.opt, d.workoutId).some((n) => n.id === ex.id) && (d.sets[ex.id] || []).some((s) => s.done));
    if (lost.length && !confirm(`${lost.map((x) => x.name).join(' & ')} has sets marked done. Switch anyway? Those sets won't be saved.`)) return;
    d.choices[b.dataset.slot] = b.dataset.opt; saveDraft(); return rerender();
  }
  if (act === 'session-map') return showSessionMap(d);
  if (act === 'ex-map') { const ex = exFromCard(d, card); return showExerciseMap(ex, watchList(d, card.dataset.slot, ex)); }
  if (act === 'watch') return watchFromCard(d, card);
  if (act === 'progress') {
    const ex = exFromCard(d, card);
    ensureSets(d, ex).forEach((s) => { if (!s.done) s.weight = +b.dataset.w; });
    saveDraft(); toast(`${ex.name}: ${fmtKg(+b.dataset.w)} kg`); return rerender();
  }
  if (act === 'step' || act === 'done') {
    const ex = exFromCard(d, card);
    const row = b.closest('.set-row');
    const i = +row.dataset.i;
    const s = ensureSets(d, ex)[i];
    if (act === 'step') {
      const f = b.dataset.f;
      const cur = s[f] == null || s[f] === '' ? (f === 'weight' ? 0 : 0) : +s[f];
      s[f] = Math.max(0, r2(cur + +b.dataset.d));
      row.querySelector(`input[data-f="${f}"]`).value = s[f];
    } else {
      s.done = !s.done;
      row.classList.toggle('done', s.done);
      b.setAttribute('aria-pressed', s.done);
      if (s.done) {
        // carry the weight forward to the following un-done sets
        const arr = ensureSets(d, ex);
        for (let j = i + 1; j < arr.length; j++) if (!arr[j].done && !ex.bodyweight) {
          arr[j].weight = s.weight;
          const inp = el.querySelector(`.ex[data-ex="${ex.id}"] .set-row[data-i="${j}"] input[data-f="weight"]`);
          if (inp) inp.value = s.weight ?? '';
        }
        startRest(ex.rest, ex.name);
        if (navigator.vibrate && store.state.settings.vibrate) navigator.vibrate(30);
      }
      card.classList.toggle('all-done', ensureSets(d, ex).every((x) => x.done));
      updateCounters(el, d);
    }
    saveDraft();
    return;
  }
  if (act === 'save') return saveWorkout(rerender);
  if (act === 'discard') {
    if (!confirm('Discard this workout? Nothing will be saved.')) return;
    store.state.draft = null; saveDraft(); stopRest(); toast('Workout discarded'); return rerender();
  }
}

export function logChange(e, el, rerender) {
  const t = e.target;
  const d = store.state.draft;
  if (t.dataset.act === 'toggle-opt') { d.optionalOn[t.dataset.slot] = t.checked; saveDraft(); return rerender(); }
  if (t.dataset.f === 'date') { d.date = t.value || todayISO(); saveDraft(); return; }
  if (t.dataset.f === 'weight' || t.dataset.f === 'reps') {
    const card = t.closest('.ex'); const row = t.closest('.set-row');
    const ex = exFromCard(d, card);
    const s = ensureSets(d, ex)[+row.dataset.i];
    const v = t.value.replace(',', '.').trim();
    s[t.dataset.f] = v === '' ? null : Math.max(0, r2(+v || 0));
    saveDraft();
  }
}

function saveWorkout(rerender) {
  const d = store.state.draft;
  const exs = activeExercises(d);
  let doneCount = exs.reduce((n, ex) => n + ensureSets(d, ex).filter((s) => s.done).length, 0);
  if (!doneCount) {
    if (!confirm('No sets are marked done yet. Mark every set as done and save?')) return;
    exs.forEach((ex) => ensureSets(d, ex).forEach((s) => (s.done = true)));
  }
  const session = {
    id: d.id,
    workoutId: d.workoutId,
    date: d.date,
    startedAt: d.startedAt,
    savedAt: Date.now(),
    durationMin: Math.round((Date.now() - d.startedAt) / 60000),
    exercises: exs.map((ex) => ({
      id: ex.id, name: ex.name,
      sets: ensureSets(d, ex).filter((s) => s.done).map((s) => ({ reps: s.reps ?? 0, weight: ex.bodyweight ? null : s.weight ?? null })),
    })).filter((e) => e.sets.length),
  };
  store.state.draft = null;
  store.saveSession(session);
  stopRest(); keepAwake(false);
  const sets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  toast(`Saved · ${sets} sets logged`);
  rerender();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------- muscle sheets ----------------
export function muscleListHtml(ex) {
  return `<div class="mlist">
    <div><span class="dot p"></span><b>Primary</b> ${ex.primary.map((m) => MUSCLES[m]).join(', ') || '—'}</div>
    ${ex.secondary?.length ? `<div><span class="dot s"></span><b>Secondary</b> ${ex.secondary.map((m) => MUSCLES[m]).join(', ')}</div>` : ''}
  </div>`;
}

export function watchHtml(ex) {
  return canWatch(ex.id) ? `<button class="btn block watch-open" data-act="watch" data-ex="${esc(ex.id)}">${ICON.play} Watch how it's done</button>` : '';
}

export function showExerciseMap(ex, list = [ex]) {
  const best = bestFor(ex.id);
  openSheet(`<div class="sheet-head"><div><h2>${esc(ex.name)}</h2><p class="muted">${setsLabel(ex)}${best ? ` · best ${fmtKg(best.weight)} kg × ${best.reps}` : ''}</p></div><button class="icon-btn" data-act="sheet-close" aria-label="Close">${ICON.close}</button></div>
    ${bodyMap(exerciseLevels(ex))}${muscleListHtml(ex)}${watchHtml(ex)}`, (e) => {
    if (e.type === 'click' && e.target.closest('[data-act="watch"]')) { closeSheet(); openWatch(list, ex.id); }
  });
}

// ▶ Watch: a card inside the pull slot offers the slot's current choice(s) — row, pulldown, or both when "Both free".
function watchFromCard(d, card) {
  const ex = exFromCard(d, card);
  if (!ex) return;
  openWatch(watchList(d, card.dataset.slot, ex), ex.id);
}

function watchList(d, slotId, ex) {
  const slot = getWorkout(d.workoutId).exercises.find((x) => x.id === slotId);
  if (!slot?.options) return [{ id: ex.id, name: ex.name }];
  return resolveSlot(slot, slotChoice(slot, d.choices[slot.id]), d.workoutId).map((x) => ({ id: x.id, name: x.name }));
}

export function showSessionMap(d) {
  const exs = activeExercises(d);
  const w = getWorkout(d.workoutId);
  const lv = combinedLevels(exs);
  const prim = Object.keys(lv).filter((m) => lv[m] >= 1);
  const sec = Object.keys(lv).filter((m) => lv[m] < 1);
  openSheet(`<div class="sheet-head"><div><h2>${esc(w.name)}</h2><p class="muted">Combined map · ${exs.length} exercises</p></div><button class="icon-btn" data-act="sheet-close" aria-label="Close">${ICON.close}</button></div>
    ${bodyMap(lv)}${muscleListHtml({ primary: prim, secondary: sec })}`);
}
