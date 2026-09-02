/* =============================================================================
 * scenery.js — Gezeichnete Umgebungen
 * -----------------------------------------------------------------------------
 * Jede Kulisse ist ein SVG mit drei Ebenen (Himmel, Ferne, Nähe) plus einem
 * Bodenband, dazu eine Handvoll Farbtokens für Plattformen und Beleuchtung und
 * optional bewegte Teilchen. Alles wird gezeichnet — es wird kein einziges
 * Bild geladen, damit die Kulissen auch offline und in Umgebungen mit
 * gesperrten externen Bildern stehen.
 *
 * Koordinatensystem: 400 × 150, unten verankert. Die Kulisse deckt die Bühne
 * ab (preserveAspectRatio="xMidYMax slice"), der Boden bleibt also immer
 * sichtbar, egal wie breit das Fenster ist.
 *
 * Gliederung:  1) Bausteine   2) Kulissen   3) Auswahl   4) Darstellung
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});

  /* ---------- 1) Bausteine ---------------------------------------------------- */

  /** Zackige Silhouette (Berge, Baumkronen, Dünen) als Pfad. */
  function ridge(points, baseY) {
    var d = 'M-10 ' + baseY;
    points.forEach(function (p) { d += ' L' + p[0] + ' ' + p[1]; });
    return d + ' L410 ' + baseY + ' L410 160 L-10 160 Z';
  }

  /** Weiche Hügelkette aus Bögen. */
  function hills(baseY, height, count, phase) {
    var step = 420 / count, d = 'M-10 ' + baseY, x = -10, i;
    for (i = 0; i < count; i++) {
      var h = height * (0.7 + 0.3 * Math.sin(i * 1.7 + phase));
      d += ' Q' + (x + step / 2) + ' ' + (baseY - h) + ' ' + (x + step) + ' ' + baseY;
      x += step;
    }
    return d + ' L410 160 L-10 160 Z';
  }

  /** Nadelbaum als Dreiecksstapel. */
  function conifer(x, y, h, w) {
    var s = '';
    for (var i = 0; i < 3; i++) {
      var t = y - h + (h / 3) * i;
      var ww = w * (0.55 + 0.22 * i);
      s += '<path d="M' + x + ' ' + t + ' L' + (x + ww) + ' ' + (t + h / 2.4) +
        ' L' + (x - ww) + ' ' + (t + h / 2.4) + ' Z"/>';
    }
    s += '<rect x="' + (x - 1.2) + '" y="' + (y - 4) + '" width="2.4" height="6"/>';
    return s;
  }

  /** Laubbaum: Stamm plus drei Kreise. */
  function broadleaf(x, y, h, w) {
    return '<rect x="' + (x - 1.6) + '" y="' + (y - h * 0.45) + '" width="3.2" height="' + h * 0.45 + '"/>' +
      '<circle cx="' + x + '" cy="' + (y - h * 0.62) + '" r="' + w + '"/>' +
      '<circle cx="' + (x - w * 0.7) + '" cy="' + (y - h * 0.48) + '" r="' + w * 0.72 + '"/>' +
      '<circle cx="' + (x + w * 0.7) + '" cy="' + (y - h * 0.5) + '" r="' + w * 0.68 + '"/>';
  }

  function svg(inner) {
    return '<svg class="scene-svg" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  function grad(id, from, to, x2, y2) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 || 0) + '" y2="' + (y2 === undefined ? 1 : y2) + '">' +
      '<stop offset="0" stop-color="' + from + '"/><stop offset="1" stop-color="' + to + '"/></linearGradient>';
  }

  function sky(id, from, to) {
    return '<defs>' + grad(id, from, to) + '</defs><rect x="-10" y="-10" width="420" height="170" fill="url(#' + id + ')"/>';
  }

  /* ---------- 2) Kulissen ------------------------------------------------------ */

  var B = {};

  function biome(id, o) { o.id = id; B[id] = o; return o; }

  biome('wiese', {
    name: 'Route', ground: '#6fae52', platform: '#7cc25c', edge: '#4d8a3a', light: 'rgba(255,246,200,.30)',
    particles: 'pollen',
    art: function () {
      return svg(
        sky('g-wiese', '#7ec8f0', '#cfeaf7') +
        '<circle cx="320" cy="26" r="16" fill="#fff6c8" opacity=".85"/>' +
        '<g fill="#ffffff" opacity=".55"><ellipse cx="90" cy="34" rx="26" ry="9"/><ellipse cx="112" cy="30" rx="18" ry="7"/>' +
        '<ellipse cx="255" cy="22" rx="20" ry="7"/></g>' +
        '<path d="' + hills(96, 26, 4, 0.4) + '" fill="#9dd07a" opacity=".75"/>' +
        '<path d="' + hills(108, 18, 6, 2.1) + '" fill="#7ebd5c"/>' +
        '<g fill="#4f8f3c">' + broadleaf(40, 112, 30, 11) + broadleaf(365, 116, 26, 9) + '</g>' +
        '<rect x="-10" y="118" width="420" height="42" fill="#6fae52"/>' +
        '<g fill="#8ccb6a" opacity=".7"><ellipse cx="120" cy="130" rx="60" ry="7"/><ellipse cx="300" cy="140" rx="70" ry="8"/></g>'
      );
    }
  });

  biome('wald', {
    name: 'Wald', ground: '#3f6b39', platform: '#4f8446', edge: '#2f5230', light: 'rgba(190,255,160,.18)',
    particles: 'leaves',
    art: function () {
      return svg(
        sky('g-wald', '#a8d38a', '#5d9450') +
        '<g fill="#2f5c34" opacity=".55">' + conifer(24, 96, 40, 13) + conifer(78, 92, 34, 11) +
        conifer(140, 95, 38, 12) + conifer(212, 93, 36, 12) + conifer(286, 94, 40, 13) +
        conifer(348, 90, 34, 11) + '</g>' +
        '<path d="' + ridge([[0, 78], [60, 62], [130, 74], [210, 58], [280, 72], [350, 60], [400, 74]], 78) + '" fill="#2c5531"/>' +
        '<g fill="#1f3f26">' + conifer(20, 118, 52, 17) + conifer(72, 122, 46, 15) +
        conifer(126, 118, 54, 18) + conifer(182, 124, 44, 14) + conifer(236, 119, 50, 16) +
        conifer(292, 123, 46, 15) + conifer(348, 118, 54, 18) + conifer(392, 122, 44, 14) + '</g>' +
        '<rect x="-10" y="118" width="420" height="42" fill="#3f6b39"/>' +
        '<g fill="#325a33" opacity=".8"><ellipse cx="80" cy="134" rx="55" ry="8"/><ellipse cx="330" cy="142" rx="65" ry="9"/></g>'
      );
    }
  });

  biome('hoehle', {
    name: 'Höhle', ground: '#3a3340', platform: '#4a4152', edge: '#282230', light: 'rgba(140,180,255,.14)',
    particles: 'drops',
    art: function () {
      var stal = '', i;
      for (i = 0; i < 11; i++) {
        var x = i * 38 + 8, h = 16 + ((i * 37) % 26);
        stal += '<path d="M' + (x - 7) + ' -6 L' + (x + 7) + ' -6 L' + x + ' ' + h + ' Z"/>';
      }
      var stag = '';
      for (i = 0; i < 7; i++) {
        var xx = i * 58 + 24, hh = 12 + ((i * 53) % 20);
        stag += '<path d="M' + (xx - 8) + ' 122 L' + (xx + 8) + ' 122 L' + xx + ' ' + (122 - hh) + ' Z"/>';
      }
      return svg(
        sky('g-hoehle', '#241f2b', '#171420') +
        '<ellipse cx="200" cy="70" rx="150" ry="60" fill="#2e2838" opacity=".8"/>' +
        '<g fill="#2b2534">' + stal + '</g>' +
        '<path d="' + ridge([[0, 96], [70, 84], [150, 94], [240, 80], [320, 92], [400, 84]], 96) + '" fill="#332c3d"/>' +
        '<g fill="#3b3446">' + stag + '</g>' +
        '<rect x="-10" y="118" width="420" height="42" fill="#3a3340"/>' +
        '<ellipse cx="200" cy="118" rx="150" ry="16" fill="#4a4152" opacity=".55"/>'
      );
    }
  });

  biome('berg', {
    name: 'Bergpfad', ground: '#8a7f6e', platform: '#9d907c', edge: '#655c4e', light: 'rgba(255,240,210,.25)',
    particles: 'dust',
    art: function () {
      return svg(
        sky('g-berg', '#9dc4e0', '#e6dcc8') +
        '<path d="' + ridge([[0, 58], [50, 20], [95, 46], [150, 12], [205, 44], [265, 18], [320, 48], [400, 26]], 58) + '" fill="#8fa3b8" opacity=".7"/>' +
        '<g fill="#ffffff" opacity=".85"><path d="M150 12 L138 32 L162 32 Z"/><path d="M265 18 L254 36 L277 36 Z"/><path d="M50 20 L40 38 L61 38 Z"/></g>' +
        '<path d="' + ridge([[0, 88], [70, 66], [140, 84], [220, 62], [300, 82], [400, 70]], 88) + '" fill="#7d7263"/>' +
        '<rect x="-10" y="112" width="420" height="48" fill="#8a7f6e"/>' +
        '<g fill="#6d6355" opacity=".7"><ellipse cx="70" cy="128" rx="34" ry="6"/><ellipse cx="250" cy="138" rx="46" ry="7"/>' +
        '<circle cx="330" cy="122" r="7"/><circle cx="120" cy="146" r="5"/></g>'
      );
    }
  });

  biome('schnee', {
    name: 'Eisfeld', ground: '#e8f1f8', platform: '#d3e6f2', edge: '#a9c6dc', light: 'rgba(200,230,255,.35)',
    particles: 'snow',
    art: function () {
      return svg(
        sky('g-schnee', '#5f86ab', '#bcd7e8') +
        '<path d="' + ridge([[0, 56], [60, 24], [120, 50], [190, 18], [260, 48], [330, 26], [400, 52]], 56) + '" fill="#9fbdd4" opacity=".8"/>' +
        '<path d="' + ridge([[0, 82], [80, 60], [160, 80], [250, 58], [340, 78], [400, 66]], 82) + '" fill="#cfe2ef"/>' +
        '<g fill="#a9cbe0" opacity=".9"><path d="M40 118 L58 86 L76 118 Z"/><path d="M300 120 L318 92 L336 120 Z"/>' +
        '<path d="M355 118 L368 100 L381 118 Z"/></g>' +
        '<rect x="-10" y="116" width="420" height="44" fill="#e8f1f8"/>' +
        '<g fill="#c9dded" opacity=".8"><ellipse cx="140" cy="132" rx="70" ry="8"/><ellipse cx="320" cy="144" rx="60" ry="7"/></g>'
      );
    }
  });

  biome('strand', {
    name: 'Küste', ground: '#e6d7a8', platform: '#efe0b4', edge: '#c4b184', light: 'rgba(255,240,190,.32)',
    particles: 'pollen',
    art: function () {
      return svg(
        sky('g-strand', '#79c6e8', '#dff0f5') +
        '<circle cx="70" cy="30" r="14" fill="#fff3c4" opacity=".9"/>' +
        '<defs>' + grad('g-meer', '#2f8fbf', '#63bcd8') + '</defs>' +
        '<rect x="-10" y="74" width="420" height="42" fill="url(#g-meer)"/>' +
        '<g fill="#ffffff" opacity=".55"><ellipse cx="80" cy="92" rx="34" ry="3"/><ellipse cx="230" cy="86" rx="42" ry="3"/>' +
        '<ellipse cx="330" cy="100" rx="30" ry="3"/><ellipse cx="150" cy="106" rx="50" ry="3.5"/></g>' +
        '<path d="M-10 116 Q100 108 200 116 Q300 124 410 114 L410 160 L-10 160 Z" fill="#e6d7a8"/>' +
        '<g fill="#d6c391" opacity=".8"><ellipse cx="110" cy="134" rx="55" ry="7"/><ellipse cx="320" cy="144" rx="60" ry="7"/></g>' +
        '<g fill="#3f7a45"><rect x="366" y="92" width="3" height="26"/>' +
        '<path d="M367 92 Q350 84 340 92 Q352 88 367 96 Z"/><path d="M367 92 Q384 84 394 92 Q382 88 367 96 Z"/>' +
        '<path d="M367 92 Q358 76 366 68 Q368 80 371 94 Z"/></g>'
      );
    }
  });

  biome('wasser', {
    name: 'Gewässer', ground: '#2f7fa8', platform: '#4c9cc0', edge: '#245f80', light: 'rgba(180,235,255,.28)',
    particles: 'bubbles',
    art: function () {
      return svg(
        sky('g-wasser', '#8ed2ea', '#3f9cc4') +
        '<path d="' + hills(72, 14, 5, 1.2) + '" fill="#2e7fa6" opacity=".55"/>' +
        '<defs>' + grad('g-tief', '#3f9cc4', '#1f5f80') + '</defs>' +
        '<rect x="-10" y="86" width="420" height="74" fill="url(#g-tief)"/>' +
        '<g stroke="#bfe9f7" stroke-width="1.4" fill="none" opacity=".5">' +
        '<path d="M-10 100 Q40 96 90 100 T190 100 T290 100 T410 100"/>' +
        '<path d="M-10 118 Q50 113 110 118 T230 118 T350 118 T410 118"/>' +
        '<path d="M-10 138 Q60 132 130 138 T270 138 T410 138"/></g>' +
        '<g fill="#3d8f4f" opacity=".9"><ellipse cx="60" cy="126" rx="22" ry="7"/><ellipse cx="340" cy="112" rx="18" ry="6"/></g>'
      );
    }
  });

  biome('vulkan', {
    name: 'Vulkan', ground: '#3a2b28', platform: '#4d3833', edge: '#241a18', light: 'rgba(255,140,60,.30)',
    particles: 'embers',
    art: function () {
      return svg(
        sky('g-vulkan', '#5a2320', '#c05a2a') +
        '<circle cx="330" cy="26" r="10" fill="#ffb15c" opacity=".5"/>' +
        '<path d="' + ridge([[0, 84], [90, 40], [130, 52], [180, 34], [240, 60], [320, 44], [400, 74]], 84) + '" fill="#4a2f2a"/>' +
        '<path d="M180 34 L168 46 Q180 40 194 46 Z" fill="#ff8a3c"/>' +
        '<path d="M181 38 Q186 50 179 62 Q190 52 185 39 Z" fill="#ff6a2a" opacity=".85"/>' +
        '<g fill="#ff8a3c" opacity=".5"><circle cx="176" cy="30" r="2.5"/><circle cx="188" cy="26" r="2"/>' +
        '<circle cx="182" cy="20" r="1.6"/></g>' +
        '<path d="' + ridge([[0, 104], [80, 92], [160, 104], [250, 88], [340, 102], [400, 94]], 104) + '" fill="#33231f"/>' +
        '<rect x="-10" y="118" width="420" height="42" fill="#3a2b28"/>' +
        '<g fill="#ff7a30" opacity=".75"><ellipse cx="120" cy="132" rx="46" ry="4"/><ellipse cx="310" cy="144" rx="56" ry="4"/></g>' +
        '<g fill="#2a1d1a"><circle cx="60" cy="140" r="8"/><circle cx="250" cy="128" r="6"/><circle cx="380" cy="136" r="7"/></g>'
      );
    }
  });

  biome('wueste', {
    name: 'Wüste', ground: '#dcb877', platform: '#e8c78a', edge: '#b8945c', light: 'rgba(255,225,160,.34)',
    particles: 'sand',
    art: function () {
      return svg(
        sky('g-wueste', '#e8a35c', '#f6ddb0') +
        '<circle cx="110" cy="34" r="20" fill="#fff0c0" opacity=".8"/>' +
        '<path d="' + hills(86, 22, 3, 0.9) + '" fill="#cfa268" opacity=".8"/>' +
        '<path d="' + hills(104, 16, 4, 2.6) + '" fill="#dcb877"/>' +
        '<g fill="#4f7a45"><rect x="330" y="88" width="7" height="34" rx="3"/>' +
        '<rect x="316" y="98" width="6" height="18" rx="3"/><rect x="316" y="98" width="18" height="6" rx="3"/>' +
        '<rect x="345" y="92" width="6" height="22" rx="3"/><rect x="333" y="92" width="18" height="6" rx="3"/></g>' +
        '<rect x="-10" y="116" width="420" height="44" fill="#dcb877"/>' +
        '<g fill="#c9a465" opacity=".8"><ellipse cx="120" cy="132" rx="66" ry="7"/><ellipse cx="310" cy="146" rx="58" ry="6"/></g>'
      );
    }
  });

  biome('stadt', {
    name: 'Stadt', ground: '#5b5f6b', platform: '#6d7280', edge: '#43464f', light: 'rgba(255,235,200,.22)',
    particles: null,
    art: function () {
      var houses = '', i;
      for (i = 0; i < 16; i++) {
        var x = i * 26 - 6, w = 18 + ((i * 13) % 9), h = 26 + ((i * 29) % 46);
        houses += '<rect x="' + x + '" y="' + (104 - h) + '" width="' + w + '" height="' + h + '" rx="1.5"/>';
      }
      var win = '';
      for (i = 0; i < 84; i++) {
        var wx = 4 + (i % 28) * 14.4, wy = 62 + Math.floor(i / 28) * 11;
        if ((i * 7) % 5 === 0) continue;
        win += '<rect x="' + wx.toFixed(1) + '" y="' + wy + '" width="3.4" height="4.4" rx=".8"/>';
      }
      return svg(
        sky('g-stadt', '#5d7ba8', '#c9d8e8') +
        '<g fill="#4e5766" opacity=".65"><rect x="20" y="34" width="26" height="70"/><rect x="250" y="26" width="30" height="78"/></g>' +
        '<g fill="#3f4654">' + houses + '</g>' +
        '<g fill="#ffd98a" opacity=".85">' + win + '</g>' +
        '<rect x="-10" y="104" width="420" height="56" fill="#5b5f6b"/>' +
        '<rect x="-10" y="104" width="420" height="4" fill="#7b808d"/>' +
        '<g fill="#8b909d" opacity=".8"><rect x="40" y="126" width="34" height="3" rx="1.5"/>' +
        '<rect x="150" y="126" width="34" height="3" rx="1.5"/><rect x="260" y="126" width="34" height="3" rx="1.5"/></g>'
      );
    }
  });

  biome('arena', {
    name: 'Arena', ground: '#7d5a3c', platform: '#96704b', edge: '#5b4029', light: 'rgba(255,220,140,.30)',
    particles: null,
    art: function () {
      var crowd = '', i;
      for (i = 0; i < 176; i++) {
        var cx = 4 + (i % 44) * 9.1 + (Math.floor(i / 44) % 2) * 4.5;
        var cy = 22 + Math.floor(i / 44) * 8.6;
        var tone = ['#e8d0a0', '#cf9f7a', '#a8bcd8', '#d8a8b4', '#bda8d8'][i % 5];
        crowd += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.3" fill="' + tone + '"/>';
      }
      return svg(
        sky('g-arena', '#2b2f3e', '#4a4257') +
        '<rect x="-10" y="10" width="420" height="46" fill="#39304a"/>' +
        '<g opacity=".85">' + crowd + '</g>' +
        '<rect x="-10" y="56" width="420" height="8" fill="#584a6e"/>' +
        '<path d="M-10 64 L410 64 L410 96 L-10 96 Z" fill="#463b58"/>' +
        '<g fill="#5f5178" opacity=".7"><rect x="-10" y="72" width="420" height="2"/>' +
        '<rect x="-10" y="84" width="420" height="2"/></g>' +
        '<g fill="#ffe9a8" opacity=".18"><path d="M60 56 L20 160 L120 160 Z"/><path d="M340 56 L300 160 L400 160 Z"/></g>' +
        '<rect x="-10" y="96" width="420" height="64" fill="#7d5a3c"/>' +
        '<g stroke="#e8d9b8" stroke-width="1.6" fill="none" opacity=".55">' +
        '<ellipse cx="200" cy="132" rx="150" ry="24"/><path d="M200 108 L200 156"/></g>'
      );
    }
  });

  biome('liga', {
    name: 'Liga-Halle', ground: '#2d2a3d', platform: '#3f3a55', edge: '#1d1b2a', light: 'rgba(255,210,120,.28)',
    particles: 'sparks',
    art: function () {
      var pillars = '', i;
      for (i = 0; i < 5; i++) {
        var x = 18 + i * 92;
        pillars += '<rect x="' + x + '" y="18" width="16" height="86" fill="#4a4463"/>' +
          '<rect x="' + (x - 3) + '" y="14" width="22" height="7" rx="2" fill="#5b5478"/>' +
          '<rect x="' + (x - 3) + '" y="100" width="22" height="7" rx="2" fill="#5b5478"/>';
      }
      return svg(
        sky('g-liga', '#191727', '#332e48') +
        '<rect x="-10" y="-10" width="420" height="26" fill="#241f36"/>' +
        pillars +
        '<g fill="#c9a227" opacity=".85"><path d="M186 20 L214 20 L210 62 L200 72 L190 62 Z"/></g>' +
        '<path d="M186 20 L214 20 L212 34 L188 34 Z" fill="#e8c14a"/>' +
        '<rect x="-10" y="104" width="420" height="56" fill="#2d2a3d"/>' +
        '<rect x="150" y="104" width="100" height="56" fill="#8b2f3a" opacity=".85"/>' +
        '<g stroke="#c9a227" stroke-width="1.2" fill="none" opacity=".5"><path d="M150 104 L150 160"/><path d="M250 104 L250 160"/></g>'
      );
    }
  });

  biome('ruine', {
    name: 'Ruine', ground: '#6e6a55', platform: '#837e66', edge: '#4e4b3c', light: 'rgba(230,235,190,.22)',
    particles: 'dust',
    art: function () {
      return svg(
        sky('g-ruine', '#8f9cb0', '#d8d2bc') +
        '<path d="' + hills(84, 20, 4, 1.8) + '" fill="#7f8a76" opacity=".7"/>' +
        '<g fill="#9a957c">' +
        '<rect x="34" y="52" width="18" height="66"/><rect x="30" y="46" width="26" height="8"/>' +
        '<rect x="96" y="70" width="16" height="48"/>' +
        '<rect x="286" y="58" width="18" height="60"/><rect x="282" y="52" width="26" height="8"/>' +
        '<rect x="344" y="80" width="15" height="38"/>' +
        '<path d="M30 46 L308 46 L308 56 L30 56 Z" opacity=".55"/></g>' +
        '<g fill="#5f8a4e" opacity=".7"><ellipse cx="43" cy="118" rx="16" ry="5"/><ellipse cx="295" cy="118" rx="16" ry="5"/>' +
        '<ellipse cx="104" cy="118" rx="12" ry="4"/></g>' +
        '<rect x="-10" y="118" width="420" height="42" fill="#6e6a55"/>' +
        '<g stroke="#575343" stroke-width="1" opacity=".6"><path d="M-10 132 L410 132"/><path d="M60 118 L60 160"/>' +
        '<path d="M180 118 L180 160"/><path d="M300 118 L300 160"/></g>'
      );
    }
  });

  biome('dschungel', {
    name: 'Dschungel', ground: '#2f5a34', platform: '#3d7340', edge: '#204224', light: 'rgba(190,255,150,.16)',
    particles: 'leaves',
    art: function () {
      var leaves = '', i;
      for (i = 0; i < 26; i++) {
        var x = i * 16 - 4, y = -6 + ((i * 19) % 26);
        leaves += '<ellipse cx="' + x + '" cy="' + y + '" rx="17" ry="11" transform="rotate(' + ((i % 4) * 12 - 18) + ' ' + x + ' ' + y + ')"/>';
      }
      return svg(
        sky('g-dschungel', '#7fbf6a', '#2e5c36') +
        '<g fill="#1f4526" opacity=".85">' + leaves + '</g>' +
        '<g stroke="#2b5c31" stroke-width="3" fill="none" opacity=".8">' +
        '<path d="M60 6 Q52 40 66 74"/><path d="M210 4 Q222 42 206 84"/><path d="M340 8 Q330 44 344 78"/></g>' +
        '<path d="' + ridge([[0, 92], [70, 76], [150, 90], [230, 72], [320, 88], [400, 78]], 92) + '" fill="#28502c"/>' +
        '<rect x="-10" y="116" width="420" height="44" fill="#2f5a34"/>' +
        '<g fill="#3d7340" opacity=".8"><ellipse cx="110" cy="132" rx="60" ry="8"/><ellipse cx="320" cy="144" rx="62" ry="8"/></g>'
      );
    }
  });

  biome('nacht', {
    name: 'Nachtlager', ground: '#2b3242', platform: '#3a4356', edge: '#1c212c', light: 'rgba(255,170,80,.30)',
    particles: 'sparks',
    art: function () {
      var stars = '', i;
      for (i = 0; i < 46; i++) {
        var x = (i * 61) % 400, y = ((i * 37) % 66) + 4, r = 0.7 + ((i * 13) % 10) / 9;
        stars += '<circle cx="' + x + '" cy="' + y + '" r="' + r.toFixed(1) + '"/>';
      }
      return svg(
        sky('g-nacht', '#131a2e', '#3d4a68') +
        '<g fill="#ffffff" opacity=".8">' + stars + '</g>' +
        '<circle cx="330" cy="30" r="15" fill="#f2f0d8"/><circle cx="324" cy="26" r="13" fill="#131a2e" opacity=".85"/>' +
        '<path d="' + ridge([[0, 92], [80, 74], [170, 90], [260, 70], [350, 88], [400, 80]], 92) + '" fill="#20283a"/>' +
        '<rect x="-10" y="116" width="420" height="44" fill="#2b3242"/>' +
        '<g><ellipse cx="200" cy="140" rx="34" ry="12" fill="#ff9a3c" opacity=".22"/>' +
        '<path d="M188 140 L212 140 L206 128 Z" fill="#5a4230"/>' +
        '<path d="M200 116 Q206 128 200 138 Q194 128 200 116 Z" fill="#ffb347"/>' +
        '<path d="M200 122 Q204 130 200 137 Q196 130 200 122 Z" fill="#ffe08a"/></g>'
      );
    }
  });

  /* ---------- 3) Auswahl -------------------------------------------------------- */

  // Welche Kulissen zu welcher Region gehören. Die Reihenfolge ist die
  // Wahrscheinlichkeit: der erste Eintrag kommt am häufigsten.
  var REGION_BIOMES = {
    kanto: ['wiese', 'wald', 'hoehle', 'stadt'],
    johto: ['wald', 'ruine', 'berg', 'wiese'],
    hoenn: ['strand', 'wald', 'vulkan', 'wasser'],
    sinnoh: ['schnee', 'berg', 'hoehle', 'wiese'],
    einall: ['stadt', 'wueste', 'wald', 'berg'],
    kalos: ['wiese', 'stadt', 'ruine', 'hoehle'],
    alola: ['strand', 'dschungel', 'vulkan', 'wasser'],
    galar: ['wiese', 'schnee', 'stadt', 'ruine'],
    paldea: ['wueste', 'wiese', 'berg', 'dschungel']
  };

  // Manche Knotenarten bringen ihre eigene Umgebung mit.
  var NODE_BIOMES = {
    boss: 'arena', e4: 'liga', champ: 'liga',
    shop: 'stadt', rest: 'nacht', item: 'hoehle'
  };

  /**
   * Wählt eine Kulisse. regionId ist die Region des Runs, nodeType die Art des
   * Knotens; seed sorgt dafür, dass derselbe Knoten immer gleich aussieht.
   */
  function pick(regionId, nodeType, seed) {
    if (NODE_BIOMES[nodeType]) return NODE_BIOMES[nodeType];
    var list = REGION_BIOMES[regionId] || REGION_BIOMES.kanto;
    var weights = [46, 26, 17, 11];
    var r = (Math.abs(seed | 0) % 100);
    var acc = 0;
    for (var i = 0; i < list.length; i++) {
      acc += weights[i] || 8;
      if (r < acc) return list[i];
    }
    return list[0];
  }

  /* ---------- 4) Darstellung ----------------------------------------------------- */

  var PARTICLES = {
    leaves: { count: 14, cls: 'p-leaf' },
    snow: { count: 26, cls: 'p-snow' },
    embers: { count: 18, cls: 'p-ember' },
    drops: { count: 10, cls: 'p-drop' },
    sand: { count: 20, cls: 'p-sand' },
    pollen: { count: 14, cls: 'p-pollen' },
    bubbles: { count: 12, cls: 'p-bubble' },
    sparks: { count: 14, cls: 'p-spark' },
    dust: { count: 12, cls: 'p-dust' }
  };

  /**
   * Baut die Kulisse in ein Element. Erwartet ein Element mit position:relative;
   * setzt zusätzlich die Farbtokens für Plattformen und Licht.
   */
  function render(host, biomeId, opts) {
    opts = opts || {};
    var b = B[biomeId] || B.wiese;
    host.className = host.className.replace(/\bb-[a-z]+\b/g, '').trim() + ' b-' + b.id;
    host.style.setProperty('--scene-ground', b.ground);
    host.style.setProperty('--scene-platform', b.platform);
    host.style.setProperty('--scene-edge', b.edge);
    host.style.setProperty('--scene-light', b.light);

    var layer = host.querySelector('.scene-layer');
    if (!layer) {
      layer = root.document.createElement('div');
      layer.className = 'scene-layer';
      host.insertBefore(layer, host.firstChild);
    }
    var art = b.art();
    // Auf hohen Flächen (etwa der Karte) wird die Kulisse gedehnt statt
    // beschnitten — sonst füllt ein einzelner Hügel den halben Bildschirm.
    if (opts.stretch) art = art.replace('preserveAspectRatio="xMidYMax slice"', 'preserveAspectRatio="none"');
    layer.innerHTML = art + (opts.particles === false ? '' : particleMarkup(b.particles));
    return b;
  }

  function particleMarkup(kind) {
    var spec = PARTICLES[kind];
    if (!spec) return '';
    var out = '<div class="scene-particles ' + spec.cls + '">', i;
    for (i = 0; i < spec.count; i++) {
      var left = ((i * 37) % 100), delay = ((i * 13) % 90) / 10, dur = 5 + ((i * 7) % 60) / 10;
      var drift = ((i * 29) % 40) - 20;
      out += '<i style="left:' + left + '%;animation-delay:-' + delay + 's;animation-duration:' + dur +
        's;--drift:' + drift + 'px"></i>';
    }
    return out + '</div>';
  }

  PL.scenery = {
    biomes: B,
    regionBiomes: REGION_BIOMES,
    nodeBiomes: NODE_BIOMES,
    pick: pick,
    render: render,
    get: function (id) { return B[id] || B.wiese; },
    list: function () { return Object.keys(B); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.scenery;
})(typeof globalThis !== 'undefined' ? globalThis : this);
