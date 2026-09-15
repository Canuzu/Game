/* =============================================================================
 * raster.mjs — aus einem Punktraster wird ein SVG
 * -----------------------------------------------------------------------------
 * Drei Werkzeuge zeichnen auf dieselbe Weise: Zeichen (symbole), Effektformen
 * (effekte) und Gegenstände (gegenstaende). Jedes liest ein Raster aus
 * Buchstaben und schreibt daraus ein SVG. Das stand dreimal im Code — einmal
 * davon längst besser als die anderen beiden.
 *
 * Der Unterschied war die Sparsamkeit: Setzt man je Farbstrecke ein eigenes
 * <rect>, kommen für neunundsiebzig Zeichen 456 KB zusammen. Verschmilzt man
 * die Strecken erst waagerecht, dann senkrecht zu Rechtecken und legt alles
 * einer Farbe in einen Pfad, sind es rund ein Sechstel davon — bei genau
 * demselben Bild, Punkt für Punkt.
 *
 * Hier steht diese eine Art, es zu tun. Die Werkzeuge sagen nur noch, welche
 * Farbe zu welchem Buchstaben gehört.
 * ========================================================================== */

/**
 * Macht aus einem Raster ein SVG.
 *
 * @param {string[]} bild      Zeilen aus Buchstaben, alle gleich lang
 * @param {Function} farbeVon  Buchstabe → Farbe, oder null für »nichts«
 * @param {object}   opts      { n: Kantenlänge (Vorgabe 16), name: für Fehler }
 */
export function alsSVG(bild, farbeVon, opts) {
  opts = opts || {};
  const n = opts.n || 16;
  const name = opts.name || 'Raster';

  if (bild.length !== n) {
    throw new Error(name + ': ' + bild.length + ' Zeilen statt ' + n);
  }

  /* Erst waagerechte Strecken gleicher Farbe, dann senkrecht verschmelzen:
     Aus vielen Punkten werden wenige Rechtecke. */
  const kaesten = [];
  bild.forEach((zeile, y) => {
    if (zeile.length !== n) {
      throw new Error(name + ': Zeile ' + y + ' hat ' + zeile.length + ' statt ' + n + ' Punkte');
    }
    let x = 0;
    while (x < zeile.length) {
      const z = zeile[x];
      const f = farbeVon(z);
      if (f === null || f === undefined) { x++; continue; }
      let ende = x;
      while (ende + 1 < zeile.length && zeile[ende + 1] === z) ende++;
      const breite = ende - x + 1;
      const oben = kaesten.find((k) => k.f === f && k.x === x && k.b === breite && k.y + k.h === y);
      if (oben) oben.h++;
      else kaesten.push({ f: f, x: x, y: y, b: breite, h: 1 });
      x = ende + 1;
    }
  });

  /* Alles einer Farbe kommt in einen Pfad — das spart die Wiederholung des
     Farbwerts, und der ist der längste Teil jedes Rechtecks. */
  const nachFarbe = new Map();
  for (const k of kaesten) {
    const d = 'M' + k.x + ' ' + k.y + 'h' + k.b + 'v' + k.h + 'h-' + k.b + 'z';
    nachFarbe.set(k.f, (nachFarbe.get(k.f) || '') + d);
  }
  const teile = [];
  for (const [f, d] of nachFarbe) teile.push('<path fill="' + f + '" d="' + d + '"/>');

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n +
    '" shape-rendering="crispEdges">' + teile.join('') + '</svg>';
}

/** Ein SVG als Datenadresse, wie sie im CSS steht. */
export function alsAdresse(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
