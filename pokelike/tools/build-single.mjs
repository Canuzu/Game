/**
 * Baut aus index.html, den Skripten und dem Stylesheet eine einzige Datei.
 *
 *   node tools/build-single.mjs            → dist/pokelike.html   (komplett)
 *   node tools/build-single.mjs --fragment → dist/pokelike-fragment.html
 *
 * Die zweite Fassung lässt Doctype, <html>, <head> und <body> weg — für
 * Umgebungen, die den Seitenrahmen selbst mitbringen.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fragment = process.argv.includes('--fragment');

let html = readFileSync(join(ROOT, 'index.html'), 'utf8');

// Eingebettete Sprites, falls tools/build-sprites.mjs sie erzeugt hat. Die
// Mehrdatei-Fassung lädt stattdessen die animierten Bilder aus dem Netz.
// Ganz ans Ende, hinter den Startbefehl: Der Titelbildschirm steht dann
// schon, während die fünf Megabyte Bilder noch über die Leitung kommen.
const spritesAmEnde = existsSync(join(ROOT, 'data', 'sprites.js'));
if (spritesAmEnde) {
  html = html.replace('</body>', '<script src="data/sprites.js"></script>\n</body>');
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

/* Die Kennung dieser Fassung. Sie steckt in der Datei selbst und noch einmal
   in version.json daneben — nur so kann die Seite auf dem Startbildschirm
   eines Telefons merken, dass sie veraltet ist. */
let kurz = '';
try {
  kurz = '-' + execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString().trim();
} catch { /* kein git — dann reicht die Uhrzeit */ }
const build = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' + kurz;
const marke = "var BUILD = 'entwicklung';";
if (!html.includes(marke)) throw new Error('Die Baukennung aus js/update.js ist nicht auffindbar.');
html = html.replace(marke, "var BUILD = '" + build + "';");

const out = join(ROOT, 'dist', fragment ? 'pokelike-fragment.html' : 'pokelike.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
if (!fragment) {
  writeFileSync(join(ROOT, 'dist', 'version.json'), JSON.stringify({ build }) + '\n');
  // Das Manifest gehört neben die Seite: Ohne es ist die Kachel auf dem
  // Startbildschirm namenlos. In der Einzeldatei-Fassung zeigt der Verweis
  // ins Leere — das stört dort niemanden, iOS nimmt ohnehin das
  // apple-touch-icon aus dem Kopf der Seite.
  copyFileSync(join(ROOT, 'manifest.webmanifest'), join(ROOT, 'dist', 'manifest.webmanifest'));
}
console.log(out, '(' + (html.length / 1048576).toFixed(2) + ' MB)', '· Fassung ' + build);
