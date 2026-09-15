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
import { startOptionen } from '../tools/browser.mjs';

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
for (const bei of ['sw.js', 'manifest.webmanifest']) {
  const q = join(ROOT, 'dist', bei);
  if (existsSync(q)) copyFileSync(q, join(DIR, bei));
}
const build = JSON.parse(readFileSync(VERSION, 'utf8')).build;

/* Der Typ muss stimmen: Einen Service Worker, der als text/html kommt, lehnt
   jeder Browser ab — und dann prüfte dieser Test nur noch sich selbst. */
const TYPEN = { '.json': 'application/json', '.js': 'text/javascript',
                '.webmanifest': 'application/manifest+json', '.html': 'text/html' };
function typVon(datei) {
  const punkt = datei.lastIndexOf('.');
  return (punkt >= 0 && TYPEN[datei.slice(punkt)]) || 'text/html';
}

const srv = createServer((req, res) => {
  const pfad = req.url.split('?')[0];
  const datei = pfad === '/' ? 'index.html' : pfad.slice(1);
  try {
    const body = readFileSync(join(DIR, datei));
    res.writeHead(200, { 'Content-Type': typVon(datei) });
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

const browser = await chromium.launch(startOptionen());
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

/* ---------- Der Service Worker: einmal holen, dann ohne Netz ---------------
 * Alles oben lief schon mit angemeldetem Helfer — das allein ist die Probe,
 * dass er der Selbsterneuerung nicht in die Quere kommt. Hier kommt der
 * eigentliche Zweck dran: Geht das Netz weg, muss das Spiel trotzdem starten.
 * -------------------------------------------------------------------------- */

console.log('\nService Worker');

// Zurück auf eine saubere Fassung, damit sich die Seite nicht neu lädt.
writeFileSync(join(DIR, 'version.json'), JSON.stringify({ build }));
await page.goto(url);
await page.waitForSelector('.title-screen', { timeout: 20000 });

/* Mit Zeitgrenze: »ready« löst nie auf, wenn gar nichts angemeldet ist.
   Ohne sie hinge diese Prüfung bei einem Fehlschlag endlos, statt zu
   scheitern — und ein Test, der hängt, sagt einem nichts. */
const uebernommen = await page.evaluate(() => {
  if (!navigator.serviceWorker) return false;
  return Promise.race([
    navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller).catch(() => false),
    new Promise((r) => setTimeout(() => r(false), 6000))
  ]);
});
pruef('Der Helfer übernimmt die Seite', uebernommen === true, String(uebernommen));

const imLager = await page.evaluate(() => caches.keys()
  .then((k) => k.filter((n) => n.indexOf('pokelike-') === 0))
  .then((k) => (k.length ? caches.open(k[0]).then((l) => l.keys())
    .then((r) => r.map((q) => new URL(q.url).pathname)) : [])));
pruef('Die Seite liegt im Lager', imLager.indexOf('/') >= 0, JSON.stringify(imLager));

// Jetzt das Netz kappen und neu laden. Kommt das Spiel hoch, war alles umsonst
// gewesen, wenn es nicht aus dem Lager käme — der Server antwortet nicht mehr.
await page.context().setOffline(true);
let ohneNetz = false;
try {
  // Knapp bemessen mit Absicht: Kommt die Seite aus dem Lager, ist sie
  // sofort da. Fehlt der Helfer, soll diese Prüfung schnell scheitern und
  // nicht minutenlang auf ein Netz warten, das nicht antwortet.
  await page.goto(url, { timeout: 8000 });
  await page.waitForSelector('.title-screen', { timeout: 8000 });
  ohneNetz = await page.evaluate(() => globalThis.PL && PL.dex && PL.dex.species.length > 1000);
} catch (e) { ohneNetz = 'Fehler: ' + e.message.split('\n')[0]; }
pruef('Ohne Netz startet das Spiel trotzdem', ohneNetz === true, String(ohneNetz));

// Und es ist wirklich das ganze Spiel, nicht nur die Hülle.
const vollstaendig = ohneNetz === true && await page.evaluate(() =>
  PL.items.all().length > 100 && PL.dex.moves.length > 800 && !!document.querySelector('.game-title'));
pruef('… und zwar vollständig', vollstaendig === true, String(vollstaendig));

await page.context().setOffline(false);

await browser.close();
srv.close();
console.log(schlecht ? '\nFEHLER: ' + schlecht : '\nAlle Prüfungen der Selbsterneuerung bestanden.');
process.exit(schlecht ? 1 : 0);
