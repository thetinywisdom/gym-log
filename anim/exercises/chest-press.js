import { seatedMachine, STD_TEMPO, timeline } from './_machine.js';
const m = seatedMachine({ kind: 'chestPress', pos: [0, 0, -0.03], torso: { pelvis: { rot: [-6, 0, 0] } }, pole: [1, -0.35, -0.5], clav: [0, -6], clavEnd: [0, 4] });
export default {
  name: 'Chest Press', subtitle: 'Machine · seated', kg: 42.5,
  primary: ['chest'], secondary: ['triceps', 'frontDelts'],
  ...m, camera: { view: '45' }, startKey: 'start', peakKey: 'end',
  tempo: STD_TEMPO,
  timeline: timeline('Press forward · shoulders down', 'Don’t lock out hard', 'Control back to a chest stretch', 'Shoulder blades pinned'),
};
