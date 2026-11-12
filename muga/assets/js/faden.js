/* =============================================================================
 * faden.js — der rote Faden
 * -----------------------------------------------------------------------------
 * Ein roter Faden zieht sich über die ganze Startseite. Er beginnt als
 * Unterstrich unter der Überschrift, läuft beim Rollen an den Rändern der
 * Abschnitte entlang, wechselt zwischen ihnen die Seite und näht am Ende den
 * Knopf an, über den der Termin gebucht wird. An seiner Spitze sitzt die Nadel.
 *
 * Der Faden liegt über den Flächen der Abschnitte und unter ihrem Inhalt.
 * Er wird aus der Lage der Abschnitte berechnet und bei jeder Größenänderung
 * neu gelegt. Wer reduzierte Bewegung eingestellt hat, sieht ihn fertig vernäht.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, NS = 'http://www.w3.org/2000/svg';

  function el(name, werte, eltern) {
    var e = document.createElementNS(NS, name), k;
    for (k in werte) e.setAttribute(k, werte[k]);
    if (eltern) eltern.appendChild(e);
    return e;
  }
  function z(n) { return Math.round(n * 10) / 10; }

  M.bereit(function () {
    var svg = document.getElementById('faden'), inhalt = document.getElementById('inhalt');
    if (!svg || !inhalt) return;
    var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var knopf = document.getElementById('terminknopf');

    var defs = el('defs', {}, svg);
    var verlauf = el('linearGradient', { id: 'faden-farbe', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: 1000 }, defs);
    var stahl = el('linearGradient', { id: 'faden-stahl', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#ffffff' }, stahl);
    el('stop', { offset: 0.5, 'stop-color': '#c9c9d1' }, stahl);
    el('stop', { offset: 1, 'stop-color': '#7d7d88' }, stahl);
    var linie = el('path', { 'class': 'faden-linie', stroke: 'url(#faden-farbe)' }, svg);
    var nadel = el('g', { 'class': 'nadel' }, svg);
    /* Der Schatten ist mitgezeichnet: Filter auf Teilen einer Vektorgrafik kann nicht jeder Browser */
    el('path', { d: 'M0 0C5 -2.600 11 -2.300 17 -1.800L46 0L17 1.800C11 2.300 5 2.600 0 0Z', fill: '#000', opacity: 0.26, transform: 'translate(0.800 2.200)' }, nadel);
    el('path', { d: 'M0 0C5 -2.600 11 -2.300 17 -1.800L46 0L17 1.800C11 2.300 5 2.600 0 0Z', fill: 'url(#faden-stahl)', stroke: '#4f4f58', 'stroke-width': 0.5 }, nadel);
    el('ellipse', { cx: 6.500, cy: 0, rx: 3.300, ry: 0.800, fill: '#241d19' }, nadel);
    nadel.style.display = 'none';

    var SCHRITT = 8;
    var proben = [], laenge = 0, l0 = 0, i0 = 0, yStart = 0, yEnde = 0, rollEnde = 1;
    var ist = 0, soll = 0, laeuft = false, bereit = false, auftakt = false, massstab = 1;

    /* Lage eines Elements im Inhalt, unabhängig von laufenden Bewegungen */
    function lage(e) {
      var x = 0, y = 0, k = e;
      while (k && k !== inhalt) { x += k.offsetLeft; y += k.offsetTop; k = k.offsetParent; }
      return { x: x, y: y, b: e.offsetWidth, h: e.offsetHeight };
    }

    /* ---------- Den Faden legen --------------------------------------------- */

    function baue() {
      var B = inhalt.clientWidth, H = inhalt.offsetHeight;
      var schmal = B < 700;
      var huelle = inhalt.querySelector('.huelle');
      var innen = huelle ? lage(huelle).x + parseFloat(getComputedStyle(huelle).paddingLeft) : 20;
      var xl = Math.max(schmal ? 7 : 16, innen * 0.5), xr = B - xl;
      var q = schmal ? 52 : 86;            // halbe Höhe einer Querung
      var schlag = schmal ? 2.500 : 6;       // wie weit der Faden am Rand pendelt
      var r = schmal ? 15 : 26;            // Halbmesser einer Schlaufe
      massstab = schmal ? 0.74 : 1;
      svg.setAttribute('width', B);
      svg.setAttribute('height', H);

      var abschnitte = M.$$('[data-faden]', inhalt).filter(function (a) { return a.offsetHeight > 0; });
      if (!abschnitte.length) { laenge = 0; return; }
      var buehne = abschnitte[0];

      /* 1) Unterstrich unter den hervorgehobenen Worten der Überschrift */
      var em = inhalt.querySelector('[data-faden-unter]');
      var ux0 = xl, ux1 = xl + 120, uy = buehne.offsetTop + 200;
      if (em) {
        var basis = lage(em), kaesten = em.getClientRects(), groesse = parseFloat(getComputedStyle(em).fontSize) || 40;
        var erste = kaesten[0], letzte = kaesten[kaesten.length - 1];
        if (erste && letzte) {
          ux0 = basis.x + (letzte.left - erste.left) + 2;
          ux1 = ux0 + letzte.width - 4;
          uy = basis.y + (letzte.bottom - erste.top) - groesse * 0.1;
        }
      }
      var breite = ux1 - ux0;
      var unter = 'M' + z(ux0) + ' ' + z(uy + 1) + 'C' + z(ux0 + breite * 0.3) + ' ' + z(uy - 4.500) + ' ' + z(ux0 + breite * 0.62) + ' ' + z(uy + 5.500) + ' ' + z(ux1) + ' ' + z(uy - 0.500);

      /* 2) Von dort in die Bahn der Bühne: zwischen Text und Bild, schmal am rechten Rand */
      var text = buehne.querySelector('.buehne__text'), szene = buehne.querySelector('.buehne__szene');
      var xh = xr;
      if (text && szene) {
        var t = lage(text), s = lage(szene);
        if (s.x > t.x + t.b - 4) xh = Math.max((t.x + t.b + s.x) / 2, Math.min(ux1 + 30, s.x - 12));
      }
      var d = unter;
      var x = xh, y = uy + (schmal ? 46 : 70);
      d += 'C' + z(ux1 + 28) + ' ' + z(uy - 3) + ' ' + z(xh) + ' ' + z(uy + 2) + ' ' + z(x) + ' ' + z(y);

      /* Leicht pendelnde Bahn am Rand entlang */
      function bahn(bis) {
        var strecke = bis - y;
        if (strecke < 24) { if (strecke > 0) { d += 'L' + z(x) + ' ' + z(bis); y = bis; } return; }
        var n = Math.max(1, Math.round(strecke / (schmal ? 170 : 240))), teil = strecke / n, i;
        for (i = 0; i < n; i++) {
          d += 'C' + z(x + schlag) + ' ' + z(y + teil / 3) + ' ' + z(x - schlag) + ' ' + z(y + teil * 2 / 3) + ' ' + z(x) + ' ' + z(y + teil);
          y += teil;
        }
      }

      /* Wechsel auf die andere Seite, auf Wunsch mit einer Schlaufe in der Mitte */
      function quere(nach, grenze, schlaufe) {
        var von = x, oben = grenze - q, unten = grenze + q;
        if (Math.abs(nach - von) < 2) { bahn(unten); return; }
        if (!schlaufe) {
          d += 'C' + z(von) + ' ' + z(grenze) + ' ' + z(nach) + ' ' + z(grenze) + ' ' + z(nach) + ' ' + z(unten);
        } else {
          /* Die Schlaufe ist ein einziger Bogen, der sich selbst kreuzt, wie mit der Hand gezogen */
          var ri = nach > von ? 1 : -1, mitte = (von + nach) / 2, w = r * 0.5, hoch = r * 3.100;
          var ax = mitte - ri * w, bx = mitte + ri * w;
          var tx = ri * 3.200 * w, ty = -hoch, tl = Math.sqrt(tx * tx + ty * ty), zug = Math.min(Math.abs(nach - von) * 0.2, r * 2.600);
          var ex = tx / tl * zug, ey = ty / tl * zug;
          d += 'C' + z(von) + ' ' + z(grenze + q * 0.300) + ' ' + z(ax - ex) + ' ' + z(grenze - ey) + ' ' + z(ax) + ' ' + z(grenze);
          d += 'C' + z(mitte + ri * 2.200 * w) + ' ' + z(grenze - hoch) + ' ' + z(mitte - ri * 2.200 * w) + ' ' + z(grenze - hoch) + ' ' + z(bx) + ' ' + z(grenze);
          d += 'C' + z(bx + ex) + ' ' + z(grenze - ey) + ' ' + z(nach) + ' ' + z(grenze - q * 0.300) + ' ' + z(nach) + ' ' + z(unten);
        }
        x = nach; y = unten;
      }

      /* 3) Abschnitt für Abschnitt */
      var vorher = buehne.offsetTop + buehne.offsetHeight, wechsel = 0, endeX = B / 2, endeY = H - 100, i;
      for (i = 1; i < abschnitte.length; i++) {
        var a = abschnitte[i], art = a.dataset.faden, oben = a.offsetTop, grenze = (vorher + oben) / 2;
        /* Der erste Wechsel liegt noch ganz in der Bühne, damit er nicht hinter Text läuft */
        if (i === 1) grenze = vorher - q;
        if (art === 'finale') {
          if (knopf) { var k = lage(knopf); endeX = k.x + k.b / 2; endeY = k.y + k.h / 2; }
          bahn(grenze - q);
          d += 'C' + z(x) + ' ' + z(endeY + 26) + ' ' + z(endeX + (x - endeX) * 0.5) + ' ' + z(endeY + 16) + ' ' + z(endeX) + ' ' + z(endeY);
          x = endeX; y = endeY;
          break;
        }
        var nach = art === 'links' ? xl : xr;
        bahn(grenze - q);
        if (Math.abs(nach - x) > 2) wechsel++;
        quere(nach, grenze, wechsel % 3 === 0 && wechsel > 0 && !schmal);
        vorher = oben + a.offsetHeight;
      }
      if (i >= abschnitte.length) { bahn(vorher - 40); endeX = x; endeY = y; }

      /* 4) Farbe: auf dunklen Abschnitten heller, damit der Faden überall trägt */
      verlauf.setAttribute('y2', H);
      verlauf.textContent = '';
      var stil = getComputedStyle(document.documentElement);
      var rot = stil.getPropertyValue('--faden').trim() || '#bd1e27', hellrot = stil.getPropertyValue('--faden-hell').trim() || '#ef6a62';
      Array.prototype.forEach.call(inhalt.children, function (kind) {
        if (kind === svg || !kind.offsetHeight) return;
        var dunkel = kind.matches('.buehne, .abschnitt--nacht, .nacht, .laufband');
        var farbe = dunkel ? hellrot : rot;
        el('stop', { offset: z(kind.offsetTop / H * 1000) / 1000, 'stop-color': farbe }, verlauf);
        el('stop', { offset: z((kind.offsetTop + kind.offsetHeight) / H * 1000) / 1000, 'stop-color': farbe }, verlauf);
      });

      /* 5) Vermessen: Länge des Unterstrichs, dann Stützpunkte entlang des ganzen Fadens */
      linie.setAttribute('d', unter);
      l0 = linie.getTotalLength();
      linie.setAttribute('d', d);
      laenge = linie.getTotalLength();
      proben = [];
      var anzahl = Math.ceil(laenge / SCHRITT), tief = -1e9, p;
      for (i = 0; i <= anzahl; i++) {
        p = linie.getPointAtLength(Math.min(laenge, i * SCHRITT));
        tief = Math.max(tief, p.y);
        proben.push({ x: p.x, y: p.y, m: tief });
      }
      i0 = Math.min(proben.length - 1, Math.ceil(l0 / SCHRITT));
      yStart = proben[i0].m;
      yEnde = endeY;
      var seitenOben = inhalt.getBoundingClientRect().top + window.scrollY;
      var weg = document.documentElement.scrollHeight - window.innerHeight;
      rollEnde = Math.max(1, Math.min(weg, seitenOben + endeY - window.innerHeight * 0.68));
    }

    /* ---------- Zeichnen ----------------------------------------------------- */

    function setze() {
      if (!laenge) return;
      linie.setAttribute('stroke-dasharray', z(ist) + ' ' + Math.ceil(laenge + 20));
      var f = ist / SCHRITT, i = Math.max(0, Math.min(proben.length - 2, Math.floor(f))), rest = Math.min(1, f - i);
      var a = proben[i], b = proben[i + 1], c = proben[Math.min(proben.length - 1, i + 2)];
      var px = a.x + (b.x - a.x) * rest, py = a.y + (b.y - a.y) * rest;
      var winkel = Math.atan2(c.y - a.y, c.x - a.x) * 180 / Math.PI;
      nadel.setAttribute('transform', 'translate(' + z(px) + ' ' + z(py) + ') rotate(' + z(winkel) + ') scale(' + massstab + ')');
      if (knopf) knopf.classList.toggle('genaeht', ist >= laenge - 4);
    }

    /* Wie weit der Faden beim aktuellen Rollweg gezogen sein soll */
    function ziel() {
      var s = Math.max(0, Math.min(1, window.scrollY / rollEnde));
      if (s >= 1) return laenge;
      var y = yStart + s * (yEnde - yStart), lo = i0, hi = proben.length - 1, mitte;
      while (lo < hi) { mitte = (lo + hi) >> 1; if (proben[mitte].m >= y) hi = mitte; else lo = mitte + 1; }
      return Math.max(l0, Math.min(laenge, lo * SCHRITT));
    }

    /* Der Faden folgt dem Rollen weich, aber nie träge: Das Tempo hängt an der Zeit,
     * nicht an der Bildrate, und auf den letzten Metern gilt ein Mindesttempo. */
    var zuletzt = 0;
    function runde(jetzt) {
      var dt = Math.min(64, zuletzt ? jetzt - zuletzt : 16), rest = soll - ist;
      zuletzt = jetzt;
      var schritt = Math.max(Math.abs(rest) * (1 - Math.exp(-dt / 105)), dt * 0.09);
      if (Math.abs(rest) <= schritt) { ist = soll; laeuft = false; zuletzt = 0; }
      else { ist += rest > 0 ? schritt : -schritt; requestAnimationFrame(runde); }
      setze();
    }
    function melde() {
      if (!bereit || auftakt) return;
      soll = ziel();
      if (!laeuft) { laeuft = true; requestAnimationFrame(runde); }
    }

    function neu() {
      if (!bereit) return;
      baue();
      soll = ruhig ? laenge : ziel();
      ist = soll;
      setze();
    }

    function start() {
      baue();
      if (!laenge) return;
      bereit = true;
      if (ruhig) {
        ist = soll = laenge;
        setze();
      } else {
        nadel.style.display = '';
        if (window.scrollY > 4) {
          ist = soll = ziel();
          setze();
        } else {
          /* Erst wird der Unterstrich gezogen, danach folgt der Faden dem Rollen */
          auftakt = true;
          var beginn = null, dauer = 950;
          (function zieh(jetzt) {
            if (beginn === null) beginn = jetzt;
            var f = Math.min(1, (jetzt - beginn) / dauer);
            ist = l0 * (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);
            setze();
            if (f < 1) requestAnimationFrame(zieh);
            else { auftakt = false; soll = ist = l0; melde(); }
          })(performance.now());
        }
        window.addEventListener('scroll', melde, { passive: true });
      }
      var spaeter = M.verzoegert(neu, 140);
      window.addEventListener('resize', spaeter);
      if ('ResizeObserver' in window) new ResizeObserver(spaeter).observe(inhalt);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(spaeter);
    }

    /* Der Faden kommt, wenn die Überschrift aufgestiegen ist */
    var takt = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--auftakt')) || 0.05;
    setTimeout(start, ruhig ? 60 : takt * 1000 + 1250);
  });
})();
