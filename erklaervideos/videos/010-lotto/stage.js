const SETA = [1, 2, 3, 4, 5, 6], SETB = [7, 19, 24, 33, 41, 48], CH = 13983816;
function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'MUSTER-FALLE', big: '1-2-3-4-5-6', bigColor: th.a, sub: 'FÜHLT SICH FALSCH AN, IST ES NICHT', lines: [['JEDE KOMBINATION: 1 ZU 13.983.816', '#fff']] }) },
    { from: 'diff', fn: c => kRule(c, { at: T('diff'), tag: 'ECHTER UNTERSCHIED', big: 'GEWINN TEILEN', bigColor: th.y, sub: 'VIELE TIPPEN GEBURTSTAGE (BIS 31)', lines: [['SELTENE ZAHLEN = WENIGER TEILEN', th.b]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'GLEICHE CHANCE', bigColor: th.b, sub: 'EGAL WIE HÜBSCH DIE ZAHLEN SIND' }) },
    { from: 'payout', fn: c => kRule(c, { at: T('payout'), tag: 'AUSZAHLUNG', big: '≈ 50 %', bigColor: th.a, sub: 'DER EINSÄTZE KOMMEN ALS GEWINN ZURÜCK', lines: [] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'SECHS RICHTIGE', big: '1 : 14 MIO.', bigColor: th.a, sub: '13.983.816 MÖGLICHKEITEN' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WELCHE ZAHLEN', '#fff', 112], ['TIPPST DU?', th.y, 130]], chips: [['1 – 6', 'a'], ['ZUFALL', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const v = t => tw(t, [[T('r1', .2), 1], [T('r2', .2), 1], [T('r2', 3.2), CH]], E.io);
  const v2 = t => tw(t, [[T('r3', .2), 1], [T('r3', 2.6), CH]], E.io), vb = t => t < T('r3', .2) ? 1 : v2(t);
  let o = kTitle(c, [['1-2-3-4-5-6', th.a, 120], ['ODER ZUFALL?', th.b, 110]], T('setup', 1.8));
  o += kCards(c, { labels: ['1 – 2 – 3 – 4 – 5 – 6', 'SECHS ZUFALLSZAHLEN'], units: ['', ''], vals: [v, vb], fmt: [x => '1 : ' + nf(x), x => '1 : ' + nf(x)], showAt: T('setup', 2.1), bumps: [T('r2', 3.2), T('r3', 2.6)] });
  // Lottoschein 7 x 7
  const kk = pop(t, T('setup', 2.2)), cell = 108, x0 = 540 - 3.5 * cell, y0 = 560;
  let grid = '';
  for (let i = 1; i <= 49; i++) {
    const cx = x0 + ((i - 1) % 7) * cell + cell / 2, cy = y0 + Math.floor((i - 1) / 7) * cell + cell / 2;
    const a = SETA.includes(i), b = SETB.includes(i), on = ramp(t, T('r1', .2 + (a ? SETA.indexOf(i) : b ? SETB.indexOf(i) : 0) * .25), T('r1', .6 + (a ? SETA.indexOf(i) : SETB.indexOf(i)) * .25));
    const fill = a && on > .5 ? th.a : b && on > .5 ? th.b : th.card, ink = (a || b) && on > .5 ? th.dark : '#fff';
    grid += G(`<circle cx="${cx}" cy="${cy}" r="42" fill="${fill}" stroke="${th.line}" stroke-width="3"/>` + TX(cx, cy + 14, String(i), { size: 40, w: 900, fill: ink }), { s: (a || b) && on > .5 ? 1 + .25 * Math.max(0, 1 - ((t - T('r1', .2)) % 1)) * 0 : 1, px: cx, py: cy });
  }
  o += G(grid, { s: Math.min(1, kk), px: 540, py: 900, o: Math.min(1, kk) });
  if (t > T('r3', 2.6)) o += G(PILL(540, 500, 'GENAU GLEICH ✓', { size: 56, fill: th.y, ink: th.dark, px: 40 }), { s: pop(t, T('r3', 2.6)), px: 540, py: 500 });
  const cv = 1 - ramp(t, T('setup', 1.4), T('setup', 1.8));
  if (cv > .01) o += G(TX(270, 880, '🔢', { size: 200 }) + TX(810, 880, '🎲', { size: 200 }) + TX(540, 860, 'VS', { size: 100, w: 900, fill: th.y }), { s: pop(t, T('hook', .3)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: ZUFALL!', { size: 80, fill: th.y, ink: th.dark, px: 44 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: 'GLEICH!', color: th.y, sub: 'KEIN GEDÄCHTNIS' });
  return o;
}
