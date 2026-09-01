/* Perft-Tests: zaehlt alle Zugfolgen bis Tiefe n und vergleicht mit den
 * bekannten Referenzwerten. Deckt Rochade, en passant, Umwandlung und
 * Fesselungen ab.  Aufruf:  node tests/perft.mjs            */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Chess = require('../js/engine.js');

const SUITE = [
  { name: 'Grundstellung', fen: Chess.START_FEN,
    expect: [20, 400, 8902, 197281, 4865609] },
  { name: 'Kiwipete', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    expect: [48, 2039, 97862, 4085603] },
  { name: 'Endspiel (en passant)', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    expect: [14, 191, 2812, 43238, 674624] },
  { name: 'Umwandlungen', fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    expect: [6, 264, 9467, 422333] },
  { name: 'Enge Stellung', fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    expect: [44, 1486, 62379, 2103487] },
  { name: 'Steuer-Test', fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    expect: [46, 2079, 89890, 3894594] },
];

let failures = 0, totalNodes = 0;
const t0 = Date.now();

for (const test of SUITE) {
  const pos = new Chess.Position(test.fen);
  for (let d = 1; d <= test.expect.length; d++) {
    const got = pos.perft(d);
    totalNodes += got;
    const want = test.expect[d - 1];
    const ok = got === want;
    if (!ok) failures++;
    console.log(`${ok ? 'OK  ' : 'FAIL'}  ${test.name.padEnd(24)} Tiefe ${d}: ${String(got).padStart(9)}` +
                (ok ? '' : `  erwartet ${want}`));
  }
  // FEN-Roundtrip pruefen
  if (pos.getFen() !== test.fen) {
    console.log(`FAIL  ${test.name}: FEN-Roundtrip\n      ${pos.getFen()}\n      ${test.fen}`);
    failures++;
  }
}

const secs = (Date.now() - t0) / 1000;
console.log(`\n${totalNodes.toLocaleString('de-DE')} Knoten in ${secs.toFixed(1)}s ` +
            `(${Math.round(totalNodes / secs / 1000)}k Knoten/s)`);
console.log(failures === 0 ? '\nAlle Perft-Tests bestanden.' : `\n${failures} Test(s) fehlgeschlagen.`);
process.exit(failures === 0 ? 0 : 1);
