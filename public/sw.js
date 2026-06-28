const CACHE_NAME = "auramail-cache-v1";
const ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico"
];

// Install Event - cache core shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching App Shell");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Only intercept HTTP/S GET requests (avoid chrome-extensions or POST APIs)
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If valid network response, clone it and cache it
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If offline and request is document/page, return offline message
          if (event.request.headers.get("accept").includes("text/html")) {
            return new Response(
              "<h1>You are currently offline</h1><p>AuraMail needs a connection to sync or load new emails. Standard cached pages will load when you re-establish service.</p>",
              {
                headers: { "Content-Type": "text/html" }
              }
            );
          }
        });
      })
  );
});
