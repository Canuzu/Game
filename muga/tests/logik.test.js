/* =============================================================================
 * logik.test.js — prüft Öffnungszeiten, Feiertage, freie Terminzeiten und
 * Versandkosten. Aufruf: node --test tests/
 * ========================================================================== */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { config, zeit, versandkosten, versandzone, laender, terminart } = require('../assets/js/config.js');

/* Zeitpunkt in Kölner Ortszeit; im Winter gilt +01:00, im Sommer +02:00 */
const winter = (datum, uhr) => new Date(datum + 'T' + uhr + ':00+01:00');
const sommer = (datum, uhr) => new Date(datum + 'T' + uhr + ':00+02:00');

test('Feiertage in NRW 2026 und 2027', () => {
  assert.equal(zeit.feiertag('2026-01-01'), 'Neujahr');
  assert.equal(zeit.feiertag('2026-04-03'), 'Karfreitag');
  assert.equal(zeit.feiertag('2026-04-06'), 'Ostermontag');
  assert.equal(zeit.feiertag('2026-05-01'), 'Tag der Arbeit');
  assert.equal(zeit.feiertag('2026-05-14'), 'Christi Himmelfahrt');
  assert.equal(zeit.feiertag('2026-05-25'), 'Pfingstmontag');
  assert.equal(zeit.feiertag('2026-06-04'), 'Fronleichnam');
  assert.equal(zeit.feiertag('2026-10-03'), 'Tag der Deutschen Einheit');
  assert.equal(zeit.feiertag('2026-11-01'), 'Allerheiligen');
  assert.equal(zeit.feiertag('2026-12-25'), '1. Weihnachtstag');
  assert.equal(zeit.feiertag('2026-12-26'), '2. Weihnachtstag');
  assert.equal(zeit.feiertag('2027-03-26'), 'Karfreitag');
  assert.equal(zeit.feiertag('2027-03-29'), 'Ostermontag');
  assert.equal(zeit.feiertag('2026-11-10'), null);
  assert.equal(zeit.feiertag('2026-10-31'), null, 'Reformationstag ist in NRW kein Feiertag');
});

test('Datumsrechnung', () => {
  assert.equal(zeit.plusTage('2026-12-31', 1), '2027-01-01');
  assert.equal(zeit.plusTage('2028-02-28', 1), '2028-02-29');
  assert.equal(zeit.plusTage('2026-03-29', -1), '2026-03-28');
  assert.equal(zeit.teile('2026-02-30'), null);
  assert.equal(zeit.teile('kein-datum'), null);
  assert.equal(zeit.teile('2026-11-10').wochentag, 2);
  assert.equal(zeit.datumLang('2026-11-10'), 'Dienstag, 10. November 2026');
  assert.equal(zeit.datumKurz('2026-11-10'), '10.11.2026');
  assert.equal(zeit.uhr(605), '10:05');
});

test('Kölner Zeit unabhängig von der Zeitzone des Rechners, auch in der Sommerzeit', () => {
  assert.deepEqual(zeit.jetzt(new Date('2026-11-10T08:30:00Z')), { datum: '2026-11-10', minuten: 570, wochentag: 2 });
  assert.deepEqual(zeit.jetzt(new Date('2026-07-07T08:30:00Z')), { datum: '2026-07-07', minuten: 630, wochentag: 2 });
  assert.deepEqual(zeit.jetzt(new Date('2026-12-31T23:30:00Z')), { datum: '2027-01-01', minuten: 30, wochentag: 5 });
});

test('Öffnungsabschnitte je Tag', () => {
  assert.deepEqual(zeit.abschnitte('2026-11-09'), [], 'Montag Ruhetag');
  assert.deepEqual(zeit.abschnitte('2026-11-10'), [[600, 1080]], 'Dienstag');
  assert.deepEqual(zeit.abschnitte('2026-11-13'), [[600, 720], [840, 1080]], 'Freitag mit Pause');
  assert.deepEqual(zeit.abschnitte('2026-11-14'), [[600, 1080]], 'Samstag');
  assert.deepEqual(zeit.abschnitte('2026-11-15'), [], 'Sonntag');
  assert.deepEqual(zeit.abschnitte('2026-12-25'), [], 'Feiertag am Freitag');
  assert.deepEqual(zeit.abschnitte('2026-05-14'), [], 'Feiertag am Donnerstag');
});

test('Öffnungsstatus', () => {
  let s = zeit.status(winter('2026-11-10', '09:15'));
  assert.equal(s.offen, false);
  assert.equal(s.text, 'öffnet heute um 10:00 Uhr');

  s = zeit.status(winter('2026-11-10', '10:00'));
  assert.equal(s.offen, true);
  assert.equal(s.text, 'bis 18:00 Uhr');

  s = zeit.status(winter('2026-11-10', '18:00'));
  assert.equal(s.offen, false);
  assert.equal(s.text, 'öffnet morgen um 10:00 Uhr');

  s = zeit.status(winter('2026-11-13', '11:30'));
  assert.equal(s.offen, true);
  assert.equal(s.text, 'bis 12:00 Uhr (Pause bis 14:00 Uhr)');

  s = zeit.status(winter('2026-11-13', '12:30'));
  assert.equal(s.offen, false);
  assert.equal(s.text, 'öffnet heute um 14:00 Uhr');

  s = zeit.status(winter('2026-11-14', '19:00'));
  assert.equal(s.offen, false);
  assert.equal(s.text, 'öffnet Dienstag um 10:00 Uhr', 'Sonntag und Montag werden übersprungen');

  s = zeit.status(sommer('2026-07-07', '17:59'));
  assert.equal(s.offen, true);

  s = zeit.status(winter('2026-12-24', '19:00'));
  assert.equal(s.text, 'öffnet Dienstag um 10:00 Uhr', 'Weihnachten, Sonntag und Montag werden übersprungen');
});

test('Freie Terminzeiten', () => {
  const frueh = winter('2026-11-09', '08:00');

  let z = zeit.startzeiten('2026-11-10', 60, [], frueh);
  assert.equal(z[0].uhr, '10:00');
  assert.equal(z[z.length - 1].uhr, '17:00', 'ein Termin von 60 Minuten endet spätestens um 18 Uhr');
  assert.equal(z.length, 15);
  assert.ok(z.every((s) => s.frei));

  z = zeit.startzeiten('2026-11-13', 90, [], frueh);
  assert.deepEqual(z.map((s) => s.uhr), ['10:00', '10:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'], 'die Pause am Freitag bleibt frei');

  assert.deepEqual(zeit.startzeiten('2026-11-09', 30, [], frueh), [], 'Montag');
  assert.deepEqual(zeit.startzeiten('2026-11-15', 30, [], frueh), [], 'Sonntag');
  assert.deepEqual(zeit.startzeiten('2026-12-25', 30, [], frueh), [], 'Feiertag');
  assert.deepEqual(zeit.startzeiten('2026-11-08', 30, [], frueh), [], 'Vergangenheit');
  assert.deepEqual(zeit.startzeiten(zeit.plusTage('2026-11-09', config.termin.wochenVoraus * 7 + 1), 30, [], frueh), [], 'zu weit in der Zukunft');
});

test('Vergebene Zeiten sperren alle überschneidenden Startzeiten', () => {
  const frueh = winter('2026-11-09', '08:00');
  const belegt = [{ start: 660, dauer: 90 }];           // 11:00 bis 12:30
  const z = zeit.startzeiten('2026-11-10', 60, belegt, frueh);
  const gesperrt = z.filter((s) => !s.frei).map((s) => s.uhr);
  assert.deepEqual(gesperrt, ['10:30', '11:00', '11:30', '12:00']);
  assert.equal(z.find((s) => s.uhr === '10:00').frei, true, '10:00 bis 11:00 grenzt nur an');
  assert.equal(z.find((s) => s.uhr === '12:30').frei, true, '12:30 beginnt genau am Ende');
});

test('Vorlauf: frühestens drei Stunden im Voraus', () => {
  let z = zeit.startzeiten('2026-11-10', 30, [], winter('2026-11-10', '09:40'));
  assert.equal(z[0].uhr, '13:00');
  z = zeit.startzeiten('2026-11-10', 60, [], winter('2026-11-10', '14:10'));
  assert.deepEqual(z, [], 'nach 14 Uhr passt heute kein Termin von 60 Minuten mehr');
  z = zeit.startzeiten('2026-11-11', 30, [], winter('2026-11-10', '23:30'));
  assert.equal(z[0].uhr, '10:00', 'der Vorlauf reicht nachts nur bis 2:30 Uhr');
});

test('Terminarten', () => {
  assert.equal(terminart('hochzeit').dauer, 90);
  assert.equal(terminart('gibt-es-nicht'), null);
  config.termin.arten.forEach((a) => assert.equal(a.dauer % config.termin.raster, 0, a.id + ' passt ins Raster'));
});

test('Versandkosten nach Land und Bestellwert', () => {
  assert.equal(versandkosten('Deutschland', 4.99), 3.9);
  assert.equal(versandkosten('Deutschland', 5), 3.9);
  assert.equal(versandkosten('Deutschland', 5.01), 4.5);
  assert.equal(versandkosten('Deutschland', 20), 4.5);
  assert.equal(versandkosten('Deutschland', 20.01), 5.9);
  assert.equal(versandkosten('Deutschland', 50), 5.9);
  assert.equal(versandkosten('Deutschland', 50.01), 0);
  assert.equal(versandkosten('Deutschland', 499.9), 0);
  assert.equal(versandkosten('Österreich', 499.9), 19.9);
  assert.equal(versandkosten('Spanien', 499.9), 35.9);
  assert.equal(versandkosten('Spanien (Balearen und Kanaren)', 499.9), 40);
  assert.equal(versandkosten('Schweiz', 30), 35);
  assert.equal(versandkosten('Anderes Land', 499.9), 60);
  assert.equal(versandzone('Unbekanntes Land').id, 'welt');
  assert.equal(new Set(laender()).size, laender().length, 'kein Land steht doppelt in der Liste');
});
