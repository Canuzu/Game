/* =============================================================================
 * effekte.mjs — die gezeichneten Formen der Attacken
 * -----------------------------------------------------------------------------
 * Die Attackeneffekte bestanden aus runden, weichgezeichneten Farbflecken.
 * Auf einem Bild aus Rasterpunkten sieht das aus wie ein Wasserzeichen: Die
 * Kanten verlaufen, die Farben leuchten, nichts davon gehört zu dieser Welt.
 *
 * Also werden auch die Effekte gezeichnet — dieselbe Art Raster wie die
 * Zeichen der Oberfläche, nur größer und in Bewegung.
 *
 * Zwei Sorten:
 *   bunt  — die Form bringt ihre Farbe mit (Flamme, Blitz, Blatt, Stein …)
 *   maske — die Form ist nur ein Umriss; die Farbe kommt vom Typ der Attacke
 *
 * Gelesen von tools/build-effekte.mjs, das daraus css/effekte.css macht.
 * ========================================================================== */

export const TAFEL = {
  '.': null,
  K: '#1b2028',   // Kontur
  W: '#ffffff',
  w: '#d8e4f0',
  G: '#ffd83c',   // Gelb
  g: '#e8a01c',
  O: '#f07830',   // Orange
  o: '#c04818',
  R: '#e03c30',   // Rot
  r: '#9e2820',
  B: '#4aa8e8',   // Blau
  b: '#2860b8',
  C: '#a8e8f8',   // Eis
  c: '#68b8d8',
  N: '#5cc45c',   // Grün
  n: '#2f8c36',
  S: '#a89880',   // Stein
  s: '#6a5a48',
  X: '#9aa3ad',   // Grau
  x: '#59626d',
  P: '#b070e0',   // Violett
  p: '#6b3fa0'
};

/* --- Bunte Formen ---------------------------------------------------------- */

export const FORMEN = {

  /* Eine Flammenzunge. Unten breit, oben spitz, innen heller. */
  flamme: [
    '.......KK.......',
    '......KGGK......',
    '.....KGWWGK.....',
    '.....KGWWGK.....',
    '....KOGWWGOK....',
    '....KOGGGGOK....',
    '...KOOGGGGOOK...',
    '...KOOGGGGOOK...',
    '..KROOGGGGOORK..',
    '..KROOOGGOOORK..',
    '.KRROOOOOOOORRK.',
    '.KRRROOOOOORRRK.',
    'KRRRRROOOORRRRRK',
    'KrRRRRRRRRRRRRrK',
    '.KrrRRRRRRRRrrK.',
    '..KKrrrrrrrrKK..'
  ],

  /* Eine Welle: Kamm oben, Schaum darauf. */
  welle: [
    '................',
    '..........KWWK..',
    '.......KKKWWWWK.',
    '.....KKWWWWBBWK.',
    '...KKWWBBBBBBWK.',
    '..KWWBBBBBBBBWK.',
    '.KWBBBBBBBBBBBK.',
    'KWBBBBBBBBBBBBK.',
    'KBBBBBBBBBBBBBK.',
    'KBBbbBBBBBBBBBK.',
    'KBbbbbBBBBBBBBK.',
    'KbbbbbbBBBBBBbK.',
    'KbbbbbbbbBBbbbK.',
    '.KbbbbbbbbbbbbK.',
    '..KKbbbbbbbbKK..',
    '....KKKKKKKK....'
  ],

  /* Ein Blitz. Schmal, gezackt, gleißend. */
  blitz: [
    '........KKK.....',
    '.......KGGK.....',
    '......KGWGK.....',
    '.....KGWWGK.....',
    '....KGGWWGK.....',
    '...KGGWWGGK.....',
    '..KGGWWGGKK.....',
    '.KGGWWGGKKKKK...',
    'KGGWWGGGGGGGGK..',
    'KGWWGGGGGGGGK...',
    'KKKKKKKGWWGK....',
    '......KGWWGK....',
    '.....KGWWGK.....',
    '....KGWWGK......',
    '...KGWGK........',
    '...KKKK.........'
  ],

  /* Ein Blatt mit Mittelrippe. */
  blatt: [
    '..............KK',
    '............KKNK',
    '.........KKKNNNK',
    '.......KKNNNNNNK',
    '.....KKNNNNNNNWK',
    '...KKNNNNNNNWWK.',
    '..KNNNNNNNWWNK..',
    '.KNNNNNNWWNNNK..',
    'KNNNNNWWNNNNNK..',
    'KNNNnWWNNNNNK...',
    'KNNnWWNNNNNK....',
    'KNnWWNNNNKK.....',
    'KnWWNNNKK.......',
    'KWWNNKK.........',
    'KWNKK...........',
    'KKK.............'
  ],

  /* Eine Eisscherbe. */
  scherbe: [
    '.......KK.......',
    '......KWWK......',
    '......KWWK......',
    '.....KWCCWK.....',
    '.....KWCCWK.....',
    '....KWCCCCWK....',
    '....KWCCCCWK....',
    '...KWCCCCCCWK...',
    '...KWCCCCCCWK...',
    '..KWCccccccCWK..',
    '..KWCccccccCWK..',
    '...KWCccccCWK...',
    '....KWCccCWK....',
    '.....KWCCWK.....',
    '......KWWK......',
    '.......KK.......'
  ],

  /* Ein Felsbrocken. */
  stein: [
    '................',
    '.....KKKKK......',
    '...KKSSSSSKK....',
    '..KSSSSSSSSSK...',
    '.KSSSWSSSSSSSK..',
    'KSSSWWSSSSSSSSK.',
    'KSSSWSSSSSSSSSK.',
    'KSSSSSSSSSSSSSK.',
    'KSSSSSSSSssSSSK.',
    'KSsSSSSSssssSSK.',
    'KSssSSSsssssSsK.',
    '.KsssssssssssK..',
    '.KssssssssssK...',
    '..KKsssssKKK....',
    '....KKKKK.......',
    '................'
  ],


};

/* --- Umrisse, die der Typ einfärbt ----------------------------------------- */

export const MASKEN = {

  /* Ein Aufschlag: vier Spitzen, innen voll. */
  stoss: [
    '.......WW.......',
    '.......WW.......',
    '..W....WW....W..',
    '..WW..WWWW..WW..',
    '...WW.WWWW.WW...',
    '....WWWWWWWW....',
    '.....WWWWWW.....',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    '.....WWWWWW.....',
    '....WWWWWWWW....',
    '...WW.WWWW.WW...',
    '..WW..WWWW..WW..',
    '..W....WW....W..',
    '.......WW.......',
    '.......WW.......'
  ],

  /* Ein Funken: vier Spitzen, schlank. */
  funke: [
    '.......WW.......',
    '.......WW.......',
    '.......WW.......',
    '......WWWW......',
    '......WWWW......',
    '.....WWWWWW.....',
    '..WWWWWWWWWWWW..',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    '..WWWWWWWWWWWW..',
    '.....WWWWWW.....',
    '......WWWW......',
    '......WWWW......',
    '.......WW.......',
    '.......WW.......',
    '.......WW.......'
  ],

  /* Eine Kralle: drei schräge Striche. */
  kralle: [
    'WW..........WW..',
    'WWW........WWW..',
    '.WWW......WWW...',
    '..WWW....WWW....',
    '...WWW..WWW.....',
    '....WWWWWW......',
    '.....WWWW.......',
    '......WW........',
    '.....WWWW.......',
    '....WWWWWW......',
    '...WWW..WWW.....',
    '..WWW....WWW....',
    '.WWW......WWW...',
    'WWW........WWW..',
    'WW..........WW..',
    '................'
  ],

  /* Ein Wirbel: eine Spirale aus Klötzen. */
  wirbelform: [
    '.....WWWWWW.....',
    '...WWWWWWWWWW...',
    '..WWW......WWW..',
    '.WWW....WWW.WWW.',
    '.WW...WWWWWW.WW.',
    'WWW..WWW..WWWWWW',
    'WW..WWW....WWWWW',
    'WW..WW......WWWW',
    'WW..WW..........',
    'WWW.WWW.........',
    '.WW..WWW........',
    '.WWW..WWWW......',
    '..WWW...WWWWW...',
    '...WWWW.....WW..',
    '.....WWWWWWWW...',
    '................'
  ],

  /* Ein Pfeil nach oben. */
  pfeilauf: [
    '.......WW.......',
    '......WWWW......',
    '.....WWWWWW.....',
    '....WWWWWWWW....',
    '...WWWWWWWWWW...',
    '..WWWWWWWWWWWW..',
    '.WWWWWWWWWWWWWW.',
    'WWWWWWWWWWWWWWWW',
    '.....WWWWWW.....',
    '.....WWWWWW.....',
    '.....WWWWWW.....',
    '.....WWWWWW.....',
    '.....WWWWWW.....',
    '.....WWWWWW.....',
    '.....WWWWWW.....',
    '.....WWWWWW.....'
  ],

  /* Ein Ring. */
  ringform: [
    '.....WWWWWW.....',
    '...WWWWWWWWWW...',
    '..WWWW....WWWW..',
    '.WWW........WWW.',
    '.WW..........WW.',
    'WWW..........WWW',
    'WW............WW',
    'WW............WW',
    'WW............WW',
    'WW............WW',
    'WWW..........WWW',
    '.WW..........WW.',
    '.WWW........WWW.',
    '..WWWW....WWWW..',
    '...WWWWWWWWWW...',
    '.....WWWWWW.....'
  ],
  /* Eine Blase. */
  blase: [
    '.....KKKKKK.....',
    '...KKWWWWWWKK...',
    '..KWWWWWWWWWWK..',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    'KWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKWWWWWWKK...',
    '.....KKKKKK.....'
  ],
  /* Ein Staubwölkchen für Aufschläge. */
  staub: [
    '................',
    '................',
    '....KKKK........',
    '..KKWWWWKK......',
    '.KWWWWWWWWK.....',
    'KWWWWWWWWWWKKK..',
    'KWWWWWWWWWWWWWK.',
    'KWWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KKWWWWWWWWWK..',
    '....KKKKKKKKK...',
    '................',
    '................',
    '................',
    '................',
    '................'
  ]
};
