// Optional cloud sync. Leave apiKey empty to run 100% local (no sign-in UI is shown).
// To enable: paste the web app config from Firebase console → Project settings → Your apps → SDK setup (Config).
// A Firebase *web* config is not a secret (it only identifies your project); access is
// protected by Google sign-in + firestore.rules. Never put service-account keys here.
export const firebaseConfig = {
  apiKey: 'AIzaSyDgWtgzNdxtLQyx1EBq5QQ4npSjCP71Ymg',
  authDomain: 'ttw-gym-log.firebaseapp.com',
  projectId: 'ttw-gym-log',
  storageBucket: 'ttw-gym-log.firebasestorage.app',
  messagingSenderId: '903978413936',
  appId: '1:903978413936:web:d2f2ae43fef21db483a9b5',
};
