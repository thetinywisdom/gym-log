import { seatedMachine, timeline } from './_machine.js';
const m = seatedMachine({ kind: 'pecDeck', torso: { pelvis: { rot: [-6, 0, 0] } }, pole: [0.2, -0.5, -1], poleEnd: [0.9, -0.4, -0.2], pron: 0, clav: [0, -8], clavEnd: [0, 6] });
export default {
  name: 'Chest Fly', subtitle: 'Pec deck', kg: null,
  primary: ['chest'], secondary: ['frontDelts'],
  ...m, camera: { view: '45', dirs: { '45': [-0.55, 0.55, 0.65] } }, startKey: 'start', peakKey: 'end',
  tempo: { con: 1.2, top: 0.6, ecc: 2.0, pause: 0.3 },
  timeline: timeline('Hug the handles together', 'Squeeze the chest', 'Open slowly · soft elbows', 'Stretch, shoulders back'),
};
