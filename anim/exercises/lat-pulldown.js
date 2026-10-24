import { seatedMachine, STD_TEMPO, timeline } from './_machine.js';
const m = seatedMachine({
  kind: 'latPulldown', pos: [0, 0, -0.06],
  torso: { pelvis: { rot: [-6, 0, 0] }, spine: [-2, 0, 0] }, torsoEnd: { pelvis: { rot: [-11, 0, 0] }, spine: [-5, 0, 0], neck: [-6, 0, 0] },
  pole: [1, -0.4, -0.15], pron: 90, clav: [18, 4], clavEnd: [-6, -8],
});
export default {
  name: 'Lat Pulldown', subtitle: 'Cable · wide overhand grip', kg: null,
  primary: ['lats'], secondary: ['biceps', 'rearDelts', 'traps'],
  ...m, camera: { view: '45' }, startKey: 'start', peakKey: 'end',
  tempo: STD_TEMPO,
  timeline: timeline('Pull the bar to the upper chest', 'Elbows down and back', 'Arms long, control up', 'Full stretch at the top'),
};
