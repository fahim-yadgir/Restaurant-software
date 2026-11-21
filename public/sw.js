const CACHE = 'restrodesk-shell-v2';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch {
      return (await caches.match(req)) || (req.mode === 'navigate' ? await caches.match('/index.html') : undefined) || Response.error();
    }
  })());
});