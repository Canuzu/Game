/* =============================================================================
 * leaders.js — die Arenaleiter, wie es sie wirklich gibt
 * -----------------------------------------------------------------------------
 * Für jeden der 72 Leiter steht hier seine Aufstellung aus den Spielen und
 * eine Beschreibung seines Aussehens, aus der scenery.js die Figur zeichnet.
 *
 * Zu den Teams: genommen ist jeweils der erste Kampf im Hauptspiel, in der
 * Reihenfolge, in der die Pokémon dort geschickt werden — das letzte ist das
 * Ass. Doppelte Einträge (Kogas zwei Smogmog, Elesas zwei Emolga) stehen so
 * da, wie sie im Spiel vorkommen. Die Level richten sich weiter nach dem
 * eigenen Team; hier stehen nur die Arten.
 *
 * Zum Aussehen: die Originalbilder liegen ausschließlich bei Pokémon Showdown
 * und sind von hier nicht erreichbar. Statt beliebiger Zufallsfiguren steht
 * deshalb für jeden Leiter, was ihn erkennbar macht — Haarfarbe und -schnitt,
 * die Farben seiner Kleidung, Mütze oder Umhang. Daraus zeichnet der
 * Pixel-Zeichner eine Figur im Stil des übrigen Spiels.
 *
 *   hairdo: kurz | lang | zopf | strubbel
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});

  /* Kürzel für wiederkehrende Farben — spart Wiederholung und hält die
     Tabelle lesbar. */
  var C = {
    haut:   '#f0c8a0', hautM: '#e0a878', hautD: '#c08050', hautX: '#8c5a38',
    braun:  '#5a3c26', dunkel: '#2a2a35', blond: '#e8c860', rot: '#b83828',
    orange: '#e8822c', pink: '#e070a8', lila: '#7a4bbf', blau: '#3b7dd8',
    gruen:  '#4a9a4a', weiss: '#e8e8f0', grau: '#8a8a96', tuerkis: '#3ab0a8',
    schwarz: '#1e1e26', silber: '#c8ccd8'
  };

  var LEADERS = {

    /* ---------- Kanto ---------------------------------------------------- */
    'Brock':      { team: ['geodude', 'onix'],
                    look: { skin: C.hautD, hair: C.braun, hairdo: 'strubbel', shirt: '#d4692a', pants: '#4a6b34' } },
    'Misty':      { team: ['staryu', 'starmie'],
                    look: { skin: C.haut, hair: C.orange, hairdo: 'zopf', shirt: '#f2d43c', pants: '#3a5a8c', skirt: true } },
    'Lt. Surge':  { team: ['voltorb', 'pikachu', 'raichu'],
                    look: { skin: C.hautM, hair: C.blond, hairdo: 'kurz', shirt: '#5c6b3a', pants: '#3f4a2a' } },
    'Erika':      { team: ['victreebel', 'tangela', 'vileplume'],
                    look: { skin: C.haut, hair: C.dunkel, hairdo: 'lang', shirt: '#e8d24a', pants: '#c04848', skirt: true } },
    'Koga':       { team: ['koffing', 'muk', 'koffing', 'weezing'],
                    look: { skin: C.hautM, hair: C.dunkel, hairdo: 'kurz', shirt: '#6a4a9a', pants: '#3a2a5a' } },
    'Sabrina':    { team: ['kadabra', 'mrmime', 'venomoth', 'alakazam'],
                    look: { skin: C.haut, hair: C.dunkel, hairdo: 'lang', shirt: '#c8404a', pants: '#8a2a34', skirt: true } },
    'Blaine':     { team: ['growlithe', 'ponyta', 'rapidash', 'arcanine'],
                    look: { skin: C.haut, hair: C.silber, hairdo: 'kurz', shirt: C.weiss, pants: '#b83828' } },
    'Giovanni':   { team: ['rhyhorn', 'dugtrio', 'nidoqueen', 'nidoking', 'rhydon'],
                    look: { skin: C.hautM, hair: C.dunkel, hairdo: 'kurz', shirt: '#e07a2a', pants: C.dunkel, cape: '#2a2a35' } },

    /* ---------- Johto ---------------------------------------------------- */
    'Falkner':    { team: ['pidgey', 'pidgeotto'],
                    look: { skin: C.haut, hair: '#3a5ac8', hairdo: 'lang', shirt: '#5a7ad8', pants: '#2a3a6a' } },
    'Bugsy':      { team: ['metapod', 'kakuna', 'scyther'],
                    look: { skin: C.haut, hair: '#7ac86a', hairdo: 'kurz', shirt: '#f0e8d8', pants: '#5a8a3a' } },
    'Whitney':    { team: ['clefairy', 'miltank'],
                    look: { skin: C.haut, hair: C.pink, hairdo: 'lang', shirt: '#f0f0f0', pants: '#e070a8', skirt: true } },
    'Morty':      { team: ['gastly', 'haunter', 'gengar', 'haunter'],
                    look: { skin: C.haut, hair: C.blond, hairdo: 'lang', shirt: '#6a4a9a', pants: '#3a2a4a', cape: '#4a3070' } },
    'Chuck':      { team: ['primeape', 'poliwrath'],
                    look: { skin: C.hautD, hair: C.dunkel, hairdo: 'strubbel', shirt: '#d8b878', pants: '#3a3a48' } },
    'Jasmine':    { team: ['magnemite', 'magnemite', 'steelix'],
                    look: { skin: C.haut, hair: C.braun, hairdo: 'zopf', shirt: '#f0e0c8', pants: '#8a7a6a', skirt: true } },
    'Pryce':      { team: ['seel', 'dewgong', 'piloswine'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'kurz', shirt: '#6a7a8a', pants: '#3a4a5a', cape: '#8aa8c8' } },
    'Clair':      { team: ['dragonair', 'dragonair', 'kingdra'],
                    look: { skin: C.haut, hair: '#4ab0d8', hairdo: 'lang', shirt: C.weiss, pants: '#2a6a8a', cape: '#3a8ab0' } },

    /* ---------- Hoenn ----------------------------------------------------- */
    'Roxanne':    { team: ['geodude', 'geodude', 'nosepass'],
                    look: { skin: C.haut, hair: '#4a2a3a', hairdo: 'zopf', shirt: '#f0e8e8', pants: '#8a4a6a', skirt: true } },
    'Brawly':     { team: ['machop', 'meditite', 'makuhita'],
                    look: { skin: C.hautD, hair: '#3a6ac8', hairdo: 'strubbel', shirt: '#3ab0c8', pants: '#2a5a7a' } },
    'Wattson':    { team: ['voltorb', 'electrike', 'magneton', 'manectric'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'kurz', shirt: '#e8c83c', pants: '#4a4a5a' } },
    'Flannery':   { team: ['numel', 'slugma', 'camerupt', 'torkoal'],
                    look: { skin: C.haut, hair: '#d84a3a', hairdo: 'lang', shirt: '#f0d8b8', pants: '#c03a2a', skirt: true } },
    'Norman':     { team: ['spinda', 'vigoroth', 'linoone', 'slaking'],
                    look: { skin: C.haut, hair: C.dunkel, hairdo: 'kurz', shirt: '#c8542a', pants: '#3a3a4a' } },
    'Winona':     { team: ['swablu', 'tropius', 'pelipper', 'skarmory', 'altaria'],
                    look: { skin: C.hautM, hair: '#7a5ac8', hairdo: 'lang', shirt: '#f0f0f8', pants: '#5a4a9a', cape: '#9a8ad8' } },
    'Tate & Liza': { team: ['claydol', 'xatu', 'lunatone', 'solrock'],
                    look: { skin: C.haut, hair: '#c85a8a', hairdo: 'kurz', shirt: '#e8e8f0', pants: '#c85a8a' } },
    'Wallace':    { team: ['luvdisc', 'whiscash', 'sealeo', 'crawdaunt', 'kingdra'],
                    look: { skin: C.haut, hair: '#3ac8b0', hairdo: 'lang', shirt: '#f0f0f8', pants: '#3a7a9a', cape: '#4ac8d8' } },

    /* ---------- Sinnoh ---------------------------------------------------- */
    'Roark':      { team: ['geodude', 'onix', 'cranidos'],
                    look: { skin: C.haut, hair: '#c85a3a', hairdo: 'strubbel', shirt: '#8a7a6a', pants: '#4a4a3a', hat: '#e8c83c' } },
    'Gardenia':   { team: ['cherubi', 'turtwig', 'roserade'],
                    look: { skin: C.haut, hair: '#5a8a3a', hairdo: 'zopf', shirt: '#7ac05a', pants: '#4a6a3a', skirt: true } },
    'Maylene':    { team: ['meditite', 'machoke', 'lucario'],
                    look: { skin: C.haut, hair: C.pink, hairdo: 'kurz', shirt: '#f0e8e0', pants: '#c85a7a' } },
    'Crasher Wake': { team: ['gyarados', 'quagsire', 'floatzel'],
                    look: { skin: C.hautM, hair: '#3a5ac8', hairdo: 'kurz', shirt: '#3a7ad8', pants: '#2a3a6a', cape: '#d84a3a' } },
    'Fantina':    { team: ['duskull', 'haunter', 'mismagius'],
                    look: { skin: C.haut, hair: C.lila, hairdo: 'lang', shirt: '#9a6ad0', pants: '#5a3a8a', skirt: true } },
    'Byron':      { team: ['magneton', 'steelix', 'bastiodon'],
                    look: { skin: C.hautM, hair: '#4a6ac8', hairdo: 'kurz', shirt: '#8a8a9a', pants: '#4a4a5a' } },
    'Candice':    { team: ['sneasel', 'piloswine', 'abomasnow', 'froslass'],
                    look: { skin: C.haut, hair: '#3a4a6a', hairdo: 'zopf', shirt: '#e8f0f8', pants: '#5a7ab0', skirt: true } },
    'Volkner':    { team: ['raichu', 'ambipom', 'octillery', 'luxray'],
                    look: { skin: C.haut, hair: C.blond, hairdo: 'strubbel', shirt: '#e8c83c', pants: '#3a4a6a' } },

    /* ---------- Einall ---------------------------------------------------- */
    'Cilan':      { team: ['lillipup', 'pansage'],
                    look: { skin: C.haut, hair: '#4a8a4a', hairdo: 'kurz', shirt: '#f0f0f0', pants: C.dunkel } },
    'Lenora':     { team: ['herdier', 'watchog'],
                    look: { skin: C.hautX, hair: C.dunkel, hairdo: 'lang', shirt: '#e8e0d0', pants: '#8a4a3a', skirt: true } },
    'Burgh':      { team: ['whirlipede', 'dwebble', 'leavanny'],
                    look: { skin: C.haut, hair: '#c85a3a', hairdo: 'strubbel', shirt: '#e8d84a', pants: '#4a4a5a' } },
    'Elesa':      { team: ['emolga', 'emolga', 'zebstrika'],
                    look: { skin: C.haut, hair: C.blond, hairdo: 'kurz', shirt: '#f0d84a', pants: C.dunkel, skirt: true } },
    'Clay':       { team: ['krokorok', 'palpitoad', 'excadrill'],
                    look: { skin: C.hautD, hair: C.braun, hairdo: 'kurz', shirt: '#d8b878', pants: '#8a6a4a', hat: '#c8a868' } },
    'Skyla':      { team: ['swoobat', 'unfezant', 'swanna'],
                    look: { skin: C.haut, hair: '#e88a9a', hairdo: 'lang', shirt: '#f0f0f8', pants: '#4a7ac8', skirt: true } },
    'Brycen':     { team: ['vanillish', 'cryogonal', 'beartic'],
                    look: { skin: C.haut, hair: C.silber, hairdo: 'lang', shirt: '#8ac0d8', pants: '#3a5a7a', cape: '#c8e0f0' } },
    'Drayden':    { team: ['fraxure', 'druddigon', 'haxorus'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'lang', shirt: '#4a6a5a', pants: '#3a4a3a', cape: '#8a7a5a' } },

    /* ---------- Kalos ----------------------------------------------------- */
    'Viola':      { team: ['surskit', 'vivillon'],
                    look: { skin: C.haut, hair: C.blond, hairdo: 'kurz', shirt: '#8ac06a', pants: '#4a6a4a' } },
    'Grant':      { team: ['amaura', 'tyrunt'],
                    look: { skin: C.hautM, hair: '#3a5ac8', hairdo: 'strubbel', shirt: '#e8a83c', pants: '#3a3a4a' } },
    'Korrina':    { team: ['mienfoo', 'machoke', 'hawlucha'],
                    look: { skin: C.haut, hair: C.blond, hairdo: 'lang', shirt: '#f0f0f8', pants: '#3a6ac8', hat: '#e8e8f0' } },
    'Ramos':      { team: ['jumpluff', 'weepinbell', 'gogoat'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'lang', shirt: '#6a8a4a', pants: '#4a5a3a' } },
    'Clemont':    { team: ['emolga', 'magneton', 'heliolisk'],
                    look: { skin: C.haut, hair: C.blond, hairdo: 'strubbel', shirt: '#4a8ac8', pants: '#e8c83c' } },
    'Valerie':    { team: ['mawile', 'mrmime', 'sylveon'],
                    look: { skin: C.haut, hair: C.dunkel, hairdo: 'lang', shirt: '#e88ab0', pants: '#8a4a7a', skirt: true } },
    'Olympia':    { team: ['sigilyph', 'slowking', 'meowstic'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'lang', shirt: '#7a5ac0', pants: '#4a3a7a', cape: '#a88ad8' } },
    'Wulfric':    { team: ['abomasnow', 'cryogonal', 'avalugg'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'strubbel', shirt: '#8ab8d8', pants: '#4a5a6a' } },

    /* ---------- Alola ----------------------------------------------------- */
    'Ilima':      { team: ['yungoos', 'smeargle', 'gumshoos'],
                    look: { skin: C.haut, hair: '#e8b8c8', hairdo: 'kurz', shirt: '#f0f0f8', pants: C.dunkel } },
    'Lana':       { team: ['dewpider', 'wishiwashi', 'araquanid'],
                    look: { skin: C.hautM, hair: '#3a8ac8', hairdo: 'lang', shirt: '#f0f0f8', pants: '#3a6a9a', skirt: true } },
    'Kiawe':      { team: ['salandit', 'marowakalola', 'salazzle'],
                    look: { skin: C.hautX, hair: C.dunkel, hairdo: 'kurz', shirt: '#d8482a', pants: '#8a3a2a' } },
    'Mallow':     { team: ['fomantis', 'trumbeak', 'lurantis'],
                    look: { skin: C.hautM, hair: '#5a9a4a', hairdo: 'zopf', shirt: '#f0e8d0', pants: '#7a5a3a', skirt: true } },
    'Sophocles':  { team: ['charjabug', 'skarmory', 'togedemaru'],
                    look: { skin: C.hautM, hair: '#c8a83c', hairdo: 'kurz', shirt: '#e8d84a', pants: '#4a4a5a' } },
    'Acerola':    { team: ['sableye', 'drifblim', 'mimikyu'],
                    look: { skin: C.hautD, hair: C.lila, hairdo: 'kurz', shirt: '#f0e0e8', pants: '#8a5a9a', skirt: true } },
    'Mina':       { team: ['granbull', 'ribombee', 'shiinotic'],
                    look: { skin: C.haut, hair: '#d86a9a', hairdo: 'lang', shirt: '#f0d8e8', pants: '#6a4a8a', skirt: true } },
    'Nanu':       { team: ['sableye', 'krokorok', 'persianalola'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'kurz', shirt: '#4a4a52', pants: '#2a2a32' } },

    /* ---------- Galar ----------------------------------------------------- */
    'Milo':       { team: ['gossifleur', 'eldegoss'],
                    look: { skin: C.hautM, hair: '#e8c860', hairdo: 'strubbel', shirt: '#f0e8d0', pants: '#6a8a4a' } },
    'Nessa':      { team: ['goldeen', 'arrokuda', 'drednaw'],
                    look: { skin: C.hautX, hair: C.dunkel, hairdo: 'lang', shirt: '#3a9ac8', pants: '#2a5a7a' } },
    'Kabu':       { team: ['ninetales', 'arcanine', 'centiskorch'],
                    look: { skin: C.hautM, hair: C.dunkel, hairdo: 'kurz', shirt: '#d8482a', pants: '#3a3a4a' } },
    'Bea':        { team: ['hitmontop', 'pangoro', 'sirfetchd', 'machamp'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'lang', shirt: '#f0f0f8', pants: '#3a3a4a' } },
    'Allister':   { team: ['yamask', 'mimikyu', 'cursola', 'gengar'],
                    look: { skin: C.haut, hair: C.lila, hairdo: 'strubbel', shirt: '#5a4a7a', pants: '#3a2a4a', cape: '#7a6a9a' } },
    'Opal':       { team: ['weezinggalar', 'mawile', 'togekiss', 'alcremie'],
                    look: { skin: C.haut, hair: C.pink, hairdo: 'lang', shirt: '#e8a8c8', pants: '#8a5a7a', cape: '#f0c8d8', skirt: true } },
    'Melony':     { team: ['frosmoth', 'darmanitangalar', 'lapras'],
                    look: { skin: C.haut, hair: C.silber, hairdo: 'lang', shirt: '#c8e0f0', pants: '#4a7a9a', skirt: true } },
    'Raihan':     { team: ['gigalith', 'flygon', 'sandaconda', 'duraludon'],
                    look: { skin: C.hautX, hair: C.dunkel, hairdo: 'kurz', shirt: '#e8722a', pants: '#3a3a48' } },

    /* ---------- Paldea ---------------------------------------------------- */
    'Katy':       { team: ['nymble', 'tarountula', 'teddiursa'],
                    look: { skin: C.haut, hair: '#e8a8c0', hairdo: 'zopf', shirt: '#f0e8e0', pants: '#c87a9a', skirt: true } },
    'Brassius':   { team: ['petilil', 'smoliv', 'sudowoodo'],
                    look: { skin: C.hautM, hair: '#5a9a4a', hairdo: 'lang', shirt: '#4a7a4a', pants: '#3a5a3a' } },
    'Iono':       { team: ['wattrel', 'bellibolt', 'luxio', 'mismagius'],
                    look: { skin: C.haut, hair: '#4ac8d8', hairdo: 'lang', shirt: '#f0d84a', pants: '#e070a8', skirt: true } },
    'Kofu':       { team: ['veluza', 'wugtrio', 'crabominable'],
                    look: { skin: C.hautM, hair: C.silber, hairdo: 'kurz', shirt: '#f0f0f8', pants: '#3a7a9a' } },
    'Larry':      { team: ['komala', 'dudunsparce', 'staraptor'],
                    look: { skin: C.haut, hair: C.braun, hairdo: 'kurz', shirt: '#e8e8f0', pants: '#4a4a5a' } },
    'Ryme':       { team: ['mimikyu', 'banette', 'houndstone', 'toxtricity'],
                    look: { skin: C.hautX, hair: C.lila, hairdo: 'lang', shirt: '#6a4a8a', pants: '#3a2a4a', cape: '#a86ad0' } },
    'Tulip':      { team: ['farigiraf', 'gardevoir', 'espathra', 'florges'],
                    look: { skin: C.haut, hair: C.pink, hairdo: 'lang', shirt: '#f0d8e8', pants: '#c85a9a', skirt: true } },
    'Grusha':     { team: ['frosmoth', 'beartic', 'cetitan', 'altaria'],
                    look: { skin: C.haut, hair: '#8ac8e0', hairdo: 'lang', shirt: '#e8f0f8', pants: '#3a5a8a' } }
  };

  /* ========================================================== Top Vier ==
   * Dieselbe Machart: die Aufstellung aus dem Hauptspiel, das Ass zuletzt.
   * Galar hat keine Top Vier — dort treten die Halbfinalgegner des
   * Pokal-Turniers an, damit die Region in der Liga nicht fehlt.
   * ==================================================================== */

  var ELITE = {

    /* --- Kanto --- */
    'Lorelei':  { team: ['dewgong', 'cloyster', 'slowbro', 'jynx', 'lapras'],
                  look: { skin: C.haut, hair: '#8a5a3a', hairdo: 'lang', shirt: '#5a8ad8', pants: '#3a5a9a', skirt: true } },
    'Bruno':    { team: ['onix', 'hitmonchan', 'hitmonlee', 'onix', 'machamp'],
                  look: { skin: C.hautX, hair: C.dunkel, hairdo: 'kurz', shirt: '#c08050', pants: '#8a5a2a' } },
    'Agatha':   { team: ['gengar', 'golbat', 'haunter', 'arbok', 'gengar'],
                  look: { skin: C.haut, hair: C.silber, hairdo: 'lang', shirt: '#7a5a9a', pants: '#4a3a6a', cape: '#5a4278', skirt: true } },
    'Lance':    { team: ['gyarados', 'dragonair', 'dragonair', 'aerodactyl', 'dragonite'],
                  look: { skin: C.haut, hair: '#d8442a', hairdo: 'strubbel', shirt: C.dunkel, pants: '#2a2a38', cape: '#e8a02a' } },

    /* --- Johto --- */
    'Will':     { team: ['xatu', 'jynx', 'exeggutor', 'slowbro', 'xatu'],
                  look: { skin: C.haut, hair: '#4a9a5a', hairdo: 'kurz', shirt: C.weiss, pants: '#c8c8d8' } },
    'Karen':    { team: ['umbreon', 'murkrow', 'vileplume', 'gengar', 'houndoom'],
                  look: { skin: C.haut, hair: C.silber, hairdo: 'lang', shirt: '#c8384a', pants: '#8a2434', skirt: true } },

    /* --- Hoenn --- */
    'Sidney':   { team: ['mightyena', 'shiftry', 'cacturne', 'crawdaunt', 'absol'],
                  look: { skin: C.hautM, hair: '#c83a2a', hairdo: 'strubbel', shirt: '#3a3a44', pants: '#2a2a32' } },
    'Phoebe':   { team: ['dusclops', 'banette', 'sableye', 'banette', 'dusclops'],
                  look: { skin: C.hautD, hair: C.dunkel, hairdo: 'lang', shirt: '#e8b83c', pants: '#c86a3a', skirt: true } },
    'Glacia':   { team: ['sealeo', 'glalie', 'sealeo', 'glalie', 'walrein'],
                  look: { skin: C.haut, hair: C.silber, hairdo: 'lang', shirt: '#9a8ad0', pants: '#5a4a8a', skirt: true } },
    'Drake':    { team: ['shelgon', 'altaria', 'kingdra', 'flygon', 'salamence'],
                  look: { skin: C.hautM, hair: C.silber, hairdo: 'kurz', shirt: '#2a3a6a', pants: '#1e2a4a', cape: '#4a5a8a' } },

    /* --- Sinnoh --- */
    'Aaron':    { team: ['dustox', 'beautifly', 'vespiquen', 'heracross', 'drapion'],
                  look: { skin: C.haut, hair: '#3a8a5a', hairdo: 'lang', shirt: '#e8e8f0', pants: '#4a8a5a' } },
    'Bertha':   { team: ['quagsire', 'sudowoodo', 'golem', 'whiscash', 'hippowdon'],
                  look: { skin: C.hautM, hair: C.silber, hairdo: 'kurz', shirt: '#8a7a4a', pants: '#5a4a3a', skirt: true } },
    'Flint':    { team: ['rapidash', 'steelix', 'drifblim', 'lopunny', 'infernape'],
                  look: { skin: C.hautM, hair: '#e8542a', hairdo: 'strubbel', shirt: '#3a3a44', pants: '#2a2a34' } },
    'Lucian':   { team: ['mrmime', 'girafarig', 'medicham', 'alakazam', 'bronzong'],
                  look: { skin: C.haut, hair: C.lila, hairdo: 'kurz', shirt: C.weiss, pants: '#6a5a9a' } },

    /* --- Einall --- */
    'Shauntal': { team: ['cofagrigus', 'drifblim', 'golurk', 'chandelure'],
                  look: { skin: C.haut, hair: '#5a3a6a', hairdo: 'lang', shirt: '#8a6a4a', pants: '#5a4a3a', skirt: true } },
    'Grimsley': { team: ['scrafty', 'krookodile', 'liepard', 'bisharp'],
                  look: { skin: C.haut, hair: C.dunkel, hairdo: 'lang', shirt: C.weiss, pants: C.dunkel, cape: '#2a2a34' } },
    'Caitlin':  { team: ['musharna', 'sigilyph', 'reuniclus', 'gothitelle'],
                  look: { skin: C.haut, hair: C.blond, hairdo: 'lang', shirt: '#f0d8e8', pants: '#c87a9a', skirt: true } },
    'Marshal':  { team: ['throh', 'sawk', 'conkeldurr', 'mienshao'],
                  look: { skin: C.hautD, hair: C.dunkel, hairdo: 'kurz', shirt: '#3a6ac8', pants: '#e8e8f0' } },

    /* --- Kalos --- */
    'Malva':    { team: ['pyroar', 'torkoal', 'chandelure', 'talonflame'],
                  look: { skin: C.haut, hair: '#d83a3a', hairdo: 'lang', shirt: '#c8384a', pants: C.dunkel, skirt: true } },
    'Siebold':  { team: ['clawitzer', 'gyarados', 'starmie', 'barbaracle'],
                  look: { skin: C.haut, hair: C.blond, hairdo: 'kurz', shirt: C.weiss, pants: '#3a6a9a' } },
    'Wikstrom': { team: ['klefki', 'probopass', 'scizor', 'aegislash'],
                  look: { skin: C.haut, hair: C.blond, hairdo: 'kurz', shirt: C.silber, pants: '#7a7a8a', cape: '#c8b84a' } },
    'Drasna':   { team: ['dragalge', 'druddigon', 'altaria', 'noivern'],
                  look: { skin: C.haut, hair: '#c89ad8', hairdo: 'lang', shirt: '#5a9a6a', pants: '#3a6a4a', skirt: true } },

    /* --- Alola --- */
    'Hala':     { team: ['hariyama', 'primeape', 'bewear', 'crabominable'],
                  look: { skin: C.hautX, hair: C.silber, hairdo: 'strubbel', shirt: '#e8a83c', pants: '#8a5a2a' } },
    'Olivia':   { team: ['armaldo', 'cradily', 'relicanth', 'lycanroc'],
                  look: { skin: C.hautD, hair: '#4a2a20', hairdo: 'lang', shirt: '#f0d8e0', pants: '#c87a8a', skirt: true } },
    'Kahili':   { team: ['braviary', 'hawlucha', 'oricorio', 'toucannon'],
                  look: { skin: C.haut, hair: '#6a8ab0', hairdo: 'lang', shirt: C.weiss, pants: '#3a5a8a', hat: '#e8e8f0' } },

    /* --- Galar: die Halbfinalgegner des Pokal-Turniers --- */
    'Marnie':   { team: ['liepard', 'toxicroak', 'scrafty', 'morpeko'],
                  look: { skin: C.haut, hair: C.schwarz, hairdo: 'zopf', shirt: '#2a2a34', pants: '#c8386a', skirt: true } },
    'Bede':     { team: ['mawile', 'gothorita', 'rapidashgalar', 'hatterene'],
                  look: { skin: C.haut, hair: '#e8d8e8', hairdo: 'kurz', shirt: '#e8e8f0', pants: '#7a5ab0' } },
    'Piers':    { team: ['scrafty', 'malamar', 'skuntank', 'obstagoon'],
                  look: { skin: C.haut, hair: C.silber, hairdo: 'lang', shirt: '#2a2a34', pants: '#1e1e26', cape: '#4a4a56' } },

    /* --- Paldea --- */
    'Rika':     { team: ['whiscash', 'camerupt', 'donphan', 'dugtrio', 'clodsire'],
                  look: { skin: C.hautD, hair: C.dunkel, hairdo: 'kurz', shirt: '#c86a3a', pants: '#5a4a3a' } },
    'Poppy':    { team: ['copperajah', 'bronzong', 'corviknight', 'magnezone', 'tinkaton'],
                  look: { skin: C.haut, hair: C.pink, hairdo: 'zopf', shirt: C.silber, pants: '#8a8a9a', skirt: true } },
    'Hassel':   { team: ['noivern', 'haxorus', 'flapple', 'dragalge', 'baxcalibur'],
                  look: { skin: C.hautX, hair: '#3ab0a0', hairdo: 'lang', shirt: '#3a8a7a', pants: '#2a5a4a' } }
  };

  /* ========================================================== Champions ==
   * Ihre Aufstellungen stehen bereits in world.js — hier fehlt nur, wie sie
   * aussehen.
   * ==================================================================== */

  var CHAMPIONS = {
    'Blue':     { look: { skin: C.haut, hair: '#8a5a2a', hairdo: 'strubbel', shirt: '#6a4a9a', pants: C.dunkel } },
    'Lance':    { look: { skin: C.haut, hair: '#d8442a', hairdo: 'strubbel', shirt: C.dunkel, pants: '#2a2a38', cape: '#e8a02a' } },
    'Steven':   { look: { skin: C.haut, hair: C.silber, hairdo: 'kurz', shirt: '#2a2a34', pants: '#1e1e28', cape: '#7a5ab0' } },
    'Cynthia':  { look: { skin: C.haut, hair: C.blond, hairdo: 'lang', shirt: '#2a2a34', pants: '#1e1e28', cape: '#3a3a48' } },
    'Alder':    { look: { skin: C.hautD, hair: '#d8642a', hairdo: 'lang', shirt: '#c84a2a', pants: '#8a3a1a', cape: '#e8843a' } },
    'Diantha':  { look: { skin: C.haut, hair: '#7a5a3a', hairdo: 'kurz', shirt: C.weiss, pants: '#2a2a34', skirt: true } },
    'Kukui':    { look: { skin: C.hautX, hair: C.dunkel, hairdo: 'strubbel', shirt: '#c08050', pants: '#3a3a48', cape: '#f0f0f8' } },
    'Leon':     { look: { skin: C.hautX, hair: C.lila, hairdo: 'lang', shirt: '#e8e8f0', pants: '#c8384a', cape: '#3a3a6a', hat: '#c8384a' } },
    'Geeta':    { look: { skin: C.haut, hair: '#9a7ac8', hairdo: 'lang', shirt: '#f0e8d8', pants: '#c8a83c', cape: '#e8d84a', skirt: true } }
  };

  /** Sucht eine Person in allen drei Tabellen. */
  function find(name) {
    return LEADERS[name] || ELITE[name] || CHAMPIONS[name] || null;
  }

  PL.leaders = {
    all: LEADERS,
    elite: ELITE,
    champions: CHAMPIONS,
    get: find,
    team: function (name) { var l = find(name); return l && l.team ? l.team.slice() : null; },
    look: function (name) { var l = find(name); return l ? l.look : null; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.leaders;
})(typeof globalThis !== 'undefined' ? globalThis : this);
