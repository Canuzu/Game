/* =============================================================================
 * items.js — Gegenstände und Relikte
 * -----------------------------------------------------------------------------
 * Ein Eintrag beschreibt Name, Zweck, Preis und — wo nötig — die Wirkung.
 * Kampfwirkungen von Tragegegenständen stehen in effects.js; hier stehen
 * Beschreibung, Preis und alles, was außerhalb des Kampfes passiert.
 *
 *   kind: 'ball' | 'heal' | 'status' | 'boost' | 'hold' | 'evo' | 'special'
 *
 * Relikte wirken dauerhaft für den ganzen Run. Ihre Wirkung steckt entweder in
 * `mods` (Zahlenwerte, die Run und Kampf abfragen) oder in einem Haken.
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function') {
    if (!PL.dex) require('./core.js');
    if (!PL.mon) require('./pokemon.js');
    if (!PL.effects) require('./effects.js');
  }
  var dex = PL.dex, toID = PL.util.toID, mons = PL.mon;

  var ITEMS = {};

  function def(id, o) { o.id = id; ITEMS[id] = o; return o; }

  /* ---------- Bälle --------------------------------------------------------- */

  def('pokeball', { name: 'Pokéball', kind: 'ball', price: 200, desc: 'Der Standardball.',
    ball: function () { return 1; } });
  def('greatball', { name: 'Superball', kind: 'ball', price: 600, desc: 'Fängt anderthalbmal so gut.',
    ball: function () { return 1.5; } });
  def('ultraball', { name: 'Hyperball', kind: 'ball', price: 1200, desc: 'Doppelte Fangkraft.',
    ball: function () { return 2; } });
  def('masterball', { name: 'Meisterball', kind: 'ball', price: 12000, rare: true,
    desc: 'Fängt ohne Ausnahme.', ball: function () { return 255; } });
  def('timerball', { name: 'Timerball', kind: 'ball', price: 800,
    desc: 'Wird mit jeder Runde stärker (bis ×4).',
    ball: function (bt) { return Math.min(4, 1 + bt.turn * 0.3); } });
  def('netball', { name: 'Netzball', kind: 'ball', price: 800,
    desc: '×3,5 gegen Wasser- und Käfer-Pokémon.',
    ball: function (bt, foe) { return (foe.types.indexOf('Water') >= 0 || foe.types.indexOf('Bug') >= 0) ? 3.5 : 1; } });
  def('duskball', { name: 'Finsterball', kind: 'ball', price: 900,
    desc: '×3 gegen angeschlagene Ziele (unter 25 % KP).',
    ball: function (bt, foe) { return bt.hpFraction(foe) <= 0.25 ? 3 : 1; } });
  def('quickball', { name: 'Flottball', kind: 'ball', price: 900,
    desc: '×5 in der ersten Runde, danach schwach.',
    ball: function (bt) { return bt.turn <= 1 ? 5 : 0.8; } });
  def('nestball', { name: 'Nestball', kind: 'ball', price: 700,
    desc: 'Stark gegen Pokémon mit niedrigem Level.',
    ball: function (bt, foe) { return Math.max(1, (41 - foe.mon.lvl) / 10); } });
  def('healball', { name: 'Heilball', kind: 'ball', price: 800,
    desc: 'Fängt normal und heilt den Fang vollständig.',
    ball: function () { return 1.5; }, healOnCatch: true });

  /* ---------- Heilung ------------------------------------------------------- */

  function healItem(id, name, price, amount, desc) {
    def(id, {
      name: name, kind: 'heal', price: price, desc: desc,
      use: function (bt, side, mon) {
        if (mon.hp <= 0 || mon.hp >= mons.maxHP(mon)) return false;
        var got = mons.heal(mon, amount === 'full' ? mons.maxHP(mon) : amount);
        return { text: mons.name(mon) + ' erhält ' + got + ' KP zurück.' };
      },
      useOutside: true
    });
  }
  healItem('potion', 'Trank', 300, 20, 'Füllt 20 KP auf.');
  healItem('superpotion', 'Supertrank', 700, 60, 'Füllt 60 KP auf.');
  healItem('hyperpotion', 'Hypertrank', 1200, 120, 'Füllt 120 KP auf.');
  healItem('maxpotion', 'Top-Trank', 2500, 'full', 'Füllt alle KP auf.');

  def('fullrestore', {
    name: 'Top-Genesung', kind: 'heal', price: 3000, desc: 'Volle KP und alle Statusprobleme geheilt.',
    useOutside: true,
    use: function (bt, side, mon) {
      if (mon.hp <= 0) return false;
      mons.fullRestore(mon);
      return { text: mons.name(mon) + ' ist wieder topfit.' };
    }
  });
  def('revive', {
    name: 'Beleber', kind: 'heal', price: 1500, desc: 'Belebt ein besiegtes Pokémon mit halben KP.',
    useOutside: true,
    use: function (bt, side, mon) {
      if (mon.hp > 0) return false;
      mon.hp = Math.floor(mons.maxHP(mon) / 2);
      mon.status = null;
      return { text: mons.name(mon) + ' ist wieder auf den Beinen!' };
    }
  });
  def('maxrevive', {
    name: 'Top-Beleber', kind: 'heal', price: 4000, desc: 'Belebt mit vollen KP.',
    useOutside: true,
    use: function (bt, side, mon) {
      if (mon.hp > 0) return false;
      mon.hp = mons.maxHP(mon);
      mon.status = null;
      return { text: mons.name(mon) + ' ist wieder vollständig bei Kräften!' };
    }
  });

  function statusItem(id, name, price, statuses, desc) {
    def(id, {
      name: name, kind: 'status', price: price, desc: desc, useOutside: true,
      use: function (bt, side, mon) {
        if (!mon.status || statuses.indexOf(mon.status) < 0) return false;
        mon.status = null; mon.slp = 0;
        return { text: mons.name(mon) + ' fühlt sich besser.' };
      }
    });
  }
  statusItem('antidote', 'Gegengift', 200, ['psn', 'tox'], 'Heilt Vergiftungen.');
  statusItem('burnheal', 'Feuerheiler', 250, ['brn'], 'Heilt Verbrennungen.');
  statusItem('paralyzeheal', 'Para-Heiler', 250, ['par'], 'Heilt Paralyse.');
  statusItem('awakening', 'Aufwecker', 250, ['slp'], 'Weckt schlafende Pokémon.');
  statusItem('iceheal', 'Eisheiler', 250, ['frz'], 'Taut eingefrorene Pokémon auf.');
  statusItem('fullheal', 'Hyperheiler', 600, ['psn', 'tox', 'brn', 'par', 'slp', 'frz'], 'Heilt jedes Statusproblem.');

  /* ---------- Kampfhilfen und Training -------------------------------------- */

  function xItem(id, name, stat, price) {
    def(id, {
      name: name, kind: 'boost', price: price, desc: 'Erhöht ' + PL.t.stat(stat) + ' im Kampf um zwei Stufen.',
      use: function (bt, side, mon) {
        if (!bt || !side.active || side.active.mon !== mon) return false;
        var b = {}; b[stat] = 2;
        bt.boost(side.active, b, side.active);
        return true;
      }
    });
  }
  xItem('xattack', 'X-Angriff', 'atk', 500);
  xItem('xdefense', 'X-Verteidigung', 'def', 500);
  xItem('xspecial', 'X-Spezial', 'spa', 500);
  xItem('xspdef', 'X-Spezialabwehr', 'spd', 500);
  xItem('xspeed', 'X-Tempo', 'spe', 500);

  def('rarecandy', {
    name: 'Sonderbonbon', kind: 'special', price: 2000, desc: 'Ein Level mehr — sofort.',
    useOutside: true, outsideOnly: true,
    use: function (bt, side, mon, run) {
      var cap = run ? run.levelCap : 100;
      if (mon.lvl >= cap) return false;
      var res = mons.gainExp(mon, mons.expForLevel(mon.lvl + 1) - mon.exp, { levelCap: cap });
      return { text: mons.name(mon) + ' erreicht Level ' + mon.lvl + '!', levelUp: res };
    }
  });

  function vitamin(id, name, stat, price) {
    def(id, {
      name: name, kind: 'boost', price: price, useOutside: true, outsideOnly: true,
      desc: '+20 Fleißpunkte auf ' + PL.t.stat(stat) + '.',
      use: function (bt, side, mon) {
        var got = mons.addEVs(mon, stat, 20);
        if (!got) return false;
        return { text: mons.name(mon) + ': ' + PL.t.stat(stat) + ' +' + got + ' FP.' };
      }
    });
  }
  vitamin('hpup', 'KP-Plus', 'hp', 900);
  vitamin('protein', 'Protein', 'atk', 900);
  vitamin('iron', 'Eisen', 'def', 900);
  vitamin('calcium', 'Kalzium', 'spa', 900);
  vitamin('zinc', 'Zink', 'spd', 900);
  vitamin('carbos', 'Carbon', 'spe', 900);

  def('ether', {
    name: 'Äther', kind: 'special', price: 600, desc: 'Frischt 10 AP einer Attacke auf.',
    useOutside: true,
    use: function (bt, side, mon) {
      var slot = mon.moves.filter(function (m) { return m.pp < dex.move(m.m).pp; })[0];
      if (!slot) return false;
      slot.pp = Math.min(dex.move(slot.m).pp, slot.pp + 10);
      return { text: dex.move(slot.m).n + ' hat wieder AP.' };
    }
  });
  def('maxelixir', {
    name: 'Top-Elixier', kind: 'special', price: 2000, desc: 'Füllt alle AP des Teams auf.',
    useOutside: true, outsideOnly: true, teamWide: true,
    use: function (bt, side, mon) {
      mon.moves.forEach(function (m) { m.pp = dex.move(m.m).pp + m.ppUp * Math.floor(dex.move(m.m).pp / 5); });
      return { text: 'Alle AP von ' + mons.name(mon) + ' sind wieder voll.' };
    }
  });
  def('ppup', {
    name: 'AP-Plus', kind: 'special', price: 1800, desc: 'Erhöht die maximalen AP einer Attacke dauerhaft.',
    useOutside: true, outsideOnly: true, needsMove: true,
    use: function (bt, side, mon, run, moveIndex) {
      var slot = mon.moves[moveIndex || 0];
      if (!slot || slot.ppUp >= 3) return false;
      slot.ppUp++;
      slot.pp += Math.floor(dex.move(slot.m).pp / 5);
      return { text: dex.move(slot.m).n + ' hat jetzt mehr AP.' };
    }
  });

  def('abilitycapsule', {
    name: 'Fähigkeits-Kapsel', kind: 'special', price: 2500, useOutside: true, outsideOnly: true,
    desc: 'Tauscht die Fähigkeit gegen die zweite reguläre.',
    use: function (bt, side, mon) {
      var sp = dex.sp(mon.sp);
      if (sp.ab.length < 2) return false;
      mon.ab = sp.ab[0] === mon.ab ? sp.ab[1] : sp.ab[0];
      return { text: mons.name(mon) + ' hat jetzt ' + mon.ab + '.' };
    }
  });
  def('abilitypatch', {
    name: 'Fähigkeits-Pflaster', kind: 'special', price: 5000, useOutside: true, outsideOnly: true,
    desc: 'Schaltet die versteckte Fähigkeit frei.',
    use: function (bt, side, mon) {
      var sp = dex.sp(mon.sp);
      if (!sp.abh || mon.ab === sp.abh) return false;
      mon.ab = sp.abh;
      return { text: mons.name(mon) + ' hat jetzt die versteckte Fähigkeit ' + mon.ab + '.' };
    }
  });
  def('bottlecap', {
    name: 'Silberkronkorken', kind: 'special', price: 4000, useOutside: true, outsideOnly: true,
    desc: 'Setzt alle Determinationswerte auf das Maximum.',
    use: function (bt, side, mon) {
      if (mon.ivs.every(function (v) { return v === 31; })) return false;
      mon.ivs = [31, 31, 31, 31, 31, 31];
      mon.hp = Math.min(mons.maxHP(mon), mon.hp + 5);
      return { text: mons.name(mon) + ' erreicht sein volles Potenzial!' };
    }
  });
  def('mint', {
    name: 'Minze', kind: 'special', price: 2000, useOutside: true, outsideOnly: true, needsChoice: 'nature',
    desc: 'Ändert das Wesen — die Statusverteilung passt sich an.',
    use: function (bt, side, mon, run, nature) {
      if (!nature || mon.nat === nature) return false;
      mon.nat = nature;
      return { text: mons.name(mon) + ' hat jetzt das Wesen ' + PL.t.nature(nature) + '.' };
    }
  });
  /* ---------- Tragegegenstände ---------------------------------------------- */

  var HOLD = [
    ['leftovers', 'Überreste', 2500, 'Heilt jede Runde 1/16 der KP.'],
    ['lifeorb', 'Leben-Orb', 3000, '30 % mehr Schaden, kostet 1/10 KP je Angriff.'],
    ['choiceband', 'Wahlband', 2800, '+50 % Angriff, legt auf eine Attacke fest.'],
    ['choicespecs', 'Wahlglas', 2800, '+50 % Sp.-Angriff, legt auf eine Attacke fest.'],
    ['choicescarf', 'Wahlschal', 2800, '+50 % Initiative, legt auf eine Attacke fest.'],
    ['focussash', 'Fokusgurt', 2500, 'Überlebt aus vollen KP einen K.-o.-Treffer.'],
    ['assaultvest', 'Angriffsweste', 2600, '+50 % Sp.-Verteidigung, keine Statusattacken.'],
    ['eviolite', 'Evolith', 2400, '+50 % Verteidigung und Sp.-Verteidigung, wenn noch entwickelbar.'],
    ['rockyhelmet', 'Fels-Helm', 2200, 'Verletzt Angreifer bei Berührung.'],
    ['expertbelt', 'Expertengurt', 2200, '+20 % Schaden bei sehr effektiven Treffern.'],
    ['muscleband', 'Muskelband', 1500, '+10 % auf physische Attacken.'],
    ['wiseglasses', 'Blockbrille', 1500, '+10 % auf spezielle Attacken.'],
    ['blacksludge', 'Giftschleim', 1200, 'Heilt Gift-Pokémon, schadet allen anderen.'],
    ['airballoon', 'Luftballon', 1800, 'Schwebt über Boden-Attacken, bis er platzt.'],
    ['weaknesspolicy', 'Schwächenschutz', 2400, '+2 Angriff und Sp.-Angriff nach einem sehr effektiven Treffer.'],
    ['heavydutyboots', 'Endurostiefel', 2400, 'Ignoriert Fallen beim Einwechseln.'],
    ['lightclay', 'Lichtlehm', 1600, 'Lichtschild und Reflektor halten länger.'],
    ['damprock', 'Nassbrocken', 1400, 'Regen hält länger.'],
    ['heatrock', 'Heißbrocken', 1400, 'Sonnenschein hält länger.'],
    ['terrainextender', 'Feldverlängerung', 1600, 'Felder halten länger.'],
    ['loadeddice', 'Trickwürfel', 2200, 'Mehrfachangriffe treffen immer maximal oft.'],
    ['punchingglove', 'Schlaghandschuh', 1800, '+10 % auf Hieb-Attacken, kein Berührungsrisiko.'],
    ['clearamulet', 'Klarheitsamulett', 2400, 'Der Gegner kann keine Werte senken.'],
    ['covertcloak', 'Heimlichkeitsumhang', 2400, 'Schützt vor Zusatzeffekten.'],
    ['quickclaw', 'Flinkklaue', 1600, '20 % Chance, zuerst zu handeln.'],
    ['kingsrock', 'König-Stein', 1600, '10 % Chance, das Ziel zurückschrecken zu lassen.'],
    ['whiteherb', 'Weißkraut', 1400, 'Setzt gesenkte Werte einmalig zurück.'],
    ['throatspray', 'Rachenspray', 1400, '+1 Sp.-Angriff nach einer Lärm-Attacke.'],
    ['safetygoggles', 'Schutzbrille', 1600, 'Schützt vor Wetter- und Pulverschaden.'],
    ['scopelens', 'Scope-Linse', 1800, 'Erhöht die Volltrefferquote.'],
    ['boosterenergy', 'Energiebooster', 2600, 'Löst Paradox-Fähigkeiten sofort aus.'],
    ['metronome', 'Taktstock', 1800, 'Wiederholte Attacken werden stärker.']
  ];
  HOLD.forEach(function (h) {
    def(h[0], { name: h[1], kind: 'hold', price: h[2], desc: h[3], hold: true });
  });

  var TYPE_ITEM_NAMES = {
    charcoal: 'Holzkohle', mysticwater: 'Zauberwasser', miracleseed: 'Wundersaat', magnet: 'Magnet',
    nevermeltice: 'Ewiges Eis', blackbelt: 'Schwarzgurt', poisonbarb: 'Giftstich', softsand: 'Pudersand',
    sharpbeak: 'Spitzschnabel', twistedspoon: 'Krummlöffel', silverpowder: 'Silberstaub',
    hardstone: 'Granitstein', spelltag: 'Bannsticker', dragonfang: 'Drachenzahn',
    blackglasses: 'Schattenglas', metalcoat: 'Metallmantel', fairyfeather: 'Feenfeder',
    silkscarf: 'Seidenschal'
  };
  Object.keys(PL.effects.typeItems).forEach(function (id) {
    def(id, {
      name: TYPE_ITEM_NAMES[id] || id,
      kind: 'hold', price: 1400, hold: true,
      desc: '+20 % auf Attacken vom Typ ' + PL.t.type(PL.effects.typeItems[id]) + '.'
    });
  });

  var BERRY_NAMES = {
    sitrusberry: 'Tsitrubeere', oranberry: 'Amrenabeere', lumberry: 'Prunusbeere',
    chestoberry: 'Rospelbeere', leppaberry: 'Jonagobeere', liechiberry: 'Kramanbeere',
    petayaberry: 'Kiroyabeere', salacberry: 'Salkabeere', ganlonberry: 'Wunfrucht',
    apicotberry: 'Apikobeere', figyberry: 'Kuobeere'
  };
  var BERRY_DESC = {
    sitrusberry: 'Heilt 25 % KP, wenn die Hälfte unterschritten wird.',
    oranberry: 'Heilt 10 KP bei halben KP.',
    lumberry: 'Heilt jedes Statusproblem und Verwirrung.',
    chestoberry: 'Weckt sofort aus dem Schlaf.',
    leppaberry: 'Frischt leere AP auf.',
    liechiberry: '+1 Angriff bei wenig KP.',
    petayaberry: '+1 Sp.-Angriff bei wenig KP.',
    salacberry: '+1 Initiative bei wenig KP.',
    ganlonberry: '+1 Verteidigung bei wenig KP.',
    apicotberry: '+1 Sp.-Verteidigung bei wenig KP.',
    figyberry: 'Heilt ein Drittel der KP bei wenig KP.'
  };
  Object.keys(BERRY_NAMES).forEach(function (id) {
    def(id, { name: BERRY_NAMES[id], kind: 'hold', price: 900, hold: true, berry: true, desc: BERRY_DESC[id] });
  });

  var RESIST_NAMES = {
    occaberry: 'Koakobeere', passhoberry: 'Wasmelbeere', wacanberry: 'Foragobeere',
    rindoberry: 'Iabanbeere', yacheberry: 'Giederbeere', chopleberry: 'Grarzbeere',
    kebiaberry: 'Kobabeere', shucaberry: 'Kerzalbeere', cobaberry: 'Kakiribeere',
    payapaberry: 'Pyapabeere', tangaberry: 'Tanigabeere', chartiberry: 'Chiaribeere',
    kasibberry: 'Zitrubeere', habanberry: 'Frubbeere', colburberry: 'Kuronbeere',
    babiriberry: 'Bibeere', roseliberry: 'Rosellbeere', chilanberry: 'Chilanbeere'
  };
  Object.keys(PL.effects.resistBerries).forEach(function (id) {
    def(id, {
      name: RESIST_NAMES[id] || id, kind: 'hold', price: 1000, hold: true, berry: true,
      desc: 'Halbiert einen sehr effektiven Treffer vom Typ ' + PL.t.type(PL.effects.resistBerries[id]) + '.'
    });
  });

  /* ---------- Entwicklungsgegenstände ---------------------------------------
   * Werden aus den Pokédex-Daten abgeleitet, damit keine Entwicklung ins
   * Leere läuft.
   * ------------------------------------------------------------------------ */

  var EVO_NAMES = {
    'Fire Stone': 'Feuerstein', 'Water Stone': 'Wasserstein', 'Thunder Stone': 'Donnerstein',
    'Leaf Stone': 'Blattstein', 'Moon Stone': 'Mondstein', 'Sun Stone': 'Sonnenstein',
    'Shiny Stone': 'Leuchtstein', 'Dusk Stone': 'Finsterstein', 'Dawn Stone': 'Funkelstein',
    'Ice Stone': 'Eisstein', 'Oval Stone': 'Ovaler Stein', 'Metal Coat': 'Metallmantel',
    'Dragon Scale': 'Drachenhaut', 'Up-Grade': 'Up-Grade', 'Dubious Disc': 'Dubiosdisk',
    'Protector': 'Schutzweste', 'Electirizer': 'Elektrisierer', 'Magmarizer': 'Magmaisierer',
    'Razor Claw': 'Scharfklaue', 'Razor Fang': 'Scharfzahn', 'Prism Scale': 'Prismaschuppe',
    'Whipped Dream': 'Sahnehäubchen', 'Sachet': 'Duftbeutel', 'Reaper Cloth': 'Düsterumhang',
    'Deep Sea Tooth': 'Meeresrelikt', 'Deep Sea Scale': 'Perle des Meeres',
    'Cracked Pot': 'Rissige Kanne', 'Chipped Pot': 'Angeschlagene Kanne',
    'Sweet Apple': 'Süßer Apfel', 'Tart Apple': 'Saurer Apfel', 'Syrupy Apple': 'Sirup-Apfel',
    'Galarica Cuff': 'Galarnuss-Reif', 'Galarica Wreath': 'Galarnuss-Kranz',
    'Black Augurite': 'Schwarzaugit', 'Peat Block': 'Torfblock', 'Auspicious Armor': 'Gunstrüstung',
    'Malicious Armor': 'Fluchrüstung', 'Metal Alloy': 'Metalllegierung',
    'Leader\'s Crest': 'Anführerzahn', 'Scroll of Darkness': 'Dunkelschriftrolle',
    'Scroll of Waters': 'Wasserschriftrolle', 'Masterpiece Teacup': 'Meister-Teetasse',
    'Unremarkable Teacup': 'Schlichte Teetasse', 'King\'s Rock': 'König-Stein',
    'Linking Cord': 'Kabelmodul'
  };

  var evoItems = {};
  dex.species.forEach(function (sp) { if (sp.ei) evoItems[sp.ei] = true; });
  evoItems['Linking Cord'] = true;
  Object.keys(evoItems).forEach(function (name) {
    var id = toID(name);
    if (ITEMS[id] && ITEMS[id].kind !== 'evo') { ITEMS[id].evo = name; return; }
    def(id, {
      name: EVO_NAMES[name] || name, en: name, kind: 'evo', price: 2200, evo: name,
      desc: 'Lässt bestimmte Pokémon sich entwickeln.'
    });
  });
  def('mysterystone', {
    name: 'Rätselstein', en: 'Rätselstein', kind: 'evo', price: 3000, evo: 'Rätselstein',
    desc: 'Löst jede Entwicklung aus, die sonst besondere Umstände braucht.'
  });

  /* ---------- Mega-Steine ---------------------------------------------------- */

  Object.keys(dex.megas).forEach(function (baseId) {
    dex.megas[baseId].forEach(function (m) {
      if (!m.it) return;
      var id = toID(m.it);
      if (ITEMS[id]) return;
      def(id, {
        name: m.it, kind: 'hold', hold: true, mega: baseId, price: 4000,
        desc: 'Lässt ' + PL.t.species(dex.sp(baseId)) + ' im Kampf mega-entwickeln.'
      });
    });
  });

  /* ---------- Zugriff -------------------------------------------------------- */

  function get(id) { return ITEMS[toID(id)] || null; }
  function label(id) { var i = get(id); return i ? i.name : (id || '—'); }
  function all() { return Object.keys(ITEMS).map(function (k) { return ITEMS[k]; }); }
  function ofKind(kind) { return all().filter(function (i) { return i.kind === kind; }); }

  /** Eine TM ist kein Katalogeintrag, sondern wird zur Attacke erzeugt. */
  function tm(moveIndex) {
    var m = dex.move(moveIndex);
    return {
      id: 'tm-' + m.id, name: 'TM ' + m.n, kind: 'tm', move: moveIndex,
      price: Math.round(300 + (m.bp || 40) * 12 + (m.c === 'T' ? 400 : 0)),
      desc: PL.t.moveDesc(m), type: m.t, cat: m.c
    };
  }

  PL.items = { get: get, label: label, all: all, ofKind: ofKind, tm: tm, table: ITEMS, evoNames: EVO_NAMES };

  /* ========================================================== Relikte ====== */

  var RELICS = {};
  function relic(id, o) { o.id = id; RELICS[id] = o; return o; }

  // mods werden vom Run abgefragt:
  //   expMult, moneyMult, shopDiscount, catchMult, shinyMult, healPerNode,
  //   extraReward, revealAhead, evPerFloor, teamStatMult, typeBoost
  relic('glueckliches_ei', { name: 'Glückliches Ei', rarity: 'haeufig', icon: '🥚',
    desc: '+30 % Erfahrung aus allen Kämpfen.', mods: { expMult: 1.3 } });
  relic('muenzamulett', { name: 'Münzamulett', rarity: 'haeufig', icon: '🪙',
    desc: '+40 % Geld aus allen Quellen.', mods: { moneyMult: 1.4 } });
  relic('ep_teiler', { name: 'EP-Teiler', rarity: 'haeufig', icon: '📶',
    desc: 'Die Bank bekommt 60 % der Erfahrung statt 25 %.', mods: { benchExp: 0.6 } });
  relic('honigtopf', { name: 'Honigtopf', rarity: 'haeufig', icon: '🍯',
    desc: 'Fangchance ×1,5 und wilde Pokémon erscheinen häufiger.', mods: { catchMult: 1.5 } });
  relic('schillerpin', { name: 'Schillerpin', rarity: 'selten', icon: '✨',
    desc: 'Schillernde Pokémon achtmal so häufig.', mods: { shinyMult: 8 } });
  relic('wunderbroetchen', { name: 'Wunderbrötchen', rarity: 'haeufig', icon: '🍞',
    desc: 'Nach jedem Knoten heilt das Team 8 % seiner KP.', mods: { healPerNode: 0.08 } });
  relic('haendlerkarte', { name: 'Händlerkarte', rarity: 'haeufig', icon: '💳',
    desc: 'Alle Preise 25 % günstiger.', mods: { shopDiscount: 0.25 } });
  relic('typenkompass', { name: 'Typenkompass', rarity: 'haeufig', icon: '🧭',
    desc: 'Zeigt vor jedem Kampf das gegnerische Team.', mods: { scout: 1 } });
  relic('alte_karte', { name: 'Alte Karte', rarity: 'haeufig', icon: '🗺️',
    desc: 'Jeder Knoten der Route bekommt eine zusätzliche Verzweigung — mehr Auswahl auf jedem Schritt.',
    mods: { extraPaths: 1 } });
  relic('trainingsgewichte', { name: 'Trainingsgewichte', rarity: 'haeufig', icon: '🏋️',
    desc: 'Nach jedem Kampf +4 Fleißpunkte auf einen zufälligen Wert.', mods: { evPerBattle: 4 } });
  relic('vitamin_abo', { name: 'Vitamin-Abo', rarity: 'selten', icon: '💊',
    desc: 'Auf jeder neuen Route +12 Fleißpunkte auf den besten Wert jedes Teammitglieds.',
    mods: { evPerFloor: 12 } });
  relic('notfallband', { name: 'Notfallband', rarity: 'selten', icon: '🎗️',
    desc: 'Einmal pro Kampf steht das erste besiegte Pokémon mit 30 % KP wieder auf.',
    mods: { emergencyRevive: 0.3 }, battle: true });
  relic('eilekarte', { name: 'Eilekarte', rarity: 'selten', icon: '⚡',
    desc: 'In der ersten Runde jedes Kampfes handelst du zuerst.',
    mods: { firstTurnPriority: 1 }, battle: true });
  relic('schutzhelm', { name: 'Schutzhelm', rarity: 'selten', icon: '⛑️',
    desc: 'Dein Team ignoriert Tarnsteine, Stachler und Klebenetze.',
    mods: { hazardImmune: 1 }, battle: true });
  relic('mega_armband', { name: 'Mega-Armband', rarity: 'episch', icon: '💎',
    desc: 'Du darfst zweimal pro Kampf mega-entwickeln.',
    mods: { megaCharges: 2 }, battle: true });
  relic('steinsammlung', { name: 'Steinsammlung', rarity: 'selten', icon: '💍',
    desc: 'Mega-Steine kosten im Laden nur die Hälfte und tauchen häufiger auf.',
    mods: { stoneDiscount: 0.5 } });
  relic('meisterball_splitter', { name: 'Meisterball-Splitter', rarity: 'episch', icon: '🔮',
    desc: 'Einmal pro Run fängst du garantiert.', mods: { freeMasterball: 1 } });
  relic('zweite_chance', { name: 'Zweite Chance', rarity: 'selten', icon: '🔁',
    desc: 'Belohnungen dürfen einmal pro Knoten neu gewürfelt werden.', mods: { reroll: 1 } });
  relic('doppelfund', { name: 'Doppelfund', rarity: 'episch', icon: '🎁',
    desc: 'Jede Belohnungsauswahl bietet eine Option mehr.', mods: { extraReward: 1 } });
  relic('teamgeist', { name: 'Teamgeist', rarity: 'episch', icon: '🤝',
    desc: 'Mit sechs Pokémon im Team haben alle +8 % auf ihre Werte.',
    mods: { fullTeamStats: 1.08 }, battle: true });
  relic('erfahrungsbonbon', { name: 'Erfahrungsbonbon', rarity: 'haeufig', icon: '🍬',
    desc: 'Neu gefangene Pokémon kommen zwei Level über dem Durchschnitt an.',
    mods: { catchLevelBonus: 2 } });
  relic('notarzt', { name: 'Notarzt', rarity: 'selten', icon: '🚑',
    desc: 'Nach jedem Arenakampf wird das Team vollständig geheilt.', mods: { healAfterBoss: 1 } });
  relic('kampfgeist', { name: 'Kampfgeist', rarity: 'selten', icon: '🔥',
    desc: 'Nach jedem Sieg im Kampf +1 auf einen zufälligen Wert.',
    mods: { koBoost: 1 }, battle: true });
  relic('wunderkerze', { name: 'Wunderkerze', rarity: 'selten', icon: '🕯️',
    desc: 'Deine Statusattacken treffen immer.', mods: { statusNeverMiss: 1 }, battle: true });
  relic('ausdauertraining', { name: 'Ausdauertraining', rarity: 'haeufig', icon: '💪',
    desc: 'Zwischen den Kämpfen regenerieren alle Attacken 5 AP.', mods: { ppPerNode: 5 } });
  relic('glueckswuerfel', { name: 'Glückswürfel', rarity: 'selten', icon: '🎲',
    desc: '15 % Chance, dass eine Belohnung doppelt ausgeschüttet wird.', mods: { doubleReward: 0.15 } });
  relic('zeitmesser', { name: 'Zeitmesser', rarity: 'haeufig', icon: '⏱️',
    desc: 'Bälle werden mit jeder Kampfrunde deutlich stärker.', mods: { timerBalls: 1 } });
  relic('erste_hilfe_set', { name: 'Erste-Hilfe-Set', rarity: 'haeufig', icon: '🩹',
    desc: 'Statusprobleme verschwinden nach jedem Kampf von allein.', mods: { autoCure: 1 } });
  relic('gluecksbringer', { name: 'Glücksbringer', rarity: 'episch', icon: '🍀',
    desc: 'Volltreffer und Zusatzeffekte deiner Attacken sind wahrscheinlicher.',
    mods: { luck: 1 }, battle: true });
  relic('schmiedehammer', { name: 'Schmiedehammer', rarity: 'selten', icon: '🔨',
    desc: 'Im Laden liegt immer mindestens ein Tragegegenstand aus.', mods: { shopHold: 1 } });
  relic('lehrbuch', { name: 'Lehrbuch', rarity: 'selten', icon: '📘',
    desc: 'Nach jedem Kampf darf ein Pokémon eine Attacke neu lernen.', mods: { moveTutor: 1 } });
  relic('bruthelfer', { name: 'Bruthelfer', rarity: 'episch', icon: '🥚',
    desc: 'Entwicklungen brauchen fünf Level weniger.', mods: { evoEarly: 5 } });
  relic('sammlerkoffer', { name: 'Sammlerkoffer', rarity: 'haeufig', icon: '🧰',
    desc: 'Du startest jeden Kampf mit zwei zusätzlichen Bällen.', mods: { freeBalls: 2 } });
  relic('waermflasche', { name: 'Wärmflasche', rarity: 'haeufig', icon: '🧣',
    desc: 'Dein Team ist immun gegen Wetterschaden.', mods: { weatherImmune: 1 }, battle: true });

  function typeRelic(type, de) {
    relic('fokus_' + toID(type), {
      name: 'Fokus: ' + de, rarity: 'selten', icon: '🎯', type: type,
      desc: '+30 % Schaden mit ' + de + '-Attacken.',
      mods: { typeBoost: type }, battle: true
    });
  }
  dex.types.forEach(function (ty) { typeRelic(ty, PL.t.type(ty)); });

  var RARITY_WEIGHT = { haeufig: 60, selten: 30, episch: 10 };

  PL.relics = {
    table: RELICS,
    get: function (id) { return RELICS[id] || null; },
    all: function () { return Object.keys(RELICS).map(function (k) { return RELICS[k]; }); },
    rarityWeight: RARITY_WEIGHT,
    /** Zieht n Relikte, die noch nicht im Besitz sind. */
    draw: function (rng, owned, n, opts) {
      opts = opts || {};
      var pool = PL.relics.all().filter(function (r) {
        if (owned && owned[r.id]) return false;
        if (opts.noType && r.type) return false;
        return true;
      });
      var out = [], i;
      for (i = 0; i < n && pool.length; i++) {
        var pick = rng.weighted(pool, function (r) { return RARITY_WEIGHT[r.rarity] || 20; });
        out.push(pick);
        pool.splice(pool.indexOf(pick), 1);
      }
      return out;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { items: PL.items, relics: PL.relics };
})(typeof globalThis !== 'undefined' ? globalThis : this);
