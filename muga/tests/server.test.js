/* =============================================================================
 * server.test.js — prüft die Schnittstelle des Servers gegen einen echten
 * Start auf freiem Port mit leerem Speicher. Aufruf: node --test tests/
 * ========================================================================== */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'muga-test-'));
process.env.MUGA_DATEN = ordner;
process.env.MUGA_VERWALTUNG = 'test-schluessel-1234567890';
process.env.MUGA_SCHREIBGRENZE = '45';
const { server } = require('../server.js');
const { zeit, config } = require('../assets/js/config.js');

let basis = '';

test.before(() => new Promise((fertig) => server.listen(0, '127.0.0.1', () => {
  basis = 'http://127.0.0.1:' + server.address().port;
  fertig();
})));
test.after(() => new Promise((fertig) => {
  server.close(() => { fs.rmSync(ordner, { recursive: true, force: true }); fertig(); });
  server.closeAllConnections();
}));

function sende(pfad, daten, kopf) {
  return fetch(basis + '/api/' + pfad, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, kopf || {}), body: JSON.stringify(daten)
  }).then(async (a) => ({ status: a.status, daten: await a.json() }));
}
function hole(pfad, kopf) {
  return fetch(basis + pfad, { headers: kopf || {} }).then(async (a) => ({ status: a.status, kopf: a.headers, text: await a.text() }));
}

/* Nächster Dienstag in mindestens drei Tagen: sicher geöffnet und buchbar */
function buchbarerTag() {
  let tag = zeit.plusTage(zeit.jetzt().datum, 3);
  while (zeit.teile(tag).wochentag !== 2 || zeit.feiertag(tag)) tag = zeit.plusTage(tag, 1);
  return tag;
}
const TAG = buchbarerTag();
const termin = (mehr) => Object.assign({
  art: 'hochzeit', datum: TAG, start: 660, personen: 2, vorname: 'Max', nachname: 'Mustermann',
  email: 'max@example.org', telefon: '0221 1234567', nachricht: 'Größe 52', datenschutz: true
}, mehr);

test('Status und Auslieferung der Seite', async () => {
  const s = await hole('/api/status');
  assert.equal(s.status, 200);
  assert.deepEqual(JSON.parse(s.text), { dienst: 'muga', version: 1 });

  const start = await hole('/');
  assert.equal(start.status, 200);
  assert.match(start.text, /<muga-kopf>/);
  assert.match(start.kopf.get('content-security-policy'), /script-src 'self'/);
  assert.match(start.kopf.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.equal(start.kopf.get('x-content-type-options'), 'nosniff');

  const bild = await fetch(basis + '/assets/img/favicon.svg');
  assert.equal(bild.headers.get('content-type'), 'image/svg+xml');
  assert.match(bild.headers.get('cache-control'), /max-age/);
});

test('Private Dateien und Pfadtricks bleiben verschlossen', async () => {
  for (const pfad of ['/server.js', '/package.json', '/speicher/termine.json', '/tests/server.test.js', '/.gitignore',
    '/assets/../server.js', '/assets/%2e%2e/server.js', '/%2e%2e/%2e%2e/etc/passwd', '/assets/js/../../server.js', '/README.md']) {
    const a = await hole(pfad);
    assert.equal(a.status, 404, pfad);
    assert.doesNotMatch(a.text, /Eingabefehler|createServer/, pfad);
  }
  const post = await fetch(basis + '/index.html', { method: 'POST' });
  assert.equal(post.status, 405);
});

test('Termin buchen, Doppelbuchung verhindern, absagen', async () => {
  const erster = await sende('termine', termin());
  assert.equal(erster.status, 201);
  assert.match(erster.daten.code, /^MG-[A-Z0-9]{6}$/);

  const belegt = JSON.parse((await hole('/api/termine/belegt?von=' + TAG + '&bis=' + TAG)).text).belegt;
  assert.deepEqual(belegt, [{ datum: TAG, start: 660, dauer: 90 }], 'belegte Zeiten enthalten keine Namen');

  const doppelt = await sende('termine', termin({ email: 'andere@example.org' }));
  assert.equal(doppelt.status, 409);
  const ueberschneidung = await sende('termine', termin({ art: 'beratung', start: 720 }));
  assert.equal(ueberschneidung.status, 409, '12:00 liegt im Termin von 11:00 bis 12:30');
  const danach = await sende('termine', termin({ art: 'anprobe', start: 750 }));
  assert.equal(danach.status, 201, '12:30 ist wieder frei');

  const falsch = await sende('termine/absagen', { code: erster.daten.code, email: 'fremd@example.org' });
  assert.equal(falsch.status, 404, 'Absage nur mit passender E-Mail');
  const absage = await sende('termine/absagen', { code: erster.daten.code, email: 'MAX@example.org' });
  assert.equal(absage.status, 200);

  const wieder = await sende('termine', termin({ email: 'andere@example.org' }));
  assert.equal(wieder.status, 201, 'nach der Absage ist die Zeit wieder frei');
});

test('Ungültige Terminanfragen werden abgelehnt', async () => {
  const montag = (() => { let t = TAG; while (zeit.teile(t).wochentag !== 1) t = zeit.plusTage(t, 1); return t; })();
  const faelle = [
    [{ art: 'unbekannt' }, 'Anliegen'],
    [{ datum: '2020-01-07' }, 'Vergangenheit'],
    [{ datum: montag }, 'Ruhetag'],
    [{ start: 605 }, 'außerhalb des Rasters'],
    [{ start: 1050 }, 'endet nach Ladenschluss'],
    [{ datum: zeit.plusTage(TAG, 7 * (config.termin.wochenVoraus + 2)) }, 'zu weit voraus'],
    [{ personen: 0 }, 'Personenzahl'],
    [{ personen: 7 }, 'Personenzahl'],
    [{ email: 'keine-adresse' }, 'E-Mail'],
    [{ telefon: 'abc' }, 'Telefon'],
    [{ vorname: '   ' }, 'Vorname'],
    [{ datenschutz: false }, 'Einwilligung'],
    [{ anlassdatum: '2026-13-40' }, 'Datum der Feier']
  ];
  for (const [aenderung, name] of faelle) {
    const a = await sende('termine', termin(Object.assign({ start: 900 }, aenderung)));
    assert.equal(a.status, 400, name);
    assert.ok(a.daten.fehler, name);
  }
});

test('Bestellung: der Server rechnet Preise und Versand selbst', async () => {
  const kunde = { vorname: 'Max', nachname: 'Mustermann', email: 'max@example.org', telefon: '', strasse: 'Musterweg 1', plz: '50667', ort: 'Köln', land: 'Deutschland' };
  const katalog = fs.readFileSync(path.join(__dirname, '..', 'daten', 'katalog.js'), 'utf8');
  const produkte = JSON.parse(katalog.slice(katalog.indexOf('MUGA.katalogDaten=') + 18).trim().replace(/;$/, '')).produkte;
  const anzug = produkte.find((p) => p.g && p.g.length && p.f && p.f.length > 1 && p.p > 100);
  const klein = produkte.find((p) => (!p.g || !p.g.length) && (!p.f || p.f.length < 2) && p.p < 20);
  const posten = { id: anzug.id, groesse: anzug.g[0], farbe: anzug.f[0], menge: 2, preis: 1 };
  const erwartet = Math.round(((anzug.pg && anzug.pg[anzug.g[0]] != null ? anzug.pg[anzug.g[0]] : anzug.p) * 2) * 100) / 100;

  const gut = await sende('bestellungen', { posten: [posten], kunde, lieferung: 'versand', zahlung: 'vorkasse', agb: true });
  assert.equal(gut.status, 201);
  assert.match(gut.daten.nummer, /^MB-\d{6}-[A-Z0-9]{4}$/);
  assert.equal(gut.daten.summe, erwartet, 'ein mitgeschickter Preis von 1 € wird ignoriert');
  assert.equal(gut.daten.versand, 0);

  const ausland = await sende('bestellungen', { posten: [posten], kunde: Object.assign({}, kunde, { land: 'Österreich', plz: '1010' }), lieferung: 'versand', zahlung: 'paypal', agb: true });
  assert.equal(ausland.daten.versand, 19.9);
  assert.equal(ausland.daten.gesamt, Math.round((erwartet + 19.9) * 100) / 100);

  if (klein) {
    const porto = await sende('bestellungen', { posten: [{ id: klein.id, menge: 1 }], kunde, lieferung: 'versand', zahlung: 'vorkasse', agb: true });
    assert.equal(porto.status, 201);
    assert.ok(porto.daten.versand > 0, 'unter 50,01 € fällt Versand an');
  }

  const abholung = await sende('bestellungen', { posten: [posten], kunde: { vorname: 'Max', nachname: 'Mustermann', email: 'max@example.org', telefon: '0221 123456' }, lieferung: 'abholung', zahlung: 'bar', agb: true });
  assert.equal(abholung.status, 201);
  assert.equal(abholung.daten.versand, 0);

  const faelle = [
    [{ posten: [] }, 'leerer Warenkorb'],
    [{ posten: [{ id: 'gibt-es-nicht', menge: 1 }] }, 'unbekannter Artikel'],
    [{ posten: [Object.assign({}, posten, { groesse: 'XXXL' })] }, 'unbekannte Größe'],
    [{ posten: [Object.assign({}, posten, { farbe: 'Neonpink' })] }, 'unbekannte Farbe'],
    [{ posten: [Object.assign({}, posten, { menge: 11 })] }, 'zu große Menge'],
    [{ zahlung: 'bar' }, 'Barzahlung bei Versand'],
    [{ zahlung: 'kreditkarte' }, 'unbekannte Zahlungsart'],
    [{ agb: false }, 'AGB nicht bestätigt'],
    [{ kunde: Object.assign({}, kunde, { plz: '123' }) }, 'Postleitzahl'],
    [{ kunde: Object.assign({}, kunde, { land: 'Atlantis' }) }, 'Land'],
    [{ kunde: Object.assign({}, kunde, { strasse: '' }) }, 'Straße fehlt']
  ];
  for (const [aenderung, name] of faelle) {
    const a = await sende('bestellungen', Object.assign({ posten: [posten], kunde, lieferung: 'versand', zahlung: 'vorkasse', agb: true }, aenderung));
    assert.equal(a.status, 400, name);
  }
});

test('Nachrichten, Verwaltung und Zustände', async () => {
  const nachricht = { vorname: 'Erika', nachname: 'Muster', email: 'erika@example.org', telefon: '', betreff: 'Frage <script>', nachricht: 'Führen Sie Größe 58?', datenschutz: true };
  assert.equal((await sende('nachrichten', nachricht)).status, 201);
  assert.equal((await sende('nachrichten', Object.assign({}, nachricht, { datenschutz: false }))).status, 400);

  assert.equal((await hole('/api/verwaltung')).status, 401);
  assert.equal((await hole('/api/verwaltung', { Authorization: 'Bearer falsch' })).status, 401);
  const kopf = { Authorization: 'Bearer test-schluessel-1234567890' };
  const v = await hole('/api/verwaltung', kopf);
  assert.equal(v.status, 200);
  const d = JSON.parse(v.text);
  assert.ok(d.termine.length >= 3);
  assert.ok(d.bestellungen.length >= 3);
  assert.equal(d.nachrichten.length, 1);
  assert.equal(d.nachrichten[0].betreff, 'Frage <script>', 'gespeichert wird der Text, die Anzeige maskiert ihn');

  const t = d.termine.find((x) => x.status === 'neu');
  assert.equal((await sende('verwaltung/zustand', { bereich: 'termine', kennung: t.code, zustand: 'bestaetigt' })).status, 401);
  assert.equal((await sende('verwaltung/zustand', { bereich: 'termine', kennung: t.code, zustand: 'bestaetigt' }, kopf)).status, 200);
  assert.equal((await sende('verwaltung/zustand', { bereich: 'termine', kennung: t.code, zustand: 'erfunden' }, kopf)).status, 400);
  assert.equal((await sende('verwaltung/zustand', { bereich: 'termine', kennung: 'MG-XXXXXX', zustand: 'erledigt' }, kopf)).status, 404);
  const neu = JSON.parse((await hole('/api/verwaltung', kopf)).text);
  assert.equal(neu.termine.find((x) => x.code === t.code).status, 'bestaetigt');

  const datei = JSON.parse(fs.readFileSync(path.join(ordner, 'termine.json'), 'utf8'));
  assert.equal(datei.length, neu.termine.length, 'alles liegt auch auf der Platte');
});

test('Schutz vor Missbrauch', async () => {
  const fremd = await sende('nachrichten', { vorname: 'A', nachname: 'B', email: 'a@example.org', betreff: 'x', nachricht: 'y', datenschutz: true }, { Origin: 'https://boese.example' });
  assert.equal(fremd.status, 403, 'Anfragen von fremden Seiten');

  const text = await fetch(basis + '/api/nachrichten', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(text.status, 415);

  const kaputt = await fetch(basis + '/api/nachrichten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{kein json' });
  assert.equal(kaputt.status, 400);

  const gross = await fetch(basis + '/api/nachrichten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nachricht: 'x'.repeat(70000) }) }).catch(() => ({ status: 413 }));
  assert.equal(gross.status, 413);

  const vorher = JSON.parse((await hole('/api/verwaltung', { Authorization: 'Bearer test-schluessel-1234567890' })).text).nachrichten.length;
  const falle = await sende('nachrichten', { vorname: 'Bot', nachname: 'Bot', email: 'bot@example.org', betreff: 'Werbung', nachricht: 'Kaufen Sie', datenschutz: true, website: 'http://spam.example' });
  assert.equal(falle.status, 201, 'automatische Einsendungen merken nichts');
  const nachher = JSON.parse((await hole('/api/verwaltung', { Authorization: 'Bearer test-schluessel-1234567890' })).text).nachrichten.length;
  assert.equal(nachher, vorher, 'gespeichert wird aber nichts');
});

test('Bremsen: zu viele Schreibzugriffe und zu viele falsche Schlüssel', async () => {
  let letzter = 0;
  for (let i = 0; i < 50 && letzter !== 429; i++) {
    letzter = (await sende('termine/absagen', { code: 'MG-NICHTDA', email: 'niemand@example.org' })).status;
  }
  assert.equal(letzter, 429, 'nach 45 Schreibzugriffen in zehn Minuten ist Pause');

  let status = 0;
  for (let i = 0; i < 12 && status !== 429; i++) status = (await hole('/api/verwaltung', { Authorization: 'Bearer geraten-' + i })).status;
  assert.equal(status, 429, 'nach zehn falschen Schlüsseln ist Pause');
  assert.equal((await hole('/api/verwaltung', { Authorization: 'Bearer test-schluessel-1234567890' })).status, 429, 'auch der richtige Schlüssel muss dann warten');
});
