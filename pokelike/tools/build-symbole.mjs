/* =============================================================================
 * build-symbole.mjs — aus dem Punktraster werden Zeichen
 * -----------------------------------------------------------------------------
 * Liest tools/symbole.mjs und schreibt css/symbole.css: je Zeichen eine
 * Klasse .sym-name, deren Hintergrund ein SVG aus Rechtecken ist. Gleiche
 * Farben nebeneinander werden zu einem Rechteck zusammengefasst — das hält
 * die Datei klein und die Kanten sauber.
 *
 * Ein Zeichen ist damit überall scharf: Es ist kein Bild, das skaliert wird,
 * sondern eine Zeichnung aus Quadraten.
 *
 *   node tools/build-symbole.mjs
 * ========================================================================== */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAFEL, SYMBOLE } from './symbole.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = 16;

function alsSVG(bild, name) {
  const teile = [];
  bild.forEach((zeile, y) => {
    if (zeile.length !== N) throw new Error(name + ': Zeile ' + y + ' hat ' + zeile.length + ' statt ' + N + ' Punkte');
    let x = 0;
    while (x < zeile.length) {
      const z = zeile[x];
      if (!(z in TAFEL)) throw new Error(name + ': unbekannter Buchstabe »' + z + '«');
      if (TAFEL[z] === null) { x++; continue; }
      let ende = x;
      while (ende + 1 < zeile.length && zeile[ende + 1] === z) ende++;
      teile.push('<rect x="' + x + '" y="' + y + '" width="' + (ende - x + 1) +
        '" height="1" fill="' + TAFEL[z] + '"/>');
      x = ende + 1;
    }
  });
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + ' ' + N +
    '" shape-rendering="crispEdges">' + teile.join('') + '</svg>';
}

const namen = Object.keys(SYMBOLE);
if (namen.length !== new Set(namen).size) throw new Error('Doppelter Name in SYMBOLE');

const bloecke = namen.map((name) => {
  const adresse = 'data:image/svg+xml;utf8,' + encodeURIComponent(alsSVG(SYMBOLE[name], name));
  return '.sym-' + name + ' { --sym: url("' + adresse + '"); }';
});

const css = `/* =============================================================================
 * symbole.css — die gezeichneten Zeichen
 * -----------------------------------------------------------------------------
 * Erzeugt von tools/build-symbole.mjs aus tools/symbole.mjs. Nicht von Hand
 * ändern: Beim nächsten Bau wird die Datei überschrieben.
 *
 * Benutzt wird ein Zeichen über zwei Klassen: .sym setzt die Fläche, .sym-name
 * das Bild. »<span class="sym sym-beutel"></span>«
 * ========================================================================== */

.sym {
  display: inline-block; flex: none;
  width: 1em; height: 1em;
  vertical-align: -0.14em;
  background-image: var(--sym);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
/* Zwei feste Größen für die Stellen, an denen die Schriftgröße nicht passt. */
.sym.gross { width: 1.4em; height: 1.4em; vertical-align: -0.3em; }
.sym.klein { width: .8em; height: .8em; vertical-align: -0.06em; }

${bloecke.join('\n')}
`;

writeFileSync(join(ROOT, 'css', 'symbole.css'), css);
console.log('css/symbole.css · ' + namen.length + ' Zeichen · ' + (css.length / 1024).toFixed(1) + ' KB');
