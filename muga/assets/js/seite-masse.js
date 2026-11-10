/* =============================================================================
 * seite-masse.js — Größenberater für Anzüge und Hemden, Maßtabellen
 * -----------------------------------------------------------------------------
 * Die Anzuggröße folgt den üblichen deutschen Konfektionsgrößen:
 *   normale Größe      = Brustumfang / 2             (44 bis 72)
 *   schlanke Größe     = normale Größe × 2 − 2       (90 bis 126)
 *   untersetzte Größe  = normale Größe / 2           (23 bis 37)
 * Welche Reihe passt, entscheiden Körpergröße und Bundumfang im Verhältnis
 * zum Brustumfang. Die Tabellen stammen aus den Maßtabellen von MUGA.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, esc = M.esc;
  function el(id) { return document.getElementById(id); }

  /* Je normaler Größe: übliche Körpergröße (Mitte) und üblicher Bundumfang (Mitte) */
  var NORMAL = [
    { g: 44, hoehe: 168.5, bund: 75.5 }, { g: 46, hoehe: 170.5, bund: 79.5 }, { g: 48, hoehe: 173.5, bund: 83.5 },
    { g: 50, hoehe: 176.5, bund: 87.5 }, { g: 52, hoehe: 179.5, bund: 92 }, { g: 54, hoehe: 181.5, bund: 97 },
    { g: 56, hoehe: 183.5, bund: 102 }, { g: 58, hoehe: 185.5, bund: 107 }, { g: 60, hoehe: 187.5, bund: 112 },
    { g: 62, hoehe: 189, bund: 117 }, { g: 64, hoehe: 190, bund: 122 }, { g: 66, hoehe: 190, bund: 127 },
    { g: 68, hoehe: 190, bund: 132 }, { g: 70, hoehe: 190, bund: 137 }, { g: 72, hoehe: 190, bund: 142 }
  ];

  /* Kern des Beraters; liefert Größe, Reihe und Begründung */
  function anzuggroesse(hoehe, brust, bund) {
    var i = Math.max(0, Math.min(NORMAL.length - 1, Math.floor((brust - 86) / 4)));
    var n = NORMAL[i];
    var zuGross = hoehe - n.hoehe, zuWeit = bund - n.bund;
    var schlank = n.g * 2 - 2, untersetzt = n.g / 2;
    var aus = { normal: n.g, groesse: String(n.g), reihe: 'normal', art: 'Normale Größe', weitere: [] };

    if (zuGross >= 6 && zuWeit <= 2 && schlank >= 90 && schlank <= 126) {
      aus.groesse = String(schlank); aus.reihe = 'schlank'; aus.art = 'Schlanke Größe';
      aus.text = 'Sie sind für Ihren Brustumfang überdurchschnittlich groß. Schlanke Größen haben längere Ärmel und Hosenbeine bei schmalerem Bund.';
      aus.weitere.push('Normal: ' + n.g);
    } else if (((zuGross <= -5 && zuWeit >= 0) || (zuWeit >= 7 && zuGross <= 1)) && untersetzt >= 23 && untersetzt <= 37) {
      aus.groesse = String(untersetzt); aus.reihe = 'untersetzt'; aus.art = 'Untersetzte Größe';
      aus.text = 'Untersetzte Größen sind kürzer geschnitten und haben mehr Weite im Bund. Das passt zu Ihren Maßen besser als die normale Größe.';
      aus.weitere.push('Normal: ' + n.g);
    } else {
      aus.text = 'Ihre Maße liegen im üblichen Verhältnis zueinander. Die normale Größe sollte gut sitzen.';
      if (zuWeit >= 5) aus.text = 'Die Größe richtet sich nach Ihrem Brustumfang. Am Bund darf es etwas mehr sein: Achten Sie auf Modelle mit bequemem Schnitt.';
      if (zuWeit <= -7) aus.text = 'Die Größe richtet sich nach Ihrem Brustumfang. Ihr Bund ist schmal, ein taillierter Schnitt (Slim-fit) steht Ihnen besonders gut.';
    }
    /* Grenzfälle: liegt der Brustumfang am Rand der Spanne, die Nachbargröße nennen */
    var rest = (brust - 86) % 4;
    if (brust >= 86 && brust <= 145) {
      if (rest >= 3 && i < NORMAL.length - 1) aus.weitere.push('Grenzfall zu ' + NORMAL[i + 1].g);
      if (rest < 1 && i > 0) aus.weitere.push('Grenzfall zu ' + NORMAL[i - 1].g);
    }
    if (brust < 86) aus.text = 'Ihr Brustumfang liegt unter unserer kleinsten Größe 44. Kommen Sie vorbei, wir finden gemeinsam eine Lösung.';
    if (brust > 145) aus.text = 'Ihr Brustumfang liegt über unserer größten Größe 72. Rufen Sie uns an, wir beraten Sie persönlich.';
    return aus;
  }
  M.anzuggroesse = anzuggroesse;

  var HEMD = [
    { g: 'S', kragen: '37/38', bis: 38 }, { g: 'M', kragen: '39/40', bis: 40 }, { g: 'L', kragen: '41/42', bis: 42 },
    { g: 'XL', kragen: '43/44', bis: 44 }, { g: 'XXL', kragen: '45/46', bis: 46 }, { g: '3XL', kragen: '47/48', bis: 48 },
    { g: '4XL', kragen: '49/50', bis: 50 }, { g: '5XL', kragen: '51/52', bis: 52 }
  ];
  function hemdgroesse(hals) {
    for (var i = 0; i < HEMD.length; i++) if (hals <= HEMD[i].bis) return HEMD[i];
    return HEMD[HEMD.length - 1];
  }
  M.hemdgroesse = hemdgroesse;

  /* ---------- Maßtabellen von MUGA (Zentimeter) ----------------------------- */
  var HEMDKOPF = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
  var KRAGEN = ['Kragenweite', '37/38', '39/40', '41/42', '43/44', '45/46', '47/48', '49/50', '51/52'];
  var TABELLEN = [
    { name: 'Anzug normal', kopf: [48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72], zeilen: [
      ['Armlänge', 64, 65, 66, 67, 68, 69, 70, 70, 71, 71, 72, 73, 74],
      ['Schulterbreite', '44,5', 45, 46, 47, 49, 50, 51, 52, 53, 53, 55, 56, 58],
      ['Brustweite einfach', 52, 53, 54, 56, 57, 58, 61, 62, 64, 66, 67, 69, 70],
      ['Taille einfach', 49, 51, 52, 54, 55, 58, 59, 60, 62, 64, 66, 68, 69],
      ['Bundweite einfach', 44, 46, 48, 49, 51, 53, 55, 59, 61, 63, 64, 65, 66],
      ['Hosenlänge offen', 113, 114, 115, 115, 115, 115, 116, 119, 119, 119, 120, 120, 120],
      ['Fußweite einfach', 22, '21,5', '21,5', '21,5', 22, 22, 23, 23, 23, 23, 24, 24, 24]] },
    { name: 'Anzug untersetzt', kopf: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37], zeilen: [
      ['Armlänge', 62, 63, 63, 64, 65, 66, 66, 67, 67, 68, 68, 69, 70, 71, 72],
      ['Schulterbreite', 44, 45, 45, 48, 48, 50, 50, 51, 52, 53, 54, 54, 55, 57, 57],
      ['Brustweite einfach', 53, 54, 56, 57, 58, 60, 61, 64, 65, 66, 68, 69, 71, 73, 74],
      ['Taille einfach', 51, 52, 54, 55, 56, 58, 60, 62, 63, 65, 68, 68, 70, 72, 72],
      ['Bundweite einfach', 43, 45, 46, 48, 48, 51, 53, 57, 59, 62, 62, 65, 68, 70, 72],
      ['Hosenlänge offen', 114, 115, 114, 114, 116, 115, 115, 116, 119, 120, 120, 120, 120, 120, 120],
      ['Fußweite einfach', 22, 22, 22, 22, 22, 22, 22, 23, 22, 23, 24, 24, 24, 24, '24,5']] },
    { name: 'Anzug schlank', kopf: [90, 94, 98, 102, 106, 110, 114, 118, 122, 126], zeilen: [
      ['Armlänge', 64, 65, 66, 67, 68, 69, 70, 71, 73, 74],
      ['Schulterbreite', 45, 46, 47, 48, 49, '49,5', '50,5', 52, 52, 53],
      ['Brustweite einfach', 51, 52, 53, 55, 56, 58, 59, 61, 62, 63],
      ['Taille einfach', 49, 50, 51, 53, 54, 56, 57, 59, 62, 62],
      ['Bundweite einfach', 39, 41, 43, 46, 48, 50, 52, 55, 59, 59],
      ['Hosenlänge offen', 117, 117, 117, 118, 118, 120, 120, 123, 123, 123],
      ['Fußweite einfach', '20,5', 21, '21,5', 22, '21,5', '22,5', 22, '22,5', '22,5', '22,5']] },
    { name: 'Hemd klassisch', kopf: HEMDKOPF, zeilen: [KRAGEN,
      ['Armlänge', 63, 65, 65, 68, 68, 70, 71, 73],
      ['Schulterbreite', 44, 48, 50, 54, 57, 60, 64, 67],
      ['Brustweite einfach', 50, 57, 60, 64, 70, 74, 78, 81],
      ['Taillenweite einfach', 50, 57, 60, 64, 70, 74, 78, 81],
      ['Gesamtlänge', 82, 84, 86, 88, 90, 92, 92, 95]] },
    { name: 'Hemd leicht tailliert', kopf: HEMDKOPF, zeilen: [KRAGEN,
      ['Armlänge', 64, 64, 66, 67, 67, 68, 68, 70],
      ['Schulterbreite', 45, 47, 49, 50, 51, 53, 55, 57],
      ['Brustweite einfach', 55, 57, 58, 63, 68, 71, 77, 83],
      ['Taillenweite einfach', 53, 55, 56, 61, 66, 69, 75, 80],
      ['Gesamtlänge', 77, 78, 80, 83, 84, 86, 89, 90]] },
    { name: 'Hemd Slim-fit', kopf: HEMDKOPF.slice(0, 7), zeilen: [KRAGEN.slice(0, 8),
      ['Armlänge', 62, 64, 66, 68, 68, 68, 69],
      ['Schulterbreite', 42, 46, 48, 50, 52, 54, 57],
      ['Brustweite einfach', 50, 55, 57, 59, 64, 66, 70],
      ['Taillenweite einfach', 48, 52, 54, 56, 62, 64, 67],
      ['Gesamtlänge', 79, 81, 83, 85, 85, 85, 85]] },
    { name: 'Hemd extra langer Arm', kopf: HEMDKOPF, zeilen: [KRAGEN,
      ['Armlänge', 70, 72, 73, 74, 74, 75, 77, 78],
      ['Schulterbreite', 45, 48, 51, 54, 57, 60, 63, 66],
      ['Brustweite einfach', 54, 58, 61, 64, 67, 72, 77, 81],
      ['Taillenweite einfach', 53, 56, 60, 64, 67, 71, 75, 79],
      ['Gesamtlänge', 85, 85, 87, 88, 90, 92, 94, 96]] }
  ];

  /* Schieberegler und Zahlenfeld gehören zusammen; die Füllung zeigt den Stand */
  function verbinde(reglerId, bei) {
    var regler = el(reglerId), zahl = el(reglerId + '-zahl');
    function fuelle() {
      var min = +regler.min, max = +regler.max;
      regler.style.setProperty('--stand', ((+regler.value - min) / (max - min) * 100).toFixed(1) + '%');
    }
    regler.addEventListener('input', function () { zahl.value = regler.value; fuelle(); bei(); });
    zahl.addEventListener('input', function () {
      var w = parseFloat(zahl.value);
      if (!isFinite(w)) return;
      regler.value = Math.max(+regler.min, Math.min(+regler.max, w));
      fuelle(); bei();
    });
    zahl.addEventListener('change', function () {
      var w = parseFloat(zahl.value);
      if (!isFinite(w)) w = +regler.value;
      zahl.value = Math.max(+regler.min, Math.min(+regler.max, Math.round(w)));
      regler.value = zahl.value;
      fuelle(); bei();
    });
    fuelle();
    return function () { return +regler.value; };
  }

  M.bereit(function () {
    /* ---- Anzug ---- */
    var hoehe, brust, bund;
    function rechne() {
      if (!hoehe || !brust || !bund) return;
      var e = anzuggroesse(hoehe(), brust(), bund());
      el('erg-groesse').textContent = e.groesse;
      el('erg-art').textContent = e.art;
      el('erg-text').textContent = e.text;
      el('erg-weitere').innerHTML = e.weitere.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('');
      el('erg-link').textContent = 'Anzüge in Größe ' + e.groesse;
      el('erg-link').href = 'kollektion.html?k=anzuege-uni&g=' + e.groesse;
      el('erg-hochzeit').href = 'kollektion.html?k=hochzeitsanzuege&g=' + e.groesse;
      M.speicher.schreib('masse', { hoehe: hoehe(), brust: brust(), bund: bund(), groesse: e.groesse });
    }
    var gemerkt = M.speicher.lies('masse', null);
    if (gemerkt) {
      ['hoehe', 'brust', 'bund'].forEach(function (f) {
        var r = el(f);
        if (gemerkt[f] >= +r.min && gemerkt[f] <= +r.max) { r.value = gemerkt[f]; el(f + '-zahl').value = gemerkt[f]; }
      });
    }
    hoehe = verbinde('hoehe', rechne); brust = verbinde('brust', rechne); bund = verbinde('bund', rechne);
    rechne();
    el('berater').addEventListener('submit', function (e) { e.preventDefault(); });

    /* ---- Hemd ---- */
    var hals;
    function rechneHemd() {
      if (!hals) return;
      var h = hemdgroesse(hals());
      el('hemd-groesse').textContent = h.g;
      el('hemd-art').textContent = 'Kragenweite ' + h.kragen;
      el('hemd-link').href = 'kollektion.html?k=hemden&g=' + encodeURIComponent(h.g + ' (' + h.kragen + ')');
    }
    hals = verbinde('hals', rechneHemd);
    rechneHemd();
    el('hemdberater').addEventListener('submit', function (e) { e.preventDefault(); });

    /* ---- Tabellen ---- */
    var reiter = el('reiter'), ziel = el('tabelle');
    reiter.innerHTML = TABELLEN.map(function (t, i) {
      return '<button type="button" role="tab" id="reiter-' + i + '" aria-controls="tabelle" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-tabelle="' + i + '">' + esc(t.name) + '</button>';
    }).join('');
    function zeige(i) {
      var t = TABELLEN[i];
      ziel.innerHTML = '<div class="tabellenrahmen" tabindex="0" role="region" aria-label="' + esc(t.name) + ', Maße in Zentimetern"><table class="tabelle"><caption class="unsichtbar">' + esc(t.name) + ', Maße in Zentimetern</caption><thead><tr><th scope="col">Größe</th>' +
        t.kopf.map(function (k) { return '<th scope="col" class="zahl">' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.zeilen.map(function (z) {
          return '<tr><th scope="row">' + esc(z[0]) + '</th>' + z.slice(1).map(function (w) { return '<td class="zahl">' + esc(w) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
      ziel.setAttribute('aria-labelledby', 'reiter-' + i);
      M.$$('[data-tabelle]', reiter).forEach(function (b, n) { b.setAttribute('aria-selected', n === i); b.tabIndex = n === i ? 0 : -1; });
    }
    reiter.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tabelle]');
      if (b) zeige(+b.dataset.tabelle);
    });
    reiter.addEventListener('keydown', function (e) {
      var richtung = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!richtung) return;
      e.preventDefault();
      var alle = M.$$('[data-tabelle]', reiter), i = alle.indexOf(document.activeElement);
      var ziel2 = alle[(i + richtung + alle.length) % alle.length];
      ziel2.focus();
      zeige(+ziel2.dataset.tabelle);
    });
    zeige(0);
  });
})();
