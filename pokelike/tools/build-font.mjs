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
import { GLYPHEN, SYMBOLE, GLEICH } from './schrift.mjs';

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

/* ---------- Die Symbole bekommen eigene Plätze -------------------------------
 * Nicht die Emoji-Plätze: Chromium sucht für Emoji immer zuerst in seiner
 * eigenen bunten Schrift, auch wenn unsere das Zeichen hätte. Gemessen — auch
 * mit font-variant-emoji: text gewann die Systemschrift.
 *
 * Also liegen sie im privaten Bereich ab U+E000, und js/symbole.js tauscht
 * sie beim Anzeigen ein. Die Reihenfolge ist die der Tabelle; wer eine
 * Zeichnung einfügt, verschiebt damit die Plätze der folgenden — deshalb wird
 * die Zuordnung bei jedem Bau neu geschrieben und nie von Hand gepflegt.
 * -------------------------------------------------------------------------- */

const PRIVAT_START = 0xE000;
const zuordnung = {};
let naechster = PRIVAT_START;

Object.keys(SYMBOLE).forEach((z) => {
  const platz = String.fromCodePoint(naechster++);
  zuordnung[z] = platz;
  ergaenze(platz, SYMBOLE[z]);
});

Object.keys(GLEICH).forEach((z) => {
  const ziel = GLEICH[z];
  if (zuordnung[ziel]) { zuordnung[z] = zuordnung[ziel]; return; }   // Symbol
  const vorlage = GLYPHEN[ziel];
  if (!vorlage) throw new Error('Vorlage fehlt für ' + z);
  ergaenze(z, vorlage);                                              // Buchstabe
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

/* ---------- Die Zuordnung für das Spiel -------------------------------------- */

const paare = Object.keys(zuordnung)
  .map((z) => '    ' + JSON.stringify(z) + ': ' + JSON.stringify(zuordnung[z]))
  .join(',\n');

const js = `/* =============================================================================
 * symbole.js — Emoji werden zu gezeichneten Zeichen
 * -----------------------------------------------------------------------------
 * Erzeugt von tools/build-font.mjs. Nicht von Hand ändern.
 *
 * Im Spielcode steht weiter das Emoji — dort liest es sich am besten. Beim
 * Anzeigen wird es gegen das Zeichen aus unserer Schrift getauscht. Getauscht
 * wird nur, was auf den Bildschirm geht: Was das Spiel verschickt oder
 * speichert, behält das echte Emoji.
 * ========================================================================== */
(function (root) {
  'use strict';
  var PL = root.PL || (root.PL = {});

  var TABELLE = {
${paare}
  };

  // Ein Ausdruck über alle Schlüssel, längste zuerst — damit ein Zeichen mit
  // Variantenwähler nicht halb stehen bleibt.
  var schluessel = Object.keys(TABELLE).sort(function (a, b) { return b.length - a.length; });
  var muster = new RegExp(schluessel.map(function (z) {
    return z.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  }).join('|'), 'g');

  /** Tauscht jedes bekannte Emoji gegen das gezeichnete Zeichen. */
  function ersetze(text) {
    if (text === null || text === undefined) return text;
    var s = String(text);
    // Variantenwähler mitnehmen: '🏛️' ist '🏛' plus U+FE0F.
    return s.replace(muster, function (t) { return TABELLE[t]; }).replace(/\uFE0F/g, '');
  }

  PL.symbole = { tabelle: TABELLE, ersetze: ersetze };
  if (typeof module !== 'undefined' && module.exports) module.exports = PL.symbole;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;

writeFileSync(join(ROOT, 'js', 'symbole.js'), js);
console.log('js/symbole.js · ' + Object.keys(zuordnung).length + ' Zuordnungen');
console.log('css/schrift.css · ' + glyphen.length + ' Zeichen · ' +
  (roh.length / 1024).toFixed(1) + ' KB roh, ' + (daten.length / 1024).toFixed(1) + ' KB als Text');
