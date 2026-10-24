// Kettlebell Romanian deadlift: soft knees, hips back, bell slides down the thighs.
import { KB, feet } from './_common.js';

const stance = feet(0.12, 0.02, 6);
const bell = { kb: { space: 'hands', at: 'grip' } };
// arms hang straight from the shoulders, hands together on the handle
const hang = (z = 0.02) => ({
  armL: { target: [-0.14, -0.58, z], space: 'shoulderHang', pole: [0.3, 0, -1], pron: 90 },
  armR: { target: [0.14, -0.58, z], space: 'shoulderHang', pole: [-0.3, 0, -1], pron: 90 },
});

export default {
  name: 'KB Romanian Deadlift', subtitle: 'Hip hinge · 15.5 kg', kg: 15.5,
  primary: ['hamstrings', 'glutes'], secondary: ['lowerBack', 'forearms'],
  equipment: [KB(15.5)],
  camera: { view: 'side' },
  startKey: 'top', peakKey: 'bottom',
  keys: {
    top: { ...stance, pelvis: { pos: [0, 0.962, 0], rot: [0, 0, 0] }, clavL: [-4, -6], clavR: [-4, -6], ...hang(0.06), equip: bell },
    bottom: { ...stance, pelvis: { pos: [0, 0.915, -0.2], rot: [64, 0, 0] }, spine: [6, 0, 0], neck: [-22, 0, 0], clavL: [-2, -2], clavR: [-2, -2],
      ...hang(-0.03), equip: bell },
  },
  tempo: { ecc: 2.5, pause: 0.4, con: 1.3, top: 0.6 },
  timeline: [
    { to: 'bottom', t: 'ecc', cue: 'Push hips back · soft knees' },
    { to: 'bottom', t: 'pause', cue: 'Feel the hamstring stretch' },
    { to: 'top', t: 'con', cue: 'Drive hips forward', work: true, rep: true },
    { to: 'top', t: 'top', cue: 'Squeeze glutes' },
  ],
};
