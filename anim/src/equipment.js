// Simple, low-poly equipment. Every item returns { object, anchors, update(params), noFit, dispose }.
// Anchors are Object3Ds the rig's hands can IK to (e.g. 'equip:kb:gripL').
import * as THREE from '../vendor/three.module.min.js';

const C = { iron: 0x2c3038, ironHi: 0x3a3f4a, frame: 0x323845, pad: 0x1a1d24, steel: 0x8c94a3, accent: 0xc6f24e, mat: 0x1f242c, cable: 0x9aa3b2 };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15, ...o });

function kit() {
  const geoms = [], mats = [];
  const g = (x) => (geoms.push(x), x);
  const m = (x) => (mats.push(x), x);
  return { g, m, dispose: () => { geoms.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); } };
}
const anchor = (parent, name, pos) => { const a = new THREE.Object3D(); a.name = name; a.position.fromArray(pos); parent.add(a); return a; };

// Cylinder spanning two points (used for levers, cables, frames).
function strut(k, mat, r, seg = 8) {
  const mesh = new THREE.Mesh(k.g(new THREE.CylinderGeometry(r, r, 1, seg)), mat);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  mesh.set = (p, q) => {
    a.fromArray(p); b.fromArray(q);
    const d = b.clone().sub(a); const len = Math.max(d.length(), 1e-4);
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.quaternion.setFromUnitVectors(up, d.divideScalar(len));
    mesh.scale.set(1, len, 1);
    return mesh;
  };
  return mesh;
}
const box = (k, mat, size, pos, r = 0) => {
  const geo = k.g(new THREE.BoxGeometry(...size));
  const b = new THREE.Mesh(geo, mat); b.position.fromArray(pos); if (r) b.rotation.x = r; return b;
};

// ---------------- kettlebell ----------------
// Local frame: bell centre at origin, handle on top (+Y), handle span along X.
export function kettlebell({ kg = 16 } = {}) {
  const k = kit(); const s = Math.cbrt(kg / 16);
  const grp = new THREE.Group(); grp.name = 'kettlebell';
  const iron = k.m(std(C.iron, { metalness: 0.55, roughness: 0.38 }));
  const inner = new THREE.Group(); inner.scale.setScalar(s); grp.add(inner);
  const body = new THREE.Mesh(k.g(new THREE.SphereGeometry(0.095, 20, 14)), iron); body.scale.set(1, 0.94, 1); inner.add(body);
  const base = new THREE.Mesh(k.g(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18)), iron); base.position.y = -0.082; inner.add(base);
  const path = new THREE.CatmullRomCurve3([[-0.07, 0.03], [-0.078, 0.11], [-0.066, 0.17], [-0.035, 0.192], [0, 0.195], [0.035, 0.192], [0.066, 0.17], [0.078, 0.11], [0.07, 0.03]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  inner.add(new THREE.Mesh(k.g(new THREE.TubeGeometry(path, 28, 0.016, 8)), iron));
  const band = new THREE.Mesh(k.g(new THREE.TorusGeometry(0.0955, 0.004, 6, 32)), k.m(std(C.accent, { emissive: C.accent, emissiveIntensity: 0.3 })));
  band.rotation.x = Math.PI / 2; band.position.y = 0.0; inner.add(band);
  const anchors = {
    grip: anchor(inner, 'grip', [0, 0.195, 0]),
    gripL: anchor(inner, 'gripL', [0.042, 0.19, 0]), gripR: anchor(inner, 'gripR', [-0.042, 0.19, 0]),
    hornL: anchor(inner, 'hornL', [0.074, 0.115, 0]), hornR: anchor(inner, 'hornR', [-0.074, 0.115, 0]),
  };
  return { object: grp, anchors, dispose: k.dispose };
}

// ---------------- dumbbell ----------------
// Local frame: grip centre at origin, bar along Z.
export function dumbbell({ kg = 11 } = {}) {
  const k = kit(); const grp = new THREE.Group(); grp.name = 'dumbbell';
  const steel = k.m(std(C.steel, { metalness: 0.7, roughness: 0.3 }));
  const iron = k.m(std(C.iron, { metalness: 0.3, roughness: 0.5 }));
  const bar = new THREE.Mesh(k.g(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 10)), steel); bar.rotation.x = Math.PI / 2; grp.add(bar);
  const r = 0.05 + 0.012 * Math.cbrt(kg / 11);
  for (const z of [-0.1, 0.1]) {
    const hex = new THREE.Mesh(k.g(new THREE.CylinderGeometry(r, r, 0.075, 6)), iron); hex.rotation.x = Math.PI / 2; hex.position.z = z + Math.sign(z) * 0.03; grp.add(hex);
  }
  return { object: grp, anchors: { grip: anchor(grp, 'grip', [0, 0, 0]) }, dispose: k.dispose };
}

// ---------------- mat & bench ----------------
export function mat({ size = [0.62, 1.85], pos = [0, 0, 0] } = {}) {
  const k = kit(); const grp = new THREE.Group(); grp.name = 'mat';
  const m = new THREE.Mesh(k.g(new THREE.BoxGeometry(size[0], 0.008, size[1])), k.m(std(C.mat, { roughness: 0.9, metalness: 0 })));
  m.position.y = 0.004; grp.add(m);
  const edge = new THREE.Mesh(k.g(new THREE.BoxGeometry(size[0] + 0.01, 0.004, 0.02)), k.m(std(C.accent, { emissive: C.accent, emissiveIntensity: 0.2 })));
  edge.position.set(0, 0.006, size[1] / 2 - 0.03); grp.add(edge);
  grp.position.fromArray(pos);
  return { object: grp, anchors: {}, dispose: k.dispose, flat: true };
}

export function bench({ pos = [0, 0, 0], h = 0.45 } = {}) {
  const k = kit(); const grp = new THREE.Group(); grp.name = 'bench';
  const pad = k.m(std(C.pad, { roughness: 0.8 })), frame = k.m(std(C.frame, { metalness: 0.4 }));
  grp.add(box(k, pad, [0.3, 0.06, 1.15], [0, h - 0.03, 0]));
  grp.add(box(k, frame, [0.06, h - 0.06, 0.06], [0, (h - 0.06) / 2, 0.42]));
  grp.add(box(k, frame, [0.06, h - 0.06, 0.06], [0, (h - 0.06) / 2, -0.42]));
  grp.add(box(k, frame, [0.42, 0.04, 0.08], [0, 0.02, 0.42]));
  grp.add(box(k, frame, [0.42, 0.04, 0.08], [0, 0.02, -0.42]));
  grp.position.fromArray(pos);
  return { object: grp, anchors: {}, dispose: k.dispose };
}

// ---------------- machines ----------------
// Generic selectorised machine. A machine is static parts + two handles whose path is a function of t ∈ [0,1]
// (0 = start / stretched position, 1 = end of the concentric). Levers are drawn from a fixed pivot to each handle.
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function seatUnit(k, grp, { seatY = 0.45, seatZ = 0.0, back = null, chestPad = null, frame, pad }) {
  grp.add(box(k, pad, [0.36, 0.07, 0.38], [0, seatY - 0.035, seatZ]));
  grp.add(box(k, frame, [0.07, seatY - 0.07, 0.07], [0, (seatY - 0.07) / 2, seatZ - 0.02]));
  grp.add(box(k, frame, [0.5, 0.04, 0.5], [0, 0.02, seatZ]));
  if (back) { // back pad: { z, y0, y1, tilt }
    const h = back.y1 - back.y0;
    const b = box(k, pad, [0.36, h, 0.07], [0, back.y0 + h / 2, back.z], back.tilt || 0); grp.add(b);
    grp.add(box(k, frame, [0.06, back.y1, 0.06], [0, back.y1 / 2, back.z - 0.08]));
  }
  if (chestPad) { // { z, y }
    grp.add(box(k, pad, [0.32, 0.36, 0.08], [0, chestPad.y, chestPad.z]));
    const post = strut(k, frame, 0.03).set([0, 0.04, chestPad.z + 0.25], [0, chestPad.y - 0.1, chestPad.z + 0.08]); grp.add(post);
  }
}

function weightStack(k, grp, pos, frame, accent) {
  const [x, , z] = pos;
  grp.add(box(k, frame, [0.06, 2.1, 0.06], [x - 0.2, 1.05, z]));
  grp.add(box(k, frame, [0.06, 2.1, 0.06], [x + 0.2, 1.05, z]));
  grp.add(box(k, frame, [0.46, 0.06, 0.06], [x, 2.1, z]));
  const plates = k.m(std(0x2a2e36, { metalness: 0.5, roughness: 0.4 }));
  for (let i = 0; i < 9; i++) grp.add(box(k, plates, [0.32, 0.045, 0.14], [x, 0.08 + i * 0.05, z]));
  grp.add(box(k, accent, [0.33, 0.012, 0.145], [x, 0.08 + 9 * 0.05 - 0.02, z]));
  grp.add(box(k, frame, [0.6, 0.04, 0.3], [x, 0.02, z]));
}

const MACHINES = {
  // Seated chest press: back pad behind, handles at mid-chest pressed forward.
  chestPress: {
    seat: { seatY: 0.45, back: { z: -0.215, y0: 0.5, y1: 1.25 } },
    pivot: (s) => [s * 0.36, 1.78, -0.32],
    path: (t, s) => lerp3([s * 0.25, 1.0, 0.1], [s * 0.15, 1.04, 0.56], t),
    handle: 'v',
  },
  // Iso-lateral row: chest pad in front, independent levers pivot low-front; neutral handles.
  isoRow: {
    seat: { seatY: 0.45, chestPad: { z: 0.21, y: 1.0 } },
    pivot: (s) => [s * 0.3, 0.25, 0.95],
    path: (t, s) => lerp3([s * 0.19, 1.0, 0.6], [s * 0.24, 0.98, 0.0], t),
    handle: 'v', stack: false,
  },
  // Lat pulldown: thigh pad, wide bar on a cable.
  latPulldown: {
    seat: { seatY: 0.45 }, kneePad: true,
    bar: (t) => lerp3([0, 1.6, 0.1], [0, 1.1, 0.16], t), barHalf: 0.44, gripX: 0.36, pulley: [0, 2.35, 0.12], stack: [0, 0, 0.62],
  },
  // Seated shoulder press: back pad, handles from shoulder height up overhead.
  shoulderPress: {
    seat: { seatY: 0.45, back: { z: -0.215, y0: 0.5, y1: 1.4 } },
    pivot: (s) => [s * 0.36, 0.95, -0.5],
    path: (t, s) => lerp3([s * 0.27, 1.12, 0.04], [s * 0.19, 1.63, 0.04], t),
    handle: 'h',
  },
  // Pec deck: arms hang from overhead pivots in line with the shoulders and sweep on an arc.
  pecDeck: {
    seat: { seatY: 0.45, back: { z: -0.215, y0: 0.5, y1: 1.4 } },
    arc: { cx: 0.185, cz: -0.06, r: 0.55, y: 1.05, a0: -8, a1: 106 }, top: 1.62, handle: 'v',
  },
  // Rear-delt (reverse) pec deck: same machine, sitting facing the pad; handles start in front and sweep back.
  reverseFly: {
    seat: { seatY: 0.45, chestPad: { z: 0.2, y: 1.02 } },
    arc: { cx: 0.185, cz: -0.06, r: 0.56, y: 1.07, a0: 104, a1: -4 }, top: 1.62, handle: 'v',
  },
  // Cable stack with a short straight bar (triceps pushdown). Handles follow the hands (space 'hands').
  cableStack: { stack: [0, 0, 0.5], pulley: [0, 2.05, 0.38], free: true },
};

export function machine({ kind, pos = [0, 0, 0] }) {
  const def = MACHINES[kind]; if (!def) throw new Error('Unknown machine ' + kind);
  const k = kit(); const grp = new THREE.Group(); grp.name = 'machine-' + kind; grp.position.fromArray(pos);
  const frame = k.m(std(C.frame, { metalness: 0.45, roughness: 0.45 })), pad = k.m(std(C.pad, { roughness: 0.85 }));
  const steel = k.m(std(C.steel, { metalness: 0.75, roughness: 0.28 })), accent = k.m(std(C.accent, { emissive: C.accent, emissiveIntensity: 0.25 }));
  const cableMat = k.m(std(C.cable, { metalness: 0.3, roughness: 0.4 }));
  if (def.seat) seatUnit(k, grp, { ...def.seat, frame, pad });
  if (def.kneePad) { grp.add(box(k, pad, [0.42, 0.07, 0.12], [0, 0.612, 0.36])); grp.add(box(k, frame, [0.05, 0.58, 0.05], [0, 0.29, 0.43])); }

  const anchors = { handleL: anchor(grp, 'handleL', [0.2, 1, 0.3]), handleR: anchor(grp, 'handleR', [-0.2, 1, 0.3]) };
  const dyn = []; // per-frame updaters
  let cableTop = null;

  if (def.path || def.arc) {
    for (const s of [1, -1]) {
      const a = s > 0 ? anchors.handleL : anchors.handleR;
      const lever = strut(k, frame, 0.022); grp.add(lever);
      const lever2 = def.arc ? strut(k, frame, 0.022) : null; if (lever2) grp.add(lever2);
      const grip = new THREE.Mesh(k.g(new THREE.CylinderGeometry(0.017, 0.017, 0.16, 10)), steel);
      const gripEnd = new THREE.Mesh(k.g(new THREE.CylinderGeometry(0.021, 0.021, 0.02, 10)), accent);
      grp.add(grip); grp.add(gripEnd);
      if (def.path) grp.add(box(k, frame, [0.08, 0.08, 0.08], def.pivot(s)));
      dyn.push((t) => {
        let p;
        if (def.path) p = def.path(t, s);
        else {
          const { cx, cz, r, y, a0, a1 } = def.arc; const ang = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
          p = [s * (cx + r * Math.cos(ang)), y, cz + r * Math.sin(ang)];
        }
        a.position.fromArray(p);
        if (def.handle === 'h') { grip.rotation.set(0, 0, Math.PI / 2); grip.position.fromArray(p); gripEnd.position.set(p[0] + s * 0.085, p[1], p[2]); gripEnd.rotation.set(0, 0, Math.PI / 2); }
        else { grip.rotation.set(0, 0, 0); grip.position.fromArray(p); gripEnd.position.set(p[0], p[1] + 0.085, p[2]); }
        if (def.path) lever.set(def.pivot(s), [p[0] + (def.handle === 'h' ? s * 0.09 : 0), p[1] - (def.handle === 'h' ? 0 : 0.08), p[2]]);
        else { const top = [s * def.arc.cx, def.top, def.arc.cz]; const above = [p[0], def.top, p[2]]; lever.set(top, above); lever2.set(above, [p[0], p[1] + 0.08, p[2]]); }
      });
    }
    if (def.arc) { grp.add(box(k, frame, [0.75, 0.06, 0.08], [0, def.top + 0.02, def.arc.cz])); grp.add(box(k, frame, [0.06, def.top + 0.02, 0.06], [0, (def.top + 0.02) / 2, def.arc.cz - 0.32])); grp.add(box(k, frame, [0.06, 0.06, 0.32], [0, def.top + 0.02, def.arc.cz - 0.16])); }
  }

  if (def.bar) {
    const barG = new THREE.Group(); grp.add(barG);
    const straight = new THREE.Mesh(k.g(new THREE.CylinderGeometry(0.014, 0.014, def.barHalf * 2 - 0.2, 10)), steel); straight.rotation.z = Math.PI / 2; barG.add(straight);
    for (const s of [1, -1]) {
      const end = strut(k, steel, 0.014).set([s * (def.barHalf - 0.1), 0, 0], [s * def.barHalf, -0.07, 0]); barG.add(end);
      const cap = new THREE.Mesh(k.g(new THREE.SphereGeometry(0.02, 8, 6)), accent); cap.position.set(s * def.barHalf, -0.07, 0); barG.add(cap);
    }
    const cable = strut(k, cableMat, 0.005, 5); grp.add(cable);
    grp.add(box(k, frame, [0.06, 0.06, 0.6], [0, def.pulley[1] + 0.05, def.pulley[2] + 0.25]));
    grp.add(new THREE.Mesh(k.g(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14)), steel).translateY(def.pulley[1]).translateZ(def.pulley[2]).rotateZ(Math.PI / 2));
    dyn.push((t) => {
      const p = def.bar(t); barG.position.fromArray(p);
      anchors.handleL.position.set(def.gripX, p[1], p[2]); anchors.handleR.position.set(-def.gripX, p[1], p[2]);
      cable.set([0, p[1], p[2]], def.pulley);
    });
  }

  if (def.stack) weightStack(k, grp, def.stack, frame, accent);

  if (def.free) { // cable bar positioned by the rig ('hands' space) — we only draw the cable to it
    const cable = strut(k, cableMat, 0.005, 5); grp.add(cable);
    grp.add(box(k, frame, [0.06, 0.06, 0.24], [0, def.pulley[1] + 0.04, def.pulley[2] + 0.1]));
    cableTop = (barWorld) => cable.set([barWorld.x - pos[0], barWorld.y - pos[1] + 0.02, barWorld.z - pos[2]], def.pulley);
  }

  const update = (p = {}) => { const t = p.t ?? 0; dyn.forEach((f) => f(t)); };
  update({ t: 0 });
  return { object: grp, anchors, update, dispose: k.dispose, noFit: true, cableTo: cableTop };
}

// Short straight cable bar (positioned at the hands).
export function cableBar() {
  const k = kit(); const grp = new THREE.Group(); grp.name = 'cable-bar';
  const steel = k.m(std(C.steel, { metalness: 0.75, roughness: 0.28 }));
  const bar = new THREE.Mesh(k.g(new THREE.CylinderGeometry(0.014, 0.014, 0.44, 10)), steel); bar.rotation.z = Math.PI / 2; grp.add(bar);
  const ring = new THREE.Mesh(k.g(new THREE.TorusGeometry(0.02, 0.006, 6, 12)), steel); ring.position.y = 0.02; grp.add(ring);
  return { object: grp, anchors: { grip: anchor(grp, 'grip', [0, 0, 0]) }, dispose: k.dispose };
}

export function createEquipment(spec) {
  switch (spec.type) {
    case 'kettlebell': return kettlebell(spec);
    case 'dumbbell': return dumbbell(spec);
    case 'mat': return mat(spec);
    case 'bench': return bench(spec);
    case 'machine': return machine(spec);
    case 'cableBar': return cableBar(spec);
    default: throw new Error('Unknown equipment ' + spec.type);
  }
}
