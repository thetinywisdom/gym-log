// QA run: node tests/qa.mjs [baseUrl]   (needs playwright-core + a Chrome/Chromium binary)
import { chromium } from 'playwright-core';
import fs from 'fs';
const BASE = process.argv[2] || 'http://localhost:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const errors = [];
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); if (!cond) process.exitCode = 1; };

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('dialog', (d) => d.accept());

await page.goto(BASE + '#/log');
await page.waitForSelector('.ex');
const wName = await page.textContent('.hero h1');
ok('Log defaults to scheduled workout', /Kettlebell/.test(wName), wName);

// --- log a full KB session ---
const card = (id) => page.locator(`.ex[data-ex="${id}"]`);
// goblet squat: bump weight on set 1 (+2.5 → 18) then done → carries to set 2/3
await card('goblet-squat').locator('.set-row[data-i="0"] [data-act="step"][data-f="weight"][data-d="2.5"]').tap();
const gw = await card('goblet-squat').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue();
ok('Weight stepper +2.5', gw === '18', gw);
// manual reps entry
const repIn = card('kb-swing').locator('.set-row[data-i="2"] input[data-f="reps"]');
await repIn.fill('14'); await repIn.blur();
// done KB swing sets
for (let i = 0; i < 3; i++) await card('kb-swing').locator(`.set-row[data-i="${i}"] [data-act="done"]`).tap();
ok('Rest timer shows after set', await page.isVisible('#restbar.show'));
const restTxt = await page.textContent('#restbar .rest-range');
ok('Rest timer uses KB rest default', restTxt === '60–90s', restTxt);
await card('goblet-squat').locator('.set-row[data-i="0"] [data-act="done"]').tap();
const carried = await card('goblet-squat').locator('.set-row[data-i="2"] input[data-f="weight"]').inputValue();
ok('Done carries weight to next sets', carried === '18', carried);
ok('Rest timer switches to squat rest', (await page.textContent('#restbar .rest-range')) === '90–120s');
await card('goblet-squat').locator('.set-row[data-i="1"] [data-act="done"]').tap();
await card('goblet-squat').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -140));
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + '01-log-mid-workout.png' });
const tgt = async (id) => (await card(id).locator('.ex-target').textContent()).trim();
ok('KB Oblique: 3 × 12 each side · 15.5 kg', /^3 × 12 each side · 15\.5 kg/.test(await tgt('kb-oblique')), await tgt('kb-oblique'));
ok('KB Around: 3 × 12 each direction · 15.5 kg', /^3 × 12 each direction · 15\.5 kg/.test(await tgt('kb-around')), await tgt('kb-around'));
ok('Oblique/Around prefill 15.5', (await card('kb-oblique').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '15.5' && (await card('kb-around').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '15.5');
ok('Reverse Lunge: 3 × 8 each leg · 11 kg + goblet note', /^3 × 8 each leg · 11 kg/.test(await tgt('reverse-lunge')) && /Goblet hold at chest/.test(await card('reverse-lunge').textContent()), await tgt('reverse-lunge'));
ok('Reps header says / side', /Reps \/ side/.test(await card('kb-oblique').locator('.set-head').textContent()));
ok('KB Hammer Curl still optional on KB day', (await card('kb-hammer-curl').locator('[data-act="toggle-opt"]').count()) === 1);
ok('Push Up is reps-only', (await card('push-up').locator('input[data-f="weight"]').count()) === 0);

// draft persists across reload mid-workout
await page.reload(); await page.waitForSelector('.ex');
const doneAfterReload = await page.locator('.set-row.done').count();
ok('In-progress workout survives reload', doneAfterReload === 5, `${doneAfterReload} done sets`);

// optional exercise toggle
await card('kb-triceps-ext').locator('[data-act="toggle-opt"]').check();
await page.waitForTimeout(200);
ok('Optional exercise can be toggled on', (await card('kb-triceps-ext').locator('.set-row').count()) === 2);

// per-exercise muscle map
await card('kb-rdl').locator('.ex-title').tap();
await page.waitForSelector('#sheet.open .body-svg');
await page.waitForTimeout(350);
const prim = await page.$$eval('#sheet .m.primary', (els) => [...new Set(els.map((e) => e.dataset.m))].sort());
const sec = await page.$$eval('#sheet .m.on:not(.primary)', (els) => [...new Set(els.map((e) => e.dataset.m))].sort());
ok('RDL map: primary = glutes, hamstrings', prim.join() === 'glutes,hamstrings', prim.join());
ok('RDL map: secondary = forearms, lowerBack', sec.join() === 'forearms,lowerBack', sec.join());
await page.screenshot({ path: SHOTS + '03-exercise-muscle-map.png' });
await page.tap('#sheet [data-act="sheet-close"]'); await page.waitForTimeout(300);

// session muscle map
await page.evaluate(() => window.scrollTo(0, 0));
await page.tap('[data-act="session-map"]');
await page.waitForSelector('#sheet.open .body-svg'); await page.waitForTimeout(350);
const sprim = await page.$$eval('#sheet .m.primary', (els) => [...new Set(els.map((e) => e.dataset.m))].sort());
ok('Session map has combined primaries', ['glutes', 'hamstrings', 'quads', 'obliques', 'abs', 'chest', 'triceps'].every((m) => sprim.includes(m)), sprim.join());
await page.screenshot({ path: SHOTS + '04-session-muscle-map.png' });
await page.tap('#sheet [data-act="sheet-close"]'); await page.waitForTimeout(300);

// all muscle groups exist in the SVG
const ids = await page.evaluate(async () => { const m = await import('./js/muscles.js'); const d = document.createElement('div'); d.innerHTML = m.bodyMap({}); return [...new Set([...d.querySelectorAll('.m')].map((p) => p.dataset.m))]; });
ok('SVG has all 19 muscle groups', ids.length === 19, ids.length + '');

// finish all remaining sets and save
const remaining = page.locator('.set-row:not(.done) [data-act="done"]');
while (await remaining.count()) await remaining.first().tap();
await page.tap('[data-act="save"]');
await page.waitForSelector('#toast.show');
ok('Save toast', /Saved · 25 sets/.test(await page.textContent('#toast')), await page.textContent('#toast'));

// ready to progress badge (all KB swing sets hit 15? set 3 was 14 → not ready; goblet squat 10/10/10 → ready)
await page.waitForTimeout(300);
ok('Ready-to-progress badge on Goblet Squat', await card('goblet-squat').locator('.badge.ready').count() === 1);
ok('No badge on KB Swing (one set missed top reps)', await card('kb-swing').locator('.badge.ready').count() === 0);
const gsw = await card('goblet-squat').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue();
ok('Next session prefills last logged weight', gsw === '18', gsw);

// --- schedule edits ---
await page.goto(BASE + '#/schedule'); await page.waitForSelector('.days');
await page.tap('[data-act="mode"][data-mode="4day"]');
ok('4-day toggle gives 4 sessions', (await page.locator('.sess:not(.logged-only)').count()) === 4);
await page.tap('[data-act="mode"][data-mode="3day"]');
ok('Back to 3-day', (await page.locator('.sess:not(.logged-only)').count()) === 3);
// move Tue KB session to Wed 19:30
await page.locator('.day', { hasText: 'Tue' }).locator('.sess').tap();
await page.waitForSelector('#sheet.open .edit-form');
await page.tap('#sheet [data-act="f-dow"][data-dow="3"]');
await page.fill('#sheet input[name="time"]', '19:30');
await page.tap('#sheet [data-act="f-save"]'); await page.waitForTimeout(300);
// add a Saturday upper session
await page.tap('[data-act="add"]'); await page.waitForSelector('#sheet.open .edit-form');
await page.tap('#sheet [data-act="f-workout"][data-w="upper"]');
await page.fill('#sheet input[name="time"]', '10:00');
await page.tap('#sheet [data-act="f-save"]'); await page.waitForTimeout(300);
// remove Sunday session? keep; check next week view for deload label
await page.reload(); await page.waitForSelector('.days');
const wed = await page.locator('.day', { hasText: 'Wed' }).textContent();
ok('Schedule edit persisted after reload (Wed 19:30)', /19:30–20:35/.test(wed), wed.replace(/\s+/g, ' ').trim());
ok('Added Sat session persisted', /10:00–10:55/.test(await page.locator('.day', { hasText: 'Sat' }).textContent()));
ok('Sat 24 shows logged workout', /logged/.test(await page.locator('.day', { hasText: 'Sat' }).textContent()));
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: SHOTS + '02-schedule.png' });
for (let i = 0; i < 4; i++) await page.tap('[data-act="wk"][data-d="7"]');
ok('Week 4 shows Deload label', /Week 4/.test(await page.textContent('.wk-title')) && (await page.locator('.wk-title .chip.deload').count()) === 1);

// --- history after reload ---
await page.goto(BASE + '#/history'); await page.reload(); await page.waitForSelector('.view');
ok('History shows saved workout after reload', (await page.locator('.hist').count()) === 1);
await page.tap('.hist-head'); await page.waitForTimeout(200);
await page.tap('[data-act="mode"][data-mode="exercises"]');
await page.locator('.list-row', { hasText: 'Goblet Squat' }).tap();
await page.waitForSelector('#sheet.open');
ok('Exercise history shows best weight', /Best 18 kg × 10/.test(await page.textContent('#sheet')));
await page.screenshot({ path: SHOTS + '06-exercise-history.png' });
await page.tap('#sheet [data-act="sheet-close"]'); await page.waitForTimeout(300);

// weekly muscle view
await page.goto(BASE + '#/muscles'); await page.tap('[data-act="m-mode"][data-mode="week"]');
ok('Weekly view has set bars', (await page.locator('.bar-row').count()) > 5);
await page.screenshot({ path: SHOTS + '05-weekly-muscles.png', fullPage: false });
await page.tap('[data-act="m-mode"][data-mode="exercise"]');
await page.locator('.pill', { hasText: 'Lat Pulldown' }).tap();
ok('Exercise picker: Lat Pulldown primary = lats', (await page.$$eval('#view .m.primary', (e) => [...new Set(e.map((x) => x.dataset.m))].join())) === 'lats');

// --- upper session: pull slot (Row / Pulldown / Both free), blank weights, 1.25 kg step ---
await page.goto(BASE + '#/log'); await page.waitForSelector('.ex');
await page.tap('[data-act="pick-workout"][data-w="upper"]');
const order = await page.$$eval('.ex', (els) => els.map((e) => e.dataset.ex));
ok('Upper order: press, pull(row), shoulder, fly, reverse fly, pushdown (no hammer curl)', order.join() === 'chest-press,iso-row,shoulder-press,chest-fly,reverse-fly,triceps-ext', order.join());
ok('Triceps renamed: Triceps Pushdown (cable), 3 × 8–10 · 21.25 kg', /Triceps Pushdown \(cable\)/.test(await card('triceps-ext').locator('.ex-title').textContent()) && /^3 × 8–10 · 21\.25 kg/.test((await card('triceps-ext').locator('.ex-target').textContent()).trim()));
ok('Fly notes: Pec-deck / Reverse pec-deck', /Pec-deck/.test(await card('chest-fly').textContent()) && /Reverse pec-deck/.test(await card('reverse-fly').textContent()));
ok('No old Fly/Pulldown either-or', (await page.locator('[data-opt="chest-fly"]').count()) === 0 && (await page.locator('.slot[data-slot="pull-slot"]').count()) === 1);
const pickLabels = await page.$$eval('.slot-pick button', (b) => b.map((x) => x.textContent.trim()));
ok('Pull slot picker: Row / Pulldown / Both free', pickLabels.join('|') === 'Iso-Lateral Row|Lat Pulldown|Both free', pickLabels.join('|'));
ok('Iso-Lateral Row alone = 4 sets @45', (await card('iso-row').locator('.set-row').count()) === 4 && (await card('iso-row').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '45');
ok('Chest Press rest shows 2 min', /rest 2 min/.test(await card('chest-press').locator('.ex-target').textContent()));
await page.tap('[data-act="pick-option"][data-opt="lat-pulldown"]');
ok('Lat Pulldown alone = 4 sets, iso row hidden', (await card('lat-pulldown').locator('.set-row').count()) === 4 && (await card('iso-row').count()) === 0);
const lpBlank = await card('lat-pulldown').locator('input[data-f="weight"]').evaluateAll((els) => els.every((e) => e.value === ''));
ok('Lat Pulldown weight starts blank', lpBlank);
ok('Chest Fly / Reverse Fly weight starts blank', (await card('chest-fly').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '' && (await card('reverse-fly').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '');
await card('chest-fly').locator('.set-row[data-i="0"] [data-act="step"][data-f="weight"][data-d="2.5"]').tap();
ok('Stepper from blank → 2.5', (await card('chest-fly').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '2.5');
const lpIn = card('lat-pulldown').locator('.set-row[data-i="0"] input[data-f="weight"]');
await lpIn.fill('52'); await lpIn.blur();
await page.tap('[data-act="pick-option"][data-opt="both"]');
ok('Both free = Row 3 sets + Pulldown 3 sets', (await card('iso-row').locator('.set-row').count()) === 3 && (await card('lat-pulldown').locator('.set-row').count()) === 3);
ok('Typed pulldown weight kept after switching', (await card('lat-pulldown').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '52');
await card('lat-pulldown').locator('.set-row[data-i="0"] [data-act="done"]').tap();
ok('Pull slot rest = 2 min', (await page.textContent('#restbar .rest-range')) === '2 min');
await card('chest-press').locator('.set-row[data-i="0"] [data-act="done"]').tap();
await page.locator('.slot').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));
await page.waitForTimeout(350);
await page.tap('#restbar [data-act="rest-skip"]'); await page.waitForTimeout(250);
await page.screenshot({ path: SHOTS + '07-upper-pull-slot.png' });
await card('triceps-ext').locator('.set-row[data-i="0"] [data-act="step"][data-f="weight"][data-d="1.25"]').tap();
ok('Triceps extension step is 1.25 kg', (await card('triceps-ext').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '22.5');
// fill remaining blank weights, finish everything, save
for (const id of ['chest-fly', 'reverse-fly']) for (let i = 0; i < 3; i++) { const inp = card(id).locator(`.set-row[data-i="${i}"] input[data-f="weight"]`); await inp.fill(id === 'chest-fly' ? '30' : '15'); await inp.blur(); }
{ const r = page.locator('.set-row:not(.done) [data-act="done"]'); while (await r.count()) await r.first().tap(); }
ok('Upper total sets with Both free = 3+3+3+3+3+3+3 = 21', (await page.textContent('.sets-total')) === '21');
await page.tap('[data-act="save"]'); await page.waitForSelector('#toast.show');
const upSaved = await page.evaluate(() => { const s = Object.values(JSON.parse(localStorage.getItem('fitlog.v1')).sessions).find((x) => x.workoutId === 'upper'); return Object.fromEntries(s.exercises.map((e) => [e.id, e.sets.length])); });
ok('Saved upper: iso-row 3 + lat-pulldown 3 logged separately', upSaved['iso-row'] === 3 && upSaved['lat-pulldown'] === 3, JSON.stringify(upSaved));
await page.waitForTimeout(300);
await page.tap('[data-act="pick-option"][data-opt="lat-pulldown"]');
ok('Next time Lat Pulldown prefills last weight (4 sets)', (await card('lat-pulldown').locator('.set-row').count()) === 4 && (await card('lat-pulldown').locator('.set-row[data-i="3"] input[data-f="weight"]').inputValue()) === '52');
ok('Next time Chest Fly prefills last weight', (await card('chest-fly').locator('.set-row[data-i="0"] input[data-f="weight"]').inputValue()) === '30');
await page.tap('[data-act="discard"]');
await page.goto(BASE + '#/history'); await page.tap('[data-act="mode"][data-mode="exercises"]');
ok('History per exercise: Lat Pulldown & Iso-Lateral Row listed separately', /1 session/.test(await page.locator('.list-row', { hasText: 'Lat Pulldown' }).textContent()) && /1 session/.test(await page.locator('.list-row', { hasText: 'Iso-Lateral Row' }).textContent()));
await page.goto(BASE + '#/schedule'); await page.waitForSelector('.days');
ok('Upper Body schedule default 20:00–20:55', /20:00–20:55/.test(await page.locator('.day', { hasText: 'Thu' }).textContent()));

// --- export / import ---
await page.goto(BASE + '#/settings'); await page.waitForSelector('[data-act="export"]');
const [dl] = await Promise.all([page.waitForEvent('download'), page.tap('[data-act="export"]')]);
const file = '/tmp/fitlog-export.json'; await dl.saveAs(file);
const exp = JSON.parse(fs.readFileSync(file, 'utf8'));
ok('Export contains session + schedule', Object.keys(exp.sessions).length === 2 && exp.schedule.items.length === 4, dl.suggestedFilename());
await page.tap('[data-act="reset"]'); await page.waitForTimeout(300);
ok('Reset clears data', (await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('fitlog.v1')).sessions).length)) === 0);
await page.setInputFiles('input[data-act="import"]', file); await page.waitForTimeout(500);
const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fitlog.v1')));
ok('Import restores sessions + schedule', Object.keys(after.sessions).length === 2 && after.schedule.items.length === 4);
const { firebaseConfig } = await page.evaluate(() => import('./firebase-config.js').then((m) => ({ firebaseConfig: m.firebaseConfig })));
if (firebaseConfig.apiKey) {
  await page.waitForSelector('[data-act="signin"]', { timeout: 10000 }).catch(() => {});
  ok('Sign-in button shown with Firebase config', (await page.locator('[data-act="signin"]').count()) === 1);
  const fb = await page.evaluate(async () => { const { getApps } = await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'); return getApps().map((a) => a.options.projectId); });
  ok('Firebase initialized', fb.includes(firebaseConfig.projectId), fb.join());
} else {
  ok('Sign-in UI hidden with empty Firebase config', (await page.locator('[data-act="signin"]').count()) === 0 && (await page.isHidden('#sync-dot')));
}

// --- deload week via clock (Mon Nov 16 2026 = week 4) ---
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await p2.clock.setFixedTime(new Date('2026-11-17T11:00:00Z')); // Tue 20:00 JST
await p2.goto(BASE + '#/log'); await p2.waitForSelector('.ex');
ok('Week 4 today shows deload chip + hint', /Week 4 of 12/.test(await p2.textContent('.eyebrow')) && (await p2.locator('.deload-note').count()) === 1);
ok('Tuesday defaults to KB + Legs scheduled', /Scheduled today 20:00–21:05/.test(await p2.textContent('.hero')));
await ctx2.close();

// --- migration: v1 data (old either/or slot, old draft) must still load ---
const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const p4 = await ctx4.newPage();
p4.on('pageerror', (e) => errors.push('pageerror(migrate): ' + e.message));
p4.on('console', (m) => { if (m.type() === 'error') errors.push('migrate: ' + m.text()); });
await p4.addInitScript(() => {
  if (localStorage.getItem('fitlog.v1')) return;
  const t = Date.now();
  const sess = (id, date, ex) => ({ id, workoutId: 'upper', date, startedAt: t, savedAt: t, updatedAt: t, exercises: ex });
  localStorage.setItem('fitlog.v1', JSON.stringify({
    schema: 1,
    settings: { planMode: '3day', sound: true, vibrate: true, keepAwake: true, updatedAt: t },
    schedule: { items: [{ id: 'a', dow: 4, time: '20:00', workout: 'upper' }], updatedAt: t },
    sessions: {
      s1: sess('s1', '2026-10-15', [{ id: 'chest-press', name: 'Chest Press', sets: [{ reps: 8, weight: 42.5 }, { reps: 8, weight: 42.5 }, { reps: 8, weight: 42.5 }] },
        { id: 'iso-row', name: 'Iso-Lateral Row', sets: [{ reps: 8, weight: 45 }, { reps: 8, weight: 45 }, { reps: 8, weight: 45 }] },
        { id: 'lat-pulldown', name: 'Lat Pulldown', sets: [{ reps: 12, weight: 50 }, { reps: 11, weight: 50 }, { reps: 10, weight: 50 }] },
        { id: 'triceps-ext', name: 'Triceps Extension', sets: [{ reps: 10, weight: 21.25 }] },
        { id: 'hammer-curl', name: 'Hammer Curl', sets: [{ reps: 10, weight: 20 }, { reps: 10, weight: 20 }] }]),
      s3: { ...sess('s3', '2026-10-01', [{ id: 'kb-oblique', name: 'KB Oblique', sets: [{ reps: 12, weight: 31 }] }, { id: 'kb-around', name: 'KB Around', sets: [{ reps: 12, weight: 31 }] }]), workoutId: 'kb' },
      s2: sess('s2', '2026-10-08', [{ id: 'chest-fly', name: 'Chest Fly', sets: [{ reps: 12, weight: 25 }] }, { id: 'old-gone', name: 'Removed Exercise', sets: [{ reps: 5, weight: 10 }] }]),
    },
    deleted: {},
    draft: { id: 'd1', workoutId: 'upper', date: '2026-10-24', startedAt: t, choices: { 'fly-or-pulldown': 'lat-pulldown' }, optionalOn: {},
      sets: { 'chest-press': [{ reps: 6, weight: 42.5, done: true }], 'lat-pulldown': [{ reps: 10, weight: 50, done: true }, { reps: 10, weight: 50, done: false }, { reps: 10, weight: 50, done: false }], 'kb-oblique': [{ reps: 12, weight: 31, done: false }] } },
  }));
});
await p4.goto(BASE + '#/log'); await p4.waitForSelector('.ex');
ok('Migrated old draft: pull slot = Both free, done pulldown set kept', (await p4.locator('.slot-pick button.on').textContent()).trim() === 'Both free' && (await p4.locator('.ex[data-ex="lat-pulldown"] .set-row.done').count()) === 1);
ok('Migrated: old 3-set iso-row history → 3 sets in Both mode', (await p4.locator('.ex[data-ex="iso-row"] .set-row').count()) === 3);
ok('Old chest press done set kept', (await p4.locator('.ex[data-ex="chest-press"] .set-row.done').count()) === 1);
ok('Schema bumped to 3', (await p4.evaluate(() => JSON.parse(localStorage.getItem('fitlog.v1')).schema)) === 3);
ok('Draft oblique 31 → 15.5 (one-time)', (await p4.evaluate(() => JSON.parse(localStorage.getItem('fitlog.v1')).draft.sets['kb-oblique'][0].weight)) === 15.5);
const pf = await p4.evaluate(async () => { const L = await import(new URL('js/logic.js', location.href).href); const P = await import(new URL('js/program.js', location.href).href);
  return ['kb-oblique', 'kb-around'].map((id) => L.prefillSets(P.findExercise(id))[0].weight); });
ok('Last logged 31 → prefill 15.5 (Oblique, Around)', pf.join() === '15.5,15.5', pf.join());
await p4.goto(BASE + '#/history'); await p4.waitForSelector('.hist');
ok('Old sessions still listed (incl. removed exercise)', (await p4.locator('.hist').count()) === 3);
await p4.locator('.hist-head').nth(1).tap();
ok('Removed exercise still shown by name', /Removed Exercise/.test(await p4.textContent('.hist-body')));
await p4.tap('[data-act="mode"][data-mode="exercises"]');
ok('Old gym Hammer Curl history still listed (removed from plan)', /Removed from plan · 1 session/.test(await p4.locator('.list-row', { hasText: 'Hammer Curl (gym)' }).textContent()));
ok('Triceps Pushdown keeps old Triceps Extension history', /1 session/.test(await p4.locator('.list-row', { hasText: 'Triceps Pushdown' }).textContent()));
ok('Old Chest Fly + Lat Pulldown history kept', /1 session/.test(await p4.locator('.list-row', { hasText: 'Chest Fly' }).textContent()) && /1 session/.test(await p4.locator('.list-row', { hasText: 'Lat Pulldown' }).textContent()));
await p4.goto(BASE + '#/muscles'); await p4.tap('[data-act="m-mode"][data-mode="week"]');
await p4.goto(BASE + '#/schedule'); await p4.waitForSelector('.days');
await ctx4.close();

// --- service worker offline ---
const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p3 = await ctx3.newPage();
p3.on('pageerror', (e) => errors.push('pageerror(sw): ' + e.message));
await p3.goto(BASE + '#/log');
await p3.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await p3.reload(); await p3.waitForSelector('.ex');
await ctx3.setOffline(true);
await p3.reload(); 
const offlineOk = await p3.waitForSelector('.ex', { timeout: 5000 }).then(() => true).catch(() => false);
ok('Works offline via service worker', offlineOk);
await ctx3.close();

ok('No console errors', errors.length === 0, errors.join(' | '));
console.log(results.join('\n'));
await browser.close();
