import { seatedMachine, STD_TEMPO, timeline } from './_machine.js';
const m = seatedMachine({ kind: 'isoRow', torso: { pelvis: { rot: [4, 0, 0] }, spine: [6, 0, 0] }, pole: [0.4, -0.3, -1], pron: 0, clav: [0, 14], clavEnd: [0, -14] });
export default {
  name: 'Iso-Lateral Row', subtitle: 'Machine · chest on pad', kg: 45,
  primary: ['lats', 'midBack'], secondary: ['biceps', 'rearDelts'],
  ...m, camera: { view: '45' }, startKey: 'start', peakKey: 'end',
  tempo: STD_TEMPO,
  timeline: timeline('Pull elbows back past the ribs', 'Squeeze shoulder blades', 'Reach forward slowly', 'Let the shoulders protract'),
};
