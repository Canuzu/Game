// Baut die Präsentation:
//  1. quelle/data.js       – Logo, Karten und Bildpfade für die Entwicklungsfassung (index.html)
//  2. ../Sponsoringvorgespraech.html – eine einzige Datei, alles eingebettet, läuft offline per Doppelklick
//
// Aufruf:  node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rd = (p) => fs.readFileSync(path.join(here, p), 'utf8');
const json = (p) => JSON.parse(rd(p));

// ---------- Logo in Buchstaben zerlegen (für die Buchstaben-Animation) ----------
function contours(d) {
  return d.split(/(?=M)/).filter(Boolean).map((c) => {
    const nums = c.match(/-?\d*\.?\d+/g).map(Number);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
      y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
    }
    return { d: c, box: [x0, y0, x1, y1] };
  });
}
function letters(d) {
  const cs = contours(d);
  const inside = (a, b) => a.box[0] >= b.box[0] && a.box[1] >= b.box[1] && a.box[2] <= b.box[2] && a.box[3] <= b.box[3] && a !== b;
  const groups = [];
  for (const c of cs) {
    const parent = cs.find((p) => inside(c, p));
    if (!parent) groups.push({ d: c.d, box: c.box.slice(), holes: [] });
  }
  for (const c of cs) {
    const parent = cs.find((p) => inside(c, p));
    if (parent) groups.find((g) => g.d === parent.d).holes.push(c.d);
  }
  return groups
    .map((g) => ({ d: g.d + g.holes.join(''), x: +((g.box[0] + g.box[2]) / 2).toFixed(1) }))
    .sort((a, b) => a.x - b.x);
}

const logo = json('assets/data/logo.json');
logo.letters = { black: letters(logo.black), grey: letters(logo.grey) };

const DATA = {
  logo,
  europe: json('assets/data/europe.json'),
  germany: json('assets/data/germany.json'),
};

const imgDir = path.join(here, 'assets/img');
const IMAGES = {};
for (const f of fs.readdirSync(imgDir).sort()) {
  if (f.endsWith('.webp')) IMAGES[f.replace(/\.webp$/, '')] = 'assets/img/' + f;
}

fs.writeFileSync(
  path.join(here, 'data.js'),
  '// Automatisch erzeugt von build.mjs – nicht von Hand bearbeiten.\n' +
    'window.DECK_DATA=' + JSON.stringify(DATA) + ';\n' +
    'window.DECK_IMAGES=' + JSON.stringify(IMAGES, null, 1) + ';\n'
);

// ---------- Einzeldatei ----------
const b64 = (file) => fs.readFileSync(path.join(here, file)).toString('base64');
const mime = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const dataUri = (file) => `data:${mime[path.extname(file)]};base64,${b64(file)}`;

let css = rd('deck.css').replace(/url\((assets\/fonts\/[^)]+)\)/g, (_, f) => `url(${dataUri(f)})`);
const IMAGES_INLINE = Object.fromEntries(Object.entries(IMAGES).map(([k, v]) => [k, dataUri(v)]));
const dataJs =
  'window.DECK_DATA=' + JSON.stringify(DATA) + ';\n' + 'window.DECK_IMAGES=' + JSON.stringify(IMAGES_INLINE) + ';\n';

let html = rd('index.html');
html = html.replace('<link rel="stylesheet" href="deck.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script src="data.js"></script>', () => `<script>\n${dataJs}</script>`);
html = html.replace('<script src="deck.js"></script>', () => `<script>\n${rd('deck.js')}\n</script>`);
html = html.replace('href="assets/img/icon-180.png"', () => `href="${dataUri('assets/img/icon-180.png')}"`);
if (/src="(data|deck)\.js"|href="deck\.css"/.test(html)) throw new Error('Einbetten fehlgeschlagen');

const out = path.join(here, '..', 'Sponsoringvorgespraech.html');
fs.writeFileSync(out, html);
console.log('data.js geschrieben');
console.log(`${path.relative(process.cwd(), out)}: ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
