/* =============================================================================
 * build-effekte.mjs — aus den Punktrastern werden Effektformen
 * -----------------------------------------------------------------------------
 * Liest tools/effekte.mjs und schreibt css/effekte.css.
 *
 * Bunte Formen bekommen ihre Farben mit und stehen als Hintergrundbild da.
 * Masken sind nur Umrisse: Sie werden als Maske über eine Fläche gelegt, und
 * die Fläche trägt die Farbe des Attackentyps. So kann derselbe Aufschlag
 * einmal rot und einmal blau sein, ohne zweimal gezeichnet zu werden.
 *
 *   node tools/build-effekte.mjs
 * ========================================================================== */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAFEL, FORMEN, MASKEN } from './effekte.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = 16;

function alsSVG(bild, name, maske) {
  const teile = [];
  bild.forEach((zeile, y) => {
    if (zeile.length !== N) throw new Error(name + ': Zeile ' + y + ' hat ' + zeile.length + ' statt ' + N);
    let x = 0;
    while (x < zeile.length) {
      const z = zeile[x];
      if (!(z in TAFEL)) throw new Error(name + ': unbekannter Buchstabe »' + z + '«');
      if (TAFEL[z] === null) { x++; continue; }
      let ende = x;
      while (ende + 1 < zeile.length && zeile[ende + 1] === z) ende++;
      teile.push('<rect x="' + x + '" y="' + y + '" width="' + (ende - x + 1) +
        '" height="1" fill="' + (maske ? '#000' : TAFEL[z]) + '"/>');
      x = ende + 1;
    }
  });
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + ' ' + N +
    '" shape-rendering="crispEdges">' + teile.join('') + '</svg>';
}

const adresse = (svg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

const bunt = Object.keys(FORMEN).map((name) =>
  '.fx-form-' + name + ' { --form: url("' + adresse(alsSVG(FORMEN[name], name, false)) + '"); }');
const masken = Object.keys(MASKEN).map((name) =>
  '.fx-maske-' + name + ' { --form: url("' + adresse(alsSVG(MASKEN[name], name, true)) + '"); }');

const css = `/* =============================================================================
 * effekte.css — die gezeichneten Formen der Attacken
 * -----------------------------------------------------------------------------
 * Erzeugt von tools/build-effekte.mjs aus tools/effekte.mjs. Nicht von Hand
 * ändern: Beim nächsten Bau wird die Datei überschrieben.
 * ========================================================================== */

/* Eine Form im Effektbild. Sie wird nie weichgezeichnet — ein Rasterpunkt
   bleibt ein Rasterpunkt, auch wenn die Form auf das Vierfache wächst. */
.fx-form {
  position: absolute; display: block;
  background-image: var(--form);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
/* Ein Umriss, den die Farbe des Typs füllt. */
.fx-maske {
  position: absolute; display: block;
  background-color: var(--tint, #ffffff);
  -webkit-mask-image: var(--form);
  mask-image: var(--form);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

${bunt.join('\n')}
${masken.join('\n')}
`;

writeFileSync(join(ROOT, 'css', 'effekte.css'), css);
console.log('css/effekte.css · ' + (bunt.length + masken.length) + ' Formen · ' +
  (css.length / 1024).toFixed(1) + ' KB');
