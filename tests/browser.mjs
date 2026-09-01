/* =============================================================================
 * browser.mjs — Oberflächentests
 * -----------------------------------------------------------------------------
 * Startet index.html in einem echten Browser und bedient das Spiel so, wie ein
 * Mensch es täte: klicken, ziehen, tippen. Geprüft wird, was sich mit reinen
 * Node-Tests nicht abdecken lässt — Darstellung, Eingabe und Zusammenspiel.
 *
 *   npm run test:browser
 *
 * Braucht Playwright. Ist es nicht installiert, überspringt der Test sich
 * selbst, statt fehlzuschlagen — das Spiel selbst hat keine Abhängigkeiten,
 * und daran soll sich nichts ändern:
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *
 * Liegt bereits ein Chromium auf dem Rechner, lässt sich der Download sparen:
 *
 *   CHROMIUM_PFAD=/pfad/zu/chrome npm run test:browser
 * ========================================================================== */
import { pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEITE = pathToFileURL(resolve(root, 'index.html')).href;

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('Playwright ist nicht installiert — Oberflächentests übersprungen.');
  console.log('  npm install --no-save playwright && npx playwright install chromium');
  process.exit(0);
}

let fehler = 0;
const meldungen = [];
function pruefe(name, ok, zusatz = '') {
  if (!ok) fehler++;
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${zusatz ? ' — ' + zusatz : ''}`);
}

/* Ohne CHROMIUM_PFAD nimmt Playwright den Browser, den es selbst mitbringt. */
const browser = await chromium.launch(
  process.env.CHROMIUM_PFAD ? { executablePath: process.env.CHROMIUM_PFAD } : {}
);

/** Öffnet eine frische Seite und sammelt alle Fehlermeldungen der Konsole. */
async function neueSeite(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, ...opts });
  page.on('pageerror', (e) => meldungen.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') meldungen.push('console: ' + m.text()); });
  await page.goto(SEITE);
  await page.waitForTimeout(400);
  return page;
}

/** Bildschirmkoordinate der Mitte eines Feldes, z. B. 'e2'. */
const feldPunkt = (page, name) => page.evaluate((n) => {
  const C = window.Chess, st = window.SchachApp.state, sq = C.sqIndex(n);
  const b = document.getElementById('board').getBoundingClientRect();
  const f = sq & 7, r = sq >> 4, s = b.width / 8;
  const col = st.orientation === 'w' ? f : 7 - f;
  const row = st.orientation === 'w' ? 7 - r : r;
  return { x: b.x + col * s + s / 2, y: b.y + row * s + s / 2 };
}, name);

async function ziehe(page, von, nach) {
  let p = await feldPunkt(page, von); await page.mouse.click(p.x, p.y); await page.waitForTimeout(90);
  p = await feldPunkt(page, nach); await page.mouse.click(p.x, p.y); await page.waitForTimeout(260);
}

const lies = (page, fn) => page.evaluate(fn);

/** Spielt eine SAN-Folge über die öffentliche Zuglogik ab. */
const spiele = (page, sans) => page.evaluate(async (liste) => {
  const app = window.SchachApp;
  for (const san of liste) {
    const m = app.state.pos.sanToMove(san);
    if (!m) throw new Error('Zug nicht möglich: ' + san);
    app.playMove(m, { animate: false });
    await new Promise((r) => setTimeout(r, 25));
  }
}, sans);

/* ========================================================================
 * 1) Grundlegende Bedienung
 * ===================================================================== */
console.log('\nBedienung\n');
{
  const page = await neueSeite();
  await page.click('[data-set="mode:human"]'); await page.waitForTimeout(120);
  await page.click('#ng-start'); await page.waitForTimeout(400);

  await ziehe(page, 'e2', 'e4');
  pruefe('Zug per Klick', (await lies(page, () => window.SchachApp.state.moves.length)) === 1);

  /* Ziehen mit der Maus */
  const von = await feldPunkt(page, 'e7'), nach = await feldPunkt(page, 'e5');
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  await page.mouse.move((von.x + nach.x) / 2, (von.y + nach.y) / 2 - 30, { steps: 6 });
  await page.mouse.move(nach.x, nach.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  pruefe('Zug per Ziehen', (await lies(page, () => window.SchachApp.state.moves.map((m) => m.san).join(' '))) === 'e4 e5');

  await spiele(page, ['Nf3', 'Nc6']);
  await page.click('#nav-start'); await page.waitForTimeout(250);
  pruefe('Zum Anfang springen', (await lies(page, () => window.SchachApp.state.viewPly)) === 0);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  pruefe('Pfeiltaste blättert vorwärts', (await lies(page, () => window.SchachApp.state.viewPly)) === 1);
  await page.click('.mv[data-ply="3"]'); await page.waitForTimeout(250);
  pruefe('Zugliste ist anklickbar', (await lies(page, () => window.SchachApp.state.viewPly)) === 3);
  await page.click('#nav-end'); await page.waitForTimeout(200);

  await page.click('#act-undo'); await page.waitForTimeout(300);
  pruefe('Zurücknehmen', (await lies(page, () => window.SchachApp.state.moves.length)) === 3);

  const vorher = await lies(page, () => window.SchachApp.state.orientation);
  await page.keyboard.press('f'); await page.waitForTimeout(250);
  pruefe('Brett drehen', vorher !== (await lies(page, () => window.SchachApp.state.orientation)));
  await page.close();
}

/* ========================================================================
 * 2) Sonderzüge
 * ===================================================================== */
console.log('\nSonderzüge\n');
{
  const page = await neueSeite();
  await page.click('#ng-start'); await page.waitForTimeout(400);

  await page.evaluate(() => window.SchachApp.startGame({
    mode: 'human', time: 'none', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1' }));
  await page.waitForTimeout(300);
  await ziehe(page, 'e1', 'g1');
  pruefe('Kurze Rochade', (await lies(page, () => window.SchachApp.state.moves[0].san)) === 'O-O');
  await ziehe(page, 'e8', 'c8');
  pruefe('Lange Rochade', (await lies(page, () => window.SchachApp.state.moves[1].san)) === 'O-O-O');
  pruefe('Turm springt mit',
    (await lies(page, () => window.SchachApp.state.pos.board[window.Chess.sqIndex('d8')])) === 20);

  await page.evaluate(() => window.SchachApp.startGame({
    mode: 'human', time: 'none', fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3' }));
  await page.waitForTimeout(300);
  await ziehe(page, 'e5', 'f6');
  pruefe('En passant', (await lies(page, () => window.SchachApp.state.moves[0].san)) === 'exf6');
  pruefe('Geschlagener Bauer verschwindet',
    (await lies(page, () => window.SchachApp.state.pos.board[window.Chess.sqIndex('f5')])) === 0);

  await page.evaluate(() => window.SchachApp.startGame({
    mode: 'human', time: 'none', fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1' }));
  await page.waitForTimeout(300);
  await ziehe(page, 'b7', 'b8');
  pruefe('Umwandlungsauswahl erscheint', !(await lies(page, () => document.getElementById('promo-layer').hidden)));
  await page.click('[data-promo="2"]'); await page.waitForTimeout(350);
  pruefe('Umwandlung in einen Springer',
    (await lies(page, () => window.SchachApp.state.moves[0].san)) === 'b8=N');
  pruefe('Umwandlung erzeugt keine Geister-Schlagfigur',
    !(await page.innerHTML('#captured-bottom')).includes('pc-p'));
  await page.close();
}

/* ========================================================================
 * 3) Tastaturbedienung
 * ===================================================================== */
console.log('\nTastatur\n');
{
  const page = await neueSeite();
  await page.click('[data-set="mode:human"]'); await page.waitForTimeout(120);
  await page.click('#ng-start'); await page.waitForTimeout(400);

  await page.focus('#board'); await page.waitForTimeout(200);
  pruefe('Markierung startet beim eigenen König',
    (await lies(page, () => window.Chess.sqName(window.SchachApp.state.cursor))) === 'e1');
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(120);
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  pruefe('Auswahl per Eingabetaste', (await lies(page, () => window.SchachApp.state.targets.length)) === 2);
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(120);
  await page.keyboard.press('Enter'); await page.waitForTimeout(350);
  pruefe('Zug allein mit der Tastatur',
    (await lies(page, () => window.SchachApp.state.moves.map((m) => m.san).join(' '))) === 'e4');
  pruefe('Ansage für Vorlesewerkzeuge', (await page.textContent('#live')).includes('e4'));
  await page.close();
}

/* ========================================================================
 * 4) Helle und dunkle Ansicht
 * ===================================================================== */
console.log('\nAnsicht\n');
{
  for (const [schema, erwartet] of [['light', 'hell'], ['dark', 'dunkel']]) {
    const page = await neueSeite({ colorScheme: schema });
    await page.click('#ng-start'); await page.waitForTimeout(400);
    const farben = await lies(page, () => ({
      grund: getComputedStyle(document.body).backgroundColor,
      schrift: getComputedStyle(document.body).color
    }));
    const istHell = farben.grund === 'rgb(247, 243, 235)';
    pruefe(`Systemvorgabe "${schema}" ergibt ${erwartet}e Ansicht`,
      istHell === (erwartet === 'hell'), JSON.stringify(farben));

    await page.click('#btn-theme'); await page.waitForTimeout(300);
    const nachher = await lies(page, () => getComputedStyle(document.body).backgroundColor);
    pruefe('Umschalter kehrt die Ansicht um', nachher !== farben.grund, farben.grund + ' -> ' + nachher);

    /* Kein Farbwert darf nur in einem Modus definiert sein */
    const unsichtbar = await lies(page, () => {
      const schrift = getComputedStyle(document.body).color;
      const grund = getComputedStyle(document.body).backgroundColor;
      return schrift === grund || schrift === 'rgba(0, 0, 0, 0)' || grund === 'rgba(0, 0, 0, 0)';
    });
    pruefe('Schrift und Grund bleiben unterscheidbar', !unsichtbar);
    await page.close();
  }
}

/* ========================================================================
 * 5) Partieanalyse
 * ===================================================================== */
console.log('\nAnalyse\n');
{
  const page = await neueSeite();
  await page.click('[data-set="mode:human"]'); await page.waitForTimeout(120);
  await page.click('#ng-start'); await page.waitForTimeout(400);

  /* Schwarz stellt die Dame ein — das muss die Analyse finden. */
  await spiele(page, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Qf6', 'Nc3', 'Qxf3', 'gxf3']);
  await page.click('#act-resign'); await page.waitForTimeout(250);
  await page.click('#rs-resign'); await page.waitForTimeout(900);
  await page.click('#res-analyse'); await page.waitForTimeout(300);
  await page.waitForFunction(() => !window.SchachApp.state.analysing && window.SchachApp.state.analysis,
    null, { timeout: 120000 });
  await page.waitForTimeout(300);

  const a = await lies(page, () => window.SchachApp.state.analysis);
  pruefe('Analyse liefert ein Ergebnis', !!a && a.tiefe >= 4, 'mittlere Suchtiefe ' + (a && a.tiefe));
  pruefe('Genauigkeit liegt zwischen 0 und 100',
    a.weiss.genauigkeit >= 0 && a.weiss.genauigkeit <= 100 &&
    a.schwarz.genauigkeit >= 0 && a.schwarz.genauigkeit <= 100,
    `Weiß ${a.weiss.genauigkeit}% / Schwarz ${a.schwarz.genauigkeit}%`);
  pruefe('Wer die Dame einstellt, spielt ungenauer', a.weiss.genauigkeit > a.schwarz.genauigkeit);

  const patzer = await lies(page, () => window.SchachApp.state.moves
    .filter((m) => m.review && m.review.klasse === 'patzer').map((m) => m.san));
  pruefe('Dameneinsteller als Patzer erkannt', patzer.includes('Qxf3'), 'gefunden: ' + (patzer.join(', ') || 'keine'));

  const buch = await lies(page, () => window.SchachApp.state.moves
    .filter((m) => m.review && m.review.klasse === 'buch').map((m) => m.san));
  pruefe('Eröffnungszüge werden nicht als Fehler gewertet', buch.length > 0, 'als Buch erkannt: ' + buch.join(' '));

  pruefe('Zusammenfassung wird angezeigt',
    !(await lies(page, () => document.getElementById('analysis-panel').hidden)));
  pruefe('Zeichen erscheinen in der Zugliste', (await page.locator('.mv-mark').count()) > 0);

  const ply = await lies(page, () => window.SchachApp.state.moves
    .findIndex((m) => m.review && m.review.klasse === 'patzer') + 1);
  await page.click(`.mv[data-ply="${ply}"]`); await page.waitForTimeout(300);
  pruefe('Bessere Fortsetzung wird genannt',
    (await page.textContent('#status-line')).includes('besser war'));

  /* Ein neuer Zug macht die Bewertungen ungültig */
  await page.click('#act-undo'); await page.waitForTimeout(400);
  pruefe('Zurücknehmen verwirft die Analyse',
    (await lies(page, () => window.SchachApp.state.analysis)) === null);
  await page.close();
}

/* ========================================================================
 * 6) Vollständige Partie gegen den Computer
 * ===================================================================== */
console.log('\nPartie gegen den Computer\n');
{
  const page = await neueSeite();
  await page.click('#ng-start'); await page.waitForTimeout(400);
  await page.evaluate(() => window.SchachApp.startGame({ mode: 'ai', level: 1, color: 'w', time: 'none' }));
  await page.waitForTimeout(400);

  const ergebnis = await page.evaluate(async () => {
    const st = window.SchachApp.state;
    for (let i = 0; i < 80 && !st.result; i++) {
      while (st.thinking) await new Promise((r) => setTimeout(r, 40));
      if (st.result) break;
      if (st.pos.turn !== st.humanColor) { await new Promise((r) => setTimeout(r, 50)); continue; }
      const moves = st.pos.generateMoves();
      if (!moves.length) break;
      window.SchachApp.playMove(moves[Math.floor(Math.random() * moves.length)], { animate: false });
      await new Promise((r) => setTimeout(r, 80));
    }
    while (st.thinking) await new Promise((r) => setTimeout(r, 40));
    await new Promise((r) => setTimeout(r, 600));
    let brett = 0;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (st.pos.board[s]) brett++; }
    return { halbzuege: st.moves.length, ende: st.result ? st.result.type : null,
             dom: document.querySelectorAll('.piece').length, brett };
  });
  pruefe('Partie läuft sauber zu Ende', ergebnis.halbzuege >= 4 && (ergebnis.ende || ergebnis.halbzuege >= 80),
    `${ergebnis.halbzuege} Halbzüge, Ende: ${ergebnis.ende || 'Zuglimit'}`);
  pruefe('Angezeigte Figuren stimmen mit dem Brett überein', ergebnis.dom === ergebnis.brett,
    `${ergebnis.dom} im Fenster, ${ergebnis.brett} auf dem Brett`);
  await page.close();
}

await browser.close();

if (meldungen.length) {
  console.log('\nMeldungen aus dem Browser:\n' + meldungen.join('\n'));
  fehler += meldungen.length;
}
console.log(fehler === 0 ? '\nAlle Oberflächentests bestanden.' : `\n${fehler} Test(s) fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
