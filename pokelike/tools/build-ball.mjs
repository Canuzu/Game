/* =============================================================================
 * build-ball.mjs — der Pokéball als Pixelbild
 * -----------------------------------------------------------------------------
 * Vorher war der Ball aus CSS-Kreisen zusammengesetzt: ein runder Rand, ein
 * Balken, ein Knopf. Das sah aus wie drei Formen übereinander und nicht wie
 * ein gezeichneter Ball — der Rand war überall gleich dick, der Balken lief
 * quer durch, der Knopf schwebte darauf.
 *
 * Jetzt wird er gerechnet: ein echter Kreis im Raster, mit einer Kontur, die
 * der Rundung folgt, einem Band von drei Punkten Höhe und einem Knopf, der
 * im Band sitzt statt darauf. Herauskommt eine Zeichnung aus Quadraten, die
 * als SVG in css/ball.css landet — verlustfrei in jeder Größe, weil jedes
 * Quadrat ein Rasterpunkt bleibt.
 *
 *   node tools/build-ball.mjs
 * ========================================================================== */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = 24;                       // Kantenlänge des Rasters
const M = (N - 1) / 2;              // Mittelpunkt
const R = N / 2 - 0.5;              // Radius bis zur Außenkante

/** Liegt der Punkt (x, y) noch im Ball? Gemessen von der Punktmitte aus. */
function drin(x, y, radius) {
  const dx = x - M, dy = y - M;
  return dx * dx + dy * dy <= radius * radius;
}

function zeichne() {
  const feld = [];
  const bandOben = M - 1, bandUnten = M + 1;      // drei Punkte Band
  const knopfAussen = 3.6, knopfInnen = 2.1;

  for (let y = 0; y < N; y++) {
    const zeile = [];
    for (let x = 0; x < N; x++) {
      if (!drin(x, y, R)) { zeile.push('.'); continue; }

      const dk = Math.hypot(x - M, y - M);
      if (dk <= knopfInnen) { zeile.push('W'); continue; }   // Knopf innen
      if (dk <= knopfAussen) { zeile.push('K'); continue; }  // Knopfring

      // Die Kontur ist der Ring, für den der nächstinnere Kreis nicht mehr reicht.
      if (!drin(x, y, R - 1.4)) { zeile.push('K'); continue; }

      if (y >= bandOben && y <= bandUnten) { zeile.push('K'); continue; }
      zeile.push(y < bandOben ? 'R' : 'W');
    }
    feld.push(zeile.join(''));
  }
  return feld;
}

const FARBE = { R: '#e03c30', W: '#f8f8f8', K: '#181818' };

/** Gleiche Farben nebeneinander werden zu einem Rechteck zusammengefasst. */
function alsSVG(feld) {
  const teile = [];
  feld.forEach((zeile, y) => {
    let x = 0;
    while (x < zeile.length) {
      const z = zeile[x];
      if (z === '.') { x++; continue; }
      let ende = x;
      while (ende + 1 < zeile.length && zeile[ende + 1] === z) ende++;
      teile.push('<rect x="' + x + '" y="' + y + '" width="' + (ende - x + 1) +
        '" height="1" fill="' + FARBE[z] + '"/>');
      x = ende + 1;
    }
  });
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + ' ' + N +
    '" shape-rendering="crispEdges">' + teile.join('') + '</svg>';
}

const svg = alsSVG(zeichne());
const adresse = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

const css = `/* =============================================================================
 * ball.css — der gezeichnete Pokéball
 * -----------------------------------------------------------------------------
 * Erzeugt von tools/build-ball.mjs. Nicht von Hand ändern.
 * ========================================================================== */

:root { --ball-bild: url("${adresse}"); }

.pixelball {
  background-image: var(--ball-bild);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
`;

writeFileSync(join(ROOT, 'css', 'ball.css'), css);
console.log('css/ball.css · ' + N + '×' + N + ' Punkte · ' + (svg.length / 1024).toFixed(1) + ' KB');
