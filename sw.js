const CACHE = 'srt-v14';
const ASSETS = [
  './',
  './index.html',
  './css/index.css?v=14',
  './js/main.js?v=14',
  './js/app.js',
  './js/ui.js',
  './js/state.js',
  './js/storage.js',
  './js/templates.js',
  './js/i18n.js',
  './js/utils.js',
  './js/hotkeys.js',
  './js/export.js',
  './js/voiceTagging.js',
  './js/sessionClock.js',
  './manifest.webmanifest',
  './assets/icon.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window' });
    await Promise.all(windows.map((client) => {
      if (typeof client.navigate === 'function') return client.navigate(client.url);
      return Promise.resolve();
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(event.request))
  );
});
