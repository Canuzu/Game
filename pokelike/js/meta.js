/* =============================================================================
 * meta.js — Dauerhafter Fortschritt: Speicherstand, Sammlung, Erfolge
 * -----------------------------------------------------------------------------
 * Alles hier überlebt einen einzelnen Run. Gespeichert wird im localStorage
 * des Browsers; es verlässt niemals das Gerät. Ist der Speicher gesperrt
 * (privates Fenster, Datei ohne Rechte), läuft das Spiel trotzdem — dann eben
 * ohne Gedächtnis.
 *
 * Gliederung:  1) Speicher   2) Startpokémon   3) Erfolge   4) Sammlung
 *              5) Aufstiege   6) Statistik
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.dex) require('./core.js');
    if (!PL.Run) require('./run.js');
  }
  var dex = PL.dex, mons = PL.mon;

  var KEY = 'pokelike.plus.v1';
  var RUN_KEY = 'pokelike.plus.run.v1';

  /* ---------- 1) Speicher ---------------------------------------------------- */

  function storage() {
    try {
      var s = root.localStorage;
      s.setItem('__probe', '1');
      s.removeItem('__probe');
      return s;
    } catch (e) {
      return null;
    }
  }

  function emptyMeta() {
    return {
      version: 1,
      runs: 0, wins: 0, bestRegion: 0, bestAscension: -1,
      unlocked: {}, achievements: {}, seen: {}, caught: {}, shinies: {},
      totals: { battles: 0, kos: 0, catches: 0, faints: 0, money: 0, turns: 0, evolutions: 0, playtime: 0 },
      history: [],
      settings: { theme: 'auto', lang: 'de', speed: 'normal', sound: true, music: true, volume: 0.5, confirmRisky: true }
    };
  }

  var cache = null;

  function load() {
    if (cache) return cache;
    var s = storage(), raw = s && s.getItem(KEY);
    cache = emptyMeta();
    if (raw) {
      try {
        var data = JSON.parse(raw);
        Object.keys(cache).forEach(function (k) {
          if (data[k] === undefined) return;
          if (k === 'settings' || k === 'totals') Object.assign(cache[k], data[k]);
          else cache[k] = data[k];
        });
      } catch (e) { /* beschädigt — dann eben frisch */ }
    }
    return cache;
  }

  function save() {
    var s = storage();
    if (!s || !cache) return false;
    try { s.setItem(KEY, JSON.stringify(cache)); return true; } catch (e) { return false; }
  }

  function reset() {
    cache = emptyMeta();
    var s = storage();
    if (s) { try { s.removeItem(KEY); s.removeItem(RUN_KEY); } catch (e) {} }
    return cache;
  }

  /* ---------- 2) Startpokémon ------------------------------------------------- */

  var STARTERS = [
    { id: 'bulbasaur', gen: 1 }, { id: 'charmander', gen: 1 }, { id: 'squirtle', gen: 1 },
    { id: 'chikorita', gen: 2 }, { id: 'cyndaquil', gen: 2 }, { id: 'totodile', gen: 2 },
    { id: 'treecko', gen: 3 }, { id: 'torchic', gen: 3 }, { id: 'mudkip', gen: 3 },
    { id: 'turtwig', gen: 4, need: 'region2' }, { id: 'chimchar', gen: 4, need: 'region2' }, { id: 'piplup', gen: 4, need: 'region2' },
    { id: 'snivy', gen: 5, need: 'region3' }, { id: 'tepig', gen: 5, need: 'region3' }, { id: 'oshawott', gen: 5, need: 'region3' },
    { id: 'chespin', gen: 6, need: 'region4' }, { id: 'fennekin', gen: 6, need: 'region4' }, { id: 'froakie', gen: 6, need: 'region4' },
    { id: 'rowlet', gen: 7, need: 'region5' }, { id: 'litten', gen: 7, need: 'region5' }, { id: 'popplio', gen: 7, need: 'region5' },
    { id: 'grookey', gen: 8, need: 'region6' }, { id: 'scorbunny', gen: 8, need: 'region6' }, { id: 'sobble', gen: 8, need: 'region6' },
    { id: 'sprigatito', gen: 9, need: 'region7' }, { id: 'fuecoco', gen: 9, need: 'region7' }, { id: 'quaxly', gen: 9, need: 'region7' },
    { id: 'pikachu', gen: 1, need: 'catch50', special: 'Elektrisches Maskottchen' },
    { id: 'eevee', gen: 1, need: 'catch100', special: 'Acht Wege stehen offen' },
    { id: 'riolu', gen: 4, need: 'boss10', special: 'Kämpfernatur' },
    { id: 'dratini', gen: 1, need: 'boss20', special: 'Drachenblut' },
    { id: 'larvitar', gen: 2, need: 'win1', special: 'Pseudolegendär' },
    { id: 'beldum', gen: 3, need: 'win1', special: 'Stahlkern' },
    { id: 'gible', gen: 4, need: 'win2', special: 'Landhai' },
    { id: 'deino', gen: 5, need: 'win2', special: 'Dreiköpfig' },
    { id: 'goomy', gen: 6, need: 'shiny3', special: 'Schleimig' },
    { id: 'jangmoo', gen: 7, need: 'win3', special: 'Schuppenklang' },
    { id: 'dreepy', gen: 8, need: 'win3', special: 'Gespensterdrache' },
    { id: 'frigibax', gen: 9, need: 'win4', special: 'Eisdrache' },
    { id: 'ditto', gen: 1, need: 'ditto', special: 'Man muss es wirklich wollen' }
  ];

  var UNLOCK_TEXT = {
    region2: 'Erreiche die dritte Region.',
    region3: 'Erreiche die vierte Region.',
    region4: 'Erreiche die fünfte Region.',
    region5: 'Erreiche die sechste Region.',
    region6: 'Erreiche die siebte Region.',
    region7: 'Erreiche die achte Region.',
    catch50: 'Fange insgesamt 50 Pokémon.',
    catch100: 'Fange insgesamt 100 Pokémon.',
    boss10: 'Besiege insgesamt 10 Arenaleiter.',
    boss20: 'Besiege insgesamt 20 Arenaleiter.',
    win1: 'Gewinne einen Run.',
    win2: 'Gewinne zwei Runs.',
    win3: 'Gewinne drei Runs.',
    win4: 'Gewinne vier Runs.',
    shiny3: 'Finde drei schillernde Pokémon.',
    ditto: 'Trage 200 verschiedene Arten in den Pokédex ein.'
  };

  function unlockState(m) {
    m = m || load();
    return {
      region2: m.bestRegion >= 2, region3: m.bestRegion >= 3, region4: m.bestRegion >= 4,
      region5: m.bestRegion >= 5, region6: m.bestRegion >= 6, region7: m.bestRegion >= 7,
      catch50: m.totals.catches >= 50, catch100: m.totals.catches >= 100,
      boss10: (m.totals.bosses || 0) >= 10, boss20: (m.totals.bosses || 0) >= 20,
      win1: m.wins >= 1, win2: m.wins >= 2, win3: m.wins >= 3, win4: m.wins >= 4,
      shiny3: Object.keys(m.shinies).length >= 3,
      ditto: Object.keys(m.caught).length >= 200
    };
  }

  function starters() {
    var m = load(), state = unlockState(m);
    return STARTERS.filter(function (s) { return dex.sp(s.id); }).map(function (s) {
      return {
        id: s.id, species: dex.sp(s.id), gen: s.gen, special: s.special || null,
        unlocked: !s.need || !!state[s.need] || !!m.unlocked[s.id],
        need: s.need || null, needText: s.need ? UNLOCK_TEXT[s.need] : null
      };
    });
  }

  /* ---------- 3) Erfolge ------------------------------------------------------ */

  var ACHIEVEMENTS = [
    { id: 'first_blood', name: 'Erster Sieg', desc: 'Gewinne deinen ersten Kampf.', check: function (m) { return m.totals.kos >= 1; } },
    { id: 'first_catch', name: 'Gefangen', desc: 'Fange dein erstes Pokémon.', check: function (m) { return m.totals.catches >= 1; } },
    { id: 'gym1', name: 'Erster Orden', desc: 'Besiege einen Arenaleiter.', check: function (m) { return (m.totals.bosses || 0) >= 1; } },
    { id: 'gym_all', name: 'Ordensbrett voll', desc: 'Besiege in einem Run neun Arenaleiter.', manual: true },
    { id: 'league', name: 'Champ', desc: 'Gewinne einen kompletten Run.', check: function (m) { return m.wins >= 1; } },
    { id: 'shiny', name: 'Schillernd', desc: 'Finde ein schillerndes Pokémon.', check: function (m) { return Object.keys(m.shinies).length >= 1; } },
    { id: 'dex50', name: 'Sammler', desc: 'Trage 50 Arten in den Pokédex ein.', check: function (m) { return Object.keys(m.caught).length >= 50; } },
    { id: 'dex150', name: 'Forscher', desc: 'Trage 150 Arten ein.', check: function (m) { return Object.keys(m.caught).length >= 150; } },
    { id: 'dex300', name: 'Professor', desc: 'Trage 300 Arten ein.', check: function (m) { return Object.keys(m.caught).length >= 300; } },
    { id: 'dex_all_gens', name: 'Weltenbummler', desc: 'Fange etwas aus allen neun Generationen.', manual: true },
    { id: 'full_team', name: 'Sechs Freunde', desc: 'Habe sechs Pokémon gleichzeitig im Team.', manual: true },
    { id: 'legendary', name: 'Legendenjäger', desc: 'Fange ein legendäres Pokémon.', manual: true },
    { id: 'relic10', name: 'Reliktjäger', desc: 'Sammle zehn Relikte in einem Run.', manual: true },
    { id: 'nuzlocke', name: 'Harte Schule', desc: 'Gewinne einen Run mit Nuzlocke-Regeln.', manual: true },
    { id: 'ascend1', name: 'Aufstieg', desc: 'Gewinne auf Aufstieg 1 oder höher.', manual: true },
    { id: 'ascend5', name: 'Hochgestiegen', desc: 'Gewinne auf Aufstieg 5 oder höher.', manual: true },
    { id: 'notafraid', name: 'Kein Zurück', desc: 'Gewinne einen Kampf mit einem Pokémon auf 1 KP.', manual: true },
    { id: 'sweep', name: 'Alleingang', desc: 'Besiege ein volles Gegnerteam mit einem einzigen Pokémon.', manual: true },
    { id: 'mega', name: 'Mega', desc: 'Mega-entwickle ein Pokémon.', manual: true },
    { id: 'primal', name: 'Urgewalt', desc: 'Löse eine Protoform aus (Kyogre oder Groudon).', manual: true },
    { id: 'rich', name: 'Wohlhabend', desc: 'Besitze 50 000 ₽ in einem Run.', manual: true },
    { id: 'level100', name: 'Maximum', desc: 'Bringe ein Pokémon auf Level 100.', manual: true },
    { id: 'daily', name: 'Tagwerk', desc: 'Beende einen Tages-Run.', manual: true },
    { id: 'endless20', name: 'Kein Ende', desc: 'Erreiche im Endlosmodus Region 20.', manual: true }
  ];

  function achievements() {
    var m = load();
    return ACHIEVEMENTS.map(function (a) {
      return { id: a.id, name: a.name, desc: a.desc, done: !!m.achievements[a.id] };
    });
  }

  /** Prüft die automatischen Erfolge und meldet neu freigeschaltete. */
  function refreshAchievements() {
    var m = load(), fresh = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (a.manual || m.achievements[a.id] || !a.check) return;
      if (a.check(m)) { m.achievements[a.id] = Date.now(); fresh.push(a); }
    });
    if (fresh.length) save();
    return fresh;
  }

  function award(id) {
    var m = load();
    if (m.achievements[id]) return null;
    var a = ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
    if (!a) return null;
    m.achievements[id] = Date.now();
    save();
    return a;
  }

  /* ---------- 4) Sammlung ----------------------------------------------------- */

  function noteSeen(speciesIndex) {
    var m = load();
    if (!m.seen[speciesIndex]) { m.seen[speciesIndex] = 1; return true; }
    return false;
  }

  function noteCaught(mon) {
    var m = load(), sp = dex.sp(mon.sp), fresh = !m.caught[sp.i];
    m.seen[sp.i] = 1;
    m.caught[sp.i] = (m.caught[sp.i] || 0) + 1;
    if (mon.shiny) m.shinies[sp.i] = (m.shinies[sp.i] || 0) + 1;
    if (dex.isLegendary(sp)) award('legendary');
    var gens = {};
    Object.keys(m.caught).forEach(function (i) { gens[dex.species[i].g] = 1; });
    if (Object.keys(gens).length >= 9) award('dex_all_gens');
    return fresh;
  }

  function dexStats() {
    var m = load();
    var seen = Object.keys(m.seen).length, caught = Object.keys(m.caught).length;
    var byGen = {};
    for (var g = 1; g <= 9; g++) byGen[g] = { total: 0, caught: 0, seen: 0 };
    dex.species.forEach(function (s) {
      if (!byGen[s.g]) return;
      byGen[s.g].total++;
      if (m.caught[s.i]) byGen[s.g].caught++;
      if (m.seen[s.i]) byGen[s.g].seen++;
    });
    return { seen: seen, caught: caught, total: dex.species.length, byGen: byGen, shinies: Object.keys(m.shinies).length };
  }

  /* ---------- 5) Aufstiege ---------------------------------------------------- */

  var ASCENSIONS = [
    'Grundschwierigkeit.',
    'Gegner starten zwei Level höher.',
    'Läden verlangen 25 % mehr.',
    'Arenaleiter führen ein Pokémon mehr.',
    'Rastplätze heilen nur noch zur Hälfte.',
    'Fangchancen sinken deutlich.',
    'Gegner tragen häufiger Gegenstände.',
    'Erfahrung um 20 % reduziert.',
    'Kein Vollheilen nach Arenaleitern.',
    'Gegner mega-entwickeln, sobald sie können.',
    'Alles zusammen — und noch zwei Level obendrauf. Viel Glück.'
  ];

  function maxAscension() {
    var m = load();
    return Math.min(ASCENSIONS.length - 1, m.bestAscension + 1);
  }

  /* ---------- 6) Statistik und Runs ------------------------------------------- */

  /** Trägt einen beendeten Run in die Dauerstatistik ein. */
  function recordRun(run, outcome) {
    var m = load();
    m.runs++;
    if (outcome === 'sieg') {
      m.wins++;
      if (run.ascension > m.bestAscension) m.bestAscension = run.ascension;
      if (run.ascension >= 1) award('ascend1');
      if (run.ascension >= 5) award('ascend5');
      if (run.nuzlocke) award('nuzlocke');
      if (run.mode === 'taeglich') award('daily');
    }
    m.bestRegion = Math.max(m.bestRegion, run.region);
    m.totals.battles += run.stats.battles;
    m.totals.kos += run.stats.kos;
    m.totals.catches += run.stats.catches;
    m.totals.faints += run.stats.faints;
    m.totals.money += run.stats.moneyEarned;
    m.totals.turns += run.stats.turns;
    m.totals.evolutions += run.stats.evolutions;
    m.totals.bosses = (m.totals.bosses || 0) + (run.bossesBeaten || 0);
    m.history.unshift({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      mode: run.mode, ascension: run.ascension, nuzlocke: run.nuzlocke,
      outcome: outcome, region: run.region, battles: run.stats.battles,
      catches: run.stats.catches, relics: Object.keys(run.relics).length,
      team: run.party.map(function (p) { return { sp: p.sp, lvl: p.lvl, shiny: !!p.shiny }; })
    });
    m.history = m.history.slice(0, 50);
    if (run.region >= 9) award('gym_all');
    if (run.mode === 'endlos' && run.region >= 20) award('endless20');
    save();
    return refreshAchievements();
  }

  /* ---------- Laufender Run --------------------------------------------------- */

  function saveRun(run) {
    var s = storage();
    if (!s || !run) return false;
    try { s.setItem(RUN_KEY, JSON.stringify(run.toJSON())); return true; } catch (e) { return false; }
  }
  function loadRun() {
    var s = storage(), raw = s && s.getItem(RUN_KEY);
    if (!raw) return null;
    try { return PL.Run.fromJSON(JSON.parse(raw)); } catch (e) { return null; }
  }
  function clearRun() {
    var s = storage();
    if (s) { try { s.removeItem(RUN_KEY); } catch (e) {} }
  }
  function hasRun() {
    var s = storage();
    return !!(s && s.getItem(RUN_KEY));
  }

  function settings() { return load().settings; }
  function setSetting(key, value) { load().settings[key] = value; save(); return value; }

  PL.meta = {
    load: load, save: save, reset: reset,
    starters: starters, unlockState: unlockState, unlockText: UNLOCK_TEXT,
    achievements: achievements, refreshAchievements: refreshAchievements, award: award,
    noteSeen: noteSeen, noteCaught: noteCaught, dexStats: dexStats,
    ASCENSIONS: ASCENSIONS, maxAscension: maxAscension,
    recordRun: recordRun,
    saveRun: saveRun, loadRun: loadRun, clearRun: clearRun, hasRun: hasRun,
    settings: settings, setSetting: setSetting,
    available: function () { return !!storage(); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.meta;
})(typeof globalThis !== 'undefined' ? globalThis : this);
