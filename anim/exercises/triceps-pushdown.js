// Cable triceps pushdown: slight forward lean, elbows pinned at the sides, from chest height to full extension.
const lean = { pelvis: { pos: [0, 0.955, -0.02], rot: [7, 0, 0] }, spine: [5, 0, 0], neck: [-8, 0, 0] };
const legs = {
  legL: { target: [0.13, 0.075, 0.02], pole: [0.1, 0, 1], foot: [0, 8, 0] },
  legR: { target: [-0.13, 0.075, 0.02], pole: [-0.1, 0, 1], foot: [0, -8, 0] },
};
// upper arm vertical in the world (cancel the ~12° lean), slightly in front of the ribs
const arm = (elbow) => ({
  armL: { target: null, shoulder: [-8, -2, 12], elbow, pron: 90 },
  armR: { target: null, shoulder: [-8, -2, 12], elbow, pron: 90 },
});
const bar = { bar: { space: 'hands' } };

export default {
  name: 'Triceps Pushdown', subtitle: 'Cable · short bar', kg: 21.25,
  primary: ['triceps'], secondary: [],
  equipment: [
    { id: 'stack', type: 'machine', kind: 'cableStack', pos: [0, 0, 0.12], noFit: true },
    { id: 'bar', type: 'cableBar' },
  ],
  camera: { view: '45' },
  startKey: 'start', peakKey: 'lockout',
  keys: {
    start: { ...legs, ...lean, clavL: [-3, -2], clavR: [-3, -2], ...arm(108), equip: bar },
    lockout: { ...legs, ...lean, clavL: [-4, -2], clavR: [-4, -2], ...arm(6), equip: bar },
  },
  tempo: { ecc: 1.8, pause: 0.2, con: 1.0, top: 0.4 },
  timeline: [
    { to: 'lockout', t: 'con', cue: 'Press down · elbows pinned', work: true },
    { to: 'lockout', t: 'top', cue: 'Full lockout · squeeze', work: true, rep: true },
    { to: 'start', t: 'ecc', cue: 'Control up to chest height' },
    { to: 'start', t: 'pause', cue: 'Elbows stay at your sides' },
  ],
};
