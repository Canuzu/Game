function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kChain(c, { at: T('why'), title: 'DER RABATT RECHNET GRÖSSER', steps: [['100 €', '#fff'], ['120 €', th.b], ['96 €', th.a]], arrows: ['+20 %', '−20 %'], notes: [['20 % VON 120 = 24 €', '#fff'], ['20 % VON 100 = 20 €', th.y]] }) },
    { from: 'total', fn: c => kRule(c, { at: T('total'), tag: 'INSGESAMT', big: '− 4 %', bigColor: th.a, sub: '1,2 × 0,8 = 0,96' }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'PLUS ≠ MINUS', sub: 'GLEICHE PROZENTE HEBEN SICH NIE AUF', lines: [['DU LANDEST IMMER DARUNTER', th.y]] }) },
    { from: 'rule2', fn: c => kRule(c, { at: T('rule2'), tag: 'GRÖSSERE PROZENTE', big: '+50 %, −50 %', bigColor: th.b, sub: '1,5 × 0,5 = 0,75', lines: [['NUR 75 € ÜBRIG', th.a]] }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WO HAT DICH', '#fff', 110], ['PROZENT-', th.a, 120], ['RECHNUNG', th.b, 120], ['ÜBERRASCHT?', th.y, 100]], chips: [['+20 %', 'a'], ['−20 %', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const A = t => tw(t, [[T('up', .5), 100], [T('up', 2.2), 120], [T('down2', .3), 120], [T('down2', 2.4), 96]]);
  let o = kTitle(c, [['+20 %  −20 %', th.a, 124], ['= 100 ?', th.b, 124]], T('setup', 2.2));
  o += kCards(c, { labels: ['NACH +20 %, DANN −20 %', 'START'], units: ['€', '€'], vals: [A, () => 100], showAt: T('setup', 2.5), bumps: [T('result', 1.0), 1e9] });
  o += kCols(c, { max: 125, H: 520, baseY: 1150, w: 280, cols: [{ x: 270, color: th.a, label: 'NACHHER', fmt: v => nf(v) + ' €', val: A, at: T('setup', 2.6) }, { x: 810, color: th.b, label: 'START', fmt: v => nf(v) + ' €', val: () => 100, at: T('setup', 2.8) }],
    line: { val: 100, label: 'START 100 €', at: T('setup', 2.8) } });
  const chip = (txt, at, col) => G(PILL(270, 760, txt, { size: 70, fill: col, ink: th.dark, px: 36 }), { s: pop(t, at), px: 270, py: 760, rot: -5, o: Math.min(1, pop(t, at)) * (1 - ramp(t, at + 1.8, at + 2.2)) });
  o += chip('+20 %', T('up', .3), th.b) + chip('−20 %', T('down', .3), th.a);
  const cv = 1 - ramp(t, T('setup', 2.0), T('setup', 2.4));
  if (cv > .01) o += G(TX(270, 880, '📈', { size: 200 }) + TX(810, 880, '📉', { size: 200 }) + TX(540, 860, '=?', { size: 120, w: 900, fill: th.y }), { s: pop(t, T('hook', 1.0)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: WIEDER 100!', { size: 76, fill: th.y, ink: th.dark, px: 44 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '96 € ≠ 100 €', color: th.a, sub: 'VIER EURO FEHLEN' });
  return o;
}
