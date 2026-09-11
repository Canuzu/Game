/* =============================================================================
 * build-baelle.mjs — jedem legendären Pokémon sein eigener Ball
 * -----------------------------------------------------------------------------
 * Wer eine Legende besiegt, bekommt nicht irgendeinen Meisterball, sondern
 * ihren: einen Pokéball, dessen obere Hälfte den Kopf dieses Pokémon trägt.
 *
 * Gezeichnet wird nichts von Hand. Die Sprites liegen eingebettet in
 * data/sprites.js, also schaut dieses Werkzeug sie wirklich an: Es sucht den
 * Kopf, zählt die Farben, rechnet beides auf ein Raster von 32×32 Punkten
 * herunter und setzt es in einen Ball. Herauskommt data/baelle.js mit je
 * einem winzigen PNG als Datenadresse.
 *
 * Dass dafür ein Browser startet, hat einen Grund: Node kann kein PNG
 * auspacken, Chromium schon. Das Werkzeug lädt also eine leere Seite, legt
 * die Sprites hinein und lässt die Bildpunkte dort zählen.
 *
 *   node tools/build-baelle.mjs
 * ========================================================================== */

import { chromium } from 'playwright';
import { startOptionen } from './browser.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

globalThis.PL = {};
require(join(ROOT, 'js', 'run.js'));
const PL = globalThis.PL;

/* Die 125 Legenden der neun Generationen, in der Reihenfolge des Pokédex. */
const legenden = [];
for (let g = 1; g <= 9; g++) {
  for (const sp of PL.Run.legendenDerGeneration(g)) {
    legenden.push({ id: sp.id, num: sp.pid || sp.num, gen: g, name: sp.n });
  }
}

/* Wer auf der Karte seiner Generation als Umriss steht. */
const WAHRZEICHEN = {
  1: 'mewtwo', 2: 'lugia', 3: 'rayquaza', 4: 'dialga', 5: 'reshiram',
  6: 'xerneas', 7: 'solgaleo', 8: 'zacian', 9: 'koraidon'
};

const browser = await chromium.launch(startOptionen());
const page = await browser.newPage();
await page.setContent('<!doctype html><meta charset="utf-8"><title>Bälle</title>');
await page.addScriptTag({ path: join(ROOT, 'data', 'sprites.js') });

/* ---------------------------------------------------------------------------
 * Alles Weitere passiert in der Seite: Dort gibt es ein Canvas, und damit
 * lassen sich die Bildpunkte eines PNG lesen.
 * ------------------------------------------------------------------------- */
const ergebnis = await page.evaluate(async (daten) => {
  const { legenden, wahrzeichen } = daten;
  const N = 32;                       // Kantenlänge des Ballrasters
  // Der Kopf sitzt als Wappen in der oberen Hälfte — klein genug, dass der
  // Grund ringsum sichtbar bleibt. Nur dann liest man eine Gestalt und nicht
  // eine Fläche.
  const KB = 14, KH = 10, KX = 9, KY = 3;
  const M = (N - 1) / 2;
  const R = N / 2 - 0.5;

  function bildLaden(num) {
    const roh = window.PL_SPRITES.f[num];
    if (!roh) return null;
    return new Promise((fertig) => {
      const img = new Image();
      img.onload = () => fertig(img);
      img.onerror = () => fertig(null);
      img.src = 'data:image/png;base64,' + roh;
    });
  }

  function punkte(img) {
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, cv.width, cv.height);
  }

  const hell = (c) => (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000;
  const bunt = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);

  /** Wie weit zwei Farben auseinanderliegen. */
  function abstand(a, b) {
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return dr * dr + dg * dg + db * db;
  }

  /**
   * Die Farbtafel eines Sprites: Farben werden grob einsortiert, gezählt und
   * nach Häufigkeit zurückgegeben. Grob genug, dass Schattierungen derselben
   * Farbe zusammenfallen — fein genug, dass Rot und Orange sich trennen.
   */
  function tafel(bild, kasten) {
    const d = bild.data, w = bild.width;
    const faecher = new Map();
    for (let y = kasten.y0; y <= kasten.y1; y++) {
      for (let x = kasten.x0; x <= kasten.x1; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 128) continue;
        const c = [d[i], d[i + 1], d[i + 2]];
        const key = (c[0] >> 4) + ',' + (c[1] >> 4) + ',' + (c[2] >> 4);
        let f = faecher.get(key);
        if (!f) { f = { n: 0, r: 0, g: 0, b: 0 }; faecher.set(key, f); }
        f.n++; f.r += c[0]; f.g += c[1]; f.b += c[2];
      }
    }
    return [...faecher.values()]
      .map((f) => ({ n: f.n, c: [Math.round(f.r / f.n), Math.round(f.g / f.n), Math.round(f.b / f.n)] }))
      .sort((a, b) => b.n - a.n);
  }

  /** Der Umriss: alles, was nicht durchsichtig ist. */
  function kasten(bild) {
    const d = bild.data, w = bild.width, h = bild.height;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] < 128) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }

  /**
   * Wo steckt der Kopf? Bei einem Sprite von vorn sitzt er oben — aber
   * »oben« ist bei einem Vogel mit ausgebreiteten Flügeln die ganze Breite.
   * Gesucht wird deshalb im oberen Drittel der größte zusammenhängende
   * Klumpen: Das ist bei fast jedem Pokémon der Kopf, nicht der Flügel.
   */
  function kopfAusschnitt(bild, k) {
    const d = bild.data, w = bild.width;
    const hoehe = k.y1 - k.y0 + 1, breite = k.x1 - k.x0 + 1;
    const band = Math.max(5, Math.round(hoehe * 0.42));
    const by1 = Math.min(k.y1, k.y0 + band - 1);

    // Zusammenhängende Klumpen im Band suchen (Vierer-Nachbarschaft).
    const marke = new Int32Array(bild.width * bild.height).fill(-1);
    const klumpen = [];
    for (let y = k.y0; y <= by1; y++) {
      for (let x = k.x0; x <= k.x1; x++) {
        const i0 = y * w + x;
        if (d[i0 * 4 + 3] < 128 || marke[i0] >= 0) continue;
        const nr = klumpen.length;
        const kl = { n: 0, x0: x, x1: x, y0: y, y1: y, sx: 0 };
        const stapel = [i0];
        marke[i0] = nr;
        while (stapel.length) {
          const i = stapel.pop();
          const cy = Math.floor(i / w), cx = i - cy * w;
          kl.n++; kl.sx += cx;
          if (cx < kl.x0) kl.x0 = cx;
          if (cx > kl.x1) kl.x1 = cx;
          if (cy < kl.y0) kl.y0 = cy;
          if (cy > kl.y1) kl.y1 = cy;
          const nachbarn = [i - 1, i + 1, i - w, i + w];
          for (const j of nachbarn) {
            if (j < 0 || j >= marke.length || marke[j] >= 0) continue;
            const ny = Math.floor(j / w), nx = j - ny * w;
            if (nx < k.x0 || nx > k.x1 || ny < k.y0 || ny > by1) continue;
            if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
            if (d[j * 4 + 3] < 128) continue;
            marke[j] = nr;
            stapel.push(j);
          }
        }
        klumpen.push(kl);
      }
    }

    const mitte = (k.x0 + k.x1) / 2;
    let kopf = null;
    for (const kl of klumpen) {
      // Größe zählt, Nähe zur Mitte auch: Ein Flügel ist groß, steht aber außen.
      const versatz = Math.abs(kl.sx / kl.n - mitte) / breite;
      kl.wert = kl.n * (1 - Math.min(0.65, versatz * 1.3));
      if (!kopf || kl.wert > kopf.wert) kopf = kl;
    }
    if (!kopf) kopf = { x0: k.x0, x1: k.x1, y0: k.y0, y1: by1 };

    // Etwas Luft, dann auf 20:13 bringen — die Fläche im oberen Ballviertel.
    // Breiter als die halbe Gestalt wird der Ausschnitt nie: Sonst zöge er
    // den Rumpf mit hinein, und vom Kopf bliebe ein Fleck.
    const kb = Math.min(kopf.x1 - kopf.x0 + 1, breite * 0.62);
    const kh = kopf.y1 - kopf.y0 + 1;
    const mx = (kopf.x0 + kopf.x1) / 2, my = (kopf.y0 + kopf.y1) / 2;
    let bw = kb * 1.22, bh = kh * 1.22;
    if (bw / bh < KB / KH) bw = bh * KB / KH;
    else bh = bw * KH / KB;
    return {
      x0: Math.round(mx - bw / 2), x1: Math.round(mx + bw / 2),
      y0: Math.round(my - bh / 2), y1: Math.round(my + bh / 2)
    };
  }

  /**
   * Rechnet einen Ausschnitt auf ein Raster herunter. Je Zelle gewinnt die
   * häufigste Farbe, nicht der Durchschnitt: Gemittelt würde aus schwarzer
   * Kontur und weißem Fell ein graues Nichts.
   */
  function verkleinern(bild, aus, breite, hoehe, palette) {
    const d = bild.data, w = bild.width, h = bild.height;
    const zellen = [];
    const sx = (aus.x1 - aus.x0 + 1) / breite;
    const sy = (aus.y1 - aus.y0 + 1) / hoehe;
    for (let ry = 0; ry < hoehe; ry++) {
      const zeile = [];
      for (let rx = 0; rx < breite; rx++) {
        const stimmen = new Map();
        let fest = 0, gesamt = 0;
        for (let y = Math.floor(aus.y0 + ry * sy); y < aus.y0 + (ry + 1) * sy; y++) {
          for (let x = Math.floor(aus.x0 + rx * sx); x < aus.x0 + (rx + 1) * sx; x++) {
            if (x < 0 || y < 0 || x >= w || y >= h) { gesamt++; continue; }
            const i = (y * w + x) * 4;
            gesamt++;
            if (d[i + 3] < 128) continue;
            fest++;
            // Gleich auf die Farbtafel einrasten, dann stimmen die Zellen ab.
            let beste = 0, bestesMass = Infinity;
            for (let p = 0; p < palette.length; p++) {
              const m = abstand(palette[p], [d[i], d[i + 1], d[i + 2]]);
              if (m < bestesMass) { bestesMass = m; beste = p; }
            }
            stimmen.set(beste, (stimmen.get(beste) || 0) + 1);
          }
        }
        if (!gesamt || fest / gesamt < 0.42) { zeile.push(null); continue; }
        let sieger = -1, meiste = 0;
        stimmen.forEach((n, p) => { if (n > meiste) { meiste = n; sieger = p; } });
        zeile.push(sieger < 0 ? null : sieger);
      }
      zellen.push(zeile);
    }
    return zellen;
  }

  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v)))
    .toString(16).padStart(2, '0')).join('');
  const mische = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  function drin(x, y, radius) {
    const dx = x - M, dy = y - M;
    return dx * dx + dy * dy <= radius * radius;
  }

  /** Malt das fertige Raster auf ein Canvas und gibt es als PNG zurück. */
  function alsPNG(feld) {
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const f = feld[y][x];
        if (!f) continue;
        ctx.fillStyle = f;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return cv.toDataURL('image/png');
  }

  const KONTUR = '#181818';
  const UNTEN = '#f8f8f8';

  async function ball(eintrag) {
    const img = await bildLaden(eintrag.num);
    if (!img) return null;
    const bild = punkte(img);
    const k = kasten(bild);
    if (!k) return null;

    // Die Farbtafel: kräftige Farben zuerst, damit ein weißes Pokémon nicht
    // nur Weiß hergibt. Die Kontur (fast schwarz) bleibt immer dabei.
    const roh = tafel(bild, k);
    const gesamt = roh.reduce((a, f) => a + f.n, 0);
    const gewichtet = roh.map((f) => ({
      c: f.c, n: f.n,
      wert: f.n * (1 + bunt(f.c) / 255 * 1.6) * (hell(f.c) < 24 ? 0.15 : 1)
    })).sort((a, b) => b.wert - a.wert);

    const palette = [];
    for (const f of gewichtet) {
      if (palette.length >= 6) break;
      if (palette.some((p) => abstand(p, f.c) < 900)) continue;
      palette.push(f.c);
    }
    // Kontur und ein heller Ton gehören dazu, sonst franst der Kopf aus.
    if (!palette.some((p) => hell(p) < 70)) palette.push([26, 26, 30]);
    if (!palette.some((p) => hell(p) > 190)) palette.push([238, 238, 238]);

    const haupt = gewichtet[0] ? gewichtet[0].c : [200, 60, 60];
    const zweit = gewichtet.find((f) => abstand(f.c, haupt) > 4000);

    // Der Grund der oberen Hälfte: die Hauptfarbe, aber deutlich von ihr
    // abgesetzt — sonst verschwände ein Kopf in derselben Farbe darin.
    const dunkel = hell(haupt) < 128;
    const grund = hex(mische(haupt, dunkel ? [255, 255, 255] : [0, 0, 0], dunkel ? 0.42 : 0.3));
    const rand = hex(mische(haupt, [0, 0, 0], 0.45));

    // Kopf aufs Raster. Bei zwanzig Punkten Breite trägt jede weitere Farbe
    // nur Rauschen bei: Drei Töne und eine Kontur lesen sich als Kopf, sechs
    // Töne als Fleck. Die drei kommen aus dem Kopf selbst, nicht aus dem
    // ganzen Sprite — sonst färbte der Rumpf das Gesicht.
    const aus = kopfAusschnitt(bild, k);
    const kopfRoh = tafel(bild, {
      x0: Math.max(0, aus.x0), y0: Math.max(0, aus.y0),
      x1: Math.min(bild.width - 1, aus.x1), y1: Math.min(bild.height - 1, aus.y1)
    });
    const kopfGew = kopfRoh.map((f) => ({
      c: f.c, wert: f.n * (1 + bunt(f.c) / 255 * 1.4) * (hell(f.c) < 30 ? 0.2 : 1)
    })).sort((a, b) => b.wert - a.wert);
    const kopfPalette = [];
    for (const f of kopfGew) {
      if (kopfPalette.length >= 3) break;
      if (kopfPalette.some((p) => abstand(p, f.c) < 2600)) continue;
      kopfPalette.push(f.c);
    }
    while (kopfPalette.length < 3) {
      const a = kopfPalette[0] || haupt;
      kopfPalette.push(mische(a, kopfPalette.length === 1 ? [255, 255, 255] : [0, 0, 0], 0.35));
    }
    const zellen = verkleinern(bild, aus, KB, KH, kopfPalette);

    // Eine Kontur um den Kopf: Ohne sie schwimmt er im Grund, mit ihr steht
    // er als Gestalt darin. Gezogen wird sie außen herum, damit vom Kopf
    // selbst nichts verlorengeht.
    const kontur = hex(mische(kopfPalette[0], [0, 0, 0], 0.62));
    const umrandet = zellen.map((z) => z.slice());
    for (let cy = 0; cy < KH; cy++) {
      for (let cx = 0; cx < KB; cx++) {
        if (zellen[cy][cx] === null) continue;
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d2) {
          const nx = cx + d2[0], ny = cy + d2[1];
          if (nx < 0 || ny < 0 || nx >= KB || ny >= KH) return;
          if (zellen[ny][nx] === null && umrandet[ny][nx] === null) umrandet[ny][nx] = 'K';
        });
      }
    }

    const feld = [];
    const bandOben = M - 1.5, bandUnten = M + 1.5;
    const knopfAussen = 4.4, knopfInnen = 2.6;
    for (let y = 0; y < N; y++) {
      const zeile = [];
      for (let x = 0; x < N; x++) {
        if (!drin(x, y, R)) { zeile.push(null); continue; }
        const dk = Math.hypot(x - M, y - M);
        if (dk <= knopfInnen) { zeile.push(UNTEN); continue; }
        if (dk <= knopfAussen) { zeile.push(KONTUR); continue; }
        if (!drin(x, y, R - 1.6)) { zeile.push(KONTUR); continue; }
        if (y >= bandOben && y <= bandUnten) { zeile.push(KONTUR); continue; }
        if (y < bandOben) {
          const cx = x - KX, cy = y - KY;
          if (cx >= 0 && cx < KB && cy >= 0 && cy < KH) {
            const p = umrandet[cy][cx];
            if (p === 'K') { zeile.push(kontur); continue; }
            if (p !== null && p !== undefined) { zeile.push(hex(kopfPalette[p])); continue; }
          }
          zeile.push(grund);
        } else zeile.push(UNTEN);
      }
      feld.push(zeile);
    }
    // Ein Glanzpunkt links oben, wie ihn jeder gezeichnete Ball hat.
    if (feld[6] && feld[6][9]) { feld[6][9] = null; }

    return {
      id: eintrag.id,
      bild: alsPNG(feld),
      haupt: hex(haupt),
      zweit: zweit ? hex(zweit.c) : hex(mische(haupt, [255, 255, 255], 0.5)),
      rand: rand,
      anteil: Math.round((gewichtet[0] ? gewichtet[0].n : 0) / gesamt * 100)
    };
  }

  /** Der Umriss eines Pokémon als weiße Maske — die Farbe kommt aus dem CSS. */
  async function umriss(num, seite) {
    const img = await bildLaden(num);
    if (!img) return null;
    const bild = punkte(img);
    const k = kasten(bild);
    if (!k) return null;
    const cv = document.createElement('canvas');
    cv.width = seite; cv.height = seite;
    const ctx = cv.getContext('2d');
    const bw = k.x1 - k.x0 + 1, bh = k.y1 - k.y0 + 1;
    const s = seite / Math.max(bw, bh);
    const d = bild.data, w = bild.width;
    ctx.fillStyle = '#ffffff';
    for (let y = k.y0; y <= k.y1; y++) {
      for (let x = k.x0; x <= k.x1; x++) {
        if (d[(y * w + x) * 4 + 3] < 128) continue;
        ctx.fillRect(
          Math.floor((x - k.x0) * s + (seite - bw * s) / 2),
          Math.floor((y - k.y0) * s + (seite - bh * s) / 2),
          Math.ceil(s), Math.ceil(s));
      }
    }
    return cv.toDataURL('image/png');
  }

  const baelle = {};
  const fehlen = [];
  for (const eintrag of legenden) {
    const b = await ball(eintrag);
    if (b) baelle[b.id] = b;
    else fehlen.push(eintrag.id);
  }

  const umrisse = {};
  for (const gen of Object.keys(wahrzeichen)) {
    const sp = legenden.find((l) => l.id === wahrzeichen[gen]);
    if (!sp) continue;
    const u = await umriss(sp.num, 56);
    if (u) umrisse[gen] = u;
  }

  return { baelle, umrisse, fehlen };
}, { legenden, wahrzeichen: WAHRZEICHEN });

await browser.close();

if (ergebnis.fehlen.length) {
  console.log('Ohne Sprite und deshalb ohne Ball: ' + ergebnis.fehlen.join(', '));
}

const zeilen = Object.keys(ergebnis.baelle).sort().map((id) => {
  const b = ergebnis.baelle[id];
  return '    ' + JSON.stringify(id) + ': { b: ' + JSON.stringify(b.bild) +
    ', h: ' + JSON.stringify(b.haupt) + ', z: ' + JSON.stringify(b.zweit) +
    ', r: ' + JSON.stringify(b.rand) + ' }';
});

const umrissZeilen = Object.keys(ergebnis.umrisse).sort().map((g) =>
  '    ' + JSON.stringify(g) + ': ' + JSON.stringify(ergebnis.umrisse[g]));

const datei = `/* =============================================================================
 * baelle.js — jedem legendären Pokémon sein eigener Ball
 * -----------------------------------------------------------------------------
 * Automatisch erzeugt von tools/build-baelle.mjs — nicht von Hand ändern.
 *
 * Je Eintrag: b = der Ball als Bild, h = Hauptfarbe, z = Zweitfarbe,
 * r = die dunkle Randfarbe. Die Farben kommen aus dem Sprite selbst, gezählt
 * über alle Bildpunkte; der Kopf ist derselbe Sprite, auf 16×11 Punkte
 * heruntergerechnet.
 *
 * Dazu die Umrisse der neun Wahrzeichen — weiße Masken, deren Farbe das
 * Stylesheet setzt.
 * ========================================================================== */
(function (root) {
  'use strict';
  var PL = root.PL || (root.PL = {});

  var BAELLE = {
${zeilen.join(',\n')}
  };

  var UMRISSE = {
${umrissZeilen.join(',\n')}
  };

  PL.baelle = {
    /** Der Ball dieser Art — oder nichts, wenn sie keinen hat. */
    fuer: function (id) { return BAELLE[id] || null; },
    /** Der Umriss des Wahrzeichens einer Generation. */
    umriss: function (gen) { return UMRISSE[String(gen)] || null; },
    alle: BAELLE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.baelle;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;

writeFileSync(join(ROOT, 'data', 'baelle.js'), datei);
console.log('data/baelle.js · ' + Object.keys(ergebnis.baelle).length + ' Bälle · ' +
  Object.keys(ergebnis.umrisse).length + ' Umrisse · ' + (datei.length / 1024).toFixed(0) + ' KB');
