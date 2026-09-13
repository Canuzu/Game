/* =============================================================================
 * gegenstaende.mjs — jedes Ding im Beutel, gezeichnet
 * -----------------------------------------------------------------------------
 * Bisher trug jeder Gegenstand das Zeichen seiner Art: alle Tränke dasselbe
 * Fläschchen, alle Bälle denselben Ball. In den Vorbildern hat jedes Ding sein
 * eigenes Bild, und man erkennt im Beutel auf einen Blick, was man hat.
 *
 * Hier steht beides: die Formen als Punktraster, und darunter für jeden
 * Gegenstand, welche Form er benutzt und in welchen Farben. So teilen sich
 * die fünfundzwanzig Beeren eine Zeichnung und sehen trotzdem alle anders
 * aus — genau wie in den Spielen.
 *
 * Buchstaben in den Rastern:
 *   K k   Kontur, halbe Kontur        W w   Weiß, Weiß im Schatten
 *   A a   Hauptfarbe, ihr Schatten    B b   Nebenfarbe, ihr Schatten
 *   C     dritte Farbe                .     nichts
 * Feste Farben (G, g, X, x …) stehen in der Tafel und werden nicht getauscht.
 *
 * Gelesen von tools/build-gegenstaende.mjs → css/gegenstaende.css
 * ========================================================================== */

export const TAFEL = {
  '.': null,
  K: '#1b2028',   // Kontur
  k: '#3a4450',   // halbe Kontur
  W: '#ffffff',
  w: '#c8d4e0',
  G: '#e8c83c',   // Gold, fest
  g: '#a8801c',
  X: '#9aa3ad',   // Grau, fest
  x: '#59626d',
  S: '#d8a868',   // Holz/Haut, fest
  s: '#8a6a3a'
};

/* --- Die Formen ------------------------------------------------------------ */

export const FORMEN = {

  /* Der Ball: oben die Farbe, unten weiß, in der Mitte das Band. */
  ball: [
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '.KAAAAAAAAAAAAK.',
    '.KAAAAAAAAAAAAK.',
    'KAAAAAAAAAAAAAAK',
    'KAaaaaaaaaaaaaAK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKwwwwwwKK...',
    '.....KKKKKK.....'
  ],

  /* Ein Ball mit zwei Streifen auf der Haube — Superball, Hyperball. */
  ballstreifen: [
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '.KABBAAAAAABBAK.',
    '.KABBAAAAAABBAK.',
    'KAABBAAAAAABBAAK',
    'KAaBBaaaaaaBBaAK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKwwwwwwKK...',
    '.....KKKKKK.....'
  ],

  /* Der Meisterball: das M und die beiden Punkte daneben. */
  ballm: [
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '.KABABAAABAABAK.',
    '.KABABBABBAABAK.',
    'KAAAABABABAAAAAK',
    'KAaAABaaaBAAAaAK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKwwwwwwKK...',
    '.....KKKKKK.....'
  ],

  /* Der Heilball: das Herz auf der Haube. */
  ballherz: [
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAABBABBAAAK.',
    '.KAAABBBBBBBAAK.',
    '.KAAABBBBBBBAAK.',
    'KAAAAABBBBBAAAAK',
    'KAaAAAABBBAaaaaK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKwwwwwwKK...',
    '.....KKKKKK.....'
  ],

  /* Ein Ball mit Netzmuster — Netzball, Nestball. */
  ballnetz: [
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KABAABAABAAK..',
    '.KAABAABAABAABK.',
    '.KBAABAABAABAAK.',
    'KAABAABAABAABAAK',
    'KAaBAaBAaBAaBaAK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKwwwwwwKK...',
    '.....KKKKKK.....'
  ],

  /* Ein dunkler Ball mit Bogen — Finsterball, Turboball, Flottball. */
  ballbogen: [
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '.KAAAABBBBAAAAK.',
    '.KAAABBAABBAAAK.',
    'KAAABBAAAABBAAAK',
    'KAaaBBaaaaBBaaAK',
    'KKKKKKKWWKKKKKKK',
    'KKKKKKKWWKKKKKKK',
    'KWWWWWKKKKWWWWWK',
    'KWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKwwwwwwKK...',
    '.....KKKKKK.....'
  ],

  /* Eine Sprühflasche mit Etikett — die Tränke. */
  flasche: [
    '................',
    '....KKKKKK......',
    '....KWWWWK......',
    '....KKKKKK......',
    '......KWK.......',
    '......KWK.......',
    '.....KKAAKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '..KAWWWWWWWWAK..',
    '..KAWBBBBBBWAK..',
    '..KAWWWWWWWWAK..',
    '..KAAAAAAAAAAK..',
    '..KAaAAAAAAaAK..',
    '..KAaaaaaaaaAK..',
    '...KKKKKKKKKK...'
  ],

  /* Eine Sprühdose — die X-Mittel. */
  spraydose: [
    '................',
    '.....KKKK.......',
    '.....KWWK.......',
    '....KKKKKK......',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '..KAWAAAAAAAAK..',
    '..KAWAAAAAAAAK..',
    '..KWWWWWWWWWWK..',
    '..KWBBBBBBBBWK..',
    '..KWWWWWWWWWWK..',
    '..KAAAAAAAAAAK..',
    '..KAaAAAAAAaAK..',
    '..KAaaaaaaaaAK..',
    '..KKaaaaaaaaKK..',
    '...KKKKKKKKKK...'
  ],

  /* Ein kleines Fläschchen — Gegengift und Verwandte. */
  fläschchen: [
    '................',
    '.......KK.......',
    '.......KK.......',
    '......KAAK......',
    '......KAAK......',
    '.....KAAAAK.....',
    '....KAAAAAAK....',
    '...KAAAAAAAAK...',
    '...KAWWWWWWAK...',
    '...KAWAAAAWAK...',
    '...KAAAAAAAAK...',
    '...KAaAAAAaAK...',
    '...KAaaaaaaAK...',
    '...KKAAAAAAKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* Ein Glas mit Deckel — Vitamine. */
  glas: [
    '................',
    '................',
    '...KKKKKKKKKK...',
    '...KAAAAAAAAK...',
    '..KKKKKKKKKKKK..',
    '..KWAAAAAAAAWK..',
    '..KWAAAAAAAAWK..',
    '..KWABBBBBBAWK..',
    '..KWABBBBBBAWK..',
    '..KWABBBBBBAWK..',
    '..KWAAAAAAAAWK..',
    '..KWAaaaaaaAWK..',
    '..KWaaaaaaaaWK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................'
  ],

  /* Ein Beleber-Kristall. */
  kristall: [
    '................',
    '.......KK.......',
    '......KAAK......',
    '.....KAWWAK.....',
    '....KAAWWAAK....',
    '...KAAAWWAAAK...',
    '..KAAAAWWAAAAK..',
    '..KAAAAWWAAAAK..',
    '..KAaAAWWAAaAK..',
    '..KAaaAWWAaaAK..',
    '...KaaaWWaaaK...',
    '....KaaWWaaK....',
    '.....KaWWaK.....',
    '......KaaK......',
    '.......KK.......',
    '................'
  ],

  /* Ein Bonbon mit gedrehtem Papier an beiden Enden. */
  bonbon: [
    '................',
    '................',
    '................',
    '..KK........KK..',
    '.KAAKKKKKKKKAAK.',
    'KAAAKAAAAAAKAAAK',
    'KAAAKWWAAWWKAAAK',
    'KAAAKWWAAWWKAAAK',
    'KAAAKAAAAAAKAAAK',
    'KAaaKAaaaaAKaaAK',
    '.KaaKKKKKKKKaaK.',
    '..KK........KK..',
    '................',
    '................',
    '................',
    '................'
  ],

  /* Ein Kronkorken von oben, mit geriffeltem Rand. */
  kronkorken: [
    '................',
    '................',
    '...KKKKKKKKKK...',
    '..KAKAKAKAKAKAK.',
    '.KAAAAAAAAAAAAK.',
    'KAAWAAAAAAAAAAAK',
    'KAWWAAAAAAAAAAAK',
    'KAAWAAAAAAAAAAAK',
    'KAAAAAAAAAAAAaAK',
    'KAAAAAAAAAAAaaAK',
    '.KAaaaaaaaaaaAK.',
    '..KaKaKaKaKaKaK.',
    '...KKKKKKKKKK...',
    '................',
    '................',
    '................'
  ],

  /* Eine Kapsel, längs zweifarbig. */
  kapsel: [
    '................',
    '................',
    '....KKKKKKKK....',
    '..KKAAAAAABBKK..',
    '.KAAAAAAAABBBBK.',
    'KAAAAAAAAABBBBBK',
    'KAWWAAAAAABBBBBK',
    'KAWWAAAAAABBBBBK',
    'KAAAAAAAAABBBBBK',
    'KAaaaaaaaabbbbbK',
    '.KaaaaaaaabbbbK.',
    '..KKaaaaaabbKK..',
    '....KKKKKKKK....',
    '................',
    '................',
    '................'
  ],

  /* Ein Blatt mit Stiel — Minze. */
  minze: [
    '................',
    '............KK..',
    '..........KKAK..',
    '.......KKKAAAK..',
    '.....KKAAAAAAK..',
    '...KKAAAAAAWAK..',
    '..KAAAAAAAWWK...',
    '.KAAAAAAAWWAK...',
    'KAAAAAAWWAAAK...',
    'KAAAAWWAAAAK....',
    'KAaAWWAAAAK.....',
    'KAaWWAAAKK......',
    'KaWWAAKK........',
    'KWWAKK..........',
    'KKKK............',
    '................'
  ],

  /* Ein Stein mit Schliff — die Entwicklungssteine. */
  stein: [
    '................',
    '......KKKK......',
    '....KKAAAAKK....',
    '...KAAAAAAAAK...',
    '..KAAWAAAAAAAK..',
    '.KAAWWAAAAAAAAK.',
    'KAAAWAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaaAAAAAAAAaaAK',
    '.KAaaaAAAAaaaAK.',
    '.KAaaaaaaaaaaAK.',
    '..KAaaaaaaaaAK..',
    '...KKaaaaaaKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* Eine Beere mit Stiel und Blatt. */
  beere: [
    '................',
    '.........KK.....',
    '........KBK.....',
    '.....KKKBBK.....',
    '...KKBBBBK......',
    '..KBBBBKK.......',
    '...KKKKK........',
    '....KKKKKK......',
    '..KKAAAAAAKK....',
    '.KAAAAAAAAAAK...',
    'KAAAWAAAAAAAAK..',
    'KAAWWAAAAAAAAK..',
    'KAaAAAAAAAAAAK..',
    '.KAaaAAAAAAAK...',
    '..KKaaaaaaKK....',
    '....KKKKKK......'
  ],

  /* Ein Band mit Schnalle — Wahlband, Gurte, Schärpen. */
  band: [
    '................',
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '.KAAAAAAAAAAAAK.',
    'KAAAKKKKKKAAAAAK',
    'KAAAKBBBBKAAAAAK',
    'KAaAKBWWBKAaAAAK',
    'KAaAKBBBBKAaAaAK',
    'KAaaKKKKKKaaaaAK',
    '.KaaaaaaaaaaaaK.',
    '..KKKKKKKKKKKK..',
    '................',
    '................',
    '................',
    '................'
  ],

  /* Ein Schal: das Band um den Hals und das hängende Ende. */
  schal: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '.KAAAAAAAAAAAAK.',
    'KAAaaaaaaaaaaAAK',
    'KAAAAAKKKKAAAAAK',
    '.KKKKKAAAAKKKKK.',
    '.....KAAAAAAK...',
    '.....KAAAAAAK...',
    '.....KAaAAaAK...',
    '.....KAaAAaAK...',
    '.....KAaAAaAK...',
    '.....KaaAAaaK...',
    '.....KKKKKKKK...',
    '................',
    '................'
  ],

  /* Eine Brille mit zwei Gläsern. */
  brille: [
    '................',
    '................',
    '................',
    '.KKKKKKKKKKKKKK.',
    'KAAAAAAAAAAAAAAK',
    'KABBBBKAAKBBBBAK',
    'KABWWBKAAKBWWBAK',
    'KABBBBKAAKBBBBAK',
    'KAAAAAKAAKAAAAAK',
    '.KaaaaKaaKaaaaK.',
    '..KKKKKKKKKKKK..',
    '................',
    '................',
    '................',
    '................',
    '................'
  ],

  /* Eine geschliffene Linse in ihrer Fassung. */
  linse: [
    '................',
    '................',
    '.....KKKKKK.....',
    '...KKBBBBBBKK...',
    '..KBBBBBBBBBBK..',
    '.KBBAAAAAAAABBK.',
    '.KBAAWWAAAAAABK.',
    'KBBAWWWAAAAAABBK',
    'KBBAWWAAAAAAABBK',
    '.KBAAAAAAAAAABK.',
    '.KBBAAAAAAAABBK.',
    '..KBBBBBBBBBBK..',
    '...KKBBBBBBKK...',
    '.....KKKKKK.....',
    '................',
    '................'
  ],

  /* Eine Weste mit offenem Ausschnitt, auch die Rüstungen. */
  weste: [
    '................',
    '..KKKK....KKKK..',
    '.KAAAAK..KAAAAK.',
    'KAAAAAAKKAAAAAAK',
    'KAAAAAAAKAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAABBAAAAAABBAAK',
    'KAABBAAAAAABBAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaaAAAAAAAAaaAK',
    'KAaaaAAAAAAaaaAK',
    'KAaaaaAAAAaaaaAK',
    '.KaaaaaaaaaaaaK.',
    '..KKKKKKKKKKKK..',
    '................'
  ],

  /* Ein Helm mit Rand. */
  helm: [
    '................',
    '................',
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '.KAAWWAAAAAAAAK.',
    '.KAWWAAAAAAAAAK.',
    'KAAAAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaaaaaaaaaaaaAK',
    'KKKKKKKKKKKKKKKK',
    'KBBBBBBBBBBBBBBK',
    'KKKKKKKKKKKKKKKK',
    '................',
    '................'
  ],

  /* Ein Paar Stiefel mit nach außen zeigenden Spitzen. */
  stiefel: [
    '................',
    '................',
    '.KKKKK....KKKKK.',
    '.KAAAK....KAAAK.',
    '.KAAAK....KAAAK.',
    '.KAAAK....KAAAK.',
    '.KAAAK....KAAAK.',
    '.KAAAK....KAAAK.',
    'KKAAAK....KAAAKK',
    'KAAAAK....KAAAAK',
    'KAAAAK....KAAAAK',
    'KAaaaK....KaaaAK',
    'KKKKKK....KKKKKK',
    '................',
    '................',
    '................'
  ],

  /* Ein Ballon an der Schnur. */
  ballon: [
    '................',
    '.....KKKK.......',
    '...KKAAAAKK.....',
    '..KAAAAAAAAK....',
    '.KAAWWAAAAAAK...',
    '.KAWWAAAAAAAK...',
    'KAAWAAAAAAAAAK..',
    'KAAAAAAAAAAAAK..',
    'KAAAAAAAAAAAAK..',
    '.KAaAAAAAAAaK...',
    '.KAaaaaaaaaAK...',
    '..KAaaaaaaAK....',
    '...KKaaaaKK.....',
    '.....KKKK.......',
    '......KK........',
    '.....KK.KK......'
  ],

  /* Eine gebogene Klaue. */
  klaue: [
    '................',
    '.........KKKK...',
    '.......KKKAAAK..',
    '.....KKAAAAAAK..',
    '...KKAAAAAAAAK..',
    '..KAAAAAAAAAKK..',
    '.KAAAAAAAAAKK...',
    '.KAAWAAAAAKK....',
    'KAAWWAAAAKK.....',
    'KAAWAAAAKK......',
    'KAAAAAAKK.......',
    'KAAAAAKK........',
    'KAaaaKK.........',
    'KaaaKK..........',
    'KKKKK...........',
    '................'
  ],

  /* Eine Krone. */
  krone: [
    '................',
    '................',
    '..K.....K.....K.',
    '..KK...KKK...KK.',
    '..KAK.KAAAK.KAK.',
    '..KAAKKAAAKKAAK.',
    '..KAAAAAAAAAAAK.',
    '..KAAAAAAAAAAAK.',
    '..KAABBAABBAAAK.',
    '..KAAAAAAAAAAAK.',
    '..KAaaaaaaaaaAK.',
    '..KKKKKKKKKKKKK.',
    '................',
    '................',
    '................',
    '................'
  ],

  /* Ein Kraut mit vier Blättern am Stiel. */
  kraut: [
    '................',
    '...KKK....KKK...',
    '..KAAAK..KAAAK..',
    '.KAAAAAKKAAAAAK.',
    '.KAAAAAAKAAAAAK.',
    '.KAAAAAKSKAAAAK.',
    '..KAAAKSSKAAAK..',
    '...KKKKSSKKKK...',
    '.......KSK......',
    '....KKKKSKKKK...',
    '...KAAAAKAAAAK..',
    '...KAAAAKAAAAK..',
    '....KAAAKAAAK...',
    '.....KKKSKKK....',
    '.......KKK......',
    '................'
  ],

  /* Eine leuchtende Kugel. */
  orb: [
    '................',
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '.KAAWWAAAAAAAAK.',
    '.KAWWWAAAAAAAAK.',
    'KAAWWAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    '.KAaaAAAAAAaaAK.',
    '.KAaaaaaaaaaaAK.',
    '..KAaaaaaaaaAK..',
    '...KKaaaaaaKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* Ein Anhänger an der Kette. */
  anhaenger: [
    '................',
    '..KK........KK..',
    '...KK......KK...',
    '....KK....KK....',
    '.....KK..KK.....',
    '......KKKK......',
    '.....KAAAAK.....',
    '....KAAAAAAK....',
    '...KAAWWAAAAK...',
    '..KAAWBBWAAAAK..',
    '..KAAWBBWAAAAK..',
    '...KAAWWAAAAK...',
    '....KAaaaaAK....',
    '.....KaaaaK.....',
    '......KKKK......',
    '................'
  ],

  /* Ein Würfel mit Augen. */
  wuerfel: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '.KAAAAAAAAAAAAK.',
    'KAAKKAAAAAKKAAAK',
    'KAAKKAAAAAKKAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAAAAAKKAAAAAAAK',
    'KAAAAAKKAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaAKKAAAKKAAaAK',
    'KAaaKKaaaKKaaaAK',
    '.KaaaaaaaaaaaaK.',
    '..KKKKKKKKKKKK..',
    '................',
    '................'
  ],

  /* Ein Handschuh mit Bund. */
  handschuh: [
    '................',
    '................',
    '.....KKKKK......',
    '...KKAAAAAKK....',
    '..KAAAAAAAAAK...',
    '.KAAWWAAAAAAAK..',
    '.KAWWAAAAAAAAK..',
    'KAAAAAAAAAAAAK..',
    'KAAAAAAAAAAAAK..',
    'KAaAAAAAAAAAAK..',
    'KAaaAAAAAAAAAK..',
    '.KaaaaaaaaaaK...',
    '..KKKKKKKKKK....',
    '...KBBBBBBK.....',
    '...KKKKKKKK.....',
    '................'
  ],

  /* Ein Umhang mit Kragen. */
  umhang: [
    '................',
    '.....KKKKKK.....',
    '....KAAAAAAK....',
    '...KAAKKKKAAK...',
    '..KAAAKKKKAAAK..',
    '.KAAAAAKKAAAAAK.',
    '.KAAAAAAAAAAAAK.',
    'KAAAAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaaAAAAAAAAaaAK',
    'KAaaaAAAAAAaaaAK',
    'KAaaaaaaaaaaaaAK',
    '.KaaaaaaaaaaaaK.',
    '..KKKKKKKKKKKK..',
    '................'
  ],

  /* Ein Taktstock auf seinem Sockel. */
  taktstock: [
    '................',
    '.......KK.......',
    '.......KK.......',
    '......KKKK......',
    '......KAAK......',
    '.....KKAAKK.....',
    '.....KAAAAK.....',
    '....KKAAAAKK....',
    '....KAABBAAK....',
    '...KKAABBAAKK...',
    '...KAAAAAAAAK...',
    '..KKAAAAAAAAKK..',
    '..KAAAAAAAAAAK..',
    '.KKAAAAAAAAAAKK.',
    '.KKKKKKKKKKKKKK.',
    '................'
  ],

  /* Eine Feder mit hellem Kiel. */
  feder: [
    '................',
    '...........KKK..',
    '........KKKAAK..',
    '......KKAAAAAK..',
    '.....KAAAAAAAK..',
    '....KAAWAAAAKK..',
    '...KAAWAAAAKK...',
    '..KAAWAAAAKK....',
    '..KAWAAAAKK.....',
    '.KAAAAAAKK......',
    '.KAAAAAKK.......',
    'KAAAAAKK........',
    'KAAAAKK.........',
    'KAaaKK..........',
    'KKaKK...........',
    '.KKK............'
  ],

  /* Ein verbogener Löffel mit großer Schale. */
  loeffel: [
    '................',
    '....KKKK........',
    '...KAAAAK.......',
    '..KAWWAAAK......',
    '..KAWWAAAK......',
    '..KAAAAAAK......',
    '..KAAAAAAK......',
    '...KAAAAK.......',
    '....KAAK........',
    '.....KAK........',
    '.....KAK........',
    '......KAK.......',
    '......KAK.......',
    '.......KAK......',
    '.......KaK......',
    '........KK......'
  ],

  /* Ein Zahn, auch der Schnabel. */
  zahn: [
    '................',
    '..KKKKKKKKKK....',
    '.KAAAAAAAAAAK...',
    '.KAWWAAAAAAAK...',
    '.KAWAAAAAAAAK...',
    '.KAAAAAAAAAAK...',
    '..KAAAAAAAAK....',
    '..KAAAAAAAK.....',
    '...KAAAAAAK.....',
    '...KAAAAAK......',
    '....KAAAAK......',
    '....KAaaK.......',
    '.....KaaK.......',
    '.....KaK........',
    '......KK........',
    '................'
  ],

  /* Ein Hufeisenmagnet. */
  magnetform: [
    '................',
    '................',
    '.....KKKKKK.....',
    '....KKAAAAKK....',
    '...KAAAAAAAAK...',
    '..KAAAAAAAAAAK..',
    '.KAAAAKKKKAAAAK.',
    '.KAAAK....KAAAK.',
    '.KAAAK....KAAAK.',
    '.KAAAK....KAAAK.',
    '.KBBBK....KBBBK.',
    '.KBBBK....KBBBK.',
    '.KKKKK....KKKKK.',
    '................',
    '................',
    '................'
  ],

  /* Ein Beutel voll Pulver. */
  beutel: [
    '................',
    '.......KK.......',
    '......KKKK......',
    '.....KKAAKK.....',
    '....KKAAAAKK....',
    '...KAAAAAAAAK...',
    '..KAAAAAAAAAAK..',
    '.KAAAAAAAAAAAAK.',
    '.KAAWWAAAAAAAAK.',
    'KAAWWAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaaaAAAAAAaaaAK',
    '.KAaaaaaaaaaaAK.',
    '..KKaaaaaaaaKK..',
    '....KKKKKKKK....'
  ],

  /* Ein Sticker mit Siegel. */
  sticker: [
    '................',
    '...KKKKKKKKKK...',
    '...KAAAAAAAAK...',
    '...KAAAAAAAAK...',
    '...KABBBBBBAK...',
    '...KABAAAABAK...',
    '...KABABBABAK...',
    '...KABABBABAK...',
    '...KABAAAABAK...',
    '...KABBBBBBAK...',
    '...KAAAAAAAAK...',
    '...KAaaaaaaAK...',
    '...KKaaaaaaKK...',
    '....KKKKKKKK....',
    '................',
    '................'
  ],

  /* Eine Platte mit eingelassenem Feld. */
  platte: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '.KAAAAAAAAAAAAK.',
    'KAWWAAAAAAAAAAAK',
    'KAWAAAAAAAAAAAAK',
    'KAAAAKKKKKKAAAAK',
    'KAAAKBBBBBBKAAAK',
    'KAaAKBBBBBBKAaAK',
    'KAaAAKKKKKKAAaAK',
    'KAaaaaaaaaaaaaAK',
    'KAaaaaaaaaaaaaAK',
    '.KaaaaaaaaaaaaK.',
    '..KKKKKKKKKKKK..',
    '................',
    '................'
  ],

  /* Eine Saat mit Keim. */
  saat: [
    '................',
    '.........KK.....',
    '........KAK.....',
    '.......KAAK.....',
    '......KKAAK.....',
    '....KKAAAAKK....',
    '..KKAAAAAAAAKK..',
    '.KAAAAAAAAAAAAK.',
    'KAAWWAAAAAAAAAAK',
    'KAAWAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    '.KAaAAAAAAAAaAK.',
    '..KAaaaaaaaaAK..',
    '...KKaaaaaaKK...',
    '.....KKKKKK.....',
    '................'
  ],

  /* Ein Tropfen. */
  tropfen: [
    '................',
    '.......KK.......',
    '.......KK.......',
    '......KAAK......',
    '......KAAK......',
    '.....KAAAAK.....',
    '.....KAAAAK.....',
    '....KAWAAAAK....',
    '....KAWAAAAK....',
    '...KAWWAAAAAK...',
    '...KAWAAAAAAK...',
    '...KAAAAAAaAK...',
    '....KAaaaaaK....',
    '....KKaaaaKK....',
    '.....KKKKKK.....',
    '................'
  ],

  /* Ein Dorn. */
  dorn: [
    '................',
    '.......KK.......',
    '......KAAK......',
    '......KAAK......',
    '.....KAWAAK.....',
    '.....KAWAAK.....',
    '....KAAWAAAK....',
    '....KAAWAAAK....',
    '...KAAAWAAAAK...',
    '...KAAAWAAAAK...',
    '..KAAAAWAAAAAK..',
    '..KAAAAAAAAAAK..',
    '..KAaaaaaaaaAK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................'
  ],

  /* Ein Apfel. */
  apfel: [
    '................',
    '.......KK...KK..',
    '.......KKKKKAK..',
    '......KKAAKKKK..',
    '....KKAAAAAKK...',
    '..KKAAAAAAAAAKK.',
    '.KAAWAAAAAAAAAK.',
    'KAAWWAAAAAAAAAAK',
    'KAAWAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaaAAAAAAAAaaAK',
    '.KAaaaAAAAaaaAK.',
    '.KAaaaaaaaaaaAK.',
    '..KKaaaaaaaaKK..',
    '....KKKKKKKK....'
  ],

  /* Eine Kanne mit Tülle und Henkel. */
  kanne: [
    '................',
    '.......KK.......',
    '......KKKK......',
    '...KKKKKKKKKK...',
    '..KAAAAAAAAAAK..',
    'KKAAAAAAAAAAAKKK',
    'KAKAAAAAAAAAKAAK',
    'KAKAAAAAAAAAKAAK',
    'KAKAAAAAAAAAKAAK',
    '.KKAAAAAAAAAKKK.',
    '..KAaAAAAAAaAK..',
    '..KAaaaaaaaaAK..',
    '...KKaaaaaaKK...',
    '.....KKKKKK.....',
    '................',
    '................'
  ],

  /* Ein Reif. */
  reif: [
    '................',
    '................',
    '.....KKKKKK.....',
    '...KKAAAAAAKK...',
    '..KAAAAAAAAAAK..',
    '.KAAAKKKKKKAAAK.',
    '.KAAK......KAAK.',
    'KAAK........KAAK',
    'KAAK........KAAK',
    '.KAAK......KAAK.',
    '.KAaaKKKKKKaaAK.',
    '..KAaaaaaaaaAK..',
    '...KKaaaaaaKK...',
    '.....KKKKKK.....',
    '................',
    '................'
  ],

  /* Ein Barren. */
  barren: [
    '................',
    '................',
    '................',
    '.....KKKKKKK....',
    '....KAAAAAAAK...',
    '...KAWWAAAAAAK..',
    '..KAAWAAAAAAAAK.',
    '.KAAAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaaaaaaaaaaaaAK',
    'KaaaaaaaaaaaaaaK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................',
    '................',
    '................'
  ],

  /* Ein Schild mit Wappenfeld. */
  schild: [
    '................',
    '..KKKKKKKKKKKK..',
    '.KAAAAAAAAAAAAK.',
    'KAAWWAAAAAAAAAAK',
    'KAAWAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAAAABBBBBBAAAAK',
    'KAAAABBBBBBAAAAK',
    'KAAAAAAAAAAAAAAK',
    '.KAAAAAAAAAAAAK.',
    '.KAaAAAAAAAAaAK.',
    '..KAaaAAAAaaAK..',
    '...KAaaaaaaAK...',
    '....KKaaaaKK....',
    '......KKKK......',
    '................'
  ],

  /* Eine Brotdose — die Überreste. */
  rest: [
    '................',
    '................',
    '......KKKK......',
    '.....KKAAKK.....',
    '...KKKKKKKKKK...',
    '..KAAAAAAAAAAK..',
    '..KAWWAAAAAAAK..',
    '..KAWAAAAAAAAK..',
    '..KAAAAAAAAAAK..',
    '..KAABBBBBBAAK..',
    '..KAABBBBBBAAK..',
    '..KAAAAAAAAAAK..',
    '..KAaaaaaaaaAK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................'
  ],

  /* Ein tropfender Klumpen — der Giftschleim. */
  schleim: [
    '................',
    '................',
    '.......KK.......',
    '......KAAK......',
    '.....KAAAAK.....',
    '....KAAAAAAK....',
    '..KKAAAAAAAAKK..',
    '.KAAAAAAAAAAAAK.',
    'KAAWAAAAAAAAAAAK',
    'KAWWAAAAAAAAAAAK',
    'KAAAAAAAAAAAAAAK',
    'KAaAAAAAAAAAAaAK',
    'KAaaaaaaaaaaaaAK',
    'KKaaKKaaaaKKaaKK',
    '.KKK..KKKK..KKK.',
    '..K....KK....K..'
  ]
};

/* --- Die Gegenstände -------------------------------------------------------
 * form: welche Zeichnung, tausch: welche Farben an die Stelle von A/a/B/b/C
 * ------------------------------------------------------------------------ */

const rot = { A: '#e03c30', a: '#9e2820' };
const blau = { A: '#3a7ad8', a: '#20509a' };
const gelb = { A: '#e8c83c', a: '#a8801c' };
const gruen = { A: '#4cb04c', a: '#2a7030' };
const lila = { A: '#a058d0', a: '#603090' };
const rosa = { A: '#e880b0', a: '#a84878' };
const orange = { A: '#e8863c', a: '#a85418' };
const cyan = { A: '#58c8d8', a: '#2a8898' };
const grau = { A: '#b0b8c0', a: '#6a7480' };
const schwarz = { A: '#404a58', a: '#20262e' };
const weiss = { A: '#e8eef6', a: '#a8b2c0' };

const LAUB = '#3e9a44';
/* Alle Beeren teilen sich eine Zeichnung; nur die Fruchtfarbe wechselt. */
const beere = (hell, dunkel) => ({ form: 'beere', tausch: { A: hell, a: dunkel, B: LAUB } });

export const GEGENSTAENDE = {
  /* --- Bälle --- */
  pokeball: { form: 'ball', tausch: rot },
  greatball: { form: 'ballstreifen', tausch: { A: '#3a7ad8', a: '#20509a', B: '#e03c30', b: '#9e2820' } },
  ultraball: { form: 'ballstreifen', tausch: { A: '#2a2e38', a: '#16181e', B: '#e8c83c', b: '#a8801c' } },
  masterball: { form: 'ballm', tausch: { A: '#8a48c8', a: '#4a2080', B: '#e880b0', b: '#a84878' } },
  timerball: { form: 'ballstreifen', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#e03c30', b: '#9e2820' } },
  netball: { form: 'ballnetz', tausch: { A: '#3ab0a8', a: '#1e7068', B: '#2a4a58', b: '#16303a' } },
  nestball: { form: 'ballnetz', tausch: { A: '#9acc4c', a: '#5a8a28', B: '#e8a83c', b: '#a8701c' } },
  duskball: { form: 'ballbogen', tausch: { A: '#3a4450', a: '#20262e', B: '#4cc84c', b: '#2a8030' } },
  quickball: { form: 'ballbogen', tausch: { A: '#3a7ad8', a: '#20509a', B: '#e8c83c', b: '#a8801c' } },
  healball: { form: 'ballherz', tausch: { A: '#e8a0c8', a: '#a86090', B: '#ffffff', b: '#c8d4e0' } },

  /* --- Tränke und Beleber --- */
  potion: { form: 'flasche', tausch: { A: '#f0a0b8', a: '#b06078', B: '#e03c30' } },
  superpotion: { form: 'flasche', tausch: { A: '#f0c060', a: '#b08020', B: '#e03c30' } },
  hyperpotion: { form: 'flasche', tausch: { A: '#88c8f0', a: '#4080b0', B: '#e03c30' } },
  maxpotion: { form: 'flasche', tausch: { A: '#b0e0a0', a: '#609060', B: '#e03c30' } },
  fullrestore: { form: 'flasche', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#3a7ad8' } },
  revive: { form: 'kristall', tausch: { A: '#f0d860', a: '#b09020' } },
  maxrevive: { form: 'kristall', tausch: { A: '#f0f0d0', a: '#b0b060' } },

  /* --- Statusheiler --- */
  antidote: { form: 'fläschchen', tausch: lila },
  burnheal: { form: 'fläschchen', tausch: orange },
  paralyzeheal: { form: 'fläschchen', tausch: gelb },
  awakening: { form: 'fläschchen', tausch: blau },
  iceheal: { form: 'fläschchen', tausch: cyan },
  fullheal: { form: 'fläschchen', tausch: weiss },

  /* --- Werte: X-Mittel und Vitamine --- */
  xattack: { form: 'spraydose', tausch: { A: '#e03c30', a: '#9e2820', B: '#8e1c16' } },
  xdefense: { form: 'spraydose', tausch: { A: '#e8a83c', a: '#a8701c', B: '#8a5410' } },
  xspecial: { form: 'spraydose', tausch: { A: '#5878e0', a: '#2a4098', B: '#1e2e70' } },
  xspdef: { form: 'spraydose', tausch: { A: '#4cb04c', a: '#2a7030', B: '#1c5020' } },
  xspeed: { form: 'spraydose', tausch: { A: '#e880b0', a: '#a84878', B: '#7e3058' } },
  hpup: { form: 'glas', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#e03c30', b: '#9e2820' } },
  protein: { form: 'glas', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#e88c3c', b: '#a85818' } },
  iron: { form: 'glas', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#8a98a8', b: '#4a5866' } },
  calcium: { form: 'glas', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#5878e0', b: '#2a4098' } },
  zinc: { form: 'glas', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#4cb04c', b: '#2a7030' } },
  carbos: { form: 'glas', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#e880b0', b: '#a84878' } },

  /* --- Besonderes --- */
  rarecandy: { form: 'bonbon', tausch: { A: '#5090e0', a: '#2a5098' } },
  ether: { form: 'fläschchen', tausch: { A: '#d060c8', a: '#903088' } },
  maxelixir: { form: 'flasche', tausch: { A: '#d060c8', a: '#903088', B: '#e8c83c' } },
  ppup: { form: 'fläschchen', tausch: { A: '#f0a040', a: '#b06010' } },
  abilitycapsule: { form: 'kapsel', tausch: { A: '#e8eef6', a: '#a8b2c0', B: '#5878e0', b: '#2a4098' } },
  abilitypatch: { form: 'kapsel', tausch: { A: '#e8c83c', a: '#a8801c', B: '#e03c30', b: '#9e2820' } },
  bottlecap: { form: 'kronkorken', tausch: grau },
  mint: { form: 'minze', tausch: { A: '#6ad0a0', a: '#2a8860' } },

  /* --- Tragegegenstände: Ausrüstung --- */
  leftovers: { form: 'rest', tausch: { A: '#d8b878', a: '#987840', B: '#c05838' } },
  lifeorb: { form: 'orb', tausch: { A: '#d04878', a: '#802040' } },
  choiceband: { form: 'band', tausch: { A: '#d84848', a: '#902020', B: '#e8c83c' } },
  choicespecs: { form: 'brille', tausch: { A: '#4a68c8', a: '#283a80', B: '#e8c83c' } },
  choicescarf: { form: 'schal', tausch: { A: '#4a90d8', a: '#285098' } },
  focussash: { form: 'band', tausch: { A: '#e4e4e4', a: '#9a9a9a', B: '#c8a038' } },
  assaultvest: { form: 'weste', tausch: { A: '#d05838', a: '#8a3018', B: '#3a3f48' } },
  eviolite: { form: 'stein', tausch: { A: '#e078b0', a: '#a04070' } },
  rockyhelmet: { form: 'helm', tausch: { A: '#b07048', a: '#6e4020', B: '#8a5030' } },
  expertbelt: { form: 'band', tausch: { A: '#a06840', a: '#644020', B: '#e8c83c' } },
  muscleband: { form: 'band', tausch: { A: '#c04030', a: '#802018', B: '#e8c83c' } },
  wiseglasses: { form: 'brille', tausch: { A: '#a87848', a: '#6a4820', B: '#5a4028' } },
  blacksludge: { form: 'schleim', tausch: { A: '#6a4878', a: '#3a2448' } },
  airballoon: { form: 'ballon', tausch: { A: '#e8d048', a: '#a89020' } },
  weaknesspolicy: { form: 'schild', tausch: { A: '#e09038', a: '#a05818', B: '#f0f0f0' } },
  heavydutyboots: { form: 'stiefel', tausch: { A: '#8a6038', a: '#523818' } },
  lightclay: { form: 'stein', tausch: { A: '#f0e8c0', a: '#b0a878' } },
  damprock: { form: 'stein', tausch: { A: '#6098c8', a: '#305a88' } },
  heatrock: { form: 'stein', tausch: { A: '#d85838', a: '#903018' } },
  terrainextender: { form: 'platte', tausch: { A: '#68b868', a: '#3a7838', B: '#2a5a2a' } },
  loadeddice: { form: 'wuerfel', tausch: { A: '#f0f0f0', a: '#a8a8a8' } },
  punchingglove: { form: 'handschuh', tausch: { A: '#d84848', a: '#902020', B: '#f0f0f0' } },
  clearamulet: { form: 'anhaenger', tausch: { A: '#a8e0e8', a: '#5898a8', B: '#ffffff' } },
  covertcloak: { form: 'umhang', tausch: { A: '#6a7a6a', a: '#3a4a3a' } },
  quickclaw: { form: 'klaue', tausch: { A: '#e8a038', a: '#a06818' } },
  kingsrock: { form: 'krone', tausch: { A: '#e8c83c', a: '#a8801c', B: '#e04858' } },
  whiteherb: { form: 'kraut', tausch: { A: '#e8f0e8', a: '#a8b0a8' } },
  throatspray: { form: 'spraydose', tausch: { A: '#48c0c8', a: '#207880', B: '#155258' } },
  safetygoggles: { form: 'brille', tausch: { A: '#68b868', a: '#3a7838', B: '#c8e8f0' } },
  scopelens: { form: 'linse', tausch: { A: '#a8e8f0', a: '#58a8b8', B: '#c85848' } },
  boosterenergy: { form: 'kapsel', tausch: { A: '#e04838', a: '#902018', B: '#c8d0d8', b: '#7e8895' } },
  metronome: { form: 'taktstock', tausch: { A: '#a86840', a: '#684020', B: '#e8c83c' } },

  /* --- Tragegegenstände: die achtzehn Typenverstärker --- */
  charcoal: { form: 'stein', tausch: { A: '#4a5058', a: '#262a30' } },
  mysticwater: { form: 'tropfen', tausch: { A: '#58a8e0', a: '#2a6098' } },
  miracleseed: { form: 'saat', tausch: { A: '#6cc048', a: '#3a8028' } },
  magnet: { form: 'magnetform', tausch: { A: '#e04040', a: '#902020', B: '#c0c8d4' } },
  nevermeltice: { form: 'stein', tausch: { A: '#a8e0f0', a: '#5898b8' } },
  blackbelt: { form: 'band', tausch: { A: '#3a3f48', a: '#1e2228', B: '#e8c83c' } },
  poisonbarb: { form: 'dorn', tausch: { A: '#a058c8', a: '#603090' } },
  softsand: { form: 'beutel', tausch: { A: '#e0c890', a: '#a08850' } },
  sharpbeak: { form: 'zahn', tausch: { A: '#e8c040', a: '#a88018' } },
  twistedspoon: { form: 'loeffel', tausch: { A: '#c8d0dc', a: '#7e8895' } },
  silverpowder: { form: 'beutel', tausch: { A: '#d0d8e0', a: '#8892a0' } },
  hardstone: { form: 'stein', tausch: { A: '#a89878', a: '#6a5c40' } },
  spelltag: { form: 'sticker', tausch: { A: '#e8e0d0', a: '#a89c88', B: '#8848a8' } },
  dragonfang: { form: 'zahn', tausch: { A: '#d8e8f0', a: '#90a0b0' } },
  blackglasses: { form: 'brille', tausch: { A: '#3a3f48', a: '#1e2228', B: '#20242a' } },
  metalcoat: { form: 'platte', tausch: { A: '#b8c0cc', a: '#707a88', B: '#5a6472' } },
  fairyfeather: { form: 'feder', tausch: { A: '#f0a8d0', a: '#b06090' } },
  silkscarf: { form: 'schal', tausch: { A: '#f0e8e0', a: '#b0a498' } },

  /* --- Die neunundzwanzig Beeren --- */
  sitrusberry: beere('#e8c83c', '#a8801c'),
  oranberry: beere('#4a7ad8', '#28508e'),
  lumberry: beere('#e8709a', '#a84068'),
  chestoberry: beere('#9a58c8', '#5c3080'),
  leppaberry: beere('#e05838', '#a03018'),
  liechiberry: beere('#e04858', '#a02038'),
  petayaberry: beere('#7058d0', '#402f90'),
  salacberry: beere('#38b0a0', '#1c7068'),
  ganlonberry: beere('#4a68d8', '#283a8e'),
  apicotberry: beere('#e89838', '#a86018'),
  figyberry: beere('#c04030', '#802018'),
  occaberry: beere('#e06030', '#a03818'),
  passhoberry: beere('#3aa0d8', '#1c6090'),
  wacanberry: beere('#e8d048', '#a89020'),
  rindoberry: beere('#58b048', '#308020'),
  yacheberry: beere('#78c8e8', '#3888a8'),
  chopleberry: beere('#b05838', '#703018'),
  kebiaberry: beere('#8ab048', '#5a7028'),
  shucaberry: beere('#d8a848', '#986820'),
  cobaberry: beere('#90d070', '#508840'),
  payapaberry: beere('#d078c8', '#904088'),
  tangaberry: beere('#b8c840', '#788818'),
  chartiberry: beere('#e0b8a0', '#a07860'),
  kasibberry: beere('#8050a0', '#503068'),
  habanberry: beere('#a03848', '#681828'),
  colburberry: beere('#6048a0', '#382868'),
  babiriberry: beere('#9098a8', '#585f6b'),
  roseliberry: beere('#e878b8', '#a04078'),
  chilanberry: beere('#c8d8b0', '#889070'),

  /* --- Entwicklung: Steine, Reifen, Äpfel, Kannen, Rüstungen --- */
  thunderstone: { form: 'stein', tausch: { A: '#e8d040', a: '#a89018' } },
  icestone: { form: 'stein', tausch: { A: '#a8dcf0', a: '#5898b8' } },
  moonstone: { form: 'stein', tausch: { A: '#6a7898', a: '#3a4460' } },
  firestone: { form: 'stein', tausch: { A: '#e05838', a: '#a02818' } },
  leafstone: { form: 'stein', tausch: { A: '#58b848', a: '#2a7828' } },
  waterstone: { form: 'stein', tausch: { A: '#4890d8', a: '#205898' } },
  galaricacuff: { form: 'reif', tausch: { A: '#a87848', a: '#684820' } },
  sunstone: { form: 'stein', tausch: { A: '#e88838', a: '#a85018' } },
  galaricawreath: { form: 'reif', tausch: { A: '#58a848', a: '#2a6828' } },
  shinystone: { form: 'stein', tausch: { A: '#f0e8a0', a: '#b0a860' } },
  duskstone: { form: 'stein', tausch: { A: '#6a4878', a: '#3a2448' } },
  dawnstone: { form: 'stein', tausch: { A: '#a8c8e8', a: '#5878a8' } },
  tartapple: { form: 'apfel', tausch: { A: '#68b048', a: '#3a7028' } },
  sweetapple: { form: 'apfel', tausch: { A: '#e04848', a: '#a02020' } },
  crackedpot: { form: 'kanne', tausch: { A: '#a86848', a: '#684020' } },
  auspiciousarmor: { form: 'weste', tausch: { A: '#e8c83c', a: '#a8801c', B: '#f0f0f8' } },
  maliciousarmor: { form: 'weste', tausch: { A: '#6a4878', a: '#3a2448', B: '#c84858' } },
  syrupyapple: { form: 'apfel', tausch: { A: '#d89838', a: '#986018' } },
  unremarkableteacup: { form: 'kanne', tausch: { A: '#e8e8f0', a: '#a0a8b8' } },
  metalalloy: { form: 'barren', tausch: { A: '#b8c0cc', a: '#707a88' } }
};
