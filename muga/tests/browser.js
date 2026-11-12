/* =============================================================================
 * browser.js — Oberflächentests
 * -----------------------------------------------------------------------------
 * Startet den Server mit leerem Speicher auf einem freien Port und bedient die
 * Seite in einem echten Browser so, wie ein Kunde es täte: Termin buchen,
 * filtern, in den Warenkorb legen, bestellen, Größe ermitteln.
 *
 *   npm run test:browser
 *
 * Braucht Playwright. Ist es nicht installiert, überspringt der Test sich
 * selbst, statt fehlzuschlagen. Die Seite selbst hat keine Abhängigkeiten.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 * ========================================================================== */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.log('Playwright ist nicht installiert. Oberflächentests übersprungen.');
  console.log('  npm install --no-save playwright && npx playwright install chromium');
  process.exit(0);
}

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'muga-browser-'));
process.env.MUGA_DATEN = ordner;
process.env.MUGA_VERWALTUNG = 'browser-test-schluessel-123';
process.env.MUGA_SCHREIBGRENZE = '500';
const { server } = require('../server.js');

let fehler = 0;
function pruefe(name, ok, zusatz) {
  if (!ok) fehler++;
  console.log((ok ? 'OK    ' : 'FEHLER') + '  ' + name + (zusatz ? ': ' + zusatz : ''));
}

async function seite(browser, breite, hoehe) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce', hasTouch: breite < 800, isMobile: breite < 800 });
  const page = await ctx.newPage();
  page.konsole = [];
  page.on('console', (m) => { if (m.type() === 'error') page.konsole.push(m.text()); });
  page.on('pageerror', (e) => page.konsole.push(e.message));
  return page;
}

async function lauf(browser, basis, breite, hoehe) {
  const name = breite + ' px';
  const page = await seite(browser, breite, hoehe);
  const gehe = (pfad) => page.goto(basis + pfad, { waitUntil: 'networkidle' });

  /* ---- Startseite ---- */
  await gehe('/');
  pruefe(name + ' Startseite zeigt Öffnungsstatus', /geöffnet|geschlossen/.test(await page.textContent('.leiste [data-oeffnung]')));
  pruefe(name + ' Startseite lädt Auswahl', (await page.locator('#auswahl-bahn .karte[data-id]').count()) === 10);
  pruefe(name + ' Öffnungszeiten mit heutigem Tag', (await page.locator('.zeiten tr.heute').count()) === 1);

  /* ---- Stilkunde, roter Faden, Hochzeits-Fahrplan ---- */
  pruefe(name + ' Schneiderpuppe ist gezeichnet', (await page.locator('#stilkunde-puppe path').count()) > 20);
  await page.click('#stil-reiter-2');
  pruefe(name + ' Stilkunde wechselt den Schnitt', await page.evaluate(() => document.getElementById('stil-2').classList.contains('aktiv') && document.getElementById('stil-reiter-2').getAttribute('aria-selected') === 'true'));
  await page.waitForFunction(() => { const l = document.querySelector('#faden path.faden-linie'); return l && l.getTotalLength() > 1000; });
  pruefe(name + ' Roter Faden ist gelegt', true);
  const hochzeit = await page.evaluate(() => window.MUGA.zeit.plusTage(window.MUGA.zeit.jetzt().datum, 100));
  await page.fill('#hochzeitstag', hochzeit);
  await page.click('#fahrplan-form button[type="submit"]');
  await page.waitForSelector('#fahrplan-ergebnis .halt');
  pruefe(name + ' Fahrplan zeigt fünf Stationen', (await page.locator('#fahrplan-ergebnis .halt').count()) === 5);
  pruefe(name + ' Fahrplan zählt die Tage', (await page.textContent('#fahrplan-ergebnis [data-tage]')).trim() === '100');
  pruefe(name + ' Fahrplan führt in die Buchung', ((await page.getAttribute('#fahrplan-ergebnis .halt a', 'href')) || '').startsWith('termin.html?art=hochzeit&datum='));
  pruefe(name + ' Kopfleiste zählt die Tage bis zur Hochzeit', (await page.textContent('[data-leistenmitte]')).includes('Noch 100 Tage bis zu Ihrer Hochzeit'));
  await page.click('[data-fahrplan-weg]');
  pruefe(name + ' Fahrplan lässt sich vergessen', await page.isHidden('#fahrplan-ergebnis') && (await page.evaluate(() => window.MUGA.fahrplan.gemerkt())) === null);
  pruefe(name + ' Kopfleiste zeigt danach wieder die Vorteile', (await page.textContent('[data-leistenmitte]')).includes('Direkt vom Hersteller'));

  /* ---- Atelier ---- */
  await gehe('/atelier.html');
  await page.locator('input[name="s"][value="smoking"]').check({ force: true });
  await page.locator('input[name="f"][value="schwarz"]').check({ force: true });
  pruefe(name + ' Atelier beschreibt den Entwurf', (await page.textContent('#atelier-beschreibung')).startsWith('Smoking in Schwarz'));
  pruefe(name + ' Atelier merkt den Entwurf in der Adresse', page.url().includes('s=smoking') && page.url().includes('f=schwarz'));
  await page.waitForSelector('#passend-liste .karte[data-id]');
  pruefe(name + ' Atelier zeigt passende Modelle', (await page.locator('#passend-liste .karte[data-id]').count()) === 4);
  pruefe(name + ' Atelier übergibt den Entwurf an die Buchung', /^termin\.html\?art=beratung&artikel=[a-z0-9,-]+&notiz=/.test(await page.getAttribute('#atelier-termin', 'href')));

  /* ---- Suche ---- */
  await page.click('[data-oeffne="suche"]');
  await page.fill('#suchfeld', 'smoking');
  await page.waitForSelector('.funde .fund');
  pruefe(name + ' Suche findet Smokings', (await page.locator('.funde .fund').count()) > 0);
  await page.fill('#suchfeld', '0252');
  await page.waitForFunction(() => document.querySelectorAll('.funde .fund').length === 1);
  pruefe(name + ' Suche nach Modellnummer', (await page.textContent('.funde .fund__name')).includes('Smoking'));
  await page.keyboard.press('Escape');
  pruefe(name + ' Escape schließt die Suche', !(await page.locator('#suche[open]').count()));

  /* ---- Kollektion: Filter ---- */
  await gehe('/kollektion.html?k=hochzeitsanzuege');
  const alle = +(await page.textContent('#zahl strong'));
  if (breite < 1041) await page.click('#filter-auf');
  await page.click('label.chip:has(input[name="stil"][value="smoking"])');
  await page.click('label.chip:has(input[name="farbe"][value="blau"])');
  if (breite < 1041) await page.click('#filter-zeigen');
  const gefiltert = +(await page.textContent('#zahl strong'));
  pruefe(name + ' Filter grenzen ein', gefiltert > 0 && gefiltert < alle, alle + ' → ' + gefiltert);
  pruefe(name + ' Filter stehen in der Adresse', page.url().includes('stil=smoking') && page.url().includes('farbe=blau'));
  await page.selectOption('#sortierung', 'preis-auf');
  const preise = await page.$$eval('#raster .preis__wert', (l) => l.map((e) => parseFloat(e.textContent.replace(/\./g, '').replace(',', '.'))));
  pruefe(name + ' Sortierung nach Preis', preise.every((p, i) => i === 0 || p >= preise[i - 1]));
  await page.click('#aktiv [data-alle-weg]');
  pruefe(name + ' Filter zurücksetzen', +(await page.textContent('#zahl strong')) === alle);

  /* ---- Produkt und Warenkorb ---- */
  await gehe('/produkt.html?p=0252-smoking-anzug');
  await page.click('#kauf button[type=submit]');
  pruefe(name + ' ohne Größe kein Kauf', (await page.textContent('#wahl-fehler')).includes('Größe'));
  await page.click('label.chip:has(input[name="farbe"][value="Dunkelblau"])');
  const groesse = await page.getAttribute('input[name="groesse"]', 'value');
  await page.click('label.chip:has(input[name="groesse"])');
  const preisText = (await page.textContent('#preis .preis__wert')).trim();
  await page.click('#kauf button[type=submit]');
  await page.waitForSelector('#korblade[open]');
  pruefe(name + ' Artikel liegt im Warenkorb', (await page.textContent('#korblade .zeile__zusatz')).includes('Größe ' + groesse));
  await page.click('#korblade [data-menge="1"]');
  pruefe(name + ' Menge ändern', (await page.textContent('#korblade output')).trim() === '2');
  pruefe(name + ' Fokus bleibt auf dem Mengenknopf', await page.evaluate(() => document.activeElement.dataset.menge === '1'));

  /* ---- Kasse ---- */
  await gehe('/kasse.html');
  await page.click('#bestellen');
  pruefe(name + ' Kasse verlangt Pflichtfelder', (await page.locator('.feld.fehler').count()) >= 6);
  await page.fill('#vorname', 'Max'); await page.fill('#nachname', 'Mustermann'); await page.fill('#email', 'max@example.org');
  await page.fill('#strasse', 'Musterweg 1'); await page.fill('#plz', '50667'); await page.fill('#ort', 'Köln');
  pruefe(name + ' Barzahlung nur bei Abholung', await page.isDisabled('input[name="zahlung"][value="bar"]'));
  await page.click('label.wahl__punkt:has(input[value="vorkasse"])');
  await page.check('input[name="agb"]');
  await page.click('#bestellen');
  await page.waitForSelector('#bestellt:not([hidden])');
  const nummer = (await page.textContent('#bestellt .bestaetigung__nummer')).trim();
  pruefe(name + ' Bestellung bestätigt', /MB-\d{6}-[A-Z0-9]{4}/.test(nummer), nummer);
  pruefe(name + ' Bankdaten bei Vorkasse', (await page.textContent('#bestellt')).includes('DE29 3706 2365 4605 9500 06'));
  pruefe(name + ' Warenkorb ist danach leer', (await page.evaluate(() => window.MUGA.korb.anzahl())) === 0);

  /* ---- Termin ---- */
  await gehe('/termin.html');
  await page.click('[data-weiter="2"]');
  pruefe(name + ' Termin verlangt ein Anliegen', await page.isVisible('#fehler-1'));
  await page.click('label.wahl__punkt:has(input[value="hochzeit"])');
  await page.click('[data-weiter="2"]');
  await page.waitForSelector('[data-start]:not([disabled])');
  const tag = await page.getAttribute('[data-tag][aria-pressed="true"]', 'data-tag');
  const uhr = (await page.textContent('[data-start]:not([disabled])')).trim();
  await page.click('[data-start]:not([disabled])');
  await page.click('[data-weiter="3"]');
  await page.fill('#vorname', 'Max'); await page.fill('#nachname', 'Mustermann');
  await page.fill('#email', 'max@example.org'); await page.fill('#telefon', '0221 1234567');
  await page.check('input[name="datenschutz"]');
  await page.click('#absenden');
  await page.waitForSelector('#fertig:not([hidden])');
  pruefe(name + ' Termin gebucht', /MG-[A-Z0-9]{6}/.test(await page.textContent('#fertig .bestaetigung__nummer')), tag + ' ' + uhr);

  const zweiter = await seite(browser, breite, hoehe);
  await zweiter.goto(basis + '/termin.html?art=hochzeit&datum=' + tag, { waitUntil: 'networkidle' });
  await zweiter.waitForSelector('[data-start]');
  pruefe(name + ' Verweis mit Anliegen und Tag öffnet bei der Uhrzeit', await zweiter.isVisible('[data-schritt="2"]'));
  const vergeben = await zweiter.$$eval('[data-start][disabled]', (l) => l.map((b) => b.textContent.trim()));
  pruefe(name + ' Zeit ist für andere Besucher vergeben', vergeben.includes(uhr), vergeben.join(' '));
  await zweiter.context().close();

  await page.click('[data-absagen]'); await page.click('[data-absagen]');
  await page.waitForSelector('#meine-liste li.abgesagt');
  pruefe(name + ' Termin abgesagt', true);

  /* ---- Größenberater ---- */
  await gehe('/masse.html');
  await page.fill('#brust-zahl', '104'); await page.fill('#hoehe-zahl', '180'); await page.fill('#bund-zahl', '92');
  pruefe(name + ' Größenberater: normale Größe 52', (await page.textContent('#erg-groesse')).trim() === '52');
  await page.fill('#hoehe-zahl', '192'); await page.fill('#bund-zahl', '88');
  pruefe(name + ' Größenberater: schlanke Größe 102', (await page.textContent('#erg-groesse')).trim() === '102');
  await page.fill('#hoehe-zahl', '170'); await page.fill('#bund-zahl', '102');
  pruefe(name + ' Größenberater: untersetzte Größe 26', (await page.textContent('#erg-groesse')).trim() === '26');
  await page.fill('#hals-zahl', '43');
  pruefe(name + ' Hemdgröße XL', (await page.textContent('#hemd-groesse')).trim() === 'XL');

  /* ---- Stil-Finder ---- */
  await gehe('/stilfinder.html');
  for (const wert of ['braeutigam', 'besonders', 'blau', '500']) await page.click('#finder [data-wert="' + wert + '"]');
  await page.waitForSelector('#finder .produktraster .karte');
  pruefe(name + ' Stil-Finder zeigt Vorschläge', (await page.locator('#finder .karte').count()) >= 3);

  /* ---- Kontakt ---- */
  await gehe('/kontakt.html');
  await page.fill('#vorname', 'Erika'); await page.fill('#nachname', 'Muster'); await page.fill('#email', 'erika@example.org');
  await page.fill('#betreff', 'Größe 58'); await page.fill('#nachricht', 'Führen Sie den Smoking in 58?');
  await page.check('input[name="datenschutz"]');
  await page.click('#kontakt-senden');
  await page.waitForSelector('#kontakt-fertig:not([hidden])');
  pruefe(name + ' Nachricht gesendet', (await page.textContent('#kontakt-fertig')).includes('angekommen'));

  /* ---- Verwaltung ---- */
  await gehe('/verwaltung.html');
  await page.fill('#schluessel', 'falsch');
  await page.click('#anmeldung button[type=submit]');
  await page.waitForSelector('#anmelde-fehler:not([hidden])');
  await page.fill('#schluessel', 'browser-test-schluessel-123');
  await page.click('#anmeldung button[type=submit]');
  await page.waitForSelector('#bereich:not([hidden])');
  pruefe(name + ' Verwaltung zeigt Termin und Bestellung', (await page.textContent('#v-inhalt')).includes('Mustermann'));
  await page.click('[data-zeige="bestellungen"]');
  pruefe(name + ' Verwaltung zeigt die Bestellnummer', (await page.textContent('#v-inhalt')).includes(nummer.replace('Bestellnummer ', '')));

  const stoerend = page.konsole.filter((m) => !/401|Unauthorized/.test(m));
  pruefe(name + ' keine Fehler in der Konsole', stoerend.length === 0, stoerend.slice(0, 3).join(' | '));
  await page.context().close();
}

server.listen(0, '127.0.0.1', async () => {
  const basis = 'http://127.0.0.1:' + server.address().port;
  const start = process.env.CHROMIUM_PFAD ? { executablePath: process.env.CHROMIUM_PFAD } : {};
  /* Bilder des Shops kommen von außen; hinter einem Proxy braucht der Browser dessen Adresse */
  if (process.env.HTTPS_PROXY) start.proxy = { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' };
  const browser = await chromium.launch(start);
  try {
    await lauf(browser, basis, 1440, 900);
    await lauf(browser, basis, 390, 844);
  } catch (e) {
    fehler++;
    console.log('ABBRUCH  ' + e.message.split('\n')[0]);
  }
  await browser.close();
  server.close();
  server.closeAllConnections();
  fs.rmSync(ordner, { recursive: true, force: true });
  console.log(fehler ? '\n' + fehler + ' Prüfung(en) fehlgeschlagen.' : '\nAlle Oberflächentests bestanden.');
  process.exit(fehler ? 1 : 0);
});
