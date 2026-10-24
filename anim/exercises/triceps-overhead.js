// Overhead triceps extension (home): one bell held bottoms-up by the horns, elbows point at the ceiling.
import { KB, handsOnHorns } from './_common.js';

const legs = {
  legL: { target: [0.13, 0.075, 0], pole: [0.1, 0, 1], foot: [0, 8, 0] },
  legR: { target: [-0.13, 0.075, 0], pole: [-0.1, 0, 1], foot: [0, -8, 0] },
};
const base = { ...legs, pelvis: { pos: [0, 0.962, 0], rot: [-2, 0, 0] }, clavL: [14, 0], clavR: [14, 0] };
const grip = (pole) => handsOnHorns(pole, 'kb', 0);

export default {
  name: 'Triceps Extension', subtitle: 'Overhead · one bell · 11 kg', kg: 11,
  primary: ['triceps'], secondary: [],
  equipment: [KB(11)],
  camera: { view: 'side' },
  startKey: 'top', peakKey: 'bottom',
  keys: {
    top: { ...base, ...grip([0.25, 0.2, 1]), equip: { kb: { space: 'root', pos: [0, 1.99, 0.03], rot: [180, 0, 0] } } },
    bottom: { ...base, neck: [-4, 0, 0], ...grip([0.25, 1, 0.5]), equip: { kb: { space: 'root', pos: [0, 1.6, -0.17], rot: [228, 0, 0] } } },
  },
  tempo: { ecc: 2.0, pause: 0.3, con: 1.2, top: 0.5 },
  timeline: [
    { to: 'bottom', t: 'ecc', cue: 'Lower behind the head · elbows stay up' },
    { to: 'bottom', t: 'pause', cue: 'Deep stretch' },
    { to: 'top', t: 'con', cue: 'Extend · only the forearms move', work: true, rep: true },
    { to: 'top', t: 'top', cue: 'Lock out · ribs down' },
  ],
};
