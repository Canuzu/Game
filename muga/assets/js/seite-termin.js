/* =============================================================================
 * seite-termin.js — Terminbuchung in vier Schritten
 * -----------------------------------------------------------------------------
 *   1) Anliegen und Personenzahl     2) Tag und Uhrzeit
 *   3) Kontaktdaten                  4) Bestätigung mit Kalenderdatei
 * Freie Zeiten ergeben sich aus den Öffnungszeiten (config.js), den Feiertagen
 * in NRW und den bereits vergebenen Terminen.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, Z = M.zeit, C = M.config, T = M.termine, esc = M.esc, sym = M.symbol;

  var wahl = { art: '', personen: 1, datum: '', start: null, artikel: '' };
  var belegt = {}, heute = Z.jetzt().datum, letzter = Z.plusTage(heute, C.termin.wochenVoraus * 7);
  var monat = null;          // angezeigter Monat als { jahr, monat }
  var schritt = 1;

  function art() { return M.terminart(wahl.art); }
  function dauer() { return art() ? art().dauer : 30; }
  function freie(datum) { return Z.startzeiten(datum, dauer(), belegt[datum]); }
  function hatFreie(datum) { return freie(datum).some(function (s) { return s.frei; }); }

  M.bereit(function () {
    var form = document.getElementById('terminform');

    /* ---- Schritt 1: Anliegen ---- */
    var vorwahl = M.param('art');
    if (M.terminart(vorwahl)) wahl.art = vorwahl;
    document.getElementById('arten').innerHTML = C.termin.arten.map(function (a) {
      return '<label class="wahl__punkt"><input type="radio" name="art" value="' + a.id + '"' + (wahl.art === a.id ? ' checked' : '') + '>' +
        '<span class="wahl__karte"><span class="wahl__titel">' + esc(a.name) + '<small>ca. ' + a.dauer + ' Min.</small></span>' +
        '<span class="wahl__text">' + esc(a.text) + '</span></span></label>';
    }).join('');

    form.addEventListener('change', function (e) {
      if (e.target.name !== 'art') return;
      wahl.art = e.target.value;
      document.getElementById('fehler-1').hidden = true;
      /* Andere Dauer: gewählte Uhrzeit nur behalten, wenn sie weiterhin passt */
      if (wahl.datum && wahl.start !== null) {
        var passt = freie(wahl.datum).some(function (s) { return s.frei && s.start === wahl.start; });
        if (!passt) wahl.start = null;
      }
      zettel();
    });

    document.addEventListener('click', function (e) {
      var kn = e.target.closest('[data-personen]');
      if (!kn) return;
      wahl.personen = Math.max(1, Math.min(6, wahl.personen + (+kn.dataset.personen)));
      document.getElementById('personen').textContent = wahl.personen;
      M.$$('[data-personen]').forEach(function (k) {
        k.disabled = (+k.dataset.personen < 0 && wahl.personen <= 1) || (+k.dataset.personen > 0 && wahl.personen >= 6);
      });
      zettel();
    });
    M.$('[data-personen="-1"]').disabled = true;

    /* ---- Artikel aus der Produktseite ---- */
    var artikelIds = (M.param('artikel') || '').split(',').filter(function (x) { return /^[a-z0-9-]+$/.test(x); }).slice(0, 6);
    if (artikelIds.length) {
      M.katalog.lade().then(function (k) {
        var namen = artikelIds.map(function (x) { return k.nach[x]; }).filter(Boolean)
          .map(function (p) { return p.nr ? 'Modell ' + p.nr + ' (' + p.a + ')' : p.n; });
        if (!namen.length) return;
        wahl.artikel = namen.join(', ').slice(0, 160);
        document.getElementById('artikel-name').textContent = wahl.artikel;
        document.getElementById('artikel-hinweis').hidden = false;
      }).catch(function () { /* ohne Katalog geht die Buchung trotzdem */ });
    }
    document.getElementById('artikel-weg').addEventListener('click', function () {
      wahl.artikel = '';
      document.getElementById('artikel-hinweis').hidden = true;
    });

    /* ---- Gemerkte Kontaktdaten ---- */
    var kunde = M.speicher.lies('kunde', null);
    if (kunde) {
      ['vorname', 'nachname', 'email', 'telefon'].forEach(function (f) { if (kunde[f] && form.elements[f]) form.elements[f].value = kunde[f]; });
      form.elements.merken.checked = true;
    }
    form.elements.anlassdatum.min = heute;

    /* ---- Schrittwechsel ---- */
    document.addEventListener('click', function (e) {
      var kn = e.target.closest('[data-weiter]');
      if (kn) gehe(+kn.dataset.weiter);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (schritt !== 3) return;
      if (!M.pruefe(M.$('[data-schritt="3"]'))) return;
      buche(form);
    });

    /* ---- Belegte Zeiten laden, dann Kalender zeichnen ---- */
    T.belegt(heute, letzter).then(function (b) { belegt = b; }).catch(function () { belegt = {}; }).then(function () {
      var wunsch = M.param('datum');
      if (wunsch && Z.teile(wunsch) && wunsch >= heute && wunsch <= letzter) wahl.datum = wunsch;
      if (!wahl.datum || !hatFreie(wahl.datum)) wahl.datum = ersterFreierTag() || '';
      var t = Z.teile(wahl.datum || heute);
      monat = { jahr: t.jahr, monat: t.monat };
      kalender();
      zeiten();
      zettel();
    });

    zettel();
    meine();
  });

  function ersterFreierTag() {
    for (var n = 0; n <= C.termin.wochenVoraus * 7; n++) {
      var tag = Z.plusTage(heute, n);
      if (hatFreie(tag)) return tag;
    }
    return null;
  }

  /* ---- Schritte ---- */
  function gehe(ziel) {
    if (ziel > schritt) {
      if (schritt === 1 && !wahl.art) { zeigeFehler(1); return; }
      if (schritt === 2 && (!wahl.datum || wahl.start === null)) { zeigeFehler(2); return; }
    }
    schritt = ziel;
    M.$$('[data-schritt]').forEach(function (s) { s.hidden = +s.dataset.schritt !== schritt; });
    M.$$('#schritte li').forEach(function (li, i) {
      li.classList.toggle('aktiv', i + 1 === schritt);
      li.classList.toggle('fertig', i + 1 < schritt);
      if (i + 1 === schritt) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    var band = document.getElementById('fortschritt');
    band.style.setProperty('--stand', [12, 38, 64, 100][schritt - 1] + '%');
    band.setAttribute('aria-valuenow', schritt);
    if (schritt === 2) {
      /* Passt der vorgewählte Tag nicht zur Dauer des Anliegens, zum nächsten freien Tag springen */
      if (wahl.start === null && (!wahl.datum || !hatFreie(wahl.datum))) {
        wahl.datum = ersterFreierTag() || '';
        if (wahl.datum) { var t = Z.teile(wahl.datum); monat = { jahr: t.jahr, monat: t.monat }; }
      }
      kalender(); zeiten(); zettel();
    }
    if (schritt === 3) {
      document.getElementById('feld-anlass').hidden = !(wahl.art === 'hochzeit' || wahl.art === 'beratung');
      document.getElementById('fehler-3').hidden = true;
    }
    var kopf = M.$('[data-schritt="' + schritt + '"] h2');
    document.getElementById('schritte').scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (kopf) kopf.focus({ preventScroll: true });
  }
  function zeigeFehler(n) {
    var f = document.getElementById('fehler-' + n);
    f.hidden = false;
    f.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---- Zusammenfassung rechts ---- */
  function zettel() {
    var a = art();
    document.getElementById('z-art').textContent = a ? a.name : 'Noch nichts gewählt';
    var tag = document.getElementById('z-tag'), zeit = document.getElementById('z-zeit');
    tag.textContent = wahl.datum && wahl.start !== null ? Z.datumLang(wahl.datum) : 'offen';
    tag.classList.toggle('offen', !(wahl.datum && wahl.start !== null));
    zeit.textContent = wahl.start !== null ? Z.uhr(wahl.start) + ' bis ' + Z.uhr(wahl.start + dauer()) + ' Uhr' : 'offen';
    zeit.classList.toggle('offen', wahl.start === null);
    document.getElementById('z-personen').textContent = wahl.personen + (wahl.personen === 1 ? ' Person' : ' Personen');
  }

  /* ---- Kalender ---- */
  function kalender() {
    if (!monat) return;
    var ziel = document.getElementById('kalender');
    var erster = Z.iso(monat.jahr, monat.monat, 1), t1 = Z.teile(erster);
    var tage = new Date(Date.UTC(monat.jahr, monat.monat, 0)).getUTCDate();
    var versatz = (t1.wochentag + 6) % 7;           // Woche beginnt am Montag
    var hm = Z.teile(heute), lm = Z.teile(letzter);
    var zurueck = monat.jahr > hm.jahr || (monat.jahr === hm.jahr && monat.monat > hm.monat);
    var vor = monat.jahr < lm.jahr || (monat.jahr === lm.jahr && monat.monat < lm.monat);

    var zellen = [];
    for (var i = 0; i < versatz; i++) zellen.push('<td></td>');
    for (var d = 1; d <= tage; d++) {
      var datum = Z.iso(monat.jahr, monat.monat, d);
      var imFenster = datum >= heute && datum <= letzter;
      var offen = imFenster && Z.abschnitte(datum).length > 0;
      var feier = Z.feiertag(datum);
      if (!offen) {
        zellen.push('<td><span' + (feier ? ' title="' + esc(feier) + '"' : '') + '>' + d + '</span></td>');
      } else {
        var frei = hatFreie(datum);
        zellen.push('<td><button type="button" data-tag="' + datum + '" class="' + (datum === heute ? 'heute ' : '') + (frei ? '' : 'voll') + '"' +
          ' aria-pressed="' + (datum === wahl.datum) + '" aria-label="' + esc(Z.datumLang(datum)) + (frei ? '' : ', ausgebucht') + '">' + d + '</button></td>');
      }
    }
    while (zellen.length % 7) zellen.push('<td></td>');
    var reihen = [];
    for (var r = 0; r < zellen.length; r += 7) reihen.push('<tr>' + zellen.slice(r, r + 7).join('') + '</tr>');

    ziel.innerHTML = '<div class="kalender__kopf"><p class="kalender__monat" id="kalender-monat" aria-live="polite">' + Z.MONATE[monat.monat - 1] + ' ' + monat.jahr + '</p>' +
      '<div class="kalender__knoepfe">' +
        '<button type="button" data-monat="-1" aria-label="Vorheriger Monat"' + (zurueck ? '' : ' disabled') + '>' + sym('zurueck') + '</button>' +
        '<button type="button" data-monat="1" aria-label="Nächster Monat"' + (vor ? '' : ' disabled') + '>' + sym('pfeil') + '</button>' +
      '</div></div>' +
      '<table aria-labelledby="kalender-monat"><thead><tr>' +
        ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(function (w, i) {
          return '<th scope="col"><abbr title="' + Z.WOCHENTAGE[(i + 1) % 7] + '">' + w + '</abbr></th>';
        }).join('') +
      '</tr></thead><tbody>' + reihen.join('') + '</tbody></table>' +
      '<p class="kalender__legende"><span><i></i>gewählt</span><span><i class="zu"></i>geschlossen oder ausgebucht</span><span>Montag Ruhetag</span></p>';

    if (!ziel.__an) {
      ziel.__an = true;
      ziel.addEventListener('click', function (e) {
        var m = e.target.closest('[data-monat]');
        if (m) {
          var n = monat.monat + (+m.dataset.monat), j = monat.jahr;
          if (n < 1) { n = 12; j--; } else if (n > 12) { n = 1; j++; }
          monat = { jahr: j, monat: n };
          kalender();
          var kn = M.$('[data-monat="' + m.dataset.monat + '"]', ziel);
          (kn && !kn.disabled ? kn : M.$('[data-monat]:not([disabled])', ziel)).focus();
          return;
        }
        var tag = e.target.closest('[data-tag]');
        if (!tag) return;
        if (tag.dataset.tag !== wahl.datum) wahl.start = null;
        wahl.datum = tag.dataset.tag;
        M.$$('[data-tag]', ziel).forEach(function (b) { b.setAttribute('aria-pressed', b === tag); });
        document.getElementById('fehler-2').hidden = true;
        zeiten();
        zettel();
      });
      /* Pfeiltasten wandern durch die buchbaren Tage */
      ziel.addEventListener('keydown', function (e) {
        var schritte = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        if (!schritte || !e.target.dataset || !e.target.dataset.tag) return;
        e.preventDefault();
        var datum = e.target.dataset.tag;
        for (var v = 0; v < 14; v++) {
          datum = Z.plusTage(datum, schritte);
          var kn = M.$('[data-tag="' + datum + '"]', ziel);
          if (kn) { kn.focus(); return; }
          if (Z.teile(datum).monat !== monat.monat) return;
        }
      });
    }
  }

  /* ---- Uhrzeiten des gewählten Tages ---- */
  function zeiten() {
    var ziel = document.getElementById('zeitwahl');
    if (!wahl.datum) {
      ziel.innerHTML = '<p class="zeitwahl__leer">In den nächsten Wochen ist online kein Termin mehr frei. Bitte rufen Sie uns an: <a href="tel:' + C.telefonLink + '">' + esc(C.telefon) + '</a></p>';
      return;
    }
    var liste = freie(wahl.datum), kopf = '<p class="zeitwahl__tag">' + esc(Z.datumLang(wahl.datum)) + '</p>';
    if (!liste.some(function (s) { return s.frei; })) {
      var grund = wahl.datum === heute ? 'Für heute ist online kein Termin mehr buchbar.' : 'An diesem Tag ist alles vergeben.';
      ziel.innerHTML = kopf + '<p class="zeitwahl__leer">' + grund + ' Wählen Sie einen anderen Tag oder rufen Sie uns an: <a href="tel:' + C.telefonLink + '">' + esc(C.telefon) + '</a></p>';
      return;
    }
    function gruppe(name, teil) {
      if (!teil.length) return '';
      return '<div class="zeitwahl__gruppe"><p>' + name + '</p><div class="zeitwahl__liste">' + teil.map(function (s) {
        return '<button type="button" data-start="' + s.start + '" aria-pressed="' + (s.start === wahl.start) + '"' +
          (s.frei ? '' : ' disabled aria-label="' + s.uhr + ' Uhr, vergeben"') + '>' + s.uhr + '</button>';
      }).join('') + '</div></div>';
    }
    ziel.innerHTML = kopf +
      gruppe('Vormittag', liste.filter(function (s) { return s.start < 720; })) +
      gruppe('Nachmittag', liste.filter(function (s) { return s.start >= 720; })) +
      '<p class="klein leise">Dauer ca. ' + dauer() + ' Minuten. Alle Zeiten in Ortszeit Köln.</p>';

    if (!ziel.__an) {
      ziel.__an = true;
      ziel.addEventListener('click', function (e) {
        var kn = e.target.closest('[data-start]');
        if (!kn || kn.disabled) return;
        wahl.start = +kn.dataset.start;
        M.$$('[data-start]', ziel).forEach(function (b) { b.setAttribute('aria-pressed', b === kn); });
        document.getElementById('fehler-2').hidden = true;
        zettel();
      });
    }
  }

  /* ---- Buchen ---- */
  function buche(form) {
    var w = M.werte(form), knopf = document.getElementById('absenden'), fehler = document.getElementById('fehler-3');
    var daten = {
      art: wahl.art, datum: wahl.datum, start: wahl.start, personen: wahl.personen,
      vorname: w.vorname, nachname: w.nachname, email: w.email, telefon: w.telefon,
      anlassdatum: document.getElementById('feld-anlass').hidden ? '' : (w.anlassdatum || ''),
      nachricht: w.nachricht || '', artikel: wahl.artikel, datenschutz: w.datenschutz === true, website: w.website || ''
    };
    knopf.disabled = true;
    knopf.textContent = 'Termin wird eingetragen …';
    fehler.hidden = true;

    T.buche(daten).then(function (erg) {
      if (w.merken) M.speicher.schreib('kunde', { vorname: w.vorname, nachname: w.nachname, email: w.email, telefon: w.telefon });
      else M.speicher.weg('kunde');
      fertig(erg.termin, erg.server);
      meine();
    }).catch(function (f) {
      fehler.innerHTML = sym('info') + '<span>' + esc(f.message || 'Der Termin konnte nicht eingetragen werden.') + '</span>';
      fehler.hidden = false;
      if (f.status === 409) {
        /* Die Zeit ist inzwischen vergeben: Kalender auffrischen und zurück zur Auswahl */
        T.belegt(heute, letzter).then(function (b) { belegt = b; wahl.start = null; zettel(); gehe(2); document.getElementById('fehler-2').textContent = f.message; zeigeFehler(2); });
      }
    }).then(function () {
      knopf.disabled = false;
      knopf.textContent = 'Termin buchen';
    });
  }

  function fertig(t, server) {
    var a = M.terminart(t.art), ziel = document.getElementById('fertig');
    var route = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(C.strasse + ', ' + C.plz + ' ' + C.ort);
    ziel.innerHTML = '<div class="bestaetigung">' +
      '<span class="bestaetigung__zeichen">' + sym(server ? 'haken' : 'post') + '</span>' +
      '<h2 tabindex="-1" id="fertig-titel">' + (server ? 'Ihr Termin ist <em>eingetragen.</em>' : 'Fast geschafft: Bitte senden Sie uns <em>Ihren Wunsch.</em>') + '</h2>' +
      '<p class="einleitung">' + (server
        ? 'Wir freuen uns auf Sie, ' + esc(t.vorname) + '. Falls wir vorab etwas klären müssen, rufen wir Sie an.'
        : 'Ihr Wunschtermin ist vorgemerkt. Damit er bei uns ankommt, senden Sie ihn bitte mit einem Klick per E-Mail. Wir bestätigen Ihnen den Termin.') + '</p>' +
      '<p class="bestaetigung__nummer">Terminnummer ' + esc(t.code) + '</p>' +
      '<div class="kasten"><dl class="bankdaten">' +
        '<dt>Anliegen</dt><dd>' + esc(a.name) + '</dd>' +
        '<dt>Tag</dt><dd>' + esc(Z.datumLang(t.datum)) + '</dd>' +
        '<dt>Uhrzeit</dt><dd>' + Z.uhr(t.start) + ' bis ' + Z.uhr(t.start + a.dauer) + ' Uhr</dd>' +
        '<dt>Personen</dt><dd>' + t.personen + '</dd>' +
        (t.artikel ? '<dt>Zur Anprobe</dt><dd>' + esc(t.artikel) + '</dd>' : '') +
        '<dt>Ort</dt><dd>' + esc(C.firma) + ', ' + esc(C.strasse) + ', ' + esc(C.plz) + ' ' + esc(C.ort) + '</dd>' +
      '</dl></div>' +
      '<div class="knopfreihe">' +
        (server ? '' : '<a class="knopf" href="' + esc(M.postlink('Terminwunsch ' + t.code + ': ' + a.name + ' am ' + Z.datumKurz(t.datum), T.text(t))) + '">' + sym('post') + 'Terminwunsch per E-Mail senden</a>') +
        '<button class="knopf ' + (server ? '' : 'knopf--linie') + '" type="button" data-ics="' + esc(t.code) + '">' + sym('kalender') + 'In meinen Kalender eintragen</button>' +
        '<a class="knopf knopf--linie" href="' + route + '" target="_blank" rel="noopener">' + sym('ort') + 'Route planen</a>' +
      '</div>' +
      (server ? '' : '<p class="klein leise">Oder rufen Sie uns an: <a href="tel:' + C.telefonLink + '">' + esc(C.telefon) + '</a></p>') +
      '<p class="klein leise">Kostenlose Parkplätze direkt vor dem Geschäft. Sie können den Termin unten auf dieser Seite jederzeit absagen.</p>' +
    '</div>';
    document.getElementById('terminform').hidden = true;
    schritt = 4;
    M.$$('#schritte li').forEach(function (li, i) { li.classList.toggle('aktiv', i === 3); li.classList.toggle('fertig', i < 3); });
    var band = document.getElementById('fortschritt');
    band.style.setProperty('--stand', '100%');
    band.setAttribute('aria-valuenow', 4);
    ziel.hidden = false;
    document.getElementById('schritte').scrollIntoView({ block: 'start', behavior: 'smooth' });
    document.getElementById('fertig-titel').focus({ preventScroll: true });
  }

  /* ---- Eigene Termine: Kalenderdatei und Absage ---- */
  function meine() {
    var liste = T.meine(), bereich = document.getElementById('meine');
    bereich.hidden = !liste.length;
    document.getElementById('meine-liste').innerHTML = liste.map(function (t) {
      var a = M.terminart(t.art);
      return '<li class="' + (t.abgesagt ? 'abgesagt' : '') + '" data-termin="' + esc(t.code) + '">' +
        '<div><strong>' + esc(Z.datumLang(t.datum)) + ', ' + Z.uhr(t.start) + ' Uhr</strong>' +
        '<span>' + esc(a ? a.name : '') + ' · ' + esc(t.code) + (t.abgesagt ? ' · abgesagt' : (t.server ? '' : ' · als Wunsch vorgemerkt')) + '</span></div>' +
        '<div class="knopfreihe">' + (t.abgesagt ? '' :
          '<button class="textknopf" type="button" data-ics="' + esc(t.code) + '">Kalenderdatei</button>' +
          '<button class="textknopf" type="button" data-absagen>Absagen</button>') +
        '</div></li>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var ics = e.target.closest('[data-ics]');
    if (ics) {
      var t = T.finde(ics.dataset.ics);
      if (t) T.ladeIcs(t);
      return;
    }
    var ab = e.target.closest('[data-absagen]');
    if (ab) {
      var zeile = ab.closest('[data-termin]');
      if (ab.dataset.absagen !== 'sicher') {
        ab.dataset.absagen = 'sicher';
        ab.textContent = 'Wirklich absagen?';
        setTimeout(function () { if (ab.isConnected) { ab.dataset.absagen = ''; ab.textContent = 'Absagen'; } }, 5000);
        return;
      }
      ab.disabled = true;
      T.sage_ab(zeile.dataset.termin).then(function (t) {
        M.sag('Der Termin wurde abgesagt.');
        if (!t.server) M.sag('Abgesagt. Falls Sie den Wunsch schon gesendet haben, sagen Sie uns bitte kurz Bescheid.');
        meine();
        /* Freigewordene Zeit sofort wieder anbieten */
        T.belegt(heute, letzter).then(function (b) { belegt = b; if (schritt === 2) { kalender(); zeiten(); } });
      }).catch(function (f) {
        ab.disabled = false;
        M.sag(f.message || 'Die Absage hat nicht geklappt. Bitte rufen Sie uns an.');
      });
    }
  });
})();
