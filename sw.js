// Simple offline service worker: precache the app shell, then stale-while-revalidate same-origin GETs.
// Bump VERSION whenever you deploy changes so phones pick up the new files.
const VERSION = 'fitlog-v1.2.0';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest', './firebase-config.js',
  './js/app.js', './js/program.js', './js/store.js', './js/utils.js', './js/logic.js', './js/ui.js', './js/muscles.js', './js/sync.js',
  './js/views/log.js', './js/views/schedule.js', './js/views/muscles.js', './js/views/history.js', './js/views/settings.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // Firebase etc. go straight to network
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const res = await network;
    return res || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});
