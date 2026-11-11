/* =============================================================================
 * rahmen.js — Kopf, Fuß, Navigation, Suche, Warenkorb-Leiste
 * -----------------------------------------------------------------------------
 * Kopf und Fuß stehen als eigene Elemente <muga-kopf> und <muga-fuss> in jeder
 * Seite. Weil dieses Skript im <head> ohne "defer" geladen wird, sind beide
 * schon da, bevor der Browser die Seite zum ersten Mal zeichnet.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, C = M.config, esc = M.esc, sym = M.symbol;

  var SEITE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* Schriften früh anfordern. Nur über http(s): Bei Doppelklick-Betrieb lehnt der
   * Browser solche Vorabaufrufe ab, die Schriften lädt er dort trotzdem über das CSS. */
  if (/^https?:$/.test(location.protocol)) {
    ['fraunces-latin-opsz-normal', 'figtree-latin-wght-normal'].forEach(function (name) {
      var l = document.createElement('link');
      l.rel = 'preload'; l.as = 'font'; l.type = 'font/woff2'; l.crossOrigin = 'anonymous';
      l.href = 'assets/fonts/' + name + '.woff2';
      document.head.appendChild(l);
    });
  }

  /* Aufbau des Sortiments für Navigation und Fußzeile */
  var SORTIMENT = [
    { titel: 'Anzüge', punkte: [
      ['hochzeitsanzuege', 'Hochzeitsanzüge'],
      ['anzuege-uni', 'Anzüge uni'],
      ['anzuege-gemustert', 'Anzüge gemustert'],
      ['sakko-blazer', 'Sakkos & Blazer'],
      ['hosen-westen', 'Hosen & Westen'],
      ['mantel-jacken', 'Mäntel & Jacken']
    ] },
    { titel: 'Hemden', punkte: [
      ['hemden', 'Alle Hemden'],
      ['hemden-klassisch', 'Klassischer Schnitt'],
      ['hemden-comfort', 'Leicht tailliert'],
      ['hemden-slim', 'Slim-fit'],
      ['hemden-extralang', 'Extra langer Arm']
    ] },
    { titel: 'Accessoires', punkte: [
      ['westen-fliegen', 'Westen, Kummerbund & Fliegen'],
      ['krawatten', 'Krawatten & Einstecktücher'],
      ['schuhe', 'Schuhe'],
      ['guertel', 'Gürtel'],
      ['accessoires', 'Weitere Accessoires']
    ] },
    { titel: 'Außerdem', punkte: [
      ['freizeit', 'Strick & Freizeit'],
      ['kinder', 'Kinder'],
      ['damen', 'Damen'],
      ['neu', 'Neu im Shop'],
      ['sale', 'Sale']
    ] }
  ];
  M.sortiment = SORTIMENT;

  function katLink(id) { return 'kollektion.html?k=' + id; }

  function logo(hell) {
    return '<a class="logo' + (hell ? ' logo--hell' : '') + '" href="index.html">' +
      '<svg class="logo__zeichen" viewBox="0 0 40 40" aria-hidden="true">' +
        '<rect width="40" height="40" rx="8" fill="' + (hell ? '#f3ede2' : '#15120f') + '"/>' +
        '<path d="M8.500 30.500L14.500 10.500 20 22l5.500-11.500 6 20" fill="none" stroke="#b81f26" stroke-width="5.400" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M8.500 30.500L14.500 10.500 20 22l5.500-11.500 6 20" fill="none" stroke="' + (hell ? '#15120f' : '#fffdf9') + '" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span class="logo__text"><span class="logo__wort">MUGA</span><span class="logo__zusatz">Herrenausstatter · Köln</span></span><span class="unsichtbar">, zur Startseite</span>' +
    '</a>';
  }

  function statusHtml() {
    var s = M.zeit.status();
    return '<span class="punkt' + (s.offen ? ' offen' : '') + '"></span><span><strong>' + esc(s.kurz) + '</strong>' +
      (s.text ? '<span class="status__text"><i> · </i>' + esc(s.text) + '</span>' : '') + '</span>';
  }

  /* ---------- Kopf --------------------------------------------------------- */

  function megaHtml() {
    return '<div class="mega" id="mega" hidden>' +
      '<div class="huelle mega__innen">' +
        SORTIMENT.map(function (s) {
          return '<div class="mega__spalte"><p class="mega__titel">' + esc(s.titel) + '</p><ul>' +
            s.punkte.map(function (p) { return '<li><a href="' + katLink(p[0]) + '">' + esc(p[1]) + '</a></li>'; }).join('') +
          '</ul></div>';
        }).join('') +
        '<a class="mega__tafel" href="stilfinder.html">' +
          '<span class="vorspann">Stil-Finder</span>' +
          '<span class="mega__tafeltitel">In vier Fragen zum passenden Anzug</span>' +
          '<span class="faden">Jetzt starten ' + sym('pfeil') + '</span>' +
        '</a>' +
      '</div>' +
    '</div>';
  }

  function kopfHtml() {
    var nav = [
      ['kollektion.html', 'Kollektion', true],
      ['kollektion.html?k=hochzeitsanzuege', 'Hochzeit'],
      ['stilfinder.html', 'Stil-Finder'],
      ['masse.html', 'Maß & Passform'],
      ['service.html', 'Service'],
      ['besuch.html', 'Besuch in Köln']
    ];
    return '<a class="sprung" href="#inhalt">Zum Inhalt springen</a>' +
    '<div class="leiste nacht" role="region" aria-label="Öffnungsstatus und Telefon">' +
      '<div class="huelle leiste__innen">' +
        '<a class="leiste__status" href="besuch.html" data-oeffnung>' + statusHtml() + '</a>' +
        '<p class="leiste__mitte">Direkt vom Hersteller · Kostenloser Versand ab 50,01&nbsp;€ in Deutschland</p>' +
        '<a class="leiste__tel" href="tel:' + C.telefonLink + '" aria-label="Anrufen: ' + esc(C.telefon) + '">' + sym('telefon') + '<span>' + esc(C.telefon) + '</span></a>' +
      '</div>' +
    '</div>' +
    '<header class="kopf" id="kopf">' +
      '<div class="huelle kopf__innen">' +
        '<button class="symbolknopf kopf__menue" type="button" data-oeffne="navlade" aria-label="Menü öffnen">' + sym('menue') + '</button>' +
        logo(false) +
        '<nav class="hauptnav" aria-label="Hauptnavigation"><ul>' +
          nav.map(function (n) {
            var aktiv = n[0] === SEITE || (n[0] === 'kollektion.html' && SEITE === 'produkt.html');
            if (n[2]) {
              return '<li><a href="' + n[0] + '"' + (aktiv ? ' aria-current="page"' : '') + ' data-mega aria-expanded="false" aria-controls="mega">' + esc(n[1]) + sym('unten') + '</a></li>';
            }
            return '<li><a href="' + n[0] + '"' + (aktiv ? ' aria-current="page"' : '') + '>' + esc(n[1]) + '</a></li>';
          }).join('') +
        '</ul></nav>' +
        '<div class="kopf__werkzeug">' +
          '<button class="symbolknopf" type="button" data-oeffne="suche" aria-label="Suche öffnen">' + sym('suche') + '</button>' +
          '<a class="symbolknopf kopf__merk" href="merkliste.html" aria-label="Merkliste" data-merkknopf>' + sym('herz') + '<span class="zaehler" data-merkzahl hidden></span></a>' +
          '<button class="symbolknopf" type="button" data-oeffne="korblade" aria-label="Warenkorb öffnen" data-korbknopf>' + sym('korb') + '<span class="zaehler" data-korbzahl hidden></span></button>' +
          '<a class="knopf knopf--klein kopf__termin" href="termin.html" aria-label="Termin buchen">' + sym('kalender') + '<span>Termin buchen</span></a>' +
        '</div>' +
      '</div>' +
      megaHtml() +
    '</header>';
  }

  /* ---------- Überlagerungen: Menü, Suche, Warenkorb ------------------------ */

  function navladeHtml() {
    return '<dialog class="lade lade--links" id="navlade" aria-label="Menü">' +
      '<div class="lade__kopf">' + logo(false) +
        '<button class="symbolknopf" type="button" data-schliessen aria-label="Menü schließen">' + sym('zu') + '</button></div>' +
      '<div class="lade__inhalt navlade">' +
        '<a class="knopf knopf--voll" href="termin.html">' + sym('kalender') + 'Termin buchen</a>' +
        '<nav aria-label="Sortiment">' +
          SORTIMENT.map(function (s, i) {
            return '<details class="klappe"' + (i === 0 ? ' open' : '') + '><summary>' + esc(s.titel) + '</summary><ul class="navlade__liste">' +
              s.punkte.map(function (p) { return '<li><a href="' + katLink(p[0]) + '">' + esc(p[1]) + '</a></li>'; }).join('') +
            '</ul></details>';
          }).join('') +
        '</nav>' +
        '<ul class="navlade__haupt">' +
          '<li><a href="kollektion.html">Gesamte Kollektion</a></li>' +
          '<li><a href="stilfinder.html">Stil-Finder</a></li>' +
          '<li><a href="masse.html">Maß & Passform</a></li>' +
          '<li><a href="service.html">Versand, Zahlung & Rückgabe</a></li>' +
          '<li><a href="besuch.html">Besuch in Köln</a></li>' +
          '<li><a href="kontakt.html">Kontakt</a></li>' +
        '</ul>' +
        '<div class="navlade__fuss">' +
          '<p class="leiste__status" data-oeffnung>' + statusHtml() + '</p>' +
          '<a href="tel:' + C.telefonLink + '">' + sym('telefon') + esc(C.telefon) + '</a>' +
          '<a href="mailto:' + C.email + '">' + sym('post') + esc(C.email) + '</a>' +
        '</div>' +
      '</div>' +
    '</dialog>';
  }

  function sucheHtml() {
    return '<dialog class="suche" id="suche" aria-label="Suche">' +
      '<div class="huelle suche__innen">' +
        '<form class="suche__form" action="kollektion.html" method="get" role="search">' +
          sym('suche') +
          '<label class="unsichtbar" for="suchfeld">Wonach suchen Sie?</label>' +
          '<input id="suchfeld" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="Smoking, Gehrock, Modell 0252 …" enterkeyhint="search">' +
          '<button class="symbolknopf" type="button" data-schliessen aria-label="Suche schließen">' + sym('zu') + '</button>' +
        '</form>' +
        '<div class="suche__ergebnis" id="suchergebnis" aria-live="polite"></div>' +
      '</div>' +
    '</dialog>';
  }

  function korbladeHtml() {
    return '<dialog class="lade lade--rechts" id="korblade" aria-labelledby="korblade-titel">' +
      '<div class="lade__kopf"><h2 id="korblade-titel">Warenkorb</h2>' +
        '<button class="symbolknopf" type="button" data-schliessen aria-label="Warenkorb schließen">' + sym('zu') + '</button></div>' +
      '<div class="lade__inhalt" id="korblade-inhalt"></div>' +
    '</dialog>';
  }

  /* Eine Zeile im Warenkorb; wird auch von der Warenkorbseite benutzt. */
  M.korbzeile = function (p) {
    var k = M.korb.schluessel(p);
    var zusatz = [p.groesse ? 'Größe ' + p.groesse : '', p.farbe, p.zusatz].filter(Boolean).join(' · ');
    return '<li class="zeile" data-posten="' + esc(k) + '">' +
      '<a class="zeile__bild" href="produkt.html?p=' + encodeURIComponent(p.id) + '" tabindex="-1" aria-hidden="true"><img src="assets/produkte/' + esc(p.id) + '.webp" alt="" width="96" height="120" loading="lazy"></a>' +
      '<div class="zeile__text">' +
        '<a class="zeile__name" href="produkt.html?p=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a>' +
        (zusatz ? '<p class="zeile__zusatz">' + esc(zusatz) + '</p>' : '') +
        '<div class="zeile__fuss">' +
          '<div class="zaehlwerk" role="group" aria-label="Menge">' +
            '<button type="button" data-menge="-1" aria-label="Menge verringern">' + sym('minus') + '</button>' +
            '<output aria-live="polite">' + p.menge + '</output>' +
            '<button type="button" data-menge="1" aria-label="Menge erhöhen"' + (p.menge >= 10 ? ' disabled' : '') + '>' + sym('plus') + '</button>' +
          '</div>' +
          '<span class="zeile__preis">' + M.geld(p.preis * p.menge) + '</span>' +
        '</div>' +
      '</div>' +
      '<button class="zeile__weg" type="button" data-entfernen aria-label="' + esc(p.name) + ' entfernen">' + sym('zu') + '</button>' +
    '</li>';
  };

  /* Balken „noch x € bis zum kostenlosen Versand“ */
  M.versandbalken = function (summe) {
    var ziel = C.versand.freiAb, rest = ziel - summe;
    var stand = Math.max(4, Math.min(100, summe / ziel * 100));
    return '<div class="freiversand">' +
      '<p>' + (rest > 0
        ? 'Noch <strong>' + M.geld(rest) + '</strong> bis zum kostenlosen Versand in Deutschland.'
        : sym('haken') + ' <strong>Kostenloser Versand</strong> innerhalb Deutschlands.') + '</p>' +
      '<div class="massband" style="--stand:' + stand.toFixed(1) + '%" role="presentation"></div>' +
    '</div>';
  };

  /* Merkt sich, welcher Knopf einer Warenkorbzeile den Fokus hat, und setzt ihn
   * nach dem Neuzeichnen wieder. Sonst verlöre die Tastatur bei jedem Klick ihren Platz. */
  M.merkeFokus = function (bereich) {
    var a = document.activeElement;
    if (!a || !bereich || !bereich.contains(a)) return function () {};
    var zeile = a.closest('[data-posten]');
    if (!zeile) return function () {};
    var posten = zeile.dataset.posten, menge = a.dataset.menge;
    return function () {
      var neu = M.$$('[data-posten]', bereich).filter(function (z) { return z.dataset.posten === posten; })[0];
      if (!neu) return;
      var ziel = menge ? neu.querySelector('[data-menge="' + menge + '"]:not([disabled])') || neu.querySelector('[data-menge]:not([disabled])') : neu.querySelector('.zeile__name');
      if (ziel) ziel.focus({ preventScroll: true });
    };
  };

  function zeichneKorblade() {
    var ziel = document.getElementById('korblade-inhalt');
    if (!ziel) return;
    var liste = M.korb.liste(), summe = M.korb.summe(), merke = M.merkeFokus(ziel);
    if (!liste.length) {
      ziel.innerHTML = '<div class="leer">' + sym('korb') +
        '<p class="leer__titel">Ihr Warenkorb ist noch leer.</p>' +
        '<p class="leise">Stöbern Sie in der Kollektion oder lassen Sie sich im Geschäft beraten.</p>' +
        '<div class="knopfreihe"><a class="knopf knopf--dunkel" href="kollektion.html">Zur Kollektion</a><a class="faden" href="termin.html">Termin buchen ' + sym('pfeil') + '</a></div></div>';
      return;
    }
    ziel.innerHTML = M.versandbalken(summe) +
      '<ul class="zeilen">' + liste.map(M.korbzeile).join('') + '</ul>' +
      '<div class="lade__fuss">' +
        '<p class="lade__summe"><span>Zwischensumme</span><strong>' + M.geld(summe) + '</strong></p>' +
        '<p class="klein leise">Inkl. MwSt., Versand wird an der Kasse berechnet.</p>' +
        '<a class="knopf knopf--voll" href="kasse.html">Zur Kasse</a>' +
        '<a class="knopf knopf--linie knopf--voll" href="warenkorb.html">Warenkorb ansehen</a>' +
      '</div>';
    merke();
  }

  function zaehler() {
    var k = M.korb.anzahl(), m = M.merk.liste().length;
    M.$$('[data-korbzahl]').forEach(function (z) { z.textContent = k; z.hidden = !k; });
    M.$$('[data-merkzahl]').forEach(function (z) { z.textContent = m; z.hidden = !m; });
    /* Die sichtbare Zahl gehört auch in die Beschriftung für Vorleseprogramme */
    M.$$('[data-korbknopf]').forEach(function (b) { b.setAttribute('aria-label', 'Warenkorb öffnen' + (k ? ', ' + k + ' Artikel' : '')); });
    M.$$('[data-merkknopf]').forEach(function (b) { b.setAttribute('aria-label', 'Merkliste' + (m ? ', ' + m + ' Artikel' : '')); });
  }

  /* Mengenknöpfe und Entfernen, für Leiste und Warenkorbseite gemeinsam */
  document.addEventListener('click', function (e) {
    var zeile = e.target.closest && e.target.closest('[data-posten]');
    if (!zeile) return;
    var k = zeile.dataset.posten;
    var menge = e.target.closest('[data-menge]');
    if (menge) {
      var posten = M.korb.liste().filter(function (p) { return M.korb.schluessel(p) === k; })[0];
      if (posten) M.korb.menge(k, posten.menge + (+menge.dataset.menge));
    } else if (e.target.closest('[data-entfernen]')) {
      M.korb.entferne(k);
      M.sag('Artikel entfernt.');
    }
  });

  /* ---------- Suche -------------------------------------------------------- */

  function sucheStart() {
    var feld = document.getElementById('suchfeld'), ziel = document.getElementById('suchergebnis');
    if (!feld || feld.__an) return;
    feld.__an = true;

    function vorschlaege() {
      ziel.innerHTML = '<p class="suche__titel">Beliebt</p><ul class="suche__tipps">' +
        [['hochzeitsanzuege', 'Hochzeitsanzüge'], ['anzuege-uni', 'Anzüge uni'], ['hemden', 'Hemden'], ['westen-fliegen', 'Westen & Fliegen'], ['schuhe', 'Schuhe'], ['sale', 'Sale']]
          .map(function (t) { return '<li><a class="tipp" href="' + katLink(t[0]) + '">' + esc(t[1]) + '</a></li>'; }).join('') + '</ul>';
    }
    vorschlaege();

    var zeichne = M.verzoegert(function () {
      var q = feld.value.trim();
      if (q.length < 2) { vorschlaege(); return; }
      M.katalog.lade().then(function (k) {
        if (feld.value.trim() !== q) return;
        var treffer = M.katalog.suche(k, q);
        if (!treffer.length) {
          ziel.innerHTML = '<p class="suche__leer">Kein Treffer für „' + esc(q) + '“. Versuchen Sie es mit einem anderen Begriff oder der Modellnummer.</p>';
          return;
        }
        ziel.innerHTML = '<p class="suche__titel">' + treffer.length + (treffer.length === 1 ? ' Treffer' : ' Treffer') + '</p>' +
          '<ul class="funde">' + treffer.slice(0, 6).map(function (p) {
            var kat = k.kat[(p.k || [])[0]];
            return '<li><a class="fund" href="produkt.html?p=' + encodeURIComponent(p.id) + '">' +
              '<span class="fund__bild"><img src="' + M.katalog.bild(p) + '" alt="" width="72" height="90" loading="lazy"></span>' +
              '<span class="fund__text"><span class="fund__art">' + esc(kat ? kat.einzahl || kat.name : '') + (p.nr ? ' · Modell ' + esc(p.nr) : '') + '</span>' +
              '<span class="fund__name">' + esc(p.n) + '</span>' + M.preis(p) + '</span></a></li>';
          }).join('') + '</ul>' +
          (treffer.length > 6 ? '<a class="faden" href="kollektion.html?q=' + encodeURIComponent(q) + '">Alle ' + treffer.length + ' Treffer ansehen ' + sym('pfeil') + '</a>' : '');
      }).catch(function () {
        ziel.innerHTML = '<p class="suche__leer">Die Suche ist gerade nicht erreichbar. Bitte laden Sie die Seite neu.</p>';
      });
    }, 140);
    feld.addEventListener('input', zeichne);
    /* Suchfelder leeren sich bei Escape nur. Hier soll die Taste die Suche schließen. */
    feld.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); M.schliesse(document.getElementById('suche')); }
    });
    feld.form.addEventListener('submit', function (e) {
      if (!feld.value.trim()) e.preventDefault();
    });
  }

  /* ---------- Fuß ---------------------------------------------------------- */

  function fussHtml() {
    var jahr = M.zeit.teile(M.zeit.jetzt().datum).jahr;
    return '<footer class="fuss nacht">' +
      '<div class="huelle">' +
        '<div class="fuss__auftakt">' +
          '<div><p class="vorspann">Persönlich in Köln-Merheim</p>' +
            '<p class="fuss__ruf">Am besten sitzt ein Anzug,<br>den man <em>anprobiert</em> hat.</p></div>' +
          '<div class="knopfreihe"><a class="knopf knopf--hell" href="termin.html">' + sym('kalender') + 'Termin buchen</a>' +
            '<a class="knopf knopf--hell-linie" href="tel:' + C.telefonLink + '">' + sym('telefon') + esc(C.telefon) + '</a></div>' +
        '</div>' +
        '<div class="fuss__raster">' +
          '<div class="fuss__marke">' + logo(true) +
            '<p class="fuss__text">Herrenmode aus eigener Herstellung: Hochzeitsanzüge, Gehröcke, Smokings und Business-Anzüge in den Größen 44 bis 72.</p>' +
            '<ul class="fuss__sozial">' + C.sozial.map(function (s) {
              return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a></li>';
            }).join('') + '</ul>' +
          '</div>' +
          '<div><p class="fuss__titel">Kollektion</p><ul class="fuss__liste">' +
            [['hochzeitsanzuege', 'Hochzeitsanzüge'], ['anzuege-uni', 'Anzüge uni'], ['anzuege-gemustert', 'Anzüge gemustert'], ['hemden', 'Hemden'], ['westen-fliegen', 'Westen & Fliegen'], ['schuhe', 'Schuhe'], ['sale', 'Sale']]
              .map(function (p) { return '<li><a href="' + katLink(p[0]) + '">' + esc(p[1]) + '</a></li>'; }).join('') +
          '</ul></div>' +
          '<div><p class="fuss__titel">Service</p><ul class="fuss__liste">' +
            '<li><a href="termin.html">Termin buchen</a></li>' +
            '<li><a href="stilfinder.html">Stil-Finder</a></li>' +
            '<li><a href="masse.html">Maß & Passform</a></li>' +
            '<li><a href="service.html">Versand & Zahlung</a></li>' +
            '<li><a href="service.html#rueckgabe">Rückgabe & Umtausch</a></li>' +
            '<li><a href="service.html#fragen">Häufige Fragen</a></li>' +
            '<li><a href="kontakt.html">Kontakt</a></li>' +
          '</ul></div>' +
          '<div><p class="fuss__titel">Besuch</p>' +
            '<address class="fuss__adresse">' + esc(C.firma) + '<br>' + esc(C.strasse) + '<br>' + esc(C.plz) + ' ' + esc(C.ort) + ' (' + esc(C.stadtteil) + ')</address>' +
            '<p class="fuss__zeiten">Di – Sa 10 – 18 Uhr<br>Fr Pause 12 – 14 Uhr<br>Montag Ruhetag</p>' +
            '<p class="leiste__status" data-oeffnung>' + statusHtml() + '</p>' +
            '<a class="faden" href="besuch.html">Anfahrt ' + sym('pfeil') + '</a>' +
          '</div>' +
        '</div>' +
        '<ul class="fuss__zeichen">' +
          '<li>' + sym('schild') + 'Mitglied im Händlerbund</li>' +
          '<li>' + sym('haken') + 'Initiative FairCommerce seit 2016</li>' +
          '<li>' + sym('person') + 'IHK-Ausbildungsbetrieb</li>' +
          '<li>' + sym('korb') + 'PayPal · Vorkasse · Barzahlung bei Abholung</li>' +
        '</ul>' +
        '<div class="fuss__ende">' +
          '<p>© ' + jahr + ' ' + esc(C.firma) + ' · <span class="fuss__spruch">' + esc(C.leitspruch) + '</span></p>' +
          '<ul><li><a href="impressum.html">Impressum</a></li><li><a href="datenschutz.html">Datenschutz</a></li><li><a href="agb.html">AGB</a></li><li><a href="widerruf.html">Widerrufsrecht</a></li><li><a href="widerruf.html#formular">Vertrag widerrufen</a></li></ul>' +
        '</div>' +
        '<p class="fuss__preis">Alle Preise inkl. gesetzlicher MwSt., zzgl. <a href="service.html#versand">Versandkosten</a>.</p>' +
      '</div>' +
    '</footer>';
  }

  /* ---------- Elemente anmelden ------------------------------------------- */

  class Kopf extends HTMLElement {
    connectedCallback() {
      if (this.__da) return;
      this.__da = true;
      this.innerHTML = kopfHtml() + navladeHtml() + sucheHtml() + korbladeHtml();
    }
  }
  customElements.define('muga-kopf', Kopf);

  class Fuss extends HTMLElement {
    connectedCallback() {
      if (this.__da) return;
      this.__da = true;
      this.innerHTML = fussHtml();
    }
  }
  customElements.define('muga-fuss', Fuss);

  /* ---------- Verhalten ---------------------------------------------------- */

  M.bereit(function () {
    var kopf = document.getElementById('kopf'), mega = document.getElementById('mega');

    /* Öffnen von Menü, Suche, Warenkorb */
    document.addEventListener('click', function (e) {
      var knopf = e.target.closest && e.target.closest('[data-oeffne]');
      if (!knopf) return;
      var dialog = document.getElementById(knopf.dataset.oeffne);
      if (!dialog) return;
      e.preventDefault();
      if (dialog.id === 'korblade') zeichneKorblade();
      M.oeffne(dialog);
      if (dialog.id === 'suche') {
        sucheStart();
        var feld = document.getElementById('suchfeld');
        feld.focus();
        feld.select();
      }
    });

    /* Tastenkürzel „/“ öffnet die Suche */
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      var knopf = document.querySelector('[data-oeffne="suche"]');
      if (knopf) knopf.click();
    });

    /* Aufklappmenü der Kollektion: Maus, Tastatur und Berührung */
    if (mega && kopf) {
      var ausloeser = kopf.querySelector('[data-mega]'), zuUhr;
      var auf = function () {
        clearTimeout(zuUhr);
        mega.hidden = false;
        ausloeser.setAttribute('aria-expanded', 'true');
        kopf.classList.add('kopf--mega');
      };
      var zu = function () {
        mega.hidden = true;
        ausloeser.setAttribute('aria-expanded', 'false');
        kopf.classList.remove('kopf--mega');
      };
      var baldZu = function () { clearTimeout(zuUhr); zuUhr = setTimeout(zu, 160); };
      var kannSchweben = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (kannSchweben) {
        ausloeser.parentNode.addEventListener('mouseenter', auf);
        ausloeser.parentNode.addEventListener('mouseleave', baldZu);
        mega.addEventListener('mouseenter', auf);
        mega.addEventListener('mouseleave', baldZu);
      } else {
        ausloeser.addEventListener('click', function (e) {
          if (mega.hidden) { e.preventDefault(); auf(); }
        });
      }
      ausloeser.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          auf();
          var erster = mega.querySelector('a');
          if (erster) erster.focus();
        }
      });
      kopf.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !mega.hidden) { zu(); ausloeser.focus(); }
      });
      kopf.addEventListener('focusout', function (e) {
        if (!mega.hidden && e.relatedTarget && !mega.contains(e.relatedTarget) && e.relatedTarget !== ausloeser) zu();
      });
      document.addEventListener('click', function (e) {
        if (!mega.hidden && !kopf.contains(e.target)) zu();
      });
    }

    /* Schatten unter dem Kopf, sobald gerollt wird */
    if (kopf) {
      var merke = function () { kopf.classList.toggle('kopf--gerollt', window.scrollY > 8); };
      merke();
      window.addEventListener('scroll', merke, { passive: true });
    }

    zaehler();
    M.bei('korb', function () { zaehler(); zeichneKorblade(); });
    M.bei('merk', zaehler);

    /* Öffnungsstatus jede Minute auffrischen */
    setInterval(function () {
      var html = statusHtml();
      M.$$('[data-oeffnung]').forEach(function (el) { el.innerHTML = html; });
    }, 60000);
  });

  /* ---------- Bausteine, die auf mehreren Seiten vorkommen ------------------ */

  /* Öffnungszeiten als Tabelle, der heutige Tag ist hervorgehoben */
  M.zeitenTabelle = function (tabelle) {
    var heute = M.zeit.jetzt(), frei = M.zeit.feiertag(heute.datum);
    var koerper = tabelle.tBodies[0] || tabelle.appendChild(document.createElement('tbody'));
    koerper.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (wt) {
      var ab = C.zeiten[wt], istHeute = wt === heute.wochentag;
      var text = ab.length
        ? ab.map(function (a) { return M.zeit.uhr(a[0]) + ' – ' + M.zeit.uhr(a[1]); }).join('<br>') + ' Uhr'
        : (wt === 1 ? 'Ruhetag' : 'geschlossen');
      if (istHeute && frei) text = 'geschlossen<small>' + esc(frei) + '</small>';
      return '<tr class="' + (istHeute ? 'heute' : '') + (ab.length ? '' : ' zu') + '"><th scope="row">' + M.zeit.WOCHENTAGE[wt] + '</th><td>' + text + '</td></tr>';
    }).join('');
  };

  /* Karte erst nach Klick laden, damit vorher keine Daten an Dritte gehen */
  function ladeKarte(rahmen) {
    var g = C.geo, dx = 0.011, dy = 0.0058;
    var box = [g.lon - dx, g.lat - dy, g.lon + dx, g.lat + dy].map(function (n) { return n.toFixed(5); }).join('%2C');
    var bild = document.createElement('iframe');
    bild.title = 'Karte: MUGA Herrenausstatter, ' + C.strasse + ', ' + C.plz + ' ' + C.ort;
    bild.loading = 'lazy';
    bild.referrerPolicy = 'no-referrer';
    bild.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + box + '&layer=mapnik&marker=' + g.lat + '%2C' + g.lon;
    rahmen.textContent = '';
    rahmen.appendChild(bild);
  }

  /* Waagerechte Laufreihe mit Pfeilknöpfen */
  M.laufreihe = function (bahn, knoepfe) {
    if (!bahn || !knoepfe.length) return null;
    var pruefe = function () {
      var max = bahn.scrollWidth - bahn.clientWidth - 4;
      knoepfe.forEach(function (k) {
        k.disabled = +k.dataset.reihe < 0 ? bahn.scrollLeft <= 4 : bahn.scrollLeft >= max;
      });
    };
    knoepfe.forEach(function (k) {
      k.addEventListener('click', function () {
        bahn.scrollBy({ left: +k.dataset.reihe * bahn.clientWidth * 0.82, behavior: 'smooth' });
      });
    });
    bahn.addEventListener('scroll', M.verzoegert(pruefe, 80), { passive: true });
    window.addEventListener('resize', M.verzoegert(pruefe, 150));
    pruefe();
    return pruefe;
  };

  M.bereit(function () {
    M.$$('[data-zeiten]').forEach(M.zeitenTabelle);
    document.addEventListener('click', function (e) {
      var knopf = e.target.closest && e.target.closest('[data-karte-laden]');
      if (knopf) ladeKarte(knopf.closest('[data-landkarte]'));
    });
    /* Alle Stellen mit Öffnungsstatus füllen, auch die fest im HTML stehenden */
    var html = statusHtml();
    M.$$('[data-oeffnung]').forEach(function (el) { el.innerHTML = html; });
  });

  /* Nach „In den Warenkorb“ die Leiste zeigen */
  M.zeigeKorb = function () {
    var lade = document.getElementById('korblade');
    if (!lade) return;
    zeichneKorblade();
    M.oeffne(lade);
  };
})();
