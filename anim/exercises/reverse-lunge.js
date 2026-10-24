// Reverse lunge with a goblet hold: step back, drop the back knee toward the floor, drive through the front heel.
import { KB, handsOnHorns, mirrorPose } from './_common.js';

const bell = { kb: { space: 'chest', at: 'grip', pos: [0, 0.03, 0.2], rot: [-8, 0, 0] } };
const hold = { clavL: [4, 4], clavR: [4, 4], ...handsOnHorns([0.5, -1, 0.1]), equip: bell };
const stand = {
  ...hold, pelvis: { pos: [0, 0.962, 0], rot: [0, 0, 0] },
  legL: { target: [0.1, 0.075, 0], pole: [0.1, 0, 1], foot: [0, 6, 0] },
  legR: { target: [-0.1, 0.075, 0], pole: [-0.1, 0, 1], foot: [0, -6, 0] },
};
// right leg steps back; left (front) shin stays close to vertical
const lungeR = {
  ...hold, pelvis: { pos: [0, 0.655, -0.3], rot: [8, 0, 0] }, spine: [2, 0, 0], neck: [-8, 0, 0],
  legL: { target: [0.1, 0.075, 0.04], pole: [0.1, 0, 1], foot: [0, 6, 0] },
  legR: { target: [-0.1, 0.15, -0.72], pole: [0, -1, 0.2], foot: [48, 0, 0] },
};
// half-way: back foot touching down
const stepR = {
  ...hold, pelvis: { pos: [0, 0.86, -0.17], rot: [6, 0, 0] }, spine: [1, 0, 0],
  legL: { target: [0.1, 0.075, 0.04], pole: [0.1, 0, 1], foot: [0, 6, 0] },
  legR: { target: [-0.1, 0.16, -0.66], pole: [0, -0.4, 1], foot: [40, 0, 0] },
};

export default {
  name: 'Reverse Lunge', subtitle: 'Goblet hold · alternate legs', kg: 11,
  primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors', 'calves'],
  equipment: [KB(11)],
  camera: { view: '45' },
  startKey: 'stand', peakKey: 'lungeR', shots: ['lungeL'],
  keys: { stand, stepR, lungeR, stepL: mirrorPose(stepR), lungeL: mirrorPose(lungeR) },
  tempo: { step: 0.7, ecc: 0.9, pause: 0.3, con: 1.1, top: 0.4 },
  timeline: [
    { to: 'stepR', t: 'step', cue: 'Step back with the right leg' },
    { to: 'lungeR', t: 'ecc', cue: 'Drop the back knee straight down' },
    { to: 'lungeR', t: 'pause', cue: 'Front shin vertical · chest up' },
    { to: 'stand', t: 'con', cue: 'Drive through the front heel', work: true, rep: true },
    { to: 'stand', t: 'top' },
    { to: 'stepL', t: 'step', cue: 'Now the left leg back' },
    { to: 'lungeL', t: 'ecc', cue: 'Drop the back knee straight down' },
    { to: 'lungeL', t: 'pause', cue: 'Front shin vertical · chest up' },
    { to: 'stand', t: 'con', cue: 'Drive through the front heel', work: true, rep: true },
    { to: 'stand', t: 'top' },
  ],
};
