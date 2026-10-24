// Goblet squat: bell held by the horns at the sternum, sit between the heels.
import { KB, handsOnHorns, feet } from './_common.js';

const stance = (bend) => feet(0.175, 0.02, 18, [0.42, 0, 1]);
const bell = { kb: { space: 'chest', at: 'grip', pos: [0, 0.03, 0.2], rot: [-8, 0, 0] } };

export default {
  name: 'Goblet Squat', subtitle: 'Squat · 15.5 kg', kg: 15.5,
  primary: ['quads', 'glutes'], secondary: ['adductors', 'abs', 'traps', 'midBack'],
  equipment: [KB(15.5)],
  camera: { view: '45' },
  startKey: 'top', peakKey: 'bottom',
  keys: {
    top: { ...stance(), pelvis: { pos: [0, 0.962, 0], rot: [0, 0, 0] }, clavL: [4, 4], clavR: [4, 4], ...handsOnHorns([0.5, -1, 0.1]), equip: bell },
    bottom: { ...stance(), pelvis: { pos: [0, 0.505, -0.16], rot: [30, 0, 0] }, spine: [6, 0, 0], neck: [-24, 0, 0], clavL: [4, 4], clavR: [4, 4],
      ...handsOnHorns([0.5, -1, 0.1]), equip: bell },
  },
  tempo: { ecc: 2.2, pause: 0.5, con: 1.2, top: 0.6 },
  timeline: [
    { to: 'bottom', t: 'ecc', cue: 'Sit down between your heels' },
    { to: 'bottom', t: 'pause', cue: 'Knees out · chest up' },
    { to: 'top', t: 'con', cue: 'Drive through mid-foot', work: true, rep: true },
    { to: 'top', t: 'top', cue: 'Stand tall' },
  ],
};
