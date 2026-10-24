// Shared building blocks for exercise definitions.
import { STAND_Y, ANKLE_Y, arms, legs, mirrorPose, merge } from '../src/pose.js';
export { STAND_Y, ANKLE_Y, arms, legs, mirrorPose, merge };

export const KB = (kg = 15.5, id = 'kb') => ({ id, type: 'kettlebell', kg });

/** Hands on a kettlebell's two-hand handle grips. */
export const handsOnKB = (pole = [0.5, -0.3, -0.5], id = 'kb', extra = {}) => ({
  armL: { target: [0, 0, 0], space: `equip:${id}:gripL`, pole, pron: 90, ...extra },
  armR: { target: [0, 0, 0], space: `equip:${id}:gripR`, pole: [-pole[0], pole[1], pole[2]], pron: 90, ...extra },
});
/** Hands cupping the horns (goblet / halo hold). */
export const handsOnHorns = (pole = [0.6, -1, 0.2], id = 'kb', pron = 0) => ({
  armL: { target: [0, 0, 0], space: `equip:${id}:hornL`, pole, pron },
  armR: { target: [0, 0, 0], space: `equip:${id}:hornR`, pole: [-pole[0], pole[1], pole[2]], pron },
});
/** Hands on machine handles. */
export const handsOnMachine = (pole, pron = 0, id = 'm') => ({
  armL: { target: [0, 0, 0], space: `equip:${id}:handleL`, pole, pron },
  armR: { target: [0, 0, 0], space: `equip:${id}:handleR`, pole: [-pole[0], pole[1], pole[2]], pron },
});

export const feet = (x, z = 0, yaw = 8, pole = [0.1, 0, 1], y = ANKLE_Y, pitch = 0) => legs({ target: [x, y, z], pole, foot: [pitch, yaw, 0] });

/** Seated on a machine seat (top at 0.45 m). Pelvis origin sits ~0.12 m above the seat. */
export const SEATED = {
  pelvis: { pos: [0, 0.575, -0.06], rot: [-4, 0, 0] },
  ...legs({ target: [0.15, ANKLE_Y, 0.4], pole: [0.15, 1, 0.5], foot: [0, 8, 0] }),
};
