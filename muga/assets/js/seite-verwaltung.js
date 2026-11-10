/* =============================================================================
 * seite-verwaltung.js — Übersicht für das Geschäft: Termine, Bestellungen, Nachrichten
 * -----------------------------------------------------------------------------
 * Funktioniert nur mit Server. Der Schlüssel bleibt für die Dauer der Sitzung
 * im Browser (sessionStorage) und wird bei jeder Anfrage mitgeschickt.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, Z = M.zeit, C = M.config, esc = M.esc;
  function el(id) { return document.getElementById(id); }

  var schluessel = '', daten = null, bereich = 'termine';
  var NAMEN = { termine: 'Termine', bestellungen: 'Bestellungen', nachrichten: 'Nachrichten' };
  var ZUSTAND = { neu: 'neu', bestaetigt: 'bestätigt', erledigt: 'erledigt', abgesagt: 'abgesagt', bezahlt: 'bezahlt', versendet: 'versendet', abgeholt: 'abgeholt', storniert: 'storniert', beantwortet: 'beantwortet' };

  function merke(wert) { try { if (wert) sessionStorage.setItem('muga.verwaltung', wert); else sessionStorage.removeItem('muga.verwaltung'); } catch (e) { /* egal */ } }
  function gemerkt() { try { return sessionStorage.getItem('muga.verwaltung') || ''; } catch (e) { return ''; } }

  function lade() {
    return M.api.hole('verwaltung', { Authorization: 'Bearer ' + schluessel }).then(function (d) {
      daten = d;
      el('anmeldung').hidden = true;
      el('bereich').hidden = false;
      el('abmelden').hidden = false;
      zeichne();
    });
  }

  function wann(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var j = Z.jetzt(d);
    return Z.datumKurz(j.datum) + ', ' + Z.uhr(j.minuten);
  }

  function zustandwahl(art, kennung, aktuell) {
    return '<label class="unsichtbar" for="z-' + esc(kennung) + '">Zustand</label><select class="auswahl" id="z-' + esc(kennung) + '" data-bereich="' + art + '" data-kennung="' + esc(kennung) + '">' +
      daten.zustaende[art].map(function (z) { return '<option value="' + z + '"' + (z === aktuell ? ' selected' : '') + '>' + esc(ZUSTAND[z] || z) + '</option>'; }).join('') + '</select>';
  }

  function zeichne() {
    var heute = Z.jetzt().datum;
    var kommend = daten.termine.filter(function (t) { return t.datum >= heute && t.status !== 'abgesagt'; });
    el('kennzahlen').innerHTML =
      '<li><strong>' + kommend.filter(function (t) { return t.datum === heute; }).length + '</strong><span>Termine heute</span></li>' +
      '<li><strong>' + kommend.length + '</strong><span>kommende Termine</span></li>' +
      '<li><strong>' + daten.bestellungen.filter(function (b) { return b.status === 'neu'; }).length + '</strong><span>neue Bestellungen</span></li>' +
      '<li><strong>' + daten.nachrichten.filter(function (n) { return n.status === 'neu'; }).length + '</strong><span>neue Nachrichten</span></li>';

    el('v-reiter').innerHTML = Object.keys(NAMEN).map(function (b) {
      return '<button type="button" role="tab" aria-controls="v-inhalt" aria-selected="' + (b === bereich) + '" data-zeige="' + b + '">' + NAMEN[b] + ' (' + daten[b].length + ')</button>';
    }).join('');

    var html = '';
    if (bereich === 'termine') {
      var liste = daten.termine.slice().sort(function (a, b) { return (b.datum + Z.uhr(b.start)).localeCompare(a.datum + Z.uhr(a.start)); })
        .sort(function (a, b) { return (a.datum < heute) - (b.datum < heute) || (a.datum >= heute ? (a.datum + Z.uhr(a.start)).localeCompare(b.datum + Z.uhr(b.start)) : 0); });
      html = liste.length ? '<div class="tabellenrahmen" tabindex="0" role="region" aria-label="Liste"><table class="tabelle"><thead><tr><th>Wann</th><th>Anliegen</th><th>Kunde</th><th>Hinweise</th><th>Zustand</th></tr></thead><tbody>' +
        liste.map(function (t) {
          var a = M.terminart(t.art);
          return '<tr><td><strong>' + esc(Z.datumLang(t.datum)) + '</strong><small>' + Z.uhr(t.start) + ' bis ' + Z.uhr(t.start + t.dauer) + ' Uhr · ' + esc(t.code) + '</small></td>' +
            '<td>' + esc(a ? a.name : t.art) + '<small>' + t.personen + (t.personen === 1 ? ' Person' : ' Personen') + '</small></td>' +
            '<td>' + esc(t.vorname + ' ' + t.nachname) + '<small><a href="tel:' + esc(t.telefon.replace(/[^0-9+]/g, '')) + '">' + esc(t.telefon) + '</a> · <a href="mailto:' + esc(t.email) + '">' + esc(t.email) + '</a></small></td>' +
            '<td>' + (t.artikel ? 'Anprobe: ' + esc(t.artikel) : '') + (t.anlassdatum ? '<small>Feier am ' + esc(Z.datumKurz(t.anlassdatum)) + '</small>' : '') + (t.nachricht ? '<small>' + esc(t.nachricht) + '</small>' : '') + '</td>' +
            '<td>' + zustandwahl('termine', t.code, t.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="leise">Noch keine Termine.</p>';
    }
    if (bereich === 'bestellungen') {
      var bl = daten.bestellungen.slice().reverse();
      html = bl.length ? '<div class="tabellenrahmen" tabindex="0" role="region" aria-label="Liste"><table class="tabelle"><thead><tr><th>Bestellung</th><th>Artikel</th><th>Kunde</th><th class="zahl">Summe</th><th>Zustand</th></tr></thead><tbody>' +
        bl.map(function (b) {
          var zahl = C.zahlarten.filter(function (z) { return z.id === b.zahlung; })[0], k = b.kunde;
          return '<tr><td><strong>' + esc(b.nummer) + '</strong><small>' + esc(wann(b.angelegt)) + '</small><small>' + (b.lieferung === 'abholung' ? 'Abholung' : 'Versand') + ' · ' + esc(zahl ? zahl.name : b.zahlung) + '</small></td>' +
            '<td>' + b.posten.map(function (p) {
              return p.menge + ' × ' + esc(p.name) + '<small>' + esc([p.nr ? 'Modell ' + p.nr : '', p.groesse ? 'Größe ' + p.groesse : '', p.farbe, p.zusatz].filter(Boolean).join(' · ')) + '</small>';
            }).join('') + (b.hinweis ? '<small>Anmerkung: ' + esc(b.hinweis) + '</small>' : '') + '</td>' +
            '<td>' + esc(k.vorname + ' ' + k.nachname) + '<small>' + (b.lieferung === 'versand' ? esc(k.strasse + ', ' + k.plz + ' ' + k.ort + ', ' + (k.landname || k.land)) : 'holt ab') + '</small>' +
              '<small><a href="mailto:' + esc(k.email) + '">' + esc(k.email) + '</a>' + (k.telefon ? ' · ' + esc(k.telefon) : '') + '</small></td>' +
            '<td class="zahl"><strong>' + M.geld(b.gesamt) + '</strong><small>davon Versand ' + M.geld(b.versand) + '</small></td>' +
            '<td>' + zustandwahl('bestellungen', b.nummer, b.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="leise">Noch keine Bestellungen.</p>';
    }
    if (bereich === 'nachrichten') {
      var nl = daten.nachrichten.slice().reverse();
      html = nl.length ? '<div class="tabellenrahmen" tabindex="0" role="region" aria-label="Liste"><table class="tabelle"><thead><tr><th>Eingang</th><th>Von</th><th>Nachricht</th><th>Zustand</th></tr></thead><tbody>' +
        nl.map(function (n) {
          return '<tr><td>' + esc(wann(n.angelegt)) + '</td>' +
            '<td>' + esc(n.vorname + ' ' + n.nachname) + '<small><a href="mailto:' + esc(n.email) + '">' + esc(n.email) + '</a>' + (n.telefon ? ' · ' + esc(n.telefon) : '') + '</small></td>' +
            '<td><strong>' + esc(n.betreff) + '</strong><small style="white-space:pre-line">' + esc(n.nachricht) + '</small></td>' +
            '<td>' + zustandwahl('nachrichten', n.kennung, n.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="leise">Noch keine Nachrichten.</p>';
    }
    el('v-inhalt').innerHTML = html;
  }

  M.bereit(function () {
    M.api.verfuegbar().then(function (server) {
      if (!server) {
        el('anmeldung').innerHTML = '<h2>Verwaltung nicht verfügbar</h2><p class="leise">Die Verwaltung braucht den Server (<code>node server.js</code>). Als reine Dateien ausgeliefert, speichert die Seite nichts zentral.</p>';
        return;
      }
      schluessel = gemerkt();
      if (schluessel) lade().catch(function () { schluessel = ''; merke(''); });
    });

    el('anmeldung').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!M.pruefe(el('anmeldung'))) return;
      schluessel = el('schluessel').value.trim();
      var fehler = el('anmelde-fehler');
      fehler.hidden = true;
      lade().then(function () { merke(schluessel); }).catch(function (f) {
        schluessel = '';
        fehler.innerHTML = M.symbol('info') + '<span>' + esc(f.message || 'Anmeldung nicht möglich.') + '</span>';
        fehler.hidden = false;
      });
    });

    el('abmelden').addEventListener('click', function () { merke(''); location.reload(); });

    document.addEventListener('click', function (e) {
      var kn = e.target.closest('[data-zeige]');
      if (kn && daten) { bereich = kn.dataset.zeige; zeichne(); }
    });

    document.addEventListener('change', function (e) {
      var wahl = e.target.closest('select[data-bereich]');
      if (!wahl) return;
      M.api.sende('verwaltung/zustand', { bereich: wahl.dataset.bereich, kennung: wahl.dataset.kennung, zustand: wahl.value }, { Authorization: 'Bearer ' + schluessel })
        .then(function () { M.sag('Gespeichert.'); return lade(); })
        .catch(function (f) { M.sag(f.message || 'Das Speichern hat nicht geklappt.'); });
    });
  });
})();
