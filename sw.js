const CACHE_NAME = "math-teacher-workbench-v022";
const SHELL = [
  "./",
  "./index.html",
  "./styles-v2.css?v=0.2.2",
  "./app-v2.js?v=0.2.2",
  "./api-v2.js?v=0.2.2",
  "./store-v2.js?v=0.2.2",
  "./cloud-v2.js?v=0.2.2",
  "./supabase-schema.sql",
  "./card-v2.js?v=0.2.2",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match("./index.html")))
  );
});
