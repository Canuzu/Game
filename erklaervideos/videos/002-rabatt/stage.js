function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: why },
    { from: 'total', fn: c => kRule(c, { at: T('total'), tag: 'IN WIRKLICHKEIT', big: '44 %', bigColor: th.a, sub: 'STATT 50 % RABATT' }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: '0,7 × 0,8', sub: '= 0,56 → NUR 44 % RABATT', lines: [['NICHT 30 + 20', '#fff']] }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'STAPEL-CHECK', big: 'NACHRECHNEN', sub: 'RABATTE ADDIEREN SICH NICHT', lines: [['10 % + 10 % = 19 %', th.b], ['25 % + 25 % = 43,75 %', th.a]] }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WELCHE', '#fff', 130], ['RABATT-FALLE', th.a, 104], ['KENNST DU?', th.b, 120]], chips: [['2 RABATTE', 'a'], ['1 RABATT', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const A = t => tw(t, [[T('s1', .5), 100], [T('s1', 2.0), 70], [T('s2b', .3), 70], [T('s2b', 2.2), 56]]);
  const Bv = t => tw(t, [[T('s3', .4), 100], [T('s3', 2.4), 50]]);
  let o = kTitle(c, [['30 % + 20 %', th.a, 124], ['ODER 50 %?', th.b, 124]], B.setup.t1 + .05);
  o += kCards(c, { labels: ['ERST −30 %, DANN −20 %', 'DIREKT −50 %'], units: ['€', '€'], vals: [A, Bv], showAt: T('setup', .3),
                   win: { side: 1, at: T('win', .1), text: 'GÜNSTIGER ✓' }, bumps: [T('result', 1.0), T('result', 2.2)] });
  o += kCols(c, { max: 100, H: 560, baseY: 1190, w: 280, cols: [
    { x: 270, color: th.a, label: '2 RABATTE', fmt: v => nf(v) + ' €', val: A, at: T('setup', .4) }, { x: 810, color: th.b, label: '1 RABATT', fmt: v => nf(v) + ' €', val: Bv, at: T('setup', .7) }],
    line: { val: 100, label: 'ALTER PREIS 100 €', at: T('setup', .6) } });
  const chip = (txt, x, at, col) => G(PILL(x, 760, txt, { size: 64, fill: col, ink: th.dark, px: 36 }), { s: pop(t, at), px: x, py: 760, rot: -5, o: Math.min(1, pop(t, at)) * (1 - ramp(t, at + 1.8, at + 2.2)) });
  o += chip('−30 %', 270, T('s1', .3), th.a) + chip('−20 %', 270, T('s2', .3), th.a) + chip('−50 %', 810, T('s3', .3), th.b);
  const hv = 1 - ramp(t, T('setup', .1), T('setup', .5));
  if (hv > .01) {
    const kk = c.keys('hook'), disc = (txt, x, col, at) => G(`<circle cx="${x}" cy="820" r="118" fill="${col}" filter="url(#sh)"/>` + TX(x, 842, txt, { size: 56, w: 900, fill: th.dark }), { s: pop(t, at), px: x, py: 820, o: hv });
    o += disc('−30 %', 140, th.a, T('hook', .3)) + disc('−20 %', 440, th.a, kk[0] ?? T('hook', 2)) + disc('−50 %', 900, th.b, kk[1] ?? T('hook', 3));
    o += G(TX(290, 845, '+', { size: 100, w: 900, fill: '#fff' }), { s: pop(t, kk[0] ?? T('hook', 2)), px: 290, py: 820, o: hv });
    o += G(TX(670, 845, '=?', { size: 100, w: 900, fill: th.y }), { s: pop(t, kk[1] ?? T('hook', 3)), px: 670, py: 820, o: hv });
  }
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1060, 'KLAR: GLEICH!', { size: 70, fill: th.y, ink: th.dark, px: 40 }), { s: g, px: 540, py: 1060, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 800, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 800, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('result', .15), dur: 1.5, text: '56 € vs 50 €', color: th.y });
  o += kPunch(c, { at: T('win', 2.4), dur: 1.5, text: '6 € MEHR', color: th.a, sub: 'FÜR DIE ZWEI RABATTE' });
  return o;
}
function why(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  let o = G(TX(540, 330, 'JEDER RABATT: NEUER PREIS', { size: 60, w: 900, fill: '#fff' }), { s: pop(t, T('why', .2)), px: 540, py: 320 });
  [['100 €', '#fff', 150], ['70 €', th.a, 540], ['56 €', th.a, 930]].forEach(([txt, col, x], i) =>
    o += G(`<circle cx="${x}" cy="820" r="125" fill="${th.card}" stroke="${col}" stroke-width="8" filter="url(#sh)"/>` + TX(x, 845, txt, { size: 70, w: 900, fill: col }), { s: pop(t, T('why', .6 + i * .6)), px: x, py: 820 }));
  [['−30 %', 345, T('why', 1.0)], ['−20 %', 735, T('why', 1.6)]].forEach(([txt, x, at]) =>
    o += G(TX(x, 835, '→', { size: 90, w: 900, fill: th.y }) + PILL(x, 700, txt, { size: 40, fill: th.y, ink: th.dark }), { s: pop(t, at), px: x, py: 790 }));
  o += G(PILL(540, 1060, '20 % VON 70 € = 14 €', { size: 44, fill: '#fff', ink: th.dark, px: 36 }), { s: pop(t, T('why2', .3)), px: 540, py: 1060 });
  o += G(PILL(540, 1170, 'NICHT 20 €', { size: 44, fill: th.a, ink: th.dark, px: 36 }), { s: pop(t, T('why2', 1.5)), px: 540, py: 1170 });
  return o;
}
