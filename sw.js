/* 1001 Pas — service worker : cache l'app + MAJ automatique.
   HTML = réseau d'abord (→ la nouvelle version arrive dès qu'on republie), repli cache hors-ligne.
   Reste (lib carte, icône, manifeste) = cache d'abord. Les tuiles/OSM externes ne sont PAS gérées ici. */
const CACHE = 'pas1001-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg',
               './vendor/maplibre-gl.js', './vendor/maplibre-gl.css'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // tuiles/OSM/polices externes → réseau direct

  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isHTML) { // réseau d'abord → mise à jour instantanée
    e.respondWith(fetch(req)
      .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(m => m || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { // cache d'abord (lib stable)
    const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
  })));
});
