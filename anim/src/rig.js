// Applies a pose to the mannequin + equipment: FK for trunk, analytic two-bone IK for arms and legs.
import * as THREE from '../vendor/three.module.min.js';
import { DIM } from './mannequin.js';

const D2R = Math.PI / 180;
const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _t = V(), _p = V(), _u = V(), _dir = V(), _x = V(), _y = V(), _z = V(), _y2 = V(), _z2 = V(), _tmp = V(), _tmp2 = V();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _e = new THREE.Euler();
const SOLE = [[-0.035, 0.04, 0.13], [-0.066, 0.012, 0.132]]; // shoe + sole ellipses (YZ outline) in ankle space
const _AX = new THREE.Vector3(1, 0, 0), _AY = new THREE.Vector3(0, 1, 0), _AZ = new THREE.Vector3(0, 0, 1);
// per-frame scratch (apply() must not allocate)
const _g = V(), _pole = V(), _wg = V(), _s1 = V(), _s2 = V(), _s3 = V(), _s4 = V(), _s5 = V(), _s6 = V(), _s7 = V();
const _M = new THREE.Matrix4(), _M2 = new THREE.Matrix4(), _M3 = new THREE.Matrix4(), _qh = new THREE.Quaternion();
const _ONE = new THREE.Vector3(1, 1, 1), _ZERO3 = [0, 0, 0], _RAD = [0, 0, 0];
const _HX_L = new THREE.Vector3(0, 1, 0), _HX_R = new THREE.Vector3(0, -1, 0), _HY = new THREE.Vector3(0, 0, -1);
const _HQ = { L: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(_HX_L, _HY, new THREE.Vector3().crossVectors(_HX_L, _HY))),
  R: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(_HX_R, _HY, new THREE.Vector3().crossVectors(_HX_R, _HY))) };
const rad3 = (r) => { _RAD[0] = (r[0] || 0) * D2R; _RAD[1] = (r[1] || 0) * D2R; _RAD[2] = (r[2] || 0) * D2R; return _RAD; };
const qAxis = (axis, deg, out = new THREE.Quaternion()) => out.setFromAxisAngle(axis, deg * D2R);

/**
 * Two-bone IK. upper/lower are joints whose bone runs along local -Y.
 * kind 'leg': knee points toward the pole (anterior = +Z). kind 'arm': elbow points toward the pole (posterior = -Z).
 * Returns the residual distance between the reached end and the requested target.
 */
export function solveTwoBone(upper, lower, l1, l2, target, pole, kind) {
  upper.getWorldPosition(_a);
  _t.copy(target).sub(_a);
  const want = _t.length();
  const d = THREE.MathUtils.clamp(want, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.9999);
  _dir.copy(_t).divideScalar(want || 1);
  const cosA = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  _u.copy(pole).sub(_a); _u.addScaledVector(_dir, -_u.dot(_dir));
  if (_u.lengthSq() < 1e-8) _u.set(0, 0, 1).addScaledVector(_dir, -_dir.z);
  _u.normalize();
  _b.copy(_a).addScaledVector(_dir, l1 * cosA).addScaledVector(_u, l1 * sinA); // middle joint
  _p.copy(_a).addScaledVector(_dir, d); // reachable end

  // upper bone world basis
  _y.copy(_a).sub(_b).normalize();
  _z.copy(_u).addScaledVector(_y, -_u.dot(_y)).normalize(); if (kind === 'arm') _z.negate();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z); _q.setFromRotationMatrix(_m);
  upper.parent.getWorldQuaternion(_qp);
  upper.quaternion.copy(_qp.invert()).multiply(_q);
  // lower bone: same hinge axis X
  _y2.copy(_b).sub(_p).normalize();
  _z2.crossVectors(_x, _y2).normalize();
  _m.makeBasis(_x, _y2, _z2); _q2.setFromRotationMatrix(_m);
  lower.quaternion.copy(_q.invert()).multiply(_q2);
  upper.updateMatrixWorld(true);
  return Math.max(0, want - d);
}

export class Rig {
  constructor(mannequin, equipment = {}) {
    this.m = mannequin; this.J = mannequin.joints; this.equip = equipment;
    this.err = { armL: 0, armR: 0, legL: 0, legR: 0 };
  }

  _euler(obj, deg, order = 'XYZ', scale = 1) {
    obj.quaternion.setFromEuler(_e.set((deg[0] || 0) * D2R * scale, (deg[1] || 0) * D2R * scale, (deg[2] || 0) * D2R * scale, order));
  }

  _space(space, out) { // returns a world matrix for a named space
    if (!space || space === 'root') return out.copy(this.m.root.parent ? this.m.root.parent.matrixWorld : out.identity());
    if (space.startsWith('equip:')) { const [, id, a] = space.split(':'); return out.copy(this.equip[id].anchors[a].matrixWorld); }
    const j = this.J[space] || (space === 'handL' ? this.J.wristL : space === 'handR' ? this.J.wristR : null);
    if (!j) throw new Error('Unknown space ' + space);
    if (space === 'handL' || space === 'handR') { out.copy(j.matrixWorld).multiply(_m.makeTranslation(0, -DIM.grip, 0)); return out; }
    return out.copy(j.matrixWorld);
  }

  _placeEquip(id, ep) {
    const e = this.equip[id]; if (!e) return;
    const M = _M.identity();
    if (ep.space === 'hands') {
      const gl = this._gripWorld('L', _s1), gr = this._gripWorld('R', _s2);
      const mid = _s3.copy(gl).add(gr).multiplyScalar(0.5);
      const up = _s4.copy(_AY);
      if (ep.align === 'arm') { // bell/bar continues the line of the forearms
        up.copy(this.J.wristL.getWorldPosition(_s5).sub(gl)).add(this.J.wristR.getWorldPosition(_s6).sub(gr)).normalize();
      }
      const xAxis = _s5.copy(gl).sub(gr); xAxis.addScaledVector(up, -xAxis.dot(up)).normalize();
      const zAxis = _s6.crossVectors(xAxis, up).normalize();
      const yAxis = _s7.crossVectors(zAxis, xAxis);
      M.makeBasis(xAxis, yAxis, zAxis).setPosition(mid);
      if (ep.rot) { const r = rad3(ep.rot); M.multiply(_M2.makeRotationFromEuler(_e.set(r[0], r[1], r[2], 'YXZ'))); }
      if (ep.pos) M.multiply(_M2.makeTranslation(ep.pos[0], ep.pos[1], ep.pos[2]));
      if (ep.at) { const loc = this._anchorLocal(e, ep.at); M.multiply(_M2.makeTranslation(-loc.x, -loc.y, -loc.z)); }
    } else {
      this._space(ep.space, M);
      const r = rad3(ep.rot || _ZERO3);
      M.multiply(_M2.compose(_tmp.fromArray(ep.pos || _ZERO3), _q.setFromEuler(_e.set(r[0], r[1], r[2], 'YXZ')), _ONE));
      if (ep.at) { // pos refers to an anchor (e.g. the handle), not the object origin
        const loc = this._anchorLocal(e, ep.at);
        M.multiply(_M2.makeTranslation(-loc.x, -loc.y, -loc.z));
      }
    }
    M.decompose(e.object.position, e.object.quaternion, _tmp);
    e.object.updateMatrixWorld(true);
  }

  _anchorLocal(e, name) {
    e._loc ||= {};
    if (!e._loc[name]) {
      const a = e.anchors[name]; if (!a) throw new Error('No anchor ' + name);
      const v = a.position.clone(); let o = a.parent;
      while (o && o !== e.object) { v.applyMatrix4(new THREE.Matrix4().compose(o.position, o.quaternion, o.scale)); o = o.parent; }
      e._loc[name] = v;
    }
    return e._loc[name];
  }

  _gripWorld(side, out) { return this.J['wrist' + side].localToWorld(out.set(0, -DIM.grip, 0)); }

  apply(p) {
    const J = this.J, root = this.m.root;
    root.position.fromArray(p.root.pos); this._euler(root, p.root.rot, 'YXZ');
    J.pelvis.position.fromArray(p.pelvis.pos); this._euler(J.pelvis, p.pelvis.rot, 'YXZ');
    this._euler(J.spine1, p.spine, 'YXZ', 0.3); this._euler(J.spine2, p.spine, 'YXZ', 0.35); this._euler(J.chest, p.spine, 'YXZ', 0.35);
    this._euler(J.neck, p.neck, 'YXZ');
    this._euler(J.head, p.head, 'YXZ');
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1, c = p['clav' + s] || [0, 0];
      J['clav' + s].quaternion.copy(qAxis(_AZ, sg * (c[0] || 0))).multiply(qAxis(_AY, -sg * (c[1] || 0), _q2));
    }
    root.updateMatrixWorld(true);

    // equipment that hangs off the trunk / world
    const deferred = [];
    for (const [id, e] of Object.entries(this.equip)) {
      const ep = p.equip?.[id];
      if (e.update) e.update(ep || {});
      if (!ep || (!ep.pos && !ep.rot && !ep.space)) { e.object.updateMatrixWorld(true); continue; }
      if (/^hand|hands$/.test(ep.space || '')) deferred.push([id, ep]); else this._placeEquip(id, ep);
    }

    // legs
    for (const s of ['L', 'R']) {
      const leg = p['leg' + s];
      _tmp.fromArray(leg.target); if (_tmp.y < 0.075) _tmp.y = 0.075; // spline overshoot must not push the ankle into the floor
      J['hip' + s].getWorldPosition(_tmp2);
      _tmp2.add(_tmp).multiplyScalar(0.5).add(_u.fromArray(leg.pole || [0, 0, 1]));
      this.err['leg' + s] = solveTwoBone(J['hip' + s], J['knee' + s], DIM.thigh, DIM.shin, _wg.copy(_tmp), _s7.copy(_tmp2), 'leg');
      const f = leg.foot || [0, 0, 0];
      const pitch = this._floorPitch(J['ankle' + s], f);
      _q.setFromEuler(_e.set(pitch * D2R, f[1] * D2R, (f[2] || 0) * D2R, 'YXZ'));
      J['knee' + s].getWorldQuaternion(_qp);
      J['ankle' + s].quaternion.copy(_qp.invert()).multiply(_q);
    }

    // arms
    for (const s of ['L', 'R']) {
      const a = p['arm' + s], sg = s === 'L' ? 1 : -1;
      const sh = J['shoulder' + s], el = J['elbow' + s], wr = J['wrist' + s];
      if (!a.target) {
        const [fl, ab, ir] = a.shoulder || [0, 0, 0];
        sh.quaternion.copy(qAxis(_AX, -fl)).multiply(qAxis(_AZ, sg * ab, _q2)).multiply(qAxis(_AY, -sg * ir, _q2));
        el.quaternion.copy(qAxis(_AX, -(a.elbow || 0)));
        wr.quaternion.copy(qAxis(_AY, -sg * (a.pron || 0)));
        sh.updateMatrixWorld(true);
        this.err['arm' + s] = 0;
        continue;
      }
      const goal = _g.fromArray(a.target);
      if (a.space === 'shoulderHang') goal.add(sh.getWorldPosition(_s1));
      else if (a.space && a.space !== 'root') goal.applyMatrix4(this._space(a.space, _M3));
      const pole = _pole;
      const l1 = DIM.upperArm, l2 = DIM.forearm;
      if (a.palm === 'down') {
        // left palm faces -X at rest, fingers -Y. Palm down, fingers forward.
        const handQ = _qh.copy(_HQ[s]);
        const wristGoal = _wg.copy(goal).add(_s1.set(0, DIM.grip, 0).applyQuaternion(handQ));
        sh.getWorldPosition(pole).add(wristGoal).multiplyScalar(0.5).add(_s2.fromArray(a.pole));
        this.err['arm' + s] = solveTwoBone(sh, el, l1, l2, wristGoal, pole, 'arm');
        el.getWorldQuaternion(_qp); wr.quaternion.copy(_qp.invert()).multiply(handQ);
        continue;
      }
      wr.quaternion.copy(qAxis(_AY, -sg * (a.pron || 0)));
      // the hand only pronates about the forearm axis, so the grip is collinear with the forearm:
      // solve the chain with an extended lower bone straight to the grip target.
      sh.getWorldPosition(pole).add(goal).multiplyScalar(0.5).add(_s2.fromArray(a.pole));
      solveTwoBone(sh, el, l1, l2 + DIM.grip, goal, pole, 'arm');
      this.err['arm' + s] = this._gripWorld(s, _s3).distanceTo(goal);
    }
    root.updateMatrixWorld(true);

    for (const [id, ep] of deferred) this._placeEquip(id, ep);
    for (const e of Object.values(this.equip)) if (e.cableTo) { const b = Object.values(this.equip).find((x) => x.anchors?.grip && x !== e); if (b) e.cableTo(b.object.getWorldPosition(_s1)); }
  }

  /** Lowest point (y) of any mannequin vertex bound — used by QA to check floor penetration. */
  // Floor clamp: if the toe or heel of the sole would sink below y=0, adjust the foot pitch
  // (the ankle position stays where IK put it) so the sole rests on the floor instead.
  _floorPitch(ankle, f) {
    ankle.getWorldPosition(_tmp2);
    const ay = _tmp2.y;
    if (ay > 0.25) return f[0];
    const low = (pd) => {
      _q.setFromEuler(_e.set(pd * D2R, f[1] * D2R, (f[2] || 0) * D2R, 'YXZ'));
      let toe = 9, heel = 9;
      for (const [cy, ry, rz] of SOLE) for (let i = 0; i < 16; i++) {
        const th = (i / 16) * Math.PI * 2, z = 0.055 + rz * Math.cos(th);
        const y = _u.set(0, cy + ry * Math.sin(th), z).applyQuaternion(_q).y + ay;
        if (z >= 0.055) toe = Math.min(toe, y); else heel = Math.min(heel, y);
      }
      return [toe, heel];
    };
    const [t0, h0] = low(f[0]);
    if (t0 >= -0.002 && h0 >= -0.002) return f[0];
    // toes sinking → lower the pitch (less heel-up); heel sinking → raise it
    const cands = t0 < h0 ? [0, -20, -40] : [0, 30, 60, 89];
    let a = f[0], b = cands.find((c) => (t0 < h0 ? c < f[0] : c > f[0]) && Math.min(...low(c)) >= 0);
    if (b === undefined) return f[0]; // ankle too low to fix with pitch alone
    for (let i = 0; i < 16; i++) { const m = (a + b) / 2, [t, h] = low(m); if (Math.min(t, h) < 0) a = m; else b = m; }
    return b;
  }

  footError(p) {
    let e = 0;
    for (const s of ['L', 'R']) e = Math.max(e, this.J['ankle' + s].getWorldPosition(V()).distanceTo(V().fromArray(p['leg' + s].target)));
    return e;
  }
}
