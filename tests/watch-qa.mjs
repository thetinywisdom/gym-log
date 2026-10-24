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
  localStorage.setItem('fitlog.noImport', '1'); // start from an empty history (import is tested in qa.mjs)
  window.__gl = 0;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) { const c = orig.call(this, t, ...a); if (/webgl/.test(t) && c && !this.__counted) { this.__counted = 1; window.__gl++; } return c; };
});
const page = await ctx.newPage();
const threeReqs = [];
const orbitReqs = [];
page.on('request', (r) => { if (/three\.module/.test(r.url())) threeReqs.push(r.url()); if (/OrbitControls/i.test(r.url())) orbitReqs.push(r.url()); });
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

// --- v1.3.1: no camera interaction, Front/Back toggle, perf ---
const P = () => page.evaluate(() => import(new URL('js/watch.js', location.href).href).then((m) => { const p = m._watchState().player; return { pos: p.cameraPosition, facing: p.facing, anim: m._watchState().anim }; }));
const facingOn = () => page.$eval('.xp-cam button.on', (b) => b.dataset.facing);
ok('No OrbitControls requested', orbitReqs.length === 0, orbitReqs.join(','));
ok('No OrbitControls in the player source', !/OrbitControls/.test(await page.evaluate(() => fetch(new URL('anim/src/player.js', location.href)).then((r) => r.text()))));
await page.locator('.ex[data-ex="kb-rdl"] [data-act="watch"]').tap(); await waitReady(); await page.waitForTimeout(300);
const cv = await page.$eval('.watch-stage canvas', (c) => { const cs = getComputedStyle(c); return { pe: cs.pointerEvents, ta: cs.touchAction, ratio: c.width / c.clientWidth }; });
ok('Canvas ignores touch/mouse (no drag/zoom, sheet scroll not captured)', cv.pe === 'none' && cv.ta !== 'none', JSON.stringify(cv));
ok('pixelRatio capped at 1.5 (DSF 2 device)', cv.ratio <= 1.51, cv.ratio.toFixed(2));
const segs = await page.$$eval('.xp-cam button', (b) => b.map((x) => x.textContent.trim()));
ok('Camera toggle is Front | Back', segs.join('|') === 'Front|Back', segs.join('|'));
const f0 = await P();
ok('Default view = Front (exercise default camera)', (await facingOn()) === 'front' && f0.facing === 'front');
// a drag on the stage must not move the camera
const box = await page.locator('.watch-stage canvas').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 6 }); await page.mouse.up();
await page.mouse.wheel(0, -400); await page.waitForTimeout(200);
const f0b = await P();
ok('Drag / wheel on the player does not move the camera', f0b.pos.every((v, i) => Math.abs(v - f0.pos[i]) < 1e-6));
await page.tap('.xp-cam [data-facing="back"]'); await page.waitForTimeout(290);
const f1 = await P(); await page.waitForTimeout(300); const f1b = await P();
const moved = Math.hypot(...f1.pos.map((v, i) => v - f0.pos[i]));
ok('Back toggle moves the camera behind the figure', f1.facing === 'back' && moved > 1 && f1.pos[2] < 0 && f0.pos[2] > -0.5, `front=${f0.pos.map((v) => v.toFixed(2))} back=${f1.pos.map((v) => v.toFixed(2))}`);
ok('Switch eases in under 300 ms', f1.pos.every((v, i) => Math.abs(v - f1b.pos[i]) < 1e-3));
await page.screenshot({ path: SHOTS + '10-back-view.png' });
await page.tap('[data-act="watch-close"]'); await page.waitForTimeout(300);
await page.locator('.ex[data-ex="goblet-squat"] [data-act="watch"]').tap(); await waitReady(); await page.waitForTimeout(300);
const f2 = await P();
ok('Back persists across exercises (goblet squat opens in Back)', (await facingOn()) === 'back' && f2.facing === 'back' && f2.pos[2] < 0, `${f2.facing} z=${f2.pos[2].toFixed(2)}`);
await page.tap('.xp-cam [data-facing="front"]'); await page.waitForTimeout(300);
const f3 = await P();
ok('Front toggle returns to the default view', f3.facing === 'front' && f3.pos[2] > 0);
await page.tap('[data-act="watch-close"]'); await page.waitForTimeout(300);
ok('Rendering pauses when the sheet is closed', await page.evaluate(() => new Promise((res) => {
  const c = document.querySelector('.watch-stage canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl');
  let draws = 0; const orig = gl.drawElements; gl.drawElements = function (...a) { draws++; return orig.apply(this, a); };
  setTimeout(() => { gl.drawElements = orig; res(draws === 0); }, 600);
})));

// Hammer Curl: ▶ Watch follows the equipment picker
const hcCard = page.locator('.ex[data-ex="kb-hammer-curl"]');
await hcCard.locator('[data-act="toggle-opt"]').check(); await page.waitForSelector('.ex[data-ex="kb-hammer-curl"] .equip-pick');
const watchHammer = async () => { await hcCard.locator('[data-act="watch"]').tap(); await waitReady(); await page.waitForTimeout(400);
  const sub = await page.evaluate(() => document.querySelector('.watch-stage')?.innerText || ''); const st = await P();
  await page.tap('[data-act="watch-close"]'); await page.waitForTimeout(300); return { sub, anim: st.anim }; };
const wDb = await watchHammer();
ok('Hammer Curl (Dumbbells) → dumbbell animation', wDb.anim === 'hammer-curl' && /Dumbbells/.test(wDb.sub), wDb.anim);
await hcCard.locator('[data-act="pick-equip"][data-equip="kb"]').tap(); await page.waitForTimeout(200);
const wKb = await watchHammer();
ok('Hammer Curl (Kettlebell) → kettlebell animation', wKb.anim === 'hammer-curl-kb' && /Kettlebell/.test(wKb.sub), wKb.anim);
await hcCard.locator('[data-act="pick-equip"][data-equip="db"]').tap(); await page.waitForTimeout(200);
const wDb2 = await watchHammer();
ok('Switch back to Dumbbells → dumbbell animation again', wDb2.anim === 'hammer-curl');

// muscle sheet (human icon) has no Watch control any more (v1.3.1)
await page.locator('.ex[data-ex="goblet-squat"] .ex-actions [data-act="ex-map"]').tap();
await page.waitForSelector('#sheet.open .bodymap, #sheet.open svg');
const sheetWatch = await page.$$eval('#sheet [data-act="watch"], #sheet .watch-open', (n) => n.length);
const sheetText = await page.textContent('#sheet');
ok('Muscle sheet has no Watch control', sheetWatch === 0 && !/Watch/i.test(sheetText), `${sheetWatch} controls`);
await page.tap('#sheet [data-act="sheet-close"]'); await page.waitForTimeout(300);
ok('Card header ▶ Watch still present', (await page.locator('.ex[data-ex="goblet-squat"] .ex-actions [data-act="watch"][aria-label="Watch demo"]').count()) === 1);

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
