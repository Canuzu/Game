/* =============================================================================
 * update.js — merkt, wenn eine neuere Fassung bereitliegt
 * -----------------------------------------------------------------------------
 * Wer die Seite auf den Startbildschirm legt, bekommt auf dem Telefon eine
 * eigenständige Fassung, die der Browser gern aus seinem Zwischenspeicher
 * bedient — auch dann noch, wenn längst eine neue Fassung veröffentlicht ist.
 * Von außen lässt sich das nicht abstellen; die Seite muss es selbst merken.
 *
 * Deshalb trägt jede gebaute Fassung eine Kennung, und neben ihr liegt die
 * winzige Datei version.json mit derselben Kennung. Die wird beim Start frisch
 * geholt: Stimmen die beiden nicht überein, ist die Seite alt, und das Spiel
 * lädt sich unter einer neuen Adresse (…?v=Kennung) noch einmal — die kennt
 * der Zwischenspeicher nicht und muss sie holen.
 *
 * Damit daraus keine Endlosschleife wird, merkt sich das Spiel für die Dauer
 * des Tabs, dass es das für diese Kennung schon versucht hat. Klappt es dann
 * immer noch nicht, sagt es das lieber, als es weiter zu versuchen.
 *
 * Ohne Netz, als Einzeldatei oder lokal geöffnet passiert hier gar nichts.
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});

  // Diese Zeile ersetzt tools/build-single.mjs beim Bauen.
  var BUILD = 'entwicklung';

  var TRIED_KEY = 'pokelike.plus.update.versucht';
  var state = { build: BUILD, latest: null, checking: false, stuck: false };

  function isDev() { return BUILD === 'entwicklung'; }
  function online() { return /^https?:$/.test(root.location && root.location.protocol); }

  function tried(build) {
    try { return root.sessionStorage.getItem(TRIED_KEY) === build; } catch (e) { return false; }
  }
  function noteTried(build) {
    try { root.sessionStorage.setItem(TRIED_KEY, build); } catch (e) { /* dann eben nicht */ }
  }

  /**
   * Holt die Kennung, die gerade veröffentlicht ist. Liefert null, wenn es
   * hier nichts zu holen gibt — das ist kein Fehler, sondern der Normalfall
   * für die Einzeldatei und die eingebettete Fassung.
   */
  function fetchLatest() {
    if (!online() || typeof root.fetch !== 'function') return Promise.resolve(null);
    return root.fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return (d && d.build) || null; })
      .catch(function () { return null; });
  }

  /**
   * Prüft und lädt bei Bedarf neu. `opts.silent` hält den Mund, wenn alles
   * beim Alten ist — beim Start soll nichts aufpoppen, beim Knopfdruck schon.
   */
  function check(opts) {
    opts = opts || {};
    if (isDev()) return Promise.resolve({ state: 'entwicklung' });
    state.checking = true;
    return fetchLatest().then(function (latest) {
      state.checking = false;
      state.latest = latest;
      if (!latest) return { state: 'unbekannt' };
      if (latest === BUILD) return { state: 'aktuell', build: BUILD };
      // Schon einmal vergeblich versucht: Dann liegt es nicht am Spiel,
      // sondern am Zwischenspeicher, und ein weiterer Versuch hilft nicht.
      if (tried(latest)) {
        state.stuck = true;
        return { state: 'haengt', build: BUILD, latest: latest };
      }
      noteTried(latest);
      if (opts.reload !== false) {
        root.location.replace(root.location.pathname + '?v=' + encodeURIComponent(latest));
      }
      return { state: 'neu', build: BUILD, latest: latest };
    });
  }

  PL.update = {
    build: BUILD,
    isDev: isDev,
    state: function () { return { build: BUILD, latest: state.latest, stuck: state.stuck }; },
    check: check
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.update;
})(typeof globalThis !== 'undefined' ? globalThis : this);
