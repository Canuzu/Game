/* =============================================================================
 * stoff.js — fließender Satin als Hintergrund der Bühne (WebGL)
 * -----------------------------------------------------------------------------
 * Ein kleines Programm auf der Grafikkarte zeichnet einen dunklen Stoff mit
 * langen, schrägen Falten, die sich langsam bewegen. Das Licht folgt dem Zeiger.
 * Gezeichnet wird in halber Auflösung und nur, solange die Bühne zu sehen ist.
 * Ohne WebGL oder bei reduzierter Bewegung bleibt der ruhige Verlauf aus dem CSS.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA = window.MUGA || {};

  var ECKEN = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var STOFF = [
    'precision highp float;',
    'uniform vec2 uA;',      // Auflösung des Zeichenfelds
    'uniform float uT;',     // Zeit in Sekunden
    'uniform vec2 uZ;',      // Zeiger, -1 bis 1
    'uniform float uS;',     // Rollweg der Bühne, 0 bis 1
    'uniform float uK;',     // Bildpunkte je CSS-Pixel im Zeichenfeld
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float rausch(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * rausch(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }',
    /* Der Stoff: gedrehte Koordinaten ergeben lange Falten, die schräg durchs Bild fallen.
     * Rauschen verbiegt sie und lässt sie unterschiedlich tief sein. Auf den Kämmen der
     * Falten liegt ein schmales Glanzband, wie bei Satin unter einem Spot. */
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * uA) / uA.y;',
    '  vec2 q = vec2(p.x * 0.84 + p.y * 0.54, p.y * 0.84 - p.x * 0.54);',
    '  float t = uT * 0.045;',
    '  float w1 = fbm(vec2(q.x * 0.9, q.y * 0.34) + vec2(t * 0.6, -t * 0.25));',
    '  float w2 = fbm(vec2(q.x * 0.6, q.y * 0.26) + vec2(5.2 - t * 0.4, 1.3 + t * 0.3));',
    '  float ph = q.x * 11.5 + w1 * 10.5 + sin(q.y * 2.3 + w2 * 4.0) * 1.3 + uS * 1.6 + uZ.x * 0.45;',
    '  float kamm = 0.72 * sin(ph) + 0.28 * sin(ph * 2.3 + w2 * 6.0 + 1.7);',
    '  float flanke = smoothstep(-1.0, 0.9, kamm);',
    '  float glanz = pow(max(kamm, 0.0), 5.0);',
    '  float tiefe = 0.3 + 0.7 * w2;',
    '  vec3 grund = vec3(0.118, 0.094, 0.079);',
    '  vec3 c = grund * (0.22 + 0.95 * mix(0.5, flanke, tiefe));',
    '  c += glanz * tiefe * vec3(0.44, 0.31, 0.24) * (0.74 + 0.2 * uZ.y);',
    '  c += glanz * glanz * tiefe * vec3(0.10, 0.012, 0.02);',
    /* feine Köperbindung, in CSS-Pixeln gerechnet, damit sie überall gleich fein ist */
    '  vec2 g = gl_FragCoord.xy / uK;',
    '  c += sin((g.x + g.y) * 1.57) * sin((g.x - g.y) * 0.785) * 0.005;',
    '  vec2 uv = gl_FragCoord.xy / uA;',
    '  float vig = smoothstep(1.25, 0.25, length((uv - vec2(0.55, 0.55)) * vec2(1.0, 1.2)));',
    '  c *= mix(0.42, 1.0, vig);',
    '  c += (hash(gl_FragCoord.xy + fract(uT) * 91.0) - 0.5) / 255.0 * 2.5;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  function programm(gl, quelle, art) {
    var s = gl.createShader(art);
    gl.shaderSource(s, quelle);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }

  /* Startet den Stoff auf einem <canvas>. Liefert null, wenn es nicht geht. */
  M.stoff = function (leinwand, buehne) {
    var gl = null;
    try {
      gl = leinwand.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
    } catch (e) { gl = null; }
    if (!gl) return null;
    var genau = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!genau || !genau.precision) return null;

    var ecken = programm(gl, ECKEN, gl.VERTEX_SHADER), flaeche = programm(gl, STOFF, gl.FRAGMENT_SHADER);
    if (!ecken || !flaeche) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, ecken);
    gl.attachShader(prog, flaeche);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var puffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var ort = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(ort);
    gl.vertexAttribPointer(ort, 2, gl.FLOAT, false, 0, 0);

    var uA = gl.getUniformLocation(prog, 'uA'), uT = gl.getUniformLocation(prog, 'uT'),
        uZ = gl.getUniformLocation(prog, 'uZ'), uS = gl.getUniformLocation(prog, 'uS'), uK = gl.getUniformLocation(prog, 'uK');

    var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var zeiger = { x: 0, y: 0, zx: 0, zy: 0 }, rollweg = 0, sichtbar = true, laeuft = false, verloren = false;
    var start = performance.now(), letztes = 0, massstab = 1;

    function groesse() {
      /* halbe Auflösung genügt für weiche Falten und schont Akku und Grafikkarte */
      massstab = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      var b = Math.max(2, Math.round(leinwand.clientWidth * massstab)), h = Math.max(2, Math.round(leinwand.clientHeight * massstab));
      if (leinwand.width !== b || leinwand.height !== h) {
        leinwand.width = b;
        leinwand.height = h;
        gl.viewport(0, 0, b, h);
      }
    }

    function zeichne(jetzt) {
      if (verloren) return;
      zeiger.x += (zeiger.zx - zeiger.x) * 0.05;
      zeiger.y += (zeiger.zy - zeiger.y) * 0.05;
      gl.uniform2f(uA, leinwand.width, leinwand.height);
      gl.uniform1f(uT, (jetzt - start) / 1000);
      gl.uniform2f(uZ, zeiger.x, zeiger.y);
      gl.uniform1f(uS, rollweg);
      gl.uniform1f(uK, massstab);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function runde(jetzt) {
      if (!laeuft) return;
      /* rund 30 Bilder je Sekunde reichen für die langsame Bewegung */
      if (jetzt - letztes > 30) { letztes = jetzt; zeichne(jetzt); }
      requestAnimationFrame(runde);
    }
    function pruefe() {
      var soll = sichtbar && !document.hidden && !ruhig && !verloren;
      if (soll && !laeuft) { laeuft = true; requestAnimationFrame(runde); }
      if (!soll) laeuft = false;
    }

    leinwand.addEventListener('webglcontextlost', function (e) { e.preventDefault(); verloren = true; laeuft = false; });
    window.addEventListener('resize', function () { groesse(); if (!laeuft) zeichne(performance.now()); });
    document.addEventListener('visibilitychange', pruefe);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (t) { sichtbar = t[0].isIntersecting; pruefe(); }).observe(buehne || leinwand);
    }
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener('pointermove', function (e) {
        zeiger.zx = e.clientX / window.innerWidth * 2 - 1;
        zeiger.zy = 1 - e.clientY / window.innerHeight * 2;
      }, { passive: true });
    }

    groesse();
    zeichne(performance.now());
    leinwand.classList.add('bereit');
    pruefe();

    return { rolle: function (wert) { rollweg = wert; } };
  };
})();
