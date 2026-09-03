/* =============================================================================
 * battle.js — Rundenbasierte Kampf-Engine
 * -----------------------------------------------------------------------------
 * Einzelkämpfe 1 gegen 1 aus Teams zu sechst, nah an den Regeln der Hauptreihe:
 * Schadensformel ab Generation 5, Statusprobleme, Statusstufen, Wetter, Felder,
 * Fähigkeiten, Tragegegenstände und Mega-Entwicklung.
 *
 * Zwei Ebenen von Zustand:
 *   mon    — bleibt über Kämpfe hinweg (KP, Status, AP, Item, Level)
 *   active — gilt nur, solange das Pokémon im Kampf steht (Statusstufen,
 *            flüchtige Zustände, Mega-Form)
 *
 * Gliederung:  1) Aufbau        2) Werte und Zustände   3) Schadensrechnung
 *              4) Attacken      5) Rundenablauf         6) Rundenende
 *              7) Wechsel/Ende  8) Schnittstelle
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.dex) require('./core.js');
    if (!PL.mon) require('./pokemon.js');
  }
  var dex = PL.dex, mons = PL.mon, clamp = PL.util.clamp, T = PL.t;

  var BOOSTABLE = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'];

  /* ---------- 1) Aufbau ---------------------------------------------------- */

  /**
   * opts: {
   *   teams: [[mon,...], [mon,...]],   // 0 = Spieler, 1 = Gegner
   *   rng, wild: bool, trainer: {name, class, sprite},
   *   weather, terrain, relics: {id: n}, canCatch: bool, levelCap
   * }
   */
  function Battle(opts) {
    this.rng = opts.rng || PL.rng(Date.now());
    this.wild = !!opts.wild;
    this.trainer = opts.trainer || null;
    this.relics = opts.relics || {};
    this.catchMult = opts.catchMult === undefined ? 1 : opts.catchMult;
    this.alwaysMega = !!opts.alwaysMega;
    this.nuzlockeLocked = !!opts.nuzlockeLocked;
    this.log = [];
    this.turn = 0;
    this.ended = false;
    this.winner = null;
    this.outcome = null;              // 'win' | 'loss' | 'caught' | 'fled'
    this.pending = null;              // Seite, die ein Pokémon nachschicken muss
    this.field = {
      weather: opts.weather || null, weatherTurns: opts.weather ? 8 : 0, weatherSource: null,
      terrain: opts.terrain || null, terrainTurns: opts.terrain ? 8 : 0,
      trickroom: 0, gravity: 0
    };
    this.sides = [makeSide(opts.teams[0], 0, true), makeSide(opts.teams[1], 1, false)];
    this.sides[0].other = this.sides[1];
    this.sides[1].other = this.sides[0];
    this.effects = PL.effects || { abilities: {}, items: {}, moves: {} };
  }

  function makeSide(team, id, isPlayer) {
    return {
      id: id,
      isPlayer: isPlayer,
      team: team,
      active: null,
      activeIndex: -1,
      hazards: { stealthrock: 0, spikes: 0, toxicspikes: 0, stickyweb: 0 },
      screens: { reflect: 0, lightscreen: 0, auroraveil: 0, safeguard: 0, mist: 0, tailwind: 0 },
      wish: null,
      megaUsed: 0,
      lastFainted: null,
      fainted: 0
    };
  }

  /** Laufzeitzustand eines Pokémon, das gerade im Kampf steht. */
  function makeActive(mon, side) {
    var sp = dex.sp(mon.sp);
    var a = {
      mon: mon,
      side: side,
      species: sp,
      types: sp.t.slice(),
      ability: PL.util.toID(mon.ab),
      abilityName: mon.ab,
      item: mon.item || null,
      boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      vol: {},
      stats: mons.stats(mon),
      turnsActive: 0,
      lastMove: null,
      lastMoveFailed: false,
      damagedThisTurn: 0,
      hurtBySource: null,
      protectStreak: 0,
      mega: false,
      switchedInThisTurn: true,
      itemUsed: false,
      illusion: null
    };
    return a;
  }

  /* ---------- 2) Werte und Zustände ---------------------------------------- */

  function boostMult(stage) {
    return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
  }
  function accMult(stage) {
    return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
  }

  var B = Battle.prototype;

  B.say = function (text, kind, data) {
    if (this.simulating) return null;
    var e = data || {};
    e.k = kind || 'text';
    e.s = text;
    this.log.push(e);
    return e;
  };

  B.name = function (act) {
    var n = mons.name(act.mon);
    return act.side.isPlayer ? n : (this.wild ? 'Wildes ' + n : 'Gegnerisches ' + n);
  };

  B.hasRelic = function (id) { return !!this.relics[id]; };

  /**
   * Zahlenwert einer Reliktwirkung. Die Relikttabelle bleibt damit die einzige
   * Wahrheit — die Engine fragt nach der Wirkung, nicht nach dem Namen.
   */
  B.relicMod = function (key) {
    var out = null, id, r;
    for (id in this.relics) {
      r = PL.relics && PL.relics.get(id);
      if (!r || !r.mods || r.mods[key] === undefined) continue;
      out = typeof r.mods[key] === 'number' ? (out || 0) + r.mods[key] : r.mods[key];
    }
    return out;
  };

  /** Alle Werte einer Wirkung — für Relikte, die mehrfach vorkommen können. */
  B.relicList = function (key) {
    var out = [], id, r;
    for (id in this.relics) {
      r = PL.relics && PL.relics.get(id);
      if (r && r.mods && r.mods[key] !== undefined) out.push(r.mods[key]);
    }
    return out;
  };

  /** Fähigkeit eines Pokémon, sofern sie nicht unterdrückt ist. */
  B.abilityOf = function (act) {
    if (act.vol.abilitysuppressed) return null;
    return this.effects.abilities[act.ability] || null;
  };
  B.abilityId = function (act) {
    return act.vol.abilitysuppressed ? '' : act.ability;
  };
  B.itemOf = function (act) {
    var ab = act && this.effects.abilities[this.abilityId(act)];
    if (ab && ab.itemDead) return null;
    if (!act.item || act.vol.itemsuppressed) return null;
    return this.effects.items[PL.util.toID(act.item)] || null;
  };

  /** Ruft einen Haken bei Fähigkeit und Item auf; das erste Ergebnis zählt. */
  B.hook = function (act, name, args, ignoreAbility) {
    var res, ab = ignoreAbility ? null : this.abilityOf(act), it = this.itemOf(act);
    if (ab && ab[name]) { res = ab[name].apply(null, [this, act].concat(args)); if (res !== undefined) return res; }
    if (it && it[name]) { res = it[name].apply(null, [this, act].concat(args)); if (res !== undefined) return res; }
    return undefined;
  };

  /** Multiplikator sammeln: alle Haken multiplizieren sich. */
  B.collect = function (act, name, args, ignoreAbility) {
    var m = 1, ab = ignoreAbility ? null : this.abilityOf(act), it = this.itemOf(act), r;
    if (ab && ab[name]) { r = ab[name].apply(null, [this, act].concat(args)); if (typeof r === 'number') m *= r; }
    if (it && it[name]) { r = it[name].apply(null, [this, act].concat(args)); if (typeof r === 'number') m *= r; }
    return m;
  };

  /** Effektive Werte inklusive Statusstufen, Status und Fähigkeiten. */
  B.statOf = function (act, stat, opts) {
    opts = opts || {};
    var i = PL.STATS.indexOf(stat), v = act.stats[i];
    var stage = act.boosts[stat] || 0;
    if (opts.ignoreBoosts) stage = 0;
    if (opts.ignoreNegative && stage < 0) stage = 0;
    if (opts.ignorePositive && stage > 0) stage = 0;
    v = Math.floor(v * boostMult(stage));
    if (stat === 'atk' && act.mon.status === 'brn' && this.abilityId(act) !== 'guts') v = Math.floor(v * 0.5);
    if (stat === 'spe' && act.mon.status === 'par' && this.abilityId(act) !== 'quickfeet') v = Math.floor(v * 0.5);
    v = Math.floor(v * this.collect(act, 'modStat', [stat, act]));
    var foe = act.side.other.active;
    if (foe && foe !== act && foe.mon.hp > 0) {
      var foeAb = this.abilityOf(foe);
      if (foeAb && foeAb.ruinStat === stat) v = Math.floor(v * 0.75);
    }
    if (act.side.isPlayer) {
      var full = this.relicMod('fullTeamStats');
      if (full && act.side.team.length >= 6) v = Math.floor(v * full);
    }
    if (stat === 'spe') {
      if (act.side.screens.tailwind > 0) v *= 2;
      v = Math.floor(v * this.collect(act, 'modSpeed', []));
    }
    return Math.max(1, v);
  };

  B.maxHP = function (act) { return act.stats[0]; };

  B.hpFraction = function (act) { return act.mon.hp / act.stats[0]; };

  /** Statusstufen ändern. Rückgabe: tatsächlich erreichte Stufen. */
  B.boost = function (act, boosts, source, silent) {
    if (this.simulating) return 0;
    var changed = 0, k, delta, before, after, self = (source === act);
    for (k in boosts) {
      if (!boosts.hasOwnProperty(k) || BOOSTABLE.indexOf(k) < 0) continue;
      delta = boosts[k];
      if (delta < 0 && !self) {
        if (this.hook(act, 'blockLower', [k, source])) {
          if (!silent) this.say(this.name(act) + ': ' + act.abilityName + ' verhindert die Senkung.', 'ability', { side: act.side.id });
          continue;
        }
        if (act.side.screens.mist > 0) continue;
        if (act.vol.substitute) continue;
        var flip = this.hook(act, 'onLowered', [k, delta, source]);
        if (flip) continue;
      }
      if (this.abilityId(act) === 'contrary') delta = -delta;
      else if (this.abilityId(act) === 'simple') delta *= 2;
      before = act.boosts[k];
      after = clamp(before + delta, -6, 6);
      if (after === before) {
        if (!silent) {
          this.say(this.name(act) + ': ' + T.stat(k === 'acc' ? 'acc' : k === 'eva' ? 'eva' : k) +
            (delta > 0 ? ' kann nicht weiter steigen.' : ' kann nicht weiter sinken.'), 'text');
        }
        continue;
      }
      act.boosts[k] = after;
      changed += Math.abs(after - before);
      if (delta < 0 && source !== act) act.vol.loweredThisTurn = true;
      if (!silent) {
        var word = describeBoost(after - before);
        this.say(this.name(act) + ': ' + statLabel(k) + ' ' + word, 'boost',
          { side: act.side.id, stat: k, delta: after - before });
      }
      if (delta < 0) this.hook(act, 'afterLowered', [k, after - before, source]);
    }
    return changed;
  };

  function statLabel(k) {
    if (k === 'acc') return 'Genauigkeit';
    if (k === 'eva') return 'Fluchtwert';
    return T.stat(k);
  }
  function describeBoost(d) {
    if (d >= 3) return 'steigt drastisch!';
    if (d === 2) return 'steigt stark!';
    if (d === 1) return 'steigt!';
    if (d === -1) return 'sinkt!';
    if (d === -2) return 'sinkt stark!';
    return 'sinkt drastisch!';
  }

  /* --- Status ------------------------------------------------------------- */

  var STATUS_IMMUNE_TYPE = { brn: 'Fire', frz: 'Ice', psn: 'Poison', tox: 'Poison', par: 'Electric' };

  B.canSetStatus = function (act, status, source, move) {
    if (act.mon.status) return false;
    if (act.mon.hp <= 0) return false;
    if (act.vol.substitute && source && source !== act) return false;
    var ty = STATUS_IMMUNE_TYPE[status];
    if (ty && act.types.indexOf(ty) >= 0) return false;
    if ((status === 'psn' || status === 'tox') && act.types.indexOf('Steel') >= 0) return false;
    if (status === 'par' && act.types.indexOf('Electric') >= 0) return false;
    if (act.side.screens.safeguard > 0 && source !== act) return false;
    if (this.field.terrain === 'mistyterrain' && this.grounded(act)) return false;
    if (status === 'slp' && this.field.terrain === 'electricterrain' && this.grounded(act)) return false;
    if (this.hook(act, 'blockStatus', [status, source, move])) return false;
    if ((status === 'psn' || status === 'tox') && source && this.abilityId(source) === 'corrosion') return true;
    return true;
  };

  B.setStatus = function (act, status, source, move, silent) {
    if (!this.canSetStatus(act, status, source, move)) return false;
    act.mon.status = status;
    if (status === 'slp') act.mon.slp = this.rng.range(1, 3);
    if (status === 'tox') act.vol.toxicTurns = 0;
    if (!silent) {
      var msg = {
        brn: ' erleidet Verbrennungen!', par: ' ist paralysiert!', psn: ' wurde vergiftet!',
        tox: ' wurde schwer vergiftet!', slp: ' schläft ein!', frz: ' erstarrt zu Eis!'
      }[status];
      this.say(this.name(act) + msg, 'status', { side: act.side.id, status: status });
    }
    this.hook(act, 'afterStatus', [status, source]);
    return true;
  };

  B.cureStatus = function (act, silent) {
    if (!act.mon.status) return false;
    var old = act.mon.status;
    act.mon.status = null;
    act.mon.slp = 0;
    if (!silent) this.say(this.name(act) + ': ' + T.status(old) + ' geheilt.', 'cure', { side: act.side.id });
    return true;
  };

  /* --- Schaden und Heilung ------------------------------------------------- */

  B.damage = function (act, amount, opts) {
    opts = opts || {};
    if (this.simulating) return 0;
    if (act.mon.hp <= 0 || amount <= 0) return 0;
    amount = Math.max(1, Math.floor(amount));
    if (act.vol.substitute && !opts.ignoreSub) {
      var sub = act.vol.substitute;
      sub.hp -= amount;
      if (sub.hp <= 0) {
        delete act.vol.substitute;
        this.say(this.name(act) + ': Der Delegator wurde zerstört.', 'subbreak', { side: act.side.id });
      } else {
        this.say('Der Delegator steckt den Treffer ein.', 'subhit', { side: act.side.id });
      }
      return 0;
    }
    if (amount >= act.mon.hp) {
      if (act.vol.endure) { amount = act.mon.hp - 1; }
      else if (this.abilityId(act) === 'sturdy' && act.mon.hp === act.stats[0] && !opts.trueDamage) {
        amount = act.mon.hp - 1;
        this.say(this.name(act) + ' hält mit Robustheit durch!', 'ability', { side: act.side.id });
      } else if (this.itemOf(act) && this.itemOf(act).endure && act.mon.hp === act.stats[0]) {
        amount = act.mon.hp - 1;
        this.say(this.name(act) + ' hält dank ' + act.item + ' durch!', 'item', { side: act.side.id });
        this.consumeItem(act);
      }
    }
    act.mon.hp = Math.max(0, act.mon.hp - amount);
    act.damagedThisTurn += amount;
    this.log.push({ k: 'damage', side: act.side.id, amount: amount, hp: act.mon.hp, max: act.stats[0], s: '' });
    return amount;
  };

  B.healAct = function (act, amount, silent, reason) {
    if (act.mon.hp <= 0 || this.simulating) return 0;
    if (act.vol.healblock) {
      if (!silent) this.say(this.name(act) + ' kann sich nicht heilen!', 'text', { side: act.side.id });
      return 0;
    }
    var max = act.stats[0], before = act.mon.hp;
    act.mon.hp = Math.min(max, act.mon.hp + Math.max(1, Math.floor(amount)));
    var got = act.mon.hp - before;
    if (got > 0 && !silent) {
      this.log.push({ k: 'heal', side: act.side.id, amount: got, hp: act.mon.hp, max: max,
        s: this.name(act) + ' erholt sich' + (reason ? ' (' + reason + ')' : '') + '.' });
    }
    return got;
  };

  /** Beere: Menge je nach Fähigkeit, danach Heilung durch Backentaschen. */
  B.berryAmount = function (act, amount) {
    var ab = this.effects.abilities[this.abilityId(act)];
    return (ab && ab.berryDouble) ? amount * 2 : amount;
  };

  /** Ab wann eine Notfallbeere anspricht — Munterkeit greift früher. */
  B.berryThreshold = function (act, normal) {
    var ab = this.effects.abilities[this.abilityId(act)];
    return (ab && ab.berryEarly) ? Math.max(normal, 0.5) : normal;
  };

  B.consumeItem = function (act) {
    if (!act.item || this.simulating) return;
    act.vol.lastItem = act.item;
    act.item = null;
    act.mon.item = null;
    act.itemUsed = true;
  };

  B.grounded = function (act) {
    if (this.field.gravity > 0) return true;
    if (act.vol.smackdown) return true;
    if (act.types.indexOf('Flying') >= 0) return false;
    if (this.abilityId(act) === 'levitate') return false;
    if (act.item === 'airballoon') return false;
    return true;
  };

  /* ---------- 3) Schadensrechnung ------------------------------------------ */

  /** Typenfaktor unter Berücksichtigung von Sonderregeln. */
  B.effectiveness = function (moveType, target, move, attacker) {
    var tarshot = (target && target.vol.tarshot && moveType === 'Fire') ? 2 : 1;
    var types = target.types, m = 1, k, e;
    for (k = 0; k < types.length; k++) {
      e = dex.raw.chart[moveType] ? dex.raw.chart[moveType][types[k]] : 1;
      if (e === undefined) e = 1;
      if (e === 0) {
        // Durchdringende Sonderfälle
        if (moveType === 'Ground' && types[k] === 'Flying' && move && move.ii) e = 1;
        else if (attacker && this.abilityId(attacker) === 'scrappy' && (types[k] === 'Ghost') &&
                 (moveType === 'Normal' || moveType === 'Fighting')) e = 1;
        else if (move && move.ii === 1) e = 1;
        else if (target.vol.foresight && types[k] === 'Ghost') e = 1;
      }
      m *= e;
    }
    m *= tarshot;
    if (m > 1 && this.abilityId(target) === 'wonderguard') return m;
    return m;
  };

  B.critStage = function (act, move) {
    var s = 0;
    if (move.cr) s += (move.cr - 1);
    if (act.vol.focusenergy) s += 2;
    if (act.vol.laserfocus) s += 3;                  // Zielschuss: sicherer Volltreffer
    if (this.abilityId(act) === 'superluck') s += 1;
    if (act.item === 'scopelens' || act.item === 'razorclaw') s += 1;
    if (act.side.isPlayer && this.relicMod('luck')) s += 1;
    return s;
  };

  var CRIT_CHANCE = [1 / 24, 1 / 8, 1 / 2, 1, 1];

  /**
   * Berechnet den Schaden einer Attacke.
   * Rückgabe { dmg, eff, crit, immune }
   */
  B.calcDamage = function (atk, def, move, opts) {
    opts = opts || {};
    var self = this;
    var moveType = opts.type || move.t;
    var ov = this.effects.moves[move.id] || {};
    if (ov.type) moveType = ov.type(this, atk, def, move) || moveType;
    moveType = this.hook(atk, 'modMoveType', [move, moveType]) || moveType;

    var eff = this.effectiveness(moveType, def, move, atk);
    if (eff === 0) return { dmg: 0, eff: 0, crit: false, immune: true, type: moveType };

    var bp = move.bp;
    if (ov.bp) bp = ov.bp(this, atk, def, move) || bp;
    // Erdbeben trifft einen Eingegrabenen doppelt, Surfer einen Abgetauchten.
    if (def.vol.invuln && TOUCHES[def.vol.invuln][move.id] === 2) bp *= 2;
    if (atk.vol.charge && moveType === 'Electric') bp *= 2;
    bp = Math.floor(bp * this.collect(atk, 'modBP', [move, def, moveType]));
    bp = Math.floor(bp * this.collect(def, 'modBPTaken', [move, atk, moveType]));
    if (this.abilityId(atk) === 'technician' && bp <= 60) bp = Math.floor(bp * 1.5);
    if (bp < 1) bp = 1;

    // Feldeffekte auf die Stärke
    if (this.field.terrain === 'electricterrain' && moveType === 'Electric' && this.grounded(atk)) bp = Math.floor(bp * 1.3);
    if (this.field.terrain === 'grassyterrain' && moveType === 'Grass' && this.grounded(atk)) bp = Math.floor(bp * 1.3);
    if (this.field.terrain === 'psychicterrain' && moveType === 'Psychic' && this.grounded(atk)) bp = Math.floor(bp * 1.3);
    if (this.field.terrain === 'mistyterrain' && moveType === 'Dragon' && this.grounded(def)) bp = Math.floor(bp * 0.5);
    if (this.field.terrain === 'grassyterrain' && (move.id === 'earthquake' || move.id === 'bulldoze') && this.grounded(def)) bp = Math.floor(bp * 0.5);

    var physical = move.c === 'P';
    var atkStat = physical ? 'atk' : 'spa';
    var defStat = physical ? 'def' : 'spd';
    if (move.oos) atkStat = move.oos;                       // Bodycheck nutzt Verteidigung
    if (move.ods) defStat = move.ods;                       // Psychoschock trifft Verteidigung

    var crit = false;
    if (!opts.noCrit) {
      var atkAb = this.effects.abilities[this.abilityId(atk)];
      if (move.wc) crit = true;
      else if (atkAb && atkAb.alwaysCrit && atkAb.alwaysCrit(this, atk, def)) crit = true;
      else if (this.abilityId(def) === 'battlearmor' || this.abilityId(def) === 'shellarmor') crit = false;
      else crit = this.rng.next() < CRIT_CHANCE[Math.min(4, this.critStage(atk, move))];
    }

    var ignoreDefBoost = this.abilityId(atk) === 'unaware';
    var ignoreAtkBoost = this.abilityId(def) === 'unaware';
    var source = (move.id === 'foulplay') ? def : atk;
    var A = this.statOf(source, atkStat, { ignoreNegative: crit, ignoreBoosts: ignoreAtkBoost && source !== atk });
    if (ignoreAtkBoost) A = this.statOf(source, atkStat, { ignoreBoosts: true });
    var D = this.statOf(def, defStat, { ignorePositive: crit || !!move.igd, ignoreBoosts: ignoreDefBoost });

    var level = atk.mon.lvl;
    var base = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * bp * A / D) / 50) + 2;

    var m = 1;
    // Wetter
    var w = this.weatherActive();
    if (w === 'sunnyday') m *= moveType === 'Fire' ? 1.5 : moveType === 'Water' ? 0.5 : 1;
    if (w === 'raindance') m *= moveType === 'Water' ? 1.5 : moveType === 'Fire' ? 0.5 : 1;
    if (crit) m *= 1.5;
    m *= 0.85 + this.rng.int(16) * 0.01;

    // STAB
    var stab = atk.types.indexOf(moveType) >= 0 ? 1.5 : 1;
    if (stab > 1 && this.abilityId(atk) === 'adaptability') stab = stab === 2 ? 2.25 : 2;
    m *= stab;

    m *= eff;

    if (atk.mon.status === 'brn' && physical && this.abilityId(atk) !== 'guts' && move.id !== 'facade') m *= 0.5;

    // Lichtschild / Reflektor
    if (!crit && this.abilityId(atk) !== 'infiltrator') {
      var sc = def.side.screens;
      if (sc.auroraveil > 0 || (physical && sc.reflect > 0) || (!physical && sc.lightscreen > 0)) m *= 0.5;
    }
    if (atk.side.isPlayer && this.relicList('typeBoost').indexOf(moveType) >= 0) m *= 1.3;
    if (eff > 1) m *= this.collect(def, 'modSuperEffective', [move, atk]);
    m *= this.collect(atk, 'modDamage', [move, def, eff, moveType]);
    m *= this.collect(def, 'modDamageTaken', [move, atk, eff, moveType]);
    if (ov.mod) m *= ov.mod(this, atk, def, move, eff);

    var dmg = Math.max(1, Math.floor(base * m));
    return { dmg: dmg, eff: eff, crit: crit, immune: false, type: moveType, bp: bp };
  };

  B.weatherActive = function () {
    if (!this.field.weather) return null;
    // Wolkenschleier und Trockenheit setzen das Wetter außer Kraft
    var a = this.sides[0].active, b = this.sides[1].active, id;
    for (var i = 0; i < 2; i++) {
      var act = i ? b : a;
      if (!act) continue;
      id = this.abilityId(act);
      if (id === 'cloudnine' || id === 'airlock') return null;
    }
    return this.field.weather;
  };

  /* ---------- 4) Attacken --------------------------------------------------- */

  var IMMOBILE_MSG = {
    slp: ' schläft tief und fest.',
    frz: ' ist eingefroren und kann sich nicht rühren.',
    par: ' ist paralysiert und kann sich nicht bewegen!'
  };

  /** Kann das Pokémon diese Runde überhaupt handeln? */
  /* ---------- Zwei-Runden-Attacken ------------------------------------------
   * Erst laden, dann schlagen. `hide` macht das Pokémon in der Ladephase
   * unangreifbar — nur die unter TOUCHES aufgeführten Attacken erwischen es
   * dort, und die meisten davon mit doppelter Wucht.
   * ------------------------------------------------------------------------ */

  var CHARGE = {
    razorwind:  { text: ' erzeugt einen Wirbelsturm!' },
    skullbash:  { text: ' zieht den Kopf ein!', boost: { def: 1 } },
    skyattack:  { text: ' hüllt sich in gleißendes Licht!' },
    solarbeam:  { text: ' sammelt Licht!', skip: 'sunnyday' },
    solarblade: { text: ' sammelt Licht!', skip: 'sunnyday' },
    freezeshock: { text: ' lädt sich elektrisch auf!' },
    iceburn:    { text: ' hüllt sich in eisige Kälte!' },
    meteorbeam: { text: ' sammelt Weltraumkraft!', boost: { spa: 1 } },
    electroshot: { text: ' sammelt Elektrizität!', boost: { spa: 1 }, skip: 'raindance' },
    geomancy:   { text: ' sammelt Energie!' },
    fly:         { text: ' fliegt hoch hinauf!', hide: 'air' },
    bounce:      { text: ' springt hoch hinauf!', hide: 'air' },
    dig:         { text: ' gräbt sich ein!', hide: 'under' },
    dive:        { text: ' taucht ab!', hide: 'water' },
    phantomforce: { text: ' verschwindet!', hide: 'gone' },
    shadowforce:  { text: ' verschwindet!', hide: 'gone' }
  };

  // Was ein unangreifbares Ziel trotzdem trifft — und ob mit doppelter Wucht.
  var TOUCHES = {
    air:   { gust: 2, twister: 2, thunder: 1, hurricane: 1, skyuppercut: 1, smackdown: 1, thousandarrows: 1 },
    under: { earthquake: 2, magnitude: 2, fissure: 1 },
    water: { surf: 2, whirlpool: 2 },
    gone:  {}
  };

  /* ---------- Schutzschilde --------------------------------------------------
   * Alle Spielarten laufen über dieselbe Mechanik; sie unterscheiden sich nur
   * darin, was dem Angreifer danach zustößt und ob Statusattacken durchkommen.
   * ------------------------------------------------------------------------ */

  var SHIELDS = {
    protect: {},
    detect: {},
    spikyshield:   { contact: true, chip: 8 },
    banefulbunker: { contact: true, status: 'psn' },
    burningbulwark: { contact: true, status: 'brn' },
    kingsshield:   { contact: true, boosts: { atk: -1 }, damagingOnly: true },
    obstruct:      { contact: true, boosts: { def: -2 }, damagingOnly: true },
    silktrap:      { contact: true, boosts: { spe: -1 }, damagingOnly: true }
  };

  B.canAct = function (act, move) {
    if (act.mon.hp <= 0) return false;
    if (act.vol.flinch) {
      this.say(this.name(act) + ' zuckt zurück!', 'flinch', { side: act.side.id });
      this.hook(act, 'onFlinch', []);
      return false;
    }
    if (act.vol.mustrecharge) {
      delete act.vol.mustrecharge;
      this.say(this.name(act) + ' muss sich erholen.', 'text', { side: act.side.id });
      return false;
    }
    if (act.mon.status === 'slp') {
      var ab = this.abilityOf(act);
      if (act.mon.slp > 0) act.mon.slp -= (ab && ab.sleepSpeed) || 1;
      if (act.mon.slp <= 0) {
        this.cureStatus(act);
        this.say(this.name(act) + ' wacht auf!', 'text', { side: act.side.id });
      } else {
        this.say(this.name(act) + IMMOBILE_MSG.slp, 'text', { side: act.side.id });
        return !!(move && move.slp);
      }
    }
    if (act.mon.status === 'frz') {
      if (this.rng.chance(0.2) || (move && move.thaw)) {
        this.cureStatus(act);
        this.say(this.name(act) + ' taut auf!', 'text', { side: act.side.id });
      } else {
        this.say(this.name(act) + IMMOBILE_MSG.frz, 'text', { side: act.side.id });
        return false;
      }
    }
    if (act.vol.attract) {
      var lover = act.side.other.active;
      this.say(this.name(act) + ' ist verliebt in ' + (lover ? this.name(lover) : 'den Gegner') + '!',
        'text', { side: act.side.id });
      if (this.rng.chance(0.5)) {
        this.say(this.name(act) + ' ist zu verliebt zum Kämpfen!', 'text', { side: act.side.id });
        return false;
      }
    }
    if (act.mon.status === 'par' && this.rng.chance(0.25)) {
      this.say(this.name(act) + IMMOBILE_MSG.par, 'text', { side: act.side.id });
      return false;
    }
    if (act.vol.confusion) {
      act.vol.confusion.turns--;
      if (act.vol.confusion.turns <= 0) {
        delete act.vol.confusion;
        this.say(this.name(act) + ' ist nicht mehr verwirrt.', 'text', { side: act.side.id });
      } else {
        this.say(this.name(act) + ' ist verwirrt!', 'text', { side: act.side.id });
        if (this.rng.chance(1 / 3)) {
          var lvl = act.mon.lvl;
          var A = this.statOf(act, 'atk'), D = this.statOf(act, 'def');
          var dmg = Math.floor(Math.floor(Math.floor(2 * lvl / 5 + 2) * 40 * A / D) / 50) + 2;
          this.say(this.name(act) + ' verletzt sich in seiner Verwirrung!', 'text', { side: act.side.id });
          this.damage(act, Math.floor(dmg * (0.85 + this.rng.int(16) * 0.01)), { ignoreSub: true });
          return false;
        }
      }
    }
    return true;
  };

  /** Trefferwahrscheinlichkeit und Wurf. */
  B.accuracyCheck = function (atk, def, move) {
    if (move.ac === 0) return true;
    if (atk.side.isPlayer && move.c === 'T' && this.relicMod('statusNeverMiss')) return true;
    if (this.abilityId(atk) === 'noguard' || this.abilityId(def) === 'noguard') return true;
    var acc = move.ac;
    acc = acc * this.collect(atk, 'modAccuracy', [move, def]);
    acc = acc * this.collect(def, 'modAccuracyTaken', [move, atk]);
    var stage = (atk.boosts.acc || 0) - (move.ige ? 0 : (def.boosts.eva || 0));
    if (this.abilityId(atk) === 'unaware') stage = atk.boosts.acc || 0;
    acc = acc * accMult(clamp(stage, -6, 6));
    var w = this.weatherActive();
    if (w === 'raindance' && (move.id === 'thunder' || move.id === 'hurricane')) return true;
    if (w === 'sunnyday' && (move.id === 'thunder' || move.id === 'hurricane')) acc = 50;
    if (w === 'sandstorm' && this.abilityId(def) === 'sandveil') acc *= 0.8;
    if (w === 'snowscape' && this.abilityId(def) === 'snowcloak') acc *= 0.8;
    return this.rng.next() * 100 < acc;
  };

  function hitsFor(bt, move, act) {
    if (!move.mh) return 1;
    if (typeof move.mh === 'number') return move.mh;
    var id = bt.abilityId(act);
    if (id === 'skilllink' || act.item === 'loadeddice') return move.mh[1];
    var r = bt.rng.next();
    if (move.mh[0] === 2 && move.mh[1] === 5) return r < 0.35 ? 2 : r < 0.70 ? 3 : r < 0.85 ? 4 : 5;
    return bt.rng.range(move.mh[0], move.mh[1]);
  }

  /** Zielauswahl im Einzelkampf. */
  B.targetFor = function (actor, move) {
    if (move.tg === 'self' || move.tg === 'adjacentAllyOrSelf') return actor;
    return actor.side.other.active;
  };

  /**
   * Führt eine Attacke aus. slot ist der Index im Attackenspeicher, oder
   * ein Objekt { move: Attacke, free: true } für erzwungene Aktionen.
   */
  B.useMove = function (actor, slot, opts) {
    opts = opts || {};
    var self = this, entry = null, move, struggle = false;
    if (slot === -1) {
      move = dex.move('struggle');
      struggle = true;
    } else if (typeof slot === 'number') {
      entry = actor.mon.moves[slot];
      move = entry && dex.move(entry.m);
    } else {
      move = slot.move;
    }
    if (!move) return;
    actor.movedThisTurn = true;

    // Erzwungene Wiederholung (Wutanfall, Zugabe)
    if (actor.vol.lockedmove && !opts.locked) {
      move = dex.move(actor.vol.lockedmove.move);
      entry = actor.mon.moves.filter(function (m) { return m.m === move.i; })[0] || entry;
    }

    // Eine geladene Attacke wird in der zweiten Runde erzwungen.
    if (actor.vol.twoturn && !opts.locked) {
      move = dex.move(actor.vol.twoturn.move);
      entry = actor.mon.moves.filter(function (m) { return m.m === move.i; })[0] || entry;
    }

    // opts.forced: die Attacke wurde von einer anderen aufgerufen (Schlafrede,
    // Metronom). Schlaf und Verwirrung dürfen dann nicht ein zweites Mal
    // geprüft werden — sonst zählte der Schlaf doppelt herunter.
    if (!opts.forced && !this.canAct(actor, move)) {
      // Wer in der Ladephase ausfällt, verliert sie samt Deckung.
      if (actor.vol.twoturn) { delete actor.vol.twoturn; delete actor.vol.invuln; }
      actor.lastMoveFailed = true;
      return;
    }

    var ov = this.effects.moves[move.id] || {};
    var target = this.targetFor(actor, move);

    // In der Ausführungsrunde kostet eine geladene Attacke keine AP mehr —
    // die sind schon beim Aufladen abgezogen worden.
    var releasing = !!(actor.vol.twoturn && actor.vol.twoturn.move === move.i);
    if (entry && !opts.free && !actor.vol.lockedmove && !releasing) {
      if (entry.pp <= 0) {
        this.say(this.name(actor) + ' hat keine AP mehr für ' + move.n + '!', 'text', { side: actor.side.id });
        return;
      }
      entry.pp--;
      entry.used = (entry.used || 0) + 1;
      if (target && target.mon.hp > 0 && this.abilityId(target) === 'pressure' && move.tg !== 'self') {
        entry.pp = Math.max(0, entry.pp - 1);
      }
    }

    actor.lastMove = move.i;

    // Erste Runde einer Zwei-Runden-Attacke: laden statt schlagen.
    if (CHARGE[move.id] && !actor.vol.twoturn) {
      if (this.beginCharge(actor, move)) return;
    }
    if (actor.vol.twoturn && actor.vol.twoturn.move === move.i) {
      delete actor.vol.twoturn;
      delete actor.vol.invuln;
    }

    this.say(this.name(actor) + ' setzt ' + move.n + ' ein!', 'move',
      { side: actor.side.id, move: move.i, type: move.t, cat: move.c });

    if (ov.beforeMove && ov.beforeMove(this, actor, target, move) === false) {
      actor.lastMoveFailed = true;
      return;
    }

    // Schutzschild
    if (target && target !== actor && this.shieldBlocks(target, move)) {
      this.say(this.name(target) + ' schützt sich!', 'protect', { side: target.side.id });
      actor.lastMoveFailed = true;
      this.shieldPunish(target, actor, move);
      if (move.crash) this.damage(actor, Math.floor(this.maxHP(actor) / 2), { ignoreSub: true });
      return;
    }

    // Ein abgetauchtes oder hochgeflogenes Ziel ist meist nicht zu erwischen.
    if (target && target !== actor && target.vol.invuln && !TOUCHES[target.vol.invuln][move.id]) {
      this.say(this.name(actor) + ' verfehlt — ' + this.name(target) + ' ist nicht zu fassen!',
        'miss', { side: actor.side.id });
      actor.lastMoveFailed = true;
      if (move.crash) this.damage(actor, Math.floor(this.maxHP(actor) / 2), { ignoreSub: true });
      return;
    }

    // Fähigkeiten, die eine ganze Attackenart abwehren
    if (target && target !== actor) {
      var blocked = this.hook(target, 'blockMove', [move, actor]);
      if (blocked) { actor.lastMoveFailed = true; return; }
    }

    if (move.c === 'T') {
      this.executeStatus(actor, target, move, ov);
      return;
    }

    // --- Schadensattacke ---
    if (target && this.effectiveness(ov.type ? (ov.type(this, actor, target, move) || move.t) : move.t, target, move, actor) === 0) {
      this.say('Es hat keine Wirkung auf ' + this.name(target) + '…', 'immune', { side: target.side.id });
      actor.lastMoveFailed = true;
      return;
    }
    if (!target || target.mon.hp <= 0) {
      this.say('Die Attacke geht ins Leere!', 'text', {});
      actor.lastMoveFailed = true;
      return;
    }
    if (!this.accuracyCheck(actor, target, move)) {
      this.say(this.name(actor) + ' verfehlt!', 'miss', { side: actor.side.id });
      actor.lastMoveFailed = true;
      if (move.crash) {
        this.say(this.name(actor) + ' bruchlandet!', 'text', { side: actor.side.id });
        this.damage(actor, Math.floor(this.maxHP(actor) / 2), { ignoreSub: true });
      }
      return;
    }

    var hits = hitsFor(this, move, actor), total = 0, result = null, h;
    for (h = 0; h < hits; h++) {
      if (target.mon.hp <= 0 || actor.mon.hp <= 0) break;
      if (move.dmg) {
        result = { dmg: move.dmg === 'level' ? actor.mon.lvl : move.dmg, eff: 1, crit: false, type: move.t };
      } else if (ov.fixed) {
        result = { dmg: ov.fixed(this, actor, target, move), eff: 1, crit: false, type: move.t };
      } else {
        result = this.calcDamage(actor, target, move);
      }
      if (result.immune) break;
      var dealt = this.damage(target, result.dmg);
      total += dealt;
      if (result.crit && dealt) this.say('Ein Volltreffer!', 'crit', { side: target.side.id });
      if (h === 0 && dealt) {
        if (result.eff > 1) this.say('Das ist sehr effektiv!', 'super', { side: target.side.id });
        else if (result.eff < 1 && result.eff > 0) this.say('Das ist nicht sehr effektiv…', 'resist', { side: target.side.id });
      }
      if (dealt) {
        target.hurtBySource = actor;
        target.vol.hitCount = (target.vol.hitCount || 0) + 1;
        if (result.crit) target.vol.gotCrit = true;
        if (move.c === 'P') target.vol.lastPhysicalHit = (target.vol.lastPhysicalHit || 0) + dealt;
        else if (move.c === 'S') target.vol.lastSpecialHit = (target.vol.lastSpecialHit || 0) + dealt;
        // Berührungseffekte des Ziels
        if (move.fl && move.fl.indexOf('contact') >= 0) {
          this.hook(target, 'onContact', [actor, move, dealt]);
        }
        this.hook(target, 'onHitTaken', [actor, move, dealt, result.eff]);
        this.hook(actor, 'onDealtDamage', [target, move, dealt]);
      }
      if (target.mon.hp <= 0) break;
    }
    if (hits > 1) this.say('Getroffen: ' + Math.min(h + 1, hits) + '×', 'text', {});

    if (ov.onHit) ov.onHit(this, actor, target, move, total);

    // Absorption, Rückstoß
    if (move.dr && total > 0) {
      var drain = Math.max(1, Math.floor(total * move.dr[0] / move.dr[1]));
      if (this.abilityId(target) === 'liquidooze') {
        this.say(this.name(actor) + ' erleidet Schaden durch Ölschleim!', 'text', { side: actor.side.id });
        this.damage(actor, drain, { ignoreSub: true });
      } else {
        this.healAct(actor, drain, false, 'Absorption');
      }
    }
    if (move.rc && total > 0 && this.abilityId(actor) !== 'rockhead' && this.abilityId(actor) !== 'magicguard') {
      this.say(this.name(actor) + ' nimmt Rückstoßschaden.', 'text', { side: actor.side.id });
      this.damage(actor, Math.max(1, Math.floor(total * move.rc[0] / move.rc[1])), { ignoreSub: true });
    }
    if (struggle) {
      this.say(this.name(actor) + ' verletzt sich beim Verzweifler.', 'text', { side: actor.side.id });
      this.damage(actor, Math.floor(this.maxHP(actor) / 4), { ignoreSub: true, trueDamage: true });
    }
    if (move.mbr && this.abilityId(actor) !== 'magicguard') {
      this.damage(actor, Math.floor(this.maxHP(actor) / 2), { ignoreSub: true });
    }

    // Zusatzeffekte
    if (total > 0 || move.bp === 0) this.applySecondaries(actor, target, move);
    if (move.slf) this.applySelfEffects(actor, move);
    if (move.fl && move.fl.indexOf('recharge') >= 0) actor.vol.mustrecharge = true;
    if (move.vs === 'lockedmove') {
      if (!actor.vol.lockedmove) actor.vol.lockedmove = { move: move.i, turns: this.rng.range(2, 3) };
      actor.vol.lockedmove.turns--;
      if (actor.vol.lockedmove.turns <= 0) {
        delete actor.vol.lockedmove;
        this.say(this.name(actor) + ' ist erschöpft und wird verwirrt!', 'text', { side: actor.side.id });
        this.addVolatile(actor, 'confusion', actor);
      }
    }
    this.lockChoice(actor, entry);
    this.hook(actor, 'afterMove', [move, target, total]);

    if (move.ss && total > 0 && this.hasBackup(actor.side)) actor.side.pendingSelfSwitch = true;
    if (move.fs && total >= 0 && target.mon.hp > 0) this.forceOut(target);
    this.checkFaints();
  };

  /** Statusattacken und Feldeffekte. */
  B.executeStatus = function (actor, target, move, ov) {
    var self = this, ok = false;

    if (target && target !== actor && move.ac !== 0 && !this.accuracyCheck(actor, target, move)) {
      this.say(this.name(actor) + ' verfehlt!', 'miss', { side: actor.side.id });
      return;
    }
    if (target && target !== actor && this.abilityId(target) === 'magicbounce' && move.fl && move.fl.indexOf('reflectable') >= 0) {
      this.say(this.name(target) + ' wirft die Attacke zurück!', 'ability', { side: target.side.id });
      target = actor;
    }

    if (ov.onHit) { ov.onHit(this, actor, target, move, 0); ok = true; }

    if (move.w) ok = this.setWeather(move.w, actor) || ok;
    if (move.tr) ok = this.setTerrain(move.tr, actor) || ok;
    if (move.pw === 'trickroom') {
      this.field.trickroom = this.field.trickroom > 0 ? 0 : 5;
      this.say('Die Dimensionen verdrehen sich!', 'field', {});
      ok = true;
    }
    if (move.sc) {
      var side = (move.tg === 'foeSide') ? actor.side.other : actor.side;
      ok = this.addSideCondition(side, move.sc, actor) || ok;
    }
    if (move.slc === 'wish') {
      actor.side.wish = { turns: 2, hp: Math.floor(this.maxHP(actor) / 2) };
      this.say(this.name(actor) + ' wünscht sich Hilfe herbei.', 'text', { side: actor.side.id });
      ok = true;
    }
    if (move.hl) {
      var amount = Math.floor(this.maxHP(actor) * move.hl[0] / move.hl[1]);
      var w = this.weatherActive();
      if (/moonlight|synthesis|morningsun/.test(move.id)) {
        amount = w === 'sunnyday' ? Math.floor(this.maxHP(actor) * 2 / 3)
          : (w && w !== 'sunnyday') ? Math.floor(this.maxHP(actor) / 4) : Math.floor(this.maxHP(actor) / 2);
      }
      if (actor.mon.hp >= this.maxHP(actor)) {
        this.say('Es klappt nicht — die KP sind bereits voll.', 'text', { side: actor.side.id });
      } else {
        this.healAct(actor, amount, false, move.n);
        ok = true;
      }
    }
    if (move.st && target) {
      if (this.setStatus(target, move.st, actor, move)) ok = true;
      else if (target.mon.status) this.say('Es klappt nicht.', 'text', {});
    }
    if (move.vs && target) ok = this.addVolatile(target, move.vs, actor, move) || ok;
    if (move.bo && target) ok = (this.boost(target, move.bo, actor) > 0) || ok;
    if (move.slf) { this.applySelfEffects(actor, move); ok = true; }
    if (move.fs && target && target.mon.hp > 0) { this.forceOut(target); ok = true; }
    if (move.ss && this.hasBackup(actor.side)) { actor.side.pendingSelfSwitch = true; ok = true; }

    if (!ok) this.say('Es ist nichts passiert.', 'text', {});
    this.lockChoice(actor, null);
    this.hook(actor, 'afterMove', [move, target, 0]);
    this.checkFaints();
  };

  B.applySecondaries = function (actor, target, move) {
    if (!move.sec || !move.sec.length) return;
    if (this.abilityId(actor) === 'sheerforce') return;
    var serene = this.abilityId(actor) === 'serenegrace' ? 2 : 1, i, s;
    if (actor.side.isPlayer && this.relicMod('luck')) serene *= 1.3;
    for (i = 0; i < move.sec.length; i++) {
      s = move.sec[i];
      var chance = Math.min(100, (s.c || 100) * serene);
      if (this.rng.next() * 100 >= chance) continue;
      var tgt = s.self ? actor : target;
      if (tgt !== actor && !s.dp) {
        if (this.abilityId(tgt) === 'shielddust') continue;
        var tgtItem = this.itemOf(tgt);
        if (tgtItem && tgtItem.blockSecondary) continue;
      }
      if (tgt.mon.hp <= 0) continue;
      if (s.st) this.setStatus(tgt, s.st, actor, move);
      if (s.vs) this.addVolatile(tgt, s.vs, actor, move);
      if (s.bo) this.boost(tgt, s.bo, actor);
      if (s.self) this.boost(actor, s.self, actor);
    }
  };

  B.applySelfEffects = function (actor, move) {
    if (!move.slf) return;
    if (move.slf.bo) this.boost(actor, move.slf.bo, actor);
    if (move.slf.vs) this.addVolatile(actor, move.slf.vs, actor, move);
  };

  /* --- Flüchtige Zustände --------------------------------------------------- */

  var VOLATILE_TEXT = {
    confusion: ' ist jetzt verwirrt!',
    flinch: '',
    leechseed: ' wurde mit Egelsamen bepflanzt!',
    taunt: ' kann nur noch angreifen!',
    focusenergy: ' konzentriert sich.',
    endure: ' macht sich bereit durchzuhalten.',
    destinybond: ' will den Gegner mit sich reißen!',
    partiallytrapped: ' sitzt in der Falle!',
    curse: ' wurde verflucht!',
    yawn: ' wird müde…',
    aquaring: ' hüllt sich in einen Wasserring.',
    substitute: ' erschafft einen Delegator!',
    protect: '',
    saltcure: ' wurde eingesalzen!',
    attract: ' hat sich verliebt!',
    torment: ' darf sich nicht wiederholen!',
    healblock: ' kann sich nicht mehr heilen!',
    nightmare: ' wird von einem Albtraum geplagt!',
    octolock: ' sitzt im Klammergriff fest!',
    laserfocus: ' ist hochkonzentriert!',
    charge: ' lädt sich auf!',
    smackdown: ' wurde zu Boden geholt!',
    tarshot: ' ist mit Teer überzogen!'
  };

  /**
   * Erste Runde einer Zwei-Runden-Attacke. Gibt true zurück, wenn nur
   * geladen wurde — dann ist der Zug vorbei.
   */
  B.beginCharge = function (actor, move) {
    var spec = CHARGE[move.id];
    // Sonne, Regen oder die Kraftherbe sparen die Ladephase.
    if (spec.skip && this.weatherActive() === spec.skip) return false;
    if (this.itemOf(actor) && actor.item === 'powerherb') {
      this.say(this.name(actor) + ' lädt dank Kraftherb sofort auf!', 'item', { side: actor.side.id });
      this.consumeItem(actor);
      return false;
    }
    this.say(this.name(actor) + spec.text, 'charge', { side: actor.side.id, move: move.i });
    if (spec.boost) this.boost(actor, spec.boost, actor);
    actor.vol.twoturn = { move: move.i };
    if (spec.hide) actor.vol.invuln = spec.hide;
    this.hook(actor, 'afterMove', [move, null, 0]);
    return true;
  };

  /** Fängt der Schild diese Attacke ab? */
  B.shieldBlocks = function (target, move) {
    var kind = target.vol.protect;
    if (!kind) return false;
    if (move.bpr) return false;                       // durchbricht Schilde
    if (!move.fl || move.fl.indexOf('protect') < 0) return false;
    var atk = target.side.other.active;
    var atkAb = atk && this.effects.abilities[this.abilityId(atk)];
    if (atkAb && atkAb.ignoresProtect && move.fl.indexOf(atkAb.ignoresProtect) >= 0) return false;
    var spec = SHIELDS[kind] || SHIELDS.protect;
    if (spec.damagingOnly && move.c === 'T') return false;
    return true;
  };

  /** Was dem Angreifer nach einem geblockten Treffer zustößt. */
  B.shieldPunish = function (target, actor, move) {
    var spec = SHIELDS[target.vol.protect];
    if (!spec || !actor || actor.mon.hp <= 0) return;
    var contact = move.fl && move.fl.indexOf('contact') >= 0;
    if (spec.contact && !contact) return;
    if (spec.chip && this.abilityId(actor) !== 'magicguard') {
      this.damage(actor, Math.max(1, Math.floor(this.maxHP(actor) / spec.chip)), { ignoreSub: true });
    }
    if (spec.status) this.setStatus(actor, spec.status, target, move);
    if (spec.boosts) this.boost(actor, spec.boosts, target);
  };

  B.addVolatile = function (act, id, source, move) {
    if (!act || act.mon.hp <= 0) return false;
    if (SHIELDS[id]) {
      // Schutzschilde werden bei Wiederholung unzuverlässig
      var chance = 1 / Math.pow(3, act.protectStreak);
      if (act.protectStreak > 0 && !this.rng.chance(chance)) {
        this.say(this.name(act) + ': Es klappt nicht mehr!', 'text', { side: act.side.id });
        act.protectStreak = 0;
        return false;
      }
      act.vol.protect = id;
      act.protectStreak++;
      this.say(this.name(act) + ' schützt sich!', 'protect', { side: act.side.id });
      return true;
    }
    if (act.vol[id]) return false;
    switch (id) {
      case 'confusion':
        if (this.hook(act, 'blockConfusion', [source])) return false;
        if (this.field.terrain === 'mistyterrain' && this.grounded(act)) return false;
        act.vol.confusion = { turns: this.rng.range(2, 5) };
        break;
      case 'substitute':
        var cost = Math.floor(this.maxHP(act) / 4);
        if (act.mon.hp <= cost) { this.say('Es sind zu wenig KP übrig.', 'text', {}); return false; }
        this.damage(act, cost, { ignoreSub: true, trueDamage: true });
        act.vol.substitute = { hp: cost };
        break;
      case 'leechseed':
        if (act.types.indexOf('Grass') >= 0) { this.say('Es hat keine Wirkung…', 'text', {}); return false; }
        act.vol.leechseed = { source: source.side.id };
        break;
      case 'partiallytrapped':
        act.vol.partiallytrapped = { turns: this.rng.range(4, 5) };
        break;
      case 'taunt': act.vol.taunt = { turns: 3 }; break;
      case 'encore':
        if (!act.lastMove) return false;
        act.vol.encore = { move: act.lastMove, turns: 3 };
        break;
      case 'disable':
        if (!act.lastMove) return false;
        act.vol.disable = { move: act.lastMove, turns: 4 };
        break;
      case 'yawn': act.vol.yawn = { turns: 2 }; break;
      case 'curse':
        act.vol.curse = true;
        break;
      case 'flinch':
        act.vol.flinch = true;
        break;
      case 'attract':
        if (!source || !act.mon.gender || !source.mon.gender ||
            act.mon.gender === source.mon.gender || act.mon.gender === 'N') {
          this.say('Es klappt nicht.', 'text', {});
          return false;
        }
        act.vol.attract = true;
        break;
      case 'torment': act.vol.torment = true; break;
      case 'healblock': act.vol.healblock = { turns: 5 }; break;
      case 'nightmare':
        if (act.mon.status !== 'slp') { this.say('Es klappt nur im Schlaf.', 'text', {}); return false; }
        act.vol.nightmare = true;
        break;
      case 'octolock': act.vol.octolock = true; act.vol.trapped = true; break;
      case 'laserfocus': act.vol.laserfocus = 2; break;
      case 'charge': act.vol.charge = 2; break;
      case 'smackdown': act.vol.smackdown = true; break;
      case 'tarshot': act.vol.tarshot = true; break;
      case 'lockedmove':
        return false;   // wird in useMove behandelt
      default:
        act.vol[id] = true;
    }
    if (VOLATILE_TEXT[id]) this.say(this.name(act) + VOLATILE_TEXT[id], 'volatile', { side: act.side.id, vol: id });
    return true;
  };

  /* --- Wetter, Feld, Seiteneffekte ------------------------------------------ */

  var WEATHER_TEXT = {
    sunnyday: 'Das Sonnenlicht wird stärker!', raindance: 'Es fängt an zu regnen!',
    sandstorm: 'Ein Sandsturm kommt auf!', snowscape: 'Es fängt an zu schneien!',
    hail: 'Es hagelt!'
  };
  var TERRAIN_TEXT = {
    electricterrain: 'Elektrizität knistert über dem Boden!',
    grassyterrain: 'Gras breitet sich über dem Boden aus!',
    mistyterrain: 'Nebel wabert über dem Boden!',
    psychicterrain: 'Der Boden wird seltsam!'
  };

  B.setWeather = function (w, source) {
    if (this.field.weather === w) { this.say('Es ändert sich nichts.', 'text', {}); return false; }
    this.field.weather = w;
    this.field.weatherTurns = (source && source.item === 'damprock' && w === 'raindance') ? 8
      : (source && source.item === 'heatrock' && w === 'sunnyday') ? 8 : 5;
    this.say(WEATHER_TEXT[w] || 'Das Wetter ändert sich.', 'weather', { weather: w });
    return true;
  };

  B.setTerrain = function (tr, source) {
    if (this.field.terrain === tr) return false;
    this.field.terrain = tr;
    this.field.terrainTurns = (source && source.item === 'terrainextender') ? 8 : 5;
    this.say(TERRAIN_TEXT[tr] || 'Das Feld verändert sich.', 'field', { terrain: tr });
    return true;
  };

  var SIDE_TEXT = {
    stealthrock: 'Spitze Steine schweben um das gegnerische Team!',
    spikes: 'Stacheln liegen am Boden!',
    toxicspikes: 'Giftspitzen liegen am Boden!',
    stickyweb: 'Ein klebriges Netz spannt sich auf!',
    reflect: 'Ein Reflektor entsteht!',
    lightscreen: 'Ein Lichtschild entsteht!',
    auroraveil: 'Ein Auroraschleier legt sich über das Team!',
    safeguard: 'Ein Bollwerk schützt das Team!',
    mist: 'Weißnebel schützt vor Wertsenkungen!',
    tailwind: 'Rückenwind kommt auf!'
  };

  B.addSideCondition = function (side, id, source) {
    if (id === 'stealthrock' || id === 'stickyweb') {
      if (side.hazards[id]) return false;
      side.hazards[id] = 1;
    } else if (id === 'spikes') {
      if (side.hazards.spikes >= 3) return false;
      side.hazards.spikes++;
    } else if (id === 'toxicspikes') {
      if (side.hazards.toxicspikes >= 2) return false;
      side.hazards.toxicspikes++;
    } else if (side.screens[id] !== undefined) {
      if (side.screens[id] > 0) return false;
      side.screens[id] = (source && source.item === 'lightclay' && /reflect|lightscreen|auroraveil/.test(id)) ? 8 : 5;
    } else return false;
    this.say(SIDE_TEXT[id] || 'Ein Effekt legt sich über das Feld.', 'side', { side: side.id, cond: id });
    return true;
  };

  /* ---------- 5) Rundenablauf ----------------------------------------------- */

  B.hasBackup = function (side) {
    return side.team.some(function (m, i) { return m.hp > 0 && i !== side.activeIndex; });
  };

  B.switchIn = function (side, index, silent) {
    var mon = side.team[index];
    if (!mon || mon.hp <= 0) return false;
    if (side.active) {
      this.hook(side.active, 'onSwitchOut', []);
      if (this.abilityId(side.active) === 'regenerator' && side.active.mon.hp > 0) {
        side.active.mon.hp = Math.min(side.active.stats[0],
          side.active.mon.hp + Math.floor(side.active.stats[0] / 3));
      }
      if (this.abilityId(side.active) === 'naturalcure') side.active.mon.status = null;
      side.active.mon.item = side.active.item;   // Itemverlust im Kampf festhalten
    }
    side.activeIndex = index;
    side.active = makeActive(mon, side);
    side.used = side.used || {};
    side.used[index] = true;
    // Schickt der Gegner mitten im Kampf jemanden nach — freiwillig oder nach
    // einem K. o. —, gehört die nächste Runde dem Spieler.
    if (!side.isPlayer && this.turn > 0) this.playerFirstNextTurn = true;
    if (!silent) {
      this.say((side.isPlayer ? 'Los, ' : (this.wild ? 'Ein wildes ' : 'Der Gegner schickt ')) +
        mons.name(mon) + (side.isPlayer ? '!' : (this.wild ? ' erscheint!' : ' in den Kampf!')),
        'switchin', { side: side.id, mon: index });
    }
    this.applyHazards(side.active);
    if (side.active.mon.hp > 0) this.onSwitchInEffects(side.active);
    return true;
  };

  B.applyHazards = function (act) {
    var h = act.side.hazards, max = this.stats0(act);
    if (act.item === 'heavydutyboots') return;
    if (act.side.isPlayer && this.relicMod('hazardImmune')) return;
    if (h.stealthrock) {
      var e = this.effectiveness('Rock', act, null, null);
      var dmg = Math.floor(max * e / 8);
      if (dmg > 0) {
        this.say(this.name(act) + ' wird von spitzen Steinen getroffen!', 'text', { side: act.side.id });
        this.damage(act, dmg, { ignoreSub: true });
      }
    }
    if (act.mon.hp <= 0 || !this.grounded(act)) return;
    if (h.spikes) {
      this.say(this.name(act) + ' tritt in Stacheln!', 'text', { side: act.side.id });
      this.damage(act, Math.floor(max / (10 - h.spikes * 2)), { ignoreSub: true });
    }
    if (h.toxicspikes) {
      if (act.types.indexOf('Poison') >= 0) {
        h.toxicspikes = 0;
        this.say(this.name(act) + ' saugt die Giftspitzen auf!', 'text', { side: act.side.id });
      } else {
        this.setStatus(act, h.toxicspikes >= 2 ? 'tox' : 'psn', null, null);
      }
    }
    if (h.stickyweb) {
      this.say(this.name(act) + ' verfängt sich im klebrigen Netz!', 'text', { side: act.side.id });
      this.boost(act, { spe: -1 }, null);
    }
  };

  B.stats0 = function (act) { return act.stats[0]; };

  B.onSwitchInEffects = function (act) {
    this.hook(act, 'onSwitchIn', [act.side.other.active]);
    var foe = act.side.other.active;
    if (foe && foe.mon.hp > 0) this.hook(foe, 'onFoeSwitchIn', [act]);
  };

  /** Reihenfolge zweier Aktionen bestimmen. */
  B.actionOrder = function (a0, a1) {
    var self = this;
    // Nach einem gegnerischen Wechsel handelt der Spieler zuerst — unabhängig
    // von Initiative und Priorität.
    if (this.playerFirstNextTurn && (a0 || a1)) return [0, 1];
    if (this.turn === 1 && (a0 || a1) && this.relicMod('firstTurnPriority')) return [0, 1];
    function prio(action, act) {
      if (!action) return -99;
      if (action.type !== 'move') return 6;
      var slot = act.mon.moves[action.index];
      if (!slot) return 0;                       // Verzweifler hat keine Priorität
      var mv = dex.move(slot.m);
      var p = mv.pr || 0;
      p += self.hook(act, 'modPriority', [mv]) || 0;
      return p;
    }
    var p0 = prio(a0, this.sides[0].active), p1 = prio(a1, this.sides[1].active);
    if (p0 !== p1) return p0 > p1 ? [0, 1] : [1, 0];
    var s0 = this.sides[0].active ? this.statOf(this.sides[0].active, 'spe') : 0;
    var s1 = this.sides[1].active ? this.statOf(this.sides[1].active, 'spe') : 0;
    if (this.field.trickroom > 0) { s0 = -s0; s1 = -s1; }
    if (s0 === s1) return this.rng.chance(0.5) ? [0, 1] : [1, 0];
    return s0 > s1 ? [0, 1] : [1, 0];
  };

  /**
   * Spielt eine komplette Runde. actions[0] ist die Wahl des Spielers,
   * actions[1] die des Gegners (üblicherweise von PL.ai geliefert).
   * Rückgabe: die neuen Einträge im Kampfprotokoll.
   */
  B.runTurn = function (actions) {
    if (this.ended) return [];
    var start = this.log.length, i, order, side, act, action;
    this.turn++;
    this.log.push({ k: 'turn', turn: this.turn, s: '— Runde ' + this.turn + ' —' });

    this.plannedActions = actions;
    for (i = 0; i < 2; i++) {
      act = this.sides[i].active;
      if (act) {
        act.vol.protect = null;
        act.vol.flinch = false;
        act.damagedThisTurn = 0;
        act.switchedInThisTurn = false;
        act.movedThisTurn = false;
        act.vol.loweredThisTurn = false;
        act.vol.lastPhysicalHit = 0;
        act.vol.lastSpecialHit = 0;
        act.vol.gotCrit = false;
      }
    }

    // Mega-Entwicklung geschieht vor allen Aktionen der Runde
    for (i = 0; i < 2; i++) {
      action = actions[i];
      if (action && action.mega) this.megaEvolve(this.sides[i].active);
    }

    order = this.actionOrder(actions[0], actions[1]);
    this.playerFirstNextTurn = false;
    for (var oi = 0; oi < 2; oi++) {
      i = order[oi];
      side = this.sides[i];
      action = actions[i];
      if (!action || this.ended) continue;
      if (!side.active || side.active.mon.hp <= 0) continue;
      this.doAction(side, action);
      this.checkFaints();
      if (this.ended) break;
    }

    if (!this.ended) this.endOfTurn();
    this.resolveSelfSwitch();
    if (!this.ended) this.checkEnd();
    return this.log.slice(start);
  };

  B.doAction = function (side, action) {
    var act = side.active;
    if (action.type === 'move' && act) {
      var ab = this.effects.abilities[this.abilityId(act)];
      if (ab && ab.beforeAction && ab.beforeAction(this, act) === false) return;
    }
    switch (action.type) {
      case 'move':
        if (act.vol.encore) {
          var enc = act.mon.moves.map(function (m, idx) { return { m: m, idx: idx }; })
            .filter(function (e) { return e.m.m === act.vol.encore.move; })[0];
          if (enc) action = { type: 'move', index: enc.idx };
        }
        this.useMove(act, action.index);
        break;
      case 'switch':
        this.say((side.isPlayer ? 'Komm zurück, ' : 'Der Gegner ruft ') + mons.name(act.mon) +
          (side.isPlayer ? '!' : ' zurück!'), 'switchout', { side: side.id });
        this.switchIn(side, action.to);
        break;
      case 'item':
        this.useBagItem(side, action.item, action.target);
        break;
      case 'ball':
        this.throwBall(side, action.item);
        break;
      case 'run':
        this.tryFlee(side);
        break;
      default:
        break;
    }
  };

  B.resolveSelfVolatiles = function (act) {
    if (act.vol.healblock && --act.vol.healblock.turns <= 0) {
      delete act.vol.healblock;
      this.say(this.name(act) + ' kann sich wieder heilen.', 'text', { side: act.side.id });
    }
    if (act.vol.laserfocus && --act.vol.laserfocus <= 0) delete act.vol.laserfocus;
    if (act.vol.charge && --act.vol.charge <= 0) delete act.vol.charge;
    if (act.vol.nightmare && act.mon.status !== 'slp') delete act.vol.nightmare;
    if (act.vol.encore && --act.vol.encore.turns <= 0) {
      delete act.vol.encore;
      this.say(this.name(act) + ': Die Zugabe endet.', 'text', { side: act.side.id });
    }
    if (act.vol.taunt && --act.vol.taunt.turns <= 0) {
      delete act.vol.taunt;
      this.say(this.name(act) + ' ist nicht mehr verhöhnt.', 'text', { side: act.side.id });
    }
    if (act.vol.disable && --act.vol.disable.turns <= 0) delete act.vol.disable;
  };

  /* ---------- 6) Rundenende -------------------------------------------------- */

  B.endOfTurn = function () {
    var self = this, order = this.actionOrder(null, null), i, act;

    // Wetterschaden
    var w = this.weatherActive();
    if (w === 'sandstorm' || w === 'hail') {
      for (var oi = 0; oi < 2; oi++) {
        act = this.sides[order[oi]].active;
        if (!act || act.mon.hp <= 0) continue;
        var safeTypes = w === 'sandstorm' ? ['Rock', 'Ground', 'Steel'] : ['Ice'];
        var immune = (act.side.isPlayer && this.relicMod('weatherImmune')) ||
          safeTypes.some(function (t) { return act.types.indexOf(t) >= 0; }) ||
          /sandveil|sandrush|sandforce|magicguard|overcoat|icebody|snowcloak|slushrush/.test(this.abilityId(act)) ||
          act.item === 'safetygoggles';
        if (!immune) {
          this.say(this.name(act) + ' leidet unter dem ' + T.weather(w) + '.', 'text', { side: act.side.id });
          this.damage(act, Math.floor(this.maxHP(act) / 16), { ignoreSub: true });
        }
      }
    }

    for (var k = 0; k < 2; k++) {
      act = this.sides[order[k]].active;
      if (!act || act.mon.hp <= 0) continue;
      var side = act.side;

      // Wunsch
      if (side.wish && --side.wish.turns <= 0) {
        this.healAct(act, side.wish.hp, false, 'Wunschtraum');
        side.wish = null;
      }
      // Feldheilung
      if (this.field.terrain === 'grassyterrain' && this.grounded(act)) {
        this.healAct(act, Math.floor(this.maxHP(act) / 16), true);
      }
      this.hook(act, 'onResidual', []);
      if (act.mon.hp <= 0) continue;

      // Status
      if (act.mon.status === 'brn' && this.abilityId(act) !== 'magicguard') {
        this.say(this.name(act) + ' leidet unter der Verbrennung.', 'text', { side: act.side.id });
        this.damage(act, Math.floor(this.maxHP(act) / 16), { ignoreSub: true });
      } else if (act.mon.status === 'psn' && this.abilityId(act) !== 'magicguard') {
        if (this.abilityId(act) === 'poisonheal') this.healAct(act, Math.floor(this.maxHP(act) / 8), false, 'Aufheber');
        else {
          this.say(this.name(act) + ' leidet unter der Vergiftung.', 'text', { side: act.side.id });
          this.damage(act, Math.floor(this.maxHP(act) / 8), { ignoreSub: true });
        }
      } else if (act.mon.status === 'tox' && this.abilityId(act) !== 'magicguard') {
        act.vol.toxicTurns = (act.vol.toxicTurns || 0) + 1;
        if (this.abilityId(act) === 'poisonheal') this.healAct(act, Math.floor(this.maxHP(act) / 8), false, 'Aufheber');
        else {
          this.say(this.name(act) + ' leidet schwer unter dem Gift.', 'text', { side: act.side.id });
          this.damage(act, Math.floor(this.maxHP(act) * Math.min(15, act.vol.toxicTurns) / 16), { ignoreSub: true });
        }
      }
      if (act.mon.hp <= 0) continue;

      // Egelsamen
      if (act.vol.leechseed && this.abilityId(act) !== 'magicguard') {
        var drainer = this.sides[act.vol.leechseed.source].active;
        var amount = Math.floor(this.maxHP(act) / 8);
        this.say(this.name(act) + ' verliert KP an den Egelsamen.', 'text', { side: act.side.id });
        var lost = this.damage(act, amount, { ignoreSub: true });
        if (drainer && drainer.mon.hp > 0 && lost) this.healAct(drainer, lost, true);
      }
      if (act.vol.saltcure && this.abilityId(act) !== 'magicguard') {
        var div = (act.types.indexOf('Water') >= 0 || act.types.indexOf('Steel') >= 0) ? 4 : 8;
        this.damage(act, Math.floor(this.maxHP(act) / div), { ignoreSub: true });
      }
      if (act.vol.curse && this.abilityId(act) !== 'magicguard') {
        this.say(this.name(act) + ' leidet unter dem Fluch.', 'text', { side: act.side.id });
        this.damage(act, Math.floor(this.maxHP(act) / 4), { ignoreSub: true });
      }
      if (act.vol.nightmare && this.abilityId(act) !== 'magicguard') {
        if (act.mon.status !== 'slp') delete act.vol.nightmare;
        else {
          this.say(this.name(act) + ' wird von einem Albtraum geplagt!', 'text', { side: act.side.id });
          this.damage(act, Math.floor(this.maxHP(act) / 4), { ignoreSub: true });
        }
      }
      if (act.vol.octolock) this.boost(act, { def: -1, spd: -1 }, act.side.other.active);
      if (act.vol.partiallytrapped) {
        this.damage(act, Math.floor(this.maxHP(act) / 8), { ignoreSub: true });
        if (--act.vol.partiallytrapped.turns <= 0) {
          delete act.vol.partiallytrapped;
          this.say(this.name(act) + ' ist wieder frei.', 'text', { side: act.side.id });
        }
      }
      if (act.vol.aquaring) this.healAct(act, Math.floor(this.maxHP(act) / 16), true);
      if (act.vol.yawn && --act.vol.yawn.turns <= 0) {
        delete act.vol.yawn;
        this.setStatus(act, 'slp', null, null);
      }
      if (act.vol.perish) {
        act.vol.perish.turns--;
        this.say(this.name(act) + ': Der Abgesang zählt ' + act.vol.perish.turns + '.', 'text', { side: act.side.id });
        if (act.vol.perish.turns <= 0) this.damage(act, act.mon.hp, { ignoreSub: true, trueDamage: true });
      }
      this.resolveSelfVolatiles(act);
      act.turnsActive++;
      act.vol.endure = false;
      act.vol.destinybond = false;
      if (act.lastMove === null || !act.vol.protectUsed) act.protectStreak = act.vol.protect ? act.protectStreak : 0;
    }

    // Zähler herunterzählen
    if (this.field.weatherTurns > 0 && --this.field.weatherTurns <= 0 && this.field.weather) {
      this.say('Das Wetter beruhigt sich.', 'weather', { weather: null });
      this.field.weather = null;
    }
    if (this.field.terrainTurns > 0 && --this.field.terrainTurns <= 0 && this.field.terrain) {
      this.say('Das Feld normalisiert sich.', 'field', { terrain: null });
      this.field.terrain = null;
    }
    if (this.field.trickroom > 0) this.field.trickroom--;
    for (i = 0; i < 2; i++) {
      var sc = this.sides[i].screens, key;
      for (key in sc) if (sc[key] > 0) sc[key]--;
    }
    this.checkFaints();
  };

  /* ---------- 7) Wechsel, Fangen, Ende --------------------------------------- */

  B.checkFaints = function () {
    for (var i = 0; i < 2; i++) {
      var side = this.sides[i], act = side.active;
      if (!act || act.mon.hp > 0 || act.fainted) continue;
      // Notfallband: das erste besiegte Pokémon steht noch einmal auf.
      if (side.isPlayer && !side.emergencyUsed) {
        var rescue = this.relicMod('emergencyRevive');
        if (rescue) {
          side.emergencyUsed = true;
          act.mon.hp = Math.max(1, Math.round(act.stats[0] * rescue));
          act.mon.status = null;
          this.say(this.name(act) + ' rappelt sich am Notfallband noch einmal auf!', 'heal',
            { side: i, amount: act.mon.hp, hp: act.mon.hp, max: act.stats[0] });
          continue;
        }
      }
      act.fainted = true;
      side.fainted++;
      side.lastFainted = act;
      // Wer hat den letzten Treffer gesetzt? Der Friedhof will es wissen.
      var killer = act.hurtBySource;
      act.mon.faintedBy = killer ? mons.name(killer.mon) : null;
      act.mon.faintedAgainst = this.trainer ? this.trainer.name : (this.wild ? 'einem wilden Pokémon' : null);
      this.say(this.name(act) + ' wurde besiegt!', 'faint', { side: i, mon: side.activeIndex });
      var foe = side.other.active;
      if (foe && foe.mon.hp > 0) this.hook(foe, 'onFoeFaint', [act]);
      // Kampfgeist: ein Sieg im Kampf beflügelt.
      if (!side.isPlayer && foe && foe.mon.hp > 0 && this.relicMod('koBoost')) {
        var pick = {};
        pick[PL.STATS[1 + this.rng.int(5)]] = 1;
        this.say('Kampfgeist!', 'ability', { side: foe.side.id });
        this.boost(foe, pick, foe);
      }
      if (act.vol.destinybond && foe && foe.mon.hp > 0) {
        this.say('Es reißt ' + this.name(foe) + ' mit sich!', 'text', { side: foe.side.id });
        this.damage(foe, foe.mon.hp, { ignoreSub: true, trueDamage: true });
        foe.fainted = foe.mon.hp <= 0;
      }
    }
    this.checkEnd();
  };

  B.checkEnd = function () {
    if (this.ended) return true;
    var alive0 = this.sides[0].team.some(function (m) { return m.hp > 0; });
    var alive1 = this.sides[1].team.some(function (m) { return m.hp > 0; });
    if (!alive0 || !alive1) {
      this.ended = true;
      this.winner = alive0 ? 0 : 1;
      this.outcome = alive0 ? 'win' : 'loss';
      this.say(alive0 ? 'Kampf gewonnen!' : 'Alle Pokémon sind kampfunfähig …', 'end', { winner: this.winner });
      return true;
    }
    // Ersatz anfordern
    for (var i = 0; i < 2; i++) {
      var side = this.sides[i];
      if (side.active && side.active.mon.hp <= 0) {
        if (side.isPlayer) { this.pending = i; }
        else { this.autoReplace(side); }
      }
    }
    return false;
  };

  B.resolveSelfSwitch = function () {
    for (var i = 0; i < 2; i++) {
      var side = this.sides[i];
      if (!side.pendingSelfSwitch) continue;
      side.pendingSelfSwitch = false;
      if (!side.active || side.active.mon.hp <= 0) continue;
      if (!this.hasBackup(side)) continue;
      if (side.isPlayer) this.pendingSelfSwitchSide = i;
      else {
        var pick = PL.ai ? PL.ai.chooseSwitch(this, side) : -1;
        if (pick >= 0) this.switchIn(side, pick);
      }
    }
  };

  B.autoReplace = function (side) {
    var pick = PL.ai ? PL.ai.chooseSwitch(this, side, true) : -1;
    if (pick < 0) {
      for (var i = 0; i < side.team.length; i++) if (side.team[i].hp > 0) { pick = i; break; }
    }
    if (pick >= 0) this.switchIn(side, pick);
  };

  B.replace = function (sideId, index) {
    var side = this.sides[sideId];
    if (!side.team[index] || side.team[index].hp <= 0) return false;
    this.switchIn(side, index);
    this.pending = null;
    this.pendingSelfSwitchSide = null;
    this.checkEnd();
    return true;
  };

  B.forceOut = function (act) {
    var side = act.side;
    var ab = this.effects.abilities[this.abilityId(act)];
    if (ab && ab.keepsPlace) {
      this.say(this.name(act) + ' steht wie festgesaugt.', 'ability', { side: act.side.id });
      return false;
    }
    if (!this.hasBackup(side)) return false;
    if (this.wild && !side.isPlayer) {
      this.ended = true;
      this.outcome = 'fled';
      this.winner = 0;
      this.say('Das wilde Pokémon ist geflohen!', 'end', { winner: 0 });
      return true;
    }
    var choices = [];
    for (var i = 0; i < side.team.length; i++) if (side.team[i].hp > 0 && i !== side.activeIndex) choices.push(i);
    if (!choices.length) return false;
    this.say(this.name(act) + ' wird aus dem Kampf gezogen!', 'text', { side: side.id });
    this.switchIn(side, this.rng.pick(choices));
    return true;
  };

  /* --- Mega-Entwicklung -------------------------------------------------------
   * Einmal pro Kampf (mit dem passenden Relikt zweimal). Es braucht den Stein
   * der Spezies; Rayquaza kommt wie in den Spielen ohne aus, verlangt dafür
   * Zenitstürmer.
   * -------------------------------------------------------------------------- */

  /** Die Mega-Form, die dieses Pokémon gerade erreichen könnte. */
  B.megaFormFor = function (act) {
    if (!act || act.mega || act.mon.hp <= 0) return null;
    var list = dex.megasFor(act.species);
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      var form = list[i];
      if (form.mv) {
        var knows = act.mon.moves.some(function (mv) { return dex.move(mv.m).n === form.mv; });
        if (knows) return form;
      } else if (form.it && act.item === PL.util.toID(form.it)) {
        return form;
      }
    }
    return null;
  };

  B.megaCharges = function (side) {
    return side.isPlayer ? (this.relicMod('megaCharges') || 1) : 1;
  };

  B.canMega = function (act) {
    if (!act) return false;
    if (act.side.megaUsed >= this.megaCharges(act.side)) return false;
    return !!this.megaFormFor(act);
  };

  B.megaEvolve = function (act) {
    var form = this.canMega(act) ? this.megaFormFor(act) : null;
    if (!form) return false;
    act.mega = true;
    act.side.megaUsed++;
    act.types = form.t.slice();
    act.ability = PL.util.toID(form.a);
    act.abilityName = form.a;
    act.megaName = form.n;
    act.stats = megaStats(act.mon, form.bs);
    var primal = /Primal/.test(form.n);
    this.say(this.name(act) + (primal ? ' erwacht als ' : ' mega-entwickelt sich zu ') + form.n + '!',
      'mega', { side: act.side.id, primal: primal });
    this.onSwitchInEffects(act);
    return true;
  };

  function megaStats(mon, base) {
    var out = [], i, iv, ev, v;
    for (i = 0; i < 6; i++) {
      iv = mon.ivs[i]; ev = Math.floor(mon.evs[i] / 4);
      if (i === 0) v = Math.floor((2 * base[i] + iv + ev) * mon.lvl / 100) + mon.lvl + 10;
      else v = Math.floor((Math.floor((2 * base[i] + iv + ev) * mon.lvl / 100) + 5) *
        mons.natureMod(mon.nat, PL.STATS[i]));
      out.push(v);
    }
    return out;
  }

  /* --- Beutel, Bälle, Flucht -------------------------------------------------- */

  B.useBagItem = function (side, itemId, targetIndex) {
    var def = PL.items ? PL.items.get(itemId) : null;
    if (!def) return false;
    var target = side.team[targetIndex === undefined ? side.activeIndex : targetIndex];
    if (!target) return false;
    var res = def.use ? def.use(this, side, target) : false;
    if (res !== false) {
      this.say('Du setzt ' + def.name + ' ein.', 'item', { side: side.id, item: itemId });
      if (res && res.text) this.say(res.text, 'text', { side: side.id });
    }
    return res !== false;
  };

  B.throwBall = function (side, ballId) {
    var foe = side.other.active;
    if (!this.wild) {
      this.say('Du kannst die Pokémon anderer Trainer nicht fangen!', 'text', {});
      return false;
    }
    var ball = PL.items ? PL.items.get(ballId) : null;
    var mult = ball && ball.ball ? ball.ball(this, foe) : 1;
    if (this.relicMod('timerBalls')) mult *= 1 + Math.min(2, this.turn * 0.15);
    this.say('Du wirfst ' + (ball ? ball.name : 'einen Ball') + '!', 'ball', { side: side.id, item: ballId });
    if (this.nuzlockeLocked) {
      this.say('Nuzlocke: In dieser Region hast du deinen Fang schon gemacht.', 'text', {});
      return false;
    }
    var res = mons.tryCatch(foe.mon, mult, this.rng, { rateMult: this.catchMult });
    if (res.caught) {
      this.ended = true;
      this.outcome = 'caught';
      this.winner = 0;
      this.caught = foe.mon;
      this.say('Gefangen! ' + mons.name(foe.mon) + ' gehört jetzt dir!', 'caught', { side: 1 });
    } else {
      this.say(['Oh nein! Es ist ausgebrochen!', 'Fast! Nur noch ein kleines Stück!',
        'Argh! So knapp!', 'Es ist sofort wieder heraus!'][Math.min(3, res.shakes)],
        'ballfail', { shakes: res.shakes });
    }
    return true;
  };

  B.tryFlee = function (side) {
    if (!this.wild) {
      this.say('Vor einem Trainerkampf kann man nicht fliehen!', 'text', {});
      return false;
    }
    var me = side.active, foe = side.other.active;
    var odds = me && foe ? clamp((this.statOf(me, 'spe') * 128 / Math.max(1, this.statOf(foe, 'spe')) + 30 * this.fleeTries) / 256, 0.15, 0.95) : 0.5;
    this.fleeTries = (this.fleeTries || 1) + 1;
    if (this.rng.next() < odds) {
      this.ended = true;
      this.outcome = 'fled';
      this.winner = null;
      this.say('Du bist entkommen!', 'end', { winner: null });
      return true;
    }
    this.say('Die Flucht ist misslungen!', 'text', {});
    return false;
  };

  /* ---------- 8) Schnittstelle ------------------------------------------------ */

  B.start = function () {
    this.log.push({ k: 'start', s: this.wild ? 'Ein wildes Pokémon greift an!' :
      ('Trainer ' + (this.trainer ? this.trainer.name : '') + ' fordert dich heraus!') });
    var first0 = firstAlive(this.sides[0]), first1 = firstAlive(this.sides[1]);
    this.switchIn(this.sides[1], first1);
    this.switchIn(this.sides[0], first0);
    // Fähigkeiten, die beim Betreten wirken, in Initiative-Reihenfolge
    this.checkFaints();
    return this.log;
  };

  function firstAlive(side) {
    for (var i = 0; i < side.team.length; i++) if (side.team[i].hp > 0) return i;
    return 0;
  }

  /** Kompakter Zustand für die Oberfläche. */
  B.view = function () {
    var self = this;
    function pack(side) {
      var a = side.active;
      return {
        id: side.id,
        active: a ? {
          index: side.activeIndex,
          name: mons.name(a.mon),
          species: a.species,
          megaName: a.megaName || null,
          level: a.mon.lvl,
          hp: a.mon.hp,
          max: a.stats[0],
          status: a.mon.status,
          types: a.types.slice(),
          mega: a.mega,
          boosts: a.boosts,
          ability: a.abilityName,
          item: a.item,
          shiny: a.mon.shiny,
          gender: a.mon.gender,
          vol: Object.keys(a.vol).filter(function (k) { return a.vol[k]; })
        } : null,
        team: side.team.map(function (m) {
          return { name: mons.name(m), hp: m.hp, max: mons.maxHP(m), status: m.status, species: dex.sp(m.sp), level: m.lvl };
        }),
        hazards: side.hazards,
        screens: side.screens,
        megaUsed: side.megaUsed
      };
    }
    return {
      turn: this.turn,
      wild: this.wild,
      trainer: this.trainer,
      field: this.field,
      sides: [pack(this.sides[0]), pack(this.sides[1])],
      ended: this.ended,
      outcome: this.outcome,
      winner: this.winner,
      pending: this.pending
    };
  };

  /** Welche Attacken darf der Spieler gerade wählen? */
  B.legalMoves = function (sideId) {
    var self = this, side = this.sides[sideId], act = side.active, out = [];
    if (!act) return out;
    act.mon.moves.forEach(function (mv, i) {
      var m = dex.move(mv.m), why = null;
      if (mv.pp <= 0) why = 'Keine AP mehr';
      else if (act.vol.choiceLock !== undefined && act.vol.choiceLock !== null && act.vol.choiceLock !== mv.m) why = 'Wahl-Item';
      else if (self.itemOf(act) && self.itemOf(act).noStatus && m.c === 'T') why = 'Angriffsweste';
      else if (act.vol.taunt && m.c === 'T') why = 'Verhöhnung';
      else if (act.vol.disable && act.vol.disable.move === mv.m) why = 'Blockiert';
      else if (act.vol.encore && act.vol.encore.move !== mv.m) why = 'Zugabe';
      else if (act.vol.lockedmove && act.vol.lockedmove.move !== mv.m) why = 'Festgelegt';
      else if (act.vol.twoturn && act.vol.twoturn.move !== mv.m) why = 'Lädt auf';
      else if (act.vol.torment && act.lastMove === mv.m) why = 'Folterknecht';
      out.push({ index: i, move: m, pp: mv.pp, maxPP: m.pp + mv.ppUp * Math.floor(m.pp / 5), disabled: !!why, why: why });
    });
    if (out.every(function (o) { return o.disabled; })) {
      out.push({ index: -1, move: dex.move('struggle') || { n: 'Verzweifler', t: 'Normal', c: 'P', bp: 50 }, pp: 1, maxPP: 1, disabled: false, why: null });
    }
    return out;
  };

  /** Wahlband und Co. legen das Pokémon auf seine erste Attacke fest. */
  B.lockChoice = function (act, entry) {
    var it = this.itemOf(act);
    if (it && it.choice && entry) act.vol.choiceLock = entry.m;
  };

  B.canSwitch = function (sideId) {
    var side = this.sides[sideId], act = side.active;
    if (act && (act.vol.partiallytrapped || act.vol.lockedmove || act.vol.twoturn || act.vol.trapped)) return false;
    var foe = side.other.active;
    if (foe && this.abilityId(foe) === 'shadowtag' && this.abilityId(act) !== 'shadowtag') return false;
    if (foe && this.abilityId(foe) === 'arenatrap' && this.grounded(act)) return false;
    var foeAb = foe && this.effects.abilities[this.abilityId(foe)];
    if (foeAb && foeAb.traps && act && act.types.indexOf(foeAb.traps) >= 0) return false;
    return this.hasBackup(side);
  };

  PL.Battle = Battle;
  PL.battleInternals = { boostMult: boostMult, accMult: accMult, makeActive: makeActive, BOOSTABLE: BOOSTABLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = Battle;
})(typeof globalThis !== 'undefined' ? globalThis : this);
