const CACHE = "cemap-kviz-v23";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-512.png",
  "./photos/jihocesky-1.jpg",
  "./photos/jihocesky-2.jpg",
  "./photos/jihocesky-3.jpg",
  "./photos/jihocesky-4.jpg",
  "./photos/jihocesky-5.jpg",
  "./photos/jihomoravsky-1.jpg",
  "./photos/jihomoravsky-2.jpg",
  "./photos/jihomoravsky-3.jpg",
  "./photos/jihomoravsky-4.jpg",
  "./photos/jihomoravsky-5.jpg",
  "./photos/karlovarsky-1.jpg",
  "./photos/karlovarsky-2.jpg",
  "./photos/karlovarsky-3.jpg",
  "./photos/karlovarsky-4.jpg",
  "./photos/karlovarsky-5.jpg",
  "./photos/kralovehradecky-1.jpg",
  "./photos/kralovehradecky-2.jpg",
  "./photos/kralovehradecky-3.jpg",
  "./photos/kralovehradecky-4.jpg",
  "./photos/kralovehradecky-5.jpg",
  "./photos/liberecky-1.jpg",
  "./photos/liberecky-2.jpg",
  "./photos/liberecky-3.jpg",
  "./photos/liberecky-4.jpg",
  "./photos/liberecky-5.jpg",
  "./photos/moravskoslezsky-1.jpg",
  "./photos/moravskoslezsky-2.jpg",
  "./photos/moravskoslezsky-3.jpg",
  "./photos/moravskoslezsky-4.jpg",
  "./photos/moravskoslezsky-5.jpg",
  "./photos/olomoucky-1.jpg",
  "./photos/olomoucky-2.jpg",
  "./photos/olomoucky-3.jpg",
  "./photos/olomoucky-4.jpg",
  "./photos/olomoucky-5.jpg",
  "./photos/pardubicky-1.jpg",
  "./photos/pardubicky-2.jpg",
  "./photos/pardubicky-3.jpg",
  "./photos/pardubicky-4.jpg",
  "./photos/pardubicky-5.jpg",
  "./photos/plzensky-1.jpg",
  "./photos/plzensky-2.jpg",
  "./photos/plzensky-3.jpg",
  "./photos/plzensky-4.jpg",
  "./photos/plzensky-5.jpg",
  "./photos/praha-1.jpg",
  "./photos/praha-2.jpg",
  "./photos/praha-3.jpg",
  "./photos/praha-4.jpg",
  "./photos/praha-5.jpg",
  "./photos/stredocesky-1.jpg",
  "./photos/stredocesky-2.jpg",
  "./photos/stredocesky-3.jpg",
  "./photos/stredocesky-4.jpg",
  "./photos/stredocesky-5.jpg",
  "./photos/ustecky-1.jpg",
  "./photos/ustecky-2.jpg",
  "./photos/ustecky-3.jpg",
  "./photos/ustecky-4.jpg",
  "./photos/ustecky-5.jpg",
  "./photos/vysocina-1.jpg",
  "./photos/vysocina-2.jpg",
  "./photos/vysocina-3.jpg",
  "./photos/vysocina-4.jpg",
  "./photos/vysocina-5.jpg",
  "./photos/zlinsky-1.jpg",
  "./photos/zlinsky-2.jpg",
  "./photos/zlinsky-3.jpg",
  "./photos/zlinsky-4.jpg",
  "./photos/zlinsky-5.jpg",
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
