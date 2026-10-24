// Two-hand Russian kettlebell swing: hip hinge drives the bell to chest height, arms are just ropes.
import { KB, feet } from './_common.js';

const stance = feet(0.17, 0.02, 14);
// FK arms (shoulder flex relative to the trunk), hands meet on the handle; the bell continues the arm line.
const arms = (flex, elbow = 4) => ({
  armL: { target: null, shoulder: [flex, -12, 0], elbow, pron: 90 },
  armR: { target: null, shoulder: [flex, -12, 0], elbow, pron: 90 },
});
const bell = (tilt = 0) => ({ kb: { space: 'hands', align: 'arm', at: 'grip', rot: [tilt, 0, 0] } });

export default {
  name: 'KB Swing', subtitle: 'Hip hinge · 15.5 kg', kg: 15.5,
  primary: ['glutes', 'hamstrings'], secondary: ['lowerBack', 'abs', 'frontDelts', 'sideDelts', 'rearDelts'],
  equipment: [KB(15.5)],
  interp: 'spline',
  camera: { view: 'side' },
  startKey: 'top', peakKey: 'hike',
  keys: {
    top: { ...stance, pelvis: { pos: [0, 0.962, 0.0], rot: [-4, 0, 0] }, spine: [-2, 0, 0], neck: [4, 0, 0], clavL: [0, 6], clavR: [0, 6],
      ...arms(76), equip: bell(-6) },
    fall: { ...stance, pelvis: { pos: [0, 0.95, -0.04], rot: [10, 0, 0] }, spine: [2, 0, 0], neck: [-4, 0, 0],
      ...arms(50), equip: bell(0) },
    hike: { ...stance, pelvis: { pos: [0, 0.885, -0.13], rot: [42, 0, 0] }, spine: [6, 0, 0], neck: [-20, 0, 0], clavL: [-2, -4], clavR: [-2, -4],
      ...arms(26, 2), equip: bell(4) },
    drive: { ...stance, pelvis: { pos: [0, 0.94, -0.06], rot: [16, 0, 0] }, spine: [2, 0, 0], neck: [-6, 0, 0],
      ...arms(44), equip: bell(-2) },
  },
  timeline: [
    { to: 'fall', t: 0.32, cue: 'Let it fall — hinge late' },
    { to: 'hike', t: 0.3, cue: 'Hips back, bell high between thighs' },
    { to: 'drive', t: 0.26, cue: 'Snap the hips', work: true },
    { to: 'top', t: 0.32, cue: 'Squeeze glutes · stand tall', work: true, rep: true },
    { to: 'top', t: 0.18, cue: 'Float — arms relaxed' },
  ],
};
