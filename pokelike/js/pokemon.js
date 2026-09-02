/* =============================================================================
 * pokemon.js — Einzelne Pokémon: Werte, Attacken, Erfahrung, Entwicklung
 * -----------------------------------------------------------------------------
 * Ein Pokémon ist ein schlichtes Objekt ohne Methoden. So lässt sich ein
 * laufender Run mit JSON.stringify wegschreiben und unverändert fortsetzen.
 *
 *   { sp, lvl, exp, ivs[6], evs[6], nat, ab, moves[], hp, status, item,
 *     shiny, gender, friendship, uid }
 *
 * Gliederung:  1) Werte   2) Attackenwahl   3) Erzeugen   4) Erfahrung
 *              5) Entwicklung   6) Fangen
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function' && !PL.dex) require('./core.js');
  var dex = PL.dex, clamp = PL.util.clamp;

  var uidCounter = 1;

  /* ---------- 1) Werte ----------------------------------------------------- */

  /** Wesensfaktor für einen Wert: 1.1 / 1.0 / 0.9 */
  function natureMod(natureName, stat) {
    var n = dex.nature(natureName);
    if (!n || !n.p) return 1;
    if (n.p === stat && n.m !== stat) return 1.1;
    if (n.m === stat && n.p !== stat) return 0.9;
    return 1;
  }

  /** Endwerte [KP, Ang, Ver, SpA, SpV, Ini] eines Pokémon. */
  function stats(mon) {
    var sp = dex.sp(mon.sp), out = [0, 0, 0, 0, 0, 0], i, base, iv, ev, v;
    for (i = 0; i < 6; i++) {
      base = sp.bs[i];
      iv = mon.ivs[i];
      ev = Math.floor(mon.evs[i] / 4);
      if (i === 0) {
        v = sp.id === 'shedinja' ? 1
          : Math.floor((2 * base + iv + ev) * mon.lvl / 100) + mon.lvl + 10;
      } else {
        v = Math.floor((Math.floor((2 * base + iv + ev) * mon.lvl / 100) + 5) *
                       natureMod(mon.nat, PL.STATS[i]));
      }
      out[i] = v;
    }
    return out;
  }

  function maxHP(mon) { return stats(mon)[0]; }

  /* ---------- 2) Attackenwahl ----------------------------------------------
   * Bewertet einen Movepool und stellt ein spielbares Set aus vier Attacken
   * zusammen: mindestens eine STAB-Attacke, Typenvielfalt, höchstens zwei
   * Statusattacken. Dieselbe Bewertung nutzt später auch der Händler, wenn er
   * Attacken zum Erlernen anbietet.
   * ------------------------------------------------------------------------ */

  // Statusattacken, die für die Engine und die KI wirklich etwas taugen.
  var GOOD_STATUS = {
    swordsdance: 90, nastyplot: 90, dragondance: 95, quiverdance: 100, calmmind: 85,
    bulkup: 80, irondefense: 55, agility: 60, shellsmash: 100, clangoroussoul: 85,
    workup: 55, howl: 50, growth: 60, curse: 55, cosmicpower: 40, victorydance: 90,
    tidyup: 80, filletaway: 85, takeheart: 60, coil: 75, honeclaws: 55, rockpolish: 55,
    recover: 85, roost: 85, slackoff: 85, softboiled: 85, milkdrink: 85, moonlight: 70,
    synthesis: 70, morningsun: 70, shoreup: 75, rest: 60, wish: 60, healorder: 85,
    strengthsap: 80, painsplit: 55, junglehealing: 80, lifedew: 65,
    thunderwave: 70, willowisp: 75, toxic: 75, spore: 100, sleeppowder: 80, hypnosis: 60,
    yawn: 60, glare: 65, stunspore: 60, poisonpowder: 45, nuzzle: 60, sing: 40,
    lovelykiss: 60, darkvoid: 70, confuseray: 50, swagger: 35, leechseed: 70,
    stealthrock: 80, spikes: 65, toxicspikes: 60, stickyweb: 65, defog: 55, rapidspin: 60,
    lightscreen: 55, reflect: 55, safeguard: 35, tailwind: 70, trickroom: 60,
    substitute: 65, protect: 55, haze: 45, taunt: 55, encore: 55, disable: 40,
    destinybond: 50, perishsong: 40, whirlwind: 40, roar: 40, dragontail: 0,
    sunnyday: 45, raindance: 45, sandstorm: 35, snowscape: 40, chillyreception: 45,
    electricterrain: 45, grassyterrain: 45, mistyterrain: 40, psychicterrain: 45,
    healbell: 50, aromatherapy: 50, memento: 40, partingshot: 60, batonpass: 45,
    charm: 45, screech: 45, tickle: 40, featherdance: 45, cottonspore: 40,
    scaryface: 45, stringshot: 20, growl: 25, leer: 25, tailwhip: 25, sandattack: 30,
    healingwish: 45, courtchange: 35, acidarmor: 45, barrier: 45, amnesia: 60,
    doubleteam: 30, minimize: 30, defensecurl: 15, harden: 15, withdraw: 15
  };

  function avgHits(mh) {
    if (!mh) return 1;
    if (typeof mh === 'number') return mh;
    return mh[0] === 2 && mh[1] === 5 ? 3.1 : (mh[0] + mh[1]) / 2;
  }

  /** Roher Nutzwert einer Attacke für ein bestimmtes Pokémon. */
  function moveValue(move, sp, level) {
    var v, acc = move.ac === 0 ? 100 : move.ac, stabs = sp.t;
    if (move.c === 'T') {
      v = GOOD_STATUS[move.id] !== undefined ? GOOD_STATUS[move.id] : 12;
      return v * (acc / 100);
    }
    v = (move.bp || 0) * avgHits(move.mh) * (acc / 100);
    if (move.dmg) v = 60;                                   // Fixschaden (Nachthieb & Co.)
    if (move.ohko) v = 10;
    if (stabs.indexOf(move.t) >= 0) v *= 1.5;
    // Zum Angriffswert passende Kategorie bevorzugen
    var atk = sp.bs[1], spa = sp.bs[3];
    if (move.c === 'P') v *= 0.75 + 0.5 * (atk / Math.max(atk, spa));
    else v *= 0.75 + 0.5 * (spa / Math.max(atk, spa));
    if (move.rc) v *= 0.88;                                  // Rückstoß
    if (move.sec && move.sec.length) v *= 1.08;
    if (move.pr > 0) v *= 1.05;
    if (move.id === 'lastresort' || move.id === 'explosion' || move.id === 'selfdestruct') v *= 0.5;
    if (move.pp <= 5 && move.bp >= 110) v *= 0.95;
    if (move.fl && move.fl.indexOf('recharge') >= 0) v *= 0.78;   // Aussetzer danach
    if (move.fl && move.fl.indexOf('charge') >= 0) v *= 0.6;      // Ladezug
    if (move.id === 'dreameater' || move.id === 'snore' || move.id === 'nightmare') v *= 0.35;
    if (move.id === 'lastresort' || move.id === 'falseswipe' || move.id === 'holdback') v *= 0.5;
    if (move.vs === 'lockedmove') v *= 0.9;                       // Wutanfall & Co.
    return v;
  }

  /**
   * Ab welchem Level eine TM-Attacke im Zufallsset auftauchen darf. Ohne diese
   * Bremse liefe schon ein Glumanda auf Level 5 mit Hitzekoller herum und
   * würde alles in einem Zug zerlegen.
   */
  function tmMinLevel(move) {
    if (move.c === 'T') return 8 + (GOOD_STATUS[move.id] || 20) * 0.22;
    var bp = (move.bp || 40) * avgHits(move.mh);
    if (move.dmg || move.ohko) bp = 70;
    return 4 + bp * 0.33;
  }

  /**
   * Stellt ein Set von bis zu vier Attacken zusammen.
   * opts: { maxLevel, tmChance, quality } — quality 0..1 steuert, wie streng
   * nach Nutzwert ausgewählt wird (wilde Pokémon schlechter als Bosse).
   */
  function buildMoveset(sp, level, rng, opts) {
    opts = opts || {};
    var quality = opts.quality === undefined ? 0.7 : opts.quality;
    var allowTM = opts.tm === undefined ? true : opts.tm;
    var pool = [], seen = {}, i, mi, mv;

    // Farbeagle beherrscht per Nostalgie alles — es bekommt vier zufällige
    // Attacken aus dem gesamten Vorrat.
    if (sp.id === 'smeargle') {
      var all = dex.moves.filter(function (m) { return !m.np && (m.c !== 'T' || GOOD_STATUS[m.id] >= 40); });
      return rng.sample(all, 4).map(function (m) {
        return { m: m.i, pp: m.pp, ppUp: 0, used: 0 };
      });
    }

    function add(idx, weight) {
      if (seen[idx]) return;
      mv = dex.move(idx);
      if (!mv || mv.np) return;
      seen[idx] = 1;
      pool.push({ i: idx, m: mv, v: moveValue(mv, sp, level) * weight });
    }

    for (i = 0; i < sp.lv.length; i += 2) if (sp.lv[i + 1] <= level) add(sp.lv[i], 1);
    if (allowTM) {
      for (i = 0; i < sp.tm.length; i++) {
        mv = dex.move(sp.tm[i]);
        if (mv && level >= tmMinLevel(mv)) add(sp.tm[i], 0.9);
      }
    }
    // Notnagel: sehr niedrige Level ohne gelernte Attacke
    if (!pool.length) for (i = 0; i < sp.lv.length && i < 12; i += 2) add(sp.lv[i], 1);
    if (!pool.length) add(dex.move('tackle').i, 1);

    // Zufälliges Rauschen: je geringer quality, desto eher landet Mittelmaß im Set
    for (i = 0; i < pool.length; i++) pool[i].s = pool[i].v * (1 - (1 - quality) * rng.next());
    pool.sort(function (a, b) { return b.s - a.s; });

    var chosen = [], types = {}, statusCount = 0, damaging = 0, hasStab = false;
    for (i = 0; i < pool.length && chosen.length < 4; i++) {
      var e = pool[i], m = e.m;
      if (m.c === 'T') {
        if (statusCount >= (quality > 0.5 ? 2 : 1)) continue;
        if (chosen.length === 3 && damaging === 0) continue;
      } else {
        // Typenvielfalt: derselbe Angriffstyp höchstens zweimal
        if (types[m.t] >= 2) continue;
        if (types[m.t] >= 1 && e.v < pool[0].v * 0.7) continue;
      }
      chosen.push(e);
      if (m.c === 'T') statusCount++; else { damaging++; types[m.t] = (types[m.t] || 0) + 1; }
      if (sp.t.indexOf(m.t) >= 0 && m.c !== 'T') hasStab = true;
    }
    // Ohne STAB-Attacke fühlt sich ein Pokémon falsch an — eine erzwingen
    if (!hasStab && chosen.length === 4) {
      for (i = 0; i < pool.length; i++) {
        if (pool[i].m.c !== 'T' && sp.t.indexOf(pool[i].m.t) >= 0) {
          var worst = 0, k;
          for (k = 1; k < chosen.length; k++) if (chosen[k].v < chosen[worst].v) worst = k;
          chosen[worst] = pool[i];
          break;
        }
      }
    }
    return chosen.map(function (e) { return { m: e.i, pp: e.m.pp, ppUp: 0, used: 0 }; });
  }

  /* ---------- 3) Erzeugen --------------------------------------------------- */

  var GENDERLESS = /ditto|magnemite|magneton|magnezone|voltorb|electrode|staryu|starmie|porygon|beldum|metang|metagross|baltoy|claydol|bronzor|bronzong|golett|golurk|klink|klang|klinklang|cryogonal|carbink|minior|dhelmise|sinistea|polteageist|falinks|rotom|unown|mew|arceus|dialga|palkia|giratina|regi|deoxys|lugia|hooh|kyogre|groudon|rayquaza|jirachi|darkrai|shaymin|victini|zekrom|reshiram|kyurem|genesect|xerneas|yveltal|zygarde|magearna|marshadow|melmetal|meltan|zacian|zamazenta|eternatus|regieleki|regidrago|calyrex|glastrier|spectrier|koraidon|miraidon|terapagos|ironvaliant|ironhands|greattusk|scream|slither|brute|sandy|roaring|walking|gholdengo|type|silvally|cosmog|cosmoem|solgaleo|lunala|necrozma|nihilego|buzzwole|pheromosa|xurkitree|celesteela|kartana|guzzlord|poipole|naganadel|stakataka|blacephalon|zeraora|kubfu|urshifu|glimmet|glimmora|tinkat/;

  function pickGender(sp, rng) {
    if (GENDERLESS.test(sp.id)) return 'N';
    return rng.chance(0.5) ? 'M' : 'F';
  }

  function pickAbility(sp, rng, opts) {
    opts = opts || {};
    if (opts.ability) return opts.ability;
    if (sp.abh && opts.hiddenChance && rng.chance(opts.hiddenChance)) return sp.abh;
    return rng.pick(sp.ab);
  }

  /** Alle Fähigkeiten, die eine Spezies haben kann (versteckte zuletzt). */
  function abilityOptions(sp) {
    return sp.abh ? sp.ab.concat([sp.abh]) : sp.ab.slice();
  }

  /**
   * Erzeugt ein Pokémon.
   * opts: { ivs, evs, nature, ability, moves, item, shiny, shinyOdds, hiddenChance,
   *         quality, ivFloor, nick }
   */
  function create(ref, level, rng, opts) {
    opts = opts || {};
    var sp = dex.sp(ref);
    if (!sp) throw new Error('Unbekannte Spezies: ' + ref);
    level = clamp(level | 0, 1, 100);

    var ivFloor = opts.ivFloor || 0;
    var ivs = opts.ivs ? opts.ivs.slice() : [0, 0, 0, 0, 0, 0].map(function () {
      return rng.range(ivFloor, 31);
    });
    var evs = opts.evs ? opts.evs.slice() : [0, 0, 0, 0, 0, 0];
    var nature = opts.nature || rng.pick(dex.natures).n;
    var shinyOdds = opts.shinyOdds === undefined ? 1 / 256 : opts.shinyOdds;

    var mon = {
      uid: 'm' + (uidCounter++) + '-' + rng.int(1e6).toString(36),
      sp: sp.i,
      lvl: level,
      exp: expForLevel(level),
      ivs: ivs,
      evs: evs,
      nat: nature,
      ab: opts.ability || pickAbility(sp, rng, { hiddenChance: opts.hiddenChance || 0.12 }),
      moves: opts.moves || buildMoveset(sp, level, rng, opts),
      hp: 0,
      status: null,
      slp: 0,
      item: opts.item || null,
      shiny: opts.shiny !== undefined ? opts.shiny : rng.chance(shinyOdds),
      gender: opts.gender || pickGender(sp, rng),
      friendship: opts.friendship || 70,
      nick: opts.nick || null,
      seen: 0
    };
    mon.hp = maxHP(mon);
    return mon;
  }

  /* ---------- 4) Erfahrung -------------------------------------------------- */

  function expForLevel(l) { return l * l * l; }
  function levelForExp(e) { return clamp(Math.floor(Math.cbrt(e)), 1, 100); }
  function expToNext(mon) {
    if (mon.lvl >= 100) return 0;
    return expForLevel(mon.lvl + 1) - mon.exp;
  }
  function expProgress(mon) {
    if (mon.lvl >= 100) return 1;
    var lo = expForLevel(mon.lvl), hi = expForLevel(mon.lvl + 1);
    return clamp((mon.exp - lo) / (hi - lo), 0, 1);
  }

  /**
   * Erfahrung aus einem besiegten Gegner. Der Aufholfaktor sorgt dafür, dass
   * zurückgefallene Teammitglieder wieder Anschluss finden und Überflieger
   * nicht davonlaufen.
   */
  function expGain(winner, loserSp, loserLevel, opts) {
    opts = opts || {};
    var base = Math.max(40, loserSp.bst * 0.75);
    var raw = base * loserLevel / 7 * (opts.mult || 1);
    var diff = (opts.targetLevel || loserLevel) - winner.lvl;
    var catchUp = diff > 0 ? 1 + Math.min(diff, 8) * 0.22 : 1 / (1 + Math.min(-diff, 12) * 0.12);
    return Math.max(1, Math.round(raw * catchUp));
  }

  /**
   * Trägt Erfahrung ein und meldet, was dabei passiert ist.
   * Rückgabe: { levels: [neueLevel], learned: [{level, move}], evolve: SpeziesOderNull }
   */
  function gainExp(mon, amount, opts) {
    opts = opts || {};
    var res = { gained: amount, levels: [], learned: [], canEvolve: null };
    var capLevel = opts.levelCap || 100;
    if (mon.lvl >= capLevel) { res.gained = 0; return res; }
    mon.exp += amount;
    while (mon.lvl < capLevel && mon.exp >= expForLevel(mon.lvl + 1)) {
      mon.lvl++;
      res.levels.push(mon.lvl);
      var sp = dex.sp(mon.sp), i;
      for (i = 0; i < sp.lv.length; i += 2) {
        if (sp.lv[i + 1] === mon.lvl && !dex.move(sp.lv[i]).np) {
          res.learned.push({ level: mon.lvl, move: sp.lv[i] });
        }
      }
      mon.hp = Math.min(mon.hp + heal_on_level(mon), maxHP(mon));
    }
    if (mon.exp > expForLevel(capLevel)) mon.exp = expForLevel(capLevel);
    return res;
  }

  // Beim Aufstieg wächst der KP-Wert; die gewonnenen Punkte gibt es geschenkt.
  function heal_on_level(mon) { return 2 + Math.floor(mon.lvl / 8); }

  function addEVs(mon, stat, amount) {
    var i = PL.STATS.indexOf(stat);
    if (i < 0) return 0;
    var total = mon.evs.reduce(function (a, b) { return a + b; }, 0);
    var room = Math.min(252 - mon.evs[i], 510 - total, amount);
    if (room <= 0) return 0;
    mon.evs[i] += room;
    return room;
  }

  /* ---------- 5) Entwicklung ------------------------------------------------
   * Im Run entwickeln sich Pokémon beim Stufenaufstieg von selbst; alles
   * andere (Steine, Tausch, Freundschaft) hängt an Gegenständen bzw. an der
   * Zahl gemeinsamer Kämpfe.
   * ------------------------------------------------------------------------ */

  var EVO_ITEM_ALIAS = { 'Linking Cord': 'trade' };

  /**
   * Prüft alle Entwicklungen einer Spezies.
   * ctx: { items: {ItemName: Anzahl}, friendship, force }
   * Rückgabe: Liste { to, how, ready, item, text }
   */
  function evolutions(mon, ctx) {
    ctx = ctx || {};
    var sp = dex.sp(mon.sp), out = [], i;
    if (!sp.ev) return out;
    for (i = 0; i < sp.ev.length; i++) {
      var to = dex.sp(sp.ev[i]);
      var how = to.et || (to.el ? 'level' : 'other');
      var entry = { to: to, how: how, item: to.ei || null, ready: false, text: '' };
      switch (how) {
        case 'level':
          entry.ready = mon.lvl >= (to.el || 100);
          entry.text = 'Level ' + (to.el || '?');
          break;
        case 'useItem':
          entry.ready = !!(ctx.items && ctx.items[to.ei] > 0);
          entry.text = to.ei || 'Stein';
          break;
        case 'levelFriendship':
          entry.ready = (mon.friendship || 0) >= 160 && mon.lvl > (to.el || 0);
          entry.text = 'Freundschaft' + (to.ec ? ' (' + to.ec + ')' : '');
          break;
        case 'levelHold':
          entry.ready = mon.item === to.ei && mon.lvl >= (to.el || 1);
          entry.text = to.ei + ' tragen';
          break;
        case 'levelMove':
          entry.ready = !!(to.em && mon.moves.some(function (mv) { return dex.move(mv.m).n === to.em; }));
          entry.text = to.em + ' beherrschen';
          break;
        case 'trade':
          entry.ready = !!(ctx.items && ctx.items['Linking Cord'] > 0);
          entry.item = 'Linking Cord';
          entry.text = 'Kabelmodul';
          break;
        case 'levelExtra':
        case 'other':
        default:
          entry.ready = !!(ctx.items && ctx.items['Rätselstein'] > 0);
          entry.item = 'Rätselstein';
          entry.text = to.ec || 'besondere Bedingung';
          break;
      }
      if (ctx.force) entry.ready = true;
      out.push(entry);
    }
    return out;
  }

  /** Die Entwicklung, die beim Stufenaufstieg von allein greift. */
  function autoEvolution(mon) {
    var list = evolutions(mon, {}), i;
    for (i = 0; i < list.length; i++) {
      if (list[i].ready && (list[i].how === 'level' || list[i].how === 'levelFriendship' ||
                            list[i].how === 'levelMove')) return list[i];
    }
    return null;
  }

  /** Wandelt das Pokémon um und behält KP-Anteil, Attacken und Bindung. */
  function evolve(mon, toSpecies, rng) {
    var before = maxHP(mon), frac = mon.hp / before;
    var oldSp = dex.sp(mon.sp), newSp = dex.sp(toSpecies);
    var wasHidden = oldSp.abh === mon.ab;
    var slot = oldSp.ab.indexOf(mon.ab);
    mon.sp = newSp.i;
    if (wasHidden && newSp.abh) mon.ab = newSp.abh;
    else if (slot >= 0 && newSp.ab[slot]) mon.ab = newSp.ab[slot];
    else if (abilityOptions(newSp).indexOf(mon.ab) < 0) mon.ab = newSp.ab[0];
    mon.hp = Math.max(1, Math.round(maxHP(mon) * frac));
    return mon;
  }

  /* ---------- 6) Fangen ----------------------------------------------------- */

  /** Grundfangrate 3..200, abgeleitet aus Basiswertsumme und Seltenheit. */
  function catchRate(sp) {
    var bst = sp.bst, r;
    if (bst < 300) r = 200;
    else if (bst < 400) r = 150;
    else if (bst < 500) r = 100;
    else if (bst < 580) r = 60;
    else r = 35;
    if (dex.evosLeft(sp) > 0) r = Math.min(255, r + 40);
    if (dex.isLegendary(sp)) r = Math.round(r * 0.35);
    if (dex.isRestricted(sp)) r = Math.round(r * 0.5);
    return clamp(r, 3, 255);
  }

  var STATUS_BONUS = { slp: 2.5, frz: 2.5, par: 1.5, brn: 1.5, psn: 1.5, tox: 1.5 };

  /**
   * Wurf mit einem Ball. Rückgabe { caught, shakes, chance }.
   * ballMult: Poké 1, Super 1.5, Hyper 2, Timer/Netz/Finster situativ, Meister ∞
   */
  function tryCatch(mon, ballMult, rng, opts) {
    opts = opts || {};
    var max = maxHP(mon), cur = Math.max(1, mon.hp);
    if (ballMult >= 255) return { caught: true, shakes: 4, chance: 1 };
    var rate = catchRate(dex.sp(mon.sp)) * (opts.rateMult || 1);
    var status = STATUS_BONUS[mon.status] || 1;
    var levelBonus = clamp((30 - mon.lvl) / 100 + 1, 0.65, 1.3);
    var a = ((3 * max - 2 * cur) * rate * ballMult) / (3 * max) * status * levelBonus;
    a = clamp(a, 1, 255);
    var b = 65536 / Math.pow(255 / a, 0.1875);
    var shakes = 0, i;
    for (i = 0; i < 4; i++) { if (rng.int(65536) < b) shakes++; else break; }
    var per = Math.min(1, b / 65536);
    return { caught: shakes === 4, shakes: shakes, chance: Math.pow(per, 4) };
  }

  /* ---------- Ausgabe ------------------------------------------------------- */

  PL.mon = {
    create: create,
    stats: stats,
    maxHP: maxHP,
    natureMod: natureMod,
    buildMoveset: buildMoveset,
    abilityOptions: abilityOptions,
    moveValue: moveValue,
    tmMinLevel: tmMinLevel,
    expForLevel: expForLevel,
    levelForExp: levelForExp,
    expToNext: expToNext,
    expProgress: expProgress,
    expGain: expGain,
    gainExp: gainExp,
    addEVs: addEVs,
    evolutions: evolutions,
    autoEvolution: autoEvolution,
    evolve: evolve,
    catchRate: catchRate,
    tryCatch: tryCatch,
    name: function (mon) { return mon.nick || PL.t.species(dex.sp(mon.sp)); },
    species: function (mon) { return dex.sp(mon.sp); },
    isFainted: function (mon) { return mon.hp <= 0; },
    heal: function (mon, amount) {
      var m = maxHP(mon);
      mon.hp = clamp(mon.hp + (amount === undefined ? m : amount), 0, m);
      return mon.hp;
    },
    fullRestore: function (mon) {
      mon.hp = maxHP(mon); mon.status = null; mon.slp = 0;
      mon.moves.forEach(function (mv) { mv.pp = dex.move(mv.m).pp + mv.ppUp * Math.floor(dex.move(mv.m).pp / 5); });
      return mon;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.mon;
})(typeof globalThis !== 'undefined' ? globalThis : this);
