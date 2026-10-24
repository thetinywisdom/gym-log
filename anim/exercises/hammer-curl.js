// Hammer curl (home, dumbbells): neutral grip, upper arms still, curl to the shoulder.
const legs = {
  legL: { target: [0.12, 0.075, 0], pole: [0.1, 0, 1], foot: [0, 8, 0] },
  legR: { target: [-0.12, 0.075, 0], pole: [-0.1, 0, 1], foot: [0, -8, 0] },
};
const base = { ...legs, pelvis: { pos: [0, 0.962, 0], rot: [0, 0, 0] }, clavL: [-3, -3], clavR: [-3, -3] };
const arms = (flex, elbow) => ({
  armL: { target: null, shoulder: [flex, 7, 4], elbow, pron: 0 },
  armR: { target: null, shoulder: [flex, 7, 4], elbow, pron: 0 },
});
const db = { dbL: { space: 'handL' }, dbR: { space: 'handR' } };

export default {
  name: 'Hammer Curl', subtitle: 'Dumbbells · neutral grip', kg: 10,
  primary: ['brachialis', 'biceps'], secondary: ['forearms'],
  equipment: [{ id: 'dbL', type: 'dumbbell', kg: 10 }, { id: 'dbR', type: 'dumbbell', kg: 10 }],
  camera: { view: '45' },
  startKey: 'down', peakKey: 'up',
  keys: { down: { ...base, ...arms(0, 8), equip: db }, up: { ...base, ...arms(10, 132), equip: db } },
  tempo: { ecc: 2.0, pause: 0.2, con: 1.0, top: 0.4 },
  timeline: [
    { to: 'up', t: 'con', cue: 'Curl · thumbs up, elbows still', work: true, rep: true },
    { to: 'up', t: 'top', cue: 'Squeeze' },
    { to: 'down', t: 'ecc', cue: 'Lower slowly to full extension' },
    { to: 'down', t: 'pause' },
  ],
};
