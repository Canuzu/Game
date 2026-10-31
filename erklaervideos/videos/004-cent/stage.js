const V = day => 0.01 * Math.pow(2, day - 1);
function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DOPPELT, DOPPELT, DOPPELT', big: '2 × 2 × 2 …', bigColor: th.b, sub: '30 TAGE HINTEREINANDER', lines: [['2²⁹ = 536.870.912 CENT', '#fff']] }) },
    { from: 'why2', fn: c => kRule(c, { at: T('why2'), tag: 'LETZTE 5 TAGE', big: '97 %', bigColor: th.a, sub: 'DES ENDBETRAGS KOMMEN DA DAZU' }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'ERST LANGSAM', sub: 'DANN BOOM', lines: [['VERDOPPELN WIRKT LANGE HARMLOS', th.y]] }) },
    { from: 'real', fn: c => kRule(c, { at: T('real'), tag: 'IN ECHT', big: 'EXPONENTIELL', bigColor: th.b, sub: 'ERST UNAUFFÄLLIG, DANN EXPLOSIV', lines: [] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'DER TRICK', big: 'KOPF = LINEAR', bigColor: th.b, sub: 'WIR UNTERSCHÄTZEN VERDOPPELN' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WAS HÄTTEST', '#fff', 120], ['DU GENOMMEN?', th.y, 120]], chips: [['100.000 €', 'a'], ['1 CENT', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const day = t => tw(t, [[T('go', .3), 1], [T('d10', .2), 1], [T('d10', 2.4), 10], [T('d20', .2), 10], [T('d20', 2.6), 20], [T('d24', .2), 20], [T('d24', 2.2), 24],
                          [T('d25', .2), 24], [T('d25', 1.4), 25], [T('d30', .2), 25], [T('d30', 2.4), 30]], E.io);
  const A = () => 100000, Bv = t => V(day(t));
  let o = kTitle(c, [['100.000 €', th.a, 130], ['ODER 1 CENT?', th.b, 110]], T('setup', 2.2));
  o += kCards(c, { labels: ['SOFORT', '1 CENT, JEDEN TAG ×2'], units: ['€', '€'], vals: [A, Bv], fmt: [v => nf(v), v => v < 1000 ? nf(v, 2) : nf(v)], showAt: T('setup', 2.5),
                   win: { side: 1, at: T('result', .1), text: 'RECHTS GEWINNT ✓' }, bumps: [1e9, T('result', .1)] });
  o += kCols(c, { max: 5400000, H: 520, baseY: 1130, w: 280, cols: [
    { x: 270, color: th.a, label: 'SOFORT', fmt: v => nf(v) + ' €', val: A, at: T('setup', 2.6) }, { x: 810, color: th.b, label: '1 CENT × 2', fmt: v => (v < 1000 ? nf(v, 2) : nf(v)) + ' €', val: Bv, at: T('setup', 2.8) }] });
  // fliegende ×2-Marken bei jedem neuen Tag
  if (!window.__cross) { window.__cross = []; let last = 1; for (let tt = T('go'); tt < B.d30.t1 + 3; tt += .02) { const d = Math.floor(day(tt) + .001); if (d > last) { window.__cross.push(tt); last = d; } } }
  window.__cross.forEach((tc, i) => { const a = t - tc; if (a > 0 && a < 1.0) o += G(PILL(810 + (i % 3 - 1) * 90, 860 - a * 170, '×2', { size: 64, fill: th.b, ink: th.dark, px: 26 }), { s: pop(t, tc, .25), px: 810, py: 860, o: 1 - ramp(a, .55, 1.0) }); });
  if (t > T('go')) o += G(PILL(540, 690, 'TAG ' + Math.max(1, Math.floor(day(t) + .001)), { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: pop(t, T('go', .3)) * bump(t, T('d25', 1.0), .1) , px: 540, py: 690, o: Math.min(1, pop(t, T('go', .3))) });
  const cv = 1 - ramp(t, T('setup', 2.0), T('setup', 2.4));
  if (cv > .01) o += G(TX(270, 870, '💶', { size: 200 }) + TX(810, 870, '🪙', { size: 200 }) + TX(540, 850, 'VS', { size: 100, w: 900, fill: th.y }), { s: pop(t, T('hook', .3)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: 100.000!', { size: 80, fill: th.y, ink: th.dark, px: 46 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('d25', 1.1), dur: 1.4, text: 'ÜBERHOLT!', color: th.y, sub: 'TAG 25: 167.772 €' });
  o += kPunch(c, { at: T('d30', 1.5), dur: 1.5, text: '5.368.709 €', color: th.b, sub: 'AUS EINEM CENT' });
  o += kPunch(c, { at: T('result', .15), dur: 1.5, text: '× 53,7', color: th.y, sub: 'MEHR ALS 100.000 €' });
  return o;
}
