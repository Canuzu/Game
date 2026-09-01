/* =============================================================================
 * tactics.mjs — Spielstaerke-Tests
 *   1) Mattaufgaben: ein unabhaengiger Brute-Force-Loeser bestimmt die wahre
 *      Mattdistanz. Der Test prueft, ob die Engine einen Zug waehlt, der das
 *      Matt tatsaechlich erzwingt — er verlaesst sich nicht auf handnotierte
 *      Loesungen.
 *   2) Selbstspiel: starke Stufe gegen schwache Stufe ueber mehrere Partien.
 *      Deckt gleichzeitig ab, dass make/undo ueber ganze Partien konsistent
 *      bleibt und nie ein illegaler Zug zurueckkommt.
 * Aufruf:  node tests/tactics.mjs
 * ========================================================================== */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Chess = require('../js/engine.js'); globalThis.Chess = Chess;
require('../js/evaluate.js');
require('../js/book.js');
const AI = require('../js/ai.js');

/* --- Unabhaengiger Mattloeser (reine Brute Force, keine Bewertung) -------- */
/** Erzwingt die Seite am Zug ein Matt in hoechstens `plies` Halbzuegen? */
function forcesMate(pos, plies) {
  if (plies <= 0) return false;
  const moves = pos.generateMoves();
  for (const m of moves) {
    pos.makeMove(m);
    const ok = opponentIsLost(pos, plies - 1);
    pos.undoMove();
    if (ok) return true;
  }
  return false;
}
/** Verliert die Seite am Zug gegen jede Verteidigung innerhalb `plies`? */
function opponentIsLost(pos, plies) {
  const replies = pos.generateMoves();
  if (replies.length === 0) return pos.inCheck();       /* matt = ja, patt = nein */
  if (plies <= 0) return false;
  for (const r of replies) {
    pos.makeMove(r);
    const stillWinning = forcesMate(pos, plies - 1);
    pos.undoMove();
    if (!stillWinning) return false;
  }
  return true;
}
/** Kuerzeste Mattdistanz in Halbzuegen, oder 0 wenn keine gefunden. */
function mateDistance(pos, maxPlies = 5) {
  for (let p = 1; p <= maxPlies; p += 2) if (forcesMate(pos, p)) return p;
  return 0;
}

/* --- 1) Mattaufgaben ------------------------------------------------------ */
const MATES = [
  { name: 'Grundreihenmatt',    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1' },
  { name: 'Schaefermatt',       fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4' },
  { name: 'Ersticktes Matt',    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1' },
  { name: 'Turmabtausch matt',  fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1' },
  { name: 'Matt in 2 (Block)',  fen: '6k1/5ppp/8/8/8/8/3r1PPP/R5K1 w - - 0 1' },
  { name: 'Turmendspiel M2',    fen: '6k1/8/5K2/8/8/8/8/R7 w - - 0 1' },
  { name: 'Damenendspiel M2',   fen: '6k1/8/5K2/8/8/8/8/Q7 w - - 0 1' },
  { name: 'Matt in 3',          fen: 'r5rk/5p1p/5R2/4B3/8/8/7P/7K w - - 0 1' },
];

const strong = { ...AI.LEVELS[3], book: false, blunder: 0, spread: 0, timeMs: 2500 };
let fails = 0;

console.log('Mattaufgaben (Loesung wird unabhaengig verifiziert)\n');
for (const pz of MATES) {
  const pos = new Chess.Position(pz.fen);
  const dist = mateDistance(pos, 5);
  if (dist === 0) {
    console.log(`SKIP  ${pz.name.padEnd(22)} — in dieser Stellung gibt es kein Matt in <=3 Zuegen`);
    fails++;
    continue;
  }
  const res = await AI.findBestMove(pos, strong, []);
  const san = pos.moveToSan(res.move);

  /* Fuehrt der gewaehlte Zug wirklich zum Matt in derselben Distanz? */
  pos.makeMove(res.move);
  const holds = opponentIsLost(pos, dist - 1);
  pos.undoMove();

  if (!holds) fails++;
  console.log(
    `${holds ? 'OK  ' : 'FAIL'}  ${pz.name.padEnd(22)} Matt in ${Math.ceil(dist / 2)}` +
    ` -> ${san.padEnd(7)} Tiefe ${String(res.depth).padStart(2)} ${String(res.ms).padStart(5)}ms` +
    (holds ? '' : '   erzwingt das Matt nicht')
  );
}

/* --- 2) Selbstspiel: Stufe 4 gegen Stufe 1 -------------------------------- */
console.log('\nSelbstspiel — Meister (Weiss) gegen Anfänger (Schwarz)\n');
const quickStrong = { ...AI.LEVELS[3], book: false, blunder: 0, spread: 0, timeMs: 400, maxDepth: 6 };
const weak = { ...AI.LEVELS[0], book: false };

let masterWins = 0, draws = 0, weakWins = 0, illegal = 0;
const GAMES = 4;

for (let g = 0; g < GAMES; g++) {
  const pos = new Chess.Position();
  const sans = [];
  let status = pos.getStatus();

  while (!status.over && pos.history.length < 240) {
    const cfg = pos.turn === Chess.WHITE ? quickStrong : weak;
    const res = await AI.findBestMove(pos, cfg, sans);
    if (!res) break;
    if (!pos.generateMoves().includes(res.move)) { illegal++; break; }
    sans.push(pos.moveToSan(res.move));
    pos.makeMove(res.move);
    status = pos.getStatus();
  }

  let outcome;
  if (status.type === 'checkmate') {
    outcome = status.winner === Chess.WHITE ? 'Meister gewinnt' : 'Anfänger gewinnt';
    if (status.winner === Chess.WHITE) masterWins++; else weakWins++;
  } else if (status.over) { outcome = 'Remis (' + status.type + ')'; draws++; }
  else { outcome = 'abgebrochen (Zuglimit)'; draws++; }

  console.log(`  Partie ${g + 1}: ${String(sans.length).padStart(3)} Halbzuege — ${outcome}`);
  /* Rueckabwicklung muss exakt zur Grundstellung fuehren */
  while (pos.history.length) pos.undoMove();
  if (pos.getFen() !== Chess.START_FEN) {
    console.log('  FAIL: undoMove() stellt die Grundstellung nicht wieder her');
    fails++;
  }
}

if (illegal) { console.log(`\nFAIL: ${illegal}x illegalen Zug erhalten`); fails += illegal; }
console.log(`\n  Bilanz: Meister ${masterWins} : ${weakWins} Anfänger (${draws} unentschieden)`);
if (masterWins < GAMES - 1) { console.log('  FAIL: der Meister sollte den Anfänger klar schlagen'); fails++; }

console.log(fails === 0 ? '\nAlle Spielstaerke-Tests bestanden.' : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);
