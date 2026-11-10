/* =============================================================================
 * kern.js — Werkzeuge, Speicher, Warenkorb, Merkliste, Serveranbindung
 * -----------------------------------------------------------------------------
 * Gliederung:
 *   1) Kleine Helfer      2) Symbole        3) Speicher
 *   4) Warenkorb          5) Merkliste      6) Serveranbindung
 *   7) Dialoge            8) Meldungen      9) Formularprüfung
 *  10) Katalog           11) Produktkarte  12) Einblenden
 *
 * Die Seite läuft in zwei Betriebsarten:
 *   • mit Server (server.js): Termine, Bestellungen und Nachrichten werden
 *     zentral gespeichert, belegte Zeiten gelten für alle Besucher.
 *   • ohne Server (reine Dateien, z. B. GitHub Pages oder Doppelklick):
 *     alles bleibt im Browser, die Übergabe an das Geschäft läuft per E-Mail.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA = window.MUGA || {};

  /* ---------- 1) Kleine Helfer -------------------------------------------- */

  var ZEICHEN = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  M.esc = function (wert) {
    return String(wert == null ? '' : wert).replace(/[&<>"']/g, function (z) { return ZEICHEN[z]; });
  };

  var geldFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  M.geld = function (betrag) { return geldFormat.format(Math.round(betrag * 100) / 100); };

  M.$ = function (auswahl, wurzel) { return (wurzel || document).querySelector(auswahl); };
  M.$$ = function (auswahl, wurzel) { return Array.prototype.slice.call((wurzel || document).querySelectorAll(auswahl)); };

  M.param = function (name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  };

  M.melde = function (name, daten) {
    document.dispatchEvent(new CustomEvent('muga:' + name, { detail: daten }));
  };
  M.bei = function (name, fn) { document.addEventListener('muga:' + name, function (e) { fn(e.detail); }); };

  M.bereit = function (fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  M.verzoegert = function (fn, ms) {
    var uhr;
    return function () {
      var ich = this, args = arguments;
      clearTimeout(uhr);
      uhr = setTimeout(function () { fn.apply(ich, args); }, ms);
    };
  };

  /* Text für die Suche vereinheitlichen: klein, ohne Umlaute und Sonderzeichen */
  M.schlicht = function (text) {
    return String(text || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  };

  M.kennung = function (laenge) {
    var zeichen = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', aus = '', i;
    var feld = new Uint8Array(laenge || 6);
    (window.crypto || window.msCrypto).getRandomValues(feld);
    for (i = 0; i < feld.length; i++) aus += zeichen[feld[i] % zeichen.length];
    return aus;
  };

  /* ---------- 2) Symbole --------------------------------------------------- */

  var PFADE = {
    suche: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    herz: '<path d="M12 20.2s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.6c0 5.6-7.5 10-7.5 10z"/>',
    korb: '<path d="M5.5 8.5h13l-1 11.5h-11z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    menue: '<path d="M4 7.5h16M4 12h16M4 16.5h16"/>',
    zu: '<path d="M6 6l12 12M18 6L6 18"/>',
    pfeil: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    zurueck: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    unten: '<path d="M6 9l6 6 6-6"/>',
    kalender: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    telefon: '<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.500 5.700a2 2 0 0 1 2-2.200z"/>',
    post: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    ort: '<path d="M12 21s6.5-5.800 6.500-11.200a6.500 6.500 0 0 0-13 0C5.500 15.200 12 21 12 21z"/><circle cx="12" cy="9.800" r="2.300"/>',
    uhr: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
    lkw: '<path d="M3 6.500h10.500v9.500H3zM13.500 10h4l3 3v3h-7z"/><circle cx="7.500" cy="17.500" r="1.800"/><circle cx="17" cy="17.500" r="1.800"/>',
    schere: '<circle cx="6.500" cy="7" r="2.500"/><circle cx="6.500" cy="17" r="2.500"/><path d="M8.600 8.400L20 17M8.600 15.600L20 7"/>',
    massband: '<circle cx="9" cy="10" r="5.500"/><circle cx="9" cy="10" r="1.500"/><path d="M9 15.500h11.500v4H12M14.500 15.500v2M17.500 15.500v2"/>',
    schild: '<path d="M12 3.500l7 2.500v5.500c0 4.500-3 7.500-7 9-4-1.500-7-4.500-7-9V6z"/><path d="M9 12l2.200 2.200L15.200 10"/>',
    parken: '<rect x="4.500" y="4.500" width="15" height="15" rx="3"/><path d="M10 16.500v-9h3a2.500 2.500 0 0 1 0 5h-3"/>',
    haken: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.800v.2"/>',
    filter: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    plus: '<path d="M12 5.500v13M5.500 12h13"/>',
    minus: '<path d="M5.500 12h13"/>',
    muell: '<path d="M5 7.500h14M9.500 7.500V5.500h5v2M7 7.500l.800 12h8.400l.800-12"/>',
    fabrik: '<path d="M3.500 20V10l5.500 3.500V10l5.500 3.500V5.500h3L20.500 20z"/><path d="M7.500 16.500h2M12.500 16.500h2"/>',
    zurueckgabe: '<path d="M4.500 9.500h10a5 5 0 0 1 0 10h-6"/><path d="M8 6l-3.500 3.500L8 13"/>',
    lupeplus: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500M11 8.500v5M8.500 11h5"/>',
    stern: '<path d="M12 4l2.400 5 5.400.700-4 3.800 1 5.400L12 16.300 7.200 18.900l1-5.400-4-3.800 5.400-.700z"/>',
    person: '<circle cx="12" cy="8.500" r="3.500"/><path d="M5 20c.800-3.500 3.500-5.500 7-5.500s6.200 2 7 5.500"/>',
    karte: '<path d="M3.500 6.500l5.500-2 6 2 5.500-2v13l-5.500 2-6-2-5.500 2z"/><path d="M9 4.500v13M15 6.500v13"/>',
    funke: '<path d="M12 3.500l1.800 5.200 5.200 1.800-5.200 1.800L12 17.500l-1.800-5.200L5 10.500l5.200-1.800z"/><path d="M18.500 16l.700 1.800 1.800.700-1.800.700-.700 1.800-.700-1.800-1.800-.700 1.800-.700z"/>',
    drucker: '<path d="M7 9V4.500h10V9M7 16.500H4.500v-7h15v7H17"/><path d="M7 13.500h10v6H7z"/>',
    aussen: '<path d="M14 5h5v5M19 5l-8 8M17 14v4.500H5.500V7H10"/>'
  };
  M.symbol = function (name, klasse) {
    return '<svg class="symbol' + (klasse ? ' ' + klasse : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (PFADE[name] || '') + '</svg>';
  };

  /* ---------- 3) Speicher -------------------------------------------------- */

  var ersatz = {};
  var lager = (function () {
    try {
      var probe = '__muga_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (e) { return null; }
  })();

  M.speicher = {
    lies: function (name, sonst) {
      try {
        var roh = lager ? lager.getItem('muga.' + name) : ersatz[name];
        return roh == null ? sonst : JSON.parse(roh);
      } catch (e) { return sonst; }
    },
    schreib: function (name, wert) {
      var roh = JSON.stringify(wert);
      try { if (lager) lager.setItem('muga.' + name, roh); else ersatz[name] = roh; }
      catch (e) { ersatz[name] = roh; }
    },
    weg: function (name) {
      try { if (lager) lager.removeItem('muga.' + name); } catch (e) { /* egal */ }
      delete ersatz[name];
    }
  };

  /* Änderungen aus anderen Fenstern übernehmen */
  window.addEventListener('storage', function (e) {
    if (e.key === 'muga.korb') M.melde('korb', M.korb.liste());
    if (e.key === 'muga.merk') M.melde('merk', M.merk.liste());
  });

  /* ---------- 4) Warenkorb ------------------------------------------------- */

  function schluessel(p) { return [p.id, p.groesse || '', p.farbe || '', p.zusatz || ''].join('|'); }

  M.korb = {
    liste: function () {
      var l = M.speicher.lies('korb', []);
      return Array.isArray(l) ? l.filter(function (p) { return p && p.id && p.menge > 0; }) : [];
    },
    hinzu: function (posten) {
      var l = M.korb.liste(), k = schluessel(posten), da = null;
      l.forEach(function (p) { if (schluessel(p) === k) da = p; });
      var menge = Math.max(1, Math.min(10, posten.menge || 1));
      if (da) da.menge = Math.min(10, da.menge + menge);
      else l.push({
        id: posten.id, nr: posten.nr || '', name: posten.name, preis: +posten.preis,
        groesse: posten.groesse || '', farbe: posten.farbe || '', zusatz: posten.zusatz || '', menge: menge
      });
      M.speicher.schreib('korb', l);
      M.melde('korb', l);
      return l;
    },
    menge: function (k, menge) {
      var l = M.korb.liste().map(function (p) {
        if (schluessel(p) === k) p.menge = Math.max(0, Math.min(10, menge));
        return p;
      }).filter(function (p) { return p.menge > 0; });
      M.speicher.schreib('korb', l);
      M.melde('korb', l);
      return l;
    },
    entferne: function (k) { return M.korb.menge(k, 0); },
    leere: function () { M.speicher.schreib('korb', []); M.melde('korb', []); },
    anzahl: function () { return M.korb.liste().reduce(function (s, p) { return s + p.menge; }, 0); },
    summe: function () { return M.korb.liste().reduce(function (s, p) { return s + p.menge * p.preis; }, 0); },
    schluessel: schluessel
  };

  /* ---------- 5) Merkliste und zuletzt angesehen --------------------------- */

  M.merk = {
    liste: function () { var l = M.speicher.lies('merk', []); return Array.isArray(l) ? l : []; },
    hat: function (id) { return M.merk.liste().indexOf(id) !== -1; },
    wechsle: function (id) {
      var l = M.merk.liste(), i = l.indexOf(id);
      if (i === -1) l.unshift(id); else l.splice(i, 1);
      M.speicher.schreib('merk', l);
      M.melde('merk', l);
      return i === -1;
    }
  };

  M.gesehen = {
    liste: function () { var l = M.speicher.lies('gesehen', []); return Array.isArray(l) ? l : []; },
    merke: function (id) {
      var l = M.gesehen.liste().filter(function (x) { return x !== id; });
      l.unshift(id);
      M.speicher.schreib('gesehen', l.slice(0, 12));
    }
  };

  /* ---------- 6) Serveranbindung ------------------------------------------ */

  var serverFrage = null;
  M.api = {
    /* Gibt es einen Server hinter der Seite? Ergebnis wird je Seitenaufruf gemerkt. */
    verfuegbar: function () {
      if (serverFrage) return serverFrage;
      if (location.protocol !== 'http:' && location.protocol !== 'https:') {
        serverFrage = Promise.resolve(false);
        return serverFrage;
      }
      serverFrage = fetch('api/status', { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function (a) { return a.ok ? a.json() : null; })
        .then(function (d) { return !!(d && d.dienst === 'muga'); })
        .catch(function () { return false; });
      return serverFrage;
    },
    hole: function (pfad, kopf) {
      return fetch('api/' + pfad, { headers: Object.assign({ Accept: 'application/json' }, kopf || {}), cache: 'no-store' })
        .then(antwort);
    },
    sende: function (pfad, daten, kopf) {
      return fetch('api/' + pfad, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, kopf || {}),
        body: JSON.stringify(daten)
      }).then(antwort);
    }
  };
  function antwort(a) {
    return a.json().catch(function () { return {}; }).then(function (d) {
      if (!a.ok) {
        var f = new Error(d.fehler || 'Der Server hat die Anfrage abgelehnt.');
        f.status = a.status; f.daten = d;
        throw f;
      }
      return d;
    });
  }

  /* E-Mail-Verweis mit vorbereitetem Text (Übergabe ohne Server) */
  M.postlink = function (betreff, text) {
    return 'mailto:' + M.config.email + '?subject=' + encodeURIComponent(betreff) + '&body=' + encodeURIComponent(text);
  };

  /* ---------- 7) Dialoge --------------------------------------------------- */

  /* Nutzt das eingebaute <dialog>: Fokusfalle, Escape und Hintergrund sind
   * damit Sache des Browsers. Hier kommen nur Rollsperre und Klick daneben dazu. */
  M.oeffne = function (dialog) {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.body.classList.add('gesperrt');
    if (!dialog.__verdrahtet) {
      dialog.__verdrahtet = true;
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog || e.target.closest('[data-schliessen]')) M.schliesse(dialog);
      });
      dialog.addEventListener('close', function () {
        if (!document.querySelector('dialog[open]')) document.body.classList.remove('gesperrt');
      });
    }
  };
  M.schliesse = function (dialog) { if (dialog && dialog.open) dialog.close(); };

  /* ---------- 8) Meldungen ------------------------------------------------- */

  var meldeUhr;
  M.sag = function (text, verweis) {
    var kasten = document.getElementById('meldung');
    if (!kasten) {
      kasten = document.createElement('div');
      kasten.id = 'meldung';
      kasten.className = 'meldung';
      kasten.setAttribute('role', 'status');
      kasten.setAttribute('aria-live', 'polite');
      document.body.appendChild(kasten);
    }
    /* Liegt ein Dialog offen, muss die Meldung in ihn hinein, sonst verdeckt er sie */
    var offen = document.querySelector('dialog[open]');
    (offen || document.body).appendChild(kasten);
    kasten.innerHTML = '<span>' + M.esc(text) + '</span>' +
      (verweis ? '<a href="' + M.esc(verweis.href) + '">' + M.esc(verweis.text) + '</a>' : '');
    kasten.classList.remove('da');
    void kasten.offsetWidth;
    kasten.classList.add('da');
    clearTimeout(meldeUhr);
    meldeUhr = setTimeout(function () { kasten.classList.remove('da'); }, 4200);
  };

  /* ---------- 9) Formularprüfung ------------------------------------------ */

  function fehlertext(feld) {
    var v = feld.validity;
    if (feld.dataset.fehler && !v.valid) return feld.dataset.fehler;
    if (v.valueMissing) return feld.type === 'checkbox' ? 'Bitte bestätigen Sie dieses Feld.' : 'Bitte füllen Sie dieses Feld aus.';
    if (v.typeMismatch && feld.type === 'email') return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    if (v.patternMismatch) return 'Bitte prüfen Sie Ihre Eingabe.';
    if (v.tooShort) return 'Die Eingabe ist zu kurz.';
    if (v.rangeUnderflow || v.rangeOverflow) return 'Der Wert liegt außerhalb des möglichen Bereichs.';
    return 'Bitte prüfen Sie Ihre Eingabe.';
  }

  function zeigeFehler(feld) {
    var huelle = feld.closest('.feld');
    if (!huelle) return;
    var gut = feld.checkValidity();
    huelle.classList.toggle('fehler', !gut);
    var text = huelle.querySelector('.feld__fehler');
    if (!text) {
      text = document.createElement('p');
      text.className = 'feld__fehler';
      text.id = 'f-' + (feld.id || feld.name || M.kennung(5));
      huelle.appendChild(text);
    }
    text.textContent = gut ? '' : fehlertext(feld);
    if (gut) { feld.removeAttribute('aria-invalid'); feld.removeAttribute('aria-describedby'); }
    else { feld.setAttribute('aria-invalid', 'true'); feld.setAttribute('aria-describedby', text.id); }
  }

  /* Prüft alle Felder eines Bereichs, markiert Fehler und springt zum ersten. */
  M.pruefe = function (bereich) {
    var felder = M.$$('input, select, textarea', bereich).filter(function (f) { return !f.disabled && f.type !== 'hidden' && f.offsetParent !== null; });
    var erstes = null;
    felder.forEach(function (f) {
      if (f.type === 'text' || f.type === 'email' || f.type === 'tel' || f.tagName === 'TEXTAREA') f.value = f.value.trim();
      zeigeFehler(f);
      if (!f.checkValidity() && !erstes) erstes = f;
    });
    if (erstes) {
      erstes.focus({ preventScroll: true });
      erstes.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return !erstes;
  };

  document.addEventListener('input', function (e) {
    var f = e.target;
    if (f.closest && f.closest('.feld.fehler')) zeigeFehler(f);
  });
  document.addEventListener('change', function (e) {
    var f = e.target;
    if (f.closest && f.closest('.feld.fehler')) zeigeFehler(f);
  });

  /* Formulardaten als schlichtes Objekt */
  M.werte = function (form) {
    var aus = {};
    M.$$('input, select, textarea', form).forEach(function (f) {
      if (!f.name || f.disabled) return;
      if (f.type === 'checkbox') aus[f.name] = f.checked;
      else if (f.type === 'radio') { if (f.checked) aus[f.name] = f.value; }
      else aus[f.name] = f.value.trim();
    });
    return aus;
  };

  /* ---------- 10) Katalog -------------------------------------------------- */

  function ladeSkript(quelle) {
    return new Promise(function (gut, schlecht) {
      var s = document.createElement('script');
      s.src = quelle;
      s.onload = gut;
      s.onerror = function () { schlecht(new Error('Datei konnte nicht geladen werden: ' + quelle)); };
      document.head.appendChild(s);
    });
  }

  var katalogFrage = null, detailFragen = {}, detailDaten = {};
  M.produktDetail = function (id, daten) { detailDaten[id] = daten; };

  M.katalog = {
    lade: function () {
      if (katalogFrage) return katalogFrage;
      katalogFrage = (M.katalogDaten ? Promise.resolve() : ladeSkript('daten/katalog.js')).then(function () {
        var k = M.katalogDaten, nach = {};
        k.produkte.forEach(function (p) {
          nach[p.id] = p;
          if (!p._s) p._s = M.schlicht([p.n, p.nr, (p.k || []).join(' '), (p.f || []).join(' '), (p.t || []).join(' ')].join(' '));
        });
        k.nach = nach;
        k.kat = {};
        k.kategorien.forEach(function (c) { k.kat[c.id] = c; });
        return k;
      });
      return katalogFrage;
    },
    detail: function (id) {
      if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('Unbekanntes Produkt'));
      if (!detailFragen[id]) {
        detailFragen[id] = ladeSkript('daten/produkte/' + id + '.js').then(function () {
          if (!detailDaten[id]) throw new Error('Unbekanntes Produkt');
          return detailDaten[id];
        });
      }
      return detailFragen[id];
    },
    bild: function (p) { return 'assets/produkte/' + p.id + '.webp'; },
    /* Volltextsuche über den geladenen Katalog; alle Wörter müssen vorkommen. */
    suche: function (k, begriff) {
      var woerter = M.schlicht(begriff).split(' ').filter(Boolean);
      if (!woerter.length) return [];
      return k.produkte.map(function (p) {
        var punkte = 0, name = M.schlicht(p.n);
        for (var i = 0; i < woerter.length; i++) {
          var w = woerter[i];
          if (p._s.indexOf(w) === -1) return null;
          if (p.nr && M.schlicht(p.nr) === w) punkte += 50;
          if (name.indexOf(w) === 0) punkte += 8;
          else if ((' ' + name).indexOf(' ' + w) !== -1) punkte += 5;
          else if (name.indexOf(w) !== -1) punkte += 2;
          else punkte += 1;
        }
        return { p: p, punkte: punkte };
      }).filter(Boolean).sort(function (a, b) { return b.punkte - a.punkte; }).map(function (x) { return x.p; });
    }
  };

  /* ---------- 11) Produktkarte --------------------------------------------- */

  var FARBTON = {
    schwarz: '#1a1917', dunkelblau: '#1d2740', marine: '#1f2c4d', navyblau: '#1f2c4d', navy: '#1f2c4d', blau: '#2f4f8f',
    mittelblau: '#3d5f9c', hellblau: '#a9c3e3', royalblau: '#27439b', royal: '#27439b', blaugrau: '#5d6b7c', tuerkis: '#3aa6a6', petrol: '#1f5c66',
    grau: '#8a8d91', hellgrau: '#c3c5c8', dunkelgrau: '#4c4f54', anthrazit: '#383a3e', silber: '#b9bcc0', silbergrau: '#b9bcc0',
    weiss: '#ffffff', creme: '#f1e8d2', ivory: '#f3ecd9', 'creme ivory': '#f3ecd9', cremegold: '#e2cf9c', cremebeige: '#e6d8bb', champagner: '#ead9b9', ecru: '#efe6d1',
    beige: '#d8c4a0', hellbeige: '#e7d9bd', senfbeige: '#c9a85c', sand: '#d5c2a0', camel: '#b98e56', gold: '#c7a04c', gelb: '#e6c84a',
    braun: '#6a4a33', hellbraun: '#9a7350', dunkelbraun: '#44301f', rehbraun: '#8a6a4b', cognac: '#96592c', taupe: '#8b7d6f',
    bordeaux: '#6d1a26', weinrot: '#6d1a26', rot: '#b3232a', dunkelrot: '#7d1820', rosa: '#e7b3bd', hellrosa: '#f1cfd5', dunkelrosa: '#c9788a', altrosa: '#c9959c', lachs: '#f0a58c', fuchsia: '#c2267e', pink: '#d94a8c',
    gruen: '#2f6b4a', dunkelgruen: '#1f4a34', hellgruen: '#9cc7a0', oliv: '#6b6b3a', khaki: '#8c8156',
    violett: '#5b3a82', lila: '#6a4a9c', flieder: '#b9a2d4', hellflieder: '#d3c4e6', orange: '#d9772b'
  };
  M.farbton = function (name) {
    var s = M.schlicht(name);
    if (FARBTON[s]) return FARBTON[s];
    var teile = s.split(' ');
    for (var i = 0; i < teile.length; i++) if (FARBTON[teile[i]]) return FARBTON[teile[i]];
    return null;
  };

  /* In diesen Kategorien sind Zahlen Konfektionsgrößen und werden nach Reihen gruppiert */
  M.KONFEKTION = ['hochzeitsanzuege', 'anzuege-uni', 'anzuege-gemustert', 'sakko-blazer', 'hosen-westen', 'mantel-jacken', 'westen-fliegen'];
  var BUCHSTABEN = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];

  function groessenRang(g) {
    if (/^\d+([.,]\d+)?$/.test(g)) return [0, parseFloat(g.replace(',', '.'))];
    var kopf = g.split(/[\s(]/)[0].toUpperCase(), i = BUCHSTABEN.indexOf(kopf);
    return i !== -1 ? [1, i] : [2, 0];
  }
  /* Teilt Größen in Reihen: normal (44–72), untersetzt (23–37), schlank (88–130) */
  M.groessenReihen = function (werte, konfektion) {
    var sortiert = werte.slice().sort(function (a, b) {
      var ra = groessenRang(a), rb = groessenRang(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || a.localeCompare(b, 'de');
    });
    if (!konfektion) return [{ titel: '', werte: sortiert }];
    var reihen = { n: [], u: [], s: [], x: [] };
    sortiert.forEach(function (g) {
      var z = /^\d+$/.test(g) ? +g : null;
      if (z !== null && z >= 44 && z <= 72) reihen.n.push(g);
      else if (z !== null && z >= 23 && z <= 37) reihen.u.push(g);
      else if (z !== null && z >= 88 && z <= 130) reihen.s.push(g);
      else reihen.x.push(g);
    });
    var aus = [];
    if (reihen.n.length) aus.push({ titel: 'Normale Größen', werte: reihen.n });
    if (reihen.u.length) aus.push({ titel: 'Untersetzte Größen', werte: reihen.u });
    if (reihen.s.length) aus.push({ titel: 'Schlanke Größen', werte: reihen.s });
    if (reihen.x.length) aus.push({ titel: aus.length ? 'Weitere' : '', werte: reihen.x });
    if (aus.length === 1) aus[0].titel = '';
    return aus;
  };
  M.istKonfektion = function (p) { return (p.k || []).some(function (id) { return M.KONFEKTION.indexOf(id) !== -1; }); };

  /* Farbfamilien für Filter und Stil-Finder */
  M.farbfamilien = [
    { id: 'schwarz', name: 'Schwarz', ton: '#1a1917', woerter: ['schwarz'] },
    { id: 'blau', name: 'Blau', ton: '#263c6b', woerter: ['dunkelblau', 'marine', 'navyblau', 'navy', 'blau', 'mittelblau', 'hellblau', 'royalblau', 'royal', 'blaugrau', 'tuerkis', 'petrol'] },
    { id: 'grau', name: 'Grau', ton: '#8a8d91', woerter: ['grau', 'hellgrau', 'dunkelgrau', 'anthrazit', 'silber', 'silbergrau'] },
    { id: 'braun', name: 'Braun', ton: '#6a4a33', woerter: ['braun', 'hellbraun', 'dunkelbraun', 'rehbraun', 'cognac', 'taupe'] },
    { id: 'beige', name: 'Creme & Beige', ton: '#e6d8bb', woerter: ['creme', 'ivory', 'cremegold', 'cremebeige', 'champagner', 'ecru', 'beige', 'hellbeige', 'senfbeige', 'sand', 'camel'] },
    { id: 'weiss', name: 'Weiß', ton: '#ffffff', woerter: ['weiss'] },
    { id: 'rot', name: 'Rot & Bordeaux', ton: '#8d1f27', woerter: ['bordeaux', 'weinrot', 'rot', 'dunkelrot'] },
    { id: 'gruen', name: 'Grün', ton: '#2f6b4a', woerter: ['gruen', 'dunkelgruen', 'hellgruen', 'oliv', 'khaki'] },
    { id: 'violett', name: 'Violett', ton: '#6a4a9c', woerter: ['violett', 'lila', 'flieder', 'hellflieder'] },
    { id: 'rosa', name: 'Rosa', ton: '#e7b3bd', woerter: ['rosa', 'hellrosa', 'dunkelrosa', 'altrosa', 'lachs', 'fuchsia', 'pink'] },
    { id: 'gelb', name: 'Gelb & Orange', ton: '#e6c84a', woerter: ['gelb', 'gold', 'orange'] }
  ];
  var familieNach = {};
  M.farbfamilien.forEach(function (f) { f.woerter.forEach(function (w) { familieNach[w] = f.id; }); });
  M.farbfamilie = function (name) {
    var teile = M.schlicht(name).split(' ');
    for (var i = teile.length - 1; i >= 0; i--) if (familieNach[teile[i]]) return familieNach[teile[i]];
    return null;
  };
  /* Alle Farbfamilien eines Artikels */
  M.familienVon = function (p) {
    var aus = [];
    (p.f || []).forEach(function (f) {
      var fam = M.farbfamilie(f);
      if (fam && aus.indexOf(fam) === -1) aus.push(fam);
    });
    return aus;
  };

  /* Preis eines Artikels für eine bestimmte Größe und Farbe.
   * pg: abweichende Preise je Größe, pf: Aufschläge je Farbe. */
  M.preisFuer = function (p, groesse, farbe) {
    var preis = p.pg && groesse && p.pg[groesse] != null ? p.pg[groesse] : p.p;
    if (p.pf && farbe && p.pf[farbe] != null) preis += p.pf[farbe];
    return Math.round(preis * 100) / 100;
  };

  M.preis = function (p) {
    return '<span class="preis">' +
      (p.ab ? '<span class="preis__ab">ab</span> ' : '') +
      '<span class="preis__wert">' + M.geld(p.p) + '</span>' +
      (p.alt ? ' <s class="preis__alt">' + M.geld(p.alt) + '</s>' : '') + '</span>';
  };

  M.karte = function (p, k, wahl) {
    wahl = wahl || {};
    var kat = k && k.kat[(p.k || [])[0]];
    var farben = (p.f || []).map(function (f) { return { name: f, ton: M.farbton(f) }; }).filter(function (f) { return f.ton; });
    var punkte = farben.slice(0, 5).map(function (f) {
      return '<li style="--ton:' + f.ton + '" title="' + M.esc(f.name) + '"><span class="unsichtbar">' + M.esc(f.name) + '</span></li>';
    }).join('');
    var mehr = farben.length > 5 ? '<li class="farbpunkte__mehr">+' + (farben.length - 5) + '</li>' : '';
    var gemerkt = M.merk.hat(p.id);
    var b = p.b || [3, 4];
    return '<article class="karte' + (wahl.klasse ? ' ' + wahl.klasse : '') + '" data-id="' + M.esc(p.id) + '">' +
      '<a class="karte__bild" href="produkt.html?p=' + encodeURIComponent(p.id) + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + M.katalog.bild(p) + '" alt="" width="' + b[0] + '" height="' + b[1] + '" loading="' + (wahl.sofort ? 'eager' : 'lazy') + '" decoding="async">' +
      '</a>' +
      (p.neu ? '<span class="marke karte__marke">Neu</span>' : (p.sale ? '<span class="marke marke--rot karte__marke">Sale</span>' : '')) +
      '<button class="karte__herz" type="button" data-merken="' + M.esc(p.id) + '" aria-pressed="' + gemerkt + '" aria-label="' + M.esc(p.n) + (gemerkt ? ' von der Merkliste entfernen' : ' merken') + '">' + M.symbol('herz') + '</button>' +
      '<div class="karte__text">' +
        '<p class="karte__art">' + M.esc(kat ? kat.einzahl || kat.name : '') + (p.nr ? ' · Modell ' + M.esc(p.nr) : '') + '</p>' +
        '<h3 class="karte__name"><a href="produkt.html?p=' + encodeURIComponent(p.id) + '">' + M.esc(p.n) + '</a></h3>' +
        '<div class="karte__fuss">' + M.preis(p) + (punkte ? '<ul class="farbpunkte" aria-label="Farben">' + punkte + mehr + '</ul>' : '') + '</div>' +
      '</div>' +
    '</article>';
  };

  /* Herz-Knöpfe überall auf der Seite */
  document.addEventListener('click', function (e) {
    var knopf = e.target.closest && e.target.closest('[data-merken]');
    if (!knopf) return;
    e.preventDefault();
    var dazu = M.merk.wechsle(knopf.dataset.merken);
    M.sag(dazu ? 'Auf Ihre Merkliste gesetzt.' : 'Von der Merkliste entfernt.', dazu ? { href: 'merkliste.html', text: 'Ansehen' } : null);
  });
  M.bei('merk', function (liste) {
    M.$$('[data-merken]').forEach(function (k) {
      var an = liste.indexOf(k.dataset.merken) !== -1;
      k.setAttribute('aria-pressed', an);
      var name = k.getAttribute('aria-label') || '';
      k.setAttribute('aria-label', name.replace(/ (von der Merkliste entfernen|merken)$/, '') + (an ? ' von der Merkliste entfernen' : ' merken'));
    });
  });

  /* Fällt ein Produktbild aus, bleibt ein ruhiger Platzhalter statt eines Bruchsymbols. */
  document.addEventListener('error', function (e) {
    var bild = e.target;
    if (bild.tagName !== 'IMG' || bild.dataset.ersetzt) return;
    if (!bild.closest('.karte__bild, .galerie, .zeile__bild, .fund__bild, .buehne__bogen')) return;
    bild.dataset.ersetzt = '1';
    bild.src = 'assets/img/platzhalter.svg';
  }, true);

  /* ---------- 12) Einblenden beim Rollen ----------------------------------- */

  M.beobachte = function (wurzel) {
    var teile = M.$$('.zeigen:not(.sichtbar)', wurzel);
    if (!('IntersectionObserver' in window)) {
      teile.forEach(function (t) { t.classList.add('sichtbar'); });
      return;
    }
    if (!M._auge) {
      M._auge = new IntersectionObserver(function (treffer) {
        treffer.forEach(function (t) {
          if (t.isIntersecting) { t.target.classList.add('sichtbar'); M._auge.unobserve(t.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    teile.forEach(function (t) { M._auge.observe(t); });
  };
  M.bereit(function () { M.beobachte(document); });

  document.documentElement.classList.remove('ohne-js');
})();
