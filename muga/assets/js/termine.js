/* =============================================================================
 * termine.js — Terminlogik: freie Zeiten, Buchen, Absagen, Kalenderdatei
 * -----------------------------------------------------------------------------
 * Mit Server liegen die Termine zentral, belegte Zeiten gelten für alle.
 * Ohne Server merkt sich der Browser die Termine und der Wunsch geht per
 * E-Mail an das Geschäft. Die Seite sagt dem Kunden ehrlich, welcher Fall gilt.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, Z = M.zeit, C = M.config;

  function lokale() {
    var l = M.speicher.lies('termine', []);
    return Array.isArray(l) ? l : [];
  }
  function sichere(liste) { M.speicher.schreib('termine', liste); }

  function alsBelegt(liste) {
    return liste.filter(function (t) { return !t.abgesagt; })
      .map(function (t) { return { datum: t.datum, start: t.start, dauer: t.dauer }; });
  }

  var T = M.termine = {

    /* Belegte Zeiten im Zeitraum, als { 'JJJJ-MM-TT': [{ start, dauer }] } */
    belegt: function (von, bis) {
      return M.api.verfuegbar().then(function (server) {
        if (!server) return alsBelegt(lokale());
        return M.api.hole('termine/belegt?von=' + von + '&bis=' + bis)
          .then(function (d) { return d.belegt || []; })
          .catch(function () { return alsBelegt(lokale()); });
      }).then(function (liste) {
        var nach = {};
        liste.forEach(function (b) {
          if (b.datum < von || b.datum > bis) return;
          (nach[b.datum] = nach[b.datum] || []).push({ start: b.start, dauer: b.dauer });
        });
        return nach;
      });
    },

    /* Frühester freier Termin für eine Terminart */
    naechster: function (artId) {
      var art = M.terminart(artId), heute = Z.jetzt().datum;
      var ende = Z.plusTage(heute, 28);
      return T.belegt(heute, ende).then(function (belegt) {
        for (var n = 0; n <= 28; n++) {
          var tag = Z.plusTage(heute, n);
          var frei = Z.startzeiten(tag, art.dauer, belegt[tag]).filter(function (s) { return s.frei; });
          if (frei.length) return { datum: tag, start: frei[0].start, uhr: frei[0].uhr };
        }
        return null;
      });
    },

    /* Bucht einen Termin. Ergebnis: { termin, server } */
    buche: function (daten) {
      var art = M.terminart(daten.art);
      return M.api.verfuegbar().then(function (server) {
        if (server) {
          return M.api.sende('termine', daten).then(function (d) {
            var termin = Object.assign({}, daten, { code: d.code, dauer: art.dauer, server: true, angelegt: Date.now() });
            var l = lokale(); l.unshift(termin); sichere(l);
            return { termin: termin, server: true };
          });
        }
        /* Ohne Server: noch einmal prüfen, ob die Zeit im Browser frei ist */
        var kollision = alsBelegt(lokale()).some(function (b) {
          return b.datum === daten.datum && daten.start < b.start + b.dauer && b.start < daten.start + art.dauer;
        });
        if (kollision) {
          var f = new Error('Diese Zeit ist bereits vergeben. Bitte wählen Sie eine andere.');
          f.status = 409;
          throw f;
        }
        var termin = Object.assign({}, daten, { code: 'MG-' + M.kennung(6), dauer: art.dauer, server: false, angelegt: Date.now() });
        var l = lokale(); l.unshift(termin); sichere(l);
        return { termin: termin, server: false };
      });
    },

    meine: function () {
      var heute = Z.jetzt().datum;
      return lokale().filter(function (t) { return t.datum >= heute; })
        .sort(function (a, b) { return (a.datum + Z.uhr(a.start)).localeCompare(b.datum + Z.uhr(b.start)); });
    },

    finde: function (code) {
      return lokale().filter(function (t) { return t.code === code; })[0] || null;
    },

    sage_ab: function (code) {
      var l = lokale(), termin = null;
      l.forEach(function (t) { if (t.code === code) termin = t; });
      if (!termin) return Promise.reject(new Error('Termin nicht gefunden.'));
      var fertig = function () { termin.abgesagt = true; sichere(l); return termin; };
      if (!termin.server) return Promise.resolve(fertig());
      return M.api.sende('termine/absagen', { code: termin.code, email: termin.email }).then(fertig);
    },

    /* Text für E-Mail und Zusammenfassung */
    text: function (t) {
      var art = M.terminart(t.art);
      var zeilen = [
        'Terminwunsch ' + t.code,
        '',
        'Anliegen: ' + art.name + ' (ca. ' + art.dauer + ' Minuten)',
        'Datum: ' + Z.datumLang(t.datum),
        'Uhrzeit: ' + Z.uhr(t.start) + ' bis ' + Z.uhr(t.start + art.dauer) + ' Uhr',
        'Personen: ' + t.personen
      ];
      if (t.anlassdatum) zeilen.push('Datum des Anlasses: ' + Z.datumKurz(t.anlassdatum));
      if (t.artikel) zeilen.push('Artikel zur Anprobe: ' + t.artikel);
      zeilen.push('', 'Name: ' + t.vorname + ' ' + t.nachname, 'Telefon: ' + t.telefon, 'E-Mail: ' + t.email);
      if (t.nachricht) zeilen.push('', 'Nachricht:', t.nachricht);
      return zeilen.join('\n');
    },

    /* Kalenderdatei (.ics) für Outlook, Apple und Google Kalender */
    ics: function (t) {
      var art = M.terminart(t.art);
      function fest(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
      function lokal(datum, minuten) {
        var d = Z.teile(datum), z = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.jahr + z(d.monat) + z(d.tag) + 'T' + z(Math.floor(minuten / 60)) + z(minuten % 60) + '00';
      }
      /* Lange Zeilen müssen laut Standard nach 75 Bytes umbrochen werden; 60 Zeichen lassen Luft für Umlaute */
      function falte(zeile) {
        var aus = [];
        while (zeile.length > 60) { aus.push(zeile.slice(0, 60)); zeile = ' ' + zeile.slice(60); }
        aus.push(zeile);
        return aus.join('\r\n');
      }
      var stempel = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
      var zeilen = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MUGA Herrenausstatter//Terminbuchung//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
        'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
        'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
        'END:VTIMEZONE',
        'BEGIN:VEVENT',
        'UID:' + t.code.toLowerCase() + '@mmuga.de',
        'DTSTAMP:' + stempel,
        'DTSTART;TZID=Europe/Berlin:' + lokal(t.datum, t.start),
        'DTEND;TZID=Europe/Berlin:' + lokal(t.datum, t.start + art.dauer),
        'SUMMARY:' + fest(art.name + ' bei MUGA Herrenausstatter'),
        'LOCATION:' + fest(C.firma + ', ' + C.strasse + ', ' + C.plz + ' ' + C.ort),
        'DESCRIPTION:' + fest('Ihr Termin ' + t.code + ' bei MUGA Herrenausstatter.\nTelefon: ' + C.telefon + '\nKostenlose Parkplätze vor dem Geschäft.'),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + fest('Termin bei MUGA Herrenausstatter'), 'TRIGGER:-PT2H', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'
      ];
      return zeilen.map(falte).join('\r\n') + '\r\n';
    },

    ladeIcs: function (t) {
      var blob = new Blob([T.ics(t)], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url;
      a.download = 'Termin-MUGA-' + t.datum + '.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }
  };
})();
