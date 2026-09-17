/* eslint-disable no-restricted-globals */
/* H.O.M.S service worker.
 *
 * Purpose (session-persistence related): an installed H.O.M.S app must
 * ALWAYS run the current frontend code. Without this worker, the standalone
 * app could keep running a stale cached shell (older bundle with old
 * authentication logic) while a normal Chrome tab gets the fresh code —
 * which made the installed app lose its login session.
 *
 * Strategy:
 *  - /api/* and every non-GET request: NEVER intercepted — authentication
 *    always talks to the real backend.
 *  - Navigations (the app shell): network-first → the installed app always
 *    loads the current bundle; cached shell used only when offline.
 *  - /assets/* (content-hashed files): cache-first — immutable by name.
 *  - Public images/manifest: network-first with cache fallback.
 *
 * The cache is versioned; activation deletes every older version.
 */
const VERSION = 'homs-v1';
const APP_CACHE = `homs-app-${VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== APP_CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

const isHashedAsset = (pathname) => pathname.startsWith('/assets/');
const isCacheableStatic = (pathname) =>
  pathname.endsWith('.png') ||
  pathname === '/manifest.webmanifest' ||
  pathname === '/offline.html';

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Same-origin only. The API (Authorization headers, live data) is never
  // touched by the worker.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Content-hashed build assets: safe to serve from cache immediately.
  if (isHashedAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_CACHE);
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // App shell / navigation / public files: network-first, cache fallback.
  event.respondWith(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      try {
        const response = await fetch(request);
        if (response && response.ok && (request.mode === 'navigate' || isCacheableStatic(url.pathname))) {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
        if (cached) {
          return cached;
        }
        if (request.mode === 'navigate') {
          const shell = await cache.match('/');
          if (shell) {
            return shell;
          }
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});