import { seatedMachine, timeline } from './_machine.js';
const m = seatedMachine({ kind: 'reverseFly', torso: { pelvis: { rot: [2, 0, 0] }, spine: [4, 0, 0] }, pole: [1, 0.2, -0.3], poleEnd: [0.2, 0.3, -1], pron: 0, clav: [4, 12], clavEnd: [0, -10] });
export default {
  name: 'Reverse Fly', subtitle: 'Rear-delt pec deck · chest on pad', kg: null,
  primary: ['rearDelts'], secondary: ['traps', 'midBack'],
  ...m, camera: { view: '45', dirs: { '45': [-0.6, 0.5, -0.62] } }, startKey: 'start', peakKey: 'end',
  tempo: { con: 1.0, top: 0.5, ecc: 1.8, pause: 0.3 },
  timeline: timeline('Sweep the arms back wide', 'Squeeze rear delts', 'Return slowly', 'Don’t let the stack touch'),
};
