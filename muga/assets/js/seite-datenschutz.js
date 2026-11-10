/* =============================================================================
 * seite-datenschutz.js — löscht auf Wunsch alles, was die Seite im Browser gemerkt hat
 * ========================================================================== */
(function () {
  'use strict';
  var M = window.MUGA;
  M.bereit(function () {
    var knopf = document.getElementById('geraet-leeren');
    if (!knopf) return;
    knopf.addEventListener('click', function () {
      ['korb', 'merk', 'gesehen', 'masse', 'land', 'termine', 'bestellung', 'kunde'].forEach(M.speicher.weg);
      M.melde('korb', []);
      M.melde('merk', []);
      document.getElementById('geraet-leeren-text').textContent = 'Erledigt. Auf diesem Gerät ist nichts mehr gespeichert.';
    });
  });
})();
