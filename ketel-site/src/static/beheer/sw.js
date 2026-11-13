// Service worker van de beheer-app: bewaart alleen de app zelf (nooit afspraken of /api/).
const CACHE = 'planning-v1';
const SHELL = ['/beheer/', '/beheer/manifest.webmanifest', '/assets/favicon-64.png', '/assets/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Eerst het netwerk (altijd de nieuwste versie), bij geen bereik de bewaarde app.
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok && (url.pathname.startsWith('/beheer/') || url.pathname.startsWith('/assets/'))) {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('/beheer/'))));
});
