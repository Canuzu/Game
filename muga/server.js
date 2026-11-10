/* =============================================================================
 * server.js — liefert die Seite aus und speichert Termine, Bestellungen und
 * Nachrichten. Ohne Abhängigkeiten, läuft mit Node.js ab Version 18.
 * -----------------------------------------------------------------------------
 *   Start:        node server.js
 *   Port:         PORT=8080 node server.js           (Standard 4173)
 *   Speicherort:  MUGA_DATEN=/pfad node server.js    (Standard ./speicher)
 *   Verwaltung:   MUGA_VERWALTUNG=geheim node server.js
 *                 Ohne Angabe wird beim ersten Start ein Schlüssel erzeugt und
 *                 in speicher/verwaltung-schluessel.txt abgelegt.
 *   Einbetten:    MUGA_EINBETTEN=1 erlaubt die Anzeige in fremden Rahmen
 *                 (nur für Vorschauen; im Betrieb weglassen).
 *   Hinter Proxy: MUGA_PROXY=1, wenn ein vorgeschalteter Webserver die Anfragen
 *                 weiterreicht. Dann zählt die Adresse aus X-Forwarded-For.
 *
 * Gliederung:
 *   1) Einstellungen   2) Speicher        3) Prüfen von Eingaben
 *   4) Schnittstelle   5) Dateien         6) Start
 * ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { config, zeit, terminart, versandkosten, laender } = require('./assets/js/config.js');

/* ---------- 1) Einstellungen ----------------------------------------------- */

const WURZEL = __dirname;
const PORT = Number(process.env.PORT) || 4173;
const DATEN = process.env.MUGA_DATEN || path.join(WURZEL, 'speicher');
const EINBETTEN = process.env.MUGA_EINBETTEN === '1';
const MAX_KOERPER = 64 * 1024;
const HINTER_PROXY = process.env.MUGA_PROXY === '1';
const SCHREIBGRENZE = Number(process.env.MUGA_SCHREIBGRENZE) || 30;   // Schreibzugriffe je Adresse in zehn Minuten

fs.mkdirSync(DATEN, { recursive: true });

function verwaltungsschluessel() {
  if (process.env.MUGA_VERWALTUNG) return process.env.MUGA_VERWALTUNG;
  const datei = path.join(DATEN, 'verwaltung-schluessel.txt');
  try {
    const da = fs.readFileSync(datei, 'utf8').trim();
    if (da.length >= 16) return da;
  } catch (e) { /* wird unten angelegt */ }
  const neu = crypto.randomBytes(18).toString('base64url');
  fs.writeFileSync(datei, neu + '\n', { mode: 0o600 });
  return neu;
}
const SCHLUESSEL = verwaltungsschluessel();

/* Katalog einlesen: Preise und Varianten gelten immer vom Server, nie vom Browser. */
function ladeKatalog() {
  const roh = fs.readFileSync(path.join(WURZEL, 'daten', 'katalog.js'), 'utf8');
  const anfang = roh.indexOf('MUGA.katalogDaten=');
  const json = roh.slice(anfang + 'MUGA.katalogDaten='.length).trim().replace(/;$/, '');
  const daten = JSON.parse(json);
  const nach = new Map();
  daten.produkte.forEach((p) => nach.set(p.id, p));
  return nach;
}
const KATALOG = ladeKatalog();

/* ---------- 2) Speicher ---------------------------------------------------- */

/* Kleine Datenmengen: alles im Arbeitsspeicher, jede Änderung wird sofort und
 * unteilbar (erst Hilfsdatei, dann umbenennen) auf die Platte geschrieben. */
function lager(name) {
  const datei = path.join(DATEN, name + '.json');
  let liste = [];
  try { liste = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { liste = []; }
  if (!Array.isArray(liste)) liste = [];
  return {
    alle: () => liste,
    sichere: () => {
      const hilf = datei + '.' + process.pid + '.neu';
      fs.writeFileSync(hilf, JSON.stringify(liste, null, 1));
      fs.renameSync(hilf, datei);
    }
  };
}
const TERMINE = lager('termine');
const BESTELLUNGEN = lager('bestellungen');
const NACHRICHTEN = lager('nachrichten');

function kennung(laenge) {
  const zeichen = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const feld = crypto.randomBytes(laenge);
  let aus = '';
  for (let i = 0; i < laenge; i++) aus += zeichen[feld[i] % zeichen.length];
  return aus;
}

/* ---------- 3) Prüfen von Eingaben ----------------------------------------- */

class Eingabefehler extends Error {
  constructor(text, status) { super(text); this.status = status || 400; }
}

/* Text säubern: Steuerzeichen raus, Länge begrenzen */
function text(wert, max, pflicht, name) {
  let t = typeof wert === 'string' ? wert : '';
  t = t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (t.length > max) t = t.slice(0, max);
  if (pflicht && !t) throw new Eingabefehler('Bitte füllen Sie das Feld „' + name + '“ aus.');
  return t;
}
function zeile(wert, max, pflicht, name) { return text(wert, max, pflicht, name).replace(/\s+/g, ' '); }

function email(wert) {
  const t = zeile(wert, 120, true, 'E-Mail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) throw new Eingabefehler('Bitte geben Sie eine gültige E-Mail-Adresse an.');
  return t;
}
function telefon(wert, pflicht) {
  const t = zeile(wert, 30, pflicht, 'Telefon');
  if (t && !/^[0-9+()\/ .-]{5,30}$/.test(t)) throw new Eingabefehler('Bitte geben Sie eine gültige Telefonnummer an.');
  return t;
}

function belegteZeiten(datum) {
  return TERMINE.alle().filter((t) => t.datum === datum && t.status !== 'abgesagt')
    .map((t) => ({ start: t.start, dauer: t.dauer }));
}

function pruefeTermin(d) {
  const art = terminart(d.art);
  if (!art) throw new Eingabefehler('Bitte wählen Sie ein Anliegen.');
  if (!zeit.teile(d.datum)) throw new Eingabefehler('Bitte wählen Sie ein Datum.');
  const start = Number(d.start);
  const moeglich = zeit.startzeiten(d.datum, art.dauer, belegteZeiten(d.datum));
  const platz = moeglich.find((s) => s.start === start);
  if (!platz) throw new Eingabefehler('Zu dieser Zeit ist kein Termin möglich. Bitte wählen Sie eine andere Uhrzeit.');
  if (!platz.frei) throw new Eingabefehler('Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere Uhrzeit.', 409);
  const personen = Math.round(Number(d.personen));
  if (!(personen >= 1 && personen <= 6)) throw new Eingabefehler('Bitte geben Sie 1 bis 6 Personen an.');
  if (d.datenschutz !== true) throw new Eingabefehler('Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.');
  let anlassdatum = '';
  if (d.anlassdatum) {
    if (!zeit.teile(d.anlassdatum)) throw new Eingabefehler('Das Datum des Anlasses ist ungültig.');
    anlassdatum = d.anlassdatum;
  }
  return {
    art: art.id, datum: d.datum, start: start, dauer: art.dauer, personen: personen, anlassdatum: anlassdatum,
    vorname: zeile(d.vorname, 60, true, 'Vorname'), nachname: zeile(d.nachname, 60, true, 'Nachname'),
    email: email(d.email), telefon: telefon(d.telefon, true),
    artikel: zeile(d.artikel, 160, false), nachricht: text(d.nachricht, 1000, false)
  };
}

/* Preis für Größe und Farbe; dieselbe Regel wie im Browser (kern.js, M.preisFuer) */
function preisFuer(artikel, groesse, farbe) {
  let preis = artikel.pg && groesse && artikel.pg[groesse] != null ? artikel.pg[groesse] : artikel.p;
  if (artikel.pf && farbe && artikel.pf[farbe] != null) preis += artikel.pf[farbe];
  return Math.round(preis * 100) / 100;
}

function pruefeBestellung(d) {
  if (!Array.isArray(d.posten) || !d.posten.length) throw new Eingabefehler('Ihr Warenkorb ist leer.');
  if (d.posten.length > 40) throw new Eingabefehler('Zu viele Positionen in einer Bestellung.');
  let summe = 0;
  const posten = d.posten.map((p) => {
    const artikel = KATALOG.get(String(p.id));
    if (!artikel) throw new Eingabefehler('Ein Artikel im Warenkorb ist nicht mehr verfügbar.');
    const menge = Math.round(Number(p.menge));
    if (!(menge >= 1 && menge <= 10)) throw new Eingabefehler('Die Menge muss zwischen 1 und 10 liegen.');
    const groesse = zeile(p.groesse, 40, false), farbe = zeile(p.farbe, 60, false);
    if (artikel.g && artikel.g.length && artikel.g.indexOf(groesse) === -1) throw new Eingabefehler('Bitte wählen Sie eine Größe für „' + artikel.n + '“.');
    if (artikel.f && artikel.f.length > 1 && artikel.f.indexOf(farbe) === -1) throw new Eingabefehler('Bitte wählen Sie eine Farbe für „' + artikel.n + '“.');
    const preis = preisFuer(artikel, groesse, farbe);
    summe += preis * menge;
    return { id: artikel.id, nr: artikel.nr || '', name: artikel.n, preis: preis, groesse: groesse, farbe: farbe, zusatz: zeile(p.zusatz, 160, false), menge: menge };
  });
  summe = Math.round(summe * 100) / 100;

  const lieferung = d.lieferung === 'abholung' ? 'abholung' : 'versand';
  const zahlung = config.zahlarten.find((z) => z.id === d.zahlung);
  if (!zahlung) throw new Eingabefehler('Bitte wählen Sie eine Zahlungsart.');
  if (zahlung.nurAbholung && lieferung !== 'abholung') throw new Eingabefehler('Barzahlung ist nur bei Abholung im Geschäft möglich.');
  if (d.agb !== true) throw new Eingabefehler('Bitte bestätigen Sie AGB und Widerrufsbelehrung.');

  const k = d.kunde || {};
  const kunde = {
    vorname: zeile(k.vorname, 60, true, 'Vorname'), nachname: zeile(k.nachname, 60, true, 'Nachname'),
    email: email(k.email), telefon: telefon(k.telefon, lieferung === 'abholung')
  };
  let versand = 0;
  if (lieferung === 'versand') {
    kunde.strasse = zeile(k.strasse, 100, true, 'Straße und Hausnummer');
    kunde.plz = zeile(k.plz, 12, true, 'Postleitzahl');
    kunde.ort = zeile(k.ort, 80, true, 'Ort');
    kunde.land = zeile(k.land, 60, true, 'Land');
    if (laender().indexOf(kunde.land) === -1) throw new Eingabefehler('In dieses Land können wir online nicht liefern. Bitte rufen Sie uns an.');
    if (kunde.land === 'Anderes Land') kunde.landname = zeile(k.landname, 60, true, 'Name des Landes');
    if (kunde.land === 'Deutschland' && !/^\d{5}$/.test(kunde.plz)) throw new Eingabefehler('Bitte geben Sie eine fünfstellige Postleitzahl an.');
    versand = versandkosten(kunde.land, summe);
  }
  return {
    posten: posten, kunde: kunde, lieferung: lieferung, zahlung: zahlung.id,
    hinweis: text(d.hinweis, 600, false),
    summe: summe, versand: versand, gesamt: Math.round((summe + versand) * 100) / 100
  };
}

function pruefeNachricht(d) {
  if (d.datenschutz !== true) throw new Eingabefehler('Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.');
  return {
    vorname: zeile(d.vorname, 60, true, 'Vorname'), nachname: zeile(d.nachname, 60, true, 'Nachname'),
    email: email(d.email), telefon: telefon(d.telefon, false),
    betreff: zeile(d.betreff, 120, true, 'Betreff'), nachricht: text(d.nachricht, 3000, true, 'Nachricht')
  };
}

/* ---------- 4) Schnittstelle ----------------------------------------------- */

/* Einfache Bremse gegen Missbrauch: je Adresse begrenzte Zahl von Schreibzugriffen */
const zugriffe = new Map();
function gebremst(adresse, art, max, fensterMs) {
  const jetzt = Date.now(), name = art + '|' + adresse;
  const liste = (zugriffe.get(name) || []).filter((t) => jetzt - t < fensterMs);
  if (liste.length >= max) { zugriffe.set(name, liste); return true; }
  liste.push(jetzt);
  zugriffe.set(name, liste);
  return false;
}
setInterval(() => {
  const jetzt = Date.now();
  zugriffe.forEach((liste, name) => { if (!liste.some((t) => jetzt - t < 3600000)) zugriffe.delete(name); });
}, 600000).unref();

function sende(res, status, daten) {
  const koerper = JSON.stringify(daten);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(koerper),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(koerper);
}

function liesKoerper(req) {
  return new Promise((gut, schlecht) => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
      return schlecht(new Eingabefehler('Es wird JSON erwartet.', 415));
    }
    let groesse = 0;
    const teile = [];
    req.on('data', (stueck) => {
      groesse += stueck.length;
      if (groesse > MAX_KOERPER) { schlecht(new Eingabefehler('Die Anfrage ist zu groß.', 413)); req.destroy(); return; }
      teile.push(stueck);
    });
    req.on('end', () => {
      try {
        const d = JSON.parse(Buffer.concat(teile).toString('utf8') || '{}');
        if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('kein Objekt');
        gut(d);
      } catch (e) { schlecht(new Eingabefehler('Die Anfrage ist nicht lesbar.')); }
    });
    req.on('error', () => schlecht(new Eingabefehler('Die Anfrage wurde abgebrochen.')));
  });
}

/* Anfragen von fremden Seiten ablehnen */
function fremd(req) {
  const herkunft = req.headers.origin;
  if (!herkunft) return false;
  try { return new URL(herkunft).host !== req.headers.host; } catch (e) { return true; }
}

function darfVerwalten(req) {
  const kopf = req.headers.authorization || '';
  const m = /^Bearer (.+)$/.exec(kopf);
  if (!m) return false;
  const a = crypto.createHash('sha256').update(m[1]).digest();
  const b = crypto.createHash('sha256').update(SCHLUESSEL).digest();
  return crypto.timingSafeEqual(a, b);
}

/* Nach zehn falschen Schlüsseln in einer Viertelstunde ist für diese Adresse Pause. */
function pruefeSchluessel(req, adresse) {
  const name = 'fehlversuch|' + adresse, jetzt = Date.now();
  const fehl = (zugriffe.get(name) || []).filter((t) => jetzt - t < 900000);
  if (fehl.length >= 10) throw new Eingabefehler('Zu viele Fehlversuche. Bitte warten Sie eine Viertelstunde.', 429);
  if (!darfVerwalten(req)) {
    fehl.push(jetzt);
    zugriffe.set(name, fehl);
    throw new Eingabefehler('Der Schlüssel ist nicht gültig.', 401);
  }
}

const ZUSTAENDE = {
  termine: ['neu', 'bestaetigt', 'erledigt', 'abgesagt'],
  bestellungen: ['neu', 'bezahlt', 'versendet', 'abgeholt', 'storniert'],
  nachrichten: ['neu', 'beantwortet']
};

async function schnittstelle(req, res, url) {
  const weg = url.pathname.replace(/^\/api\//, '');
  const weitergereicht = HINTER_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  const adresse = weitergereicht || req.socket.remoteAddress || 'unbekannt';

  if (req.method === 'GET' && weg === 'status') {
    return sende(res, 200, { dienst: 'muga', version: 1 });
  }

  if (req.method === 'GET' && weg === 'termine/belegt') {
    const von = url.searchParams.get('von'), bis = url.searchParams.get('bis');
    if (!zeit.teile(von) || !zeit.teile(bis) || bis < von) throw new Eingabefehler('Zeitraum ungültig.');
    const belegt = TERMINE.alle()
      .filter((t) => t.status !== 'abgesagt' && t.datum >= von && t.datum <= bis)
      .map((t) => ({ datum: t.datum, start: t.start, dauer: t.dauer }));
    return sende(res, 200, { belegt: belegt });
  }

  if (req.method === 'GET' && weg === 'verwaltung') {
    if (gebremst(adresse, 'verwaltung', 60, 60000)) throw new Eingabefehler('Zu viele Anfragen. Bitte warten Sie einen Moment.', 429);
    pruefeSchluessel(req, adresse);
    return sende(res, 200, { termine: TERMINE.alle(), bestellungen: BESTELLUNGEN.alle(), nachrichten: NACHRICHTEN.alle(), zustaende: ZUSTAENDE });
  }

  if (req.method !== 'POST') throw new Eingabefehler('Nicht gefunden.', 404);
  if (fremd(req)) throw new Eingabefehler('Anfrage von fremder Seite abgelehnt.', 403);
  if (gebremst(adresse, 'schreiben', SCHREIBGRENZE, 600000)) throw new Eingabefehler('Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.', 429);
  const d = await liesKoerper(req);

  /* Unsichtbares Feld gegen automatische Einsendungen: Ist es gefüllt, tun wir
   * so, als wäre alles in Ordnung, speichern aber nichts. */
  const falle = typeof d.website === 'string' && d.website.trim() !== '';

  if (weg === 'termine') {
    const t = pruefeTermin(d);
    if (falle) return sende(res, 201, { ok: true, code: 'MG-' + kennung(6) });
    t.code = 'MG-' + kennung(6);
    t.status = 'neu';
    t.angelegt = new Date().toISOString();
    TERMINE.alle().push(t);
    TERMINE.sichere();
    return sende(res, 201, { ok: true, code: t.code });
  }

  if (weg === 'termine/absagen') {
    const code = zeile(d.code, 20, true, 'Terminnummer'), post = zeile(d.email, 120, true, 'E-Mail').toLowerCase();
    const t = TERMINE.alle().find((x) => x.code === code && x.email.toLowerCase() === post);
    if (!t) throw new Eingabefehler('Zu diesen Angaben wurde kein Termin gefunden.', 404);
    t.status = 'abgesagt';
    t.geaendert = new Date().toISOString();
    TERMINE.sichere();
    return sende(res, 200, { ok: true });
  }

  if (weg === 'bestellungen') {
    const b = pruefeBestellung(d);
    const heute = zeit.jetzt().datum.replace(/-/g, '').slice(2);
    b.nummer = 'MB-' + heute + '-' + kennung(4);
    if (falle) return sende(res, 201, { ok: true, nummer: b.nummer, summe: b.summe, versand: b.versand, gesamt: b.gesamt });
    b.status = 'neu';
    b.angelegt = new Date().toISOString();
    BESTELLUNGEN.alle().push(b);
    BESTELLUNGEN.sichere();
    return sende(res, 201, { ok: true, nummer: b.nummer, summe: b.summe, versand: b.versand, gesamt: b.gesamt });
  }

  if (weg === 'nachrichten') {
    const n = pruefeNachricht(d);
    if (falle) return sende(res, 201, { ok: true });
    n.kennung = 'MN-' + kennung(6);
    n.status = 'neu';
    n.angelegt = new Date().toISOString();
    NACHRICHTEN.alle().push(n);
    NACHRICHTEN.sichere();
    return sende(res, 201, { ok: true });
  }

  if (weg === 'verwaltung/zustand') {
    pruefeSchluessel(req, adresse);
    const erlaubt = ZUSTAENDE[d.bereich];
    if (!erlaubt || erlaubt.indexOf(d.zustand) === -1) throw new Eingabefehler('Unbekannter Zustand.');
    const speicher = { termine: TERMINE, bestellungen: BESTELLUNGEN, nachrichten: NACHRICHTEN }[d.bereich];
    const feld = { termine: 'code', bestellungen: 'nummer', nachrichten: 'kennung' }[d.bereich];
    const eintrag = speicher.alle().find((x) => x[feld] === d.kennung);
    if (!eintrag) throw new Eingabefehler('Eintrag nicht gefunden.', 404);
    eintrag.status = d.zustand;
    eintrag.geaendert = new Date().toISOString();
    speicher.sichere();
    return sende(res, 200, { ok: true });
  }

  throw new Eingabefehler('Nicht gefunden.', 404);
}

/* ---------- 5) Dateien ------------------------------------------------------ */

const ARTEN = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const PACKBAR = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);

const SCHUTZ = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://www.mmuga.de",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].concat(EINBETTEN ? [] : ["frame-ancestors 'self'"]).join('; ');

function kopfzeilen(zusatz) {
  return Object.assign({
    'Content-Security-Policy': SCHUTZ,
    'X-Muga-Dienst': '1',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }, zusatz);
}

/* Nur diese Bereiche werden ausgeliefert; Speicher, Tests und Server bleiben privat. */
function erlaubt(relativ) {
  if (/(^|\/)\./.test(relativ)) return false;
  if (/^[a-z0-9-]+\.html$/.test(relativ)) return true;
  return /^(assets|daten)\//.test(relativ);
}

const packspeicher = new Map();

function datei(req, res, url) {
  let weg;
  try { weg = decodeURIComponent(url.pathname); } catch (e) { return fehlerseite(res, 400); }
  if (weg.endsWith('/')) weg += 'index.html';
  const relativ = path.posix.normalize(weg).replace(/^\/+/, '');
  const voll = path.join(WURZEL, relativ);
  if (!voll.startsWith(WURZEL + path.sep) || !erlaubt(relativ)) return fehlerseite(res, 404);

  fs.stat(voll, (fehler, info) => {
    if (fehler || !info.isFile()) return fehlerseite(res, 404);
    const endung = path.extname(voll).toLowerCase();
    const art = ARTEN[endung];
    if (!art) return fehlerseite(res, 404);
    const marke = '"' + info.size.toString(36) + '-' + Math.round(info.mtimeMs).toString(36) + '"';
    const lang = /^assets\/(produkte|fonts|img)\//.test(relativ);
    const kopf = kopfzeilen({
      'Content-Type': art,
      'ETag': marke,
      'Cache-Control': lang ? 'public, max-age=604800' : 'no-cache'
    });
    if (req.headers['if-none-match'] === marke) { res.writeHead(304, kopf); return res.end(); }

    const packen = PACKBAR.has(endung) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (!packen) {
      kopf['Content-Length'] = info.size;
      res.writeHead(200, kopf);
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(voll).on('error', () => res.destroy()).pipe(res);
    }
    kopf['Content-Encoding'] = 'gzip';
    kopf['Vary'] = 'Accept-Encoding';
    const gemerkt = packspeicher.get(voll);
    if (gemerkt && gemerkt.marke === marke) {
      kopf['Content-Length'] = gemerkt.daten.length;
      res.writeHead(200, kopf);
      return res.end(req.method === 'HEAD' ? undefined : gemerkt.daten);
    }
    fs.readFile(voll, (lesefehler, inhalt) => {
      if (lesefehler) return fehlerseite(res, 404);
      zlib.gzip(inhalt, (packfehler, gepackt) => {
        if (packfehler) return fehlerseite(res, 500);
        packspeicher.set(voll, { marke: marke, daten: gepackt });
        kopf['Content-Length'] = gepackt.length;
        res.writeHead(200, kopf);
        res.end(req.method === 'HEAD' ? undefined : gepackt);
      });
    });
  });
}

function fehlerseite(res, status) {
  if (status === 404) {
    return fs.readFile(path.join(WURZEL, '404.html'), (fehler, inhalt) => {
      /* Die Fehlerseite kann unter jedem Pfad erscheinen; <base> hält ihre Verweise gültig. */
      const koerper = fehler ? 'Seite nicht gefunden' : String(inhalt).replace('<head>', '<head>\n<base href="/">');
      res.writeHead(404, kopfzeilen({ 'Content-Type': fehler ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }));
      res.end(koerper);
    });
  }
  res.writeHead(status, kopfzeilen({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }));
  res.end(status === 400 ? 'Ungültige Anfrage' : 'Fehler');
}

/* ---------- 6) Start -------------------------------------------------------- */

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://' + (req.headers.host || 'localhost')); }
  catch (e) { return fehlerseite(res, 400); }

  if (url.pathname.startsWith('/api/')) {
    return schnittstelle(req, res, url).catch((fehler) => {
      if (res.headersSent) return res.destroy();
      if (fehler instanceof Eingabefehler) return sende(res, fehler.status, { fehler: fehler.message });
      console.error(new Date().toISOString(), 'Fehler in', url.pathname, fehler);
      sende(res, 500, { fehler: 'Auf dem Server ist ein Fehler aufgetreten. Bitte rufen Sie uns an.' });
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, kopfzeilen({ Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }));
    return res.end('Nicht erlaubt');
  }
  datei(req, res, url);
});

server.requestTimeout = 30000;
server.headersTimeout = 15000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('MUGA Herrenausstatter läuft auf http://localhost:' + PORT + '/');
    console.log('Verwaltung: http://localhost:' + PORT + '/verwaltung.html');
    if (!process.env.MUGA_VERWALTUNG) console.log('Schlüssel für die Verwaltung steht in ' + path.join(DATEN, 'verwaltung-schluessel.txt'));
  });
}

module.exports = { server, SCHLUESSEL };
