/* =============================================================================
 * run.js — Ein Durchlauf: Karte, Knoten, Belohnungen, Fortschritt
 * -----------------------------------------------------------------------------
 * Der Run ist der Kern des Spiels. Er hält das Team, den Beutel, die Relikte
 * und die Karte, erzeugt Kämpfe und verteilt Belohnungen. Die Oberfläche liest
 * nur ab und ruft Methoden auf; hier drin steckt keine einzige DOM-Zeile.
 *
 * Ablauf:  Karte → Knoten betreten → Szene (Kampf, Laden, Ereignis, …)
 *          → Belohnung → zurück zur Karte → nächste Region → Liga
 *
 * Gliederung:  1) Anlegen   2) Karte   3) Knoten betreten   4) Kämpfe
 *              5) Belohnungen   6) Laden   7) Hilfen für Ereignisse
 *              8) Speichern
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.world) require('./world.js');
    if (!PL.Battle) require('./battle.js');
    if (!PL.ai) require('./ai.js');
  }
  var dex = PL.dex, mons = PL.mon, W = PL.world, clamp = PL.util.clamp;

  var MODES = {
    standard: { name: 'Standard', regions: 9, rows: 9, desc: 'Alle neun Regionen und danach die Liga.' },
    kurz: { name: 'Kurzrun', regions: 4, rows: 10, desc: 'Vier Regionen, dann direkt zur Liga.' },
    endlos: { name: 'Endlos', regions: 99, rows: 9, desc: 'Die Regionen wiederholen sich und werden härter.' },
    bossrush: { name: 'Boss-Rush', regions: 9, rows: 3, desc: 'Fast nur Arenaleiter. Kurz und brutal.' },
    taeglich: { name: 'Tages-Run', regions: 6, rows: 8, desc: 'Fester Startwert für alle: heute für jeden gleich.' }
  };

  var NODE_WEIGHTS = {
    wild: 34, trainer: 30, item: 8, event: 9, shop: 6, catch: 8, relic: 4, elite: 5
  };

  var NODE_INFO = {
    wild: { name: 'Wildes Pokémon', icon: '🌿', desc: 'Ein wildes Pokémon — fangen oder besiegen.' },
    trainer: { name: 'Trainerkampf', icon: '🎽', desc: 'Ein Trainer will kämpfen. Bringt Geld.' },
    elite: { name: 'Starker Trainer', icon: '⚔️', desc: 'Ein Ass-Trainer mit vollem Team. Gute Belohnung.' },
    catch: { name: 'Begegnung', icon: '🫱', desc: 'Ein Pokémon steht zur Wahl.' },
    item: { name: 'Fundstück', icon: '🎁', desc: 'Ein Gegenstand liegt bereit.' },
    shop: { name: 'Händler', icon: '🛒', desc: 'Kaufen und verkaufen.' },
    rest: { name: 'Rastplatz', icon: '🔥', desc: 'Heilen, entwickeln oder trainieren.' },
    event: { name: 'Ereignis', icon: '❓', desc: 'Etwas Ungewöhnliches.' },
    relic: { name: 'Schrein', icon: '🏛️', desc: 'Ein Relikt zur Auswahl.' },
    boss: { name: 'Arenaleiter', icon: '🏅', desc: 'Der Weg aus der Region führt nur hier hindurch.' },
    e4: { name: 'Top Vier', icon: '👑', desc: 'Ein Mitglied der Top Vier.' },
    champ: { name: 'Champ', icon: '🏆', desc: 'Das letzte Duell.' }
  };

  /* ---------- 1) Anlegen ------------------------------------------------------ */

  /**
   * opts: { seed, mode, ascension, nuzlocke, starter (Spezies-ID), meta }
   */
  function Run(opts) {
    opts = opts || {};
    this.version = 1;
    this.mode = MODES[opts.mode] ? opts.mode : 'standard';
    this.seed = opts.seed !== undefined ? opts.seed : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    this.ascension = opts.ascension || 0;
    this.nuzlocke = !!opts.nuzlocke;
    this.rng = PL.rng(this.seed);
    this.started = new Date().toISOString();

    this.party = [];
    this.box = [];
    this.bag = {};
    this.relics = {};
    this.money = 1200;
    this.region = 0;
    this.regionOrder = this.rng.shuffle(W.REGIONS.map(function (r, i) { return i; }));
    if (this.mode === 'standard' || this.mode === 'endlos') {
      this.regionOrder = W.REGIONS.map(function (r, i) { return i; });
    }
    this.leagueStage = -1;
    this.eliteUsed = {};
    this.stats = {
      battles: 0, wins: 0, catches: 0, faints: 0, kos: 0, turns: 0,
      moneyEarned: 0, spent: 0, evolutions: 0, shinies: 0, nodes: 0, relics: 0
    };
    this.history = [];
    this.pendingLevelUps = [];
    this.masterballUsed = false;
    this.freeRerollUsed = false;
    this.scene = null;
    this.state = 'map';
    this.result = null;

    this.addItem('pokeball', 5);
    this.addItem('potion', 4);
    this.addItem('revive', 1);
    if (opts.starter) {
      this.gainPokemon(this.rng, opts.starter, 8, 'Starter', {
        quality: 0.9, ivFloor: 14, hiddenChance: 0.2
      });
    }
    this.buildMap();
  }

  var R = Run.prototype;

  R.modeInfo = function () { return MODES[this.mode]; };

  Object.defineProperty(R, 'levelCap', {
    get: function () {
      if (this.leagueStage >= 0) return 78 + this.leagueStage * 4 + this.ascension * 2;
      var step = this.mode === 'kurz' ? 17 : 8;
      return Math.min(100, 8 + (this.regionsCleared() + 1) * step + this.ascension * 2);
    }
  });

  R.regionsCleared = function () { return this.region; };
  R.totalRegions = function () {
    var m = MODES[this.mode];
    return this.mode === 'endlos' ? 99 : Math.min(m.regions, W.REGIONS.length);
  };
  R.currentRegion = function () {
    return W.REGIONS[this.regionOrder[this.region % this.regionOrder.length]];
  };
  R.loop = function () { return Math.floor(this.region / W.REGIONS.length); };

  /** Zahlenwert aus allen Relikten (Multiplikatoren multiplizieren sich). */
  R.mod = function (key, base) {
    var v = base === undefined ? 0 : base, id, r;
    for (id in this.relics) {
      r = PL.relics.get(id);
      if (!r || !r.mods || r.mods[key] === undefined) continue;
      if (typeof r.mods[key] === 'number') v = base === undefined ? v + r.mods[key] : v * r.mods[key];
      else v = r.mods[key];
    }
    return v;
  };
  R.hasMod = function (key) {
    for (var id in this.relics) {
      var r = PL.relics.get(id);
      if (r && r.mods && r.mods[key]) return true;
    }
    return false;
  };
  R.typeBoosts = function () {
    var out = [], id, r;
    for (id in this.relics) {
      r = PL.relics.get(id);
      if (r && r.mods && r.mods.typeBoost) out.push(r.mods.typeBoost);
    }
    return out;
  };

  /* ---------- 2) Karte -------------------------------------------------------- */

  /**
   * Baut die Karte einer Region: Reihen mit ein bis drei Knoten, verbunden wie
   * ein Flussdelta. Jede Reihe ist nur von der vorigen aus erreichbar, und
   * jeder Knoten hat mindestens eine Verbindung nach vorn.
   */
  R.buildMap = function () {
    if (this.leagueStage >= 0) return this.buildLeague();
    var rng = this.rng.fork('map-' + this.region + '-' + this.seed);
    var rows = MODES[this.mode].rows;
    var map = [], r, i;

    for (r = 0; r < rows; r++) {
      var count;
      if (r === 0) count = 2;
      else if (r === rows - 1) count = 1;                 // Arenaleiter
      else if (r === rows - 2) count = 2;
      else count = rng.range(2, 3);
      var row = [];
      for (i = 0; i < count; i++) {
        row.push({
          row: r, col: i, count: count,
          type: 'wild', done: false, seed: rng.int(1e9)
        });
      }
      map.push(row);
    }

    // Knotenarten verteilen
    var mustHave = ['shop', 'relic'];
    // In der ersten Region beginnt der Weg mit zwei Begegnungen: mit einem
    // einzigen Starter endet ein Run sonst, bevor er angefangen hat. Beide
    // Startknoten bieten unterschiedliche Pokémon an — die Wahl zählt.
    var firstRegion = this.region === 0 && this.leagueStage < 0;
    if (firstRegion) mustHave.push('catch');
    var middleSlots = [];
    for (r = 1; r < rows - 1; r++) for (i = 0; i < map[r].length; i++) middleSlots.push(map[r][i]);
    rng.shuffle(middleSlots);

    map[rows - 1][0].type = 'boss';
    for (i = 0; i < map[rows - 2].length; i++) map[rows - 2][i].type = 'rest';
    for (i = 0; i < map[0].length; i++) {
      map[0][i].type = firstRegion ? 'catch' : (rng.chance(0.5) ? 'wild' : 'trainer');
    }

    var placed = 0;
    for (i = 0; i < middleSlots.length && placed < mustHave.length; i++) {
      if (middleSlots[i].type !== 'rest' && middleSlots[i].row > 0 && middleSlots[i].row < rows - 2) {
        middleSlots[i].type = mustHave[placed++];
        middleSlots[i].fixed = true;
      }
    }
    var pool = [];
    Object.keys(NODE_WEIGHTS).forEach(function (k) { pool.push({ k: k, w: NODE_WEIGHTS[k] }); });
    for (i = 0; i < middleSlots.length; i++) {
      var n = middleSlots[i];
      if (n.fixed || n.type === 'rest') continue;
      if (this.mode === 'bossrush') { n.type = rng.chance(0.6) ? 'elite' : 'trainer'; continue; }
      n.type = rng.weighted(pool).k;
    }

    // Verbindungen: jeder Knoten zeigt auf ein bis zwei Nachbarn der nächsten Reihe
    var self = this;
    for (r = 0; r < rows - 1; r++) {
      var next = map[r + 1];
      for (i = 0; i < map[r].length; i++) {
        var node = map[r][i];
        node.next = [];
        var centre = Math.round(i * (next.length - 1) / Math.max(1, map[r].length - 1));
        node.next.push(centre);
        if (next.length > 1 && rng.chance(self.hasMod('extraPaths') ? 0.9 : 0.55)) {
          var alt = clamp(centre + (rng.chance(0.5) ? -1 : 1), 0, next.length - 1);
          if (node.next.indexOf(alt) < 0) node.next.push(alt);
        }
      }
      // Kein Knoten der Folgereihe darf unerreichbar sein
      for (i = 0; i < next.length; i++) {
        var reachable = map[r].some(function (n) { return n.next.indexOf(i) >= 0; });
        if (!reachable) {
          var src = map[r][Math.min(i, map[r].length - 1)];
          src.next.push(i);
        }
      }
    }
    map[rows - 1][0].next = [];

    this.map = map;
    this.pos = null;                                       // noch keine Reihe betreten
    this.rowIndex = -1;
  };

  R.buildLeague = function () {
    var stages = [
      { type: 'rest' }, { type: 'e4' }, { type: 'e4' }, { type: 'rest' },
      { type: 'e4' }, { type: 'e4' }, { type: 'rest' }, { type: 'champ' }
    ];
    this.map = stages.map(function (s, i) {
      return [{ row: i, col: 0, count: 1, type: s.type, done: false, next: i < stages.length - 1 ? [0] : [], seed: i }];
    });
    this.pos = null;
    this.rowIndex = -1;
  };

  /** Welche Knoten darf der Spieler als Nächstes betreten? */
  R.available = function () {
    if (!this.map) return [];
    if (this.rowIndex < 0) return this.map[0].map(function (n, i) { return { row: 0, col: i }; });
    if (this.rowIndex >= this.map.length - 1) return [];
    var cur = this.map[this.rowIndex][this.pos.col];
    return (cur.next || []).map(function (c) { return { row: cur.row + 1, col: c }; });
  };

  R.nodeAt = function (row, col) { return this.map[row] && this.map[row][col]; };

  /* ---------- 3) Knoten betreten ---------------------------------------------- */

  /**
   * Betritt einen Knoten und liefert die Szene, die die Oberfläche zeigen soll.
   * Die Szene ist ein reines Datenobjekt: { kind, ... }.
   */
  R.enterNode = function (row, col) {
    var ok = this.available().some(function (a) { return a.row === row && a.col === col; });
    if (!ok) return null;
    var node = this.nodeAt(row, col);
    if (!node) return null;
    this.rowIndex = row;
    this.pos = { row: row, col: col };
    node.done = true;
    this.stats.nodes++;
    var rng = this.rng;

    // Relikte, die zwischen den Knoten wirken
    var heal = this.mod('healPerNode');
    if (heal) this.healTeam(heal, false);
    var pp = this.mod('ppPerNode');
    if (pp) this.restorePP(pp);

    switch (node.type) {
      case 'wild': return this.setScene({ kind: 'battle', battle: this.makeWild(rng), node: node });
      case 'trainer': return this.setScene({ kind: 'battle', battle: this.makeTrainer(rng), node: node });
      case 'elite': return this.setScene({ kind: 'battle', battle: this.makeTrainer(rng, { elite: true }), node: node });
      case 'boss': return this.setScene({ kind: 'battle', battle: this.makeBoss(rng), node: node });
      case 'e4': return this.setScene({ kind: 'battle', battle: this.makeElite(rng), node: node });
      case 'champ': return this.setScene({ kind: 'battle', battle: this.makeChampion(rng), node: node });
      case 'catch': return this.setScene(this.makeCatchOffer(rng));
      case 'item': return this.setScene(this.makeItemFind(rng));
      case 'shop': return this.setScene(this.makeShop(rng));
      case 'rest': return this.setScene({ kind: 'rest', options: this.restOptions() });
      case 'relic': return this.setScene(this.makeRelicChoice(rng, 3, 'Ein alter Schrein. Drei Kräfte stehen bereit.'));
      case 'event': return this.setScene(this.makeEvent(rng));
      default: return this.setScene({ kind: 'none' });
    }
  };

  R.setScene = function (scene) {
    this.scene = scene;
    this.state = scene.kind;
    return scene;
  };

  /** Zurück zur Karte; rückt gegebenenfalls in die nächste Region vor. */
  R.closeScene = function () {
    this.scene = null;
    this.state = 'map';
    if (this.rowIndex >= this.map.length - 1) this.advanceRegion();
    return this.state;
  };

  R.advanceRegion = function () {
    if (this.leagueStage >= 0) {
      this.state = 'victory';
      this.result = 'sieg';
      return;
    }
    this.region++;
    if (this.region >= this.totalRegions()) {
      this.leagueStage = 0;
      this.buildLeague();
      this.history.push({ t: 'liga', text: 'Die Liga öffnet ihre Tore.' });
    } else {
      this.buildMap();
      var reg = this.currentRegion();
      this.history.push({ t: 'region', text: 'Weiter nach ' + reg.name + '.' });
      var ev = this.mod('evPerFloor');
      if (ev) {
        var self = this;
        this.party.forEach(function (m) {
          var best = 'atk', i, v = 0;
          var st = mons.stats(m);
          for (i = 1; i < 6; i++) if (st[i] > v) { v = st[i]; best = PL.STATS[i]; }
          mons.addEVs(m, best, ev);
        });
      }
    }
  };

  /* ---------- 4) Kämpfe -------------------------------------------------------- */

  /** Durchschnittslevel des Teams — die Messlatte für alle Gegner. */
  R.teamLevel = function () {
    if (!this.party.length) return 5;
    var sum = 0, i;
    for (i = 0; i < this.party.length; i++) sum += this.party[i].lvl;
    return sum / this.party.length;
  };

  /**
   * Gegner ziehen mit dem Team mit statt sofort auf die Levelgrenze zu
   * springen. Wer trainiert, trifft auf stärkere Gegner — wer durchhetzt,
   * bleibt in seiner Liga.
   */
  R.enemyLevel = function (delta) {
    var base = this.teamLevel() + (delta || 0) + this.ascension;
    return clamp(Math.round(Math.min(base, this.levelCap)), 2, 100);
  };

  /**
   * Wie viele Pokémon ein Trainer aufbieten darf. Wer mit einem einzigen
   * Starter unterwegs ist, wird nicht von einem Sechserteam überrollt — das
   * Spiel wächst mit dem eigenen Team mit.
   */
  R.matchSize = function (bonus) {
    var alive = this.party.filter(function (m) { return m.hp > 0; }).length;
    return clamp(Math.max(alive, this.party.length - 1) + (bonus || 0), 1, 6);
  };

  R.battleOpts = function (extra) {
    var o = {
      teams: [this.party, extra.team],
      rng: this.rng,
      wild: !!extra.wild,
      trainer: extra.trainer || null,
      relics: this.relics
    };
    return o;
  };

  R.makeWild = function (rng, opts) {
    opts = opts || {};
    var region = this.currentRegion();
    var level = this.enemyLevel(rng.range(-4, -1));
    var pool = W.encounterPool({
      gen: this.leagueStage >= 0 ? null : region.gen,
      anyGen: this.leagueStage >= 0 || rng.chance(0.08),
      level: level,
      allowLegendary: opts.rare && this.region >= 5
    });
    var sp = W.pickEncounter(rng, pool, level, { rare: opts.rare });
    var mon = W.buildMon(rng, sp, level + (opts.rare ? 3 : 0), {
      quality: 0.55 + this.region * 0.03,
      shinyOdds: (1 / 400) * this.mod('shinyMult', 1),
      hiddenChance: 0.12
    });
    if (mon.shiny) this.stats.shinies++;
    var bt = new PL.Battle(this.battleOpts({ team: [mon], wild: true }));
    bt.aiLevel = 0;
    bt.canCatch = true;
    return bt;
  };

  R.makeTrainer = function (rng, opts) {
    opts = opts || {};
    var region = this.leagueStage >= 0 ? null : this.currentRegion();
    var level = this.enemyLevel(opts.elite ? 0 : -2);
    var t = W.trainerTeam(rng, region, level, {
      maxSize: this.matchSize(opts.elite ? 1 : 0),
      bonus: opts.elite ? 2 : 0,
      quality: opts.elite ? 0.8 : 0.68,
      ivFloor: opts.elite ? 10 : 4,
      cls: opts.elite ? { name: 'Ass-Trainer', types: null, size: 4 } : null
    });
    var bt = new PL.Battle(this.battleOpts({ team: t.team, trainer: t }));
    bt.aiLevel = opts.elite ? 2 : 1;
    bt.reward = { money: Math.round((70 + level * 16) * (opts.elite ? 2 : 1)), kind: opts.elite ? 'elite' : 'trainer' };
    if (opts.doubleReward) bt.reward.money *= 2;
    return bt;
  };

  R.makeAmbush = function (rng, opts) {
    opts = opts || {};
    var bt = this.makeTrainer(rng, { elite: !!opts.elite });
    bt.trainer.name = opts.elite ? ('Arenakämpfer ' + bt.trainer.name.split(' ').pop()) : 'Rüpel ' + bt.trainer.name.split(' ').pop();
    if (opts.doubleReward) bt.reward.money = Math.round(bt.reward.money * 2);
    return bt;
  };

  R.makeBoss = function (rng) {
    var region = this.currentRegion();
    // Der erste Arenaleiter darf noch kein Bollwerk sein.
    var level = this.enemyLevel(this.region === 0 ? 0 : 2);
    var t = W.bossTeam(rng, region, level, this.region, { maxSize: this.matchSize(1) });
    var bt = new PL.Battle(this.battleOpts({ team: t.team, trainer: t }));
    bt.aiLevel = 3;
    bt.reward = { money: 900 + this.region * 320, kind: 'boss' };
    return bt;
  };

  R.makeElite = function (rng) {
    var level = this.enemyLevel(1);
    var t = W.eliteTeam(rng, level, this.leagueStage, this.eliteUsed, { maxSize: this.matchSize(1) });
    var bt = new PL.Battle(this.battleOpts({ team: t.team, trainer: t }));
    bt.aiLevel = 3;
    bt.reward = { money: 2200 + this.leagueStage * 400, kind: 'e4' };
    return bt;
  };

  R.makeChampion = function (rng) {
    var t = W.championTeam(rng, this.enemyLevel(2));
    var bt = new PL.Battle(this.battleOpts({ team: t.team, trainer: t }));
    bt.aiLevel = 3;
    bt.reward = { money: 8000, kind: 'champ' };
    return bt;
  };

  /**
   * Wertet einen beendeten Kampf aus: Erfahrung, Geld, Fänge, Entwicklungen.
   * Rückgabe: { outcome, exp: [...], money, levelUps: [...], evolutions: [...] }
   */
  R.finishBattle = function (bt) {
    var self = this, res = {
      outcome: bt.outcome, money: 0, exp: [], levelUps: [], evolutions: [], caught: null, faintedOut: []
    };
    this.stats.battles++;
    this.stats.turns += bt.turn;

    if (bt.outcome === 'caught' && bt.caught) {
      this.stats.catches++;
      res.caught = this.acceptCatch(bt.caught);
    }

    if (bt.outcome === 'win' || bt.outcome === 'caught') {
      this.stats.wins++;
      var enemies = bt.sides[1].team;
      var beaten = enemies.filter(function (m) { return m.hp <= 0; });
      this.stats.kos += beaten.length;

      // Erfahrung: Teilnehmer voll, Bank anteilig
      var benchShare = this.mod('benchExp') || 0.25;
      var expMult = this.mod('expMult', 1) * (1 + this.ascension * 0.05);
      var alive = this.party.filter(function (m) { return m.hp > 0; });
      beaten.forEach(function (loser) {
        var sp = dex.sp(loser.sp);
        self.party.forEach(function (m) {
          if (m.hp <= 0) return;
          var participated = m.seen > 0 || alive.indexOf(m) === 0;
          var amount = mons.expGain(m, sp, loser.lvl, {
            mult: expMult * (participated ? 1 : benchShare) / Math.max(1, alive.length * 0.6),
            targetLevel: self.levelCap
          });
          var gain = mons.gainExp(m, amount, { levelCap: self.levelCap });
          if (gain.gained) res.exp.push({ mon: m, amount: gain.gained });
          if (gain.levels.length) res.levelUps.push({ mon: m, levels: gain.levels, learned: gain.learned });
        });
      });

      if (bt.reward && /boss|e4|champ/.test(bt.reward.kind)) {
        this.bossesBeaten = (this.bossesBeaten || 0) + 1;
      }
      if (bt.reward) {
        res.money = Math.round(bt.reward.money * this.mod('moneyMult', 1));
        this.giveMoney(res.money);
      } else if (bt.wild) {
        res.money = Math.round((25 + this.levelCap * 7) * this.mod('moneyMult', 1));
        this.giveMoney(res.money);
      }

      // Fleißpunkte: ein Grundstock für jeden Sieg, mehr mit passendem Relikt
      var evb = 2 + this.mod('evPerBattle');
      this.party.forEach(function (m) {
        if (m.hp <= 0) return;
        var st = mons.stats(m), best = 1, k;
        for (k = 1; k < 6; k++) if (st[k] > st[best]) best = k;
        mons.addEVs(m, PL.STATS[self.rng.chance(0.6) ? best : 1 + self.rng.int(5)], evb);
      });

      // Entwicklungen prüfen
      this.party.forEach(function (m) {
        var evo = mons.autoEvolution(m);
        if (!evo && self.hasMod('evoEarly')) {
          var list = mons.evolutions(m, {});
          evo = list.filter(function (e) {
            return e.how === 'level' && m.lvl >= (e.to.el || 100) - self.mod('evoEarly');
          })[0] || null;
        }
        if (evo) {
          var from = mons.name(m);
          mons.evolve(m, evo.to, self.rng);
          self.stats.evolutions++;
          res.evolutions.push({ mon: m, from: from, to: mons.name(m) });
        }
      });
    }

    if (this.hasMod('autoCure')) this.cureTeam();
    if (bt.reward && /boss|e4|champ/.test(bt.reward.kind) && (bt.outcome === 'win' || bt.outcome === 'caught')) {
      this.healTeam(1, true);
      this.restorePP();
    }

    // Nuzlocke: besiegte Pokémon verlassen das Team für immer
    if (this.nuzlocke) {
      var lost = this.party.filter(function (m) { return m.hp <= 0; });
      lost.forEach(function (m) {
        self.party.splice(self.party.indexOf(m), 1);
        self.stats.faints++;
        res.faintedOut.push(mons.name(m));
      });
    } else {
      this.stats.faints += this.party.filter(function (m) { return m.hp <= 0; }).length;
    }

    if (!this.party.some(function (m) { return m.hp > 0; })) {
      this.state = 'gameover';
      this.result = 'niederlage';
    }
    return res;
  };

  /* ---------- 5) Belohnungen und Fänge ----------------------------------------- */

  R.acceptCatch = function (mon) {
    mon.friendship = 90;
    var bonus = this.mod('catchLevelBonus');
    if (bonus) {
      var target = Math.min(this.levelCap, mon.lvl + bonus);
      if (target > mon.lvl) mons.gainExp(mon, mons.expForLevel(target) - mon.exp, { levelCap: this.levelCap });
    }
    mons.heal(mon);
    if (this.party.length < 6) { this.party.push(mon); return { to: 'team', mon: mon }; }
    this.box.push(mon);
    return { to: 'box', mon: mon };
  };

  R.makeCatchOffer = function (rng) {
    var region = this.currentRegion();
    // Neuzugänge steigen auf Teamhöhe ein, sonst schleppt man sie nur mit.
    var level = this.enemyLevel(0);
    var pool = W.encounterPool({ gen: this.leagueStage >= 0 ? null : region.gen, anyGen: this.leagueStage >= 0, level: level });
    var picks = [], seen = {}, i;
    var count = 3 + (this.mod('extraReward') || 0);
    for (i = 0; i < count; i++) {
      var sp = W.pickEncounter(rng, pool, level, { exclude: seen, rare: i === 0 });
      seen[sp.id] = 1;
      picks.push(W.buildMon(rng, sp, level, {
        quality: 0.85, ivFloor: 12,
        shinyOdds: (1 / 300) * this.mod('shinyMult', 1)
      }));
    }
    return { kind: 'catch', offers: picks, text: 'Drei Pokémon beäugen dich neugierig. Eines darf mitkommen.' };
  };

  R.takeOffer = function (mon) {
    var res = this.acceptCatch(mon);
    this.stats.catches++;
    if (mon.shiny) this.stats.shinies++;
    return res;
  };

  R.makeItemFind = function (rng) {
    var count = 3 + (this.mod('extraReward') || 0);
    var offers = [], i;
    var pools = this.itemPool();
    for (i = 0; i < count; i++) {
      var pick = rng.weighted(pools, function (p) { return p.w; });
      offers.push(pick.item);
      pools = pools.filter(function (p) { return p !== pick; });
      if (!pools.length) break;
    }
    return { kind: 'item', offers: offers, text: 'Ein Vorratslager. Nimm dir etwas mit.' };
  };

  /** Gewichteter Vorrat für Funde und Läden, passend zum Fortschritt. */
  R.itemPool = function () {
    var out = [], self = this, deep = this.region + (this.leagueStage >= 0 ? 6 : 0);
    function add(id, w) {
      var it = PL.items.get(id);
      if (it) out.push({ item: it, w: w });
    }
    add('pokeball', 20); add('greatball', deep > 1 ? 22 : 8); add('ultraball', deep > 3 ? 20 : 4);
    add('timerball', 8); add('netball', 6); add('duskball', 7); add('quickball', 7); add('nestball', 5);
    add('potion', 14); add('superpotion', 16); add('hyperpotion', deep > 2 ? 16 : 5);
    add('maxpotion', deep > 4 ? 12 : 2); add('fullrestore', deep > 5 ? 10 : 1);
    add('revive', 12); add('maxrevive', deep > 4 ? 6 : 1);
    add('fullheal', 8); add('antidote', 4); add('burnheal', 4); add('paralyzeheal', 4); add('awakening', 4);
    add('rarecandy', 6); add('ether', 8); add('maxelixir', 4); add('ppup', 3);
    add('protein', 4); add('iron', 4); add('calcium', 4); add('carbos', 4); add('zinc', 3); add('hpup', 3);
    add('mint', 3); add('bottlecap', 2); add('abilitycapsule', 2); add('abilitypatch', 1); add('terashard', 3);
    // Tragegegenstände
    PL.items.all().forEach(function (it) {
      if (it.kind !== 'hold') return;
      if (it.mega) return;
      var w = it.berry ? 6 : 5;
      if (it.price > 2200 && deep < 3) w = 1;
      out.push({ item: it, w: w });
    });
    // Entwicklungssteine, wenn sie jemandem im Team helfen
    var needed = {};
    this.party.forEach(function (m) {
      mons.evolutions(m, {}).forEach(function (e) { if (e.item) needed[PL.util.toID(e.item)] = true; });
    });
    Object.keys(needed).forEach(function (id) { add(id, 14); });
    return out;
  };

  R.makeRelicChoice = function (rng, count, text) {
    var n = (count || 3) + (this.mod('extraReward') || 0);
    var offers = PL.relics.draw(rng, this.relics, n);
    return { kind: 'relic', offers: offers, text: text || 'Wähle ein Relikt.' };
  };

  R.takeRelic = function (id) {
    if (!PL.relics.get(id) || this.relics[id]) return false;
    this.relics[id] = true;
    this.stats.relics++;
    var r = PL.relics.get(id);
    this.history.push({ t: 'relic', text: 'Relikt erhalten: ' + (r ? r.name : id) });
    if (id === 'sammlerkoffer') this.addItem('pokeball', 4);
    if (id === 'meisterball_splitter') this.masterballUsed = false;
    return true;
  };

  /** Belohnungsauswahl nach einem gewonnenen Kampf. */
  R.battleRewards = function (bt, rng) {
    rng = rng || this.rng;
    var kind = bt.reward ? bt.reward.kind : 'wild';
    if (kind === 'boss' || kind === 'e4' || kind === 'champ') {
      return this.makeRelicChoice(rng, 3, 'Sieg! Such dir deine Belohnung aus.');
    }
    if (kind === 'elite') return this.makeItemFind(rng);
    return null;
  };

  /* ---------- 6) Laden ---------------------------------------------------------- */

  R.makeShop = function (rng, opts) {
    opts = opts || {};
    var size = opts.size || 7;
    var pools = this.itemPool(), stock = [], i;
    if (this.hasMod('shopHold')) {
      var holds = pools.filter(function (p) { return p.item.kind === 'hold'; });
      if (holds.length) { stock.push(rng.pick(holds).item); }
    }
    for (i = stock.length; i < size && pools.length; i++) {
      var pick = rng.weighted(pools, function (p) { return p.w; });
      stock.push(pick.item);
      pools = pools.filter(function (p) { return p !== pick; });
    }
    // Zwei TMs aus dem, was das Team lernen kann
    var tmPool = this.teachableMoves(rng, 12);
    for (i = 0; i < 2 && tmPool.length; i++) {
      stock.push(PL.items.tm(tmPool.splice(rng.int(tmPool.length), 1)[0]));
    }
    var discount = opts.discount !== undefined ? opts.discount : this.mod('shopDiscount');
    return {
      kind: 'shop',
      stock: stock.map(function (it) {
        return { item: it, price: Math.max(50, Math.round(it.price * (1 - discount))) };
      }),
      text: opts.text || 'Ein Händler hat seinen Stand aufgebaut.'
    };
  };

  R.buy = function (entry) {
    if (this.money < entry.price) return false;
    this.money -= entry.price;
    this.stats.spent += entry.price;
    if (entry.item.kind === 'tm') this.addTM(entry.item.move);
    else this.addItem(entry.item.id, 1);
    entry.sold = true;
    return true;
  };

  R.sell = function (itemId, count) {
    var it = PL.items.get(itemId);
    if (!it || !this.bag[itemId]) return 0;
    count = Math.min(count || 1, this.bag[itemId]);
    var gain = Math.floor(it.price * 0.4) * count;
    this.removeItem(itemId, count);
    this.giveMoney(gain);
    return gain;
  };

  /** Attacken, die irgendein Teammitglied noch lernen könnte. */
  R.teachableMoves = function (rng, limit) {
    var out = [], seen = {}, self = this;
    this.party.forEach(function (m) {
      var sp = dex.sp(m.sp);
      var pool = dex.movepool(sp);
      pool.forEach(function (mi) {
        var mv = dex.move(mi);
        if (!mv || mv.np || seen[mi]) return;
        if (m.moves.some(function (x) { return x.m === mi; })) return;
        if (mv.c !== 'T' && mv.bp < 55) return;
        seen[mi] = 1;
        out.push(mi);
      });
    });
    rng.shuffle(out);
    return out.slice(0, limit || 20);
  };

  /* ---------- 7) Hilfen für Ereignisse und Rastplatz ---------------------------- */

  R.restOptions = function () {
    var self = this;
    return [
      { id: 'heal', label: 'Ausruhen', desc: 'Heilt das gesamte Team vollständig.' },
      { id: 'train', label: 'Trainieren', desc: 'Erfahrung für alle — etwa ein halbes Level.' },
      { id: 'tutor', label: 'Attacke lernen', desc: 'Ein Pokémon lernt eine neue Attacke.' },
      { id: 'evolve', label: 'Entwickeln', desc: 'Zeigt alle möglichen Entwicklungen.' },
      { id: 'box', label: 'Team umstellen', desc: 'Pokémon zwischen Team und Box tauschen.' }
    ];
  };

  R.doRest = function (id, rng) {
    switch (id) {
      case 'heal':
        this.healTeam(1, true); this.restorePP();
        return 'Das Team ist wieder vollständig bei Kräften.';
      case 'train':
        return this.grantExp(Math.round(this.levelCap * 45));
      default:
        return '';
    }
  };

  R.giveMoney = function (amount) {
    amount = Math.round(amount);
    this.money += amount;
    this.stats.moneyEarned += Math.max(0, amount);
    return amount + ' ₽ erhalten.';
  };

  R.addItem = function (id, count) {
    this.bag[id] = (this.bag[id] || 0) + (count || 1);
    return this.bag[id];
  };
  R.removeItem = function (id, count) {
    if (!this.bag[id]) return false;
    this.bag[id] -= (count || 1);
    if (this.bag[id] <= 0) delete this.bag[id];
    return true;
  };
  R.addTM = function (moveIndex) {
    this.tms = this.tms || {};
    this.tms[moveIndex] = (this.tms[moveIndex] || 0) + 1;
  };

  R.giveRandomItem = function (rng, count) {
    var pools = this.itemPool(), out = [], i;
    for (i = 0; i < (count || 1) && pools.length; i++) {
      var pick = rng.weighted(pools, function (p) { return p.w; });
      this.addItem(pick.item.id, 1);
      out.push(pick.item.name);
      pools = pools.filter(function (p) { return p !== pick; });
    }
    return 'Gefunden: ' + out.join(', ') + '.';
  };

  R.healTeam = function (fraction, cure) {
    var self = this;
    this.party.forEach(function (m) {
      if (m.hp <= 0) return;
      var max = mons.maxHP(m);
      m.hp = clamp(Math.round(m.hp + max * fraction), 0, max);
      if (cure) { m.status = null; m.slp = 0; }
    });
  };

  R.cureTeam = function () {
    this.party.forEach(function (m) { m.status = null; m.slp = 0; });
  };

  R.restorePP = function (amount) {
    this.party.forEach(function (m) {
      m.moves.forEach(function (mv) {
        var max = dex.move(mv.m).pp + mv.ppUp * Math.floor(dex.move(mv.m).pp / 5);
        mv.pp = amount ? Math.min(max, mv.pp + amount) : max;
      });
    });
  };

  R.grantExp = function (total) {
    var self = this, per = Math.max(1, Math.round(total / Math.max(1, this.party.length)));
    var ups = [];
    this.party.forEach(function (m) {
      var res = mons.gainExp(m, per, { levelCap: self.levelCap });
      if (res.levels.length) ups.push(mons.name(m) + ' → Lv ' + m.lvl);
    });
    return ups.length ? ('Training! ' + ups.join(', ')) : 'Das Team sammelt Erfahrung.';
  };

  R.gainPokemon = function (rng, speciesRef, level, source, opts) {
    var sp = dex.sp(speciesRef);
    if (!sp) return 'Nichts gefunden.';
    var mon = W.buildMon(rng, sp, clamp(level, 2, this.levelCap), Object.assign({
      quality: 0.8, ivFloor: 6, shinyOdds: (1 / 300) * this.mod('shinyMult', 1)
    }, opts || {}));
    var res = this.acceptCatch(mon);
    this.stats.catches++;
    if (mon.shiny) this.stats.shinies++;
    return mons.name(mon) + (res.to === 'team' ? ' schließt sich dem Team an!' : ' wandert in die Box.');
  };

  R.hatchEgg = function (rng) {
    var pool = dex.species.filter(function (s) {
      return !s.bo && !s.f && s.pv === undefined && s.ev && s.bst < 340 && !dex.isLegendary(s);
    });
    var sp = rng.pick(pool);
    return this.gainPokemon(rng, sp, Math.max(5, this.levelCap - 12), 'Ei', { ivFloor: 15, quality: 0.85 });
  };

  R.forceEvolveOne = function (rng) {
    var self = this, cands = [];
    this.party.forEach(function (m) {
      var list = mons.evolutions(m, { force: true });
      if (list.length) cands.push({ mon: m, evo: list[0] });
    });
    if (!cands.length) return 'Niemand im Team kann sich noch entwickeln.';
    var pick = rng.pick(cands);
    var from = mons.name(pick.mon);
    mons.evolve(pick.mon, pick.evo.to, rng);
    this.stats.evolutions++;
    return from + ' entwickelt sich zu ' + mons.name(pick.mon) + '!';
  };

  R.makeEvent = function (rng) {
    var self = this;
    var pool = W.EVENTS.filter(function (e) { return !self.seenEvents || !self.seenEvents[e.id]; });
    if (!pool.length) { this.seenEvents = {}; pool = W.EVENTS; }
    var ev = rng.pick(pool);
    this.seenEvents = this.seenEvents || {};
    this.seenEvents[ev.id] = true;
    return {
      kind: 'event', event: ev, text: ev.text, title: ev.title,
      options: ev.options.map(function (o, i) {
        return { index: i, label: o.label, desc: o.desc, enabled: !o.enabled || o.enabled(self) };
      })
    };
  };

  /** Führt eine Ereignisoption aus. Rückgabe: { text } oder eine Folgeszene. */
  R.chooseEvent = function (optionIndex) {
    var scene = this.scene;
    if (!scene || scene.kind !== 'event') return null;
    var opt = scene.event.options[optionIndex];
    if (!opt) return null;
    if (opt.enabled && !opt.enabled(this)) return null;
    var out = opt.run(this, this.rng);
    if (typeof out === 'string') return { text: out };
    if (out && out.relicChoice) {
      var s = this.makeRelicChoice(this.rng, out.relicChoice, out.text || 'Wähle ein Relikt.');
      this.setScene(s);
      return { scene: s };
    }
    if (out && out.shop) {
      var sh = this.makeShop(this.rng, out.shop);
      this.setScene(sh);
      return { scene: sh };
    }
    if (out && out.battle) {
      var bs = { kind: 'battle', battle: out.battle, node: scene.node };
      this.setScene(bs);
      return { scene: bs };
    }
    return out || { text: '' };
  };

  /* ---------- 8) Speichern ------------------------------------------------------ */

  R.toJSON = function () {
    return {
      version: this.version, mode: this.mode, seed: this.seed, ascension: this.ascension,
      nuzlocke: this.nuzlocke, rngState: this.rng.save(), started: this.started,
      party: this.party, box: this.box, bag: this.bag, tms: this.tms || {}, relics: this.relics,
      money: this.money, region: this.region, regionOrder: this.regionOrder,
      leagueStage: this.leagueStage, eliteUsed: this.eliteUsed, stats: this.stats,
      history: this.history.slice(-40), map: this.map, pos: this.pos, rowIndex: this.rowIndex,
      bossesBeaten: this.bossesBeaten || 0, tms: this.tms || {},
      seenEvents: this.seenEvents || {}, masterballUsed: this.masterballUsed, result: this.result,
      state: this.state === 'map' ? 'map' : 'map'
    };
  };

  Run.fromJSON = function (data) {
    var run = Object.create(R);
    Object.keys(data).forEach(function (k) { run[k] = data[k]; });
    run.rng = PL.rng(0);
    run.rng.load(data.rngState || data.seed || 1);
    run.scene = null;
    run.state = 'map';
    run.pendingLevelUps = [];
    run.history = run.history || [];
    return run;
  };

  Run.MODES = MODES;
  Run.NODE_INFO = NODE_INFO;
  PL.Run = Run;

  if (typeof module !== 'undefined' && module.exports) module.exports = Run;
})(typeof globalThis !== 'undefined' ? globalThis : this);
