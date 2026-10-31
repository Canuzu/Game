function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kChain(c, { at: T('why'), title: 'ZINSEN AUF ZINSEN', steps: [['1.000 €', '#fff'], ['1.050 €', th.b], ['1.102 €', th.a]], arrows: ['+5 %', '+5 % AUF 1.050'], notes: [['JEDES JAHR EIN GRÖSSERER SOCKEL', '#fff']] }) },
    { from: 'early', fn: c => kRule(c, { at: T('early'), tag: 'NOCH LÄNGER', big: '7.040 €', bigColor: th.b, sub: 'NACH 40 JAHREN BEI 5 % ZINSEN', lines: [] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: '72ER-REGEL', big: '72 ÷ 5', bigColor: th.b, sub: '≈ 14 JAHRE', lines: [['ZINSSATZ IN PROZENT', '#fff']] }) },
    { from: 'rule2', fn: c => kRule(c, { at: T('rule2'), tag: 'VERDOPPLUNG', big: '14 JAHRE', bigColor: th.y, sub: 'BEI 5 % ZINSEN', lines: [['1.000 € → 2.000 €', th.b]] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ACHTUNG', big: 'NUR BEISPIEL', bigColor: th.a, sub: 'ZINSEN SCHWANKEN, INFLATION FRISST', lines: [['KEINE ANLAGEBERATUNG', th.y]] }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WANN HAST DU', '#fff', 104], ['ANGEFANGEN', th.a, 112], ['ZU SPAREN?', th.b, 120]], chips: [['FRÜH', 'a'], ['SPÄT', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const yr = t => tw(t, [[T('go', .3), 0], [T('y10', .3), 0], [T('y10', 3.6), 10], [T('y20', .2), 10], [T('y20', 3.6), 20], [T('y30', .2), 20], [T('y30', 3.8), 30]], E.lin);
  const A = t => 1000 + 50 * yr(t), Bv = t => 1000 * Math.pow(1.05, yr(t));
  let o = kTitle(c, [['1.000 € · 5 %', th.a, 124], ['30 JAHRE', th.b, 124]], T('setup', 3.2));
  o += kCards(c, { labels: ['OHNE ZINSESZINS', 'MIT ZINSESZINS'], units: ['€', '€'], vals: [A, Bv], showAt: T('setup', 3.5), win: { side: 1, at: T('result', .1), text: '+1.822 € EXTRA ✓' }, bumps: [1e9, T('y30', 3.7)] });
  o += kCols(c, { max: 4400, H: 520, baseY: 1150, w: 280, cols: [{ x: 270, color: th.a, label: 'OHNE', fmt: v => nf(v) + ' €', val: A, at: T('setup', 3.6) }, { x: 810, color: th.b, label: 'MIT', fmt: v => nf(v) + ' €', val: Bv, at: T('setup', 3.8) }] });
  if (t > T('go')) o += G(PILL(540, 690, 'JAHR ' + Math.floor(yr(t) + .001), { size: 84, fill: th.y, ink: th.dark, px: 46 }), { s: pop(t, T('go', .3)), px: 540, py: 690, o: Math.min(1, pop(t, T('go', .3))) });
  const cv = 1 - ramp(t, T('setup', 3.0), T('setup', 3.4));
  if (cv > .01) o += G(TX(270, 880, '🐖', { size: 200 }) + TX(810, 880, '🌱', { size: 200 }) + TX(540, 860, 'VS', { size: 100, w: 900, fill: th.y }), { s: pop(t, T('hook', .3)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: KLEINER UNTERSCHIED', { size: 56, fill: th.y, ink: th.dark, px: 40 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('y30', 3.6), dur: 1.4, text: '4.322 €', color: th.b, sub: 'STATT 2.500 €' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '+ 1.822 €', color: th.y, sub: 'NUR DURCH ZINSESZINS' });
  return o;
}
