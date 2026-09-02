/**
 * Lädt die Pokémon-Sprites von PokeAPI und legt sie als data/sprites.js ab —
 * eingebettet als Base64, damit die Einzeldatei-Fassung auch ohne Netz und in
 * Umgebungen läuft, die externe Bilder blockieren.
 *
 *   node tools/build-sprites.mjs
 *
 * Quelle: https://github.com/PokeAPI/sprites (Sprites: © Nintendo/Game Freak,
 * Nutzung hier nur privat und nicht kommerziell).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const MAX = 1025;
const PARALLEL = 16;

const sets = [
  { key: 'f', path: '' },          // vorne
  { key: 'b', path: 'back/' },     // hinten
  { key: 's', path: 'shiny/' }     // schillernd
];

async function fetchOne(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return Buffer.from(await r.arrayBuffer()).toString('base64');
    } catch (e) {
      if (i === tries - 1) return null;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  return null;
}

const out = {};
let done = 0, missing = 0;

for (const set of sets) {
  out[set.key] = {};
  const ids = [];
  for (let i = 1; i <= MAX; i++) ids.push(i);

  while (ids.length) {
    const batch = ids.splice(0, PARALLEL);
    const results = await Promise.all(batch.map((id) => fetchOne(BASE + set.path + id + '.png')));
    results.forEach((data, k) => {
      done++;
      if (data) out[set.key][batch[k]] = data;
      else missing++;
    });
    if (done % 320 < PARALLEL) {
      process.stdout.write('\r  ' + done + ' / ' + (MAX * sets.length) + ' geladen');
    }
  }
}

const json = JSON.stringify(out);
const file = `/* Automatisch erzeugt von tools/build-sprites.mjs — nicht von Hand ändern.
   Sprites aus dem Projekt PokeAPI/sprites, eingebettet als Base64. */
(function (root) {
  'use strict';
  root.PL_SPRITES = ${json};
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;

mkdirSync(join(ROOT, 'data'), { recursive: true });
writeFileSync(join(ROOT, 'data', 'sprites.js'), file);
console.log('\nGeschrieben: data/sprites.js (' + (file.length / 1048576).toFixed(2) + ' MB)');
console.log('Sätze: ' + sets.map((s) => s.key + '=' + Object.keys(out[s.key]).length).join(', ') +
  (missing ? ' | fehlend: ' + missing : ''));
