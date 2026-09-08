/* =============================================================================
 * fx.js — Kampfeffekte und Übergänge
 * -----------------------------------------------------------------------------
 * Drei Dinge: Attackenanimationen (Geschosse, Ansturm, Aura), der
 * Bildschirmwischer beim Kampfstart und das Wackeln bei harten Treffern.
 * Alles besteht aus quadratischen Pixeln in Typfarbe — nichts wird geladen.
 *
 * Gliederung:  1) Hilfen   2) Attackeneffekte   3) Übergang
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  var doc = root.document;

  /* ---------- 1) Hilfen ----------------------------------------------------- */

  function reduced() {
    return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function colorOf(type) {
    var map = (PL.ui && PL.ui.TYPE_COLOR) || {};
    return map[type] || '#dddddd';
  }

  /** Mittelpunkt eines Elements, gemessen im Koordinatensystem der Bühne. */
  function centre(el, stage) {
    var a = el.getBoundingClientRect(), b = stage.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
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

  function bit(layer, x, y, size, color, extra) {
    var b = doc.createElement('i');
    b.className = 'fx-bit' + (extra ? ' ' + extra : '');
    b.style.left = (x - size / 2) + 'px';
    b.style.top = (y - size / 2) + 'px';
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.background = color;
    b.style.color = color;                    // für den Schein per currentColor
    layer.appendChild(b);
    return b;
  }

  /**
   * Spielt eine Bewegung und räumt das Teilchen danach weg. Der vierte Wert
   * ist eine Verzögerung: Damit setzen die Muster ihre Teilchen zeitversetzt
   * los, statt alle auf einmal. `fill: both` sorgt dafür, dass schon während
   * des Wartens das erste Bild gilt — sonst blitzte das Teilchen kurz auf,
   * bevor es losläuft.
   */
  function animate(node, frames, ms, verzug) {
    var warten = verzug || 0;
    if (!node.animate) { root.setTimeout(function () { node.remove(); }, ms + warten); return; }
    var anim = node.animate(frames, { duration: ms, delay: warten, easing: 'linear', fill: 'both' });
    anim.onfinish = function () { node.remove(); };
  }

  /* ---------- 2) Attackeneffekte --------------------------------------------
   * Jeder Typ hat seine eigene Handschrift. Vorher gab es drei Bewegungen für
   * alles — Geschoss, Ansturm, Ring —, und Feuer sah aus wie Wasser, nur
   * orange. Jetzt lodert Feuer, schwappt Wasser, zuckt Elektro, bebt der
   * Boden. Gebaut ist alles aus denselben wenigen Bausteinen: ein Rechteck,
   * eine Bahn, eine Zeit. Nichts wird geladen.
   *
   * Die Kategorie spielt weiter mit: Physisches beginnt mit einem Vorstoß,
   * Spezielles fliegt, Status legt sich um das Ziel.
   * ------------------------------------------------------------------------ */

  var SIZE = { small: 5, mid: 7, big: 9 };

  /** Kurzer heller Strich — für Funken und Blitze. */
  function spark(layer, x, y, laenge) {
    var b = bit(layer, x, y, laenge, '#fff6cc');
    b.style.height = '3px';
    return b;
  }

  function burst(layer, at, color, count, spread, ms, size) {
    var i, ang, dist;
    for (i = 0; i < count; i++) {
      ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      dist = spread * (0.5 + Math.random() * 0.6);
      var b = bit(layer, at.x, at.y, size || (SIZE.mid + (i % 2 ? 1 : -1)), color);
      animate(b, [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + Math.sin(ang) * dist + 'px) scale(.4)', opacity: 0 }
      ], ms);
    }
  }

  function lunge(art, toward, ms) {
    if (!art || !art.animate) return;
    art.animate([
      { transform: 'translate(0,0)' },
      { transform: 'translate(' + toward.x * 0.3 + 'px,' + toward.y * 0.3 + 'px)', offset: 0.4 },
      { transform: 'translate(0,0)' }
    ], { duration: ms, easing: 'cubic-bezier(.3,1.3,.5,1)' });
  }

  /**
   * Das Zurückzucken des Getroffenen: kurz weiß, dann durchgeschüttelt.
   *
   * Ausgelöst wird es nicht von den Mustern, sondern dort, wo der Schaden
   * entsteht — so zuckt ein Pokémon auch bei Gift, Tarnsteinen oder
   * Rückstoß zusammen, wo gar keine Attacke zu sehen ist.
   */
  function recoil(art) {
    if (!art || !art.animate || reduced()) return;
    art.animate([
      { filter: 'brightness(1)', transform: 'translate(0,0)' },
      { filter: 'brightness(5)', transform: 'translate(0,0)', offset: 0.08 },
      { filter: 'brightness(1)', transform: 'translate(7px,-2px)', offset: 0.2 },
      { filter: 'brightness(4)', transform: 'translate(-6px,2px)', offset: 0.34 },
      { filter: 'brightness(1)', transform: 'translate(4px,0)', offset: 0.5 },
      { filter: 'brightness(1)', transform: 'translate(-2px,0)', offset: 0.7 },
      { filter: 'brightness(1)', transform: 'translate(0,0)' }
    ], { duration: 480, easing: 'ease-out' });
  }

  /* Die Muster. Jedes bekommt denselben Zettel: wo der Angreifer steht, wo
     das Ziel, welche Farbe, welche Ebene — und liefert seine Dauer zurück. */
  var MUSTER = {

    /* Geschoss auf einem Bogen: Feuer, Wasser, Gift, Gestein. */
    bogen: function (c, o) {
      var n = o.anzahl || 10, i;
      for (i = 0; i < n; i++) {
        var g = (o.gross ? SIZE.big : SIZE.mid) + (i % 3);
        var p = bit(c.layer, c.von.x, c.von.y, g, c.farbe);
        if (o.rund) p.style.borderRadius = '50%';
        var streu = (i - n / 2) * (o.streuung || 5);
        var mx = (c.von.x + c.ziel.x) / 2, my = (c.von.y + c.ziel.y) / 2 + (o.hoehe || -38) + streu;
        animate(p, [
          { transform: 'translate(0,0) scale(.5)', opacity: 0 },
          { transform: 'translate(' + (mx - c.von.x) + 'px,' + (my - c.von.y) + 'px) scale(1)', opacity: 1, offset: 0.5 },
          { transform: 'translate(' + (c.ziel.x - c.von.x) + 'px,' + (c.ziel.y - c.von.y) + 'px) scale(' +
              (o.wachsen || 1) + ')', opacity: 1 }
        ], 360, i * 22);
      }
      root.setTimeout(function () {
        burst(c.layer, c.ziel, c.farbe, o.splitter || 12, o.weite || 44, 300);
      }, 360);
      return 700;
    },

    /* Vorstoß mit Aufprall: Normal, Kampf, Stahl, Unlicht. */
    ansturm: function (c, o) {
      lunge(c.vonArt, { x: c.ziel.x - c.von.x, y: c.ziel.y - c.von.y }, 380);
      root.setTimeout(function () {
        burst(c.layer, c.ziel, c.farbe, o.splitter || 14, 46, 280);
        if (o.wellen) {
          for (var r = 0; r < 3; r++) {
            var ring = bit(c.layer, c.ziel.x, c.ziel.y, 24, c.farbe, 'fx-ring');
            animate(ring, [
              { transform: 'scale(.3)', opacity: .9 },
              { transform: 'scale(3.2)', opacity: 0 }
            ], 400, r * 90);
          }
        }
        if (o.schnitt) {
          for (var k = 0; k < 3; k++) {
            var kl = bit(c.layer, c.ziel.x, c.ziel.y, 54, c.farbe);
            kl.style.height = '4px';
            kl.style.transform = 'rotate(' + (-42 + k * 24) + 'deg)';
            animate(kl, [
              { transform: 'rotate(' + (-42 + k * 24) + 'deg) scaleX(0)', opacity: 1 },
              { transform: 'rotate(' + (-42 + k * 24) + 'deg) scaleX(1.5)', opacity: 0 }
            ], 240, k * 70);
          }
        }
      }, 170);
      return 620;
    },

    /* Zickzack: Elektro. */
    blitz: function (c, o) {
      var lx = c.von.x, ly = c.von.y, i;
      var start = o.vonOben ? { x: c.ziel.x, y: -12 } : c.von;
      lx = start.x; ly = start.y;
      for (i = 1; i <= 7; i++) {
        var t = i / 7;
        var x = start.x + (c.ziel.x - start.x) * t + (i % 2 ? 1 : -1) * 15 * (1 - t);
        var y = start.y + (c.ziel.y - start.y) * t;
        var lang = Math.sqrt((x - lx) * (x - lx) + (y - ly) * (y - ly));
        var winkel = Math.atan2(y - ly, x - lx) * 180 / Math.PI;
        var b = bit(c.layer, (x + lx) / 2, (y + ly) / 2, lang, c.farbe);
        b.style.height = '4px';
        b.style.transform = 'rotate(' + winkel + 'deg)';
        animate(b, [{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], 280, i * 20);
        lx = x; ly = y;
      }
      root.setTimeout(function () {
        burst(c.layer, c.ziel, '#fff6cc', 12, 42, 260);
      }, 230);
      return 560;
    },

    /* Erst sammeln, dann durchschlagen: Drache. */
    strahl: function (c, o) {
      var laden = o.laden || 280, i;
      for (i = 0; i < 10; i++) {
        var w = Math.random() * Math.PI * 2, d = 40 + Math.random() * 24;
        var p = bit(c.layer, c.von.x + Math.cos(w) * d, c.von.y + Math.sin(w) * d, SIZE.mid, c.farbe);
        animate(p, [
          { transform: 'translate(0,0) scale(1)', opacity: 0 },
          { transform: 'translate(0,0) scale(1)', opacity: 1, offset: .3 },
          { transform: 'translate(' + (-Math.cos(w) * d) + 'px,' + (-Math.sin(w) * d) + 'px) scale(.2)', opacity: .9 }
        ], laden, i * 16);
      }
      root.setTimeout(function () {
        var dx = c.ziel.x - c.von.x, dy = c.ziel.y - c.von.y;
        var lang = Math.sqrt(dx * dx + dy * dy);
        var winkel = Math.atan2(dy, dx) * 180 / Math.PI;
        var s = bit(c.layer, (c.von.x + c.ziel.x) / 2, (c.von.y + c.ziel.y) / 2, lang, c.farbe);
        s.style.height = (o.dick || 14) + 'px';
        animate(s, [
          { transform: 'rotate(' + winkel + 'deg) scaleX(0) scaleY(.3)', opacity: 1 },
          { transform: 'rotate(' + winkel + 'deg) scaleX(1) scaleY(1)', opacity: 1, offset: .3 },
          { transform: 'rotate(' + winkel + 'deg) scaleX(1) scaleY(1)', opacity: 1, offset: .7 },
          { transform: 'rotate(' + winkel + 'deg) scaleX(1) scaleY(.1)', opacity: 0 }
        ], 460);
        burst(c.layer, c.ziel, c.farbe, 16, 54, 340);
      }, laden);
      return laden + 560;
    },

    /* Der Boden arbeitet: Boden. */
    beben: function (c, o) {
      shake(c.stage);
      var breite = o.weit ? 220 : 130, i;
      for (i = 0; i < (o.weit ? 14 : 9); i++) {
        var x = c.ziel.x - breite / 2 + Math.random() * breite;
        var y = c.ziel.y + 26 + Math.random() * 14;
        var g = SIZE.mid + Math.random() * 5;
        var p = bit(c.layer, x, y, g, c.farbe);
        var hoch = 36 + Math.random() * 44;
        animate(p, [
          { transform: 'translate(0,10px) scale(.4)', opacity: 0 },
          { transform: 'translate(' + ((Math.random() - .5) * 26) + 'px,' + (-hoch) + 'px) scale(1)', opacity: 1, offset: .45 },
          { transform: 'translate(' + ((Math.random() - .5) * 44) + 'px,14px) scale(.6)', opacity: 0 }
        ], 560, i * 28);
      }
      return 720;
    },

    /* Ringe um das Ziel: Psycho, Fee, Eis. */
    aura: function (c, o) {
      var r, i;
      for (r = 0; r < (o.ringe || 3); r++) {
        var ring = bit(c.layer, c.ziel.x, c.ziel.y, 28, c.farbe, 'fx-ring');
        animate(ring, [
          { transform: 'scale(' + (o.einwaerts ? 3 : .3) + ') rotate(0deg)', opacity: 0 },
          { transform: 'scale(1.5) rotate(140deg)', opacity: 1, offset: .5 },
          { transform: 'scale(' + (o.einwaerts ? .2 : 3) + ') rotate(280deg)', opacity: 0 }
        ], 560, r * 100);
      }
      for (i = 0; i < (o.funken || 10); i++) {
        var w = (Math.PI * 2 * i) / (o.funken || 10);
        var d = 30 + Math.random() * 16;
        var p = bit(c.layer, c.ziel.x + Math.cos(w) * d, c.ziel.y + Math.sin(w) * d, SIZE.small, c.farbe);
        animate(p, [
          { transform: 'translate(0,0) scale(.3)', opacity: 0 },
          { transform: 'translate(0,-10px) scale(1.2)', opacity: 1, offset: .5 },
          { transform: 'translate(0,-24px) scale(.2)', opacity: 0 }
        ], 520, i * 30);
      }
      return 660;
    },

    /* Viele kleine Körper: Käfer. */
    schwarm: function (c) {
      for (var i = 0; i < 15; i++) {
        var w = Math.random() * Math.PI * 2, d = 50 + Math.random() * 34;
        var p = bit(c.layer, c.von.x, c.von.y, SIZE.small, c.farbe);
        var mx = c.ziel.x + Math.cos(w) * d - c.von.x;
        var my = c.ziel.y + Math.sin(w) * d - c.von.y;
        animate(p, [
          { transform: 'translate(0,0) scale(.6)', opacity: 0 },
          { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1)', opacity: 1, offset: .55 },
          { transform: 'translate(' + (c.ziel.x - c.von.x) + 'px,' + (c.ziel.y - c.von.y) + 'px) scale(.8)', opacity: .9 }
        ], 480, i * 20);
      }
      root.setTimeout(function () {
        burst(c.layer, c.ziel, c.farbe, 10, 32, 260);
      }, 480);
      return 760;
    },

    /* Böen von der Seite: Flug. */
    boe: function (c) {
      for (var i = 0; i < 7; i++) {
        var p = bit(c.layer, c.ziel.x - 110 - i * 12, c.ziel.y - 46 + i * 11, 34, c.farbe);
        p.style.height = '4px';
        animate(p, [
          { transform: 'rotate(16deg) translate(0,0)', opacity: 0 },
          { transform: 'rotate(16deg) translate(80px,34px)', opacity: 1, offset: .5 },
          { transform: 'rotate(16deg) translate(170px,72px)', opacity: 0 }
        ], 440, i * 36);
      }
      root.setTimeout(function () {
        burst(c.layer, c.ziel, c.farbe, 10, 38, 260);
      }, 320);
      return 660;
    },

    /* Schemen, die kommen und gehen: Geist. */
    schemen: function (c) {
      for (var i = 0; i < 8; i++) {
        var w = (Math.PI * 2 * i) / 8;
        var p = bit(c.layer, c.von.x, c.von.y, SIZE.big + 3, c.farbe);
        animate(p, [
          { transform: 'translate(0,0) scale(.4)', opacity: 0 },
          { transform: 'translate(' + ((c.ziel.x - c.von.x) * .6 + Math.cos(w) * 26) + 'px,' +
              ((c.ziel.y - c.von.y) * .6 + Math.sin(w) * 20) + 'px) scale(1.3)', opacity: .8, offset: .55 },
          { transform: 'translate(' + (c.ziel.x - c.von.x) + 'px,' + (c.ziel.y - c.von.y) + 'px) scale(.3)', opacity: 0 }
        ], 580, i * 34);
      }
      return 740;
    },

    /* Blätter, die sich drehen: Pflanze. */
    blaetter: function (c) {
      for (var i = 0; i < 10; i++) {
        var p = bit(c.layer, c.von.x, c.von.y, SIZE.mid + 1, c.farbe);
        var bogen = (i % 2 ? -1 : 1) * (26 + i * 4);
        animate(p, [
          { transform: 'translate(0,0) scale(.5) rotate(0deg)', opacity: 0 },
          { transform: 'translate(' + ((c.ziel.x - c.von.x) * .5) + 'px,' +
              ((c.ziel.y - c.von.y) * .5 + bogen) + 'px) scale(1) rotate(320deg)', opacity: 1, offset: .5 },
          { transform: 'translate(' + (c.ziel.x - c.von.x) + 'px,' + (c.ziel.y - c.von.y) +
              'px) scale(.9) rotate(660deg)', opacity: .9 }
        ], 480, i * 26);
      }
      root.setTimeout(function () {
        burst(c.layer, c.ziel, c.farbe, 12, 40, 300);
      }, 470);
      return 740;
    }
  };

  /* Welcher Typ bewegt sich wie. Was hier fehlt, stürmt einfach vor. */
  var TYPEN = {
    Normal:   { m: 'ansturm',  o: { wellen: true } },
    Fire:     { m: 'bogen',    o: { anzahl: 13, hoehe: -28, wachsen: 1.7, weite: 52 } },
    Water:    { m: 'bogen',    o: { anzahl: 11, hoehe: -56, rund: true, splitter: 16 } },
    Electric: { m: 'blitz',    o: {} },
    Grass:    { m: 'blaetter', o: {} },
    Ice:      { m: 'aura',     o: { einwaerts: true, ringe: 4, funken: 12 } },
    Fighting: { m: 'ansturm',  o: { wellen: true, splitter: 18 } },
    Poison:   { m: 'bogen',    o: { anzahl: 9, hoehe: -64, streuung: 9, rund: true } },
    Ground:   { m: 'beben',    o: {} },
    Flying:   { m: 'boe',      o: {} },
    Psychic:  { m: 'aura',     o: { ringe: 4, funken: 14 } },
    Bug:      { m: 'schwarm',  o: {} },
    Rock:     { m: 'bogen',    o: { anzahl: 7, hoehe: -74, gross: true, wachsen: 1.3, splitter: 16 } },
    Ghost:    { m: 'schemen',  o: {} },
    Dragon:   { m: 'strahl',   o: { laden: 280, dick: 14 } },
    Dark:     { m: 'ansturm',  o: { schnitt: true } },
    Steel:    { m: 'ansturm',  o: { schnitt: true, splitter: 10 } },
    Fairy:    { m: 'aura',     o: { ringe: 2, funken: 16 } }
  };

  /**
   * Spielt den Effekt einer Attacke.
   * opts: { stage, fromArt, toArt, type, category, crit, self }
   * Rückgabe: Dauer in Millisekunden, damit das Protokoll darauf warten kann.
   */
  function move(opts) {
    var stage = opts.stage;
    if (!stage || reduced()) return 0;
    var ziel = opts.toArt || opts.fromArt;
    if (!opts.fromArt || !ziel) return 0;

    var c = {
      stage: stage,
      layer: layerFor(stage),
      farbe: colorOf(opts.type),
      vonArt: opts.fromArt,
      zielArt: opts.self ? opts.fromArt : ziel,
      von: centre(opts.fromArt, stage),
      ziel: centre(opts.self ? opts.fromArt : ziel, stage)
    };

    // Status legt sich um das Ziel, statt darauf zu fliegen — auch beim Typ,
    // dessen Angriffe sonst geworfen kommen.
    if (opts.category === 'T') {
      var dauer = MUSTER.aura(c, { ringe: 3, funken: 10 });
      return dauer;
    }

    var wahl = TYPEN[opts.type] || { m: 'ansturm', o: {} };
    // Physisches beginnt immer mit einem Vorstoß, egal welcher Typ.
    if (opts.category === 'P' && wahl.m !== 'ansturm' && wahl.m !== 'beben') {
      lunge(c.vonArt, { x: c.ziel.x - c.von.x, y: c.ziel.y - c.von.y }, 340);
    }
    var ms = MUSTER[wahl.m](c, wahl.o || {});
    if (opts.crit) root.setTimeout(function () { shake(stage); }, Math.max(0, ms - 320));
    return ms;
  }

  var shakeTimer = null;
  function shake(stage) {
    if (reduced()) return;
    stage.classList.remove('fx-shake');
    void stage.offsetWidth;
    stage.classList.add('fx-shake');
    if (shakeTimer) root.clearTimeout(shakeTimer);
    shakeTimer = root.setTimeout(function () { stage.classList.remove('fx-shake'); }, 360);
  }

  /* ---------- 3) Übergang ----------------------------------------------------
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

  /* ---------- 4) Der Auftritt --------------------------------------------------
   * Zu Beginn eines Kampfes wirft der Trainer. Der Ball fliegt im Bogen, dreht
   * sich dabei, springt auf — und für einen Augenblick schießen helle Striche
   * nach außen. Bei Wechseln mitten im Kampf bleibt es beim Lichtblitz: Ein
   * Wurf bei jedem Tausch würde die Kämpfe in die Länge ziehen.
   * ------------------------------------------------------------------------ */

  /**
   * Wirft einen Ball von einem Punkt zum anderen. `done` läuft beim Aufschlag.
   * Rückgabe: Flugdauer in Millisekunden.
   */
  function throwBall(stage, from, to, done) {
    if (!stage || reduced()) { if (done) done(); return 0; }
    var layer = layerFor(stage);
    var b = doc.createElement('i');
    b.className = 'fx-ball';
    b.style.left = (from.x - 8) + 'px';
    b.style.top = (from.y - 8) + 'px';
    layer.appendChild(b);
    var dx = to.x - from.x, dy = to.y - from.y, ms = 520;
    if (!b.animate) { root.setTimeout(function () { b.remove(); if (done) done(); }, ms); return ms; }
    var anim = b.animate([
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 58) + 'px) rotate(360deg)', offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(720deg)' }
    ], { duration: ms, easing: 'cubic-bezier(.4,.1,.6,.9)', fill: 'forwards' });
    anim.onfinish = function () { b.remove(); if (done) done(); };
    return ms;
  }

  /** Der helle Blitz beim Aufgehen: kurze Striche sternförmig nach außen. */
  function sparkle(stage, at, count, spread) {
    if (!stage || reduced()) return 0;
    var layer = layerFor(stage), i;
    var n = count || 14, weite = spread || 46;
    for (i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      var lang = 6 + Math.random() * 8;
      var s = spark(layer, at.x, at.y, lang);
      var grad = ang * 180 / Math.PI;
      s.style.transform = 'rotate(' + grad + 'deg)';
      animate(s, [
        { transform: 'rotate(' + grad + 'deg) translate(0,0)', opacity: 1 },
        { transform: 'rotate(' + grad + 'deg) translate(' + Math.cos(ang) * weite + 'px,' +
            Math.sin(ang) * weite * 0.7 + 'px)', opacity: 0 }
      ], 340);
    }
    return 340;
  }

  /** Ein Pokémon betritt die Bühne: aus dem Nichts, kurz zu groß, dann steht es. */
  function enter(art) {
    if (!art || !art.animate || reduced()) return 0;
    art.animate([
      { transform: 'scale(.2)', opacity: 0, filter: 'brightness(5)' },
      { transform: 'scale(1.16)', opacity: 1, filter: 'brightness(2.2)', offset: 0.45 },
      { transform: 'scale(.96)', opacity: 1, filter: 'brightness(1)', offset: 0.72 },
      { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }
    ], { duration: 460, easing: 'cubic-bezier(.2,1.3,.4,1)' });
    return 460;
  }

  PL.fx = { move: move, shake: shake, wipe: wipe, burst: burst, reduced: reduced,
            throwBall: throwBall, sparkle: sparkle, enter: enter, recoil: recoil };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.fx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
