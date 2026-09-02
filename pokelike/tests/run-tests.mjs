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

section('Neue Systeme');
{
  const run = new PL.Run({ seed: 4242, mode: 'standard', starter: 'charmander' });
  for (const id of ['pikachu', 'gengar', 'lapras']) run.party.push(PL.mon.create(id, 20, run.rng, {}));

  // Schnellheilung
  run.party[1].hp = 5;
  run.party[2].hp = 0;
  run.party[3].status = 'brn';
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
