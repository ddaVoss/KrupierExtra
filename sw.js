/* Krupier Extra — praca offline (pamięć podręczna plików aplikacji) */
const CACHE = 'krupier-extra-v13';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/core.js',
  './js/poker-eval.js',
  './js/roulette.js',
  './js/blackjack.js',
  './js/poker.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// najpierw z pamięci (szybko i offline), w tle pobieramy nowszą wersję
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request, { ignoreSearch: true }).then((hit) => {
        const net = fetch(e.request)
          .then((res) => { if (res && res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});
