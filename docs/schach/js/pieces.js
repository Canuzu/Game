/* =============================================================================
 * pieces.js — Figurengrafiken
 * -----------------------------------------------------------------------------
 * Selbst gezeichnete SVG-Silhouetten im 45x45-Raster (die uebliche Groesse fuer
 * Schachfiguren). Jede Figur wird einmal als <symbol> in das Dokument gelegt und
 * anschliessend per <use> referenziert — so liegt die Geometrie nur einmal im
 * DOM, egal wie oft eine Figur auf dem Brett steht.
 *
 * Fuellung und Kontur kommen aus CSS-Variablen, damit die Brett-Themes die
 * Figurenfarben mitsteuern koennen.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* Gemeinsamer Sockel, auf dem alle Figuren ausser dem Bauern stehen */
  var BASE = '<path d="M9 38.6h27a1.6 1.6 0 0 1 0 3.2H9a1.6 1.6 0 0 1 0-3.2z"/>' +
             '<path d="M11.5 34.2h22c.9 2 1.6 3.2 2.5 4.4h-27c.9-1.2 1.6-2.4 2.5-4.4z"/>';

  var SHAPES = {
    p: /* Bauer */
      '<circle cx="22.5" cy="12.6" r="5.4"/>' +
      '<path d="M22.5 17.4c-3.6 0-6.2 2.3-6.2 5 0 1.7 1 3 2.3 3.8-2.8 2-4.9 5.4-5.6 9.6h19c-.7-4.2-2.8-7.6-5.6-9.6 1.3-.8 2.3-2.1 2.3-3.8 0-2.7-2.6-5-6.2-5z"/>' +
      '<path d="M10.5 35.8h24a1.7 1.7 0 0 1 0 3.4h-24a1.7 1.7 0 0 1 0-3.4z"/>',

    r: /* Turm */
      '<path d="M11 8.2h4.6v3.4h4.6V8.2h4.6v3.4h4.6V8.2H34v7.4l-3.2 2.8v11.4l3.2 2.8v2.6H11v-2.6l3.2-2.8V18.4L11 15.6z"/>' +
      '<path d="M17.4 18.6h10.2v10.8H17.4z" class="pc-hole"/>' +
      BASE,

    n: /* Springer */
      '<path d="M17.6 9.4c3.6-2.4 8.4-2.6 12 .4 3.5 2.9 5.2 7.6 5.6 13 .3 4.2.2 8.2-.2 11.4H14.2c.2-3.6 1.3-6.1 3.1-8.2 1.9-2.2 4.5-3.8 6.6-5.6 1.3-1.1 2-2.1 1.7-3-.3-.9-1.4-1.2-2.4-.7-1 .5-1.6 1.5-2.6 2.6-1.1 1.2-2.6 2.2-4.4 2.2-1.9 0-3.3-1-4-2.5-.7-1.6-.5-3.5.5-5.2 1-1.7 2.6-3 4.9-4.4z"/>' +
      '<circle cx="18.4" cy="18.2" r="1.5" class="pc-eye"/>' +
      '<path d="M25.4 13.2c1.1.7 1.8 1.9 2 3.2" class="pc-line"/>' +
      BASE,

    b: /* Laeufer — Mitra mit dem ueblichen schraegen Schlitz */
      '<circle cx="22.5" cy="7.4" r="2.5"/>' +
      '<path d="M22.5 10.4c4.5 3.6 7.4 8.4 7.4 12.6 0 3-1.5 5.4-3.8 6.8h-7.2c-2.3-1.4-3.8-3.8-3.8-6.8 0-4.2 2.9-9 7.4-12.6z"/>' +
      '<path d="M19.3 20.4l6.4-5.4" class="pc-line"/>' +
      '<path d="M17.2 29.4h10.6v4.8H17.2z"/>' +
      BASE,

    q: /* Dame */
      '<circle cx="22.5" cy="7.4" r="2.4"/>' +
      '<circle cx="10.4" cy="12.4" r="2.1"/>' +
      '<circle cx="34.6" cy="12.4" r="2.1"/>' +
      '<circle cx="16" cy="9.2" r="1.8"/>' +
      '<circle cx="29" cy="9.2" r="1.8"/>' +
      '<path d="M10.4 14.6l3.4 12.2h17.4l3.4-12.2-5.6 5.6-2.4-9.6-3.7 9.4-3.7-9.4-2.4 9.6z"/>' +
      '<path d="M13.4 26.8h18.2c.7 2.6 1.3 4.6 2.2 7.4H11.2c.9-2.8 1.5-4.8 2.2-7.4z"/>' +
      '<path d="M13.6 30.4h17.8" class="pc-line"/>' +
      BASE,

    k: /* Koenig — breite Krone mit Kreuz, die groesste Silhouette auf dem Brett */
      '<path d="M22.5 3.4v9.8M17.9 7.6h9.2" class="pc-cross"/>' +
      '<path d="M9.8 31.6 8.6 15.2 14.8 21 22.5 11.4 30.2 21l6.2-5.8-1.2 16.4z"/>' +
      '<path d="M10 31.2h25l.6 3.6H9.4z"/>' +
      BASE
  };

  var NAMES = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' };
  var ORDER = ['p', 'n', 'b', 'r', 'q', 'k'];

  /** Legt alle Figuren als <symbol> in ein verstecktes <svg> im Dokument ab. */
  function installSprite(doc) {
    if (doc.getElementById('piece-sprite')) return;
    var parts = [];
    for (var i = 0; i < ORDER.length; i++) {
      var key = ORDER[i];
      parts.push('<symbol id="pc-' + key + '" viewBox="0 0 45 45">' + SHAPES[key] + '</symbol>');
    }
    var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'piece-sprite');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = parts.join('');
    doc.body.appendChild(svg);
  }

  /**
   * SVG-Markup fuer eine Figur.
   * @param {string} type  p n b r q k
   * @param {string} color 'w' oder 'b'
   */
  function markup(type, color) {
    return '<svg class="piece-svg ' + (color === 'w' ? 'is-white' : 'is-black') +
           '" viewBox="0 0 45 45" aria-hidden="true">' +
           '<use href="#pc-' + type + '"/></svg>';
  }

  function pieceName(type, color) {
    return (color === 'w' ? 'Weißer ' : 'Schwarzer ') + NAMES[type];
  }

  global.ChessPieces = {
    installSprite: installSprite,
    markup: markup,
    pieceName: pieceName,
    NAMES: NAMES,
    ORDER: ORDER
  };
})(typeof window !== 'undefined' ? window : globalThis);
