// Keyframe clip: named poses + a looping timeline of segments with tempo, easing, cues and work flags.
import { resolvePose, lerpPoseInto, splinePoseInto, EASE } from './pose.js';

export class Clip {
  constructor(def) {
    this.def = def;
    this.tempo = def.tempo || {};
    this.keys = {};
    for (const [k, p] of Object.entries(def.keys)) this.keys[k] = resolvePose(p);
    let acc = 0;
    this.segs = def.timeline.map((s, i) => {
      const dur = typeof s.t === 'number' ? s.t : (this.tempo[s.t] ?? 1);
      if (!this.keys[s.to]) throw new Error(`${def.id}: timeline[${i}] → unknown key "${s.to}"`);
      const seg = { ...s, dur, start: acc, ease: EASE[s.ease || (def.interp === 'spline' ? 'linear' : 'inOut')] || EASE.inOut };
      acc += dur; return seg;
    });
    this.duration = acc;
    const repSegs = this.segs.filter((s) => s.rep).length;
    this.repsPerCycle = repSegs || 1;
    this.countAtEnd = !repSegs;
  }

  keyAt(i) { const n = this.segs.length; return this.keys[this.segs[((i % n) + n) % n].to]; }

  /** time in seconds at 1x → { pose, index, seg, u, reps, cue, work } */
  sample(time) {
    const D = this.duration, n = this.segs.length;
    const cycle = Math.floor(time / D);
    let t = time - cycle * D; if (t < 0) t += D;
    let i = 0; while (i < n - 1 && t >= this.segs[i].start + this.segs[i].dur) i++;
    const seg = this.segs[i];
    const u = seg.dur > 0 ? Math.min(1, (t - seg.start) / seg.dur) : 1;
    const e = seg.ease(u);
    const from = this.keyAt(i - 1), to = this.keyAt(i);
    // Interpolated poses are written into one reused object (no per-frame allocation).
    // The returned sample is only valid until the next sample() call.
    let pose;
    if (from === to) pose = to;
    else if (this.def.interp === 'spline') pose = this._pose = splinePoseInto(this._pose, this.keyAt(i - 2), from, to, this.keyAt(i + 1), e);
    else pose = this._pose = lerpPoseInto(this._pose, from, to, e);
    let done = 0; for (let k = 0; k < i; k++) if (this.segs[k].rep) done++;
    const reps = cycle * this.repsPerCycle + (this.countAtEnd ? 0 : done);
    // cue: nearest segment at or before i that has one
    let cue = ''; for (let k = i; k >= i - n; k--) { const c = this.segs[((k % n) + n) % n].cue; if (c) { cue = c; break; } }
    const r = this._res ||= {};
    r.pose = pose; r.index = i; r.seg = seg; r.u = u; r.reps = reps; r.cue = cue; r.work = seg.work ? 1 : 0; r.cycle = cycle;
    return r;
  }

  /** time (s) at which the timeline arrives at key `name` (end of the first segment targeting it). */
  timeOfKey(name) {
    if (this.segs[this.segs.length - 1].to === name) return 0; // the cycle starts in this pose
    const s = this.segs.find((x) => x.to === name);
    return s ? s.start + s.dur - 1e-4 : 0;
  }
}
