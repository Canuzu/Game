const P = n => { let q = 1; for (let i = 0; i < n; i++) q *= (365 - i) / 365; return 1 - q; };
function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: pairs },
    { from: 'big', fn: big },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'PAARE ZÄHLEN', bigColor: th.b, sub: 'ANZAHL PAARE = n × (n − 1) ÷ 2', lines: [['23 PERSONEN → 253 PAARE', '#fff']] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '365 TAGE', bigColor: th.a, sub: 'KEIN SCHALTJAHR, ALLE TAGE GLEICH LIKELY'.replace('LIKELY', 'WAHRSCHEINLICH') }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['TEILST DU', '#fff', 130], ['DEINEN', th.a, 120], ['GEBURTSTAG?', th.b, 110]], chips: [['JA!', 'a'], ['NEIN', 'b']] }) },
  ]);
}
function nAt(c, t) {
  const T = (id, o = 0) => c.B[id].t0 + o;
  return Math.round(tw(t, [[T('setup', .5), 1], [T('r1', .3), 1], [T('r1', 2.6), 10], [T('r2', .2), 10], [T('r2', 1.8), 20], [T('r3', .3), 20], [T('r3', 1.7), 23]]));
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o, n = t => nAt(c, t);
  let o = kTitle(c, [['WIE VIELE LEUTE', th.a, 104], ['BIS 2 GLEICHEN', th.b, 104], ['GEBURTSTAG?', th.y, 104]], T('setup', 2.2));
  o += kCards(c, { labels: ['PERSONEN IM RAUM', 'CHANCE AUF TREFFER'], units: ['', '%'], vals: [n, t => P(n(t)) * 100], fmt: [v => nf(v), v => nf(v, 1)], showAt: T('setup', 2.5),
                   bumps: [1e9, T('r3', 1.7)], win: { side: 1, at: T('result', .1), text: 'ÜBER 50 % ✓' } });
  const N = n(t), cols = 10, colors = [th.a, th.b, th.y, '#fff'];
  for (let i = 0; i < Math.min(N, 60); i++) {
    if (t < T('setup', 2.5)) break;
    const x = 90 + (i % cols) * 100, y = 600 + Math.floor(i / cols) * 100, k = pop(t, T('setup', .4) + i * .02 + .2);
    o += G(`<circle cx="${x}" cy="${y}" r="34" fill="${colors[i % 4]}" opacity=".95"/><circle cx="${x - 11}" cy="${y - 7}" r="5" fill="${th.dark}"/><circle cx="${x + 11}" cy="${y - 7}" r="5" fill="${th.dark}"/><path d="M${x - 13} ${y + 8} Q${x} ${y + 20} ${x + 13} ${y + 8}" fill="none" stroke="${th.dark}" stroke-width="4" stroke-linecap="round"/>`, { s: Math.min(1, k) , px: x, py: y, o: Math.min(1, k) });
  }
  const cv = 1 - ramp(t, T('setup', 2.0), T('setup', 2.4));
  if (cv > .01) o += G(TX(330, 900, '🎂', { size: 230 }) + TX(750, 900, '🎂', { size: 230 }) + TX(540, 880, '=?', { size: 130, w: 900, fill: th.y }), { s: pop(t, T('hook', 1.0)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: 183!', { size: 90, fill: th.y, ink: th.dark, px: 50 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  if (t > T('result', .1)) { // Treffer: zwei Personen leuchten
    const a = pop(t, T('result', .2)), p1 = [90 + 2 * 100, 600], p2 = [90 + 2 * 100, 600 + 200];
    o += G(`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${th.y}" stroke-width="10"/><circle cx="${p1[0]}" cy="${p1[1]}" r="46" fill="none" stroke="${th.y}" stroke-width="9"/><circle cx="${p2[0]}" cy="${p2[1]}" r="46" fill="none" stroke="${th.y}" stroke-width="9"/>` +
      PILL(640, 800, 'GLEICHER GEBURTSTAG!', { size: 44, fill: th.y, ink: th.dark }), { s: a, px: 540, py: 800, o: Math.min(1, a) });
  }
  o += kPunch(c, { at: T('result', .1), dur: 1.6, text: '23 REICHEN', color: th.y, sub: 'NICHT 183' });
  return o;
}
function pairs(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o, R = 330, cx = 540, cy = 860, N = 23;
  const pts = Array.from({ length: N }, (_, i) => [cx + R * Math.cos(i / N * 6.2832 - 1.5708), cy + R * Math.sin(i / N * 6.2832 - 1.5708)]);
  const total = N * (N - 1) / 2, shown = Math.round(tw(t, [[T('why2', .4), 0], [T('why2', 3.6), total]]));
  let lines = '', idx = 0;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { if (idx++ < shown) lines += `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[j][0]}" y2="${pts[j][1]}"/>`; }
  let o = G(TX(540, 330, 'NICHT PERSONEN, SONDERN PAARE', { size: 54, w: 900, fill: '#fff' }), { s: pop(t, T('why', .2)), px: 540, py: 320 });
  o += `<g stroke="${th.b}" stroke-width="2" opacity=".55">${lines}</g>`;
  pts.forEach(([x, y], i) => o += G(`<circle cx="${x}" cy="${y}" r="20" fill="${[th.a, th.b, th.y, '#fff'][i % 4]}"/>`, { s: pop(t, T('why', .3 + i * .03)), px: x, py: y }));
  o += G(PILL(540, 860, shown + ' PAARE', { size: 84, fill: th.dark, ink: th.y, px: 44 }), { s: pop(t, T('why2', .2)), px: 540, py: 860 });
  return o;
}
function big(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  let o = G(TX(540, 330, 'CHANCE AUF EINEN TREFFER', { size: 58, w: 900, fill: '#fff' }), { s: pop(t, T('big', .1)), px: 540, py: 320 });
  const mk = (x, n, col, at) => ({ x, color: col, label: n + ' LEUTE', val: tt => P(n) * 100 * ramp(tt, at, at + .9), fmt: v => nf(v, 1) + ' %', at });
  o += kCols(c, { max: 100, H: 620, baseY: 1130, w: 190, cols: [mk(150, 10, th.mute, T('big', .1)), mk(400, 23, th.b, T('big', .3)), mk(650, 30, th.y, T('big', .6)), mk(900, 57, th.a, T('big2', .2))],
    line: { val: 50, label: '50 %', at: T('big', .2) } });
  return o;
}
