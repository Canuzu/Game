/* =============================================================================
 * seite-kasse.js — Warenkorbseite und Kasse
 * -----------------------------------------------------------------------------
 * Preise werden vor jeder Anzeige mit dem Katalog abgeglichen. Mit Server
 * rechnet dieser die Summe selbst nach und speichert die Bestellung; ohne
 * Server geht sie als vorbereitete E-Mail an das Geschäft.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, C = M.config, esc = M.esc, sym = M.symbol;
  function el(id) { return document.getElementById(id); }

  /* Warenkorb mit aktuellem Katalog abgleichen: Preise, Namen, entfallene Artikel */
  function gleicheAb(k) {
    var geaendert = false, entfallen = 0;
    var neu = M.korb.liste().filter(function (p) {
      var a = k.nach[p.id];
      if (!a) { entfallen++; return false; }
      var preis = M.preisFuer(a, p.groesse, p.farbe);
      if (Math.abs(preis - p.preis) > 0.001 || p.name !== a.n) { p.preis = preis; p.name = a.n; geaendert = true; }
      return true;
    });
    if (geaendert || entfallen) { M.speicher.schreib('korb', neu); M.melde('korb', neu); }
    if (entfallen) M.sag(entfallen === 1 ? 'Ein Artikel ist nicht mehr verfügbar und wurde entfernt.' : entfallen + ' Artikel sind nicht mehr verfügbar und wurden entfernt.');
    else if (geaendert) M.sag('Die Preise im Warenkorb wurden aktualisiert.');
  }

  function laenderwahl(feld, vorgabe) {
    feld.innerHTML = M.laender().map(function (l) { return '<option value="' + esc(l) + '">' + esc(l) + '</option>'; }).join('');
    feld.value = M.laender().indexOf(vorgabe) !== -1 ? vorgabe : 'Deutschland';
  }

  M.bereit(function () {
    M.katalog.lade().then(function (k) { gleicheAb(k); }).catch(function () { /* ohne Katalog bleiben die gemerkten Preise */ }).then(function () {
      if (el('warenkorb')) warenkorb();
      if (el('kasse')) kasse();
    });
  });

  /* ---------- Warenkorbseite ---------------------------------------------- */

  function warenkorb() {
    var land = el('korb-land');
    laenderwahl(land, M.speicher.lies('land', 'Deutschland'));

    function zeichne() {
      var liste = M.korb.liste(), summe = M.korb.summe();
      el('warenkorb').hidden = !liste.length;
      el('warenkorb-leer').hidden = !!liste.length;
      if (!liste.length) return;
      var merke = M.merkeFokus(el('korb-liste'));
      el('korb-liste').innerHTML = liste.map(M.korbzeile).join('');
      merke();
      var versand = M.versandkosten(land.value, summe);
      el('korb-balken').innerHTML = land.value === 'Deutschland' ? M.versandbalken(summe) : '';
      el('korb-summe').textContent = M.geld(summe);
      el('korb-versand').textContent = versand ? M.geld(versand) : 'kostenlos';
      el('korb-gesamt').textContent = M.geld(summe + versand);
    }
    land.addEventListener('change', function () { M.speicher.schreib('land', land.value); zeichne(); });
    M.bei('korb', zeichne);
    zeichne();
  }

  /* ---------- Kasse -------------------------------------------------------- */

  function kasse() {
    var form = el('kasse'), liste = M.korb.liste();

    /* Nach dem Bestellen (auch nach Neuladen) die Bestätigung zeigen */
    var nummer = M.param('bestellt'), letzte = M.speicher.lies('bestellung', null);
    if (nummer && letzte && letzte.nummer === nummer) return bestaetige(letzte);

    if (!liste.length) { el('kasse-leer').hidden = false; return; }
    form.hidden = false;

    laenderwahl(form.elements.land, M.speicher.lies('land', 'Deutschland'));
    el('zahlarten').innerHTML = C.zahlarten.map(function (z, i) {
      return '<label class="wahl__punkt"><input type="radio" name="zahlung" value="' + z.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<span class="wahl__karte"><span class="wahl__titel">' + esc(z.name) + '</span><span class="wahl__text">' + esc(z.text) + '</span></span></label>';
    }).join('');

    var kunde = M.speicher.lies('kunde', null);
    if (kunde) {
      ['vorname', 'nachname', 'email', 'telefon', 'strasse', 'plz', 'ort'].forEach(function (f) { if (kunde[f] && form.elements[f]) form.elements[f].value = kunde[f]; });
      form.elements.merken.checked = true;
    }

    function lieferung() { return form.elements.lieferung.value === 'abholung' ? 'abholung' : 'versand'; }
    function summen() {
      var summe = M.korb.summe();
      var versand = lieferung() === 'versand' ? M.versandkosten(form.elements.land.value, summe) : 0;
      return { summe: summe, versand: versand, gesamt: Math.round((summe + versand) * 100) / 100 };
    }

    function zeichne() {
      var ab = lieferung() === 'abholung', land = form.elements.land.value, s = summen();
      el('adresse').hidden = ab;
      el('feld-landname').hidden = land !== 'Anderes Land';
      el('insel-hinweis').hidden = land !== 'Deutschland';
      /* Bei Abholung brauchen wir eine Telefonnummer, um Bescheid zu geben */
      form.elements.telefon.required = ab;
      el('telefon-name').innerHTML = ab ? 'Telefon' : 'Telefon <span class="leise">(freiwillig)</span>';
      el('telefon-name').classList.toggle('pflicht', ab);
      if (land === 'Deutschland') { form.elements.plz.pattern = '[0-9]{5}'; form.elements.plz.dataset.fehler = 'Bitte geben Sie eine fünfstellige Postleitzahl ein.'; }
      else { form.elements.plz.removeAttribute('pattern'); delete form.elements.plz.dataset.fehler; }
      /* Barzahlung nur bei Abholung */
      M.$$('input[name="zahlung"]', form).forEach(function (z) {
        var art = C.zahlarten.filter(function (x) { return x.id === z.value; })[0];
        z.disabled = !!art.nurAbholung && !ab;
        if (z.disabled && z.checked) form.querySelector('input[name="zahlung"]:not([disabled])').checked = true;
      });
      var versandOhneAb = M.versandkosten(land, s.summe);
      el('versand-preis').textContent = versandOhneAb ? M.geld(versandOhneAb) : 'kostenlos';
      el('kasse-posten').innerHTML = M.korb.liste().map(function (p) {
        var zusatz = [p.groesse ? 'Größe ' + p.groesse : '', p.farbe, p.zusatz].filter(Boolean).join(' · ');
        return '<li><span class="zeile__bild"><img src="assets/produkte/' + esc(p.id) + '.webp" alt="" width="54" height="68" loading="lazy"><b>' + p.menge + '</b></span>' +
          '<span>' + esc(p.name) + (zusatz ? '<small>' + esc(zusatz) + '</small>' : '') + '</span><span>' + M.geld(p.preis * p.menge) + '</span></li>';
      }).join('');
      el('kasse-summe').textContent = M.geld(s.summe);
      el('kasse-versandname').textContent = ab ? 'Abholung' : 'Versand';
      el('kasse-versand').textContent = s.versand ? M.geld(s.versand) : 'kostenlos';
      el('kasse-gesamt').textContent = M.geld(s.gesamt);
    }
    form.addEventListener('change', function (e) {
      if (e.target.name === 'land') M.speicher.schreib('land', e.target.value);
      zeichne();
    });
    M.bei('korb', function (l) { if (!l.length && !form.hidden) location.href = 'warenkorb.html'; else zeichne(); });
    zeichne();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!M.pruefe(form)) return;
      var w = M.werte(form), ab = lieferung() === 'abholung', knopf = el('bestellen'), fehler = el('kasse-fehler');
      var kundeNeu = { vorname: w.vorname, nachname: w.nachname, email: w.email, telefon: w.telefon };
      if (!ab) {
        kundeNeu.strasse = w.strasse; kundeNeu.plz = w.plz; kundeNeu.ort = w.ort; kundeNeu.land = w.land;
        if (w.land === 'Anderes Land') kundeNeu.landname = w.landname;
      }
      var daten = {
        posten: M.korb.liste().map(function (p) { return { id: p.id, groesse: p.groesse, farbe: p.farbe, zusatz: p.zusatz || '', menge: p.menge }; }),
        kunde: kundeNeu, lieferung: lieferung(), zahlung: w.zahlung, hinweis: w.hinweis || '', agb: w.agb === true, website: w.website || ''
      };
      var posten = M.korb.liste(), s = summen();

      knopf.disabled = true;
      knopf.textContent = 'Bestellung wird übermittelt …';
      fehler.hidden = true;

      M.api.verfuegbar().then(function (server) {
        if (server) {
          return M.api.sende('bestellungen', daten).then(function (d) {
            return { nummer: d.nummer, summe: d.summe, versand: d.versand, gesamt: d.gesamt, server: true };
          });
        }
        var tag = M.zeit.jetzt().datum.replace(/-/g, '').slice(2);
        return { nummer: 'MB-' + tag + '-' + M.kennung(4), summe: s.summe, versand: s.versand, gesamt: s.gesamt, server: false };
      }).then(function (erg) {
        var b = Object.assign({ posten: posten, kunde: kundeNeu, lieferung: daten.lieferung, zahlung: daten.zahlung, hinweis: daten.hinweis }, erg);
        M.speicher.schreib('bestellung', b);
        if (w.merken) M.speicher.schreib('kunde', kundeNeu); else M.speicher.weg('kunde');
        form.hidden = true;
        M.speicher.schreib('korb', []);
        M.melde('korb', []);
        try { history.replaceState(null, '', 'kasse.html?bestellt=' + encodeURIComponent(b.nummer)); } catch (x) { /* Doppelklick-Betrieb */ }
        bestaetige(b);
      }).catch(function (f) {
        fehler.innerHTML = sym('info') + '<span>' + esc(f.message || 'Die Bestellung konnte nicht übermittelt werden.') + ' Sie erreichen uns auch telefonisch unter ' + esc(C.telefon) + '.</span>';
        fehler.hidden = false;
        fehler.scrollIntoView({ block: 'center', behavior: 'smooth' });
        knopf.disabled = false;
        knopf.textContent = 'Zahlungspflichtig bestellen';
      });
    });
  }

  /* ---------- Bestätigung -------------------------------------------------- */

  function bestelltext(b) {
    var zahl = C.zahlarten.filter(function (z) { return z.id === b.zahlung; })[0];
    var z = ['Bestellung ' + b.nummer, ''];
    b.posten.forEach(function (p) {
      var zusatz = [p.nr ? 'Modell ' + p.nr : '', p.groesse ? 'Größe ' + p.groesse : '', p.farbe, p.zusatz].filter(Boolean).join(', ');
      z.push(p.menge + ' x ' + p.name + (zusatz ? ' (' + zusatz + ')' : '') + ': ' + M.geld(p.preis * p.menge));
    });
    z.push('', 'Zwischensumme: ' + M.geld(b.summe), (b.lieferung === 'abholung' ? 'Abholung im Geschäft' : 'Versand: ' + (b.versand ? M.geld(b.versand) : 'kostenlos')), 'Gesamt: ' + M.geld(b.gesamt), 'Zahlung: ' + (zahl ? zahl.name : b.zahlung), '');
    var k = b.kunde;
    z.push(k.vorname + ' ' + k.nachname);
    if (b.lieferung === 'versand') z.push(k.strasse, k.plz + ' ' + k.ort, k.landname || k.land);
    z.push('E-Mail: ' + k.email);
    if (k.telefon) z.push('Telefon: ' + k.telefon);
    if (b.hinweis) z.push('', 'Anmerkung:', b.hinweis);
    return z.join('\n');
  }

  function bestaetige(b) {
    var k = b.kunde, weiter;
    if (b.zahlung === 'vorkasse') {
      weiter = '<p>Bitte überweisen Sie <strong>' + M.geld(b.gesamt) + '</strong> auf das folgende Konto. ' +
        (b.lieferung === 'abholung' ? 'Sobald die Zahlung eingegangen ist und alles bereitliegt, melden wir uns.' : 'Der Versand erfolgt unverzüglich nach Zahlungseingang.') + '</p>' +
        '<dl class="bankdaten"><dt>Empfänger</dt><dd>' + esc(C.bank.inhaber) + '</dd><dt>IBAN</dt><dd>' + esc(C.bank.iban) + '</dd><dt>BIC</dt><dd>' + esc(C.bank.bic) + '</dd>' +
        '<dt>Bank</dt><dd>' + esc(C.bank.institut) + '</dd><dt>Verwendungszweck</dt><dd>' + esc(b.nummer) + '</dd><dt>Betrag</dt><dd>' + M.geld(b.gesamt) + '</dd></dl>';
    } else if (b.zahlung === 'paypal') {
      weiter = '<p>Sie erhalten von uns eine PayPal-Zahlungsaufforderung über <strong>' + M.geld(b.gesamt) + '</strong> an ' + esc(k.email) + '. ' +
        (b.lieferung === 'abholung' ? 'Sobald alles bereitliegt, melden wir uns.' : 'Nach Zahlungseingang geht Ihre Bestellung unverzüglich in den Versand.') + '</p>';
    } else {
      weiter = '<p>Sie zahlen <strong>' + M.geld(b.gesamt) + '</strong> bar bei der Abholung. Wir melden uns, sobald Ihre Bestellung bereitliegt.</p>';
    }
    if (b.lieferung === 'abholung') {
      weiter += '<p style="margin-top:1rem"><a class="faden" href="termin.html?art=abholung">Abholtermin buchen ' + sym('pfeil') + '</a></p>';
    }

    var posten = b.posten.map(function (p) {
      var zusatz = [p.groesse ? 'Größe ' + p.groesse : '', p.farbe, p.zusatz].filter(Boolean).join(' · ');
      return '<li><span class="zeile__bild"><img src="assets/produkte/' + esc(p.id) + '.webp" alt="" width="54" height="68" loading="lazy"><b>' + p.menge + '</b></span>' +
        '<span>' + esc(p.name) + (zusatz ? '<small>' + esc(zusatz) + '</small>' : '') + '</span><span>' + M.geld(p.preis * p.menge) + '</span></li>';
    }).join('');

    var kopf = el('kasse-kopf');
    if (kopf) kopf.hidden = true;
    var ziel = el('bestellt');
    ziel.innerHTML = '<div class="bestaetigung">' +
      M.nahtknopf(b.server ? 'haken' : 'post') +
      '<h1 tabindex="-1" id="bestellt-titel">' + (b.server ? 'Vielen Dank für <em>Ihre Bestellung.</em>' : 'Fast geschafft: Bitte senden Sie uns <em>Ihre Bestellung.</em>') + '</h1>' +
      '<p class="einleitung">' + (b.server
        ? 'Ihre Bestellung ist bei uns eingegangen, ' + esc(k.vorname) + '.'
        : 'Ihre Bestellung ist vorbereitet. Damit sie bei uns ankommt, senden Sie sie bitte mit einem Klick per E-Mail. Wir bestätigen den Eingang.') + '</p>' +
      '<p class="bestaetigung__nummer">Bestellnummer ' + esc(b.nummer) + '</p>' +
      (b.server ? '' : '<div class="knopfreihe"><a class="knopf" href="' + esc(M.postlink('Bestellung ' + b.nummer, bestelltext(b))) + '">' + sym('post') + 'Bestellung per E-Mail senden</a></div>') +
      '<div class="kasten"><h2>So geht es weiter</h2>' + weiter + '</div>' +
      '<div class="kasten"><h2>Ihre Bestellung</h2><ul class="uebersicht__posten" style="max-height:none">' + posten + '</ul>' +
        '<dl class="uebersicht__zeilen" style="margin:1rem 0"><div><dt>Zwischensumme</dt><dd>' + M.geld(b.summe) + '</dd></div>' +
        '<div><dt>' + (b.lieferung === 'abholung' ? 'Abholung im Geschäft' : 'Versand') + '</dt><dd>' + (b.versand ? M.geld(b.versand) : 'kostenlos') + '</dd></div></dl>' +
        '<p class="uebersicht__gesamt"><span>Gesamt inkl. MwSt.</span><strong>' + M.geld(b.gesamt) + '</strong></p>' +
        (b.lieferung === 'versand' ? '<p class="klein leise" style="margin-top:1rem">Lieferung an: ' + esc(k.vorname + ' ' + k.nachname + ', ' + k.strasse + ', ' + k.plz + ' ' + k.ort + ', ' + (k.landname || k.land)) + '</p>' : '') +
      '</div>' +
      '<div class="knopfreihe"><button class="knopf knopf--linie" type="button" id="drucken">' + sym('drucker') + 'Drucken</button><a class="knopf knopf--dunkel" href="index.html">Zur Startseite</a></div>' +
      '<p class="klein leise">Fragen zur Bestellung? ' + esc(C.telefon) + ' oder <a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a></p>' +
    '</div>';
    ziel.hidden = false;
    el('drucken').addEventListener('click', function () { window.print(); });
    window.scrollTo(0, 0);
    el('bestellt-titel').focus({ preventScroll: true });
    document.title = 'Bestellung ' + b.nummer + ' · MUGA Herrenausstatter Köln';
  }
})();
