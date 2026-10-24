// Local-first data store (localStorage). Optional cloud sync hooks in via onChange().
import { PROGRAM } from './program.js';
import { uid } from './utils.js';

const KEY = 'fitlog.v1';
const listeners = new Set();
let syncHook = null;

function defaultSchedule(mode = '3day') {
  return PROGRAM.schedules[mode].map((s) => ({ id: uid(), ...s }));
}

function fresh() {
  const now = Date.now();
  return {
    schema: 4,
    settings: { planMode: '3day', sound: true, vibrate: true, keepAwake: true, equip: {}, updatedAt: now },
    schedule: { items: defaultSchedule('3day'), updatedAt: now },
    sessions: {},      // id -> session
    deleted: {},       // id -> deletedAt (tombstones, for sync)
    draft: null,       // in-progress workout (local only)
  };
}

/** Upgrade older saved data in place. Saved sessions are never rewritten — exercise ids are stable. */
export function migrate(st) {
  if ((st.schema || 1) < 2) {
    // v1 Upper Body had an either/or "fly-or-pulldown" slot; v2 has Chest Fly on its own and a
    // Row / Pulldown "pull-slot". Carry an in-progress draft over so done sets stay visible.
    const d = st.draft;
    if (d && d.choices && 'fly-or-pulldown' in d.choices) {
      const pd = (d.sets?.['lat-pulldown'] || []).some((x) => x.done);
      if (pd) d.choices['pull-slot'] = 'both';
      delete d.choices['fly-or-pulldown'];
    }
    st.schema = 2;
  }
  if (st.schema < 3) {
    // v3: KB Oblique / KB Around use ONE 15.5 kg bell (older drafts had 31 = both sides added).
    // Saved sessions stay as logged; prefill maps 31 → 15.5 via legacyWeights in program.js.
    for (const id of ['kb-oblique', 'kb-around']) {
      for (const x of st.draft?.sets?.[id] || []) if (x.weight === 31) x.weight = 15.5;
    }
    st.schema = 3;
  }
  if (st.schema < 4) {
    // v4 (1.3.1): Hammer Curl gets a Dumbbells | Kettlebell picker. A draft started before the update
    // was the kettlebell version, so keep it on Kettlebell.
    if (st.draft?.sets?.['kb-hammer-curl']) (st.draft.equip ||= {})['kb-hammer-curl'] ||= 'kb';
    st.schema = 4;
  }
  if (st.draft && typeof st.draft === 'object') {
    st.draft.choices ||= {}; st.draft.optionalOn ||= {}; st.draft.sets ||= {}; st.draft.equip ||= {};
  }
  if (st.settings) st.settings.equip ||= {};
  return st;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const base = fresh();
    const wasSchema = s.schema || 1;
    if (wasSchema < base.schema) queueMicrotask(() => store.persist());
    return migrate({ ...base, ...s, settings: { ...base.settings, ...s.settings } });
  } catch (e) {
    console.warn('Could not read saved data, starting fresh', e);
    return fresh();
  }
}

export const store = {
  state: load(),

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); }
    catch (e) { console.error('Save failed', e); }
  },

  /** change: {kind: 'settings'|'schedule'|'session'|'draft'|'all', id?} */
  commit(change = { kind: 'all' }) {
    const now = Date.now();
    if (change.kind === 'settings') this.state.settings.updatedAt = now;
    if (change.kind === 'schedule') this.state.schedule.updatedAt = now;
    this.persist();
    if (syncHook && change.kind !== 'draft') syncHook(change);
    listeners.forEach((fn) => fn(change));
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  setSyncHook(fn) { syncHook = fn; },

  // ---- sessions ----
  sessionList() {
    return Object.values(this.state.sessions)
      .sort((a, b) => (b.date === a.date ? b.savedAt - a.savedAt : b.date < a.date ? -1 : 1));
  },
  saveSession(s) {
    s.updatedAt = Date.now();
    this.state.sessions[s.id] = s;
    delete this.state.deleted[s.id];
    this.commit({ kind: 'session', id: s.id });
  },
  deleteSession(id) {
    delete this.state.sessions[id];
    this.state.deleted[id] = Date.now();
    this.commit({ kind: 'session', id, deleted: true });
  },

  // ---- schedule ----
  resetSchedule(mode) {
    this.state.settings.planMode = mode;
    this.state.settings.updatedAt = Date.now();
    this.state.schedule.items = defaultSchedule(mode);
    this.commit({ kind: 'schedule' });
    if (syncHook) syncHook({ kind: 'settings' });
  },

  // ---- backup ----
  exportJSON() {
    const { draft, ...rest } = this.state;
    return JSON.stringify({ app: 'fitlog', exportedAt: new Date().toISOString(), ...rest }, null, 2);
  },
  importJSON(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.sessions || !data.schedule) throw new Error('Not a Fitlog backup file');
    const sessions = { ...this.state.sessions };
    for (const [id, s] of Object.entries(data.sessions)) {
      if (!sessions[id] || (s.updatedAt || 0) >= (sessions[id].updatedAt || 0)) sessions[id] = s;
    }
    this.state = {
      ...this.state,
      settings: { ...this.state.settings, ...data.settings, updatedAt: Date.now() },
      schedule: { items: data.schedule.items || [], updatedAt: Date.now() },
      sessions,
    };
    this.commit({ kind: 'all' });
    return Object.keys(data.sessions).length;
  },
  resetAll() {
    const imports = this.state.imports; // don't bring the imported history back after a reset
    this.state = { ...fresh(), ...(imports ? { imports } : {}) };
    this.commit({ kind: 'all' });
  },
};
