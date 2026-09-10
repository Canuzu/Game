/**
 * build-icons.mjs — malt das App-Symbol und schreibt das Manifest
 *
 *   node tools/build-icons.mjs
 *
 * Wer die Seite auf den Startbildschirm legt, bekommt ohne eigenes Symbol
 * einen Bildschirmausschnitt als Kachel und die Adresse als Namen. Damit das
 * aussieht wie eine App, braucht es drei Dinge: ein apple-touch-icon (iOS
 * nimmt ausschließlich das), ein Manifest (Android und die Browser) und ein
 * paar Meta-Zeilen, die den Vollbildmodus und den Namen festlegen.
 *
 * Gezeichnet wird der Pokéball hier als SVG und von Chromium in PNG
 * umgewandelt — so bleibt das Symbol im Quelltext lesbar und lässt sich
 * ändern, ohne ein Malprogramm zu öffnen. Die fertigen Bilder landen als
 * Base64 in index.html und im Manifest: keine zusätzlichen Dateien, die beim
 * Ausliefern vergessen werden könnten.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startOptionen } from './browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Ein Pokéball auf dunklem Grund, mit dem Gold des Spiels als Ring. Undurch-
   sichtig und quadratisch: iOS rundet die Ecken selbst, und ein durchsichtiger
   Rand würde dort schwarz. */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grund" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b2030"/>
      <stop offset="1" stop-color="#0b0d13"/>
    </linearGradient>
    <linearGradient id="oben" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6a4d"/>
      <stop offset="1" stop-color="#d8402a"/>
    </linearGradient>
    <linearGradient id="unten" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dfe3ee"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grund)"/>
  <circle cx="256" cy="256" r="176" fill="#ffcb3d" opacity="0.18"/>
  <g>
    <circle cx="256" cy="256" r="160" fill="url(#unten)"/>
    <path d="M96 256a160 160 0 0 1 320 0z" fill="url(#oben)"/>
    <rect x="96" y="238" width="320" height="36" fill="#12151d"/>
    <circle cx="256" cy="256" r="60" fill="#12151d"/>
    <circle cx="256" cy="256" r="44" fill="#f4f6fb"/>
    <circle cx="256" cy="256" r="22" fill="#12151d"/>
    <circle cx="238" cy="238" r="8" fill="#ffffff" opacity=".9"/>
    <circle cx="256" cy="256" r="160" fill="none" stroke="#ffcb3d" stroke-width="10"/>
  </g>
</svg>`;

const browser = await chromium.launch(startOptionen());
const page = await browser.newPage();

async function png(size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    '<style>html,body{margin:0;padding:0;background:#0b0d13}svg{display:block;width:' +
    size + 'px;height:' + size + 'px}</style>' + SVG);
  const buf = await page.screenshot({ omitBackground: false });
  return buf.toString('base64');
}

const icon180 = await png(180);
const icon192 = await png(192);
const icon512 = await png(512);
await browser.close();

const uri = (b64) => 'data:image/png;base64,' + b64;

/* ---------- Manifest ------------------------------------------------------ */

const manifest = {
  name: 'Pokélike+',
  short_name: 'Pokélike+',
  description: 'Ein Pokémon-Roguelike für den Browser — alle neun Generationen.',
  start_url: './',
  scope: './',
  // `browser` statt `standalone`: Die Kachel öffnet die Seite so, wie der
  // Browser sie sonst auch zeigt — mit seinen Leisten und ohne, dass etwas
  // unter der Uhr verschwindet.
  display: 'browser',
  background_color: '#0b0d13',
  theme_color: '#12151d',
  lang: 'de',
  icons: [
    { src: uri(icon192), sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: uri(icon512), sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: uri(icon512), sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
writeFileSync(join(ROOT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

/* ---------- index.html ---------------------------------------------------- */

const START = '<!-- symbol:anfang -->';
const ENDE = '<!-- symbol:ende -->';
const block = [
  START,
  '<link rel="icon" href="' + uri(icon192) + '">',
  '<link rel="apple-touch-icon" href="' + uri(icon180) + '">',
  '<link rel="manifest" href="manifest.webmanifest">',
  // Nur der Name der Kachel. Kein Vollbildmodus: Der schiebt die Seite auf
  // dem iPhone unter die Uhr, und das Spiel rechnet nirgends mit einem
  // Abstand nach oben. Es soll aussehen wie in Safari — nur eben mit Symbol.
  '<meta name="apple-mobile-web-app-title" content="Pokélike+">',
  ENDE
].join('\n');

let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
if (html.includes(START)) {
  html = html.replace(new RegExp(START + '[\\s\\S]*?' + ENDE), block);
} else {
  html = html.replace(/<link rel="icon"[^>]*>/, block);
}
writeFileSync(join(ROOT, 'index.html'), html);

console.log('Symbol      180, 192 und 512 Pixel');
console.log('Manifest    manifest.webmanifest (' + (JSON.stringify(manifest).length / 1024).toFixed(1) + ' KB)');
console.log('index.html  Symbolblock erneuert');
