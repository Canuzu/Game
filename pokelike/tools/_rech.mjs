import { chromium } from 'playwright';
import { startOptionen } from './browser.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch(startOptionen());
const page = await browser.newPage({ viewport: { width: 1100, height: 950 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('FEHLER ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('KONSOLE ' + m.text()); });
await page.goto('file://' + join(HERE, '..', 'index.html'));
await page.waitForSelector('.title-screen', { timeout: 20000 });
await page.addScriptTag({ path: join(HERE, '..', 'data', 'sprites.js') }).catch(() => {});
await page.getByRole('button', { name: 'Neuer Run' }).click();
await page.waitForSelector('.starter-grid');
await page.locator('.starter:not(.locked)').first().click();
await page.click('text=Los geht’s');
await page.waitForSelector('.map-screen', { timeout: 10000 });
await page.evaluate(() => { PL.meta.setSetting('speed', 'sofort'); });

for (let i = 0; i < 30; i++) {
  const bild = await page.evaluate(() => document.body.getAttribute('data-screen'));
  if (bild === 'battle') break;
  if (await page.locator('.modal').count()) {
    const k = page.locator('.modal-actions .btn');
    if (await k.count()) await k.last().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(120); continue;
  }
  if (bild !== 'map') { await page.evaluate(() => PokelikeApp.show('map')); continue; }
  const offen = page.locator('.map-node.open');
  if (!(await offen.count())) break;
  await offen.first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(400);
}
console.log('Bildschirm:', await page.evaluate(() => document.body.getAttribute('data-screen')));

// Eine Attacke einsetzen, bis eine Rechnung im Protokoll steht.
for (let i = 0; i < 6; i++) {
  const kacheln = page.locator('.move-btn:not(:disabled)');
  if (!(await kacheln.count())) break;
  await kacheln.first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
  if (await page.locator('.log-line.hat-rechnung').count()) break;
}
const n = await page.locator('.log-line.hat-rechnung').count();
console.log('Zeilen mit Rechnung:', n);
if (n) {
  await page.locator('.log-line.hat-rechnung').last().click();
  await page.waitForSelector('.rechnung', { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/rechnung.png' });
  console.log(await page.locator('.rechnung').innerText());
}
await browser.close();
