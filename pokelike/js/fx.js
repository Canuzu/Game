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

  function animate(node, frames, ms, done) {
    if (!node.animate) { root.setTimeout(function () { node.remove(); if (done) done(); }, ms); return; }
    var anim = node.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
    anim.onfinish = function () { node.remove(); if (done) done(); };
  }

  /* ---------- 2) Attackeneffekte --------------------------------------------
   * Drei Bewegungsarten, je nach Kategorie:
   *   Spezial  — Geschoss fliegt vom Angreifer zum Ziel und zerplatzt
   *   Physisch — Angreifer stößt vor, am Ziel platzt der Aufprall
   *   Status   — ein Ring aus Pixeln wächst über dem Ziel
   * ------------------------------------------------------------------------ */

  var SIZE = { small: 5, mid: 7, big: 9 };

  function burst(layer, at, color, count, spread, ms) {
    var i, ang, dist, size;
    for (i = 0; i < count; i++) {
      ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      dist = spread * (0.5 + Math.random() * 0.6);
      size = SIZE.mid + (i % 2 ? 1 : -1);
      var b = bit(layer, at.x, at.y, size, color);
      animate(b, [
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + Math.sin(ang) * dist + 'px)', opacity: 0 }
      ], ms);
    }
  }

  function projectile(layer, from, to, color, type, ms, done) {
    var count = 8, i;
    var lift = type === 'Electric' ? 0 : -34;
    for (i = 0; i < count; i++) {
      var b = bit(layer, from.x, from.y, i % 2 ? SIZE.small : SIZE.mid, color);
      var wob = (i - count / 2) * 5;
      var mid = { x: (from.x + to.x) / 2 + (type === 'Electric' ? wob * 2 : 0), y: (from.y + to.y) / 2 + lift + wob };
      animate(b, [
        { transform: 'translate(0,0)', opacity: 0 },
        { transform: 'translate(' + (mid.x - from.x) + 'px,' + (mid.y - from.y) + 'px)', opacity: 1, offset: 0.5 },
        { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px)', opacity: 1 }
      ], ms * (0.7 + i * 0.05));
    }
    root.setTimeout(function () { burst(layer, to, color, 10, 42, 260); if (done) done(); }, ms * 0.8);
  }

  function ring(layer, at, color, ms) {
    var count = 12, i;
    for (i = 0; i < count; i++) {
      var ang = (Math.PI * 2 * i) / count;
      var b = bit(layer, at.x, at.y, SIZE.small, color);
      animate(b, [
        { transform: 'translate(0,0) scale(.6)', opacity: 0 },
        { transform: 'translate(' + Math.cos(ang) * 18 + 'px,' + Math.sin(ang) * 12 + 'px) scale(1)', opacity: 1, offset: 0.35 },
        { transform: 'translate(' + Math.cos(ang) * 46 + 'px,' + Math.sin(ang) * 30 + 'px) scale(.5)', opacity: 0 }
      ], ms);
    }
  }

  function lunge(art, toward, ms) {
    if (!art.animate) return;
    art.animate([
      { transform: 'translate(0,0)' },
      { transform: 'translate(' + toward.x * 0.28 + 'px,' + toward.y * 0.28 + 'px)', offset: 0.45 },
      { transform: 'translate(0,0)' }
    ], { duration: ms, easing: 'ease-out' });
  }

  /**
   * Spielt den Effekt einer Attacke.
   * opts: { stage, fromArt, toArt, type, category, crit, self }
   * Rückgabe: Dauer in Millisekunden, damit das Protokoll darauf warten kann.
   */
  function move(opts) {
    var stage = opts.stage;
    if (!stage || reduced()) return 0;
    var layer = layerFor(stage);
    var color = colorOf(opts.type);
    var target = opts.toArt || opts.fromArt;
    if (!opts.fromArt || !target) return 0;
    var from = centre(opts.fromArt, stage), to = centre(target, stage);

    if (opts.category === 'T') {
      ring(layer, opts.self ? from : to, color, 420);
      return 420;
    }
    if (opts.category === 'P') {
      lunge(opts.fromArt, { x: to.x - from.x, y: to.y - from.y }, 340);
      root.setTimeout(function () {
        burst(layer, to, color, 12, 40, 260);
        if (opts.crit) shake(stage);
      }, 160);
      return 420;
    }
    projectile(layer, from, to, color, opts.type, 320, function () {
      if (opts.crit) shake(stage);
    });
    return 520;
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

  PL.fx = { move: move, shake: shake, wipe: wipe, burst: burst, reduced: reduced };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.fx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
