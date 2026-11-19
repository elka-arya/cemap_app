const CACHE = "cemap-kviz-v22";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-512.png",
  "./photos/kralovehradecky-1.jpg",
  "./photos/kralovehradecky-2.jpg",
  "./photos/kralovehradecky-3.jpg",
  "./photos/kralovehradecky-4.jpg",
  "./photos/kralovehradecky-5.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.indexOf("/api/") !== -1) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && (response.ok || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.destination === "image") {
            return new Response("", { status: 404 });
          }
          return caches.match("./index.html");
        })
      )
  );
});
