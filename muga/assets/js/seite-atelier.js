/* =============================================================================
 * seite-atelier.js — das Atelier
 * -----------------------------------------------------------------------------
 * Der Kunde stellt seinen Anzug an der Schneiderpuppe zusammen: Schnitt, Stoff,
 * Muster, Weste, Halsschmuck, Einstecktuch. Darunter stehen die Modelle aus dem
 * Katalog, die dem Entwurf am nächsten kommen. Der Entwurf lässt sich als Bild
 * sichern, als Verweis teilen und in die Terminbuchung mitnehmen.
 * Der Zustand steht in der Adresse (s, f, m, w, wm, h, hf, t) und wird gemerkt.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, A = M.anzug, esc = M.esc;
  var NS = 'http://www.w3.org/2000/svg';

  var VORGABE = { s: 'gehrock', f: 'dunkelblau', m: 'uni', w: 'champagner', wm: 1, h: 'plastron', hf: 'champagner', t: 'champagner' };
  /* Farbfamilien des Katalogs und Merkmale, an denen sich Muster erkennen lassen */
  var FAMILIE = { schwarz: 'schwarz', anthrazit: 'grau', grau: 'grau', hellgrau: 'grau', dunkelblau: 'blau', royalblau: 'blau', bordeaux: 'rot', braun: 'braun', gruen: 'gruen', beige: 'beige', creme: 'beige' };
  var MUSTERMERKMAL = { nadelstreifen: 'gestreift', karo: 'kariert', jacquard: 'jacquard' };
  var MEHRZAHL = { anzug: 'Anzüge', gehrock: 'Gehröcke', cutaway: 'Cutaways', smoking: 'Smokings', stehkragen: 'Modelle mit Stehkragen' };

  function ids(liste) { return liste.map(function (e) { return e.id; }); }
  function eintrag(liste, id) { return liste.filter(function (e) { return e.id === id; })[0] || liste[0]; }
  function ton(liste, id) { return eintrag(liste, id).ton; }
  function name(liste, id) { return eintrag(liste, id).name; }

  /* ---------- Zustand -------------------------------------------------------- */

  function gueltig(z) {
    var aus = {}, k;
    for (k in VORGABE) aus[k] = VORGABE[k];
    if (!z) return aus;
    if (ids(A.SCHNITTE).indexOf(z.s) !== -1) aus.s = z.s;
    if (ids(A.STOFFE).indexOf(z.f) !== -1) aus.f = z.f;
    if (ids(A.MUSTER).indexOf(z.m) !== -1) aus.m = z.m;
    if (z.w === 'ohne' || z.w === 'ton' || ids(A.BEIWERK).indexOf(z.w) !== -1) aus.w = z.w;
    if (z.wm != null) aus.wm = +z.wm ? 1 : 0;
    if (ids(A.HALS).indexOf(z.h) !== -1) aus.h = z.h;
    if (ids(A.BEIWERK).indexOf(z.hf) !== -1) aus.hf = z.hf;
    if (z.t === 'ohne' || ids(A.BEIWERK).indexOf(z.t) !== -1) aus.t = z.t;
    return aus;
  }

  function ausAdresse() {
    var p;
    try { p = new URLSearchParams(location.search); } catch (e) { return null; }
    if (!p.get('s')) return null;
    var z = {};
    ['s', 'f', 'm', 'w', 'wm', 'h', 'hf', 't'].forEach(function (k) { if (p.get(k) != null) z[k] = p.get(k); });
    return z;
  }

  function alsAdresse(z) {
    return ['s', 'f', 'm', 'w', 'wm', 'h', 'hf', 't'].map(function (k) { return k + '=' + encodeURIComponent(z[k]); }).join('&');
  }

  function lookAus(z) {
    var stoff = ton(A.STOFFE, z.f), steh = z.s === 'stehkragen';
    return {
      schnitt: z.s, stoff: stoff, muster: z.m,
      weste: steh || z.w === 'ohne' ? null : (z.w === 'ton' ? stoff : ton(A.BEIWERK, z.w)),
      westeMuster: z.wm ? 'jacquard' : null,
      hals: steh ? 'ohne' : z.h, halsFarbe: ton(A.BEIWERK, z.hf),
      tuch: z.t === 'ohne' ? null : ton(A.BEIWERK, z.t)
    };
  }

  function beschreibe(z) {
    var teile = [name(A.SCHNITTE, z.s) + ' in ' + name(A.STOFFE, z.f) + (z.m !== 'uni' ? ', ' + name(A.MUSTER, z.m) : '')];
    if (z.s !== 'stehkragen') {
      if (z.w !== 'ohne') teile.push('Weste ' + (z.w === 'ton' ? 'Ton in Ton' : 'in ' + name(A.BEIWERK, z.w)) + (z.wm ? ' mit Jacquard' : ''));
      if (z.h !== 'ohne') teile.push(name(A.HALS, z.h) + ' in ' + name(A.BEIWERK, z.hf));
    }
    if (z.t !== 'ohne') teile.push('Einstecktuch in ' + name(A.BEIWERK, z.t));
    return teile.join(' · ');
  }

  /* ---------- Katalog: was kommt dem Entwurf am nächsten? --------------------- */

  function passend(k, z) {
    var fam = FAMILIE[z.f], kategorie = z.s === 'anzug' ? (z.m === 'uni' ? 'anzuege-uni' : 'anzuege-gemustert') : 'hochzeitsanzuege';
    var imSchnitt = k.produkte.filter(function (p) {
      if (p.k.indexOf(kategorie) === -1) return false;
      return z.s === 'anzug' || (p.t || []).indexOf(z.s) !== -1;
    });
    var bewertet = imSchnitt.map(function (p, i) {
      var t = p.t || [], punkte = 0, farbe = M.familienVon(p).indexOf(fam) !== -1;
      var gemustert = t.indexOf('gestreift') !== -1 || t.indexOf('kariert') !== -1 || t.indexOf('jacquard') !== -1;
      if (farbe) punkte += 4;
      if (z.m === 'uni' ? !gemustert : (MUSTERMERKMAL[z.m] ? t.indexOf(MUSTERMERKMAL[z.m]) !== -1 : gemustert)) punkte += 2;
      if ((z.w !== 'ohne') === (t.indexOf('mit-weste') !== -1)) punkte += 1;
      return { p: p, punkte: punkte, farbe: farbe, i: i };
    }).sort(function (a, b) { return b.punkte - a.punkte || a.i - b.i; });
    var inFarbe = bewertet.filter(function (b) { return b.farbe; }).length;
    return {
      liste: bewertet.slice(0, 4).map(function (b) { return b.p; }),
      gesamt: imSchnitt.length, inFarbe: inFarbe,
      alle: 'kollektion.html?k=' + kategorie + (z.s === 'anzug' ? '' : '&stil=' + z.s) + (inFarbe ? '&farbe=' + fam : '')
    };
  }

  /* ---------- Bild des Entwurfs ---------------------------------------------- */

  function male(svg, text, fertig) {
    var klon = svg.cloneNode(true);
    klon.setAttribute('xmlns', NS);
    klon.setAttribute('width', 960);
    klon.setAttribute('height', 1360);
    var bild = new Image();
    bild.onload = function () {
      var B = 1200, H = 1600, c = document.createElement('canvas');
      c.width = B; c.height = H;
      var x = c.getContext('2d');
      x.fillStyle = '#171411';
      x.fillRect(0, 0, B, H);
      /* beleuchtete Nische mit Bogen */
      var nb = 700, nh = 1020, nx = (B - nb) / 2, ny = 96;
      function bogen(rand) {
        x.beginPath();
        x.moveTo(nx - rand, ny + nh + rand);
        x.lineTo(nx - rand, ny + nb / 2);
        x.arc(nx + nb / 2, ny + nb / 2, nb / 2 + rand, Math.PI, 0);
        x.lineTo(nx + nb + rand, ny + nh + rand);
        x.closePath();
      }
      bogen(16);
      x.strokeStyle = 'rgba(215, 183, 124, 0.5)'; x.lineWidth = 2; x.stroke();
      bogen(0);
      var schein = x.createRadialGradient(B / 2, ny + 120, 40, B / 2, ny + 420, 820);
      schein.addColorStop(0, '#f6ecda'); schein.addColorStop(0.5, '#decdb0'); schein.addColorStop(1, '#a58b66');
      x.fillStyle = schein; x.fill();
      x.strokeStyle = '#d7b77c'; x.lineWidth = 2; x.stroke();
      var pb = nb * 0.9, ph = pb * 680 / 480;
      x.drawImage(bild, nx + (nb - pb) / 2, ny + nh - ph + 6, pb, ph);
      /* Beschriftung */
      x.textAlign = 'center';
      x.fillStyle = '#d7b77c';
      x.font = '600 24px Figtree, "Segoe UI", Arial, sans-serif';
      x.fillText('M U G A   ·   A T E L I E R', B / 2, 1240);
      x.fillStyle = '#f3ede2';
      x.font = '400 46px Fraunces, Georgia, serif';
      var zeilen = [], zeile = '';
      text.split(' · ').forEach(function (teil) {
        var probe = zeile ? zeile + ' · ' + teil : teil;
        if (x.measureText(probe).width > B - 160 && zeile) { zeilen.push(zeile); zeile = teil; } else zeile = probe;
      });
      if (zeile) zeilen.push(zeile);
      zeilen.slice(0, 4).forEach(function (zl, i) { x.fillText(zl, B / 2, 1320 + i * 60); });
      x.fillStyle = '#b9ae9f';
      x.font = '400 24px Figtree, "Segoe UI", Arial, sans-serif';
      x.fillText(M.config.firma + ' · ' + M.config.strasse + ', ' + M.config.plz + ' ' + M.config.ort + ' · ' + M.config.telefon, B / 2, H - 46);
      c.toBlob(function (blob) { fertig(blob); }, 'image/png');
    };
    bild.onerror = function () { fertig(null); };
    bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(klon));
  }

  /* ---------- Seite ----------------------------------------------------------- */

  M.bereit(function () {
    var form = document.getElementById('atelier-form'), svg = document.getElementById('atelier-puppe');
    if (!form || !svg || !A) return;
    var text = document.getElementById('atelier-beschreibung');
    var z = gueltig(ausAdresse() || M.speicher.lies('atelier', null));
    var puppe = A(svg, { look: lookAus(z) }), kleine = {}, katalog = null;

    /* Auswahl aufbauen */
    document.getElementById('wahl-schnitt').innerHTML = A.SCHNITTE.map(function (s) {
      return '<label class="schnitt"><input type="radio" name="s" value="' + s.id + '">' +
        '<span class="schnitt__karte"><svg class="schnitt__bild" viewBox="92 24 296 610" aria-hidden="true" focusable="false" data-klein="' + s.id + '"></svg>' +
        '<span class="schnitt__name">' + esc(s.name) + '</span><span class="schnitt__text">' + esc(s.text) + '</span></span></label>';
    }).join('');
    M.$$('[data-klein]', form).forEach(function (e) { kleine[e.dataset.klein] = A(e); });

    function punkte(feld, liste, ohne) {
      return (ohne ? '<label class="ton ton--ohne" title="Ohne"><input type="radio" name="' + feld + '" value="ohne"><span><span class="unsichtbar">Ohne</span></span></label>' : '') +
        liste.map(function (f) {
          return '<label class="ton" title="' + esc(f.name) + '"><input type="radio" name="' + feld + '" value="' + f.id + '"><span style="--ton:' + f.ton + '"><span class="unsichtbar">' + esc(f.name) + '</span></span></label>';
        }).join('');
    }
    function marken(feld, liste) {
      return liste.map(function (m) {
        return '<label class="marke-wahl"><input type="radio" name="' + feld + '" value="' + m.id + '"><span>' + esc(m.name) + '</span></label>';
      }).join('');
    }
    document.getElementById('wahl-stoff').innerHTML = punkte('f', A.STOFFE);
    document.getElementById('wahl-muster').innerHTML = marken('m', A.MUSTER);
    document.getElementById('wahl-weste-art').innerHTML = marken('w', [{ id: 'ohne', name: 'Ohne Weste' }, { id: 'ton', name: 'Ton in Ton' }]);
    document.getElementById('wahl-weste').innerHTML = punkte('w', A.BEIWERK);
    document.getElementById('wahl-hals').innerHTML = marken('h', A.HALS);
    document.getElementById('wahl-halsfarbe').innerHTML = punkte('hf', A.BEIWERK);
    document.getElementById('wahl-tuch').innerHTML = punkte('t', A.BEIWERK, true);

    function fuelleFormular() {
      ['s', 'f', 'm', 'w', 'h', 'hf', 't'].forEach(function (k) {
        M.$$('input[name="' + k + '"]', form).forEach(function (i) { i.checked = i.value === z[k]; });
      });
      form.elements.wm.checked = !!z.wm;
    }

    function liesFormular() {
      ['s', 'f', 'm', 'w', 'h', 'hf', 't'].forEach(function (k) {
        var gewaehlt = M.$('input[name="' + k + '"]:checked', form);
        if (gewaehlt && !gewaehlt.disabled) z[k] = gewaehlt.value;
      });
      if (!form.elements.wm.disabled) z.wm = form.elements.wm.checked ? 1 : 0;
    }

    function zeigePassend() {
      if (!katalog) return;
      var fund = passend(katalog, z), liste = document.getElementById('passend-liste');
      var kennung = fund.liste.map(function (p) { return p.id; }).join(',');
      /* Nur neu zeichnen, wenn sich die Auswahl wirklich ändert, sonst flackern die Bilder */
      if (liste.dataset.kennung !== kennung) {
        liste.dataset.kennung = kennung;
        liste.innerHTML = fund.liste.map(function (p) { return M.karte(p, katalog); }).join('') ||
          '<p class="leise">In diesem Schnitt haben wir gerade kein Modell im Katalog. Fragen Sie uns gern danach.</p>';
      }
      var mehrzahl = MEHRZAHL[z.s], farbe = name(M.farbfamilien, FAMILIE[z.f]);
      document.getElementById('passend-text').textContent = !fund.gesamt ? ''
        : (fund.inFarbe
          ? 'Wir führen ' + fund.gesamt + ' ' + mehrzahl + ', ' + fund.inFarbe + ' davon im Farbbereich ' + farbe + '. Diese Modelle passen am besten zu Ihrem Entwurf.'
          : 'Wir führen ' + fund.gesamt + ' ' + mehrzahl + ', im Farbbereich ' + farbe + ' ist gerade keines dabei. Diese Modelle kommen Ihrem Entwurf am nächsten.');
      document.getElementById('passend-alle').href = fund.alle;
      var art = z.s === 'anzug' || z.s === 'smoking' ? 'beratung' : 'hochzeit';
      document.getElementById('atelier-termin').href = 'termin.html?art=' + art +
        '&artikel=' + fund.liste.slice(0, 3).map(function (p) { return p.id; }).join(',') +
        '&notiz=' + encodeURIComponent('Mein Entwurf aus dem Atelier: ' + beschreibe(z));
    }
    function wende(sofort) {
      var steh = z.s === 'stehkragen', look = lookAus(z), satz = beschreibe(z);
      if (sofort) puppe.zeige(look); else puppe.wechsle(look, 700);
      text.textContent = satz;
      svg.setAttribute('aria-label', 'Schneiderpuppe: ' + satz);
      /* die kleinen Puppen zeigen jeden Schnitt im gewählten Stoff */
      A.SCHNITTE.forEach(function (s) {
        var probe = {}, k;
        for (k in z) probe[k] = z[k];
        probe.s = s.id;
        kleine[s.id].zeige(lookAus(probe));
      });
      /* Beim Stehkragen sind Weste und Halsschmuck nicht zu sehen */
      ['gruppe-weste', 'gruppe-hals'].forEach(function (id) {
        var gruppe = document.getElementById(id);
        gruppe.disabled = steh;
        gruppe.classList.toggle('werk--aus', steh);
        gruppe.querySelector('.werk__hinweis').hidden = !steh;
      });
      document.getElementById('wahl-weste').classList.toggle('toene--matt', z.w === 'ohne' || z.w === 'ton');
      form.elements.wm.disabled = steh || z.w === 'ohne';
      document.getElementById('wahl-halsfarbe').classList.toggle('toene--matt', z.h === 'ohne');
      M.speicher.schreib('atelier', z);
      try { history.replaceState(null, '', location.pathname + '?' + alsAdresse(z)); } catch (e) { /* ohne Adresszeile geht es auch */ }
      zeigePassend();
    }

    form.addEventListener('change', function () { liesFormular(); wende(false); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    /* Überraschen: ein stimmiger Zufallsentwurf */
    document.getElementById('atelier-zufall').addEventListener('click', function () {
      function w(liste) { return liste[Math.floor(Math.random() * liste.length)]; }
      var andere = ids(A.SCHNITTE).filter(function (s) { return s !== z.s; });
      z.s = w(andere);
      z.f = w(ids(A.STOFFE));
      z.m = w(['uni', 'uni', 'uni', 'nadelstreifen', 'karo', 'fischgrat', 'jacquard']);
      z.wm = 0;
      if (z.s === 'smoking') {
        z.f = w(['schwarz', 'schwarz', 'dunkelblau', 'bordeaux']); z.m = 'uni'; z.w = 'ohne'; z.h = 'fliege'; z.hf = 'schwarz'; z.t = 'weiss';
      } else if (z.s === 'gehrock' || z.s === 'cutaway') {
        z.w = w(['champagner', 'creme', 'silber', 'ton']); z.wm = Math.random() < 0.6 ? 1 : 0;
        z.h = w(['plastron', 'plastron', 'krawatte']);
        z.hf = z.w === 'ton' ? w(['silber', 'champagner', 'bordeaux']) : z.w;
        z.t = z.hf;
      } else if (z.s === 'stehkragen') {
        z.m = w(['jacquard', 'jacquard', 'uni']); z.t = w(['ohne', 'gold', 'weiss']);
      } else {
        z.w = w(['ohne', 'ohne', 'ton']); z.h = w(['krawatte', 'krawatte', 'fliege']);
        z.hf = w(['bordeaux', 'dunkelblau', 'silber', 'gruen', 'rosa']); z.t = w(['weiss', 'weiss', z.hf]);
      }
      fuelleFormular();
      wende(false);
    });

    /* Bild sichern: auf dem Handy über „Teilen“, sonst als Datei */
    document.getElementById('atelier-bild').addEventListener('click', function () {
      male(svg, beschreibe(z), function (blob) {
        if (!blob) { M.sag('Das Bild konnte nicht erzeugt werden.'); return; }
        var datei = null;
        try { datei = new File([blob], 'MUGA-Atelier-Entwurf.png', { type: 'image/png' }); } catch (e) { datei = null; }
        if (datei && navigator.canShare && navigator.canShare({ files: [datei] }) && window.matchMedia('(pointer: coarse)').matches) {
          navigator.share({ files: [datei], title: 'Mein Entwurf aus dem MUGA Atelier' }).catch(function () { /* abgebrochen */ });
          return;
        }
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url;
        a.download = 'MUGA-Atelier-Entwurf.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
        M.sag('Ihr Entwurf liegt als Bild in Ihren Downloads.');
      });
    });

    /* Verweis kopieren oder teilen */
    document.getElementById('atelier-teilen').addEventListener('click', function () {
      var adresse = location.href.split('#')[0];
      function geschafft() { M.sag('Der Verweis zu Ihrem Entwurf ist kopiert.'); }
      function vonHand() {
        var feld = document.createElement('textarea');
        feld.value = adresse;
        feld.setAttribute('readonly', '');
        feld.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0';
        document.body.appendChild(feld);
        feld.select();
        var gut = false;
        try { gut = document.execCommand('copy'); } catch (e) { gut = false; }
        feld.remove();
        if (gut) geschafft(); else M.sag('Bitte kopieren Sie die Adresse aus der Adresszeile.');
      }
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        navigator.share({ title: 'Mein Entwurf aus dem MUGA Atelier', text: beschreibe(z), url: adresse }).catch(function () { /* abgebrochen */ });
      } else if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(adresse).then(geschafft, vonHand);
      } else vonHand();
    });

    fuelleFormular();
    wende(true);
    M.katalog.lade().then(function (k) { katalog = k; zeigePassend(); }).catch(function () {
      document.getElementById('passend-liste').innerHTML = '<p class="leise">Die Kollektion konnte gerade nicht geladen werden. <a href="kollektion.html">Zur Kollektion</a></p>';
    });
  });
})();
