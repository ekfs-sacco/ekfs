// EKFS offline support — build F
const CACHE = 'ekfs-shell-F';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const SDK = ['app', 'firestore', 'auth'].map(n => 'https://www.gstatic.com/firebasejs/10.12.2/firebase-' + n + '-compat.js');
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(u => c.add(u)));
    await Promise.allSettled(SDK.map(async u => { const r = await fetch(u, { mode: 'no-cors' }); await c.put(u, r); }));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req.url, { mode: 'no-cors' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req.url, copy)); return r; })));
    return;
  }
  if (url.origin === location.origin) {
    // page: try the network first so updates arrive, fall back to the saved copy offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; }).catch(() => caches.match(req).then(h => h || caches.match('./index.html'))));
  }
});
