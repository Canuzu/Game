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
      team.push(buildMon(rng, sp, Math.max(2, lvl), {
        quality: opts.quality || 0.7, ivFloor: opts.ivFloor || 5
      }));
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
    var quality = Math.min(0.92, 0.72 + index * 0.025);
    var evScale = Math.min(1, 0.35 + index * 0.09);
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
      // Nur der Ass-Kämpfer trägt einen Gegenstand
      if (last && index > 0) mon.item = rng.pick(['leftovers', 'lifeorb', 'focussash', 'assaultvest', 'choicescarf', 'sitrusberry']);
      mon.tera = type;
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
        mon.item = rng.pick(['leftovers', 'lifeorb', 'focussash', 'choiceband', 'choicespecs', 'choicescarf', 'assaultvest', 'sitrusberry']);
      }
      mon.tera = rng.chance(0.6) ? type : mon.tera;
      mons.addEVs(mon, mon.ivs[1] >= mon.ivs[3] ? 'atk' : 'spa', 140);
      mons.addEVs(mon, 'spe', 100);
      mons.addEVs(mon, 'hp', 80);
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
      if (i < 4) mon.item = ['leftovers', 'lifeorb', 'focussash', 'choicescarf'][i];
      mons.addEVs(mon, mon.ivs[1] >= mon.ivs[3] ? 'atk' : 'spa', 160);
      mons.addEVs(mon, 'spe', 140);
      return mon;
    });
    return { team: team, name: 'Champ ' + champ.name, cls: 'Champ', level: 3 };
  }

  /* ---------- 5) Ereignisse ------------------------------------------------------ */

  /**
   * Ein Ereignis liefert Titel, Text und Optionen. `enabled` darf eine Option
   * ausblenden, `run` ist der laufende Spielstand (siehe run.js).
   */
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
      id: 'tera', title: 'Kristallhöhle',
      text: 'Die Wände sind von schillernden Kristallen überzogen. Sie summen im Takt deines Herzschlags.',
      options: [
        { label: 'Kristall berühren', desc: 'Ändert den Tera-Typ eines Pokémon.',
          run: function (run, rng) { return { teraChange: true }; } },
        { label: 'Splitter mitnehmen', desc: 'Zwei Tera-Stücke.',
          run: function (run) { run.addItem('terashard', 2); return 'Zwei Tera-Stücke wandern in den Beutel.'; } }
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
