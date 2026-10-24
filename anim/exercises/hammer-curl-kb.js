// Hammer curl (home, kettlebells): one 11 kg bell per hand, held by the handle with a neutral grip
// (handle runs front-to-back through the fist), bell body hanging below the hand. Upper arms still.
// The bell is counter-rotated through the curl so it keeps hanging under the fist instead of
// swinging up with the forearm.
const legs = {
  legL: { target: [0.12, 0.075, 0], pole: [0.1, 0, 1], foot: [0, 8, 0] },
  legR: { target: [-0.12, 0.075, 0], pole: [-0.1, 0, 1], foot: [0, -8, 0] },
};
const base = { ...legs, pelvis: { pos: [0, 0.962, 0], rot: [0, 0, 0] }, clavL: [-3, -3], clavR: [-3, -3] };
const arms = (flex, elbow) => ({
  armL: { target: null, shoulder: [flex, 7, 4], elbow, pron: 0 },
  armR: { target: null, shoulder: [flex, 7, 4], elbow, pron: 0 },
});
// tilt (deg, about the hand's curl axis) counter-rotates the bell so it hangs under the fist
const bells = (tilt) => ({
  kbL: { space: 'handL', at: 'grip', rot: [0, 90, tilt] },
  kbR: { space: 'handR', at: 'grip', rot: [0, 90, tilt] },
});

export default {
  name: 'Hammer Curl', subtitle: 'Kettlebells · neutral grip · bell below the hand', kg: 11,
  primary: ['brachialis', 'biceps'], secondary: ['forearms'],
  equipment: [{ id: 'kbL', type: 'kettlebell', kg: 11 }, { id: 'kbR', type: 'kettlebell', kg: 11 }],
  camera: { view: '45' },
  startKey: 'down', peakKey: 'up',
  keys: {
    down: { ...base, ...arms(0, 8), equip: bells(8) },
    up: { ...base, ...arms(10, 132), equip: bells(120) },
  },
  tempo: { ecc: 2.0, pause: 0.2, con: 1.0, top: 0.4 },
  timeline: [
    { to: 'up', t: 'con', cue: 'Curl · thumbs up, bells hang under the fist', work: true, rep: true },
    { to: 'up', t: 'top', cue: 'Squeeze · elbows stay by your sides' },
    { to: 'down', t: 'ecc', cue: 'Lower slowly to full extension' },
    { to: 'down', t: 'pause' },
  ],
};
