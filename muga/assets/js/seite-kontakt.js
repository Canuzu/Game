/* =============================================================================
 * seite-kontakt.js — Kontaktformular und Online-Widerruf
 * -----------------------------------------------------------------------------
 * Mit Server wird die Nachricht gespeichert und erscheint in der Verwaltung.
 * Ohne Server öffnet sich das E-Mail-Programm mit dem fertigen Text.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, C = M.config, esc = M.esc, sym = M.symbol;

  /* Schickt eine Nachricht; liefert { server } oder wirft einen Fehler */
  function schicke(daten) {
    return M.api.verfuegbar().then(function (server) {
      if (!server) return { server: false };
      return M.api.sende('nachrichten', daten).then(function () { return { server: true }; });
    });
  }

  function zeitstempel() {
    var j = M.zeit.jetzt();
    return M.zeit.datumKurz(j.datum) + ', ' + M.zeit.uhr(j.minuten) + ' Uhr';
  }

  M.bereit(function () {

    /* ---- Kontaktformular ---- */
    var form = document.getElementById('kontaktform');
    if (form) {
      var betreff = M.param('betreff');
      if (betreff) form.elements.betreff.value = betreff.slice(0, 120);
      var kunde = M.speicher.lies('kunde', null);
      if (kunde) ['vorname', 'nachname', 'email', 'telefon'].forEach(function (f) { if (kunde[f]) form.elements[f].value = kunde[f]; });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!M.pruefe(form)) return;
        var w = M.werte(form), knopf = document.getElementById('kontakt-senden'), fehler = document.getElementById('kontakt-fehler');
        var daten = { vorname: w.vorname, nachname: w.nachname, email: w.email, telefon: w.telefon || '', betreff: w.betreff, nachricht: w.nachricht, datenschutz: w.datenschutz === true, website: w.website || '' };
        knopf.disabled = true;
        knopf.textContent = 'Wird gesendet …';
        fehler.hidden = true;
        schicke(daten).then(function (erg) {
          var ziel = document.getElementById('kontakt-fertig');
          var text = 'Nachricht von ' + w.vorname + ' ' + w.nachname + '\nE-Mail: ' + w.email + (w.telefon ? '\nTelefon: ' + w.telefon : '') + '\n\n' + w.nachricht;
          ziel.innerHTML = '<div class="erfolg">' + sym(erg.server ? 'haken' : 'post') +
            '<h2 tabindex="-1" id="kontakt-titel">' + (erg.server ? 'Danke, Ihre Nachricht ist angekommen.' : 'Fast geschafft: Bitte senden Sie Ihre Nachricht ab.') + '</h2>' +
            '<p>' + (erg.server
              ? 'Wir melden uns so schnell wie möglich bei Ihnen, ' + esc(w.vorname) + '.'
              : 'Ihr E-Mail-Programm öffnet sich mit dem fertigen Text. Sie müssen nur noch auf Senden klicken.') + '</p>' +
            (erg.server ? '' : '<a class="knopf" href="' + esc(M.postlink(w.betreff, text)) + '">' + sym('post') + 'E-Mail öffnen</a>') +
          '</div>';
          form.hidden = true;
          ziel.hidden = false;
          document.getElementById('kontakt-titel').focus();
        }).catch(function (f) {
          fehler.innerHTML = sym('info') + '<span>' + esc(f.message || 'Die Nachricht konnte nicht gesendet werden.') + ' Sie erreichen uns auch unter ' + esc(C.telefon) + '.</span>';
          fehler.hidden = false;
          knopf.disabled = false;
          knopf.textContent = 'Nachricht senden';
        });
      });
    }

    /* ---- Online-Widerruf ---- */
    var wform = document.getElementById('widerrufform');
    if (wform) {
      var letzte = M.speicher.lies('bestellung', null);
      if (letzte && letzte.nummer) {
        wform.elements.nummer.value = letzte.nummer;
        if (letzte.kunde) ['vorname', 'nachname', 'email'].forEach(function (f) { if (letzte.kunde[f]) wform.elements[f].value = letzte.kunde[f]; });
      }
      wform.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!M.pruefe(wform)) return;
        var w = M.werte(wform), knopf = document.getElementById('widerruf-senden'), fehler = document.getElementById('widerruf-fehler');
        var wann = zeitstempel();
        var text = 'Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über den Kauf folgender Waren.\n\n' +
          'Bestellnummer: ' + w.nummer + '\n' + (w.waren ? 'Betroffene Waren: ' + w.waren + '\n' : 'Betroffen: die gesamte Bestellung\n') +
          'Name: ' + w.vorname + ' ' + w.nachname + '\nE-Mail: ' + w.email + '\nErklärt am: ' + wann;
        var daten = { vorname: w.vorname, nachname: w.nachname, email: w.email, telefon: '', betreff: 'Widerruf zur Bestellung ' + w.nummer, nachricht: text, datenschutz: true, website: w.website || '' };
        knopf.disabled = true;
        knopf.textContent = 'Wird übermittelt …';
        fehler.hidden = true;
        schicke(daten).then(function (erg) {
          var ziel = document.getElementById('widerruf-fertig');
          ziel.innerHTML = '<div class="erfolg" style="margin-top:1.4rem">' + sym(erg.server ? 'haken' : 'post') +
            '<h3 tabindex="-1" id="widerruf-titel" style="margin:0">' + (erg.server ? 'Ihr Widerruf ist eingegangen.' : 'Fast geschafft: Bitte senden Sie den Widerruf ab.') + '</h3>' +
            '<p>' + (erg.server
              ? 'Eingang am ' + esc(wann) + ' zur Bestellung ' + esc(w.nummer) + '. Wir melden uns bei Ihnen unter ' + esc(w.email) + ' zur Rücksendung und Erstattung.'
              : 'Ihr E-Mail-Programm öffnet sich mit dem fertigen Widerruf. Mit dem Absenden der E-Mail ist er erklärt.') + '</p>' +
            (erg.server ? '<button class="knopf knopf--linie knopf--klein" type="button" id="widerruf-drucken">' + sym('drucker') + 'Bestätigung drucken</button>'
              : '<a class="knopf" href="' + esc(M.postlink('Widerruf zur Bestellung ' + w.nummer, text)) + '">' + sym('post') + 'E-Mail öffnen</a>') +
          '</div>';
          wform.hidden = true;
          ziel.hidden = false;
          var druck = document.getElementById('widerruf-drucken');
          if (druck) druck.addEventListener('click', function () { window.print(); });
          document.getElementById('widerruf-titel').focus();
        }).catch(function (f) {
          fehler.innerHTML = sym('info') + '<span>' + esc(f.message || 'Der Widerruf konnte nicht übermittelt werden.') + ' Bitte senden Sie ihn per E-Mail an ' + esc(C.email) + '.</span>';
          fehler.hidden = false;
          knopf.disabled = false;
          knopf.textContent = 'Widerruf bestätigen';
        });
      });
    }
  });
})();
