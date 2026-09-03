/* =============================================================================
 * scenery.js — Gezeichnete Umgebungen im GBA-Stil
 * -----------------------------------------------------------------------------
 * Jede Kulisse wird auf einem 240 × 80 Pixel großen Canvas gezeichnet — genau
 * so breit wie ein Game-Boy-Advance-Bild — und anschließend hart hochskaliert
 * (image-rendering: pixelated). Dadurch sind die Pixel groß und sichtbar,
 * statt weichgezeichnet zu verschwimmen.
 *
 * Gezeichnet wird mit wenigen Grundformen und einer kleinen Palette je
 * Umgebung. Farbverläufe entstehen als Bänder mit Dither-Übergängen, wie es
 * die Hardware damals gemacht hat — kein einziger weicher Verlauf.
 *
 * Gliederung:  1) Zeichenwerkzeug   2) Kulissen   3) Auswahl   4) Darstellung
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  var W = 240, H = 80;                    // Auflösung der Kulisse in Pixeln

  /* ---------- 1) Zeichenwerkzeug ---------------------------------------------- */

  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  function poly(ctx, pts, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
    for (var i = 1; i < pts.length; i++) ctx.lineTo(Math.round(pts[i][0]), Math.round(pts[i][1]));
    ctx.closePath();
    ctx.fill();
  }

  /** Waagerechte Farbbänder mit gepunktetem Übergang — der GBA-Verlauf. */
  function bands(ctx, y0, y1, colors) {
    var n = colors.length, span = (y1 - y0) / n, i, y, k, x;
    for (i = 0; i < n; i++) {
      y = y0 + span * i;
      px(ctx, 0, y, W, Math.ceil(span) + 1, colors[i]);
    }
    // Dither-Naht zwischen den Bändern: jede zweite Spalte einen Pixel tief
    for (i = 1; i < n; i++) {
      y = Math.round(y0 + span * i);
      for (x = 0; x < W; x += 2) px(ctx, x, y - 1, 1, 1, colors[i]);
      for (x = 1; x < W; x += 2) px(ctx, x, y, 1, 1, colors[i - 1]);
    }
  }

  /** Silhouette aus Spalten: fn(x) liefert die Höhe an dieser Stelle. */
  function silhouette(ctx, fn, baseY, color, shade) {
    var x, top, prev = null;
    for (x = 0; x < W; x++) {
      top = Math.round(baseY - fn(x));
      px(ctx, x, top, 1, H - top, color);
      if (shade && (prev === null || top < prev)) px(ctx, x, top, 1, 1, shade);
      prev = top;
    }
  }

  function wave(amp, freq, phase, base) {
    return function (x) {
      return base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35;
    };
  }

  /** Nadelbaum aus gestapelten Dreiecksstufen. */
  function conifer(ctx, x, groundY, h, dark, light) {
    var w = Math.max(3, Math.round(h * 0.42)), i, rows = 3, step = h / rows;
    px(ctx, x - 1, groundY - 3, 3, 4, dark);
    for (i = 0; i < rows; i++) {
      var top = groundY - h + step * i;
      var ww = Math.round(w * (0.45 + 0.28 * i));
      poly(ctx, [[x, top], [x + ww, top + step * 1.25], [x - ww, top + step * 1.25]], i === 0 ? light : dark);
      poly(ctx, [[x, top + 1], [x + ww - 2, top + step * 1.25], [x, top + step * 1.25]], dark);
    }
  }

  /** Laubbaum: Stamm plus zwei Kronenblöcke. */
  function bush(ctx, x, groundY, r, dark, light) {
    px(ctx, x - 1, groundY - r, 2, r, '#5a3f28');
    px(ctx, x - r, groundY - r * 2.2, r * 2, r * 1.5, dark);
    px(ctx, x - r + 1, groundY - r * 2.4, r * 2 - 2, r * 0.8, light);
  }

  /** Streut Pixel als Struktur (Gras, Kies, Sterne). */
  function speckle(ctx, x0, y0, w, h, color, count, seed) {
    var i, s = seed || 7;
    for (i = 0; i < count; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var sx = x0 + (s >> 7) % w;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var sy = y0 + (s >> 7) % h;
      px(ctx, sx, sy, 1, 1, color);
    }
  }

  /* ---------- 2) Kulissen ------------------------------------------------------ */

  var B = {};
  function biome(id, o) { o.id = id; B[id] = o; return o; }

  biome('wiese', {
    tile: 'gras',
    sky: '#5090d8',
    name: 'Route', ground: '#68a848', platform: '#7cc25c', edge: '#3c7030', light: 'rgba(255,246,200,.16)',
    particles: 'pollen',
    draw: function (ctx) {
      bands(ctx, 0, 44, ['#5090d8', '#68a8e0', '#88c0e8', '#a8d8f0']);
      px(ctx, 188, 8, 14, 3, '#f8f0b8'); px(ctx, 191, 5, 8, 9, '#f8f0b8'); px(ctx, 194, 4, 2, 11, '#f8f0b8');
      px(ctx, 30, 14, 26, 4, '#ffffff'); px(ctx, 36, 11, 14, 4, '#ffffff');
      px(ctx, 120, 9, 20, 3, '#ffffff'); px(ctx, 126, 7, 10, 3, '#ffffff');
      silhouette(ctx, wave(5, 0.035, 1.2, 12), 56, '#88c060', '#a8d878');
      silhouette(ctx, wave(3, 0.05, 3.4, 7), 62, '#68a848', '#88c060');
      px(ctx, 0, 62, W, H - 62, '#68a848');
      px(ctx, 0, 62, W, 2, '#88c060');
      conifer(ctx, 18, 62, 20, '#2c6030', '#3c8038');
      bush(ctx, 214, 62, 7, '#2c6030', '#4c9040');
      speckle(ctx, 0, 64, W, 16, '#7cc25c', 90, 11);
      speckle(ctx, 0, 64, W, 16, '#4c8438', 60, 29);
    }
  });

  biome('wald', {
    tile: 'gras',
    sky: '#6ba048',
    name: 'Wald', ground: '#3c6838', platform: '#4f8446', edge: '#24421f', light: 'rgba(190,255,160,.10)',
    particles: 'leaves',
    draw: function (ctx) {
      bands(ctx, 0, 36, ['#6ba048', '#568c3c', '#447434']);
      silhouette(ctx, wave(6, 0.045, 0.6, 16), 40, '#2c5830');
      var i;
      for (i = 0; i < 9; i++) conifer(ctx, 12 + i * 28, 44, 18 + (i % 3) * 4, '#24471f', '#356b2c');
      px(ctx, 0, 44, W, 8, '#325c30');
      for (i = 0; i < 8; i++) conifer(ctx, 4 + i * 32 + (i % 2) * 12, 62, 26 + (i % 3) * 6, '#1b3a1c', '#2c5c28');
      px(ctx, 0, 62, W, H - 62, '#3c6838');
      px(ctx, 0, 62, W, 2, '#4f8446');
      speckle(ctx, 0, 64, W, 16, '#4f8446', 80, 5);
      speckle(ctx, 0, 64, W, 16, '#2c5028', 50, 41);
    }
  });

  biome('hoehle', {
    tile: 'fels',
    sky: '#1d1a26',
    name: 'Höhle', ground: '#4a4050', platform: '#5c5064', edge: '#2a2432', light: 'rgba(150,190,255,.10)',
    particles: 'drops',
    draw: function (ctx) {
      bands(ctx, 0, 34, ['#1d1a26', '#26212f', '#302a3a']);
      var i, x, h;
      for (i = 0; i < 16; i++) {                       // Tropfsteine von oben
        x = i * 15 + 3; h = 6 + ((i * 37) % 12);
        poly(ctx, [[x - 3, 0], [x + 3, 0], [x, h]], '#332c3d');
        px(ctx, x - 1, 0, 1, h - 2, '#463c52');
      }
      silhouette(ctx, wave(4, 0.06, 2.1, 10), 46, '#393144');
      px(ctx, 0, 46, W, 16, '#332c3d');
      for (i = 0; i < 9; i++) {                        // Stalagmiten
        x = i * 27 + 8; h = 5 + ((i * 53) % 9);
        poly(ctx, [[x - 3, 62], [x + 3, 62], [x, 62 - h]], '#463c52');
      }
      px(ctx, 0, 62, W, H - 62, '#4a4050');
      px(ctx, 0, 62, W, 2, '#5c5064');
      speckle(ctx, 0, 64, W, 16, '#5c5064', 70, 13);
      speckle(ctx, 0, 20, W, 24, '#4a4058', 40, 77);
    }
  });

  biome('berg', {
    tile: 'fels',
    sky: '#7ba4c8',
    name: 'Bergpfad', ground: '#98866c', platform: '#b0a084', edge: '#6c5e4a', light: 'rgba(255,240,210,.14)',
    particles: 'dust',
    draw: function (ctx) {
      bands(ctx, 0, 40, ['#7ba4c8', '#9cbcd8', '#c0d4e4', '#dcd8c8']);
      silhouette(ctx, function (x) {
        return 20 + Math.abs(Math.sin(x * 0.028)) * 16 + Math.abs(Math.sin(x * 0.011 + 2)) * 10;
      }, 52, '#8496ac', '#c8d8e8');
      silhouette(ctx, wave(6, 0.03, 1.9, 12), 60, '#847460', '#a89880');
      px(ctx, 0, 60, W, H - 60, '#98866c');
      px(ctx, 0, 60, W, 2, '#b0a084');
      var i;
      for (i = 0; i < 7; i++) {
        var x = 12 + i * 34, y = 64 + (i % 3) * 4, r = 2 + (i % 3);
        px(ctx, x, y, r * 2, r, '#7c6c58'); px(ctx, x + 1, y - 1, r, 1, '#b0a084');
      }
      speckle(ctx, 0, 62, W, 18, '#7c6c58', 70, 23);
    }
  });

  biome('schnee', {
    tile: 'schnee',
    sky: '#4c74a0',
    name: 'Eisfeld', ground: '#e8f0f8', platform: '#d0e4f0', edge: '#98b8d0', light: 'rgba(200,230,255,.22)',
    particles: 'snow',
    draw: function (ctx) {
      bands(ctx, 0, 40, ['#4c74a0', '#6890b8', '#88aecc', '#acc8dc']);
      silhouette(ctx, function (x) {
        return 18 + Math.abs(Math.sin(x * 0.024 + 1)) * 18;
      }, 50, '#8ca8c4', '#e0f0fc');
      silhouette(ctx, wave(4, 0.04, 0.8, 10), 60, '#c8dcec', '#eef6fc');
      px(ctx, 0, 60, W, H - 60, '#e8f0f8');
      px(ctx, 0, 60, W, 2, '#ffffff');
      var i;
      for (i = 0; i < 5; i++) {                        // Eiszacken
        var x = 18 + i * 48;
        poly(ctx, [[x - 5, 62], [x + 5, 62], [x, 62 - (8 + (i % 3) * 5)]], '#b8d8ec');
        poly(ctx, [[x - 2, 62], [x + 2, 62], [x, 62 - (6 + (i % 3) * 4)]], '#e4f4ff');
      }
      speckle(ctx, 0, 62, W, 18, '#ffffff', 60, 19);
      speckle(ctx, 0, 62, W, 18, '#c8dcec', 40, 61);
    }
  });

  biome('strand', {
    tile: 'sand',
    sky: '#58a8d8',
    name: 'Küste', ground: '#e8d8a8', platform: '#f0e4bc', edge: '#c0a870', light: 'rgba(255,240,190,.20)',
    particles: 'pollen',
    draw: function (ctx) {
      bands(ctx, 0, 34, ['#58a8d8', '#78c0e4', '#a0d8f0']);
      px(ctx, 30, 6, 12, 3, '#fff4c0'); px(ctx, 33, 3, 6, 9, '#fff4c0');
      bands(ctx, 34, 58, ['#1c78a8', '#2c8cbc', '#48a4cc']);
      var i, x;
      for (i = 0; i < 26; i++) {                       // Schaumkronen
        x = (i * 19) % W;
        px(ctx, x, 38 + (i % 4) * 5, 6, 1, '#bfe8f8');
        px(ctx, (x + 40) % W, 48 + (i % 3) * 4, 4, 1, '#bfe8f8');
      }
      silhouette(ctx, wave(2, 0.05, 2.5, 4), 60, '#e8d8a8', '#f6ecc8');
      px(ctx, 0, 60, W, H - 60, '#e8d8a8');
      px(ctx, 0, 58, W, 2, '#f6ecc8');
      px(ctx, 214, 40, 2, 20, '#4c7838');              // Palme
      px(ctx, 206, 38, 18, 2, '#3c8438'); px(ctx, 204, 40, 8, 2, '#3c8438');
      px(ctx, 216, 40, 8, 2, '#3c8438'); px(ctx, 210, 35, 10, 2, '#4c9440');
      speckle(ctx, 0, 62, W, 18, '#d8c490', 60, 31);
    }
  });

  biome('wasser', {
    tile: 'wasser',
    sky: '#68b8dc',
    name: 'Gewässer', ground: '#2c80ac', platform: '#4ca0c4', edge: '#1c5c7c', light: 'rgba(180,235,255,.18)',
    particles: 'bubbles',
    draw: function (ctx) {
      bands(ctx, 0, 30, ['#68b8dc', '#88cce8']);
      silhouette(ctx, wave(3, 0.03, 1.1, 6), 32, '#3c8ca8');
      bands(ctx, 32, H, ['#3c94bc', '#2c80ac', '#1f6c94', '#175a80']);
      var i, x, y;
      for (i = 0; i < 40; i++) {
        x = (i * 23) % W; y = 36 + (i * 7) % 40;
        px(ctx, x, y, 5, 1, '#9fdcf0');
        px(ctx, (x + 11) % W, y + 3, 3, 1, '#7cc8e0');
      }
      px(ctx, 24, 56, 14, 4, '#3c9448'); px(ctx, 26, 54, 10, 2, '#4cb058');
      px(ctx, 190, 44, 12, 3, '#3c9448'); px(ctx, 192, 42, 8, 2, '#4cb058');
    }
  });

  biome('vulkan', {
    tile: 'lava',
    sky: '#4c1c1c',
    name: 'Vulkan', ground: '#3c2c28', platform: '#54403a', edge: '#221816', light: 'rgba(255,140,60,.20)',
    particles: 'embers',
    draw: function (ctx) {
      bands(ctx, 0, 40, ['#4c1c1c', '#7c2c20', '#a84428', '#c85c30']);
      silhouette(ctx, function (x) {
        var d = Math.abs(x - 96);
        return Math.max(4, 34 - d * 0.42) + Math.sin(x * 0.05) * 2;
      }, 56, '#3c2824', '#5c3c30');
      px(ctx, 90, 22, 12, 3, '#ff8a3c');               // Krater
      px(ctx, 93, 19, 6, 4, '#ffc060');
      px(ctx, 95, 12, 2, 8, '#ff8a3c'); px(ctx, 92, 8, 2, 4, '#ffb040');
      silhouette(ctx, wave(4, 0.04, 2.2, 8), 62, '#2e211e', '#48332c');
      px(ctx, 0, 62, W, H - 62, '#3c2c28');
      px(ctx, 0, 62, W, 2, '#54403a');
      var i;
      for (i = 0; i < 4; i++) {                        // Lavaadern
        var x = 10 + i * 58, y = 66 + (i % 2) * 6;
        px(ctx, x, y, 30 + (i % 3) * 12, 2, '#e85820');
        px(ctx, x + 4, y + 1, 20, 1, '#ff9040');
      }
      speckle(ctx, 0, 62, W, 18, '#241a18', 60, 37);
    }
  });

  biome('wueste', {
    tile: 'sand',
    sky: '#e09850',
    name: 'Wüste', ground: '#dcb878', platform: '#ecd098', edge: '#b08c50', light: 'rgba(255,225,160,.20)',
    particles: 'sand',
    draw: function (ctx) {
      bands(ctx, 0, 42, ['#e09850', '#ecb470', '#f4d0a0', '#f8e4c0']);
      px(ctx, 46, 8, 16, 4, '#fff0c0'); px(ctx, 50, 4, 8, 12, '#fff0c0');
      silhouette(ctx, wave(6, 0.022, 0.4, 12), 54, '#cca068', '#e8c088');
      silhouette(ctx, wave(4, 0.033, 2.7, 8), 62, '#dcb878', '#f0d0a0');
      px(ctx, 0, 62, W, H - 62, '#dcb878');
      px(ctx, 196, 44, 5, 18, '#4c7c44');              // Kaktus
      px(ctx, 191, 50, 5, 4, '#4c7c44'); px(ctx, 191, 50, 3, 10, '#4c7c44');
      px(ctx, 201, 47, 5, 4, '#4c7c44'); px(ctx, 203, 47, 3, 13, '#4c7c44');
      px(ctx, 197, 44, 2, 18, '#5c9450');
      speckle(ctx, 0, 62, W, 18, '#c8a464', 70, 43);
    }
  });

  biome('stadt', {
    tile: 'boden',
    sky: '#4c6c9c',
    name: 'Stadt', ground: '#68687c', platform: '#80809c', edge: '#40404e', light: 'rgba(255,235,200,.14)',
    particles: null,
    draw: function (ctx) {
      bands(ctx, 0, 40, ['#4c6c9c', '#6888b4', '#88a4c8', '#b0c4d8']);
      var i, x, w, h;
      for (i = 0; i < 20; i++) {                       // hintere Häuserzeile
        x = i * 13 - 3; w = 9 + (i % 3) * 2; h = 12 + ((i * 17) % 16);
        px(ctx, x, 46 - h, w, h, '#4c5468');
      }
      for (i = 0; i < 14; i++) {                       // vordere Häuserzeile
        x = i * 18 - 4; w = 13 + (i % 3) * 3; h = 18 + ((i * 29) % 22);
        px(ctx, x, 56 - h, w, h, '#3a4054');
        px(ctx, x, 56 - h, w, 2, '#565e74');
        var r, c;
        for (r = 0; r < Math.floor(h / 7); r++) {
          for (c = 0; c < Math.floor(w / 5); c++) {
            if (((i + r * 3 + c * 5) % 4) === 0) continue;
            px(ctx, x + 2 + c * 5, 56 - h + 4 + r * 7, 2, 3, '#f0d488');
          }
        }
      }
      px(ctx, 0, 56, W, H - 56, '#68687c');
      px(ctx, 0, 56, W, 2, '#8890a4');
      for (i = 0; i < 8; i++) px(ctx, 8 + i * 30, 68, 14, 2, '#9098ac');
    }
  });

  biome('arena', {
    tile: 'boden',
    sky: '#2a2438',
    name: 'Arena', ground: '#8c6440', platform: '#a87c50', edge: '#5c3f26', light: 'rgba(255,220,140,.18)',
    particles: null,
    draw: function (ctx) {
      bands(ctx, 0, 30, ['#2a2438', '#352c46']);
      var i, r, c, tones = ['#e8d0a0', '#cf9f7a', '#a8bcd8', '#d8a8b4', '#bda8d8'];
      for (r = 0; r < 5; r++) {                        // Publikum
        for (c = 0; c < 48; c++) {
          var x = c * 5 + (r % 2) * 2, y = 4 + r * 5;
          px(ctx, x, y, 3, 3, tones[(r * 7 + c) % 5]);
        }
      }
      px(ctx, 0, 30, W, 4, '#584a6e');
      px(ctx, 0, 34, W, 20, '#463b58');
      px(ctx, 0, 40, W, 1, '#584a6e'); px(ctx, 0, 47, W, 1, '#584a6e');
      // Scheinwerferkegel
      for (i = 0; i < 2; i++) {
        var sx = 50 + i * 140;
        poly(ctx, [[sx, 34], [sx + 26, H], [sx - 26, H]], 'rgba(255,233,168,.10)');
      }
      px(ctx, 0, 54, W, H - 54, '#8c6440');
      px(ctx, 0, 54, W, 2, '#a87c50');
      px(ctx, 118, 56, 2, 24, '#d8c8a8');              // Mittellinie
      for (i = 0; i < W; i += 4) px(ctx, i, 68, 2, 1, '#c8b48c');
      speckle(ctx, 0, 56, W, 24, '#7c5838', 50, 53);
    }
  });

  biome('liga', {
    tile: 'boden',
    sky: '#16142a',
    name: 'Liga-Halle', ground: '#302c44', platform: '#443e5c', edge: '#1c1a28', light: 'rgba(255,210,120,.18)',
    particles: 'sparks',
    draw: function (ctx) {
      bands(ctx, 0, 34, ['#16142a', '#221e38', '#2e2846']);
      var i;
      for (i = 0; i < 6; i++) {                        // Säulen
        var x = 8 + i * 44;
        px(ctx, x, 8, 10, 46, '#4a4463');
        px(ctx, x, 8, 3, 46, '#5f5878');
        px(ctx, x - 2, 5, 14, 4, '#5f5878');
        px(ctx, x - 2, 50, 14, 4, '#5f5878');
      }
      px(ctx, 108, 6, 24, 4, '#e8c14a');               // Wappen
      px(ctx, 110, 10, 20, 14, '#c9a227');
      px(ctx, 116, 24, 8, 6, '#c9a227'); px(ctx, 118, 30, 4, 4, '#c9a227');
      px(ctx, 0, 54, W, H - 54, '#302c44');
      px(ctx, 0, 54, W, 2, '#443e5c');
      px(ctx, 88, 54, 64, H - 54, '#8b2f3a');          // Teppich
      px(ctx, 88, 54, 2, H - 54, '#c9a227'); px(ctx, 150, 54, 2, H - 54, '#c9a227');
    }
  });

  biome('ruine', {
    tile: 'fels',
    sky: '#8496ac',
    name: 'Ruine', ground: '#7c7860', platform: '#94906f', edge: '#54503e', light: 'rgba(230,235,190,.14)',
    particles: 'dust',
    draw: function (ctx) {
      bands(ctx, 0, 40, ['#8496ac', '#a8b4c0', '#c8c8b4', '#dcd8c0']);
      silhouette(ctx, wave(4, 0.026, 1.4, 9), 52, '#7c8a70', '#94a884');
      var cols = [[14, 26], [56, 14], [150, 22], [206, 10]], i;
      for (i = 0; i < cols.length; i++) {
        var x = cols[i][0], h = cols[i][1];
        px(ctx, x, 60 - h, 9, h, '#9c9880');
        px(ctx, x, 60 - h, 3, h, '#b4b098');
        px(ctx, x - 2, 60 - h - 3, 13, 3, '#a8a488');
        px(ctx, x - 1, 58, 11, 2, '#7c7860');
      }
      px(ctx, 14, 30, 150, 3, '#a8a488');              // Architrav
      px(ctx, 0, 60, W, H - 60, '#7c7860');
      px(ctx, 0, 60, W, 2, '#94906f');
      for (i = 0; i < 6; i++) px(ctx, i * 40 + 4, 66, 34, 1, '#6c6852');
      speckle(ctx, 0, 62, W, 18, '#5c8a4c', 30, 67);
    }
  });

  biome('dschungel', {
    tile: 'gras',
    sky: '#6cae54',
    name: 'Dschungel', ground: '#2f5c34', platform: '#3d7340', edge: '#1c3c1e', light: 'rgba(190,255,150,.10)',
    particles: 'leaves',
    draw: function (ctx) {
      bands(ctx, 0, 30, ['#6cae54', '#4f8c40', '#3a7034']);
      var i;
      for (i = 0; i < 22; i++) {                       // Blätterdach
        var x = i * 11 - 4, y = -2 + ((i * 13) % 10);
        px(ctx, x, y, 14, 8, '#1e4423');
        px(ctx, x + 2, y + 1, 10, 3, '#2c5c2c');
      }
      for (i = 0; i < 4; i++) px(ctx, 30 + i * 56, 8, 2, 26, '#2c5c2c');   // Lianen
      silhouette(ctx, wave(5, 0.04, 0.9, 12), 50, '#26502a');
      for (i = 0; i < 7; i++) bush(ctx, 10 + i * 36, 62, 6 + (i % 3), '#1e4423', '#3a7034');
      px(ctx, 0, 62, W, H - 62, '#2f5c34');
      px(ctx, 0, 62, W, 2, '#3d7340');
      speckle(ctx, 0, 64, W, 16, '#468048', 70, 71);
    }
  });

  biome('nacht', {
    tile: 'gras',
    sky: '#0e1424',
    name: 'Nachtlager', ground: '#2c3444', platform: '#3e4658', edge: '#1a1e28', light: 'rgba(255,170,80,.20)',
    particles: 'sparks',
    draw: function (ctx) {
      bands(ctx, 0, 46, ['#0e1424', '#182036', '#243048', '#33405c']);
      speckle(ctx, 0, 0, W, 40, '#ffffff', 70, 3);
      speckle(ctx, 0, 0, W, 26, '#c8d8ff', 30, 91);
      px(ctx, 196, 8, 10, 10, '#f2f0d8');              // Mond
      px(ctx, 193, 6, 8, 12, '#182036');
      silhouette(ctx, wave(5, 0.03, 2.0, 10), 56, '#1d2432');
      px(ctx, 0, 56, W, H - 56, '#2c3444');
      px(ctx, 0, 56, W, 2, '#3e4658');
      // Lagerfeuer
      px(ctx, 112, 68, 16, 3, '#5a4230');
      px(ctx, 116, 62, 8, 8, '#e86820');
      px(ctx, 118, 58, 4, 8, '#ffa838');
      px(ctx, 119, 55, 2, 5, '#ffe08a');
      px(ctx, 104, 70, 32, 2, 'rgba(255,150,60,.25)');
    }
  });

  /* ---------- 3) Auswahl -------------------------------------------------------- */

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

  var NODE_BIOMES = {
    boss: 'arena', e4: 'liga', champ: 'liga',
    shop: 'stadt', rest: 'nacht', item: 'hoehle'
  };

  function pick(regionId, nodeType, seed) {
    if (NODE_BIOMES[nodeType]) return NODE_BIOMES[nodeType];
    var list = REGION_BIOMES[regionId] || REGION_BIOMES.kanto;
    var weights = [46, 26, 17, 11], r = Math.abs(seed | 0) % 100, acc = 0, i;
    for (i = 0; i < list.length; i++) {
      acc += weights[i] || 8;
      if (r < acc) return list[i];
    }
    return list[0];
  }

  /* ---------- 4) Darstellung ----------------------------------------------------- */

  var PARTICLES = {
    leaves: { count: 12, cls: 'p-leaf' }, snow: { count: 22, cls: 'p-snow' },
    embers: { count: 16, cls: 'p-ember' }, drops: { count: 9, cls: 'p-drop' },
    sand: { count: 18, cls: 'p-sand' }, pollen: { count: 12, cls: 'p-pollen' },
    bubbles: { count: 10, cls: 'p-bubble' }, sparks: { count: 12, cls: 'p-spark' },
    dust: { count: 10, cls: 'p-dust' }
  };

  var cache = {};

  /** Zeichnet eine Kulisse einmal und merkt sie sich als Bilddaten. */
  function bitmap(biomeId) {
    if (cache[biomeId]) return cache[biomeId];
    var b = B[biomeId] || B.wiese;
    var cv = root.document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    b.draw(ctx);
    cache[biomeId] = cv.toDataURL('image/png');
    return cache[biomeId];
  }

  /**
   * Baut die Kulisse in ein Element. opts.stretch dehnt sie (für hohe Flächen
   * wie die Karte), sonst deckt sie ab und bleibt unten verankert.
   */
  function render(host, biomeId, opts) {
    opts = opts || {};
    var b = B[biomeId] || B.wiese;
    host.className = host.className.replace(/\bb-[a-z]+\b/g, '').trim() + ' b-' + b.id;
    host.style.setProperty('--scene-sky', b.sky || b.ground);
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
    if (opts.tiled) {
      // Draufsicht: eine nahtlose Bodenkachel füllt die ganze Fläche.
      layer.style.backgroundImage = 'url(' + tile(b.id) + ')';
      layer.innerHTML = opts.particles === false ? '' : particleMarkup(b.particles);
    } else {
      layer.style.backgroundImage = '';
      layer.innerHTML = '<img class="scene-art" alt="" src="' + bitmap(b.id) + '">' +
        (opts.particles === false ? '' : particleMarkup(b.particles));
    }
    return b;
  }

  function particleMarkup(kind) {
    var spec = PARTICLES[kind];
    if (!spec) return '';
    var out = '<div class="scene-particles ' + spec.cls + '">', i;
    for (i = 0; i < spec.count; i++) {
      var left = ((i * 37) % 100), delay = ((i * 13) % 90) / 10, dur = 5 + ((i * 7) % 60) / 10;
      var drift = ((i * 29) % 40) - 20;
      out += '<i style="left:' + left + '%;animation-delay:-' + delay + 's;animation-duration:' +
        dur + 's;--drift:' + drift + 'px"></i>';
    }
    return out + '</div>';
  }

  /**
   * Bodenkachel von oben — für die Routenkarte. Eine Seitenansicht taugt dort
   * nicht: die Karte ist hoch, die Kulisse wäre entweder winzig oder ins
   * Absurde skaliert. Die Kachel wiederholt sich nahtlos.
   */
  var tileCache = {};
  function tile(biomeId) {
    if (tileCache[biomeId]) return tileCache[biomeId];
    var b = B[biomeId] || B.wiese, T = 32;
    var cv = root.document.createElement('canvas');
    cv.width = T; cv.height = T;
    var ctx = cv.getContext('2d'), i, x, y;
    ctx.imageSmoothingEnabled = false;
    px(ctx, 0, 0, T, T, b.ground);

    function scatter(color, count, w, h, seed) {
      var sd = seed;
      for (i = 0; i < count; i++) {
        sd = (sd * 1103515245 + 12345) & 0x7fffffff; x = (sd >> 7) % T;
        sd = (sd * 1103515245 + 12345) & 0x7fffffff; y = (sd >> 7) % T;
        px(ctx, x, y, w, h, color);
      }
    }

    switch (b.tile) {
      case 'gras':
        scatter(b.platform, 26, 2, 1, 17);
        scatter(b.edge, 18, 1, 2, 53);
        for (i = 0; i < 4; i++) { x = (i * 9 + 3) % T; y = (i * 13 + 5) % T; px(ctx, x, y, 1, 3, b.edge); px(ctx, x + 1, y + 1, 1, 2, b.platform); }
        break;
      case 'sand':
        scatter(b.platform, 30, 3, 1, 23);
        scatter(b.edge, 14, 2, 1, 61);
        break;
      case 'schnee':
        scatter('#ffffff', 24, 2, 2, 29);
        scatter(b.edge, 10, 3, 1, 71);
        break;
      case 'fels':
        scatter(b.platform, 20, 3, 2, 31);
        scatter(b.edge, 22, 2, 2, 13);
        for (i = 0; i < 3; i++) px(ctx, (i * 11) % T, (i * 17 + 4) % T, 6, 1, b.edge);
        break;
      case 'lava':
        scatter(b.platform, 18, 3, 2, 37);
        for (i = 0; i < 3; i++) px(ctx, (i * 13) % T, (i * 9 + 6) % T, 7, 1, '#e85820');
        scatter('#ff9040', 6, 1, 1, 83);
        break;
      case 'wasser':
        for (y = 0; y < T; y += 4) { px(ctx, 0, y, T, 1, b.platform); px(ctx, (y * 3) % T, y + 2, 6, 1, '#9fdcf0'); }
        break;
      default:                                       // gepflasterter Boden
        for (y = 0; y < T; y += 8) {
          px(ctx, 0, y, T, 1, b.edge);
          for (x = (y / 8 % 2) * 8; x < T; x += 16) px(ctx, x, y, 1, 8, b.edge);
        }
        scatter(b.platform, 10, 2, 1, 41);
    }
    tileCache[biomeId] = cv.toDataURL('image/png');
    return tileCache[biomeId];
  }

  /* --- Trainerfiguren ---------------------------------------------------------
   * 24 × 36 Pixel, aus Rechtecken gebaut. Die Klasse bestimmt die Palette und
   * ob es Hut, Mütze oder Umhang gibt; der Startwert variiert Haar- und
   * Hautton, damit nicht alle gleich aussehen.
   * -------------------------------------------------------------------------- */

  var SKIN = ['#f0c8a0', '#e0a878', '#c08050', '#8c5a38'];
  var HAIR = ['#3c2a20', '#6b3f22', '#c8a028', '#2a2a35', '#a03030', '#5c4a8c'];

  var TRAINER_STYLE = {
    'Arenaleiter': { shirt: '#d84838', pants: '#2c3450', cape: '#e8c14a', hat: null },
    'Top Vier': { shirt: '#4a3c78', pants: '#241f38', cape: '#8c6ad0', hat: null, skirt: true },
    'Champ': { shirt: '#2c3860', pants: '#1b2038', cape: '#c9a227', hat: null },
    'Käfersammler': { shirt: '#6ba848', pants: '#4c6c30', cape: null, hat: '#d8c078' },
    'Angler': { shirt: '#4888c0', pants: '#2c4c70', cape: null, hat: '#d8c078' },
    'Schwimmerin': { shirt: '#48b0c8', pants: '#2c7c94', cape: null, hat: null, skirt: true },
    'Wanderer': { shirt: '#a86838', pants: '#6c4828', cape: null, hat: '#8c5a38' },
    'Ruinenmaniac': { shirt: '#8c7048', pants: '#5c4830', cape: null, hat: '#6c5438' },
    'Rowdy': { shirt: '#3a3a44', pants: '#24242c', cape: null, hat: null },
    'Team-Rüpel': { shirt: '#2a2a32', pants: '#1a1a20', cape: null, hat: '#2a2a32' },
    'Ass-Trainer': { shirt: '#e8e8f0', pants: '#c03838', cape: null, hat: null },
    'Ass-Trainerin': { shirt: '#e8e8f0', pants: '#c03838', cape: null, hat: null, skirt: true },
    'Veteranin': { shirt: '#8c4870', pants: '#4c2c48', cape: null, hat: null, skirt: true },
    'Drachenzähmer': { shirt: '#6c4898', pants: '#3c2860', cape: null, hat: null },
    'Psycho': { shirt: '#c06898', pants: '#6c3c58', cape: null, hat: null, skirt: true },
    'Ninjajunge': { shirt: '#38484c', pants: '#243034', cape: null, hat: null },
    'Feuerwehrmann': { shirt: '#d85028', pants: '#8c3418', cape: null, hat: '#e8c14a' },
    'Skaterin': { shirt: '#48b8a0', pants: '#2c6c60', cape: null, hat: null, skirt: true },
    'Spieler': { shirt: '#e05a47', pants: '#2c3450', cape: null, hat: '#e05a47' }
  };

  var trainerCache = {};

  /* ---------- Trainerfiguren -------------------------------------------------
   * 32 × 48 Pixel, gezeichnet in fünf Durchgängen:
   *   1) Umhang oder Mantel hinter der Figur
   *   2) Körper mit verjüngten Formen statt reiner Rechtecke
   *   3) Schattenseite rechts, Glanzlicht links
   *   4) Gesicht, Haare, Kopfbedeckung
   *   5) eine dunkle Kontur rund um alles Gezeichnete
   * Der letzte Durchgang macht den Unterschied: erst die Kontur lässt eine
   * Pixelfigur wie ein Sprite aussehen und nicht wie ein Klötzchenhaufen.
   * ------------------------------------------------------------------------ */

  var OUTLINE = '#20141e';

  function shade(c, f) {
    var n = parseInt(c.slice(1), 16);
    var r = ((n >> 16) & 255), g = ((n >> 8) & 255), b = (n & 255);
    if (f >= 1) {
      return 'rgb(' + Math.min(255, Math.round(r + (255 - r) * (f - 1))) + ',' +
        Math.min(255, Math.round(g + (255 - g) * (f - 1))) + ',' +
        Math.min(255, Math.round(b + (255 - b) * (f - 1))) + ')';
    }
    return 'rgb(' + Math.round(r * f) + ',' + Math.round(g * f) + ',' + Math.round(b * f) + ')';
  }

  /** Symmetrisches Trapez — Grundform für Rumpf, Beine und Haare. */
  function taper(ctx, cx, y, topW, botW, h, color) {
    var i, w;
    ctx.fillStyle = color;
    for (i = 0; i < h; i++) {
      w = Math.round(topW + (botW - topW) * (i / Math.max(1, h - 1)));
      ctx.fillRect(Math.round(cx - w / 2), y + i, w, 1);
    }
  }

  /** Legt eine dunkle Kontur um jeden gezeichneten Bereich. */
  function outline(ctx, w, h) {
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    var copy = new Uint8ClampedArray(d);
    var x, y, i, j, hit;
    function opaque(px, py) {
      if (px < 0 || py < 0 || px >= w || py >= h) return false;
      return copy[(py * w + px) * 4 + 3] > 8;
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        if (copy[i + 3] > 8) continue;
        hit = opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1);
        if (!hit) continue;
        d[i] = 0x20; d[i + 1] = 0x14; d[i + 2] = 0x1e; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* Frisuren: jede zeichnet auf denselben Kopf, aber anders. */
  var HAIRDO = ['kurz', 'lang', 'zopf', 'strubbel'];

  function drawHair(ctx, style, hair, back, cx, headTop) {
    var dark = shade(hair, 0.72);
    if (style === 'lang') {
      taper(ctx, cx, headTop + 2, 16, 14, 16, hair);            // fällt über die Schultern
      taper(ctx, cx, headTop, 12, 16, 4, hair);
      if (!back) { ctx.fillStyle = dark; ctx.fillRect(cx - 8, headTop + 6, 2, 10); ctx.fillRect(cx + 6, headTop + 6, 2, 10); }
    } else if (style === 'zopf') {
      taper(ctx, cx, headTop, 12, 15, 5, hair);
      ctx.fillStyle = hair;
      ctx.fillRect(cx + 6, headTop + 4, 3, 9);                   // Zopf seitlich
      ctx.fillStyle = dark;
      ctx.fillRect(cx + 6, headTop + 11, 3, 2);
    } else if (style === 'strubbel') {
      taper(ctx, cx, headTop - 1, 10, 16, 6, hair);
      ctx.fillStyle = hair;
      ctx.fillRect(cx - 8, headTop - 1, 3, 3);
      ctx.fillRect(cx + 5, headTop - 2, 3, 4);
      ctx.fillRect(cx - 2, headTop - 3, 4, 3);
    } else {
      taper(ctx, cx, headTop, 12, 15, 5, hair);
      if (!back) { ctx.fillStyle = hair; ctx.fillRect(cx - 7, headTop + 4, 2, 5); ctx.fillRect(cx + 5, headTop + 4, 2, 5); }
    }
    if (back) taper(ctx, cx, headTop + 4, 15, 13, 8, hair);      // Hinterkopf ist ganz Haar
  }

  /** Zeichnet eine Trainerfigur; back = Rückenansicht für den Spieler. */
  function trainer(cls, seed, back) {
    var key = cls + '|' + seed + '|' + (back ? 'b' : 'f');
    if (trainerCache[key]) return trainerCache[key];
    var style = TRAINER_STYLE[cls] || TRAINER_STYLE['Ass-Trainer'];
    var n = Math.abs(seed | 0);
    var skin = SKIN[n % SKIN.length];
    var hair = HAIR[(n >> 3) % HAIR.length];
    var hairdo = HAIRDO[(n >> 6) % HAIRDO.length];

    var W2 = 32, H2 = 48, cx = 16;
    var cv = root.document.createElement('canvas');
    cv.width = W2; cv.height = H2;
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var shirt = style.shirt, pants = style.pants;
    var headTop = 4, headH = 11, neckY = headTop + headH;
    var skirt = !!style.skirt;

    /* 1) Beine, Schuhe — die unterste Ebene */
    if (skirt) {
      taper(ctx, cx, 30, 16, 20, 8, shirt);                // Rock
      ctx.fillStyle = shade(shirt, 0.75);
      ctx.fillRect(cx + 2, 30, 8, 8);
      taper(ctx, cx - 4, 38, 5, 4, 5, skin);               // Beine darunter
      taper(ctx, cx + 4, 38, 5, 4, 5, skin);
    } else {
      taper(ctx, cx - 4, 30, 7, 6, 13, pants);
      taper(ctx, cx + 4, 30, 7, 6, 13, pants);
      ctx.fillStyle = shade(pants, 0.6);                   // Naht zwischen den Beinen
      ctx.fillRect(cx - 1, 31, 2, 12);
      ctx.fillStyle = shade(pants, 1.18);                  // Glanzlicht am linken Bein
      ctx.fillRect(cx - 6, 31, 1, 11);
    }
    ctx.fillStyle = '#2a2028';                             // Schuhe, deutlich getrennt
    ctx.fillRect(cx - 9, 43, 7, 3);
    ctx.fillRect(cx + 2, 43, 7, 3);
    ctx.fillStyle = '#4a3d46';
    ctx.fillRect(cx - 9, 43, 7, 1);
    ctx.fillRect(cx + 2, 43, 7, 1);

    /* 2) Umhang oder Mantel — liegt über den Beinen, unter dem Rumpf, damit
          er wie ein Stoff fällt und nicht wie zwei Träger wirkt. */
    if (style.cape) {
      // Knapp hinter den Schultern beginnen und nach unten ausstellen: so
      // schaut der Stoff seitlich hervor, statt die Figur wie ein Poncho
      // zuzudecken.
      // Schmaler als die Schultern beginnen, damit der Rumpf ihn verdeckt,
      // und erst unterhalb der Arme ausstellen — dann liest er als Umhang.
      taper(ctx, cx, neckY + 6, 15, 24, 18, style.cape);
      ctx.fillStyle = shade(style.cape, 0.74);             // Schattenseite
      ctx.fillRect(cx + 7, neckY + 14, 5, 10);
      ctx.fillStyle = shade(style.cape, 0.52);             // Saum
      ctx.fillRect(cx - 12, neckY + 22, 24, 2);
      ctx.fillStyle = shade(style.cape, 1.22);             // Falte
      ctx.fillRect(cx - 9, neckY + 14, 1, 9);
    }

    /* 3) Rumpf: an den Schultern breit, zur Hüfte schmaler */
    taper(ctx, cx, neckY + 1, 17, 13, 16, shirt);
    ctx.fillStyle = shade(shirt, 0.76);                    // Schattenseite rechts
    ctx.fillRect(cx + 3, neckY + 2, 5, 15);
    ctx.fillStyle = shade(shirt, 1.28);                    // Glanzlicht links
    ctx.fillRect(cx - 7, neckY + 3, 2, 11);
    if (style.cape) {                                       // Kragen des Umhangs
      ctx.fillStyle = shade(style.cape, 0.85);
      ctx.fillRect(cx - 9, neckY + 1, 18, 3);
    }
    ctx.fillStyle = shade(pants, 0.85);                    // Gürtel
    ctx.fillRect(cx - 7, neckY + 15, 14, 2);
    ctx.fillStyle = shade(pants, 1.4);
    ctx.fillRect(cx - 2, neckY + 15, 3, 2);                // Schnalle

    /* 4) Arme — die Rückenansicht hebt den Wurfarm */
    var armY = neckY + 3;
    taper(ctx, cx - 10, armY, 5, 4, 10, shirt);            // linker Arm
    ctx.fillStyle = skin;
    ctx.fillRect(cx - 12, armY + 10, 4, 4);
    if (back) {
      taper(ctx, cx + 10, armY - 6, 4, 5, 9, shirt);       // erhobener Wurfarm
      ctx.fillStyle = shade(shirt, 0.76);
      ctx.fillRect(cx + 10, armY - 6, 2, 9);
      ctx.fillStyle = skin;
      ctx.fillRect(cx + 9, armY - 9, 4, 4);
    } else {
      taper(ctx, cx + 10, armY, 5, 4, 10, shirt);
      ctx.fillStyle = shade(shirt, 0.76);
      ctx.fillRect(cx + 9, armY, 3, 10);
      ctx.fillStyle = skin;
      ctx.fillRect(cx + 8, armY + 10, 4, 4);
    }

    /* 5) Kopf, Gesicht, Haare */
    ctx.fillStyle = shade(skin, 0.78);
    ctx.fillRect(cx - 3, neckY - 2, 6, 3);                 // Hals im Schatten des Kopfes
    taper(ctx, cx, headTop, 11, 9, headH, skin);           // Kopf mit Kinn
    ctx.fillStyle = shade(skin, 0.86);                     // Wange im Schatten
    ctx.fillRect(cx + 2, headTop + 3, 3, 7);
    ctx.fillStyle = shade(skin, 1.2);
    ctx.fillRect(cx - 5, headTop + 3, 1, 5);

    drawHair(ctx, hairdo, hair, back, cx, headTop);

    if (!back) {
      ctx.fillStyle = OUTLINE;                             // Augen
      ctx.fillRect(cx - 4, headTop + 6, 2, 3);
      ctx.fillRect(cx + 2, headTop + 6, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 4, headTop + 6, 1, 1);
      ctx.fillRect(cx + 2, headTop + 6, 1, 1);
      ctx.fillStyle = shade(skin, 0.68);                   // Mund
      ctx.fillRect(cx - 1, headTop + 10, 3, 1);
    }

    if (style.hat) {
      ctx.fillStyle = style.hat;
      ctx.fillRect(cx - 8, headTop, 16, 4);                // Kappe
      taper(ctx, cx, headTop - 3, 10, 14, 3, style.hat);
      ctx.fillStyle = shade(style.hat, 0.68);
      ctx.fillRect(cx - 8, headTop + 3, 16, 1);
      ctx.fillStyle = shade(style.hat, 1.25);
      ctx.fillRect(cx - 6, headTop - 2, 5, 1);
      if (!back) {                                          // Schirm nach vorn
        ctx.fillStyle = shade(style.hat, 0.82);
        ctx.fillRect(cx - 9, headTop + 4, 18, 2);
      }
    }

    /* Rückenansicht: ein Ball in der erhobenen Hand */
    if (back) {
      ctx.fillStyle = '#e8402f';
      ctx.fillRect(cx + 9, armY - 13, 4, 2);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(cx + 9, armY - 11, 4, 2);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(cx + 9, armY - 12, 4, 1);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(cx + 10, armY - 12, 2, 1);
    }

    /* 5) Kontur um die fertige Figur */
    outline(ctx, W2, H2);

    trainerCache[key] = cv.toDataURL('image/png');
    return trainerCache[key];
  }

  /** Plattform als Pixel-Ellipse — sie muss zu den Kulissen passen. */
  function platform(w, h, fill, edge) {
    var cv = root.document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d'), y, half = h / 2, cx = w / 2;
    for (y = 0; y < h; y++) {
      var dy = (y + 0.5 - half) / half;
      var span = Math.round(Math.sqrt(Math.max(0, 1 - dy * dy)) * cx);
      if (span <= 0) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(cx - span, y, span * 2, 1);
      ctx.fillStyle = edge;
      ctx.fillRect(cx - span, y, 1, 1);
      ctx.fillRect(cx + span - 1, y, 1, 1);
      if (y === 0 || y === h - 1) ctx.fillRect(cx - span, y, span * 2, 1);
    }
    return cv.toDataURL('image/png');
  }

  PL.scenery = {
    biomes: B, regionBiomes: REGION_BIOMES, nodeBiomes: NODE_BIOMES,
    pick: pick, render: render, platform: platform, tile: tile, trainer: trainer,
    trainerStyles: TRAINER_STYLE, size: { w: W, h: H },
    get: function (id) { return B[id] || B.wiese; },
    list: function () { return Object.keys(B); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.scenery;
})(typeof globalThis !== 'undefined' ? globalThis : this);
