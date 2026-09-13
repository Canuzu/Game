/* =============================================================================
 * build-gegenstaende.mjs — aus dem Punktraster werden Gegenstände
 * -----------------------------------------------------------------------------
 * Liest tools/gegenstaende.mjs und schreibt css/gegenstaende.css: je Gegenstand
 * eine Klasse .gg-name, deren Hintergrund ein SVG aus Rechtecken ist.
 *
 * Anders als bei den Zeichen steht die Farbe nicht in der Zeichnung: Die
 * Buchstaben A, a, B, b und C sind Platzhalter, die pro Gegenstand aus seiner
 * Liste »tausch« gefüllt werden. Darum reichen fünfzehn Zeichnungen für
 * über hundert Dinge, und jedes sieht trotzdem anders aus.
 *
 *   node tools/build-gegenstaende.mjs
 * ========================================================================== */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAFEL, FORMEN, GEGENSTAENDE } from './gegenstaende.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = 16;
const PLATZHALTER = ['A', 'a', 'B', 'b', 'C'];

function farbe(zeichen, tausch, name) {
  if (zeichen in tausch) return tausch[zeichen];
  if (zeichen in TAFEL) return TAFEL[zeichen];
  throw new Error(name + ': unbekannter Buchstabe »' + zeichen + '«');
}

function alsSVG(bild, tausch, name) {
  /* Erst waagerechte Strecken gleicher Farbe, dann senkrecht verschmelzen:
   * Aus vielen Punkten werden wenige Rechtecke, und die Datei bleibt klein. */
  const kaesten = [];
  bild.forEach((zeile, y) => {
    if (zeile.length !== N) throw new Error(name + ': Zeile ' + y + ' hat ' + zeile.length + ' statt ' + N + ' Punkte');
    let x = 0;
    while (x < zeile.length) {
      const z = zeile[x];
      const f = farbe(z, tausch, name);
      if (f === null) { x++; continue; }
      let ende = x;
      while (ende + 1 < zeile.length && zeile[ende + 1] === z) ende++;
      const breite = ende - x + 1;
      const oben = kaesten.find((k) => k.f === f && k.x === x && k.b === breite && k.y + k.h === y);
      if (oben) oben.h++;
      else kaesten.push({ f: f, x: x, y: y, b: breite, h: 1 });
      x = ende + 1;
    }
  });
  /* Alles einer Farbe kommt in einen Pfad — das spart die Wiederholung. */
  const nachFarbe = new Map();
  for (const k of kaesten) {
    const d = 'M' + k.x + ' ' + k.y + 'h' + k.b + 'v' + k.h + 'h-' + k.b + 'z';
    nachFarbe.set(k.f, (nachFarbe.get(k.f) || '') + d);
  }
  const teile = [];
  for (const [f, d] of nachFarbe) teile.push('<path fill="' + f + '" d="' + d + '"/>');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + ' ' + N +
    '" shape-rendering="crispEdges">' + teile.join('') + '</svg>';
}

const namen = Object.keys(GEGENSTAENDE);
const bloecke = namen.map((name) => {
  const eintrag = GEGENSTAENDE[name];
  const bild = FORMEN[eintrag.form];
  if (!bild) throw new Error(name + ': Form »' + eintrag.form + '« gibt es nicht');
  const tausch = eintrag.tausch || {};
  /* Jeder Platzhalter, der in der Zeichnung vorkommt, braucht eine Farbe. */
  for (const p of PLATZHALTER) {
    if (bild.some((z) => z.includes(p)) && !(p in tausch)) {
      throw new Error(name + ': Form »' + eintrag.form + '« benutzt »' + p + '«, aber der Tausch sagt nichts dazu');
    }
  }
  const adresse = 'data:image/svg+xml;utf8,' + encodeURIComponent(alsSVG(bild, tausch, name));
  return '.gg-' + name + ' { --gg: url("' + adresse + '"); }';
});

const css = `/* =============================================================================
 * gegenstaende.css — jedes Ding im Beutel, gezeichnet
 * -----------------------------------------------------------------------------
 * Erzeugt von tools/build-gegenstaende.mjs aus tools/gegenstaende.mjs. Nicht
 * von Hand ändern: Beim nächsten Bau wird die Datei überschrieben.
 *
 * Benutzt wird ein Bild über zwei Klassen: .gg setzt die Fläche, .gg-name das
 * Bild. »<span class="gg gg-pokeball"></span>«
 * ========================================================================== */

.gg {
  display: inline-block; flex: none;
  width: 1.4em; height: 1.4em;
  vertical-align: -0.3em;
  background-image: var(--gg);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.gg.klein { width: 1em; height: 1em; vertical-align: -0.14em; }
.gg.gross { width: 2em; height: 2em; vertical-align: -0.5em; }

${bloecke.join('\n')}
`;

writeFileSync(join(ROOT, 'css', 'gegenstaende.css'), css);
console.log('css/gegenstaende.css · ' + namen.length + ' Gegenstände · ' + (css.length / 1024).toFixed(1) + ' KB');
