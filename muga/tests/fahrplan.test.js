/* =============================================================================
 * fahrplan.test.js — prüft den Hochzeits-Fahrplan: Abstände, geöffnete Tage,
 * knappe Zeit, Buchbarkeit und die Kalenderdatei. Aufruf: node --test tests/
 * ========================================================================== */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../assets/js/config.js');

/* fahrplan.js ist für den Browser geschrieben. Für den Test bekommt es das Nötigste
 * von dem, was dort die anderen Dateien bereitstellen. */
global.window = { MUGA: Object.assign({}, api, { bereit() {}, speicher: { lies: () => null, schreib() {}, weg() {} } }) };
require('../assets/js/fahrplan.js');
const F = global.window.MUGA.fahrplan;
const { zeit, config } = api;

const HEUTE = '2026-11-10';   // ein Dienstag

test('Fahrplan weit im Voraus: vier Schritte in den empfohlenen Abständen', () => {
  const plan = F.plane('2027-05-29', HEUTE);
  assert.equal(plan.tage, 200);
  assert.equal(plan.knapp, false);
  assert.deepEqual(plan.schritte.map((s) => s.id), ['beratung', 'anprobe', 'beiwerk', 'abholung']);
  assert.deepEqual(plan.schritte.map((s) => s.datum), ['2027-03-06', '2027-04-17', '2027-05-08', '2027-05-22']);
  assert.ok(plan.schritte.every((s) => !s.eilig && !s.buchbar), 'liegt jenseits der Buchungsfrist');
  assert.equal(plan.schritte[0].buchbarAb, '2026-12-12', 'zwölf Wochen vor dem Schritt öffnet die Buchung');
});

test('Fahrplan: Schritte fallen nie auf Ruhetage oder Feiertage', () => {
  /* zwölf Wochen vor Montag, 7. Juni 2027 wäre ein Montag: Es gilt der Samstag davor */
  assert.equal(F.plane('2027-06-07', HEUTE).schritte[0].datum, '2027-03-13');
  /* eine Woche vor dem 8. Mai 2027 ist der 1. Mai, ein Feiertag: Es gilt der Freitag davor */
  const plan = F.plane('2027-05-08', HEUTE);
  assert.equal(plan.schritte[plan.schritte.length - 1].datum, '2027-04-30');
});

test('Fahrplan: buchbar ist, was in der Buchungsfrist liegt', () => {
  const plan = F.plane('2027-02-20', HEUTE);
  assert.deepEqual(plan.schritte.map((s) => s.buchbar), [true, true, true, false]);
  assert.equal(plan.schritte[0].datum, '2026-11-28');
  assert.equal(plan.schritte[0].art, 'hochzeit');
  assert.equal(plan.schritte[3].buchbarAb, '2026-11-21');
});

test('Fahrplan bei knapper Zeit: Schritte werden zusammengelegt', () => {
  const plan = F.plane('2026-11-21', HEUTE);
  assert.equal(plan.knapp, true);
  assert.equal(plan.schritte.length, 2);
  assert.equal(plan.schritte[0].name, 'Beratung, Anprobe und Feinschliff');
  assert.equal(plan.schritte[0].datum, '2026-11-11', 'so bald wie möglich: morgen');
  assert.equal(plan.schritte[0].eilig, true);
  assert.equal(plan.schritte[1].name, 'Abholung');
  assert.equal(plan.schritte[1].datum, '2026-11-14');
  assert.equal(plan.schritte[1].eilig, false);
});

test('Fahrplan: Hochzeit schon morgen lässt keinen Schritt mehr zu', () => {
  const plan = F.plane('2026-11-11', HEUTE);
  assert.equal(plan.tage, 1);
  assert.equal(plan.schritte.length, 0);
});

test('Fahrplan: für jeden Hochzeitstag eines Jahres geordnet, geöffnet und vor der Hochzeit', () => {
  const morgen = zeit.plusTage(HEUTE, 1);
  for (let n = 2; n <= 400; n++) {
    const hochzeit = zeit.plusTage(HEUTE, n), plan = F.plane(hochzeit, HEUTE);
    let vorher = '';
    for (const s of plan.schritte) {
      assert.ok(zeit.abschnitte(s.datum).length > 0, hochzeit + ': ' + s.datum + ' ist kein geöffneter Tag');
      assert.ok(s.datum >= morgen && s.datum < hochzeit, hochzeit + ': ' + s.datum + ' liegt außerhalb');
      assert.ok(s.datum > vorher, hochzeit + ': Reihenfolge');
      assert.ok(config.termin.arten.some((a) => a.id === s.art), 'Terminart ' + s.art + ' gibt es');
      vorher = s.datum;
    }
    assert.ok(plan.schritte.length >= 1, hochzeit + ': mindestens ein Schritt');
  }
});

test('Tage bis zur Hochzeit, auch über die Zeitumstellung hinweg', () => {
  assert.equal(F.tageBis('2026-11-10', HEUTE), 0);
  assert.equal(F.tageBis('2027-04-10', HEUTE), 151);
  assert.equal(F.tageBis('2027-11-10', HEUTE), 365);
});

test('Kalenderdatei des Fahrplans', () => {
  const plan = F.plane('2027-05-29', HEUTE), ics = F.ics(plan);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 4);
  assert.equal((ics.match(/END:VEVENT/g) || []).length, 4);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20270306\r\nDTEND;VALUE=DATE:20270307'), 'ganztägig, Ende am Folgetag');
  assert.ok(ics.includes('UID:fahrplan-beratung-2027-05-29@mmuga.de'));
  for (const zeile of ics.split('\r\n')) {
    assert.ok(Buffer.byteLength(zeile, 'utf8') <= 75, 'Zeile zu lang: ' + zeile);
  }
  assert.ok(!/\n/.test(ics.replace(/\r\n/g, '')), 'nur Zeilenenden nach Standard');
});
