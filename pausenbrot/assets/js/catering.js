/* Catering anfragen */
(function () {
  'use strict';
  var PB = window.PB;
  var ART = { fruehstueck: 'Frühstücksplatten', fingerfood: 'Fingerfood', buffet: 'Buffet mit Warmem', offen: 'noch offen' };

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('cateringform'), heute = PB.jetzt().datum;
    form.elements.datum.min = PB.plusTage(heute, 1);
    form.elements.datum.value = PB.plusTage(heute, 7);

    /* Keine Preise erfunden: Die Schätzung sagt nur, was schon feststeht */
    function schaetze() {
      var n = +form.elements.gaeste.value || 0;
      var art = PB.$('input[name="art"]:checked', form).value;
      var tage = form.elements.datum.value ? Math.round((Date.parse(form.elements.datum.value) - Date.parse(heute)) / 864e5) : null;
      var s = [];
      if (n >= 5) s.push(n + ' Gäste, ' + ART[art] + '.');
      if (art === 'buffet' && tage !== null && tage < 7) s.push('Für ein Buffet ist das knapp. Ruf am besten kurz an.');
      else if (tage !== null && tage < 2) s.push('Das ist sehr kurzfristig. Ruf am besten kurz an.');
      s.push('Den Preis nennen wir dir mit unserem Vorschlag.');
      document.getElementById('schaetzung').textContent = s.join(' ');
    }
    form.addEventListener('input', schaetze);
    form.addEventListener('change', schaetze);
    schaetze();

    var gemerkt = PB.speicher.lies('kontakt', null);
    if (gemerkt) { form.elements.name.value = gemerkt.name || ''; form.elements.telefon.value = gemerkt.telefon || ''; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!PB.pruefe(form)) return;
      PB.speicher.schreib('kontakt', { name: form.elements.name.value, telefon: form.elements.telefon.value });
      var extras = PB.$$('input[name="extra"]:checked', form).map(function (i) { return i.value; });
      var z = [
        'Hallo Pausenbrot, ich habe eine Catering-Anfrage:', '',
        'Art: ' + ART[PB.$('input[name="art"]:checked', form).value],
        'Gäste: ' + form.elements.gaeste.value,
        'Datum: ' + PB.datumLang(form.elements.datum.value)
      ];
      if (extras.length) z.push('Besonderes: ' + extras.join(', '));
      z.push('Name: ' + form.elements.name.value, 'Telefon: ' + form.elements.telefon.value);
      if (form.elements.notiz.value.trim()) z.push('', form.elements.notiz.value.trim());
      PB.versand(document.getElementById('versand'), z.join('\n'), 'Anfrage');
    });
  });
})();
