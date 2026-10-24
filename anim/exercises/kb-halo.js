// KB halo: bell held bottoms-up by the horns, circled slowly around the head; ribs down, glutes tight.
import { KB } from './_common.js';

const C = [0, 1.6, -0.01];
const path = (deg) => {
  const p = (deg * Math.PI) / 180, s = Math.sin(p), c = Math.cos(p);
  const front = c > 0;
  return [C[0] + 0.19 * s, C[1] - (front ? 0.1 : 0.04) * Math.abs(c), C[2] + (front ? 0.21 : 0.2) * c];
};
const keys = {};
const timeline = [];
const legs = {
  legL: { target: [0.13, 0.075, 0], pole: [0.1, 0, 1], foot: [0, 8, 0] },
  legR: { target: [-0.13, 0.075, 0], pole: [-0.1, 0, 1], foot: [0, -8, 0] },
};
for (let deg = 0; deg < 360; deg += 45) {
  const p = (deg * Math.PI) / 180, c = Math.cos(p), s = Math.sin(p);
  const back = Math.max(0, -c);
  keys['h' + deg] = {
    ...legs, pelvis: { pos: [0, 0.962, 0], rot: [0, 0, 0] }, neck: [6 * back, 0, 0], head: [-4 * back, -6 * s, 0],
    clavL: [8 + 10 * back, -6 * back], clavR: [8 + 10 * back, -6 * back],
    armL: { target: [0, 0, 0], space: 'equip:kb:hornL', pole: [0.7, -0.4 + 1.3 * (1 - c) / 2, 0.3 + 0.6 * back], pron: 10 },
    armR: { target: [0, 0, 0], space: 'equip:kb:hornR', pole: [-0.7, -0.4 + 1.3 * (1 - c) / 2, 0.3 + 0.6 * back], pron: 10 },
    equip: { kb: { space: 'root', pos: path(deg), rot: [180 - 20 * back, 25 * s, 0] } },
  };
}
// one circle each direction per cycle
const order = [45, 90, 135, 180, 225, 270, 315, 0, 315, 270, 225, 180, 135, 90, 45, 0];
order.forEach((d, i) => {
  const seg = { to: 'h' + d, t: 0.32, ease: 'linear', work: true };
  if (i === 0) seg.cue = 'Circle close around the head';
  if (i === 3) seg.cue = 'Bell behind the neck · ribs down';
  if (i === 7) seg.rep = true;
  if (i === 8) seg.cue = 'Reverse direction';
  if (i === 15) seg.rep = true;
  timeline.push(seg);
});

export default {
  name: 'KB Halo', subtitle: 'Around the head · 11 kg', kg: 11,
  primary: ['frontDelts', 'sideDelts', 'rearDelts'], secondary: ['traps', 'midBack', 'abs', 'triceps'],
  equipment: [KB(11)],
  interp: 'spline',
  camera: { view: '45' },
  startKey: 'h0', peakKey: 'h180', shots: ['h90'],
  keys, timeline,
};
