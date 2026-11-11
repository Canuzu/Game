/* =============================================================================
 * seite-start.js — Startseite: Auswahl aus der Kollektion, nächster freier Termin
 * ========================================================================== */
(function () {
  'use strict';
  var M = window.MUGA;

  M.bereit(function () {
    var bahn = document.getElementById('auswahl-bahn');
    var knoepfe = M.$$('[data-reihe]');

    M.katalog.lade().then(function (k) {
      var auswahl = k.produkte.filter(function (p) { return p.k.indexOf('hochzeitsanzuege') !== -1; }).slice(0, 10);
      bahn.innerHTML = auswahl.map(function (p) { return M.karte(p, k); }).join('');
      M.laufreihe(bahn, knoepfe);
    }).catch(function () {
      bahn.innerHTML = '<p class="leise">Die Kollektion konnte gerade nicht geladen werden. <a href="kollektion.html">Zur Kollektion</a></p>';
    });

    /* Nächster freier Beratungstermin als kleine Karte im Auftakt */
    var karte = document.getElementById('naechster-termin');
    if (karte && M.termine) {
      M.termine.naechster('beratung').then(function (t) {
        if (!t) return;
        var heute = M.zeit.jetzt().datum, d = M.zeit.teile(t.datum);
        var tag = t.datum === heute ? 'Heute'
          : (t.datum === M.zeit.plusTage(heute, 1) ? 'Morgen' : M.zeit.WOCHENTAGE[d.wochentag] + ', ' + d.tag + '. ' + M.zeit.MONATE[d.monat - 1]);
        karte.querySelector('[data-wann]').textContent = tag + ' · ' + t.uhr + ' Uhr';
        karte.href = 'termin.html?datum=' + t.datum;
        karte.hidden = false;
      }).catch(function () { /* Karte bleibt ausgeblendet */ });
    }
  });
})();
