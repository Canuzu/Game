/* =============================================================================
 * symbole.mjs — die gezeichneten Zeichen des Spiels
 * -----------------------------------------------------------------------------
 * Emoji sind runde, weiche Systemgrafiken. In einer Welt aus Rasterpunkten
 * sitzen sie wie Aufkleber auf dem Bild: andere Kanten, andere Farben, andere
 * Auflösung. Also werden sie gezeichnet — im selben Maß wie der Pokéball, in
 * Farbe, nicht als graue Umrisse.
 *
 * Jedes Zeichen ist ein Raster aus 16 × 16 Punkten. Jeder Buchstabe steht für
 * eine Farbe der gemeinsamen Tafel, der Punkt für nichts.
 *
 * Gelesen von tools/build-symbole.mjs, das daraus css/symbole.css macht.
 * ========================================================================== */

/* Die Tafel. Zu jeder Farbe gehört ein dunkler Ton für die Kante — so hat
   jedes Zeichen dieselbe Art von Rand wie jedes andere. */
export const TAFEL = {
  '.': null,
  K: '#1b2028',   // Kontur
  k: '#39414d',   // halbe Kontur
  W: '#f6f8f4',   // Weiß
  w: '#c9d2d8',   // Weiß im Schatten
  R: '#e0423a',   // Rot
  r: '#9e2820',   // Rot dunkel
  G: '#e8b93c',   // Gold
  g: '#a8781c',   // Gold dunkel
  B: '#4a8fd8',   // Blau
  b: '#28588f',   // Blau dunkel
  N: '#57b45a',   // Grün
  n: '#2f7a36',   // Grün dunkel
  P: '#a370d8',   // Violett
  p: '#6b3fa0',   // Violett dunkel
  S: '#bdb8a6',   // Stein
  s: '#7a7466',   // Stein dunkel
  H: '#e8b98a',   // Haut
  h: '#b07d4c',   // Haut dunkel
  X: '#9aa3ad',   // Grau
  x: '#59626d',   // Grau dunkel
  O: '#e8863c',   // Orange
  o: '#a85418',   // Orange dunkel
  C: '#6fd8d0',   // Cyan
  c: '#2f8c94'    // Cyan dunkel
};

/* Reihenfolge ist gleich Rangfolge: Was oft gebraucht wird, steht oben. */
export const SYMBOLE = {

  /* --- Der Ball, in klein --- */
  ball: [
    '.....KKKKKK.....',
    '...KKRRRRRRKK...',
    '..KRRRRRRRRRRK..',
    '.KRRRRRRRRRRRRK.',
    '.KRRRRRRRRRRRRK.',
    'KRRRRRRRRRRRRRRK',
    'KRRRRRKKKKRRRRRK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKWWWWWWKK...',
    '.....KKKKKK.....'
  ],

  /* --- Wechseln: einer geht, einer kommt --- */
  wechseln: [
    '................',
    '................',
    '..........KK....',
    '.........KBBK...',
    'KKKKKKKKKKBBBK..',
    'KBBBBBBBBBBBBBK.',
    'KBBBBBBBBBBBBK..',
    'KKKKKKKKKKBBK...',
    '..........KK....',
    '....KK..........',
    '...KNNK.........',
    '..KNNNKKKKKKKKKK',
    '.KNNNNNNNNNNNNNK',
    '..KNNNNNNNNNNNNK',
    '...KNNKKKKKKKKKK',
    '....KK..........'
  ],

  /* --- Beutel: Rucksack mit Schnalle --- */
  beutel: [
    '.....KKKK.......',
    '....KhhhhK......',
    '...KhKKKKhK.....',
    '..KKKKKKKKKK....',
    '.KRRRRRRRRRRK...',
    'KRRRRRRRRRRRRK..',
    'KRRRKKKKKKRRRK..',
    'KRRKGGGGGGKRRK..',
    'KRRKGgggggKRRK..',
    'KRRKKKKKKKKRRK..',
    'KRRRRRRRRRRRRK..',
    'KrrrrrrrrrrrrK..',
    'KrrrrrrrrrrrrK..',
    '.KrrrrrrrrrrK...',
    '..KKKKKKKKKK....',
    '................'
  ],

  /* --- Fliehen: einer, der läuft --- */
  fliehen: [
    '.........KKK....',
    '........KHHHK...',
    '........KHHHK...',
    '.KK......KKKK...',
    '..KK...KKBBBK...',
    '...KKKKBBBBBKK..',
    '.KK...KBBBBBBBK.',
    '..KK..KBBBBBKK..',
    '...KK.KBBBBK....',
    '.....KbbKbbbK...',
    '....KbbK..KbbK..',
    '...KbbK....KbbK.',
    '..KbbK......KbK.',
    '..KKK.......KKK.',
    '.KWWK.......KWK.',
    '.KKKK.......KKK.'
  ],

  /* --- Blitz: der Automat, die Eile --- */
  blitz: [
    '.......KKK......',
    '......KGGK......',
    '.....KGGGK......',
    '....KGGGGK......',
    '...KGGGGK.......',
    '..KGGGGK........',
    '..KGGGKKKKKK....',
    '.KGGGGGGGGGK....',
    '.KGGKKKKGGGK....',
    '.KKK...KGGGK....',
    '......KGGGK.....',
    '.....KGGGK......',
    '....KGGGK.......',
    '....KGGK........',
    '....KGK.........',
    '....KK..........'
  ],

  /* --- Stoß: körperliche Attacken. Ein Aufschlag, keine Faust — bei
         sechzehn Punkten liest sich ein Stern als Schlag, eine Hand als
         Brötchen. --- */
  faust: [
    '.......KK.......',
    '......KOOK......',
    '..K...KOOK...K..',
    '..KK..KOOK..KK..',
    '...KK.KOOK.KK...',
    '....KKKOOKKK....',
    '.....KOOOOK.....',
    'KKKKKOOOOOOKKKKK',
    'KOOOOOOOOOOOOOOK',
    'KKKKKOOOOOOKKKKK',
    '.....KOOOOK.....',
    '....KKKOOKKK....',
    '...KK.KOOK.KK...',
    '..KK..KOOK..KK..',
    '..K...KOOK...K..',
    '......KKKK......'
  ],

  /* --- Wirbel: besondere Attacken --- */
  welle: [
    '................',
    '....KKKKKKKK....',
    '..KKBBBBBBBBKK..',
    '.KBBBKKKKKKBBBK.',
    '.KBBKK......KKK.',
    'KBBK....KKK.....',
    'KBBK..KKBBBKK...',
    'KBBK.KBBBBBBBK..',
    'KBBK.KBBKKKBBK..',
    'KBBKK.KK...KBBK.',
    '.KBBKK......KK..',
    '.KBBBKKKKKKKK...',
    '..KKBBBBBBBBK...',
    '....KKKKKKKK....',
    '................',
    '................'
  ],

  /* --- Spirale: Statusattacken --- */
  spirale: [
    '................',
    '.....KKKKKK.....',
    '...KKPPPPPPKK...',
    '..KPPPPPPPPPPK..',
    '.KPPPKKKKKKPPPK.',
    '.KPPKppppppKPPK.',
    'KPPKppKKKKppKPPK',
    'KPPKpKKWWKKpKPPK',
    'KPPKpKKWWKKpKPPK',
    'KPPKppKKKKppKPPK',
    '.KPPKppppppKPPK.',
    '.KPPPKKKKKKPPPK.',
    '..KPPPPPPPPPPK..',
    '...KKPPPPPPKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* --- Team: zwei Gestalten nebeneinander --- */
  team: [
    '................',
    '...KKK....KKK...',
    '..KBBBK..KNNNK..',
    '..KBBBK..KNNNK..',
    '...KKK....KKK...',
    '................',
    '..KKKKK..KKKKK..',
    '.KBBBBBKKNNNNNK.',
    'KBBBBBBBBNNNNNNK',
    'KBBBBBBBBNNNNNNK',
    'KBBBBBBBBNNNNNNK',
    'KbbbbbbbbnnnnnnK',
    'KbbKbbbKKnnnKnnK',
    'KbbKbbbKKnnnKnnK',
    'KKKKKKKKKKKKKKKK',
    '................'
  ],

  /* --- Säule: die Relikte --- */
  saeule: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '.KSSSSSSSSSSSSK.',
    '.KsssssssssssK..',
    '..KKKKKKKKKKK...',
    '..KSSKKSSKKSSK..',
    '..KSSKKSSKKSSK..',
    '..KSSKKSSKKSSK..',
    '..KSSKKSSKKSSK..',
    '..KSSKKSSKKSSK..',
    '..KssKKssKKssK..',
    '.KKKKKKKKKKKKK..',
    'KSSSSSSSSSSSSSSK',
    'KssssssssssssssK',
    '.KKKKKKKKKKKKKK.'
  ],

  /* --- Menü: drei Balken --- */
  menue: [
    '................',
    '................',
    '.KKKKKKKKKKKKKK.',
    'KxxxxxxxxxxxxxxK',
    'KXXXXXXXXXXXXXXK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '.KKKKKKKKKKKKKK.',
    'KxxxxxxxxxxxxxxK',
    'KXXXXXXXXXXXXXXK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '.KKKKKKKKKKKKKK.',
    'KxxxxxxxxxxxxxxK',
    'KXXXXXXXXXXXXXXK',
    '.KKKKKKKKKKKKKK.'
  ],

  /* --- Münze: das Geld --- */
  muenze: [
    '.....KKKKKK.....',
    '...KKGGGGGGKK...',
    '..KGGGGGGGGGGK..',
    '.KGGGKKKKKKGGGK.',
    '.KGGKGGGGGGKGGK.',
    'KGGKGGKKKKGGKGGK',
    'KGGKGKKggKKGKGGK',
    'KGGKGKgggggKGGGK',
    'KGGKGKKgggKKGGGK',
    'KGGKGGKKgKKGKGGK',
    'KGGKGggggggKGGGK',
    '.KGGKgggggKGGGK.',
    '.KGGGKKKKKKGGGK.',
    '..KGGGGGGGGGGK..',
    '...KKGGGGGGKK...',
    '.....KKKKKK.....'
  ],

  /* --- Automat: der Kopf einer Maschine --- */
  roboter: [
    '.......KK.......',
    '.......KK.......',
    '.....KKKKKK.....',
    '..KKKKKKKKKKKK..',
    '.KXXXXXXXXXXXXK.',
    'KXXXXXXXXXXXXXXK',
    'KXXKKKKXXKKKKXXK',
    'KXXKCCKXXKCCKXXK',
    'KXXKCCKXXKCCKXXK',
    'KXXKKKKXXKKKKXXK',
    'KXXXXXXXXXXXXXXK',
    'KXXKKKKKKKKKKXXK',
    'KxxKXXXXXXXXKxxK',
    'KxxKKKKKKKKKKxxK',
    '.KxxxxxxxxxxxxK.',
    '..KKKKKKKKKKKK..'
  ],

  /* --- Krone: die Region --- */
  krone: [
    '................',
    '................',
    'KK...........KK.',
    'KGK....KK...KGK.',
    'KGK...KGGK..KGK.',
    'KGGK..KGGK.KGGK.',
    'KGGK.KGGGGKKGGK.',
    'KGGKKGGGGGGKGGK.',
    'KGGGGGGGGGGGGGK.',
    'KGGGGGGGGGGGGGK.',
    'KGGGGGGGGGGGGGK.',
    'KgggRggggRgggGK.',
    'KgggggggggggggK.',
    'KKKKKKKKKKKKKKK.',
    '................',
    '................'
  ],

  /* --- Pfeil nach oben: die Levelgrenze --- */
  pfeilhoch: [
    '.......KK.......',
    '......KNNK......',
    '.....KNNNNK.....',
    '....KNNNNNNK....',
    '...KNNNNNNNNK...',
    '..KNNNNNNNNNNK..',
    '.KNNNKKNNKKNNNK.',
    'KNNNKK.NN.KKNNNK',
    'KKKK..KNNK..KKKK',
    '......KNNK......',
    '......KNNK......',
    '......KnnK......',
    '......KnnK......',
    '......KnnK......',
    '......KKKK......',
    '................'
  ],

  /* --- Fläschchen: Heilung --- */
  traenkchen: [
    '................',
    '.....KKKKK......',
    '.....KWWWK......',
    '.....KWWWK......',
    '....KKWWWKK.....',
    '....KWWWWWK.....',
    '...KWWWWWWWK....',
    '...KWRRRRRWK....',
    '..KWRRRRRRRWK...',
    '..KWRRRRRRRWK...',
    '..KWRRRRRRRWK...',
    '..KWrrrrrrrWK...',
    '..KWrrrrrrrWK...',
    '...KWrrrrrWK....',
    '....KKKKKKK.....',
    '................'
  ],

  /* --- Stern: Erfolge und Marken --- */
  stern: [
    '.......KK.......',
    '.......KK.......',
    '......KGGK......',
    '......KGGK......',
    'KKKKKKKGGKKKKKKK',
    'KGGGGGGGGGGGGGGK',
    '.KGGGGGGGGGGGGK.',
    '..KGGGGGGGGGGK..',
    '...KGGGGGGGGK...',
    '...KGGGKKGGGK...',
    '..KGGGK..KGGGK..',
    '..KGGK....KGGK..',
    '.KGGK......KGGK.',
    '.KGK........KGK.',
    '.KK..........KK.',
    '................'
  ],

  /* --- Gras: ein wildes Pokémon raschelt --- */
  gras: [
    '................',
    '................',
    '.......K........',
    '......KNK.....K.',
    '..K...KNK....KNK',
    '.KNK..KNK...KNnK',
    '.KNK.KNNnK..KNnK',
    'KNNK.KNNnK.KNnK.',
    'KNNnKKNNnKKNnK..',
    '.KNNnKNNnKNnK...',
    '..KNNNNNnNnK....',
    '...KNNNNnnK.....',
    '....KNNNnK......',
    '.....KnnK.......',
    '......KK........',
    '................'
  ],

  /* --- Trikot: ein Trainer will kämpfen --- */
  trikot: [
    '................',
    '..KK........KK..',
    '.KBBK......KBBK.',
    'KBbBBKKKKKKBBbBK',
    'KBbBBBBBBBBBBbBK',
    'KBbBBBBBBBBBBbBK',
    '.KKBBBBBBBBBBKK.',
    '...KBBWWWWBBK...',
    '...KBBWWWWBBK...',
    '...KBBBWWBBBK...',
    '...KBBBWWBBBK...',
    '...KBBBBBBBBK...',
    '...KBbBBBBbBK...',
    '...KBbBBBBbBK...',
    '...KKKKKKKKKK...',
    '................'
  ],

  /* --- Kappe: der Rivale --- */
  kappe: [
    '................',
    '................',
    '.....KKKKK......',
    '...KKRRRRRKK....',
    '..KRRRRRRRRRK...',
    '.KRRRRRRRRRRRK..',
    '.KRrRRRRRRRRRK..',
    'KRrRRRRRRRRRRRK.',
    'KRrRRRRRRRRRRRK.',
    'KKKKKKKKKKKKKKKK',
    '..KWWWWWWWWWWWWK',
    '..KWWWWWWWWWWWWK',
    '...KKKKKKKKKKKK.',
    '................',
    '................',
    '................'
  ],

  /* --- Gekreuzte Klingen: ein Ass-Trainer --- */
  schwerter: [
    '................',
    'KXK..........KXK',
    'KXXK........KXXK',
    '.KXXK......KXXK.',
    '..KXXK....KXXK..',
    '...KXXK..KXXK...',
    '....KXXKKXXK....',
    '.....KXXXXK.....',
    '.....KXXXXK.....',
    '....KXXKKXXK....',
    '...KGGK..KGGK...',
    '..KGgK....KGgK..',
    '.KGgK......KGgK.',
    'KGgK........KGgK',
    'KGK..........KGK',
    '................'
  ],

  /* --- Pfote: eine Begegnung --- */
  pfote: [
    '................',
    '....KK....KK....',
    '...KHHK..KHHK...',
    '...KHhK..KHhK...',
    '....KK....KK....',
    '.KK..........KK.',
    'KHHK........KHHK',
    'KHhK........KHhK',
    '.KK....KKK...KK.',
    '....KKHHHHHKK...',
    '...KHHHHHHHHHK..',
    '..KHHHHHHHHHHHK.',
    '..KHHHHHHHHHHHK.',
    '...KHhHHHHHhHK..',
    '....KKHHHHHKK...',
    '......KKKKK.....'
  ],

  /* --- Geschenk: ein Fundstück --- */
  geschenk: [
    '................',
    '.....KK..KK.....',
    '....KGGKKGGK....',
    '....KGGKKGGK....',
    '..KKKKKGGKKKKK..',
    '.KRRRRKGGKRRRRK.',
    '.KRRRRKGGKRRRRK.',
    'KKKKKKKGGKKKKKKK',
    'KRRRRRKGGKRRRRRK',
    'KRRRRRKGGKRRRRRK',
    'KRRRRRKGGKRRRRRK',
    'KRRRRRKGGKRRRRRK',
    'KRrrrrKGGKrrrrRK',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................'
  ],

  /* --- Korb: der Händler --- */
  korb: [
    '................',
    '................',
    '....KKKKKK......',
    '...K......K.....',
    '..K........K....',
    'KKKKKKKKKKKKKKKK',
    'KOOOOOOOOOOOOOOK',
    'KOoOOoOOoOOoOOoK',
    'KOOOOOOOOOOOOOOK',
    'KOoOOoOOoOOoOOoK',
    'KOOOOOOOOOOOOOOK',
    '.KOoOOoOOoOOoOK.',
    '.KOOOOOOOOOOOK..',
    '..KKKKKKKKKKK...',
    '................',
    '................'
  ],

  /* --- Lagerfeuer: der Rastplatz --- */
  lagerfeuer: [
    '................',
    '.......K........',
    '......KOK.......',
    '.....KOGOK......',
    '.....KOGOK......',
    '....KOGGGOK.....',
    '....KOGGGOK.....',
    '...KROGGGORK....',
    '...KRROGORRK....',
    '..KRRROOORRRK...',
    '..KRRRRRRRRRK...',
    '...KRRRRRRRK....',
    '....KKKKKKK.....',
    '..KhhKKKKKhhK...',
    '.KhHhhhhhhhHhK..',
    '..KKKKKKKKKKK...'
  ],

  /* --- Funken: eine legendäre Spur --- */
  funken: [
    '................',
    '.......KK.......',
    '.......GG.......',
    '......KGGK......',
    '......KGGK......',
    '...K..KGGK..K...',
    '....KKKGGKKK....',
    '..KGGGGGGGGGGK..',
    '..KGGGGGGGGGGK..',
    '....KKKGGKKK....',
    '...K..KGGK..K...',
    '......KGGK......',
    '......KGGK......',
    '.......GG.......',
    '.......KK.......',
    '................'
  ],

  /* --- Fragezeichen: ein Ereignis --- */
  frage: [
    '......KKKK......',
    '....KKPPPPKK....',
    '...KPPPPPPPPK...',
    '...KPPKKKKPPK...',
    '...KPPK..KPPK...',
    '...KKK...KPPK...',
    '........KPPPK...',
    '.......KPPPK....',
    '......KPPPK.....',
    '......KPPK......',
    '......KPPK......',
    '......KKK.......',
    '................',
    '......KKK.......',
    '......KPPK......',
    '......KKK.......'
  ],

  /* --- Orden: der Arenaleiter --- */
  orden: [
    '.......KK.......',
    '......KGGK......',
    '.....KGGGGK.....',
    'KKKKKGGGGGGKKKKK',
    'KGGGGGGGGGGGGGGK',
    '.KGGGGGRRGGGGGK.',
    '..KGGGRRRRGGGK..',
    'KKGGGGRRRRGGGGKK',
    'KGGGGGRRRRGGGGGK',
    '..KGGGRRRRGGGK..',
    '.KGGGGGRRGGGGGK.',
    'KGGGGGGGGGGGGGGK',
    'KKKKKGGGGGGKKKKK',
    '.....KGGGGK.....',
    '......KGGK......',
    '.......KK.......'
  ],

  /* --- Pokal: das letzte Duell --- */
  pokal: [
    '................',
    '..KKKKKKKKKKKK..',
    '..KGGGGGGGGGGK..',
    '.KKGGGGGGGGGGKK.',
    'KGKGGGGGGGGGGKGK',
    'KGKGGGGGGGGGGKGK',
    'KGKKGGGGGGGGKKGK',
    '.KK.KGGGGGGK.KK.',
    '.....KGGGGK.....',
    '......KGGK......',
    '......KGGK......',
    '.....KKGGKK.....',
    '....KGGGGGGK....',
    '...KGGGGGGGGK...',
    '...KKKKKKKKKK...',
    '................'
  ],

  /* --- Pille: gegen Status --- */
  pille: [
    '................',
    '........KKKK....',
    '.......KRRRRK...',
    '......KRRRRRRK..',
    '.....KRRRRRRRK..',
    '....KRRRRRRRKK..',
    '...KRRRRRRKKW...',
    '...KRRRRKKWWK...',
    '...KRRKKWWWWK...',
    '..KKKWWWWWWK....',
    '..KWWWWWWWK.....',
    '..KWWWWWWK......',
    '...KWWWWK.......',
    '....KWWK........',
    '.....KK.........',
    '................'
  ],

  /* --- Kristall: die Megaentwicklung --- */
  kristall: [
    '................',
    '................',
    '...KKKKKKKKKK...',
    '..KCCCKCCKCCCK..',
    '.KCCCCKCCKCCCCK.',
    'KCCCCCKCCKCCCCCK',
    '.KCCCCKCCKCCCCK.',
    '..KCCCKCCKCCCK..',
    '..KCcCCCCCCcCK..',
    '...KCcCCCCcCK...',
    '....KCcCCcCK....',
    '.....KCcCcK.....',
    '......KCcK......',
    '.......KK.......',
    '................',
    '................'
  ],

  /* --- Stein: eine Entwicklung --- */
  stein: [
    '................',
    '................',
    '......KKKK......',
    '....KKPPPPKK....',
    '...KPPPPPPPPK...',
    '..KPPWWPPPPPPK..',
    '..KPPWPPPPPPPK..',
    '.KPPPPPPPPPPPPK.',
    '.KPPPPPPPPPPPPK.',
    '.KPpPPPPPPPPpPK.',
    '..KPpPPPPPPpPK..',
    '..KPppPPPPppPK..',
    '...KPppppppPK...',
    '....KKPPPPKK....',
    '......KKKK......',
    '................'
  ],

  /* --- Scheibe: eine TM --- */
  scheibe: [
    '................',
    '.....KKKKKK.....',
    '...KKBBBBBBKK...',
    '..KBBBBBBBBBBK..',
    '.KBBBBBBBBBBBBK.',
    '.KBBBBBWWBBBBBK.',
    'KBBBBBWWWWBBBBBK',
    'KBBBBWWKKWWBBBBK',
    'KBBBBWWKKWWBBBBK',
    'KBBBBBWWWWBBBBBK',
    '.KBBBBBWWBBBBBK.',
    '.KBbBBBBBBBBbBK.',
    '..KBbBBBBBBbBK..',
    '...KKBbBBbBKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* --- Beere: heilt und schützt --- */
  beere: [
    '................',
    '.........KK.....',
    '........KNK.....',
    '.....KKKNNK.....',
    '...KKNNNNK......',
    '..KNNNNKK.......',
    '...KKKKK........',
    '....KKKKKK......',
    '..KKRRRRRRKK....',
    '.KRRRRRRRRRRK...',
    'KRRRRRRRRRRRRK..',
    'KRRrRRRRRRRRRK..',
    'KRRrRRRRRRRRRK..',
    '.KRrrRRRRRRRK...',
    '..KKrrrrrrKK....',
    '....KKKKKK......'
  ],

  /* --- Kiste: alles Übrige --- */
  kiste: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '..KHHHHHHHHHHK..',
    '..KHhHHHHHHhHK..',
    'KKKKKKKKKKKKKKKK',
    'KHHHHHKGGKHHHHHK',
    'KHHHHHKGGKHHHHHK',
    'KHhHHHKGGKHHHhHK',
    'KHHHHHKGGKHHHHHK',
    'KHHHHHKGGKHHHHHK',
    'KHhHHHKGGKHHHhHK',
    'KHHHHHKGGKHHHHHK',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................'
  ],

  /* --- Herz: eine Atempause --- */
  herz: [
    '................',
    '................',
    '..KKK....KKK....',
    '.KRRRKKKKRRRK...',
    'KRRRRRRRRRRRRK..',
    'KRRRRRRRRRRRRRK.',
    'KRRRRRRRRRRRRRK.',
    'KRRRRRRRRRRRRRK.',
    '.KRRRRRRRRRRRK..',
    '..KRRRRRRRRRK...',
    '...KRRRRRRRK....',
    '....KRRRRRK.....',
    '.....KRRRK......',
    '......KRK.......',
    '.......K........',
    '................'
  ],

  /* --- Totenkopf: Nuzlocke --- */
  totenkopf: [
    '................',
    '.....KKKKKK.....',
    '...KKWWWWWWKK...',
    '..KWWWWWWWWWWK..',
    '.KWWWWWWWWWWWWK.',
    '.KWWKKKWWKKKWWK.',
    '.KWKKKKWWKKKKWK.',
    '.KWKKKKWWKKKKWK.',
    '.KWWKKKWWKKKWWK.',
    '.KWWWWWKKWWWWWK.',
    '..KWWWKKKKWWWK..',
    '..KWWWWWWWWWWK..',
    '...KWKWKWKWKWK..',
    '...KWKWKWKWKWK..',
    '....KKKKKKKKK...',
    '................'
  ],

  /* --- Lupe: ein Hinweis --- */
  lupe: [
    '................',
    '....KKKKKK......',
    '..KKCCCCCCKK....',
    '.KCCCCCCCCCCK...',
    '.KCCWWCCCCCCK...',
    'KCCWCCCCCCCCCK..',
    'KCCWCCCCCCCCCK..',
    'KCCCCCCCCCCCCK..',
    '.KCCCCCCCCCCK...',
    '.KCCCCCCCCCCK...',
    '..KKCCCCCCKKK...',
    '....KKKKKKXXK...',
    '.........KXXXK..',
    '..........KXXXK.',
    '...........KXXK.',
    '............KK..'
  ],

  /* --- Grabstein: der Friedhof --- */
  grab: [
    '................',
    '......KKKK......',
    '....KKSSSSKK....',
    '...KSSSSSSSSK...',
    '..KSSSSSSSSSSK..',
    '..KSSSKWWKSSSK..',
    '..KSSSKWWKSSSK..',
    '..KSSKWWWWKSSK..',
    '..KSSSKWWKSSSK..',
    '..KSSSKWWKSSSK..',
    '..KSSSSSSSSSSK..',
    '..KSsSSSSSSsSK..',
    '..KSsSSSSSSsSK..',
    '.KKKKKKKKKKKKKK.',
    'KNNNNNNNNNNNNNNK',
    '.KKKKKKKKKKKKKK.'
  ],

  /* --- Kompass: was der Gegner mitbringt --- */
  kompass: [
    '................',
    '.....KKKKKK.....',
    '...KKXXXXXXKK...',
    '..KXXWWWWWWXXK..',
    '.KXXWWWWWWWWXXK.',
    '.KXWWWWWRWWWWXK.',
    'KXWWWWWRRWWWWWXK',
    'KXWWWWRRRRWWWWXK',
    'KXWWWWWWWWWWWWXK',
    'KXWWWWWxxWWWWWXK',
    '.KXWWWWxxWWWWXK.',
    '.KXXWWWWWWWWXXK.',
    '..KXXWWWWWWXXK..',
    '...KKXXXXXXKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* --- Sonne und Wolke: das Wetter --- */
  wetter: [
    '................',
    '.......KKK......',
    '......KGGGK.....',
    '..K...KGGGK...K.',
    '...K..KGGGK..K..',
    '....KKKGGGKKK...',
    '....KGGGGGGGK...',
    '...KKKGGGGGKKK..',
    '..K..KKGGGKK..K.',
    '....KKKKKKKKK...',
    '...KWWWWWWWWWK..',
    '..KWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWWK',
    '..KKKKKKKKKKKKK.',
    '................'
  ],

  /* --- Boden: das Terrain --- */
  feld: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '.KNNNNNNNNNNNNK.',
    'KNNNNNNNNNNNNNNK',
    'KNnNNnNNnNNnNNnK',
    'KNNNNNNNNNNNNNNK',
    '.KNNNNNNNNNNNNK.',
    '..KKKKKKKKKKKK..',
    '..KsssssssssssK.',
    '.KSSSSSSSSSSSSK.',
    'KSSSSSSSSSSSSSSK',
    'KSsSSSSSSSSSSsSK',
    'KSSSSSSSSSSSSSSK',
    '.KKKKKKKKKKKKKK.',
    '................'
  ],

  /* --- Pfeil nach unten: was auf deiner Seite liegt --- */
  pfeilrunter: [
    '................',
    '......KKKK......',
    '......KrrK......',
    '......KrrK......',
    '......KrrK......',
    '......KRRK......',
    '......KRRK......',
    'KKKK..KRRK..KKKK',
    'KRRRKK.RR.KKRRRK',
    '.KRRRKKRRKKRRRK.',
    '..KRRRRRRRRRRK..',
    '...KRRRRRRRRK...',
    '....KRRRRRRK....',
    '.....KRRRRK.....',
    '......KRRK......',
    '.......KK.......'
  ],

  /* --- Pause: der Automat hält an --- */
  pause: [
    '................',
    '................',
    '..KKKK....KKKK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KXXK....KXXK..',
    '..KKKK....KKKK..',
    '................',
    '................'
  ],

  /* --- Schloss: noch nicht offen --- */
  schloss: [
    '................',
    '.....KKKKKK.....',
    '....KKSSSSKK....',
    '...KSSKKKKSSK...',
    '...KSSK..KSSK...',
    '...KSSK..KSSK...',
    '.KKKKKKKKKKKKKK.',
    '.KGGGGGGGGGGGGK.',
    '.KGGGGGGGGGGGGK.',
    '.KGGGGGKKGGGGGK.',
    '.KGGGGKKKKGGGGK.',
    '.KGGGGGKKGGGGGK.',
    '.KGGGGGKKGGGGGK.',
    '.KGgGGGGGGGGgGK.',
    '.KKKKKKKKKKKKKK.',
    '................'
  ],

  /* --- Ei: Erfahrung und Brut --- */
  ei: [
    '................',
    '.......KK.......',
    '......KWWK......',
    '.....KWWWWK.....',
    '....KWWWWWWK....',
    '...KWWWWWWWWK...',
    '...KWWWwwWWWK...',
    '..KWWWWwwWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWwwWWWWWWK..',
    '..KWWwwWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '...KWWWWWWWWK...',
    '....KWwwwwWK....',
    '.....KKKKKK.....',
    '................'
  ],

  /* --- Amulett: Geld an der Kette --- */
  amulett: [
    '................',
    '..KK........KK..',
    '...KK......KK...',
    '....KK....KK....',
    '.....KK..KK.....',
    '......KKKK......',
    '.....KGGGGK.....',
    '....KGGGGGGK....',
    '...KGGGGGGGGK...',
    '..KGGGWWWWGGGK..',
    '..KGGGWWWWGGGK..',
    '...KGGGGGGGGK...',
    '....KGgGGgGK....',
    '.....KGggGK.....',
    '......KKKK......',
    '................'
  ],

  /* --- Balken: geteilte Erfahrung --- */
  balken: [
    '................',
    '................',
    '............KK..',
    '...........KNNK.',
    '........KK.KNNK.',
    '.......KNNKKNNK.',
    '....KK.KNNKKNNK.',
    '...KNNKKNNKKNNK.',
    'KK.KNNKKNNKKNNK.',
    'KNNKKNNKKNNKKNNK',
    'KNNKKNNKKNNKKNNK',
    'KNNKKNNKKNNKKNNK',
    'KNNKKNNKKNNKKNNK',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................'
  ],

  /* --- Honigtopf: lockt an --- */
  honig: [
    '................',
    '................',
    '....KKKKKKKK....',
    '...KGGGGGGGGK...',
    '..KKKKKKKKKKKK..',
    '..KGGGGGGGGGGK..',
    '.KGGGGGGGGGGGGK.',
    '.KGGKKKKKKKGGGK.',
    '.KGGKWWWWWKGGGK.',
    '.KGGKWWWWWKGGGK.',
    '.KGGKKKKKKKGGGK.',
    '.KGGGGGGGGGGGGK.',
    '.KGgGGGGGGGGgGK.',
    '..KGgggggggggK..',
    '..KKKKKKKKKKKK..',
    '................'
  ],

  /* --- Wunderbrötchen --- */
  brot: [
    '................',
    '................',
    '....KKKKKKK.....',
    '..KKHHHHHHHKK...',
    '.KHHHHHHHHHHHK..',
    'KHHHHHHHHHHHHHK.',
    'KHHHHHHHHHHHHHK.',
    'KHhHHHHHHHHHhHK.',
    'KHhHHHHHHHHHhHK.',
    'KHhHHHHHHHHHhHK.',
    'KHhhHHHHHHHhhHK.',
    '.KHhhhhhhhhhhK..',
    '..KKKKKKKKKKK...',
    '................',
    '................',
    '................'
  ],

  /* --- Händlerkarte --- */
  karte: [
    '................',
    '................',
    '................',
    'KKKKKKKKKKKKKKKK',
    'KBBBBBBBBBBBBBBK',
    'KBBBBBBBBBBBBBBK',
    'KKKKKKKKKKKKKKKK',
    'KBBBBBBBBBBBBBBK',
    'KBBWWWWKBBBBBBBK',
    'KBBWWWWKBBBBBBBK',
    'KBBKKKKKBBBBBBBK',
    'KBbBBBBBBBBBBbBK',
    'KBbBBBBBBBBBBbBK',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................'
  ],

  /* --- Alte Karte --- */
  landkarte: [
    '................',
    '...KKKKKKKKKK...',
    '..KWWWKWWWKWWWK.',
    '.KWWWWKWWWKWWWWK',
    'KWWNNWKWWWKWWWWK',
    'KWWNNWKWWNNKWWWK',
    'KWWWWWKWNNNKWWWK',
    'KWWWWWKWNNWKWWWK',
    'KWWBBBBBBBWKWWWK',
    'KWWWBBBBBWWKWWWK',
    'KWWWWWWWWWWKWWWK',
    'KWWWWWKWWWWKWWWK',
    'KWWWWWKWWWWKWWWK',
    '.KWWWWKWWWWKWWWK',
    '..KKKKKKKKKKKKK.',
    '................'
  ],

  /* --- Trainingsgewichte --- */
  hantel: [
    '................',
    '................',
    '.KKK........KKK.',
    'KXXXK......KXXXK',
    'KXXXKKK..KKKXXXK',
    'KXXXKXKKKKXKXXXK',
    'KXXXKXXXXXXKXXXK',
    'KXXXKXXXXXXKXXXK',
    'KXXXKXKKKKXKXXXK',
    'KXXXKKK..KKKXXXK',
    'KXXXK......KXXXK',
    '.KKK........KKK.',
    '................',
    '................',
    '................',
    '................'
  ],

  /* --- Notfallband --- */
  schleife: [
    '................',
    '......KKKK......',
    '....KKRRRRKK....',
    '...KRRRRRRRRK...',
    '..KRRRWWWWRRRK..',
    '..KRRWWWWWWRRK..',
    '..KRRWWWWWWRRK..',
    '..KRRRWWWWRRRK..',
    '...KRRRRRRRRK...',
    '....KKRRRRKK....',
    '.....KRKKRK.....',
    '....KRRK.KRRK...',
    '....KRRK.KRRK...',
    '....KRK...KRK...',
    '....KK.....KK...',
    '................'
  ],

  /* --- Schutzhelm --- */
  helm: [
    '................',
    '................',
    '.....KKKKKK.....',
    '...KKWWWWWWKK...',
    '..KWWWWRRWWWWK..',
    '.KWWWWWRRWWWWWK.',
    '.KWWWRRRRRRWWWK.',
    'KWWWWWRRWWWWWWWK',
    'KWWWWWRRWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KKKKKKKKKKKKKKKK',
    'KwwwwwwwwwwwwwwK',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................',
    '................'
  ],

  /* --- Meisterball-Splitter --- */
  lilaball: [
    '.....KKKKKK.....',
    '...KKPPPPPPKK...',
    '..KPPWPPPPPPPK..',
    '.KPPPPPWPWPPPPK.',
    '.KPPPPWPWPWPPPK.',
    'KPPPPPPPPPPPPPPK',
    'KPPPPPKKKKPPPPPK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKWWWWWWKK...',
    '.....KKKKKK.....'
  ],

  /* --- Erfahrungsbonbon --- */
  bonbon: [
    '................',
    '................',
    '................',
    '....KKKKKKKK....',
    '...KBBBBBBBBK...',
    '..KBBBBBBBBBBK..',
    '..KBWWBBBBWWBK..',
    '..KBWWBBBBWWBK..',
    '..KBBBBBBBBBBK..',
    '..KBWWBBBBWWBK..',
    '..KBWWBBBBWWBK..',
    '..KBBBBBBBBBBK..',
    '...KBbbbbbbBK...',
    '....KKKKKKKK....',
    '................',
    '................'
  ],

  /* --- Notarzt --- */
  kreuz: [
    '................',
    '................',
    '.....KKKKKK.....',
    '.....KRRRRK.....',
    '.....KRRRRK.....',
    'KKKKKKRRRRKKKKKK',
    'KRRRRRRRRRRRRRRK',
    'KRRRRRRRRRRRRRRK',
    'KRRRRRRRRRRRRRRK',
    'KKKKKKRRRRKKKKKK',
    '.....KRRRRK.....',
    '.....KRRRRK.....',
    '.....KKKKKK.....',
    '................',
    '................',
    '................'
  ],

  /* --- Wunderkerze --- */
  kerze: [
    '................',
    '.......K........',
    '......KOK.......',
    '......KGK.......',
    '.......K........',
    '......KWK.......',
    '.....KWWWK......',
    '.....KWWWK......',
    '.....KWWWK......',
    '.....KWWWK......',
    '.....KWWWK......',
    '.....KWWWK......',
    '....KWWWWWK.....',
    '....KwwwwwK.....',
    '....KKKKKKK.....',
    '................'
  ],

  /* --- Ausdauertraining --- */
  muskel: [
    '................',
    '....KKKK........',
    '...KHHHHK.......',
    '...KHHHHK.......',
    '...KHHHHK.......',
    '..KKHHHHKK......',
    '.KHHHHHHHHKK....',
    '.KHHHHHHHHHHK...',
    '.KHHHHHHHHHHHK..',
    '.KHhHHHHHHHHHK..',
    '..KhhHHHHHHHHK..',
    '...KKhhhhhhhhK..',
    '......KKKKKKKK..',
    '................',
    '................',
    '................'
  ],

  /* --- Glückswürfel --- */
  wuerfel: [
    '................',
    '..KKKKKKKKKKKK..',
    '..KWWWWWWWWWWK..',
    '..KWKKWWWWWWWK..',
    '..KWKKWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWKKWWWWK..',
    '..KWWWWKKWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWKKWK..',
    '..KWWWWWWWKKWK..',
    '..KWwwwwwwwwwK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................',
    '................'
  ],

  /* --- Zeitmesser --- */
  uhr: [
    '................',
    '......KKKK......',
    '......KXXK......',
    '....KKKKKKKK....',
    '...KXXWWWWXXK...',
    '..KXWWWWWWWWXK..',
    '.KXWWWWKWWWWWXK.',
    '.KXWWWWKWWWWWXK.',
    '.KXWWWWKWWWWWXK.',
    '.KXWWWWKKKWWWXK.',
    '.KXWWWWWWWWWWXK.',
    '..KXWWWWWWWWXK..',
    '...KXXWWWWXXK...',
    '....KKKKKKKK....',
    '................',
    '................'
  ],

  /* --- Erste-Hilfe-Set --- */
  pflaster: [
    '................',
    '................',
    '....KKKK........',
    '...KHHHHKK......',
    '..KHHHHHHHKK....',
    '..KHHwwHHHHHKK..',
    '..KHwwHHwwHHHHK.',
    '..KHHHHwwHHwwHK.',
    '..KHHHHHHHHwwHK.',
    '..KKHHHHHHHHHHK.',
    '....KKHHHHHHHK..',
    '......KKHHHHK...',
    '........KKKK....',
    '................',
    '................',
    '................'
  ],

  /* --- Glücksbringer --- */
  klee: [
    '................',
    '....KK....KK....',
    '...KNNK..KNNK...',
    '..KNNNNKKNNNNK..',
    '..KNNNNNNNNNNK..',
    '...KNNNNNNNNK...',
    '....KNNNNNNK....',
    '..KKKNNNNNNKKK..',
    '.KNNNNNNNNNNNNK.',
    '.KNNNNNNNNNNNNK.',
    '..KKKNNNNNNKKK..',
    '....KNNNNNNK....',
    '......KnnK......',
    '.......KnK......',
    '.......KKK......',
    '................'
  ],

  /* --- Schmiedehammer --- */
  hammer: [
    '................',
    '...KKKKKKK......',
    '..KXXXXXXXK.....',
    '.KXXXXXXXXXK....',
    '.KXxXXXXXXXK....',
    '.KXxxxxxxxxK....',
    '..KKKKHHKKK.....',
    '.....KHHK.......',
    '.....KHHK.......',
    '.....KHHK.......',
    '.....KHhK.......',
    '.....KHhK.......',
    '.....KHhK.......',
    '.....KKKK.......',
    '................',
    '................'
  ],

  /* --- Lehrbuch --- */
  buch: [
    '................',
    '...KKKKKKKKKK...',
    '..KBBBBKBBBBBK..',
    '.KBBBBBKBBBBBBK.',
    'KBWWWWBKBWWWWWBK',
    'KBWWWWBKBWWWWWBK',
    'KBWWWWBKBWWWWWBK',
    'KBWWWWBKBWWWWWBK',
    'KBWWWWBKBWWWWWBK',
    'KBWWWWBKBWWWWWBK',
    'KBWWWWBKBWWWWWBK',
    'KBbbbbBKBbbbbbBK',
    'KBBBBBBKBBBBBBBK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................'
  ],


  /* --- Fokus auf einen Typ --- */
  ziel: [
    '................',
    '.....KKKKKK.....',
    '...KKWWWWWWKK...',
    '..KWWWWWWWWWWK..',
    '.KWWWKKKKKKWWWK.',
    '.KWWKRRRRRRKWWK.',
    'KWWKRRWWWWRRKWWK',
    'KWWKRRWRRWRRKWWK',
    'KWWKRRWRRWRRKWWK',
    'KWWKRRWWWWRRKWWK',
    '.KWWKRRRRRRKWWK.',
    '.KWWWKKKKKKWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKWWWWWWKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* --- Wolkenspeicher --- */
  wolke: [
    '................',
    '................',
    '......KKKK......',
    '....KKWWWWKK....',
    '...KWWWWWWWWK...',
    '..KWWWWWWWWWWK..',
    '.KWWWWWWWWWWWWK.',
    'KWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KwwwwwwwwwwwwwwK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................',
    '................',
    '................',
    '................'
  ],

  /* --- Speichern --- */
  diskette: [
    '................',
    'KKKKKKKKKKKKKK..',
    'KBBBBBBBBBBBBK..',
    'KBKKKKKKKKBBBKK.',
    'KBKWWWWWWKBBBBK.',
    'KBKWWWWWWKBBBBK.',
    'KBKWWWWWWKBBBBK.',
    'KBKKKKKKKKBBBBK.',
    'KBBBBBBBBBBBBBK.',
    'KBKKKKKKKKKKKBK.',
    'KBKWWWWWWWWWKBK.',
    'KBKWWWWWWWWWKBK.',
    'KBKWWWWWWWWWKBK.',
    'KBKKKKKKKKKKKBK.',
    'KKKKKKKKKKKKKKK.',
    '................'
  ],

  /* --- Kopieren --- */
  klemmbrett: [
    '................',
    '......KKKK......',
    '.....KXXXXK.....',
    '..KKKKXXXXKKKK..',
    '..KWWKKKKKKWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWKKKKKKWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWKKKKKKWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWKKKKKKWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................'
  ],

  /* --- Spieler --- */
  person: [
    '................',
    '.....KKKKK......',
    '....KHHHHHK.....',
    '...KHHHHHHHK....',
    '...KHHHHHHHK....',
    '...KHHHHHHHK....',
    '....KHHHHHK.....',
    '.....KKKKK......',
    '...KKBBBBBKK....',
    '..KBBBBBBBBBK...',
    '.KBBBBBBBBBBBK..',
    '.KBBBBBBBBBBBK..',
    '.KBbBBBBBBBbBK..',
    '.KBbBBBBBBBbBK..',
    '.KKKKKKKKKKKKK..',
    '................'
  ],

  /* --- Löschen --- */
  papierkorb: [
    '................',
    '.....KKKKKK.....',
    '..KKKKKKKKKKKK..',
    '..KXXXXXXXXXXK..',
    '..KKKKKKKKKKKK..',
    '...KXXXXXXXXK...',
    '...KXKXKXKXXK...',
    '...KXKXKXKXXK...',
    '...KXKXKXKXXK...',
    '...KXKXKXKXXK...',
    '...KXKXKXKXXK...',
    '...KXKXKXKXXK...',
    '...KXXXXXXXXK...',
    '....KKKKKKKK....',
    '................',
    '................'
  ],

  /* --- Starten --- */
  start: [
    '................',
    '...KK...........',
    '...KNK..........',
    '...KNNK.........',
    '...KNNNK........',
    '...KNNNNK.......',
    '...KNNNNNK......',
    '...KNNNNNNK.....',
    '...KNNNNNNK.....',
    '...KNNNNNK......',
    '...KNNNNK.......',
    '...KNNNK........',
    '...KNNK.........',
    '...KNK..........',
    '...KK...........',
    '................'
  ],

  /* --- Tages-Run --- */
  kalender: [
    '................',
    '....KK....KK....',
    '...KXXK..KXXK...',
    '.KKKXXKKKKXXKKK.',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '.KKKKKKKKKKKKKK.',
    '.KWKWKWKWKWKWWK.',
    '.KWKWKWKWKWKWWK.',
    '.KWWWWWWWWWWWWK.',
    '.KWKWKWKWKWKWWK.',
    '.KWKWKWKWKWKWWK.',
    '.KWWWWWWWWWWWWK.',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................'
  ],

  /* --- Geteilter Link --- */
  kette: [
    '................',
    '................',
    '....KKK...KKK...',
    '..KKBBBKKKBBBKK.',
    '..KBKKKBBBKKKBK.',
    '..KBK.KBKBK.KBK.',
    '..KBK.KBKBK.KBK.',
    '..KBK.KBKBK.KBK.',
    '..KBKKKBBBKKKBK.',
    '..KKBBBKKKBBBKK.',
    '....KKK...KKK...',
    '................',
    '................',
    '................',
    '................',
    '................'
  ],

  /* --- Achtung --- */
  warnung: [
    '.......KK.......',
    '.......KK.......',
    '......KGGK......',
    '......KGGK......',
    '.....KGGGGK.....',
    '.....KGKKGK.....',
    '....KGGKKGGK....',
    '....KGGKKGGK....',
    '...KGGGKKGGGK...',
    '...KGGGKKGGGK...',
    '..KGGGGKKGGGGK..',
    '..KGGGGGGGGGGK..',
    '.KGGGGGKKGGGGGK.',
    '.KGGGGGKKGGGGGK.',
    'KGGGGGGGGGGGGGGK',
    'KKKKKKKKKKKKKKKK'
  ],

  /* --- Run-Karte --- */
  bild: [
    '................',
    'KKKKKKKKKKKKKKKK',
    'KCCCCCCCCCCCCCCK',
    'KCCCGCCCCCCCCCCK',
    'KCCGGGCCCCCCCCCK',
    'KCCCGCCCCCCCCCCK',
    'KCCCCCCCCCCCCCCK',
    'KCCCCCCCCKCCCCCK',
    'KCCCCCCCKNKCCCCK',
    'KCCCKCCKNNNKCCCK',
    'KCCKNKKNNNNNKCCK',
    'KCKNNNKNNNNNNKCK',
    'KNNNNNNNNNNNNNNK',
    'KNNNNNNNNNNNNNNK',
    'KKKKKKKKKKKKKKKK',
    '................'
  ],

  /* --- Teilen --- */
  teilen: [
    '................',
    '...........KKK..',
    '..........KBBBK.',
    '..........KBBBK.',
    '...KKK.....KKK..',
    '..KBBBK..KK.....',
    '..KBBBK.KK......',
    '..KBBBKKK.......',
    '..KBBBK.KK......',
    '...KKK...KK.....',
    '..........KKK...',
    '..........KBBBK.',
    '..........KBBBK.',
    '...........KKK..',
    '................',
    '................'
  ],

  /* --- Delegator --- */
  puppe: [
    '................',
    '......KKKK......',
    '.....KWWWWK.....',
    '....KWWWWWWK....',
    '....KWKWWKWK....',
    '....KWWWWWWK....',
    '....KWWKKWWK....',
    '.....KWWWWK.....',
    '...KKKKKKKKKK...',
    '..KWWWWWWWWWWK..',
    '..KWWKWWWWKWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWwwwwwwwwWK..',
    '..KKKKKKKKKKKK..',
    '................'
  ]
};
