/* Café Pausenbrot: alles, was sich im Alltag ändern kann, steht hier.
 * Die Seite und die Tests lesen dieselbe Datei.
 *
 * Quellen: Kreidetafel im Café (Preise), Google-Eintrag (Öffnungszeiten,
 * Adresse, Telefon), Fotos aus dem Café (Theke, Frühstück, Catering). */
(function (wurzel) {
  'use strict';

  var CAFE = {
    name: 'Café Pausenbrot',
    strasse: 'Rolandstraße 8',
    plz: '50677',
    ort: 'Köln',
    viertel: 'Südstadt',
    telefon: '0177 321 61 70',
    telefonLink: '+491773216170',
    whatsapp: '491773216170',
    instagram: 'https://www.instagram.com/cafepausenbrot/',
    google: 'https://www.google.com/maps/place/Caf%C3%A9+Pausenbrot/@50.9187949,6.9554461,17z/data=!3m1!4b1!4m6!3m5!1s0x47bf2445dd55db31:0x7a3facaa1911a000!8m2!3d50.9187949!4d6.958021!16s%2Fg%2F11cs1wg5jg',
    tooGoodToGo: 'https://www.toogoodtogo.com/de/find/koln/cafepausenbrot/meal/uberraschungstuteklein-62527620566763904',
    geo: { lat: 50.9187949, lon: 6.958021 },
    zeitzone: 'Europe/Berlin',

    /* Öffnungszeiten in Minuten ab Mitternacht, Index 0 = Sonntag.
     * Laut Google an allen sieben Tagen von 8 bis 18 Uhr. */
    zeiten: { 0: [480, 1080], 1: [480, 1080], 2: [480, 1080], 3: [480, 1080], 4: [480, 1080], 5: [480, 1080], 6: [480, 1080] },

    /* Abholen: frühestens so viele Minuten nach der Bestellung, im Takt von … Minuten */
    abholung: { vorlauf: 30, takt: 15, tageVoraus: 6 },
    /* Tisch: Startzeiten im Takt von … Minuten, spätestens … Minuten vor Schluss */
    tisch: { takt: 30, vorSchluss: 60, vorlauf: 60, tageVoraus: 60, maxPersonen: 30, grosseGruppe: 12 },

    /* Was gerade an der Tafel steht. Leer lassen, wenn es nichts Besonderes gibt.
     * Beispiel: tagesangebot: { text: 'Linseneintopf mit Fladenbrot', preis: 6.5 } */
    tagesangebot: null
  };

  /* Die Tafel, so wie sie im Café hängt. ab = Preis ist ein Mindestpreis.
   * extra: Zuschläge, die man beim Vorbestellen wählen kann. */
  var KARTE = [
    {
      id: 'broetchen', titel: 'Brötchen & mehr',
      notiz: 'mit Salat +0,20',
      posten: [
        { id: 'b-kaese', name: 'Käse', preis: 2.6, extra: ['salat'] },
        { id: 'b-camembert', name: 'Camembert', preis: 2.8, extra: ['salat'] },
        { id: 'b-tomoz', name: 'Tomate-Mozzarella', preis: 2.9, extra: ['salat'] },
        { id: 'b-salami', name: 'Salami', preis: 2.8, extra: ['salat'] },
        { id: 'b-pute', name: 'Putenbrust', preis: 2.8, extra: ['salat'] },
        { id: 'b-lachs', name: 'Lachs', preis: 3.8, extra: ['salat'] },
        { id: 'b-ei', name: 'Ei', preis: 2.7, extra: ['salat'] },
        { id: 'b-ruehrei', name: 'Rührei', preis: 3.2, extra: ['salat'] },
        { id: 'b-fleischwurst', name: 'Fleischwurst', preis: 2.9, extra: ['salat'] }
      ]
    },
    {
      id: 'brote', titel: 'Wraps, Baguette, Fladen',
      posten: [
        { id: 'w-wrap', name: 'Wrap', preis: 4.9, ab: true },
        { id: 'w-baguette', name: 'Baguette', preis: 4.5, ab: true },
        { id: 'w-baguette-lachs', name: 'Baguette mit Lachs', preis: 5.9 },
        { id: 'w-ciabatta', name: 'Ciabatta', preis: 4.9 },
        { id: 'w-fladen', name: 'Fladenbrot', preis: 3.9 },
        { id: 'w-fladen-falafel', name: 'Fladenbrot mit Falafel und Salat', preis: 5.9 },
        { id: 'w-american', name: 'American Sandwich', preis: 3.9 }
      ]
    },
    {
      id: 'warmes', titel: 'Warmes & mehr',
      notiz: 'was heute drin ist, steht in der Theke',
      posten: [
        { id: 'k-eintopf', name: 'Eintopf', preis: 6.5, ab: true },
        { id: 'k-suppe', name: 'Suppe', preis: 5.5, ab: true },
        { id: 'k-tortellini', name: 'Tortellini', preis: 8.9 },
        { id: 'k-quiche', name: 'Quiche', preis: 5.5 },
        { id: 'k-salat1', name: 'Ein Salat aus der Theke', preis: 4.5, ab: true },
        { id: 'k-salat3', name: 'Drei Salate aus der Theke', preis: 8.9 },
        { id: 'k-quiche-salat', name: 'Quiche und ein Salat', preis: 7.9 }
      ]
    },
    {
      id: 'getraenke', titel: 'Getränke',
      notiz: 'Kaffee von Schamong, Köln-Ehrenfeld',
      posten: [
        { id: 'g-espresso', name: 'Espresso', preis: 2.1, doppelt: 2.7 },
        { id: 'g-emacchiato', name: 'Espresso macchiato', preis: 2.2 },
        { id: 'g-cortado', name: 'Cortado', preis: 2.4, extra: ['milch'] },
        { id: 'g-crema', name: 'Café Crema', preis: 2.3, doppelt: 2.9 },
        { id: 'g-cappuccino', name: 'Cappuccino', preis: 2.5, extra: ['milch'] },
        { id: 'g-milchkaffee', name: 'Milchkaffee', preis: 3.0, extra: ['milch'] },
        { id: 'g-latte', name: 'Latte macchiato', preis: 3.3, extra: ['milch'] },
        { id: 'g-kakao', name: 'Kakao', preis: 2.9, extra: ['milch'] },
        { id: 'g-tee', name: 'Tee', preis: 2.2 },
        { id: 'g-frischtee', name: 'Frischer Tee', preis: 3.2, ab: true }
      ]
    }
  ];

  var EXTRAS = {
    salat: { name: 'mit Salat', preis: 0.2 },
    milch: { name: 'mit alternativer Milch', preis: 0.3 },
    doppelt: { name: 'doppelt' }
  };

  /* Beschriftungen auf dem Foto der Theke, in Prozent der Bildbreite und -höhe.
   * Gilt nur für dieses Foto: Die Theke wechselt jeden Tag. */
  var THEKE = [
    { x: 9, y: 31, name: 'Brownies' },
    { x: 34, y: 37, name: 'Wassermelone mit Feta' },
    { x: 50.5, y: 38.5, name: 'Quiche' },
    { x: 21, y: 47, name: 'Linsensalat' },
    { x: 37, y: 50, name: 'Kichererbsen-Eintopf' },
    { x: 63, y: 48, name: 'Gegrilltes Gemüse' },
    { x: 90, y: 46, name: 'Falafel' },
    { x: 49, y: 60, name: 'Krautsalat' },
    { x: 77, y: 57, name: 'Schnitzel mit Zitrone' },
    { x: 60, y: 66, name: 'Tomate, Rucola, Gurke' },
    { x: 82, y: 79, name: 'Bohnensalat' }
  ];

  /* ---------- Zeit, immer in Kölner Zeit ------------------------------------ */

  var TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  function zwei(n) { return (n < 10 ? '0' : '') + n; }
  function uhr(min) { return zwei(Math.floor(min / 60)) + ':' + zwei(min % 60); }
  function uhrKurz(min) { return min % 60 ? uhr(min) : String(Math.floor(min / 60)); }

  function teile(datum) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datum));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCMonth() !== +m[2] - 1) return null;
    return { jahr: +m[1], monat: +m[2], tag: +m[3], wochentag: d.getUTCDay() };
  }
  function plusTage(datum, n) {
    var t = teile(datum), d = new Date(Date.UTC(t.jahr, t.monat - 1, t.tag + n));
    return d.getUTCFullYear() + '-' + zwei(d.getUTCMonth() + 1) + '-' + zwei(d.getUTCDate());
  }
  function jetzt(zeitpunkt) {
    var w = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: CAFE.zeitzone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(zeitpunkt || new Date()).forEach(function (p) { w[p.type] = p.value; });
    var datum = w.year + '-' + w.month + '-' + w.day;
    return { datum: datum, minuten: (+w.hour % 24) * 60 + (+w.minute), wochentag: teile(datum).wochentag };
  }
  function datumLang(datum) { var t = teile(datum); return TAGE[t.wochentag] + ', ' + t.tag + '. ' + MONATE[t.monat - 1]; }

  /* Ist offen? Liefert eine kurze Zeile für das Türschild und eine längere. */
  function status(zeitpunkt) {
    var j = jetzt(zeitpunkt), heute = CAFE.zeiten[j.wochentag];
    if (heute && j.minuten >= heute[0] && j.minuten < heute[1]) {
      var rest = heute[1] - j.minuten;
      return { offen: true, schild: 'Offen', text: rest <= 45 ? 'noch ' + rest + ' Minuten' : 'bis ' + uhrKurz(heute[1]) + ' Uhr' };
    }
    if (heute && j.minuten < heute[0]) return { offen: false, schild: 'Geschlossen', text: 'ab ' + uhrKurz(heute[0]) + ' Uhr' };
    for (var n = 1; n <= 7; n++) {
      var t = teile(plusTage(j.datum, n)), z = CAFE.zeiten[t.wochentag];
      if (z) return { offen: false, schild: 'Geschlossen', text: (n === 1 ? 'morgen' : TAGE[t.wochentag]) + ' ab ' + uhrKurz(z[0]) + ' Uhr' };
    }
    return { offen: false, schild: 'Geschlossen', text: '' };
  }

  /* Abholzeiten für einen Tag: ab Öffnung + Takt bis eine Viertelstunde vor Schluss */
  function abholzeiten(datum, zeitpunkt) {
    var j = jetzt(zeitpunkt), t = teile(datum), z = t && CAFE.zeiten[t.wochentag], a = CAFE.abholung, aus = [];
    if (!z || datum < j.datum || datum > plusTage(j.datum, a.tageVoraus)) return aus;
    var frueh = datum === j.datum ? j.minuten + a.vorlauf : -1;
    for (var m = z[0] + a.takt; m <= z[1] - a.takt; m += a.takt) if (m >= frueh) aus.push(m);
    return aus;
  }

  /* Startzeiten für einen Tisch */
  function tischzeiten(datum, zeitpunkt) {
    var j = jetzt(zeitpunkt), t = teile(datum), z = t && CAFE.zeiten[t.wochentag], c = CAFE.tisch, aus = [];
    if (!z || datum < j.datum || datum > plusTage(j.datum, c.tageVoraus)) return aus;
    var frueh = datum === j.datum ? j.minuten + c.vorlauf : -1;
    for (var m = z[0]; m <= z[1] - c.vorSchluss; m += c.takt) if (m >= frueh) aus.push(m);
    return aus;
  }

  /* ---------- Bestellzettel -------------------------------------------------- */

  var nachId = {};
  KARTE.forEach(function (g) { g.posten.forEach(function (p) { p.gruppe = g.id; nachId[p.id] = p; }); });

  function postenPreis(p, wahl) {
    wahl = wahl || {};
    var preis = wahl.doppelt && p.doppelt ? p.doppelt : p.preis;
    (p.extra || []).forEach(function (e) { if (wahl[e]) preis += EXTRAS[e].preis; });
    return Math.round(preis * 100) / 100;
  }
  function zeilenName(p, wahl) {
    var zusatz = [];
    if (wahl && wahl.doppelt && p.doppelt) zusatz.push('doppelt');
    (p.extra || []).forEach(function (e) { if (wahl && wahl[e]) zusatz.push(EXTRAS[e].name); });
    return p.name + (zusatz.length ? ' (' + zusatz.join(', ') + ')' : '');
  }
  /* Zettel: [{ id, menge, wahl }] → Zeilen mit Preis und Summe */
  function rechne(zettel) {
    var zeilen = [], summe = 0, ab = false;
    (zettel || []).forEach(function (z) {
      var p = nachId[z.id];
      if (!p || !(z.menge > 0)) return;
      var einzel = postenPreis(p, z.wahl), gesamt = Math.round(einzel * z.menge * 100) / 100;
      if (p.ab) ab = true;
      summe += gesamt;
      zeilen.push({ id: p.id, name: zeilenName(p, z.wahl), menge: z.menge, einzel: einzel, gesamt: gesamt, ab: !!p.ab });
    });
    return { zeilen: zeilen, summe: Math.round(summe * 100) / 100, ab: ab };
  }

  function geld(b) { return b.toFixed(2).replace('.', ',') + ' €'; }

  var api = {
    CAFE: CAFE, KARTE: KARTE, EXTRAS: EXTRAS, THEKE: THEKE, TAGE: TAGE, MONATE: MONATE,
    uhr: uhr, uhrKurz: uhrKurz, teile: teile, plusTage: plusTage, jetzt: jetzt, datumLang: datumLang,
    status: status, abholzeiten: abholzeiten, tischzeiten: tischzeiten,
    posten: function (id) { return nachId[id] || null; }, postenPreis: postenPreis, rechne: rechne, geld: geld
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { wurzel.PB = wurzel.PB || {}; for (var k in api) wurzel.PB[k] = api[k]; }
})(typeof window !== 'undefined' ? window : globalThis);
