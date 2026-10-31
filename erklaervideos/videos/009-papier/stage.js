const TH0 = 1e-4;                                              // Blattdicke in Metern
const thick = n => TH0 * Math.pow(2, n);
const fmtLen = m => m < 1 ? nf(m * 100, 1) + ' cm' : m < 1000 ? nf(m, 0) + ' m' : nf(m / 1000, m < 1e5 ? 1 : 0) + ' km';
function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'VERDOPPELN', big: '2⁴² × 0,1 mm', bigColor: th.b, sub: '≈ 440.000 KILOMETER', lines: [['MOND: 384.400 KM', th.y]] }) },
    { from: 'why2', fn: c => kRule(c, { at: T('why2'), tag: 'DIE LETZTEN ZWEI', big: '75 %', bigColor: th.a, sub: 'DER ENDHÖHE KOMMEN AUS FALTUNG 41 UND 42' }) },
    { from: 'fifty', fn: c => kRule(c, { at: T('fifty'), tag: '50 FALTUNGEN', big: '113 MIO. KM', bigColor: th.y, sub: '¾ DES WEGS ZUR SONNE', lines: [] }) },
    { from: 'real', fn: c => kRule(c, { at: T('real'), tag: 'IN ECHT', big: '≈ 7 MAL', bigColor: th.a, sub: 'DANN IST SCHLUSS', lines: [['DAS PAPIER WIRD ZU DICK', '#fff']] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'VERDOPPELN', bigColor: th.y, sub: 'WIRKT LANGSAM, DANN GEWALTIG', lines: [['42 FALTUNGEN = MOND', th.b]] }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WIE OFT HÄTTEST', '#fff', 104], ['DU GESCHÄTZT?', th.y, 120]], chips: [['< 100', 'a'], ['> 1.000', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const n = t => tw(t, [[T('go', .3), 0], [T('f1', .2), 0], [T('f1', 2.6), 10], [T('f2', .2), 10], [T('f2', 2.4), 20], [T('f2b', .2), 20], [T('f2b', 2.4), 23], [T('f3', .2), 23], [T('f3', 3.0), 30], [T('f4', .2), 30], [T('f4', 3.0), 40], [T('f5', .2), 40], [T('f5', 1.4), 41], [T('result', .1), 41], [T('result', 1.3), 42]], E.lin);
  const dim = t => thick(n(t));
  let o = kTitle(c, [['PAPIER FALTEN', th.a, 118], ['BIS ZUM MOND', th.b, 118]], T('setup', 1.8));
  o += kCards(c, { labels: ['PAPIERSTAPEL', 'MOND'], units: ['', ''], vals: [dim, () => 384400000], fmt: [fmtLen, () => '384.400 km'], showAt: T('setup', 2.1), win: { side: 0, at: T('result', .9), text: 'ÜBER DEM MOND ✓' }, bumps: [T('result', 1.2), 1e9] });
  // Log-Skala: gleiche Höhe pro Faltung
  const baseY = 1250, H = 680, top = 9, lg = m => clamp((Math.log10(m) + 4) / (top + 4));
  const kk = pop(t, T('setup', 2.2));
  o += G(`<rect x="470" y="${baseY - H}" width="140" height="${H}" rx="24" fill="${th.card}" stroke="${th.line}" stroke-width="3"/>` +
    [['HAUS · 10 m', 10], ['EVEREST · 8,8 km', 8849], ['WELTALL · 100 km', 1e5], ['MOND · 384.400 km', 3.844e8]].map(([lab, m], i) => {
      const y = baseY - lg(m) * H; return `<line x1="130" y1="${y}" x2="950" y2="${y}" stroke="${i === 3 ? th.y : th.mute}" stroke-width="4" stroke-dasharray="14 12" opacity=".8"/>` + PILL(i % 2 ? 790 : 290, y - 28, lab, { size: 30, fill: i === 3 ? th.y : th.card, ink: i === 3 ? th.dark : '#fff', px: 20 });
    }).join('') +
    (() => { const h = Math.max(14, lg(dim(t)) * H); return RECT(480, baseY - h, 120, h, th.a, { r: 20, shadow: true }) + PILL(540, baseY - h - 50, fmtLen(dim(t)), { size: 40, fill: '#fff', ink: th.dark }); })() +
    PILL(540, baseY + 60, '(LOG-SKALA)', { size: 26, fill: th.card, ink: th.mute, px: 16 }), { s: kk, px: 540, py: 800, o: Math.min(1, kk) });
  if (t > T('go')) o += G(PILL(300, 620, Math.floor(n(t) + .001) + '× GEFALTET', { size: 52, fill: th.y, ink: th.dark, px: 34 }), { s: pop(t, T('go', .3)), px: 300, py: 620 });
  const cv = 1 - ramp(t, T('setup', 1.4), T('setup', 1.8));
  if (cv > .01) o += G(TX(270, 880, '📄', { size: 200 }) + TX(810, 880, '🌕', { size: 200 }) + TX(540, 860, '→', { size: 110, w: 900, fill: th.y }), { s: pop(t, T('hook', .3)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: TAUSENDE!', { size: 76, fill: th.y, ink: th.dark, px: 44 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('f2b', 1.7), dur: 1.3, text: '839 m', color: th.a, sub: 'HÖHER ALS DER BURJ KHALIFA' });
  o += kPunch(c, { at: T('f3', 2.9), dur: 1.4, text: 'WELTALL!', color: th.b, sub: 'NACH 30 FALTUNGEN' });
  o += kPunch(c, { at: T('result', .15), dur: 1.7, text: '42 MAL', color: th.y, sub: '≈ 440.000 KM' });
  return o;
}
