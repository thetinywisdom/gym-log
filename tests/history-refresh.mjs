// History changes (save, edit, delete, sync-style commit) update every open page
// without a reload. A session counts on its own week only.
// node tests/history-refresh.mjs [baseUrl]
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const results = [];
const errors = [];
const ok = (name, cond, extra = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
};

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' };
const sets = (n, weight, reps, extra) => Array.from({ length: n }, () => ({ reps, weight, ...extra }));
const session = (id, date, workoutId, exercises) => ({ id, date, workoutId, startedAt: 1, savedAt: 2, updatedAt: 3, exercises });

const boot = async (timeIso) => {
  const ctx = await browser.newContext(mobile);
  await ctx.addInitScript(() => localStorage.setItem('fitlog.noImport', '1'));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.clock.setFixedTime(new Date(timeIso));
  await page.goto(BASE + '#/muscles');
  await page.waitForSelector('[data-act="m-mode"]');
  await page.evaluate(() => { window.__booted = (window.__booted || 0) + 1; });
  return { ctx, page };
};
const save = (page, s) => page.evaluate(async (s) => {
  const { store } = await import(new URL('js/store.js', location.href).href);
  store.saveSession(s);
}, s);
const syncApply = (page, s) => page.evaluate(async (s) => {
  const { store } = await import(new URL('js/store.js', location.href).href);
  store.state.sessions[s.id] = { ...s, updatedAt: Date.now() };
  delete store.state.deleted[s.id];
  store.commit({ kind: 'all', remote: true });
}, s);
const remove = (page, id) => page.evaluate(async (id) => {
  const { store } = await import(new URL('js/store.js', location.href).href);
  store.deleteSession(id);
}, id);
const bars = (page) => page.locator('.bar-row').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.querySelector('span').textContent, e.querySelector('b').textContent])));
const weekText = (page) => page.locator('.wk-title').innerText();

// Sat Nov 7 2026 12:18 JST. This week is Nov 2–Nov 8. Thu Nov 5 is the Upper day.
const TODAY = '2026-11-07T03:18:00Z';
const upper = (id, date, chest = 40, n = 3) => session(id, date, 'upper', [
  { id: 'chest-press', name: 'Chest Press', sets: sets(n, chest, 8) },
]);
const pulldown = (id, date) => session(id, date, 'upper', [
  { id: 'lat-pulldown', name: 'Lat Pulldown', sets: [{ reps: 5, weight: 20, type: 'W' }, { reps: 8, weight: 47 }, { reps: 8, weight: 47 }] },
]);

{
  const { ctx, page } = await boot(TODAY);
  await page.tap('[data-act="m-mode"][data-mode="week"]');
  await page.waitForSelector('.wk-title');
  ok('Starts on this week with nothing logged', /Nov 2 – Nov 8/.test(await weekText(page)) && /0 workouts/.test(await weekText(page)));

  // Add a workout for Thursday while the weekly map is open.
  await save(page, upper('thu', '2026-11-05', 40, 3));
  await page.waitForTimeout(30);
  let t = await weekText(page);
  let b = await bars(page);
  ok('Open weekly map gains that workout without reload', /Nov 2 – Nov 8/.test(t) && /1 workout logged/.test(t) && b.Chest === '3', JSON.stringify(b));
  ok('Page was not reloaded', await page.evaluate(() => window.__booted) === 1);

  // Same id, different sets: edit replaces, it does not add a second copy.
  await save(page, upper('thu', '2026-11-05', 50, 1));
  b = await bars(page);
  ok('Editing the same session replaces its sets (chest 1, not 3 or 4)', b.Chest === '1' && /1 workout logged/.test(await weekText(page)), JSON.stringify(b));

  // A second session sums; a warm-up set does not.
  await save(page, pulldown('thu2', '2026-11-05'));
  b = await bars(page);
  ok('Second session adds, warm-up is not counted (lats 2)', /2 workouts logged/.test(await weekText(page)) && b.Lats === '2' && b.Chest === '1', JSON.stringify(b));

  // Past week stays on that week. Current week does not absorb it.
  await save(page, upper('old', '2026-10-20', 30, 3));
  ok('Oct 20 session does not change the open Nov 2–Nov 8 count', /2 workouts logged/.test(await weekText(page)));
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  ok('That session is on Oct 19–Oct 25 only', /Oct 19 – Oct 25/.test(await weekText(page)) && /1 workout logged/.test(await weekText(page)) && (await bars(page)).Chest === '3');

  // Session / exercise tabs still render from the plan after history changed.
  await page.tap('[data-act="m-mode"][data-mode="session"]');
  ok('Session map still shows the plan (glutes for KB day)', /Glutes/.test(await page.locator('#view').innerText()) && await page.locator('#view .body-svg').count() === 2);
  await page.tap('[data-act="m-mode"][data-mode="exercise"]');
  await page.locator('.pill', { hasText: 'Lat Pulldown' }).tap();
  ok('Exercise map still shows that exercise after a history change', (await page.locator('#view .m.primary').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.m))].join())) === 'lats');

  // Schedule checkmark for the Thursday upper session, not Saturday.
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.days');
  const thuDone = await page.locator('.day', { hasText: 'Thu' }).locator('.sess.done').count();
  const satLogged = await page.locator('.day', { hasText: 'Sat' }).locator('.sess.done, .sess.logged-only').count();
  ok('Schedule marks Thursday logged and leaves Saturday clear', thuDone === 1 && satLogged === 0, `thu=${thuDone} sat=${satLogged}`);

  // History list and an open best/PR sheet.
  await page.goto(BASE + '#/history');
  await page.waitForSelector('.hist, .empty');
  ok('History lists 3 workouts', await page.locator('.hist').count() === 3);
  await page.tap('[data-act="mode"][data-mode="exercises"]');
  await page.locator('.list-row', { hasText: 'Chest Press' }).tap();
  await page.waitForSelector('#sheet.open');
  ok('Exercise sheet best is the edited top set (50)', /Best 50 kg/.test(await page.locator('#sheet').innerText()));
  await syncApply(page, upper('remote', '2026-11-05', 60, 2));
  await page.waitForTimeout(30);
  ok('Sync-style commit updates the open sheet and the list', /Best 60 kg/.test(await page.locator('#sheet').innerText()));
  await page.tap('#sheet [data-act="sheet-close"]');
  ok('Exercises list updates its best without reload', /60 kg/.test(await page.locator('.list-row', { hasText: 'Chest Press' }).innerText()));

  // Weekly map picked up the synced session on this week only.
  await page.goto(BASE + '#/muscles');
  await page.tap('[data-act="m-mode"][data-mode="week"]');
  ok('After sync, this week has 3 workouts and chest 3 (1+2)', /3 workouts logged/.test(await weekText(page)) && (await bars(page)).Chest === '3');

  // Delete drops it everywhere.
  await remove(page, 'remote');
  await page.waitForTimeout(30);
  ok('Delete drops the synced session from the open weekly map', /2 workouts logged/.test(await weekText(page)) && (await bars(page)).Chest === '1');
  await page.goto(BASE + '#/history');
  await page.tap('[data-act="mode"][data-mode="sessions"]');
  await page.waitForSelector('.hist');
  const left = await page.locator('.hist').count();
  ok('Delete drops it from History', left === 3, String(left));
  await page.goto(BASE + '#/settings');
  ok('Settings count matches the sessions still stored', /3 workouts stored/.test(await page.locator('#view').innerText()));
  await save(page, upper('more', '2026-11-05', 42, 1));
  ok('Settings count updates while that page is open', /4 workouts stored/.test(await page.locator('#view').innerText()));

  ok('Still the same document', await page.evaluate(() => window.__booted) === 1);
  await ctx.close();
}

// Today: untouched prefills follow new history; a typed value and a done set do not.
{
  const { ctx, page } = await boot(TODAY);
  await page.goto(BASE + '#/log');
  await page.waitForSelector('.ex[data-ex="kb-swing"]');
  const weight = (i) => page.locator(`.ex[data-ex="kb-swing"] .set-row[data-i="${i}"] input[data-f="weight"]`).inputValue();
  ok('KB swing starts at the plan weight', (await weight(0)) === '15.5');
  const edited = page.locator('.ex[data-ex="kb-swing"] .set-row[data-i="0"] input[data-f="weight"]');
  await edited.fill('18');
  await edited.blur();
  await save(page, session('swing', '2026-11-07', 'kb', [
    { id: 'kb-swing', name: 'KB Swing', sets: sets(3, 20, 15) },
  ]));
  await page.waitForTimeout(30);
  ok('Typed set stays 18; untouched sets take the new history (20)', (await weight(0)) === '18' && (await weight(1)) === '20' && (await weight(2)) === '20');
  ok('Last-line and progress badge follow the saved session', /Last Nov 7: 20×15/.test(await page.locator('.ex[data-ex="kb-swing"]').innerText()) && await page.locator('.ex[data-ex="kb-swing"] .badge.ready').count() === 1);

  await page.locator('.ex[data-ex="kb-swing"] .set-row[data-i="0"] [data-act="done"]').tap();
  const kept = await weight(0);
  await save(page, session('swing', '2026-11-07', 'kb', [
    { id: 'kb-swing', name: 'KB Swing', sets: sets(3, 22, 15) },
  ]));
  await page.waitForTimeout(30);
  ok('A started workout keeps the done set when history is edited', (await weight(0)) === kept && await page.locator('.ex[data-ex="kb-swing"] .set-row.done').count() === 1);
  ok('Its last-line still updates', /Last Nov 7: 22×15/.test(await page.locator('.ex[data-ex="kb-swing"]').innerText()));

  // Muscle sheet best updates while it is open.
  await page.locator('.ex[data-ex="kb-swing"] [data-act="ex-map"]').first().tap();
  await page.waitForSelector('#sheet.open');
  ok('Open muscle sheet shows the best', /best 22 kg/.test(await page.locator('#sheet').innerText()));
  await save(page, session('swing', '2026-11-07', 'kb', [
    { id: 'kb-swing', name: 'KB Swing', sets: sets(3, 24, 15) },
  ]));
  ok('Open muscle sheet best updates', /best 24 kg/.test(await page.locator('#sheet').innerText()));
  await ctx.close();
}

// Imported sessions stay on their own weeks when a new workout is added.
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('import ' + e.message));
  await page.clock.setFixedTime(new Date(TODAY));
  await page.goto(BASE + '#/muscles');
  await page.tap('[data-act="m-mode"][data-mode="week"]');
  await page.waitForSelector('.wk-title');
  ok('Imports do not fill the current week', /Nov 2 – Nov 8/.test(await weekText(page)) && /0 workouts/.test(await weekText(page)));
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  const before = await weekText(page);
  ok('Imports are on Oct 19–Oct 25', /Oct 19 – Oct 25/.test(before) && /2 workouts logged/.test(before));
  await save(page, upper('today', '2026-11-07', 40, 3));
  ok('Adding today does not change the Oct 19 count', /2 workouts logged/.test(await weekText(page)));
  await page.tap('[data-act="m-this-week"]');
  ok('Today’s workout is on this week', /Nov 2 – Nov 8/.test(await weekText(page)) && /1 workout logged/.test(await weekText(page)) && (await bars(page)).Chest === '3');
  // Second pass of the same import must not double the older week.
  await page.evaluate(async () => {
    const { applyHistoryImport } = await import(new URL('js/importer.js', location.href).href);
    applyHistoryImport();
  });
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  ok('Running the import again does not double Oct 19', /2 workouts logged/.test(await weekText(page)));
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
console.log(process.exitCode ? 'FAILED' : 'OK');
