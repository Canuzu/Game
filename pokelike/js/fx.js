/* =============================================================================
 * fx.js — Kampfeffekte und Übergänge
 * -----------------------------------------------------------------------------
 * Vorher gab es drei Bewegungen für alle Attacken: ein Ring für Status, ein
 * Ausfallschritt für Physisch, ein Geschoss für Spezial. Nur die Farbe
 * wechselte. Ein Flammenwurf sah damit aus wie ein Aquaknarre in Rot.
 *
 * In den Vorbildern hat jede Attacke ihren eigenen Auftritt, aber sie folgen
 * einer gemeinsamen Sprache: Der Angreifer holt aus, am Ziel passiert etwas
 * Typisches, das Ziel blinkt und wird zurückgeworfen, bei harten Treffern
 * ruckelt das Bild. Genau diese Sprache steht hier — als Bausteine aus
 * Pixeln, nicht als geladene Bilder.
 *
 * Gliederung:
 *   1) Hilfen            — Farben, Punkte, Zeit
 *   2) Bausteine         — Strahl, Wurf, Fall, Aufstieg, Bahn, Wirbel, Hieb …
 *   3) Reaktion          — Blinken, Rückstoß, Ruckeln, Aufblitzen
 *   4) Choreografien     — eine je Typ
 *   5) Eigene Auftritte  — für Attacken, die jeder kennt
 *   6) move()            — setzt zusammen und sagt, wie lange es dauert
 *   7) Übergang          — der Wischer beim Kampfstart
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  var doc = root.document;

  /* ---------- 1) Hilfen ----------------------------------------------------- */

  function reduced() {
    return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var WASSER = null;   // wird beim ersten Gebrauch gefüllt

  function colorOf(type) {
    var map = (PL.ui && PL.ui.TYPE_COLOR) || {};
    if (!WASSER) WASSER = map.Water || '#4aa8e8';
    return map[type] || '#dddddd';
  }

  /** Ein hellerer und ein dunklerer Ton derselben Farbe — für Tiefe. */
  function hell(c) { return 'color-mix(in srgb, ' + c + ' 55%, #ffffff)'; }
  function dunkel(c) { return 'color-mix(in srgb, ' + c + ' 70%, #101418)'; }

  function centre(el, stage) {
    var a = el.getBoundingClientRect(), b = stage.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2,
      w: a.width, h: a.height, boden: a.bottom - b.top };
  }

  function layerFor(stage) {
    var layer = stage.querySelector('.fx-layer');
    if (!layer) {
      layer = doc.createElement('div');
      layer.className = 'fx-layer';
      stage.appendChild(layer);
    }
    return layer;
  }

  /**
   * Eine gezeichnete Form aus css/effekte.css. »bunt« bringt ihre Farben
   * mit (Flamme, Blitz, Blatt), eine Maske ist nur ein Umriss und nimmt die
   * Farbe des Attackentyps an.
   */
  function form(l, x, y, gr, name, tint, extra, hoch) {
    var e = doc.createElement('i');
    var maske = MASKENFORMEN[name];
    var h = hoch || gr;
    e.className = (maske ? 'fx-maske fx-maske-' : 'fx-form fx-form-') + name +
      (extra ? ' ' + extra : '');
    e.style.left = Math.round(x - gr / 2) + 'px';
    e.style.top = Math.round(y - h / 2) + 'px';
    e.style.width = Math.round(gr) + 'px';
    e.style.height = Math.round(h) + 'px';
    if (maske && tint) e.style.setProperty('--tint', tint);
    l.appendChild(e);
    return e;
  }
  var MASKENFORMEN = { stoss: 1, funke: 1, kralle: 1, wirbelform: 1, pfeilauf: 1,
    ringform: 1, blase: 1, staub: 1 };

  /** Ein Pixelklotz. Breite und Höhe getrennt, damit auch Striche gehen. */
  function bit(layer, x, y, w, h, color, extra) {
    var b = doc.createElement('i');
    b.className = 'fx-bit' + (extra ? ' ' + extra : '');
    b.style.left = Math.round(x - w / 2) + 'px';
    b.style.top = Math.round(y - h / 2) + 'px';
    b.style.width = w + 'px';
    b.style.height = h + 'px';
    b.style.background = color;
    b.style.color = color;
    layer.appendChild(b);
    return b;
  }

  function animate(node, frames, ms, verzug) {
    if (!node.animate) { root.setTimeout(function () { node.remove(); }, ms + (verzug || 0)); return null; }
    var anim = node.animate(frames, {
      duration: ms, delay: verzug || 0, easing: 'linear', fill: 'both'
    });
    anim.onfinish = function () { node.remove(); };
    return anim;
  }

  function zufall(a, b) { return a + Math.random() * (b - a); }
  function schiebe(dx, dy, s) {
    return 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px)' + (s !== undefined ? ' scale(' + s + ')' : '');
  }

  /* ---------- 2) Bausteine ---------------------------------------------------
   * Jeder Baustein legt Pixel an und lässt sie laufen. Keiner weiß etwas über
   * Typen oder Attacken — das entscheidet die Choreografie weiter unten.
   * ------------------------------------------------------------------------ */

  /** Ein Platzen an einer Stelle: der Aufschlag und Staub nach außen. */
  function platzen(l, at, color, anzahl, weite, ms, groesse) {
    var i, w = groesse || 30;
    // In der Mitte der Aufschlag selbst.
    var kern = form(l, at.x, at.y, w * 2.2, 'stoss', color);
    animate(kern, [
      { transform: 'scale(.2)', opacity: 1 },
      { transform: 'scale(1.1)', opacity: 1, offset: 0.45 },
      { transform: 'scale(1.5)', opacity: 0 }
    ], ms);
    // Darum herum Staub.
    for (i = 0; i < anzahl; i++) {
      var ang = (Math.PI * 2 * i) / anzahl + zufall(-0.3, 0.3);
      var d = weite * zufall(0.55, 1.1);
      var b = form(l, at.x, at.y, w * zufall(0.5, 0.9), 'staub', i % 3 ? color : hell(color));
      animate(b, [
        { transform: schiebe(0, 0, 0.5), opacity: 1 },
        { transform: schiebe(Math.cos(ang) * d, Math.sin(ang) * d, 1), opacity: 0 }
      ], ms);
    }
  }

  /** Ein Strahl vom Angreifer zum Ziel — Hyperstrahl, Eisstrahl, Blitzkanone. */
  function strahl(l, from, to, color, ms, dicke) {
    var dx = to.x - from.x, dy = to.y - from.y;
    var laenge = Math.sqrt(dx * dx + dy * dy), n = Math.max(6, Math.round(laenge / 14));
    var i;
    for (i = 0; i < n; i++) {
      var t = i / (n - 1);
      // Der Strahl bleibt ein harter Balken — Rasterpunkt an Rasterpunkt,
      // ohne Schein. Vorn sitzt ein Funke als Spitze.
      var b = bit(l, from.x + dx * t, from.y + dy * t, dicke || 10, dicke || 10,
        i % 2 ? color : hell(color), 'fx-hart');
      animate(b, [
        { transform: schiebe(0, 0, 0.2), opacity: 0 },
        { transform: schiebe(0, 0, 1), opacity: 1, offset: 0.25 },
        { transform: schiebe(0, 0, 1), opacity: 1, offset: 0.7 },
        { transform: schiebe(0, 0, 0.4), opacity: 0 }
      ], ms, i * 14);
    }
    var spitze = form(l, to.x, to.y, (dicke || 10) * 3.2, 'funke', hell(color));
    animate(spitze, [
      { transform: 'scale(.2)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1, offset: 0.4 },
      { transform: 'scale(1.4)', opacity: 0 }
    ], ms * 0.7, n * 12);
  }

  /** Etwas fliegt im Bogen hinüber und zerplatzt. */
  function wurf(l, from, to, color, ms, anzahl, hoehe, gestalt) {
    var i, count = anzahl || 6;
    for (i = 0; i < count; i++) {
      var b = form(l, from.x, from.y, gestalt === 'blatt' ? 34 : 30,
        gestalt === 'blatt' ? 'blatt' : 'stoss', color, gestalt === 'blatt' ? 'fx-dreht' : '');
      var streu = (i - count / 2) * 6;
      animate(b, [
        { transform: schiebe(0, 0, 0.7), opacity: 0 },
        { transform: schiebe((to.x - from.x) / 2, (to.y - from.y) / 2 - (hoehe || 30) + streu, 1), opacity: 1, offset: 0.5 },
        { transform: schiebe(to.x - from.x, to.y - from.y + streu * 0.2, 1), opacity: 1 }
      ], ms, i * 22);
    }
  }

  /** Etwas kommt von oben herunter — Blitz, Steinhagel, Meteor. */
  function fallen(l, at, color, anzahl, ms, gestalt) {
    var i;
    for (i = 0; i < anzahl; i++) {
      var x = at.x + zufall(-at.w * 0.45, at.w * 0.45);
      var b = form(l, x, at.y - 150, gestalt === 'blitz' ? 64 : 38,
        gestalt === 'blitz' ? 'blitz' : 'stein', color);
      animate(b, [
        { transform: schiebe(0, 0), opacity: 0 },
        { transform: schiebe(gestalt === 'blitz' ? 0 : zufall(-8, 8), 60), opacity: 1, offset: 0.3 },
        { transform: schiebe(gestalt === 'blitz' ? 0 : zufall(-8, 8), 150), opacity: 1, offset: 0.85 },
        { transform: schiebe(0, 160), opacity: 0 }
      ], ms, i * 45);
    }
    root.setTimeout(function () { platzen(l, at, color, 8, 34, 240); }, ms * 0.55);
  }

  /** Etwas kommt von unten hoch — Erdbeben, Wurzeln, Stachel. */
  function steigen(l, at, color, anzahl, ms) {
    var i;
    for (i = 0; i < anzahl; i++) {
      var x = at.x + zufall(-at.w * 0.5, at.w * 0.5);
      var b = form(l, x, at.boden, zufall(22, 38), 'stein', color);
      animate(b, [
        { transform: schiebe(0, 20, 0.4), opacity: 0 },
        { transform: schiebe(0, -zufall(20, 55), 1), opacity: 1, offset: 0.45 },
        { transform: schiebe(zufall(-14, 14), -zufall(40, 90), 0.7), opacity: 0 }
      ], ms, i * 35);
    }
  }

  /** Eine Bahn quer über die Bühne — Surfer, Flammenmeer, Sturm. */
  function bahn(l, stage, color, ms, vonLinks) {
    var kasten = stage.getBoundingClientRect();
    // Eine Wand, keine Treppe: Alle Formen stehen übereinander und ziehen
    // gemeinsam durch. Vorher liefen sie versetzt hintereinander her, und
    // aus der Welle wurde eine Perlenschnur.
    var i, reihen = 6, hoch = kasten.height * 0.62 / reihen;
    for (i = 0; i < reihen; i++) {
      var y = kasten.height * 0.34 + hoch * (i + 0.5);
      var b = form(l, vonLinks ? -70 : kasten.width + 70, y, hoch * 1.7,
        color === WASSER ? 'welle' : 'stoss', color, '', hoch * 1.25);
      animate(b, [
        { transform: schiebe(0, 0), opacity: 0 },
        { transform: schiebe(vonLinks ? 70 : -70, 0), opacity: 1, offset: 0.12 },
        { transform: schiebe(vonLinks ? kasten.width + 110 : -kasten.width - 110, zufall(-8, 8)), opacity: 1, offset: 0.92 },
        { transform: schiebe(vonLinks ? kasten.width + 150 : -kasten.width - 150, 0), opacity: 0 }
      ], ms, i * 8);
    }
  }

  /** Ein Wirbel um eine Stelle — Psycho, Drache, Geist. */
  function wirbel(l, at, color, ms, runden) {
    var i, n = 14;
    for (i = 0; i < n; i++) {
      var b = form(l, at.x, at.y, 30, 'wirbelform', color);
      var a0 = (Math.PI * 2 * i) / n;
      var a1 = a0 + Math.PI * 2 * (runden || 1.5);
      var r0 = 52, r1 = 6;
      animate(b, [
        { transform: schiebe(Math.cos(a0) * r0, Math.sin(a0) * r0 * 0.6, 0.7), opacity: 0 },
        { transform: schiebe(Math.cos(a0 + (a1 - a0) * 0.5) * ((r0 + r1) / 2),
          Math.sin(a0 + (a1 - a0) * 0.5) * ((r0 + r1) / 2) * 0.6, 1), opacity: 1, offset: 0.5 },
        { transform: schiebe(Math.cos(a1) * r1, Math.sin(a1) * r1 * 0.6, 0.5), opacity: 0 }
      ], ms, i * 12);
    }
  }

  /** Hiebe — Unlicht, Käfer, Kampf. Schräge Striche über dem Ziel. */
  function hieb(l, at, color, ms, anzahl) {
    var i, n = anzahl || 3;
    for (i = 0; i < n; i++) {
      var versatz = (i - (n - 1) / 2) * 22;
      var b = form(l, at.x + versatz, at.y, 96, 'kralle', color);
      animate(b, [
        { transform: schiebe(-30, -30, 0.5), opacity: 0 },
        { transform: schiebe(0, 0, 1), opacity: 1, offset: 0.35 },
        { transform: schiebe(24, 24, 1.1), opacity: 0 }
      ], ms, i * 80);
    }
  }

  /** Ringe, die nach außen laufen — Kampf, Schall, Druckwelle. */
  function welle(l, at, color, ms, anzahl) {
    var i, n = anzahl || 3;
    for (i = 0; i < n; i++) {
      var r = form(l, at.x, at.y, 60, 'ringform', color);
      animate(r, [
        { transform: 'scale(.3)', opacity: 1 },
        { transform: 'scale(2.8)', opacity: 0 }
      ], ms, i * 110);
    }
  }

  /** Funkeln — Fee, Stahl, Heilung. */
  function funkeln(l, at, color, ms, anzahl) {
    var i, n = anzahl || 10;
    for (i = 0; i < n; i++) {
      var x = at.x + zufall(-at.w * 0.5, at.w * 0.5);
      var y = at.y + zufall(-at.h * 0.4, at.h * 0.4);
      var b = form(l, x, y, zufall(18, 30), 'funke', i % 3 ? color : '#ffffff');
      animate(b, [
        { transform: 'scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'scale(1.2) rotate(45deg)', opacity: 1, offset: 0.4 },
        { transform: 'scale(0) rotate(90deg)', opacity: 0 }
      ], ms * zufall(0.6, 1), i * 30);
    }
  }

  /** Blasen, die aufsteigen — Gift, Wasser. */
  function blasen(l, at, color, ms, anzahl) {
    var i, n = anzahl || 9;
    for (i = 0; i < n; i++) {
      var x = at.x + zufall(-at.w * 0.45, at.w * 0.45);
      var b = form(l, x, at.boden - 10, zufall(18, 34), 'blase', i % 2 ? color : hell(color));
      animate(b, [
        { transform: schiebe(0, 10, 0.4), opacity: 0 },
        { transform: schiebe(zufall(-10, 10), -40, 1), opacity: 1, offset: 0.5 },
        { transform: schiebe(zufall(-16, 16), -90, 0.6), opacity: 0 }
      ], ms, i * 40);
    }
  }

  /** Böen — Flug. Waagerechte Striche, die durchziehen. */
  function boe(l, at, color, ms, anzahl) {
    var i, n = anzahl || 7;
    for (i = 0; i < n; i++) {
      var y = at.y + zufall(-at.h * 0.45, at.h * 0.45);
      var b = form(l, at.x - 90, y, zufall(30, 46), 'staub', i % 2 ? color : hell(color));
      animate(b, [
        { transform: schiebe(0, 0), opacity: 0 },
        { transform: schiebe(60, 0), opacity: 1, offset: 0.3 },
        { transform: schiebe(190, zufall(-8, 8)), opacity: 0 }
      ], ms, i * 34);
    }
  }

  /** Splitter — Eis. Schräge Scherben, die einschlagen. */
  function splitter(l, at, color, ms, anzahl) {
    var i, n = anzahl || 8;
    for (i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + zufall(-0.9, 0.9);
      var d = 130;
      var b = form(l, at.x - Math.cos(ang) * d, at.y - Math.sin(ang) * d, zufall(26, 40), 'scherbe', color);
      animate(b, [
        { transform: schiebe(0, 0, 0.6), opacity: 0 },
        { transform: schiebe(Math.cos(ang) * d * 0.6, Math.sin(ang) * d * 0.6, 1), opacity: 1, offset: 0.4 },
        { transform: schiebe(Math.cos(ang) * d, Math.sin(ang) * d, 1), opacity: 1, offset: 0.75 },
        { transform: schiebe(Math.cos(ang) * d, Math.sin(ang) * d, 0.3), opacity: 0 }
      ], ms, i * 28);
    }
  }

  /** Zunge aus Flammen: ein Kegel vom Angreifer zum Ziel. */
  function zunge(l, from, to, color, ms) {
    var dx = to.x - from.x, dy = to.y - from.y;
    var i, n = 16;
    for (i = 0; i < n; i++) {
      var t = zufall(0.15, 1);
      var breite = 26 + t * 34;
      var quer = zufall(-1, 1) * t * 30;
      var b = form(l, from.x + dx * t - dy * 0.02 * quer, from.y + dy * t + quer,
        breite, 'flamme', color);
      // Die Flamme zeigt in die Richtung, in die sie fliegt.
      var dreh = 'rotate(' + Math.round(Math.atan2(dy, dx) * 180 / Math.PI + 90) + 'deg) ';
      animate(b, [
        { transform: dreh + schiebe(0, 0, 0.3), opacity: 0 },
        { transform: dreh + schiebe(0, 0, 1), opacity: 1, offset: 0.35 },
        { transform: dreh + schiebe(dx * 0.06, dy * 0.06 - 14, 0.5), opacity: 0 }
      ], ms * zufall(0.6, 1), i * 16);
    }
  }

  /* ---------- 3) Reaktion ----------------------------------------------------
   * Was mit dem Getroffenen passiert. In den Vorbildern ist das der halbe
   * Eindruck: Das Pokémon blinkt, wird zurückgeworfen, das Bild ruckelt.
   * ------------------------------------------------------------------------ */

  function blinken(art, ms) {
    if (!art || !art.animate) return;
    art.animate([
      { opacity: 1, filter: 'brightness(1)' },
      { opacity: 0.2, filter: 'brightness(3)', offset: 0.12 },
      { opacity: 1, filter: 'brightness(1)', offset: 0.24 },
      { opacity: 0.2, filter: 'brightness(3)', offset: 0.36 },
      { opacity: 1, filter: 'brightness(1)', offset: 0.48 },
      { opacity: 0.3, filter: 'brightness(2)', offset: 0.6 },
      { opacity: 1, filter: 'brightness(1)' }
    ], { duration: ms || 420, easing: 'steps(1, end)' });
  }

  function rueckstoss(art, richtung, staerke) {
    if (!art || !art.animate) return;
    var d = (staerke || 1) * 14;
    art.animate([
      { transform: 'translate(0,0)' },
      { transform: schiebe(richtung.x * d, richtung.y * d * 0.4), offset: 0.25 },
      { transform: schiebe(richtung.x * d * 0.3, 0), offset: 0.6 },
      { transform: 'translate(0,0)' }
    ], { duration: 380, easing: 'ease-out' });
  }

  function ansturm(art, zu, ms) {
    if (!art || !art.animate) return;
    art.animate([
      { transform: 'translate(0,0)' },
      { transform: schiebe(-zu.x * 0.09, -zu.y * 0.09), offset: 0.2 },
      { transform: schiebe(zu.x * 0.34, zu.y * 0.34), offset: 0.5 },
      { transform: 'translate(0,0)' }
    ], { duration: ms || 360, easing: 'ease-out' });
  }

  function aufblitzen(stage, color, ms) {
    if (reduced()) return;
    var f = doc.createElement('div');
    f.className = 'fx-blitzschirm';
    f.style.background = color;
    stage.appendChild(f);
    animate(f, [{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0 }], ms || 260);
  }

  var ruckelZeit = null;
  function shake(stage, staerke) {
    if (reduced() || !stage) return;
    stage.classList.remove('fx-shake', 'fx-shake-stark');
    void stage.offsetWidth;
    stage.classList.add(staerke >= 2 ? 'fx-shake-stark' : 'fx-shake');
    if (ruckelZeit) root.clearTimeout(ruckelZeit);
    ruckelZeit = root.setTimeout(function () {
      stage.classList.remove('fx-shake', 'fx-shake-stark');
    }, staerke >= 2 ? 620 : 360);
  }

  /* ---------- 4) Choreografien je Typ ---------------------------------------
   * c = { l, stage, from, to, farbe, ziel, angreifer, selbst }
   * Jede gibt zurück, wie lange sie läuft.
   * ------------------------------------------------------------------------ */

  var TYP = {
    Normal: function (c) { platzen(c.l, c.to, '#ffffff', 12, 46, 300); welle(c.l, c.to, c.farbe, 380, 2); return 420; },
    Fire: function (c) { zunge(c.l, c.from, c.to, c.farbe, 460); return 520; },
    Water: function (c) { bahn(c.l, c.stage, c.farbe, 520, c.from.x < c.to.x); blasen(c.l, c.to, c.farbe, 460, 7); return 560; },
    Electric: function (c) { fallen(c.l, c.to, c.farbe, 3, 420, 'blitz'); welle(c.l, c.to, c.farbe, 320, 2); return 480; },
    Grass: function (c) { wurf(c.l, c.from, c.to, c.farbe, 460, 8, 44, 'lang'); steigen(c.l, c.to, c.farbe, 6, 420); return 540; },
    Ice: function (c) { splitter(c.l, c.to, c.farbe, 460, 8); return 520; },
    Fighting: function (c) { platzen(c.l, c.to, c.farbe, 10, 40, 260); welle(c.l, c.to, '#ffffff', 420, 3); return 460; },
    Poison: function (c) { blasen(c.l, c.to, c.farbe, 520, 10); return 560; },
    Ground: function (c) { steigen(c.l, c.to, c.farbe, 10, 480); shake(c.stage, 2); return 540; },
    Flying: function (c) { boe(c.l, c.to, c.farbe, 460, 8); return 500; },
    Psychic: function (c) { wirbel(c.l, c.to, c.farbe, 520, 1.5); welle(c.l, c.to, c.farbe, 420, 2); return 560; },
    Bug: function (c) { hieb(c.l, c.to, c.farbe, 360, 2); platzen(c.l, c.to, c.farbe, 8, 34, 240); return 440; },
    Rock: function (c) { fallen(c.l, c.to, c.farbe, 6, 500, 'stein'); shake(c.stage, 1); return 560; },
    Ghost: function (c) { wirbel(c.l, c.to, c.farbe, 540, 2); aufblitzen(c.stage, '#2a1038', 320); return 580; },
    Dragon: function (c) { wirbel(c.l, c.to, c.farbe, 480, 2.5); strahl(c.l, c.from, c.to, c.farbe, 420, 12); return 560; },
    Dark: function (c) { hieb(c.l, c.to, c.farbe, 420, 3); aufblitzen(c.stage, '#101018', 300); return 500; },
    Steel: function (c) { platzen(c.l, c.to, '#e8f0f8', 10, 40, 260); funkeln(c.l, c.to, c.farbe, 420, 8); return 480; },
    Fairy: function (c) { funkeln(c.l, c.to, c.farbe, 520, 14); welle(c.l, c.to, c.farbe, 420, 2); return 560; }
  };

  /* ---------- 5) Eigene Auftritte --------------------------------------------
   * Die Attacken, die jeder kennt, bekommen ihren eigenen Auftritt. Alles
   * andere bedient sich am Typ.
   * ------------------------------------------------------------------------ */

  var ATTACKE = {
    earthquake: function (c) { steigen(c.l, c.ziel ? c.to : c.from, c.farbe, 14, 620); shake(c.stage, 2); return 700; },
    magnitude: function (c) { return ATTACKE.earthquake(c); },
    bulldoze: function (c) { return ATTACKE.earthquake(c); },
    fissure: function (c) { steigen(c.l, c.to, '#6a4a2a', 16, 640); shake(c.stage, 2); return 700; },
    thunder: function (c) { fallen(c.l, c.to, c.farbe, 5, 520, 'blitz'); aufblitzen(c.stage, '#fff6c0', 240); shake(c.stage, 1); return 600; },
    thunderbolt: function (c) { fallen(c.l, c.to, c.farbe, 3, 440, 'blitz'); aufblitzen(c.stage, '#fff6c0', 200); return 500; },
    voltswitch: function (c) { return ATTACKE.thunderbolt(c); },
    surf: function (c) { bahn(c.l, c.stage, c.farbe, 640, c.from.x < c.to.x); return 680; },
    hydropump: function (c) { strahl(c.l, c.from, c.to, c.farbe, 480, 18); blasen(c.l, c.to, c.farbe, 420, 8); return 560; },
    flamethrower: function (c) { zunge(c.l, c.from, c.to, c.farbe, 560); return 620; },
    fireblast: function (c) { zunge(c.l, c.from, c.to, c.farbe, 520); platzen(c.l, c.to, c.farbe, 16, 60, 380); shake(c.stage, 1); return 640; },
    hyperbeam: function (c) { strahl(c.l, c.from, c.to, '#f0d8ff', 620, 22); aufblitzen(c.stage, '#ffffff', 300); shake(c.stage, 1); return 720; },
    gigaimpact: function (c) { ansturm(c.angreifer, { x: c.to.x - c.from.x, y: c.to.y - c.from.y }, 420); platzen(c.l, c.to, '#f0c8ff', 18, 64, 420); shake(c.stage, 2); return 640; },
    solarbeam: function (c) { strahl(c.l, c.from, c.to, c.farbe, 560, 20); funkeln(c.l, c.from, '#fff0a0', 400, 8); return 640; },
    icebeam: function (c) { strahl(c.l, c.from, c.to, c.farbe, 460, 12); splitter(c.l, c.to, c.farbe, 420, 6); return 560; },
    blizzard: function (c) { bahn(c.l, c.stage, c.farbe, 560, c.from.x < c.to.x); splitter(c.l, c.to, c.farbe, 460, 8); return 620; },
    rockslide: function (c) { fallen(c.l, c.to, c.farbe, 8, 560, 'stein'); shake(c.stage, 2); return 640; },
    stoneedge: function (c) { steigen(c.l, c.to, c.farbe, 8, 480); platzen(c.l, c.to, c.farbe, 10, 44, 300); return 560; },
    razorleaf: function (c) { wurf(c.l, c.from, c.to, c.farbe, 480, 10, 52, 'lang'); return 540; },
    leafstorm: function (c) { bahn(c.l, c.stage, c.farbe, 560, c.from.x < c.to.x); wirbel(c.l, c.to, c.farbe, 480, 2); return 620; },
    petalblizzard: function (c) { return ATTACKE.leafstorm(c); },
    explosion: function (c) { aufblitzen(c.stage, '#ffffff', 420); platzen(c.l, c.from, '#ffd070', 24, 90, 520); shake(c.stage, 2); return 700; },
    selfdestruct: function (c) { return ATTACKE.explosion(c); },
    dracometeor: function (c) { fallen(c.l, c.to, c.farbe, 6, 560, 'stein'); shake(c.stage, 2); return 640; },
    shadowball: function (c) { wurf(c.l, c.from, c.to, c.farbe, 440, 5, 36); wirbel(c.l, c.to, c.farbe, 420, 1.5); return 560; },
    psychic: function (c) { wirbel(c.l, c.to, c.farbe, 560, 2); aufblitzen(c.stage, '#f8d0f0', 260); return 600; },
    recover: function (c) { funkeln(c.l, c.from, '#8ce890', 520, 14); return 560; },
    rest: function (c) { funkeln(c.l, c.from, '#8ce890', 520, 14); return 560; },
    synthesis: function (c) { funkeln(c.l, c.from, '#8ce890', 520, 14); return 560; },
    roost: function (c) { funkeln(c.l, c.from, '#8ce890', 520, 14); return 560; }
  };

  /* Statusattacken: Steigerung und Senkung sieht man an der Richtung. */
  function statusAuftritt(c, art) {
    var l = c.l, ziel = c.selbst ? c.from : c.to, i;
    var farbe = art === 'runter' ? '#e0554a' : art === 'hoch' ? '#57b45a' : c.farbe;
    for (i = 0; i < 7; i++) {
      var x = ziel.x + zufall(-ziel.w * 0.4, ziel.w * 0.4);
      var b = form(l, x, ziel.y, 34, 'pfeilauf', i % 2 ? farbe : hell(farbe),
        art === 'runter' ? 'fx-kopfueber' : '');
      animate(b, [
        { transform: schiebe(0, art === 'runter' ? -40 : 40, 0.6), opacity: 0 },
        { transform: schiebe(0, 0, 1), opacity: 1, offset: 0.45 },
        { transform: schiebe(0, art === 'runter' ? 46 : -46, 0.7), opacity: 0 }
      ], 460, i * 40);
    }
    if (art === 'neutral') welle(l, ziel, c.farbe, 420, 2);
    return 500;
  }

  /* ---------- 6) Der Auftritt einer Attacke ---------------------------------- */

  /**
   * opts: { stage, fromArt, toArt, type, category, id, eff, crit, self, boost }
   * Rückgabe: Dauer in Millisekunden, damit das Protokoll darauf warten kann.
   */
  function move(opts) {
    var stage = opts.stage;
    if (!stage || reduced()) return 0;
    var angreifer = opts.fromArt, ziel = opts.toArt || opts.fromArt;
    if (!angreifer || !ziel) return 0;

    var l = layerFor(stage);
    var farbe = colorOf(opts.type);
    var from = centre(angreifer, stage), to = centre(ziel, stage);
    var c = { l: l, stage: stage, from: from, to: to, farbe: farbe,
      ziel: ziel, angreifer: angreifer, selbst: !!opts.self };

    // Statusattacken zeigen, wohin es geht.
    if (opts.category === 'T') {
      return statusAuftritt(c, opts.boost === 'hoch' ? 'hoch' : opts.boost === 'runter' ? 'runter' : 'neutral');
    }

    // Physische Attacken beginnen mit dem Ausfallschritt.
    if (opts.category === 'P' && !opts.self) {
      ansturm(angreifer, { x: to.x - from.x, y: to.y - from.y }, 380);
    }

    var eigen = ATTACKE[opts.id];
    var dauer = eigen ? eigen(c) : (TYP[opts.type] || TYP.Normal)(c);

    // Was das Ziel abbekommt: blinken, zurückweichen — und bei einem sehr
    // wirksamen Treffer blitzt die ganze Bühne kurz auf.
    if (!opts.self) {
      var richtung = { x: to.x > from.x ? 1 : -1, y: to.y > from.y ? 1 : -1 };
      var wucht = opts.crit ? 2 : (opts.eff > 1 ? 1.5 : 1);
      root.setTimeout(function () {
        blinken(ziel, 420);
        rueckstoss(ziel, richtung, wucht);
        if (opts.eff > 1) aufblitzen(stage, '#ffffff', 220);
        if (opts.crit) shake(stage, 2);
      }, Math.max(120, dauer * 0.45));
    }
    return dauer;
  }

  /* ---------- 7) Übergang ----------------------------------------------------
   * Der Bildschirm schließt sich in Streifen, dahinter wird gewechselt, dann
   * öffnet er wieder — der Auftakt, den jedes Pokémon-Spiel hat.
   * ------------------------------------------------------------------------ */

  function wipe(onCovered, onDone) {
    if (reduced()) { if (onCovered) onCovered(); if (onDone) onDone(); return; }
    var host = doc.createElement('div');
    host.className = 'fx-wipe';
    var rows = 10, i;
    for (i = 0; i < rows; i++) {
      var bar = doc.createElement('i');
      bar.style.top = (i * (100 / rows)) + '%';
      bar.style.height = (100 / rows + 0.4) + '%';
      bar.style.animationDelay = (i % 2 ? 40 : 0) + 'ms';
      bar.style.transformOrigin = i % 2 ? 'left' : 'right';
      host.appendChild(bar);
    }
    doc.body.appendChild(host);
    root.setTimeout(function () {
      if (onCovered) onCovered();
      host.classList.add('open');
      root.setTimeout(function () {
        host.remove();
        if (onDone) onDone();
      }, 340);
    }, 320);
  }

  /** Für die Momente: ein Platzen an einer Stelle, ohne ganze Choreografie. */
  function burst(layer, at, color, count, spread, ms) {
    platzen(layer, at, color, count || 10, spread || 40, ms || 260);
  }

  PL.fx = {
    move: move, shake: shake, wipe: wipe, burst: burst, reduced: reduced,
    blinken: blinken, aufblitzen: aufblitzen, layerFor: layerFor,
    TYP: TYP, ATTACKE: ATTACKE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.fx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
