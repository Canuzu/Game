/* =============================================================================
 * autopilot.js — Entscheidungen außerhalb des Kampfes
 * -----------------------------------------------------------------------------
 * Der Reise-Automat: Welchen Weg nehme ich, was fange ich, was kaufe ich, was
 * lerne ich? Hier steht nur das Urteil — reine Funktionen ohne Oberfläche und
 * ohne Nebenwirkungen. Die Oberfläche (app.js) fragt sie und drückt dann
 * dieselben Knöpfe, die auch von Hand gedrückt würden; tools/balance.mjs und
 * die Tests benutzen genau dieselben Funktionen.
 *
 * Der Kampf selbst gehört ai.js — der Automat schaltet dort den Auto-Kampf ein
 * und lässt ihn machen.
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.Run) require('./run.js');
    if (!PL.ai) require('./ai.js');
  }
  var dex = PL.dex, mons = PL.mon;

  /* ---------- 1) Zustand des Runs ------------------------------------------ */

  /** Wie schwer ist das Team angeschlagen? 0 = topfit, 1 = alle am Boden. */
  function hurt(run) {
    if (!run.party.length) return 0;
    var sum = 0;
    run.party.forEach(function (m) { sum += Math.max(0, m.hp) / mons.maxHP(m); });
    return 1 - sum / run.party.length;
  }

  /** Heilmittel im Beutel, grob gezählt. */
  function supplies(run, kind) {
    var n = 0;
    Object.keys(run.bag).forEach(function (id) {
      var it = PL.items.get(id);
      if (it && it.kind === kind) n += run.bag[id];
    });
    return n;
  }

  /** Wie viel Level fehlen dem Team bis zur Grenze? */
  function levelGap(run) {
    return Math.max(0, run.levelCap - run.teamLevel());
  }

  /** Die Typen, die im Team schon vertreten sind. */
  function teamTypes(run) {
    var seen = {};
    run.party.forEach(function (m) {
      dex.sp(m.sp).t.forEach(function (t) { seen[t] = (seen[t] || 0) + 1; });
    });
    return seen;
  }

  /* ---------- 2) Der Weg ---------------------------------------------------- */

  var NODE_BASE = {
    rest: 30, catch: 40, relic: 78, shop: 44, item: 44, event: 40,
    wild: 34, trainer: 44, elite: 50, rival: 60, boss: 100, e4: 100, champ: 100
  };

  /**
   * Was ist dieser Knoten dem Team gerade wert? Derselbe Knoten ist mit
   * halbem Team etwas ganz anderes als mit vollem.
   */
  function nodeValue(run, node) {
    var v = NODE_BASE[node.type] !== undefined ? NODE_BASE[node.type] : 40;
    var wounded = hurt(run), gap = levelGap(run);
    switch (node.type) {
      case 'rest':
        v += wounded * 150;
        if (supplies(run, 'heal') < 3) v += 25;
        break;
      case 'catch':
        if (run.party.length < 6) v += 60;
        if (run.nuzlocke && run.regionCatches > 0) v = 10;   // hier ist nichts zu holen
        break;
      case 'shop':
        v += Math.min(45, run.money / 110);
        if (supplies(run, 'heal') < 3) v += 30;
        if (supplies(run, 'ball') < 3) v += 12;
        break;
      case 'item':
        if (supplies(run, 'heal') < 3) v += 20;
        break;
      case 'wild': case 'trainer': case 'elite': case 'rival':
        // Erfahrung zählt genau so lange, wie noch Luft bis zur Grenze ist.
        v += Math.min(60, gap * 9);
        v -= wounded * 60;
        if (node.type === 'elite') v -= gap > 4 ? 35 : 0;    // zu früh ist zu hart
        break;
      case 'relic':
        v -= wounded * 20;
        break;
      default: break;
    }
    return v;
  }

  /**
   * Bewertet den ganzen Rest der Karte rückwärts: Der Wert eines Knotens ist
   * sein eigener plus der beste Weg, der von ihm weggeht. So wird nicht der
   * nächste hübsche Knoten gewählt, sondern der Anfang des besten Wegs.
   * Späteres zählt weniger — bis dahin kann viel passieren.
   */
  function pathValues(run) {
    var map = run.map || [], val = [], r, c;
    for (r = 0; r < map.length; r++) val.push([]);
    for (r = map.length - 1; r >= 0; r--) {
      for (c = 0; c < map[r].length; c++) {
        var node = map[r][c], ahead = 0;
        (node.next || []).forEach(function (nc) {
          var w = val[r + 1] && val[r + 1][nc];
          if (w !== undefined && w > ahead) ahead = w;
        });
        val[r][c] = nodeValue(run, node) + ahead * 0.8;
      }
    }
    return val;
  }

  /** Der nächste Knoten auf dem besten Weg — oder null. */
  function bestNode(run) {
    var open = run.available();
    if (!open.length) return null;
    var val = pathValues(run), best = null, bestScore = -Infinity;
    open.forEach(function (o) {
      var sc = (val[o.row] && val[o.row][o.col]) || 0;
      if (sc > bestScore) { bestScore = sc; best = o; }
    });
    return best;
  }

  /* ---------- 3) Begegnungen ------------------------------------------------ */

  /** Was ist dieses Pokémon für das Team wert? */
  function monScore(run, mon, types) {
    var sp = dex.sp(mon.sp);
    var s = PL.ai.potential(sp) * 0.55 + mon.lvl * 1.5;
    if (mon.shiny) s += 80;
    if (dex.isLegendary(sp)) s += 40;
    // Ein Typ, den sonst niemand hat, schließt eine Lücke.
    sp.t.forEach(function (t) { if (!types[t]) s += 28; });
    // Wer sich noch entwickeln kann, wird später stärker, als er heute aussieht.
    if (dex.evosLeft(sp) > 0 && mon.lvl < run.levelCap - 4) s += 15;
    return s;
  }

  /** Welches Angebot nimmt der Automat? -1 heißt: keines. */
  function pickCatch(run, scene) {
    if (!scene.offers || !scene.offers.length || scene.locked) return -1;
    var types = teamTypes(run), best = -1, bestScore = -Infinity;
    scene.offers.forEach(function (mon, i) {
      var sc = monScore(run, mon, types);
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return best;
  }

  /* ---------- 4) Gegenstände ------------------------------------------------ */

  /** Wie dringend braucht das Team diesen Gegenstand? */
  function itemWant(run, item) {
    if (!item) return 0;
    var w = 20 + Math.min(40, (item.price || 0) / 90);
    if (item.kind === 'heal') {
      var have = supplies(run, 'heal');
      w = 120 - have * 14;
      if (/revive/.test(item.id)) w = 100 - have * 8;
    } else if (item.kind === 'ball') {
      var balls = supplies(run, 'ball');
      w = 70 - balls * 7;
      if (item.id === 'masterball') w = 150;
    } else if (item.kind === 'status') {
      w = 45 - supplies(run, 'status') * 10;
    } else if (item.kind === 'evo') {
      // Ein Entwicklungsstein ist viel wert — aber nur, wenn er zu jemandem passt.
      w = 15;
      run.party.forEach(function (m) {
        mons.evolutions(m, {}).forEach(function (e) {
          if (e.item && PL.util.toID(e.item) === item.id) w = 140;
        });
      });
    } else if (item.kind === 'hold') {
      // Getragenes wirkt nur, wenn jemand freie Hände hat.
      var free = run.party.filter(function (m) { return !m.item; }).length;
      w = free ? 55 + Math.min(35, (item.price || 0) / 90) : 20;
    } else if (item.kind === 'boost') {
      w = 30;
    }
    return Math.max(1, w);
  }

  /** Welches Fundstück nimmt der Automat? */
  function pickItem(run, scene) {
    if (!scene.offers || !scene.offers.length) return -1;
    var best = 0, bestScore = -Infinity;
    scene.offers.forEach(function (it, i) {
      var sc = itemWant(run, it);
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return best;
  }

  /* ---------- 5) Relikte ---------------------------------------------------- */

  // Was eine Reliktwirkung über einen ganzen Run wert ist. Alles, was hier
  // nicht steht, zählt als solide Mittelklasse.
  var RELIC_VALUE = {
    expMult: 95, healPerNode: 90, emergencyRevive: 95, healAfterBoss: 80,
    fullTeamStats: 85, evPerBattle: 70, evPerFloor: 65, koBoost: 70,
    moneyMult: 45, doubleReward: 75, extraReward: 60, extraPaths: 55,
    megaCharges: 60, firstTurnPriority: 70, ppPerNode: 55, autoCure: 60,
    hazardImmune: 40, weatherImmune: 35, statusNeverMiss: 45, typeBoost: 55,
    catchMult: 40, catchLevelBonus: 35, freeBalls: 30, timerBalls: 25,
    freeMasterball: 70, shinyMult: 15, luck: 45, scout: 25, reroll: 50,
    shopDiscount: 40, stoneDiscount: 30, shopHold: 35, benchExp: 60,
    evoEarly: 55, moveTutor: 40
  };

  function relicScore(run, relic) {
    var s = { haeufig: 15, selten: 30, episch: 55 }[relic.rarity] || 20;
    var mods = relic.mods || {};
    Object.keys(mods).forEach(function (k) {
      s += RELIC_VALUE[k] !== undefined ? RELIC_VALUE[k] : 40;
    });
    // Was man schon hat, bringt selten das Doppelte.
    if (run.relics && run.relics[relic.id]) s *= 0.3;
    return s;
  }

  function pickRelic(run, scene) {
    if (!scene.offers || !scene.offers.length) return -1;
    var best = 0, bestScore = -Infinity;
    scene.offers.forEach(function (r, i) {
      var sc = relicScore(run, r);
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return best;
  }

  function pickBlessing(run, scene) {
    if (!scene.offers || !scene.offers.length) return -1;
    return 0;
  }

  /* ---------- 6) Laden ------------------------------------------------------ */

  /**
   * Was gekauft wird, in dieser Reihenfolge. Gekauft wird, was das Team
   * wirklich braucht; Geld, das am Ende des Runs übrig ist, hat niemandem
   * geholfen — ein kleiner Rest bleibt trotzdem für den nächsten Laden.
   */
  function shopPlan(run, scene) {
    var money = run.money, plan = [];
    var entries = (scene.stock || []).map(function (e, i) {
      return { i: i, entry: e, want: itemWant(run, e.item) };
    });
    // Bester Nutzen je ausgegebenem Geld zuerst.
    entries.sort(function (a, b) {
      return (b.want / Math.max(1, b.entry.price)) - (a.want / Math.max(1, a.entry.price));
    });
    entries.forEach(function (row) {
      if (row.entry.sold) return;
      if (row.want < 30) return;                       // brauchen wir nicht
      if (row.entry.price > money) return;
      money -= row.entry.price;
      plan.push(row.i);
    });
    return plan;
  }

  /* ---------- 7) Rastplatz -------------------------------------------------- */

  /** Kann sich gerade jemand entwickeln? */
  function readyEvolutions(run) {
    var out = [];
    run.party.forEach(function (mon) {
      mons.evolutions(mon, { items: run.bag }).forEach(function (evo) {
        if (evo.ready) out.push({ mon: mon, evo: evo });
      });
    });
    return out;
  }

  function pickRest(run) {
    if (hurt(run) > 0.12) return 'heal';
    if (readyEvolutions(run).length) return 'evolve';
    if (levelGap(run) > 1) return 'train';
    return 'heal';
  }

  /* ---------- 8) Ereignisse ------------------------------------------------- */

  /**
   * Jede Ereignisoption trägt in world.js ein `auto`-Gewicht: wie gut der
   * Automat sie findet. Es darf auch eine Funktion sein, wenn die Antwort vom
   * Zustand des Runs abhängt.
   */
  function optionWeight(run, option) {
    if (!option || !option.enabled) return -1;
    var w = option.auto;
    if (typeof w === 'function') { try { w = w(run); } catch (e) { w = 5; } }
    return w === undefined ? 5 : w;
  }

  function pickEvent(run, scene) {
    if (!scene.options || !scene.options.length) return -1;
    var best = -1, bestScore = -Infinity;
    scene.options.forEach(function (o) {
      var sc = optionWeight(run, o);
      if (sc > bestScore) { bestScore = sc; best = o.index; }
    });
    return best;
  }

  /* ---------- 9) Attacken --------------------------------------------------- */

  /**
   * Welchen Platz räumt die neue Attacke? -1 heißt: die neue ist schlechter
   * als alles, was schon dasteht — dann wird sie nicht gelernt.
   */
  function learnSlot(mon, moveIndex) {
    var sp = dex.sp(mon.sp);
    var fresh = mons.moveValue(dex.move(moveIndex), sp, mon.lvl);
    var worst = -1, worstValue = Infinity;
    mon.moves.forEach(function (slot, i) {
      var v = mons.moveValue(dex.move(slot.m), sp, mon.lvl);
      if (v < worstValue) { worstValue = v; worst = i; }
    });
    return fresh > worstValue * 1.05 ? worst : -1;
  }

  /** Wer beim Lehrer etwas lernen sollte — und was. */
  function tutorPick(run, offersFor) {
    var best = null;
    run.party.forEach(function (mon) {
      var offers = offersFor(mon);
      var sp = dex.sp(mon.sp);
      offers.forEach(function (mi) {
        var gain = mons.moveValue(dex.move(mi), sp, mon.lvl);
        var slot = learnSlot(mon, mi);
        if (slot < 0 && mon.moves.length >= 4) return;
        if (!best || gain > best.gain) best = { mon: mon, move: mi, gain: gain, slot: slot };
      });
    });
    return best;
  }

  /* ---------- 10) Ein Knoten von Anfang bis Ende ---------------------------- */

  /**
   * Löst eine Szene ohne Oberfläche auf — für tools/balance.mjs und die Tests.
   * Die Oberfläche geht denselben Weg, nur mit Bildern und Pausen dazwischen.
   */
  function resolveScene(run, scene, hooks) {
    hooks = hooks || {};
    switch (scene.kind) {
      case 'battle':
        if (hooks.battle) hooks.battle(scene.battle);
        break;
      case 'catch': {
        var ci = pickCatch(run, scene);
        if (ci >= 0) run.takeOffer(scene.offers[ci]);
        break;
      }
      case 'item': {
        var ii = pickItem(run, scene);
        if (ii >= 0) {
          run.addItem(scene.offers[ii].id, 1);
          if (run.luckyDouble()) run.addItem(scene.offers[ii].id, 1);
        }
        break;
      }
      case 'relic': {
        var ri = pickRelic(run, scene);
        if (ri >= 0) run.takeRelic(scene.offers[ri].id);
        break;
      }
      case 'shop':
        shopPlan(run, scene).forEach(function (i) { run.buy(scene.stock[i]); });
        break;
      case 'rest': {
        var what = pickRest(run);
        if (what === 'evolve') {
          readyEvolutions(run).forEach(function (r) {
            if (r.evo.item && run.bag[PL.util.toID(r.evo.item)]) run.removeItem(PL.util.toID(r.evo.item), 1);
            mons.evolve(r.mon, r.evo.to, run.rng);
            run.stats.evolutions++;
          });
        } else {
          run.doRest(what);
        }
        break;
      }
      case 'event': {
        var oi = pickEvent(run, scene);
        if (oi >= 0) {
          var out = run.chooseEvent(oi);
          if (out && out.scene) resolveScene(run, out.scene, hooks);
        }
        break;
      }
      case 'blessing': {
        var bi = pickBlessing(run, scene);
        if (bi >= 0) {
          var res = run.takeBlessing(scene.offers[bi].id, run.rng);
          run.pendingBlessing = null;
          if (res && res.relicChoice) {
            resolveScene(run, run.makeRelicChoice(run.rng, res.relicChoice, res.text), hooks);
          }
        }
        break;
      }
      default: break;
    }
  }

  PL.autopilot = {
    hurt: hurt,
    supplies: supplies,
    levelGap: levelGap,
    nodeValue: nodeValue,
    pathValues: pathValues,
    bestNode: bestNode,
    monScore: monScore,
    pickCatch: pickCatch,
    itemWant: itemWant,
    pickItem: pickItem,
    relicScore: relicScore,
    pickRelic: pickRelic,
    pickBlessing: pickBlessing,
    shopPlan: shopPlan,
    readyEvolutions: readyEvolutions,
    pickRest: pickRest,
    pickEvent: pickEvent,
    learnSlot: learnSlot,
    tutorPick: tutorPick,
    resolveScene: resolveScene
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.autopilot;
})(typeof globalThis !== 'undefined' ? globalThis : this);
