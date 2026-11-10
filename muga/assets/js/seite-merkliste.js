/* =============================================================================
 * seite-merkliste.js — gemerkte Artikel, mit Übergabe an die Terminbuchung
 * ========================================================================== */
(function () {
  'use strict';
  var M = window.MUGA;

  M.bereit(function () {
    M.katalog.lade().then(function (k) {
      function zeichne() {
        var liste = M.merk.liste().map(function (id) { return k.nach[id]; }).filter(Boolean);
        document.getElementById('merk-raster').innerHTML = liste.map(function (p) { return M.karte(p, k, { h: 'h2' }); }).join('');
        document.getElementById('merk-leer').hidden = !!liste.length;
        document.getElementById('merk-kopf').hidden = !liste.length;
        document.getElementById('merk-zahl').innerHTML = '<strong>' + liste.length + '</strong> ' + (liste.length === 1 ? 'Artikel gemerkt' : 'Artikel gemerkt');
        document.getElementById('merk-termin').href = 'termin.html?art=anprobe&artikel=' +
          liste.slice(0, 6).map(function (p) { return encodeURIComponent(p.id); }).join(',');
      }
      M.bei('merk', zeichne);
      zeichne();
    }).catch(function () {
      document.getElementById('merk-leer').hidden = false;
    });
  });
})();
