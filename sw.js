// sw.js — makes Maites work with no connection at all.
//
// Everything the app needs to boot (HTML, the .jsx sources, React, Babel,
// the Firebase SDK, fonts, icons) is precached on install. Recipe data and
// photos live in Firestore's own IndexedDB cache, which the SDK keeps in
// sync and replays writes from when the connection returns.

const VERSION = 'maites-v14';
const CORE = 'core-' + VERSION;      // app shell — precached, cache-first
const RUNTIME = 'run-' + VERSION;    // anything else same-origin

// The app shell. Any of these missing means a blank screen, so they are
// fetched up front and served from the cache from then on.
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/image-slot.js',
  '/errors.jsx',
  '/tweaks-panel.jsx',
  '/data.jsx',
  '/icons.jsx',
  '/ui.jsx',
  '/components.jsx',
  '/exporter.jsx',
  '/db.jsx',
  '/screens.jsx',
  '/cooking.jsx',
  '/book.jsx',
  '/app.jsx',
  '/vendor/react.production.min.js',
  '/vendor/react-dom.production.min.js',
  '/vendor/babel.min.js',
  '/vendor/firebase-app-compat.js',
  '/vendor/firebase-firestore-compat.js',
  '/vendor/firebase-auth-compat.js',
  '/vendor/fonts/fonts.css',
  '/maites-icon.png?v=2',
  '/maites-logo.png',
];

// Fetched on first use, then kept: Excel and PDF engines, font files.
const ON_DEMAND = [
  '/vendor/xlsx.full.min.js',
  '/vendor/html2canvas.min.js',
  '/vendor/jspdf.umd.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CORE);
    // addAll is all-or-nothing; add individually so one bad entry cannot
    // leave the app with no cache at all.
    await Promise.all(SHELL.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CORE && k !== RUNTIME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Same-origin GETs only. Firestore and Google auth traffic is left alone —
// the Firebase SDK has its own offline layer.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isSource = /\.(jsx|js|css|html|json)$/i.test(url.pathname) || url.pathname === '/';
  const isVendor = url.pathname.startsWith('/vendor/');

  // Vendored libraries never change without a version bump: cache first.
  if (isVendor) {
    e.respondWith(cacheFirst(req));
    return;
  }

  // App sources: serve the cached copy immediately (so a weak connection
  // cannot stall the boot) and refresh it in the background.
  if (isSource) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Images and everything else: cache first, fall back to the network.
  e.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req, { ignoreSearch: false });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const any = await caches.match(req, { ignoreSearch: true });
    if (any) return any;
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CORE);
  const cached = await cache.match(req, { ignoreSearch: true });
  const network = fetch(req).then(res => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (cached) {
    // refresh in the background, answer now
    network.catch(() => {});
    return cached;
  }
  const res = await network;
  if (res) return res;
  // Last resort for a navigation: the cached shell.
  const shell = await cache.match('/index.html');
  if (shell) return shell;
  throw new Error('offline and not cached: ' + req.url);
}

// Warm the on-demand engines once the app is idle and online.
self.addEventListener('message', (e) => {
  if (e.data === 'warm-optional') {
    e.waitUntil((async () => {
      const cache = await caches.open(RUNTIME);
      await Promise.all(ON_DEMAND.map(u => cache.match(u).then(hit => hit || cache.add(u).catch(() => {}))));
    })());
  }
  if (e.data === 'skip-waiting') self.skipWaiting();
});
