// Optional Firebase sync (Google sign-in + Firestore). Only loaded when firebase-config.js is filled in.
// Data layout:  users/{uid}/meta/state        { settings, schedule, updatedAt }
//               users/{uid}/sessions/{id}     a session, or { deleted: true, updatedAt } tombstone
import { firebaseConfig } from '../firebase-config.js';
import { store } from './store.js';
import { reconcileImports } from './importer.js';

const SDK = 'https://www.gstatic.com/firebasejs/13.1.0';
export const syncEnabled = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

const status = { state: syncEnabled ? 'loading' : 'off', user: null, error: null };
const statusListeners = new Set();
const setStatus = (patch) => { Object.assign(status, patch); statusListeners.forEach((fn) => fn(status)); };
export const getSyncStatus = () => status;
export const onSyncStatus = (fn) => (statusListeners.add(fn), () => statusListeners.delete(fn));

let fb = null; // { auth, db, fns }
let unsubs = [];

export async function initSync() {
  if (!syncEnabled) return;
  try {
    const [appM, authM, fsM] = await Promise.all([
      import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`),
    ]);
    const app = appM.initializeApp(firebaseConfig);
    const auth = authM.getAuth(app);
    const db = fsM.getFirestore(app);
    fb = { auth, db, a: authM, f: fsM };
    authM.getRedirectResult(auth).catch(() => {});
    authM.onAuthStateChanged(auth, (user) => {
      unsubs.forEach((u) => u()); unsubs = [];
      if (user) { setStatus({ state: 'syncing', user: { name: user.displayName, email: user.email, photo: user.photoURL }, error: null }); startSync(user.uid); }
      else setStatus({ state: 'signed-out', user: null });
    });
    store.setSyncHook(pushChange);
  } catch (e) {
    console.error('Firebase failed to load', e);
    setStatus({ state: 'error', error: 'Could not load Firebase (offline?). Your data is still saved on this device.' });
  }
}

export async function signIn() {
  if (!fb) return;
  const provider = new fb.a.GoogleAuthProvider();
  try { await fb.a.signInWithPopup(fb.auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return fb.a.signInWithRedirect(fb.auth, provider);
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') setStatus({ error: e.message });
  }
}
export async function signOutUser() { if (fb) await fb.a.signOut(fb.auth); }

const uidNow = () => fb?.auth.currentUser?.uid;
const sessionRef = (uid, id) => fb.f.doc(fb.db, 'users', uid, 'sessions', id);
const metaRef = (uid) => fb.f.doc(fb.db, 'users', uid, 'meta', 'state');
const clean = (o) => JSON.parse(JSON.stringify(o)); // drop undefined

function startSync(uid) {
  const { f } = fb;
  let firstSessions = true, firstMeta = true, firstReconcile = true;

  unsubs.push(f.onSnapshot(f.collection(fb.db, 'users', uid, 'sessions'), (snap) => {
    const st = store.state; let changed = false;
    const remoteIds = new Set();
    snap.docChanges().forEach((ch) => {
      if (ch.type === 'removed') return;
      const r = ch.doc.data(); const id = ch.doc.id; remoteIds.add(id);
      const local = st.sessions[id]; const tomb = st.deleted[id];
      if (r.deleted) {
        // A delete of an imported session always wins (imported copies are never edited).
        if (local && (local.imported || (local.updatedAt || 0) <= r.updatedAt)) { delete st.sessions[id]; st.deleted[id] = r.updatedAt; changed = true; }
      } else if (!(tomb && tomb >= (r.updatedAt || 0)) && (!local || (r.updatedAt || 0) > (local.updatedAt || 0))) {
        st.sessions[id] = r; delete st.deleted[id]; changed = true;
      }
    });
    if (firstSessions) {
      firstSessions = false;
      // push anything local that the server doesn't have yet (or has older)
      const remote = new Map(snap.docs.map((d) => [d.id, d.data()]));
      const ops = [];
      for (const s of Object.values(st.sessions)) {
        const r = remote.get(s.id);
        if (!r || (!r.deleted && (r.updatedAt || 0) < (s.updatedAt || 0))) ops.push([sessionRef(uid, s.id), clean(s)]);
      }
      for (const [id, ts] of Object.entries(st.deleted)) {
        const r = remote.get(id);
        if (r && !r.deleted && (r.updatedAt || 0) <= ts) ops.push([sessionRef(uid, id), { deleted: true, updatedAt: ts }]);
      }
      writeAll(ops);
    }
    if (changed) store.commit({ kind: 'all', remote: true });
    if (firstReconcile) { firstReconcile = false; reconcileImports(); }
    setStatus({ state: 'synced', error: null });
  }, onErr));

  unsubs.push(f.onSnapshot(metaRef(uid), (snap) => {
    const st = store.state; const r = snap.data();
    let changed = false;
    if (r?.schedule && r.schedule.updatedAt > st.schedule.updatedAt) { st.schedule = r.schedule; changed = true; }
    if (r?.settings && r.settings.updatedAt > st.settings.updatedAt) { st.settings = { ...st.settings, ...r.settings }; changed = true; }
    if (firstMeta) {
      firstMeta = false;
      if (!r || st.schedule.updatedAt > (r.schedule?.updatedAt || 0) || st.settings.updatedAt > (r.settings?.updatedAt || 0)) pushMeta();
    }
    if (changed) store.commit({ kind: 'all', remote: true });
  }, onErr));
}

/** Firestore batches max out at 500 writes, so chunk them. */
function writeAll(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = fb.f.writeBatch(fb.db);
    ops.slice(i, i + 400).forEach(([ref, data]) => batch.set(ref, data));
    batch.commit().catch(onErr);
  }
}

function onErr(e) { console.error('Sync error', e); setStatus({ state: 'error', error: e.message }); }

function pushMeta() {
  const uid = uidNow(); if (!uid) return;
  const { settings, schedule } = store.state;
  fb.f.setDoc(metaRef(uid), clean({ settings, schedule, updatedAt: Date.now() })).catch(onErr);
}

function pushChange(change) {
  const uid = uidNow(); if (!uid || change.remote) return;
  if (change.kind === 'session') {
    const s = store.state.sessions[change.id];
    const p = s ? fb.f.setDoc(sessionRef(uid, change.id), clean(s)) : fb.f.setDoc(sessionRef(uid, change.id), { deleted: true, updatedAt: store.state.deleted[change.id] || Date.now() });
    p.catch(onErr);
  } else if (change.kind === 'schedule' || change.kind === 'settings') pushMeta();
  else if (change.kind === 'all') {
    pushMeta();
    writeAll(Object.values(store.state.sessions).map((s) => [sessionRef(uid, s.id), clean(s)]));
  }
}
