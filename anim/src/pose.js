// Pose data model + interpolation helpers.
// A pose is plain JSON (numbers / arrays / small objects) so it can be lerped, splined and mirrored.
//
// Coordinate system (metres): figure stands at the origin facing +Z, +Y up, +X = figure's LEFT.
//
// pose = {
//   root:   { pos:[x,y,z], rot:[x,y,z] }            whole-figure transform (deg, order YXZ)
//   pelvis: { pos:[x,y,z], rot:[x,y,z] }            pelvis origin ≈ hip-joint centre (+4 cm). rot.x > 0 = hinge forward
//   spine:  [x,y,z]   total trunk bend spread over lumbar/thoracic/chest (x>0 flex fwd, y twist to left, z>0 bend to the RIGHT)
//   neck, head: [x,y,z]
//   clavL/clavR: [elevation, protraction]          anatomical degrees
//   armL/armR: {
//     target:[x,y,z] | null   IK target for the hand (grip centre). null → FK using shoulder/elbow below
//     space: 'root' | 'pelvis' | 'chest' | 'head' | 'shoulderHang' | 'equip:<id>:<anchor>'
//     pole:[x,y,z]            direction the elbow points (world)
//     shoulder:[flex, abd, intRot]  elbow: flex°   (FK)
//     pron: forearm pronation° (palm turns down/back)   palm: null | 'down' (flat on floor, fingers fwd)
//   }
//   legL/legR: { target:[x,y,z] ankle position (world), pole:[x,y,z] knee direction, foot:[pitch(+ = heel up), yaw(+ = toes out), roll] }
//   equip: { <id>: { pos, rot, space: 'root'|'chest'|'handL'|'handR'|'hands'|..., t (machine travel 0..1) } }
// }

export const STAND_Y = 0.968;   // pelvis height for a relaxed stand (soft knees)
export const ANKLE_Y = 0.075;   // ankle height with the foot flat

export const DEFAULT_POSE = {
  root: { pos: [0, 0, 0], rot: [0, 0, 0] },
  pelvis: { pos: [0, STAND_Y, 0], rot: [0, 0, 0] },
  spine: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  clavL: [0, 0], clavR: [0, 0],
  armL: { target: null, space: 'root', pole: [0.4, -0.2, -1], shoulder: [0, 8, 0], elbow: 8, pron: 0, palm: null },
  armR: { target: null, space: 'root', pole: [-0.4, -0.2, -1], shoulder: [0, 8, 0], elbow: 8, pron: 0, palm: null },
  legL: { target: [0.11, ANKLE_Y, 0], pole: [0.1, 0, 1], foot: [0, 8, 0] },
  legR: { target: [-0.11, ANKLE_Y, 0], pole: [-0.1, 0, 1], foot: [0, -8, 0] },
  equip: {},
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

/** Deep merge: objects merge recursively, arrays/primitives are replaced. */
export function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return clone(over === undefined ? base : over);
  const out = clone(base);
  for (const k of Object.keys(over)) out[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : clone(over[k]);
  return out;
}

export const resolvePose = (p) => merge(DEFAULT_POSE, p || {});

function mix(a, b, t, f) {
  if (typeof a === 'number' && typeof b === 'number') return f(a, b);
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && typeof a[0] === 'number') return a.map((v, i) => f(v, b[i], i));
  if (isObj(a) && isObj(b)) {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) out[k] = clone(b[k]);
      else if (!(k in b)) out[k] = clone(a[k]);
      else out[k] = mix(a[k], b[k], t, (x, y, i) => f(x, y, i));
    }
    return out;
  }
  return clone(t < 0.5 ? a : b);
}

export function lerpPose(a, b, t) { return mix(a, b, t, (x, y) => x + (y - x) * t); }

/** Centripetal-ish uniform Catmull-Rom through p1→p2, using neighbours p0, p3 (all full poses). */
export function splinePose(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  const walk = (a, b, c, d) => {
    if (typeof b === 'number' && typeof c === 'number') return cr(num(a, b), b, c, num(d, c));
    if (Array.isArray(b) && Array.isArray(c) && b.length === c.length && typeof b[0] === 'number')
      return b.map((v, i) => cr(arrNum(a, i, v), v, c[i], arrNum(d, i, c[i])));
    if (isObj(b) && isObj(c)) {
      const out = {};
      for (const k of new Set([...Object.keys(b), ...Object.keys(c)])) {
        if (!(k in b)) out[k] = clone(c[k]);
        else if (!(k in c)) out[k] = clone(b[k]);
        else out[k] = walk(a?.[k], b[k], c[k], d?.[k]);
      }
      return out;
    }
    return clone(t < 0.5 ? b : c);
  };
  return walk(p0, p1, p2, p3);
}
const num = (v, fb) => (typeof v === 'number' ? v : fb);
const arrNum = (arr, i, fb) => (Array.isArray(arr) && typeof arr[i] === 'number' ? arr[i] : fb);

// ---------- mirroring (left ↔ right) ----------
const mv = (v) => (Array.isArray(v) ? [-v[0], v[1], v[2]] : v);
const mr = (r) => (Array.isArray(r) ? [r[0], -(r[1] || 0), -(r[2] || 0)] : r);
export const swapLR = (s) => (typeof s === 'string' ? s.replace(/(hand|grip|horn|handle|arm|leg|clav)([LR])\b/g, (m, a, b) => a + (b === 'L' ? 'R' : 'L')) : s);

export function mirrorArm(a) {
  if (!a) return a;
  const o = clone(a);
  if (o.target) o.target = mv(o.target);
  if (o.pole) o.pole = mv(o.pole);
  if (o.space) o.space = swapLR(o.space);
  return o; // shoulder/elbow/pron are anatomical → unchanged
}
export function mirrorLeg(l) {
  if (!l) return l;
  const o = clone(l);
  if (o.target) o.target = mv(o.target);
  if (o.pole) o.pole = mv(o.pole);
  if (o.foot) o.foot = [o.foot[0], -o.foot[1], -(o.foot[2] || 0)];
  return o;
}
export function mirrorPose(p) {
  const o = {};
  for (const k of ['root', 'pelvis']) if (p[k]) o[k] = { ...clone(p[k]), ...(p[k].pos ? { pos: mv(p[k].pos) } : {}), ...(p[k].rot ? { rot: mr(p[k].rot) } : {}) };
  for (const k of ['spine', 'neck', 'head']) if (p[k]) o[k] = mr(p[k]);
  if (p.clavR) o.clavL = clone(p.clavR);
  if (p.clavL) o.clavR = clone(p.clavL);
  if (p.armR) o.armL = mirrorArm(p.armR);
  if (p.armL) o.armR = mirrorArm(p.armL);
  if (p.legR) o.legL = mirrorLeg(p.legR);
  if (p.legL) o.legR = mirrorLeg(p.legL);
  if (p.equip) {
    o.equip = {};
    for (const [id, e] of Object.entries(p.equip)) {
      o.equip[id] = { ...clone(e) };
      if (e.pos) o.equip[id].pos = mv(e.pos);
      if (e.rot) o.equip[id].rot = mr(e.rot);
      if (e.space) o.equip[id].space = swapLR(e.space);
    }
  }
  for (const k of Object.keys(p)) if (!(k in o)) o[k] = clone(p[k]);
  return o;
}

/** Convenience: same arm spec on both sides (given for the LEFT arm). */
export const arms = (left) => ({ armL: clone(left), armR: mirrorArm(left) });
/** Convenience: same leg spec on both sides (given for the LEFT leg). */
export const legs = (left) => ({ legL: clone(left), legR: mirrorLeg(left) });

// ---------- easing ----------
export const EASE = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  smooth: (t) => t * t * t * (t * (t * 6 - 15) + 10),
};
