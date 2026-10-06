/* Service worker voor de BTC EMA26 PWA.
 *
 * Twee regels:
 *   1. Marktdata gaat NOOIT door de cache. Een gecachte koers is een
 *      verkeerde koers, en een verkeerd EMA-signaal.
 *   2. De app-shell is network-first met de cache als terugval, zodat een
 *      nieuwe versie direct doorkomt en de app offline toch nog opent.
 */

const CACHE = 'btc-ema26-v3';
const SHELL = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Alles buiten deze origin is marktdata: direct naar het netwerk, nooit cachen.
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
