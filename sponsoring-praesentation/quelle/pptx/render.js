// Rendert Grafiken der Web-Präsentation als transparente PNGs für die PowerPoint-Fassung.
// Aufruf (im Ordner quelle/):  node build.mjs && node pptx/render.js
// Benötigt Playwright mit Chromium.
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'render');
fs.mkdirSync(out, { recursive: true });
const deckUrl = 'file://' + path.join(root, 'index.html');
const logo = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/logo.json'), 'utf8'));

const HIDE_CHROME = `
  html,body,#viewport{background:transparent!important}
  #stage{background:transparent!important;box-shadow:none!important}
  #bg,#watermark,#spot,#brand,#progress,#hud,#start{display:none!important}`;

async function main() {
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // ---------- Logos ----------
  const logoPage = async (name, { ribbon = true, word = true, red = '#D82034', ink = '#000', grey = '#808080', vb = '12 40 436 380', w = 1600, noCross = false }) => {
    const redPath = noCross ? logo.red.split(/(?=M)/).filter((c) => !c.includes('Q')).join('') : logo.red;
    const [, , vw, vh] = vb.split(' ').map(Number);
    const h = Math.round((w * vh) / vw);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">` +
      (ribbon ? `<path fill="${red}" fill-rule="evenodd" d="${redPath}"/>` : '') +
      (word ? `<path fill="${ink}" fill-rule="evenodd" d="${logo.black}"/><path fill="${grey}" fill-rule="evenodd" d="${logo.grey}"/>` : '') + '</svg>';
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await page.screenshot({ path: path.join(out, name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  };
  await logoPage('logo', {});
  await logoPage('logo-weiss', { ink: '#fff', grey: 'rgba(255,255,255,.82)' });
  await logoPage('band', { word: false, vb: '124 42 212 210', w: 1200 });
  await logoPage('band-weiss', { word: false, red: '#fff', vb: '124 42 212 210', w: 1200 });
  await logoPage('band-wasserzeichen', { word: false, red: 'rgba(216,32,52,0.07)', vb: '124 42 212 210', w: 1600, noCross: true });

  // ---------- Symbole ----------
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const symbols = [...html.matchAll(/<symbol id="i-([\w-]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)];
  for (const [, id, vb, body] of symbols) {
    for (const [suffix, col] of [['rot', '#D82034'], ['weiss', '#ffffff']]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="256" height="256" fill="none" stroke="${col}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
      await page.setViewportSize({ width: 256, height: 256 });
      await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
      await page.screenshot({ path: path.join(out, `icon-${id}-${suffix}.png`), omitBackground: true, clip: { x: 0, y: 0, width: 256, height: 256 } });
    }
  }

  // ---------- Ausschnitte aus der Präsentation ----------
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(deckUrl + '#1');
  await page.addStyleTag({ content: HIDE_CHROME });
  await page.waitForTimeout(1200);
  const shot = async (name, slide, step, clip, wait = 3800, extra = '') => {
    await page.evaluate(([i, s]) => window.__deck.show(i, s, { dir: 1, instant: true }), [slide, step]);
    if (extra) await page.evaluate(extra);
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(out, name + '.png'), omitBackground: true, clip });
    console.log('  ' + name);
  };
  await shot('agenda-fotos', 1, 0, { x: 1080, y: 80, width: 800, height: 940 });
  const hideCol = "document.querySelectorAll('.s-swisslife .col-l').forEach(e => e.style.visibility='hidden')";
  await shot('europa-grau', 2, 0, { x: 990, y: 100, width: 910, height: 850 }, 3800, hideCol);
  await shot('europa-rot', 2, 1, { x: 990, y: 100, width: 910, height: 850 }, 4200, hideCol);
  await shot('deutschland', 3, 0, { x: 1150, y: 80, width: 690, height: 920 }, 4200);
  await shot('kugel', 6, 0, { x: 900, y: 60, width: 960, height: 960 }, 4500);
  await shot('hub', 7, 0, { x: 150, y: 190, width: 1620, height: 860 }, 4000, "document.querySelectorAll('.hub-k,.hub-h').forEach(e => e.style.visibility='hidden')");
  await shot('anzeige', 9, 0, { x: 990, y: 70, width: 900, height: 940 }, 4500);
  for (let i = 0; i < 3; i++) await shot(`produkt-${i + 1}`, 10, 1, { x: 120 + i * 557, y: 410, width: 567, height: 570 }, 4200);
  await shot('tester-app', 11, 1, { x: 860, y: 80, width: 1000, height: 880 }, 3800);
  await shot('tester-vorteil', 11, 2, { x: 860, y: 80, width: 1000, height: 880 }, 3800);
  await shot('collage', 12, 0, { x: 100, y: 340, width: 1760, height: 660 }, 4200);
  await shot('telefone', 14, 0, { x: 360, y: 300, width: 1200, height: 780 }, 11000, "document.querySelectorAll('.s-komm .kicker,.s-komm .hl,.s-komm .sub').forEach(e => e.style.visibility='hidden')");
  await shot('konfetti', 16, 1, { x: 0, y: 0, width: 1920, height: 1080 }, 1250,
    "document.querySelectorAll('#finale > :not(.confetti)').forEach(e => e.style.visibility='hidden')");

  // ---------- Hintergrund ----------
  const bgPage = await ctx.newPage();
  await bgPage.goto(deckUrl + '#1');
  await bgPage.addStyleTag({ content: '#slides,#brand,#progress,#hud,#watermark,#spot,#start{display:none!important}#stage{box-shadow:none!important}' });
  await bgPage.waitForTimeout(800);
  await bgPage.screenshot({ path: path.join(out, 'hintergrund.png'), clip: { x: 0, y: 0, width: 1920, height: 1080 } });

  console.log(errors.length ? 'Fehler:\n' + errors.join('\n') : 'Rendern fertig: ' + fs.readdirSync(out).length + ' Dateien');
  await browser.close();
}
main();
