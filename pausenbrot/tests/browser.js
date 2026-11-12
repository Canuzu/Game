/* Oberflächentests in einem echten Browser.
 * Aufruf: node tests/browser.js  (braucht Playwright, sonst überspringt er sich)
 * Startet selbst einen kleinen Dateiserver auf einem freien Port. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.log('Playwright fehlt, Oberflächentests übersprungen.'); process.exit(0); }

const WURZEL = path.join(__dirname, '..');
const ARTEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const pfad = path.join(WURZEL, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!pfad.startsWith(WURZEL) || !fs.existsSync(pfad)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': ARTEN[path.extname(pfad)] || 'application/octet-stream' });
  fs.createReadStream(pfad).pipe(res);
});

let fehler = 0;
function pruefe(name, ok, zusatz) { if (!ok) fehler++; console.log((ok ? 'OK    ' : 'FEHLER') + '  ' + name + (zusatz && !ok ? ': ' + zusatz : '')); }

server.listen(0, '127.0.0.1', async () => {
  const basis = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  try {
    for (const [b, h] of [[1440, 900], [390, 844]]) {
      const n = b + ' px';
      const ctx = await browser.newContext({ viewport: { width: b, height: h }, hasTouch: b < 700, isMobile: b < 700 });
      const page = await ctx.newPage();
      const konsole = [];
      page.on('console', (m) => { if (m.type() === 'error') konsole.push(m.text()); });
      page.on('pageerror', (e) => konsole.push(e.message));
      page.on('response', (r) => { if (r.status() >= 400) konsole.push(r.status() + ' ' + r.url()); });

      /* Start */
      await page.goto(basis + 'index.html', { waitUntil: 'networkidle' });
      pruefe(n + ' Türschild zeigt offen oder geschlossen', /Offen|Geschlossen/.test(await page.textContent('[data-schild]')));
      pruefe(n + ' Theke hat elf Beschriftungen', (await page.locator('#theke .punkt').count()) === 11);
      await page.click('[data-alle]');
      await page.waitForTimeout(1200);
      pruefe(n + ' Alles beschriften zeigt alle Zettel', (await page.locator('#theke .zettelchen.da').count()) === 11);
      pruefe(n + ' Kaffeetafel trägt die Preise', (await page.textContent('#kaffeetafel')).includes('3,30 €'));
      pruefe(n + ' kein waagerechter Überlauf', (await page.evaluate(() => document.documentElement.scrollWidth)) === b);

      /* Vorbestellen */
      await page.goto(basis + 'karte.html', { waitUntil: 'networkidle' });
      pruefe(n + ' Zettel ist anfangs leer', (await page.textContent('#zettel-inhalt')).includes('Noch leer'));
      await page.click('[data-nimm="b-camembert"]');
      await page.click('[data-nimm="b-camembert"]');
      await page.click('[data-nimm="g-espresso"]');
      pruefe(n + ' Zähler an der Tafel', (await page.textContent('[data-anzahl="b-camembert"]')) === '2×');
      await page.check('[data-extra="salat"]');
      await page.check('[data-extra="doppelt"]');
      pruefe(n + ' Summe mit Salat und doppeltem Espresso', (await page.textContent('.zettel__summe')).includes('8,70 €'), await page.textContent('.zettel__summe'));
      await page.click('[data-menge="-1"][data-i="1"]');
      pruefe(n + ' Zeile verschwindet bei null', (await page.locator('.zeile').count()) === 1);
      await page.reload({ waitUntil: 'networkidle' });
      pruefe(n + ' Zettel bleibt nach Neuladen', (await page.textContent('.zettel__summe')).includes('6,00 €'));
      await page.click('#abholform button[type="submit"]');
      pruefe(n + ' Name ist Pflicht', await page.isVisible('#abholform .feld--fehler'));
      await page.fill('#name', 'Anna');
      await page.click('#abholform button[type="submit"]');
      await page.waitForSelector('#versand .versand');
      const text = await page.textContent('#versand pre');
      pruefe(n + ' Bestellung ist vorgeschrieben', text.includes('2× Camembert (mit Salat) (6,00 €)') && text.includes('Name: Anna') && /Abholen: \w+, \d+\. \w+, \d\d:\d\d Uhr/.test(text), text);
      const wa = await page.getAttribute('#versand a[href^="https://wa.me/"]', 'href');
      pruefe(n + ' WhatsApp-Verweis geht an das Café', wa.startsWith('https://wa.me/491773216170?text=Hallo%20Pausenbrot'));

      /* Tisch */
      await page.goto(basis + 'tisch.html?anlass=feier', { waitUntil: 'networkidle' });
      pruefe(n + ' Feier stellt zehn Personen ein', (await page.textContent('#personen')) === '10');
      pruefe(n + ' Hinweis für große Runden', await page.isVisible('#gruppe-hinweis'));
      pruefe(n + ' Uhrzeit ist vorgeschlagen', !!(await page.inputValue('#zeit')));
      await page.fill('#name', 'Anna'); await page.fill('#telefon', '0221 123456');
      await page.click('#tischform button[type="submit"]');
      await page.waitForSelector('#versand .versand');
      pruefe(n + ' Tischanfrage vorgeschrieben', (await page.textContent('#versand pre')).includes('Personen: 10'));

      /* Catering */
      await page.goto(basis + 'catering.html', { waitUntil: 'networkidle' });
      pruefe(n + ' Kontakt wird übernommen', (await page.inputValue('#telefon')) === '0221 123456');
      await page.fill('#gaeste', '3');
      await page.click('#cateringform button[type="submit"]');
      pruefe(n + ' Weniger als fünf Gäste abgelehnt', await page.isVisible('#cateringform .feld--fehler'));
      await page.fill('#gaeste', '25');
      await page.locator('input[name="extra"][value="vegan"]').check({ force: true });
      await page.click('#cateringform button[type="submit"]');
      await page.waitForSelector('#versand .versand');
      pruefe(n + ' Catering-Anfrage vorgeschrieben', (await page.textContent('#versand pre')).includes('Besonderes: vegan'));

      for (const s of ['impressum.html', 'datenschutz.html']) await page.goto(basis + s, { waitUntil: 'networkidle' });
      pruefe(n + ' keine Fehler in der Konsole', konsole.length === 0, konsole.join(' | '));
      await ctx.close();
    }
  } catch (e) { fehler++; console.log('ABBRUCH  ' + e.message.split('\n')[0]); }
  await browser.close();
  server.close();
  console.log(fehler ? '\n' + fehler + ' Prüfung(en) fehlgeschlagen.' : '\nAlle Oberflächentests bestanden.');
  process.exit(fehler ? 1 : 0);
});
