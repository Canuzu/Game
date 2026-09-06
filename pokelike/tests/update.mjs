/* =============================================================================
 * update.mjs — prüft an einem echten Server, ob sich die Seite selbst erneuert
 * -----------------------------------------------------------------------------
 * Auf dem Startbildschirm eines Telefons hält der Browser die Seite gern fest,
 * auch wenn längst eine neue Fassung veröffentlicht ist. Dagegen trägt jede
 * gebaute Fassung eine Kennung und lädt sich unter neuer Adresse nach, wenn
 * version.json eine andere nennt. Hier wird genau das nachgespielt:
 *
 *   node tests/update.mjs
 *
 * Gebraucht wird dist/pokelike.html samt dist/version.json — also einmal
 * `node tools/build-single.mjs` davor. Fehlt die Datei, meldet sich der Test
 * ab, statt zu scheitern.
 * ========================================================================== */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'dist', 'pokelike.html');
const VERSION = join(ROOT, 'dist', 'version.json');

if (!existsSync(HTML) || !existsSync(VERSION)) {
  console.log('dist/pokelike.html fehlt — erst `node tools/build-single.mjs` laufen lassen. Übersprungen.');
  process.exit(0);
}

const DIR = mkdtempSync(join(tmpdir(), 'pokelike-update-'));
copyFileSync(HTML, join(DIR, 'index.html'));
copyFileSync(VERSION, join(DIR, 'version.json'));
const build = JSON.parse(readFileSync(VERSION, 'utf8')).build;

const srv = createServer((req, res) => {
  const pfad = req.url.split('?')[0];
  const datei = pfad === '/' ? 'index.html' : pfad.slice(1);
  try {
    const body = readFileSync(join(DIR, datei));
    res.writeHead(200, { 'Content-Type': datei.endsWith('.json') ? 'application/json' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nicht da'); }
});
await new Promise((r) => srv.listen(0, r));
const url = 'http://127.0.0.1:' + srv.address().port + '/';

let ok = 0, schlecht = 0;
function pruef(name, cond, detail) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond ? '' : '  — ' + detail));
  if (cond) ok++; else schlecht++;
}

const browser = await chromium.launch();
const page = await browser.newPage();
const fehler = [];
page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });

console.log('\nSelbsterneuerung');

// 1) Alles aktuell — die Seite bleibt, wo sie ist.
await page.goto(url);
await page.waitForTimeout(1500);
pruef('Bei gleicher Fassung bleibt die Seite stehen', !page.url().includes('?v='), page.url());
pruef('Die Fassung steht im Spiel', (await page.evaluate(() => PL.update.build)) === build);

// 2) Eine neue Fassung ist veröffentlicht — die Seite holt sie sich.
writeFileSync(join(DIR, 'version.json'), JSON.stringify({ build: 'NEUEFASSUNG' }));
await page.goto(url);
await page.waitForTimeout(4000);
pruef('Bei neuer Fassung lädt sich die Seite unter neuer Adresse neu',
  page.url().includes('?v=NEUEFASSUNG'), page.url());

// 3) Der Zwischenspeicher gibt die alte Fassung trotzdem weiter aus —
//    dann darf sich das Spiel nicht im Kreis drehen.
const vorher = page.url();
await page.waitForTimeout(3000);
pruef('Und dreht sich danach nicht im Kreis', page.url() === vorher, page.url());
pruef('Stattdessen merkt es sich, dass es festhängt',
  (await page.evaluate(() => PL.update.state().stuck)) === true);

// 4) Der Spielstand übersteht das alles.
await page.evaluate(() => localStorage.setItem('pokelike.plus.v1', JSON.stringify({ runs: 42 })));
await page.goto(url);
await page.waitForTimeout(1500);
pruef('Der Spielstand übersteht das Neuladen',
  (await page.evaluate(() => JSON.parse(localStorage.getItem('pokelike.plus.v1') || '{}').runs)) === 42);

pruef('Keine Fehler in der Konsole', fehler.length === 0, fehler.join(' | '));

await browser.close();
srv.close();
console.log(schlecht ? '\nFEHLER: ' + schlecht : '\nAlle Prüfungen der Selbsterneuerung bestanden.');
process.exit(schlecht ? 1 : 0);
