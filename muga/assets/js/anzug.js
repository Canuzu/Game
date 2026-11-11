/* =============================================================================
 * anzug.js — die Schneiderpuppe
 * -----------------------------------------------------------------------------
 * Zeichnet eine Schneiderpuppe als Vektorgrafik und zieht ihr einen Anzug an.
 * Der Anzug ist nicht gemalt, sondern berechnet: Jeder Schnitt besteht aus
 * einer Handvoll Zahlen (Saumlänge, Knopfhöhe, Reversform …). Zwischen zwei
 * Schnitten wird einfach zwischen diesen Zahlen übergeblendet. So verwandelt
 * sich ein Sakko fließend in einen Gehrock, einen Cutaway oder einen Smoking.
 *
 *   var puppe = MUGA.anzug(svgElement);
 *   puppe.zeige(look);            // sofort
 *   puppe.wechsle(look, 900);     // weich, in Millisekunden
 *   puppe.zwischen(a, b, 0.4);    // Zwischenstand, z. B. beim Rollen
 *
 * Ein Look: { schnitt, stoff, muster, weste, westeMuster, hals, halsFarbe, tuch, hemd }
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA = window.MUGA || {};
  var NS = 'http://www.w3.org/2000/svg';
  var X = 240;          // Mittelachse der Zeichnung (Zeichenfläche 480 × 680)
  var nummer = 0;       // jede Puppe bekommt eigene Kennungen für Muster und Verläufe

  /* ---------- Farben --------------------------------------------------------- */

  function rgb(h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16) || 0;
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function farbe(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
  function misch(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function hell(c, t) { return misch(c, [255, 255, 255], t); }
  function dunkel(c, t) { return misch(c, [0, 0, 0], t); }
  function licht(c) { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }

  /* ---------- Schnitte -------------------------------------------------------
   * saum     Höhe des Saums            weite    halbe Saumweite
   * eckeX    Abstand der vorderen Ecke von der Mitte (groß = weggeschnitten)
   * schwung  wie früh die Vorderkante zur Seite schwingt (Cutaway = 1)
   * knopfY   Höhe des obersten Knopfs = Ende des Revers
   * qf, v, k, t   Lage von Spiegelnaht, Kerbe, Kragenspitze und Reversspitze
   * bauch    Wölbung der Reverskante   naht  Spiegelnaht sichtbar
   * kragen   Umlegekragen              steh  Stehkragen
   * seide    Seidenspiegel             tasche/patte  Taschen und ihre Klappen
   * taille   Taillennaht               westeV  Ausschnitttiefe der Weste
   * -------------------------------------------------------------------------- */
  var SCHNITT = {
    anzug:      { saum: 476, weite: 101, eckeX: 27, schwung: 0, knopfY: 312, knoepfe: 2, abstand: 50, qf: 0.17, vx: 27, vy: 24, kx: 37, ky: 9,  tx: 47, ty: 30,  bauch: 25, naht: 1, kragen: 1, steh: 0, seide: 0, tasche: 1, patte: 1, taille: 0, westeV: 206 },
    gehrock:    { saum: 600, weite: 112, eckeX: -4, schwung: 0, knopfY: 284, knoepfe: 2, abstand: 48, qf: 0.2,  vx: 26, vy: 22, kx: 35, ky: 9,  tx: 44, ty: 27,  bauch: 23, naht: 1, kragen: 1, steh: 0, seide: 0, tasche: 1, patte: 1, taille: 1, westeV: 158 },
    cutaway:    { saum: 600, weite: 108, eckeX: 98, schwung: 1, knopfY: 316, knoepfe: 1, abstand: 48, qf: 0.18, vx: 27, vy: 21, kx: 35, ky: 12, tx: 51, ty: -3,  bauch: 27, naht: 1, kragen: 1, steh: 0, seide: 0, tasche: 0, patte: 0, taille: 1, westeV: 200 },
    smoking:    { saum: 476, weite: 101, eckeX: 25, schwung: 0, knopfY: 328, knoepfe: 1, abstand: 50, qf: 0.15, vx: 27, vy: 23, kx: 23, ky: 9,  tx: 31, ty: 39,  bauch: 28, naht: 0, kragen: 1, steh: 0, seide: 1, tasche: 1, patte: 0, taille: 0, westeV: 220 },
    stehkragen: { saum: 508, weite: 104, eckeX: 1,  schwung: 0, knopfY: 119, knoepfe: 7, abstand: 40, qf: 0.5,  vx: 0,  vy: 0,  kx: 0,  ky: 0,  tx: 0,  ty: 0,   bauch: 0,  naht: 0, kragen: 0, steh: 1, seide: 0, tasche: 1, patte: 0, taille: 0, westeV: 150 }
  };

  var MUSTER = ['nadelstreifen', 'karo', 'fischgrat', 'jacquard'];

  /* Übersetzt einen Look in Zahlen, zwischen denen sich überblenden lässt. */
  function zahlen(look) {
    look = look || {};
    var s = SCHNITT[look.schnitt] || SCHNITT.anzug, z = {}, k;
    for (k in s) z[k] = s[k];
    var stoff = rgb(look.stoff || '#1f2a44');
    z.stoff = stoff;
    z.hemd = rgb(look.hemd || '#fdfcf8');
    z.westeDa = look.weste ? 1 : 0;
    z.weste = look.weste ? rgb(look.weste) : stoff;
    z.westeMuster = look.weste && look.westeMuster === 'jacquard' ? 1 : 0;
    var hals = look.hals || 'krawatte';
    z.kra = hals === 'krawatte' ? 1 : 0;
    z.fli = hals === 'fliege' ? 1 : 0;
    z.pla = hals === 'plastron' ? 1 : 0;
    z.hals = rgb(look.halsFarbe || '#7d1820');
    z.tuchDa = look.tuch ? 1 : 0;
    z.tuch = look.tuch ? rgb(look.tuch) : [255, 255, 255];
    MUSTER.forEach(function (m) { z['m_' + m] = look.muster === m ? 1 : 0; });
    return z;
  }

  function zwischenwert(a, b, t) {
    var z = {}, k;
    for (k in a) z[k] = typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * t : misch(a[k], b[k], t);
    /* Unsichtbare Teile übernehmen die Farbe der Seite, auf der sie zu sehen sind */
    if (!a.westeDa && b.westeDa) z.weste = b.weste;
    if (a.westeDa && !b.westeDa) z.weste = a.weste;
    if (!a.tuchDa && b.tuchDa) z.tuch = b.tuch;
    if (a.tuchDa && !b.tuchDa) z.tuch = a.tuch;
    var ha = a.kra + a.fli + a.pla, hb = b.kra + b.fli + b.pla;
    if (!ha && hb) z.hals = b.hals;
    if (ha && !hb) z.hals = a.hals;
    return z;
  }

  /* ---------- Pfade ---------------------------------------------------------- */

  /* Baut einen Pfad aus Abständen zur Mittelachse. seite = 1 zeichnet die rechte
   * Bildhälfte, seite = -1 spiegelt denselben Pfad auf die linke. */
  function bahn(seite) {
    var t = '';
    function p(dx, y) { return (Math.round((X + seite * dx) * 10) / 10) + ' ' + (Math.round(y * 10) / 10); }
    var b = {
      M: function (x, y) { t += 'M' + p(x, y); return b; },
      L: function (x, y) { t += 'L' + p(x, y); return b; },
      Q: function (a, c, x, y) { t += 'Q' + p(a, c) + ' ' + p(x, y); return b; },
      C: function (a, c, d, e, x, y) { t += 'C' + p(a, c) + ' ' + p(d, e) + ' ' + p(x, y); return b; },
      Z: function () { t += 'Z'; return b; },
      aus: function () { return t; }
    };
    return b;
  }

  var HALS = [35, 97];   // hier trifft die Bruchlinie des Revers auf den Hals

  /* Punkte, die mehrere Teile brauchen */
  function geruest(z) {
    var E = [-9, z.knopfY];
    var Q = [HALS[0] + (E[0] - HALS[0]) * z.qf, HALS[1] + (E[1] - HALS[1]) * z.qf];
    return {
      E: E, Q: Q,
      V: [Q[0] + z.vx, Q[1] + z.vy],
      K: [Q[0] + z.kx, Q[1] + z.ky],
      T: [Q[0] + z.tx, Q[1] + z.ty],
      yb: z.knopfY + 9 + (z.knoepfe - 1) * z.abstand + 15     // hier endet die gerade Vorderkante
    };
  }

  function vorderteil(z, g, s) {
    var K = [z.eckeX, z.saum + 3], dx = K[0] + 9, dy = K[1] - g.yb, w = z.schwung;
    var c1 = [-9 + w * 0.25 * dx, g.yb + (0.55 - 0.25 * w) * dy];
    var c2 = [-9 + (0.4 + 0.25 * w) * dx, K[1] - w * 0.12 * dy];
    return bahn(s).M(HALS[0], HALS[1]).L(116, 127)
      .C(121, 150, 111, 176, 108, 196)
      .C(104, 250, 91, 292, 91, 330)
      .C(91, 372, z.weite, z.saum - 80, z.weite, z.saum)
      .Q((z.weite + K[0]) / 2, z.saum + 7, K[0], K[1])
      .C(c2[0], c2[1], c1[0], c1[1], -9, g.yb)
      .L(g.E[0], g.E[1]).Z().aus();
  }

  function aermel(s) {
    return bahn(s).M(113, 127).C(128, 132, 139, 190, 141, 290).C(142, 350, 139, 410, 136, 449)
      .L(105, 452).C(104, 400, 101, 330, 101, 285).C(101, 240, 103, 212, 106, 190).C(108, 160, 110, 140, 113, 127).Z().aus();
  }

  function ruecken(z) {
    var w = z.weite - 3, y = z.saum - 2;
    return bahn(1).M(-88, 300).L(88, 300).C(88, 372, w, y - 80, w, y).Q(0, y + 6, -w, y).C(-w, y - 80, -88, 372, -88, 300).Z().aus();
  }

  function revers(z, g, s) {
    var T = g.T, E = g.E, h = E[1] - T[1];
    return bahn(s).M(g.Q[0], g.Q[1]).L(g.V[0], g.V[1]).L(T[0], T[1])
      .C(T[0] - 1, T[1] + h * 0.38, E[0] + z.bauch, E[1] - h * 0.3, E[0], E[1]).Z().aus();
  }

  function kragen(z, g, s) {
    var o = z.kragen;
    return bahn(s).M(31, 88).L(31 + 9 * o, 87 - o).L(HALS[0] + 13 * o, HALS[1] + 4 * o)
      .L(g.K[0], g.K[1]).L(g.V[0], g.V[1]).L(g.Q[0], g.Q[1]).L(HALS[0], HALS[1]).Z().aus();
  }

  function stehkragen(s) {
    return bahn(s).M(1.5, 121).L(2.5, 99).Q(20, 92, 36, 84).L(41, 101).Q(22, 109, 1.5, 121).Z().aus();
  }

  /* Alles links der rechten Bruchlinie: Dahinter verschwindet die Spitze des linken Revers */
  function schnittkante(g) {
    return bahn(1).M(HALS[0] + 1, HALS[1] - 60).L(HALS[0], HALS[1]).L(g.E[0], g.E[1]).L(g.E[0], g.E[1] + 40).L(-240, g.E[1] + 40).L(-240, 0).Z().aus();
  }

  function weste(z) {
    var v = z.westeV;
    return bahn(1).M(-33, 98).L(0, v).L(33, 98).L(66, 112).L(100, 200).L(90, 372).L(24, 417).L(0, 401)
      .L(-24, 417).L(-90, 372).L(-100, 200).L(-66, 112).Z().aus();
  }

  /* ---------- Aufbau der Zeichnung ------------------------------------------- */

  function el(name, werte, eltern) {
    var e = document.createElementNS(NS, name), k;
    for (k in werte) e.setAttribute(k, werte[k]);
    if (eltern) eltern.appendChild(e);
    return e;
  }

  function musterInhalt(art) {
    if (art === 'nadelstreifen') return { b: 12, h: 12, d: 'M6 0V12', w: 1 };
    if (art === 'karo') return { b: 36, h: 36, d: 'M0 .5H36M.5 0V36M0 18.500H36M18.500 0V36', w: 0.9 };
    if (art === 'fischgrat') return { b: 20, h: 12, d: 'M0 6L10 0M0 12L10 6M0 18L10 12M10 0L20 6M10 6L20 12M10 -6L20 0', w: 1.1 };
    /* Jacquard: Ranke aus vier Blättern, in den Ecken kleine Rauten */
    return { b: 46, h: 46, d: 'M23 5c6.500 6 6.500 11 0 17c-6.500-6-6.500-11 0-17zM23 41c6.500-6 6.500-11 0-17c-6.500 6-6.500 11 0 17zM5 23c6-6.500 11-6.500 17 0c-6 6.500-11 6.500-17 0zM41 23c-6-6.500-11-6.500-17 0c6 6.500 11 6.500 17 0zM0 -5l5 5-5 5-5-5zM46 -5l5 5-5 5-5-5zM0 41l5 5-5 5-5-5zM46 41l5 5-5 5-5-5z', w: 0.9, f: 1 };
  }

  M.anzug = function (svg, wahl) {
    wahl = wahl || {};
    var nr = ++nummer, kn = function (name) { return 'p' + nr + '-' + name; };
    svg.textContent = '';
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 480 680');

    var defs = el('defs', {}, svg);

    /* Verläufe */
    function verlauf(name, werte, stufen) {
      var v = el('linearGradient', werte, defs);
      v.id = kn(name);
      return stufen.map(function (o) { return el('stop', { offset: o }, v); });
    }
    var vStoff = verlauf('stoff', { gradientUnits: 'userSpaceOnUse', x1: 120, y1: 0, x2: 360, y2: 0 }, [0, 0.2, 0.5, 0.8, 1]);
    var vAermel = verlauf('aermel', { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.45, 1]);
    var vWeste = verlauf('weste', { gradientUnits: 'userSpaceOnUse', x1: 150, y1: 0, x2: 330, y2: 0 }, [0, 0.5, 1]);
    var vSeide = verlauf('seide', { gradientUnits: 'userSpaceOnUse', x1: 170, y1: 110, x2: 300, y2: 330 }, [0, 0.42, 0.55, 1]);
    ['#1d1d22', '#0c0c0e', '#3d3d46', '#09090b'].forEach(function (c, i) { vSeide[i].setAttribute('stop-color', c); });
    var vLicht = verlauf('licht', { gradientUnits: 'userSpaceOnUse', x1: 120, y1: 90, x2: 360, y2: 560 }, [0, 0.5, 1]);
    vLicht[0].setAttribute('stop-color', '#fff'); vLicht[0].setAttribute('stop-opacity', '0.13');
    vLicht[1].setAttribute('stop-color', '#fff'); vLicht[1].setAttribute('stop-opacity', '0');
    vLicht[2].setAttribute('stop-color', '#000'); vLicht[2].setAttribute('stop-opacity', '0.16');
    var vBueste = verlauf('bueste', { gradientUnits: 'userSpaceOnUse', x1: 130, y1: 0, x2: 350, y2: 0 }, [0, 0.45, 1]);
    ['#cdbd9f', '#efe4cf', '#c6b596'].forEach(function (c, i) { vBueste[i].setAttribute('stop-color', c); });
    var vMessing = verlauf('messing', { gradientUnits: 'userSpaceOnUse', x1: 232, y1: 0, x2: 248, y2: 0 }, [0, 0.4, 1]);
    ['#8a6a35', '#e2c98f', '#7a5c27'].forEach(function (c, i) { vMessing[i].setAttribute('stop-color', c); });
    var vHolz = verlauf('holz', { gradientUnits: 'userSpaceOnUse', x1: 205, y1: 0, x2: 275, y2: 0 }, [0, 0.4, 1]);
    ['#5a3d22', '#9a6f43', '#4b3119'].forEach(function (c, i) { vHolz[i].setAttribute('stop-color', c); });
    var schattenV = el('radialGradient', { id: kn('boden') }, defs);
    el('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': 0.34 }, schattenV);
    el('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0 }, schattenV);

    /* Stoffmuster: einmal gerade für Rumpf und Ärmel, zweimal gedreht für die Revers */
    var musterStriche = {};
    function muster(art, lage, drehung) {
      var m = musterInhalt(art);
      var p = el('pattern', { id: kn(art + '-' + lage), width: m.b, height: m.h, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(' + drehung + ' 240 200)' + (art === 'jacquard' ? ' scale(0.72)' : '') }, defs);
      var strich = el('path', { d: m.d, fill: m.f ? 'currentColor' : 'none', 'fill-opacity': 0.5, stroke: 'currentColor', 'stroke-width': m.w }, p);
      if (lage !== 'weste') (musterStriche[art] = musterStriche[art] || []).push(strich);
      return strich;
    }
    MUSTER.forEach(function (art) { muster(art, 'rumpf', 0); muster(art, 'links', -24); muster(art, 'rechts', 24); });
    var westeStrich = muster('jacquard', 'weste', 0);
    /* feiner Köper, damit auch einfarbiger Stoff nach Gewebe aussieht */
    var koeper = el('pattern', { id: kn('koeper'), width: 5, height: 5, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M-1 6L6 -1M-1 1L1 -1M4 6L6 4', stroke: '#fff', 'stroke-opacity': 0.055, 'stroke-width': 1, fill: 'none' }, koeper);

    /* Schnittmasken */
    var maskeRumpf = el('clipPath', { id: kn('rumpf') }, defs);
    var mR = [0, 1, 2, 3, 4, 5].map(function () { return el('path', {}, maskeRumpf); });
    var maskeLinks = el('clipPath', { id: kn('revers-links') }, defs), mL = [el('path', {}, maskeLinks), el('path', {}, maskeLinks)];
    var maskeRechts = el('clipPath', { id: kn('revers-rechts') }, defs), mRe = [el('path', {}, maskeRechts), el('path', {}, maskeRechts)];
    var maskeKante = el('clipPath', { id: kn('kante') }, defs), mK = el('path', {}, maskeKante);
    var maskeWeste = el('clipPath', { id: kn('westenform') }, defs), mW = el('path', {}, maskeWeste);

    /* --- Ständer und Büste ---------------------------------------------------- */
    el('ellipse', { cx: X, cy: 660, rx: 112, ry: 12, fill: 'url(#' + kn('boden') + ')' }, svg);
    var teilRuecken = el('path', {}, svg);
    var teilSchlitz = el('path', { fill: 'none', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, svg);

    var staender = el('g', {}, svg);
    el('ellipse', { cx: X, cy: 652, rx: 64, ry: 9.500, fill: '#6f5226' }, staender);
    el('ellipse', { cx: X, cy: 649.500, rx: 64, ry: 9, fill: 'url(#' + kn('messing') + ')', style: 'transform-box:fill-box' }, staender);
    el('ellipse', { cx: X, cy: 648, rx: 46, ry: 5.500, fill: '#f0dcae', opacity: 0.35 }, staender);
    el('rect', { x: X - 5, y: 500, width: 10, height: 148, fill: 'url(#' + kn('messing') + ')' }, staender);
    el('rect', { x: X - 9, y: 545, width: 18, height: 9, rx: 2, fill: 'url(#' + kn('messing') + ')', stroke: '#6f5226', 'stroke-width': 0.6 }, staender);
    el('circle', { cx: X + 14, cy: 549.500, r: 4.200, fill: '#d9bd80', stroke: '#6f5226', 'stroke-width': 0.6 }, staender);
    el('rect', { x: X + 8, y: 548, width: 4, height: 3, fill: '#8a6a35' }, staender);

    var bueste = el('g', {}, svg);
    /* Bodenplatte aus Holz */
    el('path', { d: 'M150 498Q240 522 330 498L326 510Q240 532 154 510Z', fill: 'url(#' + kn('holz') + ')' }, bueste);
    /* Rumpf aus Leinen */
    el('path', { d: 'M213 62L210 98C196 106 150 116 136 128C126 137 128 160 132 190C137 240 152 292 152 330C152 372 142 420 146 500Q240 524 334 500C338 420 328 372 328 330C328 292 343 240 348 190C352 160 354 137 344 128C330 116 284 106 270 98L267 62Z', fill: 'url(#' + kn('bueste') + ')', stroke: '#a8946f', 'stroke-width': 0.8 }, bueste);
    el('path', { d: 'M240 66V512', fill: 'none', stroke: '#a8854a', 'stroke-width': 1, 'stroke-dasharray': '5 4', opacity: 0.75 }, bueste);
    el('path', { d: 'M147 470Q240 494 333 470', fill: 'none', stroke: '#a8854a', 'stroke-width': 1, 'stroke-dasharray': '5 4', opacity: 0.6 }, bueste);
    /* Halskappe */
    el('path', { d: 'M209 52h62a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-62a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z', fill: 'url(#' + kn('holz') + ')' }, bueste);
    el('path', { d: 'M228 52c0-7 4-9 5-13h14c1 4 5 6 5 13z', fill: 'url(#' + kn('holz') + ')' }, bueste);
    el('circle', { cx: X, cy: 33, r: 8, fill: 'url(#' + kn('messing') + ')', stroke: '#6f5226', 'stroke-width': 0.6 }, bueste);
    el('circle', { cx: X - 2.500, cy: 30.500, r: 2.400, fill: '#fff', opacity: 0.55 }, bueste);

    /* --- Hemd ----------------------------------------------------------------- */
    var hemd = el('g', {}, svg);
    var teilHemd = el('path', { d: 'M202 92L278 92L290 128L262 420L218 420L190 128Z' }, hemd);
    el('path', { d: 'M240 122V418', fill: 'none', stroke: '#000', 'stroke-opacity': 0.13, 'stroke-width': 1 }, hemd);
    [150, 182, 214, 246, 278].forEach(function (y) { el('circle', { cx: X, cy: y, r: 2.200, fill: '#fff', stroke: '#000', 'stroke-opacity': 0.25, 'stroke-width': 0.6 }, hemd); });
    var teilHemdband = el('path', { d: 'M210 88Q240 97 270 88L273 103Q240 114 207 103Z' }, hemd);

    /* --- Krawatte und Plastron (stecken unter der Weste) ----------------------- */
    var krawatte = el('g', {}, svg);
    var kraBlatt = el('path', { d: 'M233.500 124L246.500 124L257 348L240 372L223 348Z' }, krawatte);
    var kraSchatten = el('path', { d: 'M240 124L246.500 124L257 348L240 372Z', fill: '#000', opacity: 0.16 }, krawatte);
    var kraKnoten = el('path', { d: 'M230.500 106Q240 103 249.500 106L246.500 126Q240 129 233.500 126Z' }, krawatte);
    el('path', { d: 'M233 118Q240 122 247 118', fill: 'none', stroke: '#000', 'stroke-opacity': 0.25, 'stroke-width': 1 }, krawatte);

    var plastron = el('g', {}, svg);
    var plaBlatt = el('path', { d: 'M229 124C212 150 204 200 207 290L273 290C276 200 268 150 251 124Z' }, plastron);
    var plaFalten = el('path', { d: 'M236 130C228 170 225 215 227 288M245 130C253 170 256 215 254 288M240 132V288', fill: 'none', 'stroke-width': 1.1, 'stroke-linecap': 'round' }, plastron);
    var plaKnoten = el('path', { d: 'M225 104Q240 99 255 104L251 127Q240 133 229 127Z' }, plastron);
    el('circle', { cx: X, cy: 148, r: 4, fill: '#fbf6ea', stroke: '#a8854a', 'stroke-width': 1 }, plastron);
    el('circle', { cx: X - 1.200, cy: 146.800, r: 1.200, fill: '#fff' }, plastron);

    /* --- Weste ---------------------------------------------------------------- */
    var westeG = el('g', {}, svg);
    var teilWeste = el('path', { fill: 'url(#' + kn('weste') + ')', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, westeG);
    var westeMuster = el('rect', { x: 120, y: 80, width: 240, height: 360, fill: 'url(#' + kn('jacquard-weste') + ')', 'clip-path': 'url(#' + kn('westenform') + ')' }, westeG);
    var westeKnoepfe = el('g', {}, westeG);
    var wKnopf = [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return el('circle', { cx: X, r: 3.100, 'stroke-width': 0.7 }, westeKnoepfe); });

    /* --- Hemdkragen und Fliege -------------------------------------------------- */
    var kragenG = el('g', {}, svg);
    var hemdKragen = [el('path', { d: 'M240 106L209 87L203 101L225 133Z', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, kragenG),
                      el('path', { d: 'M240 106L271 87L277 101L255 133Z', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, kragenG)];
    var fliege = el('g', {}, svg);
    var fliFluegel = [el('path', { d: 'M236 110L207 99Q203 115 207 131L236 120Z', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, fliege),
                      el('path', { d: 'M244 110L273 99Q277 115 273 131L244 120Z', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, fliege)];
    el('path', { d: 'M212 108Q218 115 212 123M268 108Q262 115 268 123', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.14, 'stroke-width': 1.2, 'stroke-linecap': 'round' }, fliege);
    var fliKnoten = el('rect', { x: X - 6, y: 107, width: 12, height: 16, rx: 3.500 }, fliege);

    /* --- Sakko ---------------------------------------------------------------- */
    var sakko = el('g', {}, svg);
    var vorn = [el('path', { fill: 'url(#' + kn('stoff') + ')', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, sakko),
                el('path', { fill: 'url(#' + kn('stoff') + ')', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, sakko)];
    var manschetten = el('path', { d: bahn(1).M(105.500, 451).L(136, 448).L(136.500, 457).L(105.500, 460).Z().aus() + bahn(-1).M(105.500, 451).L(136, 448).L(136.500, 457).L(105.500, 460).Z().aus(), 'stroke-width': 0.6 }, sakko);
    var arm = [el('path', { d: aermel(-1), fill: 'url(#' + kn('aermel') + ')', 'stroke-width': 0.9 }, sakko),
               el('path', { d: aermel(1), fill: 'url(#' + kn('aermel') + ')', 'stroke-width': 0.9 }, sakko)];
    var steh = el('g', {}, sakko);
    var stehTeil = [el('path', { d: stehkragen(-1), 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, steh),
                    el('path', { d: stehkragen(1), 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, steh)];

    var flaeche = { x: 80, y: 60, width: 320, height: 580 };
    function decke(fuellung, maske, eltern) {
      return el('rect', { x: flaeche.x, y: flaeche.y, width: flaeche.width, height: flaeche.height, fill: fuellung, 'clip-path': 'url(#' + kn(maske) + ')' }, eltern);
    }
    decke('url(#' + kn('koeper') + ')', 'rumpf', sakko);
    var musterRumpf = {};
    MUSTER.forEach(function (art) { musterRumpf[art] = decke('url(#' + kn(art + '-rumpf') + ')', 'rumpf', sakko); });
    decke('url(#' + kn('licht') + ')', 'rumpf', sakko);

    /* Nähte, Taschen */
    var naehte = el('g', { fill: 'none', 'stroke-linecap': 'round' }, sakko);
    var abnaeher = el('path', { d: bahn(1).M(52, 250).Q(57, 320, 60, 392).aus() + bahn(-1).M(52, 250).Q(57, 320, 60, 392).aus(), 'stroke-width': 0.9, opacity: 0.55 }, naehte);
    var taillennaht = el('path', { 'stroke-width': 1 }, naehte);
    var aermelnaht = el('path', { d: bahn(1).M(127, 150).C(134, 230, 134, 340, 130, 448).aus() + bahn(-1).M(127, 150).C(134, 230, 134, 340, 130, 448).aus(), 'stroke-width': 0.8, opacity: 0.4 }, naehte);
    var taschen = el('g', {}, sakko);
    var paspel = el('path', { d: bahn(1).M(47, 398).L(97, 393).aus() + bahn(-1).M(47, 398).L(97, 393).aus(), fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' }, taschen);
    var patten = el('path', { d: bahn(1).M(46, 397).L(97.500, 392).L(98.500, 408).Q(72, 414, 46.500, 412).Z().aus() + bahn(-1).M(46, 397).L(97.500, 392).L(98.500, 408).Q(72, 414, 46.500, 412).Z().aus(), 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, taschen);
    var brusttasche = el('path', { d: 'M296 215L333 208L334 214.500L297 221.500Z', 'stroke-width': 0.6 }, taschen);
    var aermelKnoepfe = el('g', {}, sakko);
    [-1, 1].forEach(function (s) { [424, 432, 440].forEach(function (y) { el('circle', { cx: X + s * 132.500, cy: y, r: 2.200, 'stroke-width': 0.5 }, aermelKnoepfe); }); });

    /* Einstecktuch: sitzt in der Brusttasche, das Revers liegt darüber */
    var tuch = el('g', {}, svg);
    var tuchTeil = el('path', { d: 'M299 217L303 199L311 209L318 195L324 207L330 198L332 211Z', 'stroke-width': 0.7, 'stroke-linejoin': 'round' }, tuch);
    el('path', { d: 'M311 209L309 216M324 207L322 214', fill: 'none', stroke: '#000', 'stroke-opacity': 0.18, 'stroke-width': 0.7 }, tuch);

    /* Revers und Kragen, links unter rechts */
    function reversgruppe(seite, maskeName) {
      var g = el('g', seite < 0 ? { 'clip-path': 'url(#' + kn('kante') + ')' } : {}, svg);
      var teile = {
        kragen: el('path', { 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, g),
        revers: el('path', { 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, g),
        muster: {}
      };
      MUSTER.forEach(function (art) {
        teile.muster[art] = decke('url(#' + kn(art + (seite < 0 ? '-links' : '-rechts')) + ')', maskeName, g);
      });
      decke('url(#' + kn('licht') + ')', maskeName, g);
      teile.seide = decke('url(#' + kn('seide') + ')', maskeName, g);
      teile.kante = el('path', { fill: 'none', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, g);
      teile.knopfloch = el('path', { fill: 'none', 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);
      return teile;
    }
    var links = reversgruppe(-1, 'revers-links'), rechts = reversgruppe(1, 'revers-rechts');

    /* Knöpfe */
    var knoepfe = el('g', {}, svg);
    var knopf = [0, 1, 2, 3, 4, 5, 6, 7].map(function () {
      var g = el('g', {}, knoepfe);
      return { g: g, a: el('circle', { r: 5.600, 'stroke-width': 0.8 }, g), b: el('circle', { r: 3.300, fill: 'none', 'stroke-width': 0.7 }, g) };
    });

    /* ---------- Zeichnen ------------------------------------------------------ */

    var stand = null;

    function zeichne(z) {
      stand = z;
      var g = geruest(z), s = z.stoff, i;
      var dunkelStoff = licht(s) < 0.42;
      var rand = farbe(dunkel(s, dunkelStoff ? 0.5 : 0.38));
      var nahtfarbe = farbe(dunkelStoff ? hell(s, 0.22) : dunkel(s, 0.3));

      /* Stoff: Verlauf über die Breite für etwas Körper */
      [dunkel(s, 0.3), s, hell(s, dunkelStoff ? 0.1 : 0.05), s, dunkel(s, 0.3)].forEach(function (c, n) { vStoff[n].setAttribute('stop-color', farbe(c)); });
      [dunkel(s, 0.34), hell(s, dunkelStoff ? 0.06 : 0.02), dunkel(s, 0.26)].forEach(function (c, n) { vAermel[n].setAttribute('stop-color', farbe(c)); });

      /* Rücken und Schöße: das Futter ist dunkler */
      teilRuecken.setAttribute('d', ruecken(z));
      teilRuecken.setAttribute('fill', farbe(dunkel(s, 0.52)));
      teilSchlitz.setAttribute('d', 'M240 392V' + (z.saum + 1).toFixed(1));
      teilSchlitz.setAttribute('stroke', farbe(dunkel(s, 0.72)));

      /* Vorderteile */
      var dl = vorderteil(z, g, -1), dr = vorderteil(z, g, 1);
      vorn[0].setAttribute('d', dl); vorn[1].setAttribute('d', dr);
      vorn[0].setAttribute('stroke', rand); vorn[1].setAttribute('stroke', rand);
      arm[0].setAttribute('stroke', rand); arm[1].setAttribute('stroke', rand);
      mR[0].setAttribute('d', dl); mR[1].setAttribute('d', dr);
      mR[2].setAttribute('d', aermel(-1)); mR[3].setAttribute('d', aermel(1));
      mR[4].setAttribute('d', z.steh > 0.02 ? stehkragen(-1) : ''); mR[5].setAttribute('d', z.steh > 0.02 ? stehkragen(1) : '');

      /* Stehkragen */
      steh.setAttribute('opacity', Math.min(1, z.steh * 1.6).toFixed(3));
      steh.style.display = z.steh > 0.02 ? '' : 'none';
      stehTeil[0].setAttribute('fill', farbe(hell(s, dunkelStoff ? 0.05 : 0)));
      stehTeil[1].setAttribute('fill', farbe(hell(s, dunkelStoff ? 0.09 : 0.03)));
      stehTeil[0].setAttribute('stroke', rand); stehTeil[1].setAttribute('stroke', rand);

      /* Stoffmuster */
      var musterfarbe = dunkelStoff ? '#fff' : '#000', deckung = dunkelStoff ? 0.3 : 0.2;
      MUSTER.forEach(function (art) {
        var w = z['m_' + art];
        musterStriche[art].forEach(function (p) { p.setAttribute('color', musterfarbe); });
        [musterRumpf[art], links.muster[art], rechts.muster[art]].forEach(function (r) {
          r.style.display = w > 0.01 ? '' : 'none';
          r.setAttribute('opacity', (w * deckung * (art === 'jacquard' ? 0.8 : 1)).toFixed(3));
        });
      });

      /* Nähte und Taschen */
      naehte.setAttribute('stroke', farbe(dunkel(s, dunkelStoff ? 0.55 : 0.35)));
      taillennaht.setAttribute('d', bahn(1).M(-8, 338).Q(45, 342, 92, 334).aus() + bahn(-1).M(8, 338).Q(45, 342, 92, 334).aus());
      taillennaht.setAttribute('opacity', (z.taille * 0.7).toFixed(3));
      taschen.setAttribute('opacity', z.tasche.toFixed(3));
      taschen.style.display = z.tasche > 0.02 ? '' : 'none';
      paspel.setAttribute('stroke', farbe(dunkel(s, 0.55)));
      patten.setAttribute('fill', farbe(hell(s, dunkelStoff ? 0.04 : 0)));
      patten.setAttribute('stroke', rand);
      patten.setAttribute('opacity', z.patte.toFixed(3));
      brusttasche.setAttribute('fill', farbe(dunkel(s, 0.28)));
      brusttasche.setAttribute('stroke', rand);
      aermelKnoepfe.setAttribute('fill', farbe(dunkelStoff ? hell(s, 0.18) : dunkel(s, 0.4)));
      aermelKnoepfe.setAttribute('stroke', rand);

      /* Revers und Kragen */
      var reversFarbe = farbe(hell(s, dunkelStoff ? 0.07 : 0.03)), kragenFarbe = farbe(hell(s, dunkelStoff ? 0.05 : 0.02));
      mK.setAttribute('d', schnittkante(g));
      [[links, -1, mL], [rechts, 1, mRe]].forEach(function (satz) {
        var t = satz[0], seite = satz[1], maske = satz[2];
        var dRevers = revers(z, g, seite), dKragen = kragen(z, g, seite);
        t.revers.setAttribute('d', dRevers); t.revers.setAttribute('fill', reversFarbe); t.revers.setAttribute('stroke', rand);
        t.kragen.setAttribute('d', dKragen); t.kragen.setAttribute('fill', kragenFarbe); t.kragen.setAttribute('stroke', rand);
        t.kragen.setAttribute('opacity', Math.min(1, z.kragen * 2.5).toFixed(3));
        maske[0].setAttribute('d', dRevers); maske[1].setAttribute('d', z.kragen > 0.05 ? dKragen : '');
        t.seide.setAttribute('opacity', z.seide.toFixed(3));
        t.seide.style.display = z.seide > 0.01 ? '' : 'none';
        /* Spiegelnaht und Außenkante noch einmal als feine Linie über Muster und Seide */
        t.kante.setAttribute('d', dRevers + (z.kragen > 0.05 ? dKragen : ''));
        t.kante.setAttribute('stroke', rand);
        t.kante.setAttribute('opacity', (0.35 + 0.65 * z.naht).toFixed(3));
        /* Knopfloch im linken Revers des Trägers (rechts im Bild) */
        if (seite > 0) {
          var kx = g.V[0] + (g.T[0] - g.V[0]) * 0.45, ky = g.V[1] + (g.T[1] - g.V[1]) * 0.45 + 13;
          t.knopfloch.setAttribute('d', bahn(1).M(kx - 5, ky + 2.500).L(kx + 5, ky - 1.500).aus());
          t.knopfloch.setAttribute('stroke', rand);
          t.knopfloch.setAttribute('opacity', (z.naht * (1 - z.seide) * 0.8).toFixed(3));
        }
      });

      /* Knöpfe */
      var knopfFarbe = z.seide > 0.5 ? [22, 22, 26] : (dunkelStoff ? hell(s, 0.16) : dunkel(s, 0.45));
      for (i = 0; i < knopf.length; i++) {
        var sichtbar = Math.max(0, Math.min(1, z.knoepfe - i));
        knopf[i].g.style.display = sichtbar > 0.01 ? '' : 'none';
        if (sichtbar <= 0.01) continue;
        knopf[i].g.setAttribute('opacity', sichtbar.toFixed(3));
        knopf[i].g.setAttribute('transform', 'translate(' + X + ' ' + (z.knopfY + 9 + i * z.abstand).toFixed(1) + ')');
        knopf[i].a.setAttribute('fill', farbe(knopfFarbe));
        knopf[i].a.setAttribute('stroke', farbe(dunkel(knopfFarbe, 0.55)));
        knopf[i].b.setAttribute('stroke', farbe(dunkelStoff ? hell(knopfFarbe, 0.25) : dunkel(knopfFarbe, 0.35)));
      }

      /* Hemd */
      var h = z.hemd;
      teilHemd.setAttribute('fill', farbe(h));
      teilHemdband.setAttribute('fill', farbe(dunkel(h, 0.06)));
      hemdKragen.forEach(function (k) { k.setAttribute('fill', farbe(h)); k.setAttribute('stroke', farbe(dunkel(h, 0.26))); });
      manschetten.setAttribute('fill', farbe(h));
      manschetten.setAttribute('stroke', farbe(dunkel(h, 0.26)));

      /* Weste */
      var w = z.weste, dunkleWeste = licht(w) < 0.42;
      westeG.style.display = z.westeDa > 0.01 ? '' : 'none';
      westeG.setAttribute('opacity', Math.min(1, z.westeDa * 1.4).toFixed(3));
      if (z.westeDa > 0.01) {
        var dW = weste(z);
        teilWeste.setAttribute('d', dW); mW.setAttribute('d', dW);
        [dunkel(w, 0.2), hell(w, dunkleWeste ? 0.08 : 0.04), dunkel(w, 0.2)].forEach(function (c, n) { vWeste[n].setAttribute('stop-color', farbe(c)); });
        teilWeste.setAttribute('stroke', farbe(dunkel(w, dunkleWeste ? 0.5 : 0.3)));
        westeMuster.style.display = z.westeMuster > 0.01 ? '' : 'none';
        westeMuster.setAttribute('opacity', (z.westeMuster * (dunkleWeste ? 0.3 : 0.24)).toFixed(3));
        westeStrich.setAttribute('color', dunkleWeste ? '#fff' : '#5a4320');
        for (i = 0; i < wKnopf.length; i++) {
          var y = z.westeV + 16 + i * 27;
          wKnopf[i].style.display = y < 398 ? '' : 'none';
          wKnopf[i].setAttribute('cy', y.toFixed(1));
          wKnopf[i].setAttribute('fill', farbe(dunkleWeste ? hell(w, 0.2) : dunkel(w, 0.32)));
          wKnopf[i].setAttribute('stroke', farbe(dunkel(w, 0.55)));
        }
      }

      /* Halsschmuck */
      var hf = z.hals, dunklerHals = licht(hf) < 0.42;
      krawatte.style.display = z.kra > 0.01 ? '' : 'none';
      krawatte.setAttribute('opacity', z.kra.toFixed(3));
      kraBlatt.setAttribute('fill', farbe(hf));
      kraKnoten.setAttribute('fill', farbe(hell(hf, dunklerHals ? 0.1 : 0.03)));
      kraKnoten.setAttribute('stroke', farbe(dunkel(hf, 0.4))); kraKnoten.setAttribute('stroke-width', 0.7);
      kraSchatten.setAttribute('opacity', dunklerHals ? 0.2 : 0.1);
      plastron.style.display = z.pla > 0.01 ? '' : 'none';
      plastron.setAttribute('opacity', z.pla.toFixed(3));
      plaBlatt.setAttribute('fill', farbe(hf));
      plaKnoten.setAttribute('fill', farbe(hell(hf, dunklerHals ? 0.1 : 0.04)));
      plaKnoten.setAttribute('stroke', farbe(dunkel(hf, 0.3))); plaKnoten.setAttribute('stroke-width', 0.7);
      plaFalten.setAttribute('stroke', farbe(dunkel(hf, dunklerHals ? 0.45 : 0.16)));
      fliege.style.display = z.fli > 0.01 ? '' : 'none';
      fliege.setAttribute('opacity', z.fli.toFixed(3));
      fliege.setAttribute('transform', 'translate(240 115) scale(' + (0.7 + 0.3 * z.fli).toFixed(3) + ') translate(-240 -115)');
      fliFluegel.forEach(function (f) { f.setAttribute('fill', farbe(hell(hf, dunklerHals ? 0.07 : 0))); f.setAttribute('stroke', farbe(dunkel(hf, 0.5))); });
      fliKnoten.setAttribute('fill', farbe(hell(hf, dunklerHals ? 0.14 : 0.05)));

      /* Einstecktuch */
      tuch.style.display = z.tuchDa > 0.01 ? '' : 'none';
      tuch.setAttribute('opacity', z.tuchDa.toFixed(3));
      tuch.setAttribute('transform', 'translate(0 ' + ((1 - z.tuchDa) * 12).toFixed(1) + ')');
      tuchTeil.setAttribute('fill', farbe(z.tuch));
      tuchTeil.setAttribute('stroke', farbe(dunkel(z.tuch, 0.3)));
    }

    /* ---------- Bewegung ------------------------------------------------------ */

    var lauf = 0, lookJetzt = null;

    function weich(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    var puppe = {
      zeige: function (look) {
        lauf++;
        lookJetzt = look;
        zeichne(zahlen(look));
        return puppe;
      },
      zwischen: function (a, b, t) {
        lauf++;
        lookJetzt = t < 0.5 ? a : b;
        zeichne(t <= 0 ? zahlen(a) : (t >= 1 ? zahlen(b) : zwischenwert(zahlen(a), zahlen(b), t)));
        return puppe;
      },
      wechsle: function (look, dauer) {
        var von = stand, nach = zahlen(look), meiner = ++lauf, start = null;
        lookJetzt = look;
        if (!von || !dauer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { zeichne(nach); return puppe; }
        (function schritt(jetzt) {
          if (meiner !== lauf) return;
          if (start === null) start = jetzt;
          var t = Math.min(1, (jetzt - start) / dauer);
          zeichne(t >= 1 ? nach : zwischenwert(von, nach, weich(t)));
          if (t < 1) requestAnimationFrame(schritt);
        })(performance.now());
        return puppe;
      },
      look: function () { return lookJetzt; },
      svg: svg
    };

    puppe.zeige(wahl.look || M.anzug.LOOKS.anzug);
    return puppe;
  };

  /* ---------- Vorlagen und Auswahl für das Atelier ---------------------------- */

  M.anzug.LOOKS = {
    anzug:      { schnitt: 'anzug', stoff: '#1f2a44', muster: 'uni', weste: null, hals: 'krawatte', halsFarbe: '#7d1820', tuch: '#ffffff' },
    gehrock:    { schnitt: 'gehrock', stoff: '#2a2c33', muster: 'uni', weste: '#e2d0aa', westeMuster: 'jacquard', hals: 'plastron', halsFarbe: '#e2d0aa', tuch: '#e2d0aa' },
    cutaway:    { schnitt: 'cutaway', stoff: '#3b3d44', muster: 'fischgrat', weste: '#cfc7b6', hals: 'plastron', halsFarbe: '#b9bcc0', tuch: '#ffffff' },
    smoking:    { schnitt: 'smoking', stoff: '#16161a', muster: 'uni', weste: null, hals: 'fliege', halsFarbe: '#0e0e10', tuch: '#ffffff' },
    stehkragen: { schnitt: 'stehkragen', stoff: '#5c1523', muster: 'jacquard', weste: null, hals: 'ohne', tuch: null }
  };

  M.anzug.SCHNITTE = [
    { id: 'anzug', name: 'Anzug', text: 'Sakko mit fallendem Revers' },
    { id: 'gehrock', name: 'Gehrock', text: 'Knielang und festlich' },
    { id: 'cutaway', name: 'Cutaway', text: 'Vorn schräg, hinten lang' },
    { id: 'smoking', name: 'Smoking', text: 'Schalkragen mit Seidenspiegel' },
    { id: 'stehkragen', name: 'Stehkragen', text: 'Hoch geschlossen, ohne Revers' }
  ];
  M.anzug.STOFFE = [
    { id: 'schwarz', name: 'Schwarz', ton: '#17171a' },
    { id: 'anthrazit', name: 'Anthrazit', ton: '#34363c' },
    { id: 'grau', name: 'Grau', ton: '#7d8086' },
    { id: 'hellgrau', name: 'Hellgrau', ton: '#b4b6ba' },
    { id: 'dunkelblau', name: 'Dunkelblau', ton: '#1f2a44' },
    { id: 'royalblau', name: 'Royalblau', ton: '#27439b' },
    { id: 'bordeaux', name: 'Bordeaux', ton: '#5c1523' },
    { id: 'braun', name: 'Braun', ton: '#5f432e' },
    { id: 'gruen', name: 'Grün', ton: '#24493a' },
    { id: 'beige', name: 'Beige', ton: '#cdb890' },
    { id: 'creme', name: 'Creme', ton: '#ece2cc' }
  ];
  M.anzug.MUSTER = [
    { id: 'uni', name: 'Uni' },
    { id: 'nadelstreifen', name: 'Nadelstreifen' },
    { id: 'karo', name: 'Karo' },
    { id: 'fischgrat', name: 'Fischgrat' },
    { id: 'jacquard', name: 'Jacquard' }
  ];
  M.anzug.BEIWERK = [
    { id: 'weiss', name: 'Weiß', ton: '#ffffff' },
    { id: 'creme', name: 'Creme', ton: '#e9dcc0' },
    { id: 'champagner', name: 'Champagner', ton: '#e2d0aa' },
    { id: 'silber', name: 'Silber', ton: '#b9bcc0' },
    { id: 'schwarz', name: 'Schwarz', ton: '#101012' },
    { id: 'dunkelblau', name: 'Dunkelblau', ton: '#1f2a44' },
    { id: 'royalblau', name: 'Royalblau', ton: '#2f4fa3' },
    { id: 'bordeaux', name: 'Bordeaux', ton: '#7d1820' },
    { id: 'rosa', name: 'Altrosa', ton: '#cf9aa2' },
    { id: 'flieder', name: 'Flieder', ton: '#9c86c2' },
    { id: 'gruen', name: 'Grün', ton: '#2f6b4a' },
    { id: 'gold', name: 'Gold', ton: '#c7a04c' }
  ];
  M.anzug.HALS = [
    { id: 'krawatte', name: 'Krawatte' },
    { id: 'fliege', name: 'Fliege' },
    { id: 'plastron', name: 'Plastron' },
    { id: 'ohne', name: 'Ohne' }
  ];
})();
