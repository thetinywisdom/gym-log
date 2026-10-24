// Watch-player QA: node tests/watch-qa.mjs [baseUrl]   (needs playwright-core + Chrome; uses SwiftShader WebGL)
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const errors = [], results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); if (!cond) process.exitCode = 1; };

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await ctx.addInitScript(() => {
  window.__gl = 0;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) { const c = orig.call(this, t, ...a); if (/webgl/.test(t) && c && !this.__counted) { this.__counted = 1; window.__gl++; } return c; };
});
const page = await ctx.newPage();
const threeReqs = [];
page.on('request', (r) => { if (/three\.module/.test(r.url())) threeReqs.push(r.url()); });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(BASE + '#/log');
await page.waitForSelector('.ex');
await page.waitForTimeout(500);
ok('Three.js not loaded before first Watch', threeReqs.length === 0);
const btns = await page.$$eval('.ex [data-act="watch"]', (b) => b.map((x) => x.dataset.ex));
ok('Watch button on KB-day cards', btns.length >= 8, btns.join(','));
const watching = () => page.evaluate(() => !document.getElementById('watch').hidden && document.getElementById('watch').classList.contains('open'));
const waitReady = () => page.waitForFunction(() => { const s = document.querySelector('.watch-stage'); const l = s && s.querySelector('.xp-load'); return s && s.querySelector('canvas') && (!l || l.style.display === 'none'); }, null, { timeout: 30000 });

// open/play/switch/close ×10 over different cards
for (let i = 0; i < 10; i++) {
  const id = btns[i % btns.length];
  const b = page.locator(`.ex[data-ex="${id}"] [data-act="watch"]`);
  await b.scrollIntoViewIfNeeded(); await b.tap();
  await waitReady();
  if (i === 0) ok('Three.js lazy-loaded on first open', threeReqs.length === 1);
  await page.waitForTimeout(250);
  const open = await watching();
  const title = await page.evaluate(() => document.querySelector('.watch-stage')?.innerText.split('\n')[0] || '');
  if (i < 3 || !open) ok(`Open #${i + 1} (${id})`, open, title);
  await page.tap('[data-act="watch-close"]');
  await page.waitForTimeout(300);
  if (await watching() || !(await page.evaluate(() => document.getElementById('watch').hidden))) { ok(`Close #${i + 1}`, false); }
}
ok('Open/close ×10 OK', true);
ok('Exactly one canvas and one WebGL context after 10 opens', (await page.locator('canvas').count()) === 1 && (await page.evaluate(() => window.__gl)) === 1, `canvases=${await page.locator('canvas').count()} gl=${await page.evaluate(() => window.__gl)}`);
ok('Three.js fetched only once', threeReqs.length === 1, String(threeReqs.length));

// Escape closes
await page.locator('.ex[data-ex="kb-halo"] [data-act="watch"]').tap(); await waitReady();
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok('Escape closes player', !(await watching()));

// muscle sheet → watch
await page.locator('.ex[data-ex="goblet-squat"] [data-act="ex-map"]').first().tap();
await page.waitForSelector('#sheet.open .watch-open');
await page.tap('#sheet .watch-open'); await waitReady(); await page.waitForTimeout(300);
ok('Muscle sheet → Watch opens player, sheet closed', (await watching()) && !(await page.evaluate(() => document.getElementById('sheet').classList.contains('open'))));
await page.tap('[data-act="watch-close"]'); await page.waitForTimeout(300);

// upper day: pull slot
await page.evaluate(() => { location.hash = '#/log'; });
const pickUpper = page.locator('[data-act="pick-workout"][data-w="upper"], [data-w="upper"]');
if (await pickUpper.count()) { await pickUpper.first().tap(); await page.waitForTimeout(300); }
const hasSlot = await page.locator('.slot[data-slot="pull-slot"]').count();
if (hasSlot) {
  await page.tap('[data-act="pick-option"][data-opt="lat-pulldown"]'); await page.waitForTimeout(200);
  await page.locator('.ex[data-ex="lat-pulldown"] [data-act="watch"]').tap(); await waitReady(); await page.waitForTimeout(300);
  ok('Pull slot = Pulldown → single, no tabs', await page.evaluate(() => document.querySelector('.watch-tabs').hidden));
  await page.tap('[data-act="watch-close"]'); await page.waitForTimeout(300);
  await page.tap('[data-act="pick-option"][data-opt="both"]').catch(async () => { await page.locator('.slot-pick button', { hasText: 'Both free' }).tap(); });
  await page.waitForTimeout(200);
  await page.locator('.ex[data-ex="iso-row"] [data-act="watch"]').tap(); await waitReady(); await page.waitForTimeout(300);
  const tabs = await page.$$eval('.watch-tabs button', (b) => b.map((x) => x.textContent.trim() + (x.classList.contains('on') ? '*' : '')));
  ok('Both free → tabs Row + Pulldown', tabs.length === 2 && /Row\*/.test(tabs[0]) && /Pulldown/.test(tabs[1]), tabs.join(' | '));
  await page.tap('.watch-tabs button:nth-child(2)'); await waitReady(); await page.waitForTimeout(1600);
  const t2 = await page.$$eval('.watch-tabs button', (b) => b.map((x) => x.classList.contains('on')));
  ok('Tab switch to Lat Pulldown', t2[1] === true);
  await page.screenshot({ path: SHOTS + '08-watch-player.png' });
  await page.tap('[data-act="watch-close"]'); await page.waitForTimeout(300);
} else ok('Upper workout pull slot reachable', false);

// muscles tab exercise mode → watch
await page.evaluate(() => { location.hash = '#/muscles'; }); await page.waitForTimeout(400);
const mw = page.locator('#view [data-act="watch"], main [data-act="watch"]');
const exMode = page.locator('[data-act="m-mode"][data-mode="exercise"], [data-act="m-mode"]:has-text("Exercise")');
if (await exMode.count()) { await exMode.first().tap(); await page.waitForTimeout(300); }
if (await mw.count()) { await mw.first().tap(); await waitReady(); await page.waitForTimeout(200); ok('Muscles tab → Watch opens player', await watching()); }
else ok('Muscles tab watch button present', false);
// navigating closes the player
await page.evaluate(() => { location.hash = '#/history'; }); await page.waitForTimeout(400);
ok('Navigating closes player', !(await watching()));
ok('Still one WebGL context at end', (await page.evaluate(() => window.__gl)) === 1, String(await page.evaluate(() => window.__gl)));
ok('No console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(results.join('\n'));
await browser.close();
