/**
 * Baut aus index.html, den Skripten und dem Stylesheet eine einzige Datei.
 *
 *   node tools/build-single.mjs            → dist/pokelike.html   (komplett)
 *   node tools/build-single.mjs --fragment → dist/pokelike-fragment.html
 *
 * Die zweite Fassung lässt Doctype, <html>, <head> und <body> weg — für
 * Umgebungen, die den Seitenrahmen selbst mitbringen.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fragment = process.argv.includes('--fragment');

let html = readFileSync(join(ROOT, 'index.html'), 'utf8');

// Eingebettete Sprites, falls tools/build-sprites.mjs sie erzeugt hat. Die
// Mehrdatei-Fassung lädt stattdessen die animierten Bilder aus dem Netz.
if (existsSync(join(ROOT, 'data', 'sprites.js'))) {
  html = html.replace('<script src="data/dex.js"></script>',
    '<script src="data/dex.js"></script>\n<script src="data/sprites.js"></script>');
}

// Stylesheet einbetten
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
  '<style>\n' + readFileSync(join(ROOT, href), 'utf8') + '</style>');

// Skripte einbetten — die Reihenfolge aus index.html bleibt erhalten
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  '<script>\n' + readFileSync(join(ROOT, src), 'utf8') + '\n</script>');

if (fragment) {
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
  const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/) || [, ''])[1];
  html = `<title>${title}</title>\n${style}\n${body.trim()}\n`;
}

const out = join(ROOT, 'dist', fragment ? 'pokelike-fragment.html' : 'pokelike.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(out, '(' + (html.length / 1048576).toFixed(2) + ' MB)');
