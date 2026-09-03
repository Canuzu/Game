/* =============================================================================
 * moments.js — kurze Augenblicke, die ein Spiel ausmachen
 * -----------------------------------------------------------------------------
 * Drei kleine Einlagen: der geworfene Ball samt Wackeln, die Entwicklung mit
 * Silhouette und Blitz und die Werte-Tafel beim Levelaufstieg.
 *
 * Wichtig: Diese Momente laufen IMMER in ihrem eigenen, festen Tempo. Sie
 * hängen nicht am Kampftempo — wer »langsam« eingestellt hat, wartet hier
 * nicht länger, und wer »sofort« eingestellt hat, bekommt sie gar nicht erst
 * zu sehen. Nichts davon dauert länger als eine gute Sekunde.
 *
 * Gliederung:  1) Hilfen   2) Ball   3) Entwicklung   4) Levelaufstieg
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  var doc = root.document;

  /* ---------- 1) Hilfen ----------------------------------------------------- */

  /** Feste Zeiten in Millisekunden — bewusst knapp gehalten. */
  var MS = {
    throw: 200,        // Flugbahn des Balls
    absorb: 130,       // das Pokémon wird eingesogen
    drop: 80,          // der Ball fällt zu Boden
    shake: 110,        // ein einzelnes Wackeln
    verdict: 150,      // Klick oder Ausbruch
    morph: 620,        // Hin- und Herblinken bei der Entwicklung
    flash: 200,        // der Blitz danach
    reveal: 220,       // die neue Gestalt
    stat: 90           // eine Zeile der Werte-Tafel
  };

  function reduced() { return PL.fx ? PL.fx.reduced() : false; }

  function after(ms, fn) { return root.setTimeout(fn, ms); }

  function anim(node, frames, ms, opts) {
    opts = opts || {};
    if (!node.animate) return null;
    return node.animate(frames, {
      duration: ms, easing: opts.easing || 'linear',
      fill: opts.fill || 'forwards', delay: opts.delay || 0
    });
  }

  function centre(node, stage) {
    var a = node.getBoundingClientRect(), b = stage.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  }

  function layerFor(stage) {
    var layer = stage.querySelector('.moment-layer');
    if (!layer) {
      layer = doc.createElement('div');
      layer.className = 'moment-layer';
      stage.appendChild(layer);
    }
    return layer;
  }

  /* ---------- Der Ball ------------------------------------------------------
   * Gezeichnet statt gestapelt: für jede Bildzeile wird die Breite des
   * Kreises ausgerechnet und ausgefüllt. So ist die Silhouette wirklich rund
   * und trotzdem hart gerastert — genau wie ein Sprite auf dem GBA.
   * ------------------------------------------------------------------------ */

  var BALL_COLOR = {
    poke:   { top: '#e8402f', shade: '#a3241a' },
    super:  { top: '#3b7dd8', shade: '#255191' },
    hyper:  { top: '#f2c53d', shade: '#b58c15' },
    master: { top: '#7a4bbf', shade: '#4d2c80' },
    timer:  { top: '#dcdcdc', shade: '#9a9a9a' },
    net:    { top: '#2fa5a0', shade: '#1c6d6a' }
  };

  var ballCache = {};

  /** Zeichnet einen Ball mit 16 × 16 Pixeln und gibt ihn als Bildadresse zurück. */
  function ballImage(kind) {
    if (ballCache[kind]) return ballCache[kind];
    var col = BALL_COLOR[kind] || BALL_COLOR.poke;
    var S = 16, R = S / 2, cv = doc.createElement('canvas');
    cv.width = S; cv.height = S;
    var ctx = cv.getContext('2d'), y;

    // Eine Zeile des Kreises: von -span bis +span um die Mitte.
    function span(row) {
      var dy = (row + 0.5 - R) / R;
      var v = 1 - dy * dy;
      return v <= 0 ? 0 : Math.round(Math.sqrt(v) * R);
    }
    function row(y, x0, w, color) {
      if (w <= 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(x0, y, w, 1);
    }

    for (y = 0; y < S; y++) {
      var sp = span(y);
      if (!sp) continue;
      var x0 = R - sp, w = sp * 2;
      var isBand = y === 7 || y === 8;
      var fill = isBand ? '#1b1b22' : (y < 7 ? col.top : '#f4f4f4');
      row(y, x0, w, fill);
      if (isBand) continue;
      // Rand: eine Spur dunkler, damit der Kreis einen Kontur bekommt.
      row(y, x0, 1, '#1b1b22');
      row(y, x0 + w - 1, 1, '#1b1b22');
      if (y === 0 || y === S - 1) row(y, x0, w, '#1b1b22');
      // Untere Hälfte bekommt unten Schatten, obere oben ein Glanzlicht.
      if (y >= 12) row(y, x0 + 1, w - 2, '#cfcfd6');
      else if (y === 1 || y === 2) row(y, x0 + 2, Math.max(0, w - 5), lighten(col.top));
      else if (y >= 4 && y < 7) row(y, x0 + w - 3, 2, col.shade);
    }

    // Knopf in der Mitte
    ctx.fillStyle = '#1b1b22';
    ctx.fillRect(6, 6, 4, 4);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(7, 7, 2, 2);

    ballCache[kind] = cv.toDataURL('image/png');
    return ballCache[kind];
  }

  function lighten(hex) {
    var n = parseInt(hex.slice(1), 16);
    function up(v) { return Math.min(255, Math.round(v + (255 - v) * 0.45)); }
    return 'rgb(' + up((n >> 16) & 255) + ',' + up((n >> 8) & 255) + ',' + up(n & 255) + ')';
  }

  /** Der Ball als Bildelement — rund, hart skaliert. */
  function ballNode(kind) {
    var ball = doc.createElement('div');
    ball.className = 'moment-ball ball-' + (kind || 'poke');
    if (doc.createElement('canvas').getContext) {
      ball.style.backgroundImage = 'url(' + ballImage(kind || 'poke') + ')';
    }
    return ball;
  }

  var BALL_KIND = {
    pokeball: 'poke', superball: 'super', hyperball: 'hyper', meisterball: 'master',
    greatball: 'super', ultraball: 'hyper', masterball: 'master',
    timerball: 'timer', netzball: 'net', netball: 'net', flottball: 'timer', quickball: 'timer'
  };

  function kindOf(itemId) {
    return BALL_KIND[PL.util ? PL.util.toID(itemId || '') : String(itemId || '')] || 'poke';
  }

  /* ---------- 2) Der Ballwurf ----------------------------------------------- */

  /**
   * Wirft einen Ball auf das gegnerische Pokémon, saugt es ein und lässt den
   * Ball wackeln. `shakes` ist 0–3, `caught` entscheidet über Klick oder
   * Ausbruch. Gibt die Gesamtdauer zurück; `done` läuft danach.
   */
  function ball(opts, done) {
    var stage = opts.stage, target = opts.target;
    if (!stage || !target || reduced()) { if (done) done(); return 0; }

    var layer = layerFor(stage);
    var to = centre(target, stage);
    var from = { x: to.x - stage.clientWidth * 0.42, y: to.y + stage.clientHeight * 0.30 };
    var shakes = Math.max(0, Math.min(3, opts.shakes === undefined ? 3 : opts.shakes));
    var node = ballNode(kindOf(opts.item));
    node.style.left = (from.x - 8) + 'px';
    node.style.top = (from.y - 8) + 'px';
    layer.appendChild(node);

    var dx = to.x - from.x, dy = to.y - from.y, arc = Math.min(70, Math.abs(dx) * 0.32);
    anim(node, [
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - arc) + 'px) rotate(240deg)', offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(520deg)' }
    ], MS.throw, { easing: 'ease-out' });

    var t = MS.throw;

    // Einsaugen: das Pokémon schrumpft in den Ball hinein.
    after(t, function () {
      target.classList.add('being-caught');
      anim(target, [
        { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 },
        { transform: 'scale(0.15)', filter: 'brightness(3)', opacity: 0 }
      ], MS.absorb, { easing: 'ease-in' });
      beep(880, 0.06);
    });
    t += MS.absorb;

    // Der Ball fällt auf den Boden und wackelt.
    after(t, function () {
      anim(node, [
        { transform: 'translate(' + dx + 'px,' + dy + 'px)' },
        { transform: 'translate(' + dx + 'px,' + (dy + 14) + 'px)' }
      ], MS.drop, { easing: 'ease-in' });
    });
    t += MS.drop;

    var i;
    for (i = 0; i < shakes; i++) {
      (function (delay) {
        after(delay, function () {
          anim(node, [
            { transform: 'translate(' + dx + 'px,' + (dy + 14) + 'px) rotate(0deg)' },
            { transform: 'translate(' + (dx - 5) + 'px,' + (dy + 14) + 'px) rotate(-22deg)', offset: 0.3 },
            { transform: 'translate(' + (dx + 5) + 'px,' + (dy + 14) + 'px) rotate(22deg)', offset: 0.7 },
            { transform: 'translate(' + dx + 'px,' + (dy + 14) + 'px) rotate(0deg)' }
          ], MS.shake, { easing: 'ease-in-out' });
          beep(420, 0.04);
        });
      })(t);
      t += MS.shake;
    }

    // Klick oder Ausbruch.
    after(t, function () {
      if (opts.caught) {
        node.classList.add('clicked');
        sparkle(layer, to.x, dy + from.y + 14);
        beep(1320, 0.10);
      } else {
        anim(node, [
          { transform: 'translate(' + dx + 'px,' + (dy + 14) + 'px) scale(1)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + (dy + 4) + 'px) scale(2)', opacity: 0 }
        ], MS.verdict, { easing: 'ease-out' });
        target.classList.remove('being-caught');
        anim(target, [
          { transform: 'scale(0.2)', filter: 'brightness(3)', opacity: 0 },
          { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 }
        ], MS.verdict, { easing: 'ease-out' });
        beep(220, 0.08);
      }
    });
    t += MS.verdict;

    after(t + 50, function () {
      if (!opts.caught && node.parentNode) node.parentNode.removeChild(node);
      if (done) done();
    });
    return t + 50;
  }

  function sparkle(layer, x, y) {
    var i, n;
    for (i = 0; i < 6; i++) {
      n = doc.createElement('i');
      n.className = 'moment-spark';
      n.style.left = x + 'px';
      n.style.top = y + 'px';
      layer.appendChild(n);
      (function (node, ang) {
        anim(node, [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(' + Math.cos(ang) * 26 + 'px,' + (Math.sin(ang) * 26 - 8) + 'px) scale(0)', opacity: 0 }
        ], 380, { easing: 'ease-out' });
        after(400, function () { if (node.parentNode) node.parentNode.removeChild(node); });
      })(n, i / 6 * Math.PI * 2);
    }
  }

  /* ---------- 3) Die Entwicklung -------------------------------------------- */

  /**
   * Blendet zwischen alter und neuer Gestalt hin und her — erst gemächlich,
   * dann immer schneller — und lässt am Ende die neue Form aufblitzen.
   * `host` bekommt die beiden Bilder gestapelt.
   */
  function evolve(opts, done) {
    var host = opts.host, before = opts.before, afterImg = opts.after;
    if (!host || !before || !afterImg || reduced()) { if (done) done(); return 0; }

    host.classList.add('evo-stage');
    before.classList.add('evo-form', 'is-before');
    afterImg.classList.add('evo-form', 'is-after');
    host.appendChild(before);
    host.appendChild(afterImg);

    // Zeiten der einzelnen Blinker: von 130 ms herunter auf 40 ms.
    var steps = [], t = 0, gap = 130, showNew = true;
    while (t < MS.morph) {
      steps.push({ at: t, next: showNew });
      t += gap;
      gap = Math.max(40, gap * 0.78);
      showNew = !showNew;
    }
    steps.forEach(function (s) {
      after(s.at, function () {
        host.classList.toggle('show-after', s.next);
      });
    });
    after(MS.morph, function () {
      host.classList.add('show-after', 'evo-flash');
      beep(1046, 0.12);
    });
    after(MS.morph + MS.flash, function () {
      host.classList.remove('evo-flash');
      anim(afterImg, [
        { transform: 'scale(1.25)', filter: 'brightness(2)' },
        { transform: 'scale(1)', filter: 'brightness(1)' }
      ], MS.reveal, { easing: 'ease-out' });
      beep(1568, 0.16);
    });
    var total = MS.morph + MS.flash + MS.reveal;
    after(total, function () { if (done) done(); });
    return total;
  }

  /* ---------- 4) Der Levelaufstieg ------------------------------------------ */

  var STAT_LABEL = ['KP', 'ANG', 'VER', 'SP-ANG', 'SP-VER', 'INI'];

  /**
   * Baut eine Werte-Tafel: sechs Zeilen »ANG 54 → 58 (+4)«, die kurz
   * nacheinander einlaufen. Gibt { node, ms } zurück.
   */
  function levelPanel(opts) {
    var before = opts.before || [], now = opts.after || [];
    var panel = doc.createElement('div');
    panel.className = 'level-panel';

    var head = doc.createElement('div');
    head.className = 'level-panel-head';
    head.textContent = opts.title || 'Levelaufstieg';
    panel.appendChild(head);

    var rows = doc.createElement('div');
    rows.className = 'level-panel-rows';
    panel.appendChild(rows);

    var quick = reduced();
    STAT_LABEL.forEach(function (label, i) {
      var gain = (now[i] || 0) - (before[i] || 0);
      var row = doc.createElement('div');
      row.className = 'level-row' + (gain > 0 ? ' up' : '');
      row.innerHTML = '<span class="ls-name"></span><span class="ls-val"></span><span class="ls-gain"></span>';
      row.querySelector('.ls-name').textContent = label;
      row.querySelector('.ls-val').textContent = (before[i] || 0) + ' → ' + (now[i] || 0);
      row.querySelector('.ls-gain').textContent = gain > 0 ? '+' + gain : '';
      rows.appendChild(row);
      if (!quick) {
        row.style.opacity = '0';
        after(i * MS.stat, function () {
          row.style.opacity = '';
          anim(row, [
            { transform: 'translateX(-10px)', opacity: 0 },
            { transform: 'translateX(0)', opacity: 1 }
          ], 140, { easing: 'ease-out' });
          if (gain > 0) beep(660 + i * 60, 0.03);
        });
      }
    });

    return { node: panel, ms: quick ? 0 : STAT_LABEL.length * MS.stat + 140 };
  }

  /* ---------- Ton ----------------------------------------------------------- */

  // Den Ton stellt die Oberfläche bereit (sie kennt die Einstellung dafür).
  function beep(freq, len) {
    if (typeof PL.moments.sound === 'function') PL.moments.sound(freq, len);
  }

  PL.moments = {
    MS: MS,
    ball: ball, evolve: evolve, levelPanel: levelPanel,
    ballNode: ballNode, ballImage: ballImage, kindOf: kindOf, reduced: reduced,
    sound: null
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.moments;
})(typeof globalThis !== 'undefined' ? globalThis : this);
