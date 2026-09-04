/* =============================================================================
 * effects.js — Fähigkeiten, Tragegegenstände und Attacken-Sonderregeln
 * -----------------------------------------------------------------------------
 * Die Engine ruft Haken auf, die hier als schlichte Funktionen liegen. Nicht
 * aufgeführte Fähigkeiten und Items sind im Kampf wirkungslos — der Rest der
 * Attacken kommt ohne Sonderregel aus, weil ihre Wirkung schon in den Daten
 * steht (Zusatzeffekte, Statusstufen, Wetter, Rückstoß …).
 *
 * Hakenübersicht (erstes Argument ist immer die Kampfinstanz, zweites das
 * betroffene Pokémon):
 *   modStat, modSpeed, modBP, modBPTaken, modDamage, modDamageTaken,
 *   modSuperEffective, modAccuracy, modMoveType, modPriority,
 *   onSwitchIn, onFoeSwitchIn, onSwitchOut, onContact, onHitTaken,
 *   onDealtDamage, onResidual, afterMove, onFoeFaint,
 *   blockStatus, blockLower, afterLowered, blockMove, blockConfusion
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.dex) require('./core.js');
    if (!PL.mon) require('./pokemon.js');
  }
  var dex = PL.dex, toID = PL.util.toID, clamp = PL.util.clamp;

  function frac(bt, act, d) { return Math.max(1, Math.floor(bt.maxHP(act) / d)); }
  function pinch(bt, act) { return bt.hpFraction(act) <= 1 / 3; }

  /* ========================================================== Fähigkeiten == */

  var A = {};

  /* --- Nachgereichte Fähigkeiten -------------------------------------------
   * Diese standen lange nur im Datenbestand und blieben im Kampf stumm.
   * ------------------------------------------------------------------------ */

  A.synchronize = {
    // Gift, Brand und Lähmung gehen an den Verursacher zurück.
    afterStatus: function (bt, act, status, source) {
      if (!source || source === act || !/psn|tox|brn|par/.test(status)) return;
      if (source.mon.status) return;
      bt.say(bt.name(act) + ' gibt den Zustand zurück!', 'ability', { side: act.side.id });
      bt.setStatus(source, status === 'tox' ? 'psn' : status, act, null);
    }
  };

  A.rivalry = {
    modBP: function (bt, act, move, target) {   // target = Verteidiger
      if (!target || !act.mon.gender || !target.mon.gender) return 1;
      if (act.mon.gender === 'N' || target.mon.gender === 'N') return 1;
      return act.mon.gender === target.mon.gender ? 1.25 : 0.75;
    }
  };

  A.earlybird = { sleepSpeed: 2 };          // schläft doppelt so schnell aus
  A.magnetpull = { traps: 'Steel' };
  A.stickyhold = { keepsItem: true };
  A.suctioncups = { keepsPlace: true };
  A.klutz = { itemDead: true };
  A.damp = { blocksBoom: true };
  A.unseenfist = { ignoresProtect: 'contact' };
  A.truant = {
    beforeAction: function (bt, act) {
      act.vol.truantCount = (act.vol.truantCount || 0) + 1;
      if (act.vol.truantCount % 2 === 0) {
        bt.say(bt.name(act) + ' faulenzt!', 'ability', { side: act.side.id });
        return false;
      }
      return true;
    }
  };
  A.stench = {
    afterMove: function (bt, act, move, target, dealt) {
      if (!target || !dealt || target.mon.hp <= 0 || move.c === 'T') return;
      if (bt.rng.chance(0.1)) bt.addVolatile(target, 'flinch', act);
    }
  };
  A.steadfast = {
    onFlinch: function (bt, act) { bt.boost(act, { spe: 1 }, act); }
  };
  A.tangledfeet = {
    modAccuracyTaken: function (bt, act) { return act.vol.confusion ? 0.5 : 1; }
  };
  A.pastelveil = {
    blockStatus: function (bt, act, s) { return s === 'psn' || s === 'tox'; }
  };
  A.merciless = {
    alwaysCrit: function (bt, act, target) { return !!(target && /psn|tox/.test(target.mon.status || '')); }
  };
  A.gluttony = { berryEarly: true };
  A.ripen = { berryDouble: true };
  A.cheekpouch = {
    afterBerry: function (bt, act) { bt.healAct(act, frac(bt, act, 3), false, 'Backentaschen'); }
  };
  A.illuminate = { blockLower: function (bt, act, stat) { return stat === 'acc'; } };
  A.forewarn = {
    onSwitchIn: function (bt, act, foe) {
      if (!foe) return;
      var best = null, i, m;
      for (i = 0; i < foe.mon.moves.length; i++) {
        m = dex.move(foe.mon.moves[i].m);
        if (m && (!best || m.bp > best.bp)) best = m;
      }
      if (best) bt.say(bt.name(act) + ' erahnt ' + best.n + '!', 'ability', { side: act.side.id });
    }
  };


  /* --- Angriffsverstärker --- */
  function pinchBoost(type) {
    return { modBP: function (bt, act, move) { return (move.t === type && pinch(bt, act)) ? 1.5 : 1; } };
  }
  A.overgrow = pinchBoost('Grass');
  A.blaze = pinchBoost('Fire');
  A.torrent = pinchBoost('Water');
  A.swarm = pinchBoost('Bug');

  function flagBoost(flag, mult) {
    return { modBP: function (bt, act, move) { return (move.fl && move.fl.indexOf(flag) >= 0) ? mult : 1; } };
  }
  A.ironfist = flagBoost('punch', 1.2);
  A.strongjaw = flagBoost('bite', 1.5);
  A.megalauncher = flagBoost('pulse', 1.5);
  A.sharpness = flagBoost('slicing', 1.5);
  A.toughclaws = flagBoost('contact', 1.3);
  A.punkrock = {
    modBP: function (bt, act, move) { return (move.fl && move.fl.indexOf('sound') >= 0) ? 1.3 : 1; },
    modDamageTaken: function (bt, act, move) { return (move.fl && move.fl.indexOf('sound') >= 0) ? 0.5 : 1; }
  };
  A.reckless = { modBP: function (bt, act, move) { return move.rc ? 1.2 : 1; } };
  A.sheerforce = { modBP: function (bt, act, move) { return (move.sec && move.sec.length) ? 1.3 : 1; } };
  A.analytic = {
    modBP: function (bt, act, move) {
      var foe = act.side.other.active;
      return (foe && foe.lastMove !== null && foe.movedThisTurn) ? 1.3 : 1;
    }
  };
  A.technician = {};        // in der Schadensrechnung berücksichtigt
  A.adaptability = {};
  A.tintedlens = { modDamage: function (bt, act, move, def, eff) { return eff < 1 ? 2 : 1; } };
  A.hugepower = { modStat: function (bt, act, stat) { return stat === 'atk' ? 2 : 1; } };
  A.purepower = A.hugepower;
  A.guts = { modStat: function (bt, act, stat) { return (stat === 'atk' && act.mon.status) ? 1.5 : 1; } };
  A.hustle = {
    modStat: function (bt, act, stat) { return stat === 'atk' ? 1.5 : 1; },
    modAccuracy: function (bt, act, move) { return move.c === 'P' ? 0.8 : 1; }
  };
  A.solarpower = {
    modStat: function (bt, act, stat) { return (stat === 'spa' && bt.weatherActive() === 'sunnyday') ? 1.5 : 1; },
    onResidual: function (bt, act) { if (bt.weatherActive() === 'sunnyday') bt.damage(act, frac(bt, act, 8), { ignoreSub: true }); }
  };
  A.flowergift = { modStat: function (bt, act, stat) { return (bt.weatherActive() === 'sunnyday' && (stat === 'atk' || stat === 'spd')) ? 1.5 : 1; } };
  A.defeatist = { modStat: function (bt, act, stat) { return (bt.hpFraction(act) <= 0.5 && (stat === 'atk' || stat === 'spa')) ? 0.5 : 1; } };
  A.slowstart = { modStat: function (bt, act, stat) { return (act.turnsActive < 5 && (stat === 'atk' || stat === 'spe')) ? 0.5 : 1; } };
  A.transistor = { modBP: function (bt, act, move) { return move.t === 'Electric' ? 1.3 : 1; } };
  A.dragonsmaw = { modBP: function (bt, act, move) { return move.t === 'Dragon' ? 1.5 : 1; } };
  A.rockypayload = { modBP: function (bt, act, move) { return move.t === 'Rock' ? 1.5 : 1; } };
  A.steelworker = { modBP: function (bt, act, move) { return move.t === 'Steel' ? 1.5 : 1; } };
  A.steelyspirit = A.steelworker;
  A.waterbubble = {
    modBP: function (bt, act, move) { return move.t === 'Water' ? 2 : 1; },
    modDamageTaken: function (bt, act, move) { return move.t === 'Fire' ? 0.5 : 1; },
    blockStatus: function (bt, act, status) { return status === 'brn'; }
  };
  A.sandforce = {
    modBP: function (bt, act, move) {
      return (bt.weatherActive() === 'sandstorm' && /Rock|Ground|Steel/.test(move.t)) ? 1.3 : 1;
    }
  };
  A.supremeoverlord = {
    modBP: function (bt, act) { return 1 + 0.1 * Math.min(5, act.side.fainted); }
  };
  A.stakeout = {
    modBP: function (bt, act, move, def) { return (def && def.switchedInThisTurn) ? 2 : 1; }
  };
  A.neuroforce = { modDamage: function (bt, act, move, def, eff) { return eff > 1 ? 1.25 : 1; } };
  A.ironfist2 = null;

  /* --- Typenwandler --- */
  function ateAbility(type) {
    return {
      modMoveType: function (bt, act, move, cur) { return (cur === 'Normal' && move.c !== 'T') ? type : cur; },
      modBP: function (bt, act, move) { return move.t === 'Normal' ? 1.2 : 1; }
    };
  }
  A.aerilate = ateAbility('Flying');
  A.pixilate = ateAbility('Fairy');
  A.refrigerate = ateAbility('Ice');
  A.galvanize = ateAbility('Electric');
  A.normalize = {
    modMoveType: function (bt, act, move) { return move.c !== 'T' ? 'Normal' : undefined; },
    modBP: function () { return 1.2; }
  };
  A.protean = {
    afterMove: function (bt, act, move) {
      if (act.vol.proteanUsed || move.c === 'T') return;
      if (act.types.length === 1 && act.types[0] === move.t) return;
      act.types = [move.t];
      act.vol.proteanUsed = true;
      bt.say(bt.name(act) + ' wird zum Typ ' + PL.t.type(move.t) + '!', 'ability', { side: act.side.id });
    }
  };
  A.libero = A.protean;

  /* --- Verteidigung --- */
  A.thickfat = { modDamageTaken: function (bt, act, move) { return /Fire|Ice/.test(move.t) ? 0.5 : 1; } };
  A.heatproof = { modDamageTaken: function (bt, act, move) { return move.t === 'Fire' ? 0.5 : 1; } };
  A.waterveil = { blockStatus: function (bt, act, s) { return s === 'brn'; } };
  A.fluffy = {
    modDamageTaken: function (bt, act, move) {
      var m = 1;
      if (move.fl && move.fl.indexOf('contact') >= 0) m *= 0.5;
      if (move.t === 'Fire') m *= 2;
      return m;
    }
  };
  A.filter = { modSuperEffective: function () { return 0.75; } };
  A.solidrock = A.filter;
  A.prismarmor = A.filter;
  A.multiscale = { modDamageTaken: function (bt, act) { return bt.hpFraction(act) >= 1 ? 0.5 : 1; } };
  A.shadowshield = A.multiscale;
  A.icescales = { modDamageTaken: function (bt, act, move) { return move.c === 'S' ? 0.5 : 1; } };
  A.furcoat = { modStat: function (bt, act, stat) { return stat === 'def' ? 2 : 1; } };
  A.marvelscale = { modStat: function (bt, act, stat) { return (stat === 'def' && act.mon.status) ? 1.5 : 1; } };
  A.grasspelt = { modStat: function (bt, act, stat) { return (stat === 'def' && bt.field.terrain === 'grassyterrain') ? 1.5 : 1; } };
  A.wonderguard = {
    blockMove: function (bt, act, move, atk) {
      if (move.c === 'T' || move.bp === 0) return false;
      if (bt.effectiveness(move.t, act, move, atk) > 1) return false;
      bt.say(bt.name(act) + ': Wunderwache wehrt alles ab!', 'ability', { side: act.side.id });
      return true;
    }
  };
  A.sturdy = {};
  A.battlearmor = {};
  A.shellarmor = {};
  A.magicguard = {};
  A.unaware = {};
  A.friendguard = {};
  A.purifyingsalt = {
    blockStatus: function () { return true; },
    modDamageTaken: function (bt, act, move) { return move.t === 'Ghost' ? 0.5 : 1; }
  };

  /* --- Absorbierende Fähigkeiten --- */
  function absorb(type, effect) {
    return {
      blockMove: function (bt, act, move, atk) {
        if (move.t !== type || move.c === 'T') return false;
        bt.say(bt.name(act) + ' saugt die Attacke auf!', 'ability', { side: act.side.id });
        effect(bt, act);
        return true;
      }
    };
  }
  A.voltabsorb = absorb('Electric', function (bt, act) { bt.healAct(act, frac(bt, act, 4), false, 'Voltabsorber'); });
  A.waterabsorb = absorb('Water', function (bt, act) { bt.healAct(act, frac(bt, act, 4), false, 'H2O-Absorber'); });
  A.dryskin = {
    blockMove: A.waterabsorb ? A.waterabsorb.blockMove : null,
    modDamageTaken: function (bt, act, move) { return move.t === 'Fire' ? 1.25 : 1; },
    onResidual: function (bt, act) {
      var w = bt.weatherActive();
      if (w === 'raindance') bt.healAct(act, frac(bt, act, 8), true);
      else if (w === 'sunnyday') bt.damage(act, frac(bt, act, 8), { ignoreSub: true });
    }
  };
  A.earthgeater = null;
  A.eartheater = absorb('Ground', function (bt, act) { bt.healAct(act, frac(bt, act, 4), false, 'Erdverzehrer'); });
  A.wellbakedbody = absorb('Fire', function (bt, act) { bt.boost(act, { def: 2 }, act); });
  A.flashfire = absorb('Fire', function (bt, act) {
    if (!act.vol.flashfire) { act.vol.flashfire = true; bt.say('Die Feuerkraft steigt!', 'text', { side: act.side.id }); }
  });
  A.sapsipper = absorb('Grass', function (bt, act) { bt.boost(act, { atk: 1 }, act); });
  A.lightningrod = absorb('Electric', function (bt, act) { bt.boost(act, { spa: 1 }, act); });
  A.stormdrain = absorb('Water', function (bt, act) { bt.boost(act, { spa: 1 }, act); });
  A.motordrive = absorb('Electric', function (bt, act) { bt.boost(act, { spe: 1 }, act); });
  A.windrider = absorb('Flying', function (bt, act) { bt.boost(act, { atk: 1 }, act); });
  A.levitate = {};
  A.bulletproof = {
    blockMove: function (bt, act, move) {
      if (!move.fl || move.fl.indexOf('bullet') < 0) return false;
      bt.say(bt.name(act) + ' blockt das Geschoss!', 'ability', { side: act.side.id });
      return true;
    }
  };
  A.soundproof = {
    blockMove: function (bt, act, move) {
      if (!move.fl || move.fl.indexOf('sound') < 0) return false;
      bt.say(bt.name(act) + ' ist gegen Lärm immun!', 'ability', { side: act.side.id });
      return true;
    }
  };
  A.overcoat = {
    blockMove: function (bt, act, move) {
      if (!move.fl || move.fl.indexOf('powder') < 0) return false;
      return true;
    },
    blockStatus: function (bt, act, s, src, move) { return !!(move && move.fl && move.fl.indexOf('powder') >= 0); }
  };
  A.goodasgold = {
    blockMove: function (bt, act, move, atk) {
      if (move.c !== 'T' || (atk && atk === act)) return false;
      bt.say(bt.name(act) + ': Goldkörper wehrt die Statusattacke ab!', 'ability', { side: act.side.id });
      return true;
    }
  };
  function priorityBlock(bt, act, move, atk) {
    if (!atk || (move.pr || 0) <= 0 || move.tg === 'self') return false;
    bt.say(bt.name(act) + ' lässt keine Erstschlagattacke zu!', 'ability', { side: act.side.id });
    return true;
  }
  A.dazzling = { blockMove: priorityBlock };
  A.queenlymajesty = { blockMove: priorityBlock };
  A.armortail = { blockMove: priorityBlock };

  /* --- Statusabwehr --- */
  function statusImmune(list) {
    return { blockStatus: function (bt, act, s) { return list.indexOf(s) >= 0; } };
  }
  A.immunity = statusImmune(['psn', 'tox']);
  A.limber = statusImmune(['par']);
  A.insomnia = statusImmune(['slp']);
  A.vitalspirit = statusImmune(['slp']);
  A.magmaarmor = statusImmune(['frz']);
  A.sweetveil = statusImmune(['slp']);
  A.thermalexchange = {
    blockStatus: function (bt, act, s) { return s === 'brn'; },
    onHitTaken: function (bt, act, atk, move) { if (move.t === 'Fire') bt.boost(act, { atk: 1 }, act); }
  };
  A.comatose = statusImmune(['slp', 'brn', 'par', 'psn', 'tox', 'frz']);
  A.owntempo = { blockConfusion: function () { return true; }, blockLower: function (bt, act, stat) { return stat === 'atk'; } };
  A.oblivious = { blockConfusion: function () { return true; } };
  A.innerfocus = { blockStatus: function (bt, act, s, src, move) { return false; } };
  A.shielddust = {};
  A.leafguard = { blockStatus: function (bt) { return bt.weatherActive() === 'sunnyday'; } };
  A.naturalcure = {};
  A.shedskin = {
    onResidual: function (bt, act) { if (act.mon.status && bt.rng.chance(1 / 3)) bt.cureStatus(act); }
  };
  A.hydration = {
    onResidual: function (bt, act) { if (act.mon.status && bt.weatherActive() === 'raindance') bt.cureStatus(act); }
  };
  A.poisonheal = {};
  A.regenerator = {};

  /* --- Statusstufen schützen und kontern --- */
  function clearBody() { return { blockLower: function (bt, act, stat, src) { return src && src !== act; } }; }
  A.clearbody = clearBody();
  A.whitesmoke = clearBody();
  A.fullmetalbody = clearBody();
  A.hypercutter = { blockLower: function (bt, act, stat, src) { return stat === 'atk' && src !== act; } };
  A.keeneye = { blockLower: function (bt, act, stat, src) { return stat === 'acc' && src !== act; } };
  A.bigpecks = { blockLower: function (bt, act, stat, src) { return stat === 'def' && src !== act; } };
  A.mirrorarmor = {
    onLowered: function (bt, act, stat, delta, src) {
      if (!src || src === act) return false;
      bt.say(bt.name(act) + ': Spiegelrüstung wirft die Senkung zurück!', 'ability', { side: act.side.id });
      var b = {}; b[stat] = delta;
      bt.boost(src, b, act);
      return true;
    }
  };
  A.defiant = { afterLowered: function (bt, act, stat, delta, src) { if (src && src !== act) bt.boost(act, { atk: 2 }, act); } };
  A.competitive = { afterLowered: function (bt, act, stat, delta, src) { if (src && src !== act) bt.boost(act, { spa: 2 }, act); } };
  A.contrary = {};
  A.simple = {};

  /* --- Beim Betreten des Feldes --- */
  A.intimidate = {
    onSwitchIn: function (bt, act, foe) {
      if (!foe || foe.mon.hp <= 0) return;
      bt.say(bt.name(act) + ' schüchtert den Gegner ein!', 'ability', { side: act.side.id });
      bt.boost(foe, { atk: -1 }, act);
    }
  };
  A.download = {
    onSwitchIn: function (bt, act, foe) {
      if (!foe) return;
      var b = bt.statOf(foe, 'def') <= bt.statOf(foe, 'spd') ? { atk: 1 } : { spa: 1 };
      bt.say(bt.name(act) + ' analysiert den Gegner!', 'ability', { side: act.side.id });
      bt.boost(act, b, act);
    }
  };
  A.intrepidsword = { onSwitchIn: function (bt, act) { bt.boost(act, { atk: 1 }, act); } };
  A.dauntlessshield = { onSwitchIn: function (bt, act) { bt.boost(act, { def: 1 }, act); } };
  A.trace = {
    onSwitchIn: function (bt, act, foe) {
      if (!foe || !foe.ability) return;
      act.ability = foe.ability;
      act.abilityName = foe.abilityName;
      bt.say(bt.name(act) + ' kopiert ' + PL.t.ability(foe.ability) + '!', 'ability', { side: act.side.id });
    }
  };
  A.anticipation = {
    onSwitchIn: function (bt, act, foe) {
      if (!foe) return;
      var danger = foe.mon.moves.some(function (mv) {
        var m = dex.move(mv.m);
        return m.c !== 'T' && bt.effectiveness(m.t, act, m, foe) > 1;
      });
      if (danger) bt.say(bt.name(act) + ' erschaudert!', 'ability', { side: act.side.id });
    }
  };
  A.frisk = {
    onSwitchIn: function (bt, act, foe) {
      if (foe && foe.item) bt.say('Der Gegner trägt ' + PL.items.label(foe.item) + '.', 'ability', { side: act.side.id });
    }
  };
  A.unnerve = {};
  A.pressure = {};
  A.screencleaner = {
    onSwitchIn: function (bt, act) {
      var s = act.side.other.screens, k, any = false;
      for (k in s) if (s[k] > 0 && k !== 'tailwind') { s[k] = 0; any = true; }
      if (any) bt.say(bt.name(act) + ' fegt die Schilde weg!', 'ability', { side: act.side.id });
    }
  };

  function weatherSetter(w) {
    return { onSwitchIn: function (bt, act) { bt.setWeather(w, act); bt.field.weatherTurns = 5; } };
  }
  A.drought = weatherSetter('sunnyday');
  A.drizzle = weatherSetter('raindance');
  A.sandstream = weatherSetter('sandstorm');
  A.snowwarning = weatherSetter('snowscape');
  A.orichalcumpulse = {
    onSwitchIn: function (bt, act) { bt.setWeather('sunnyday', act); },
    modStat: function (bt, act, stat) { return (stat === 'atk' && bt.weatherActive() === 'sunnyday') ? 1.33 : 1; }
  };
  A.hadronengine = {
    onSwitchIn: function (bt, act) { bt.setTerrain('electricterrain', act); },
    modStat: function (bt, act, stat) { return (stat === 'spa' && bt.field.terrain === 'electricterrain') ? 1.33 : 1; }
  };
  function terrainSetter(tr) { return { onSwitchIn: function (bt, act) { bt.setTerrain(tr, act); } }; }
  A.electricsurge = terrainSetter('electricterrain');
  A.grassysurge = terrainSetter('grassyterrain');
  A.mistysurge = terrainSetter('mistyterrain');
  A.psychicsurge = terrainSetter('psychicterrain');

  function ruin(stat, label) {
    return {
      onSwitchIn: function (bt, act) { bt.say(bt.name(act) + ': ' + label + ' schwächt das Umfeld!', 'ability', { side: act.side.id }); },
      modStat: function (bt, act, s, target) { return 1; },
      ruinStat: stat
    };
  }
  A.beadsofruin = ruin('spd', 'Perlen des Unheils');
  A.swordofruin = ruin('def', 'Schwert des Unheils');
  A.tabletsofruin = ruin('atk', 'Tafeln des Unheils');
  A.vesselofruin = ruin('spa', 'Gefäß des Unheils');

  /* --- Geschwindigkeit --- */
  function speedIn(cond) { return { modSpeed: function (bt, act) { return cond(bt, act) ? 2 : 1; } }; }
  A.chlorophyll = speedIn(function (bt) { return bt.weatherActive() === 'sunnyday'; });
  A.swiftswim = speedIn(function (bt) { return bt.weatherActive() === 'raindance'; });
  A.sandrush = speedIn(function (bt) { return bt.weatherActive() === 'sandstorm'; });
  A.slushrush = speedIn(function (bt) { return bt.weatherActive() === 'snowscape' || bt.weatherActive() === 'hail'; });
  A.surgesurfer = speedIn(function (bt) { return bt.field.terrain === 'electricterrain'; });
  A.quickfeet = { modSpeed: function (bt, act) { return act.mon.status ? 1.5 : 1; } };
  A.unburden = { modSpeed: function (bt, act) { return act.itemUsed ? 2 : 1; } };
  A.speedboost = { onResidual: function (bt, act) { if (act.turnsActive > 0) bt.boost(act, { spe: 1 }, act); } };
  A.prankster = { modPriority: function (bt, act, move) { return move.c === 'T' ? 1 : 0; } };
  A.galewings = { modPriority: function (bt, act, move) { return (move.t === 'Flying' && bt.hpFraction(act) >= 1) ? 1 : 0; } };
  A.triage = { modPriority: function (bt, act, move) { return (move.fl && move.fl.indexOf('heal') >= 0) ? 3 : 0; } };
  A.stall = { modPriority: function () { return -0.5; } };

  /* --- Reaktionen auf Treffer --- */
  function contactStatus(status, chance, label) {
    return {
      onContact: function (bt, act, atk) {
        if (bt.rng.chance(chance) && atk.mon.hp > 0) {
          bt.say(bt.name(act) + ': ' + label, 'ability', { side: act.side.id });
          bt.setStatus(atk, status, act, null);
        }
      }
    };
  }
  A.static = contactStatus('par', 0.3, 'Statik!');
  A.flamebody = contactStatus('brn', 0.3, 'Flammkörper!');
  A.poisonpoint = contactStatus('psn', 0.3, 'Giftdorn!');
  A.cutecharm = { onContact: function (bt, act, atk) { if (bt.rng.chance(0.3)) bt.addVolatile(atk, 'confusion', act); } };
  A.effectspore = {
    onContact: function (bt, act, atk) {
      var r = bt.rng.next();
      if (r < 0.09) bt.setStatus(atk, 'slp', act, null);
      else if (r < 0.18) bt.setStatus(atk, 'par', act, null);
      else if (r < 0.27) bt.setStatus(atk, 'psn', act, null);
    }
  };
  A.roughskin = {
    onContact: function (bt, act, atk) {
      bt.say(bt.name(atk) + ' verletzt sich an der rauen Haut!', 'text', { side: atk.side.id });
      bt.damage(atk, frac(bt, atk, 8), { ignoreSub: true });
    }
  };
  A.ironbarbs = A.roughskin;
  A.aftermath = {
    onContact: function (bt, act, atk) {
      if (act.mon.hp <= 0) bt.damage(atk, frac(bt, atk, 4), { ignoreSub: true });
    }
  };
  A.gooey = { onContact: function (bt, act, atk) { bt.boost(atk, { spe: -1 }, act); } };
  A.tanglinghair = A.gooey;
  A.cottondown = { onHitTaken: function (bt, act, atk) { bt.boost(atk, { spe: -1 }, act); } };
  A.sandspit = { onHitTaken: function (bt, act) { bt.setWeather('sandstorm', act); } };
  A.seedsower = { onHitTaken: function (bt, act) { bt.setTerrain('grassyterrain', act); } };
  A.cursedbody = {
    onHitTaken: function (bt, act, atk) {
      if (bt.rng.chance(0.3) && atk.lastMove !== null && !atk.vol.disable) {
        atk.vol.disable = { move: atk.lastMove, turns: 4 };
        bt.say(bt.name(atk) + ': Die Attacke wurde blockiert!', 'ability', { side: atk.side.id });
      }
    }
  };
  A.mummy = {
    onContact: function (bt, act, atk) {
      if (atk.ability === 'mummy') return;
      atk.ability = 'mummy'; atk.abilityName = 'Mumie';
      bt.say(bt.name(atk) + ' wird zur Mumie!', 'ability', { side: atk.side.id });
    }
  };
  A.poisontouch = { onDealtDamage: function (bt, act, target, move) {
    if (move.fl && move.fl.indexOf('contact') >= 0 && bt.rng.chance(0.3)) bt.setStatus(target, 'psn', act, move);
  } };
  A.toxicchain = { onDealtDamage: function (bt, act, target, move) {
    if (bt.rng.chance(0.3)) bt.setStatus(target, 'tox', act, move);
  } };
  A.stamina = { onHitTaken: function (bt, act) { bt.boost(act, { def: 1 }, act); } };
  A.watercompaction = { onHitTaken: function (bt, act, atk, move) { if (move.t === 'Water') bt.boost(act, { def: 2 }, act); } };
  A.steamengine = { onHitTaken: function (bt, act, atk, move) { if (/Fire|Water/.test(move.t)) bt.boost(act, { spe: 6 }, act); } };
  A.justified = { onHitTaken: function (bt, act, atk, move) { if (move.t === 'Dark') bt.boost(act, { atk: 1 }, act); } };
  A.rattled = { onHitTaken: function (bt, act, atk, move) { if (/Dark|Ghost|Bug/.test(move.t)) bt.boost(act, { spe: 1 }, act); } };
  A.weakarmor = {
    onHitTaken: function (bt, act, atk, move) {
      if (move.c === 'P') { bt.boost(act, { def: -1 }, act); bt.boost(act, { spe: 2 }, act); }
    }
  };
  A.angerpoint = {
    onHitTaken: function (bt, act, atk, move, dmg, eff) { if (act.vol.gotCrit) bt.boost(act, { atk: 12 }, act); }
  };
  A.berserk = {
    onHitTaken: function (bt, act) {
      if (bt.hpFraction(act) <= 0.5 && !act.vol.berserked) { act.vol.berserked = true; bt.boost(act, { spa: 1 }, act); }
    }
  };
  A.electromorphosis = { onHitTaken: function (bt, act) { act.vol.charged = true; } };
  A.windpower = A.electromorphosis;
  A.guarddog = { blockLower: function (bt, act, stat, src) { return stat === 'atk' && src !== act; } };
  A.innardsout = {
    onHitTaken: function (bt, act, atk, move, dmg) { if (act.mon.hp <= 0) bt.damage(atk, dmg, { ignoreSub: true }); }
  };

  /* --- Nach einem Sieg --- */
  function koBoost(stat) {
    return { onFoeFaint: function (bt, act) { bt.boost(act, koObj(stat), act); } };
  }
  function koObj(stat) { var o = {}; o[stat] = 1; return o; }
  A.moxie = koBoost('atk');
  A.chillingneigh = koBoost('atk');
  A.grimneigh = koBoost('spa');
  A.asoneglastrier = koBoost('atk');
  A.asonespectrier = koBoost('spa');
  A.beastboost = {
    onFoeFaint: function (bt, act) {
      var best = 'atk', i, val = 0;
      for (i = 1; i < 6; i++) if (act.stats[i] > val) { val = act.stats[i]; best = PL.STATS[i]; }
      bt.boost(act, koObj(best), act);
    }
  };
  A.soulheart = koBoost('spa');

  /* --- Sonstiges --- */
  A.serenegrace = {};
  A.noguard = {};
  A.compoundeyes = { modAccuracy: function () { return 1.3; } };
  A.victorystar = { modAccuracy: function () { return 1.1; } };
  A.superluck = {};
  A.sniper = { modDamage: function (bt, act, move, def, eff) { return 1; } };
  A.scrappy = {};
  A.infiltrator = {};
  A.moldbreaker = {};
  A.turboblaze = {};
  A.teravolt = {};
  A.shadowtag = {};
  A.arenatrap = {};
  A.icebody = { onResidual: function (bt, act) { if (/snowscape|hail/.test(bt.weatherActive() || '')) bt.healAct(act, frac(bt, act, 16), true); } };
  A.raindish = { onResidual: function (bt, act) { if (bt.weatherActive() === 'raindance') bt.healAct(act, frac(bt, act, 16), true); } };
  A.healer = {};
  A.harvest = {
    onResidual: function (bt, act) {
      if (!act.item && act.vol.lastItem && /berry|beere/i.test(act.vol.lastItem) && bt.rng.chance(0.5)) {
        act.item = act.vol.lastItem;
        bt.say(bt.name(act) + ' erntet ' + PL.items.label(act.item) + '!', 'ability', { side: act.side.id });
      }
    }
  };
  A.protosynthesis = {
    onSwitchIn: function (bt, act) {
      if (bt.weatherActive() === 'sunnyday' || act.item === 'boosterenergy') act.vol.paradox = true;
    },
    modStat: function (bt, act, stat) {
      if (!act.vol.paradox) return 1;
      var best = 'atk', i, val = 0;
      for (i = 1; i < 6; i++) if (act.stats[i] > val) { val = act.stats[i]; best = PL.STATS[i]; }
      return stat === best ? 1.3 : 1;
    }
  };
  A.quarkdrive = {
    onSwitchIn: function (bt, act) {
      if (bt.field.terrain === 'electricterrain' || act.item === 'boosterenergy') act.vol.paradox = true;
    },
    modStat: A.protosynthesis.modStat
  };

  /* ================================================= Tragegegenstände ====== */

  var TYPE_ITEMS = {
    charcoal: 'Fire', mysticwater: 'Water', miracleseed: 'Grass', magnet: 'Electric',
    nevermeltice: 'Ice', blackbelt: 'Fighting', poisonbarb: 'Poison', softsand: 'Ground',
    sharpbeak: 'Flying', twistedspoon: 'Psychic', silverpowder: 'Bug', hardstone: 'Rock',
    spelltag: 'Ghost', dragonfang: 'Dragon', blackglasses: 'Dark', metalcoat: 'Steel',
    fairyfeather: 'Fairy', silkscarf: 'Normal'
  };
  var RESIST_BERRIES = {
    occaberry: 'Fire', passhoberry: 'Water', wacanberry: 'Electric', rindoberry: 'Grass',
    yacheberry: 'Ice', chopleberry: 'Fighting', kebiaberry: 'Poison', shucaberry: 'Ground',
    cobaberry: 'Flying', payapaberry: 'Psychic', tangaberry: 'Bug', chartiberry: 'Rock',
    kasibberry: 'Ghost', habanberry: 'Dragon', colburberry: 'Dark', babiriberry: 'Steel',
    roseliberry: 'Fairy', chilanberry: 'Normal'
  };

  var I = {};

  /** Beere verzehren — Backentaschen heilen danach zusätzlich. */
  function eatBerry(bt, act) {
    bt.consumeItem(act);
    var ab = bt.effects.abilities[bt.abilityId(act)];
    if (ab && ab.afterBerry) ab.afterBerry(bt, act);
  }

  I.leftovers = { onResidual: function (bt, act) { bt.healAct(act, frac(bt, act, 16), false, 'Überreste'); } };
  I.blacksludge = {
    onResidual: function (bt, act) {
      if (act.types.indexOf('Poison') >= 0) bt.healAct(act, frac(bt, act, 16), false, 'Giftschleim');
      else bt.damage(act, frac(bt, act, 8), { ignoreSub: true });
    }
  };
  I.lifeorb = {
    modDamage: function () { return 1.3; },
    afterMove: function (bt, act, move, target, total) {
      if (total > 0 && bt.abilityId(act) !== 'magicguard') bt.damage(act, frac(bt, act, 10), { ignoreSub: true });
    }
  };
  I.choiceband = { modStat: function (bt, act, stat) { return stat === 'atk' ? 1.5 : 1; }, choice: true };
  I.choicespecs = { modStat: function (bt, act, stat) { return stat === 'spa' ? 1.5 : 1; }, choice: true };
  I.choicescarf = { modStat: function (bt, act, stat) { return stat === 'spe' ? 1.5 : 1; }, choice: true };
  I.assaultvest = { modStat: function (bt, act, stat) { return stat === 'spd' ? 1.5 : 1; }, noStatus: true };
  I.eviolite = {
    modStat: function (bt, act, stat) {
      return (/def|spd/.test(stat) && dex.evosLeft(act.species) > 0) ? 1.5 : 1;
    }
  };
  I.focussash = { endure: true };
  I.focusband = { endure: false };
  I.rockyhelmet = {
    onContact: function (bt, act, atk) {
      bt.say(bt.name(atk) + ' wird vom Fels-Helm verletzt!', 'text', { side: atk.side.id });
      bt.damage(atk, frac(bt, atk, 6), { ignoreSub: true });
    }
  };
  I.expertbelt = { modDamage: function (bt, act, move, def, eff) { return eff > 1 ? 1.2 : 1; } };
  I.muscleband = { modBP: function (bt, act, move) { return move.c === 'P' ? 1.1 : 1; } };
  I.wiseglasses = { modBP: function (bt, act, move) { return move.c === 'S' ? 1.1 : 1; } };
  I.scopelens = {};
  I.razorclaw = {};
  I.lightclay = {};
  I.damprock = {};
  I.heatrock = {};
  I.terrainextender = {};
  I.loadeddice = {};
  I.safetygoggles = {};
  I.heavydutyboots = {};
  I.airballoon = {
    onHitTaken: function (bt, act, atk, move) {
      if (move.c !== 'T') {
        bt.say('Der Luftballon platzt!', 'item', { side: act.side.id });
        bt.consumeItem(act);
      }
    }
  };
  I.weaknesspolicy = {
    onHitTaken: function (bt, act, atk, move, dmg, eff) {
      if (eff > 1 && act.mon.hp > 0) {
        bt.say(bt.name(act) + ': Schwächenschutz aktiviert!', 'item', { side: act.side.id });
        bt.boost(act, { atk: 2, spa: 2 }, act);
        bt.consumeItem(act);
      }
    }
  };
  I.throatspray = {
    afterMove: function (bt, act, move) {
      if (move.fl && move.fl.indexOf('sound') >= 0) { bt.boost(act, { spa: 1 }, act); bt.consumeItem(act); }
    }
  };
  I.punchingglove = {
    modBP: function (bt, act, move) { return (move.fl && move.fl.indexOf('punch') >= 0) ? 1.1 : 1; }
  };
  I.clearamulet = { blockLower: function (bt, act, stat, src) { return src && src !== act; } };
  I.covertcloak = { blockSecondary: true };
  I.quickclaw = {
    modPriority: function (bt, act) { return bt.rng.chance(0.2) ? 0.4 : 0; }
  };
  I.kingsrock = {
    onDealtDamage: function (bt, act, target, move, dmg) {
      if (move.c !== 'T' && bt.rng.chance(0.1)) bt.addVolatile(target, 'flinch', act);
    }
  };
  I.razorfang = I.kingsrock;
  I.whiteherb = {
    onResidual: function (bt, act) {
      var k, any = false;
      for (k in act.boosts) if (act.boosts[k] < 0) { act.boosts[k] = 0; any = true; }
      if (any) {
        bt.say(bt.name(act) + ': Die Weißkraut-Wirkung setzt die Senkungen zurück.', 'item', { side: act.side.id });
        bt.consumeItem(act);
      }
    }
  };
  I.boosterenergy = {};
  I.metronome = { modBP: function (bt, act, move) { return 1 + Math.min(1, (act.vol.metronomeCount || 0) * 0.2); } };

  // Beeren
  I.sitrusberry = {
    onResidual: function (bt, act) {
      if (bt.hpFraction(act) <= bt.berryThreshold(act, 0.5)) {
        bt.healAct(act, bt.berryAmount(act, frac(bt, act, 4)), false, 'Tsitrubeere');
        eatBerry(bt, act);
      }
    }
  };
  I.oranberry = {
    onResidual: function (bt, act) {
      if (bt.hpFraction(act) <= bt.berryThreshold(act, 0.5)) {
        bt.healAct(act, bt.berryAmount(act, 10), false, 'Amrenabeere');
        eatBerry(bt, act);
      }
    }
  };
  I.lumberry = {
    onResidual: function (bt, act) {
      if (act.mon.status || act.vol.confusion) {
        bt.cureStatus(act);
        delete act.vol.confusion;
        bt.say(bt.name(act) + ' isst die Prunusbeere.', 'item', { side: act.side.id });
        bt.consumeItem(act);
      }
    }
  };
  I.chestoberry = {
    onResidual: function (bt, act) { if (act.mon.status === 'slp') { bt.cureStatus(act); bt.consumeItem(act); } }
  };
  I.leppaberry = {
    onResidual: function (bt, act) {
      var empty = act.mon.moves.filter(function (m) { return m.pp <= 0; })[0];
      if (empty) { empty.pp = 10; bt.say(bt.name(act) + ' frischt AP auf.', 'item', { side: act.side.id }); bt.consumeItem(act); }
    }
  };
  function pinchBerry(stat, label) {
    return {
      onResidual: function (bt, act) {
        if (bt.hpFraction(act) <= 0.25) {
          bt.say(bt.name(act) + ' isst ' + label + '!', 'item', { side: act.side.id });
          var b = {}; b[stat] = 1;
          bt.boost(act, b, act);
          bt.consumeItem(act);
        }
      }
    };
  }
  I.liechiberry = pinchBerry('atk', 'die Kraftbeere');
  I.petayaberry = pinchBerry('spa', 'die Kioskbeere');
  I.salacberry = pinchBerry('spe', 'die Salkabeere');
  I.ganlonberry = pinchBerry('def', 'die Wunfrucht');
  I.apicotberry = pinchBerry('spd', 'die Apikobeere');
  I.figyberry = {
    onResidual: function (bt, act) {
      if (bt.hpFraction(act) <= 0.25) { bt.healAct(act, frac(bt, act, 3), false, 'Kuobeere'); bt.consumeItem(act); }
    }
  };

  // Typ-Verstärker und Widerstandsbeeren erzeugen
  Object.keys(TYPE_ITEMS).forEach(function (id) {
    I[id] = { modBP: function (bt, act, move) { return move.t === TYPE_ITEMS[id] ? 1.2 : 1; } };
  });
  Object.keys(RESIST_BERRIES).forEach(function (id) {
    I[id] = {
      modDamageTaken: function (bt, act, move, atk, eff) {
        if (move.t !== RESIST_BERRIES[id]) return 1;
        if (RESIST_BERRIES[id] !== 'Normal' && eff <= 1) return 1;
        bt.say(bt.name(act) + ' schwächt den Treffer mit einer Beere ab!', 'item', { side: act.side.id });
        bt.consumeItem(act);
        return 0.5;
      }
    };
  });

  /* ================================================= Attackenregeln ======== */

  var M = {};

  function weightBP(kg) {
    return kg >= 200 ? 120 : kg >= 100 ? 100 : kg >= 50 ? 80 : kg >= 25 ? 60 : kg >= 10 ? 40 : 20;
  }

  M.acrobatics = { bp: function (bt, a) { return a.item ? 55 : 110; } };
  M.brine = { bp: function (bt, a, d, m) { return bt.hpFraction(d) <= 0.5 ? 130 : 65; } };
  M.facade = { bp: function (bt, a, d, m) { return a.mon.status ? 140 : 70; } };
  M.hex = { bp: function (bt, a, d) { return d.mon.status ? 130 : 65; } };
  M.infernalparade = M.hex;
  M.barbbarrage = { bp: function (bt, a, d) { return /psn|tox/.test(d.mon.status || '') ? 120 : 60; } };
  M.venoshock = { bp: function (bt, a, d) { return /psn|tox/.test(d.mon.status || '') ? 130 : 65; } };
  M.avalanche = { bp: function (bt, a) { return a.damagedThisTurn > 0 ? 120 : 60; } };
  M.revenge = M.avalanche;
  M.assurance = { bp: function (bt, a, d) { return d.damagedThisTurn > 0 ? 120 : 60; } };
  M.payback = { bp: function (bt, a, d) { return d.movedThisTurn ? 100 : 50; } };
  M.lashout = { bp: function (bt, a) { return a.vol.loweredThisTurn ? 150 : 75; } };
  M.storedpower = {
    bp: function (bt, a) {
      var n = 0, k;
      for (k in a.boosts) if (a.boosts[k] > 0) n += a.boosts[k];
      return 20 + 20 * n;
    }
  };
  M.powertrip = M.storedpower;
  M.electroball = {
    bp: function (bt, a, d) {
      var r = bt.statOf(a, 'spe') / Math.max(1, bt.statOf(d, 'spe'));
      return r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40;
    }
  };
  M.gyroball = {
    bp: function (bt, a, d) {
      return clamp(Math.floor(25 * bt.statOf(d, 'spe') / Math.max(1, bt.statOf(a, 'spe'))), 1, 150);
    }
  };
  M.lowkick = { bp: function (bt, a, d) { return weightBP(d.species.wt); } };
  M.grassknot = M.lowkick;
  M.heavyslam = {
    bp: function (bt, a, d) {
      var r = a.species.wt / Math.max(0.1, d.species.wt);
      return r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40;
    }
  };
  M.heatcrash = M.heavyslam;
  M.flail = {
    bp: function (bt, a) {
      var p = bt.hpFraction(a) * 48;
      return p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20;
    }
  };
  M.reversal = M.flail;
  M.eruption = { bp: function (bt, a) { return Math.max(1, Math.floor(150 * bt.hpFraction(a))); } };
  M.waterspout = M.eruption;
  M.dragonenergy = M.eruption;
  M.weatherball = {
    type: function (bt) {
      var w = bt.weatherActive();
      return w === 'sunnyday' ? 'Fire' : w === 'raindance' ? 'Water' :
        w === 'sandstorm' ? 'Rock' : /snowscape|hail/.test(w || '') ? 'Ice' : 'Normal';
    },
    bp: function (bt) { return bt.weatherActive() ? 100 : 50; }
  };
  M.terrainpulse = {
    type: function (bt) {
      var t = bt.field.terrain;
      return t === 'electricterrain' ? 'Electric' : t === 'grassyterrain' ? 'Grass' :
        t === 'mistyterrain' ? 'Fairy' : t === 'psychicterrain' ? 'Psychic' : 'Normal';
    },
    bp: function (bt) { return bt.field.terrain ? 100 : 50; }
  };
  M.risingvoltage = { bp: function (bt, a, d) { return (bt.field.terrain === 'electricterrain' && bt.grounded(d)) ? 140 : 70; } };
  M.expandingforce = { bp: function (bt, a) { return bt.field.terrain === 'psychicterrain' ? 120 : 80; } };
  M.psyblade = { bp: function (bt, a) { return bt.field.terrain === 'electricterrain' ? 120 : 80; } };
  M.terablast = {
    type: function (bt, a) { return a.tera ? a.mon.tera : 'Normal'; },
    bp: function () { return 80; }
  };
  M.freezedry = {
    mod: function (bt, a, d, m, eff) { return d.types.indexOf('Water') >= 0 ? 4 : 1; }
  };
  M.flyingpress = {
    mod: function (bt, a, d) { return bt.effectiveness('Flying', d, null, a); }
  };
  M.collisioncourse = { mod: function (bt, a, d, m, eff) { return eff > 1 ? 1.33 : 1; } };
  M.electrodrift = M.collisioncourse;
  M.fishiousrend = { bp: function (bt, a, d) { return d.movedThisTurn ? 85 : 170; } };
  M.boltbeak = M.fishiousrend;
  M.knockoff = {
    bp: function (bt, a, d) { return d.item ? 97 : 65; },
    onHit: function (bt, a, d, move, total) {
      if (holdsTight(bt, d)) { bt.say(bt.name(d) + ' hält seinen Gegenstand fest.', 'ability', { side: d.side.id }); return; }
      if (total > 0 && d.item && d.mon.hp > 0) {
        bt.say(bt.name(d) + ' verliert ' + PL.items.label(d.item) + '!', 'item', { side: d.side.id });
        d.item = null; d.mon.item = null;
      }
    }
  };
  M.ragefist = { bp: function (bt, a) { return Math.min(350, 50 + 50 * (a.vol.hitCount || 0)); } };
  M.lastrespects = { bp: function (bt, a) { return Math.min(500, 50 + 50 * a.side.fainted); } };
  M.trumpcard = { bp: function () { return 80; } };
  M.roundhouse = null;

  M.fakeout = {
    beforeMove: function (bt, a) {
      if (a.turnsActive > 0) { bt.say('Es klappt nur direkt nach dem Wechsel.', 'text', {}); return false; }
      return true;
    }
  };
  M.firstimpression = M.fakeout;
  M.suckerpunch = {
    beforeMove: function (bt, a, d) {
      var foeAction = bt.plannedActions && bt.plannedActions[d.side.id];
      if (!foeAction || foeAction.type !== 'move' || d.movedThisTurn) {
        bt.say('Es klappt nicht.', 'text', {});
        return false;
      }
      var m = dex.move(d.mon.moves[foeAction.index].m);
      if (m.c === 'T') { bt.say('Es klappt nicht.', 'text', {}); return false; }
      return true;
    }
  };
  M.thunderclap = M.suckerpunch;
  M.upperhand = M.suckerpunch;

  M.seismictoss = { fixed: function (bt, a) { return a.mon.lvl; } };
  M.nightshade = M.seismictoss;
  M.superfang = { fixed: function (bt, a, d) { return Math.max(1, Math.floor(d.mon.hp / 2)); } };
  M.naturesmadness = M.superfang;
  M.rulingwater = M.superfang;
  M.endeavor = {
    fixed: function (bt, a, d) { return Math.max(0, d.mon.hp - a.mon.hp); },
    beforeMove: function (bt, a, d) {
      if (a.mon.hp >= d.mon.hp) { bt.say('Es klappt nicht.', 'text', {}); return false; }
      return true;
    }
  };
  M.finalgambit = {
    fixed: function (bt, a) { return a.mon.hp; },
    onHit: function (bt, a) { bt.damage(a, a.mon.hp, { ignoreSub: true, trueDamage: true }); }
  };
  M.counter = {
    fixed: function (bt, a, d) { return a.vol.lastPhysicalHit ? a.vol.lastPhysicalHit * 2 : 0; },
    beforeMove: function (bt, a) {
      if (!a.vol.lastPhysicalHit) { bt.say('Es klappt nicht.', 'text', {}); return false; }
      return true;
    }
  };
  M.mirrorcoat = {
    fixed: function (bt, a) { return a.vol.lastSpecialHit ? a.vol.lastSpecialHit * 2 : 0; },
    beforeMove: function (bt, a) {
      if (!a.vol.lastSpecialHit) { bt.say('Es klappt nicht.', 'text', {}); return false; }
      return true;
    }
  };
  M.metalburst = {
    fixed: function (bt, a) { return Math.floor(((a.vol.lastPhysicalHit || 0) + (a.vol.lastSpecialHit || 0)) * 1.5); },
    beforeMove: function (bt, a) {
      if (!a.vol.lastPhysicalHit && !a.vol.lastSpecialHit) { bt.say('Es klappt nicht.', 'text', {}); return false; }
      return true;
    }
  };

  M.painsplit = {
    onHit: function (bt, a, d) {
      var avg = Math.floor((a.mon.hp + d.mon.hp) / 2);
      a.mon.hp = Math.min(bt.maxHP(a), avg);
      d.mon.hp = Math.min(bt.maxHP(d), avg);
      bt.say('Die KP werden geteilt!', 'text', {});
      bt.log.push({ k: 'damage', side: a.side.id, amount: 0, hp: a.mon.hp, max: bt.maxHP(a), s: '' });
      bt.log.push({ k: 'damage', side: d.side.id, amount: 0, hp: d.mon.hp, max: bt.maxHP(d), s: '' });
    }
  };
  M.bellydrum = {
    onHit: function (bt, a) {
      var cost = Math.floor(bt.maxHP(a) / 2);
      if (a.mon.hp <= cost || a.boosts.atk >= 6) { bt.say('Es klappt nicht.', 'text', {}); return; }
      bt.damage(a, cost, { ignoreSub: true, trueDamage: true });
      a.boosts.atk = 6;
      bt.say(bt.name(a) + ' maximiert seinen Angriff!', 'boost', { side: a.side.id, stat: 'atk', delta: 6 });
    }
  };
  M.filletaway = {
    onHit: function (bt, a) {
      var cost = Math.floor(bt.maxHP(a) / 2);
      if (a.mon.hp <= cost) { bt.say('Es klappt nicht.', 'text', {}); return; }
      bt.damage(a, cost, { ignoreSub: true, trueDamage: true });
      bt.boost(a, { atk: 2, spa: 2, spe: 2 }, a);
    }
  };
  M.clangoroussoul = {
    onHit: function (bt, a) {
      var cost = Math.floor(bt.maxHP(a) / 3);
      if (a.mon.hp <= cost) { bt.say('Es klappt nicht.', 'text', {}); return; }
      bt.damage(a, cost, { ignoreSub: true, trueDamage: true });
      bt.boost(a, { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, a);
    }
  };
  M.rest = {
    beforeMove: function (bt, a) {
      if (a.mon.hp >= bt.maxHP(a) && a.mon.status !== 'slp') {
        bt.say('Es klappt nicht — die KP sind bereits voll.', 'text', {});
        return false;
      }
      return true;
    },
    onHit: function (bt, a) {
      a.mon.hp = bt.maxHP(a);
      a.mon.status = 'slp';
      a.mon.slp = 2;
      bt.log.push({ k: 'heal', side: a.side.id, amount: 0, hp: a.mon.hp, max: bt.maxHP(a), s: '' });
      bt.say(bt.name(a) + ' schläft und wird kerngesund!', 'status', { side: a.side.id, status: 'slp' });
    }
  };
  M.haze = {
    onHit: function (bt, a, d) {
      [a, d].forEach(function (x) {
        if (!x) return;
        for (var k in x.boosts) x.boosts[k] = 0;
      });
      bt.say('Alle Statusveränderungen wurden aufgehoben!', 'text', {});
    }
  };
  M.rapidspin = {
    onHit: function (bt, a) {
      var h = a.side.hazards, any = false, k;
      for (k in h) if (h[k]) { h[k] = 0; any = true; }
      if (a.vol.partiallytrapped) { delete a.vol.partiallytrapped; any = true; }
      if (a.vol.leechseed) { delete a.vol.leechseed; any = true; }
      if (any) bt.say('Die Fallen auf der eigenen Seite wurden beseitigt!', 'text', { side: a.side.id });
    }
  };
  M.defog = {
    onHit: function (bt, a, d) {
      var k, any = false;
      [a.side, d.side].forEach(function (s) {
        for (k in s.hazards) if (s.hazards[k]) { s.hazards[k] = 0; any = true; }
        for (k in s.screens) if (s.screens[k] && k !== 'tailwind') { s.screens[k] = 0; any = true; }
      });
      if (bt.field.terrain) { bt.field.terrain = null; any = true; }
      if (any) bt.say('Das Feld wurde freigepustet!', 'text', {});
    }
  };
  M.icespinner = {
    onHit: function (bt) { if (bt.field.terrain) { bt.field.terrain = null; bt.say('Das Feld wurde zertreten!', 'field', { terrain: null }); } }
  };
  M.healbell = {
    onHit: function (bt, a) {
      a.side.team.forEach(function (m) { m.status = null; m.slp = 0; });
      bt.say('Das ganze Team wird von Statusproblemen geheilt!', 'text', { side: a.side.id });
    }
  };
  M.aromatherapy = M.healbell;
  M.junglehealing = {
    onHit: function (bt, a) {
      bt.healAct(a, Math.floor(bt.maxHP(a) / 4), false, 'Dschungelheilung');
      bt.cureStatus(a, true);
    }
  };
  M.explosion = {
    beforeMove: function (bt, a, d) {
      var ab = d && bt.effects.abilities[bt.abilityId(d)];
      if (ab && ab.blocksBoom) {
        bt.say(bt.name(d) + ' erstickt die Explosion!', 'ability', { side: d.side.id });
        return false;
      }
      return true;
    },
    onHit: function (bt, a) {
      bt.say(bt.name(a) + ' opfert sich!', 'text', { side: a.side.id });
      bt.damage(a, a.mon.hp, { ignoreSub: true, trueDamage: true });
    }
  };
  M.selfdestruct = M.explosion;
  M.mistyexplosion = M.explosion;
  M.memento = {
    onHit: function (bt, a, d) {
      bt.boost(d, { atk: -2, spa: -2 }, a);
      bt.damage(a, a.mon.hp, { ignoreSub: true, trueDamage: true });
    }
  };
  /** Klebehülle & Co.: der Gegenstand lässt sich nicht abnehmen. */
  function holdsTight(bt, act) {
    var ab = act && bt.effects.abilities[bt.abilityId(act)];
    return !!(ab && ab.keepsItem);
  }

  M.trick = {
    onHit: function (bt, a, d) {
      if (holdsTight(bt, d)) { bt.say(bt.name(d) + ' hält seinen Gegenstand fest.', 'ability', { side: d.side.id }); return; }
      var tmp = a.item;
      a.item = d.item; a.mon.item = d.item;
      d.item = tmp; d.mon.item = tmp;
      bt.say('Die Gegenstände wurden getauscht!', 'item', {});
    }
  };
  M.switcheroo = M.trick;
  M.perishsong = {
    onHit: function (bt, a, d) {
      [a, d].forEach(function (x) { if (x && !x.vol.perish) x.vol.perish = { turns: 3 }; });
      bt.say('Alle hören den Abgesang!', 'text', {});
    }
  };
  M.taunt = { onHit: function (bt, a, d) { bt.addVolatile(d, 'taunt', a); } };
  M.encore = { onHit: function (bt, a, d) { bt.addVolatile(d, 'encore', a); } };
  M.disable = { onHit: function (bt, a, d) { bt.addVolatile(d, 'disable', a); } };
  M.leechseed = { onHit: function (bt, a, d) { bt.addVolatile(d, 'leechseed', a); } };
  M.yawn = { onHit: function (bt, a, d) { bt.addVolatile(d, 'yawn', a); } };
  M.saltcure = { onHit: function (bt, a, d) { if (d.mon.hp > 0) bt.addVolatile(d, 'saltcure', a); } };
  M.curse = {
    onHit: function (bt, a, d) {
      if (a.types.indexOf('Ghost') >= 0) {
        bt.damage(a, Math.floor(bt.maxHP(a) / 2), { ignoreSub: true, trueDamage: true });
        bt.addVolatile(d, 'curse', a);
      } else {
        bt.boost(a, { atk: 1, def: 1, spe: -1 }, a);
      }
    }
  };
  M.destinybond = { onHit: function (bt, a) { a.vol.destinybond = true; } };
  M.endure = { onHit: function (bt, a) { a.vol.endure = true; } };
  M.focusenergy = { onHit: function (bt, a) { a.vol.focusenergy = true; } };
  M.aquaring = { onHit: function (bt, a) { a.vol.aquaring = true; } };
  M.struggle = { mod: function () { return 1; } };

  /* --- Zwei-Runden- und Sonderattacken, die eigene Regeln brauchen ---------- */

  // Auroraschleier hält nur, solange Schnee oder Hagel liegt.
  M.auroraveil = {
    beforeMove: function (bt) {
      var w = bt.weatherActive();
      if (w === 'snowscape' || w === 'hail') return true;
      bt.say('Dafür müsste es schneien.', 'text', {});
      return false;
    }
  };

  // Heilattacken, deren Menge vom Wetter abhängt. Die Engine kennt die
  // Sonderfälle schon — hier fehlt nur der Anstoß, weil die Daten kein
  // festes Heilmaß mitbringen.
  function weatherHeal(kind) {
    return {
      onHit: function (bt, a) {
        var w = bt.weatherActive(), max = bt.maxHP(a), amount;
        if (kind === 'sand') amount = (w === 'sandstorm') ? Math.floor(max * 2 / 3) : Math.floor(max / 2);
        else if (w === 'sunnyday') amount = Math.floor(max * 2 / 3);
        else if (w) amount = Math.floor(max / 4);
        else amount = Math.floor(max / 2);
        if (a.mon.hp >= max) { bt.say('Es klappt nicht — die KP sind bereits voll.', 'text', {}); return; }
        bt.healAct(a, amount, false, 'Erholung');
      }
    };
  }
  M.synthesis = weatherHeal('sun');
  M.moonlight = weatherHeal('sun');
  M.morningsun = weatherHeal('sun');
  M.shoreup = weatherHeal('sand');

  M.strengthsap = {
    onHit: function (bt, a, d) {
      var amount = bt.statOf(d, 'atk');
      if (bt.boost(d, { atk: -1 }, a) <= 0) { bt.say('Es klappt nicht.', 'text', {}); return; }
      bt.healAct(a, amount, false, 'Kraftabsauger');
    }
  };

  M.refresh = {
    onHit: function (bt, a) {
      if (!a.mon.status) { bt.say('Es ist nichts passiert.', 'text', {}); return; }
      bt.cureStatus(a);
      bt.say(bt.name(a) + ' fühlt sich wieder wohl.', 'heal', { side: a.side.id });
    }
  };

  M.psychup = {
    onHit: function (bt, a, d) {
      var k, copied = false;
      for (k in d.boosts) if (d.boosts[k] !== a.boosts[k]) { a.boosts[k] = d.boosts[k]; copied = true; }
      bt.say(copied ? bt.name(a) + ' kopiert die Statusveränderungen!' : 'Es ist nichts passiert.',
        'boost', { side: a.side.id });
    }
  };

  M.topsyturvy = {
    onHit: function (bt, a, d) {
      var k, any = false;
      for (k in d.boosts) if (d.boosts[k]) { d.boosts[k] = -d.boosts[k]; any = true; }
      bt.say(any ? bt.name(d) + ': Alle Veränderungen kehren sich um!' : 'Es ist nichts passiert.',
        'boost', { side: d.side.id });
    }
  };

  M.soak = {
    onHit: function (bt, a, d) {
      if (d.types.length === 1 && d.types[0] === 'Water') { bt.say('Es ist nichts passiert.', 'text', {}); return; }
      d.types = ['Water'];
      bt.say(bt.name(d) + ' wird zum Wasser-Pokémon!', 'text', { side: d.side.id });
    }
  };

  function trap(name) {
    return {
      onHit: function (bt, a, d) {
        if (d.vol.trapped) { bt.say('Es ist nichts passiert.', 'text', {}); return; }
        d.vol.trapped = true;
        bt.say(bt.name(d) + ' kann nicht mehr fliehen!', 'text', { side: d.side.id });
      }
    };
  }
  M.block = trap();
  M.meanlook = trap();
  M.spiderweb = trap();

  M.acupressure = {
    onHit: function (bt, a) {
      var open = PL.battleInternals.BOOSTABLE.filter(function (k) { return (a.boosts[k] || 0) < 6; });
      if (!open.length) { bt.say('Es ist nichts passiert.', 'text', {}); return; }
      var pick = open[bt.rng.int(open.length)], b = {};
      b[pick] = 2;
      bt.boost(a, b, a);
    }
  };

  M.venomdrench = {
    onHit: function (bt, a, d) {
      if (!/psn|tox/.test(d.mon.status || '')) { bt.say('Es klappt nicht.', 'text', {}); return; }
      bt.boost(d, { atk: -1, spa: -1, spe: -1 }, a);
    }
  };

  M.takeheart = {
    onHit: function (bt, a) {
      if (a.mon.status) bt.cureStatus(a);
      bt.boost(a, { spa: 1, spd: 1 }, a);
    }
  };

  M.tidyup = {
    onHit: function (bt, a) {
      [bt.sides[0], bt.sides[1]].forEach(function (side) {
        side.hazards.stealthrock = 0;
        side.hazards.spikes = 0;
        side.hazards.toxicspikes = 0;
        side.hazards.stickyweb = 0;
      });
      [a, a.side.other.active].forEach(function (act) { if (act) delete act.vol.substitute; });
      bt.say('Das Feld wird aufgeräumt!', 'side', {});
      bt.boost(a, { atk: 1, spe: 1 }, a);
    }
  };

  M.courtchange = {
    onHit: function (bt) {
      var a = bt.sides[0], b = bt.sides[1], h = a.hazards, sc = a.screens;
      a.hazards = b.hazards; b.hazards = h;
      a.screens = b.screens; b.screens = sc;
      bt.say('Die Seiten werden getauscht!', 'side', {});
    }
  };

  // Attacken, die selbst wieder Attacken aufrufen — sonst dreht sich das im Kreis.
  var CALLER_SKIP = {
    metronome: 1, sleeptalk: 1, assist: 1, copycat: 1, mefirst: 1, mirrormove: 1,
    naturepower: 1, sketch: 1, transform: 1, struggle: 1, revivalblessing: 1
  };
  // Zwei-Runden-Attacken taugen nicht als Zufallsgriff — sie blieben hängen.
  var M_CHARGE = {
    fly: 1, dig: 1, dive: 1, bounce: 1, phantomforce: 1, shadowforce: 1, skydrop: 1,
    solarbeam: 1, solarblade: 1, razorwind: 1, skullbash: 1, skyattack: 1,
    freezeshock: 1, iceburn: 1, meteorbeam: 1, electroshot: 1, geomancy: 1,
    futuresight: 1, doomdesire: 1, bide: 1
  };

  // Schlafrede: greift blind auf eine der übrigen Attacken zurück.
  M.sleeptalk = {
    beforeMove: function (bt, a) {
      if (a.mon.status !== 'slp') { bt.say('Es klappt nur im Schlaf.', 'text', {}); return false; }
      return true;
    },
    onHit: function (bt, a) {
      var usable = a.mon.moves.filter(function (mv) {
        var m = dex.move(mv.m);
        return m && m.id !== 'sleeptalk' && !CALLER_SKIP[m.id] && !M_CHARGE[m.id];
      });
      if (!usable.length) { bt.say('Es ist nichts passiert.', 'text', {}); return; }
      var pick = dex.move(usable[bt.rng.int(usable.length)].m);
      bt.useMove(a, { move: pick }, { free: true, locked: true, forced: true });
    }
  };

  // Metronom: irgendeine Attacke aus dem gesamten Vorrat.
  M.metronome = {
    onHit: function (bt, a) {
      var pool = dex.moves.filter(function (m) {
        return !m.np && !CALLER_SKIP[m.id] && !M_CHARGE[m.id] && m.id !== 'metronome';
      });
      var pick = pool[bt.rng.int(pool.length)];
      bt.say('Der Finger zeigt auf ' + pick.n + '!', 'text', { side: a.side.id });
      bt.useMove(a, { move: pick }, { free: true, locked: true, forced: true });
    }
  };

  // Wiederbelebung: holt ein besiegtes Teammitglied mit halben KP zurück.
  M.revivalblessing = {
    onHit: function (bt, a) {
      var team = a.side.team, i, fallen = [];
      for (i = 0; i < team.length; i++) if (team[i].hp <= 0) fallen.push(team[i]);
      if (!fallen.length) { bt.say('Es ist niemand da, der zurückkäme.', 'text', {}); return; }
      var mon = fallen[0];
      mon.hp = Math.max(1, Math.floor(PL.mon.maxHP(mon) / 2));
      mon.status = null;
      bt.say(PL.mon.name(mon) + ' kehrt zurück!', 'heal', { side: a.side.id });
    }
  };

  /* ---------- Ausgabe ------------------------------------------------------- */

  // Nicht belegte Fähigkeiten bekommen einen leeren Eintrag, damit Abfragen
  // wie bt.abilityOf(act) verlässlich ein Objekt oder null liefern.
  Object.keys(A).forEach(function (k) { if (!A[k]) delete A[k]; });

  PL.effects = { abilities: A, items: I, moves: M, typeItems: TYPE_ITEMS, resistBerries: RESIST_BERRIES };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.effects;
})(typeof globalThis !== 'undefined' ? globalThis : this);
