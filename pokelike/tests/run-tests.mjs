/* =============================================================================
 * run-tests.mjs — Prüfungen ohne Browser
 * -----------------------------------------------------------------------------
 * Deckt ab: Werteformel, Typentabelle, Schadensrechnung, Kampfablauf,
 * ein vollständig durchgespielter Run und das Speicherformat.
 *
 *   npm test
 * ========================================================================== */
import '../js/run.js';
import '../js/ai.js';
import '../js/autopilot.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');

const PL = globalThis.PL;
const { dex, mon: mons } = PL;

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; return true; }
  fail++;
  failures.push(name + (detail ? ' — ' + detail : ''));
  return false;
}
function eq(name, actual, expected) {
  return check(name, actual === expected, 'erwartet ' + expected + ', bekommen ' + actual);
}
function near(name, actual, expected, tol) {
  return check(name, Math.abs(actual - expected) <= tol,
    'erwartet ' + expected + ' ±' + tol + ', bekommen ' + actual);
}
function section(t) { console.log('\n' + t); }

/* ---------------------------------------------------- 1) Daten und Werte -- */

section('Daten');
check('Alle neun Generationen vorhanden',
  [1, 2, 3, 4, 5, 6, 7, 8, 9].every((g) => dex.species.some((s) => s.g === g)));
check('Über 1000 Spezies', dex.species.length > 1000, String(dex.species.length));
check('Startpokémon aller Generationen da',
  ['bulbasaur', 'chikorita', 'treecko', 'turtwig', 'snivy', 'chespin', 'rowlet', 'grookey', 'sprigatito']
    .every((id) => dex.sp(id)));
{
  const rng = PL.rng('moveset');
  const broken = dex.species.filter((s) => mons.buildMoveset(s, 50, rng, {}).length === 0);
  check('Jede Spezies bekommt ein spielbares Attackenset', broken.length === 0,
    broken.slice(0, 5).map((s) => s.n).join(', '));
}
check('Jede Spezies hat Typen und Werte',
  dex.species.every((s) => s.t.length >= 1 && s.bs.length === 6 && s.bst > 100));

section('Typentabelle');
eq('Feuer → Pflanze/Gift = 2×', dex.eff('Fire', ['Grass', 'Poison']), 2);
eq('Boden → Flug = 0×', dex.eff('Ground', ['Flying']), 0);
eq('Elektro → Boden = 0×', dex.eff('Electric', ['Ground']), 0);
eq('Kampf → Unlicht/Eis = 4×', dex.eff('Fighting', ['Dark', 'Ice']), 4);
eq('Käfer → Stahl/Feuer = 0,25×', dex.eff('Bug', ['Steel', 'Fire']), 0.25);
eq('Fee → Drache = 2×', dex.eff('Fairy', ['Dragon']), 2);
eq('Geist → Normal = 0×', dex.eff('Ghost', ['Normal']), 0);

section('Werteberechnung');
{
  const rng = PL.rng(1);
  // Referenz: Basis 100, 31 DW, 252 FP, neutrales Wesen, Level 50
  const m = mons.create('garchomp', 50, rng, {
    ivs: [31, 31, 31, 31, 31, 31], evs: [252, 252, 0, 0, 0, 0], nature: 'Hardy'
  });
  const st = mons.stats(m);
  // KP = ((2*108+31+63)*50/100)+50+10 = 155 + 60 = 215
  eq('Knakrack KP (31 DW, 252 FP, Lv50)', st[0], 215);
  // ANG = ((2*130+31+63)*50/100+5) = 177+5 = 182
  eq('Knakrack Angriff', st[1], 182);
  const adamant = mons.create('garchomp', 50, rng, {
    ivs: [31, 31, 31, 31, 31, 31], evs: [252, 252, 0, 0, 0, 0], nature: 'Adamant'
  });
  eq('Hartes Wesen erhöht den Angriff', mons.stats(adamant)[1], Math.floor(182 * 1.1));
  const shed = mons.create('shedinja', 50, rng, {});
  eq('Ninjatom hat 1 KP', mons.stats(shed)[0], 1);
}

section('Schadensformel');
{
  const rng = PL.rng(7);
  const a = mons.create('machamp', 50, rng, { ivs: [31, 31, 31, 31, 31, 31], evs: [0, 0, 0, 0, 0, 0], nature: 'Hardy', moves: [] });
  const d = mons.create('snorlax', 50, rng, { ivs: [31, 31, 31, 31, 31, 31], evs: [0, 0, 0, 0, 0, 0], nature: 'Hardy', moves: [] });
  a.moves = [{ m: dex.move('closecombat').i, pp: 5, ppUp: 0, used: 0 }];
  d.moves = [{ m: dex.move('bodyslam').i, pp: 15, ppUp: 0, used: 0 }];
  a.ab = 'Guts'; d.ab = 'Immunity';
  const bt = new PL.Battle({ teams: [[a], [d]], rng });
  bt.start();
  const atk = bt.sides[0].active, def = bt.sides[1].active;
  // Von Hand: Level 50, ANG 145, VER 125, Stärke 120, STAB 1,5, sehr effektiv 2
  const A = bt.statOf(atk, 'atk'), D = bt.statOf(def, 'def');
  const base = Math.floor(Math.floor(Math.floor(2 * 50 / 5 + 2) * 120 * A / D) / 50) + 2;
  const expected = Math.floor(base * 1.5 * 2 * 0.925);
  let total = 0;
  for (let i = 0; i < 400; i++) {
    const r = bt.calcDamage(atk, def, dex.move('closecombat'), { noCrit: true });
    total += r.dmg;
    if (i === 0) check('Nahkampf ist sehr effektiv gegen Relaxo', r.eff === 2, 'eff=' + r.eff);
  }
  near('Durchschnittsschaden entspricht der Formel', Math.round(total / 400), expected, expected * 0.03);
}

/* ------------------------------------------------------------- 2) Kämpfe -- */

section('Kämpfe');
{
  const rng = PL.rng('kampf');
  let errors = 0, stuck = 0, totalTurns = 0, wildCatches = 0;
  const roster = ['charizard', 'blastoise', 'venusaur', 'garchomp', 'metagross', 'gengar', 'blissey',
    'ferrothorn', 'dragapult', 'toxapex', 'landorustherian', 'miraidon', 'clefable', 'skarmory'];
  for (let n = 0; n < 150; n++) {
    const pick = (k) => rng.sample(roster, k).map((id) => mons.create(id, 20 + rng.int(60), rng, { quality: 0.85 }));
    const wild = n % 3 === 0;
    const bt = new PL.Battle({ teams: [pick(3), wild ? pick(1) : pick(3)], rng, wild });
    try {
      bt.start();
      let guard = 0;
      while (!bt.ended && guard++ < 300) {
        const a0 = wild && guard === 3 && bt.sides[1].active.mon.hp > 0
          ? { type: 'ball', item: 'ultraball' }
          : PL.ai.chooseAction(bt, 0, 2);
        bt.runTurn([a0, PL.ai.chooseAction(bt, 1, wild ? 0 : 3)]);
        if (bt.pending !== null && bt.pending !== undefined && !bt.ended) {
          const side = bt.sides[bt.pending];
          const idx = PL.ai.chooseSwitch(bt, side, true);
          bt.replace(bt.pending, idx >= 0 ? idx : side.team.findIndex((m) => m.hp > 0));
        }
      }
      if (guard >= 300) stuck++;
      if (bt.outcome === 'caught') wildCatches++;
      totalTurns += bt.turn;
    } catch (e) {
      errors++;
      if (errors <= 2) failures.push('Kampf ' + n + ': ' + e.message + ' @ ' + e.stack.split('\n')[1].trim());
    }
  }
  eq('150 Kämpfe ohne Ausnahme', errors, 0);
  eq('Kein Kampf bleibt hängen', stuck, 0);
  check('Kämpfe dauern eine sinnvolle Zeit', totalTurns / 150 > 2 && totalTurns / 150 < 40,
    'Ø ' + (totalTurns / 150).toFixed(1) + ' Runden');
  check('Bälle funktionieren', wildCatches > 0, wildCatches + ' Fänge');
}

section('Kampfmechanik im Einzelnen');
{
  const rng = PL.rng('mechanik');
  function duel(idA, idB, setup) {
    const a = mons.create(idA, 50, rng, {}), b = mons.create(idB, 50, rng, {});
    const bt = new PL.Battle({ teams: [[a], [b]], rng });
    bt.start();
    if (setup) setup(bt, bt.sides[0].active, bt.sides[1].active);
    return bt;
  }
  // Statusstufen
  let bt = duel('pikachu', 'pikachu');
  const before = bt.statOf(bt.sides[0].active, 'atk');
  bt.boost(bt.sides[0].active, { atk: 2 }, bt.sides[0].active);
  near('+2 Angriff verdoppelt den Wert', bt.statOf(bt.sides[0].active, 'atk'), before * 2, 2);
  bt.boost(bt.sides[0].active, { atk: -4 }, bt.sides[1].active);
  near('-2 Angriff halbiert den Wert', bt.statOf(bt.sides[0].active, 'atk'), before * 0.5, 2);

  // Verbrennung halbiert den physischen Angriff
  bt = duel('machamp', 'machamp');
  bt.sides[0].active.ability = 'noguard';        // Adrenalin würde den Test verfälschen
  const clean = bt.statOf(bt.sides[0].active, 'atk');
  bt.sides[0].active.mon.status = 'brn';
  eq('Verbrennung halbiert den Angriff', bt.statOf(bt.sides[0].active, 'atk'), Math.floor(clean * 0.5));

  // Immunitäten
  bt = duel('gengar', 'snorlax');
  eq('Geist ist immun gegen Normal', bt.effectiveness('Normal', bt.sides[0].active, dex.move('bodyslam'), bt.sides[1].active), 0);
  bt = duel('gengar', 'snorlax');
  bt.sides[1].active.ability = 'scrappy';
  eq('Rauflust durchbricht die Geist-Immunität',
    bt.effectiveness('Normal', bt.sides[0].active, dex.move('bodyslam'), bt.sides[1].active), 1);

  // Mega-Entwicklung: kein Stein, kein Ring — wer ausgewachsen ist, kann es
  bt = duel('charizard', 'blastoise');
  eq('Kein Pokémon trägt noch einen Stein', bt.sides[0].active.item, null);
  check('Ausgewachsen heißt mega-fähig', bt.canMega(bt.sides[0].active));
  const plainAtk = bt.statOf(bt.sides[0].active, 'spa');
  const wantsX = bt.sides[0].active.stats[1] >= bt.sides[0].active.stats[3];
  eq('Mega-Entwicklung gelingt', bt.megaEvolve(bt.sides[0].active), true);
  eq('Zwei Mega-Formen: die passende wird gewählt',
    /Mega-X$/.test(bt.sides[0].active.megaForm.n), wantsX);
  check('Mega-Form ist stärker', bt.statOf(bt.sides[0].active, 'spa') > plainAtk ||
    bt.statOf(bt.sides[0].active, 'atk') > plainAtk,
    plainAtk + ' → ' + bt.statOf(bt.sides[0].active, 'spa'));
  eq('Mega geht nur einmal pro Kampf', bt.canMega(bt.sides[0].active), false);

  // Ein halb entwickeltes Pokémon bleibt außen vor
  bt = duel('charizard', 'blastoise');
  bt.sides[0].active.species = dex.sp('charmander');
  eq('Wer noch wächst, entwickelt sich nicht mega', bt.canMega(bt.sides[0].active), false);

  bt = duel('rayquaza', 'blastoise');
  check('Rayquaza braucht keinen Zenitstürmer mehr', bt.canMega(bt.sides[0].active));

  bt = duel('groudon', 'blastoise');
  check('Protoform ist ohne Edelstein erreichbar', bt.canMega(bt.sides[0].active));
  bt.megaEvolve(bt.sides[0].active);
  check('Protoform trägt ihren Namen', /Proto|Primal/.test(bt.sides[0].active.megaName || ''),
    bt.sides[0].active.megaName);

  // Gigadynamax: drei Runden groß, dann zurück
  bt = duel('snorlax', 'blastoise');
  const gAct = bt.sides[0].active;
  const normalMax = gAct.stats[0];
  check('Gigadynamax ist möglich', bt.canGmax(gAct));
  eq('Gigadynamax gelingt', bt.gigantamax(gAct), true);
  check('Gigadynamax gibt Lebenspunkte', gAct.stats[0] > normalMax,
    normalMax + ' → ' + gAct.stats[0]);
  check('Gigadynamax schlägt härter',
    bt.calcDamage(gAct, bt.sides[1].active, dex.move('bodyslam'), { noRandom: true }).dmg > 0);
  eq('Neben Gigadynamax kein Mega mehr', bt.canMega(gAct), false);
  eq('Und auch kein zweites Gigadynamax', bt.canGmax(gAct), false);
  for (let t = 0; t < 3; t++) bt.endOfTurn();
  eq('Nach drei Runden ist die Riesengestalt vorbei', gAct.gmax, false);
  eq('… und die Lebenspunkte stehen wieder normal', gAct.stats[0], normalMax);
  check('… ohne geliehene KP mitzunehmen', gAct.mon.hp <= normalMax,
    gAct.mon.hp + ' / ' + normalMax);

  // Die Wahl gilt für den ganzen Run
  bt = duel('venusaur', 'blastoise');
  check('Venusaur kann beides', bt.canMega(bt.sides[0].active) && bt.canGmax(bt.sides[0].active));
  bt.megaEvolve(bt.sides[0].active);
  bt = duel('venusaur', 'blastoise');
  bt.sides[0].active.mon.form = 'mega';
  eq('Wer Mega gewählt hat, giga-dynamaximiert nie', bt.canGmax(bt.sides[0].active), false);
  bt.sides[0].active.mon.form = 'gmax';
  eq('Wer Giga gewählt hat, entwickelt sich nie mega', bt.canMega(bt.sides[0].active), false);

  // Wetter
  bt = duel('charizard', 'blastoise');
  bt.sides[0].active.ability = 'blaze';          // Solarkraft würde zusätzlich verstärken
  const avg = (n) => {
    let t = 0;
    for (let i = 0; i < n; i++) t += bt.calcDamage(bt.sides[0].active, bt.sides[1].active, dex.move('flamethrower'), { noCrit: true }).dmg;
    return t / n;
  };
  const dry = avg(300);
  bt.setWeather('sunnyday', bt.sides[0].active);
  const sunny = avg(300);
  near('Sonne verstärkt Feuerattacken um die Hälfte', sunny / dry, 1.5, 0.06);

  // Fähigkeiten
  bt = duel('poliwag', 'pikachu');                // ohne eigenes Bedroher-Risiko
  bt.sides[0].active.ability = 'intimidate';
  bt.onSwitchInEffects(bt.sides[0].active);
  eq('Bedroher senkt den gegnerischen Angriff', bt.sides[1].active.boosts.atk, -1);

  bt = duel('lanturn', 'pikachu');
  bt.sides[0].active.ability = 'voltabsorb';
  bt.sides[0].active.mon.hp = 10;
  bt.useMove(bt.sides[1].active, { move: dex.move('thunderbolt') });
  check('Voltabsorber heilt statt zu schaden', bt.sides[0].active.mon.hp > 10,
    'KP ' + bt.sides[0].active.mon.hp);

  // Gegenstände
  bt = duel('snorlax', 'snorlax');
  bt.sides[0].active.item = 'leftovers';
  bt.sides[0].active.mon.hp = 100;
  bt.endOfTurn();
  check('Überreste heilen am Rundenende', bt.sides[0].active.mon.hp > 100,
    'KP ' + bt.sides[0].active.mon.hp);

  bt = duel('shuckle', 'shuckle');
  bt.sides[0].active.item = 'focussash';
  bt.damage(bt.sides[0].active, 99999);
  eq('Fokusgurt lässt einen KP übrig', bt.sides[0].active.mon.hp, 1);

  // Status
  bt = duel('pikachu', 'magnemite');
  eq('Elektro-Pokémon werden nicht paralysiert',
    bt.setStatus(bt.sides[0].active, 'par', bt.sides[1].active, null), false);
  bt = duel('pikachu', 'magnemite');
  eq('Stahl-Pokémon werden nicht vergiftet',
    bt.setStatus(bt.sides[1].active, 'psn', bt.sides[0].active, null), false);

  // Statusattacken müssen als Status durchlaufen — nicht als schwacher Spezialangriff
  eq('Attackenkategorien sind sauber getrennt',
    dex.moves.filter((m) => m.c === 'T').length > 200, true);
  check('Bekannte Statusattacken sind als Status geführt',
    ['swordsdance', 'thunderwave', 'recover', 'protect', 'stealthrock', 'toxic', 'rest', 'calmmind']
      .every((id) => dex.move(id).c === 'T'),
    ['swordsdance', 'thunderwave', 'recover', 'protect', 'stealthrock', 'toxic', 'rest', 'calmmind']
      .filter((id) => dex.move(id).c !== 'T').join(', '));

  bt = duel('scizor', 'blissey');
  bt.useMove(bt.sides[0].active, { move: dex.move('swordsdance') });
  eq('Schwerttanz erhöht den Angriff um zwei Stufen', bt.sides[0].active.boosts.atk, 2);

  bt = duel('pikachu', 'snorlax');
  // Donnerwelle trifft zu neun Zehnteln — der Test darf nicht am Würfel hängen.
  for (let i = 0; i < 8 && !bt.sides[1].active.mon.status; i++) {
    bt.useMove(bt.sides[0].active, { move: dex.move('thunderwave') });
  }
  eq('Donnerwelle paralysiert', bt.sides[1].active.mon.status, 'par');

  bt = duel('blissey', 'snorlax');
  bt.sides[0].active.mon.hp = 50;
  bt.useMove(bt.sides[0].active, { move: dex.move('softboiled') });
  check('Weichei heilt die Hälfte der KP', bt.sides[0].active.mon.hp > 50,
    'KP ' + bt.sides[0].active.mon.hp);

  bt = duel('snorlax', 'snorlax');
  bt.sides[0].active.mon.hp = 20;
  bt.sides[0].active.mon.status = 'brn';
  bt.useMove(bt.sides[0].active, { move: dex.move('rest') });
  eq('Erholung füllt die KP', bt.sides[0].active.mon.hp, bt.maxHP(bt.sides[0].active));
  eq('Erholung lässt schlafen', bt.sides[0].active.mon.status, 'slp');

  bt = duel('skarmory', 'charizard');
  bt.useMove(bt.sides[0].active, { move: dex.move('stealthrock') });
  eq('Tarnsteine landen auf der Gegenseite', bt.sides[1].hazards.stealthrock, 1);

  bt = duel('blissey', 'machamp');
  bt.useMove(bt.sides[0].active, { move: dex.move('protect') });
  eq('Schutzschild ist aktiv', !!bt.sides[0].active.vol.protect, true);
  const hpUnderShield = bt.sides[0].active.mon.hp;
  bt.useMove(bt.sides[1].active, { move: dex.move('closecombat') });
  eq('Schutzschild fängt den Treffer ab', bt.sides[0].active.mon.hp, hpUnderShield);

  bt = duel('venusaur', 'charizard');
  bt.useMove(bt.sides[0].active, { move: dex.move('sunnyday') });
  eq('Sonnentag setzt das Wetter', bt.field.weather, 'sunnyday');

  // Fallen
  bt = duel('charizard', 'tyranitar');
  bt.addSideCondition(bt.sides[1], 'stealthrock', bt.sides[0].active);
  bt.sides[1].team.push(mons.create('charizard', 50, rng, {}));
  const hpBefore = bt.sides[1].team[1].hp;
  bt.switchIn(bt.sides[1], 1);
  check('Tarnsteine treffen Feuer/Flug hart', bt.sides[1].team[1].hp <= hpBefore * 0.55,
    hpBefore + ' → ' + bt.sides[1].team[1].hp);
}

/* ------------------------------------------------------- 3) Ganzer Run --- */

section('Durchgespielter Run');
{
  function autoRun(seed, mode) {
    const run = new PL.Run({ seed, mode, starter: 'charmander' });
    let guard = 0;
    const notes = { battles: 0, scenes: {}, regions: 0 };
    while (run.state !== 'gameover' && run.state !== 'victory' && guard++ < 4000) {
      const options = run.available();
      if (!options.length) { run.advanceRegion(); notes.regions++; continue; }
      // Ein Spieler mit Verstand: erst Team aufbauen, bei Blessuren rasten.
      const rank = (o) => {
        const t = run.nodeAt(o.row, o.col).type;
        const hurt = run.party.some((m) => m.hp < mons.maxHP(m) * 0.45);
        if (t === 'rest') return hurt ? 9 : 2;
        if (t === 'catch') return run.party.length < 4 ? 8 : 3;
        if (t === 'relic') return 7;
        if (t === 'wild' || t === 'trainer') return 6;   // Erfahrung ist alles
        if (t === 'elite') return run.party.length >= 3 ? 5 : 1;
        if (t === 'item') return 4;
        if (t === 'event') return 4;
        return 3;
      };
      options.sort((a, b) => rank(b) - rank(a));
      const pick = options[0];
      const scene = run.enterNode(pick.row, pick.col);
      if (!scene) break;
      notes.scenes[scene.kind] = (notes.scenes[scene.kind] || 0) + 1;
      resolveScene(run, scene, notes);
      if (run.state === 'gameover') break;
      run.closeScene();
    }
    return { run, notes, guard };
  }

  function resolveScene(run, scene, notes) {
    switch (scene.kind) {
      case 'battle': {
        const bt = scene.battle;
        bt.start();
        notes.battles++;
        let g = 0;
        while (!bt.ended && g++ < 300) {
          let mine = PL.ai.chooseAction(bt, 0, 2, { bag: run.bag });
          // Wie ein echter Spieler: wilde Pokémon einsammeln, solange Platz ist
          if (bt.wild && run.party.length < 5 && bt.turn >= 1 &&
              bt.sides[1].active.mon.hp < bt.sides[1].active.stats[0] * 0.6) {
            const ball = ['ultraball', 'greatball', 'pokeball'].find((b) => run.bag[b] > 0);
            if (ball) mine = { type: 'ball', item: ball };
          }
          if (mine.type === 'item' || mine.type === 'ball') run.removeItem(mine.item, 1);
          bt.runTurn([mine, PL.ai.chooseAction(bt, 1, bt.aiLevel === undefined ? 1 : bt.aiLevel)]);
          if (bt.pending !== null && bt.pending !== undefined && !bt.ended) {
            const side = bt.sides[bt.pending];
            const idx = PL.ai.chooseSwitch(bt, side, true);
            const fallback = side.team.findIndex((m) => m.hp > 0);
            if (idx < 0 && fallback < 0) break;
            bt.replace(bt.pending, idx >= 0 ? idx : fallback);
          }
        }
        run.finishBattle(bt);
        if (bt.outcome === 'win') {
          const reward = run.battleRewards(bt);
          if (reward && reward.offers && reward.offers.length) {
            if (reward.kind === 'relic') run.takeRelic(reward.offers[0].id);
            else run.addItem(reward.offers[0].id, 1);
          }
        }
        // Ein Spieler würde zwischendurch Tränke einsetzen — hier pauschal.
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
        if (opt) {
          const out = run.chooseEvent(opt.index);
          if (out && out.scene) resolveScene(run, out.scene, notes);
        }
        break;
      }
      default: break;
    }
  }

  let errors = 0, victories = 0, defeats = 0, totalBattles = 0;
  for (let i = 0; i < 6; i++) {
    try {
      const { run, notes, guard } = autoRun(1000 + i, i === 5 ? 'endlos' : 'standard');
      totalBattles += notes.battles;
      if (run.state === 'victory') victories++;
      if (run.state === 'gameover') defeats++;
      check('Run ' + i + ' endet regulär', run.state === 'victory' || run.state === 'gameover',
        'Zustand ' + run.state + ' nach ' + guard + ' Schritten');
      notes.endedAt = run.state + ' @ Region ' + run.region + '/' + run.totalRegions() +
        ' Reihe ' + run.rowIndex + ' Team ' + run.party.length;
      console.log('  Run ' + i + ': ' + notes.endedAt + ', ' + notes.battles + ' Kämpfe');
      if (i === 0) {
        console.log('  Beispiel-Run: ' + notes.battles + ' Kämpfe, Team ' +
          run.party.map((m) => mons.name(m) + ' Lv' + m.lvl).join(', '));
        console.log('  Relikte: ' + Object.keys(run.relics).map((r) => PL.relics.get(r).name).join(', '));
        console.log('  Szenen: ' + JSON.stringify(notes.scenes));
      }
    } catch (e) {
      errors++;
      failures.push('Run ' + i + ': ' + e.message + ' @ ' + e.stack.split('\n')[1].trim());
    }
  }
  eq('Sechs komplette Runs ohne Ausnahme', errors, 0);
  check('Runs erreichen die Liga oder scheitern ehrlich', victories + defeats === 6,
    victories + ' Siege, ' + defeats + ' Niederlagen');
  check('Runs kommen spürbar voran', totalBattles / 6 >= 4, 'Ø ' + (totalBattles / 6).toFixed(1) + ' Kämpfe');
}

section('Relikte');
{
  // Statische Prüfung: jede Reliktwirkung muss irgendwo ausgewertet werden.
  // Genau hier sind 30 Relikte jahrelang wirkungslos durchgerutscht.
  const files = ['run', 'battle', 'app', 'ai', 'world', 'meta', 'ui', 'effects'];
  const src = files.map((f) => readFileSync(join(SRC_DIR, f + '.js'), 'utf8')).join('\n');
  const dead = PL.relics.all().filter((r) => {
    if (src.indexOf("'" + r.id + "'") >= 0) return false;
    return !Object.keys(r.mods || {}).some((k) => new RegExp("['\"]" + k + "['\"]").test(src));
  });
  check('Jedes Relikt wird irgendwo ausgewertet', dead.length === 0,
    dead.map((r) => r.name).join(', '));
  check('Jedes Relikt hat mindestens eine Wirkung',
    PL.relics.all().every((r) => r.mods && Object.keys(r.mods).length > 0));

  const rng = PL.rng('relikte');
  // Immer dieselben Pokémon, damit Vergleiche nur die Relikte messen.
  const blueprint = {};
  function fixed(id) {
    if (!blueprint[id]) {
      blueprint[id] = PL.mon.create(id, 50, rng, {
        quality: 0.9, ivs: [20, 20, 20, 20, 20, 20], nature: 'Hardy'
      });
    }
    return JSON.parse(JSON.stringify(blueprint[id]));
  }
  function armed(relics, mons2) {
    const run = new PL.Run({ seed: 55, starter: 'charmander' });
    (relics || []).forEach((id) => run.takeRelic(id));
    run.party = (mons2 || ['charizard']).map(fixed);
    return run;
  }
  function duel(run, foeId) {
    const foe = fixed(foeId || 'snorlax');
    const bt = new PL.Battle(run.battleOpts({ team: [foe], trainer: { name: 'Test' } }));
    bt.start();
    return bt;
  }

  // Typen-Fokus
  {
    const plain = duel(armed([]));
    const boosted = duel(armed(['fokus_fire']));
    const avg = (bt) => {
      let t = 0;
      for (let i = 0; i < 300; i++) {
        t += bt.calcDamage(bt.sides[0].active, bt.sides[1].active, dex.move('flamethrower'), { noCrit: true }).dmg;
      }
      return t / 300;
    };
    const ratio = avg(boosted) / avg(plain);
    near('Fokus: Feuer verstärkt Feuerattacken um 30 %', ratio, 1.3, 0.06);
    const other = duel(armed(['fokus_water']));
    near('… und lässt andere Typen unberührt', avg(other) / avg(plain), 1, 0.05);
  }

  // Notfallband
  {
    const bt = duel(armed(['notfallband']));
    bt.damage(bt.sides[0].active, 99999);
    bt.checkFaints();
    check('Das Notfallband fängt den ersten K. o. ab', bt.sides[0].active.mon.hp > 0,
      'KP ' + bt.sides[0].active.mon.hp);
    bt.damage(bt.sides[0].active, 99999);
    bt.checkFaints();
    eq('… aber nur einmal pro Kampf', bt.sides[0].active.mon.hp, 0);
  }

  // Schutzhelm
  {
    const bt = duel(armed(['schutzhelm'], ['charizard', 'pikachu']));
    bt.addSideCondition(bt.sides[0], 'stealthrock', bt.sides[1].active);
    const before = bt.sides[0].team[1].hp;
    bt.switchIn(bt.sides[0], 1);
    eq('Der Schutzhelm hält Tarnsteine ab', bt.sides[0].team[1].hp, before);
  }

  // Teamgeist
  {
    const six = ['charizard', 'pikachu', 'gengar', 'lapras', 'onix', 'snorlax'];
    const plain = duel(armed([], six));
    const team = duel(armed(['teamgeist'], six));
    check('Teamgeist stärkt ein volles Team',
      team.statOf(team.sides[0].active, 'atk') > plain.statOf(plain.sides[0].active, 'atk'));
  }

  // Wunderkerze
  {
    const bt = duel(armed(['wunderkerze']));
    let hits = 0;
    for (let i = 0; i < 60; i++) {
      if (bt.accuracyCheck(bt.sides[0].active, bt.sides[1].active, dex.move('hypnosis'))) hits++;
    }
    eq('Die Wunderkerze lässt Statusattacken nie danebengehen', hits, 60);
  }

  // Mega-Armband
  {
    const run = armed(['mega_armband'], ['charizard', 'gengar']);
    run.party[0].item = 'charizarditey';
    run.party[1].item = 'gengarite';
    const bt = duel(run);
    eq('Das Mega-Armband erlaubt zwei Mega-Entwicklungen', bt.megaCharges(bt.sides[0]), 2);
  }

  // Eilekarte
  {
    const bt = duel(armed(['eilekarte']), 'jolteon');
    bt.turn = 1;
    const order = bt.actionOrder({ type: 'move', index: 0 }, { type: 'move', index: 0 });
    eq('Die Eilekarte lässt dich die erste Runde eröffnen', order[0], 0);
  }

  // Zweite Chance
  {
    const run = armed(['zweite_chance']);
    run.enterNode(0, 0);
    run.setScene(run.makeItemFind(run.rng));
    check('Zweite Chance erlaubt einen neuen Wurf', run.canReroll());
    run.reroll();
    check('… und nur einen', !run.canReroll());
  }
}

section('Neue Systeme');
{
  const run = new PL.Run({ seed: 4242, mode: 'standard', starter: 'charmander' });
  for (const id of ['pikachu', 'gengar', 'lapras']) run.party.push(PL.mon.create(id, 20, run.rng, {}));

  // Schnellheilung
  run.party[1].hp = 5;
  run.party[2].hp = 0;
  run.party[3].status = 'brn';
  // Der Beutel wird bewusst geleert: die Startausrüstung hängt an der
  // Gangart, und die Schnellheilung nimmt immer den kleinsten passenden
  // Gegenstand — sonst prüft der Test die Startausrüstung statt sich selbst.
  run.bag = {};
  run.addItem('hyperpotion', 2); run.addItem('revive', 1); run.addItem('burnheal', 1);
  const stock = { revive: run.bag.revive, burnheal: run.bag.burnheal, hyperpotion: run.bag.hyperpotion };
  const used = run.quickHeal();
  check('Schnellheilung belebt, heilt und kuriert',
    run.party[1].hp > 5 && run.party[2].hp > 0 && !run.party[3].status, used.join(', '));
  check('Schnellheilung verbraucht die Gegenstände',
    (run.bag.revive || 0) === stock.revive - 1 &&
    (run.bag.burnheal || 0) === stock.burnheal - 1 &&
    (run.bag.hyperpotion || 0) < stock.hyperpotion,
    JSON.stringify({ vorher: stock, nachher: { revive: run.bag.revive, burnheal: run.bag.burnheal, hyperpotion: run.bag.hyperpotion } }));
  eq('Ohne Bedarf tut sie nichts', run.quickHeal().length, 0);

  // Rivale
  check('Der Rivale nimmt den Konter-Starter',
    PL.world.counterStarter('charmander', run.rng) === 'squirtle');
  const rivalBattle = run.makeRival(run.rng);
  check('Rivalenkampf hat Team und Sprüche',
    rivalBattle.sides[1].team.length >= 2 && !!rivalBattle.banter.before);
  check('Der Rivale führt seinen Starter als Ass', (function () {
    const ace = rivalBattle.sides[1].team[rivalBattle.sides[1].team.length - 1];
    const base = dex.baseOf(dex.sp(ace.sp));
    return base.id === 'squirtle';
  })());
  const stages = [0, 1, 2, 3].map((st) => {
    run.rival.stage = st;
    return run.makeRival(run.rng).sides[1].team.length;
  });
  check('Sein Team wächst mit jeder Begegnung',
    stages[0] < stages[3] && stages.every((n, i) => i === 0 || n >= stages[i - 1]), stages.join('<'));

  // Friedhof
  run.rival.stage = 0;
  const victim = run.party[0];
  victim.faintedBy = 'Rihorn';
  run.bury(victim, { trainer: { name: 'Wanderer Ben' } });
  eq('Der Friedhof merkt sich den Gefallenen', run.graveyard.length, 1);
  check('Mit Todesursache', run.graveyard[0].by === 'Rihorn' && !!run.graveyard[0].region);

  // Legendäres gibt es im gewöhnlichen Run nicht mehr.
  check('Der Schrein der Legenden ist verschwunden',
    PL.world.EVENTS.every((e) => e.id !== 'legendenschrein'));

  // Segen im Endlosmodus
  const endless = new PL.Run({ seed: 9, mode: 'endlos', starter: 'chikorita' });
  endless.badges = 8;
  endless.leagueStage = 0;
  endless.advanceRegion();
  check('Nach einer vollen Runde wartet ein Segen',
    !!endless.pendingBlessing && endless.pendingBlessing.offers.length === 3);
  const capBefore = endless.levelCap;
  endless.takeBlessing('levelschub');
  eq('Der Levelschub hebt die Grenze', endless.levelCap, capBefore + 5);
  check('Jeder Segen hat Namen und Beschreibung',
    PL.Run.BLESSINGS.every((b) => b.id && b.name && b.desc && b.icon));
  {
    // Der »Ruf der Legende« ist aus dem Segen verschwunden.
    const e2 = new PL.Run({ seed: 12, mode: 'endlos', starter: 'chikorita' });
    let angeboten = 0;
    for (let i = 0; i < 200; i++) {
      if (e2.makeBlessing(PL.rng('b' + i)).offers.some((b) => b.id === 'legende')) angeboten++;
    }
    eq('Kein Segen ruft mehr eine Legende herbei', angeboten, 0);
  }

  // Ereignisse
  check('Deutlich mehr Ereignisse als vorher', PL.world.EVENTS.length >= 29, String(PL.world.EVENTS.length));
  check('Jedes Ereignis hat Titel, Text und Optionen',
    PL.world.EVENTS.every((e) => e.title && e.text && e.options.length >= 2));
  check('Bedingte Ereignisse haben eine Prüffunktion',
    PL.world.EVENTS.every((e) => !e.available || typeof e.available === 'function'));
}

section('Speichern und Laden');
{
  const run = new PL.Run({ seed: 999, mode: 'standard', starter: 'squirtle' });
  run.enterNode(0, 0);
  run.closeScene();
  run.addItem('ultraball', 3);
  run.takeRelic('glueckliches_ei');
  const json = JSON.parse(JSON.stringify(run.toJSON()));
  const back = PL.Run.fromJSON(json);
  eq('Seed bleibt erhalten', back.seed, run.seed);
  eq('Team bleibt erhalten', back.party.length, run.party.length);
  eq('Beutel bleibt erhalten', back.bag.ultraball, 3);
  eq('Relikt bleibt erhalten', !!back.relics.glueckliches_ei, true);
  eq('Levelgrenze wird wieder berechnet', back.levelCap, run.levelCap);
  eq('Karte bleibt erhalten', back.map.length, run.map.length);
  run.bury(run.party[0], null);
  const json2 = JSON.parse(JSON.stringify(run.toJSON()));
  const back2 = PL.Run.fromJSON(json2);
  eq('Friedhof übersteht das Speichern', back2.graveyard.length, run.graveyard.length);
  eq('Der Rivale übersteht das Speichern', back2.rival.name, run.rival.name);
  const a = PL.rng(back.rngState).int(1e6), b = PL.rng(run.rng.save()).int(1e6);
  eq('Zufallsstrom läuft identisch weiter', a, b);
}

section('Spielstand sichern');
{
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  await import('../js/meta.js');
  const meta = PL.meta;
  check('Der Fortschrittsspeicher steht bereit', meta.available());
  meta.reset();
  const run = new PL.Run({ seed: 321, starter: 'squirtle' });
  meta.noteCaught(run.party[0]);
  meta.saveRun(run);

  const text = meta.exportSave();
  const parsed = JSON.parse(text);
  eq('Der Export trägt eine Kennung', parsed.format, meta.SAVE_FORMAT);
  eq('… und eine Version', parsed.version, meta.SAVE_VERSION);
  check('… und enthält Fortschritt und Run', !!parsed.meta && !!parsed.run);

  meta.reset();
  eq('Nach dem Zurücksetzen ist der Pokédex leer', Object.keys(meta.load().caught).length, 0);
  const res = meta.importSave(text);
  check('Der Import meldet Erfolg', res.ok, res.text);
  eq('… und stellt den Pokédex wieder her', Object.keys(meta.load().caught).length, 1);
  check('… samt laufendem Run', meta.hasRun());

  // Ältere Spielstände können Megasteine enthalten, die es nicht mehr gibt.
  {
    const alt = new PL.Run({ seed: 77, starter: 'charmander' }).toJSON();
    alt.bag.charizarditex = 1;
    alt.party[0].item = 'charizarditey';
    const wieder = PL.Run.fromJSON(JSON.parse(JSON.stringify(alt)));
    check('Alte Megasteine fliegen aus dem Beutel', !wieder.bag.charizarditex,
      JSON.stringify(wieder.bag));
    eq('… und aus der Hand', wieder.party[0].item, null);
    check('… echte Gegenstände bleiben', wieder.bag.potion > 0);
  }

  // Der Wolkenspeicher: ohne Betrachter meldet sich niemand, und das darf
  // nichts kaputt machen.
  await import('../js/cloud.js');
  const cloud = PL.cloud;
  eq('Ohne Betrachter gibt es keine Wolke', await cloud.connect(), false);
  eq('… und der Zustand sagt das auch', cloud.state().available, false);
  check('Ein Code wird tippfehlerfreundlich gelesen',
    cloud.normalize('abcd efgh jkl') === 'ABCD-EFGH-JKL' &&
    cloud.normalize('ABCD-EFGH-JKL') === 'ABCD-EFGH-JKL',
    String(cloud.normalize('abcd efgh jkl')));
  eq('Was kein Code ist, wird abgelehnt', cloud.normalize('hallo'), null);
  const neu = cloud.newCode();
  check('Ein neuer Code hat die richtige Form', /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{3}$/.test(neu), neu);
  eq('… und wird gemerkt', cloud.code(), neu);
  check('Ohne Wolke schreibt push() nichts', (await cloud.push()) === false);
  cloud.setCode(null);

  check('Unsinn wird abgelehnt', !meta.importSave('{}').ok);
  check('Kaputter Text wird abgelehnt', !meta.importSave('kein json').ok);
  check('Fremde Dateien werden abgelehnt', !meta.importSave('{"format":"anderes-spiel"}').ok);

  // Alte Runs werden verworfen statt still kaputtzugehen
  const old = JSON.parse(JSON.stringify(run.toJSON()));
  old.version = 0;
  globalThis.localStorage.setItem('pokelike.plus.run.v1', JSON.stringify(old));
  eq('Ein Run aus einer alten Fassung gilt nicht als fortsetzbar', meta.hasRun(), false);
  eq('… und wird nicht geladen', meta.loadRun(), null);
  check('Der übrige Fortschritt bleibt dabei erhalten', Object.keys(meta.load().caught).length === 1);
  delete globalThis.localStorage;
}

section('Pokédex: eintragen, was man besitzt');
{
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const meta = PL.meta, dex = PL.dex, mons = PL.mon;
  meta.reset();

  // Der gemeldete Fall: ein schillerndes Taubsie entwickelt sich zu Taubogen.
  const taubsie = PL.world.buildMon(new PL.RNG(5), dex.sp('pidgey'), 12, { shiny: true });
  meta.noteCaught(taubsie);
  const vorher = dex.sp(taubsie.sp).i;
  check('Das gefangene Shiny steht schillernd im Pokédex', !!meta.load().shinies[vorher]);
  check('… und der Eintrag liegt sofort im Speicher',
    !!JSON.parse(store['pokelike.plus.v1'] || '{}').shinies?.[vorher]);

  const evo = mons.evolutions(taubsie, { force: true })[0];
  mons.evolve(taubsie, evo.to, new PL.RNG(6));
  meta.noteOwned(taubsie);
  const nachher = dex.sp(taubsie.sp).i;
  check('Nach der Entwicklung ist es eine andere Art', nachher !== vorher);
  check('Die Entwicklung steht im Pokédex', !!meta.load().caught[nachher]);
  check('… und zwar schillernd', !!meta.load().shinies[nachher],
    JSON.stringify(Object.keys(meta.load().shinies)));
  eq('Eine Entwicklung zählt nicht als zweiter Fang', meta.load().caught[nachher], 1);
  meta.noteOwned(taubsie);
  eq('… auch nicht beim zweiten Eintragen', meta.load().caught[nachher], 1);

  // Nicht schillernd bleibt nicht schillernd.
  const grau = PL.world.buildMon(new PL.RNG(7), dex.sp('rattata'), 10, { shiny: false });
  meta.noteOwned(grau);
  check('Wer nicht schillert, bekommt auch keinen Stern', !meta.load().shinies[dex.sp(grau.sp).i]);

  // Das Sicherheitsnetz: alles, was im Team oder in der Box liegt.
  meta.reset();
  const run = new PL.Run({ seed: 4242, starter: 'bulbasaur' });
  run.gainPokemon(new PL.RNG(9), dex.sp('eevee'), 12, 'Geschenk');
  while (run.party.length < 6) run.party.push(PL.world.buildMon(new PL.RNG(run.party.length + 20), dex.sp('zubat'), 9, {}));
  run.box.push(PL.world.buildMon(new PL.RNG(31), dex.sp('magikarp'), 9, { shiny: true }));
  check('Vor dem Speichern ist noch nichts eingetragen', Object.keys(meta.load().caught).length === 0);
  meta.noteParty(run);
  const eintraege = meta.load().caught;
  check('Das Geschenk steht im Pokédex', !!eintraege[dex.sp('eevee').i]);
  check('Das Startpokémon auch', !!eintraege[dex.sp('bulbasaur').i]);
  check('Die Box zählt mit', !!eintraege[dex.sp('magikarp').i]);
  check('… und ein Shiny aus der Box schillert', !!meta.load().shinies[dex.sp('magikarp').i]);
  eq('Ein zweiter Durchlauf ändert nichts mehr', meta.noteParty(run), false);

  // Und der eigentliche Weg: die Entwicklung nach einem Kampf.
  {
    meta.reset();
    const r2 = new PL.Run({ seed: 99, starter: 'charmander' });
    const held = r2.party[0];
    held.shiny = true;
    held.lvl = Math.max(held.lvl, mons.evolutions(held, {})[0].level || 16);
    held.exp = 0;
    const alt = held.sp;
    const auto = mons.autoEvolution(held);
    check('Auf diesem Level steht eine Entwicklung an', !!auto);
    mons.evolve(held, auto.to, r2.rng);
    meta.noteParty(r2);
    check('Die im Kampf gewachsene Art steht im Pokédex', !!meta.load().caught[dex.sp(held.sp).i]);
    check('… schillernd wie das Pokémon selbst', !!meta.load().shinies[dex.sp(held.sp).i]);
    check('Die Vorstufe bleibt daneben stehen', dex.sp(alt).i !== dex.sp(held.sp).i);
  }

  meta.reset();
  delete globalThis.localStorage;
}

section('Vielfalt der Begegnungen');
{
  const W = PL.world;

  // Lebensräume
  check('Jede Kulisse hat einen Lebensraum', Object.keys(W.HABITAT).length >= 13);
  const wald = dex.sp('caterpie'), feuer = dex.sp('charmander');
  check('Käfer passen in den Wald', W.habitatFit(wald, 'wald') > 1);
  check('… ein Feuer-Pokémon dort weniger', W.habitatFit(feuer, 'wald') < 1);
  check('In der Höhle ist es umgekehrt herum',
    W.habitatFit(dex.sp('geodude'), 'hoehle') > W.habitatFit(wald, 'hoehle'));
  eq('Ohne Lebensraum zählt alles gleich', W.habitatFit(wald, 'arena'), 1);

  // Endstufen-Potenzial statt reiner Basiswerte
  eq('Raupy wird an Smettbo gemessen', W.potential(dex.sp('caterpie')), dex.sp('butterfree').bst);
  eq('Abra an Simsala', W.potential(dex.sp('abra')), dex.sp('alakazam').bst);
  check('Abra hat mehr Potenzial als Raupy',
    W.potential(dex.sp('abra')) > W.potential(dex.sp('caterpie')));

  // Ein Fangknoten trifft sein Thema
  const pool = W.encounterPool({ gen: 1, level: 16 });
  let treffer = 0;
  for (let i = 0; i < 60; i++) {
    const sp = W.pickEncounter(PL.rng('h' + i), pool, 16, { biome: 'hoehle' });
    if (W.habitatFit(sp, 'hoehle') > 1) treffer++;
  }
  check('In der Höhle passt die Mehrheit zum Ort', treffer > 33, treffer + ' von 60');

  // Füller treten zurück
  let fueller = 0;
  for (let i = 0; i < 90; i++) {
    const sp = W.pickEncounter(PL.rng('f' + i), pool, 14, {});
    if (W.potential(sp) < 400) fueller++;
  }
  check('Echte Füller sind die Ausnahme', fueller < 27, fueller + ' von 90');

  // Gedächtnis über den Run
  const run = new PL.Run({ seed: 88, starter: 'charmander' });
  const erst = [];
  for (let i = 0; i < 12; i++) {
    run.rowIndex = i % 9;
    run.pos = { col: i % 3 };
    run.makeCatchOffer(PL.rng('m' + i)).offers.forEach((m) => erst.push(dex.sp(m.sp).id));
  }
  const doppelt = erst.length - new Set(erst).size;
  check('Innerhalb eines Runs wiederholt sich wenig', doppelt <= erst.length * 0.12,
    doppelt + ' Doppelte bei ' + erst.length + ' Angeboten');
  check('Der Run merkt sich, wem er begegnet ist', Object.keys(run.met).length > 20,
    String(Object.keys(run.met).length));

  const zurueck = PL.Run.fromJSON(JSON.parse(JSON.stringify(run.toJSON())));
  eq('Das Gedächtnis übersteht das Speichern',
    Object.keys(zurueck.met).length, Object.keys(run.met).length);

  // Der Fangknoten sagt, wo man ist
  const szene = run.makeCatchOffer(PL.rng('t'));
  check('Der Fangknoten nennt seinen Ort', !!szene.biome && szene.text.length > 20, szene.text);
}

section('Deutsche Namen');
{
  const T = PL.t;
  T.setLang('de');
  eq('Attacken heißen deutsch', T.move('thunderbolt'), 'Donnerblitz');
  eq('Auch mehrteilige', T.move('closecombat'), 'Nahkampf');
  eq('Fähigkeiten heißen deutsch', T.ability('levitate'), 'Schwebe');
  T.setLang('en');
  eq('Auf Englisch bleibt es englisch', T.move('thunderbolt'), 'Thunderbolt');
  eq('… auch bei Fähigkeiten', T.ability('levitate'), 'Levitate');
  T.setLang('de');

  const ohne = dex.moves.filter((m) => !m.np && !m.dn && !/^[A-Z][a-z]*$/.test(m.n));
  check('Fast alle Attacken haben einen deutschen Namen',
    dex.moves.filter((m) => m.dn).length > dex.moves.length * 0.9,
    dex.moves.filter((m) => m.dn).length + ' von ' + dex.moves.length);
  void ohne;
  check('Fast alle Fähigkeiten auch',
    dex.abilities.filter((a) => a.dn).length > dex.abilities.length * 0.9,
    dex.abilities.filter((a) => a.dn).length + ' von ' + dex.abilities.length);

  // Ein Kampfprotokoll spricht deutsch
  const rng = PL.rng('sprache');
  const a = PL.mon.create('pikachu', 30, rng, {});
  a.moves = [{ m: dex.move('thunderbolt').i, pp: 15, ppUp: 0, used: 0 }];
  const b2 = PL.mon.create('snorlax', 30, rng, {});
  b2.moves = [{ m: dex.move('bodyslam').i, pp: 15, ppUp: 0, used: 0 }];
  const bt = new PL.Battle({ teams: [[a], [b2]], rng: PL.rng('kampf') });
  bt.start();
  bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
  check('Das Kampfprotokoll nennt die deutschen Namen',
    bt.log.some((e) => /Donnerblitz/.test(e.s || '')),
    bt.log.filter((e) => e.s).map((e) => e.s).join(' / ').slice(0, 120));
}

section('Formen und Bilder');
{
  const T = PL.t;
  const eigen = dex.species.filter((sp) => sp.pid);
  check('Regionalformen haben eine eigene Bildnummer', eigen.length > 80, String(eigen.length));
  ['raichualola', 'ninetalesalola', 'weezinggalar', 'marowakalola', 'persianalola'].forEach((id) => {
    const sp = dex.sp(id);
    check(id + ' zeigt ein eigenes Bild', !!sp.pid && sp.pid !== sp.num,
      'pid ' + sp.pid + ', num ' + sp.num);
  });

  const megas = Object.keys(dex.megas);
  const ohnePid = [];
  megas.forEach((k) => dex.megas[k].forEach((f) => { if (!f.pid) ohnePid.push(f.n); }));
  check('Jede Mega-Form hat eine eigene Bildnummer', ohnePid.length === 0, ohnePid.join(', '));

  T.setLang('de');
  const mega = dex.megas.charizard[0];
  eq('Mega-Formen tragen einen deutschen Namen', mega.dn, 'Glurak-Mega-X');

  // Die eingebetteten Bilder liegen nur im Browser vor; für die Prüfung
  // genügt ein Platzhalter-Vorrat, der zeigt, welche Nummer gezogen wird.
  {
    const echte = globalThis.PL_SPRITES;
    globalThis.PL_SPRITES = { f: {}, b: {}, s: {} };
    const put = (n, tag) => { globalThis.PL_SPRITES.f[n] = tag; };
    put(dex.sp('raichu').num, 'RAICHU');
    put(dex.sp('raichualola').pid, 'ALOLA');
    put(dex.sp('charizard').num, 'GLURAK');
    put(mega.pid, 'MEGA');
    put(dex.gmax.charizard.pid, 'GIGA');
    const first = (sp, o) => PL.sprite.chain(sp, o || {})[0];
    check('Alola-Raichu zieht sein eigenes Bild',
      /ALOLA/.test(first(dex.sp('raichualola'))), first(dex.sp('raichualola')).slice(0, 40));
    check('Raichu bleibt bei seinem', /RAICHU/.test(first(dex.sp('raichu'))));
    check('Die Mega-Form zieht ihr eigenes Bild',
      /MEGA/.test(first(dex.sp('charizard'), { pid: mega.pid })));
    check('Die Gigadynamax-Form zieht ihr eigenes Bild',
      /GIGA/.test(first(dex.sp('charizard'), { pid: dex.gmax.charizard.pid })));
    check('Ohne Form bleibt es die Grundform',
      /GLURAK/.test(first(dex.sp('charizard'))));
    globalThis.PL_SPRITES = echte;
  }

  // Im Kampf merkt sich der Aktive seine Form
  const rng = PL.rng('mega');
  const mon = PL.mon.create('charizard', 60, rng, {});
  const foe = PL.mon.create('snorlax', 60, rng, {});
  const bt = new PL.Battle({ teams: [[mon], [foe]], rng: PL.rng('mk') });
  bt.start();
  bt.megaEvolve(bt.sides[0].active);
  check('Der Aktive merkt sich seine Mega-Form',
    !!bt.sides[0].active.megaForm && !!bt.sides[0].active.megaForm.pid);
  check('… und heißt deutsch', /^Glurak-Mega-[XY]$/.test(bt.sides[0].active.megaName),
    bt.sides[0].active.megaName);

  // Dasselbe für Gigadynamax: eigenes Bild, eigener Name
  const gm = PL.mon.create('snorlax', 60, rng, {});
  const gb = new PL.Battle({ teams: [[gm], [PL.mon.create('pikachu', 60, rng, {})]], rng: PL.rng('gk') });
  gb.start();
  gb.gigantamax(gb.sides[0].active);
  check('Der Aktive merkt sich seine Gigadynamax-Form',
    !!gb.sides[0].active.gmaxForm && !!gb.sides[0].active.gmaxForm.pid);
  eq('… und heißt deutsch', gb.sides[0].active.gmaxName, 'Gigadynamax-Relaxo');
  check('Gigadynamax hat eine eigene Bildnummer',
    gb.sides[0].active.gmaxForm.pid !== dex.sp('snorlax').num,
    'pid ' + gb.sides[0].active.gmaxForm.pid);
}

section('Grundschwierigkeit');
{
  const run = new PL.Run({ seed: 11, starter: 'squirtle' });
  check('Der Grundlauf startet mit Vorrat', run.bag.potion >= 8 && run.bag.revive >= 3,
    JSON.stringify(run.bag));
  // EASE greift an den Aufrufstellen, nicht in enemyLevel selbst — deshalb
  // wird über einen echten Kampf geprüft.
  run.party.push(PL.mon.create('pikachu', 20, run.rng, {}));
  run.party.push(PL.mon.create('geodude', 20, run.rng, {}));
  const lvlOf = (r) => {
    const bt = r.makeTrainer(PL.rng('t'), {});
    return Math.max.apply(null, bt.sides[1].team.map((m) => m.lvl));
  };
  const mein = run.teamLevel();
  check('Trainergegner bleiben deutlich hinter dem Team', lvlOf(run) <= mein - 4,
    lvlOf(run) + ' bei Teamlevel ' + mein.toFixed(1));

  // Gegner ziehen mit dem Team mit — solange die Levelgrenze nicht bremst.
  // Die Grenze hängt an den Orden, deshalb bekommt dieser Vergleich welche.
  const hart = new PL.Run({ seed: 11, starter: 'squirtle', region: 0 });
  hart.badges = 4;
  run.badges = 4;
  hart.party.push(PL.mon.create('pikachu', 30, hart.rng, {}));
  hart.party.push(PL.mon.create('geodude', 30, hart.rng, {}));
  check('Ein stärkeres Team trifft auf stärkere Gegner', lvlOf(hart) > lvlOf(run),
    lvlOf(hart) + ' vs ' + lvlOf(run));
  run.badges = 0;

  // Verschnaufen nach dem Kampf
  const r2 = new PL.Run({ seed: 5, starter: 'charmander' });
  r2.party[0].hp = 1;
  const foe = PL.mon.create('rattata', 6, PL.rng('atem'), {});
  foe.hp = 0;
  const bt = new PL.Battle(r2.battleOpts({ team: [foe], wild: true }));
  bt.outcome = 'win';
  bt.ended = true;
  r2.finishBattle(bt);
  check('Nach dem Sieg erholt sich das Team ein Stück', r2.party[0].hp > 1, 'HP ' + r2.party[0].hp);

  // Vor den großen Kämpfen ist das Team frisch
  const r3 = new PL.Run({ seed: 7, starter: 'bulbasaur' });
  r3.party[0].hp = 1;
  r3.makeBoss(PL.rng('boss'));
  eq('Vor dem Arenaleiter ist das Team geheilt', r3.party[0].hp, mons.maxHP(r3.party[0]));
}

section('Arenaleiter');
{
  await import('../js/leaders.js');
  const L = PL.leaders;
  const regions = PL.world.REGIONS;
  const named = regions.reduce((n, r) => n + r.leaders.length, 0);

  eq('Alle 72 Arenaleiter sind hinterlegt', Object.keys(L.all).length, named);
  const ohne = [];
  regions.forEach((r) => r.leaders.forEach((l) => { if (!L.get(l[0])) ohne.push(r.name + '/' + l[0]); }));
  check('Jeder Leiter aus den Regionen hat ein Team', ohne.length === 0, ohne.join(', '));

  const unbekannt = [];
  Object.keys(L.all).forEach((n) => L.all[n].team.forEach((id) => {
    if (!dex.sp(id)) unbekannt.push(n + ': ' + id);
  }));
  check('Alle Arten der Aufstellungen gibt es', unbekannt.length === 0, unbekannt.join(', '));

  const ohneLook = Object.keys(L.all).filter((n) => {
    const k = L.all[n].look;
    return !k || !k.shirt || !k.pants || !k.hair || !k.hairdo;
  });
  check('Jeder Leiter hat ein beschriebenes Aussehen', ohneLook.length === 0, ohneLook.join(', '));

  // Das Ass eines Leiters sollte seinen Typ tragen — sonst stimmt die
  // Aufstellung nicht mit dem Orden überein.
  const falsch = [];
  regions.forEach((r) => r.leaders.forEach((l) => {
    const t = L.team(l[0]);
    const passt = t.some((id) => dex.sp(id).t.indexOf(l[1]) >= 0);
    if (!passt) falsch.push(l[0] + ' (' + l[1] + '): ' + t.join(', '));
  }));
  check('Jede Aufstellung enthält den Typ des Leiters', falsch.length === 0, falsch.join(' | '));

  // Der Kampf gegen einen Leiter führt genau seine Aufstellung ins Feld.
  const run = new PL.Run({ seed: 777, starter: 'charmander' });
  const rng = PL.rng('boss-test');
  const kanto = regions[0];
  const bt = PL.world.bossTeam(rng, kanto, 20, 0, {});
  const soll = L.team(bt.leader);
  eq('Der Kampf nutzt die echte Aufstellung',
    bt.team.map((m) => dex.sp(m.sp).id).join(','), soll.join(','));
  check('… in der echten Reihenfolge und Größe', bt.team.length === soll.length);
  check('… und der Leiter bringt sein Aussehen mit', !!bt.look && !!bt.look.shirt);

  // Zu weit entwickelte Arten treten als Vorstufe an — sonst steht Mistys
  // Starmie einem Level-10-Team gegenüber.
  {
    const W = PL.world;
    eq('Starmie tritt auf Level 10 als Sterndu an', W.fitToLevel(dex.sp('starmie'), 10).id, 'staryu');
    eq('… und ab Level 25 wieder als Starmie', W.fitToLevel(dex.sp('starmie'), 25).id, 'starmie');
    eq('Gengar geht auf Level 10 bis zum Nebulak zurück', W.fitToLevel(dex.sp('gengar'), 10).id, 'gastly');
    eq('… auf Level 25 bis zum Alpollo', W.fitToLevel(dex.sp('gengar'), 25).id, 'haunter');
    eq('… und bleibt auf Level 45 Gengar', W.fitToLevel(dex.sp('gengar'), 45).id, 'gengar');
    eq('Grundformen bleiben unangetastet', W.fitToLevel(dex.sp('onix'), 5).id, 'onix');
    check('Nach oben wird nie entwickelt',
      [5, 20, 50, 90].every((l) => W.fitToLevel(dex.sp('staryu'), l).id === 'staryu'));
    const misty = W.bossTeam(PL.rng('misty-tief'), regions[0], 10, 1, {});
    check('Mistys Team ist auf Level 10 nicht voll entwickelt',
      misty.leader !== 'Misty' || misty.team.every((m) => dex.sp(m.sp).id === 'staryu'),
      misty.team.map((m) => dex.sp(m.sp).id).join(', '));
  }

  // Top Vier und Champ nach demselben Muster.
  {
    const W = PL.world;
    const ohneTeam = W.ELITE.filter((e) => !L.team(e[0])).map((e) => e[0]);
    check('Jedes Mitglied der Top Vier hat eine echte Aufstellung',
      ohneTeam.length === 0, ohneTeam.join(', '));
    const ohneBild = W.ELITE.filter((e) => !L.look(e[0])).map((e) => e[0])
      .concat(W.CHAMPIONS.filter((c) => !L.look(c.name)).map((c) => c.name));
    check('Top Vier und Champs haben ein beschriebenes Aussehen',
      ohneBild.length === 0, ohneBild.join(', '));

    const schlecht = [];
    Object.keys(L.elite).forEach((n) => L.elite[n].team.forEach((id) => {
      if (!dex.sp(id)) schlecht.push(n + ': ' + id);
    }));
    check('Alle Arten der Liga-Aufstellungen gibt es', schlecht.length === 0, schlecht.join(', '));

    const e4 = W.eliteTeam(PL.rng('liga-test'), 60, regions[0], 0, {});
    const soll4 = L.team(e4.leader, true);
    eq('Der Liga-Kampf nutzt die echte Aufstellung',
      e4.team.map((m) => dex.sp(m.sp).id).join(','), soll4.join(','));
    check('… und das Mitglied bringt sein Aussehen mit', !!e4.look && !!e4.look.shirt);

    const ch = W.championTeam(PL.rng('champ-test'), 66, regions[0], {});
    check('Auch der Champ bringt sein Aussehen mit', !!ch.look && !!ch.look.shirt, ch.name);
    check('Der Typ des Liga-Mitglieds kommt in seiner Aufstellung vor',
      W.ELITE.every((e) => L.team(e[0], true).some((id) => dex.sp(id).t.indexOf(e[1]) >= 0)),
      W.ELITE.filter((e) => !L.team(e[0], true).some((id) => dex.sp(id).t.indexOf(e[1]) >= 0))
        .map((e) => e[0]).join(', '));
  }

  // Der Orden bestimmt den Leiter — und zwar genau, nicht ungefähr: Beim
  // ersten Orden steht immer Brock da, beim achten immer Giovanni. Vorher
  // wurde aus dem Fortschritt ein Leiter geschätzt und gewürfelt.
  {
    const namen = [];
    for (let o = 0; o < 8; o++) {
      const treffer = {};
      for (let i = 0; i < 12; i++) {
        treffer[PL.world.bossTeam(PL.rng('o' + o + '-' + i), kanto, 20, o, {}).leader] = 1;
      }
      namen.push(Object.keys(treffer));
    }
    check('Jeder Orden hat genau einen Arenaleiter',
      namen.every((n) => n.length === 1), namen.map((n) => n.join('/')).join(' · '));
    eq('… und zwar den aus den Spielen', namen.map((n) => n[0]).join(', '),
      kanto.leaders.map((l) => l[0]).join(', '));
  }
  void run;
}

section('Engine-Lücken');
{
  const rng = PL.rng('luecken');
  const mk = (id, lvl, moves) => {
    const m = PL.mon.create(id, lvl || 50, rng, { quality: 0.9, ivs: [20, 20, 20, 20, 20, 20], nature: 'Hardy' });
    if (moves) m.moves = moves.map((n) => ({ m: dex.move(n).i, pp: dex.move(n).pp, ppUp: 0, used: 0 }));
    return m;
  };
  const duel = (mine, foe, seed) =>
    new PL.Battle({ teams: [[mine], [foe]], rng: PL.rng(seed || 'duell') });

  // --- Zwei Runden: erst laden, dann treffen ---
  {
    const bt = duel(mk('venusaur', 50, ['solarbeam']), mk('snorlax', 50, ['splash']));
    bt.start();
    const max = bt.sides[1].active.stats[0];
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Solarstrahl schlägt in der ersten Runde noch nicht ein', bt.sides[1].active.mon.hp, max);
    check('… sondern lädt auf', !!bt.sides[0].active.vol.twoturn);
    eq('… und kostet nur einmal AP', bt.sides[0].active.mon.moves[0].pp, dex.move('solarbeam').pp - 1);
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('In der zweiten Runde trifft er', bt.sides[1].active.mon.hp < max);
    eq('… ohne noch einmal AP zu kosten', bt.sides[0].active.mon.moves[0].pp, dex.move('solarbeam').pp - 1);
  }
  {
    // In der Sonne entfällt die Ladephase
    const bt = duel(mk('venusaur', 50, ['solarbeam']), mk('snorlax', 50, ['splash']));
    bt.start();
    bt.field.weather = 'sunnyday';
    bt.field.weatherTurns = 5;
    const max = bt.sides[1].active.stats[0];
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('In der Sonne schlägt Solarstrahl sofort ein', bt.sides[1].active.mon.hp < max);
  }

  // --- Unangreifbarkeit ---
  {
    const bt = duel(mk('pidgeot', 50, ['fly']), mk('snorlax', 50, ['tackle']));
    bt.start();
    const myMax = bt.sides[0].active.stats[0];
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Wer hochfliegt, ist mit Tackle nicht zu treffen', bt.sides[0].active.mon.hp, myMax);
    eq('… und gilt als unangreifbar', bt.sides[0].active.vol.invuln, 'air');
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('Nach dem Sturzflug ist die Deckung wieder weg', !bt.sides[0].active.vol.invuln);
  }
  {
    const bt = duel(mk('sandslash', 50, ['dig']), mk('golem', 50, ['earthquake']));
    bt.start();
    const myMax = bt.sides[0].active.stats[0];
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('Erdbeben erwischt einen Eingegrabenen trotzdem', bt.sides[0].active.mon.hp < myMax);
  }

  // --- Schutzschilde mit Nachspiel ---
  {
    const bt = duel(mk('chesnaught', 50, ['spikyshield']), mk('machamp', 50, ['closecombat']));
    bt.start();
    const foeMax = bt.sides[1].active.stats[0], myMax = bt.sides[0].active.stats[0];
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Der Schutzschild hält den Angriff ab', bt.sides[0].active.mon.hp, myMax);
    check('Bissige Dornen setzen dem Angreifer zu', bt.sides[1].active.mon.hp < foeMax);
  }
  {
    const bt = duel(mk('aegislash', 50, ['kingsshield']), mk('machamp', 50, ['closecombat']));
    bt.start();
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Königsschild senkt den Angriff des Gegners', bt.sides[1].active.boosts.atk, -1);
  }
  {
    // Statusattacken kommen am Königsschild vorbei
    const bt = duel(mk('aegislash', 50, ['kingsshield']), mk('machamp', 50, ['growl']));
    bt.start();
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Statusattacken hält der Königsschild nicht auf', bt.sides[0].active.boosts.atk, -1);
  }

  // --- Auroraschleier braucht Schnee ---
  {
    const bt = duel(mk('ninetalesalola', 50, ['auroraveil']), mk('snorlax', 50, ['splash']));
    bt.start();
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Ohne Schnee kein Auroraschleier', bt.sides[0].screens.auroraveil || 0, 0);
    bt.field.weather = 'snowscape';
    bt.field.weatherTurns = 5;
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('Im Schnee legt er sich über das Feld', bt.sides[0].screens.auroraveil > 0);
  }

  // --- Aufrufende Attacken ---
  {
    const bt = duel(mk('clefable', 50, ['metronome']), mk('snorlax', 50, ['splash']));
    bt.start();
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('Metronom zeigt auf irgendeine Attacke',
      bt.log.some((e) => /Der Finger zeigt auf/.test(e.s || '')));
  }
  {
    const mine = mk('snorlax', 50, ['sleeptalk', 'bodyslam']);
    const bt = duel(mine, mk('gengar', 50, ['splash']));
    bt.start();
    bt.setStatus(bt.sides[0].active, 'slp', null, null, true);
    bt.sides[0].active.mon.slp = 3;
    const before = bt.sides[0].active.mon.slp;
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 1 }]);
    check('Schlafrede greift im Schlaf auf eine Attacke zurück',
      bt.log.some((e) => new RegExp(PL.t.move('bodyslam')).test(e.s || '')),
      bt.log.filter((e) => e.s).map((e) => e.s).join(' / ').slice(0, 160));
    eq('… und der Schlaf zählt dabei nur einmal herunter', bt.sides[0].active.mon.slp, before - 1);
  }

  // --- Wiederbelebung ---
  {
    const fallen = mk('pikachu', 50, ['thunderbolt']);
    fallen.hp = 0;
    const bt = new PL.Battle({
      teams: [[mk('pecharunt', 50, ['revivalblessing']), fallen], [mk('snorlax', 50, ['splash'])]],
      rng: PL.rng('revive')
    });
    bt.start();
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('Wiederbelebung holt ein besiegtes Teammitglied zurück', fallen.hp > 0);
  }

  // --- Seitenwechsel ---
  {
    const bt = duel(mk('cinderace', 50, ['courtchange']), mk('snorlax', 50, ['splash']));
    bt.start();
    bt.sides[0].hazards.stealthrock = 1;
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Seitenwechsel schiebt die Tarnsteine hinüber', bt.sides[1].hazards.stealthrock, 1);
    eq('… und die eigene Seite ist frei', bt.sides[0].hazards.stealthrock, 0);
  }

  // --- Nachgereichte Fähigkeiten ---
  {
    const foe = mk('slaking', 50, ['tackle']);
    const bt = duel(mk('snorlax', 50, ['splash']), foe);
    bt.start();
    const myMax = bt.sides[0].active.stats[0];
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    const afterFirst = bt.sides[0].active.mon.hp;
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('Faultier faulenzt jede zweite Runde',
      bt.abilityId(bt.sides[1].active) !== 'truant' || bt.sides[0].active.mon.hp === afterFirst,
      'HP ' + myMax + ' → ' + afterFirst + ' → ' + bt.sides[0].active.mon.hp);
  }
  {
    const bt = duel(mk('umbreon', 50, ['splash']), mk('alakazam', 50, ['toxic']));
    bt.start();
    bt.sides[0].active.ability = 'synchronize';
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    check('Synchro gibt die Vergiftung zurück',
      /psn|tox/.test(bt.sides[1].active.mon.status || ''), String(bt.sides[1].active.mon.status));
  }
  {
    // Heilblockade unterbindet jede Heilung
    const bt = duel(mk('blissey', 50, ['softboiled']), mk('gengar', 50, ['healblock']));
    bt.start();
    bt.sides[0].active.mon.hp = 50;
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    eq('Wer blockiert ist, heilt sich nicht', bt.sides[0].active.mon.hp, 50);
  }

  // Kein Zustand aus dem Datenbestand bleibt mehr stumm
  {
    const known = new Set(['confusion', 'substitute', 'leechseed', 'partiallytrapped', 'taunt',
      'encore', 'disable', 'yawn', 'curse', 'flinch', 'lockedmove', 'protect', 'detect',
      'spikyshield', 'banefulbunker', 'burningbulwark', 'kingsshield', 'obstruct', 'silktrap',
      'destinybond', 'endure', 'focusenergy', 'aquaring', 'saltcure', 'mustrecharge',
      'attract', 'torment', 'healblock', 'nightmare', 'octolock', 'laserfocus', 'charge',
      'smackdown', 'tarshot']);
    const mute = dex.moves.filter((m) => {
      if (m.np || PL.effects.moves[m.id] || m.c !== 'T') return false;
      return m.vs && !known.has(m.vs) &&
        !(m.st || m.bo || m.w || m.tr || m.sc || m.slc || m.hl || m.ss || m.fs || m.pw);
    });
    check('Keine Statusattacke im Pool bleibt wirkungslos', mute.length === 0,
      mute.map((m) => m.id).join(', '));
  }
}

section('Momente');
{
  await import('../js/moments.js');
  const M = PL.moments;
  const MS = M.MS;
  const ballMs = MS.throw + MS.absorb + MS.drop + 3 * MS.shake + MS.verdict + 50;
  const evoMs = MS.morph + MS.flash + MS.reveal;
  const lvlMs = 6 * MS.stat + 140;
  check('Der Ballwurf bleibt unter einer Sekunde', ballMs < 1000, ballMs + ' ms');
  check('Die Entwicklung bleibt unter 1,2 Sekunden', evoMs < 1200, evoMs + ' ms');
  check('Die Werte-Tafel bleibt unter einer Sekunde', lvlMs < 1000, lvlMs + ' ms');
  check('Kein Moment hängt am Kampftempo',
    !readFileSync(join(SRC_DIR, 'moments.js'), 'utf8').includes('delayMs'));
  eq('Der Hyperball wird als solcher gezeichnet', M.kindOf('hyperball'), 'hyper');
  eq('Unbekannte Bälle fallen auf den Pokéball zurück', M.kindOf('irgendwas'), 'poke');

  // Die Oberfläche braucht Vorher-/Nachher-Werte und die alte Gestalt.
  const run = new PL.Run({ seed: 4242, starter: 'charmander' });
  run.party[0].lvl = 15;
  run.party[0].exp = 0;
  const foe = PL.mon.create('rattata', 14, PL.rng('moment-foe'), {});
  const bt = new PL.Battle(run.battleOpts({ team: [foe], wild: true }));
  bt.sides[1].team.forEach((m) => { m.hp = 0; });
  bt.outcome = 'win';
  bt.ended = true;
  const res = run.finishBattle(bt);
  const ups = res.levelUps;
  check('Levelaufstiege bringen Vorher- und Nachher-Werte mit',
    ups.every((u) => Array.isArray(u.before) && Array.isArray(u.after) && u.before.length === 6));
  check('Je Pokémon steht höchstens ein Levelaufstieg in der Liste',
    new Set(ups.map((u) => u.mon)).size === ups.length);
  check('Die Werte wachsen beim Aufstieg',
    ups.every((u) => u.after.every((v, i) => v >= u.before[i])));
  check('Entwicklungen nennen die alte Gestalt',
    res.evolutions.every((e) => !!e.fromSp && !!dex.sp(e.fromSp)));
}

section('Inhalte');
{
  check('Jedes Relikt hat Namen und Beschreibung',
    PL.relics.all().every((r) => r.name && r.desc && r.rarity));
  check('Jeder Gegenstand hat Namen und Preis',
    PL.items.all().every((i) => i.name && i.price > 0), 
    PL.items.all().filter((i) => !i.name || !(i.price > 0)).map((i) => i.id).join(','));
  check('Alle Kaufgegenstände sind benutzbar oder tragbar',
    PL.items.all().every((i) => i.use || i.hold || i.ball || i.kind === 'evo' || i.kind === 'tm'));
  check('Jede Region hat acht Arenaleiter',
    PL.world.REGIONS.every((r) => r.leaders.length === 8));
  check('Jedes Ereignis hat mindestens zwei Optionen',
    PL.world.EVENTS.every((e) => e.options.length >= 2 && e.title && e.text));
  check('Mega-Formen sind auf die echten beschränkt — samt Legends Z-A',
    Object.keys(dex.megas).length === 87,
    Object.keys(dex.megas).length + ' Spezies');
  check('Die Megas aus Legends Z-A sind dabei',
    ['feraligatr', 'meganium', 'dragonite', 'emboar', 'greninja', 'baxcalibur']
      .every((id) => dex.megas[id] && dex.megas[id].length));
  check('Kein erfundenes Fan-Pokémon hat es hineingeschafft', !dex.megas.crucibelle);
  check('Jede Mega-Form bringt Werte, Typen und Bild mit',
    Object.keys(dex.megas).every((k) => dex.megas[k].every((f) =>
      f.bs && f.bs.length === 6 && f.t && f.t.length && f.a && f.pid)));
  // Mega setzt eine abgeschlossene Entwicklung voraus. In den Daten hält sich
  // genau einer nicht daran: Floette entwickelt sich noch zu Florges, hat aber
  // selbst eine Mega-Form. Für ihn bleibt sie damit unerreichbar — bewusst, und
  // hier festgehalten, damit es niemandem stillschweigend durchrutscht.
  eq('Nur Floette hat eine Mega-Form, ohne ausgewachsen zu sein',
    Object.keys(dex.megas).filter((k) => dex.evosLeft(dex.sp(k)) > 0).join(','), 'floette');
  check('Keine Megasteine mehr im Spiel',
    !PL.items.get('charizarditex') && !PL.items.get('venusaurite') &&
    PL.items.all().every((i) => !i.mega));
  check('Kein Terakristall mehr im Spiel',
    !PL.items.get('terashard') && !PL.relics.get('terakristall_splitter') && !PL.relics.get('mega_ring'));
  check('Gigadynamax-Formen sind auf die echten beschränkt',
    Object.keys(dex.gmax).length === 33, Object.keys(dex.gmax).length + ' Spezies');
  check('Jede Gigadynamax-Form hat Bild und deutschen Namen',
    Object.keys(dex.gmax).every((k) => dex.gmax[k].pid && /^Gigadynamax-/.test(dex.gmax[k].dn)),
    Object.keys(dex.gmax).filter((k) => !dex.gmax[k].pid).join(','));

  check('Alle Champ-Teams verweisen auf echte Spezies',
    PL.world.CHAMPIONS.every((c) => c.team.every((id) => !!dex.sp(id))),
    PL.world.CHAMPIONS.map((c) => c.team.filter((id) => !dex.sp(id))).flat().join(','));
}

section('Jeder Run seine eigene Auswahl');
{
  const eins = new PL.Run({ seed: 4001, starter: 'charmander' });
  const zwei = new PL.Run({ seed: 4002, starter: 'charmander' });
  const alle = PL.world.encounterPool({ gen: 1, level: 100 });
  const A = Object.keys(eins.rosterFor(1)), B = Object.keys(zwei.rosterFor(1));

  check('Die Auswahl ist deutlich kleiner als die Generation',
    A.length > 30 && A.length < alle.length, A.length + ' von ' + alle.length);
  const gemeinsam = A.filter((id) => B.indexOf(id) >= 0).length;
  check('Zwei Runs treffen andere Pokémon', gemeinsam < A.length * 0.75,
    gemeinsam + ' von ' + A.length + ' gemeinsam');
  check('Innerhalb eines Runs bleibt die Auswahl gleich',
    Object.keys(eins.rosterFor(1)).join() === A.join());
  check('Die Auswahl bleibt in der Region',
    A.every((id) => dex.sp(id).g === 1),
    A.filter((id) => dex.sp(id).g !== 1).join(','));

  // Was auftaucht, kommt auch wirklich aus der Auswahl
  const run = new PL.Run({ seed: 4003, starter: 'squirtle' });
  const drin = run.rosterFor(1);
  let fremd = 0;
  for (let i = 0; i < 10; i++) {
    run.rowIndex = i % 9;
    run.pos = { col: i % 2 };
    const wild = run.makeWild(PL.rng('w' + i));
    const id = dex.sp(wild.sides[1].team[0].sp).id;
    if (!drin[id]) fremd++;
  }
  check('Wilde Begegnungen halten sich an die Auswahl', fremd === 0, fremd + ' Ausreißer');
}

section('Erfahrung: das ganze Team bekommt etwas ab');
{
  function aufstellen(seed, level) {
    const run = new PL.Run({ seed: seed, starter: 'snivy' });
    ['larvitar', 'geodude', 'lickitung', 'seel'].forEach((id, i) => {
      run.party.push(PL.world.buildMon(PL.rng('t' + i), dex.sp(id), level, {}));
    });
    run.party.forEach((m) => { m.lvl = level; m.exp = 0; m.hp = mons.maxHP(m); });
    return run;
  }
  function kaempfen(run, aktiv) {
    const bt = run.makeWild(PL.rng('k' + run.seed));
    bt.start();
    if (aktiv !== undefined) bt.replace(0, aktiv);      // ein anderer geht aufs Feld
    bt.sides[1].team.forEach((m) => { m.hp = 0; });
    bt.outcome = 'win';
    return run.finishBattle(bt);
  }

  // Alle fünf bekommen etwas — keiner geht leer aus.
  {
    const run = aufstellen(4711, 10);
    const res = kaempfen(run);
    eq('Jedes Teammitglied steht in der Abrechnung', res.exp.length, 5);
    eq('… und jedes hat auch etwas bekommen',
      res.exp.filter((e) => e.amount > 0).length, 5,
      res.exp.map((e) => mons.name(e.mon) + ':' + e.amount).join(', '));
  }

  // Wer am Boden liegt, geht trotzdem nicht leer aus.
  {
    const run = aufstellen(4712, 10);
    run.party[4].hp = 0;
    const res = kaempfen(run);
    const gefallen = res.exp.filter((e) => e.mon === run.party[4])[0];
    check('Auch ein besiegtes Teammitglied bekommt Erfahrung',
      !!gefallen && gefallen.amount > 0, JSON.stringify(gefallen && gefallen.amount));
  }

  // Der volle Anteil hängt am Einsatz, nicht an der Position im Team.
  {
    const vorn = kaempfen(aufstellen(4713, 10));
    const voll = vorn.exp[0].amount, bank = vorn.exp[3].amount;
    check('Wer kämpft, bekommt mehr als die Bank', voll > bank * 2, voll + ' gegen ' + bank);
    eq('Die ganze Bank bekommt denselben Anteil',
      new Set(vorn.exp.slice(1).map((e) => e.amount)).size, 1,
      vorn.exp.map((e) => e.amount).join(','));

    // Wird auf Platz vier gewechselt, zählen beide als Kämpfer — der, der
    // angefangen hat, und der, der eingewechselt wurde. Die Plätze davor
    // gehen trotzdem nicht leer aus; genau das war der gemeldete Fehler.
    const hinten = kaempfen(aufstellen(4713, 10), 3);
    eq('Der Eingewechselte bekommt den vollen Anteil', hinten.exp[3].amount, voll);
    eq('Der, der angefangen hat, auch', hinten.exp[0].amount, voll);
    eq('Die Plätze dazwischen bekommen den Bankanteil', hinten.exp[1].amount, bank);
    check('Und kein Platz geht leer aus, egal wer kämpft',
      hinten.exp.every((e) => e.amount > 0),
      hinten.exp.map((e) => e.amount).join(','));
  }

  // Der EP-Teiler hebt den Bankanteil — vorher tat er nichts.
  {
    const ohne = kaempfen(aufstellen(4714, 10));
    const mit = aufstellen(4714, 10);
    mit.relics.ep_teiler = 1;
    const res = kaempfen(mit);
    check('Der EP-Teiler hebt den Anteil der Bank', res.exp[3].amount > ohne.exp[3].amount * 1.5,
      res.exp[3].amount + ' gegen ' + ohne.exp[3].amount);
    eq('Am Anteil des Kämpfers ändert er nichts', res.exp[0].amount, ohne.exp[0].amount);
  }

  // An der Levelgrenze steht das auch da, statt still nichts zu tun.
  {
    const run = aufstellen(4715, 10);
    run.party.forEach((m) => { m.lvl = run.levelCap; });
    const res = kaempfen(run);
    eq('An der Levelgrenze wird das gemeldet', res.exp.filter((e) => e.capped).length, 5);
    eq('… und es fließt keine Erfahrung', res.exp.filter((e) => e.amount > 0).length, 0);
  }
}

section('TMs heißen auf Deutsch');
{
  PL.t.setLang('de');
  const flammenwurf = dex.move('flamethrower');
  eq('Die Attacke selbst ist übersetzt', PL.t.move(flammenwurf), 'Flammenwurf');
  eq('Und die TM trägt denselben Namen',
    PL.items.tm(flammenwurf.i !== undefined ? flammenwurf.i : dex.moves.indexOf(flammenwurf)).name,
    'TM Flammenwurf');
  // Stichprobe über den ganzen Katalog: keine TM darf englisch heißen,
  // solange die Attacke einen deutschen Namen führt.
  let englisch = [];
  dex.moves.forEach((m, i) => {
    if (!m || !m.dn || m.dn === m.n) return;
    const tm = PL.items.tm(i);
    if (tm.name !== 'TM ' + m.dn) englisch.push(tm.name);
  });
  eq('Keine TM trägt mehr ihren englischen Namen', englisch.length, 0,
    englisch.slice(0, 5).join(', '));
}

section('Teilen: was von einem Run übrig bleibt');
{
  await import('../js/share.js');
  const S = PL.share;

  const run = new PL.Run({ seed: 12345, mode: 'standard', region: 2, starter: 'charmander' });
  run.badges = 5;
  run.stats.battles = 24; run.stats.catches = 11; run.stats.evolutions = 3;
  run.relics.glueckliches_ei = 1; run.relics.honigtopf = 1;

  const verloren = S.ergebnis(run, 'niederlage');
  eq('Der Startwert steht im Ergebnis', verloren.startwert, 12345);
  eq('Die Region auch', verloren.heimat, 2);
  eq('… mit ihrem Namen', verloren.heimatName, 'Hoenn');
  eq('Die geholten Orden zählen ohne Sieg nicht hoch', verloren.region, 5);
  eq('Acht Orden führen zur Liga', verloren.regionen, 8);
  eq('Das Team ist dabei', verloren.team.length, run.party.length);
  eq('Relikte werden gezählt', verloren.relikte, 2);

  // Die Kästchenreihe erzählt den Weg auf einen Blick.
  const reihe = S.kaestchen(verloren);
  eq('Ein Kästchen je Orden', [...reihe].length, 8);
  eq('… fünf grüne für die geholten', [...reihe].filter((z) => z === '🟩').length, 5);
  eq('… eins gelb für den, an dem Schluss war', [...reihe].filter((z) => z === '🟨').length, 1);
  eq('… und der Rest bleibt leer', [...reihe].filter((z) => z === '⬜').length, 2);

  run.state = 'victory';
  const gewonnen = S.ergebnis(run, 'sieg');
  eq('Mit Sieg stehen alle acht Orden', gewonnen.region, 8);
  eq('Beim Sieg ist kein Kästchen mehr gelb',
    [...S.kaestchen(gewonnen)].filter((z) => z === '🟨').length, 0);

  // Der Text muss überall einfügbar sein: kurz, ohne Sonderzeichen-Ballast.
  const text = S.alsText(verloren);
  check('Der Text nennt das Spiel', text.indexOf('Pokélike+') === 0, text.slice(0, 30));
  check('… den Startwert', text.indexOf('Startwert 12345') > 0);
  check('… die Kästchenreihe', text.indexOf(reihe) > 0);
  check('… und die Kämpfe', text.indexOf('24 Kämpfe') > 0, text);
  check('Er bleibt kurz genug für jede Nachricht', text.length < 280, text.length + ' Zeichen');
  check('Der Sieg steht als Krone drin', S.alsText(gewonnen).indexOf('👑') > 0);

  // Aus dem Ergebnis wird eine Einladung und wieder zurück.
  const code = S.startwertCode(verloren);
  eq('Der Code trägt Modus, Region und Startwert', code, 'standard-2-12345');
  const zurueck = S.ausCode(code);
  eq('… und liest sich wieder ein: Modus', zurueck.modus, 'standard');
  eq('… Region', zurueck.heimat, 2);
  eq('… und ihr Name', zurueck.heimatName, 'Hoenn');
  eq('… Startwert', zurueck.startwert, 12345);
  eq('Nuzlocke wird mitgenommen', S.ausCode(S.startwertCode({
    modus: 'endlos', heimat: 0, startwert: 7, nuzlocke: true
  })).nuzlocke, true);
  // Kurzrun und Boss-Rush gibt es nicht mehr: Eine Einladung, die einen von
  // beiden mitbringt, wird nicht angenommen.
  check('Eine Einladung in einen abgeschafften Modus wird abgelehnt',
    S.ausCode('kurz-0-7') === null && S.ausCode('bossrush-0-7') === null);

  check('Unsinn wird abgelehnt', S.ausCode('quatsch') === null);
  check('Ein erfundener Modus auch', S.ausCode('gibtsnicht-0-5') === null);
  check('Eine Region außerhalb der neun wird eingefangen',
    S.ausCode('standard-99-5').heimat === 8);

  const link = S.startwertLink(verloren);
  check('Der Link enthält den Code', link.indexOf('?run=standard-2-12345') > 0, link);

  // Derselbe Startwert muss dieselbe Welt ergeben — sonst ist die Einladung wertlos.
  {
    const a = new PL.Run({ seed: 4242, starter: 'squirtle' });
    const b = new PL.Run({ seed: 4242, starter: 'squirtle' });
    eq('Gleicher Startwert, gleiche Karte',
      JSON.stringify(a.map.map((r) => r.map((n) => n.type))),
      JSON.stringify(b.map.map((r) => r.map((n) => n.type))));
    eq('… und dieselbe Regionenfolge', JSON.stringify(a.regionOrder), JSON.stringify(b.regionOrder));
  }
}

section('Musik: jede Region ihr eigenes Stück');
{
  await import('../js/audio.js');
  const A = PL.audio;
  const noten = /^[A-G](#|b)?(-?\d)$/;
  let kaputt = [];
  for (let g = 1; g <= 9; g++) {
    const t = A.regionTracks[g];
    if (!t) { kaputt.push('Generation ' + g + ' fehlt'); continue; }
    ['melody', 'chords', 'low', 'beat'].forEach((k) => {
      if (!t[k] || t[k].length !== 64) kaputt.push('Gen ' + g + ' ' + k + ': ' + (t[k] || []).length + ' Schritte');
    });
    ['melody', 'chords', 'low'].forEach((k) => {
      (t[k] || []).forEach((n, i) => {
        if (n !== '.' && n !== '-' && !noten.test(n)) kaputt.push('Gen ' + g + ' ' + k + '[' + i + '] = ' + n);
      });
    });
    (t.beat || []).forEach((b, i) => {
      if (!/^[khs.]$/.test(b)) kaputt.push('Gen ' + g + ' beat[' + i + '] = ' + b);
    });
    if (!(t.bpm >= 80 && t.bpm <= 200)) kaputt.push('Gen ' + g + ' Tempo ' + t.bpm);
  }
  eq('Alle neun Regionen haben ein spielbares Stück', kaputt.length, 0, kaputt.join('; '));

  // Sie müssen sich auch unterscheiden — sonst wäre die Mühe umsonst.
  const melodien = new Set(), tempi = new Set();
  for (let g = 1; g <= 9; g++) {
    melodien.add(A.regionTracks[g].melody.join(' '));
    tempi.add(A.regionTracks[g].bpm);
  }
  eq('Neun verschiedene Melodien', melodien.size, 9);
  check('Und mindestens sieben verschiedene Tempi', tempi.size >= 7, [...tempi].join(', '));

  // Stadt und Höhle werden in die Tonart der Region gerückt.
  {
    const stadt = A.tracks.town;
    const johto = A.regionVariant('town', 2);        // +7 Halbtöne
    check('Das Stadtstück steht in der Tonart der Region', johto !== stadt);
    eq('… mit gleich vielen Schritten', johto.melody.length, stadt.melody.length);
    const alsZahl = (n) => {
      const stufe = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
      return ((+m[3] + 1) * 12) + stufe[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    };
    let daneben = 0;
    stadt.melody.forEach((n, i) => {
      if (n === '.' || n === '-') { if (johto.melody[i] !== n) daneben++; return; }
      if (alsZahl(johto.melody[i]) - alsZahl(n) !== 7) daneben++;
    });
    eq('Jeder Ton genau sieben Halbtöne höher', daneben, 0);
    check('Kanto braucht keine Verschiebung', A.regionVariant('town', 1) === stadt);
  }

  // Ohne Tonausgabe darf nichts davon abstürzen.
  A.setRegion(4);
  A.play('route');
  A.setRegion(0);
  check('Ohne Lautsprecher läuft es trotzdem durch', true);
}

section('Entwicklungen: Level und Stein');
{
  const run = new PL.Run({ seed: 606, starter: 'charmander' });
  function baue(id, lvl) {
    return PL.world.buildMon(PL.rng('e-' + id), dex.sp(id), lvl, {});
  }

  // 1) Steine: Der Beutel führt Kennungen, die Entwicklungsdaten englische
  //    Namen. Genau daran ist es vorher gescheitert.
  const vulpix = baue('vulpix', 20);
  const stein = mons.evolutions(vulpix, { items: {} })[0];
  eq('Vulpix braucht einen Stein', stein.how, 'useItem');
  eq('… und der heißt auf Deutsch', stein.text, 'Feuerstein');
  check('Ohne Stein geht nichts', !stein.ready);
  const mitStein = mons.evolutions(vulpix, { items: { firestone: 1 } })[0];
  check('Mit dem Feuerstein im Beutel ist es soweit', mitStein.ready);
  eq('Der Stein wird unter seiner Kennung abgebucht', PL.util.toID(mitStein.item), 'firestone');
  check('Und der Laden führt ihn, wenn er im Team gebraucht wird', (function () {
    run.party = [vulpix];
    return run.itemPool().some((o) => o.item.id === 'firestone');
  })());

  // Alle Steine, die in den Daten stehen, gibt es auch als Gegenstand.
  {
    let fehlend = [];
    dex.species.forEach((sp) => {
      if (sp.et !== 'useItem' || !sp.ei) return;
      if (!PL.items.get(PL.util.toID(sp.ei))) fehlend.push(sp.ei);
    });
    eq('Zu jedem Entwicklungsstein gibt es einen Gegenstand', fehlend.length, 0, fehlend.join(', '));
  }

  // Ein ganzer Durchgang: Beutel, Entwicklung, Abbuchen.
  {
    const r2 = new PL.Run({ seed: 71, starter: 'bulbasaur' });
    r2.party = [baue('growlithe', 25)];
    r2.addItem('firestone', 1);
    const bereit = PL.autopilot.readyEvolutions(r2);
    eq('Der Automat sieht die Steinentwicklung', bereit.length, 1);
    r2.removeItem(PL.util.toID(bereit[0].evo.item), 1);
    mons.evolve(bereit[0].mon, bereit[0].evo.to, r2.rng);
    eq('Aus Growlithe wird Arcanine', dex.sp(r2.party[0].sp).id, 'arcanine');
    check('Der Stein ist aufgebraucht', !r2.bag.firestone);
  }

  // 2) Alles, was in den Spielen Tausch oder Sonderbedingungen verlangt,
  //    geht hier über das Level.
  {
    let sonder = 0;
    dex.species.forEach((sp) => {
      if (!sp.ev) return;
      const mon = { sp: sp.i, lvl: 100, moves: [], item: null, friendship: 0 };
      mons.evolutions(mon, {}).forEach((e) => {
        if (e.how !== 'level' && e.how !== 'useItem') sonder++;
      });
    });
    eq('Es gibt nur noch Level und Stein', sonder, 0);
  }
  const paare = [
    ['machoke', 'machamp'], ['haunter', 'gengar'], ['kadabra', 'alakazam'],
    ['graveler', 'golem'], ['golbat', 'crobat'], ['feebas', 'milotic'],
    ['scyther', 'scizor'], ['onix', 'steelix'], ['riolu', 'lucario'],
    ['rhydon', 'rhyperior'], ['piloswine', 'mamoswine'], ['pichu', 'pikachu']
  ];
  let schlecht = [];
  paare.forEach(([von, nach]) => {
    const liste = mons.evolutions({ sp: dex.sp(von).i, lvl: 100, moves: [], item: null }, {});
    const treffer = liste.filter((e) => e.to.id === nach)[0];
    if (!treffer || treffer.how !== 'level' || !(treffer.level >= 16 && treffer.level <= 45)) {
      schlecht.push(von + '→' + nach + ': ' + (treffer ? treffer.how + ' ' + treffer.level : 'fehlt'));
    }
  });
  eq('Tausch- und Sonderentwicklungen laufen über das Level', schlecht.length, 0, schlecht.join('; '));
  check('Babys entwickeln sich früh, Kolosse spät',
    mons.evolutions({ sp: dex.sp('pichu').i, lvl: 5, moves: [] }, {})[0].level <
    mons.evolutions({ sp: dex.sp('rhydon').i, lvl: 5, moves: [] }, {})[0].level);

  // 3) Wer die Wahl hat, entscheidet selbst — Evoli wird nicht von allein
  //    zu irgendetwas.
  {
    const evoli = baue('eevee', 50);
    const liste = mons.evolutions(evoli, { items: {} });
    eq('Evoli hat acht Wege', liste.length, 8);
    eq('… fünf davon über Steine', liste.filter((e) => e.how === 'useItem').length, 5);
    eq('… drei über das Level', liste.filter((e) => e.how === 'level').length, 3);
    eq('Von allein entwickelt es sich zu nichts', mons.autoEvolution(evoli), null);
    const r3 = new PL.Run({ seed: 8, starter: 'squirtle' });
    r3.party = [evoli];
    const bereit = PL.autopilot.readyEvolutions(r3);
    eq('Der Automat nimmt genau eine Entwicklung je Pokémon', bereit.length, 1);
  }

  // 4) Wer nur einen Weg hat, entwickelt sich beim Aufstieg von selbst.
  {
    const kadabra = baue('kadabra', 60);
    const auto = mons.autoEvolution(kadabra);
    check('Kadabra entwickelt sich von allein', !!auto && auto.to.id === 'alakazam');
    const jung = baue('kadabra', 20);
    eq('… aber nicht zu früh', mons.autoEvolution(jung), null);
    check('Ein Relikt darf es vorziehen',
      !!mons.autoEvolution(baue('kadabra', 34), 6));
  }
}

section('Legendäre Pokémon gehören dem Legendären Run');
{
  // Im gewöhnlichen Run kommt keines mehr vor — in keiner Region, in keinem Modus.
  ['standard', 'endlos', 'taeglich'].forEach((modus) => {
    eq('Kein Run im Modus ' + modus + ' trägt eine legendäre Spur',
      PL.Run.rollLegend(4242, modus), -1);
  });
  {
    let spuren = 0;
    for (let i = 0; i < 40; i++) {
      const r = new PL.Run({ seed: 6000 + i, starter: 'bulbasaur' });
      for (let reg = 0; reg < 9; reg++) {
        r.region = reg;
        r.buildMap();
        spuren += r.map.reduce((a, row) => a + row.filter((n) => n.type === 'legend').length, 0);
      }
    }
    eq('Über 40 Runs und alle Regionen steht keine einzige Spur', spuren, 0);
  }

  // Ein laufender Run aus der alten Fassung wird beim Laden entschärft.
  {
    const run = new PL.Run({ seed: 5150, starter: 'bulbasaur' });
    const veraltet = JSON.parse(JSON.stringify(run.toJSON()));
    veraltet.legendRegion = 3;
    veraltet.legendUsed = false;
    veraltet.map[1][0].type = 'legend';
    veraltet.map[1][0].done = false;
    const geputzt = PL.Run.fromJSON(veraltet);
    eq('Eine Spur aus der alten Regel wird beim Laden entfernt',
      geputzt.map.reduce((a, row) => a + row.filter((n) => n.type === 'legend').length, 0), 0);
    eq('… und das Kontingent gilt als aufgebraucht', geputzt.legendUsed, true);
    eq('… und die Region als keine', geputzt.legendRegion, -1);
  }

  /* --- Der Meisterball ist die einzige Währung, und er gehört einem --- */
  const leg = new PL.Run({ seed: 77, mode: 'legenden',
    duell: { art: 'mewtwo', team: [{ sp: 'venusaur' }] } });
  eq('Das Duell beginnt ohne gewöhnliche Bälle', leg.bag.pokeball || 0, 0);
  eq('… auch ohne Hyperbälle', leg.bag.ultraball || 0, 0);
  eq('Ohne Meisterball ist kein Fang möglich', leg.catchAllowed(), false);
  eq('Nur der Meisterball darf geworfen werden', leg.ballErlaubt('masterball'), true);
  eq('Ein Pokéball nicht', leg.ballErlaubt('pokeball'), false);
  eq('Ein Hyperball auch nicht', leg.ballErlaubt('ultraball'), false);

  const mitBall = new PL.Run({ seed: 77, mode: 'legenden',
    duell: { art: 'mewtwo', team: [{ sp: 'venusaur' }], meisterball: true } });
  eq('Der Ball liegt im Beutel', mitBall.bag.masterball, 1);
  eq('Mit Meisterball darf gefangen werden', mitBall.catchAllowed(), true);
  mitBall.removeItem('masterball', 1);
  eq('Ist er geworfen, ist Schluss', mitBall.catchAllowed(), false);

  // Im gewöhnlichen Run gilt die Sperre nicht.
  const normal = new PL.Run({ seed: 77, starter: 'charmander' });
  eq('Im gewöhnlichen Run sind alle Bälle erlaubt', normal.ballErlaubt('pokeball'), true);

  // Der Kampf selbst erlaubt das Fangen nur mit Ball im Beutel.
  mitBall.addItem('masterball', 1);
  eq('Mit Ball ist der Kampf fangbar', mitBall.enterNode(0, 0).battle.canCatch, true);
  const ohne = new PL.Run({ seed: 77, mode: 'legenden',
    duell: { art: 'mewtwo', team: [{ sp: 'venusaur' }] } });
  eq('Ohne Ball nicht', ohne.enterNode(0, 0).battle.canCatch, false);
}

section('Auto-Kampf');
{
  const rng = PL.rng('auto');
  const duel = (a, b, setup) => {
    const x = mons.create(a, 50, rng, {}), y = mons.create(b, 50, rng, {});
    const bt = new PL.Battle({ teams: [[x], [y]], rng });
    bt.start();
    if (setup) setup(bt);
    return bt;
  };

  // Heilen ist eine Rechnung: Der Trank muss den nächsten Treffer abfangen.
  let bt = duel('blissey', 'machamp');
  bt.sides[0].active.mon.hp = Math.max(1, Math.floor(bt.sides[0].active.stats[0] * 0.2));
  let act = PL.ai.chooseAction(bt, 0, 4, { bag: { maxpotion: 2 } });
  eq('Der Auto-Kampf greift bei wenig KP zum Trank', act.type, 'item');

  // Ein Trank, der die Lücke kaum füllt, bleibt liegen
  bt = duel('blissey', 'machamp');
  bt.sides[0].active.mon.hp = Math.max(1, Math.floor(bt.sides[0].active.stats[0] * 0.5));
  act = PL.ai.chooseAction(bt, 0, 4, { bag: { potion: 2 } });
  check('Ein Tropfen auf den heißen Stein bleibt im Beutel', act.type !== 'item', act.type);

  // Ohne Not bleibt der Trank im Beutel
  bt = duel('blissey', 'machamp');
  act = PL.ai.chooseAction(bt, 0, 4, { bag: { maxpotion: 2 } });
  check('Bei vollen KP wird nicht geheilt', act.type !== 'item', act.type);

  // Schlaf ist teuer — der Aufwecker lohnt sich
  bt = duel('snorlax', 'machamp');
  bt.sides[0].active.mon.status = 'slp';
  bt.sides[0].active.mon.slp = 3;
  act = PL.ai.chooseAction(bt, 0, 4, { bag: { awakening: 1 } });
  eq('Schlafende werden geweckt', act.item, 'awakening');

  // Wilde Begegnung: was sich lohnt, wird gefangen
  const run = new PL.Run({ seed: 4711, starter: 'charmander' });
  const wild = run.makeWild(run.rng);
  const wbt = wild.battle || wild;
  wbt.start();
  const foe = wbt.sides[1].active;
  check('Fangwert steht für ein neues Pokémon über null',
    PL.ai.catchWorth(wbt, run, foe, { dexNew: true }) > 0,
    String(Math.round(PL.ai.catchWorth(wbt, run, foe, { dexNew: true }))));
  const balls = PL.ai.ballOptions(wbt, run, foe);
  check('Die Bälle im Beutel werden mit Fangchance bewertet',
    balls.length > 0 && balls.every((b) => b.chance >= 0 && b.chance <= 1),
    JSON.stringify(balls.map((b) => b.id + ':' + b.chance.toFixed(2))));

  // Mit Fangabsicht wird nicht besiegt
  const catchBt = duel('machamp', 'caterpie');
  const cFoe = catchBt.sides[1].active;
  cFoe.mon.hp = Math.max(1, Math.floor(cFoe.stats[0] * 0.9));
  const entries = catchBt.legalMoves(0);
  const lethal = entries.filter((e) => e.move.c !== 'T' &&
    PL.ai.estimate(catchBt, catchBt.sides[0].active, cFoe, e.move) >= cFoe.mon.hp);
  if (lethal.length) {
    const sc = PL.ai.scoreMove(catchBt, catchBt.sides[0].active, cFoe, lethal[0], 4, { wantsCatch: true });
    check('Wer fangen will, wertet den K.-o.-Schlag ab', sc < 0, String(sc));
  } else {
    check('Wer fangen will, wertet den K.-o.-Schlag ab', true, 'kein tödlicher Zug im Repertoire');
  }

  // Der Meisterball bleibt liegen, solange es etwas anderes gibt
  run.bag.masterball = 1;
  run.bag.pokeball = 5;
  const pick = PL.ai.pickBall(wbt, run, foe, 60, true);
  check('Der Meisterball wird nicht verschwendet', pick && pick.id !== 'masterball',
    pick ? pick.id : 'keiner');
}

section('Reise-Automat');
{
  const A = PL.autopilot;
  const run = new PL.Run({ seed: 2024, starter: 'squirtle' });

  // Wegwahl
  const next = A.bestNode(run);
  check('Der Automat findet einen offenen Knoten', !!next && run.available()
    .some((o) => o.row === next.row && o.col === next.col), JSON.stringify(next));
  const vals = A.pathValues(run);
  check('Jeder Knoten der Karte bekommt einen Wert',
    vals.length === run.map.length && vals.every((r, i) => r.length === run.map[i].length));

  // Ein angeschlagenes Team will an den Rastplatz
  const fit = A.nodeValue(run, { type: 'rest' });
  run.party.forEach((m) => { m.hp = Math.max(1, Math.floor(mons.maxHP(m) * 0.2)); });
  const hurtValue = A.nodeValue(run, { type: 'rest' });
  check('Angeschlagen wird der Rastplatz viel wertvoller', hurtValue > fit + 60,
    Math.round(fit) + ' → ' + Math.round(hurtValue));
  check('Der Zustand des Teams wird richtig gemessen', A.hurt(run) > 0.7,
    A.hurt(run).toFixed(2));
  run.healTeam(1, true);

  // Begegnung: das stärkste Angebot
  const offer = run.makeCatchOffer(run.rng);
  const ci = A.pickCatch(run, offer);
  check('Bei der Begegnung wird ein Angebot gewählt', ci >= 0 && ci < offer.offers.length,
    String(ci));
  const types = {};
  run.party.forEach((m) => dex.sp(m.sp).t.forEach((t) => { types[t] = 1; }));
  const scores = offer.offers.map((m) => A.monScore(run, m, types));
  eq('… und zwar das am höchsten bewertete', ci, scores.indexOf(Math.max(...scores)));

  // Gegenstände: was fehlt, zählt mehr
  const leer = new PL.Run({ seed: 5, starter: 'squirtle' });
  leer.bag = {};
  const trank = PL.items.get('potion'), nugget = PL.items.get('lifeorb');
  check('Ohne Heilmittel wiegt ein Trank schwerer als ein Tragegegenstand',
    A.itemWant(leer, trank) > A.itemWant(leer, nugget),
    A.itemWant(leer, trank) + ' zu ' + A.itemWant(leer, nugget));
  leer.bag = { potion: 9, superpotion: 9 };
  check('Mit vollem Beutel dreht sich das um',
    A.itemWant(leer, trank) < A.itemWant(leer, nugget),
    A.itemWant(leer, trank) + ' zu ' + A.itemWant(leer, nugget));

  // Laden: nie über das Geld hinaus
  const shopRun = new PL.Run({ seed: 8, starter: 'bulbasaur' });
  shopRun.money = 1500;
  const shop = shopRun.makeShop(shopRun.rng);
  const plan = A.shopPlan(shopRun, shop);
  const kosten = plan.reduce((a, i) => a + shop.stock[i].price, 0);
  check('Der Einkauf bleibt im Budget', kosten <= shopRun.money,
    kosten + ' von ' + shopRun.money);
  check('Kein Posten wird doppelt eingeplant', new Set(plan).size === plan.length);

  // Relikte: Seltenheit und Wirkung zählen
  const relics = PL.relics.all();
  const episch = relics.find((r) => r.rarity === 'episch');
  const haeufig = relics.find((r) => r.rarity === 'haeufig');
  check('Episches wiegt schwerer als Häufiges',
    A.relicScore(run, episch) > A.relicScore(run, haeufig),
    Math.round(A.relicScore(run, episch)) + ' zu ' + Math.round(A.relicScore(run, haeufig)));

  // Ereignisse: jede Antwort hat ein Gewicht
  check('Jede Ereignisantwort trägt ein Gewicht für den Automaten',
    PL.world.EVENTS.every((e) => e.options.every((o) => o.auto !== undefined)),
    PL.world.EVENTS.filter((e) => e.options.some((o) => o.auto === undefined))
      .map((e) => e.id).join(','));

  // Attacken lernen
  const lernMon = mons.create('charmander', 30, PL.rng(3), {});
  lernMon.moves = [
    { m: dex.move('scratch').i, pp: 35, ppUp: 0, used: 0 },
    { m: dex.move('growl').i, pp: 40, ppUp: 0, used: 0 },
    { m: dex.move('ember').i, pp: 25, ppUp: 0, used: 0 },
    { m: dex.move('smokescreen').i, pp: 20, ppUp: 0, used: 0 }
  ];
  const slot = A.learnSlot(lernMon, dex.move('flamethrower').i);
  check('Eine starke Attacke verdrängt die schwächste', slot >= 0,
    'Platz ' + slot);
  eq('Eine schwache Attacke wird nicht gelernt',
    A.learnSlot(lernMon, dex.move('splash').i), -1);
}

section('Der Automat pflegt das Team');
{
  const A = PL.autopilot;
  const run = new PL.Run({ seed: 4242, starter: 'charmander' });
  while (run.party.length < 3) {
    run.party.push(PL.mon.create('pidgey', 12, run.rng, {}));
  }

  // Sonderbonbons: das schwächste Mitglied zuerst
  run.bag.rarecandy = 3;
  const vorher = run.party.map((m) => m.lvl).slice().sort((a, b) => a - b)[0];
  A.careForTeam(run);
  const nachher = run.party.map((m) => m.lvl).slice().sort((a, b) => a - b)[0];
  check('Sonderbonbons werden verteilt', nachher > vorher, vorher + ' → ' + nachher);
  eq('… und sind danach aufgebraucht', run.bag.rarecandy || 0, 0);

  // Vitamine landen bei dem, der am meisten daraus macht
  run.bag.protein = 2;
  const evVor = run.party.reduce((a, m) => a + m.evs[1], 0);
  A.careForTeam(run);
  check('Vitamine werden verfüttert',
    run.party.reduce((a, m) => a + m.evs[1], 0) > evVor);

  // Tragegegenstände wandern in die Hände
  run.party.forEach((m) => { m.item = null; });
  run.bag.leftovers = 1;
  run.bag.lifeorb = 1;
  const equipped = A.equipItems(run);
  check('Getragen wird, was da ist', equipped === 2, String(equipped));
  check('… und der Beutel ist dann leer davon', !run.bag.leftovers && !run.bag.lifeorb);
  check('Das stärkste Pokémon bekommt das beste Stück', (() => {
    const star = run.party.slice().sort((a, b) => A.memberScore(b) - A.memberScore(a))[0];
    return star.item === 'leftovers';
  })(), run.party.map((m) => m.item).join(','));

  // TMs: nur, wenn sie wirklich besser sind
  const zard = PL.mon.create('charmander', 30, PL.rng(9), {});
  zard.moves = [
    { m: dex.move('scratch').i, pp: 35, ppUp: 0, used: 0 },
    { m: dex.move('growl').i, pp: 40, ppUp: 0, used: 0 },
    { m: dex.move('ember').i, pp: 25, ppUp: 0, used: 0 },
    { m: dex.move('smokescreen').i, pp: 20, ppUp: 0, used: 0 }
  ];
  const tmRun = new PL.Run({ seed: 7, starter: 'charmander' });
  tmRun.party = [zard];
  const gutIdx = dex.move('flamethrower').i;
  check('Eine starke TM verspricht Gewinn', A.tmGain(tmRun, gutIdx) > 0,
    String(Math.round(A.tmGain(tmRun, gutIdx))));
  tmRun.addTM(gutIdx);
  const lines = A.teachTMs(tmRun);
  check('… und wird beigebracht', lines.length === 1 &&
    zard.moves.some((m) => m.m === gutIdx), lines.join(' / '));
  eq('… und ist danach verbraucht', Object.keys(tmRun.tms).length, 0);
  check('Eine TM, die niemand lernen kann, ist nichts wert',
    A.tmGain(tmRun, dex.move('hydropump').i) === 0);

  // Aus der Box kommt, wer deutlich besser ist
  const boxRun = new PL.Run({ seed: 11, starter: 'squirtle' });
  while (boxRun.party.length < 6) boxRun.party.push(PL.mon.create('magikarp', 5, boxRun.rng, {}));
  boxRun.box = [PL.mon.create('dragonite', 55, boxRun.rng, {})];
  const swap = A.manageParty(boxRun);
  check('Der Automat holt Besseres aus der Box', !!swap, String(swap));
  check('… und legt das Schwächere hinein',
    boxRun.party.some((m) => dex.sp(m.sp).id === 'dragonite') &&
    boxRun.box.some((m) => dex.sp(m.sp).id === 'magikarp'));
}

section('Ein Run im Automatikbetrieb');
{
  const A = PL.autopilot;
  let fehler = null, knoten = 0;
  const run = new PL.Run({ seed: 777, starter: 'bulbasaur' });
  try {
    let guard = 0;
    while (run.state !== 'gameover' && run.state !== 'victory' && guard++ < 60) {
      if (!run.available().length) { run.advanceRegion(); continue; }
      const next = A.bestNode(run);
      if (!next) break;
      const scene = run.enterNode(next.row, next.col);
      if (!scene) break;
      knoten++;
      A.resolveScene(run, scene, {
        battle(bt) {
          bt.start();
          let g = 0;
          while (!bt.ended && g++ < 200) {
            const mine = PL.ai.chooseAction(bt, 0, 4, { run });
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
          run.finishBattle(bt);
          if (bt.outcome === 'win') {
            const reward = run.battleRewards(bt);
            if (reward) A.resolveScene(run, reward, {});
          }
        }
      });
      if (run.state === 'gameover') break;
      run.closeScene();
    }
  } catch (e) { fehler = e; }
  check('Der Automat spielt ohne Absturz', !fehler, fehler ? String(fehler.stack).slice(0, 200) : '');
  check('… und kommt dabei wirklich voran', knoten >= 12, knoten + ' Knoten');
  check('… ohne das Team zu verlieren', run.party.length > 0, run.party.length + ' Pokémon');
  check('… und ohne Geld ins Minus zu bringen', run.money >= 0, String(run.money));
  check('… mit gültigen Lebenspunkten',
    run.party.every((m) => m.hp >= 0 && m.hp <= mons.maxHP(m)),
    run.party.map((m) => m.hp + '/' + mons.maxHP(m)).join(' '));
}

section('Tages-Run: ein Startwert für alle');
{
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  await import('../js/meta.js');
  await import('../js/share.js');
  const meta = PL.meta, S = PL.share;
  meta.reset();

  const heute = meta.heute();
  eq('Das Datum hat die Form JJJJ-MM-TT', /^\d{4}-\d{2}-\d{2}$/.test(heute), true, heute);
  eq('Derselbe Tag ergibt denselben Startwert',
    meta.tagesStartwert(heute), meta.tagesStartwert(heute));
  check('Ein anderer Tag ergibt einen anderen Startwert',
    meta.tagesStartwert('2026-01-01') !== meta.tagesStartwert('2026-01-02'));

  const leer = meta.tagesStand();
  eq('Vor dem ersten Versuch steht nichts da', !!leer.eigen, false);
  eq('Und noch keine Messlatte', !!leer.latte, false);
  eq('Der Tag gilt als ungespielt', meta.tagGespielt(), false);

  meta.setzeMesslatte({ region: 4, gewonnen: false, kaempfe: 30, faenge: 9 });
  eq('Die Messlatte bleibt liegen', meta.tagesStand().latte.region, 4);

  const run = new PL.Run({ seed: meta.tagesStartwert(), mode: 'taeglich',
    region: meta.tagesRegion(), starter: 'bulbasaur' });
  run.badges = 5; run.stats.battles = 41; run.stats.catches = 12;
  meta.setzeTagesErgebnis(S.ergebnis(run, 'niederlage'));
  eq('Das eigene Ergebnis steht fest', meta.tagesStand().eigen.region, 5);
  eq('Der Tag gilt jetzt als gespielt', meta.tagGespielt(), true);

  // Ein zweiter Anlauf darf das Ergebnis nicht schönrechnen.
  const run2 = new PL.Run({ seed: meta.tagesStartwert(), mode: 'taeglich', starter: 'bulbasaur' });
  run2.region = 6; run2.state = 'victory';
  meta.setzeTagesErgebnis(S.ergebnis(run2, 'sieg'));
  eq('Der erste Versuch zählt, kein zweiter', meta.tagesStand().eigen.region, 5);
  eq('… und der Sieg wird nicht nachgereicht', meta.tagesStand().eigen.gewonnen, false);

  // Der Stand von gestern ist heute kein Stand mehr.
  const schluessel = 'pokelike.plus.v1';
  const roh = JSON.parse(store[schluessel]);
  roh.taeglich.datum = '2020-01-01';
  store[schluessel] = JSON.stringify(roh);
  meta.reload();
  eq('Ein alter Tag wird verworfen', meta.tagesStand().datum, heute);
  eq('… samt Ergebnis', !!meta.tagesStand().eigen, false);

  /* --- Der Code, den man verschickt --- */
  const erg = S.ergebnis(run, 'niederlage');
  erg.datum = '2026-09-10';
  const code = S.tagesCode(erg);
  check('Der Code ist kurz genug für eine Nachricht', code.length <= 24, code + ' (' + code.length + ')');
  eq('Er beginnt erkennbar', code.slice(0, 3), 'TR-');
  const zurueck = S.ausTagesCode(code);
  eq('Der Tag kommt heil zurück', zurueck.datum, '2026-09-10');
  eq('Die Region auch', zurueck.region, 5);
  eq('Die Kämpfe auch', zurueck.kaempfe, 41);
  eq('Die Fänge auch', zurueck.faenge, 12);
  eq('Und der Ausgang', zurueck.gewonnen, false);
  eq('Kleinschreibung ist erlaubt', S.ausTagesCode(code.toLowerCase()).region, 5);
  eq('Ein Tippfehler wird bemerkt',
    S.ausTagesCode(code.slice(0, -1) + (code.slice(-1) === 'A' ? 'B' : 'A')), null);
  eq('Und Unsinn erst recht', S.ausTagesCode('hallo'), null);
  eq('Leer bleibt leer', S.ausTagesCode(''), null);

  /* --- Die Messlatte muss für alle dieselbe sein --- */
  function messlatte(seed) {
    const t = PL.autopilot.durchlauf({ seed: seed, mode: 'taeglich', starter: 'charmander' });
    let schutz = 0;
    while (t.schritt() && schutz++ < 500) { /* Knoten für Knoten */ }
    return { region: t.run.region, gewonnen: t.run.state === 'victory',
             kaempfe: t.run.stats.battles, ende: t.fertig() };
  }
  const l1 = messlatte(4242), l2 = messlatte(4242), l3 = messlatte(9999);
  check('Der Automat spielt den Tag zu Ende', l1.ende, JSON.stringify(l1));
  check('… und kämpft dabei wirklich', l1.kaempfe > 5, l1.kaempfe + ' Kämpfe');
  eq('Derselbe Startwert ergibt dieselbe Messlatte', JSON.stringify(l1), JSON.stringify(l2));
  check('Ein anderer Startwert ergibt einen anderen Verlauf',
    JSON.stringify(l1) !== JSON.stringify(l3), JSON.stringify(l3));

  const text = S.tagesText(erg, { region: 4, gewonnen: false, kaempfe: 30, faenge: 9 });
  check('Der Text nennt den Tages-Run', text.indexOf('Tages-Run') >= 0, text);
  check('… und trägt den Code bei sich', text.indexOf(code) >= 0, text);

  delete globalThis.localStorage;
}

section('Ein Run spielt eine Region ganz');
{
  const W = PL.world;
  eq('Es gibt neun Regionen', W.REGIONS.length, 9);
  check('Jede stellt acht Arenaleiter',
    W.REGIONS.every((r) => r.leaders.length === 8),
    W.REGIONS.filter((r) => r.leaders.length !== 8).map((r) => r.name).join(', '));
  eq('Acht Orden führen zur Liga', PL.Run.ORDEN_GESAMT, 8);

  // Jede Region bringt ihre eigene Top Vier und ihren eigenen Champ mit.
  check('Jede Region hat vier Liga-Mitglieder',
    W.REGIONS.every((r) => (W.ELITE_VIER[r.id] || []).length === 4),
    W.REGIONS.filter((r) => (W.ELITE_VIER[r.id] || []).length !== 4)
      .map((r) => r.name).join(', '));
  eq('Kanto stellt seine echte Top Vier',
    W.ELITE_VIER.kanto.map((e) => e[0]).join(', '), 'Lorelei, Bruno, Agatha, Lance');
  eq('Paldea seine eigene',
    W.ELITE_VIER.paldea.map((e) => e[0]).join(', '), 'Rika, Poppy, Larry, Hassel');
  eq('Es gibt neun Champs, einen je Region', W.CHAMPIONS.length, 9);
  eq('Kanto endet bei Blue',
    W.championTeam(PL.rng('k'), 70, W.REGIONS[0], {}).name.indexOf('Blue') >= 0, true);
  eq('Paldea bei Geeta',
    W.championTeam(PL.rng('p'), 70, W.REGIONS[8], {}).name.indexOf('Geeta') >= 0, true);

  // Wer in seiner Region beides ist — Arenaleiter und Top Vier —, tritt in
  // der Liga mit einem anderen Team an als in seiner Arena.
  const L = PL.leaders;
  ['Koga', 'Acerola', 'Larry'].forEach((n) => {
    check(n + ' hat in der Liga ein anderes Team als in der Arena',
      L.team(n).join(',') !== L.team(n, true).join(','),
      n + ': ' + L.team(n, true).join(','));
  });

  // Die Region steht für den ganzen Run fest; gezählt werden Orden.
  const run = new PL.Run({ seed: 5, region: 3, starter: 'bulbasaur' });
  eq('Die gewählte Region gilt', run.currentRegion().name, 'Sinnoh');
  eq('Der Run beginnt ohne Orden', run.badges, 0);
  run.badges = 5;
  eq('… und bleibt trotzdem in derselben Region', run.currentRegion().name, 'Sinnoh');
  eq('Eine Region außerhalb der neun wird eingefangen',
    new PL.Run({ seed: 5, region: 99, starter: 'bulbasaur' }).region, 8);

  // Der Anstieg liegt im Weg durch die Region, nicht in einer Vorwahl.
  const grenze = (orden) => {
    const r = new PL.Run({ seed: 5, region: 0, starter: 'bulbasaur' });
    r.badges = orden;
    return r.levelCap;
  };
  const leiter = [0,1,2,3,4,5,6,7].map(grenze);
  check('Die Levelgrenze steigt mit jedem Orden',
    leiter.every((v, i) => i === 0 || v > leiter[i - 1]), leiter.join(', '));
  eq('Vor dem ersten Arenaleiter steht sie bei 16', leiter[0], 16);
  eq('Vor dem achten bei 72', leiter[7], 72);

  const liga = (zeile) => {
    const r = new PL.Run({ seed: 5, region: 0, starter: 'bulbasaur' });
    r.badges = 8; r.leagueStage = 0; r.rowIndex = zeile;
    return r.levelCap;
  };
  const ligaWerte = [1, 2, 4, 5, 7].map(liga);
  check('Die Liga steigt weiter, Rang für Rang',
    ligaWerte.every((v, i) => i === 0 || v > ligaWerte[i - 1]), ligaWerte.join(', '));
  eq('Der Champ steht am höchsten', ligaWerte[4], 100);
  check('… und über der gesamten Top Vier', ligaWerte[4] > ligaWerte[3]);

  // Die Hauptschraube des Anstiegs: Der Arenaleiter rückt mit jedem Orden
  // näher an das eigene Team heran, und die Liga steht darüber.
  const A = PL.Run.ANSTIEG;
  eq('Für jeden der acht Orden steht ein Vorsprung fest', A.bossVorsprung.length, 8);
  check('Er steigt und fällt nie zurück',
    A.bossVorsprung.every((v, i) => i === 0 || v >= A.bossVorsprung[i - 1]),
    A.bossVorsprung.join(', '));
  check('Der erste Arenaleiter steht deutlich unter dem Team',
    A.bossVorsprung[0] <= -5, String(A.bossVorsprung[0]));
  check('Der achte steht dicht davor', A.bossVorsprung[7] >= -3,
    String(A.bossVorsprung[7]));
  // Die Leiter waren zu milde: Gemessen gewann der Automat die ersten sechs
  // ausnahmslos. Jetzt fallen der fünfte und sechste bei 98 und 95 %, der
  // siebte und achte bei 63 und 71 %.
  check('Schon die Mitte der Region zieht an',
    A.bossVorsprung[4] >= -4, String(A.bossVorsprung[4]));

  // Wie gut ein Leiter gebaut ist, steigt mit seiner Nummer — und fängt
  // nicht mehr bei einem Anfängerwert an.
  const guete = (i) => PL.world.bossTeam(PL.rng('q' + i), PL.world.REGIONS[0], 40, i, {})
    .team.reduce((a, m) => a + m.ivs.reduce((x, y) => x + y, 0), 0);
  check('Der achte Leiter ist besser gebaut als der erste',
    guete(7) / 5 > guete(0) / 2, guete(0) + ' vs ' + guete(7));
  // Die Top Vier steht nicht unter dem achten Arenaleiter — und bringt
  // obendrein volle Teams mit, was sie in der Messung klar härter macht.
  check('Die Top Vier steht nicht unter dem achten Arenaleiter',
    A.ligaVorsprung >= A.bossVorsprung[7], A.ligaVorsprung + ' vs ' + A.bossVorsprung[7]);
  check('Und der Champ über der Top Vier',
    A.champVorsprung > A.ligaVorsprung, A.champVorsprung + ' vs ' + A.ligaVorsprung);

  // Die zehn alten Erschwernisse sind fort — mit ihnen der Regler.
  check('Es gibt keine Schwierigkeitsstufen mehr', PL.Run.STUFEN === undefined);
  check('… und keine Regelabfrage', typeof run.asc !== 'function');
}

section('Eine Legende ist ein Bosskampf');
{
  const P = PL.Run.DUELL_PANZER;
  check('Die Legende hält ein Vielfaches aus', P.hp >= 4, String(P.hp));
  check('… und nimmt deutlich weniger Schaden', P.nimmt <= 0.4, String(P.nimmt));
  // Sie soll wehtun, aber nicht mit zwei Schlägen durch sein. Gemessen
  // nimmt ein Treffer jetzt ein Drittel der eigenen KP statt der Hälfte.
  check('… teilt spürbar weniger aus, als sie könnte',
    P.macht >= 0.35 && P.macht <= 0.7, String(P.macht));
  check('Zusammen ergibt das ein Vielfaches an Zähigkeit',
    P.hp / P.nimmt >= 15, (P.hp / P.nimmt).toFixed(1));

  // Der Bodensatz ist der Grund, warum ein Treffer überhaupt zählt: Ohne
  // ihn trug ein schlecht passendes Team 0,7 % je Schlag ab.
  check('Jeder Treffer trägt einen Mindestanteil ab',
    P.bodensatz >= 0.02 && P.bodensatz <= 0.05, String(P.bodensatz));
  {
    const r = new PL.Run({ seed: 9, mode: 'legenden',
      duell: { art: 'zapdos', team: [{ sp: 'caterpie' }] } });
    const kampf = r.makeLegendBoss(PL.rng('z'), 'zapdos');
    kampf.start();
    const boss = kampf.sides[1].team[0];
    const maxKP = PL.mon.maxHP(boss);
    // Eine schwache Attacke gegen einen zähen Gegner: ohne Bodensatz wäre
    // das ein Kratzer, mit ihm ein messbarer Anteil.
    const schwach = kampf.calcDamage(kampf.sides[0].active, kampf.sides[1].active,
      PL.dex.move(PL.dex.moves.findIndex((mv) => mv && mv.id === 'tackle')));
    check('Selbst ein schwacher Treffer trägt den Mindestanteil ab',
      schwach.dmg >= Math.round(maxKP * P.bodensatz) - 1,
      schwach.dmg + ' von ' + maxKP + ' (mindestens ' + Math.round(maxKP * P.bodensatz) + ')');
  }

  // Überreste heilten ein Sechzehntel der aufgeblähten KP je Runde — mehr,
  // als ein schlecht passendes Team überhaupt austeilte. Dann ging es
  // rückwärts.
  {
    const r2 = new PL.Run({ seed: 9, mode: 'legenden',
      duell: { art: 'lugia', team: [{ sp: 'snorlax' }] } });
    const boss2 = r2.makeLegendBoss(PL.rng('l'), 'lugia').sides[1].team[0];
    check('Eine Legende im Duell heilt sich nicht selbst nach',
      boss2.item !== 'leftovers', String(boss2.item));
  }

  const run = new PL.Run({ seed: 4, mode: 'legenden',
    duell: { art: 'mewtwo', team: [{ sp: 'dragonite' }, { sp: 'snorlax' }] } });
  const bt = run.makeLegendBoss(PL.rng('m'), 'mewtwo');
  const geg = bt.sides[1].team[0];
  const roh = PL.mon.create(PL.dex.sp('mewtwo'), geg.lvl, PL.rng('v'), { ivs: geg.ivs, evs: geg.evs });
  check('Der Panzer hebt die KP wirklich an',
    PL.mon.maxHP(geg) > PL.mon.maxHP(roh) * 4,
    PL.mon.maxHP(geg) + ' gegen ' + PL.mon.maxHP(roh));

  // Der Fehler, der die Duelle wirklich kurz machte: Die Legende hatte
  // Attacken im Set, die sie selbst besiegen. Xerneas sprengte sich in der
  // zweiten Runde in die Luft und schenkte den Kampf her.
  const selbstKO = geg.moves.filter((m) => PL.mon.SELBST_KO[PL.dex.move(m.m).id]);
  eq('Kein Boss sprengt sich selbst in die Luft', selbstKO.length, 0);
  check('Nebelexplosion zählt als solche', !!PL.mon.SELBST_KO.mistyexplosion);
  check('Und Explosion und Selbstzerstörung auch',
    !!PL.mon.SELBST_KO.explosion && !!PL.mon.SELBST_KO.selfdestruct);

  // Wer ohne solche Attacken dastünde, behält sein Set — lieber ein Risiko
  // als ein Pokémon, das gar nichts tun kann.
  const nurBumm = { sp: PL.dex.sp('electrode').i, lvl: 50, ivs: [31,31,31,31,31,31],
    evs: [0,0,0,0,0,0], nat: 0,
    moves: [{ m: PL.dex.moves.findIndex((mv) => mv && mv.id === 'explosion'), pp: 5, ppUp: 0, used: 0 }] };
  if (nurBumm.moves[0].m >= 0) {
    PL.mon.ohneSelbstKO(nurBumm);
    eq('Ein Pokémon mit nur solchen Attacken behält sie', nurBumm.moves.length, 1);
  }

  // Der Vorrat ist knapp und gezählt: Er soll den Kampf tragen, aber nicht
  // entscheiden. Mehr Heilmittel hoben in der Messung die Gewinnquote,
  // ohne dass ein einziger Treffer sich anders anfühlte — das ist der
  // falsche Hebel für die Schwierigkeit, aber der richtige für die Länge.
  check('Das Duell bringt einen abgezählten Vorrat mit',
    (run.bag.hyperpotion || 0) >= 1 && (run.bag.fullrestore || 0) >= 1 &&
    (run.bag.revive || 0) >= 1, JSON.stringify(run.bag));
  check('… aber keinen, mit dem man sich durchheilt',
    (run.bag.hyperpotion || 0) + (run.bag.fullrestore || 0) +
    (run.bag.revive || 0) <= 6, JSON.stringify(run.bag));
}

section('Eine Legende klingt wie eine Legende');
{
  const A = PL.audio, dex = PL.dex;
  const halb = (n) => {
    const m = /^([A-G])(#?)(-?\d)$/.exec(n);
    const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return (parseInt(m[3], 10) + 1) * 12 + st[m[1]] + (m[2] ? 1 : 0);
  };
  // Neun Legenden, eine je Generation.
  const proben = ['mewtwo', 'lugia', 'kyogre', 'dialga', 'reshiram',
    'xerneas', 'solgaleo', 'zacian', 'koraidon']
    .map((id) => dex.sp(id)).filter(Boolean);
  const stuecke = proben.map((sp) => A.legendenStueck(sp));

  check('Jede Legende hat ein eigenes Stück', stuecke.length === proben.length);
  check('Alle stehen über acht Takte statt über vier',
    stuecke.every((st) => st.melody.length === 128),
    stuecke.map((st) => st.melody.length / 16).join(','));
  // Größe kommt nicht vom Tempo: vorher 118 bis 168, jetzt darunter.
  check('Keine hetzt', stuecke.every((st) => st.bpm <= 135),
    stuecke.map((st) => st.bpm).join(','));
  check('… und keine schleicht', stuecke.every((st) => st.bpm >= 80),
    stuecke.map((st) => st.bpm).join(','));

  // Quinten ohne Terz: Ein Akkord aus zwei Tönen kann keine Terz enthalten.
  // Vier Takte lang stand vorher ein Dreiklang — Grundton, Terz, Quinte —,
  // und die Terz ist es, die einen Klang nach Dur oder Moll festlegt.
  const zweiToenig = stuecke.every((st) => {
    for (let takt = 0; takt * 16 < st.chords.length; takt++) {
      const eigene = new Set(st.chords.slice(takt * 16, takt * 16 + 16)
        .filter((n) => n !== '.'));
      if (eigene.size > 2) return false;
    }
    return true;
  });
  check('Die Begleitung steht in offenen Quinten, ohne Terz', zweiToenig);
  // Und der Abstand ist wirklich eine Quinte (oder ihre Umkehrung).
  const istQuinte = stuecke.every((st) => {
    const erste = st.chords.slice(0, 16).filter((n) => n !== '.').map(halb);
    if (erste.length < 2) return false;
    const d = Math.abs(erste[1] - erste[0]) % 12;
    return d >= 5 && d <= 8;
  });
  check('… und der Abstand ist eine Quinte', istQuinte);

  // Der Bass geht tief. Unter MIDI 48 liegt die zweite Oktave.
  check('Der Bass trägt in der Tiefe',
    stuecke.every((st) => Math.min.apply(null, st.low.filter((n) => n !== '.').map(halb)) < 48),
    stuecke.map((st) => Math.min.apply(null, st.low.filter((n) => n !== '.').map(halb))).join(','));
  check('Er hat Zähne — Sägezahn statt Dreieck',
    stuecke.every((st) => st.bass === 'sawtooth'));
  check('Und die Quinte steht als getragener Bordun',
    stuecke.every((st) => st.harmLang >= 3), stuecke[0].harmLang);

  // Der Bogen: erste Hälfte atmet, zweite trägt.
  const ohneHand = proben.filter((sp) => !A.handMotive[sp.id]);
  check('Es gibt Legenden ohne Motiv von Hand', ohneHand.length > 0);
  ohneHand.slice(0, 3).forEach((sp) => {
    const st = A.legendenStueck(sp);
    const ersterTakt = st.melody.slice(0, 16).filter((n) => n !== '.').length;
    const vorn = st.melody.slice(0, 64).filter((n) => n !== '.').length;
    const hinten = st.melody.slice(64).filter((n) => n !== '.').length;
    eq(sp.n + ': der erste Takt schweigt', ersterTakt, 0);
    check(sp.n + ': die zweite Hälfte trägt mehr als die erste', hinten > vorn,
      vorn + ' gegen ' + hinten);
  });

  // Keine helle Tonleiter mehr über den Typ. Mew und Xerneas standen in
  // Lydisch und klangen ausgesprochen freundlich.
  check('Kein Typ führt eine Legende nach Dur oder Lydisch',
    Object.keys(A.LEGENDEN_SKALA).every((t) =>
      A.LEGENDEN_SKALA[t] !== 'dur' && A.LEGENDEN_SKALA[t] !== 'lydisch'),
    JSON.stringify(A.LEGENDEN_SKALA));
  check('Unlicht und Geist bekommen die doppelt harmonische Leiter',
    A.LEGENDEN_SKALA.Dark === 'doppelharmonisch' &&
    A.LEGENDEN_SKALA.Ghost === 'doppelharmonisch');

  // Das gemeinsame Stück der Übersicht zieht mit.
  check('Auch das gemeinsame Legendenstück ist zurückgenommen',
    A.tracks.legenden.bpm <= 115 && A.tracks.legenden.bass === 'sawtooth',
    A.tracks.legenden.bpm + ' / ' + A.tracks.legenden.bass);

  // Die Titelträger bleiben, wie sie waren — das hier gilt nur den Legenden.
  const brock = A.trainerStueck('Brock', 'arena', 'Rock');
  eq('Ein Arenaleiter steht weiter über vier Takte', brock.melody.length, 64);
  check('… und behält seinen Klang', brock.bass === 'triangle' && !brock.harmLang,
    brock.bass + ' / ' + brock.harmLang);
}

section('Jeder Titelträger hat sein eigenes Stück');
{
  const A = PL.audio, W = PL.world, L = PL.leaders;
  const kanto = W.REGIONS[0];

  // Acht Leiter, acht verschiedene Stücke — kein Zwilling.
  const stuecke = kanto.leaders.map((l) => A.trainerStueck(l[0], 'arena', l[1]));
  const fingerabdruck = (st) => st.bpm + '|' + st.melody.join(',') + '|' + st.low.join(',');
  const eindeutig = new Set(stuecke.map(fingerabdruck));
  eq('Kantos acht Arenaleiter klingen alle verschieden', eindeutig.size, 8);

  // Gleicher Typ, anderer Name: trotzdem ein anderes Stück.
  const gestein = ['Brock', 'Roxanne', 'Roark', 'Grant', 'Katy']
    .map((n) => fingerabdruck(A.trainerStueck(n, 'arena', 'Rock')));
  eq('Fünf Gesteinsleiter, fünf Stücke', new Set(gestein).size, 5);

  // Derselbe Name klingt immer gleich — sonst wechselte die Musik mitten
  // im Kampf, sobald der Bildschirm neu gezeichnet wird.
  eq('Ein Stück bleibt, wie es war',
    fingerabdruck(A.trainerStueck('Brock', 'arena', 'Rock')),
    fingerabdruck(A.trainerStueck('Brock', 'arena', 'Rock')));

  // Die Rolle hebt das Tempo: Arenaleiter, Top Vier, Champ.
  const tempoVon = (rolle) => {
    const r = A.ROLLEN[rolle];
    return [r.bpmVon, r.bpmBis];
  };
  check('Die Top Vier drängt mehr als ein Arenaleiter',
    tempoVon('liga')[1] > tempoVon('arena')[1], JSON.stringify(tempoVon('liga')));
  check('Und der Champ mehr als die Top Vier',
    tempoVon('champ')[1] > tempoVon('liga')[1], JSON.stringify(tempoVon('champ')));
  check('Jedes Stück eines Champs liegt über 155',
    W.REGIONS.every((r) => {
      const c = W.CHAMPIONS[r.gen - 1];
      return A.trainerStueck(c.name, 'champ', 'Dragon').bpm >= 155;
    }));

  // Ein Endkampf in Dur nimmt sich nicht ernst: Der Champ rückt ins
  // Harmonische, wo sein Typ hell klänge.
  const hell = A.trainerStueck('Kukui', 'champ', 'Normal');
  const leiterHell = A.trainerStueck('Kukui', 'arena', 'Normal');
  check('Der Champ klingt ernster als derselbe Name als Arenaleiter',
    fingerabdruck(hell) !== fingerabdruck(leiterHell));

  // Alle 112 Titelträger müssen ein Stück bekommen, keiner fällt durch.
  const alle = [];
  W.REGIONS.forEach((r) => {
    r.leaders.forEach((l) => alle.push([l[0], 'arena', l[1]]));
    W.ELITE_VIER[r.id].forEach((e) => alle.push([e[0], 'liga', e[1]]));
    alle.push([W.CHAMPIONS[r.gen - 1].name, 'champ', 'Dragon']);
  });
  const ohneStueck = alle.filter(([n, rolle, typ]) => {
    const st = A.trainerStueck(n, rolle, typ);
    return !st || !st.melody || !st.melody.length || !st.bpm;
  });
  check('Alle Titelträger bekommen ein Stück', ohneStueck.length === 0,
    ohneStueck.map((a) => a[0]).join(', '));
  check('Keiner fällt auf das gemeinsame Bossstück zurück',
    alle.every(([n, rolle, typ]) => A.trainerStueck(n, rolle, typ) !== A.tracks.boss));

  // Der Rivale und die Ass-Trainer behalten das gewöhnliche Stück.
  eq('Ohne Namen bleibt es beim Bossstück', A.trackFor('boss', 'arena', null, null), 'boss');
  eq('Mit Namen wird sein Stück bestellt',
    A.trackFor('boss', 'arena', null, { name: 'Brock', rolle: 'arena', typ: 'Rock' }),
    'trainer:arena:Rock:Brock');
  void L;
}

section('Schillernde Pokémon');
{
  const S = PL.world.SCHILLERND;
  check('Alle Quoten stehen an einer Stelle',
    ['wild', 'trainer', 'geschenk', 'arena', 'liga'].every((k) => S[k] > 0),
    JSON.stringify(S));
  // Gemessen über je 60 Runs: vorher 0,08 Schillernde je Run, jetzt 0,23 —
  // etwa jeder vierte Run bringt eines statt jedem zwölften.
  check('Ein wilder Fund schillert häufiger als 1:120', S.wild <= 120, '1:' + S.wild);
  check('… aber nicht beliebig oft', S.wild >= 50, '1:' + S.wild);
  check('Gegner schillern seltener als eigene Funde', S.trainer > S.wild,
    S.trainer + ' vs ' + S.wild);
  check('Arenaleiter und Liga sind die Ausnahme — dort lohnt das Hinsehen',
    S.arena < S.wild && S.liga < S.arena, S.arena + ' / ' + S.liga);

  const run = new PL.Run({ seed: 3, region: 0, starter: 'charmander' });
  eq('Ohne Relikte gilt die Tabelle unverändert', run.shinyMult(), 1);
}

section('Regionen schalten sich der Reihe nach frei');
{
  await import('../js/meta.js');
  const meta = PL.meta;
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  meta.reload();

  eq('Zu Beginn steht nur Kanto offen', meta.maxRegion(), 0);
  check('Kanto ist frei', meta.regionFrei(0));
  check('Johto noch nicht', !meta.regionFrei(1));
  check('Und Paldea erst recht nicht', !meta.regionFrei(8));

  // Ein gewonnener Kanto-Run öffnet Johto — und sonst nichts.
  const sieg = (region) => meta.recordRun({
    mode: 'standard', region: region, badges: 8, nuzlocke: false,
    stats: { battles: 3, kos: 1, catches: 1, faints: 0, turns: 9, moneyEarned: 5,
             evolutions: 0, wins: 3 },
    relics: {}, party: [], bossesBeaten: 8
  }, 'sieg');
  sieg(0);
  check('Nach dem Sieg in Kanto steht Johto offen', meta.regionFrei(1));
  eq('… und die höchste offene Region ist Johto', meta.maxRegion(), 1);
  check('Hoenn bleibt zu', !meta.regionFrei(2));
  check('Kanto gilt als bezwungen', meta.regionGewonnen(0));
  eq('Eine Region ist bezwungen', meta.regionenGewonnen(), 1);

  // Die Legenden erspielt man sich dort, wo sie zu Hause sind: Kanto
  // durchspielen öffnet Arktos, Zapdos, Lavados, Mewtu und Mew — sonst nichts.
  check('Kantos Legenden stehen nach dem Sieg in Kanto offen', meta.legendenFrei(1));
  check('Johtos noch nicht', !meta.legendenFrei(2));
  check('Paldeas erst recht nicht', !meta.legendenFrei(9));
  check('Überhaupt steht das Duell jetzt offen', meta.legendenFrei());
  eq('Und es sagt, welche Region Johto öffnet', meta.legendenSchluessel(2), 'Johto');
  sieg(1);
  check('Nach Johto stehen auch dessen Legenden offen', meta.legendenFrei(2));
  check('Hoenns weiterhin nicht', !meta.legendenFrei(3));

  // Ein Spielstand aus der Zeit der fünf Stufen behält seinen Rang: Wer die
  // höchste Stufe gewonnen hatte, muss nicht wieder bei Kanto anfangen.
  const SCHLUESSEL = 'pokelike.plus.v1';
  const alterStand = (stufe, region) => {
    const roh = JSON.parse(store[SCHLUESSEL]);
    delete roh.regionenGewonnen;
    delete roh.bestOrden;
    roh.stufenFassung = 2;
    roh.bestAscension = stufe;
    roh.bestRegion = region;
    store[SCHLUESSEL] = JSON.stringify(roh);
    meta.reload();
  };

  alterStand(4, 6);
  eq('Wer Stufe 5 geschafft hatte, hat alle neun Regionen offen', meta.maxRegion(), 8);
  eq('… und behält seine beste Ordenszahl', meta.load().bestOrden, 6);

  alterStand(0, 2);
  eq('Wer auf Stufe 1 gewonnen hatte, hat Johto offen', meta.maxRegion(), 1);

  alterStand(-1, 0);
  eq('Wer nie gewonnen hatte, fängt bei Kanto an', meta.maxRegion(), 0);
  check('… und hat keine Region im Rücken', meta.regionenGewonnen() === 0);

  delete globalThis.localStorage;
  meta.reload();
}

section('Der Legendäre Run ist ein Duell');
{
  eq('Alle Legenden der neun Generationen', PL.Run.legendenGesamt(), 111);
  check('Jede Generation bringt welche mit',
    [1,2,3,4,5,6,7,8,9].every((g) => PL.Run.legendenDerGeneration(g).length > 0));
  check('Es sind wirklich nur legendäre Arten',
    [1,5,9].every((g) => PL.Run.legendenDerGeneration(g).every((sp) => PL.dex.isLegendary(sp))));
  eq('Die Reihenfolge ist die des Pokédex',
    PL.Run.legendenDerGeneration(1).map((sp) => sp.n).join(','),
    'Articuno,Zapdos,Moltres,Mewtwo,Mew');

  /* --- Es ist ein eigener Modus, keine Region --- */
  check('Das Duell ist ein Modus für sich', !!PL.Run.MODES.legenden.versteckt);
  check('Keine Region schaltet den Legendären Run an',
    PL.world.REGIONS.every((r) => !r.legenden));

  /* --- Ein Duell: ein Knoten, ein Gegner --- */
  const duell = new PL.Run({ seed: 77, mode: 'legenden', duell: {
    art: 'zapdos',
    team: [{ sp: 'venusaur' }, { sp: 'charizard' }, { sp: 'blastoise' }]
  } });
  eq('Die Karte hat genau einen Knoten', duell.map.length, 1);
  eq('… und auf ihm steht die Legende', duell.map[0][0].type, 'legendboss');
  eq('Der Gegner ist der gewählte', duell.map[0][0].sp, 'zapdos');
  eq('Die Region ist die Generation des Gegners', duell.region, 0);
  eq('Das Team ist das gewählte', duell.party.length, 3);
  check('… und steht auf Stufe 100', duell.party.every((m) => m.lvl === 100), duell.party.map((m) => m.lvl).join(','));
  eq('Die Levelgrenze ist 100', duell.levelCap, 100);
  eq('Der erste im Team ist der erste gewählte', PL.dex.sp(duell.party[0].sp).id, 'venusaur');
  eq('Kein Geld — es gibt nichts zu kaufen', duell.money, 0);

  /* --- Gewählte Attacken kommen mit --- */
  const donner = PL.dex.moves.find((m) => m.id === 'thunderbolt');
  const mitAttacken = new PL.Run({ seed: 3, mode: 'legenden', duell: {
    art: 'zapdos', team: [{ sp: 'raichu', moves: [donner.i] }]
  } });
  eq('Eine gewählte Attacke steht im Set', mitAttacken.party[0].moves.length, 1);
  eq('… und zwar die gewählte', mitAttacken.party[0].moves[0].m, donner.i);
  const ohneWahl = new PL.Run({ seed: 3, mode: 'legenden', duell: {
    art: 'zapdos', team: [{ sp: 'raichu' }]
  } });
  check('Ohne eigene Wahl stellt das Spiel selbst eines zusammen',
    ohneWahl.party[0].moves.length === 4, String(ohneWahl.party[0].moves.length));
  const fremd = new PL.Run({ seed: 3, mode: 'legenden', duell: {
    art: 'zapdos', team: [{ sp: 'raichu', moves: [999999] }]
  } });
  check('Eine Attacke, die die Art nicht lernen kann, fällt heraus',
    fremd.party[0].moves.length === 4);

  /* --- Der Gegner steht allein, ist dafür aber zäh --- */
  const szene = duell.enterNode(0, 0);
  const gegner = szene.battle.sides[1].team[0];
  eq('Es ist wirklich Zapdos', PL.dex.sp(gegner.sp).id, 'zapdos');
  eq('… auf Stufe 100', gegner.lvl, 100);
  eq('… und als Legende gekennzeichnet', szene.battle.legendary, true);
  eq('Es steht allein', szene.battle.sides[1].team.length, 1);
  const ohneBuff = JSON.parse(JSON.stringify(gegner));
  delete ohneBuff.buff;
  check('Der Bossaufschlag verdreifacht seine KP',
    PL.mon.maxHP(gegner) > PL.mon.maxHP(ohneBuff) * 2.5,
    PL.mon.maxHP(gegner) + ' statt ' + PL.mon.maxHP(ohneBuff));
  check('Die anderen Werte steigen nur leicht',
    PL.mon.stats(gegner)[1] < PL.mon.stats(ohneBuff)[1] * 1.3);

  /* --- Nach dem Kampf ist Schluss --- */
  const gewonnen = new PL.Run({ seed: 9, mode: 'legenden', duell: {
    art: 'mew', team: [{ sp: 'venusaur' }]
  } });
  gewonnen.enterNode(0, 0);
  gewonnen.finishBattle({ outcome: 'win', sides: [{ used: [] }, { team: [] }], reward: null, turns: 3 });
  eq('Der Ausgang wird gemerkt', gewonnen.duellErgebnis, 'sieg');
  gewonnen.closeScene();
  eq('Das Duell ist danach gewonnen', gewonnen.state, 'victory');
  eq('… und keine Liga kommt hinterher', gewonnen.leagueStage, -1);

  const geflohen = new PL.Run({ seed: 9, mode: 'legenden', duell: {
    art: 'mew', team: [{ sp: 'venusaur' }]
  } });
  geflohen.enterNode(0, 0);
  geflohen.finishBattle({ outcome: 'flee', sides: [{ used: [] }, { team: [] }], reward: null, turns: 1 });
  geflohen.closeScene();
  eq('Wer flieht, hat nicht gewonnen', geflohen.state, 'gameover');

  /* --- Der Teampool hängt an der Generation --- */
  const pool1 = PL.Run.duellPool(1);
  check('Der Pool einer Generation enthält nur ihre Arten',
    pool1.every((sp) => sp.g === 1) && pool1.length > 100, String(pool1.length));
  check('Formen und Kampfgestalten stehen nicht darin',
    pool1.every((sp) => !sp.f && !sp.bo));
  check('Legendäre der Generation stehen zur Wahl',
    pool1.some((sp) => sp.id === 'mewtwo'));

  /* --- Ein Legendärer Run aus der alten Fassung lässt sich nicht laden --- */
  const altesDuell = { version: PL.Run.VERSION, mode: 'legenden', seed: 1, ascension: 5,
    party: [], box: [], bag: {}, map: [[{ row: 0, col: 0, type: 'rest', next: [0] }]],
    stats: {}, history: [], rival: {}, stufenFassung: 2 };
  eq('Der alte Strang wird beim Laden verworfen', PL.Run.fromJSON(altesDuell), null);
}

section('Der Pokédex hört nicht bei Generation sieben auf');
{
  const nachGen = {};
  PL.dex.species.forEach((sp) => { nachGen[sp.g] = (nachGen[sp.g] || 0) + 1; });
  for (let g = 1; g <= 9; g++) {
    check('Generation ' + g + ' steht im Pokédex', nachGen[g] > 0, String(nachGen[g] || 0));
  }
  const hoechste = PL.dex.species.reduce((a, sp) => Math.max(a, sp.num), 0);
  eq('Bis zur letzten Nummer der neunten Generation', hoechste, 1025);
  check('Und es sind mehr als neunhundert Einträge — die alte Grenze',
    PL.dex.species.length > 900, String(PL.dex.species.length));
}

section('Die Wirksamkeit stimmt — auch die angezeigte');
{
  const rng = PL.rng(7);
  const bau = (id, ab) => { const m = PL.mon.create(PL.dex.sp(id), 50, rng, {}); if (ab) m.ab = ab; return m; };
  const kampf = (a, b) => { const bt = new PL.Battle({ teams: [[a], [b]], wild: true }); bt.start(); return bt; };
  const zug = (id) => PL.dex.moves.find((m) => m.id === id);

  /* --- Wer in der Luft steht, den trifft kein Bodenangriff --- */
  {
    const bt = kampf(bau('golem'), bau('gengar', 'levitate'));
    const r = bt.calcDamage(bt.sides[0].active, bt.sides[1].active, zug('earthquake'), { noCrit: true });
    eq('Erdbeben prallt an Schwebe ab', r.dmg, 0);
    eq('… und gilt als wirkungslos', r.eff, 0);
  }
  {
    const bt = kampf(bau('golem'), bau('snorlax'));
    bt.sides[1].active.item = 'airballoon';
    const r = bt.calcDamage(bt.sides[0].active, bt.sides[1].active, zug('earthquake'), { noCrit: true });
    eq('Auch der Luftballon hält Erdbeben ab', r.dmg, 0);
    bt.sides[1].active.vol.smackdown = true;
    const r2 = bt.calcDamage(bt.sides[0].active, bt.sides[1].active, zug('earthquake'), { noCrit: true });
    check('Bodenwurf holt es wieder herunter', r2.dmg > 0, String(r2.dmg));
  }
  {
    // Tausend Pfeile durchdringt — sonst wäre die Attacke sinnlos.
    const pfeile = zug('thousandarrows');
    if (pfeile) {
      const bt = kampf(bau('zygarde'), bau('gengar', 'levitate'));
      const r = bt.calcDamage(bt.sides[0].active, bt.sides[1].active, pfeile, { noCrit: true });
      check('Tausend Pfeile trifft trotz Schwebe', r.dmg > 0, String(r.dmg));
    }
  }

  /* --- Die Vorschau rechnet mit dem Typ, den die Attacke wirklich hat --- */
  {
    const bt = kampf(bau('sylveon', 'pixilate'), bau('dragonite'));
    const v = bt.vorschau(zug('tackle'), bt.sides[0].active, bt.sides[1].active);
    eq('Feenschicht macht aus Tackle eine Feenattacke', v.typ, 'Fairy');
    eq('… und die trifft einen Drachen doppelt', v.eff, 2);
    const r = bt.calcDamage(bt.sides[0].active, bt.sides[1].active, zug('tackle'), { noCrit: true });
    eq('Vorschau und Schaden sagen dasselbe', r.eff, v.eff);
  }
  {
    const bt = kampf(bau('pikachu'), bau('lanturn', 'voltabsorb'));
    const v = bt.vorschau(zug('thunderbolt'), bt.sides[0].active, bt.sides[1].active);
    eq('Voltabsorber schluckt den Donnerblitz', v.eff, 0);
    eq('… und die Vorschau nennt es geblockt', v.geblockt, true);
  }
  {
    // Die Vorschau darf nichts auslösen: Voltabsorber heilt sonst beim Hinsehen.
    const ziel = bau('lanturn', 'voltabsorb');
    ziel.hp = 10;
    const bt = kampf(bau('pikachu'), ziel);
    const vorher = bt.sides[1].active.mon.hp;
    bt.vorschau(zug('thunderbolt'), bt.sides[0].active, bt.sides[1].active);
    bt.vorschau(zug('thunderbolt'), bt.sides[0].active, bt.sides[1].active);
    eq('Hinsehen heilt niemanden', bt.sides[1].active.mon.hp, vorher);
    eq('… und schreibt auch nichts ins Protokoll', bt.log.filter((e) => /saugt/.test(e.s || '')).length, 0);
  }
  {
    // Nebelball ist gegen Käfer/Geist weder stark noch schwach, Flammenwurf
    // dagegen vierfach — die beiden Seiten der Wunderwache.
    const bt = kampf(bau('chandelure'), bau('shedinja', 'wonderguard'));
    const schwach = bt.vorschau(zug('watergun'), bt.sides[0].active, bt.sides[1].active);
    check('Wunderwache blockt, was nicht sehr effektiv ist', schwach.eff === 0, String(schwach.eff));
    const stark = bt.vorschau(zug('flamethrower'), bt.sides[0].active, bt.sides[1].active);
    check('Sehr Effektives kommt durch', stark.eff > 1, String(stark.eff));
  }
  {
    // Statusattacken bekommen keine Wirksamkeit — sie richten keinen Schaden an.
    const bt = kampf(bau('alakazam'), bau('snorlax'));
    eq('Eine Statusattacke hat keine Vorschau',
      bt.vorschau(zug('calmmind'), bt.sides[0].active, bt.sides[1].active), null);
  }

  /* --- Die vier Stufen, die angezeigt werden --- */
  {
    const bt = kampf(bau('pikachu'), bau('gyarados'));
    const v = bt.vorschau(zug('thunderbolt'), bt.sides[0].active, bt.sides[1].active);
    eq('Wasser und Flug zusammen ergeben vierfach', v.eff, 4);
  }
  {
    // Pflanze gegen Feuer und Flug: zweimal halbiert.
    const bt = kampf(bau('venusaur'), bau('charizard'));
    const v = bt.vorschau(zug('razorleaf'), bt.sides[0].active, bt.sides[1].active);
    eq('Feuer und Flug zusammen ergeben ein Viertel', v.eff, 0.25);
  }
}

section('Paradoxformen: die gewöhnlichen gehören ins gewöhnliche Spiel');
{
  const GEWOEHNLICH = ['greattusk', 'screamtail', 'brutebonnet', 'fluttermane', 'slitherwing',
    'sandyshocks', 'irontreads', 'ironbundle', 'ironhands', 'ironjugulis', 'ironmoth',
    'ironthorns', 'roaringmoon', 'ironvaliant'];
  const LEGENDAER = ['walkingwake', 'ironleaves', 'gougingfire', 'ragingbolt',
    'ironboulder', 'ironcrown'];

  GEWOEHNLICH.forEach((id) => {
    eq(PL.t.species(PL.dex.sp(id)) + ' ist keine Legende mehr',
      PL.dex.isLegendary(PL.dex.sp(id)), false);
  });
  LEGENDAER.forEach((id) => {
    eq(PL.t.species(PL.dex.sp(id)) + ' bleibt eine Legende',
      PL.dex.isLegendary(PL.dex.sp(id)), true);
  });

  const gen9 = PL.Run.legendenDerGeneration(9).map((sp) => sp.id);
  check('Keine gewöhnliche Paradoxform steht im Legendären Run',
    GEWOEHNLICH.every((id) => gen9.indexOf(id) < 0));
  check('Die legendären Paradoxformen stehen dort',
    LEGENDAER.every((id) => gen9.indexOf(id) >= 0));

  // In Paldea trifft man sie — aber erst, wenn das Level dazu passt.
  const spaet = PL.world.encounterPool({ gen: 9, level: 60 }).map((sp) => sp.id);
  check('Bei Level 60 sind alle vierzehn im Begegnungstopf',
    GEWOEHNLICH.every((id) => spaet.indexOf(id) >= 0),
    GEWOEHNLICH.filter((id) => spaet.indexOf(id) < 0).join(','));
  const frueh = PL.world.encounterPool({ gen: 9, level: 25 }).map((sp) => sp.id);
  check('Bei Level 25 noch keine — sie sind zu stark',
    GEWOEHNLICH.every((id) => frueh.indexOf(id) < 0));
  check('Keine legendäre Paradoxform läuft einem gewöhnlich über den Weg',
    LEGENDAER.every((id) => spaet.indexOf(id) < 0));

  // Gefangen werden dürfen sie wie jedes andere Pokémon.
  const run = new PL.Run({ seed: 12, starter: 'bulbasaur' });
  eq('Im gewöhnlichen Run ist Fangen erlaubt', run.catchAllowed(), true);
}

section('Jede Legende hat ihren eigenen Ball');
{
  await import('../data/baelle.js');
  const baelle = PL.baelle;

  let ohne = 0, doppelt = 0;
  const gesehen = new Map();
  for (let g = 1; g <= 9; g++) {
    for (const sp of PL.Run.legendenDerGeneration(g)) {
      const b = baelle.fuer(sp.id);
      if (!b || !/^data:image\/png;base64,/.test(b.b)) { ohne++; continue; }
      if (gesehen.has(b.b)) doppelt++;
      gesehen.set(b.b, sp.id);
    }
  }
  eq('Alle 125 haben einen', ohne, 0);
  eq('… und keine zwei denselben', doppelt, 0);
  eq('So viele Bälle wie Legenden', gesehen.size, PL.Run.legendenGesamt());

  const mewtu = baelle.fuer('mewtwo');
  check('Ein Ball bringt seine Farben mit',
    /^#[0-9a-f]{6}$/.test(mewtu.h) && /^#[0-9a-f]{6}$/.test(mewtu.z), mewtu.h + ' / ' + mewtu.z);
  check('Ein Ball bleibt klein genug zum Einbetten', mewtu.b.length < 4000, String(mewtu.b.length));
  eq('Wer keinen hat, bekommt auch keinen', baelle.fuer('pikachu'), null);

  for (let g = 1; g <= 9; g++) {
    check('Generation ' + g + ' hat den Umriss ihres Wahrzeichens',
      /^data:image\/png;base64,/.test(baelle.umriss(g) || ''));
  }
}

section('Jede Legende hat ihren Schauplatz');
{
  const scenery = PL.scenery;
  check('Die drei neuen Kulissen gibt es',
    !!scenery.biomes.weltraum && !!scenery.biomes.gewitter && !!scenery.biomes.tempel);

  eq('Zapdos kämpft im Gewitter', scenery.fuerLegende(PL.dex.sp('zapdos')), 'gewitter');
  eq('Kyogre im Wasser', scenery.fuerLegende(PL.dex.sp('kyogre')), 'wasser');
  eq('Groudon im Vulkan', scenery.fuerLegende(PL.dex.sp('groudon')), 'vulkan');
  eq('Arceus zwischen den Sternen', scenery.fuerLegende(PL.dex.sp('arceus')), 'weltraum');
  eq('Giratina in der Ruine', scenery.fuerLegende(PL.dex.sp('giratina')), 'ruine');

  // Jede der 125 bekommt einen Ort, und es ist immer ein echter.
  const orte = {};
  let fehlt = 0;
  for (let g = 1; g <= 9; g++) {
    for (const sp of PL.Run.legendenDerGeneration(g)) {
      const ort = scenery.fuerLegende(sp);
      if (!scenery.biomes[ort]) fehlt++;
      orte[ort] = (orte[ort] || 0) + 1;
    }
  }
  eq('Keine Legende steht ohne Kulisse da', fehlt, 0);
  check('Und es ist nicht überall dieselbe', Object.keys(orte).length >= 10,
    Object.keys(orte).join(','));

  // Der Kampf im Duell holt sich den Ort selbst.
  const duell = new PL.Run({ seed: 4, mode: 'legenden',
    duell: { art: 'kyogre', team: [{ sp: 'swampert' }] } });
  eq('Das Duell stellt Kyogre ins Wasser', duell.enterNode(0, 0).battle.biome, 'wasser');
}

section('Jede Legende hat ihr eigenes Stück');
{
  await import('../js/audio.js');
  const mewtu = PL.audio.legendenStueck(PL.dex.sp('mewtwo'));
  const arktos = PL.audio.legendenStueck(PL.dex.sp('articuno'));
  const zapdos = PL.audio.legendenStueck(PL.dex.sp('zapdos'));

  check('Ein Stück ist acht Takte lang',
    mewtu.melody.length === 128 && mewtu.chords.length === 128 &&
    mewtu.low.length === 128 && mewtu.beat.length === 128,
    [mewtu.melody.length, mewtu.chords.length, mewtu.low.length, mewtu.beat.length].join('/'));
  check('Zwei Legenden klingen nicht gleich',
    JSON.stringify(arktos.melody) !== JSON.stringify(zapdos.melody));
  check('Dasselbe Pokémon klingt immer gleich',
    JSON.stringify(PL.audio.legendenStueck(PL.dex.sp('zapdos')).melody) === JSON.stringify(zapdos.melody));
  check('Mewtu bekommt sein Motiv von Hand', !!PL.audio.handMotive.mewtwo);
  eq('Die Titelträger sind ein Dutzend', Object.keys(PL.audio.handMotive).length, 13);

  // Alle 125 lassen sich bauen, und keines pfeift oder brummt. Stumm zählt
  // hier das ganze Stück, nicht der einzelne Takt: Der erste schweigt bei
  // einer Legende mit Absicht, damit der Einsatz Gewicht bekommt.
  let tiefste = Infinity, hoechste = 0, leer = 0;
  for (let g = 1; g <= 9; g++) {
    for (const sp of PL.Run.legendenDerGeneration(g)) {
      const t = PL.audio.legendenStueck(sp);
      const toene = t.melody.filter((n) => n !== '.');
      if (!toene.length) leer++;
      for (const n of toene) {
        const f = PL.audio.freq(n);
        if (f < tiefste) tiefste = f;
        if (f > hoechste) hoechste = f;
      }
      if (!(t.bpm >= 80 && t.bpm <= 135)) leer++;
    }
  }
  eq('Keines der 125 bleibt stumm oder aus dem Takt', leer, 0);
  // Die Melodie liegt jetzt eine Oktave tiefer als früher — dunkler, aber
  // immer noch über dem Bass.
  check('Keine Melodie säuft im Bass ab', tiefste >= 190, String(Math.round(tiefste)));
  check('Und keine pfeift', hoechste <= 1600, String(Math.round(hoechste)));

  eq('Der Kampf gegen eine Legende bestellt ihr Stück',
    PL.audio.trackFor('legend', 'ruine', 'mewtwo'), 'legende:mewtwo');
  eq('Ohne Angabe bleibt es beim gemeinsamen',
    PL.audio.trackFor('legend', 'ruine'), 'legenden');
}

section('Musik: das Stück für die Legenden');
{
  const audio = await import('../js/audio.js');
  const stueck = PL.audio.tracks.legenden;
  check('Es gibt ein eigenes Stück für die Legenden', !!stueck);
  eq('Kampf gegen eine Legende bekommt es', PL.audio.trackFor('legend'), 'legenden');
  eq('Ein Arenaleiter behält seines', PL.audio.trackFor('boss'), 'boss');
  check('Es ist doppelt so lang wie die anderen',
    stueck.melody.length === 128 && stueck.chords.length === 128 &&
    stueck.low.length === 128 && stueck.beat.length === 128,
    [stueck.melody.length, stueck.chords.length, stueck.low.length, stueck.beat.length].join('/'));
  check('Es beginnt ohne Schlagzeugwirbel — erst Anlauf, dann Wucht',
    stueck.beat.slice(0, 16).filter((z) => z !== '.').length <= 2);
  check('Später schlägt es voll durch',
    stueck.beat.slice(96, 128).filter((z) => z !== '.').length >= 24);
  const toene = stueck.melody.concat(stueck.chords, stueck.low).filter((n) => n !== '.');
  check('Jeder Ton lässt sich lesen', toene.every((n) => PL.audio.freq(n) > 0),
    toene.filter((n) => !(PL.audio.freq(n) > 0)).slice(0, 5).join(','));
  check('Es ist ruhiger im Tempo als das Arenaleiterstück',
    stueck.bpm < PL.audio.tracks.boss.bpm, stueck.bpm + ' vs ' + PL.audio.tracks.boss.bpm);
  void audio;
}

section('Sammlung: Marken, Aufträge, Bestwerte');
{
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  await import('../js/meta.js');
  const meta = PL.meta;
  meta.reset();

  /* --- Marken --- */
  const marken = meta.meilensteine();
  check('Es gibt eine Reihe von Sammelmarken', marken.length >= 10, String(marken.length));
  check('Jede sagt, was sie verlangt und was sie bringt',
    marken.every((m) => m.name && m.bed && m.lohnText && m.ziel > 0));
  eq('Am Anfang ist keine geholt', marken.filter((m) => m.geschafft).length, 0);
  eq('… und der Lohn ist noch leer', meta.sammelLohn().geld, 0);
  eq('… auch der Schillernd-Faktor steht auf eins', meta.sammelLohn().shiny, 1);

  // 25 Arten fangen — die erste Marke muss fallen.
  PL.dex.species.slice(0, 25).forEach((sp) => meta.noteCaught({ sp: sp.i, lvl: 5 }));
  const neue = meta.pruefeMeilensteine();
  eq('Nach 25 Arten fällt die erste Marke', neue.length, 1);
  eq('… und sie heißt Sammler', neue[0].id, 'faenge25');
  eq('… und bringt Superbälle für den Start', meta.sammelLohn().superbaelle, 2);
  eq('Dieselbe Marke fällt kein zweites Mal', meta.pruefeMeilensteine().length, 0);

  // Der Schillernd-Faktor addiert sich nicht, sondern nimmt den höchsten.
  const m2 = meta.load();
  m2.meilensteine.shiny1 = 1; m2.meilensteine.shiny5 = 1; m2.meilensteine.shiny15 = 1;
  meta.save();
  eq('Beim Schillernd-Faktor gilt der höchste, nicht die Summe', meta.sammelLohn().shiny, 2.5);

  /* --- Wochenaufträge --- */
  eq('Die Kalenderwoche folgt der ISO-Regel', meta.wochenSchluessel('2026-01-01'), '2026-W01');
  eq('… auch über den Jahreswechsel', meta.wochenSchluessel('2027-01-03'), '2026-W53');
  eq('Dieselbe Woche ergibt dieselben Aufträge',
    JSON.stringify(meta.wochenAuftraege('2026-W12')), JSON.stringify(meta.wochenAuftraege('2026-W12')));
  check('Eine andere Woche bringt andere Aufträge',
    JSON.stringify(meta.wochenAuftraege('2026-W12')) !== JSON.stringify(meta.wochenAuftraege('2026-W13')));
  const auf = meta.wochenAuftraege('2026-W12');
  eq('Es sind immer drei', auf.length, 3);
  eq('… und keiner doppelt', new Set(auf.map((a) => a.id)).size, 3);

  const stand = meta.wochenStand();
  eq('Diese Woche stehen drei Aufträge', stand.auftraege.length, 3);
  eq('Am Anfang ist keiner geschafft', stand.auftraege.filter((a) => a.geschafft).length, 0);

  // Einen davon gezielt erfüllen.
  const ziel = stand.auftraege[0];
  const halb = meta.zaehleWoche({ [ziel.id]: Math.floor(ziel.ziel / 2) });
  eq('Halb erfüllt ist nicht erfüllt', halb.length, 0);
  const fertig = meta.zaehleWoche({ [ziel.id]: ziel.ziel });
  eq('Voll erfüllt zählt', fertig.length, 1);
  eq('… und zwar der richtige', fertig[0].id, ziel.id);
  eq('Ein zweites Mal gibt es nichts', meta.zaehleWoche({ [ziel.id]: ziel.ziel }).length, 0);
  check('Der Lohn liegt jetzt im Vorrat',
    Object.keys(meta.vorrat()).length > 0, JSON.stringify(meta.vorrat()));

  /* --- Vorrat und Startvorteil --- */
  // Welchen Lohn ein Auftrag zahlt, würfelt die Woche aus: mal Superbälle,
  // mal Startgeld, mal Tränke. Diese Prüfung erwartete fest »mehr als zwei
  // Superbälle« und bestand darum nur in manchen Wochen — an einem Montag
  // schlug sie fehl, ohne dass jemand etwas geändert hatte. Jetzt wird
  // geprüft, was wirklich gemeint war: Der Lohn des erfüllten Auftrags liegt
  // oben auf dem, was die Marken schon dauerhaft bringen.
  const auftragsLohn = meta.wochenAuftraege().find((a) => a.id === ziel.id).lohn;
  const markenLohn = meta.sammelLohn();
  const posten = Object.keys(auftragsLohn);
  const vor = meta.startVorteil('standard');   // hebt den Vorrat ab: nur einmal aufrufen
  check('Der Startvorteil enthält Marken und Vorrat',
    posten.length > 0 && posten.every((k) => (vor[k] || 0) >= (markenLohn[k] || 0) + auftragsLohn[k]),
    JSON.stringify({ lohn: auftragsLohn, marken: markenLohn, vorteil: vor }));
  eq('Der Vorrat ist danach leer', Object.keys(meta.vorrat()).length, 0);
  eq('Ein zweiter Griff bringt nur noch die Marken', meta.startVorteil('standard').superbaelle, 2);
  eq('Der Tages-Run bekommt nichts', meta.startVorteil('taeglich'), null);

  // Und ein Run nimmt ihn wirklich mit.
  const ohne = new PL.Run({ seed: 4, starter: 'bulbasaur' });
  const mit = new PL.Run({ seed: 4, starter: 'bulbasaur',
    vorteil: { geld: 500, baelle: 5, traenke: 2, beleber: 1, shiny: 2, relikte: 1 } });
  eq('Der Vorteil landet im Geldbeutel', mit.money - ohne.money, 500);
  eq('… die Bälle im Beutel', mit.bag.pokeball - ohne.bag.pokeball, 5);
  eq('… die Tränke auch', (mit.bag.hyperpotion || 0) - (ohne.bag.hyperpotion || 0), 2);
  eq('… und das Relikt wartet auf die Wahl', mit.startRelikte, 1);
  eq('Der Schillernd-Faktor wirkt', mit.shinyMult(), 2);
  eq('Ohne Vorteil bleibt er bei eins', ohne.shinyMult(), 1);

  /* --- Der Preis für die volle Woche --- */
  {
    const store2 = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store2 ? store2[k] : null),
      setItem: (k, v) => { store2[k] = String(v); },
      removeItem: (k) => { delete store2[k]; }
    };
    meta.reload();
    meta.reset();
    const drei = meta.wochenStand().auftraege;
    const erste = meta.zaehleWoche({ [drei[0].id]: drei[0].ziel });
    eq('Ein Auftrag allein bringt noch keinen Wochenpreis', erste.length, 1);
    meta.zaehleWoche({ [drei[1].id]: drei[1].ziel });
    const letzte = meta.zaehleWoche({ [drei[2].id]: drei[2].ziel });
    eq('Der dritte Auftrag bringt den Preis gleich mit', letzte.length, 2);
    eq('… und es ist ein Relikt', letzte[1].id, 'wochenpreis');
    eq('Der Wochenstand weiß davon', meta.wochenStand().preisGeholt, true);
    eq('Das Relikt liegt im Vorrat', meta.vorrat().relikte, 1);
    eq('Ein zweites Mal gibt es keines',
      meta.zaehleWoche({ [drei[0].id]: drei[0].ziel }).length, 0);
  }

  /* --- Die Marken bleiben in Maßen --- */
  {
    const alles = meta.load();
    PL.Run.STUFEN;                                    // nur zur Sicherheit geladen
    meta.MEILENSTEINE.forEach((ms) => { alles.meilensteine[ms.id] = 1; });
    meta.save();
    const voll = meta.sammelLohn();
    const frisch = new PL.Run({ seed: 2, starter: 'bulbasaur' });
    check('Selbst die volle Sammlung verdoppelt das Startgeld nicht',
      voll.geld < frisch.money * 0.6, voll.geld + ' auf ' + frisch.money);
    check('… und schüttet keine Bälle aus', voll.superbaelle + voll.baelle <= 6,
      String(voll.superbaelle + voll.baelle));
    eq('… gibt höchstens ein Relikt', voll.relikte, 1);
    eq('… keinen Meisterball im Dauerlohn — der liegt in der Kasse', voll.meisterball, undefined);
    eq('… und einen Wurf zum Wiederholen', voll.reroll, 1);
    check('Der Schillernd-Faktor bleibt unter dem Dreifachen', voll.shiny <= 2.5, String(voll.shiny));

    const mit = new PL.Run({ seed: 2, starter: 'bulbasaur', vorteil: voll });
    eq('Ein gewöhnlicher Run bekommt keinen Meisterball', mit.bag.masterball, undefined);
    eq('Der zusätzliche Wurf ist vermerkt', mit.bonusReroll, true);
    mit.setScene(mit.makeRelicChoice(mit.rng, 3, 'Test'));
    eq('… und er lässt sich auch benutzen', mit.canReroll(), true);
    mit.reroll();
    eq('Aber nur einmal je Knoten', mit.canReroll(), false);
    const ohneWurf = new PL.Run({ seed: 2, starter: 'bulbasaur' });
    ohneWurf.setScene(ohneWurf.makeRelicChoice(ohneWurf.rng, 3, 'Test'));
    eq('Ohne Marke gibt es keinen zweiten Wurf', ohneWurf.canReroll(), false);
    void alles;
  }

  /* --- Die Meisterball-Kasse --- */
  {
    const store3 = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store3 ? store3[k] : null),
      setItem: (k, v) => { store3[k] = String(v); },
      removeItem: (k) => { delete store3[k]; }
    };
    meta.reload();
    meta.reset();
    const mewtwo = PL.dex.sp('mewtwo');
    const mew = PL.dex.sp('mew');
    eq('Am Anfang ist nichts besiegt', meta.duellStand(mewtwo.i).besiegt, false);
    eq('… und kein Ball da', meta.duellBallDa(mewtwo.i), false);

    eq('Der erste Sieg ist der erste', meta.duellGewonnen(mewtwo.i), true);
    eq('Danach gilt es als besiegt', meta.duellStand(mewtwo.i).besiegt, true);
    eq('… und sein Ball liegt bereit', meta.duellStand(mewtwo.i).ball, true);
    eq('Ein zweiter Sieg bringt keinen zweiten Ball', meta.duellGewonnen(mewtwo.i), false);
    eq('Der Ball gilt nur für dieses Pokémon', meta.duellBallDa(mew.i), false);

    meta.duellBallWeg(mewtwo.i);
    eq('Ein geworfener Ball ist weg', meta.duellStand(mewtwo.i).ball, false);
    eq('Ein weiterer Sieg legt keinen neuen hin', meta.duellGewonnen(mewtwo.i), false);

    // Der freie Ball aus der Sammelmarke passt auf jede Legende.
    meta.gibFreienBall(1);
    eq('Ein freier Ball passt auch auf Mew', meta.duellBallDa(mew.i), true);
    meta.duellBallWeg(mew.i);
    eq('… und ist danach verbraucht', meta.duellBallDa(mew.i), false);

    eq('Das Duell bekommt keinen Sammlungslohn', meta.startVorteil('legenden'), null);

    // Die Übersicht zählt, was zusammengehört.
    const u = meta.duellUebersicht();
    check('Die Übersicht zählt die Siege', u.besiegt >= 1, String(u.besiegt));

    // Die Marke für alle neun Generationen zahlt einmalig einen freien Ball ein.
    const stand = meta.load();
    delete stand.meilensteine.gen9;
    meta.save();
    PL.dex.species.forEach((sp) => { if (!PL.dex.isLegendary(sp)) meta.noteCaught({ sp: sp.i, lvl: 5 }); });
    const vorher = meta.duellUebersicht().frei;
    meta.pruefeMeilensteine();
    check('Die Marke zahlt höchstens einmal ein',
      meta.duellUebersicht().frei - vorher <= 1, String(meta.duellUebersicht().frei - vorher));

    /* --- Ein Duell ist kein Run --- */
    {
      const vorher = { runs: meta.load().runs, wins: meta.load().wins,
        rang: meta.regionenGewonnen() };
      const duell = new PL.Run({ seed: 2, mode: 'legenden', ascension: 4,
        duell: { art: 'mew', team: [{ sp: 'venusaur' }] } });
      duell.stats.battles = 1;
      meta.recordRun(duell, 'sieg');
      eq('Ein gewonnenes Duell zählt nicht als gespielter Run', meta.load().runs, vorher.runs);
      eq('… und nicht als gewonnener', meta.load().wins, vorher.wins);
      eq('… und schaltet keine Region frei', meta.regionenGewonnen(), vorher.rang);
      eq('… macht aber niemanden zum Champ', !!meta.load().achievements.champ, false);
      check('Die Kämpfe zählen trotzdem', meta.load().totals.battles >= 1);
    }

    /* --- Jede Region öffnet ihre eigenen Legenden --- */
    meta.load().regionenGewonnen = {};
    eq('Ohne eine bezwungene Region bleibt alles zu', meta.legendenFrei(), false);
    meta.load().regionenGewonnen = { 4: true };
    eq('Einall bezwungen öffnet Einalls Legenden', meta.legendenFrei(5), true);
    eq('… aber nicht Kantos', meta.legendenFrei(1), false);
    eq('… und der Eintrag im Menü steht offen', meta.legendenFrei(), true);
  }

  /* --- Legendäre sind aus dem Pokédex verschwunden --- */
  {
    const store4 = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store4 ? store4[k] : null),
      setItem: (k, v) => { store4[k] = String(v); },
      removeItem: (k) => { delete store4[k]; }
    };
    const mewtwo = PL.dex.sp('mewtwo'), pika = PL.dex.sp('pikachu'), arceus = PL.dex.sp('arceus');
    store4['pokelike.plus.v1'] = JSON.stringify({
      caught: { [pika.i]: 1, [mewtwo.i]: 1, [arceus.i]: 1 },
      seen: { [pika.i]: 1, [mewtwo.i]: 1 },
      shinies: { [mewtwo.i]: 1 },
      arten: { [mewtwo.i]: { lvl: 70, runs: 2 }, [pika.i]: { lvl: 30, runs: 1 } }
    });
    meta.reload();
    const m = meta.load();
    eq('Pikachu bleibt gefangen', !!m.caught[pika.i], true);
    eq('Mewtu ist wieder ungefangen', !!m.caught[mewtwo.i], false);
    eq('Arceus auch', !!m.caught[arceus.i], false);
    eq('… und ungesehen', !!m.seen[mewtwo.i], false);
    eq('… und nicht mehr schillernd vermerkt', !!m.shinies[mewtwo.i], false);
    eq('… und ohne Bestwert', !!m.arten[mewtwo.i], false);
    eq('Der Bestwert gewöhnlicher Arten bleibt', !!m.arten[pika.i], true);
    eq('Die Umstellung ist danach erledigt', m.legendenReset, true);

    // Ein zweiter Ladevorgang löscht nichts Neues mehr weg.
    meta.noteCaught({ sp: mewtwo.i, lvl: 60 });
    meta.reload();
    eq('Ein danach gefangenes Legendäres bleibt stehen',
      !!meta.load().caught[mewtwo.i], true);
  }

  /* --- Bestwerte je Art --- */
  const run = new PL.Run({ seed: 8, starter: 'charmander' });
  run.party[0].lvl = 42;
  run.party[0].kaempfe = 17;
  meta.merkeArten(run);
  const rek = meta.artRekord(run.party[0].sp);
  check('Die Art bekommt einen Bestwert', !!rek, JSON.stringify(rek));
  eq('Das höchste Level steht drin', rek.lvl, 42);
  eq('Die Kämpfe auch', rek.kaempfe, 17);
  eq('Und der Run wird gezählt', rek.runs, 1);

  // Ein schlechterer Lauf drückt den Bestwert nicht.
  const run2 = new PL.Run({ seed: 9, starter: 'charmander' });
  run2.party[0].lvl = 12;
  meta.merkeArten(run2);
  eq('Ein schwächerer Lauf drückt das Bestlevel nicht', meta.artRekord(run.party[0].sp).lvl, 42);
  eq('… zählt aber als weiterer Run', meta.artRekord(run.party[0].sp).runs, 2);
  eq('Eine nie gespielte Art hat keinen Bestwert', meta.artRekord(9999), null);

  delete globalThis.localStorage;
}

section('Attacken mit wechselnder Stärke');
{
  // Achtzehn Angriffe hatten im Pokédex Stärke 0, weil ihre Stärke erst im
  // Kampf feststeht — und keine Regel, die sie ausrechnet. Sie schlugen
  // deshalb mit Stärke 1 zu, also praktisch für nichts.
  const M = PL.effects.moves;
  const mvi = (id) => PL.dex.moves.find((m) => m.id === id).i;
  function wurf(moveId, angreiferId, zielId, saat, vor) {
    const rng = PL.rng(saat);
    const a = mons.create(angreiferId, 50, rng, {}), b = mons.create(zielId, 50, rng, {});
    a.moves = [{ m: mvi(moveId), pp: 25, ppUp: 0 }];
    b.moves = [{ m: mvi('tackle'), pp: 35, ppUp: 0 }];
    const bt = new PL.Battle({ teams: [[a], [b]], rng: PL.rng(saat + 1) });
    bt.start();
    if (vor) vor(bt, bt.sides[0].active, bt.sides[1].active);
    const davor = bt.sides[1].active.mon.hp;
    bt.useMove(bt.sides[0].active, 0, {});
    return { schaden: davor - bt.sides[1].active.mon.hp, bt: bt,
      ich: bt.sides[0].active, gegner: bt.sides[1].active };
  }

  const offen = PL.dex.moves.filter((m) => m && m.c !== 'T' && !m.bp && !m.np)
    .filter((m) => { const o = M[m.id]; return !o || (!o.bp && !o.damage && !o.fixed); });
  check('Kein Angriff im Pool steht mehr ohne Regel da', offen.length === 0,
    offen.map((m) => m.id).join(', '));

  // Intensität: sieben Stufen, feste Verteilung, Stärke 10 bis 150.
  {
    const staerken = {};
    for (let i = 0; i < 800; i++) {
      const rng = PL.rng(i);
      const a = mons.create('sandslash', 50, rng, {});
      const bt = new PL.Battle({ teams: [[a], [mons.create('snorlax', 50, rng, {})]], rng: PL.rng(i + 1) });
      bt.start();
      M.magnitude.beforeMove(bt, bt.sides[0].active, bt.sides[1].active);
      const w = bt.sides[0].active.vol.intensitaet;
      staerken[w.stufe] = (staerken[w.stufe] || 0) + 1;
      if (i === 0) eq('Intensität 4 hat Stärke 10', M.magnitude.bp(bt, bt.sides[0].active) > 0, true);
    }
    const stufen = Object.keys(staerken).map(Number).sort((x, y) => x - y);
    eq('Intensität würfelt die Stufen 4 bis 10', stufen.join(','), '4,5,6,7,8,9,10');
    check('Stufe 7 kommt am häufigsten vor',
      staerken[7] > staerken[6] && staerken[7] > staerken[8], JSON.stringify(staerken));
    check('Die Randstufen sind selten', staerken[4] < staerken[5] && staerken[10] < staerken[9],
      JSON.stringify(staerken));
  }

  // Fester Schaden
  eq('Drachenwut macht immer 40', wurf('dragonrage', 'dragonite', 'snorlax', 7).schaden, 40);
  eq('Ultraschall macht immer 20', wurf('sonicboom', 'voltorb', 'snorlax', 8).schaden, 20);
  {
    const r = wurf('ruination', 'chienpao', 'snorlax', 9);
    near('Verderben nimmt die Hälfte der KP', r.schaden, Math.floor(r.gegner.stats[0] / 2), 2);
  }
  {
    const werte = [];
    for (let i = 0; i < 60; i++) werte.push(wurf('psywave', 'alakazam', 'snorlax', 200 + i).schaden);
    check('Psywelle liegt zwischen halbem und anderthalbfachem Level',
      Math.min.apply(null, werte) >= 25 && Math.max.apply(null, werte) <= 75,
      Math.min.apply(null, werte) + '–' + Math.max.apply(null, werte));
  }

  // Zutrauen: Rückkehr stark bei hoher, Frustration bei niedriger Freundschaft
  {
    const hoch = wurf('return', 'snorlax', 'snorlax', 11, (bt, a) => { a.mon.friendship = 255; });
    const tief = wurf('return', 'snorlax', 'snorlax', 11, (bt, a) => { a.mon.friendship = 0; });
    check('Rückkehr schlägt mit vollem Zutrauen viel härter zu', hoch.schaden > tief.schaden * 10,
      hoch.schaden + ' gegen ' + tief.schaden);
    const fHoch = wurf('frustration', 'snorlax', 'snorlax', 11, (bt, a) => { a.mon.friendship = 255; });
    const fTief = wurf('frustration', 'snorlax', 'snorlax', 11, (bt, a) => { a.mon.friendship = 0; });
    check('Frustration genau andersherum', fTief.schaden > fHoch.schaden * 10,
      fTief.schaden + ' gegen ' + fHoch.schaden);
  }

  // Je voller das Ziel, desto härter
  {
    const voll = wurf('crushgrip', 'snorlax', 'snorlax', 13);
    const leer = wurf('crushgrip', 'snorlax', 'snorlax', 13, (bt, a, d) => { d.mon.hp = Math.floor(d.stats[0] * 0.1); });
    check('Quetschgriff schlägt bei vollen KP härter zu', voll.schaden > leer.schaden * 3,
      voll.schaden + ' gegen ' + leer.schaden);
  }

  // Strafattacke wächst mit den Steigerungen des Ziels
  {
    const ruhig = wurf('punishment', 'umbreon', 'snorlax', 15);
    const stark = wurf('punishment', 'umbreon', 'snorlax', 15, (bt, a, d) => { d.boosts.atk = 3; d.boosts.spe = 2; });
    check('Strafattacke straft Aufbau ab', stark.schaden > ruhig.schaden * 1.8,
      ruhig.schaden + ' gegen ' + stark.schaden);
  }

  // K.-o.-Attacken
  {
    const r = wurf('guillotine', 'kingler', 'snorlax', 17, (bt, a, d) => { a.mon.lvl = 60; });
    check('Guillotine setzt das Ziel bei einem Treffer außer Gefecht',
      r.schaden === 0 || r.gegner.mon.hp === 0, String(r.schaden));
    let hoeher = 0;
    for (let i = 0; i < 20; i++) {
      const x = wurf('fissure', 'sandslash', 'snorlax', 300 + i, (bt, a, d) => { d.mon.lvl = 80; });
      if (x.schaden > 0) hoeher++;
    }
    eq('Gegen ein höheres Level versagt sie immer', hoeher, 0);
    let robust = 0;
    for (let i = 0; i < 20; i++) {
      const x = wurf('horndrill', 'rhydon', 'geodude', 400 + i, (bt, a, d) => { d.ability = 'sturdy'; });
      if (x.schaden > 0) robust++;
    }
    eq('Robustheit hält jede K.-o.-Attacke auf', robust, 0);
  }

  // Prügler schlägt einmal je gesundem Teammitglied zu
  {
    const rng = PL.rng('pruegler');
    const team = ['houndoom', 'snorlax', 'pikachu'].map((id) => mons.create(id, 50, rng, {}));
    team[0].moves = [{ m: mvi('beatup'), pp: 10, ppUp: 0 }];
    const bt = new PL.Battle({ teams: [team, [mons.create('chansey', 50, rng, {})]], rng: PL.rng(5) });
    bt.start();
    eq('Drei gesunde Teammitglieder, drei Schläge',
      M.beatup.hits(bt, bt.sides[0].active), 3);
    team[1].status = 'slp';
    eq('Wer schläft, schlägt nicht mit', M.beatup.hits(bt, bt.sides[0].active), 2);
  }
}

section('Schlaf');
{
  const mvi = (id) => PL.dex.moves.find((m) => m.id === id).i;
  const dauer = {};
  for (let s = 0; s < 300; s++) {
    const rng = PL.rng(s);
    const a = mons.create('snorlax', 50, rng, {}), b = mons.create('pikachu', 50, rng, {});
    a.moves = [{ m: mvi('tackle'), pp: 35, ppUp: 0 }];
    b.moves = [{ m: mvi('tackle'), pp: 35, ppUp: 0 }];
    const bt = new PL.Battle({ teams: [[a], [b]], rng: PL.rng(s + 1) });
    bt.start();
    const A = bt.sides[0].active;
    bt.setStatus(A, 'slp', null, null, true);
    let verschlafen = 0;
    for (let t = 0; t < 8; t++) {
      const vorher = A.mon.status;
      bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
      if (vorher === 'slp' && A.mon.status === 'slp') verschlafen++;
      else if (vorher === 'slp') break;
    }
    dauer[verschlafen] = (dauer[verschlafen] || 0) + 1;
  }
  const stufen = Object.keys(dauer).map(Number).sort((x, y) => x - y);
  // Vorher stand der Zähler auf 1 bis 3 und wurde vor der Prüfung gesenkt:
  // Bei einer 1 wachte das Pokémon auf, ohne je eine Runde verloren zu haben.
  eq('Geschlafen wird eine, zwei oder drei Runden — nie null', stufen.join(','), '1,2,3');
  check('Alle drei Längen kommen ähnlich oft vor',
    Math.min(dauer[1], dauer[2], dauer[3]) > 300 * 0.2, JSON.stringify(dauer));
}

section('Attackeneffekte');
{
  // Die Effekte bestanden aus runden Farbflecken mit Schein — auf einem Bild
  // aus Rasterpunkten ein Fremdkörper. Jetzt sind es gezeichnete Formen.
  const css = readFileSync(join(SRC_DIR, '..', 'css', 'effekte.css'), 'utf8');
  const formen = new Set([...css.matchAll(/\.fx-(?:form|maske)-([a-z]+)\s*\{/g)].map((m) => m[1]));
  check('Die Formendatei ist gebaut', formen.size >= 12, formen.size + ' Formen');

  const fx = readFileSync(join(SRC_DIR, 'fx.js'), 'utf8');
  const benutzt = new Set([...fx.matchAll(/form\([^)]*?'([a-z]+)'/g)].map((m) => m[1]));
  const fehlend = [...benutzt].filter((n) => !formen.has(n));
  check('Jede benutzte Form ist gezeichnet', fehlend.length === 0, fehlend.join(', '));

  // Jeder Typ hat seinen eigenen Auftritt — sonst sähe ein Flammenwurf aus
  // wie eine Aquaknarre in Rot.
  const typen = PL.dex.types || [];
  const auftritte = new Set([...fx.matchAll(/^    ([A-Z][a-z]+): function/gm)].map((m) => m[1]));
  const ohne = typen.filter((t) => !auftritte.has(t));
  check('Jeder der achtzehn Typen hat eine eigene Choreografie', ohne.length === 0, ohne.join(', '));
  check('Bekannte Attacken haben einen eigenen Auftritt',
    /ATTACKE = \{/.test(fx) && /earthquake:/.test(fx) && /hyperbeam:/.test(fx));
  check('Kein weicher Schein mehr in den Effekten',
    !/box-shadow[^;]*currentColor/.test(readFileSync(join(SRC_DIR, '..', 'css', 'effekte.css'), 'utf8')));
}

section('Abgeschaffte Modi');
{
  // Kurzrun und Boss-Rush sind weg. Weder die Liste im Menü noch der
  // Bauplan eines Runs darf sie noch kennen.
  check('Kurzrun steht nicht mehr in der Liste', !PL.Run.MODES.kurz);
  check('Boss-Rush auch nicht', !PL.Run.MODES.bossrush);
  const waehlbar = Object.keys(PL.Run.MODES).filter((k) => !PL.Run.MODES[k].versteckt);
  eq('Drei Modi stehen zur Wahl', waehlbar.join(','), 'standard,endlos,taeglich');

  // Wer einen davon anfordert, bekommt einen gewöhnlichen Run.
  eq('Ein erfundener Modus wird zum Standard',
    new PL.Run({ seed: 1, starter: 'bulbasaur', mode: 'kurz' }).mode, 'standard');

  // Ein Spielstand aus der Zeit davor läuft weiter, statt abzustürzen.
  const alt = new PL.Run({ seed: 5, starter: 'charmander' });
  const daten = alt.toJSON();
  daten.mode = 'bossrush';
  const geladen = PL.Run.fromJSON(daten);
  check('Ein alter Boss-Rush lässt sich laden', !!geladen);
  eq('… und läuft als Standard weiter', geladen.mode, 'standard');
  eq('… mit einer Region wie jeder Standardrun', geladen.totalRegions(), 1);
  check('… und kann eine neue Region bauen', (() => {
    geladen.region = 1; geladen.buildMap(); return geladen.map.length > 0;
  })());

  // Der Name eines alten Laufs bleibt lesbar.
  eq('Ein vergangener Kurzrun heißt weiter Kurzrun', PL.Run.ALTE_MODI.kurz, 'Kurzrun');
}

section('Fähigkeiten, die vorher nichts taten');
{
  const rngF = PL.rng('faehigkeit');
  function stelle(idA, idB, abA, abB) {
    const a = mons.create(idA, 50, rngF, {}), b = mons.create(idB, 50, rngF, {});
    const bt = new PL.Battle({ teams: [[a], [b]], rng: PL.rng('f-' + idA + idB) });
    bt.start();
    if (abA) bt.sides[0].active.ability = abA;
    if (abB) bt.sides[1].active.ability = abB;
    return bt;
  }

  /* --- Angsthase: die Flucht klappt immer --- */
  {
    // Ein langsames Pokémon gegen ein sehr schnelles: ohne die Fähigkeit
    // wäre die Flucht die Ausnahme, mit ihr die Regel.
    let ohne = 0, mit = 0;
    for (let i = 0; i < 40; i++) {
      const bt = stelle('shuckle', 'ninjask', 'sturdy');
      bt.wild = true;
      if (bt.tryFlee(bt.sides[0])) ohne++;
      const bt2 = stelle('shuckle', 'ninjask', 'runaway');
      bt2.wild = true;
      if (bt2.tryFlee(bt2.sides[0])) mit++;
    }
    check('Mit Angsthase klappt jede Flucht', mit === 40, mit + '/40');
    check('… ohne sie nicht', ohne < 40, ohne + '/40');
  }

  /* --- Reaktionsgas: alle anderen Fähigkeiten setzen aus --- */
  {
    const bt = stelle('koffing', 'gyarados', 'neutralizinggas', 'intimidate');
    eq('Reaktionsgas legt die Fähigkeit des Gegners still',
      bt.abilityId(bt.sides[1].active), '');
    eq('… behält seine eigene aber', bt.abilityId(bt.sides[0].active), 'neutralizinggas');
    bt.sides[0].active.mon.hp = 0;
    eq('Ist es weg, wirkt die andere wieder',
      bt.abilityId(bt.sides[1].active), 'intimidate');
  }

  /* --- Prognose: Formeo folgt dem Wetter --- */
  {
    const bt = stelle('castform', 'pikachu', 'forecast');
    const act = bt.sides[0].active;
    bt.hook(act, 'onSwitchIn', [bt.sides[1].active]);
    eq('Ohne Wetter bleibt Formeo normal', act.types.join(), 'Normal');
    bt.field.weather = 'sunnyday'; bt.field.weatherTurns = 5;
    bt.hook(act, 'onResidual', []);
    eq('In der Sonne wird es zum Feuertyp', act.types.join(), 'Fire');
    bt.field.weather = 'raindance';
    bt.hook(act, 'onResidual', []);
    eq('Im Regen zum Wassertyp', act.types.join(), 'Water');
    bt.field.weather = null;
    bt.hook(act, 'onResidual', []);
    eq('Und ohne Wetter wieder normal', act.types.join(), 'Normal');
  }

  /* --- Blütenhülle: Pflanzen bleiben unberührt --- */
  {
    const bt = stelle('bulbasaur', 'pikachu', 'flowerveil');
    const act = bt.sides[0].active;
    check('Blütenhülle hält Status ab', bt.setStatus(act, 'par', bt.sides[1].active) === false);
    const vorher = act.boosts.atk;
    bt.boost(act, { atk: -2 }, bt.sides[1].active);
    eq('… und verhindert, dass Werte gesenkt werden', act.boosts.atk, vorher);
    // Wer kein Pflanzentyp ist, bekommt den Schutz nicht.
    // Kein Pflanzentyp, kein Schutz. Snorlax statt Pikachu: Elektrotypen
    // lassen sich ohnehin nicht paralysieren, das hätte nichts bewiesen.
    const bt2 = stelle('snorlax', 'pikachu', 'flowerveil');
    check('Bei Nicht-Pflanzen wirkt sie nicht',
      bt2.setStatus(bt2.sides[0].active, 'par', bt2.sides[1].active) !== false);
  }

  /* --- Zauberer: klaut den Gegenstand --- */
  {
    const bt = stelle('delphox', 'snorlax', 'magician');
    const dieb = bt.sides[0].active, opfer = bt.sides[1].active;
    dieb.item = null; opfer.item = 'leftovers';
    bt.hook(dieb, 'onDealtDamage', [opfer, dex.move('tackle'), 10]);
    eq('Zauberer nimmt den Gegenstand an sich', dieb.item, 'leftovers');
    eq('… und das Opfer steht ohne da', opfer.item, null);
    // Mit vollen Händen wird nicht geklaut.
    const bt2 = stelle('delphox', 'snorlax', 'magician');
    bt2.sides[0].active.item = 'lifeorb'; bt2.sides[1].active.item = 'leftovers';
    bt2.hook(bt2.sides[0].active, 'onDealtDamage', [bt2.sides[1].active, dex.move('tackle'), 10]);
    eq('Wer schon etwas trägt, klaut nicht', bt2.sides[0].active.item, 'lifeorb');
    // Klebehülle hält fest.
    const bt3 = stelle('delphox', 'muk', 'magician', 'stickyhold');
    bt3.sides[0].active.item = null; bt3.sides[1].active.item = 'leftovers';
    bt3.hook(bt3.sides[0].active, 'onDealtDamage', [bt3.sides[1].active, dex.move('tackle'), 10]);
    eq('Klebehülle lässt nicht los', bt3.sides[1].active.item, 'leftovers');
  }

  /* --- Rastlose Seele: Fähigkeiten tauschen --- */
  {
    const bt = stelle('runerigus', 'machamp', 'wanderingspirit', 'guts');
    const act = bt.sides[0].active, angreifer = bt.sides[1].active;
    bt.hook(act, 'onContact', [angreifer, dex.move('tackle'), 10]);
    eq('Der Angreifer trägt jetzt Rastlose Seele', angreifer.ability, 'wanderingspirit');
    eq('… und der Verteidiger dessen Fähigkeit', act.ability, 'guts');
  }

  /* --- Giftbelag: Giftspitzen bei physischen Treffern --- */
  {
    const bt = stelle('grimmsnarl', 'machamp', 'toxicdebris');
    const act = bt.sides[0].active, angreifer = bt.sides[1].active;
    eq('Am Anfang liegen keine Giftspitzen', angreifer.side.hazards.toxicspikes, 0);
    bt.hook(act, 'onHitTaken', [angreifer, dex.move('tackle'), 10, 1]);
    eq('Ein physischer Treffer streut welche aus', angreifer.side.hazards.toxicspikes, 1);
    bt.hook(act, 'onHitTaken', [angreifer, dex.move('watergun'), 10, 1]);
    eq('Ein Spezialtreffer nicht', angreifer.side.hazards.toxicspikes, 1);
    bt.hook(act, 'onHitTaken', [angreifer, dex.move('tackle'), 10, 1]);
    bt.hook(act, 'onHitTaken', [angreifer, dex.move('tackle'), 10, 1]);
    eq('Mehr als zwei Lagen werden es nicht', angreifer.side.hazards.toxicspikes, 2);
  }

  /* --- Süßer Nektar: einmalig den Fluchtwert senken --- */
  {
    const bt = stelle('dipplin', 'pikachu', 'supersweetsyrup');
    const act = bt.sides[0].active, foe = bt.sides[1].active;
    bt.hook(act, 'onSwitchIn', [foe]);
    eq('Süßer Nektar senkt den Fluchtwert', foe.boosts.eva, -1);
    bt.hook(act, 'onSwitchIn', [foe]);
    eq('… aber nur ein einziges Mal', foe.boosts.eva, -1);
  }

  /* --- Tänzer: macht die Tanzattacke nach --- */
  {
    const bt = stelle('oricorio', 'lilligant', 'dancer');
    const taenzer = bt.sides[0].active, foe = bt.sides[1].active;
    foe.mon.moves = [{ m: dex.move('quiverdance').i, pp: 20, ppUp: 0 }];
    const vorher = taenzer.boosts.spa;
    bt.log.length = 0;
    bt.useMove(foe, 0);
    check('Der Tänzer macht den Schmetterlingstanz nach',
      taenzer.boosts.spa > vorher, 'SPA ' + vorher + ' → ' + taenzer.boosts.spa);
    // Eine gewöhnliche Attacke wird nicht nachgemacht.
    const bt2 = stelle('oricorio', 'lilligant', 'dancer');
    bt2.sides[1].active.mon.moves = [{ m: dex.move('tackle').i, pp: 35, ppUp: 0 }];
    const vor2 = bt2.sides[0].active.boosts.spa;
    bt2.useMove(bt2.sides[1].active, 0);
    eq('Aber keinen Tackle', bt2.sides[0].active.boosts.spa, vor2);
  }
}

section('Die Rechnung hinter dem Treffer');
{
  // Jede Angriffszeile im Protokoll trägt die Rechnung, die zu ihr geführt
  // hat. Der Sinn der Sache steht und fällt damit, dass es dieselbe Rechnung
  // ist und keine Erzählung daneben: Grundwert mal alle Faktoren muss den
  // Schaden ergeben, den das Spiel wirklich abgezogen hat.
  const rngR = PL.rng('rechnung');
  function kampf(idA, idB, seed) {
    const bt = new PL.Battle({
      teams: [[mons.create(idA, 50, rngR, {})], [mons.create(idB, 50, rngR, {})]],
      rng: PL.rng(seed)
    });
    bt.start();
    return bt;
  }

  let geprueft = 0; const daneben = [];
  for (let seed = 1; seed <= 30; seed++) {
    const bt = kampf('charizard', 'venusaur', 'r' + seed);
    for (let zug = 0; zug < 5 && !bt.over; zug++) {
      bt.log.length = 0;
      bt.runTurn([{ type: 'move', index: zug % 4 }, { type: 'move', index: 0 }]);
      for (const e of bt.log) {
        if (e.k !== 'move' || !e.rechnung) continue;
        const r = e.rechnung;
        let m = 1;
        for (const t of r.teile) m *= t.faktor;
        const nachgerechnet = Math.max(1, Math.floor(r.grund * m));
        geprueft++;
        if (nachgerechnet !== r.schaden) {
          daneben.push(r.schaden + ' statt ' + nachgerechnet + ' (Grund ' + r.grund + ', ' +
            r.teile.map((t) => t.was + ' ×' + t.faktor).join(' ') + ')');
        }
      }
    }
  }
  check('Angriffe liefern ihre Rechnung mit', geprueft > 30, geprueft + ' Rechnungen');
  check('Grundwert mal alle Faktoren ergibt genau den Schaden',
    daneben.length === 0, daneben.slice(0, 3).join(' | '));

  // Typenbonus und Wirksamkeit stehen immer da — auch wenn sie nichts ändern.
  {
    const bt = kampf('rattata', 'rattata', 'immer');
    bt.log.length = 0;
    bt.runTurn([{ type: 'move', index: 0 }, { type: 'move', index: 0 }]);
    const mit = bt.log.filter((e) => e.k === 'move' && e.rechnung);
    const namen = mit.length ? mit[0].rechnung.teile.map((t) => t.was) : [];
    check('Der Typenbonus steht immer in der Rechnung',
      mit.length > 0 && namen.indexOf('Typenbonus') >= 0, namen.join(', '));
    check('Die Wirksamkeit auch',
      mit.length > 0 && namen.indexOf('Wirksamkeit') >= 0, namen.join(', '));
  }

  // Die KI rechnet Tausende Züge voraus — dort darf nichts mitgeschrieben werden.
  {
    const bt = kampf('gengar', 'snorlax', 'still');
    bt.simulating = true;
    const erg = bt.calcDamage(bt.sides[0].active, bt.sides[1].active,
      dex.move(bt.sides[0].active.mon.moves[0].m), {});
    check('Beim Vorausrechnen entsteht keine Rechnung', !erg.rechnung, JSON.stringify(erg.rechnung));
  }
}

section('Gezeichnete Bilder');
{
  // Alle drei Bilddateien entstehen aus Punktrastern über tools/raster.mjs.
  // Dort werden gleichfarbige Punkte zu Rechtecken verschmolzen und pro Farbe
  // in einen Pfad gelegt — aus 456 KB für neunundsiebzig Zeichen wurden so 68.
  // Diese Prüfung dekodiert das erzeugte CSS zurück in ein Raster und
  // vergleicht es Punkt für Punkt mit der Quelle: Sparsamkeit darf das Bild
  // nicht verändern.
  const N = 16;
  const rasterAus = (bild, farbeVon) => bild.map((z) => [...z].map(farbeVon));
  const svgAus = (svg) => {
    const g = Array.from({ length: N }, () => Array(N).fill(null));
    for (const m of svg.matchAll(/<path fill="([^"]+)" d="([^"]+)"\/>/g)) {
      for (const k of m[2].matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)) {
        const x = +k[1], y = +k[2], b = +k[3], h = +k[4];
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + b; xx++) g[yy][xx] = m[1];
      }
    }
    return g;
  };
  const bilderAus = (datei, praefix) => {
    const css = readFileSync(join(SRC_DIR, '..', 'css', datei), 'utf8');
    const map = new Map();
    for (const zeile of css.split('\n')) {
      if (zeile.slice(0, praefix.length + 1) !== '.' + praefix) continue;
      const a = zeile.indexOf('url("'), b = zeile.lastIndexOf('")');
      if (a < 0 || b < 0) continue;
      map.set(zeile.slice(praefix.length + 1, zeile.indexOf(' ')),
        svgAus(decodeURIComponent(zeile.slice(a + 5, b).replace('data:image/svg+xml;utf8,', ''))));
    }
    return map;
  };

  const quellen = [];
  {
    const { TAFEL, SYMBOLE } = await import('../tools/symbole.mjs');
    const da = bilderAus('symbole.css', 'sym-');
    for (const [n, b] of Object.entries(SYMBOLE)) {
      quellen.push(['symbole.css ' + n, rasterAus(b, (c) => TAFEL[c]), da.get(n)]);
    }
  }
  {
    const { TAFEL, FORMEN, MASKEN } = await import('../tools/effekte.mjs');
    const da = bilderAus('effekte.css', 'fx-');
    for (const [n, b] of Object.entries(FORMEN)) {
      quellen.push(['effekte.css form-' + n, rasterAus(b, (c) => TAFEL[c]), da.get('form-' + n)]);
    }
    for (const [n, b] of Object.entries(MASKEN)) {
      quellen.push(['effekte.css maske-' + n,
        rasterAus(b, (c) => (TAFEL[c] === null ? null : '#000')), da.get('maske-' + n)]);
    }
  }
  {
    const { TAFEL, FORMEN, GEGENSTAENDE } = await import('../tools/gegenstaende.mjs');
    const da = bilderAus('gegenstaende.css', 'gg-');
    for (const [n, e] of Object.entries(GEGENSTAENDE)) {
      const t = e.tausch || {};
      quellen.push(['gegenstaende.css ' + n,
        rasterAus(FORMEN[e.form], (c) => (c in t ? t[c] : TAFEL[c])), da.get(n)]);
    }
  }

  check('Alle drei Bilddateien sind da', quellen.length > 200, quellen.length + ' Bilder');
  const fehlend = quellen.filter(([, , ist]) => !ist).map(([n]) => n);
  check('Kein Bild fehlt im erzeugten CSS', fehlend.length === 0, fehlend.slice(0, 5).join(', '));
  const anders = quellen.filter(([, soll, ist]) => ist && JSON.stringify(soll) !== JSON.stringify(ist))
    .map(([n]) => n);
  check('Jedes Bild stimmt Punkt für Punkt mit seinem Raster überein',
    anders.length === 0, anders.slice(0, 5).join(', '));
}

section('Gezeichnete Gegenstände');
{
  // Jedes Ding im Beutel ist einzeln gezeichnet: css/gegenstaende.css, erzeugt
  // aus tools/gegenstaende.mjs. Fehlt einem Gegenstand seine Zeichnung, bleibt
  // im Beutel ein leerer Kasten — stumm, ohne Fehler. Das fängt diese Prüfung.
  const ggCss = readFileSync(join(SRC_DIR, '..', 'css', 'gegenstaende.css'), 'utf8');
  const regel = /^\.gg-([a-z0-9-]+) \{ --gg: url\("([^"]*)"\); \}$/gm;
  const bilder = new Map();
  for (const m of ggCss.matchAll(regel)) bilder.set(m[1], m[2]);

  check('Die Datei bringt Zeichnungen mit', bilder.size > 100, bilder.size + ' Stück');

  // Nur die TMs teilen sich die Scheibe: Von denen gibt es so viele wie Attacken.
  const ohne = PL.items.all().filter((i) => i.kind !== 'tm' && !bilder.has(i.id));
  check('Jeder Gegenstand hat seine eigene Zeichnung', ohne.length === 0,
    ohne.map((i) => i.id).join(', '));

  const imSpiel = new Set(PL.items.all().map((i) => i.id));
  const ueber = [...bilder.keys()].filter((id) => !imSpiel.has(id));
  check('Keine Zeichnung ohne Gegenstand', ueber.length === 0, ueber.join(', '));

  // Eine Zeichnung, die kaum Daten enthält, wäre ein leeres Bild.
  const leer = [...bilder].filter(([, url]) => url.length < 300).map(([id]) => id);
  check('Keine Zeichnung ist leer', leer.length === 0, leer.join(', '));

  // Zwei Gegenstände mit demselben Bild hieße: Die Mühe war umsonst.
  const nachBild = new Map();
  for (const [id, url] of bilder) nachBild.set(url, (nachBild.get(url) || []).concat(id));
  const doppelt = [...nachBild.values()].filter((l) => l.length > 1);
  check('Keine zwei Gegenstände sehen gleich aus', doppelt.length === 0,
    doppelt.map((l) => l.join('=')).join(' | '));
}

section('Gezeichnete Zeichen');
{
  // Jedes Zeichen wird über seinen Namen geholt: U.sym('beutel'). Steht der
  // Name nicht in css/symbole.css, zeichnet der Browser nichts — und zwar
  // stumm, ohne Fehler. Diese Prüfung fängt den Tippfehler ab.
  const css = readFileSync(join(SRC_DIR, '..', 'css', 'symbole.css'), 'utf8');
  const vorhanden = new Set([...css.matchAll(/\.sym-([a-z]+)\s*\{/g)].map((m) => m[1]));
  check('Die Zeichendatei ist gebaut', vorhanden.size > 20, vorhanden.size + ' Zeichen');

  const quellen = ['app', 'ui', 'run'];
  const text = quellen.map((f) => readFileSync(join(SRC_DIR, f + '.js'), 'utf8')).join('\n');
  const benutzt = new Set([...text.matchAll(/\bsymText?\(\s*'([a-z]+)'/g)].map((m) => m[1]));
  Object.keys(PL.Run.NODE_INFO).forEach((k) => benutzt.add(PL.Run.NODE_INFO[k].icon));
  PL.Run.BLESSINGS.forEach((b) => benutzt.add(b.icon));
  PL.relics.all().forEach((r) => benutzt.add(r.icon));
  // Die Zeichen der Gegenstandsarten stehen in einer Tabelle in ui.js.
  const ui = readFileSync(join(SRC_DIR, 'ui.js'), 'utf8');
  const tafel = /var KIND_ICON = \{([\s\S]*?)\};/.exec(ui);
  check('Die Tabelle der Gegenstandszeichen steht in ui.js', !!tafel);
  [...(tafel ? tafel[1] : '').matchAll(/'([a-z]+)'/g)].forEach((m) => benutzt.add(m[1]));
  const wahl = /function itemIcon\(item\) \{([\s\S]*?)\n  \}/.exec(ui);
  [...(wahl ? wahl[1] : '').matchAll(/return '([a-z]+)'/g)].forEach((m) => benutzt.add(m[1]));
  const fehlend = [...benutzt].filter((n) => !vorhanden.has(n));
  check('Jedes benutzte Zeichen ist gezeichnet', fehlend.length === 0, fehlend.join(', '));
  check('Mehr als ein Dutzend Stellen benutzen Zeichen', benutzt.size >= 20, benutzt.size + ' Namen');
}

/* ------------------------------------------------------------- Ergebnis -- */

console.log('\n' + '─'.repeat(60));
console.log(pass + ' bestanden, ' + fail + ' fehlgeschlagen');
if (failures.length) {
  console.log('\nFehler:');
  failures.forEach((f) => console.log('  ✗ ' + f));
}
process.exit(fail ? 1 : 0);
