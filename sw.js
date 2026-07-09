/* 1001 Pas — service worker : cache l'app + MAJ automatique.
   HTML = réseau d'abord (→ la nouvelle version arrive dès qu'on republie), repli cache hors-ligne.
   Reste (lib carte, icône, manifeste) = cache d'abord. Les tuiles/OSM externes ne sont PAS gérées ici. */
const CACHE = 'pas1001-shell-v3';   // v3 : nouvel icône (sceau + rose des vents) → force le rafraîchissement du cache d'icônes
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-512.png',
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
  if (url.pathname.endsWith('.apk')) return;  // l'APK à télécharger : toujours le réseau (jamais une version périmée en cache)

  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isHTML) { // TOUJOURS le réseau, en contournant le cache HTTP (no-store) → jamais de version périmée ; repli cache seulement hors-ligne
    e.respondWith(fetch(url.pathname, { cache: 'no-store' })
      .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html').then(m => m || caches.match(req))));
    return;
  }
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { // cache d'abord (lib stable)
    const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
  })));
});
