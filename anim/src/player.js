// createExercisePlayer(container, exerciseId, opts) — self-contained 3D exercise demo with HUD.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { createMannequin, MUSCLES } from './mannequin.js';
import { createEquipment } from './equipment.js';
import { Rig } from './rig.js';
import { Clip } from './clip.js';
import { loadExercise } from '../exercises/index.js';

const VIEWS = { front: [0, 0.1, 1], side: [-1, 0.1, 0], '45': [-0.72, 0.16, 0.7], back: [0, 0.12, -1] };

const CSS = `
.xp{position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;border-radius:18px;
 background:radial-gradient(120% 80% at 50% 35%,#1b2029 0%,#0d0f13 70%);color:#eef0f4;font:500 14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;user-select:none;-webkit-user-select:none}
.xp canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
.xp-top{position:absolute;left:14px;right:14px;top:12px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none;gap:10px}
.xp-title{font-weight:700;font-size:16px;letter-spacing:.01em}
.xp-sub{color:#8d94a3;font-size:12px;margin-top:2px}
.xp-rep{text-align:right;line-height:1}
.xp-rep b{display:block;font-size:30px;font-weight:800;color:#c6f24e;font-variant-numeric:tabular-nums}
.xp-rep span{font-size:11px;color:#8d94a3;text-transform:uppercase;letter-spacing:.08em}
.xp-cue{position:absolute;left:50%;bottom:86px;transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(13,15,19,.78);
 border:1px solid rgba(198,242,78,.35);font-weight:700;font-size:16px;white-space:nowrap;pointer-events:none;transition:opacity .2s,transform .2s;backdrop-filter:blur(6px)}
.xp-cue.work{background:rgba(198,242,78,.95);color:#0d0f13;border-color:transparent}
.xp-cue.swap{opacity:0;transform:translateX(-50%) translateY(4px)}
.xp-phase{position:absolute;left:14px;right:14px;bottom:70px;height:4px;display:flex;gap:3px;pointer-events:none}
.xp-phase i{flex:1;border-radius:2px;background:#262b35;position:relative;overflow:hidden}
.xp-phase i b{position:absolute;inset:0;width:0;background:#c6f24e}
.xp-phase i.w{background:#353d2a}
.xp-bar{position:absolute;left:10px;right:10px;bottom:10px;display:flex;gap:8px;align-items:center}
.xp button{font:inherit;color:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.xp-play{width:46px;height:46px;border-radius:50%;background:#c6f24e;color:#0d0f13;display:grid;place-items:center;flex:none}
.xp-play svg{width:20px;height:20px}
.xp-seg{display:flex;background:#171a21;border:1px solid #262b35;border-radius:12px;padding:3px;gap:2px}
.xp-seg button{background:transparent;padding:8px 9px;border-radius:9px;font-size:13px;font-weight:600;color:#8d94a3;min-width:38px}
.xp-seg button.on{background:#262b35;color:#eef0f4}
.xp-cam{margin-left:auto}
.xp-load{position:absolute;inset:0;display:grid;place-items:center;color:#8d94a3;pointer-events:none}
`;
let cssDone = false;
function injectCSS() { if (cssDone || typeof document === 'undefined') return; cssDone = true; const s = document.createElement('style'); s.id = 'xp-css'; s.textContent = CSS; document.head.appendChild(s); }

const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/></svg>',
};

function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.5, 'rgba(0,0,0,0.28)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function floorTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(38,43,53,1)'); r.addColorStop(0.75, 'rgba(25,29,36,0.7)'); r.addColorStop(1, 'rgba(13,15,19,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(198,242,78,0.10)'; g.lineWidth = 1.2;
  for (const rad of [60, 100]) { g.beginPath(); g.arc(128, 128, rad, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * @param {HTMLElement} container
 * @param {string} exerciseId   e.g. 'kb-swing' (aliases such as 'triceps-ext' are resolved)
 * @param {object} [opts] { autoplay=true, speed=1, view, showHud=true, tint='primary'|'all'|'none', pixelRatio }
 */
export function createExercisePlayer(container, exerciseId, opts = {}) {
  injectCSS();
  const o = { autoplay: true, speed: 1, showHud: true, tint: 'all', ...opts };
  const el = document.createElement('div'); el.className = 'xp';
  el.innerHTML = `<canvas></canvas><div class="xp-load">Loading…</div>
   <div class="xp-top"><div><div class="xp-title"></div><div class="xp-sub"></div></div><div class="xp-rep"><b>0</b><span>reps</span></div></div>
   <div class="xp-phase"></div><div class="xp-cue swap"></div>
   <div class="xp-bar"><button class="xp-play" aria-label="Play/pause">${ICON.pause}</button>
    <div class="xp-seg xp-speed"><button data-speed="0.5">0.5×</button><button data-speed="1">1×</button></div>
    <div class="xp-seg xp-cam"><button data-cam="front">Front</button><button data-cam="45">45°</button><button data-cam="side">Side</button></div></div>`;
  container.appendChild(el);
  const $ = (s) => el.querySelector(s);
  if (!o.showHud) for (const s of ['.xp-top', '.xp-bar', '.xp-cue', '.xp-phase']) $(s).style.display = 'none';
  const canvas = $('canvas');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(o.pixelRatio || window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
  scene.add(new THREE.HemisphereLight(0xe2e8f6, 0x14171d, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2.2, 4, 3); scene.add(key);

  const floorTex = floorTexture(), blobTex = blobTexture();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = -2; scene.add(floor);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; blob.renderOrder = -1; scene.add(blob);

  const man = createMannequin(); scene.add(man.root);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.minDistance = 1.2; controls.maxDistance = 8; controls.maxPolarAngle = Math.PI * 0.53; controls.rotateSpeed = 0.8;

  let def = null, clip = null, rig = null, equip = {}, fit = null;
  let playing = !!o.autoplay, speed = o.speed, time = 0, view = o.view || null, lastReps = -1, lastCue = null, lastIdx = -1;
  let moving = false, raf = 0, last = 0, visible = true, disposed = false, camAnim = null;
  const act = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  let pulse = 0;
  const listeners = {};
  const emit = (n, v) => (listeners[n] || []).forEach((f) => f(v));

  // ---------- layout ----------
  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (fit && view) setView(view, false);
    requestFrame();
  };
  const ro = new ResizeObserver(resize); ro.observe(el);
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; requestFrame(); }, { threshold: 0.01 }); io.observe(el);
  const onVis = () => requestFrame(); document.addEventListener('visibilitychange', onVis);
  controls.addEventListener('change', () => requestFrame());
  controls.addEventListener('start', () => { camAnim = null; });

  // ---------- exercise loading ----------
  let loadTok = 0;
  async function load(id) {
    const tok = ++loadTok;
    $('.xp-load').style.display = '';
    const d = await loadExercise(id);
    if (disposed || tok !== loadTok) return; // a newer setExercise() won the race
    for (const e of Object.values(equip)) { scene.remove(e.object); e.dispose?.(); }
    equip = {};
    for (const spec of d.equipment || []) {
      const e = createEquipment(spec); equip[spec.id] = e; scene.add(e.object);
      if (spec.pos) e.object.position.fromArray(spec.pos);
      if (spec.rot) e.object.rotation.set(...spec.rot.map((x) => (x * Math.PI) / 180));
      e.object.updateMatrixWorld(true);
    }
    def = d; clip = new Clip(d); rig = new Rig(man, equip);
    time = 0; lastReps = -1; lastCue = null; lastIdx = -1;
    $('.xp-title').textContent = d.name;
    $('.xp-sub').textContent = d.subtitle || '';
    buildPhaseBar();
    computeFit();
    setView(o.view || d.camera?.view || 'side', false);
    setSpeed(speed);
    $('.xp-load').style.display = 'none';
    if (d.startKey) time = clip.timeOfKey(d.startKey);
    renderFrame(0);
    emit('load', d);
  }

  function buildPhaseBar() {
    const bar = $('.xp-phase'); bar.innerHTML = '';
    for (const s of clip.segs) { const i = document.createElement('i'); i.style.flex = String(s.dur); if (s.work) i.className = 'w'; i.appendChild(document.createElement('b')); bar.appendChild(i); }
  }

  function computeFit() {
    const box = new THREE.Box3(), tmp = new THREE.Box3();
    const N = 16;
    for (let k = 0; k < N; k++) {
      const s = clip.sample((k / N) * clip.duration); rig.apply(s.pose); man.updateBounds?.();
      for (const m of man.meshes) { tmp.setFromObject(m); box.union(tmp); }
      for (const e of Object.values(equip)) if (!e.noFit && !e.flat) { tmp.setFromObject(e.object); box.union(tmp); }
    }
    box.min.y = Math.min(box.min.y, 0);
    fit = { box, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
  }

  function viewPose(name) {
    const dir = new THREE.Vector3(...(def.camera?.dirs?.[name] || VIEWS[name] || VIEWS.side)).normalize();
    const target = fit.center.clone().add(new THREE.Vector3(...(def.camera?.offset || [0, 0, 0])));
    target.y -= fit.size.y * 0.04; // leave room for the HUD
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize(), camUp = new THREE.Vector3().crossVectors(right, dir).normalize();
    let w = 0, h = 0, depth = 0;
    const c = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      c.set(i & 1 ? fit.box.max.x : fit.box.min.x, i & 2 ? fit.box.max.y : fit.box.min.y, i & 4 ? fit.box.max.z : fit.box.min.z).sub(target);
      w = Math.max(w, Math.abs(c.dot(right))); h = Math.max(h, Math.abs(c.dot(camUp))); depth = Math.max(depth, c.dot(dir));
    }
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const margin = (def.camera?.zoom ? 1 / def.camera.zoom : 1) * 1.18;
    const dist = Math.max((h * 1.32) / tanV, w / (tanV * camera.aspect)) * margin + depth;
    return { pos: target.clone().addScaledVector(dir, dist), target };
  }

  function setView(name, animate = true) {
    view = name;
    el.querySelectorAll('.xp-cam button').forEach((b) => b.classList.toggle('on', b.dataset.cam === name));
    if (!fit) return;
    const v = viewPose(name);
    if (animate) camAnim = { t: 0, fromPos: camera.position.clone(), fromTarget: controls.target.clone(), ...v };
    else { camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); }
    requestFrame();
  }

  function setSpeed(s) { speed = s; el.querySelectorAll('.xp-speed button').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === s)); }
  function setPlaying(p) { playing = p; $('.xp-play').innerHTML = p ? ICON.pause : ICON.play; last = 0; requestFrame(); emit(p ? 'play' : 'pause'); }

  // ---------- frame ----------
  const _v = new THREE.Vector3();
  function renderFrame(dt) {
    if (!clip) return;
    const s = clip.sample(time);
    rig.apply(s.pose);
    // muscle tint: same states as the app's 2D map (primary lime, secondary olive); primaries pulse on work phases
    const k = dt > 0 ? 1 - Math.exp(-dt / 0.15) : 1;
    pulse += ((s.work ? 1 : 0) - pulse) * k;
    if (o.tint !== 'none') {
      for (const m of MUSCLES) act[m] = def.primary?.includes(m) ? 1 : (o.tint === 'all' && def.secondary?.includes(m) ? 0.42 : 0);
      man.setActivation(act, o.pulse === false ? 0 : pulse);
    }
    // blob shadow
    let minX = 9, maxX = -9, minZ = 9, maxZ = -9;
    for (const j of ['pelvis', 'ankleL', 'ankleR', 'wristL', 'wristR', 'head', 'chest']) {
      man.joints[j].getWorldPosition(_v); minX = Math.min(minX, _v.x); maxX = Math.max(maxX, _v.x); minZ = Math.min(minZ, _v.z); maxZ = Math.max(maxZ, _v.z);
    }
    blob.position.set((minX + maxX) / 2, 0.003, (minZ + maxZ) / 2); blob.scale.set(maxX - minX + 0.55, maxZ - minZ + 0.55, 1);
    // HUD
    if (s.reps !== lastReps) { lastReps = s.reps; $('.xp-rep b').textContent = String(s.reps); emit('rep', s.reps); }
    if (s.cue !== lastCue) {
      lastCue = s.cue; const c = $('.xp-cue'); c.classList.add('swap');
      setTimeout(() => { c.textContent = s.cue; c.classList.toggle('work', !!s.work); c.classList.toggle('swap', !s.cue); }, dt > 0 ? 120 : 0);
      emit('cue', s.cue);
    }
    const bars = $('.xp-phase').children;
    if (lastIdx !== s.index) { for (let i = 0; i < bars.length; i++) bars[i].firstChild.style.width = i < s.index ? '100%' : '0'; lastIdx = s.index; }
    if (bars[s.index]) bars[s.index].firstChild.style.width = (s.u * 100).toFixed(1) + '%';
    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + (dt || 1) / 0.5); const e = 1 - Math.pow(1 - camAnim.t, 3);
      camera.position.lerpVectors(camAnim.fromPos, camAnim.pos, e); controls.target.lerpVectors(camAnim.fromTarget, camAnim.target, e);
      if (camAnim.t >= 1) camAnim = null;
    }
    moving = controls.update();
    renderer.render(scene, camera);
    return s;
  }

  function loop(ts) {
    raf = 0;
    if (disposed || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    if (playing && clip) time += dt * speed;
    renderFrame(dt);
    if (playing || camAnim || moving) raf = requestAnimationFrame(loop);
  }
  function requestFrame() { if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(loop); }

  // ---------- UI events ----------
  $('.xp-play').addEventListener('click', () => setPlaying(!playing));
  $('.xp-speed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setSpeed(Number(b.dataset.speed)); });
  $('.xp-cam').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.cam); });

  const ready = load(exerciseId).then(() => { setPlaying(playing); });

  const api = {
    ready,
    get exercise() { return def; },
    get time() { return time; },
    play: () => setPlaying(true), pause: () => setPlaying(false), toggle: () => setPlaying(!playing),
    setSpeed, setView, setExercise: (id) => load(id),
    /** Jump to a time (s at 1x) and render immediately (used by QA). */
    seek(t) { time = t; lastCue = null; const s = renderFrame(0); return s; },
    /** Jump to the moment the timeline reaches a named key pose. */
    seekKey(name) { return api.seek(clip.timeOfKey(name)); },
    /** Max IK / foot residuals over one cycle (QA): metres. */
    _rig: () => rig, _clip: () => clip, _man: () => man,
    diagnostics(samples = 48) {
      const out = { arm: 0, leg: 0, footSlide: 0, minY: 9 };
      const ref = {}; const tmp = new THREE.Box3();
      for (let k = 0; k < samples; k++) {
        const s = clip.sample((k / samples) * clip.duration); rig.apply(s.pose);
        out.arm = Math.max(out.arm, rig.err.armL, rig.err.armR); out.leg = Math.max(out.leg, rig.err.legL, rig.err.legR);
        out.leg = Math.max(out.leg, rig.footError(s.pose));
        for (const m of man.meshes) { tmp.setFromObject(m, true); out.minY = Math.min(out.minY, tmp.min.y); }
      }
      api.seek(time); return out;
    },
    on(n, f) { (listeners[n] ||= []).push(f); return () => (listeners[n] = listeners[n].filter((x) => x !== f)); },
    dispose() {
      disposed = true; if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      controls.dispose();
      for (const e of Object.values(equip)) e.dispose?.();
      man.dispose(); floor.geometry.dispose(); floor.material.dispose(); blob.geometry.dispose(); blob.material.dispose(); floorTex.dispose(); blobTex.dispose();
      renderer.dispose(); renderer.forceContextLoss();
      el.remove();
    },
  };
  return api;
}
