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
import { alsSVG, alsAdresse } from './raster.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLATZHALTER = ['A', 'a', 'B', 'b', 'C'];

function farbe(zeichen, tausch, name) {
  if (zeichen in tausch) return tausch[zeichen];
  if (zeichen in TAFEL) return TAFEL[zeichen];
  throw new Error(name + ': unbekannter Buchstabe »' + zeichen + '«');
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
  const adresse = alsAdresse(alsSVG(bild, function (z) { return farbe(z, tausch, name); }, { name: name }));
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
