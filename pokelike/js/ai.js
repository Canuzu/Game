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
 *
 * Der Auto-Kampf bekommt zusätzlich den laufenden Run mitgeliefert (opts.run)
 * und darf deshalb mehr als angreifen: heilen, Status kurieren, beleben,
 * wechseln, ein lohnendes wildes Pokémon erst schwächen und dann fangen — und
 * aus einem wilden Kampf fliehen, der sonst den Run kostet.
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

  /* ---------- Wert eines Pokémon ------------------------------------------- */

  /** Die Basiswertsumme, die dieses Pokémon am Ende seiner Entwicklung hat. */
  function potential(sp) {
    var best = sp.bst, seen = {};
    (function walk(s) {
      if (!s || seen[s.id]) return;
      seen[s.id] = 1;
      if (s.bst > best) best = s.bst;
      (s.ev || []).forEach(function (i) { walk(dex.species[i]); });
    })(sp);
    return best;
  }

  /* ---------- Bewertung einzelner Attacken --------------------------------- */

  var SETUP = /swordsdance|nastyplot|dragondance|quiverdance|calmmind|bulkup|shellsmash|workup|howl|growth|coil|honeclaws|rockpolish|agility|irondefense|acidarmor|amnesia|barrier|cosmicpower|tidyup|victorydance|takeheart|filletaway|clangoroussoul|bellydrum/;
  var HEAL = /recover|roost|slackoff|softboiled|milkdrink|moonlight|synthesis|morningsun|shoreup|rest|healorder|junglehealing|lifedew|strengthsap|painsplit/;
  var HAZARD = /stealthrock|spikes|toxicspikes|stickyweb/;
  var SCREEN = /reflect|lightscreen|auroraveil|tailwind|safeguard/;

  // Attacken, die erst aufladen. Wer schon lädt, hat keine Wahl mehr — dann
  // zählt die volle Wirkung; sonst wird die verlorene Runde eingepreist.
  var TWO_TURN = /^(solarbeam|solarblade|razorwind|skullbash|skyattack|freezeshock|iceburn|meteorbeam|electroshot|geomancy|fly|bounce|dig|dive|phantomforce|shadowforce)$/;

  function scoreMove(bt, me, foe, entry, level, opts) {
    var move = entry.move, s = 0;
    if (entry.disabled) return -1e9;
    var foeHP = foe ? foe.mon.hp : 1;
    var myHP = bt.hpFraction(me);
    var danger = threat(bt, foe, me);

    // Wer fangen will, darf nicht besiegen. Dann zählt eine ganz andere
    // Rechnung: schwächen bis knapp über null, am liebsten schlafen legen.
    if (opts && opts.wantsCatch && foe) {
      if (move.c !== 'T') {
        if (/^(falseswipe|holdback)$/.test(move.id)) return 190;
        var d = estimate(bt, me, foe, move);
        if (d <= 0) return -60;
        if (d >= foeHP) return -80;                       // das wäre der K. o.
        var left = (foeHP - d) / Math.max(1, mons.maxHP(foe.mon));
        return 130 - Math.abs(left - 0.22) * 200;
      }
      if (move.st === 'slp') return 210;
      if (move.st === 'frz' || move.st === 'par') return 160;
      if (move.st) return 60;
      return 0;
    }

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

  /**
   * Wie gut steht dieses Teammitglied gegen den aktuellen Gegner?
   * `opts.switching` heißt: Es käme frisch herein und fängt sich dabei einen
   * Treffer. Wer den nicht übersteht, ist keine Rettung, sondern ein Opfer.
   */
  function matchup(bt, mon, side, foe, opts) {
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
    var score = offense * 100 - incoming * 90 + hpFrac * 25;
    // Beim Hereinwechseln gibt es einen Treffer geschenkt. Wer daran stirbt,
    // hat den Wechsel nicht wert gemacht.
    if (opts && opts.switching && incoming >= 1) score -= 220;
    return score;
  }

  /**
   * Wer soll aufs Feld? `forced` heißt: Der Vorgänger liegt schon, ein Treffer
   * beim Hereinkommen droht also nicht.
   */
  function chooseSwitch(bt, side, forced) {
    var foe = side.other.active, best = -1e9, pick = -1, i;
    var opts = { switching: !forced };
    for (i = 0; i < side.team.length; i++) {
      if (side.team[i].hp <= 0 || i === side.activeIndex) continue;
      var sc = matchup(bt, side.team[i], side, foe, opts);
      if (sc > best) { best = sc; pick = i; }
    }
    return pick;
  }

  /* ---------- Beutel, Bälle, Flucht ------------------------------------------
   * Nur der Auto-Kampf greift hierauf zu: er bekommt den Run mitgeliefert und
   * darf deshalb den Beutel benutzen. Gegner bleiben bei Attacken und Wechsel.
   * -------------------------------------------------------------------------- */

  var HEALERS = [
    { id: 'potion', heals: 20 },
    { id: 'superpotion', heals: 60 },
    { id: 'hyperpotion', heals: 120 },
    { id: 'maxpotion', heals: 1e9 },
    { id: 'fullrestore', heals: 1e9 }
  ];
  var CURES = {
    psn: ['antidote', 'fullheal'], tox: ['antidote', 'fullheal'],
    brn: ['burnheal', 'fullheal'], par: ['paralyzeheal', 'fullheal'],
    slp: ['awakening', 'fullheal'], frz: ['iceheal', 'fullheal']
  };

  /** Der kleinste Trank, der die Lücke im Wesentlichen füllt. */
  function pickHealer(bag, missing) {
    var fallback = null, i;
    for (i = 0; i < HEALERS.length; i++) {
      var h = HEALERS[i];
      if (!(bag[h.id] > 0)) continue;
      if (!fallback) fallback = h.id;
      if (h.heals >= missing * 0.75) return h.id;
    }
    return fallback;
  }

  /** Lohnt es sich, diesen Zustand mit einem Gegenstand loszuwerden? */
  function statusHurts(bt, me, foe, status) {
    if (status === 'slp' || status === 'frz') return true;             // steht still
    if (status === 'tox') return true;                                 // wird nur schlimmer
    if (status === 'par') return !foe || bt.statOf(me, 'spe') * 2 >= bt.statOf(foe, 'spe');
    if (status === 'brn') return me.stats[1] >= me.stats[3];           // trifft körperlich
    if (status === 'psn') return bt.hpFraction(me) < 0.6;
    return false;
  }

  /** Wie viel KP dieser Trank hier tatsächlich zurückgibt. */
  function healAmount(id, missing) {
    var i, h;
    for (i = 0; i < HEALERS.length; i++) if (HEALERS[i].id === id) h = HEALERS[i].heals;
    return Math.min(missing, h === undefined ? 0 : h);
  }

  /**
   * Ein Gegenstand aus dem Beutel — oder nichts.
   * `killsNow` sagt, ob dieser Zug den Gegner ohnehin umlegt; dann wäre jede
   * Runde für einen Trank verschenkt.
   */
  function bagAction(bt, side, me, foe, bag, killsNow) {
    if (!bag) return null;
    var max = me.stats[0], missing = max - me.mon.hp;
    var frac = me.mon.hp / max;
    var danger = threat(bt, foe, me);
    var incoming = danger * me.mon.hp;              // Schaden in KP, nicht in Anteilen
    var alive = 0, fainted = 0, faintedIndex = -1, i;
    for (i = 0; i < side.team.length; i++) {
      if (side.team[i].hp > 0) alive++;
      else { fainted++; if (faintedIndex < 0) faintedIndex = i; }
    }

    /* Heilen ist kein Gefühl, sondern eine Rechnung: Der Trank lohnt, wenn er
       den nächsten Treffer überlebbar macht. Wer ohnehin gerade gewinnt,
       heilt nicht — die Runde gehört dem Angriff. */
    if (missing > 0 && !killsNow) {
      var healer = pickHealer(bag, missing);
      if (healer) {
        var gain = healAmount(healer, missing);
        var deadly = incoming >= me.mon.hp;                       // fällt ohne Trank
        var survives = me.mon.hp + gain > incoming * 1.1;         // hält mit Trank
        if (deadly && survives) return { type: 'item', item: healer, target: side.activeIndex };
        // Auch ohne akute Gefahr: knapp über der Hälfte fehlt, und es kommt
        // noch etwas — dann ist jetzt der ruhige Moment dafür.
        if (frac < 0.5 && gain >= missing * 0.6 && danger > 0.4) {
          return { type: 'item', item: healer, target: side.activeIndex };
        }
      }
    }

    // Status kurieren, wenn er wirklich schadet
    var st = me.mon.status;
    if (st && CURES[st] && statusHurts(bt, me, foe, st)) {
      for (i = 0; i < CURES[st].length; i++) {
        if (bag[CURES[st][i]] > 0) {
          return { type: 'item', item: CURES[st][i], target: side.activeIndex };
        }
      }
    }

    // Beleben, solange man es sich leisten kann: beim letzten Pokémon immer,
    // sonst, wenn schon zwei liegen und der Kampf noch lange dauert.
    var manyDown = fainted >= 2 && side.other.team.filter(function (m) { return m.hp > 0; }).length >= 2;
    if (faintedIndex >= 0 && danger < 0.5 && frac > 0.55 && !killsNow && (alive === 1 || manyDown)) {
      if (bag.maxrevive > 0) return { type: 'item', item: 'maxrevive', target: faintedIndex };
      if (bag.revive > 0) return { type: 'item', item: 'revive', target: faintedIndex };
    }

    /* X-Gegenstände in den harten Kämpfen: Wer sicher steht und den Gegner
       nicht in einem Zug umlegt, holt sich lieber erst zwei Stufen. */
    if (bt.aiLevel >= 2 && !killsNow && frac > 0.7 && danger < 0.35 &&
        !me.boosts.atk && !me.boosts.spa && me.turnsActive < 3) {
      var physical = me.stats[1] >= me.stats[3];
      var xid = physical ? 'xattack' : 'xspecial';
      if (bag[xid] > 0) return { type: 'item', item: xid, target: side.activeIndex };
    }
    return null;
  }

  /**
   * Wie sehr lohnt sich dieses wilde Pokémon? Ab etwa 45 wird geworfen.
   * Es zählt, was man davon hat: Platz im Team, Seltenheit, Aussicht auf
   * Stärke — und ob es überhaupt neu ist.
   */
  function catchWorth(bt, run, foe, opts) {
    if (!bt.wild || !run || bt.nuzlockeLocked || !foe) return 0;
    var mon = foe.mon, sp = foe.species, w = 0, i;
    var mine = run.party.concat(run.box || []);
    for (i = 0; i < mine.length; i++) if (mine[i].sp === mon.sp) { w -= 70; break; }
    if (mon.shiny) w += 130;
    if (dex.isLegendary(sp)) w += 90;
    if (run.party.length < 6) w += 75;
    if (opts && opts.dexNew) w += 30;
    // Gegen das schwächste eigene Mitglied gerechnet: Was bringt der Tausch?
    var weakest = 1e9;
    for (i = 0; i < run.party.length; i++) {
      var p = potential(dex.sp(run.party[i].sp));
      if (p < weakest) weakest = p;
    }
    if (weakest < 1e9) w += Math.max(-50, Math.min(70, (potential(sp) - weakest) / 5));
    return w;
  }

  /** Alle Bälle im Beutel mit ihrer Fangchance gegen dieses Ziel. */
  function ballOptions(bt, run, foe) {
    var out = [];
    Object.keys(run.bag).forEach(function (id) {
      if (!(run.bag[id] > 0)) return;
      var it = PL.items.get(id);
      if (!it || it.kind !== 'ball') return;
      var mult = it.ball ? it.ball(bt, foe) : 1;
      if (bt.relicMod && bt.relicMod('timerBalls')) mult *= 1 + Math.min(2, bt.turn * 0.15);
      var res = mons.tryCatch(foe.mon, mult, FIXED, { rateMult: bt.catchMult });
      out.push({ id: id, price: it.price || 0, chance: res.chance, count: run.bag[id] });
    });
    // Der billigste Ball, der reicht — der teure bleibt für das nächste Mal.
    out.sort(function (a, b) { return a.price - b.price; });
    return out;
  }

  /**
   * Der Ball, der jetzt geworfen werden soll — oder nichts. Der Meisterball
   * bleibt liegen, solange es nicht um etwas Besonderes geht.
   */
  function pickBall(bt, run, foe, worth, mustThrow) {
    var opts = ballOptions(bt, run, foe);
    if (!opts.length) return null;
    var special = foe.mon.shiny || dex.isLegendary(foe.species);
    // Bei etwas Besonderem wird geworfen, sobald es überhaupt eine Aussicht
    // gibt: Auf die perfekte Gelegenheit zu warten heißt hier, sie zu verpassen.
    var need = mustThrow ? 0 : (special ? 0.08 : (worth >= 110 ? 0.3 : 0.5));
    var i, cheapEnough = null;
    for (i = 0; i < opts.length; i++) {
      if (opts[i].id === 'masterball' && !special && opts.length > 1) continue;
      if (opts[i].chance >= need) return opts[i];
      cheapEnough = cheapEnough || opts[i];
    }
    // Nichts reicht: bei Zwang der beste vorhandene Ball, sonst erst schwächen.
    if (!mustThrow) return null;
    var best = null;
    for (i = 0; i < opts.length; i++) if (!best || opts[i].chance > best.chance) best = opts[i];
    return best || cheapEnough;
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
    var run = opts.run || null;
    var bag = opts.bag || (run ? run.bag : null);
    var moves = bt.legalMoves(sideId), i, best = null, bestScore = -1e9;

    /* --- 1) Aussichtslos? Aus einem wilden Kampf kommt man heraus. --------- */
    if (run && bt.wild && !bt.ended) {
      var left = 0, k;
      for (k = 0; k < side.team.length; k++) if (side.team[k].hp > 0) left++;
      var hopeless = left === 1 && me.mon.hp / me.stats[0] < 0.3 &&
        threat(bt, foe, me) > 0.9 && !bagAction(bt, side, me, foe, bag);
      if (hopeless) return { type: 'run' };
    }

    /* --- 2) Fangen: erst prüfen, ob es sich lohnt, dann schwächen ---------- */
    var wantsCatch = false;
    if (run && bt.wild && !bt.nuzlockeLocked) {
      var worth = catchWorth(bt, run, foe, opts);
      if (worth >= 45) {
        wantsCatch = true;
        // Wenn ohnehin jede Attacke den K. o. bedeutet, wird jetzt geworfen.
        var everythingKills = true;
        for (i = 0; i < moves.length; i++) {
          var mv = moves[i].move;
          if (moves[i].disabled || mv.c === 'T') continue;
          if (estimate(bt, me, foe, mv) < foe.mon.hp) { everythingKills = false; break; }
        }
        var ball = pickBall(bt, run, foe, worth, everythingKills);
        if (ball) return { type: 'ball', item: ball.id };
      }
    }
    opts = wantsCatch ? { wantsCatch: true, run: run, bag: bag, dexNew: opts.dexNew } : opts;


    for (i = 0; i < moves.length; i++) {
      if (moves[i].disabled) continue;
      var sc = scoreMove(bt, me, foe, moves[i], level, opts);
      if (level === 0) sc = sc * 0.3 + bt.rng.next() * 60;
      else if (level === 1) sc += bt.rng.next() * 25;
      else if (level < 4) sc += bt.rng.next() * 6;
      // Stufe 4 würfelt nicht: Gleichstand entscheidet die zuverlässigere
      // Attacke — höhere Genauigkeit, dann mehr Reserve-AP.
      else sc += (moves[i].move.ac === 0 ? 1 : moves[i].move.ac / 100) * 0.9 + moves[i].pp * 0.01;
      if (sc > bestScore) { bestScore = sc; best = moves[i]; }
    }

    /* --- 4) Angreifen ------------------------------------------------------ */
    var action = { type: 'move', index: best ? best.index : 0 };
    var myBest = best && best.move.c !== 'T' ? estimate(bt, me, foe, best.move) : 0;
    var killsNow = foe ? myBest >= foe.mon.hp : false;

    /* --- 4b) Beutel: heilen, kurieren, beleben, verstärken ----------------
     * Erst jetzt, weil die Entscheidung davon abhängt, ob der Angriff diese
     * Runde ohnehin entscheidet. */
    if (bag) {
      var bagPick = bagAction(bt, side, me, foe, bag, killsNow);
      if (bagPick) return bagPick;
    }

    /* --- 5) Wechseln ------------------------------------------------------
     * Nicht wechseln, wenn dieser Zug den Kampf entscheidet. Sonst zählt der
     * Abstand zwischen der jetzigen Paarung und der besten auf der Bank; wie
     * groß er sein muss, hängt davon ab, wie dringend es ist. */
    if (level >= 2 && bt.canSwitch(sideId) && !wantsCatch) {
      var danger = threat(bt, foe, me);
      var hpFrac = me.mon.hp / me.stats[0];
      var doomed = danger >= 1 && !killsNow;                 // stirbt im nächsten Zug
      var badMatchup = danger > 0.55 && myBest < foe.mon.hp * 0.35;
      if (!killsNow && (badMatchup || doomed || (hpFrac < 0.2 && danger > 0.9))) {
        var alt = chooseSwitch(bt, side);
        if (alt >= 0) {
          var altScore = matchup(bt, side.team[alt], side, foe, { switching: true });
          var meScore = matchup(bt, me.mon, side, foe);
          // Wer ohnehin fällt, verliert durch den Wechsel nichts mehr. Und in
          // der ersten Runde kostet ein Wechsel fast nichts: Es ist noch kein
          // Schaden gefallen, den man mitnimmt.
          var hurdle = doomed ? 15 : (me.turnsActive === 0 ? 25 : 45);
          if (altScore > meScore + hurdle) return { type: 'switch', to: alt };
        }
      }
    }

    // Verwandeln: fast immer richtig, sobald es möglich ist. Mega geht vor —
    // die Mega-Form ist in jedem Wert stärker und hält den ganzen Kampf,
    // Gigadynamax nur drei Runden.
    if (level >= 2 || bt.alwaysMega) {
      if (bt.canMega(me)) action.mega = true;
      else if (bt.canGmax(me)) action.gmax = true;
    }

    return action;
  }

  PL.ai = {
    chooseAction: chooseAction,
    chooseSwitch: chooseSwitch,
    estimate: estimate,
    threat: threat,
    matchup: matchup,
    scoreMove: scoreMove,
    potential: potential,
    bagAction: bagAction,
    catchWorth: catchWorth,
    ballOptions: ballOptions,
    pickBall: pickBall
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.ai;
})(typeof globalThis !== 'undefined' ? globalThis : this);
