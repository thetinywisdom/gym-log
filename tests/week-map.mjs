// Week cursor + imported muscle-map counts.
// node tests/week-map.mjs [baseUrl]
//
// On Nov 7 2026 (JST) a fresh Muscles → This week is Nov 2–Nov 8 with 0 workouts.
// The reported screen (Oct 26–Nov 1, 0 workouts) is that same view after the page
// was left open from the previous week: the Monday was captured once and never
// moved, and resuming the app did not re-render. Imported sessions (Oct 4–22)
// count on their own calendar weeks, warm-ups excluded.
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const results = [];
const errors = [];
const ok = (name, cond, extra = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
};

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' };

const boot = async (timeIso, { importOn = true } = {}) => {
  const ctx = await browser.newContext(mobile);
  if (!importOn) await ctx.addInitScript(() => localStorage.setItem('fitlog.noImport', '1'));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.clock.setFixedTime(new Date(timeIso));
  return { ctx, page };
};
const weekTitle = (page) => page.locator('.wk-title').innerText();
const openWeek = async (page) => {
  await page.goto(BASE + '#/muscles');
  await page.waitForSelector('[data-act="m-mode"]');
  await page.tap('[data-act="m-mode"][data-mode="week"]');
  await page.waitForSelector('.wk-title');
};
const fire = (page, kind) => page.evaluate((kind) => {
  if (kind === 'visibility') document.dispatchEvent(new Event('visibilitychange'));
  else if (kind === 'focus') window.dispatchEvent(new Event('focus'));
  else window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
}, kind);

// --- fresh Nov 7 is the current week, and it is empty ---
{
  const { ctx, page } = await boot('2026-11-07T03:18:00Z'); // Sat Nov 7 12:18 JST
  await openWeek(page);
  const t = await weekTitle(page);
  ok('Fresh Nov 7 shows Nov 2–Nov 8, not Oct 26–Nov 1', /Nov 2 – Nov 8/.test(t) && /0 workouts logged/.test(t), t.replace(/\s+/g, ' '));
  ok('Fresh Nov 7 has no Back-to-this-week chip', await page.locator('[data-act="m-this-week"]').count() === 0);
  ok('Empty week says so, and points at the 8 imported workouts', /No workouts logged this week yet\./.test(await page.locator('.empty').innerText()) && /8 workouts in other weeks/.test(await page.locator('#view').innerText()));
  const mapText = await page.locator('#view').innerText();
  ok('Week map stays the 2D front/back figure', await page.locator('#view .body-svg').count() === 2 && /front/i.test(mapText) && /back/i.test(mapText) && await page.locator('#view canvas').count() === 0, `svgs=${await page.locator('#view .body-svg').count()} canvas=${await page.locator('#view canvas').count()}`);
  ok('No muscle is lit when the week has no sessions', await page.locator('#view .body-svg .m.on').count() === 0);
  await page.screenshot({ path: SHOTS + '13-this-week-nov7.png' });
  await ctx.close();
}

// --- resume across the week boundary (the reported screen) ---
for (const kind of ['visibility', 'focus', 'pageshow']) {
  const { ctx, page } = await boot('2026-11-01T03:00:00Z'); // Sun Nov 1 12:00 JST, still Oct 26–Nov 1
  await openWeek(page);
  ok(`${kind}: opened Nov 1 shows Oct 26–Nov 1`, /Oct 26 – Nov 1/.test(await weekTitle(page)));
  await page.clock.setFixedTime(new Date('2026-11-07T03:18:00Z'));
  await fire(page, kind);
  await page.waitForTimeout(50);
  const t = await weekTitle(page);
  ok(`${kind}: resume on Nov 7 follows to Nov 2–Nov 8`, /Nov 2 – Nov 8/.test(t) && /0 workouts logged/.test(t), t.replace(/\s+/g, ' '));
  if (kind === 'visibility') await page.screenshot({ path: SHOTS + '14-this-week-after-resume.png' });
  await ctx.close();
}

// --- arrows pin a week; This week / the chip release it; a later resume follows again ---
{
  const { ctx, page } = await boot('2026-11-07T03:18:00Z');
  await openWeek(page);
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  ok('Previous week from Nov 7 is the reported range', /Oct 26 – Nov 1/.test(await weekTitle(page)) && await page.locator('[data-act="m-this-week"]').count() === 1);
  await fire(page, 'visibility');
  ok('Same-day resume keeps a week the user opened with the arrows', /Oct 26 – Nov 1/.test(await weekTitle(page)));
  await page.goto(BASE + '#/history');
  await page.waitForSelector('#view');
  await page.goto(BASE + '#/muscles');
  await page.waitForSelector('.wk-title');
  ok('Leaving Muscles keeps the week you were browsing', /Oct 26 – Nov 1/.test(await weekTitle(page)));
  await page.tap('[data-act="m-mode"][data-mode="week"]');
  ok('Tapping This week returns to Nov 2–Nov 8', /Nov 2 – Nov 8/.test(await weekTitle(page)) && await page.locator('[data-act="m-this-week"]').count() === 0);

  await page.tap('[data-act="m-wk"][data-d="-7"]');
  await page.clock.setFixedTime(new Date('2026-11-08T15:30:00Z')); // Mon Nov 9 00:30 JST
  await fire(page, 'focus');
  await page.waitForTimeout(50);
  ok('A pinned week stays put when the calendar week changes', /Oct 26 – Nov 1/.test(await weekTitle(page)));
  await page.tap('[data-act="m-this-week"]');
  ok('Back to this week jumps to the new current week', /Nov 9 – Nov 15/.test(await weekTitle(page)));
  await page.clock.setFixedTime(new Date('2026-11-16T03:00:00Z')); // Mon Nov 16 12:00 JST
  await fire(page, 'pageshow');
  await page.waitForTimeout(50);
  ok('After returning, the week follows the next Monday again', /Nov 16 – Nov 22/.test(await weekTitle(page)));
  await ctx.close();
}

// Sunday night JST is still the old week; 00:30 Monday rolls it.
{
  const { ctx, page } = await boot('2026-11-08T14:00:00Z'); // Sun Nov 8 23:00 JST
  await openWeek(page);
  ok('Sunday 23:00 JST is still Nov 2–Nov 8', /Nov 2 – Nov 8/.test(await weekTitle(page)));
  await page.clock.setFixedTime(new Date('2026-11-08T15:30:00Z')); // Mon Nov 9 00:30 JST
  await fire(page, 'visibility');
  await page.waitForTimeout(50);
  ok('Monday 00:30 JST rolls This week to Nov 9–Nov 15', /Nov 9 – Nov 15/.test(await weekTitle(page)));
  await ctx.close();
}

// --- imported sessions count on their own weeks (UI + working-set rules) ---
{
  const { ctx, page } = await boot('2026-11-07T03:18:00Z');
  await page.goto(BASE + '#/muscles');
  await page.waitForSelector('#view');
  const data = await page.evaluate(async () => {
    const L = await import(new URL('js/logic.js', location.href).href);
    const mondays = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
    return Object.fromEntries(mondays.map((m) => {
      const sessions = L.sessionsInWeek(m);
      return [m, { n: sessions.length, dates: sessions.map((s) => s.date).sort(), muscles: L.weeklyMuscleSets(m) }];
    }));
  });
  ok('Import weeks: 1, 3, 2, 2, 0, 0 sessions', [1, 3, 2, 2, 0, 0].every((n, i) => data[['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'][i]].n === n), JSON.stringify(Object.values(data).map((w) => w.n)));
  ok('Oct 15 both sessions land in Oct 12–18 (01:18 stays on the 15th)', data['2026-10-12'].dates.join() === '2026-10-15,2026-10-15');
  ok('Oct 20 and Oct 22 land in Oct 19–25', data['2026-10-19'].dates.join() === '2026-10-20,2026-10-22');
  // Oct 4 lat pulldown is W, W, then 4 working sets (including the failure set). Lats are primary on that exercise only.
  ok('Warm-ups do not count: Oct 4 lats = 4, not 6', data['2026-09-28'].muscles.lats === 4, String(data['2026-09-28'].muscles.lats));
  ok('Legacy curl counts: Oct 4 biceps 3 (lat secondary 2 + curl 1), brachialis 0.5', data['2026-09-28'].muscles.biceps === 3 && data['2026-09-28'].muscles.brachialis === 0.5);
  const w = data['2026-10-19'].muscles;
  ok('Oct 19–25 set totals (primary 1, secondary ½, F/D included)', w.frontDelts === 11 && w.chest === 5.5 && w.lats === 3 && w.obliques === 6 && w.triceps === 10 && w.brachialis === 2 && w.biceps === 3.5, JSON.stringify({ frontDelts: w.frontDelts, chest: w.chest, lats: w.lats, obliques: w.obliques, triceps: w.triceps, brachialis: w.brachialis, biceps: w.biceps }));

  await openWeek(page);
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  ok('One week back is empty Oct 26–Nov 1, with the other-weeks hint', /Oct 26 – Nov 1/.test(await weekTitle(page)) && /0 workouts/.test(await weekTitle(page)) && /8 workouts in other weeks/.test(await page.locator('#view').innerText()));
  await page.tap('[data-act="m-wk"][data-d="-7"]');
  const bars = () => page.locator('.bar-row').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.querySelector('span').textContent, e.querySelector('b').textContent])));
  const shown = await page.locator('#view').innerText();
  const b19 = await bars();
  ok('Oct 19–Oct 25 shows both imported workouts on the map', /Oct 19 – Oct 25/.test(shown) && /2 workouts logged/.test(shown) && b19['Front delts'] === '11' && b19.Lats === '3' && b19.Brachialis === '2' && b19.Chest === '5.5' && await page.locator('#view .body-svg .m.on').count() > 0, JSON.stringify(b19));
  await page.screenshot({ path: SHOTS + '15-week-oct19-imports.png' });
  // back to Sep 28 (three more previous: Oct 12, Oct 5, Sep 28)
  for (let i = 0; i < 3; i++) await page.tap('[data-act="m-wk"][data-d="-7"]');
  const oct4 = await page.locator('#view').innerText();
  const b4 = await bars();
  ok('Sep 28–Oct 4 map shows the one imported session, lats at 4', /Sep 28 – Oct 4/.test(oct4) && /1 workout logged/.test(oct4) && b4.Lats === '4' && b4.Brachialis === '0.5' && b4.Biceps === '3', JSON.stringify({ Lats: b4.Lats, Brachialis: b4.Brachialis, Biceps: b4.Biceps }));
  await ctx.close();
}

// --- Schedule and Today follow the same resume ---
{
  const { ctx, page } = await boot('2026-11-01T03:00:00Z', { importOn: false });
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.days');
  ok('Schedule on Nov 1 is program week 1', /Week 1/.test(await weekTitle(page)) && /Oct 26 – Nov 1/.test(await weekTitle(page)));
  await page.clock.setFixedTime(new Date('2026-11-07T03:18:00Z'));
  await fire(page, 'visibility');
  await page.waitForTimeout(50);
  const sched = await weekTitle(page);
  ok('Schedule resume on Nov 7 is week 2 (Nov 2–Nov 8)', /Week 2/.test(sched) && /Nov 2 – Nov 8/.test(sched), sched.replace(/\s+/g, ' '));
  ok('Saturday is marked today after the resume', /Sat/.test(await page.locator('.day.today').innerText()));
  await page.tap('[data-act="wk"][data-d="-7"]');
  await page.clock.setFixedTime(new Date('2026-11-08T15:30:00Z'));
  await fire(page, 'focus');
  await page.waitForTimeout(50);
  ok('Schedule keeps a week you stepped to', /Oct 26 – Nov 1/.test(await weekTitle(page)) && await page.locator('[data-act="wk-today"]').count() === 1);
  await page.tap('[data-act="wk-today"]');
  ok('Schedule This week returns to Nov 9–Nov 15', /Nov 9 – Nov 15/.test(await weekTitle(page)));

  await page.goto(BASE + '#/log');
  await page.waitForSelector('.eyebrow');
  // The log was first rendered Nov 1 inside this same document, then the clock moved
  // while we were on Schedule. Opening Log renders immediately, so it already shows Nov 9.
  ok('Opening Today after the clock moved shows the new date', /Mon, Nov 9/.test(await page.locator('.eyebrow').innerText()));
  await ctx.close();
}

{
  const { ctx, page } = await boot('2026-11-01T03:00:00Z', { importOn: false });
  await page.goto(BASE + '#/log');
  await page.waitForSelector('.eyebrow');
  ok('Today on Nov 1 reads Sun, Nov 1', /Sun, Nov 1/.test(await page.locator('.eyebrow').innerText()));
  const reps = page.locator('.ex[data-ex="kb-swing"] .set-row[data-i="0"] input[data-f="reps"]');
  await reps.evaluate((el) => { el.value = '14'; });
  await fire(page, 'visibility');
  ok('Same-day resume does not wipe an unsaved reps field', (await reps.inputValue()) === '14');
  await page.clock.setFixedTime(new Date('2026-11-07T03:18:00Z'));
  await fire(page, 'visibility');
  await page.waitForSelector('.eyebrow');
  ok('Today resume on Nov 7 reads Sat, Nov 7', /Sat, Nov 7/.test(await page.locator('.eyebrow').innerText()) && /Week 2 of 12/.test(await page.locator('.eyebrow').innerText()));
  ok('Untouched draft moves to the new day', (await page.locator('input[data-f="date"]').inputValue()) === '2026-11-07');
  await ctx.close();
}

{
  const { ctx, page } = await boot('2026-11-01T03:00:00Z', { importOn: false });
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE + '#/log');
  await page.waitForSelector('.ex');
  await page.locator('.ex[data-ex="kb-swing"] .set-row[data-i="0"] [data-act="done"]').tap();
  await page.clock.setFixedTime(new Date('2026-11-07T03:18:00Z'));
  await fire(page, 'pageshow');
  await page.waitForTimeout(50);
  ok('A started workout keeps its date across the resume', /Unsaved workout from Sun, Nov 1/.test(await page.locator('.note').innerText()));
  ok('The done set is still done', await page.locator('.ex[data-ex="kb-swing"] .set-row.done').count() === 1);
  await ctx.close();
}

{
  const { ctx, page } = await boot('2026-11-07T03:18:00Z', { importOn: false });
  await page.goto(BASE);
  await page.waitForSelector('#view');
  const ver = await page.evaluate(async () => (await (await fetch(new URL('sw.js', location.href))).text()).match(/fitlog-v[\d.]+/)[0]);
  ok('Service worker cache version is fitlog-v1.3.4', ver === 'fitlog-v1.3.4', ver);
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
if (errors.length) console.log('ERRORS\n' + errors.join('\n'));
console.log(process.exitCode ? 'FAILED' : 'OK');
