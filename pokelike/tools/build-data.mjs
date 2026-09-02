/**
 * Backt die Pokémon-Daten aller neun Generationen in eine einzige statische
 * JS-Datei (data/dex.js), die das Spiel ohne Server und ohne Netz laden kann.
 *
 * Quelle: @pkmn/dex (Daten des Pokémon-Showdown-Projekts, MIT) für Werte,
 * Typen, Attacken, Fähigkeiten und Lernsets; das Paket `pokemon` für die
 * deutschen Namen.
 *
 *   node tools/build-data.mjs
 */
import { Dex } from '@pkmn/dex';
import pokemonNames from 'pokemon';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'data', 'dex.js');
const gen = Dex.forGen(9);

/* ---------------------------------------------------------------- Typen -- */

const TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
  'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark',
  'Steel', 'Fairy',
];
// chart[Angriffstyp][Verteidigungstyp] = Multiplikator
const chart = {};
for (const atk of TYPES) chart[atk] = {};
for (const def of TYPES) {
  const taken = gen.types.get(def).damageTaken;
  for (const atk of TYPES) {
    chart[atk][def] = [1, 2, 0.5, 0][taken[atk] ?? 0];
  }
}

/* -------------------------------------------------------------- Spezies -- */

// Formen, die als eigenständige Spezies ins Spiel kommen. Megas werden separat
// als Mechanik geführt, Gigadynamax und rein kosmetische Formen fliegen raus.
const SKIP_FORME = /^(Mega|Mega-X|Mega-Y|Gmax|Eternamax|Totem|Starter|Cosplay|Rock-Star|Belle|Pop-Star|PhD|Libre|Original|Hoenn|Sinnoh|Unova|Kalos|Alola-Cap|Partner|World|Bloodmoon-)/i;
const SKIP_ID = new Set(['pikachustarter', 'eeveestarter', 'floetteeternal']);

// Vier Paradox-Pokémon tragen in den Quelldaten keine Markierung.
const UNTAGGED_PARADOX = new Set(['gougingfire', 'ragingbolt', 'ironboulder', 'ironcrown']);

const isReal = (s) =>
  s.num >= 1 && s.num <= 1025 &&
  (!s.isNonstandard || s.isNonstandard === 'Past') &&
  !SKIP_ID.has(s.id);

// Rein kosmetische Formen (Vivillon-Muster, Alcremie-Sorten, Tatsugiri-Posen)
// haben dieselben Werte und Typen wie das Grundpokémon und würden die
// Begegnungstabellen nur aufblähen.
const isCosmetic = (s) => {
  if (!s.forme) return false;
  const base = gen.species.get(s.baseSpecies);
  if (!base || base.id === s.id) return false;
  const sameStats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
    .every((k) => base.baseStats[k] === s.baseStats[k]);
  const sameTypes = base.types.join('/') === s.types.join('/');
  const sameAbility = base.abilities[0] === s.abilities[0];
  return sameStats && sameTypes && sameAbility;
};

const speciesList = gen.species.all()
  .filter((s) => isReal(s) && !(s.forme && SKIP_FORME.test(s.forme)) && !isCosmetic(s))
  .sort((a, b) => a.num - b.num || (a.forme ? 1 : 0) - (b.forme ? 1 : 0) || a.name.localeCompare(b.name));

const idxOf = new Map(speciesList.map((s, i) => [s.id, i]));

// Megas: baseId -> [{ item, name, types, baseStats, ability }]
const megas = {};
for (const s of gen.species.all()) {
  if (!s.forme || !/^Mega/.test(s.forme) || s.num > 1025) continue;
  const base = gen.species.get(s.baseSpecies);
  if (!base || !idxOf.has(base.id)) continue;
  (megas[base.id] ??= []).push({
    n: s.name,
    it: s.requiredItem || '',
    t: s.types,
    bs: [s.baseStats.hp, s.baseStats.atk, s.baseStats.def, s.baseStats.spa, s.baseStats.spd, s.baseStats.spe],
    a: s.abilities[0],
  });
}

const germanName = (num) => {
  try { return pokemonNames.getName(num, 'de'); } catch { return null; }
};

/* ------------------------------------------------------------ Attacken --- */

const MOVE_SKIP_NS = new Set(['CAP', 'Custom', 'Future', 'Unobtainable']);
// Attacken, deren Wirkung die Engine nicht sinnvoll nachbildet: bleiben in den
// Daten (Lernsets zeigen darauf), werden aber nie zufällig vergeben.
const NO_POOL = new Set([
  'metronome', 'assist', 'sketch', 'mirrormove', 'copycat', 'naturepower',
  'transform', 'mefirst', 'sleeptalk', 'bide', 'shadowforce', 'phantomforce',
  'skydrop', 'bounce', 'dig', 'dive', 'fly', 'solarbeam', 'solarblade',
  'skullbash', 'skyattack', 'razorwind', 'iceburn', 'freezeshock', 'geomancy',
  'meteorbeam', 'electroshot', 'futuresight', 'doomdesire', 'lastresort',
  'naturalgift', 'fling', 'magiccoat', 'snatch', 'allyswitch', 'celebrate',
  'happyhour', 'holdhands', 'splash', 'teleport', 'roleplay', 'skillswap',
  'entrainment', 'simplebeam', 'worryseed', 'gastroacid', 'powertrick',
  'powersplit', 'guardsplit', 'heartswap', 'psychoshift', 'spite', 'grudge',
  'imprison', 'conversion', 'conversion2', 'camouflage', 'reflecttype',
  'trickortreat', 'forestscurse', 'magnetrise', 'ingrain', 'aquaring',
  'lockon', 'mindreader', 'foresight', 'odorsleuth', 'miracleeye',
  'followme', 'ragepowder', 'spotlight', 'afteryou', 'quash', 'instruct',
  'shelltrap', 'beakblast', 'focuspunch', 'auroraveil', 'craftyshield',
  'matblock', 'quickguard', 'wideguard', 'kingsshield', 'obstruct',
  'banefulbunker', 'burningbulwark', 'silktrap', 'maxguard', 'struggle',
  'revivalblessing', 'lunarblessing', 'jungle healing', 'purify', 'floralhealing',
  'terastarstorm', 'dynamaxcannon', 'behemothblade', 'behemothbash',
]);

const moveList = gen.moves.all()
  .filter((m) => !m.isZ && !m.isMax && !MOVE_SKIP_NS.has(m.isNonstandard || ''))
  .sort((a, b) => a.name.localeCompare(b.name));
const moveIdx = new Map(moveList.map((m, i) => [m.id, i]));

const trimBoosts = (b) => (b && Object.keys(b).length ? b : undefined);

function packSecondary(s) {
  if (!s) return undefined;
  const o = { c: s.chance ?? 100 };
  if (s.status) o.st = s.status;
  if (s.volatileStatus) o.vs = s.volatileStatus;
  if (trimBoosts(s.boosts)) o.bo = s.boosts;
  if (s.self?.boosts) o.self = s.self.boosts;
  if (s.dustproof) o.dp = 1;
  return o;
}

function packMove(m) {
  const o = {
    id: m.id,
    n: m.name,
    t: m.type,
    // P physisch, S speziell, T Status — 'Special' und 'Status' beginnen beide
    // mit S, deshalb bekommt Status ausdrücklich das T.
    c: m.category === 'Status' ? 'T' : m.category[0],
    bp: m.basePower,
    ac: m.accuracy === true ? 0 : m.accuracy, // 0 = trifft immer
    pp: m.pp,
    pr: m.priority,
    tg: m.target,
    g: m.gen,
    d: m.shortDesc || m.desc || '',
  };
  const fl = Object.keys(m.flags || {}).filter((f) => m.flags[f]);
  if (fl.length) o.fl = fl;
  if (m.critRatio && m.critRatio !== 1) o.cr = m.critRatio;
  if (m.willCrit) o.wc = 1;
  if (m.drain) o.dr = m.drain;
  if (m.recoil) o.rc = m.recoil;
  if (m.hasCrashDamage) o.crash = 1;
  if (m.mindBlownRecoil) o.mbr = 1;
  if (m.heal) o.hl = m.heal;
  if (m.status) o.st = m.status;
  if (m.volatileStatus) o.vs = m.volatileStatus;
  if (trimBoosts(m.boosts)) o.bo = m.boosts;
  if (m.self && (m.self.boosts || m.self.volatileStatus)) {
    o.slf = {};
    if (m.self.boosts) o.slf.bo = m.self.boosts;
    if (m.self.volatileStatus) o.slf.vs = m.self.volatileStatus;
  }
  const secs = m.secondaries || (m.secondary ? [m.secondary] : []);
  const packed = secs.map(packSecondary).filter(Boolean);
  if (packed.length) o.sec = packed;
  if (m.multihit) o.mh = m.multihit;
  if (m.multiaccuracy) o.ma = 1;
  if (m.weather) o.w = m.weather;
  if (m.terrain) o.tr = m.terrain;
  if (m.pseudoWeather) o.pw = m.pseudoWeather;
  if (m.sideCondition) o.sc = m.sideCondition;
  if (m.slotCondition) o.slc = m.slotCondition;
  if (m.selfSwitch) o.ss = typeof m.selfSwitch === 'string' ? m.selfSwitch : 1;
  if (m.forceSwitch) o.fs = 1;
  if (m.ignoreImmunity) o.ii = typeof m.ignoreImmunity === 'object' ? Object.keys(m.ignoreImmunity) : 1;
  if (m.ignoreDefensive) o.igd = 1;
  if (m.ignoreEvasion) o.ige = 1;
  if (m.breaksProtect) o.bpr = 1;
  if (m.thawsTarget) o.thaw = 1;
  if (m.ohko) o.ohko = 1;
  if (m.damage) o.dmg = m.damage;
  if (m.sleepUsable) o.slp = 1;
  if (m.stallingMove) o.stall = 1;
  if (m.overrideOffensiveStat) o.oos = m.overrideOffensiveStat;
  if (m.overrideDefensiveStat) o.ods = m.overrideDefensiveStat;
  if (m.isFutureMove) o.fut = 1;
  if (m.smartTarget) o.smart = 1;
  if (NO_POOL.has(m.id) || m.isNonstandard === 'LGPE') o.np = 1; // nicht im Zufallspool
  return o;
}

/* ------------------------------------------------------------ Lernsets --- */

const SRC = /^(\d)([A-Z])(\d*)$/;

// Sonderformen (Rotom-Wash, Deoxys-Attack, ...) führen oft nur ihre eine
// Signaturattacke; der Rest steckt beim Grundpokémon. Deshalb wird die Kette
// nach oben zusammengeführt statt beim ersten Treffer abzubrechen.
async function learnsetFor(species) {
  const merged = {};
  let s = species, found = false;
  for (let hop = 0; hop < 4 && s; hop++) {
    const ls = await gen.learnsets.get(s.id);
    if (ls?.learnset) {
      found = true;
      for (const [move, sources] of Object.entries(ls.learnset)) {
        (merged[move] ??= []).push(...sources);
      }
    }
    const next = s.changesFrom || s.baseSpecies;
    if (!next || next === s.name) break;
    s = gen.species.get(next);
  }
  return found ? merged : null;
}

/* ---------------------------------------------------------------- Bauen -- */

const abilityList = gen.abilities.all()
  .filter((a) => !a.isNonstandard || a.isNonstandard === 'Past')
  .map((a) => ({ id: a.id, n: a.name, d: a.shortDesc || a.desc || '', g: a.gen }))
  .sort((a, b) => a.n.localeCompare(b.n));

const species = [];
let missingLearnsets = 0;

for (const s of speciesList) {
  const learnset = await learnsetFor(s);
  const levelUp = new Map();   // moveIdx -> Level
  const pool = new Set();      // alles Erlernbare (TM, Tutor, Ei, Level)

  if (learnset) {
    for (const [moveId, sources] of Object.entries(learnset)) {
      const mi = moveIdx.get(moveId);
      if (mi === undefined) continue;
      let best = null; // höchste Generation gewinnt für die Levelangabe
      for (const src of sources) {
        const m = SRC.exec(src);
        if (!m) continue;
        const [, g, kind, num] = m;
        if (kind === 'L' && num !== '') {
          const lvl = Math.max(1, parseInt(num, 10));
          if (!best || +g > best.g) best = { g: +g, lvl };
        }
        if ('LMTER'.includes(kind)) pool.add(mi);
      }
      if (best) levelUp.set(mi, best.lvl);
    }
  } else {
    missingLearnsets++;
  }

  const lv = [...levelUp.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const bs = s.baseStats;
  const entry = {
    id: s.id,
    n: s.name,
    num: s.num,
    t: s.types,
    bs: [bs.hp, bs.atk, bs.def, bs.spa, bs.spd, bs.spe],
    ab: [s.abilities[0], s.abilities[1]].filter(Boolean),
    g: s.gen,
    wt: s.weightkg,
    ht: s.heightm,
    eg: s.eggGroups,
    lv: lv.flat(),                                   // [moveIdx, lvl, moveIdx, lvl, ...]
    tm: [...pool].filter((i) => !levelUp.has(i)).sort((a, b) => a - b),
  };
  const de = germanName(s.num);
  if (de && de !== s.name) entry.dn = s.forme ? `${de}-${s.forme}` : de;
  if (s.forme) { entry.f = s.forme; entry.base = s.baseSpecies; }
  if (s.tags?.length) entry.tag = s.tags;
  else if (UNTAGGED_PARADOX.has(s.id)) entry.tag = ['Paradox'];
  if (s.prevo && idxOf.has(gen.species.get(s.prevo).id)) entry.pv = idxOf.get(gen.species.get(s.prevo).id);
  if (s.evoLevel) entry.el = s.evoLevel;
  if (s.evoType) entry.et = s.evoType;
  if (s.evoItem) entry.ei = s.evoItem;
  if (s.evoMove) entry.em = s.evoMove;
  if (s.evoCondition) entry.ec = s.evoCondition;
  if (s.abilities.H && s.abilities.H !== s.abilities[0]) entry.abh = s.abilities.H;
  if (s.canGigantamax) entry.gmax = 1;
  if (s.battleOnly) entry.bo = 1;
  if (s.requiredItem) entry.ri = s.requiredItem;
  species.push(entry);
}

// Rückwärtsverweise zu Vorwärtsverweisen drehen
for (let i = 0; i < species.length; i++) {
  const pv = species[i].pv;
  if (pv !== undefined) (species[pv].ev ??= []).push(i);
}

const natures = gen.natures.all().map((n) => ({ n: n.name, p: n.plus || null, m: n.minus || null }));

const DEX = {
  version: 1,
  generated: new Date().toISOString().slice(0, 10),
  types: TYPES,
  chart,
  natures,
  species,
  moves: moveList.map(packMove),
  abilities: abilityList,
  megas,
};

const json = JSON.stringify(DEX);
const out = `/* Automatisch erzeugt von tools/build-data.mjs — nicht von Hand ändern.
   Datenquelle: @pkmn/dex (Pokémon Showdown, MIT) und pokemon (deutsche Namen). */
(function (root) {
  'use strict';
  var DEX = ${json};
  root.PL_DEX = DEX;
  if (typeof module !== 'undefined' && module.exports) module.exports = DEX;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);

const mb = (out.length / 1048576).toFixed(2);
console.log(`Spezies:      ${species.length}`);
console.log(`Attacken:     ${moveList.length}  (davon ${moveList.filter((m) => NO_POOL.has(m.id)).length} nicht im Zufallspool)`);
console.log(`Fähigkeiten:  ${abilityList.length}`);
console.log(`Megas:        ${Object.values(megas).reduce((a, v) => a + v.length, 0)} für ${Object.keys(megas).length} Spezies`);
console.log(`Ohne Lernset: ${missingLearnsets}`);
console.log(`Deutsch:      ${species.filter((s) => s.dn).length}`);
const thin = species.filter((s) => s.lv.length / 2 + s.tm.length < 8);
if (thin.length) console.log(`Dünne Movepools: ${thin.length} (${thin.slice(0, 6).map((s) => s.n).join(', ')})`);
console.log(`Geschrieben:  ${OUT} (${mb} MB)`);
