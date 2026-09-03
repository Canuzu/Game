/* =============================================================================
 * ai.js — Kampfentscheidungen für Gegner und den Auto-Kampf
 * -----------------------------------------------------------------------------
 * Bewertet jede erlaubte Aktion und wählt die beste. Dieselbe Bewertung treibt
 * den Gegner und den Auto-Schalter des Spielers; nur die Stufe unterscheidet
 * sich:
 *   0  wild        — würfelt fast blind
 *   1  Trainer     — schlägt zu, was gerade am meisten weh tut
 *   2  Ass         — rechnet Sieg in einem Zug aus, wechselt, nutzt Status
 *   3  Boss        — zusätzlich Mega-Entwicklung und vorausschauende Wechsel
 *   4  Auto-Kampf  — wie 3, aber ohne jedes Zufallsrauschen: es wird immer
 *                    der beste bekannte Zug gespielt
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.effects) require('./effects.js');
    if (!PL.items) require('./items.js');
    if (!PL.Battle) require('./battle.js');
  }
  var dex = PL.dex, mons = PL.mon;

  // Ein Zufallsgenerator, der immer die Mitte liefert: erlaubt Probeschüsse
  // ohne den echten Kampfzufall zu verbrauchen.
  var FIXED = {
    next: function () { return 0.5; },
    int: function (n) { return Math.floor(n / 2); },
    range: function (a, b) { return Math.floor((a + b) / 2); },
    chance: function () { return false; },
    pick: function (a) { return a[0]; }
  };

  /** Durchschnittsschaden einer Attacke, ohne Nebenwirkungen auf den Kampf. */
  function estimate(bt, atk, def, move) {
    if (!move || move.c === 'T' || !def) return 0;
    var realRng = bt.rng, res;
    bt.simulating = true;
    bt.rng = FIXED;
    try {
      var ov = bt.effects.moves[move.id] || {};
      if (move.dmg) res = { dmg: move.dmg === 'level' ? atk.mon.lvl : move.dmg, eff: 1 };
      else if (ov.fixed) res = { dmg: ov.fixed(bt, atk, def, move), eff: 1 };
      else res = bt.calcDamage(atk, def, move, { noCrit: true });
    } catch (e) {
      res = { dmg: 0, eff: 1 };
    }
    bt.rng = realRng;
    bt.simulating = false;
    if (res.immune) return 0;
    var hits = 1;
    if (move.mh) hits = typeof move.mh === 'number' ? move.mh : (move.mh[0] === 2 && move.mh[1] === 5 ? 3.1 : (move.mh[0] + move.mh[1]) / 2);
    var acc = move.ac === 0 ? 100 : move.ac;
    return res.dmg * hits * (acc / 100);
  }

  /** Wie gefährlich ist der Gegner für dieses Pokémon? 0..1 des eigenen KP-Vorrats. */
  function threat(bt, foe, me) {
    if (!foe || !me) return 0;
    var best = 0, i;
    for (i = 0; i < foe.mon.moves.length; i++) {
      var m = dex.move(foe.mon.moves[i].m);
      if (foe.mon.moves[i].pp <= 0) continue;
      best = Math.max(best, estimate(bt, foe, me, m));
    }
    return best / Math.max(1, me.mon.hp);
  }

  /* ---------- Bewertung einzelner Attacken --------------------------------- */

  var SETUP = /swordsdance|nastyplot|dragondance|quiverdance|calmmind|bulkup|shellsmash|workup|howl|growth|coil|honeclaws|rockpolish|agility|irondefense|acidarmor|amnesia|barrier|cosmicpower|tidyup|victorydance|takeheart|filletaway|clangoroussoul|bellydrum/;
  var HEAL = /recover|roost|slackoff|softboiled|milkdrink|moonlight|synthesis|morningsun|shoreup|rest|healorder|junglehealing|lifedew|strengthsap|painsplit/;
  var HAZARD = /stealthrock|spikes|toxicspikes|stickyweb/;
  var SCREEN = /reflect|lightscreen|auroraveil|tailwind|safeguard/;

  // Attacken, die erst aufladen. Wer schon lädt, hat keine Wahl mehr — dann
  // zählt die volle Wirkung; sonst wird die verlorene Runde eingepreist.
  var TWO_TURN = /^(solarbeam|solarblade|razorwind|skullbash|skyattack|freezeshock|iceburn|meteorbeam|electroshot|geomancy|fly|bounce|dig|dive|phantomforce|shadowforce)$/;

  function scoreMove(bt, me, foe, entry, level) {
    var move = entry.move, s = 0;
    if (entry.disabled) return -1e9;
    var foeHP = foe ? foe.mon.hp : 1;
    var myHP = bt.hpFraction(me);
    var danger = threat(bt, foe, me);

    if (move.c !== 'T') {
      var dmg = estimate(bt, me, foe, move);
      if (dmg <= 0) return -50;
      s = 100 * Math.min(1, dmg / foeHP);
      if (dmg >= foeHP) {
        s = 200;                                     // sicherer K.o.
        if ((move.pr || 0) > 0) s += 40;
        if (move.ac !== 0 && move.ac < 90) s -= 25;
      }
      if (move.fl && move.fl.indexOf('recharge') >= 0 && dmg < foeHP) s -= 30;
      if (move.rc) s -= 8;
      if (TWO_TURN.test(move.id) && !me.vol.twoturn) {
        // Die Ladephase kostet eine Runde. Sie lohnt nur, wenn sie ungefährlich
        // ist — bei Deckung (Fliegen, Schaufler) weniger schmerzhaft.
        var hides = /^(fly|bounce|dig|dive|phantomforce|shadowforce)$/.test(move.id);
        if (bt.weatherActive() === 'sunnyday' && /^solar/.test(move.id)) s += 0;
        else if (bt.weatherActive() === 'raindance' && move.id === 'electroshot') s += 0;
        else s -= hides ? 25 : 55;
      }
      if (move.ss && myHP < 0.4) s += 10;
      return s;
    }

    // Statusattacken
    var id = move.id;
    if (level < 2) return 12;
    if (HEAL.test(id)) {
      if (myHP > 0.75) return -20;
      return 40 + (1 - myHP) * 110 - danger * 40;
    }
    if (SETUP.test(id)) {
      if (me.turnsActive > 6) return 10;
      var boosted = 0, k;
      for (k in me.boosts) boosted += Math.max(0, me.boosts[k]);
      if (boosted >= 4) return -20;
      if (danger > 0.5 || myHP < 0.55) return -15;
      return 70 - boosted * 12;
    }
    if (move.st) {
      if (!foe || foe.mon.status) return -30;
      if (bt.canSetStatus && !bt.canSetStatus(foe, move.st, me, move)) return -40;
      var worth = { slp: 75, par: 60, brn: 58, tox: 62, psn: 40, frz: 65 }[move.st] || 30;
      if (move.st === 'brn' && bt.statOf(foe, 'atk') < bt.statOf(foe, 'spa')) worth -= 25;
      if (move.st === 'par' && bt.statOf(foe, 'spe') < bt.statOf(me, 'spe')) worth -= 20;
      return worth * (move.ac === 0 ? 1 : move.ac / 100);
    }
    if (HAZARD.test(id)) {
      if (foe && foe.side.hazards[id]) return -30;
      var enemyLeft = foe ? foe.side.team.filter(function (m) { return m.hp > 0; }).length : 1;
      return enemyLeft >= 3 ? 60 : enemyLeft === 2 ? 35 : -10;
    }
    if (id === 'auroraveil') return /snowscape|hail/.test(bt.weatherActive() || '') ? 55 : -60;
    if (SCREEN.test(id)) return me.turnsActive === 0 ? 45 : 25;
    if (/^(protect|detect|spikyshield|banefulbunker|burningbulwark|kingsshield|obstruct|silktrap)$/.test(id)) {
      if (me.protectStreak > 0) return -30;
      if (me.mon.status === 'tox' || (foe && foe.mon.status === 'tox')) return 30;
      return danger > 0.8 ? 30 : 5;
    }
    if (id === 'substitute') return (myHP > 0.6 && danger < 0.4) ? 45 : -10;
    if (id === 'leechseed') return (foe && !foe.vol.leechseed && foe.types.indexOf('Grass') < 0) ? 55 : -40;
    if (id === 'sleeptalk') return me.mon.status === 'slp' ? 70 : -80;
    if (id === 'revivalblessing') {
      return me.side.team.some(function (m) { return m.hp <= 0; }) ? 80 : -80;
    }
    if (id === 'courtchange') {
      var mine = me.side.hazards, theirs = me.side.other.hazards;
      var mineN = mine.stealthrock + mine.spikes + mine.toxicspikes + mine.stickyweb;
      var theirN = theirs.stealthrock + theirs.spikes + theirs.toxicspikes + theirs.stickyweb;
      return mineN > theirN ? 60 : -30;
    }
    if (id === 'taunt') return 30;
    if (id === 'trick' || id === 'switcheroo') return me.item ? 25 : -20;
    if (id === 'defog' || id === 'rapidspin') {
      var h = me.side.hazards;
      return (h.stealthrock || h.spikes || h.toxicspikes || h.stickyweb) ? 55 : 5;
    }
    if (id === 'haze') {
      var foeBoost = 0, kk;
      if (foe) for (kk in foe.boosts) foeBoost += Math.max(0, foe.boosts[kk]);
      return foeBoost >= 3 ? 60 : -20;
    }
    if (move.w || move.tr) return me.turnsActive === 0 ? 35 : 15;
    if (move.bo) {
      var neg = 0, k2;
      for (k2 in move.bo) if (move.bo[k2] < 0) neg++;
      return neg ? 25 : 30;
    }
    return 15;
  }

  /* ---------- Wechsel ------------------------------------------------------- */

  /** Wie gut steht dieses Teammitglied gegen den aktuellen Gegner? */
  function matchup(bt, mon, side, foe) {
    if (!foe || mon.hp <= 0) return -1e9;
    var fake = {
      mon: mon, side: side, species: dex.sp(mon.sp), types: dex.sp(mon.sp).t.slice(),
      ability: PL.util.toID(mon.ab), abilityName: mon.ab, item: mon.item,
      boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      vol: {}, stats: mons.stats(mon), turnsActive: 0, lastMove: null, mega: false,
      damagedThisTurn: 0, protectStreak: 0
    };
    var best = 0, i;
    for (i = 0; i < mon.moves.length; i++) {
      if (mon.moves[i].pp <= 0) continue;
      best = Math.max(best, estimate(bt, fake, foe, dex.move(mon.moves[i].m)));
    }
    var offense = Math.min(1.5, best / Math.max(1, foe.mon.hp));
    var incoming = threat(bt, foe, fake);
    var hpFrac = mon.hp / mons.maxHP(mon);
    return offense * 100 - incoming * 90 + hpFrac * 25;
  }

  function chooseSwitch(bt, side, forced) {
    var foe = side.other.active, best = -1e9, pick = -1, i;
    for (i = 0; i < side.team.length; i++) {
      if (side.team[i].hp <= 0 || i === side.activeIndex) continue;
      var sc = matchup(bt, side.team[i], side, foe);
      if (sc > best) { best = sc; pick = i; }
    }
    return pick;
  }

  /* ---------- Gesamtentscheidung -------------------------------------------- */

  /**
   * Wählt eine Aktion für die angegebene Seite.
   * level: 0 wild, 1 Trainer, 2 Ass, 3 Boss
   */
  function chooseAction(bt, sideId, level, opts) {
    opts = opts || {};
    level = level === undefined ? 2 : level;
    var side = bt.sides[sideId], me = side.active, foe = side.other.active;
    if (!me) return { type: 'move', index: 0 };
    var moves = bt.legalMoves(sideId), i, best = null, bestScore = -1e9;

    // Beutel: in Not zuerst heilen. Nur, wenn ein Gegenstand vorhanden ist und
    // der Gegner sonst im nächsten Zug den K.o. schafft.
    if (opts.bag) {
      var hpFrac = me.mon.hp / me.stats[0];
      var incoming = threat(bt, foe, me);
      if (hpFrac < 0.42 && (incoming > 0.8 || hpFrac < 0.22)) {
        var healers = ['fullrestore', 'maxpotion', 'hyperpotion', 'superpotion', 'potion'];
        for (i = 0; i < healers.length; i++) {
          if (opts.bag[healers[i]] > 0) {
            var it = PL.items.get(healers[i]);
            var heals = it && it.name;
            if (heals) return { type: 'item', item: healers[i], target: side.activeIndex };
          }
        }
      }
    }

    for (i = 0; i < moves.length; i++) {
      if (moves[i].disabled) continue;
      var sc = scoreMove(bt, me, foe, moves[i], level);
      if (level === 0) sc = sc * 0.3 + bt.rng.next() * 60;
      else if (level === 1) sc += bt.rng.next() * 25;
      else if (level < 4) sc += bt.rng.next() * 6;
      // Stufe 4 würfelt nicht: Gleichstand entscheidet die zuverlässigere
      // Attacke — höhere Genauigkeit, dann mehr Reserve-AP.
      else sc += (moves[i].move.ac === 0 ? 1 : moves[i].move.ac / 100) * 0.9 + moves[i].pp * 0.01;
      if (sc > bestScore) { bestScore = sc; best = moves[i]; }
    }

    var action = { type: 'move', index: best ? best.index : 0 };

    // Wechsel prüfen
    if (level >= 2 && bt.canSwitch(sideId)) {
      var danger = threat(bt, foe, me);
      var myBest = best && best.move.c !== 'T' ? estimate(bt, me, foe, best.move) : 0;
      var badMatchup = danger > 0.55 && myBest < foe.mon.hp * 0.35;
      if (badMatchup || (me.mon.hp / me.stats[0] < 0.2 && danger > 0.9)) {
        var alt = chooseSwitch(bt, side);
        if (alt >= 0) {
          var altScore = matchup(bt, side.team[alt], side, foe);
          var meScore = matchup(bt, me.mon, side, foe);
          if (altScore > meScore + (level >= 4 ? 60 : 45)) return { type: 'switch', to: alt };
        }
      }
    }

    // Mega-Entwicklung: fast immer richtig, sobald sie möglich ist — die
    // Mega-Form ist in jedem Wert stärker als die Ausgangsform.
    if (bt.canMega(me) && (level >= 2 || bt.alwaysMega)) action.mega = true;

    return action;
  }

  PL.ai = {
    chooseAction: chooseAction,
    chooseSwitch: chooseSwitch,
    estimate: estimate,
    threat: threat,
    matchup: matchup,
    scoreMove: scoreMove
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.ai;
})(typeof globalThis !== 'undefined' ? globalThis : this);
