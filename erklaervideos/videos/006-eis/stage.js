function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'ARCHIMEDES', big: 'VERDRÄNGT = GEWICHT', bigColor: th.b, sub: 'EIS WIEGT SO VIEL WIE DAS WASSER, DAS ES VERDRÄNGT', lines: [['SCHMELZWASSER = GENAU DIESE MENGE', '#fff']] }) },
    { from: 'why2', fn: c => kRule(c, { at: T('why2'), tag: 'MASSE BLEIBT MASSE', big: '1 g = 1 g', bigColor: th.y, sub: 'EIS WIRD ZU GLEICH VIEL WASSER' }) },
    { from: 'twist', fn: c => kRule(c, { at: T('twist'), tag: 'ABER', big: 'EIS AN LAND', bigColor: th.a, sub: 'SCHMILZT INS MEER → MEERESSPIEGEL STEIGT', lines: [['GLETSCHER, EISSCHILD', th.b]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'SCHWIMMT = EGAL', bigColor: th.y, sub: 'PEGEL BLEIBT GLEICH', lines: [['EIS VON LAND: PEGEL STEIGT', th.a]] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'GENAU GENOMMEN', big: 'KLEINE DETAILS', bigColor: th.b, sub: 'Z. B. SALZ IM MEERWASSER', lines: [['IM GLAS ZUHAUSE: KEIN UNTERSCHIED', '#fff']] }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['LÄUFT DAS', '#fff', 120], ['GLAS ÜBER?', th.y, 120]], chips: [['JA', 'a'], ['NEIN', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const melt = t => tw(t, [[T('r2', .2), 0], [T('r3', 3.2), 1]], E.io);            // 0 = Eis, 1 = Wasser
  const ice = t => 100 * (1 - melt(t)), water = t => 100 * melt(t);
  let o = kTitle(c, [['EISWÜRFEL IM GLAS', th.a, 100], ['STEIGT DER PEGEL?', th.b, 100]], T('setup', 1.6));
  o += kCards(c, { labels: ['EIS', 'SCHMELZWASSER'], units: ['g', 'g'], vals: [ice, water], fmt: [v => nf(v, 0), v => nf(v, 0)], showAt: T('setup', 1.9), win: { side: 1, at: T('result', .1), text: 'PEGEL GLEICH ✓' }, bumps: [1e9, T('result', .1)] });
  const k = pop(t, T('setup', 1.6)), gx = 540, gw = 420, top = 700, bot = 1230, level = 860, m = melt(t);
  const s = 230 * Math.pow(1 - m, 1 / 3) + 1, cy = level - .083 * s + s / 2, wob = Math.sin(t * 2.5) * 4 * (1 - m);
  o += G(
    (s > 4 ? `<rect x="${gx - s / 2 + wob}" y="${cy - s / 2}" width="${s}" height="${s}" rx="${Math.min(24, s / 4)}" fill="#BFEFFF" stroke="#fff" stroke-width="4" opacity=".95"/><rect x="${gx - s / 2 + 14 + wob}" y="${cy - s / 2 + 14}" width="${s * .3}" height="${s * .2}" rx="8" fill="#fff" opacity=".6"/>` : '') +
    `<rect x="${gx - gw / 2 + 6}" y="${level}" width="${gw - 12}" height="${bot - level - 10}" rx="16" fill="${th.b}" opacity=".38"/>` +
    `<path d="M${gx - gw / 2} ${top} L${gx - gw / 2 + 30} ${bot} Q${gx - gw / 2 + 36} ${bot + 22} ${gx - gw / 2 + 70} ${bot + 22} L${gx + gw / 2 - 70} ${bot + 22} Q${gx + gw / 2 - 36} ${bot + 22} ${gx + gw / 2 - 30} ${bot} L${gx + gw / 2} ${top}" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round" opacity=".85"/>` +
    `<line x1="${gx - gw / 2 - 90}" y1="${level}" x2="${gx + gw / 2 + 90}" y2="${level}" stroke="${th.y}" stroke-width="6" stroke-dasharray="16 12"/>` + PILL(gx + gw / 2 + 150, level - 36, 'PEGEL', { size: 34, fill: th.y, ink: th.dark, px: 22 }), { s: Math.min(1, k), px: 540, py: 950, o: Math.min(1, k) });
  if (m > .02 && m < .98) for (let i = 0; i < 3; i++) { const a = ((t * 1.4 + i * .33) % 1); o += `<circle cx="${gx - 40 + i * 40}" cy="${level + 20 + a * 200}" r="${8 - a * 4}" fill="#BFEFFF" opacity="${1 - a}"/>`; }
  const cv = 1 - ramp(t, T('setup', 1.2), T('setup', 1.6));
  if (cv > .01) o += G(TX(270, 880, '🧊', { size: 200 }) + TX(810, 880, '🥤', { size: 200 }) + TX(540, 860, '=?', { size: 110, w: 900, fill: th.y }), { s: pop(t, T('hook', 1.0)), px: 540, py: 820, o: cv });
  const g = pop(t, T('guess', .5)) * (1 - ramp(t, T('setup'), T('setup', .3)));
  if (g > .01) o += G(PILL(540, 1100, 'KLAR: ÜBERLAUFEN!', { size: 68, fill: th.y, ink: th.dark, px: 44 }), { s: g, px: 540, py: 1100, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  if (t > T('r1', .5) && t < T('r2')) o += G(PILL(540, 1340, '≈ 92 % DES EISES UNTER WASSER', { size: 34, fill: th.b, ink: th.dark, px: 26 }), { s: pop(t, T('r1', .5)), px: 540, py: 1340 });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: 'GLEICH!', color: th.y, sub: 'DER PEGEL BLEIBT' });
  return o;
}
