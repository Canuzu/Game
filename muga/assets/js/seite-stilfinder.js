/* =============================================================================
 * seite-stilfinder.js — vier Fragen, dann passende Modelle aus dem Katalog
 * -----------------------------------------------------------------------------
 * Jede Antwort vergibt Punkte an Artikel (Kategorie, Stilmerkmale), Farbe und
 * Budget grenzen ein. Die Antworten stehen in der Adresse, damit sich das
 * Ergebnis teilen lässt und der Zurück-Knopf vom Artikel wieder hierher führt.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, esc = M.esc, sym = M.symbol;

  var FRAGEN = [
    { id: 'a', titel: 'Wofür suchen Sie den Anzug?', wahl: [
      { w: 'braeutigam', name: 'Meine Hochzeit', text: 'Ich bin der Bräutigam.', bild: 'herz' },
      { w: 'fest', name: 'Hochzeit oder Fest als Gast', text: 'Trauzeuge, Brautvater, Gala, Jubiläum.', bild: 'funke' },
      { w: 'business', name: 'Büro und Alltag', text: 'Ein Anzug, der oft getragen wird.', bild: 'person' },
      { w: 'abiball', name: 'Abiball oder Party', text: 'Jung, schmal geschnitten, bezahlbar.', bild: 'stern' }
    ] },
    { id: 's', titel: 'Welcher Stil gefällt Ihnen?', wahl: [
      { w: 'klassisch', name: 'Klassisch und zeitlos', text: 'Ruhige Linien, bequemer Schnitt.', bild: 'schild' },
      { w: 'modern', name: 'Modern und schmal', text: 'Slim-fit, tailliert, körpernah.', bild: 'schere' },
      { w: 'besonders', name: 'Festlich und besonders', text: 'Gehrock, Cutaway, Stehkragen, Jacquard.', bild: 'funke' },
      { w: 'smoking', name: 'Smoking', text: 'Schalkragen oder Spitzrevers mit Satin.', bild: 'stern' }
    ] },
    { id: 'f', titel: 'Welche Farbe darf es sein?', wahl: [
      { w: 'schwarz', name: 'Schwarz', ton: '#1a1917' },
      { w: 'blau', name: 'Blau', ton: '#263c6b' },
      { w: 'grau', name: 'Grau', ton: '#8a8d91' },
      { w: 'braun', name: 'Braun', ton: '#6a4a33' },
      { w: 'hell', name: 'Creme und Beige', ton: '#e6d8bb' },
      { w: 'egal', name: 'Ich bin offen', ton: 'conic-gradient(#1a1917, #263c6b, #8a8d91, #6a4a33, #e6d8bb, #1a1917)' }
    ] },
    { id: 'b', titel: 'Welches Budget haben Sie im Kopf?', wahl: [
      { w: '200', name: 'bis 200 €', text: 'Solide Anzüge für den Einstieg.' },
      { w: '350', name: 'bis 350 €', text: 'Mit Weste und feineren Stoffen.' },
      { w: '500', name: 'bis 500 €', text: 'Komplette Hochzeits-Sets.' },
      { w: 'egal', name: 'Spielt keine Rolle', text: 'Zeigen Sie mir alles Passende.' }
    ] }
  ];
  var ANZUEGE = ['hochzeitsanzuege', 'anzuege-uni', 'anzuege-gemustert'];
  var FARBE = { schwarz: ['schwarz'], blau: ['blau'], grau: ['grau'], braun: ['braun'], hell: ['beige', 'weiss'] };

  var antwort = {}, schritt = 0, katalog = null;

  function gueltig(frage, wert) { return frage.wahl.some(function (o) { return o.w === wert; }); }

  /* Punkte für einen Artikel; -1 bedeutet: passt nicht */
  function punkte(p, a) {
    var kat = p.k, t = p.t || [], hat = function (x) { return t.indexOf(x) !== -1; };
    var hochzeit = kat.indexOf('hochzeitsanzuege') !== -1, uni = kat.indexOf('anzuege-uni') !== -1, muster = kat.indexOf('anzuege-gemustert') !== -1;
    var festlich = hat('gehrock') || hat('cutaway') || hat('stehkragen') || hat('jacquard');
    var smoking = hat('smoking') || hat('schalkragen');
    var s = 0;

    if (a.a === 'braeutigam') { if (!hochzeit) return -1; s += 3; }
    if (a.a === 'fest') { s += hochzeit ? (smoking ? 3 : 1) : (muster ? 2 : 1); }
    if (a.a === 'business') { if (hochzeit) return -1; s += uni ? 3 : 2; }
    if (a.a === 'abiball') { s += hat('slim-fit') ? 2 : 0; s += smoking ? 2 : 0; s += hochzeit && festlich ? -2 : 1; }

    if (a.s === 'klassisch') { s += !hat('slim-fit') && !festlich && !smoking ? 3 : 0; s += uni ? 1 : 0; }
    if (a.s === 'modern') { s += hat('slim-fit') ? 3 : 0; }
    if (a.s === 'besonders') { s += festlich ? 4 : (muster ? 1 : 0); }
    if (a.s === 'smoking') { if (!smoking) return -1; s += 4; }

    if (a.f && a.f !== 'egal') {
      var fam = M.familienVon(p);
      if (!FARBE[a.f].some(function (f) { return fam.indexOf(f) !== -1; })) return -1;
      s += 1;
    }
    return s;
  }

  function auswahl(a) {
    var basis = katalog.produkte.filter(function (p) { return p.k.some(function (k) { return ANZUEGE.indexOf(k) !== -1; }); });
    var bewertet = basis.map(function (p, i) { return { p: p, s: punkte(p, a), i: i }; }).filter(function (x) { return x.s >= 0; });
    var budget = a.b && a.b !== 'egal' ? +a.b : null, erweitert = false;
    var imBudget = budget ? bewertet.filter(function (x) { return x.p.p <= budget; }) : bewertet;
    if (budget && imBudget.length < 3) { erweitert = bewertet.length > imBudget.length; imBudget = bewertet; }
    /* Wer im Größenberater war: Modelle in der eigenen Größe zuerst */
    var masse = M.speicher.lies('masse', null), groesse = masse && masse.groesse;
    imBudget.forEach(function (x) { if (groesse && (x.p.g || []).indexOf(groesse) !== -1) x.s += 1; });
    imBudget.sort(function (x, y) { return y.s - x.s || (budget ? x.p.p - y.p.p : 0) || x.i - y.i; });
    return { liste: imBudget.map(function (x) { return x.p; }), erweitert: erweitert, groesse: groesse };
  }

  function fortschritt() {
    M.$$('#finder-schritte li').forEach(function (li, i) {
      li.classList.toggle('aktiv', i === schritt);
      li.classList.toggle('fertig', i < schritt);
    });
    var band = document.getElementById('finder-band');
    band.style.setProperty('--stand', [10, 30, 50, 70, 100][schritt] + '%');
    band.setAttribute('aria-valuenow', schritt + 1);
  }

  function adresse() {
    var p = new URLSearchParams();
    FRAGEN.forEach(function (f) { if (antwort[f.id]) p.set(f.id, antwort[f.id]); });
    var s = p.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) { /* Doppelklick-Betrieb */ }
  }

  function frage() {
    var f = FRAGEN[schritt], ziel = document.getElementById('finder');
    ziel.innerHTML = '<section class="finder__frage"><h2 tabindex="-1" id="finder-titel">' + esc(f.titel) + '</h2>' +
      '<div class="finder__wahl" role="group" aria-labelledby="finder-titel">' + f.wahl.map(function (o) {
        return '<button type="button" data-wert="' + o.w + '" aria-pressed="' + (antwort[f.id] === o.w) + '">' +
          (o.ton ? '<i style="background:' + o.ton + '"></i>' : (o.bild ? sym(o.bild) : '')) +
          '<strong>' + esc(o.name) + '</strong>' + (o.text ? '<span>' + esc(o.text) + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="schritt__fuss">' + (schritt > 0
        ? '<button class="zuruck" type="button" data-zurueck>' + sym('zurueck') + 'Zurück</button>'
        : '<span></span>') +
        '<span class="klein leise">Frage ' + (schritt + 1) + ' von ' + FRAGEN.length + '</span></div></section>';
    fortschritt();
  }

  function ergebnis() {
    schritt = FRAGEN.length;
    fortschritt();
    var e = auswahl(antwort), liste = e.liste.slice(0, 9), ziel = document.getElementById('finder');
    var marken = FRAGEN.map(function (f) {
      var o = f.wahl.filter(function (x) { return x.w === antwort[f.id]; })[0];
      return o ? '<span class="marke marke--hell">' + esc(o.name) + '</span>' : '';
    }).join('');
    var mehr = 'kollektion.html?k=' + (antwort.a === 'business' ? 'anzuege-uni' : 'hochzeitsanzuege') +
      (antwort.f && antwort.f !== 'egal' ? '&farbe=' + (antwort.f === 'hell' ? 'beige,weiss' : antwort.f) : '') +
      (antwort.s === 'smoking' ? '&stil=smoking' : antwort.s === 'modern' ? '&stil=slim-fit' : '') +
      (antwort.b && antwort.b !== 'egal' ? '&max=' + antwort.b : '');
    var termin = 'termin.html?art=' + (antwort.a === 'braeutigam' ? 'hochzeit' : 'beratung') +
      (liste.length ? '&artikel=' + liste.slice(0, 6).map(function (p) { return encodeURIComponent(p.id); }).join(',') : '');

    if (!liste.length) {
      ziel.innerHTML = '<section class="finder__ergebnis"><div class="kein-treffer">' + sym('suche') +
        '<h2 tabindex="-1" id="finder-titel">Diese Kombination haben wir online nicht.</h2>' +
        '<p class="leise">Im Geschäft führen wir mehr, als online zu sehen ist. Ändern Sie eine Antwort oder kommen Sie vorbei.</p>' +
        '<div class="knopfreihe" style="justify-content:center"><button class="knopf knopf--dunkel" type="button" data-neu>Neu starten</button><a class="faden" href="' + termin + '">Termin buchen ' + sym('pfeil') + '</a></div></div></section>';
      return;
    }
    ziel.innerHTML = '<section class="finder__ergebnis">' +
      '<div class="stapel"><h2 tabindex="-1" id="finder-titel">Unsere Vorschläge</h2>' +
        '<div class="finder__zusammen">' + marken + '</div>' +
        (e.erweitert ? '<p class="hinweis">' + sym('info') + '<span>In Ihrem Budget gab es zu wenig Auswahl. Wir zeigen deshalb auch Modelle darüber.</span></p>' : '') +
        (e.groesse ? '<p class="klein leise">Modelle in Ihrer Größe ' + esc(e.groesse) + ' aus dem Größenberater stehen vorn.</p>' : '') +
      '</div>' +
      '<div class="produktraster" style="--spalten:3">' + liste.map(function (p) { return M.karte(p, katalog); }).join('') + '</div>' +
      '<div class="knopfreihe" style="justify-content:center">' +
        '<a class="knopf" href="' + termin + '">' + sym('kalender') + 'Diese Modelle anprobieren</a>' +
        (e.liste.length > 9 ? '<a class="knopf knopf--linie" href="' + mehr + '">Mehr in dieser Richtung</a>' : '') +
        '<button class="zuruck" type="button" data-neu>Neu starten</button>' +
      '</div></section>';
  }

  M.bereit(function () {
    var ziel = document.getElementById('finder');
    ziel.innerHTML = '<div class="finder__wahl"><div class="schimmer" style="height:9.5rem"></div><div class="schimmer" style="height:9.5rem"></div><div class="schimmer" style="height:9.5rem"></div><div class="schimmer" style="height:9.5rem"></div></div>';

    M.katalog.lade().then(function (k) {
      katalog = k;
      /* Antworten aus der Adresse übernehmen */
      FRAGEN.forEach(function (f) { var w = M.param(f.id); if (w && gueltig(f, w)) antwort[f.id] = w; });
      var vollstaendig = FRAGEN.every(function (f) { return antwort[f.id]; });
      if (vollstaendig) ergebnis(); else { antwort = {}; schritt = 0; frage(); }
    }).catch(function () {
      ziel.innerHTML = '<div class="kein-treffer"><h2>Der Stil-Finder ist gerade nicht erreichbar.</h2><p class="leise">Bitte laden Sie die Seite neu oder stöbern Sie in der <a href="kollektion.html">Kollektion</a>.</p></div>';
    });

    ziel.addEventListener('click', function (e) {
      var wert = e.target.closest('[data-wert]');
      if (wert) {
        antwort[FRAGEN[schritt].id] = wert.dataset.wert;
        if (schritt < FRAGEN.length - 1) { schritt++; frage(); } else { adresse(); ergebnis(); }
        fokus();
        return;
      }
      if (e.target.closest('[data-zurueck]')) { schritt = Math.max(0, schritt - 1); frage(); fokus(); return; }
      if (e.target.closest('[data-neu]')) { antwort = {}; schritt = 0; adresse(); frage(); fokus(); }
    });
  });

  function fokus() {
    var titel = document.getElementById('finder-titel');
    document.getElementById('finder-schritte').scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (titel) titel.focus({ preventScroll: true });
  }
})();
