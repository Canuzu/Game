/* =============================================================================
 * meta.js — Dauerhafter Fortschritt: Speicherstand, Sammlung, Erfolge
 * -----------------------------------------------------------------------------
 * Alles hier überlebt einen einzelnen Run. Gespeichert wird im localStorage
 * des Browsers. Ist der Speicher gesperrt (privates Fenster, Datei ohne
 * Rechte), läuft das Spiel trotzdem — dann eben ohne Gedächtnis.
 *
 * Vorsicht bei eingebetteten Seiten: Das Spiel läuft in einem Rahmen auf einer
 * fremden Adresse, und manche Browser behandeln den Speicher solcher Seiten
 * als Wegwerfware — schreiben geht, aber beim nächsten Öffnen ist alles fort.
 * durable() fragt deshalb beim Browser nach dauerhaftem Speicher, sobald der
 * Spieler das erste Mal klickt; wo das nicht reicht, hilft nur der
 * Wolkenspeicher aus cloud.js.
 *
 * Gliederung:  1) Profile   2) Speicher   3) Startpokémon   4) Erfolge
 *              5) Sammlung   6) Aufstiege   7) Statistik   8) Speicherplätze
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.dex) require('./core.js');
    if (!PL.Run) require('./run.js');
  }
  var dex = PL.dex, mons = PL.mon;

  var BASE = 'pokelike.plus.v1';
  var RUN_BASE = 'pokelike.plus.run.v1';
  var PROFILE_KEY = 'pokelike.plus.profiles.v1';
  var SAVE_FORMAT = 'pokelike-save';
  var SAVE_VERSION = 2;
  var SLOTS = 3;

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

  /**
   * Bittet den Browser, den Speicher dieser Seite ernst zu nehmen. Zwei Wege,
   * beide erlaubt nur nach einem Klick:
   *   1. requestStorageAccess — hebt die Sperre für eingebettete Seiten auf.
   *   2. storage.persist — bittet darum, nichts wegzuräumen.
   * Beide dürfen scheitern; dann bleibt es beim Wegwerfspeicher, und die
   * Oberfläche sagt das auch.
   */
  var durableAsked = false;
  function durable() {
    if (durableAsked) return Promise.resolve(false);
    durableAsked = true;
    var steps = [];
    try {
      if (root.document && root.document.requestStorageAccess && root.document.hasStorageAccess) {
        steps.push(root.document.hasStorageAccess().then(function (has) {
          if (has) return true;
          return root.document.requestStorageAccess().then(function () { return true; },
            function () { return false; });
        }, function () { return false; }));
      }
      if (root.navigator && root.navigator.storage && root.navigator.storage.persist) {
        steps.push(root.navigator.storage.persist().then(function (ok) { return !!ok; },
          function () { return false; }));
      }
    } catch (e) { /* alte Browser kennen nichts davon */ }
    if (!steps.length) return Promise.resolve(false);
    return Promise.all(steps).then(function (res) {
      return res.some(Boolean);
    }, function () { return false; });
  }

  /* ---------- 1) Profile ------------------------------------------------------
   * Mehrere Leute an einem Browser sollen sich nicht ins Gehege kommen: Jedes
   * Profil hat seinen eigenen Pokédex, seine eigenen Erfolge, seine eigenen
   * Einstellungen und seine eigenen Speicherplätze.
   *
   * Das erste Profil benutzt weiter die alten Schlüssel — so findet jeder, der
   * vorher schon gespielt hat, seinen Stand unverändert wieder.
   * -------------------------------------------------------------------------- */

  var profileCache = null;

  function loadProfiles() {
    if (profileCache) return profileCache;
    var s = storage(), raw = s && s.getItem(PROFILE_KEY);
    if (raw) {
      try {
        var data = JSON.parse(raw);
        if (data && data.list && data.list.length) { profileCache = data; return profileCache; }
      } catch (e) { /* kaputt: unten neu anlegen */ }
    }
    profileCache = { v: 1, active: 'p1', list: [{ id: 'p1', name: 'Spieler 1', created: Date.now() }] };
    return profileCache;
  }

  function saveProfiles() {
    var s = storage();
    if (!s || !profileCache) return false;
    try { s.setItem(PROFILE_KEY, JSON.stringify(profileCache)); return true; } catch (e) { return false; }
  }

  function profiles() { return loadProfiles().list.slice(); }
  function activeProfileId() {
    var p = loadProfiles();
    if (!p.list.some(function (x) { return x.id === p.active; })) p.active = p.list[0].id;
    return p.active;
  }
  function activeProfile() {
    var id = activeProfileId();
    return loadProfiles().list.filter(function (x) { return x.id === id; })[0];
  }

  /** Das erste Profil erbt die alten Schlüssel, jedes weitere hängt seine ID an. */
  function suffix(id) { return (id || activeProfileId()) === 'p1' ? '' : '.' + (id || activeProfileId()); }
  function metaKey(id) { return BASE + suffix(id); }
  function runKey(id) { return RUN_BASE + suffix(id); }
  function slotKey(n, id) { return BASE + suffix(id) + '.slot' + n; }

  function createProfile(name) {
    var p = loadProfiles(), i = 2, id;
    do { id = 'p' + i++; } while (p.list.some(function (x) { return x.id === id; }));
    p.list.push({ id: id, name: String(name || '').trim() || ('Spieler ' + (p.list.length + 1)), created: Date.now() });
    p.active = id;
    saveProfiles();
    cache = null;                       // der neue Fortschritt ist noch leer
    return id;
  }

  function switchProfile(id) {
    var p = loadProfiles();
    if (!p.list.some(function (x) { return x.id === id; })) return false;
    p.active = id;
    saveProfiles();
    cache = null;
    return true;
  }

  function renameProfile(id, name) {
    var p = loadProfiles();
    p.list.forEach(function (x) { if (x.id === id) x.name = String(name || '').trim() || x.name; });
    return saveProfiles();
  }

  /** Löscht ein Profil samt Fortschritt und allen Plätzen. Das letzte bleibt. */
  function deleteProfile(id) {
    var p = loadProfiles(), s = storage();
    if (p.list.length <= 1) return false;
    if (s) {
      try {
        s.removeItem(metaKey(id));
        s.removeItem(runKey(id));
        for (var n = 1; n <= SLOTS; n++) s.removeItem(slotKey(n, id));
      } catch (e) { /* egal */ }
    }
    p.list = p.list.filter(function (x) { return x.id !== id; });
    if (p.active === id) { p.active = p.list[0].id; cache = null; }
    return saveProfiles();
  }

  /* ---------- 2) Speicher ---------------------------------------------------- */

  function emptyMeta() {
    return {
      version: 1,
      runs: 0, wins: 0, bestRegion: 0, bestAscension: -1,
      unlocked: {}, achievements: {}, seen: {}, caught: {}, shinies: {},
      taeglich: {},
      // Beide Marken stehen bewusst auf "noch nicht erledigt": Ein
      // Spielstand von früher kennt den Schlüssel gar nicht, und load()
      // übernimmt nur Schlüssel, die dort auch stehen. Stünde hier schon der
      // Endwert, liefe die Umstellung nie — bei einem frischen Stand ist sie
      // ohnehin ein Durchlauf über nichts.
      stufenFassung: 1,
      legendenReset: false,
      meilensteine: {},          // welche Sammelmarken schon geholt sind
      meisterbaelle: 0,          // die alte Kasse; bleibt nur für alte Stände stehen
      // Das Legenden-Duell: was schon besiegt ist und welcher Meisterball
      // bereitliegt. »baelle« ist nach Art sortiert — ein Ball gehört dem
      // Pokémon, das ihn beim ersten Sieg hergegeben hat. »frei« sind die
      // wenigen, die auf jedes passen.
      duell: { siege: {}, baelle: {}, frei: 0 },
      vorrat: {},                // erspielter Startvorteil für den nächsten Run
      wochen: {},                // die Aufträge dieser Woche und ihr Stand
      arten: {},                 // je Art der eigene Bestwert
      totals: { battles: 0, kos: 0, catches: 0, faints: 0, money: 0, turns: 0, evolutions: 0, playtime: 0 },
      history: [],
      settings: { theme: 'auto', lang: 'de', speed: 'normal', sound: true, music: true, volume: 0.5, confirmRisky: true, figur: 'rot' }
    };
  }

  var cache = null;

  function load() {
    if (cache) return cache;
    var s = storage(), raw = s && s.getItem(metaKey());
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
    // Aus elf Aufstiegen wurden fünf Stufen. Ein Spielstand von vorher trägt
    // noch die alte Zahl; unumgerechnet stünde "Aufstieg 9" plötzlich für den
    // Legendären Run. Umgerechnet bleibt der Rang erhalten, er heißt nur
    // anders — verschenkt wird die letzte Stufe dabei nicht.
    // Legendäre Pokémon gibt es nur noch im Legendären Run, und dort nur mit
    // einem Meisterball. Was vorher auf gewöhnlichem Weg in den Pokédex kam,
    // steht damit auf einer Grundlage, die es nicht mehr gibt — also wird es
    // einmalig gestrichen. Alles andere bleibt, wie es war.
    if (!cache.legendenReset) {
      dex.species.forEach(function (sp) {
        if (!dex.isLegendary(sp)) return;
        delete cache.seen[sp.i];
        delete cache.caught[sp.i];
        delete cache.shinies[sp.i];
        if (cache.arten) delete cache.arten[sp.i];
      });
      cache.legendenReset = true;
    }
    if (cache.stufenFassung !== 2) {
      // -1 heißt "noch nichts gewonnen" — das bleibt so, sonst schenkte die
      // Umrechnung jedem frischen Spielstand die zweite Stufe.
      if (cache.bestAscension >= 0) cache.bestAscension = PL.Run.stufeAusAltem(cache.bestAscension);
      cache.stufenFassung = 2;
    }
    return cache;
  }

  function save() {
    var s = storage();
    if (!s || !cache) return false;
    try { s.setItem(metaKey(), JSON.stringify(cache)); return true; } catch (e) { return false; }
  }

  /**
   * Vergisst den gemerkten Stand und liest ihn neu ein. Nötig, wenn der
   * Speicher von außen verändert wurde — etwa in einem zweiten Fenster.
   */
  function reload() { cache = null; return load(); }

  function reset() {
    cache = emptyMeta();
    var s = storage();
    if (s) { try { s.removeItem(metaKey()); s.removeItem(runKey()); } catch (e) {} }
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
    { id: 'ascend1', name: 'Aufstieg', desc: 'Gewinne auf Stufe 2 oder höher.', manual: true },
    { id: 'ascend5', name: 'Meister', desc: 'Gewinne auf Stufe 5 — Meisterschaft.', manual: true },
    { id: 'legendenrun', name: 'Legendenbezwinger', desc: 'Gewinne den Legendären Run.', manual: true },
    { id: 'notafraid', name: 'Kein Zurück', desc: 'Gewinne einen Kampf mit einem Pokémon auf 1 KP.', manual: true },
    { id: 'sweep', name: 'Alleingang', desc: 'Besiege ein volles Gegnerteam mit einem einzigen Pokémon.', manual: true },
    { id: 'mega', name: 'Mega', desc: 'Mega-entwickle ein Pokémon.', manual: true },
    { id: 'primal', name: 'Urgewalt', desc: 'Löse eine Protoform aus (Kyogre oder Groudon).', manual: true },
    { id: 'gigadynamax', name: 'Riesenwuchs', desc: 'Lass ein Pokémon gigadynamaximieren.', manual: true },
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
    afterCatch(m, sp);
    save();
    return fresh;
  }

  /**
   * Eintragen, ohne mitzuzählen: für alles, was man besitzt, ohne es gefangen
   * zu haben — Entwicklungen, Geschenke, Eier, Funde. Der Zähler »3× gefangen«
   * soll davon unberührt bleiben, der Eintrag im Pokédex aber entstehen.
   * Und wer schillernd ist, bleibt es auch nach der Entwicklung: die neue Art
   * bekommt ihren eigenen schillernden Eintrag.
   */
  function noteOwned(mon) {
    var m = load(), sp = dex.sp(mon.sp), changed = false;
    if (!m.seen[sp.i]) { m.seen[sp.i] = 1; changed = true; }
    if (!m.caught[sp.i]) { m.caught[sp.i] = 1; changed = true; }
    if (mon.shiny && !m.shinies[sp.i]) { m.shinies[sp.i] = 1; changed = true; }
    if (changed) afterCatch(m, sp);
    return changed;
  }

  /**
   * Trägt alles ein, was gerade im Team oder in der Box liegt. Das ist das
   * Sicherheitsnetz: Egal auf welchem Weg ein Pokémon dazugekommen ist —
   * Entwicklung im Kampf, Ei, Ausgrabung, Segen, Tausch —, spätestens beim
   * nächsten Speichern steht es im Pokédex. Geschrieben wird nur, wenn sich
   * wirklich etwas geändert hat.
   */
  function noteParty(run) {
    if (!run) return false;
    var changed = false;
    (run.party || []).concat(run.box || []).forEach(function (mon) {
      if (mon && mon.sp !== undefined && noteOwned(mon)) changed = true;
    });
    if (changed) save();
    return changed;
  }

  /** Die Auszeichnungen, die an einem neuen Eintrag hängen. */
  function afterCatch(m, sp) {
    if (dex.isLegendary(sp)) award('legendary');
    var gens = {};
    Object.keys(m.caught).forEach(function (i) { gens[dex.species[i].g] = 1; });
    if (Object.keys(gens).length >= 9) award('dex_all_gens');
  }

  /* ---------- Der Tages-Run ---------------------------------------------------
   * Für alle derselbe Startwert, ein Versuch, ein Ergebnis. Gemerkt wird nur
   * der heutige Tag: die Messlatte, die der Automat gesetzt hat, und das
   * eigene Ergebnis. Was gestern war, interessiert morgen niemanden mehr —
   * das hält den Spielstand klein.
   * -------------------------------------------------------------------------- */

  function heute() { return new Date().toISOString().slice(0, 10); }

  /** Der Startwert des Tages. Er hängt am Datum, also hat ihn jeder gleich. */
  function tagesStartwert(datum) {
    return PL.util.hashSeed('daily-' + (datum || heute()));
  }

  /** Der Stand von heute — leer, wenn der Tag noch frisch ist. */
  function tagesStand() {
    var m = load(), t = m.taeglich || {};
    if (t.datum !== heute()) return { datum: heute() };
    return t;
  }

  /** Trägt ein, was der Automat geschafft hat. */
  function setzeMesslatte(latte) {
    var m = load();
    var t = tagesStand();
    t.datum = heute();
    t.latte = latte;
    m.taeglich = t;
    save();
    return t;
  }

  /** Trägt das eigene Ergebnis ein. Der erste Versuch zählt. */
  function setzeTagesErgebnis(erg) {
    var m = load();
    var t = tagesStand();
    t.datum = heute();
    if (!t.eigen) t.eigen = erg;
    m.taeglich = t;
    save();
    return t;
  }

  /** Wurde der heutige Tages-Run schon gespielt? */
  function tagGespielt() { return !!tagesStand().eigen; }

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

  /* ---------- 4b) Meilensteine der Sammlung ------------------------------------
   * Der Pokédex war bisher eine Liste, die vollläuft, und sonst nichts. Wer
   * die dreihundertste Art fing, merkte es nicht einmal. Jetzt hängen an der
   * Sammlung Marken, und an jeder Marke hängt etwas, das man im nächsten Run
   * tatsächlich in der Hand hat.
   *
   * Der Lohn ist dauerhaft und gilt ab dem Moment, in dem die Marke fällt —
   * mit einer Ausnahme: Im Tages-Run gilt er nicht. Dort spielen alle
   * denselben Startwert, und ein Ergebnis ist nur vergleichbar, wenn auch
   * alle mit demselben Beutel anfangen.
   * -------------------------------------------------------------------------- */

  var MEILENSTEINE = [
    { id: 'faenge25', name: 'Sammler', bed: '25 Arten gefangen',
      wert: function (st) { return [st.caught, 25]; },
      lohn: { superbaelle: 2 }, lohnText: '+2 Superbälle zum Start' },
    { id: 'faenge75', name: 'Forscher', bed: '75 Arten gefangen',
      wert: function (st) { return [st.caught, 75]; },
      lohn: { geld: 250 }, lohnText: '+250 Startgeld' },
    { id: 'faenge150', name: 'Kenner', bed: '150 Arten gefangen',
      wert: function (st) { return [st.caught, 150]; },
      lohn: { traenke: 2 }, lohnText: '+2 Hypertränke zum Start' },
    { id: 'faenge300', name: 'Chronist', bed: '300 Arten gefangen',
      wert: function (st) { return [st.caught, 300]; },
      lohn: { beleber: 1 }, lohnText: '+1 Beleber zum Start' },
    { id: 'faenge500', name: 'Archivar', bed: '500 Arten gefangen',
      wert: function (st) { return [st.caught, 500]; },
      lohn: { geld: 350 }, lohnText: '+350 Startgeld' },
    { id: 'faenge800', name: 'Meistersammler', bed: '800 Arten gefangen',
      wert: function (st) { return [st.caught, 800]; },
      lohn: { relikte: 1 }, lohnText: 'Ein Relikt zur Wahl beim Start' },
    { id: 'gesehen500', name: 'Weitgereist', bed: '500 Arten gesehen',
      wert: function (st) { return [st.seen, 500]; },
      lohn: { superbaelle: 2 }, lohnText: '+2 Superbälle zum Start' },
    { id: 'shiny1', name: 'Glücksgriff', bed: 'Ein schillerndes Pokémon',
      wert: function (st) { return [st.shinies, 1]; },
      lohn: { shiny: 1.5 }, lohnText: 'Schillernde 1,5-mal so häufig' },
    { id: 'shiny5', name: 'Schimmerjäger', bed: 'Fünf schillernde Pokémon',
      wert: function (st) { return [st.shinies, 5]; },
      lohn: { shiny: 2 }, lohnText: 'Schillernde doppelt so häufig' },
    { id: 'shiny15', name: 'Farbensammler', bed: 'Fünfzehn schillernde Pokémon',
      wert: function (st) { return [st.shinies, 15]; },
      lohn: { shiny: 2.5 }, lohnText: 'Schillernde zweieinhalbmal so häufig' },
    { id: 'gen3', name: 'Drei Generationen', bed: 'Drei Generationen vollständig gefangen',
      wert: function (st) { return [st.volleGen, 3]; },
      lohn: { reroll: 1 }, lohnText: 'Einmal je Run eine Auswahl neu würfeln' },
    { id: 'gen9', name: 'Alle neun', bed: 'Alle neun Generationen vollständig',
      wert: function (st) { return [st.volleGen, 9]; },
      lohn: {}, einmal: { meisterball: 1 }, lohnText: 'Ein Meisterball, der auf jede Legende passt' }
  ];

  /** Der Sammlungsstand, wie ihn die Meilensteine sehen. */
  function sammelStand() {
    var st = dexStats(), volle = 0;
    for (var g = 1; g <= 9; g++) {
      if (st.byGen[g] && st.byGen[g].total > 0 && st.byGen[g].caught >= st.byGen[g].total) volle++;
    }
    return { caught: st.caught, seen: st.seen, shinies: st.shinies, volleGen: volle };
  }

  /** Alle Meilensteine mit Stand — für die Anzeige und für die Prüfung. */
  function meilensteine() {
    var m = load(), st = sammelStand();
    return MEILENSTEINE.map(function (ms) {
      var w = ms.wert(st);
      return {
        id: ms.id, name: ms.name, bed: ms.bed, lohnText: ms.lohnText,
        stand: Math.min(w[0], w[1]), ziel: w[1], geschafft: !!m.meilensteine[ms.id]
      };
    });
  }

  /**
   * Prüft, welche Marken neu gefallen sind. Gibt die neuen zurück, damit die
   * Oberfläche sie zeigen kann — gemeldet wird jede genau einmal.
   */
  function pruefeMeilensteine() {
    var m = load(), st = sammelStand(), neue = [];
    MEILENSTEINE.forEach(function (ms) {
      if (m.meilensteine[ms.id]) return;
      var w = ms.wert(st);
      if (w[0] < w[1]) return;
      m.meilensteine[ms.id] = Date.now();
      // Manche Marken zahlen einmalig in die Kasse statt dauerhaft in den Beutel.
      if (ms.einmal && ms.einmal.meisterball) gibFreienBall(ms.einmal.meisterball);
      neue.push({ id: ms.id, name: ms.name, lohnText: ms.lohnText });
    });
    if (neue.length) save();
    return neue;
  }

  /**
   * Was die gesammelten Marken zusammen wert sind. Zahlen addieren sich,
   * beim Schillernd-Faktor gilt der höchste — sonst käme man auf das
   * Neunfache, bloß weil drei Marken übereinanderliegen.
   */
  function sammelLohn() {
    var m = load();
    var lohn = { geld: 0, baelle: 0, superbaelle: 0, traenke: 0, beleber: 0,
                 relikte: 0, reroll: 0, shiny: 1 };
    MEILENSTEINE.forEach(function (ms) {
      if (!m.meilensteine[ms.id]) return;
      Object.keys(ms.lohn).forEach(function (k) {
        if (k === 'shiny') lohn.shiny = Math.max(lohn.shiny, ms.lohn[k]);
        else lohn[k] += ms.lohn[k];
      });
    });
    return lohn;
  }

  /* ---------- 4b2) Die Meisterball-Kasse ---------------------------------------
   * Legendäre Pokémon lassen sich nicht mehr auf dem gewöhnlichen Weg fangen.
   * Der einzige Ball, der bei ihnen wirkt, ist der Meisterball — und den gibt
   * es nur für einen durchgespielten Legendären Run.
   *
   * Die Kasse liegt hier und nicht im Run: Ein Meisterball überlebt das Ende
   * eines Runs und wartet auf den nächsten. Weg ist er erst, wenn er wirklich
   * geworfen wurde. Wer drei Runs schafft und keinen wirft, hat drei.
   * -------------------------------------------------------------------------- */

  /** Der Stand des Duells für eine Art: besiegt, Ball da, gefangen. */
  function duellStand(spIndex) {
    var m = load(), d = duellDaten(m);
    return {
      besiegt: !!d.siege[spIndex],
      ball: !!d.baelle[spIndex],
      frei: d.frei || 0,
      gefangen: !!m.caught[spIndex]
    };
  }

  function duellDaten(m) {
    if (!m.duell) m.duell = { siege: {}, baelle: {}, frei: 0 };
    if (!m.duell.siege) m.duell.siege = {};
    if (!m.duell.baelle) m.duell.baelle = {};
    if (typeof m.duell.frei !== 'number') m.duell.frei = 0;
    return m.duell;
  }

  /**
   * Ein gewonnenes Duell. Der erste Sieg über eine Art legt ihren Meisterball
   * bereit — genau einen, und nur für sie. Wer sie fangen will, muss also ein
   * zweites Mal antreten. Wiederholte Siege bringen nichts Neues: Sonst
   * stünde am leichtesten Gegner eine Ballfabrik.
   */
  function duellGewonnen(spIndex) {
    var m = load(), d = duellDaten(m);
    var erster = !d.siege[spIndex];
    d.siege[spIndex] = (d.siege[spIndex] || 0) + 1;
    if (erster && !m.caught[spIndex]) d.baelle[spIndex] = 1;
    save();
    return erster;
  }

  /** Verbraucht den Ball, mit dem gerade gefangen wurde. */
  function duellBallWeg(spIndex) {
    var m = load(), d = duellDaten(m);
    if (d.baelle[spIndex]) delete d.baelle[spIndex];
    else if (d.frei > 0) d.frei--;
    save();
  }

  /** Liegt für diese Art ein Ball bereit — ihrer oder ein freier? */
  function duellBallDa(spIndex) {
    var d = duellDaten(load());
    return !!d.baelle[spIndex] || d.frei > 0;
  }

  /** Ein Ball, der auf jede Legende passt. Den gibt es nur als Sammelmarke. */
  function gibFreienBall(n) {
    var d = duellDaten(load());
    d.frei = Math.max(0, d.frei + (n === undefined ? 1 : n));
    save();
    return d.frei;
  }

  /** Wie viele Legenden schon besiegt und wie viele gefangen sind. */
  function duellUebersicht() {
    var m = load(), d = duellDaten(m), besiegt = 0, gefangen = 0, baelle = 0;
    dex.species.forEach(function (sp) {
      if (!dex.isLegendary(sp) || sp.bo || sp.f) return;
      if (d.siege[sp.i]) besiegt++;
      if (m.caught[sp.i]) gefangen++;
      if (d.baelle[sp.i]) baelle++;
    });
    return { besiegt: besiegt, gefangen: gefangen, baelle: baelle, frei: d.frei || 0 };
  }

  /**
   * Steht das Legenden-Duell offen? Erst wer die fünfte Schwierigkeitsstufe
   * im gewöhnlichen Run gewonnen hat, darf antreten.
   */
  function legendenFrei() {
    return load().bestAscension >= (PL.Run.STUFEN.length - 1);
  }

  /* ---------- 4c) Wochenaufträge -----------------------------------------------
   * Drei Aufträge, jede Woche andere. Welche es sind, rechnet das Spiel aus
   * der Kalenderwoche aus — also hat sie jeder gleich, ohne dass irgendwo ein
   * Server steht. Was man dafür bekommt, landet im Vorrat und wird beim
   * nächsten Run mitgegeben.
   * -------------------------------------------------------------------------- */

  var AUFTRAEGE = [
    { id: 'siege', text: 'Gewinne {n} Kämpfe', ziele: [40, 60, 90],
      lohn: { traenke: 3 }, lohnText: '+3 Hypertränke' },
    { id: 'faenge', text: 'Fange {n} Pokémon', ziele: [10, 18, 25],
      lohn: { superbaelle: 4 }, lohnText: '+4 Superbälle' },
    { id: 'arten', text: 'Trage {n} neue Arten in den Pokédex ein', ziele: [8, 15, 25],
      lohn: { geld: 300 }, lohnText: '+300 Startgeld' },
    { id: 'entwicklungen', text: 'Entwickle {n} Pokémon', ziele: [6, 10, 16],
      lohn: { traenke: 2, beleber: 1 }, lohnText: '+2 Hypertränke, +1 Beleber' },
    { id: 'regionen', text: 'Schaffe {n} Regionen', ziele: [8, 14, 20],
      lohn: { beleber: 2 }, lohnText: '+2 Beleber' },
    { id: 'runs', text: 'Beende {n} Runs', ziele: [3, 5, 8],
      lohn: { geld: 300 }, lohnText: '+300 Startgeld' },
    { id: 'bosse', text: 'Besiege {n} Arenaleiter', ziele: [10, 16, 24],
      lohn: { superbaelle: 3, traenke: 2 }, lohnText: '+3 Superbälle, +2 Hypertränke' },
    { id: 'legenden', text: 'Besiege {n} legendäre Pokémon', ziele: [1, 2, 4],
      lohn: { beleber: 1, geld: 250 }, lohnText: '+1 Beleber, +250 Startgeld' }
  ];

  /**
   * Der Preis für eine volle Woche. Er ist der eigentliche Grund, alle drei
   * Aufträge zu machen: Ein Relikt bestimmt einen Run mehr als jeder Beutel
   * voll Tränke — und genau deshalb gibt es höchstens eines pro Woche.
   */
  var WOCHENPREIS = { lohn: { relikte: 1 }, text: 'Ein Relikt zur Wahl beim nächsten Run' };

  /**
   * Die Kalenderwoche nach ISO — Montag ist der erste Tag, und die Woche mit
   * dem ersten Donnerstag ist Woche 1. "2026-W37" ist der Schlüssel, unter
   * dem die Aufträge stehen.
   */
  function wochenSchluessel(datum) {
    var d = new Date((datum || heute()) + 'T12:00:00Z');
    var tag = (d.getUTCDay() + 6) % 7;                 // Montag = 0
    d.setUTCDate(d.getUTCDate() - tag + 3);            // auf den Donnerstag
    var jahr = d.getUTCFullYear();
    var ersterDo = new Date(Date.UTC(jahr, 0, 4));
    ersterDo.setUTCDate(ersterDo.getUTCDate() - ((ersterDo.getUTCDay() + 6) % 7) + 3);
    var woche = 1 + Math.round((d - ersterDo) / (7 * 864e5));
    return jahr + '-W' + (woche < 10 ? '0' : '') + woche;
  }

  /** Die drei Aufträge dieser Woche — für alle dieselben. */
  function wochenAuftraege(schluessel) {
    var key = schluessel || wochenSchluessel();
    var rng = PL.rng(PL.util.hashSeed('woche-' + key));
    var topf = AUFTRAEGE.slice();
    var gewaehlt = [];
    for (var i = 0; i < 3 && topf.length; i++) {
      var idx = rng.int(topf.length);
      var a = topf.splice(idx, 1)[0];
      var stufe = rng.int(a.ziele.length);
      gewaehlt.push({
        id: a.id, ziel: a.ziele[stufe],
        text: a.text.replace('{n}', String(a.ziele[stufe])),
        lohn: a.lohn, lohnText: a.lohnText
      });
    }
    return gewaehlt;
  }

  /** Der Stand dieser Woche — eine neue Woche fängt bei null an. */
  function wochenStand() {
    var m = load(), key = wochenSchluessel();
    if (!m.wochen || m.wochen.woche !== key) {
      m.wochen = { woche: key, zaehler: {}, geholt: {} };
      save();
    }
    var w = m.wochen;
    return {
      woche: key,
      preis: WOCHENPREIS.text,
      preisGeholt: !!w.preis,
      auftraege: wochenAuftraege(key).map(function (a) {
        return {
          id: a.id, text: a.text, ziel: a.ziel, lohnText: a.lohnText,
          stand: Math.min(a.ziel, w.zaehler[a.id] || 0),
          geschafft: !!w.geholt[a.id]
        };
      })
    };
  }

  /**
   * Zählt etwas auf die Wochenaufträge an. Liefert die Aufträge zurück, die
   * dadurch fertig wurden — samt Lohn, der sofort in den Vorrat wandert.
   */
  function zaehleWoche(werte) {
    var m = load();
    wochenStand();                                     // sorgt für die richtige Woche
    var w = m.wochen, fertig = [];
    Object.keys(werte || {}).forEach(function (k) {
      if (!werte[k]) return;
      w.zaehler[k] = (w.zaehler[k] || 0) + werte[k];
    });
    var alle = wochenAuftraege(w.woche);
    alle.forEach(function (a) {
      if (w.geholt[a.id] || (w.zaehler[a.id] || 0) < a.ziel) return;
      w.geholt[a.id] = true;
      legeInVorrat(a.lohn);
      fertig.push({ id: a.id, text: a.text, lohnText: a.lohnText });
    });
    // Die volle Woche zählt extra — einmal, und nur einmal.
    if (!w.preis && alle.every(function (a) { return w.geholt[a.id]; })) {
      w.preis = true;
      legeInVorrat(WOCHENPREIS.lohn);
      fertig.push({ id: 'wochenpreis', text: 'Alle drei Aufträge dieser Woche', lohnText: WOCHENPREIS.text });
    }
    save();
    return fertig;
  }

  /* ---------- 4d) Vorrat ------------------------------------------------------- */

  /** Legt erspielten Lohn beiseite. Verbraucht wird er beim nächsten Run. */
  function legeInVorrat(lohn) {
    var m = load();
    m.vorrat = m.vorrat || {};
    Object.keys(lohn || {}).forEach(function (k) {
      m.vorrat[k] = (m.vorrat[k] || 0) + lohn[k];
    });
    save();
    return m.vorrat;
  }

  function vorrat() { return Object.assign({}, load().vorrat || {}); }

  /** Nimmt den Vorrat heraus und leert ihn — genau einmal, beim Start. */
  function hebeVorrat() {
    var m = load();
    var v = Object.assign({}, m.vorrat || {});
    m.vorrat = {};
    save();
    return v;
  }

  /**
   * Was ein Run zum Start mitbekommt: die dauerhaften Marken plus alles, was
   * seit dem letzten Mal im Vorrat lag. Der Tages-Run bekommt nichts — dort
   * fängt jeder gleich an, sonst wäre kein Ergebnis vergleichbar.
   */
  function startVorteil(modus) {
    if (modus === 'taeglich') return null;
    // Das Legenden-Duell bringt keinen Sammlungslohn mit: Es zählt allein,
    // was man aufgestellt hat.
    if (modus === 'legenden') return null;
    var lohn = sammelLohn(), v = hebeVorrat();
    ['geld', 'baelle', 'superbaelle', 'traenke', 'beleber', 'relikte',
     'reroll'].forEach(function (k) {
      lohn[k] = (lohn[k] || 0) + (v[k] || 0);
    });
    return lohn;
  }

  /* ---------- 4e) Bestwerte je Art ----------------------------------------------
   * Wer mit demselben Pokémon zum fünften Mal antritt, soll sehen, dass es
   * dasselbe ist. Gemerkt wird das höchste Level, das diese Art je erreicht
   * hat, wie viele Kämpfe sie bestritten hat und in wie vielen Runs sie dabei
   * war — im Pokédex steht es unter ihrem Bild.
   * -------------------------------------------------------------------------- */

  function merkeArten(run) {
    if (!run) return false;
    var m = load(), geaendert = false;
    var alle = (run.party || []).concat(run.box || []);
    var gesehen = {};
    alle.forEach(function (mon) {
      if (!mon || mon.sp === undefined) return;
      var eintrag = m.arten[mon.sp] || (m.arten[mon.sp] = { lvl: 0, kaempfe: 0, runs: 0 });
      if (mon.lvl > eintrag.lvl) { eintrag.lvl = mon.lvl; geaendert = true; }
      if (mon.kaempfe) { eintrag.kaempfe += mon.kaempfe; geaendert = true; }
      if (!gesehen[mon.sp]) { gesehen[mon.sp] = true; eintrag.runs++; geaendert = true; }
    });
    // Auch wer gefallen ist, hat gelebt.
    (run.graveyard || []).forEach(function (g) {
      if (!g || g.sp === undefined) return;
      var eintrag = m.arten[g.sp] || (m.arten[g.sp] = { lvl: 0, kaempfe: 0, runs: 0 });
      if (g.lvl > eintrag.lvl) { eintrag.lvl = g.lvl; geaendert = true; }
      if (!gesehen[g.sp]) { gesehen[g.sp] = true; eintrag.runs++; geaendert = true; }
    });
    if (geaendert) save();
    return geaendert;
  }

  /** Der eigene Bestwert einer Art — oder nichts, wenn sie nie dabei war. */
  function artRekord(spIndex) {
    var e = load().arten[spIndex];
    return e && (e.lvl || e.runs) ? e : null;
  }

  /* ---------- 5) Aufstiege ---------------------------------------------------- */

  // Die Stufen selbst stehen in run.js — dort, wo ihre Regeln wirken.
  var ASCENSIONS = PL.Run.STUFEN;

  function maxAscension() {
    var m = load();
    return Math.min(ASCENSIONS.length - 1, m.bestAscension + 1);
  }

  /** Name und Kurzfassung einer Stufe, wie sie überall angezeigt werden. */
  function stufenName(n) {
    var st = ASCENSIONS[Math.min(Math.max(0, n | 0), ASCENSIONS.length - 1)];
    return 'Stufe ' + (Math.min(Math.max(0, n | 0), ASCENSIONS.length - 1) + 1) + ' — ' + st.name;
  }

  /* ---------- 6) Statistik und Runs ------------------------------------------- */

  /** Trägt einen beendeten Run in die Dauerstatistik ein. */
  function recordRun(run, outcome) {
    var m = load();
    // Ein Legenden-Duell ist kein Run: Es zählt nicht als gespielter Run, es
    // hebt keinen Rang und es macht niemanden zum Champ. Gezählt wird nur,
    // was wirklich passiert ist — Kämpfe, Runden, Fänge.
    if (run.mode === 'legenden') {
      m.totals.battles += run.stats.battles;
      m.totals.kos += run.stats.kos;
      m.totals.catches += run.stats.catches;
      m.totals.faints += run.stats.faints;
      m.totals.turns += run.stats.turns;
      if (outcome === 'sieg') award('legendenrun');
      save();
      return refreshAchievements();
    }
    m.runs++;
    if (outcome === 'sieg') {
      m.wins++;
      if (run.ascension > m.bestAscension) m.bestAscension = run.ascension;
      if (run.ascension >= 1) award('ascend1');
      if (run.ascension >= 4) award('ascend5');
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
    try { s.setItem(runKey(), JSON.stringify(run.toJSON())); return true; } catch (e) { return false; }
  }

  /** Liest den gespeicherten Run — aber nur, wenn das Format noch passt. */
  function loadRun() {
    var s = storage(), raw = s && s.getItem(runKey());
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (data.version !== PL.Run.VERSION) { clearRun(); return null; }
      return PL.Run.fromJSON(data);
    } catch (e) {
      clearRun();
      return null;
    }
  }

  function clearRun() {
    var s = storage();
    if (s) { try { s.removeItem(runKey()); } catch (e) {} }
  }

  function hasRun() {
    var s = storage(), raw = s && s.getItem(runKey());
    if (!raw) return false;
    try { return JSON.parse(raw).version === PL.Run.VERSION; } catch (e) { return false; }
  }

  /* ---------- 8) Speicherplätze ------------------------------------------------
   * Drei Plätze zum Speichern von Hand, dazu der laufende Run, der sich von
   * selbst mitschreibt. Ein Platz hält alles, was man zum Weiterspielen
   * braucht: den Run und den Fortschritt des Profils.
   * -------------------------------------------------------------------------- */

  /** Die Kurzbeschreibung eines Platzes für die Übersicht. */
  function describeSlot(data) {
    if (!data || !data.run) return null;
    var run = data.run;
    var region = PL.world && PL.world.REGIONS && PL.world.REGIONS[run.region];
    var team = (run.party || []).map(function (m) {
      return { sp: m.sp, lvl: m.lvl, shiny: !!m.shiny, hp: m.hp };
    });
    var level = team.length
      ? Math.round(team.reduce(function (a, m) { return a + m.lvl; }, 0) / team.length) : 0;
    return {
      name: data.name || '',
      saved: data.saved || 0,
      region: run.region || 0,
      regionName: run.leagueStage >= 0 ? 'Pokémon-Liga' : (region ? region.name : 'Unterwegs'),
      row: (run.rowIndex || 0) + 1,
      team: team,
      level: level,
      money: run.money || 0,
      ascension: run.ascension === undefined ? 0 : run.ascension,
      mode: run.mode || 'klassisch',
      nuzlocke: !!run.nuzlocke,
      battles: (run.stats && run.stats.battles) || 0
    };
  }

  function readSlot(n) {
    var s = storage(), raw = s && s.getItem(n === 0 ? runKey() : slotKey(n));
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      // Platz 0 ist der laufende Run: dort steht der Run pur, ohne Hülle.
      if (n === 0) return { run: data, saved: 0, name: 'Zuletzt gespielt' };
      return data;
    } catch (e) { return null; }
  }

  /** Alle Plätze mit ihrer Beschreibung — Platz 0 ist der laufende Run. */
  function slots() {
    var out = [], n;
    for (n = 0; n <= SLOTS; n++) {
      var data = readSlot(n);
      var info = describeSlot(data);
      var alt = data && data.run && PL.Run && data.run.version !== PL.Run.VERSION;
      out.push({
        n: n,
        auto: n === 0,
        empty: !info,
        outdated: !!alt,
        info: info
      });
    }
    return out;
  }

  /** Speichert den laufenden Run auf einem Platz. */
  function saveSlot(n, run, name) {
    var s = storage();
    if (!s || !run || n < 1 || n > SLOTS) return false;
    try {
      s.setItem(slotKey(n), JSON.stringify({
        v: 1, saved: Date.now(), name: name || '', run: run.toJSON()
      }));
      return true;
    } catch (e) { return false; }
  }

  /** Holt den Run von einem Platz zurück. */
  function loadSlot(n) {
    var data = readSlot(n);
    if (!data || !data.run || !PL.Run) return null;
    if (data.run.version !== PL.Run.VERSION) return null;
    try { return PL.Run.fromJSON(data.run); } catch (e) { return null; }
  }

  function deleteSlot(n) {
    var s = storage();
    if (!s || n < 1 || n > SLOTS) return false;
    try { s.removeItem(slotKey(n)); return true; } catch (e) { return false; }
  }

  /* ---------- Sichern und Einspielen ------------------------------------------
   * Als Text, nicht als Datei: In eingebetteten Fenstern sind Downloads
   * gesperrt, Kopieren und Einfügen funktioniert überall.
   * -------------------------------------------------------------------------- */

  function exportSave() {
    var s = storage();
    var runRaw = s && s.getItem(runKey());
    return JSON.stringify({
      format: SAVE_FORMAT,
      version: SAVE_VERSION,
      runVersion: PL.Run ? PL.Run.VERSION : null,
      exported: new Date().toISOString(),
      meta: load(),
      run: runRaw ? JSON.parse(runRaw) : null
    });
  }

  /**
   * Spielt einen gesicherten Stand ein. Gibt { ok, text } zurück und fasst
   * nichts an, solange die Datei nicht plausibel ist.
   */
  function importSave(text) {
    var data;
    try { data = JSON.parse(String(text || '').trim()); }
    catch (e) { return { ok: false, text: 'Das ist kein gültiger Spielstand — der Text lässt sich nicht lesen.' }; }
    if (!data || data.format !== SAVE_FORMAT) {
      return { ok: false, text: 'Das ist kein Pokélike-Spielstand.' };
    }
    if (!data.meta || typeof data.meta !== 'object') {
      return { ok: false, text: 'Dem Spielstand fehlt der Fortschritt.' };
    }
    var s = storage();
    if (!s) return { ok: false, text: 'Dieser Browser lässt kein Speichern zu.' };

    cache = emptyMeta();
    Object.keys(cache).forEach(function (k) {
      if (data.meta[k] === undefined) return;
      if (k === 'settings' || k === 'totals') Object.assign(cache[k], data.meta[k]);
      else cache[k] = data.meta[k];
    });
    save();

    var runNote = '';
    if (data.run && PL.Run && data.run.version === PL.Run.VERSION) {
      try { s.setItem(runKey(), JSON.stringify(data.run)); runNote = ' Der laufende Run wurde mitgeladen.'; }
      catch (e) { runNote = ' Der laufende Run passte nicht mehr ins Format.'; }
    } else {
      clearRun();
      if (data.run) runNote = ' Der laufende Run stammt aus einer älteren Fassung und wurde ausgelassen.';
    }
    return { ok: true, text: 'Spielstand eingespielt.' + runNote };
  }

  function settings() { return load().settings; }
  function setSetting(key, value) { load().settings[key] = value; save(); return value; }

  PL.meta = {
    load: load, save: save, reset: reset,
    profiles: profiles, activeProfile: activeProfile, activeProfileId: activeProfileId,
    createProfile: createProfile, switchProfile: switchProfile,
    renameProfile: renameProfile, deleteProfile: deleteProfile,
    slots: slots, saveSlot: saveSlot, loadSlot: loadSlot, deleteSlot: deleteSlot,
    SLOTS: SLOTS,
    starters: starters, unlockState: unlockState, unlockText: UNLOCK_TEXT,
    achievements: achievements, refreshAchievements: refreshAchievements, award: award,
    reload: reload,
    heute: heute, tagesStartwert: tagesStartwert, tagesStand: tagesStand,
    setzeMesslatte: setzeMesslatte, setzeTagesErgebnis: setzeTagesErgebnis,
    tagGespielt: tagGespielt,
    noteSeen: noteSeen, noteCaught: noteCaught, noteOwned: noteOwned,
    noteParty: noteParty, dexStats: dexStats,
    ASCENSIONS: ASCENSIONS, maxAscension: maxAscension, stufenName: stufenName,
    MEILENSTEINE: MEILENSTEINE, meilensteine: meilensteine,
    pruefeMeilensteine: pruefeMeilensteine, sammelLohn: sammelLohn, sammelStand: sammelStand,
    WOCHENPREIS: WOCHENPREIS,
    wochenSchluessel: wochenSchluessel, wochenAuftraege: wochenAuftraege,
    wochenStand: wochenStand, zaehleWoche: zaehleWoche,
    vorrat: vorrat, legeInVorrat: legeInVorrat, hebeVorrat: hebeVorrat, startVorteil: startVorteil,
    duellStand: duellStand, duellGewonnen: duellGewonnen, duellBallWeg: duellBallWeg,
    duellBallDa: duellBallDa, duellUebersicht: duellUebersicht, gibFreienBall: gibFreienBall,
    legendenFrei: legendenFrei,
    merkeArten: merkeArten, artRekord: artRekord,
    recordRun: recordRun,
    saveRun: saveRun, loadRun: loadRun, clearRun: clearRun, hasRun: hasRun,
    exportSave: exportSave, importSave: importSave,
    SAVE_FORMAT: SAVE_FORMAT, SAVE_VERSION: SAVE_VERSION,
    settings: settings, setSetting: setSetting,
    available: function () { return !!storage(); },
    durable: durable
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.meta;
})(typeof globalThis !== 'undefined' ? globalThis : this);
