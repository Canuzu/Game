/* =============================================================================
 * seite-service.js — Versandtabelle und Versandkostenrechner aus config.js
 * ========================================================================== */
(function () {
  'use strict';
  var M = window.MUGA, C = M.config, esc = M.esc;

  M.bereit(function () {
    var koerper = document.querySelector('#versandtabelle tbody');
    koerper.innerHTML = C.versand.zonen.map(function (z) {
      var laender = z.laender.join(', ').replace('Anderes Land', 'Rest der Welt');
      return '<tr><th scope="row">' + esc(z.id === 'de' ? z.name : laender) + '</th>' + z.kosten.map(function (k) {
        return '<td class="zahl">' + (k ? M.geld(k) : 'kostenlos') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    var land = document.getElementById('r-land'), wert = document.getElementById('r-wert'), aus = document.getElementById('r-ergebnis');
    land.innerHTML = M.laender().map(function (l) { return '<option value="' + esc(l) + '">' + esc(l === 'Anderes Land' ? 'Rest der Welt' : l) + '</option>'; }).join('');
    land.value = M.speicher.lies('land', 'Deutschland');
    if (!land.value) land.value = 'Deutschland';
    function rechne() {
      var betrag = parseFloat(String(wert.value).replace(',', '.'));
      if (!isFinite(betrag) || betrag < 0) { aus.textContent = '–'; return; }
      var kosten = M.versandkosten(land.value, betrag);
      aus.textContent = kosten ? M.geld(kosten) : 'kostenlos';
    }
    land.addEventListener('change', rechne);
    wert.addEventListener('input', rechne);
    document.getElementById('rechner').addEventListener('submit', function (e) { e.preventDefault(); });
    rechne();

    /* Sprung auf eine Frage: Abschnitt aufklappen */
    if (location.hash) {
      var ziel = document.querySelector(location.hash);
      if (ziel && ziel.tagName === 'DETAILS') ziel.open = true;
    }
  });
})();
