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

  // Mega-Entwicklung
  bt = duel('charizard', 'blastoise');
  bt.sides[0].active.item = 'charizarditey';
  check('Mega ist mit passendem Stein möglich', bt.canMega(bt.sides[0].active));
  const plainAtk = bt.statOf(bt.sides[0].active, 'spa');
  eq('Mega-Entwicklung gelingt', bt.megaEvolve(bt.sides[0].active), true);
  check('Mega-Form ist stärker', bt.statOf(bt.sides[0].active, 'spa') > plainAtk,
    plainAtk + ' → ' + bt.statOf(bt.sides[0].active, 'spa'));
  eq('Mega-Form bringt ihre Fähigkeit mit', bt.sides[0].active.abilityName, 'Drought');
  eq('Mega geht nur einmal pro Kampf', bt.canMega(bt.sides[0].active), false);

  bt = duel('charizard', 'blastoise');
  eq('Ohne Stein keine Mega-Entwicklung', bt.canMega(bt.sides[0].active), false);

  bt = duel('rayquaza', 'blastoise');
  bt.sides[0].active.mon.moves = [{ m: dex.move('dragonascent').i, pp: 5, ppUp: 0, used: 0 }];
  check('Rayquaza mega-entwickelt sich über Zenitstürmer', bt.canMega(bt.sides[0].active));

  bt = duel('groudon', 'blastoise');
  bt.sides[0].active.item = 'redorb';
  if (bt.canMega(bt.sides[0].active)) {
    bt.megaEvolve(bt.sides[0].active);
    check('Protoform trägt ihren Namen', /Primal/.test(bt.sides[0].active.megaName || ''),
      bt.sides[0].active.megaName);
  } else {
    check('Protoform von Groudon ist erreichbar', false, 'Roter Edelstein greift nicht');
  }

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
  bt.useMove(bt.sides[0].active, { move: dex.move('thunderwave') });
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
      const { run, notes, guard } = autoRun(1000 + i, i === 5 ? 'kurz' : 'standard');
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

  // Legendäres
  run.region = 6;
  const legend = run.makeLegendary(run.rng);
  const boss = legend.sides[1].team[0];
  check('Der Schrein ruft ein legendäres Pokémon', dex.isLegendary(dex.sp(boss.sp)), PL.mon.name(boss));
  check('Es ist wild und damit fangbar', legend.wild === true);
  check('Der Schrein erscheint erst spät', (function () {
    const early = new PL.Run({ seed: 3, starter: 'squirtle' });
    const ev = PL.world.EVENTS.filter((e) => e.id === 'legendenschrein')[0];
    return ev && ev.available && !ev.available(early) && ev.available(run);
  })());

  // Segen im Endlosmodus
  const endless = new PL.Run({ seed: 9, mode: 'endlos', starter: 'chikorita' });
  endless.region = 8;
  endless.advanceRegion();
  check('Nach einer vollen Runde wartet ein Segen',
    !!endless.pendingBlessing && endless.pendingBlessing.offers.length === 3);
  const capBefore = endless.levelCap;
  endless.takeBlessing('levelschub');
  eq('Der Levelschub hebt die Grenze', endless.levelCap, capBefore + 5);
  check('Jeder Segen hat Namen und Beschreibung',
    PL.Run.BLESSINGS.every((b) => b.id && b.name && b.desc && b.icon));

  // Ereignisse
  check('Deutlich mehr Ereignisse als vorher', PL.world.EVENTS.length >= 30, String(PL.world.EVENTS.length));
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
    const first = (sp, o) => PL.sprite.chain(sp, o || {})[0];
    check('Alola-Raichu zieht sein eigenes Bild',
      /ALOLA/.test(first(dex.sp('raichualola'))), first(dex.sp('raichualola')).slice(0, 40));
    check('Raichu bleibt bei seinem', /RAICHU/.test(first(dex.sp('raichu'))));
    check('Die Mega-Form zieht ihr eigenes Bild',
      /MEGA/.test(first(dex.sp('charizard'), { pid: mega.pid })));
    check('Ohne Form bleibt es die Grundform',
      /GLURAK/.test(first(dex.sp('charizard'))));
    globalThis.PL_SPRITES = echte;
  }

  // Im Kampf merkt sich der Aktive seine Form
  const rng = PL.rng('mega');
  const mon = PL.mon.create('charizard', 60, rng, {});
  mon.item = 'charizarditex';
  const foe = PL.mon.create('snorlax', 60, rng, {});
  const bt = new PL.Battle({ teams: [[mon], [foe]], rng: PL.rng('mk') });
  bt.start();
  bt.megaEvolve(bt.sides[0].active);
  check('Der Aktive merkt sich seine Mega-Form',
    !!bt.sides[0].active.megaForm && !!bt.sides[0].active.megaForm.pid);
  eq('… und heißt deutsch', bt.sides[0].active.megaName, 'Glurak-Mega-X');
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

  const hart = new PL.Run({ seed: 11, starter: 'squirtle', ascension: 1 });
  hart.party.push(PL.mon.create('pikachu', 20, hart.rng, {}));
  hart.party.push(PL.mon.create('geodude', 20, hart.rng, {}));
  check('Aufstiege ziehen die Gegner wieder hoch', lvlOf(hart) > lvlOf(run),
    lvlOf(hart) + ' vs ' + lvlOf(run));

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

    const e4 = W.eliteTeam(PL.rng('liga-test'), 60, 0, {}, {});
    const soll4 = L.team(e4.leader);
    eq('Der Liga-Kampf nutzt die echte Aufstellung',
      e4.team.map((m) => dex.sp(m.sp).id).join(','), soll4.join(','));
    check('… und das Mitglied bringt sein Aussehen mit', !!e4.look && !!e4.look.shirt);

    const ch = W.championTeam(PL.rng('champ-test'), 66, {});
    check('Auch der Champ bringt sein Aussehen mit', !!ch.look && !!ch.look.shirt, ch.name);
    check('Der Typ des Liga-Mitglieds kommt in seiner Aufstellung vor',
      W.ELITE.every((e) => L.team(e[0]).some((id) => dex.sp(id).t.indexOf(e[1]) >= 0)),
      W.ELITE.filter((e) => !L.team(e[0]).some((id) => dex.sp(id).t.indexOf(e[1]) >= 0))
        .map((e) => e[0]).join(', '));
  }

  // Fortschritt bestimmt, welcher Leiter antritt: vorn die frühen Orden.
  const frueh = {}, spaet = {};
  for (let i = 0; i < 40; i++) {
    frueh[PL.world.bossTeam(PL.rng('f' + i), kanto, 20, 0, {}).leader] = 1;
    spaet[PL.world.bossTeam(PL.rng('s' + i), kanto, 20, 8, {}).leader] = 1;
  }
  const idx = (n) => kanto.leaders.findIndex((l) => l[0] === n);
  check('Im ersten Gebiet treten frühe Arenaleiter an',
    Object.keys(frueh).every((n) => idx(n) <= 1), Object.keys(frueh).join(', '));
  check('Im letzten Gebiet die späten',
    Object.keys(spaet).every((n) => idx(n) >= 6), Object.keys(spaet).join(', '));
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
  check('Mega-Formen sind auf die echten beschränkt',
    Object.keys(dex.megas).length === 48,
    Object.keys(dex.megas).length + ' Spezies');
  check('Jede Mega-Form hat Stein oder Attacke',
    Object.keys(dex.megas).every((k) => dex.megas[k].every((f) => f.it || f.mv)));
  check('Zu jedem Mega-Stein gibt es einen Gegenstand',
    Object.keys(dex.megas).every((k) => dex.megas[k].every((f) => !f.it || PL.items.get(f.it))));
  check('Kein Terakristall mehr im Spiel',
    !PL.items.get('terashard') && !PL.relics.get('terakristall_splitter') && !PL.relics.get('mega_ring'));

  check('Alle Champ-Teams verweisen auf echte Spezies',
    PL.world.CHAMPIONS.every((c) => c.team.every((id) => !!dex.sp(id))),
    PL.world.CHAMPIONS.map((c) => c.team.filter((id) => !dex.sp(id))).flat().join(','));
}

/* ------------------------------------------------------------- Ergebnis -- */

console.log('\n' + '─'.repeat(60));
console.log(pass + ' bestanden, ' + fail + ' fehlgeschlagen');
if (failures.length) {
  console.log('\nFehler:');
  failures.forEach((f) => console.log('  ✗ ' + f));
}
process.exit(fail ? 1 : 0);
