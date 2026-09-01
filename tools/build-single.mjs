/* =============================================================================
 * build-single.mjs — Einzeldatei-Fassung erzeugen
 * -----------------------------------------------------------------------------
 * Fügt Stylesheet und Skripte direkt in das HTML ein, sodass eine einzige
 * Datei übrig bleibt. Praktisch zum Verschicken oder auf einen USB-Stick legen.
 *
 *   node tools/build-single.mjs            -> dist/schach.html  (vollständig)
 *   node tools/build-single.mjs --fragment -> dist/schach-fragment.html
 *
 * Die Fragment-Fassung lässt Doctype, <html>, <head> und <body> weg. Sie ist
 * für Umgebungen gedacht, die den Seitenrahmen selbst mitbringen.
 * ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const fragment = process.argv.includes('--fragment');

let html = read('index.html');

/* Stylesheet einbetten */
html = html.replace(
  /<link rel="stylesheet" href="css\/style\.css">/,
  '<style>\n' + read('css/style.css') + '\n</style>'
);

/* Skripte in der Reihenfolge einbetten, in der sie im HTML stehen */
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) =>
  '<script>\n' + read(src) + '\n</script>'
);

if (fragment) {
  /* Alles vor dem eingebetteten Stylesheet fällt weg — Doctype, Meta-Angaben
   * und Favicon bringt die umgebende Seite selbst mit. Über einen regulären
   * Ausdruck ginge das nicht: der Favicon ist ein Daten-URI mit SVG darin,
   * dessen spitze Klammern jedes Muster in die Irre führen.               */
  const styleStart = html.indexOf('<style>');
  if (styleStart < 0) throw new Error('Kein eingebettetes Stylesheet gefunden');

  html = '<title>Schach</title>\n' + html.slice(styleStart);
  html = html.replace('</head>', '');
  html = html.replace(/<body([^>]*)>/, (_, attrs) => {
    /* Attribute des <body> als kleines Startskript nachbilden */
    const theme = /data-board-theme="([^"]+)"/.exec(attrs);
    return theme
      ? `<script>document.body.dataset.boardTheme = ${JSON.stringify(theme[1])};</script>`
      : '';
  });
  html = html.replace(/<\/body>\s*<\/html>\s*$/, '');
}

const out = fragment ? 'dist/schach-fragment.html' : 'dist/schach.html';
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, out), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`${out} geschrieben — ${kb} KB, keine externen Dateien nötig.`);
