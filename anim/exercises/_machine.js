// Template for seated selectorised machines: hands IK to the machine's handles, pose drives handle travel t.
import { SEATED, handsOnMachine, merge } from './_common.js';

export function seatedMachine({ kind, pos = [0, 0, 0], torso = {}, torsoEnd, pole, poleEnd, pron = 0, clav = [0, 0], clavEnd }) {
  const p = (t, tor, pl, cl) => merge(merge(SEATED, tor), {
    ...handsOnMachine(pl, pron), clavL: cl, clavR: cl, equip: { m: { t } },
  });
  return {
    equipment: [{ id: 'm', type: 'machine', kind, pos }],
    keys: { start: p(0, torso, pole, clav), end: p(1, torsoEnd || torso, poleEnd || pole, clavEnd || clav) },
  };
}
export const STD_TEMPO = { con: 1.0, top: 0.4, ecc: 2.0, pause: 0.3 };
export const timeline = (conCue, topCue, eccCue, pauseCue) => [
  { to: 'end', t: 'con', cue: conCue, work: true },
  { to: 'end', t: 'top', cue: topCue, work: true, rep: true },
  { to: 'start', t: 'ecc', cue: eccCue },
  { to: 'start', t: 'pause', cue: pauseCue },
];
