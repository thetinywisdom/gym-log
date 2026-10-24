import { seatedMachine, STD_TEMPO, timeline } from './_machine.js';
const m = seatedMachine({ kind: 'shoulderPress', torso: { pelvis: { rot: [-6, 0, 0] } }, pole: [1, -1, -0.1], poleEnd: [1, -0.3, 0], pron: 90, clav: [0, 0], clavEnd: [12, 0] });
export default {
  name: 'Shoulder Press', subtitle: 'Machine · seated', kg: 70,
  primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'chest'],
  ...m, camera: { view: '45' }, startKey: 'start', peakKey: 'end',
  tempo: STD_TEMPO,
  timeline: timeline('Press overhead', 'Ribs down · don’t arch', 'Lower to ear level', 'Elbows under the hands'),
};
