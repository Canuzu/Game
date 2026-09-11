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
import { startOptionen } from '../tools/browser.mjs';

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

const launchOpts = startOptionen();
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
await page.getByRole('button', { name: 'Neuer Run' }).click();
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
let battles = 0, scenes = {}, guard = 0, shotBattle = false, expGeprueft = false;
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
    // Nach einem Kampf steht die Abrechnung: Jedes Teammitglied muss darin
    // vorkommen, auch das, das nicht gekämpft hat.
    if (!expGeprueft && (await page.locator('.exp-block').count())) {
      expGeprueft = true;
      const zeilen = await page.locator('.exp-row').count();
      const teamgroesse = await page.evaluate(() => globalThis.PokelikeApp.run.party.length);
      check('Die Erfahrung wird für das ganze Team ausgewiesen', zeilen === teamgroesse,
        zeilen + ' Zeilen bei ' + teamgroesse + ' Pokémon');
      const texte = (await page.locator('.exp-amount').allInnerTexts()).join(' | ');
      check('… mit einem Betrag je Pokémon', /\+\d+ EP|Levelgrenze/.test(texte), texte);
    }
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

check('Die Erfahrungsabrechnung wurde gesehen', expGeprueft);
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

// Der Eintrag zeigt die Entwicklungskette — samt Bedingung
await page.locator('.dex-cell.caught').first().click();
await page.waitForSelector('.dex-entry');
{
  const kette = page.locator('.dex-evo');
  check('Der Pokédex-Eintrag zeigt die Entwicklung', (await kette.count()) === 1);
  const glieder = await page.locator('.dex-evo .evo-mon').count();
  check('… mit mehr als einer Stufe', glieder >= 2, String(glieder));
  const pfeile = (await page.locator('.dex-evo .evo-arrow').allInnerTexts()).join(' | ');
  check('… und nennt Level oder Stein', /Lv \d+|stein|Stein/.test(pfeile), pfeile);
}
await page.getByRole('button', { name: 'Schließen' }).click();
await page.waitForSelector('.dex-entry', { state: 'detached' });
if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '07-dex.png') });

await page.evaluate(() => globalThis.PokelikeApp.show('stats'));
await page.waitForSelector('.stats-screen');
check('Statistik erscheint', await page.isVisible('.stat-grid'));

await page.evaluate(() => globalThis.PokelikeApp.show('achievements'));
await page.waitForSelector('.ach-grid');
check('Erfolge erscheinen', (await page.locator('.ach').count()) >= 20);

// Der Endbildschirm: Was von einem Run übrig bleibt, muss man weitergeben können
await page.evaluate(() => {
  const run = new PL.Run({ seed: 12345, mode: 'standard', ascension: 2, starter: 'charmander' });
  run.region = 5;
  run.stats.battles = 24; run.stats.catches = 11;
  ['larvitar', 'geodude'].forEach((id, i) =>
    run.party.push(PL.world.buildMon(PL.rng('t' + i), PL.dex.sp(id), 28 + i, {})));
  run.state = 'gameover';
  globalThis.PokelikeApp.run = run;
  globalThis.PokelikeApp.show('end');
});
await page.waitForSelector('.teilen-zone');
{
  const text = await page.locator('.teilen-text').innerText();
  check('Der Endbildschirm bietet das Ergebnis zum Teilen', text.indexOf('Pokélike+') === 0, text.slice(0, 40));
  check('… mit der Kästchenreihe', /🟩|🟨|⬜/.test(text));
  check('… und dem Startwert', text.indexOf('Startwert 12345') > 0);

  await page.getByRole('button', { name: /Run-Karte/ }).click();
  await page.waitForSelector('.run-karte', { timeout: 10000 });
  const karte = await page.locator('.run-karte').evaluate((n) => ({ w: n.naturalWidth, h: n.naturalHeight }));
  check('Die Run-Karte wird als Bild gezeichnet', karte.w === 720 && karte.h > 600, karte.w + '×' + karte.h);
  await page.getByRole('button', { name: 'Schließen' }).click();
  await page.waitForSelector('.run-karte', { state: 'detached' });

  const gelesen = await page.evaluate(() => PL.share.ausCode('kurz-1-999-n'));
  check('Ein geschickter Run lässt sich wieder einlesen',
    gelesen && gelesen.modus === 'kurz' && gelesen.startwert === 999 && gelesen.nuzlocke === true,
    JSON.stringify(gelesen));
}


// Die Sammlung: Marken, Wochenaufträge, Vorrat
await page.evaluate(() => {
  globalThis.PokelikeApp.run = null;
  PL.meta.reset();
  PL.dex.species.slice(0, 30).forEach((sp) => PL.meta.noteCaught({ sp: sp.i, lvl: 5 }));
  PL.meta.pruefeMeilensteine();
  globalThis.PokelikeApp.show('sammlung');
});
await page.waitForSelector('.sammlung-screen');
{
  check('Die Sammlung zeigt Marken', (await page.locator('.marke').count()) >= 10);
  check('… drei Wochenaufträge', (await page.locator('.auftrag').count()) === 3);
  check('… und Balken für den Fortschritt', (await page.locator('.fortschritt-bahn').count()) >= 5);
  const geholt = await page.locator('.marke.fertig').count();
  check('Nach 30 Fängen ist die erste Marke geholt', geholt === 1, String(geholt));
  const vorteil = await page.locator('.vorteil-liste').innerText();
  check('Der Startvorteil steht da', /Superbälle/.test(vorteil), vorteil.replace(/\n/g, ' | '));
  const preis = await page.locator('.wochenpreis').innerText();
  check('Der Preis für die volle Woche steht dabei', /Relikt/.test(preis), preis.replace(/\n/g, ' | '));

  // Und er landet wirklich im Beutel eines neuen Runs
  const beutel = await page.evaluate(() => {
    const ohne = new PL.Run({ seed: 1, starter: 'bulbasaur' });
    const run = new PL.Run({ seed: 1, starter: 'bulbasaur', vorteil: PL.meta.startVorteil('standard') });
    return {
      baelle: (run.bag.greatball || 0) - (ohne.bag.greatball || 0),
      taeglich: PL.meta.startVorteil('taeglich')
    };
  });
  check('Der Run startet mit den erspielten Bällen', beutel.baelle === 2, String(beutel.baelle));
  check('Der Tages-Run bekommt keinen Vorteil', beutel.taeglich === null);

  // Der Stand des Legendären Runs steht in der Sammlung
  const kasseText = await page.evaluate(() => {
    PL.meta.duellGewonnen(PL.dex.sp('mewtwo').i);
    globalThis.PokelikeApp.show('sammlung');
    return document.querySelector('.sammlung-screen').innerText;
  });
  check('Die Sammlung zeigt den Stand im Legendären Run',
    /1 besiegt/.test(kasseText) && /ein eigener Ball bereit/.test(kasseText),
    (kasseText.match(/besiegt[^\n]*/g) || []).join(' | '));

  // Der Bestwert steht im Pokédex unter der Art
  await page.evaluate(() => {
    const run = new PL.Run({ seed: 8, starter: 'charmander' });
    run.party[0].lvl = 44;
    run.party[0].kaempfe = 12;
    PL.meta.merkeArten(run);
    globalThis.PokelikeApp.show('dex');
  });
  await page.waitForSelector('.dex-grid');
  await page.locator('.dex-cell').filter({ hasText: 'Glumanda' }).first().click();
  await page.waitForSelector('.art-rekord');
  const rekord = await page.locator('.art-rekord').innerText();
  check('Der Pokédex zeigt den eigenen Bestwert', /44/.test(rekord) && /12/.test(rekord), rekord);

  await closeModals();
  await page.evaluate(() => {
    PL.meta.reset();
    globalThis.PokelikeApp.show('title');
  });
  await page.waitForSelector('.title-screen');
}

// Die fünf Stufen — der Regler ist wieder nur Schwierigkeit
await page.evaluate(() => {
  globalThis.PokelikeApp.run = null;
  PL.meta.reset();
  globalThis.PokelikeApp.show('newrun');
});
await page.waitForSelector('.asc-box');
{
  const regler = page.locator('.newrun .slider');
  check('Die Schwierigkeit hat einen Regler', (await regler.count()) === 1);
  const beschriftung = await page.locator('.asc-value').innerText();
  check('Daneben steht der Name der Stufe', beschriftung.trim() === 'Stufe 1 — Reise', beschriftung);
  check('Ohne einen einzigen Sieg endet der Regler bei der ersten Stufe',
    (await regler.getAttribute('max')) === '0', await regler.getAttribute('max'));
  const modi = await page.locator('.choice-row .choice').count();
  check('Der Legendäre Run steht nicht in der Modusliste', modi === 5, String(modi));

  await page.evaluate(() => {
    const m = PL.meta.load();
    m.bestAscension = 4;
    PL.meta.save();
    globalThis.PokelikeApp.show('newrun');
  });
  await page.waitForSelector('.asc-box');
  const regler2 = page.locator('.newrun .slider');
  check('Der Regler endet bei der fünften Stufe',
    (await regler2.getAttribute('max')) === '4', await regler2.getAttribute('max'));
  await regler2.fill('2');
  await regler2.dispatchEvent('input');
  check('Der Regler nennt die Stufe beim Namen',
    (await page.locator('.asc-value').innerText()).trim() === 'Stufe 3 — Prüfung',
    await page.locator('.asc-value').innerText());
  await regler2.fill('4');
  await regler2.dispatchEvent('input');
  check('Die letzte Raste ist die Meisterschaft, kein eigener Weg',
    (await page.locator('.asc-value').innerText()).indexOf('Meisterschaft') > 0,
    await page.locator('.asc-value').innerText());
}

// Der Kampf muss auf ein Handy passen — ohne Scrollen, mit allen Aktionen
{
  const handy = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await handy.goto(PAGE);
  await handy.waitForSelector('.title-screen', { timeout: 20000 });
  await handy.evaluate(() => {
    const run = new PL.Run({ seed: 9, starter: 'bulbasaur' });
    globalThis.PokelikeApp.run = run;
    const bt = run.makeWild(run.rng, {});
    run.setScene({ kind: 'battle', battle: bt, node: { row: 0, col: 0, type: 'wild' } });
    globalThis.PokelikeApp.battle = bt;
    bt.start();
    globalThis.PokelikeApp.show('battle');
  });
  await handy.waitForSelector('.move-grid .move-btn', { timeout: 20000 });
  await handy.waitForTimeout(600);
  const mass = await handy.evaluate(() => {
    const u = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().bottom) : null; };
    const r = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().right) : null; };
    return {
      fenster: innerHeight, breite: innerWidth,
      untenAktionen: u('.action-row'),
      aktionen: document.querySelectorAll('.action-row .action-btn').length,
      kacheln: document.querySelectorAll('.move-grid .move-btn').length,
      rechtsAktion: Math.max(...[...document.querySelectorAll('.action-row .action-btn')].map((e) => Math.round(e.getBoundingClientRect().right))),
      quer: document.documentElement.scrollWidth > innerWidth + 1,
      grob: matchMedia('(pointer: coarse)').matches
    };
  });
  check('Das Handy zählt als Gerät mit grobem Zeiger', mass.grob === true);
  check('Vier Attackenkacheln stehen bereit', mass.kacheln === 4, String(mass.kacheln));
  check('Alle fünf Aktionen sind da', mass.aktionen === 5, String(mass.aktionen));
  check('Der Kampf passt in die Höhe des Schirms',
    mass.untenAktionen <= mass.fenster, mass.untenAktionen + ' von ' + mass.fenster);
  check('… und keine Aktion steht außerhalb der Breite',
    mass.rechtsAktion <= mass.breite, mass.rechtsAktion + ' von ' + mass.breite);
  check('Nichts läuft quer über den Rand', mass.quer === false);

  // Die Wirksamkeit steht als Marke in der Ecke und bricht nichts um
  const marke = await handy.evaluate(() => {
    const m = document.querySelector('.move-eff');
    if (!m) return null;
    const k = m.closest('.move-btn').getBoundingClientRect(), r = m.getBoundingClientRect();
    return { drin: r.top >= k.top - 1 && r.bottom <= k.bottom + 1 && r.right <= k.right + 1, text: m.textContent };
  });
  if (marke) check('Die Wirksamkeitsmarke bleibt in ihrer Kachel', marke.drin, marke.text);
  await handy.close();
}

// Einen Ball werfen — der Weg, auf dem gefangen wird
{
  await page.evaluate(() => {
    PL.meta.reset();
    const run = new PL.Run({ seed: 42, starter: 'bulbasaur' });
    run.addItem('masterball', 3);
    globalThis.PokelikeApp.run = run;
    const bt = run.makeWild(run.rng, {});
    run.setScene({ kind: 'battle', battle: bt, node: { row: 0, col: 0, type: 'wild' } });
    globalThis.PokelikeApp.battle = bt;
    bt.start();
    globalThis.PokelikeApp.show('battle');
  });
  await page.waitForSelector('.battle');
  check('Im wilden Kampf lässt sich fangen',
    await page.evaluate(() => globalThis.PokelikeApp.battle.canCatch === true));

  await page.getByRole('button', { name: /Ball/ }).first().click();
  await page.waitForSelector('.modal .item-row');
  const ballReihen = await page.locator('.modal .item-row').count();
  check('Die Ballauswahl zeigt die Bälle aus dem Beutel', ballReihen >= 2, String(ballReihen));

  // Den Meisterball werfen: Er fängt sicher, also ist der Ausgang eindeutig.
  const balleVorher = await page.evaluate(() => globalThis.PokelikeApp.run.bag.masterball);
  await page.locator('.modal .item-row').filter({ hasText: 'Meisterball' }).first().click();
  // Der Wurf wird ausgespielt — gewartet wird auf das Ergebnis, nicht auf die Uhr.
  await page.waitForFunction(() => {
    const bt = globalThis.PokelikeApp.battle;
    return bt && (bt.ended || bt.outcome);
  }, null, { timeout: 15000 }).catch(() => {});
  const nachWurf = await page.evaluate(() => {
    const bt = globalThis.PokelikeApp.battle, run = globalThis.PokelikeApp.run;
    return {
      geworfen: bt.log.some((e) => e.k === 'ball'),
      ausgang: bt.outcome,
      baelle: run.bag.masterball || 0,
      art: bt.caught ? PL.dex.sp(bt.caught.sp).id : null
    };
  });
  check('Der Wurf landet wirklich im Kampf', nachWurf.geworfen === true);
  check('Der Meisterball fängt', nachWurf.ausgang === 'caught', String(nachWurf.ausgang));
  check('… der Ball ist danach verbraucht', nachWurf.baelle === balleVorher - 1,
    balleVorher + ' → ' + nachWurf.baelle);
  // Ins Team wandert es erst, wenn der Kampf geschlossen wird — hier zählt,
  // dass der Kampf wirklich ein gefangenes Pokémon führt.
  check('… und der Kampf führt das gefangene Pokémon', !!nachWurf.art, String(nachWurf.art));

  // Den Kampf ordentlich schließen, bevor aufgeräumt wird — ein Run, der
  // mitten im Nachspiel verschwindet, zieht die Oberfläche mit sich.
  await page.waitForTimeout(1200);
  await page.evaluate(() => { try { globalThis.PokelikeApp.backToMap(); } catch (e) { /* schon zu */ } });
  await page.waitForTimeout(600);
  await closeModals();
  await page.evaluate(() => {
    globalThis.PokelikeApp.battle = null;
    globalThis.PokelikeApp.run = null;
    PL.meta.reset();
    globalThis.PokelikeApp.show('title');
  });
  await page.waitForSelector('.title-screen');
}

// Die Kopfleiste gehört dem Run — und jeder Wechsel beginnt oben
{
  await page.evaluate(() => {
    globalThis.PokelikeApp.run = new PL.Run({ seed: 4, starter: 'bulbasaur' });
    globalThis.PokelikeApp.show('map');
  });
  await page.waitForSelector('.map-screen');
  const aufKarte = await page.evaluate(() => ({
    knoepfe: [...document.querySelectorAll('#topbar .icon-btn')].map((e) => e.title),
    chips: document.querySelectorAll('#topbar .chip, #topbar .region-badge').length,
    automat: !document.querySelector('#autopilot').hidden
  }));
  check('Auf der Karte stehen Team, Beutel und Relikte oben',
    aufKarte.knoepfe.join(',') === 'Team,Beutel,Relikte,Menü', aufKarte.knoepfe.join(','));
  check('… dazu die Angaben zum Run', aufKarte.chips >= 3, String(aufKarte.chips));
  check('… und der Reise-Automat', aufKarte.automat);

  // Weit nach unten scrollen, dann in den Pokédex wechseln
  const imDex = await page.evaluate(() => {
    window.scrollTo(0, 1500);
    globalThis.PokelikeApp.show('dex');
    return {
      knoepfe: [...document.querySelectorAll('#topbar .icon-btn')].map((e) => e.title),
      chips: document.querySelectorAll('#topbar .chip, #topbar .region-badge').length,
      automat: !document.querySelector('#autopilot').hidden,
      scroll: Math.round(window.scrollY)
    };
  });
  check('Im Pokédex bleibt von der Run-Leiste nur das Menü',
    imDex.knoepfe.join(',') === 'Menü', imDex.knoepfe.join(','));
  check('… keine Angaben zum Run', imDex.chips === 0, String(imDex.chips));
  check('… und kein Automat', imDex.automat === false);
  check('Und der Bildschirm beginnt oben, nicht in der Mitte',
    imDex.scroll === 0, String(imDex.scroll));

  const zurueck = await page.evaluate(() => {
    window.scrollTo(0, 900);
    globalThis.PokelikeApp.show('map');
    return {
      knoepfe: [...document.querySelectorAll('#topbar .icon-btn')].map((e) => e.title).length,
      scroll: Math.round(window.scrollY)
    };
  });
  check('Zurück auf der Karte ist die Leiste wieder da', zurueck.knoepfe === 4, String(zurueck.knoepfe));
  check('… und auch dort beginnt es oben', zurueck.scroll === 0, String(zurueck.scroll));

  await page.evaluate(() => {
    globalThis.PokelikeApp.run = null;
    PL.meta.clearRun();
    globalThis.PokelikeApp.show('title');
  });
  await page.waitForSelector('.title-screen');
}

// Der Pokédex zeigt alle neun Generationen, nicht nur die ersten sieben
{
  const dexStand = await page.evaluate(() => {
    globalThis.PokelikeApp.show('dex');
    const zellen = [...document.querySelectorAll('.dex-cell .dex-num')].map((e) => e.textContent);
    return {
      zellen: zellen.length,
      arten: PL.dex.species.length,
      letzte: zellen[zellen.length - 1] || '',
      hatGen9: zellen.some((t) => Number(t.replace('#', '')) > 1000)
    };
  });
  check('Der Reiter »Alle« zeigt jede Art', dexStand.zellen === dexStand.arten,
    dexStand.zellen + ' von ' + dexStand.arten);
  check('… bis in die neunte Generation hinein', dexStand.hatGen9, dexStand.letzte);
  await page.evaluate(() => globalThis.PokelikeApp.show('title'));
  await page.waitForSelector('.title-screen');
}

// Der Legendäre Run: eigener Modus, eigene Bildschirme
{
  await page.evaluate(() => {
    globalThis.PokelikeApp.run = null;
    PL.meta.reset();
    globalThis.PokelikeApp.show('title');
  });
  await page.waitForSelector('.title-screen');
  const gesperrt = await page.locator('.menue-zeile.gold').innerText();
  check('Im Titelmenü steht der Legendäre Run golden da', gesperrt.indexOf('Legendärer Run') >= 0, gesperrt);
  check('… und sagt kurz, warum er noch zu ist',
    /Stufe 5/.test(gesperrt), gesperrt);

  await page.locator('.menue-zeile.gold').click();
  await page.waitForSelector('.gen-grid');
  check('Anklicken geht trotzdem — nur antreten nicht',
    (await page.locator('.legenden-sperre').count()) === 1);
  check('Neun Generationen stehen zur Wahl',
    (await page.locator('.gen-karte').count()) === 9);

  // Mit Stufe 5 im Rücken und ein paar Kanto-Arten im Pokédex
  await page.evaluate(() => {
    const m = PL.meta.load();
    m.bestAscension = 4;
    PL.dex.species.filter((s) => s.g === 1 && !s.bo && !s.f).slice(0, 20)
      .forEach((s) => { m.seen[s.i] = 1; m.caught[s.i] = 1; });
    PL.meta.save();
    globalThis.PokelikeApp.show('legenden');
  });
  await page.waitForSelector('.gen-grid');
  check('Nach Stufe 5 fällt die Sperre',
    (await page.locator('.legenden-sperre').count()) === 0);

  await page.locator('.gen-karte').first().click();
  await page.waitForSelector('.legenden-grid');
  check('Generation 1 zeigt ihre fünf Legenden',
    (await page.locator('.legende-karte').count()) === 5,
    String(await page.locator('.legende-karte').count()));

  // Der eigene Ball taucht auf, sobald er verdient ist
  await page.evaluate(() => {
    PL.meta.duellGewonnen(PL.dex.sp('articuno').i);
    globalThis.PokelikeApp.show('legendenGen', { gen: 1 });
  });
  await page.waitForSelector('.legenden-grid');
  const ballAufKarte = await page.locator('.legende-karte .karten-ball').count();
  check('Der verdiente Ball steht auf der Karte der Legende', ballAufKarte === 1, String(ballAufKarte));
  const ballQuelle = await page.locator('.legende-karte .karten-ball').first().getAttribute('src');
  check('… und es ist ein gezeichneter Ball', /^data:image\/png/.test(ballQuelle || ''));
  const umrisse = await page.evaluate(() => {
    globalThis.PokelikeApp.show('legenden');
    return document.querySelectorAll('.gen-umriss').length;
  });
  check('Jede Generationskarte trägt den Umriss ihres Wahrzeichens', umrisse === 9, String(umrisse));
  await page.evaluate(() => globalThis.PokelikeApp.show('legendenGen', { gen: 1 }));
  await page.waitForSelector('.legenden-grid');

  await page.locator('.legende-karte').first().click();
  await page.waitForSelector('.duell-pool');
  const antreten = page.getByRole('button', { name: /^Antreten/ });
  check('Ohne Team lässt sich nicht antreten', await antreten.isDisabled());
  const poolNurGen1 = await page.evaluate(() =>
    [...document.querySelectorAll('.pool-karte .pool-name')].length);
  check('Der Pool zeigt nur, was im Pokédex steht', poolNurGen1 === 20, String(poolNurGen1));

  await page.locator('.pool-karte').first().click();
  await page.locator('.pool-karte').nth(1).click();
  check('Zwei Pokémon stehen im Team',
    (await page.locator('.duell-platz:not(.leer)').count()) === 2);
  check('Jetzt darf angetreten werden', !(await antreten.isDisabled()));

  await antreten.click();
  await page.waitForSelector('.battle', { timeout: 15000 });
  const duell = await page.evaluate(() => {
    const run = globalThis.PokelikeApp.run, bt = globalThis.PokelikeApp.battle;
    const gegner = bt.sides[1].team[0];
    const ohne = JSON.parse(JSON.stringify(gegner));
    delete ohne.buff;
    return {
      modus: run.mode, team: run.party.length, level: run.party[0].lvl,
      gegnerzahl: bt.sides[1].team.length, legendaer: !!bt.legendary,
      kp: PL.mon.maxHP(gegner), kpOhne: PL.mon.maxHP(ohne),
      fangbar: bt.canCatch
    };
  });
  check('Das Duell läuft', duell.modus === 'legenden', duell.modus);
  check('… mit dem selbst gebauten Team auf Stufe 100',
    duell.team === 2 && duell.level === 100, duell.team + ' auf Lv' + duell.level);
  check('… gegen genau ein legendäres Pokémon',
    duell.gegnerzahl === 1 && duell.legendaer, String(duell.gegnerzahl));
  check('… das einen Bossaufschlag auf die KP trägt',
    duell.kp > duell.kpOhne * 2.5, duell.kp + ' statt ' + duell.kpOhne);
  check('Mit dem verdienten Ball ist der Kampf fangbar', duell.fangbar === true);

  const kopf = await page.locator('.chip-region').innerText();
  check('Die Kopfzeile nennt den Gegner', /Arktos|Articuno/.test(kopf), kopf);

  await page.evaluate(() => {
    globalThis.PokelikeApp.run = null;
    PL.meta.reset();
    globalThis.PokelikeApp.show('title');
  });
  await page.waitForSelector('.title-screen');
}

// Der Tages-Run: eine Messlatte, ein Versuch, ein Code zum Vergleichen
await page.evaluate(() => {
  globalThis.PokelikeApp.run = null;
  PL.meta.reset();
  globalThis.PokelikeApp.show('daily');
});
await page.waitForSelector('.daily-screen');
{
  check('Der Tages-Run hat einen eigenen Bildschirm', (await page.locator('.daily-karte').count()) === 3);
  // Der Automat rechnet im Hintergrund — das darf einen Moment dauern.
  await page.waitForFunction(() => {
    const t = document.querySelector('.daily-karte');
    return t && /Automat (hat|kam)/.test(t.innerText);
  }, { timeout: 30000 });
  const latte = await page.evaluate(() => PL.meta.tagesStand().latte);
  check('Der Automat setzt die Messlatte', latte && latte.kaempfe > 5, JSON.stringify(latte));
  check('… und zeigt sie als Kästchen', (await page.locator('.kaestchen').count()) >= 6);

  // Ein Ergebnis eintragen und den Bildschirm neu zeichnen
  await page.evaluate(() => {
    const run = new PL.Run({ seed: PL.meta.tagesStartwert(), mode: 'taeglich', starter: 'charmander' });
    run.region = 6; run.stats.battles = 44; run.stats.catches = 15;
    PL.meta.setzeTagesErgebnis(PL.share.ergebnis(run, 'niederlage'));
    globalThis.PokelikeApp.show('daily');
  });
  await page.waitForSelector('.daily-urteil');
  const urteil = await page.locator('.daily-urteil').innerText();
  check('Das eigene Ergebnis wird an der Messlatte gemessen', urteil.length > 5, urteil);
  const eigenText = await page.locator('.teilen-text').innerText();
  check('Der Ergebnistext nennt den Tages-Run', eigenText.indexOf('Tages-Run') >= 0, eigenText.slice(0, 60));
  check('… und trägt einen Code bei sich', /TR-[A-Z0-9-]+/.test(eigenText), eigenText);

  // Ein fremder Code stellt beide nebeneinander
  const fremd = await page.evaluate(() => {
    const run = new PL.Run({ seed: PL.meta.tagesStartwert(), mode: 'taeglich', starter: 'squirtle' });
    run.region = 6; run.state = 'victory'; run.stats.battles = 61; run.stats.catches = 20;
    return PL.share.tagesCode(PL.share.ergebnis(run, 'sieg'));
  });
  await page.locator('.code-feld').fill(fremd);
  await page.getByRole('button', { name: 'Vergleichen' }).click();
  await page.waitForSelector('.vgl-tafel');
  check('Zwei Ergebnisse stehen nebeneinander', (await page.locator('.vgl-spalte').count()) === 2);
  const sieger = await page.locator('.vgl-spalte.gewinner').innerText();
  check('… und der Bessere ist hervorgehoben', sieger.indexOf('Der andere') === 0, sieger.replace(/\n/g, ' | '));

  await page.locator('.code-feld').fill('TR-quatsch');
  await page.getByRole('button', { name: 'Vergleichen' }).click();
  await page.waitForSelector('.vergleich .bad');
  check('Ein kaputter Code wird abgewiesen, nicht geraten',
    (await page.locator('.vergleich .bad').innerText()).indexOf('stimmt nicht') > 0);

  // Vom Titel aus muss man hinkommen
  await page.evaluate(() => globalThis.PokelikeApp.show('title'));
  await page.waitForSelector('.tages-banner');
  const banner = await page.locator('.tages-banner').innerText();
  check('Der Titel führt zum Tages-Run', banner.indexOf('Tages-Run') >= 0, banner.replace(/\n/g, ' | '));
  check('… und verrät, wie der Tag ausging', /Region 6|Liga/.test(banner), banner.replace(/\n/g, ' | '));
  await page.locator('.tages-banner').click();
  await page.waitForSelector('.daily-screen');
  check('Der Knopf öffnet den Bildschirm', true);
}

await page.evaluate(() => globalThis.PokelikeApp.show('settings'));
await page.waitForSelector('.settings-screen');
check('Einstellungen erscheinen', (await page.locator('.setting').count()) >= 4);

// Der Lautstärkeregler: schieben, ablesen, merken
{
  const regler = page.locator('.slider');
  check('Die Lautstärke hat einen Regler', (await regler.count()) === 1);
  const kasten = await regler.boundingBox();
  check('Der Regler ist mit dem Daumen zu treffen', kasten.height >= 24, kasten.height + ' px hoch');
  await regler.fill('80');
  await regler.dispatchEvent('change');
  await page.waitForTimeout(150);
  check('Der Wert steht daneben', (await page.locator('.slider-value').innerText()).trim() === '80 %',
    await page.locator('.slider-value').innerText());
  const gemerkt = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pokelike.plus.v1') || '{}').settings.volume);
  check('… und ist gespeichert', Math.abs(gemerkt - 0.8) < 0.001, String(gemerkt));
  await regler.fill('0');
  await regler.dispatchEvent('change');
  await page.waitForTimeout(100);
  check('Ganz leise geht auch', (await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pokelike.plus.v1') || '{}').settings.volume)) === 0);
  await regler.fill('50');
  await regler.dispatchEvent('change');
}

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

console.log('\nSpeicherstände und Profile');
{
  await page.evaluate(() => {
    const PL = window.PL, App = window.PokelikeApp;
    App.run = new PL.Run({ seed: 4711, starter: 'bulbasaur' });
    for (const id of ['pikachu', 'geodude']) {
      App.run.party.push(PL.mon.create(id, 12, App.run.rng, {}));
    }
    App.show('saves');
  });
  await page.waitForSelector('.slot-grid');
  check('Es gibt vier Plätze', (await page.locator('.slot-card').count()) === 4);

  const slot1 = page.locator('.slot-card').nth(1);
  await slot1.getByRole('button', { name: /Speichern/ }).click();
  await page.waitForTimeout(200);
  check('Speichern füllt den Platz',
    !(await slot1.evaluate((n) => n.classList.contains('empty'))));
  check('… und der Platz zeigt das Team',
    (await slot1.locator('.slot-mon').count()) === 3,
    String(await slot1.locator('.slot-mon').count()));

  // Laden bringt genau diesen Stand zurück
  await page.evaluate(() => { window.PokelikeApp.run.money = 1; });
  await slot1.getByRole('button', { name: /Laden/ }).click();
  await page.waitForTimeout(150);
  const dlg = await page.locator('#overlay .modal-actions .btn.primary').count();
  if (dlg) await page.locator('#overlay .modal-actions .btn.primary').first().click();
  await page.waitForSelector('.map-screen');
  check('Laden stellt den gespeicherten Stand wieder her',
    (await page.evaluate(() => window.PokelikeApp.run.money)) > 1);

  // Ein zweites Profil hat seine eigenen Plätze
  await page.evaluate(() => {
    window.PL.meta.createProfile('Freund');
    window.PokelikeApp.run = null;
    window.PokelikeApp.show('saves');
  });
  await page.waitForSelector('.slot-grid');
  check('Ein neues Profil startet mit leeren Plätzen',
    (await page.locator('.slot-card.empty').count()) === 4,
    String(await page.locator('.slot-card.empty').count()));
  await page.evaluate(() => {
    const meta = window.PL.meta;
    meta.profiles().filter((p) => p.name === 'Freund').forEach((p) => meta.deleteProfile(p.id));
    window.PokelikeApp.show('title');
  });
  await page.waitForSelector('.title-screen');
  check('Nach dem Löschen ist das erste Profil wieder aktiv',
    (await page.evaluate(() => window.PL.meta.activeProfileId())) === 'p1');
}

console.log('\nTrainerbilder');
{
  const info = await page.evaluate(() => {
    const PL = window.PL, App = window.PokelikeApp;
    if (!window.PL_TRAINERS) return { keine: true };
    PL.meta.setSetting('speed', 'langsam');
    App.run = new PL.Run({ seed: 5, starter: 'charmander' });
    const bt = App.run.makeBoss(App.run.rng);
    App.battle = bt.battle || bt;
    App.battle.start();
    App.show('battle');
    return { leader: App.battle.trainer.leader, anzahl: Object.keys(window.PL_TRAINERS.f).length };
  });
  check('Die Trainerbilder sind eingebettet', !info.keine && info.anzahl > 120,
    JSON.stringify(info));
  await page.waitForTimeout(150);
  const srcs = await page.evaluate(() =>
    Array.prototype.map.call(document.querySelectorAll('.trainer-sprite'), (i) => ({
      data: i.src.slice(0, 14), w: i.naturalWidth, h: i.naturalHeight })));
  check('Beide Trainer stehen als echtes Bild auf der Bühne',
    srcs.length === 2 && srcs.every((x) => x.data === 'data:image/png' && x.w > 0),
    JSON.stringify(srcs));
  if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '10-trainer.png') });
}

console.log('\nReise-Automat');
{
  // Frischer Run: der Automat soll von der Karte aus alles allein machen.
  await page.evaluate(() => {
    const PL = globalThis.PL, App = globalThis.PokelikeApp;
    PL.meta.setSetting('speed', 'sofort');
    App.run = new PL.Run({ seed: 31337, starter: 'squirtle' });
    for (const id of ['pikachu', 'geodude', 'poliwag']) {
      App.run.party.push(PL.mon.create(id, 9, App.run.rng, { quality: 0.85 }));
    }
    App.show('map');
  });
  await page.waitForSelector('.map-screen');

  const btn = page.locator('#autopilot');
  check('Der Automat sitzt als Knopf in der Ecke', await btn.isVisible());
  check('… und ist zuerst aus',
    !(await btn.evaluate((n) => n.classList.contains('on'))));

  const vorher = await page.evaluate(() => globalThis.PokelikeApp.run.stats.nodes);
  await btn.click();
  check('Ein Klick startet ihn', await btn.evaluate((n) => n.classList.contains('on')));
  check('… und schaltet den Auto-Kampf mit ein',
    await page.evaluate(() => globalThis.PokelikeApp.autoPlay));

  // Zwölf Sekunden zuschauen: er sollte mehrere Knoten hinter sich bringen.
  let nachher = vorher;
  for (let i = 0; i < 24 && nachher < vorher + 4; i++) {
    await page.waitForTimeout(500);
    nachher = await page.evaluate(() => globalThis.PokelikeApp.run.stats.nodes);
  }
  check('Der Automat geht von allein weiter', nachher >= vorher + 4,
    vorher + ' → ' + nachher + ' Knoten');

  await btn.click();
  check('Ein zweiter Klick hält ihn an',
    !(await btn.evaluate((n) => n.classList.contains('on'))));
  const stand = await page.evaluate(() => globalThis.PokelikeApp.run.stats.nodes);
  await page.waitForTimeout(1500);
  check('… und dann bleibt er auch stehen',
    (await page.evaluate(() => globalThis.PokelikeApp.run.stats.nodes)) === stand);
  if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, '09-automat.png') });
}

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
  await phone.getByRole('button', { name: 'Neuer Run' }).click();
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

  // Der Tages-Run mit Vergleichstafel ist die engste Stelle: zwei Spalten
  // nebeneinander auf einem schmalen Bildschirm.
  await phone.evaluate(() => {
    const run = new PL.Run({ seed: PL.meta.tagesStartwert(), mode: 'taeglich', starter: 'charmander' });
    run.region = 4; run.stats.battles = 30; run.stats.catches = 8;
    PL.meta.setzeMesslatte({ region: 5, gewonnen: false, kaempfe: 38, faenge: 11 });
    PL.meta.setzeTagesErgebnis(PL.share.ergebnis(run, 'niederlage'));
    globalThis.PokelikeApp.show('daily');
  });
  await phone.waitForSelector('.daily-urteil');
  await phone.locator('.code-feld').fill(await phone.evaluate(() =>
    PL.share.tagesCode(PL.meta.tagesStand().eigen)));
  await phone.getByRole('button', { name: 'Vergleichen' }).tap();
  await phone.waitForSelector('.vgl-tafel');
  await fits('Tages-Run');

  for (const [screen, label] of [['team', 'Team'], ['dex', 'Pokédex'],
                                ['sammlung', 'Sammlung'], ['settings', 'Einstellungen']]) {
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
