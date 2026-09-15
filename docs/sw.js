/* =============================================================================
 * sw.js — das Spiel einmal holen, dann sofort da sein
 * -----------------------------------------------------------------------------
 * Das ganze Spiel steckt in einer Datei von gut acht Megabyte. Ohne diesen
 * Helfer holt der Browser sie bei jedem Besuch neu, und ohne Netz geht gar
 * nichts — obwohl in der Datei alles drin ist, was gebraucht wird: Pokédex,
 * Sprites, Musik, Trainer. Das ist gerade auf dem Telefon der Unterschied
 * zwischen »lädt« und »ist da«.
 *
 * Der Helfer legt die Seite beim ersten Besuch ab und bedient sie danach aus
 * dem eigenen Speicher. Zwei Dinge müssen dabei stimmen:
 *
 *   1. version.json darf niemals alt sein. An ihr erkennt js/update.js, dass
 *      eine neue Fassung bereitliegt. Käme sie aus dem Speicher, wäre das
 *      Spiel für immer blind für Neuigkeiten. Sie wird deshalb immer zuerst
 *      im Netz geholt; der Speicher ist nur der Notnagel ohne Verbindung.
 *
 *   2. Der Weg, den update.js zum Auffrischen benutzt, muss frei bleiben.
 *      Es lädt die Seite mit »?v=Kennung« neu, um den Zwischenspeicher des
 *      Browsers zu umgehen. Passt diese Kennung nicht zu der hier, hält sich
 *      der Helfer heraus und lässt die Anfrage ins Netz durch. Sonst drehten
 *      sich die beiden im Kreis.
 *
 * Angefasst wird ausschließlich die Seite selbst. Was daneben liegt — andere
 * Spiele im selben Verzeichnis, Bilder aus dem Netz — geht seinen gewohnten
 * Weg, als wäre der Helfer nicht da.
 * ========================================================================== */

/* Diese Zeile ersetzt tools/build-single.mjs beim Bauen. */
var KENNUNG = '20260915T164514Z-6589033';

var LAGER = 'pokelike-' + KENNUNG;
/* Das Verzeichnis, in dem der Helfer zuständig ist — z. B. »/Game/«. */
var WURZEL = new URL('./', self.location).pathname;
var SEITEN = [WURZEL, WURZEL + 'index.html'];
var BEIWERK = [WURZEL + 'manifest.webmanifest'];

/* Beim Einrichten kommt die Seite in den Speicher. Abgelegt wird nur »./« —
   das ist die Adresse, die ein Besucher wirklich aufruft. »index.html« daneben
   zu holen hieße, dieselben acht Megabyte ein zweites Mal zu laden. */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(LAGER)
      .then(function (lager) { return lager.addAll(['./', './manifest.webmanifest']); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* kein Netz beim Einrichten: dann eben beim nächsten Mal */ })
  );
});

/* Beim Übernehmen fliegen die Lager früherer Fassungen raus. */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (namen) {
        return Promise.all(namen.map(function (n) {
          return (n.indexOf('pokelike-') === 0 && n !== LAGER) ? caches.delete(n) : null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (x) { return; }
  if (url.origin !== self.location.origin) return;

  /* 1) Die Fassungsdatei: immer zuerst im Netz. */
  if (url.pathname === WURZEL + 'version.json') {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(function (antwort) {
          if (antwort && antwort.ok) {
            var kopie = antwort.clone();
            caches.open(LAGER).then(function (lager) { lager.put(req, kopie); });
          }
          return antwort;
        })
        .catch(function () {
          return caches.match(req).then(function (da) {
            return da || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
          });
        })
    );
    return;
  }

  var istSeite = SEITEN.indexOf(url.pathname) >= 0;
  var istBeiwerk = BEIWERK.indexOf(url.pathname) >= 0;
  if (!istSeite && !istBeiwerk) return;          // alles andere geht uns nichts an

  /* 2) Der Auffrischungsweg von update.js bleibt frei. */
  if (istSeite) {
    var gewuenscht = url.searchParams.get('v');
    if (gewuenscht && gewuenscht !== KENNUNG) return;
  }

  /* 3) Erst der Speicher, sonst das Netz — und was aus dem Netz kam, bleibt da. */
  var schluessel = istSeite ? './' : req;
  e.respondWith(
    caches.match(schluessel).then(function (da) {
      if (da) return da;
      return fetch(req).then(function (antwort) {
        if (antwort && antwort.ok && antwort.type === 'basic') {
          var kopie = antwort.clone();
          caches.open(LAGER).then(function (lager) { lager.put(schluessel, kopie); });
        }
        return antwort;
      });
    })
  );
});
