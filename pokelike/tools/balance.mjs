/* =============================================================================
 * balance.mjs — misst, wie schwer das Spiel gerade ist
 * -----------------------------------------------------------------------------
 * Spielt Runs vollautomatisch durch und zählt, wie oft die harten Kämpfe
 * gewonnen werden. Damit lässt sich eine Änderung an der Schwierigkeit belegen
 * statt schätzen.
 *
 *   node tools/balance.mjs [Anzahl Runs]
 * ========================================================================== */
import '../js/run.js';
import '../js/ai.js';

const PL = globalThis.PL, mons = PL.mon;
const N = Number(process.argv[2] || 30);

const tally = {};
function note(kind, won) {
  if (!tally[kind]) tally[kind] = [0, 0];
  tally[kind][1]++;
  if (won) tally[kind][0]++;
}

function fight(run, bt) {
  bt.start();
  let g = 0;
  while (!bt.ended && g++ < 300) {
    let mine = PL.ai.chooseAction(bt, 0, 4, { bag: run.bag });
    if (mine.type === 'item' || mine.type === 'ball') run.removeItem(mine.item, 1);
    bt.runTurn([mine, PL.ai.chooseAction(bt, 1, bt.aiLevel === undefined ? 1 : bt.aiLevel)]);
    if (bt.pending !== null && bt.pending !== undefined && !bt.ended) {
      const side = bt.sides[bt.pending];
      const idx = PL.ai.chooseSwitch(bt, side, true);
      const fb = side.team.findIndex((m) => m.hp > 0);
      if (idx < 0 && fb < 0) break;
      bt.replace(bt.pending, idx >= 0 ? idx : fb);
    }
  }
  return bt;
}

function resolve(run, scene) {
  switch (scene.kind) {
    case 'battle': {
      const bt = fight(run, scene.battle);
      const kind = (bt.reward && bt.reward.kind) || 'wild';
      if (/boss|e4|champ|elite/.test(kind)) note(kind, bt.outcome === 'win');
      if (kind === 'boss' && bt.trainer && bt.trainer.leader) {
        note('leiter:' + bt.trainer.leader + ' (' + bt.sides[1].team.length + ')',
          bt.outcome === 'win');
      }
      run.finishBattle(bt);
      if (bt.outcome === 'win') {
        const reward = run.battleRewards(bt);
        if (reward && reward.offers && reward.offers.length) {
          if (reward.kind === 'relic') run.takeRelic(reward.offers[0].id);
          else run.addItem(reward.offers[0].id, 1);
        }
      }
      run.healTeam(0.45, true);
      break;
    }
    case 'catch': if (scene.offers.length) run.takeOffer(scene.offers[0]); break;
    case 'item': if (scene.offers.length) run.addItem(scene.offers[0].id, 1); break;
    case 'relic': if (scene.offers.length) run.takeRelic(scene.offers[0].id); break;
    case 'shop': scene.stock.filter((e) => e.price <= run.money).slice(0, 2).forEach((e) => run.buy(e)); break;
    case 'rest': run.doRest('heal'); break;
    case 'event': {
      const opt = scene.options.filter((o) => o.enabled)[0];
      if (opt) { const out = run.chooseEvent(opt.index); if (out && out.scene) resolve(run, out.scene); }
      break;
    }
    default: break;
  }
}

function autoRun(seed) {
  const run = new PL.Run({ seed, starter: 'charmander' });
  let guard = 0;
  while (run.state !== 'gameover' && run.state !== 'victory' && guard++ < 4000) {
    const options = run.available();
    if (!options.length) { run.advanceRegion(); continue; }
    const rank = (o) => {
      const t = run.nodeAt(o.row, o.col).type;
      const hurt = run.party.some((m) => m.hp < mons.maxHP(m) * 0.45);
      if (t === 'rest') return hurt ? 9 : 2;
      if (t === 'catch') return run.party.length < 4 ? 8 : 3;
      if (t === 'relic') return 7;
      if (t === 'wild' || t === 'trainer') return 6;
      if (t === 'elite') return run.party.length >= 3 ? 5 : 1;
      return 4;
    };
    options.sort((a, b) => rank(b) - rank(a));
    const scene = run.enterNode(options[0].row, options[0].col);
    if (!scene) break;
    resolve(run, scene);
    if (run.state === 'gameover') break;
    run.closeScene();
  }
  return run;
}

let victories = 0, regionSum = 0;
for (let i = 0; i < N; i++) {
  const run = autoRun(5000 + i);
  if (run.state === 'victory') victories++;
  regionSum += run.region;
}

if (process.argv.includes('--leiter')) {
  Object.keys(tally).filter((k) => k.startsWith('leiter:')).sort().forEach((k) => {
    const [w, n] = tally[k];
    if (n < 3) return;
    console.log('  ' + k.slice(7).padEnd(22), (w / n * 100).toFixed(0).padStart(3) + ' %  (' + w + '/' + n + ')');
  });
  console.log();
}

const order = ['elite', 'boss', 'e4', 'champ'];
const label = { elite: 'Ass-Trainer', boss: 'Arenaleiter', e4: 'Top Vier', champ: 'Champ' };
let weighted = 0, weight = 0;
for (const k of order) {
  if (!tally[k]) continue;
  const [w, n] = tally[k];
  const pct = w / n * 100;
  weighted += pct * n;
  weight += n;
  console.log(label[k].padEnd(12), pct.toFixed(0).padStart(3) + ' %  (' + w + '/' + n + ')');
}
console.log('—'.repeat(34));
console.log('Gewichtet   ', (weighted / weight).toFixed(1).padStart(5) + ' %');
console.log('Runs gewonnen:', victories + '/' + N + ' | Ø Region', (regionSum / N).toFixed(1));
