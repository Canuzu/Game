/* =============================================================================
 * seite-start.js — Startseite
 * -----------------------------------------------------------------------------
 *   1) Vorhang           2) Bühne: Stoff, Tiefe, schwebende Karten
 *   3) Stilkunde: die Puppe wechselt beim Rollen den Anzug
 *   4) Atelier-Anriss    5) Auswahl aus der Kollektion
 *   6) Zähler            7) Knöpfe, die dem Zeiger entgegenkommen
 * ========================================================================== */
(function () {
  'use strict';
  var M = window.MUGA;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var feinerZeiger = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 1) Vorhang ---------------------------------------------------- */

  function vorhang() {
    var v = document.getElementById('vorhang');
    if (!v) return;
    var wurzel = document.documentElement;
    try { sessionStorage.setItem('muga.vorhang', '1'); } catch (e) { /* dann eben jedes Mal */ }
    if (wurzel.classList.contains('kein-vorhang') || getComputedStyle(v).display === 'none') { v.remove(); return; }

    var fertig = false;
    function weg() { if (v.parentNode) v.remove(); }
    function schnell() {
      if (fertig) return;
      fertig = true;
      v.classList.add('vorhang--schnell');
      wurzel.style.setProperty('--auftakt', '0.05s');
      setTimeout(weg, 320);
    }
    setTimeout(function () { fertig = true; weg(); }, 2600);
    /* Niemand muss warten: Tippen, eine Taste oder Rollen hebt den Vorhang sofort */
    ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach(function (art) {
      window.addEventListener(art, schnell, { once: true, passive: true });
    });
  }

  /* ---------- 2) Bühne ------------------------------------------------------ */

  function buehne() {
    var b = document.querySelector('[data-buehne]');
    if (!b) return;
    var szene = b.querySelector('.buehne__szene'), leinwand = document.getElementById('stoff');
    var stoff = leinwand && M.stoff ? M.stoff(leinwand, b) : null;

    var ziel = { x: 0, y: 0 }, ist = { x: 0, y: 0 }, roll = 0, laeuft = false, sichtbar = true;

    function setze() {
      szene.style.setProperty('--tx', ist.x.toFixed(3));
      szene.style.setProperty('--ty', ist.y.toFixed(3));
      szene.style.setProperty('--roll', roll.toFixed(3));
    }
    function runde() {
      ist.x += (ziel.x - ist.x) * 0.07;
      ist.y += (ziel.y - ist.y) * 0.07;
      setze();
      if (sichtbar && (Math.abs(ziel.x - ist.x) > 0.002 || Math.abs(ziel.y - ist.y) > 0.002)) requestAnimationFrame(runde);
      else laeuft = false;
    }
    function los() { if (!laeuft && !ruhig) { laeuft = true; requestAnimationFrame(runde); } }

    if (feinerZeiger && !ruhig) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        ziel.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ziel.y = ((e.clientY - r.top) / r.height) * 2 - 1;
        los();
      }, { passive: true });
      b.addEventListener('pointerleave', function () { ziel.x = 0; ziel.y = 0; los(); });
    }

    var wartet = false;
    function rolle() {
      wartet = false;
      roll = Math.max(0, Math.min(1, window.scrollY / Math.max(1, b.offsetHeight)));
      if (stoff) stoff.rolle(roll);
      if (!ruhig) setze();
    }
    window.addEventListener('scroll', function () {
      if (!wartet && sichtbar) { wartet = true; requestAnimationFrame(rolle); }
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (t) { sichtbar = t[0].isIntersecting; }).observe(b);
    }
    rolle();

    /* Schwebende Karte: nächster freier Termin oder, wenn bekannt, die Tage bis zur Hochzeit */
    var karte = document.getElementById('naechster-termin');
    if (!karte) return;
    var marke = karte.querySelector('[data-marke]'), wann = karte.querySelector('[data-wann]');
    var hochzeit = M.fahrplan ? M.fahrplan.gemerkt() : null;
    if (hochzeit) {
      var tage = M.fahrplan.tageBis(hochzeit);
      marke.textContent = 'Ihr Hochzeits-Fahrplan';
      wann.textContent = tage === 0 ? 'Heute ist es so weit' : (tage === 1 ? 'Noch 1 Tag' : 'Noch ' + tage + ' Tage');
      karte.querySelector('.faden').firstChild.textContent = 'Fahrplan ansehen ';
      karte.href = '#fahrplan';
      karte.hidden = false;
    } else if (M.termine) {
      M.termine.naechster('beratung').then(function (t) {
        if (!t) return;
        var heute = M.zeit.jetzt().datum, d = M.zeit.teile(t.datum);
        var tag = t.datum === heute ? 'Heute'
          : (t.datum === M.zeit.plusTage(heute, 1) ? 'Morgen' : M.zeit.WOCHENTAGE[d.wochentag] + ', ' + d.tag + '. ' + M.zeit.MONATE[d.monat - 1]);
        wann.textContent = tag + ' · ' + t.uhr + ' Uhr';
        karte.href = 'termin.html?datum=' + t.datum;
        karte.hidden = false;
      }).catch(function () { /* Karte bleibt ausgeblendet */ });
    }
  }

  /* ---------- 3) Stilkunde -------------------------------------------------- */

  var STILE = ['anzug', 'gehrock', 'cutaway', 'smoking', 'stehkragen'];
  var NAMEN = ['Anzug', 'Gehrock', 'Cutaway', 'Smoking', 'Stehkragen'];

  function stilkunde() {
    var abschnitt = document.getElementById('stilkunde'), svg = document.getElementById('stilkunde-puppe');
    if (!abschnitt || !svg || !M.anzug) return;
    var looks = STILE.map(function (s) { return M.anzug.LOOKS[s]; });
    var puppe = M.anzug(svg, { look: looks[0] });
    var reiter = M.$$('[data-stil]', abschnitt), tafeln = M.$$('.stil', abschnitt), name = document.getElementById('stilkunde-name');
    var aktiv = 0, lauf = false;

    function markiere(i) {
      if (i === aktiv) return;
      aktiv = i;
      reiter.forEach(function (r, n) {
        r.setAttribute('aria-selected', n === i);
        r.tabIndex = n === i ? 0 : -1;
      });
      tafeln.forEach(function (t, n) { t.classList.toggle('aktiv', n === i); });
      name.textContent = NAMEN[i];
      var knopf = reiter[i], leiste = knopf.parentNode;
      if (leiste.scrollWidth > leiste.clientWidth) {
        leiste.scrollTo({ left: knopf.offsetLeft - (leiste.clientWidth - knopf.offsetWidth) / 2, behavior: ruhig ? 'auto' : 'smooth' });
      }
    }

    /* Angeheftet: Der Abschnitt ist mehrere Bildschirme hoch, die Puppe bleibt stehen
     * und wechselt mit dem Rollweg den Anzug. Auf sehr flachen Bildschirmen und bei
     * reduzierter Bewegung bleibt es bei den Reitern. */
    function pruefeLauf() {
      var soll = !ruhig && window.innerHeight >= 620 && window.CSS && CSS.supports('position', 'sticky');
      if (soll !== lauf) {
        lauf = soll;
        abschnitt.classList.toggle('stilkunde--lauf', lauf);
        if (!lauf) puppe.zeige(looks[aktiv]);
      }
    }

    function weg() {
      var r = abschnitt.getBoundingClientRect(), kopf = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kopfhoehe')) || 76;
      var strecke = abschnitt.offsetHeight - (window.innerHeight - kopf);
      return strecke > 0 ? Math.max(0, Math.min(1, (kopf - r.top) / strecke)) : 0;
    }

    var wartet = false;
    function rolle() {
      wartet = false;
      if (!lauf) return;
      var f = weg() * (STILE.length - 1), i = Math.min(STILE.length - 2, Math.floor(f)), rest = f - i;
      /* Jeder Schnitt bleibt eine Weile stehen, dazwischen wird übergeblendet */
      var t = Math.max(0, Math.min(1, (rest - 0.28) / 0.44));
      t = t * t * (3 - 2 * t);
      puppe.zwischen(looks[i], looks[i + 1], t);
      markiere(Math.round(f));
    }
    function melde() { if (!wartet) { wartet = true; requestAnimationFrame(rolle); } }

    function springe(i) {
      if (lauf) {
        var kopf = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kopfhoehe')) || 76;
        var strecke = abschnitt.offsetHeight - (window.innerHeight - kopf);
        var oben = abschnitt.getBoundingClientRect().top + window.scrollY - kopf;
        window.scrollTo({ top: oben + strecke * (i / (STILE.length - 1)), behavior: 'smooth' });
      } else {
        markiere(i);
        puppe.wechsle(looks[i], 900);
      }
    }

    reiter.forEach(function (r, i) {
      r.addEventListener('click', function () { springe(i); });
      r.addEventListener('keydown', function (e) {
        var ziel = e.key === 'ArrowRight' ? i + 1 : (e.key === 'ArrowLeft' ? i - 1 : (e.key === 'Home' ? 0 : (e.key === 'End' ? STILE.length - 1 : -1)));
        if (ziel < 0 || ziel >= STILE.length || ziel === i) return;
        e.preventDefault();
        reiter[ziel].focus({ preventScroll: true });
        springe(ziel);
      });
    });

    pruefeLauf();
    rolle();
    window.addEventListener('scroll', melde, { passive: true });
    window.addEventListener('resize', M.verzoegert(function () { pruefeLauf(); rolle(); }, 150));

    /* Wie viele Modelle es je Schnitt gibt */
    M.katalog.lade().then(function (k) {
      var zahl = { anzug: 0, gehrock: 0, cutaway: 0, smoking: 0, stehkragen: 0 };
      k.produkte.forEach(function (p) {
        if (p.k.indexOf('anzuege-uni') !== -1) zahl.anzug++;
        if (p.k.indexOf('hochzeitsanzuege') === -1) return;
        (p.t || []).forEach(function (t) { if (zahl[t] != null && t !== 'anzug') zahl[t]++; });
      });
      var wort = { anzug: ['Anzug', 'Anzüge'], gehrock: ['Gehrock', 'Gehröcke'], cutaway: ['Cutaway', 'Cutaways'], smoking: ['Smoking', 'Smokings'], stehkragen: ['Modell mit Stehkragen', 'Modelle mit Stehkragen'] };
      M.$$('[data-stilzahl]', abschnitt).forEach(function (el) {
        var s = el.dataset.stilzahl, n = zahl[s];
        if (n > 0) el.textContent = n + ' ' + wort[s][n === 1 ? 0 : 1] + ' ansehen';
      });
    }).catch(function () { /* Die Verweise bleiben, wie sie sind */ });
  }

  /* ---------- 4) Atelier-Anriss --------------------------------------------- */

  function anriss() {
    var svg = document.getElementById('anriss-puppe');
    if (!svg || !M.anzug) return;
    var looks = [
      { schnitt: 'gehrock', stoff: '#ece2cc', muster: 'jacquard', weste: '#cdb98c', westeMuster: 'jacquard', hals: 'plastron', halsFarbe: '#ece2cc', tuch: '#cdb98c' },
      { schnitt: 'anzug', stoff: '#3d5f9c', muster: 'karo', weste: '#3d5f9c', hals: 'krawatte', halsFarbe: '#1f2a44', tuch: '#ffffff' },
      { schnitt: 'smoking', stoff: '#5c1523', muster: 'uni', weste: null, hals: 'fliege', halsFarbe: '#101012', tuch: '#ffffff' },
      { schnitt: 'cutaway', stoff: '#7d8086', muster: 'uni', weste: '#e9dcc0', hals: 'plastron', halsFarbe: '#cfc5b0', tuch: '#ffffff' },
      { schnitt: 'stehkragen', stoff: '#27439b', muster: 'jacquard', weste: null, hals: 'ohne', tuch: '#c7a04c' }
    ];
    var puppe = M.anzug(svg, { look: looks[0] }), i = 0, uhr = null;
    if (ruhig || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (t) {
      if (t[0].isIntersecting && !uhr) {
        uhr = setInterval(function () {
          if (document.hidden) return;
          i = (i + 1) % looks.length;
          puppe.wechsle(looks[i], 1300);
        }, 3400);
      } else if (!t[0].isIntersecting && uhr) {
        clearInterval(uhr);
        uhr = null;
      }
    }, { threshold: 0.25 }).observe(svg);
  }

  /* ---------- 5) Auswahl aus der Kollektion --------------------------------- */

  function auswahl() {
    var bahn = document.getElementById('auswahl-bahn');
    if (!bahn) return;
    M.katalog.lade().then(function (k) {
      var liste = k.produkte.filter(function (p) { return p.k.indexOf('hochzeitsanzuege') !== -1; }).slice(0, 10);
      bahn.innerHTML = liste.map(function (p) { return M.karte(p, k); }).join('');
      M.laufreihe(bahn, M.$$('[data-reihe]'));
      var zahl = document.getElementById('artikelzahl');
      if (zahl) { zahl.dataset.zaehle = k.produkte.length; if (zahl.dataset.fertig) zahl.textContent = k.produkte.length; }
    }).catch(function () {
      bahn.innerHTML = '<p class="leise">Die Kollektion konnte gerade nicht geladen werden. <a href="kollektion.html">Zur Kollektion</a></p>';
    });
  }

  /* ---------- 6) Zähler ----------------------------------------------------- */

  function zaehler() {
    var felder = M.$$('[data-zaehle]');
    if (!felder.length || ruhig || !('IntersectionObserver' in window)) { felder.forEach(function (f) { f.dataset.fertig = '1'; }); return; }
    var auge = new IntersectionObserver(function (treffer) {
      treffer.forEach(function (t) {
        if (!t.isIntersecting) return;
        auge.unobserve(t.target);
        var feld = t.target, ziel = +feld.dataset.zaehle || 0, start = null, dauer = 1300;
        var von = Math.round(ziel * 0.4);
        (function schritt(jetzt) {
          if (start === null) start = jetzt;
          var f = Math.min(1, (jetzt - start) / dauer), weich = 1 - Math.pow(1 - f, 3);
          ziel = +feld.dataset.zaehle || ziel;
          feld.textContent = Math.round(von + (ziel - von) * weich);
          if (f < 1) requestAnimationFrame(schritt); else feld.dataset.fertig = '1';
        })(performance.now());
      });
    }, { threshold: 0.6 });
    felder.forEach(function (f) { auge.observe(f); });
  }

  /* ---------- 7) Knöpfe, die dem Zeiger entgegenkommen ----------------------- */

  function magnete() {
    if (!feinerZeiger || ruhig) return;
    M.$$('[data-magnet]').forEach(function (k) {
      var kraft = k.classList.contains('terminknopf') ? 0.12 : 0.22;
      k.addEventListener('pointermove', function (e) {
        var r = k.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * kraft, y = (e.clientY - (r.top + r.height / 2)) * kraft;
        k.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      k.addEventListener('pointerleave', function () { k.style.translate = ''; });
    });
  }

  M.bereit(function () {
    vorhang();
    buehne();
    stilkunde();
    anriss();
    auswahl();
    zaehler();
    magnete();
  });
})();
