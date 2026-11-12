/* Tisch anfragen: Anlass, Personen, Tag, Uhrzeit, Versand */
(function () {
  'use strict';
  var PB = window.PB, T = PB.CAFE.tisch;
  var ANLASS = { fruehstueck: 'Frühstück', mittag: 'Mittagessen', kaffee: 'Kaffee und Kuchen', feier: 'Feier, lange Tafel' };
  /* Vorschlag für die Uhrzeit je Anlass */
  var STANDARD = { fruehstueck: 600, mittag: 750, kaffee: 900, feier: 780 };

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('tischform'), datum = form.elements.datum, zeit = form.elements.zeit;
    var personen = 2, ausgabe = document.getElementById('personen');
    var heute = PB.jetzt().datum;
    datum.min = heute;
    datum.max = PB.plusTage(heute, T.tageVoraus);

    var vor = new URLSearchParams(location.search).get('anlass');
    if (ANLASS[vor]) PB.$('input[name="anlass"][value="' + vor + '"]', form).checked = true;
    function anlass() { return PB.$('input[name="anlass"]:checked', form).value; }

    /* Erster Tag, an dem noch Zeiten frei sind */
    var tag = heute;
    for (var n = 0; n < 7 && !PB.tischzeiten(tag).length; n++) tag = PB.plusTage(heute, n + 1);
    datum.value = tag;

    function zeiten() {
      var liste = datum.value ? PB.tischzeiten(datum.value) : [];
      var vorher = zeit.value;
      zeit.innerHTML = liste.length
        ? '<option value="">Bitte wählen</option>' + liste.map(function (m) { return '<option value="' + m + '">' + PB.uhr(m) + ' Uhr</option>'; }).join('')
        : '<option value="">An diesem Tag geht es leider nicht mehr</option>';
      if (vorher && liste.indexOf(+vorher) !== -1) zeit.value = vorher;
      else {
        var wunsch = STANDARD[anlass()], naechste = liste.filter(function (m) { return m >= wunsch; })[0];
        if (naechste != null) zeit.value = String(naechste); else if (liste.length) zeit.value = String(liste[liste.length - 1]);
      }
    }
    datum.addEventListener('change', zeiten);
    form.addEventListener('change', function (e) { if (e.target.name === 'anlass') { zeit.value = ''; zeiten(); } });
    zeiten();

    function setzePersonen(n) {
      personen = Math.max(1, Math.min(T.maxPersonen, n));
      ausgabe.textContent = personen;
      document.getElementById('personen-text').textContent = personen === 1 ? 'Person' : 'Personen';
      PB.$('[data-personen="-1"]', form).disabled = personen <= 1;
      PB.$('[data-personen="1"]', form).disabled = personen >= T.maxPersonen;
      document.getElementById('gruppe-hinweis').hidden = !(personen >= T.grosseGruppe || anlass() === 'feier');
    }
    form.addEventListener('click', function (e) {
      var k = e.target.closest('[data-personen]');
      if (k) setzePersonen(personen + (+k.dataset.personen));
    });
    form.addEventListener('change', function (e) { if (e.target.name === 'anlass') setzePersonen(anlass() === 'feier' && personen < 8 ? 10 : personen); });
    setzePersonen(vor === 'feier' ? 10 : 2);

    var gemerkt = PB.speicher.lies('kontakt', null);
    if (gemerkt) { form.elements.name.value = gemerkt.name || ''; form.elements.telefon.value = gemerkt.telefon || ''; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!PB.pruefe(form)) return;
      PB.speicher.schreib('kontakt', { name: form.elements.name.value, telefon: form.elements.telefon.value });
      var z = [
        'Hallo Pausenbrot, ich möchte einen Tisch anfragen:', '',
        'Anlass: ' + ANLASS[anlass()],
        'Personen: ' + personen,
        'Wann: ' + PB.datumLang(datum.value) + ', ' + PB.uhr(+zeit.value) + ' Uhr',
        'Name: ' + form.elements.name.value,
        'Telefon: ' + form.elements.telefon.value
      ];
      if (form.elements.notiz.value.trim()) z.push('Hinweis: ' + form.elements.notiz.value.trim());
      PB.versand(document.getElementById('versand'), z.join('\n'), 'Anfrage');
    });
  });
})();
