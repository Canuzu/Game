const V1 = 100, V2 = 130, LANE_X0 = 130, LANE_X1 = 950;
function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kCols(c, { max: 60, H: 560, baseY: 1130, w: 190, cols: [[100, th.a, '100', 60, 150], [130, th.b, '130', 46.15, 400], [160, th.y, '160', 37.5, 650], [200, '#fff', '200', 30, 900]].map(([v, col, lab, min, x], i) => ({ x, color: col, label: lab + ' KM/H', val: t => min * ramp(t, T('why', .3 + i * .3), T('why', 1.2 + i * .3)), fmt: v => nf(v, 0) + ' MIN', at: T('why', .2 + i * .3) })) }) },
    { from: 'cost', fn: c => kRule(c, { at: T('cost'), tag: 'LUFTWIDERSTAND', big: 'v × v', bigColor: th.a, sub: 'DOPPELTES TEMPO = VIERFACHER WIDERSTAND', lines: [['130 STATT 100: +69 %', th.y]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: '13 MIN', bigColor: th.b, sub: 'GESPART AUF 100 KM', lines: [['DAFÜR DEUTLICH MEHR SPRIT', th.a]] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: 'FREIE FAHRT', bigColor: th.a, sub: 'KEIN STAU, KEINE PAUSEN, KEIN LIMIT' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['SCHNELL', th.a, 140], ['ODER', '#fff', 100], ['ENTSPANNT?', th.b, 130]], chips: [['130', 'a'], ['100', 'b']] }) },
  ]);
}
const car = (x, y, col, th, t) => `<g transform="translate(${x} ${y})"><rect x="-90" y="-44" width="180" height="62" rx="22" fill="${col}" filter="url(#sh)"/><path d="M-50 -44 L-26 -78 L38 -78 L64 -44Z" fill="${col}"/><path d="M-36 -48 L-20 -70 L-4 -70 L-4 -48Z M8 -48 L8 -70 L34 -70 L52 -48Z" fill="${th.dark}" opacity=".8"/><circle cx="-52" cy="20" r="20" fill="${th.dark}"/><circle cx="52" cy="20" r="20" fill="${th.dark}"/><circle cx="-52" cy="20" r="9" fill="#fff"/><circle cx="52" cy="20" r="9" fill="#fff"/></g>`;
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const sim = t => tw(t, [[T('r1', .2), 0], [T('r1', 3.4), 15], [T('r2', .1), 15], [T('r2', 3.0), 46.154], [T('r3', .3), 46.154], [T('r3', 3.0), 54], [T('r4', .2), 54], [T('r4', 2.4), 60]], E.lin);
  const kmA = t => Math.min(100, V1 * sim(t) / 60), kmB = t => Math.min(100, V2 * sim(t) / 60);
  let o = kTitle(c, [['100 ODER 130', th.a, 124], ['KM/H?', th.b, 124]], T('setup', 1.2));
  o += kCards(c, { labels: ['100 KM/H', '130 KM/H'], units: ['km', 'km'], vals: [kmA, kmB], fmt: [v => nf(v, 1), v => nf(v, 1)], showAt: T('setup', 1.5),
                   win: { side: 1, at: T('r2', 2.9), text: 'ZUERST IM ZIEL ✓' }, bumps: [T('r4', 2.0), 1e9] });
  const lanes = [[780, th.a, kmA], [1000, th.b, kmB]];
  lanes.forEach(([y, col, km], i) => {
    const k = pop(t, T('setup', 1.6 + i * .2)), x = LANE_X0 + (LANE_X1 - LANE_X0) * km(t) / 100;
    o += G(`<rect x="${LANE_X0 - 60}" y="${y - 10}" width="${LANE_X1 - LANE_X0 + 150}" height="30" rx="15" fill="${th.card}" stroke="${th.line}" stroke-width="3"/>
      <rect x="${LANE_X1 + 20}" y="${y - 60}" width="16" height="120" fill="#fff" opacity=".9"/><rect x="${LANE_X1 + 20}" y="${y - 60}" width="16" height="60" fill="${th.dark}" opacity=".8"/>` + car(x, y - 24, col, th, t), { s: Math.min(1, k), px: 540, py: y, o: Math.min(1, k) });
  });
  const m = Math.floor(sim(t)), sec = Math.floor((sim(t) - m) * 60);
  if (t > T('go', .1)) o += G(PILL(540, 600, `${m}:${String(sec).padStart(2, '0')} MIN`, { size: 80, fill: th.y, ink: th.dark, px: 46 }), { s: pop(t, T('go', .1)), px: 540, py: 600 });
  const cv = 1 - ramp(t, T('setup', 1.0), T('setup', 1.4));
  if (cv > .01) o += G(TX(270, 880, '🚗', { size: 200 }) + TX(810, 880, '🏎️', { size: 200 }) + TX(540, 860, 'VS', { size: 100, w: 900, fill: th.y }), { s: pop(t, T('hook', 1.0)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: VIEL SCHNELLER!', { size: 64, fill: th.y, ink: th.dark, px: 40 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('result', .15), dur: 1.7, text: '13:51 MIN', color: th.y, sub: 'DER GANZE UNTERSCHIED' });
  return o;
}
