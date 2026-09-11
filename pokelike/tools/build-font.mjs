/* =============================================================================
 * build-font.mjs — aus dem Punktraster wird eine Schriftdatei
 * -----------------------------------------------------------------------------
 * Liest tools/schrift.mjs, macht aus jedem gesetzten Punkt ein Rechteck und
 * schreibt daraus eine echte Schrift. Die landet als data:-Adresse in
 * css/schrift.css, damit das Spiel auch ohne Netz und aus einer einzigen
 * Datei heraus funktioniert.
 *
 * Maßstab: ein Rasterpunkt = 100 Einheiten, ein Geviert = 1000 Einheiten.
 * Damit ist die Grundlinie bei 0, die Versalhöhe bei 700 und die Unterlänge
 * bei -200. Bei einer Schriftgröße von 20 px ist ein Rasterpunkt genau 2 px
 * groß — deshalb sind alle Größen im Stylesheet Vielfache von 10.
 *
 *   node tools/build-font.mjs
 * ========================================================================== */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { GLYPHEN, GLEICH } from './schrift.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PUNKT = 100;          // Kantenlänge eines Rasterpunkts in Schrifteinheiten
const ZEILEN = 9;           // Zeilen je Zeichnung
const UEBER = 7;            // davon über der Grundlinie
const GEVIERT = 1000;
const ABSTAND = 1;          // Rasterpunkte Luft rechts neben jedem Zeichen

/**
 * Aus einer Zeichnung wird ein Pfad. Gleich nebeneinander liegende Punkte
 * werden zu einem Rechteck zusammengefasst — das spart Knoten und macht die
 * Kanten sauber, weil weniger Linien aufeinanderliegen.
 */
function zeichneGlyphe(bild) {
  const pfad = new opentype.Path();

  // Leere Spalten links und rechts abschneiden: Sonst bekäme ein »i« so viel
  // Platz wie ein »M«, und der Text stünde wie auf Karopapier. Die Buchstaben
  // rücken damit auf ihre eigene Breite zusammen — so machen es die Vorbilder.
  let links = Infinity, rechts = -1;
  bild.forEach((zeile) => {
    for (let c = 0; c < zeile.length; c++) {
      if (zeile[c] !== '#') continue;
      if (c < links) links = c;
      if (c > rechts) rechts = c;
    }
  });
  if (rechts < 0) {                       // ein Zeichen ohne Punkte: das Leerzeichen
    return { pfad, breite: Math.max(2, Math.round(bild[0].length / 2)) };
  }

  let breite = rechts - links + 1;
  bild = bild.map((zeile) => zeile.slice(links, rechts + 1));
  bild.forEach((zeile, r) => {
    let c = 0;
    while (c < zeile.length) {
      if (zeile[c] !== '#') { c++; continue; }
      let ende = c;
      while (ende + 1 < zeile.length && zeile[ende + 1] === '#') ende++;
      const x0 = c * PUNKT;
      const x1 = (ende + 1) * PUNKT;
      const y1 = (UEBER - r) * PUNKT;
      const y0 = y1 - PUNKT;
      pfad.moveTo(x0, y0);
      pfad.lineTo(x0, y1);
      pfad.lineTo(x1, y1);
      pfad.lineTo(x1, y0);
      pfad.close();
      c = ende + 1;
    }
  });
  return { pfad, breite };
}

const glyphen = [
  new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 5 * PUNKT, path: new opentype.Path() })
];

function ergaenze(zeichen, bild) {
  if (bild.length !== ZEILEN) {
    throw new Error('»' + zeichen + '« hat ' + bild.length + ' Zeilen statt ' + ZEILEN);
  }
  const { pfad, breite } = zeichneGlyphe(bild);
  glyphen.push(new opentype.Glyph({
    name: 'u' + zeichen.codePointAt(0).toString(16),
    unicode: zeichen.codePointAt(0),
    advanceWidth: (breite + ABSTAND) * PUNKT,
    path: pfad
  }));
}

Object.keys(GLYPHEN).forEach((z) => ergaenze(String(z), GLYPHEN[z]));
Object.keys(GLEICH).forEach((z) => {
  const vorlage = GLYPHEN[GLEICH[z]];
  if (!vorlage) throw new Error('Vorlage fehlt für ' + z);
  ergaenze(z, vorlage);
});

const font = new opentype.Font({
  familyName: 'PokelikePixel',
  styleName: 'Regular',
  unitsPerEm: GEVIERT,
  ascender: (UEBER + 1) * PUNKT,
  descender: -(ZEILEN - UEBER) * PUNKT,
  glyphs: glyphen
});

const roh = Buffer.from(font.toArrayBuffer());
const daten = roh.toString('base64');

const css = `/* =============================================================================
 * schrift.css — die eingebaute Pixelschrift
 * -----------------------------------------------------------------------------
 * Erzeugt von tools/build-font.mjs aus tools/schrift.mjs. Nicht von Hand
 * ändern: Beim nächsten Bau wird die Datei überschrieben.
 *
 * Die Schrift steckt als Datenadresse in der Datei selbst. Das Spiel läuft
 * damit ohne Netz, ohne Schriftserver und ohne den Moment, in dem der Text
 * erst in einer fremden Schrift erscheint und dann umspringt.
 * ========================================================================== */

@font-face {
  font-family: 'PokelikePixel';
  src: url(data:font/ttf;base64,${daten}) format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
`;

writeFileSync(join(ROOT, 'css', 'schrift.css'), css);
console.log('css/schrift.css · ' + glyphen.length + ' Zeichen · ' +
  (roh.length / 1024).toFixed(1) + ' KB roh, ' + (daten.length / 1024).toFixed(1) + ' KB als Text');
