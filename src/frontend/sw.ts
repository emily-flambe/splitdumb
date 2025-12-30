// src/frontend/sw.ts
// Service Worker for offline caching

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'splitdumb-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first with cache fallback for API, cache first for static
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests for caching (mutations are handled by the app)
  if (event.request.method !== 'GET') {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(event.request));
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(cacheFirstWithNetwork(event.request));
});

// Network first strategy with cache fallback
async function networkFirstWithCache(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    // Clone the response before caching (response can only be read once)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline error response
    return new Response(
      JSON.stringify({ error: 'You are offline and this data is not cached' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Cache first strategy with network fallback
async function cacheFirstWithNetwork(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) {
    // Refresh cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
        }
      })
      .catch(() => {
        // Ignore network errors for background refresh
      });
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/index.html');
      if (offlinePage) return offlinePage;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Export empty object for TypeScript module
export {};
