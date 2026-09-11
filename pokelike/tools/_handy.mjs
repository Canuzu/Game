/* Handy-Prüfung: echte Fenstergröße, grober Zeiger über das Protokoll
   emuliert (Playwright kann »pointer: coarse« nicht selbst), keine
   fullPage-Aufnahmen dort, wo dvh-Einheiten zählen. */
import { chromium } from 'playwright';
import { startOptionen } from './browser.mjs';
import { join } from 'node:path';
const AUS = process.env.SHOT_DIR;
const BREIT = Number(process.env.BREITE || 390);
const HOCH = Number(process.env.HOEHE || 844);
const b = await chromium.launch(startOptionen());
// hasTouch schaltet »pointer: coarse« — das Protokoll-Verfahren tut es nicht.
const p = await b.newPage({ viewport: { width: BREIT, height: HOCH }, deviceScaleFactor: 2, hasTouch: true });
const fehler = [];
p.on('pageerror', (e) => fehler.push('PAGEERROR: ' + e.message));
await p.goto('file://' + join(process.cwd(), 'index.html'));
await p.waitForSelector('.title-screen', { timeout: 15000 });
await p.evaluate(() => {
  const m = PL.meta.load();
  m.bestAscension = 4; m.runs = 12; m.wins = 3;
  PL.dex.species.filter((s) => s.g === 1 && !s.bo && !s.f).slice(0, 30).forEach((s) => { m.seen[s.i] = 1; m.caught[s.i] = 1; });
  ['articuno', 'zapdos'].forEach((id) => PL.meta.duellGewonnen(PL.dex.sp(id).i));
  PL.meta.save();
  const run = new PL.Run({ seed: 9, starter: 'bulbasaur', ascension: 2 });
  run.gainPokemon(run.rng, 'pikachu', 14, 'Test', {});
  run.gainPokemon(run.rng, 'geodude', 13, 'Test', {});
  run.addItem('masterball', 2);
  PokelikeApp.run = run;
});

async function pruefe(name, aufbau, ganz) {
  await p.evaluate(aufbau);
  await p.waitForTimeout(600);
  const mangel = await p.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const raus = [], kurz = [], ueber = [];
    document.querySelectorAll('#screen *, #topbar *').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const s = getComputedStyle(e);
      // Was in einem schiebbaren Kasten liegt, darf hinausragen.
      let schiebbar = false;
      for (let n = e.parentElement; n; n = n.parentElement) {
        const os = getComputedStyle(n);
        if (os.overflowX === 'auto' || os.overflowX === 'scroll') { schiebbar = true; break; }
      }
      if (!schiebbar && (r.right > w + 1 || r.left < -1)) {
        raus.push(e.className + ' [' + Math.round(r.left) + '…' + Math.round(r.right) + '] ' + (e.textContent || '').trim().slice(0, 20));
      }
      if (!e.children.length && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis') {
        kurz.push(e.className + ' ' + (e.textContent || '').trim().slice(0, 18));
      }
      if (s.position !== 'absolute' && s.position !== 'fixed' && e.scrollHeight > e.clientHeight + 2 && s.overflowY === 'visible') {
        const kind = [...e.children].find((c) => c.getBoundingClientRect().bottom > r.bottom + 2);
        if (kind) ueber.push(e.className + ' ⟂ ' + kind.className);
      }
    });
    return {
      breite: document.documentElement.scrollWidth, fenster: w,
      raus: [...new Set(raus)].slice(0, 5),
      kurz: [...new Set(kurz)].slice(0, 5),
      ueber: [...new Set(ueber)].slice(0, 4)
    };
  });
  const quer = mangel.breite > mangel.fenster + 1;
  const zeilen = [name.padEnd(16), quer ? 'QUER!' : 'ok   '];
  if (mangel.raus.length) zeilen.push('raus: ' + mangel.raus.join(' · '));
  if (mangel.kurz.length) zeilen.push('kurz: ' + mangel.kurz.join(' · '));
  if (mangel.ueber.length) zeilen.push('über: ' + mangel.ueber.join(' · '));
  console.log(zeilen.join(' | '));
  await p.screenshot({ path: join(AUS, name + '.png'), fullPage: ganz !== false });
  // Eine fullPage-Aufnahme zieht das Fenster auf Inhaltshöhe und lässt es so
  // stehen — danach stimmen dvh-Einheiten nicht mehr. Also zurücksetzen.
  if (ganz !== false) { await p.setViewportSize({ width: BREIT + 1, height: HOCH }); await p.setViewportSize({ width: BREIT, height: HOCH }); }
}

await pruefe('01-titel', () => PokelikeApp.show('title'), false);
await pruefe('02-neurun', () => PokelikeApp.show('newrun'));
await pruefe('03-karte', () => PokelikeApp.show('map'));
await pruefe('04-team', () => PokelikeApp.show('team'));
await pruefe('05-dex', () => PokelikeApp.show('dex'), false);
await pruefe('06-sammlung', () => PokelikeApp.show('sammlung'), false);
await pruefe('07-statistik', () => PokelikeApp.show('stats'));
await pruefe('08-einstellungen', () => PokelikeApp.show('settings'));
await pruefe('10-legenden', () => PokelikeApp.show('legenden'));
await pruefe('11-legendengen', () => PokelikeApp.show('legendenGen', { gen: 1 }));
await pruefe('12-duellteam', () => PokelikeApp.show('legendenTeam', { gen: 1, art: 'articuno' }), false);
await pruefe('15-laden', () => {
  const run = PokelikeApp.run;
  const szene = run.makeShop(run.rng);
  run.setScene(szene);
  PokelikeApp.show('scene', { type: 'shop', scene: szene });
});
// Der Kampf bekommt eine eigene, frische Seite: Eine fullPage-Aufnahme
// vorher lässt das Fenster verzogen zurück, und dann stimmen dvh-Einheiten
// nicht mehr — die Bühne sähe doppelt so hoch aus, wie sie ist.
const p2 = await b.newPage({ viewport: { width: BREIT, height: HOCH }, deviceScaleFactor: 2, hasTouch: true });
await p2.goto('file://' + join(process.cwd(), 'index.html'));
await p2.waitForSelector('.title-screen', { timeout: 15000 });
await p2.evaluate(() => {
  const run = new PL.Run({ seed: 9, starter: 'bulbasaur', ascension: 2 });
  run.gainPokemon(run.rng, 'pikachu', 14, 'Test', {});
  run.addItem('masterball', 2);
  PokelikeApp.run = run;
  const bt = run.makeWild(run.rng, {});
  run.setScene({ kind: 'battle', battle: bt, node: { row: 0, col: 0, type: 'wild' } });
  PokelikeApp.battle = bt; bt.start(); PokelikeApp.show('battle');
});
await p2.waitForSelector('.move-grid .move-btn', { timeout: 15000 }).catch(() => {});
await p2.waitForTimeout(700);
const kampfMass = await p2.evaluate(() => {
  const u = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().bottom) : null; };
  const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null; };
  return { fenster: innerHeight, buehne: h('.battle-stage'), protokoll: h('.battle-log'),
    untenAktionen: u('.action-row'), passt: u('.action-row') <= innerHeight };
});
console.log('14-kampf         |', kampfMass.passt ? 'ok    | passt: ' : 'PASST NICHT | ',
  JSON.stringify(kampfMass));
await p2.screenshot({ path: join(AUS, '14-kampf.png') });
await p2.close();

const nie = () => {};
if (nie) { await p.evaluate(() => {
  const run = PokelikeApp.run;
  const bt = run.makeWild(run.rng, {});
  run.setScene({ kind: 'battle', battle: bt, node: { row: 0, col: 0, type: 'wild' } });
  PokelikeApp.battle = bt; bt.start(); PokelikeApp.show('battle');
});
  await p.waitForSelector('.move-grid .move-btn', { timeout: 15000 }).catch(() => {}); }
console.log(fehler.length ? 'FEHLER: ' + fehler.join(' | ') : 'keine Seitenfehler');
await b.close();
