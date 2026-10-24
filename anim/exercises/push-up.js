// Push-up: rigid plank pivoting about the toes, elbows ~45° from the body.
const D2R = Math.PI / 180;
const ANK = [0.1, 0.13, -0.98];
const HIP_LEN = 0.86 * 0.997, TRUNK = 0.47;
function plank(deg, sag = 0) {
  const t = deg * D2R, dir = [0, Math.sin(t), Math.cos(t)];
  const hip = [0, ANK[1] + HIP_LEN * dir[1], ANK[2] + HIP_LEN * dir[2]];
  const a = 90 - deg;
  const pelvis = [0, hip[1] + 0.04 * Math.cos(a * D2R), hip[2] + 0.04 * Math.sin(a * D2R)];
  const sh = [0, pelvis[1] + TRUNK * dir[1], pelvis[2] + TRUNK * dir[2]];
  const hand = (x) => [x, 0.04, sh[2] + 0.03];
  return {
    pelvis: { pos: pelvis, rot: [a - sag, 0, 0] }, spine: [sag, 0, 0], neck: [-8, 0, 0], head: [-6, 0, 0],
    legL: { target: [ANK[0], ANK[1], ANK[2]], pole: [0.2, -1, 0], foot: [64 - deg, 4, 0] },
    legR: { target: [-ANK[0], ANK[1], ANK[2]], pole: [-0.2, -1, 0], foot: [64 - deg, -4, 0] },
    armL: { target: hand(0.21), space: 'root', pole: [0.7, 0.4, -0.7], palm: 'down' },
    armR: { target: hand(-0.21), space: 'root', pole: [-0.7, 0.4, -0.7], palm: 'down' },
  };
}

export default {
  name: 'Push Up', subtitle: 'Bodyweight', kg: 0,
  primary: ['chest'], secondary: ['triceps', 'frontDelts', 'abs'],
  equipment: [{ id: 'mat', type: 'mat', pos: [0, 0, -0.35] }],
  camera: { view: '45' },
  startKey: 'top', peakKey: 'bottom',
  keys: { top: plank(19), bottom: plank(9) },
  tempo: { ecc: 1.6, pause: 0.3, con: 1.0, top: 0.5 },
  timeline: [
    { to: 'bottom', t: 'ecc', cue: 'Lower as one plank · elbows 45°' },
    { to: 'bottom', t: 'pause', cue: 'Chest just above the floor' },
    { to: 'top', t: 'con', cue: 'Push the floor away', work: true, rep: true },
    { to: 'top', t: 'top', cue: 'Glutes tight · ribs down' },
  ],
};
