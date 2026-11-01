// EKFS offline support — build H (safe version)
const CACHE = 'ekfs-shell-H';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const SDK = ['app', 'firestore', 'auth'].map(n => 'https://www.gstatic.com/firebasejs/10.12.2/firebase-' + n + '-compat.js');
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EKFS</title><body style="font-family:Arial;padding:24px"><h2>East Kamagak Farmers SACCO</h2><p>No internet and no saved copy yet. Connect once, then open the app again.</p></body>';
async function clean(r) { // a redirected response cannot be used for a page load
  if (!r.redirected) return r;
  const b = await r.blob(); return new Response(b, { status: 200, statusText: 'OK', headers: r.headers });
}
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(async u => { const r = await fetch(u, { cache: 'reload' }); if (r.ok) await c.put(u, await clean(r)); }));
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
    e.respondWith((async () => {
      const hit = await caches.match(url.href); if (hit) return hit;
      const r = await fetch(url.href, { mode: 'no-cors' }); try { (await caches.open(CACHE)).put(url.href, r.clone()); } catch (x) {} return r;
    })());
    return;
  }
  if (url.origin === location.origin && req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await clean(await fetch(req)); if (r.ok) { try { (await caches.open(CACHE)).put('./index.html', r.clone()); } catch (x) {} } return r;
      } catch (err) {
        const hit = (await caches.match('./index.html')) || (await caches.match('./')) ;
        return hit || new Response(OFFLINE, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try { const r = await fetch(req); if (r.ok) { try { (await caches.open(CACHE)).put(req, r.clone()); } catch (x) {} } return r; }
      catch (err) { return (await caches.match(req)) || new Response('', { status: 504 }); }
    })());
  }
});
