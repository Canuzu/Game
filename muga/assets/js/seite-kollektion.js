/* =============================================================================
 * seite-kollektion.js — Kollektion: Kategorien, Filter, Sortierung, Suche
 * -----------------------------------------------------------------------------
 * Der Zustand steht vollständig in der Adresse (k, q, farbe, g, stil, min,
 * max, sort, n). So lässt sich jede Ansicht verlinken, und der Zurück-Knopf
 * bringt nach einem Blick auf einen Artikel genau dieselbe Liste wieder.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, esc = M.esc, sym = M.symbol;
  var SCHRITT = 24;

  var STILE = {
    'gehrock': 'Gehrock', 'cutaway': 'Cutaway', 'smoking': 'Smoking', 'stehkragen': 'Stehkragen',
    'schalkragen': 'Schalkragen', 'slim-fit': 'Slim-fit', 'mit-weste': 'Mit Weste', 'jacquard': 'Jacquard & Brokat',
    'gestreift': 'Gestreift', 'kariert': 'Kariert', 'lack': 'Lack', 'leder': 'Leder'
  };
  var BESONDERE = {
    neu: { name: 'Neu im Shop', text: 'Frisch eingetroffen: die neuesten Modelle der Kollektion.' },
    sale: { name: 'Sale', text: 'Auslaufmodelle und Einzelteile zum reduzierten Preis. Solange der Vorrat reicht.' }
  };
  var KONFEKTION = M.KONFEKTION;

  function liste(name) {
    var wert = M.param(name);
    return wert ? wert.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
  }
  function zahl(name) {
    var wert = parseFloat(String(M.param(name) || '').replace(',', '.'));
    return isFinite(wert) && wert >= 0 ? wert : null;
  }

  var zustand = {
    k: M.param('k') || '', q: (M.param('q') || '').trim().slice(0, 80),
    farbe: liste('farbe'), g: liste('g'), stil: liste('stil'),
    min: zahl('min'), max: zahl('max'), sort: M.param('sort') || '',
    n: Math.max(SCHRITT, Math.min(600, parseInt(M.param('n'), 10) || SCHRITT))
  };

  function inKategorie(k, p, id) {
    if (!id) return true;
    if (id === 'neu') return !!p.neu;
    if (id === 'sale') return !!p.sale;
    var kat = k.kat[id];
    if (!kat) return true;
    if (kat.kinder) return kat.kinder.some(function (kind) { return p.k.indexOf(kind) !== -1; });
    return p.k.indexOf(id) !== -1;
  }

  M.bereit(function () {
    M.katalog.lade().then(start).catch(function () {
      document.getElementById('raster').innerHTML = '<div class="kein-treffer" style="grid-column:1/-1"><h2>Die Kollektion konnte nicht geladen werden.</h2><p class="leise">Bitte laden Sie die Seite neu.</p></div>';
    });
  });

  function start(k) {
    var form = document.getElementById('filter'), raster = document.getElementById('raster');
    var kat = k.kat[zustand.k], besonders = BESONDERE[zustand.k];
    if (zustand.k && !kat && !besonders) zustand.k = '';

    /* ---- Grundmenge: Kategorie und Suche ---- */
    var basis = zustand.q ? M.katalog.suche(k, zustand.q) : k.produkte;
    basis = basis.filter(function (p) { return inKategorie(k, p, zustand.k); });

    /* ---- Kopf der Seite ---- */
    var titel = 'Kollektion', text = 'Alles aus eigener Herstellung: vom Hochzeitsanzug bis zum Einstecktuch.';
    var kruemel = ['<li><a href="index.html">Start</a></li>'];
    if (kat) {
      titel = kat.eltern ? k.kat[kat.eltern].name + ': ' + kat.name : kat.name;
      text = kat.text;
      kruemel.push('<li><a href="kollektion.html">Kollektion</a></li>');
      if (kat.eltern) kruemel.push('<li><a href="kollektion.html?k=' + kat.eltern + '">' + esc(k.kat[kat.eltern].name) + '</a></li>');
      kruemel.push('<li aria-current="page">' + esc(kat.name) + '</li>');
    } else if (besonders) {
      titel = besonders.name; text = besonders.text;
      kruemel.push('<li><a href="kollektion.html">Kollektion</a></li>', '<li aria-current="page">' + esc(besonders.name) + '</li>');
    } else {
      kruemel.push('<li aria-current="page">Kollektion</li>');
    }
    if (zustand.q) {
      titel = 'Suche: „' + zustand.q + '“';
      text = kat || besonders ? 'Treffer in ' + (kat ? kat.name : besonders.name) + '.' : 'Treffer in der gesamten Kollektion.';
    }
    document.getElementById('titel').textContent = titel;
    document.getElementById('einleitung').textContent = text;
    document.getElementById('kruemel').innerHTML = kruemel.join('');
    document.title = titel + ' · MUGA Herrenausstatter Köln';

    var streifen = [['', 'Alle'], ['hochzeitsanzuege', 'Hochzeitsanzüge'], ['anzuege-uni', 'Anzüge uni'], ['anzuege-gemustert', 'Anzüge gemustert'],
      ['sakko-blazer', 'Sakkos'], ['hemden', 'Hemden'], ['westen-fliegen', 'Westen & Fliegen'], ['schuhe', 'Schuhe'], ['krawatten', 'Krawatten'], ['sale', 'Sale']];
    var aktivOben = kat && kat.eltern ? kat.eltern : zustand.k;
    document.getElementById('streifen').innerHTML = streifen.map(function (s) {
      return '<a class="tipp" href="kollektion.html' + (s[0] ? '?k=' + s[0] : '') + '"' + (s[0] === aktivOben && !zustand.q ? ' aria-current="page"' : '') + '>' + esc(s[1]) + '</a>';
    }).join('');

    /* ---- Filterformular ---- */
    function anzahl(id) { return k.produkte.filter(function (p) { return inKategorie(k, p, id); }).length; }
    var baum = '<ul class="filter__liste"><li><a href="kollektion.html"' + (!zustand.k ? ' aria-current="true"' : '') + '>Alle Artikel <small>' + k.produkte.length + '</small></a></li>';
    k.kategorien.forEach(function (c) {
      if (c.eltern) return;
      var offen = zustand.k === c.id || (kat && kat.eltern === c.id);
      baum += '<li><a href="kollektion.html?k=' + c.id + '"' + (zustand.k === c.id ? ' aria-current="true"' : '') + '>' + esc(c.name) + ' <small>' + anzahl(c.id) + '</small></a>';
      if (c.kinder && offen) {
        baum += '<ul class="unter">' + c.kinder.map(function (id) {
          return '<li><a href="kollektion.html?k=' + id + '"' + (zustand.k === id ? ' aria-current="true"' : '') + '>' + esc(k.kat[id].name) + ' <small>' + anzahl(id) + '</small></a></li>';
        }).join('') + '</ul>';
      }
      baum += '</li>';
    });
    baum += '<li><a href="kollektion.html?k=neu"' + (zustand.k === 'neu' ? ' aria-current="true"' : '') + '>Neu im Shop <small>' + anzahl('neu') + '</small></a></li>' +
      '<li><a href="kollektion.html?k=sale"' + (zustand.k === 'sale' ? ' aria-current="true"' : '') + '>Sale <small>' + anzahl('sale') + '</small></a></li></ul>';

    var familien = M.farbfamilien.filter(function (f) {
      return basis.some(function (p) { return M.familienVon(p).indexOf(f.id) !== -1; });
    });
    var stile = Object.keys(STILE).filter(function (s) { return basis.some(function (p) { return (p.t || []).indexOf(s) !== -1; }); });
    var zeigeGroessen = !!kat && ['damen', 'freizeit', 'accessoires', 'krawatten'].indexOf(zustand.k) === -1;
    var alleGroessen = [];
    if (zeigeGroessen) basis.forEach(function (p) { (p.g || []).forEach(function (g) { if (alleGroessen.indexOf(g) === -1) alleGroessen.push(g); }); });
    var konfektion = KONFEKTION.indexOf(zustand.k) !== -1;
    var reihen = M.groessenReihen(alleGroessen, konfektion);
    var preise = basis.map(function (p) { return p.p; });
    var preisMin = preise.length ? Math.floor(Math.min.apply(null, preise)) : 0, preisMax = preise.length ? Math.ceil(Math.max.apply(null, preise)) : 0;

    function gruppe(name, inhalt, offen) {
      return '<details class="filter__gruppe"' + (offen ? ' open' : '') + '><summary>' + name + '</summary><div class="filter__inhalt">' + inhalt + '</div></details>';
    }
    function chip(feld, wert, text, an, ton) {
      return '<label class="chip"><input type="checkbox" name="' + feld + '" value="' + esc(wert) + '"' + (an ? ' checked' : '') + '><span>' +
        (ton ? '<i style="--ton:' + ton + '"></i>' : '') + esc(text) + '</span></label>';
    }

    var html = gruppe('Kategorie', baum, true);
    if (alleGroessen.length) {
      html += gruppe('Größe', reihen.map(function (r) {
        return (r.titel ? '<p class="groessen-reihe__titel">' + r.titel + '</p>' : '') + '<div class="chips">' +
          r.werte.map(function (g) { return chip('g', g, g, zustand.g.indexOf(g) !== -1); }).join('') + '</div>';
      }).join(''), true);
    }
    if (familien.length > 1) {
      html += gruppe('Farbe', '<div class="chips">' + familien.map(function (f) {
        return chip('farbe', f.id, f.name, zustand.farbe.indexOf(f.id) !== -1, f.ton);
      }).join('') + '</div>', true);
    }
    if (stile.length) {
      html += gruppe('Stil', '<div class="chips">' + stile.map(function (s) {
        return chip('stil', s, STILE[s], zustand.stil.indexOf(s) !== -1);
      }).join('') + '</div>', true);
    }
    if (preisMax > preisMin) {
      html += gruppe('Preis in €', '<div class="preisfilter">' +
        '<label class="unsichtbar" for="preis-min">Preis ab</label><input class="eingabe" id="preis-min" name="min" type="number" inputmode="numeric" min="0" step="1" placeholder="' + preisMin + '" value="' + (zustand.min !== null ? zustand.min : '') + '">' +
        '<span aria-hidden="true">bis</span>' +
        '<label class="unsichtbar" for="preis-max">Preis bis</label><input class="eingabe" id="preis-max" name="max" type="number" inputmode="numeric" min="0" step="1" placeholder="' + preisMax + '" value="' + (zustand.max !== null ? zustand.max : '') + '">' +
        '</div>', zustand.min !== null || zustand.max !== null);
    }
    form.innerHTML = html;
    document.getElementById('sortierung').value = ['preis-auf', 'preis-ab', 'name'].indexOf(zustand.sort) !== -1 ? zustand.sort : '';

    /* ---- Auswerten und Zeichnen ---- */
    function lies() {
      var gewaehlt = function (name) { return M.$$('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); };
      zustand.g = gewaehlt('g'); zustand.farbe = gewaehlt('farbe'); zustand.stil = gewaehlt('stil');
      var min = form.elements.min, max = form.elements.max;
      zustand.min = min && min.value !== '' && +min.value >= 0 ? +min.value : null;
      zustand.max = max && max.value !== '' && +max.value >= 0 ? +max.value : null;
      zustand.sort = document.getElementById('sortierung').value;
    }

    function gefiltert() {
      var aus = basis.filter(function (p) {
        if (zustand.g.length && !zustand.g.some(function (g) { return (p.g || []).indexOf(g) !== -1; })) return false;
        if (zustand.farbe.length) {
          var fam = M.familienVon(p);
          if (!zustand.farbe.some(function (f) { return fam.indexOf(f) !== -1; })) return false;
        }
        if (zustand.stil.length && !zustand.stil.some(function (s) { return (p.t || []).indexOf(s) !== -1; })) return false;
        if (zustand.min !== null && p.p < zustand.min) return false;
        if (zustand.max !== null && p.p > zustand.max) return false;
        return true;
      });
      if (zustand.sort === 'preis-auf') aus = aus.slice().sort(function (a, b) { return a.p - b.p; });
      else if (zustand.sort === 'preis-ab') aus = aus.slice().sort(function (a, b) { return b.p - a.p; });
      else if (zustand.sort === 'name') aus = aus.slice().sort(function (a, b) { return a.n.localeCompare(b.n, 'de'); });
      return aus;
    }

    function adresse() {
      var p = new URLSearchParams();
      if (zustand.k) p.set('k', zustand.k);
      if (zustand.q) p.set('q', zustand.q);
      if (zustand.g.length) p.set('g', zustand.g.join(','));
      if (zustand.farbe.length) p.set('farbe', zustand.farbe.join(','));
      if (zustand.stil.length) p.set('stil', zustand.stil.join(','));
      if (zustand.min !== null) p.set('min', zustand.min);
      if (zustand.max !== null) p.set('max', zustand.max);
      if (zustand.sort) p.set('sort', zustand.sort);
      if (zustand.n > SCHRITT) p.set('n', zustand.n);
      var s = p.toString();
      try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) { /* bei Doppelklick-Betrieb egal */ }
    }

    function marken() {
      var m = [];
      if (zustand.q) m.push({ text: 'Suche: ' + zustand.q, weg: function () { location.href = 'kollektion.html' + (zustand.k ? '?k=' + zustand.k : ''); } });
      zustand.g.forEach(function (g) { m.push({ text: 'Größe ' + g, feld: 'g', wert: g }); });
      zustand.farbe.forEach(function (f) {
        var fam = M.farbfamilien.filter(function (x) { return x.id === f; })[0];
        if (fam) m.push({ text: fam.name, feld: 'farbe', wert: f });
      });
      zustand.stil.forEach(function (s) { if (STILE[s]) m.push({ text: STILE[s], feld: 'stil', wert: s }); });
      if (zustand.min !== null) m.push({ text: 'ab ' + M.geld(zustand.min), feld: 'min' });
      if (zustand.max !== null) m.push({ text: 'bis ' + M.geld(zustand.max), feld: 'max' });
      return m;
    }

    var aktuelleMarken = [];
    function zeichne() {
      var alle = gefiltert(), sicht = alle.slice(0, zustand.n);
      document.getElementById('zahl').innerHTML = '<strong>' + alle.length + '</strong> ' + (alle.length === 1 ? 'Artikel' : 'Artikel');
      if (!alle.length) {
        raster.innerHTML = '<div class="kein-treffer" style="grid-column:1/-1">' + sym('suche') +
          '<h2>Dazu haben wir nichts gefunden.</h2>' +
          '<p class="leise">Nehmen Sie einen Filter zurück, oder lassen Sie sich persönlich beraten. Im Geschäft führen wir mehr, als online zu sehen ist.</p>' +
          '<div class="knopfreihe" style="justify-content:center"><button class="knopf knopf--dunkel" type="button" data-alle-weg>Filter zurücksetzen</button><a class="faden" href="termin.html">Termin buchen ' + sym('pfeil') + '</a></div></div>';
      } else {
        raster.innerHTML = sicht.map(function (p, i) { return M.karte(p, k, { sofort: i < 3, h: 'h2' }); }).join('');
      }
      var nach = document.getElementById('nachladen');
      nach.hidden = !alle.length;
      if (alle.length) {
        document.getElementById('nachladen-text').textContent = sicht.length + ' von ' + alle.length + ' Artikeln';
        document.getElementById('nachladen-band').style.setProperty('--stand', (sicht.length / alle.length * 100).toFixed(1) + '%');
        document.getElementById('mehr').hidden = sicht.length >= alle.length;
      }
      aktuelleMarken = marken();
      document.getElementById('aktiv').innerHTML = aktuelleMarken.map(function (m, i) {
        return '<button type="button" data-marke="' + i + '" aria-label="Filter entfernen: ' + esc(m.text) + '">' + esc(m.text) + sym('zu') + '</button>';
      }).join('') + (aktuelleMarken.length > 1 ? '<button type="button" class="alle-weg" data-alle-weg>Alle zurücksetzen</button>' : '');
      var zahlFilter = aktuelleMarken.length - (zustand.q ? 1 : 0);
      document.getElementById('filter-zahl').textContent = zahlFilter ? ' (' + zahlFilter + ')' : '';
      document.getElementById('filter-zeigen').textContent = alle.length + ' Artikel anzeigen';
      adresse();
    }

    function geaendert() { lies(); zustand.n = SCHRITT; zeichne(); }
    form.addEventListener('change', geaendert);
    form.addEventListener('input', M.verzoegert(function (e) {
      if (e.target.name === 'min' || e.target.name === 'max') geaendert();
    }, 350));
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    document.getElementById('sortierung').addEventListener('change', geaendert);

    document.getElementById('mehr').addEventListener('click', function () {
      var vorher = raster.children.length;
      zustand.n += SCHRITT;
      zeichne();
      var neu = raster.children[vorher];
      if (neu) { var a = neu.querySelector('.karte__name a'); if (a) a.focus({ preventScroll: true }); }
    });

    document.addEventListener('click', function (e) {
      var marke = e.target.closest('[data-marke]');
      if (marke) {
        var m = aktuelleMarken[+marke.dataset.marke];
        if (!m) return;
        if (m.weg) return m.weg();
        if (m.feld === 'min' || m.feld === 'max') form.elements[m.feld].value = '';
        else M.$$('input[name="' + m.feld + '"]', form).forEach(function (i) { if (i.value === m.wert) i.checked = false; });
        geaendert();
        return;
      }
      if (e.target.closest('[data-alle-weg]')) {
        M.$$('input[type="checkbox"]', form).forEach(function (i) { i.checked = false; });
        if (form.elements.min) form.elements.min.value = '';
        if (form.elements.max) form.elements.max.value = '';
        if (zustand.q) { location.href = 'kollektion.html' + (zustand.k ? '?k=' + zustand.k : ''); return; }
        geaendert();
      }
    });

    /* ---- Filter auf kleinen Bildschirmen: dasselbe Formular wandert in die Lade ---- */
    var lade = document.getElementById('filterlade'), spalte = form.parentNode;
    document.getElementById('filter-auf').addEventListener('click', function () {
      document.getElementById('filterlade-ziel').appendChild(form);
      M.oeffne(lade);
    });
    lade.addEventListener('close', function () { spalte.appendChild(form); });
    window.matchMedia('(min-width: 1041px)').addEventListener('change', function (e) { if (e.matches) M.schliesse(lade); });

    zeichne();
  }
})();
