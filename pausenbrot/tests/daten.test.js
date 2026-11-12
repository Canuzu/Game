/* Prüft Öffnungsstatus, Abhol- und Tischzeiten und den Bestellzettel. Aufruf: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const PB = require('../assets/js/daten.js');

const winter = (datum, uhr) => new Date(datum + 'T' + uhr + ':00+01:00');

test('Öffnungsstatus', () => {
  assert.deepEqual(PB.status(winter('2026-11-12', '07:30')), { offen: false, schild: 'Geschlossen', text: 'ab 8 Uhr' });
  assert.equal(PB.status(winter('2026-11-12', '08:00')).offen, true);
  assert.equal(PB.status(winter('2026-11-12', '12:00')).text, 'bis 18 Uhr');
  assert.equal(PB.status(winter('2026-11-12', '17:30')).text, 'noch 30 Minuten');
  assert.deepEqual(PB.status(winter('2026-11-12', '18:00')), { offen: false, schild: 'Geschlossen', text: 'morgen ab 8 Uhr' });
  assert.equal(PB.status(winter('2026-11-15', '10:00')).offen, true, 'auch sonntags');
});

test('Kölner Zeit, auch in der Sommerzeit', () => {
  assert.equal(PB.jetzt(new Date('2026-07-01T06:30:00Z')).minuten, 8 * 60 + 30);
});

test('Abholzeiten', () => {
  const jetzt = winter('2026-11-12', '09:10');
  const heute = PB.abholzeiten('2026-11-12', jetzt);
  assert.equal(PB.uhr(heute[0]), '09:45', 'frühestens 30 Minuten nach der Bestellung, im Viertelstundentakt');
  assert.equal(PB.uhr(heute[heute.length - 1]), '17:45');
  assert.equal(PB.uhr(PB.abholzeiten('2026-11-13', jetzt)[0]), '08:15');
  assert.deepEqual(PB.abholzeiten('2026-11-11', jetzt), [], 'nicht in der Vergangenheit');
  assert.deepEqual(PB.abholzeiten('2026-11-30', jetzt), [], 'nicht zu weit voraus');
  assert.deepEqual(PB.abholzeiten('2026-11-12', winter('2026-11-12', '17:40')), [], 'abends nichts mehr');
});

test('Tischzeiten', () => {
  const z = PB.tischzeiten('2026-11-14', winter('2026-11-12', '09:00'));
  assert.equal(PB.uhr(z[0]), '08:00');
  assert.equal(PB.uhr(z[z.length - 1]), '17:00', 'spätestens eine Stunde vor Schluss');
  assert.equal(PB.uhr(PB.tischzeiten('2026-11-12', winter('2026-11-12', '09:10'))[0]), '10:30', 'heute mit einer Stunde Vorlauf');
});

test('Bestellzettel rechnet mit Zuschlägen und doppeltem Espresso', () => {
  const r = PB.rechne([
    { id: 'b-camembert', menge: 2, wahl: { salat: true } },
    { id: 'g-espresso', menge: 1, wahl: { doppelt: true } },
    { id: 'g-latte', menge: 1, wahl: { milch: true } },
    { id: 'k-suppe', menge: 1 },
    { id: 'gibt-es-nicht', menge: 3 },
    { id: 'b-kaese', menge: 0 }
  ]);
  assert.equal(r.zeilen.length, 4);
  assert.equal(r.zeilen[0].name, 'Camembert (mit Salat)');
  assert.equal(r.zeilen[0].gesamt, 6);
  assert.equal(r.zeilen[1].einzel, 2.7);
  assert.equal(r.zeilen[2].einzel, 3.6);
  assert.equal(r.summe, 17.8);
  assert.equal(r.ab, true, 'Suppe hat einen ab-Preis');
  assert.equal(PB.geld(17.8), '17,80 €');
});

test('Karte: jede Kennung einmalig, jeder Preis positiv', () => {
  const ids = new Set();
  PB.KARTE.forEach((g) => g.posten.forEach((p) => {
    assert.ok(!ids.has(p.id), p.id);
    ids.add(p.id);
    assert.ok(p.preis > 0, p.id);
    (p.extra || []).forEach((e) => assert.ok(PB.EXTRAS[e], e));
  }));
  assert.equal(ids.size, 33);
});
