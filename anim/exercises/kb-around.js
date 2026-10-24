// KB around-the-body pass: one 15.5 kg bell passed hand to hand around the waist, torso braced and hips still.
import { KB } from './_common.js';

const RX = 0.37, RZ_F = 0.3, RZ_B = 0.24, Y = 0.9;
const at = (deg) => {
  const p = (deg * Math.PI) / 180, s = Math.sin(p), c = Math.cos(p);
  return [RX * s, Y + 0.02 * Math.abs(s), c >= 0 ? 0.03 + RZ_F * c : 0.03 + RZ_B * c];
};
const add = (a, b) => a.map((v, i) => v + b[i]);
// free-hand rest spots (left side values; mirrored for the right)
const restL = { 225: [0.24, 0.9, -0.05], 270: [0.25, 0.88, 0.04], 315: [0.17, 0.88, 0.2] };
const restR = { 45: [-0.17, 0.88, 0.2], 90: [-0.25, 0.88, 0.04], 135: [-0.22, 0.9, -0.12] };
const poleL = (deg) => [1, -0.2, deg > 90 && deg < 270 ? -0.6 : -0.2];
const poleR = (deg) => [-1, -0.2, deg > 90 && deg < 270 ? -0.6 : -0.2];

const keys = {}, timeline = [];
for (let deg = 0; deg < 360; deg += 45) {
  const g = at(deg);
  const both = deg === 0 || deg === 180;
  const left = both ? add(g, [0.04, 0, 0]) : deg < 180 ? g : restL[deg];
  const right = both ? add(g, [-0.04, 0, 0]) : deg > 180 ? g : restR[deg];
  const twist = 10 * Math.sin((deg * Math.PI) / 180);
  keys['a' + deg] = {
    legL: { target: [0.14, 0.075, 0], pole: [0.1, 0, 1], foot: [0, 8, 0] },
    legR: { target: [-0.14, 0.075, 0], pole: [-0.1, 0, 1], foot: [0, -8, 0] },
    pelvis: { pos: [0, 0.955, 0], rot: [0, 0, 0] }, spine: [4, twist, 0], neck: [10, -twist * 0.5, 0],
    armL: { target: left, space: 'root', pole: poleL(deg), pron: 60 },
    armR: { target: right, space: 'root', pole: poleR(deg), pron: 60 },
    equip: { kb: { space: 'root', at: 'grip', pos: g, rot: [0, deg, 0] } },
  };
}
const CUES = { 0: 'Switch hands in front', 45: 'Pass it around — hips stay still', 180: 'Switch hands behind you', 225: 'Brace the core' };
for (let deg = 45; deg <= 360; deg += 45) {
  const seg = { to: 'a' + (deg % 360), t: 0.3, ease: 'linear', work: deg <= 180 || deg >= 270 };
  if (CUES[deg % 360] !== undefined) seg.cue = CUES[deg % 360];
  if (deg === 360) seg.rep = true;
  timeline.push(seg);
}

export default {
  name: 'KB Around', subtitle: 'Around the body · 15.5 kg · then reverse', kg: 15.5,
  primary: ['abs', 'obliques'], secondary: ['frontDelts', 'sideDelts', 'rearDelts', 'forearms'],
  equipment: [KB(15.5)],
  interp: 'spline',
  camera: { view: '45' },
  startKey: 'a0', peakKey: 'a180', shots: ['a90'],
  keys, timeline,
};
