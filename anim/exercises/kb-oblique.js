// Standing KB side bend: one 15.5 kg bell in one hand, bend toward it, then crunch the opposite side to stand tall.
import { KB } from './_common.js';

const feet = {
  legL: { target: [0.13, 0.075, 0], pole: [0.1, 0, 1], foot: [0, 6, 0] },
  legR: { target: [-0.13, 0.075, 0], pole: [-0.1, 0, 1], foot: [0, -6, 0] },
};
const pose = (bend, shift) => ({
  ...feet,
  pelvis: { pos: [shift, 0.962, 0], rot: [0, 0, -bend * 0.12] },
  spine: [0, 0, bend], neck: [0, 0, -bend * 0.25],
  // bell side (right) hangs straight; free hand on the hip
  armR: { target: [0.02, -0.62, 0.01], space: 'shoulderHang', pole: [-1, 0, -0.3], pron: 0 },
  armL: { target: [0.16, 0.02, 0.03], space: 'pelvis', pole: [1, 0.1, -0.5], pron: 30 },
  clavR: [-bend * 0.2, 0],
  equip: { kb: { space: 'handR', at: 'grip', rot: [0, 90, 0] } },
});

export default {
  name: 'KB Oblique', subtitle: 'Side bend · bell in right hand · then switch', kg: 15.5,
  primary: ['obliques'], secondary: ['abs', 'lowerBack'],
  equipment: [KB(15.5)],
  camera: { view: 'front' },
  startKey: 'tall', peakKey: 'down', shots: ['over'],
  keys: { tall: pose(0, 0), down: pose(24, 0.03), over: pose(-9, -0.015) },
  tempo: { ecc: 1.6, pause: 0.3, con: 1.2, top: 0.5 },
  timeline: [
    { to: 'down', t: 'ecc', cue: 'Slide the bell down the leg' },
    { to: 'down', t: 'pause', cue: 'Stay in the side plane — no leaning forward' },
    { to: 'over', t: 'con', cue: 'Crunch up with the opposite side', work: true, rep: true },
    { to: 'tall', t: 'top', cue: 'Stand tall · do all reps, then switch sides' },
  ],
};
