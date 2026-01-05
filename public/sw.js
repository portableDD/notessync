// Service Worker for NotesSync PWA
const CACHE_NAME = "notessync-v1";
const ASSETS_TO_CACHE = ["/", "/manifest.json",];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(" Caching assets...");
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        console.log(
          " Some assets failed to cache (expected for dynamic routes)"
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log(" Service Worker activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(" Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, then cache strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API calls to Supabase (handle separately with background sync)
  if (url.hostname.includes("supabase") || url.hostname.includes("api")) {
    return;
  }

  // Network first strategy for dynamic content
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && request.method === "GET") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches
          .match(request)
          .then((cachedResponse) => cachedResponse || createOfflineResponse());
      })
  );
});

function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>NotesSync - Offline</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f8f7f6;
            color: #262420;
          }
          .container {
            text-align: center;
            padding: 20px;
          }
          h1 { margin: 0 0 10px; }
          p { margin: 0; color: #808080; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>NotesSync - Offline</h1>
          <p>You're offline. Your notes are still available and will sync when you're back online.</p>
        </div>
      </body>
    </html>
    `,
    {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

// Background Sync event - retry failed sync operations
self.addEventListener("sync", (event) => {
  console.log(" Background sync event:", event.tag);
  if (event.tag === "sync-notes") {
    event.waitUntil(syncNotesWithServer());
  }
});

async function syncNotesWithServer() {
  try {
    console.log(" Attempting to sync notes...");
    // This will be handled by the main app via Background Sync API
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_START",
      });
    });
  } catch (error) {
    console.error(" Sync error:", error);
  }
}

// Message handler for communication with main app
self.addEventListener("message", (event) => {
  console.log(" Service Worker received message:", event.data.type);
  if (event.data.type === "CACHE_ASSETS") {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(event.data.assets).catch(() => {
        console.log("Error caching additional assets");
      });
    });
  }
});
