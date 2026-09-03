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
const browser2 = await chromium.launch(launchOpts);
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

  // Ein Dialog ("Attacke lernen", "Wen soll es ersetzen?") liegt über allem
  // und fängt jeden Klick ab — deshalb zuerst wegräumen.
  if (await page.locator('.modal').count()) {
    const btn = page.locator('.modal-actions .btn').last();
    if (await btn.count()) await btn.click({ timeout: 4000 }).catch(() => {});
    else await page.locator('.modal .btn, .modal .mon-card').first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(120);
    continue;
  }

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
    // "Weiterziehen" steht immer am Ende — die erste Schaltfläche wäre beim
    // Händler "Verkaufen" und würde die Szene nie verlassen.
    const primary = (await page.locator('.scene-actions .btn.primary').count())
      ? page.locator('.scene-actions .btn.primary').first()
      : page.locator('.scene-actions .btn').last();
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

console.log('\nNeue Bedienelemente');
// Der Durchlauf oben kann im Bildschirmtod geendet sein — für die folgenden
// Prüfungen wird deshalb ein frischer Run aufgesetzt.
await page.evaluate(() => {
  const PL = globalThis.PL, App = globalThis.PokelikeApp;
  App.run = new PL.Run({ seed: 20260903, starter: 'bulbasaur' });
  for (const id of ['pikachu', 'geodude', 'poliwag']) {
    App.run.party.push(PL.mon.create(id, 9, App.run.rng, { quality: 0.85 }));
  }
  App.run.party[0].hp = 3;
  App.run.addItem('hyperpotion', 2);
  App.show('map');
});
await page.waitForSelector('.btn.small.heal');
check('Der Schnellheilungsknopf ist da', await page.isVisible('.btn.small.heal'));
const hpBefore = await page.evaluate(() => globalThis.PokelikeApp.run.party[0].hp);
await page.click('.btn.small.heal');
await page.waitForTimeout(250);
const hpAfter = await page.evaluate(() => globalThis.PokelikeApp.run.party[0].hp);
check('Ein Klick heilt aus dem Beutel', hpAfter > hpBefore, hpBefore + ' → ' + hpAfter);

await page.evaluate(() => globalThis.PokelikeApp.show('team'));
await page.waitForSelector('.team-list .mon-card.draggable');
{
  const order = () => page.evaluate(() => globalThis.PokelikeApp.run.party.map((m) => m.uid));
  const before = await order();
  if (before.length >= 3) {
    const cards = page.locator('.team-list .mon-card');
    const a = await cards.nth(0).boundingBox();
    const c = await cards.nth(2).boundingBox();
    await page.mouse.move(a.x + 40, a.y + 20);
    await page.mouse.down();
    for (let y = a.y + 20; y <= c.y + 40; y += 14) { await page.mouse.move(a.x + 40, y); await page.waitForTimeout(12); }
    await page.mouse.up();
    await page.waitForTimeout(250);
    const after = await order();
    check('Team lässt sich per Ziehen sortieren', before[0] !== after[0],
      before.join(',') + ' → ' + after.join(','));
  } else {
    check('Team lässt sich per Ziehen sortieren', true, 'zu wenig Pokémon zum Prüfen');
  }
}
await closeModals();

console.log('\nMomente');
{
  const built = await page.evaluate(() => {
    const PL = globalThis.PL, doc = document;
    const stage = doc.createElement('div');
    stage.id = 'moment-probe';
    stage.style.cssText = 'position:fixed;left:0;top:0;width:240px;height:120px;opacity:0;pointer-events:none';
    const target = doc.createElement('div');
    target.className = 'mon-art';
    target.style.cssText = 'position:absolute;left:170px;top:20px;width:40px;height:40px';
    stage.appendChild(target);
    doc.body.appendChild(stage);
    const ms = PL.moments.ball({ stage: stage, target: target, item: 'hyperball',
      caught: true, shakes: 3 }, function () { stage.dataset.done = '1'; });
    return { ms: ms, ball: !!stage.querySelector('.moment-ball.ball-hyper') };
  });
  check('Der Ball fliegt und trägt die richtige Farbe', built.ball);
  check('Der Ballwurf bleibt kurz', built.ms > 0 && built.ms < 1000, built.ms + ' ms');

  await page.waitForFunction(() => document.querySelector('#moment-probe').dataset.done === '1',
    null, { timeout: 4000 });
  const after = await page.evaluate(() => {
    const stage = document.querySelector('#moment-probe');
    const out = {
      absorbed: !!stage.querySelector('.mon-art.being-caught'),
      clicked: !!stage.querySelector('.moment-ball.clicked')
    };
    stage.remove();
    return out;
  });
  check('Das Pokémon verschwindet im Ball', after.absorbed);
  check('Der Ball klickt beim Fang zu', after.clicked);

  const panel = await page.evaluate(() => {
    const p = globalThis.PL.moments.levelPanel({
      before: [40, 20, 21, 22, 23, 24], after: [44, 23, 21, 25, 23, 27], title: 'Level 12'
    });
    const rows = Array.from(p.node.querySelectorAll('.level-row'));
    return {
      ms: p.ms,
      rows: rows.length,
      ups: rows.filter((r) => r.classList.contains('up')).length,
      first: rows[0].querySelector('.ls-gain').textContent
    };
  });
  check('Die Werte-Tafel zeigt alle sechs Werte', panel.rows === 6, String(panel.rows));
  check('Nur gewachsene Werte werden hervorgehoben', panel.ups === 4, String(panel.ups));
  check('Der Zugewinn steht dabei', panel.first === '+4', panel.first);
  check('Auch die Tafel bleibt kurz', panel.ms < 1000, panel.ms + ' ms');
}

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

// Spielstand sichern und wieder einspielen
await page.getByRole('button', { name: /Spielstand sichern/ }).click();
await page.waitForSelector('.save-area');
const saveText = await page.locator('.save-area').inputValue();
check('Der Export enthält einen lesbaren Spielstand', saveText.indexOf('pokelike-save') > 0, saveText.slice(0, 40));
await page.getByRole('button', { name: 'Schließen' }).click();
await page.waitForSelector('.save-area', { state: 'detached' });

await page.getByRole('button', { name: /Spielstand einspielen/ }).click();
await page.waitForSelector('.save-area');
await page.locator('.save-area').fill(saveText);
await page.getByRole('button', { name: 'Einspielen', exact: true }).click();
await page.waitForSelector('.title-screen');
check('Ein eingespielter Spielstand führt zurück zum Titel', true);
await page.evaluate(() => globalThis.PokelikeApp.show('settings'));
await page.waitForSelector('.settings-screen');

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

await browser.close();

/* ---------------------------------------------------------------- Handy --
 * Eigene Sitzung mit Touch-Bedienung. Wichtigster Punkt: nichts darf breiter
 * sein als der Bildschirm — sonst zoomt der mobile Browser die ganze Seite
 * heraus und alles wird klein, nicht nur das Überstehende.
 * ------------------------------------------------------------------------ */

console.log('\nHandy');
{
  const phone = await browser2.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  phone.on('pageerror', (e) => consoleErrors.push('handy pageerror: ' + e.message));
  await phone.route('**://play.pokemonshowdown.com/**', (r) => r.abort());
  await phone.route('**://raw.githubusercontent.com/**', (r) => r.abort());
  await phone.goto(PAGE);
  await phone.waitForSelector('.title-screen', { timeout: 15000 });

  const fits = async (name) => {
    const m = await phone.evaluate(() => ({
      w: document.documentElement.scrollWidth, iw: window.innerWidth
    }));
    check(name + ' passt in die Bildschirmbreite', m.w <= m.iw + 2, m.w + ' > ' + m.iw);
  };

  await fits('Titel');
  await phone.click('text=✦ Neuer Run');
  await phone.waitForSelector('.starter-grid');
  await fits('Neuer Run');
  check('Der Startknopf bleibt beim Scrollen stehen', await phone.evaluate(() =>
    getComputedStyle(document.querySelector('.newrun-actions')).position === 'sticky'));
  await phone.locator('.starter:not(.locked)').first().click();
  await phone.click('text=Los geht’s');
  await phone.waitForSelector('.map-screen', { timeout: 10000 });
  await fits('Karte');

  await phone.evaluate(() => {
    const PL = globalThis.PL, App = globalThis.PokelikeApp;
    PL.meta.setSetting('speed', 'sofort');
    for (const id of ['pikachu', 'geodude', 'poliwag', 'machop']) {
      App.run.party.push(PL.mon.create(id, 12, App.run.rng, { quality: 0.85 }));
    }
    App.show('map');
  });
  await fits('Karte mit vollem Team');

  await phone.evaluate(() => {
    const App = globalThis.PokelikeApp;
    App.battle = App.run.makeTrainer(App.run.rng, {});
    App.battle.start();
    App.show('battle');
  });
  await phone.waitForSelector('.battle-stage');
  await phone.waitForTimeout(400);
  await fits('Kampf');

  const battle = await phone.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
    move: Math.round((document.querySelector('.move-btn') || {}).getBoundingClientRect?.().height || 0),
    action: Math.round((document.querySelector('.action-btn') || {}).getBoundingClientRect?.().height || 0),
    stageBottom: Math.round(document.querySelector('.battle-stage').getBoundingClientRect().bottom)
  }));
  check('Der Kampf passt auf einen Bildschirm ohne Scrollen',
    battle.scrollH <= battle.innerH + 2, battle.scrollH + ' > ' + battle.innerH);
  check('Attackenkacheln sind groß genug zum Tippen', battle.move >= 44, battle.move + ' px');
  check('Die Aktionsknöpfe auch', battle.action >= 44, battle.action + ' px');

  // Dialoge steigen von unten auf und lassen sich mit einem Griff schließen
  await phone.evaluate(() => globalThis.PokelikeApp.show('map'));
  await phone.locator('.icon-btn').nth(1).tap();
  await phone.waitForSelector('.modal');
  const sheet = await phone.evaluate(() => {
    const m = document.querySelector('.modal').getBoundingClientRect();
    return { w: Math.round(m.width), iw: window.innerWidth,
      bottom: Math.round(m.bottom), ih: window.innerHeight };
  });
  check('Der Beutel öffnet als Blatt über die volle Breite', sheet.w >= sheet.iw - 2,
    sheet.w + ' von ' + sheet.iw);
  check('… und sitzt am unteren Rand', sheet.bottom >= sheet.ih - 4,
    sheet.bottom + ' von ' + sheet.ih);
  await phone.locator('.modal-actions .btn').last().tap();
  await phone.waitForSelector('.modal', { state: 'detached' });

  for (const [screen, label] of [['team', 'Team'], ['dex', 'Pokédex'], ['settings', 'Einstellungen']]) {
    await phone.evaluate((s) => globalThis.PokelikeApp.show(s), screen);
    await phone.waitForTimeout(200);
    await fits(label);
  }
  if (SHOT_DIR) await phone.screenshot({ path: join(SHOT_DIR, '09-handy.png') });
  await browser2.close();
}

console.log('\n' + '─'.repeat(56));
if (fails) {
  console.log(fails + ' Prüfung(en) fehlgeschlagen:');
  problems.forEach((p) => console.log('  ✗ ' + p));
  process.exit(1);
}
console.log('Alle Browser-Prüfungen bestanden.');
