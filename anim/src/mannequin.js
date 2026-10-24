// Procedural, license-free human mannequin (~175 cm) with a real joint hierarchy and a sculpted
// musculature that mirrors the app's 2D body map (js/muscles.js): every muscle group is its own
// pillowed plate wrapped onto a dark base body, separated by near-black grooves.
//   • Torso plates (pecs, abs grid, obliques, traps, lats, mid back, erectors, glutes) are skinned
//     across pelvis/spine1/spine2/chest so the trunk bends without tearing.
//   • Limb plates (delts, biceps, brachialis, triceps, forearms, quads ×3, adductors, hamstrings ×2,
//     calves) are rigid on their bone. Head, hands and feet stay simple dark shapes.
//   • Three shared colour-state materials (inactive / secondary / primary) — muscles swap between
//     them; the primary material glows and can pulse on the concentric phase.
import * as THREE from '../vendor/three.module.min.js';

export const COLORS = {
  base: 0x0f1217,       // dark body / grooves (near black)
  shape: 0x232833,      // head, hands, feet
  shoe: 0x1b1f27,
  inactive: 0x2b3140, secondary: 0x6b7f3a, primary: 0xc6f24e,
  rim: 0x8a96b0, accent: 0xc6f24e,
};

export const MUSCLES = ['chest', 'frontDelts', 'sideDelts', 'rearDelts', 'traps', 'lats', 'midBack', 'lowerBack',
  'biceps', 'brachialis', 'triceps', 'forearms', 'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'adductors', 'calves'];

// Segment lengths (m). Drillis & Contini proportions for H = 1.75 m.
export const DIM = {
  hipOff: [0.09, -0.04, 0], thigh: 0.43, shin: 0.43,
  spine1: 0.07, spine2: 0.16, chest: 0.16, neck: [0, 0.13, -0.005], head: [0, 0.085, 0.01],
  clav: [0.02, 0.10, 0], shoulder: [0.165, -0.02, -0.01], upperArm: 0.30, forearm: 0.26, grip: 0.075,
};

const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const GAP = 0.0032; // half-width of the dark groove between muscle plates (m)
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/** Catmull-Rom through table rows [key, ...cols] → f(key) → [...cols]. */
function table(rows) {
  const n = rows.length;
  return (k) => {
    if (k <= rows[0][0]) return rows[0].slice(1);
    if (k >= rows[n - 1][0]) return rows[n - 1].slice(1);
    let i = 0; while (k > rows[i + 1][0]) i++;
    const p0 = rows[Math.max(0, i - 1)], p1 = rows[i], p2 = rows[i + 1], p3 = rows[Math.min(n - 1, i + 2)];
    const t = (k - p1[0]) / (p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;
    const out = [];
    for (let c = 1; c < p1.length; c++) {
      // tangents scaled for non-uniform spacing
      const m1 = ((p2[c] - p0[c]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0]);
      const m2 = ((p3[c] - p1[c]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0]);
      out.push((2 * t3 - 3 * t2 + 1) * p1[c] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[c] + (t3 - t2) * m2);
    }
    return out;
  };
}
const lin = (pts) => (k) => { // piecewise-linear [[k, v], ...]
  if (k <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (k <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (k - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return pts[pts.length - 1][1];
};

/**
 * Generalised cylinder along local Y: t∈[0,1] maps y0→y1; cross-section is an ellipse with
 * separate front/back depth. θ (deg) is measured from the front (+Z) towards +X.
 * Rows: [t, rx, rzFront, rzBack, cz]. c0/c1 = rounded end caps (in t units).
 */
function tube(y0, y1, rows, c0 = 0.1, c1 = 0.1) {
  const prof = table(rows);
  const seg = {
    pt(t, th, out) {
      let k = 1;
      if (t < 0) k = Math.sqrt(Math.max(0, 1 - (t / c0) ** 2));
      else if (t > 1) k = Math.sqrt(Math.max(0, 1 - ((t - 1) / c1) ** 2));
      const [rx, rzF, rzB, cz] = prof(clamp(t, 0, 1));
      const s = Math.sin(th), c = Math.cos(th);
      const f = 0.5 + 0.5 * Math.sin(clamp(c * 2.2, -1, 1) * Math.PI / 2);
      const rz = lerp(rzB, rzF, f);
      return out.set(rx * k * s, lerp(y0, y1, t), cz + rz * k * c);
    },
    ctr(t, out) { const cz = prof(clamp(t, 0, 1))[3]; return out.set(0, lerp(y0, y1, t), cz); },
    tMin: -c0, tMax: 1 + c1, len: Math.abs(y1 - y0),
  };
  return seg;
}
/** Ellipsoid cap: t = polar angle / π (0 = top), θ around Y from +Z towards +X. */
function cap(c, r) {
  return {
    pt(t, th, out) { const p = t * Math.PI; const sp = Math.sin(p); return out.set(c[0] + r[0] * sp * Math.sin(th), c[1] + r[1] * Math.cos(p), c[2] + r[2] * sp * Math.cos(th)); },
    ctr(t, out) { return out.set(c[0], c[1], c[2]); },
    tMin: 0, tMax: 1, len: Math.PI * r[1],
  };
}

const _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Vector3(), _c = new THREE.Vector3();
function surfNormal(seg, t, th, mir, out) {
  const e = 1e-3;
  seg.pt(t, th + e, _a).sub(seg.pt(t, th - e, _q));
  const tt = clamp(t, seg.tMin + e, seg.tMax - e);
  seg.pt(tt + e, th, _b).sub(seg.pt(tt - e, th, _q));
  out.crossVectors(_a, _b);
  if (out.lengthSq() < 1e-14) { seg.pt(t, th, _p); seg.ctr(t, _c); out.subVectors(_p, _c); }
  out.normalize();
  seg.pt(t, th, _p); seg.ctr(clamp(t, 0, 1), _c); _p.sub(_c);
  if (out.dot(_p) < 0) out.negate();
  if (mir) out.x = -out.x;
  return out;
}

/** Accumulates triangles for one (bone, material-group) bucket. */
class Bucket {
  constructor() { this.pos = []; this.nrm = []; this.idx = []; this.skin = null; }
  get count() { return this.pos.length / 3; }
}

export function createMannequin() {
  const geoms = [];
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.03, ...extra });
  // Fresnel rim, injected into the standard shader.
  const withRim = (mat, rimColor, power = 2.6, strength = 1) => {
    mat.userData.rim = { value: new THREE.Color(rimColor).multiplyScalar(strength) };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.rimColor = mat.userData.rim;
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec3 rimColor;\nvoid main() {')
        .replace('#include <opaque_fragment>', `outgoingLight += rimColor * pow(1.0 - saturate(dot(normal, geometryViewDir)), ${power.toFixed(2)});\n#include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => 'rim' + power.toFixed(2);
    return mat;
  };
  const mats = {
    base: withRim(std(COLORS.base, { roughness: 0.85 }), 0x2a3140, 3, 0.6),
    shape: withRim(std(COLORS.shape, { roughness: 0.6 }), 0x55607a, 2.6, 0.5),
    shoe: std(COLORS.shoe, { roughness: 0.75 }),
    sole: std(0x2b3140, { roughness: 0.7 }),
    inactive: withRim(std(COLORS.inactive, { roughness: 0.5, toneMapped: false }), COLORS.rim, 2.4, 0.3),
    secondary: withRim(std(COLORS.secondary, { roughness: 0.5, toneMapped: false, emissive: COLORS.secondary, emissiveIntensity: 0.1 }), 0xb9cf7a, 2.4, 0.25),
    primary: withRim(std(COLORS.primary, { roughness: 0.45, toneMapped: false, emissive: COLORS.primary, emissiveIntensity: 0.14 }), 0xeaffb0, 2.2, 0.35),
  };

  const meshes = [];
  const J = {};
  const joint = (name, parent, pos) => {
    const o = new THREE.Object3D(); o.name = name; o.position.fromArray(pos); parent.add(o); J[name] = o; return o;
  };
  const ell = (parent, mat, pos, scale, rot) => {
    const m = new THREE.Mesh(SPHERE, mat); m.position.fromArray(pos); m.scale.fromArray(scale);
    if (rot) m.rotation.set(...rot.map((d) => d * D2R));
    parent.add(m); meshes.push(m); return m;
  };

  // ---------------- surface builders ----------------
  const buckets = new Map();   // key `${boneName}|${group}` → Bucket
  const bucket = (bone, group) => { const k = bone + '|' + group; if (!buckets.has(k)) buckets.set(k, new Bucket()); return buckets.get(k); };
  const SKIN_BONES = ['pelvis', 'spine1', 'spine2', 'chest'];
  // Torso skin weights by rest-pose height (world y).
  const B1 = 1.0, B2 = 1.14, B3 = 1.30, BH = 0.035;
  const torsoWeights = (y) => {
    const a1 = smooth((y - (B1 - BH)) / (2 * BH)), a2 = smooth((y - (B2 - BH)) / (2 * BH)), a3 = smooth((y - (B3 - BH)) / (2 * BH));
    return [1 - a1, a1 - a2, a2 - a3, a3];
  };

  /** Full closed base surface of a segment. */
  function baseSurface(bone, seg, nTh, nT, skinned) {
    const B = bucket(bone, 'base'); const o = B.count;
    const n = new THREE.Vector3(), p = new THREE.Vector3();
    for (let j = 0; j <= nT; j++) {
      const t = lerp(seg.tMin, seg.tMax, j / nT);
      for (let i = 0; i <= nTh; i++) {
        const th = (i / nTh) * Math.PI * 2;
        seg.pt(t, th, p); surfNormal(seg, t, th, false, n);
        B.pos.push(p.x, p.y, p.z); B.nrm.push(n.x, n.y, n.z);
        if (skinned) (B.skin ||= []).push(...torsoWeights(p.y));
      }
    }
    for (let j = 0; j < nT; j++) for (let i = 0; i < nTh; i++) {
      const a = o + j * (nTh + 1) + i, b = a + 1, c = a + nTh + 1, d = c + 1;
      B.idx.push(a, c, b, b, c, d);
    }
    fixWinding(B, o);
  }
  // Make the first triangle of a freshly added block face outward; flip the block if not.
  function fixWinding(B, o, startIdx) {
    const s = startIdx ?? B.idx.findIndex((v) => v >= o);
    const [ia, ib, ic] = [B.idx[s], B.idx[s + 1], B.idx[s + 2]];
    const P = (i) => new THREE.Vector3(B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]);
    const N = new THREE.Vector3(B.nrm[ia * 3], B.nrm[ia * 3 + 1], B.nrm[ia * 3 + 2]);
    const f = new THREE.Vector3().crossVectors(P(ib).sub(P(ia)), P(ic).sub(P(ia)));
    if (f.dot(N) < 0) for (let k = s; k < B.idx.length; k += 3) { const t = B.idx[k + 1]; B.idx[k + 1] = B.idx[k + 2]; B.idx[k + 2] = t; }
  }

  /**
   * One muscle plate on a segment. spec: { t:[a,b] | tf(s)→[a,b], th:[a,b] deg | thf(t)→[a,b], h (thickness),
   * conv (deltoid-style convergence towards θ=90 at the far end), round (edge exponent) }.
   * Mirrored (right side) when mir=true: θ → −θ.
   */
  function plate(bone, id, seg, spec, mir, skinned) {
    const B = bucket(bone, id); const o = B.count; const s0 = B.idx.length;
    const tR = spec.t || [0, 1];
    const thR = (t) => (spec.thf ? spec.thf(t) : spec.th);
    // resolution from physical size
    const tm = (tR[0] + tR[1]) / 2, [ta, tb] = thR(tm);
    const r = 0.06, arc = Math.abs(tb - ta) * D2R * r * (seg.len < 0.5 ? 1 : 1.9);
    const nu = clamp(Math.round(arc / 0.0085), 6, 18), nv = clamp(Math.round((Math.abs(tR[1] - tR[0]) * seg.len) / 0.011), 6, 20);
    const h = spec.h ?? 0.013, ex = spec.round ?? 0.3, sink = 0.002;
    // groove: inset every edge by GAP metres (θ via the local radius, t via the segment length)
    const rad = (() => { seg.pt(tm, ((ta + tb) / 2) * D2R, _p); seg.ctr(tm, _c); return Math.max(0.02, Math.hypot(_p.x - _c.x, _p.z - _c.z)); })();
    const gTh = ((spec.gap ?? GAP) / rad) / D2R, gT = (spec.gap ?? GAP) / seg.len;
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        let [t0, t1] = spec.tf ? spec.tf(u) : tR; t0 += gT; t1 -= gT;
        const t = lerp(t0, t1, v);
        let [a, b] = thR(t); a += gTh; b -= gTh;
        if (spec.conv) { const k = 1 - spec.conv * v * v; a = 90 + (a - 90) * k; b = 90 + (b - 90) * k; }
        let th = lerp(a, b, u) * D2R; if (mir) th = -th;
        const bul = Math.pow(Math.sin(Math.PI * u), ex) * Math.pow(Math.sin(Math.PI * v), ex);
        const off = h * bul - sink;
        seg.pt(t, th, p); surfNormal(seg, t, th, false, n);
        p.addScaledVector(n, off);
        B.pos.push(p.x, p.y, p.z); B.nrm.push(n.x, n.y, n.z);
        if (skinned) (B.skin ||= []).push(...torsoWeights(p.y));
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = o + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      B.idx.push(a, b, c, b, d, c);
    }
    fixWinding(B, o, s0);
  }
  const both = (bone, id, seg, spec, skinned) => { plate(bone, id, seg, spec, false, skinned); plate(bone, id, seg, spec, true, skinned); };
  const sided = (s, bone, id, seg, spec) => plate(bone, id, seg, spec, s < 0, false);

  // ---------------- skeleton ----------------
  const root = new THREE.Group(); root.name = 'mannequin';
  const pelvis = joint('pelvis', root, [0, 0.968, 0]);
  const s1 = joint('spine1', pelvis, [0, DIM.spine1, 0]);
  const s2 = joint('spine2', s1, [0, DIM.spine2, 0]);
  const chest = joint('chest', s2, [0, DIM.chest, 0]);
  const neck = joint('neck', chest, DIM.neck);
  const head = joint('head', neck, DIM.head);

  // ---------------- torso (skinned, world rest coords) ----------------
  const TY0 = 0.83, TY1 = 1.50, ty = (y) => (y - TY0) / (TY1 - TY0);
  const torso = tube(TY0, TY1, [
    // t,  rx,   rzF,  rzB,   cz
    [ty(0.83), 0.118, 0.078, 0.092, -0.008],
    [ty(0.89), 0.146, 0.088, 0.108, -0.008],
    [ty(0.96), 0.150, 0.092, 0.106, -0.004],
    [ty(1.02), 0.140, 0.092, 0.096, -0.002],
    [ty(1.08), 0.132, 0.091, 0.092, 0.000],
    [ty(1.16), 0.140, 0.096, 0.094, 0.000],
    [ty(1.24), 0.156, 0.106, 0.104, 0.000],
    [ty(1.31), 0.168, 0.114, 0.108, -0.002],
    [ty(1.37), 0.172, 0.108, 0.104, -0.006],
    [ty(1.42), 0.160, 0.092, 0.094, -0.010],
    [ty(1.46), 0.124, 0.074, 0.080, -0.012],
    [ty(1.50), 0.062, 0.052, 0.058, -0.010],
  ], 0.05, 0.04);
  baseSurface('torso', torso, 48, 44, true);
  const T = (bone, id, spec) => both('torso', id, torso, spec, true);
  const yT = (a, b) => [ty(a), ty(b)];
  // pecs: two plates, lower edge rises laterally
  T('torso', 'chest', { thf: () => [0, 64], tf: (u) => [ty(1.252 + 0.07 * Math.pow(u, 1.5)), ty(1.428 - 0.022 * u)], h: 0.024, round: 0.38 });
  // six-pack grid + lower abs, linea alba = gap at θ=0
  const absRows = [[1.19, 1.25], [1.13, 1.19], [1.07, 1.13], [0.885, 1.07]];
  const absEdge = (y) => 5 + 16 * smooth((y - 0.885) / 0.13);
  absRows.forEach(([a, b], k) => T('torso', 'abs', { t: yT(a, b), thf: (t) => [0, k === 3 ? absEdge(lerp(TY0, TY1, t)) : 22.5 - k * 0.6], h: 0.012, round: 0.26 }));
  // obliques: beside the abs, wrapping to the flank under the lats
  const oblB = lin([[0.89, 40], [0.92, 95], [0.965, 128], [1.06, 128], [1.12, 108], [1.17, 99], [1.25, 90]]);
  T('torso', 'obliques', { t: yT(0.89, 1.25), thf: (t) => { const y = lerp(TY0, TY1, t); return [(y < 1.07 ? Math.min(22.5, absEdge(y)) : 22.5) + 20 * smooth((y - 1.2) / 0.05), oblB(y)]; }, h: 0.012 });
  // traps: diamond from the neck to mid back, out to the acromion
  const trapL = lin([[1.235, 176.5], [1.30, 162], [1.37, 149], [1.42, 126], [1.452, 104], [1.478, 100], [1.50, 132]]);
  T('torso', 'traps', { t: yT(1.235, 1.50), thf: (t) => [trapL(lerp(TY0, TY1, t)), 180], h: 0.014 });
  // front slice of the upper traps beside the neck
  T('torso', 'traps', { t: yT(1.452, 1.497), thf: () => [12, 60], h: 0.009 });
  // mid back / rhomboids: between traps and lats under the shoulder blade
  T('torso', 'midBack', { t: yT(1.285, 1.405), thf: (t) => [118, trapL(lerp(TY0, TY1, t))], h: 0.012 });
  // lats: wings from the armpit to the low back
  const latA = lin([[1.04, 152], [1.065, 138], [1.12, 113], [1.215, 99], [1.25, 93], [1.27, 82], [1.31, 78]]);
  const latB = lin([[1.04, 165], [1.15, 164], [1.25, 147], [1.28, 120], [1.31, 116]]);
  T('torso', 'lats', { t: yT(1.04, 1.31), thf: (t) => { const y = lerp(TY0, TY1, t); return [latA(y), latB(y)]; }, h: 0.014 });
  // erectors: two columns either side of the spine
  T('torso', 'lowerBack', { t: yT(0.975, 1.228), thf: () => [165, 180], h: 0.016, round: 0.35 });
  // glutes: two rounded cheeks
  T('torso', 'glutes', { t: yT(0.838, 0.99), thf: () => [98, 180], h: 0.034, round: 0.5 });

  // neck + head (simple dark shapes)
  {
    const g = new THREE.CylinderGeometry(0.05, 0.056, 0.13, 20); g.translate(0, 0.06, 0); geoms.push(g);
    const m = new THREE.Mesh(g, mats.base); neck.add(m); meshes.push(m);
  }
  ell(head, mats.shape, [0, 0.095, 0.012], [0.092, 0.114, 0.104]);
  ell(head, mats.shape, [0, 0.072, 0.11], [0.016, 0.022, 0.018]);                 // nose (orientation cue)
  ell(head, mats.shape, [0.091, 0.09, 0.0], [0.012, 0.026, 0.02]);
  ell(head, mats.shape, [-0.091, 0.09, 0.0], [0.012, 0.026, 0.02]);

  // ---------------- legs ----------------
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R';
    const hip = joint('hip' + L, pelvis, [s * DIM.hipOff[0], DIM.hipOff[1], DIM.hipOff[2]]);
    const thigh = tube(0.02, -DIM.thigh, [
      [0.00, 0.086, 0.084, 0.090, 0.004], [0.25, 0.081, 0.081, 0.085, 0.006], [0.60, 0.066, 0.066, 0.067, 0.004],
      [0.90, 0.052, 0.054, 0.050, 0.002], [1.00, 0.048, 0.050, 0.046, 0.0],
    ], 0.16, 0.08);
    baseSurface('hip' + L, thigh, 28, 22);
    const TH = (id, spec) => sided(s, 'hip' + L, id, thigh, spec);
    // quads: vastus lateralis / rectus femoris / vastus medialis
    TH('quads', { t: [0.03, 0.88], thf: (t) => [29 + 4 * t, 120 - 18 * t], h: 0.012 });
    TH('quads', { t: [-0.02, 0.84], thf: (t) => { const w = 19 + 11 * Math.sin(Math.PI * clamp(t * 1.1 + 0.05, 0, 1)); return [1 - w, 1 + w]; }, h: 0.013 });
    TH('quads', { t: [0.5, 0.94], thf: (t) => { const k = (t - 0.5) / 0.44; const w = 8 + 18 * Math.sin(Math.PI * clamp(k * 0.75 + 0.1, 0, 1)); return [-50 - w, -26]; }, h: 0.012 });
    // adductors: inner thigh
    TH('adductors', { t: [-0.02, 0.62], thf: (t) => [-122 + 14 * t, -62 - 30 * smooth((t - 0.4) / 0.22)], h: 0.011 });
    // hamstrings: biceps femoris + semitendinosus columns
    TH('hamstrings', { t: [0.1, 0.86], thf: (t) => [120, 180], h: 0.012 });
    TH('hamstrings', { t: [0.1, 0.86], thf: (t) => [180, 238], h: 0.012 });

    const knee = joint('knee' + L, hip, [0, -DIM.thigh, 0]);
    ell(knee, mats.base, [0, 0, 0.008], [0.052, 0.054, 0.054]);
    const shin = tube(0.0, -DIM.shin, [
      [0.00, 0.050, 0.048, 0.050, 0.0], [0.20, 0.052, 0.045, 0.064, -0.002], [0.36, 0.050, 0.042, 0.060, -0.002],
      [0.62, 0.038, 0.035, 0.040, 0.0], [0.86, 0.030, 0.030, 0.031, 0.0], [1.00, 0.032, 0.032, 0.034, 0.0],
    ], 0.12, 0.08);
    baseSurface('knee' + L, shin, 26, 22);
    const SH = (id, spec) => sided(s, 'knee' + L, id, shin, spec);
    SH('calves', { t: [0.06, 0.56], thf: (t) => [116, 180], h: 0.013 });     // gastrocnemius lateral head
    SH('calves', { t: [0.05, 0.62], thf: (t) => [180, 248], h: 0.014 });     // gastrocnemius medial head
    SH('calves', { t: [0.08, 0.76], thf: (t) => [-2, 66 - 10 * t], h: 0.01 }); // front: tibialis / lateral calf
    SH('calves', { t: [0.1, 0.64], thf: (t) => [-110, -40], h: 0.011 });     // front: medial calf

    const ankle = joint('ankle' + L, knee, [0, -DIM.shin, 0]);
    ell(ankle, mats.base, [0, 0, 0], [0.034, 0.036, 0.036]);
    ell(ankle, mats.shoe, [0, -0.035, 0.055], [0.047, 0.04, 0.13]);
    ell(ankle, mats.sole, [0, -0.066, 0.055], [0.049, 0.012, 0.132]);
  }

  // ---------------- arms ----------------
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R';
    const clav = joint('clav' + L, chest, [s * DIM.clav[0], DIM.clav[1], DIM.clav[2]]);
    const sh = joint('shoulder' + L, clav, [s * DIM.shoulder[0], DIM.shoulder[1], DIM.shoulder[2]]);
    const delt = cap([s * 0.012, -0.045, -0.004], [0.064, 0.092, 0.064]);
    baseSurface('shoulder' + L, delt, 24, 14);
    const DL = (id, spec) => sided(s, 'shoulder' + L, id, delt, spec);
    DL('frontDelts', { t: [0.12, 0.8], th: [-48, 44], conv: 0.55, h: 0.013 });
    DL('sideDelts', { t: [0.08, 0.82], th: [44, 134], conv: 0.5, h: 0.015 });
    DL('rearDelts', { t: [0.12, 0.8], th: [134, 222], conv: 0.55, h: 0.013 });
    const upper = tube(-0.02, -DIM.upperArm, [
      [0.00, 0.052, 0.050, 0.051, 0.0], [0.30, 0.047, 0.047, 0.049, 0.0], [0.65, 0.042, 0.045, 0.043, 0.0], [1.00, 0.036, 0.036, 0.034, 0.0],
    ], 0.14, 0.1);
    baseSurface('shoulder' + L, upper, 24, 18);
    const UA = (id, spec) => sided(s, 'shoulder' + L, id, upper, spec);
    UA('biceps', { t: [0.22, 0.9], thf: (t) => [-46, 42], h: 0.013 });
    UA('brachialis', { t: [0.48, 0.92], th: [42, 92], h: 0.008 });
    UA('brachialis', { t: [0.54, 0.92], th: [-84, -46], h: 0.007 });
    UA('triceps', { t: [0.12, 0.82], th: [92, 172], h: 0.012 });   // lateral head
    UA('triceps', { t: [0.1, 0.88], th: [172, 262], h: 0.013 });  // long head

    const el = joint('elbow' + L, sh, [0, -DIM.upperArm, 0]);
    ell(el, mats.base, [0, 0, 0], [0.04, 0.04, 0.04]);
    const fore = tube(0.0, -DIM.forearm, [
      [0.00, 0.043, 0.038, 0.040, 0.0], [0.25, 0.046, 0.037, 0.038, 0.0], [0.70, 0.030, 0.025, 0.026, 0.0], [1.00, 0.026, 0.020, 0.022, 0.0],
    ], 0.12, 0.08);
    baseSurface('elbow' + L, fore, 22, 18);
    const FA = (id, spec) => sided(s, 'elbow' + L, id, fore, spec);
    FA('forearms', { t: [0.04, 0.78], thf: (t) => [-176, 0], h: 0.01 });
    FA('forearms', { t: [0.04, 0.78], thf: (t) => [0, 184], h: 0.01 });

    const wr = joint('wrist' + L, el, [0, -DIM.forearm, 0]);
    ell(wr, mats.shape, [0, -0.06, 0], [0.028, 0.056, 0.043]);
    ell(wr, mats.shape, [-s * 0.012, -0.04, 0.036], [0.014, 0.027, 0.014]);      // thumb
  }

  // ---------------- build meshes from buckets ----------------
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(SKIN_BONES.map((n) => J[n]));
  const muscleMeshes = Object.fromEntries(MUSCLES.map((m) => [m, []]));
  for (const [key, B] of buckets) {
    const [bone, group] = key.split('|');
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nrm, 3));
    g.setIndex(B.idx);
    if (group !== 'base') g.computeVertexNormals();
    geoms.push(g);
    const mat = group === 'base' ? mats.base : mats.inactive;
    let mesh;
    if (bone === 'torso') {
      const n = B.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) { si[i * 4 + k] = k; sw[i * 4 + k] = B.skin[i * 4 + k]; } }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      mesh = new THREE.SkinnedMesh(g, mat);
      root.add(mesh); mesh.updateMatrixWorld(true);
      mesh.bind(skeleton, mesh.matrixWorld);
      mesh.frustumCulled = false;
    } else {
      mesh = new THREE.Mesh(g, mat); J[bone].add(mesh);
    }
    mesh.name = group + '@' + bone; mesh.userData.muscle = group === 'base' ? null : group;
    meshes.push(mesh);
    if (group !== 'base') muscleMeshes[group].push(mesh);
  }
  for (const m of meshes) { m.castShadow = false; m.receiveShadow = false; }

  /**
   * levels: { muscleId: 0..1 } — ≥0.99 primary (lime), >0.05 secondary (olive), else inactive slate.
   * pulse: 0..1 extra glow on primary muscles (e.g. during the concentric phase).
   */
  const state = {};
  function setActivation(levels = {}, pulse = 0) {
    for (const id of MUSCLES) {
      const v = levels[id] || 0;
      const st = v >= 0.99 ? 'primary' : v > 0.05 ? 'secondary' : 'inactive';
      if (state[id] !== st) { state[id] = st; for (const m of muscleMeshes[id]) m.material = mats[st]; }
    }
    mats.primary.emissiveIntensity = 0.14 + 0.3 * clamp(pulse, 0, 1);
    mats.primary.userData.rim.value.set(0xeaffb0).multiplyScalar(0.35 + 0.35 * clamp(pulse, 0, 1));
  }
  setActivation({});

  function triangles() { let n = 0; root.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; }
  /** Refresh skinned bounding volumes (call after posing when you need Box3.setFromObject). */
  function updateBounds() { for (const m of meshes) if (m.isSkinnedMesh) m.computeBoundingBox(); }

  function dispose() {
    geoms.forEach((g) => g.dispose());
    Object.values(mats).forEach((m) => m.dispose());
    skeleton.dispose();
  }

  return { root, joints: J, meshes, muscleMeshes, materials: mats, setActivation, updateBounds, triangles, dispose };
}

export function disposeShared() { SPHERE.dispose(); }
