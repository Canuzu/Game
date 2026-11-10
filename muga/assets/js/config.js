/* =============================================================================
 * config.js — Geschäftsdaten an einer Stelle
 * -----------------------------------------------------------------------------
 * Alles, was sich im Alltag ändern kann (Öffnungszeiten, Telefonnummer,
 * Terminarten, Versandkosten), steht hier und nirgends sonst. Der Server liest
 * dieselbe Datei, damit Browser und Server nie auseinanderlaufen.
 *
 * Quelle der Angaben: www.mmuga.de (Impressum, Anfahrt, Zahlung und Versand).
 * ========================================================================== */
(function (wurzel) {
  'use strict';

  var CONFIG = {
    firma: 'Muga Company GmbH',
    marke: 'MUGA',
    leitspruch: 'Muga macht Mode',
    geschaeftsfuehrer: 'Gazi Koc',
    strasse: 'Olpener Str. 321',
    plz: '51109',
    ort: 'Köln',
    stadtteil: 'Merheim',
    telefon: '0221 839 25 90',
    telefonLink: '+492218392590',
    mobil: '0177 705 08 62',
    mobilLink: '+491777050862',
    fax: '0221 839 25 92',
    email: 'info@mmuga.de',
    geo: { lat: 50.94147, lon: 7.04094 },
    register: 'Amtsgericht Köln, HRB 57452',
    ustId: 'DE 814723726',
    bank: {
      inhaber: 'Muga Company GmbH',
      institut: 'Volksbank Rhein-Erft-Köln eG',
      iban: 'DE29 3706 2365 4605 9500 06',
      bic: 'GENODED1FHH'
    },
    sozial: [
      { name: 'Instagram', url: 'https://www.instagram.com/herrenausstatterkoeln/' },
      { name: 'Facebook', url: 'https://www.facebook.com/mmuga.koeln/' },
      { name: 'YouTube', url: 'https://www.youtube.com/channel/UCGmMYWAGSClawgZyiAJ3KQA' },
      { name: 'Pinterest', url: 'https://www.pinterest.de/mmugade/' }
    ],
    bewertungen: 'https://g.co/kgs/cwyHBTW',

    /* Öffnungszeiten in Minuten ab Mitternacht, Index 0 = Sonntag.
     * Montag Ruhetag, freitags Pause von 12 bis 14 Uhr. */
    zeiten: {
      0: [],
      1: [],
      2: [[600, 1080]],
      3: [[600, 1080]],
      4: [[600, 1080]],
      5: [[600, 720], [840, 1080]],
      6: [[600, 1080]]
    },
    zeitzone: 'Europe/Berlin',

    /* Terminbuchung */
    termin: {
      raster: 30,            // Abstand der Startzeiten in Minuten
      vorlaufStunden: 3,     // frühestens so viele Stunden im Voraus
      wochenVoraus: 12,      // so weit in die Zukunft buchbar
      gleichzeitig: 1,       // Termine, die sich überschneiden dürfen
      arten: [
        {
          id: 'hochzeit',
          name: 'Hochzeitsberatung',
          dauer: 90,
          kurz: 'Für Bräutigam, Trauzeugen und Brautvater',
          text: 'Wir nehmen uns Zeit: Stil, Farbe und Passform für den großen Tag, auf Wunsch gleich mit Weste, Hemd und Schuhen.'
        },
        {
          id: 'beratung',
          name: 'Anzugberatung',
          dauer: 60,
          kurz: 'Business, Abiball, Fest und Feier',
          text: 'Sie suchen einen Anzug für einen bestimmten Anlass oder den Alltag. Wir zeigen Ihnen passende Schnitte in Ihrer Größe.'
        },
        {
          id: 'anprobe',
          name: 'Anprobe',
          dauer: 30,
          kurz: 'Online gesehen, im Geschäft anprobiert',
          text: 'Sie haben im Shop etwas entdeckt. Wir legen die Teile in Ihrer Größe bereit, damit Sie in Ruhe anprobieren können.'
        },
        {
          id: 'abholung',
          name: 'Abholung',
          dauer: 30,
          kurz: 'Bestellung im Geschäft abholen',
          text: 'Sie holen Ihre Bestellung bei uns ab. Barzahlung ist bei Selbstabholung möglich.'
        }
      ]
    },

    /* Versandkosten nach Bestellwert (Stufen: bis 5 €, bis 20 €, bis 50 €, darüber) */
    versand: {
      freiAb: 50.01,
      stufen: [5, 20, 50],
      zonen: [
        { id: 'de', name: 'Deutschland (ohne Inseln)', kosten: [3.9, 4.5, 5.9, 0],
          laender: ['Deutschland'] },
        { id: 'eu1', name: 'Zone 1', kosten: [9.9, 15.9, 17.9, 19.9],
          laender: ['Österreich', 'Frankreich', 'Dänemark', 'Tschechien', 'Italien'] },
        { id: 'eu2', name: 'Zone 2', kosten: [11.9, 15.9, 17.9, 35.9],
          laender: ['Großbritannien', 'Malta', 'Litauen', 'Estland', 'Lettland', 'Norwegen', 'Portugal', 'Spanien', 'Irland', 'Finnland'] },
        { id: 'eu3', name: 'Zone 3', kosten: [17, 30, 35, 40],
          laender: ['Ungarn', 'Slowakei', 'Slowenien', 'Polen', 'Schweden', 'Schweiz', 'Griechenland', 'Zypern'] },
        { id: 'welt', name: 'Rest der Welt', kosten: [25, 40, 50, 60],
          laender: ['Anderes Land'] }
      ]
    },

    zahlarten: [
      { id: 'paypal', name: 'PayPal', text: 'Auch mit Lastschrift oder Kreditkarte über PayPal.' },
      { id: 'vorkasse', name: 'Vorkasse', text: 'Per Banküberweisung. Der Versand erfolgt nach Zahlungseingang.' },
      { id: 'bar', name: 'Barzahlung', text: 'Nur bei Selbstabholung im Kölner Geschäft.', nurAbholung: true }
    ]
  };

  /* ---------- Datum und Uhrzeit, immer in Kölner Zeit ---------------------- */

  var WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  function zwei(n) { return (n < 10 ? '0' : '') + n; }

  /* Datum als "2026-11-10" */
  function iso(jahr, monat, tag) { return jahr + '-' + zwei(monat) + '-' + zwei(tag); }

  /* Zerlegt "2026-11-10" in Zahlen; ungültige Eingaben ergeben null. */
  function teile(datum) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datum));
    if (!m) return null;
    var j = +m[1], mo = +m[2], t = +m[3];
    var d = new Date(Date.UTC(j, mo - 1, t));
    if (d.getUTCFullYear() !== j || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== t) return null;
    return { jahr: j, monat: mo, tag: t, wochentag: d.getUTCDay() };
  }

  /* Rechnet mit Kalendertagen, unabhängig von Zeitzone und Sommerzeit. */
  function plusTage(datum, n) {
    var t = teile(datum);
    var d = new Date(Date.UTC(t.jahr, t.monat - 1, t.tag + n));
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  /* Aktuelle Zeit in Köln: { datum, minuten, wochentag } */
  function jetzt(zeitpunkt) {
    var d = zeitpunkt || new Date();
    var f = new Intl.DateTimeFormat('en-CA', {
      timeZone: CONFIG.zeitzone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(d);
    var w = {};
    f.forEach(function (p) { w[p.type] = p.value; });
    var datum = w.year + '-' + w.month + '-' + w.day;
    return { datum: datum, minuten: (+w.hour % 24) * 60 + (+w.minute), wochentag: teile(datum).wochentag };
  }

  /* Ostersonntag nach Gauß, als Date in UTC */
  function ostern(jahr) {
    var a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
    return iso(jahr, monat, tag);
  }

  /* Gesetzliche Feiertage in Nordrhein-Westfalen */
  var feiertagsSpeicher = {};
  function feiertage(jahr) {
    if (feiertagsSpeicher[jahr]) return feiertagsSpeicher[jahr];
    var o = ostern(jahr), liste = {};
    liste[iso(jahr, 1, 1)] = 'Neujahr';
    liste[plusTage(o, -2)] = 'Karfreitag';
    liste[plusTage(o, 1)] = 'Ostermontag';
    liste[iso(jahr, 5, 1)] = 'Tag der Arbeit';
    liste[plusTage(o, 39)] = 'Christi Himmelfahrt';
    liste[plusTage(o, 50)] = 'Pfingstmontag';
    liste[plusTage(o, 60)] = 'Fronleichnam';
    liste[iso(jahr, 10, 3)] = 'Tag der Deutschen Einheit';
    liste[iso(jahr, 11, 1)] = 'Allerheiligen';
    liste[iso(jahr, 12, 25)] = '1. Weihnachtstag';
    liste[iso(jahr, 12, 26)] = '2. Weihnachtstag';
    feiertagsSpeicher[jahr] = liste;
    return liste;
  }

  function feiertag(datum) {
    var t = teile(datum);
    return t ? (feiertage(t.jahr)[datum] || null) : null;
  }

  /* Öffnungsabschnitte eines Tages als [[von, bis], …] in Minuten */
  function abschnitte(datum) {
    var t = teile(datum);
    if (!t || feiertag(datum)) return [];
    return CONFIG.zeiten[t.wochentag] || [];
  }

  function uhr(minuten) { return zwei(Math.floor(minuten / 60)) + ':' + zwei(minuten % 60); }

  /* Ist gerade geöffnet? Liefert Text für die Anzeige. */
  function status(zeitpunkt) {
    var j = jetzt(zeitpunkt), heute = abschnitte(j.datum), i;
    for (i = 0; i < heute.length; i++) {
      if (j.minuten >= heute[i][0] && j.minuten < heute[i][1]) {
        var pause = heute[i + 1] ? ' (Pause bis ' + uhr(heute[i + 1][0]) + ' Uhr)' : '';
        return { offen: true, kurz: 'Jetzt geöffnet', text: 'bis ' + uhr(heute[i][1]) + ' Uhr' + pause };
      }
    }
    for (i = 0; i < heute.length; i++) {
      if (j.minuten < heute[i][0]) {
        return { offen: false, kurz: 'Gerade geschlossen', text: 'öffnet heute um ' + uhr(heute[i][0]) + ' Uhr' };
      }
    }
    for (var n = 1; n <= 14; n++) {
      var tag = plusTage(j.datum, n), ab = abschnitte(tag);
      if (ab.length) {
        var wann = n === 1 ? 'morgen' : WOCHENTAGE[teile(tag).wochentag];
        return { offen: false, kurz: 'Gerade geschlossen', text: 'öffnet ' + wann + ' um ' + uhr(ab[0][0]) + ' Uhr' };
      }
    }
    return { offen: false, kurz: 'Gerade geschlossen', text: '' };
  }

  /* Mögliche Startzeiten eines Tages für eine Terminart.
   * belegt: [{ start, dauer }] bereits vergebener Termine dieses Tages. */
  function startzeiten(datum, dauer, belegt, zeitpunkt) {
    var j = jetzt(zeitpunkt), frei = [], t = CONFIG.termin;
    var letzter = plusTage(j.datum, t.wochenVoraus * 7);
    if (datum < j.datum || datum > letzter) return frei;
    var fruehestens = datum === j.datum ? j.minuten + t.vorlaufStunden * 60 : -1;
    /* Vorlauf über Mitternacht hinaus: Reicht er in den Folgetag, zählt er dort weiter. */
    if (datum === plusTage(j.datum, 1)) fruehestens = j.minuten + t.vorlaufStunden * 60 - 1440;
    abschnitte(datum).forEach(function (ab) {
      for (var s = ab[0]; s + dauer <= ab[1]; s += t.raster) {
        if (s < fruehestens) continue;
        var kollisionen = (belegt || []).filter(function (b) {
          return s < b.start + b.dauer && b.start < s + dauer;
        }).length;
        frei.push({ start: s, uhr: uhr(s), frei: kollisionen < t.gleichzeitig });
      }
    });
    return frei;
  }

  function terminart(id) {
    return CONFIG.termin.arten.filter(function (a) { return a.id === id; })[0] || null;
  }

  /* Versandkosten für Land und Warenwert */
  function versandzone(land) {
    var z = CONFIG.versand.zonen;
    for (var i = 0; i < z.length; i++) if (z[i].laender.indexOf(land) !== -1) return z[i];
    return z[z.length - 1];
  }
  function versandkosten(land, warenwert) {
    var zone = versandzone(land), s = CONFIG.versand.stufen, i = 0;
    while (i < s.length && warenwert > s[i]) i++;
    return zone.kosten[i];
  }
  function laender() {
    var alle = [];
    CONFIG.versand.zonen.forEach(function (z) { alle = alle.concat(z.laender); });
    return alle;
  }

  function datumLang(datum) {
    var t = teile(datum);
    return WOCHENTAGE[t.wochentag] + ', ' + t.tag + '. ' + MONATE[t.monat - 1] + ' ' + t.jahr;
  }
  function datumKurz(datum) {
    var t = teile(datum);
    return zwei(t.tag) + '.' + zwei(t.monat) + '.' + t.jahr;
  }

  var ZEIT = {
    WOCHENTAGE: WOCHENTAGE, MONATE: MONATE,
    iso: iso, teile: teile, plusTage: plusTage, jetzt: jetzt, uhr: uhr,
    feiertag: feiertag, abschnitte: abschnitte, status: status,
    startzeiten: startzeiten, datumLang: datumLang, datumKurz: datumKurz
  };

  var api = {
    config: CONFIG, zeit: ZEIT, terminart: terminart,
    versandzone: versandzone, versandkosten: versandkosten, laender: laender
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    wurzel.MUGA = wurzel.MUGA || {};
    for (var k in api) wurzel.MUGA[k] = api[k];
  }
})(typeof window !== 'undefined' ? window : globalThis);
