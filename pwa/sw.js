/* Service worker: casca do app em cache + aulas.json "rede primeiro". */
var VERSAO = "v1";
var CACHE_CASCA = "aulas-casca-" + VERSAO;
var CACHE_DADOS = "aulas-dados-" + VERSAO;
var CASCA = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE_CASCA).then(function (c) { return c.addAll(CASCA); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes
        .filter(function (n) { return n !== CACHE_CASCA && n !== CACHE_DADOS; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; /* YouTube e links externos passam direto */

  if (url.pathname.endsWith("/data/aulas.json")) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copia = res.clone();
        caches.open(CACHE_DADOS).then(function (c) { c.put(req, copia); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok && url.pathname.indexOf("/docs/") !== -1) {
          var copia = res.clone();
          caches.open(CACHE_DADOS).then(function (c) { c.put(req, copia); });
        }
        return res;
      });
    })
  );
});
