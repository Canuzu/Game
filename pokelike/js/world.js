/* =============================================================================
 * world.js — Regionen, Trainer, Begegnungen und Ereignisse
 * -----------------------------------------------------------------------------
 * Ein Run führt durch neun Regionen — eine je Generation. Die wilden Pokémon
 * einer Region stammen deshalb überwiegend aus genau dieser Generation, und
 * am Ende jeder Region wartet ein Arenaleiter mit passendem Typenschwerpunkt.
 *
 * Gliederung:  1) Regionen   2) Trainerklassen   3) Bosse
 *              4) Begegnungen   5) Ereignisse
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.mon) require('./pokemon.js');
    if (!PL.items) require('./items.js');
  }
  var dex = PL.dex, mons = PL.mon, toID = PL.util.toID;

  /* ---------- 1) Regionen ---------------------------------------------------- */

  var REGIONS = [
    { id: 'kanto', name: 'Kanto', gen: 1, motto: 'Wo alles begann.', color: '#e05a47',
      leaders: [['Brock', 'Rock'], ['Misty', 'Water'], ['Lt. Surge', 'Electric'], ['Erika', 'Grass'],
                ['Koga', 'Poison'], ['Sabrina', 'Psychic'], ['Blaine', 'Fire'], ['Giovanni', 'Ground']] },
    { id: 'johto', name: 'Johto', gen: 2, motto: 'Glocken und alte Türme.', color: '#d8a33c',
      leaders: [['Falkner', 'Flying'], ['Bugsy', 'Bug'], ['Whitney', 'Normal'], ['Morty', 'Ghost'],
                ['Chuck', 'Fighting'], ['Jasmine', 'Steel'], ['Pryce', 'Ice'], ['Clair', 'Dragon']] },
    { id: 'hoenn', name: 'Hoenn', gen: 3, motto: 'Zwischen Vulkan und Meer.', color: '#3aa87a',
      leaders: [['Roxanne', 'Rock'], ['Brawly', 'Fighting'], ['Wattson', 'Electric'], ['Flannery', 'Fire'],
                ['Norman', 'Normal'], ['Winona', 'Flying'], ['Tate & Liza', 'Psychic'], ['Wallace', 'Water']] },
    { id: 'sinnoh', name: 'Sinnoh', gen: 4, motto: 'Schnee auf dem Speerkarst.', color: '#5b7fd6',
      leaders: [['Roark', 'Rock'], ['Gardenia', 'Grass'], ['Maylene', 'Fighting'], ['Crasher Wake', 'Water'],
                ['Fantina', 'Ghost'], ['Byron', 'Steel'], ['Candice', 'Ice'], ['Volkner', 'Electric']] },
    { id: 'einall', name: 'Einall', gen: 5, motto: 'Eine Region ganz für sich.', color: '#7a6bd0',
      leaders: [['Cilan', 'Grass'], ['Lenora', 'Normal'], ['Burgh', 'Bug'], ['Elesa', 'Electric'],
                ['Clay', 'Ground'], ['Skyla', 'Flying'], ['Brycen', 'Ice'], ['Drayden', 'Dragon']] },
    { id: 'kalos', name: 'Kalos', gen: 6, motto: 'Schönheit und Mega-Energie.', color: '#d264a6',
      leaders: [['Viola', 'Bug'], ['Grant', 'Rock'], ['Korrina', 'Fighting'], ['Ramos', 'Grass'],
                ['Clemont', 'Electric'], ['Valerie', 'Fairy'], ['Olympia', 'Psychic'], ['Wulfric', 'Ice']] },
    { id: 'alola', name: 'Alola', gen: 7, motto: 'Inselprüfungen unter Palmen.', color: '#e8963c',
      leaders: [['Ilima', 'Normal'], ['Lana', 'Water'], ['Kiawe', 'Fire'], ['Mallow', 'Grass'],
                ['Sophocles', 'Electric'], ['Acerola', 'Ghost'], ['Mina', 'Fairy'], ['Nanu', 'Dark']] },
    { id: 'galar', name: 'Galar', gen: 8, motto: 'Stadionlärm und Dynamax.', color: '#4aa3c8',
      leaders: [['Milo', 'Grass'], ['Nessa', 'Water'], ['Kabu', 'Fire'], ['Bea', 'Fighting'],
                ['Allister', 'Ghost'], ['Opal', 'Fairy'], ['Melony', 'Ice'], ['Raihan', 'Dragon']] },
    { id: 'paldea', name: 'Paldea', gen: 9, motto: 'Offene Wege, offene Himmel.', color: '#c2543f',
      leaders: [['Katy', 'Bug'], ['Brassius', 'Grass'], ['Iono', 'Electric'], ['Kofu', 'Water'],
                ['Larry', 'Normal'], ['Ryme', 'Ghost'], ['Tulip', 'Psychic'], ['Grusha', 'Ice']] }
  ];

  var ELITE = [
    ['Lorelei', 'Ice'], ['Bruno', 'Fighting'], ['Agatha', 'Ghost'], ['Lance', 'Dragon'],
    ['Will', 'Psychic'], ['Karen', 'Dark'], ['Sidney', 'Dark'], ['Phoebe', 'Ghost'],
    ['Glacia', 'Ice'], ['Drake', 'Dragon'], ['Aaron', 'Bug'], ['Bertha', 'Ground'],
    ['Flint', 'Fire'], ['Lucian', 'Psychic'], ['Shauntal', 'Ghost'], ['Marshal', 'Fighting'],
    ['Grimsley', 'Dark'], ['Caitlin', 'Psychic'], ['Malva', 'Fire'], ['Siebold', 'Water'],
    ['Wikstrom', 'Steel'], ['Drasna', 'Dragon'], ['Hala', 'Fighting'], ['Olivia', 'Rock'],
    ['Rika', 'Ground'], ['Poppy', 'Steel'], ['Hassel', 'Dragon'], ['Kahili', 'Flying']
  ];

  var CHAMPIONS = [
    { name: 'Blue', team: ['pidgeot', 'alakazam', 'rhydon', 'gyarados', 'arcanine', 'blastoise'] },
    { name: 'Lance', team: ['gyarados', 'aerodactyl', 'charizard', 'dragonite', 'dragonite', 'kingdra'] },
    { name: 'Steven', team: ['skarmory', 'aggron', 'cradily', 'armaldo', 'claydol', 'metagross'] },
    { name: 'Cynthia', team: ['spiritomb', 'roserade', 'togekiss', 'lucario', 'milotic', 'garchomp'] },
    { name: 'Alder', team: ['accelgor', 'bouffalant', 'druddigon', 'vanilluxe', 'escavalier', 'volcarona'] },
    { name: 'Diantha', team: ['hawlucha', 'tyrantrum', 'aurorus', 'gourgeist', 'goodra', 'gardevoir'] },
    { name: 'Kukui', team: ['lycanroc', 'ninetalesalola', 'braviary', 'magnezone', 'snorlax', 'incineroar'] },
    { name: 'Leon', team: ['aegislash', 'dragapult', 'haxorus', 'seismitoad', 'rillaboom', 'charizard'] },
    { name: 'Geeta', team: ['espathra', 'avalugg', 'kingambit', 'veluza', 'gogoat', 'glimmora'] }
  ];

  /* ---------- 2) Trainerklassen ----------------------------------------------- */

  var TRAINERS = [
    { name: 'Käfersammler', types: ['Bug'], size: 2 },
    { name: 'Angler', types: ['Water'], size: 2 },
    { name: 'Schwimmerin', types: ['Water'], size: 2 },
    { name: 'Wanderer', types: ['Rock', 'Ground'], size: 2 },
    { name: 'Ruinenmaniac', types: ['Rock', 'Ground'], size: 3 },
    { name: 'Schülerin', types: null, size: 2 },
    { name: 'Rowdy', types: ['Poison', 'Dark'], size: 3 },
    { name: 'Vogelfänger', types: ['Flying'], size: 2 },
    { name: 'Ninjajunge', types: ['Poison', 'Bug'], size: 3 },
    { name: 'Psycho', types: ['Psychic'], size: 2 },
    { name: 'Gentleman', types: null, size: 2 },
    { name: 'Zwillinge', types: ['Fairy', 'Normal'], size: 2 },
    { name: 'Feuerwehrmann', types: ['Fire'], size: 2 },
    { name: 'Skaterin', types: ['Ice', 'Electric'], size: 2 },
    { name: 'Wanderforscher', types: null, size: 3 },
    { name: 'Team-Rüpel', types: ['Dark', 'Poison'], size: 3 },
    { name: 'Drachenzähmer', types: ['Dragon'], size: 3 },
    { name: 'Ass-Trainerin', types: null, size: 4 },
    { name: 'Ass-Trainer', types: null, size: 4 },
    { name: 'Veteranin', types: null, size: 4 }
  ];

  var VORNAMEN = ['Lina', 'Jonas', 'Mika', 'Sara', 'Tobi', 'Nele', 'Ben', 'Ida', 'Finn', 'Lea',
    'Noah', 'Emma', 'Paul', 'Mia', 'Luis', 'Ella', 'Elias', 'Anna', 'Max', 'Zoe',
    'Kai', 'Nora', 'Jan', 'Lars', 'Ruth', 'Timo', 'Vera', 'Ole', 'Pia', 'Rico'];

  /* ---------- 3) Begegnungspool ------------------------------------------------ */

  /**
   * Kandidaten für wilde Begegnungen.
   * opts: { gen, level, allowLegendary, types, stageBias }
   */
  // Diese drei haben ausschließlich Attacken, die die Engine nicht abbildet.
  var GIMMICK = { ditto: 1, cosmog: 1, cosmoem: 1 };

  function encounterPool(opts) {
    opts = opts || {};
    var level = opts.level || 20;
    var out = [], i, sp;
    for (i = 0; i < dex.species.length; i++) {
      sp = dex.species[i];
      if (sp.bo) continue;                                    // reine Kampfformen
      if (GIMMICK[sp.id]) continue;                           // ohne eigenes Repertoire
      if (!opts.allowLegendary && dex.isLegendary(sp)) continue;
      if (dex.isRestricted(sp) && !opts.allowRestricted) continue;
      if (opts.gen && sp.g !== opts.gen && !opts.anyGen) continue;
      if (opts.types && !opts.types.some(function (t) { return sp.t.indexOf(t) >= 0; })) continue;
      // Zu starke Pokémon erscheinen erst, wenn das Level dazu passt
      var minLevel = Math.max(1, Math.round((sp.bst - 250) / 6));
      if (sp.bst > 480 && level < minLevel) continue;
      if (sp.pv !== undefined && level < 12 && dex.evosLeft(sp) === 0 && sp.bst > 400) continue;
      out.push(sp);
    }
    if (!out.length) return dex.species.filter(function (s) { return s.g === 1 && !s.bo && s.bst < 400; });
    return out;
  }

  /**
   * Zieht eine Spezies gewichtet. Die Glockenkurve um eine Wunsch-Basiswert-
   * summe sorgt dafür, dass in Kanto Raupy und im Endspiel Despotar auftaucht —
   * und nicht umgekehrt.
   */
  function pickEncounter(rng, pool, level, opts) {
    opts = opts || {};
    var target = 250 + level * 4.6;
    return rng.weighted(pool, function (sp) {
      var d = (sp.bst - target) / 80;
      var w = Math.exp(-d * d) * 100 + 0.4;
      if (dex.evosLeft(sp) > 0 && level > 34) w *= 0.4;
      if (dex.isLegendary(sp)) w *= 0.15;
      if (opts.rare) w *= 1 + Math.max(0, (sp.bst - 450) / 120);
      if (opts.exclude && opts.exclude[sp.id]) w *= 0.02;
      return w;
    });
  }

  /* ---------- 4) Teams bauen ---------------------------------------------------- */

  /** Der Mega-Stein zu einem Pokémon, sofern es eine Mega-Form hat. */
  function megaStoneFor(mon, rng) {
    var list = dex.megasFor(dex.sp(mon.sp));
    if (!list || !list.length) return null;
    var withStone = list.filter(function (m) { return m.it; });
    if (!withStone.length) return null;
    return toID(rng.pick(withStone).it);
  }

  function buildMon(rng, sp, level, opts) {
    opts = opts || {};
    return mons.create(sp, level, rng, {
      quality: opts.quality === undefined ? 0.65 : opts.quality,
      ivFloor: opts.ivFloor || 0,
      hiddenChance: opts.hiddenChance || 0.1,
      shinyOdds: opts.shinyOdds === undefined ? 1 / 400 : opts.shinyOdds,
      evs: opts.evs || null,
      item: opts.item || null
    });
  }

  /** Team eines gewöhnlichen Trainers. */
  function trainerTeam(rng, region, level, opts) {
    opts = opts || {};
    var cls = opts.cls || rng.pick(TRAINERS);
    var size = Math.max(1, Math.min(6, (opts.size || cls.size) + (opts.bonus || 0)));
    if (opts.maxSize) size = Math.min(size, opts.maxSize);
    var pool = encounterPool({
      gen: region ? region.gen : null, level: level, types: cls.types, anyGen: !region
    });
    if (pool.length < 4) pool = encounterPool({ level: level, types: cls.types, anyGen: true });
    var team = [], seen = {}, i;
    for (i = 0; i < size; i++) {
      var lvl = level - (i === size - 1 ? 0 : rng.range(0, 2));
      var sp = pickEncounter(rng, pool, lvl, { exclude: seen });
      seen[sp.id] = 1;
      var member = buildMon(rng, sp, Math.max(2, lvl), {
        quality: opts.quality || 0.7, ivFloor: opts.ivFloor || 5
      });
      if (opts.items && rng.chance(0.6)) {
        member.item = rng.pick(['leftovers', 'sitrusberry', 'lifeorb', 'focussash', 'choicescarf', 'expertbelt']);
      }
      team.push(member);
    }
    return {
      team: team,
      name: (opts.name || (cls.name + ' ' + rng.pick(VORNAMEN))),
      cls: cls.name,
      level: 1
    };
  }

  /** Team eines Arenaleiters: Typenschwerpunkt, gute Werte, ein Ass zum Schluss. */
  function bossTeam(rng, region, level, index, opts) {
    var leader = rng.pick(region.leaders);
    var type = leader[1];
    var pool = encounterPool({ gen: region.gen, level: level, types: [type] });
    if (pool.length < 4) pool = encounterPool({ level: level, types: [type], anyGen: true });
    var size = Math.min(5, 3 + Math.floor(index / 3));
    if (opts && opts.maxSize) size = Math.min(size, opts.maxSize);
    // Arenaleiter werden von Region zu Region ernster: der erste ist eine
    // Prüfung, der neunte ein Brett.
    var quality = Math.min(0.88, 0.70 + index * 0.023);
    var evScale = Math.min(0.9, 0.30 + index * 0.08);
    var team = [], seen = {}, i;
    for (i = 0; i < size; i++) {
      var last = i === size - 1;
      var sp = last
        ? rng.weighted(pool, function (s) { return Math.pow(Math.max(1, s.bst - 350), 2) * (dex.evosLeft(s) ? 0.2 : 1) * (seen[s.id] ? 0.02 : 1); })
        : pickEncounter(rng, pool, level, { exclude: seen });
      seen[sp.id] = 1;
      var mon = buildMon(rng, sp, level + (last ? 2 : 0), {
        quality: quality, ivFloor: 6 + index, hiddenChance: 0.25, shinyOdds: 1 / 120
      });
      // Nur der Ass-Kämpfer trägt einen Gegenstand — wenn er eine Mega-Form
      // hat, bekommt er ab der dritten Region den passenden Stein.
      if ((last && index > 0) || (opts && opts.items && rng.chance(0.6))) {
        var stone = index >= 2 && last ? megaStoneFor(mon, rng) : null;
        mon.item = stone || rng.pick(['leftovers', 'lifeorb', 'focussash', 'assaultvest', 'choicescarf', 'sitrusberry']);
      }
      mons.addEVs(mon, mon.ivs[1] >= mon.ivs[3] ? 'atk' : 'spa', Math.round(120 * evScale));
      mons.addEVs(mon, 'spe', Math.round(90 * evScale));
      mons.addEVs(mon, 'hp', Math.round(80 * evScale));
      team.push(mon);
    }
    return { team: team, name: 'Arenaleiter ' + leader[0], cls: 'Arenaleiter', type: type, level: 3 };
  }

  function eliteTeam(rng, level, index, used, opts) {
    var choice, guard = 0;
    do { choice = rng.pick(ELITE); } while (used && used[choice[0]] && guard++ < 40);
    if (used) used[choice[0]] = true;
    var type = choice[1];
    var pool = encounterPool({ level: level, types: [type], anyGen: true, allowLegendary: level > 60 });
    var count = Math.min(5, (opts && opts.maxSize) || 5);
    var team = [], seen = {}, i;
    for (i = 0; i < count; i++) {
      var last = i === count - 1;
      var sp = last
        ? rng.weighted(pool, function (s) { return Math.pow(Math.max(1, s.bst - 400), 2) * (seen[s.id] ? 0.02 : 1); })
        : pickEncounter(rng, pool, level, { rare: true, exclude: seen });
      seen[sp.id] = 1;
      var mon = buildMon(rng, sp, level + (last ? 1 : 0), {
        quality: 0.9, ivFloor: 16, hiddenChance: 0.3, shinyOdds: 1 / 100
      });
      if (last || i < 1) {
        var eStone = last ? megaStoneFor(mon, rng) : null;
        mon.item = eStone || rng.pick(['leftovers', 'lifeorb', 'focussash', 'choiceband', 'choicespecs', 'choicescarf', 'assaultvest', 'sitrusberry']);
      }
      mons.addEVs(mon, mon.ivs[1] >= mon.ivs[3] ? 'atk' : 'spa', 120);
      mons.addEVs(mon, 'spe', 90);
      mons.addEVs(mon, 'hp', 70);
      team.push(mon);
    }
    return { team: team, name: 'Top Vier ' + choice[0], cls: 'Top Vier', type: type, level: 3 };
  }

  function championTeam(rng, level) {
    var champ = rng.pick(CHAMPIONS);
    var team = champ.team.map(function (id, i) {
      var sp = dex.sp(id) || dex.sp('pidgeot');
      var mon = buildMon(rng, sp, level + (i === 5 ? 2 : 0), {
        quality: 0.9, ivFloor: 20, hiddenChance: 0.5, shinyOdds: 1 / 60
      });
      var cStone = i === 5 ? megaStoneFor(mon, rng) : null;
      if (cStone) mon.item = cStone;
      else if (i < 4) mon.item = ['leftovers', 'lifeorb', 'focussash', 'choicescarf'][i];
      mons.addEVs(mon, mon.ivs[1] >= mon.ivs[3] ? 'atk' : 'spa', 160);
      mons.addEVs(mon, 'spe', 140);
      return mon;
    });
    return { team: team, name: 'Champ ' + champ.name, cls: 'Champ', level: 3 };
  }

  /* ---------- 5) Der Rivale ------------------------------------------------------
   * Er nimmt den Starter, der deinen kontert, taucht in jeder zweiten Region
   * auf und wächst mit. Vier Begegnungen pro Run, die letzte mit vollem Team.
   * ------------------------------------------------------------------------ */

  // Die Startertrios je Generation, immer in der Reihenfolge Pflanze, Feuer, Wasser.
  var STARTER_TRIOS = [
    ['bulbasaur', 'charmander', 'squirtle'],
    ['chikorita', 'cyndaquil', 'totodile'],
    ['treecko', 'torchic', 'mudkip'],
    ['turtwig', 'chimchar', 'piplup'],
    ['snivy', 'tepig', 'oshawott'],
    ['chespin', 'fennekin', 'froakie'],
    ['rowlet', 'litten', 'popplio'],
    ['grookey', 'scorbunny', 'sobble'],
    ['sprigatito', 'fuecoco', 'quaxly']
  ];

  /** Der Starter, der den gewählten schlägt: Pflanze ← Feuer ← Wasser ← Pflanze. */
  function counterStarter(starterId, rng) {
    var id = toID(starterId), i, k;
    for (i = 0; i < STARTER_TRIOS.length; i++) {
      k = STARTER_TRIOS[i].indexOf(id);
      if (k >= 0) return STARTER_TRIOS[i][(k + 1) % 3];
    }
    // Kein regulärer Starter gewählt — dann nimmt er irgendeinen.
    return rng.pick(rng.pick(STARTER_TRIOS));
  }

  /** Entwickelt eine Spezies so oft wie möglich weiter. */
  function evolveTo(sp, steps) {
    var cur = dex.sp(sp), i;
    for (i = 0; i < steps; i++) {
      if (!cur.ev || !cur.ev.length) break;
      cur = dex.sp(cur.ev[0]);
    }
    return cur;
  }

  function rivalTeam(rng, rival, level, stage, region) {
    var size = Math.min(6, 2 + stage);
    var starter = evolveTo(rival.starter, stage >= 2 ? 2 : stage >= 1 ? 1 : 0);
    var pool = encounterPool({ level: level, anyGen: true });
    var team = [], seen = {}, i;

    for (i = 0; i < size - 1; i++) {
      var sp = pickEncounter(rng, pool, level, { exclude: seen, rare: stage >= 2 });
      seen[sp.id] = 1;
      team.push(buildMon(rng, sp, level - (i === 0 ? 0 : 1), {
        quality: 0.75 + stage * 0.05, ivFloor: 8 + stage * 4, hiddenChance: 0.2
      }));
    }
    // Der Starter kommt zuletzt und ist sein Ass.
    var ace = buildMon(rng, starter, level + 1, {
      quality: 0.9 + stage * 0.02, ivFloor: 16 + stage * 3, hiddenChance: 0.3
    });
    if (stage >= 2) {
      ace.item = megaStoneFor(ace, rng) || rng.pick(['lifeorb', 'focussash', 'leftovers']);
    }
    mons.addEVs(ace, ace.ivs[1] >= ace.ivs[3] ? 'atk' : 'spa', 80 + stage * 30);
    mons.addEVs(ace, 'spe', 60 + stage * 20);
    team.push(ace);

    return { team: team, name: 'Rivale ' + rival.name, cls: 'Ass-Trainer', level: 3, rival: true };
  }

  var RIVAL_LINES = [
    {
      before: ['Na, immer noch unterwegs? Dann zeig mal, was dein Team draufhat.',
        'Ich wusste, dass ich dich hier treffe. Lass uns keine Zeit verschwenden.'],
      win: ['Nicht schlecht. Beim nächsten Mal bin ich vorbereitet.',
        'Hm. Ein Glückstreffer, mehr nicht.'],
      loss: ['Zu langsam. Trainier noch ein bisschen.',
        'Siehst du? Genau deshalb hab ich den anderen Starter genommen.']
    },
    {
      before: ['Zweite Runde. Diesmal hab ich mir was überlegt.',
        'Du bist besser geworden — ich aber auch.'],
      win: ['Ernsthaft? Schon wieder?', 'Okay. Okay. Jetzt wird es persönlich.'],
      loss: ['Sag ich doch. Der Abstand wird größer.', 'Vielleicht solltest du dein Team überdenken.']
    },
    {
      before: ['Man sieht sich immer zweimal. Oder dreimal. Egal — kämpfen wir.',
        'Meine Truppe steht. Deine auch? Wollen wir sehen.'],
      win: ['Du bist echt gut. Das gebe ich zu. Einmal.',
        'Beim nächsten Mal treffen wir uns ganz oben. Dann verliere ich nicht.'],
      loss: ['Hab ich doch gesagt.', 'Komm wieder, wenn du so weit bist.']
    },
    {
      before: ['Das ist die letzte Runde vor der Liga. Ich gehe da rein — mit oder ohne dich.',
        'Alles oder nichts. Zeig mir, dass die ganze Reise etwas gebracht hat.'],
      win: ['… Geh und gewinn das Ding. Ich bin dann hinter dir.',
        'Du hast es verdient. Mach mich nicht zum Idioten und verlier gegen die Top Vier.'],
      loss: ['Dann sehen wir uns eben nicht in der Liga.', 'Ende der Reise. Für dich.']
    }
  ];

  function rivalBanter(name, stage, rng) {
    var set = RIVAL_LINES[Math.min(stage, RIVAL_LINES.length - 1)];
    return {
      before: rng.pick(set.before),
      win: rng.pick(set.win),
      loss: rng.pick(set.loss)
    };
  }

  /* ---------- 6) Ereignisse ------------------------------------------------------ */

  /**
   * Ein Ereignis liefert Titel, Text und Optionen. `enabled` darf eine Option
   * ausblenden, `run` ist der laufende Spielstand (siehe run.js).
   */
  /** Inhalt einer Kiste beim Kuriositätenhändler. */
  function mysteryBox(run, rng, index) {
    var roll = (rng.int(100) + index * 17) % 100;
    if (roll < 30) return run.giveMoney(1600);
    if (roll < 55) return run.giveRandomItem(rng, 2);
    if (roll < 75) { run.healTeam(1, true); run.restorePP(); return 'Ein Duft steigt auf — das Team ist wieder frisch.'; }
    if (roll < 90) return { relicChoice: 2, text: 'Unter dem Deckel liegt etwas Altes.' };
    var victim = rng.pick(run.party);
    if (victim) victim.status = 'psn';
    return 'Etwas zischt heraus. ' + mons.name(victim) + ' wurde vergiftet.';
  }

  var EVENTS = [
    {
      id: 'rucksack', title: 'Verlassener Rucksack',
      text: 'Am Wegrand liegt ein Rucksack. Er ist prall gefüllt, aber jemand hat ihn offensichtlich mit Absicht hier abgestellt.',
      options: [
        { label: 'Durchsuchen', desc: 'Ein zufälliger Gegenstand.',
          run: function (run, rng) { return run.giveRandomItem(rng, 1); } },
        { label: 'Zur Fundstelle bringen', desc: 'Ehrlichkeit zahlt sich aus: Geld.',
          run: function (run, rng) { return run.giveMoney(400 + run.region * 260); } }
      ]
    },
    {
      id: 'quelle', title: 'Heiße Quelle',
      text: 'Dampf steigt zwischen den Felsen auf. Das Wasser riecht nach Schwefel — und nach Erholung.',
      options: [
        { label: 'Baden', desc: 'Das Team wird vollständig geheilt.',
          run: function (run) { run.healTeam(1, true); return 'Alle sind wieder frisch.'; } },
        { label: 'Nur die Füße', desc: 'Halbe Heilung, dafür wächst die Bindung.',
          run: function (run) {
            run.healTeam(0.5, true);
            run.party.forEach(function (m) { m.friendship = Math.min(255, m.friendship + 40); });
            return 'Halb erholt — und alle deutlich zutraulicher.';
          } }
      ]
    },
    {
      id: 'schrein', title: 'Schrein der Entwicklung',
      text: 'Ein moosbewachsener Schrein summt leise. Wer hier seine Kraft opfert, kann über sich hinauswachsen.',
      options: [
        { label: 'Ein Pokémon opfern lassen', desc: 'Ein entwicklungsfähiges Teammitglied entwickelt sich sofort.',
          run: function (run, rng) { return run.forceEvolveOne(rng); } },
        { label: 'Weitergehen', desc: 'Nichts riskieren.', run: function () { return 'Du lässt den Schrein hinter dir.'; } }
      ]
    },
    {
      id: 'gluecksspiel', title: 'Straßenwette',
      text: 'Ein Typ mit Sonnenbrille mischt drei Becher. »Doppelt oder nichts«, grinst er.',
      options: [
        { label: 'Mitspielen (Einsatz 500)', desc: '55 % Chance auf das Dreifache.',
          enabled: function (run) { return run.money >= 500; },
          run: function (run, rng) {
            run.money -= 500;
            if (rng.chance(0.55)) { run.giveMoney(1500); return 'Gewonnen! 1500 ₽ wandern in deine Tasche.'; }
            return 'Verloren. Der Becher war natürlich leer.';
          } },
        { label: 'Ablehnen', desc: 'Kein Risiko.', run: function () { return 'Du gehst weiter.'; } }
      ]
    },
    {
      id: 'ei', title: 'Mysteriöses Ei',
      text: 'In einem Nest liegt ein warmes Ei. Niemand scheint es zu vermissen.',
      options: [
        { label: 'Mitnehmen', desc: 'Ein unentwickeltes Pokémon schlüpft.',
          enabled: function (run) { return run.party.length < 6; },
          run: function (run, rng) { return run.hatchEgg(rng); } },
        { label: 'Verkaufen', desc: 'Sammler zahlen gut.',
          run: function (run) { return run.giveMoney(900); } }
      ]
    },
    {
      id: 'rocket', title: 'Überfall',
      text: 'Zwei Gestalten in schwarzen Uniformen versperren den Weg. »Geld oder Kampf!«',
      options: [
        { label: 'Kämpfen', desc: 'Harter Kampf, gute Beute.',
          run: function (run, rng) { return { battle: run.makeAmbush(rng) }; } },
        { label: 'Bezahlen', desc: 'Kostet ein Drittel deines Geldes.',
          run: function (run) {
            var lost = Math.floor(run.money / 3);
            run.money -= lost;
            return 'Sie nehmen ' + lost + ' ₽ und verschwinden.';
          } }
      ]
    },
    {
      id: 'fossil', title: 'Ausgrabungsstätte',
      text: 'Zwischen Schiefer und Staub schimmert etwas Uraltes.',
      options: [
        { label: 'Ausgraben', desc: 'Ein urzeitliches Pokémon schließt sich dir an.',
          enabled: function (run) { return run.party.length < 6; },
          run: function (run, rng) {
            var fossils = ['omanyte', 'kabuto', 'aerodactyl', 'lileep', 'anorith', 'cranidos', 'shieldon',
              'tirtouga', 'archen', 'tyrunt', 'amaura', 'dracozolt', 'arctozolt', 'dracovish', 'arctovish'];
            return run.gainPokemon(rng, rng.pick(fossils), run.levelCap - 4, 'Ausgrabung');
          } },
        { label: 'Steine verkaufen', desc: 'Sicheres Geld.', run: function (run) { return run.giveMoney(700); } }
      ]
    },
    {
      id: 'lehrer', title: 'Attacken-Lehrer',
      text: 'Ein alter Mann sitzt auf einem Baumstumpf. »Ich lehre nur, wer zuhören kann.«',
      options: [
        { label: 'Zuhören', desc: 'Ein Pokémon lernt eine neue Attacke.',
          run: function (run, rng) { return { tutor: true }; } },
        { label: 'Weitergehen', desc: 'Keine Zeit.', run: function () { return 'Er winkt dir müde nach.'; } }
      ]
    },
    {
      id: 'beeren', title: 'Beerenhain',
      text: 'Ein ganzer Hain voller reifer Beeren. Man müsste nur pflücken.',
      options: [
        { label: 'Pflücken', desc: 'Drei zufällige Beeren.',
          run: function (run, rng) {
            var berries = PL.items.all().filter(function (i) { return i.berry; }), out = [], i;
            for (i = 0; i < 3; i++) { var b = rng.pick(berries); run.addItem(b.id, 1); out.push(b.name); }
            return 'Du sammelst: ' + out.join(', ') + '.';
          } },
        { label: 'Das Team fressen lassen', desc: 'Heilt 40 % der KP und alle Statusprobleme.',
          run: function (run) { run.healTeam(0.4, true); return 'Alle sind satt und wieder munter.'; } }
      ]
    },
    {
      id: 'truhe', title: 'Verfluchte Truhe',
      text: 'Eine schwarze Truhe, verziert mit alten Zeichen. Es zieht kalt aus dem Schloss.',
      options: [
        { label: 'Öffnen', desc: 'Ein Relikt — aber ein Teammitglied nimmt Schaden.',
          run: function (run, rng) {
            var victim = rng.pick(run.party.filter(function (m) { return m.hp > 0; }) || run.party);
            if (victim) victim.hp = Math.max(1, Math.floor(victim.hp * 0.4));
            return { relicChoice: 3, text: 'Ein eisiger Hauch trifft ' + mons.name(victim) + '.' };
          } },
        { label: 'Stehen lassen', desc: 'Man muss nicht alles anfassen.',
          run: function () { return 'Du lässt die Truhe stehen. Klug.'; } }
      ]
    },
    {
      id: 'tausch', title: 'Tauschangebot',
      text: 'Eine Trainerin hält ein Pokéball hoch. »Ich tausche blind. Interesse?«',
      options: [
        { label: 'Tauschen', desc: 'Ein Teammitglied gegen ein stärkeres, zufälliges.',
          enabled: function (run) { return run.party.length > 1; },
          run: function (run, rng) { return { trade: true }; } },
        { label: 'Dankend ablehnen', desc: 'Dein Team bleibt, wie es ist.',
          run: function () { return 'Sie zuckt mit den Schultern.'; } }
      ]
    },
    {
      id: 'lager', title: 'Nachtlager',
      text: 'Ein Feuer, ein Kessel Suppe, sechs zufriedene Pokémon.',
      options: [
        { label: 'Rasten', desc: 'Volle AP und Statusheilung für das ganze Team.',
          run: function (run) { run.restorePP(); run.cureTeam(); return 'Ausgeruht und voller Kraft.'; } },
        { label: 'Durchtrainieren', desc: 'Erfahrung statt Schlaf.',
          run: function (run, rng) { return run.grantExp(Math.round(run.levelCap * 55)); } }
      ]
    },
    {
      id: 'schmied', title: 'Wanderschmied',
      text: '»Bring mir Metall und Geld, und ich mache aus deinem Kram etwas Ordentliches.«',
      options: [
        { label: 'Aufwerten (800 ₽)', desc: 'Ein zufälliger Tragegegenstand aus der obersten Schublade.',
          enabled: function (run) { return run.money >= 800; },
          run: function (run, rng) {
            run.money -= 800;
            var good = ['leftovers', 'lifeorb', 'focussash', 'assaultvest', 'choicescarf', 'expertbelt', 'rockyhelmet'];
            var id = rng.pick(good);
            run.addItem(id, 1);
            return 'Du erhältst ' + PL.items.label(id) + '.';
          } },
        { label: 'Nur schauen', desc: 'Er nickt anerkennend.', run: function () { return 'Vielleicht ein andermal.'; } }
      ]
    },
    {
      id: 'schwarm', title: 'Massenauflauf',
      text: 'Der ganze Hang wimmelt. So viele Pokémon auf einmal sieht man selten.',
      options: [
        { label: 'Hineingehen', desc: 'Eine seltene Begegnung — mit Fangmöglichkeit.',
          run: function (run, rng) { return { battle: run.makeWild(rng, { rare: true }) }; } },
        { label: 'Beobachten', desc: 'Notizen machen: Erfahrung fürs Team.',
          run: function (run) { return run.grantExp(Math.round(run.levelCap * 30)); } }
      ]
    },
    {
      id: 'steinhoehle', title: 'Kristallhöhle',
      text: 'Die Wände sind von Kristallen überzogen. Einer davon pulsiert in einem Rhythmus, den du aus deinem eigenen Team zu kennen glaubst.',
      options: [
        { label: 'Den pulsierenden Kristall lösen', desc: 'Ein Mega-Stein, der zu einem deiner Pokémon passt — falls einer passt.',
          run: function (run, rng) { return run.giveMegaStone(rng); } },
        { label: 'Kristallsplitter verkaufen', desc: 'Sicheres Geld.',
          run: function (run) { return run.giveMoney(1200 + run.region * 200); } }
      ]
    },
    {
      id: 'kraftstein', title: 'Kraftstein',
      text: 'Ein pulsierender Monolith. Wer die Hand auflegt, spürt rohe Energie — und einen bitteren Nachgeschmack.',
      options: [
        { label: 'Alle berühren lassen', desc: 'Das ganze Team steigt ein Level, eines wird vergiftet.',
          run: function (run, rng) {
            run.party.forEach(function (m) {
              if (m.lvl < run.levelCap) mons.gainExp(m, mons.expForLevel(m.lvl + 1) - m.exp, { levelCap: run.levelCap });
            });
            var victim = rng.pick(run.party);
            if (victim) victim.status = 'psn';
            return 'Alle wachsen — ' + mons.name(victim) + ' wurde dabei vergiftet.';
          } },
        { label: 'Energie abzapfen', desc: 'Erfahrung für das ganze Team, ohne Nebenwirkung.',
          run: function (run) { return run.grantExp(Math.round(run.levelCap * 40)); } }
      ]
    },
    {
      id: 'haendler', title: 'Verirrter Händler',
      text: '»Ich habe mich verlaufen. Kauf mir was ab, dann finde ich vielleicht zurück.«',
      options: [
        { label: 'Sonderangebot kaufen', desc: 'Drei Gegenstände zum halben Preis.',
          run: function (run, rng) { return { shop: { discount: 0.5, size: 3 } }; } },
        { label: 'Den Weg zeigen', desc: 'Er bedankt sich mit einem Relikt.',
          run: function (run, rng) { return { relicChoice: 2, text: 'Er kramt dankbar in seiner Tasche.' }; } }
      ]
    },
    {
      id: 'legendenschrein', title: 'Schrein der Legenden',
      available: function (run) { return run.region >= 5 || run.leagueStage >= 0; },
      text: 'Ein Schrein, älter als jede Aufzeichnung. Hinter dem Siegel bewegt sich etwas Großes — und es hat dich bemerkt.',
      options: [
        { label: 'Das Siegel brechen', desc: 'Kampf gegen ein legendäres Pokémon. Fangen erlaubt.',
          run: function (run, rng) { return { battle: run.makeLegendary(rng) }; } },
        { label: 'Ehrfürchtig zurücktreten', desc: 'Der Schrein belohnt Respekt mit einem Relikt.',
          run: function (run, rng) { return { relicChoice: 2, text: 'Der Schrein bleibt verschlossen — aber etwas liegt davor.' }; } }
      ]
    },
    {
      id: 'labor', title: 'Verlassenes Labor',
      text: 'Ein aufgegebener Forschungsposten. Auf dem Tisch liegen Notizen, in der Ecke summt noch ein Gerät.',
      options: [
        { label: 'Datenträger mitnehmen', desc: 'Eine TM, die zu deinem Team passt.',
          run: function (run, rng) { return run.giveTM(rng); } },
        { label: 'Gerät ausschlachten', desc: 'Zwei zufällige Gegenstände.',
          run: function (run, rng) { return run.giveRandomItem(rng, 2); } }
      ]
    },
    {
      id: 'streuner', title: 'Streunendes Pokémon',
      text: 'Es folgt dir seit zwei Kreuzungen. Wenn du stehen bleibst, bleibt es auch stehen.',
      options: [
        { label: 'Mitnehmen lassen', desc: 'Es schließt sich dir an — etwas unter Teamniveau.',
          enabled: function (run) { return run.party.length < 6 && run.catchAllowed(); },
          run: function (run, rng) {
            return run.gainPokemon(rng, PL.world.pickEncounter(rng,
              PL.world.encounterPool({ level: run.enemyLevel(-2), anyGen: true }), run.enemyLevel(-2)),
              run.enemyLevel(-3), 'Streuner', { quality: 0.8, ivFloor: 8 });
          } },
        { label: 'Futter dalassen', desc: 'Es teilt seinen Fund mit dir.',
          run: function (run, rng) { return run.giveRandomItem(rng, 1); } }
      ]
    },
    {
      id: 'pilze', title: 'Pilzsammler',
      text: '»Die hier«, sagt der alte Mann und hält einen Beutel hoch, »machen groß und stark. Oder krank. Kommt drauf an.«',
      options: [
        { label: 'Fürs ganze Team', desc: '+15 Fleißpunkte auf einen zufälligen Wert für alle.',
          run: function (run, rng) {
            run.party.forEach(function (m) { mons.addEVs(m, PL.STATS[1 + rng.int(5)], 15); });
            return 'Alle kauen tapfer. Es schmeckt scheußlich und wirkt.';
          } },
        { label: 'Alles auf eines', desc: '+60 Fleißpunkte auf den besten Wert eines Pokémon.',
          run: function (run, rng) { return { evFocus: 60 }; } }
      ]
    },
    {
      id: 'detektiv', title: 'Aufmerksamer Wanderer',
      text: '»Ich komm von vorn«, sagt er und deutet den Weg hinauf. »Der Arenaleiter da oben — ich sag dir, worauf du dich einstellen musst. Für einen kleinen Obolus.«',
      options: [
        { label: 'Bezahlen (400 ₽)', desc: 'Zeigt den Typenschwerpunkt des nächsten Arenaleiters.',
          enabled: function (run) { return run.money >= 400 && run.leagueStage < 0; },
          run: function (run, rng) {
            run.money -= 400;
            var leader = rng.pick(run.currentRegion().leaders);
            run.bossHint = leader;
            return 'Er flüstert: »' + leader[0] + '. Setzt auf ' + PL.t.type(leader[1]) + '. Viel Glück.«';
          } },
        { label: 'Selbst herausfinden', desc: 'Überraschungen gehören dazu.',
          run: function () { return 'Du gehst weiter. Man wird ja sehen.'; } }
      ]
    },
    {
      id: 'angelstelle', title: 'Alte Angelstelle',
      text: 'Eine morsche Rute lehnt am Steg. Im Wasser bewegt sich ein Schatten.',
      options: [
        { label: 'Angeln', desc: 'Kampf gegen ein Wasser-Pokémon — mit Fangmöglichkeit.',
          run: function (run, rng) {
            var bt = run.makeWild(rng, { rare: true });
            bt.biome = 'wasser';
            return { battle: bt };
          } },
        { label: 'Rute mitnehmen', desc: 'Verkauft sich gut.',
          run: function (run) { return run.giveMoney(600 + run.region * 120); } }
      ]
    },
    {
      id: 'trainingsdummy', title: 'Trainingspuppe',
      text: 'Ein Sandsack aus alten Netzen, aufgehängt zwischen zwei Bäumen. Jemand hat »HAU ZU« draufgeschrieben.',
      options: [
        { label: 'Draufhauen', desc: 'Erfahrung für das ganze Team.',
          run: function (run) { return run.grantExp(Math.round(run.levelCap * 50)); } },
        { label: 'Technik üben', desc: 'Alle AP werden aufgefrischt.',
          run: function (run) { run.restorePP(); return 'Jede Attacke sitzt wieder.'; } }
      ]
    },
    {
      id: 'wanderhaendler', title: 'Reliktsammler',
      text: 'Er breitet ein Tuch aus. Darauf liegen Dinge, die man nicht kaufen können sollte.',
      options: [
        { label: 'Relikt kaufen (2500 ₽)', desc: 'Ein Relikt aus dreien zur Wahl.',
          enabled: function (run) { return run.money >= 2500; },
          run: function (run, rng) {
            run.money -= 2500;
            return { relicChoice: 3, text: 'Er nickt zufrieden und zeigt dir seine besten Stücke.' };
          } },
        { label: 'Höflich ablehnen', desc: 'Er packt achselzuckend wieder ein.',
          run: function () { return 'Er zieht weiter. Vielleicht trefft ihr euch nochmal.'; } }
      ]
    },
    {
      id: 'quelle2', title: 'Verwunschener Teich',
      text: 'Das Wasser ist unnatürlich klar. Auf dem Grund liegen Münzen — und etwas, das schimmert.',
      options: [
        { label: 'Hineingreifen', desc: 'Ein Tragegegenstand, aber ein Pokémon erkältet sich.',
          run: function (run, rng) {
            var good = ['leftovers', 'lifeorb', 'focussash', 'expertbelt', 'rockyhelmet', 'assaultvest'];
            var id = rng.pick(good);
            run.addItem(id, 1);
            var victim = rng.pick(run.party.filter(function (m) { return m.hp > 0; }) || run.party);
            if (victim) victim.hp = Math.max(1, Math.floor(victim.hp * 0.6));
            return PL.items.label(id) + ' gefunden — ' + mons.name(victim) + ' ist klatschnass.';
          } },
        { label: 'Münzen fischen', desc: 'Sicheres Geld, trockene Füße.',
          run: function (run) { return run.giveMoney(800 + run.region * 150); } }
      ]
    },
    {
      id: 'zirkus', title: 'Wanderzirkus',
      text: 'Musik, Lampions, ein Zelt. »Tretet ein!«, ruft die Direktorin. »Wer auftritt, wird belohnt!«',
      options: [
        { label: 'Auftreten', desc: 'Ein Pokémon steigt zwei Level auf.',
          run: function (run, rng) {
            var star = rng.pick(run.party);
            var target = Math.min(run.levelCap, star.lvl + 2);
            if (target <= star.lvl) return mons.name(star) + ' erntet Applaus, aber keine Erfahrung mehr.';
            mons.gainExp(star, mons.expForLevel(target) - star.exp, { levelCap: run.levelCap });
            return mons.name(star) + ' spielt das Publikum an die Wand — jetzt Level ' + star.lvl + '!';
          } },
        { label: 'Zusehen und naschen', desc: 'Heilung und drei Beeren.',
          run: function (run, rng) {
            run.healTeam(0.5, true);
            var berries = PL.items.all().filter(function (i) { return i.berry; });
            for (var i = 0; i < 3; i++) run.addItem(rng.pick(berries).id, 1);
            return 'Gut gegessen, halb geheilt, Taschen voller Beeren.';
          } }
      ]
    },
    {
      id: 'hoehlenmalerei', title: 'Höhlenmalerei',
      text: 'An der Wand: Figuren, Kreise, ein Pokémon mit zu vielen Armen. Und ein Muster, das du wiedererkennst.',
      options: [
        { label: 'Muster studieren', desc: 'Ein Relikt aus zweien zur Wahl.',
          run: function (run, rng) { return { relicChoice: 2, text: 'Die Zeichen ergeben plötzlich Sinn.' }; } },
        { label: 'Farbe abkratzen', desc: 'Zwei Tragegegenstände lassen sich damit auffrischen — oder verkaufen.',
          run: function (run) { return run.giveMoney(1100); } }
      ]
    },
    {
      id: 'kuriosum', title: 'Kuriositätenhändler',
      text: 'Eine Kiste, drei Schlösser, kein Preisschild. »Zwei davon lohnen sich«, sagt er. »Welche, sag ich nicht.«',
      options: [
        { label: 'Erste Kiste', desc: 'Inhalt unbekannt.',
          run: function (run, rng) { return mysteryBox(run, rng, 0); } },
        { label: 'Zweite Kiste', desc: 'Inhalt unbekannt.',
          run: function (run, rng) { return mysteryBox(run, rng, 1); } },
        { label: 'Dritte Kiste', desc: 'Inhalt unbekannt.',
          run: function (run, rng) { return mysteryBox(run, rng, 2); } }
      ]
    },
    {
      id: 'arena', title: 'Wettkampfarena',
      text: 'Eine improvisierte Arena, ein johlendes Publikum. »Wer gewinnt, kassiert doppelt!«',
      options: [
        { label: 'Antreten', desc: 'Starker Gegner, doppelte Belohnung.',
          run: function (run, rng) { return { battle: run.makeAmbush(rng, { elite: true, doubleReward: true }) }; } },
        { label: 'Zuschauen', desc: 'Man lernt auch beim Hinsehen.',
          run: function (run) { return run.grantExp(Math.round(run.levelCap * 25)); } }
      ]
    }
  ];

  PL.world = {
    REGIONS: REGIONS,
    TRAINERS: TRAINERS,
    ELITE: ELITE,
    CHAMPIONS: CHAMPIONS,
    EVENTS: EVENTS,
    encounterPool: encounterPool,
    megaStoneFor: megaStoneFor,
    counterStarter: counterStarter,
    rivalTeam: rivalTeam,
    rivalBanter: rivalBanter,
    STARTER_TRIOS: STARTER_TRIOS,
    pickEncounter: pickEncounter,
    buildMon: buildMon,
    trainerTeam: trainerTeam,
    bossTeam: bossTeam,
    eliteTeam: eliteTeam,
    championTeam: championTeam,
    region: function (i) { return REGIONS[i % REGIONS.length]; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.world;
})(typeof globalThis !== 'undefined' ? globalThis : this);
