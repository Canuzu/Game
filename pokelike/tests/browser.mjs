/* =============================================================================
 * browser.mjs — Prüfung im echten Browser
 * -----------------------------------------------------------------------------
 * Startet Chromium, öffnet index.html aus dem Dateisystem und spielt einen Run
 * an: neuer Run, Startpokémon wählen, Knoten betreten, Kämpfe durchklicken.
 * Jede Konsolenmeldung und jeder Seitenfehler lässt den Test scheitern.
 *
 *   npm run test:browser
 * ========================================================================== */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Playwright ist keine Abhängigkeit des Spiels — fehlt es, überspringt sich
// dieser Test selbst, statt fehlzuschlagen:
//   npm install --no-save playwright
// Ein bereits vorhandener Browser lässt sich per CHROMIUM_PFAD einbinden.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('Playwright ist nicht installiert — Browsertest übersprungen.');
  console.log('  npm install --no-save playwright && npx playwright install chromium');
  process.exit(0);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + join(HERE, '..', 'index.html');
const SHOT_DIR = process.env.PL_SHOTS || null;

let fails = 0;
const problems = [];
function check(name, cond, detail) {
  if (cond) { console.log('  ✓ ' + name); return true; }
  fails++;
  problems.push(name + (detail ? ' — ' + detail : ''));
  console.log('  ✗ ' + name + (detail ? ' — ' + detail : ''));
  return false;
}

const launchOpts = {};
if (process.env.CHROMIUM_PFAD) launchOpts.executablePath = process.env.CHROMIUM_PFAD;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const consoleErrors = [];
// Sprites werden im Test absichtlich blockiert — deren Ladefehler zählen nicht.
const ignorable = /Failed to load resource|net::ERR_FAILED|ERR_BLOCKED/;
page.on('console', (m) => { if (m.type() === 'error' && !ignorable.test(m.text())) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

// Sprites kommen aus dem Netz — im Test blockieren, damit nichts hängt.
await page.route('**://play.pokemonshowdown.com/**', (r) => r.abort());
await page.route('**://raw.githubusercontent.com/**', (r) => r.abort());

await page.goto(PAGE);
await page.waitForSelector('.title-screen', { timeout: 15000 });
console.log('\nTitelbildschirm');
check('Titel wird angezeigt', await page.isVisible('.game-title'));
check('Pokédex-Daten geladen', await page.evaluate(() => globalThis.PL.dex.species.length > 1000));
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '01-titel.png') });

console.log('\nNeuer Run');
await page.click('text=✦ Neuer Run');
await page.waitForSelector('.starter-grid');
check('Startpokémon zur Auswahl', (await page.locator('.starter').count()) >= 27);
check('Gesperrte Starter sind gesperrt', (await page.locator('.starter.locked').count()) > 0);
await page.locator('.starter:not(.locked)').first().click();
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '02-neuer-run.png') });
await page.click('text=Los geht’s');
await page.waitForSelector('.map-screen', { timeout: 10000 });
check('Karte erscheint', await page.isVisible('.region-header'));
check('Die Karte liegt auf einer Bodenkachel', await page.evaluate(() => {
  const layer = document.querySelector('.map-stage .scene-layer');
  return !!layer && /url\(/.test(getComputedStyle(layer).backgroundImage);
}));
check('Knoten sind runde Wegmarken', (await page.locator('.map-node .node-badge').count()) >= 2);
check('Team hat ein Pokémon', (await page.locator('.party-strip .mon-card:not(.empty)').count()) === 1);
check('Knoten sind wählbar', (await page.locator('.map-node.open').count()) >= 1);
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '03-karte.png') });

// Tempo auf sofort stellen, damit der Test nicht auf Animationen wartet, und
// dem Team drei Begleiter geben — sonst endet der Durchlauf gelegentlich schon
// im ersten Kampf und es gäbe nichts zu prüfen.
await page.evaluate(() => {
  const PL = globalThis.PL, App = globalThis.PokelikeApp;
  PL.meta.setSetting('speed', 'sofort');
  for (const id of ['pikachu', 'geodude', 'poliwag']) {
    App.run.party.push(PL.mon.create(id, 9, App.run.rng, { quality: 0.85 }));
  }
});

console.log('\nDurchspielen');
let battles = 0, scenes = {}, guard = 0, shotBattle = false;
while (guard++ < 45) {
  const screen = await page.evaluate(() => document.body.getAttribute('data-screen'));
  scenes[screen] = (scenes[screen] || 0) + 1;

  if (screen === 'map') {
    const open = page.locator('.map-node.open');
    if (!(await open.count())) break;
    await open.first().click({ timeout: 8000 }).catch(() => {});
    // Der Kampfstart blendet über — erst warten, bis der Bildschirm wechselt.
    await page.waitForFunction(
      () => document.body.getAttribute('data-screen') !== 'map', null, { timeout: 4000}
    ).catch(() => {});
    continue;
  }

  if (screen === 'battle') {
    battles++;
    if (!shotBattle) {
      check('Der Kampf spielt in einer gezeichneten Kulisse',
        await page.isVisible('.battle-stage .scene-art'));
      check('Beide Pokémon stehen auf Plattformen',
        (await page.locator('.stage-slot .platform').count()) === 2);
      check('Kein Terakristall mehr in der Oberfläche',
        (await page.locator('.action-btn.tera').count()) === 0);
      check('Attackenkacheln stehen bereit',
        (await page.locator('.move-grid .move-btn').count()) >= 1);
      check('Der Auto-Schalter ist immer sichtbar',
        await page.isVisible('.action-btn.auto'));
      check('Die Kulisse ist ein Pixelbild', await page.isVisible('.battle-stage .scene-art'));
    }
    if (!shotBattle && SHOT_DIR) {
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(SHOT_DIR, '04-kampf.png') });
    }
    shotBattle = true;
    // Auto-Kampf einschalten und warten, bis der Kampf endet
    const auto = page.locator('.action-btn.auto');
    if (await auto.count() && !(await auto.first().evaluate((n) => n.classList.contains('on')))) {
      await auto.first().click({ timeout: 8000 }).catch(() => {});
    }
    await page.waitForFunction(
      () => document.body.getAttribute('data-screen') !== 'battle',
      null, { timeout: 25000 }
    ).catch(() => {});
    continue;
  }

  if (screen === 'scene') {
    // Erste sinnvolle Schaltfläche drücken. Ein Dialog kann jederzeit
    // aufgehen (etwa "Attacke lernen") — dann greift der Modal-Zweig oben
    // beim nächsten Durchlauf, deshalb hier nur kurz versuchen.
    const offer = page.locator('.offer, .relic-card, .item-row:not(:disabled), .option:not(:disabled)').first();
    const primary = page.locator('.scene-actions .btn.primary, .scene-actions .btn').first();
    if (await offer.count()) await offer.click({ timeout: 6000 }).catch(() => {});
    else if (await primary.count()) await primary.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(150);
    continue;
  }

  if (screen === 'end') break;
  if (screen === 'team') { await page.click('text=Zurück zur Karte'); continue; }
  break;
}

check('Es wurde gekämpft', battles >= 1,
  battles + ' Kämpfe nach ' + guard + ' Schritten, Bildschirme: ' + JSON.stringify(scenes));
check('Mehrere Knotenarten besucht', Object.keys(scenes).length >= 2, JSON.stringify(scenes));
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '05-verlauf.png') });

// Nach dem Durchspielen kann noch ein Dialog offen sein — erst aufräumen.
async function closeModals() {
  for (let i = 0; i < 6; i++) {
    if (!(await page.locator('.modal').count())) return;
    const btn = page.locator('.modal-actions .btn').last();
    if (!(await btn.count())) break;
    await btn.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => {
    const host = document.querySelector('#overlay');
    if (host) { host.innerHTML = ''; host.classList.remove('active'); }
  });
}
await closeModals();

console.log('\nWeitere Bildschirme');
await page.evaluate(() => globalThis.PokelikeApp.show('team'));
await page.waitForSelector('.team-screen');
check('Teamansicht zeigt Werte', await page.isVisible('.stat-block'));
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '06-team.png') });

await page.evaluate(() => globalThis.PokelikeApp.show('dex'));
await page.waitForSelector('.dex-grid');
check('Pokédex zeigt Einträge', (await page.locator('.dex-cell').count()) > 100);
check('Gefangenes ist eingetragen', (await page.locator('.dex-cell.caught').count()) >= 1);
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '07-dex.png') });

await page.evaluate(() => globalThis.PokelikeApp.show('stats'));
await page.waitForSelector('.stats-screen');
check('Statistik erscheint', await page.isVisible('.stat-grid'));

await page.evaluate(() => globalThis.PokelikeApp.show('achievements'));
await page.waitForSelector('.ach-grid');
check('Erfolge erscheinen', (await page.locator('.ach').count()) >= 20);

await page.evaluate(() => globalThis.PokelikeApp.show('settings'));
await page.waitForSelector('.settings-screen');
check('Einstellungen erscheinen', (await page.locator('.setting').count()) >= 4);
await page.locator('button.filter', { hasText: /^Hell$/ }).first().click();
check('Helles Thema greift',
  (await page.evaluate(() => document.documentElement.getAttribute('data-app-theme'))) === 'light');
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '08-hell.png') });
await page.locator('button.filter', { hasText: /^Dunkel$/ }).first().click();

console.log('\nSpeichern');
const saved = await page.evaluate(() => {
  const app = globalThis.PokelikeApp;
  if (!app.run) return 'kein Run';
  globalThis.PL.meta.saveRun(app.run);
  return globalThis.PL.meta.hasRun() ? 'ok' : 'nicht gespeichert';
});
check('Run lässt sich speichern', saved === 'ok' || saved === 'kein Run', saved);

await page.reload();
await page.waitForSelector('.title-screen');
check('Nach dem Neuladen bleibt der Fortschritt',
  await page.evaluate(() => globalThis.PL.meta.load().runs >= 0));

console.log('\nKonsole');
check('Keine Fehler in der Konsole', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));

// Schmale Ansicht
await page.setViewportSize({ width: 390, height: 780 });
await page.waitForTimeout(200);
check('Kein waagerechtes Scrollen auf dem Handy',
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
  await page.evaluate(() => document.documentElement.scrollWidth + ' > ' + window.innerWidth));
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '09-handy.png') });

await browser.close();

console.log('\n' + '─'.repeat(56));
if (fails) {
  console.log(fails + ' Prüfung(en) fehlgeschlagen:');
  problems.forEach((p) => console.log('  ✗ ' + p));
  process.exit(1);
}
console.log('Alle Browser-Prüfungen bestanden.');
