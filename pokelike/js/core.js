/* =============================================================================
 * core.js — Zufall, Pokédex-Zugriff, Übersetzungen, Hilfsfunktionen
 * -----------------------------------------------------------------------------
 * Alles, was jede andere Datei braucht, hängt unter dem globalen Objekt PL.
 * Keine Module, keine Abhängigkeiten: das Spiel läuft aus dem Dateisystem.
 *
 * Gliederung:  1) Grundwerkzeug   2) Zufallsgenerator   3) Pokédex
 *              4) Deutsche Bezeichnungen               5) Sprites
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  var DEX = root.PL_DEX || (typeof require === 'function' ? require('../data/dex.js') : null);
  if (!DEX) throw new Error('data/dex.js fehlt — bitte "npm run build:data" ausführen.');

  /* ---------- 1) Grundwerkzeug -------------------------------------------- */

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function toID(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sum(a) { var t = 0, i; for (i = 0; i < a.length; i++) t += a[i]; return t; }

  /* ---------- 2) Zufallsgenerator ------------------------------------------
   * mulberry32: ein Wort Zustand, damit ein laufender Run vollständig
   * gespeichert und identisch fortgesetzt werden kann. Jeder Bereich des
   * Spiels (Karte, Kämpfe, Belohnungen) zieht aus einem eigenen Strom, damit
   * eine Entscheidung nicht die Würfel eines anderen Bereichs verschiebt.
   * ---------------------------------------------------------------------- */

  function hashSeed(str) {
    var h = 2166136261 >>> 0, i;
    str = String(str);
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function RNG(seed) {
    this.s = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  }
  RNG.prototype.next = function () {                 // [0,1)
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    var t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.int = function (n) { return Math.floor(this.next() * n); };
  RNG.prototype.range = function (a, b) { return a + this.int(b - a + 1); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr[this.int(arr.length)]; };
  RNG.prototype.sample = function (arr, n) {
    var copy = arr.slice(), out = [], i;
    for (i = 0; i < n && copy.length; i++) out.push(copy.splice(this.int(copy.length), 1)[0]);
    return out;
  };
  RNG.prototype.shuffle = function (arr) {
    var i, j, t;
    for (i = arr.length - 1; i > 0; i--) { j = this.int(i + 1); t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  /** Gewichtete Auswahl: items = [{w: Gewicht, ...}] oder paralleles Gewichts-Array. */
  RNG.prototype.weighted = function (items, weightOf) {
    var total = 0, i, r;
    for (i = 0; i < items.length; i++) total += weightOf ? weightOf(items[i]) : items[i].w;
    r = this.next() * total;
    for (i = 0; i < items.length; i++) {
      r -= weightOf ? weightOf(items[i]) : items[i].w;
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };
  RNG.prototype.save = function () { return this.s; };
  RNG.prototype.load = function (s) { this.s = s >>> 0; return this; };
  RNG.prototype.fork = function (tag) { return new RNG((this.s ^ hashSeed(tag)) >>> 0); };

  /* ---------- 3) Pokédex ---------------------------------------------------
   * Die Rohdaten aus data/dex.js sind auf Größe getrimmt (kurze Schlüssel).
   * Hier bekommen sie Index-Tabellen und sprechende Zugriffsfunktionen.
   * ---------------------------------------------------------------------- */

  var speciesById = {}, moveById = {}, abilityById = {}, natureByName = {};
  var i, s;

  for (i = 0; i < DEX.species.length; i++) {
    s = DEX.species[i];
    s.i = i;
    s.bst = sum(s.bs);
    speciesById[s.id] = s;
  }
  for (i = 0; i < DEX.moves.length; i++) { DEX.moves[i].i = i; moveById[DEX.moves[i].id] = DEX.moves[i]; }
  for (i = 0; i < DEX.abilities.length; i++) abilityById[DEX.abilities[i].id] = DEX.abilities[i];
  for (i = 0; i < DEX.natures.length; i++) natureByName[DEX.natures[i].n] = DEX.natures[i];

  var STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

  var dex = {
    raw: DEX,
    types: DEX.types,
    stats: STATS,
    species: DEX.species,
    moves: DEX.moves,
    abilities: DEX.abilities,
    natures: DEX.natures,
    megas: DEX.megas,

    sp: function (ref) {
      if (typeof ref === 'number') return DEX.species[ref];
      if (typeof ref === 'string') return speciesById[toID(ref)];
      return ref;
    },
    move: function (ref) {
      if (typeof ref === 'number') return DEX.moves[ref];
      if (typeof ref === 'string') return moveById[toID(ref)];
      return ref;
    },
    ability: function (ref) { return typeof ref === 'string' ? abilityById[toID(ref)] : ref; },
    nature: function (name) { return natureByName[name]; },

    /** Schadensfaktor eines Angriffstyps gegen ein (ein- oder zweifaches) Ziel. */
    eff: function (atkType, defTypes) {
      var row = DEX.chart[atkType], m = 1, k;
      if (!row) return 1;
      for (k = 0; k < defTypes.length; k++) m *= (row[defTypes[k]] !== undefined ? row[defTypes[k]] : 1);
      return m;
    },

    /** Alle Attacken, die eine Spezies überhaupt lernen kann (Indizes). */
    movepool: function (sp, maxLevel) {
      var out = [], lv = sp.lv, k;
      for (k = 0; k < lv.length; k += 2) {
        if (maxLevel === undefined || lv[k + 1] <= maxLevel) out.push(lv[k]);
      }
      for (k = 0; k < sp.tm.length; k++) out.push(sp.tm[k]);
      return out;
    },

    /** Levelattacken bis einschließlich Level, jüngste zuerst. */
    levelMoves: function (sp, level) {
      var out = [], k;
      for (k = 0; k < sp.lv.length; k += 2) if (sp.lv[k + 1] <= level) out.push({ m: sp.lv[k], lvl: sp.lv[k + 1] });
      out.sort(function (a, b) { return b.lvl - a.lvl; });
      return out;
    },

    /** Erste Stufe einer Entwicklungslinie. */
    baseOf: function (sp) {
      var guard = 0;
      while (sp.pv !== undefined && guard++ < 5) sp = DEX.species[sp.pv];
      return sp;
    },

    /** Wie viele Entwicklungen dieser Spezies noch bevorstehen. */
    evosLeft: function (sp) {
      var n = 0, cur = sp, guard = 0;
      while (cur.ev && cur.ev.length && guard++ < 4) { n++; cur = DEX.species[cur.ev[0]]; }
      return n;
    },

    isLegendary: function (sp) {
      return !!(sp.tag && sp.tag.some(function (t) { return /Legendary|Mythical|Paradox|Ultra Beast/.test(t); }));
    },
    isRestricted: function (sp) {
      return !!(sp.tag && sp.tag.some(function (t) { return /Restricted|Mythical/.test(t); }));
    },
    megasFor: function (sp) { return DEX.megas[sp.id] || DEX.megas[toID(sp.base || '')] || null; }
  };

  /* ---------- 4) Deutsche Bezeichnungen ----------------------------------- */

  var TYPE_DE = {
    Normal: 'Normal', Fire: 'Feuer', Water: 'Wasser', Electric: 'Elektro', Grass: 'Pflanze',
    Ice: 'Eis', Fighting: 'Kampf', Poison: 'Gift', Ground: 'Boden', Flying: 'Flug',
    Psychic: 'Psycho', Bug: 'Käfer', Rock: 'Gestein', Ghost: 'Geist', Dragon: 'Drache',
    Dark: 'Unlicht', Steel: 'Stahl', Fairy: 'Fee'
  };

  var NATURE_DE = {
    Hardy: 'Robust', Lonely: 'Solo', Brave: 'Mutig', Adamant: 'Hart', Naughty: 'Frech',
    Bold: 'Kühn', Docile: 'Sanft', Relaxed: 'Locker', Impish: 'Pfiffig', Lax: 'Lasch',
    Timid: 'Scheu', Hasty: 'Hastig', Serious: 'Ernst', Jolly: 'Froh', Naive: 'Naiv',
    Modest: 'Mäßig', Mild: 'Mild', Quiet: 'Ruhig', Bashful: 'Zaghaft', Rash: 'Hitzig',
    Calm: 'Still', Gentle: 'Zart', Sassy: 'Forsch', Careful: 'Sacht', Quirky: 'Kauzig'
  };

  var STAT_DE = { hp: 'KP', atk: 'Angriff', def: 'Verteidigung', spa: 'Sp.-Angriff', spd: 'Sp.-Verteidigung', spe: 'Initiative' };
  var STAT_SHORT = { hp: 'KP', atk: 'ANG', def: 'VER', spa: 'SPA', spd: 'SPV', spe: 'INI' };

  var STATUS_DE = {
    brn: 'Verbrennung', par: 'Paralyse', psn: 'Vergiftung', tox: 'Schwere Vergiftung',
    slp: 'Schlaf', frz: 'Gefroren'
  };
  var STATUS_SHORT = { brn: 'VBR', par: 'PAR', psn: 'GIF', tox: 'GIF+', slp: 'SLF', frz: 'GFR' };

  var WEATHER_DE = {
    sunnyday: 'Sonnenschein', raindance: 'Regen', sandstorm: 'Sandsturm', snowscape: 'Schnee',
    hail: 'Hagel', desolateland: 'Enorme Sonne', primordialsea: 'Strömender Regen', deltastream: 'Luftschleier'
  };
  var TERRAIN_DE = {
    electricterrain: 'Elektrofeld', grassyterrain: 'Grasfeld', mistyterrain: 'Nebelfeld', psychicterrain: 'Psychofeld'
  };

  var lang = 'de';   // wird von der Oberfläche gesetzt: 'de' oder 'en'

  var t = {
    setLang: function (l) { lang = l === 'en' ? 'en' : 'de'; },
    lang: function () { return lang; },
    species: function (sp) { return (lang === 'de' && sp.dn) ? sp.dn : sp.n; },
    type: function (ty) { return lang === 'de' ? (TYPE_DE[ty] || ty) : ty; },
    nature: function (n) { return lang === 'de' ? (NATURE_DE[n] || n) : n; },
    stat: function (st) { return lang === 'de' ? STAT_DE[st] : st.toUpperCase(); },
    statShort: function (st) { return lang === 'de' ? STAT_SHORT[st] : st.toUpperCase(); },
    status: function (st) { return STATUS_DE[st] || st; },
    statusShort: function (st) { return STATUS_SHORT[st] || st.toUpperCase(); },
    weather: function (w) { return WEATHER_DE[w] || w; },
    terrain: function (tr) { return TERRAIN_DE[tr] || tr; },
    typeDE: TYPE_DE
  };

  /* ---------- 5) Sprites ---------------------------------------------------
   * Die Bilder liegen bei Pokémon Showdown und PokeAPI. Es wird nichts
   * heruntergeladen und nichts gespeichert — die Oberfläche hängt die
   * Adressen als <img src> ein und fällt bei einem Fehler zur nächsten Quelle
   * weiter, zuletzt auf eine gezeichnete Platzhalter-Kugel.
   * ---------------------------------------------------------------------- */

  var SHOWDOWN = 'https://play.pokemonshowdown.com/sprites/';
  var POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

  function spriteId(sp) {
    if (!sp.f) return sp.id;
    return toID(sp.base) + '-' + toID(sp.f);
  }

  /** Liste von Adressen, von hübsch nach robust. */
  function spriteChain(sp, opts) {
    opts = opts || {};
    var sid = spriteId(sp), num = sp.num, shiny = opts.shiny, back = opts.back, out = [];
    if (back) {
      out.push(SHOWDOWN + (shiny ? 'ani-back-shiny/' : 'ani-back/') + sid + '.gif');
      out.push(SHOWDOWN + (shiny ? 'gen5-back-shiny/' : 'gen5-back/') + sid + '.png');
    } else {
      out.push(SHOWDOWN + (shiny ? 'ani-shiny/' : 'ani/') + sid + '.gif');
    }
    out.push(SHOWDOWN + (shiny ? 'home-shiny/' : 'home/') + sid + '.png');
    out.push(POKEAPI + (shiny ? 'shiny/' : '') + num + '.png');
    return out;
  }

  PL.util = { clamp: clamp, cap: cap, toID: toID, clone: clone, sum: sum, hashSeed: hashSeed };
  PL.RNG = RNG;
  PL.rng = function (seed) { return new RNG(seed); };
  PL.dex = dex;
  PL.t = t;
  PL.sprite = { chain: spriteChain, id: spriteId };
  PL.STATS = STATS;

  if (typeof module !== 'undefined' && module.exports) module.exports = PL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
