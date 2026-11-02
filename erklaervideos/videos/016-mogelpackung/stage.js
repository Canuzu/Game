function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'compare', fn: c => kRule(c, { at: T('compare'), tag: 'ANDERS GESAGT', big: '10 ZAHLEN, 9 BEKOMMEN', bigColor: th.a, sub: '450 g STATT 500 g = 90 %' }) },
    { from: 'shrink', fn: c => kRule(c, { at: T('shrink'), tag: 'DAS HEISST', big: 'SHRINKFLATION', bigColor: th.y, sub: 'PACKUNG SCHRUMPFT, PREIS BLEIBT' }) },
    { from: 'year', fn: c => kRule(c, { at: T('year'), tag: 'IM JAHR', big: '+ 14 €', bigColor: th.a, sub: '1 PACKUNG PRO WOCHE, GLEICHE MENGE', lines: [['58 STATT 52 PACKUNGEN', '#fff']] }) },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DER TRICK', big: 'PREIS FETT', bigColor: th.b, sub: 'INHALT KLEIN GEDRUCKT' }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'DEIN PLAN', big: 'GRUNDPREIS', bigColor: th.b, sub: 'STEHT AM REGAL: € PRO KG ODER LITER' }) },
    { from: 'tip2', fn: c => kRule(c, { at: T('tip2'), tag: 'SO VERGLEICHST DU', big: 'FAIR', bigColor: th.y, sub: 'MARKEN UND PACKUNGSGRÖSSEN', lines: [['OHNE RECHNEN', th.b]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'PREIS PRO EINHEIT', bigColor: th.y, sub: 'NICHT DER PACKUNGSPREIS' }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '2,49 € / PACKUNG', bigColor: th.a, sub: 'BEISPIELWERTE, PRÜF DEINE PRODUKTE' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WELCHES', '#fff', 120], ['PRODUKT IST', th.a, 104], ['KLEINER GEWORDEN?', th.b, 84]], chips: [['FRÜHER', 'a'], ['HEUTE', 'b']] }) },
  ]);
}
function pack(c, x, y, s, col, g, at) {
  const { t, th } = c, k = pop(t, at);
  return G(RECT(x - 130, y - 110, 260, 220, col, { r: 30, shadow: true }) + TX(x, y + 8, g, { size: 78, w: 900, fill: th.dark }) + PILL(x, y + 78, '2,49 €', { size: 34, fill: '#fff', ink: th.dark, px: 22 }),
    { s: s * Math.min(1, k), px: x, py: y, o: Math.min(1, k) });
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const A = t => 4.98 * ramp(t, T('k1', .3), T('k1', 2.2)), Bv = t => 5.53 * ramp(t, T('k2', .2), T('k2', 1.6));
  let o = kTitle(c, [['GLEICHER PREIS', th.a, 112], ['11 % TEURER?', th.b, 120]], T('setup2', .1));
  o += kCards(c, { labels: ['FRÜHER: 500 g', 'HEUTE: 450 g'], units: ['€/kg', '€/kg'], vals: [A, Bv], fmt: [v => nf(v, 2), v => nf(v, 2)], showAt: T('setup2', .4), win: { side: 0, at: T('result', .1), text: 'FRÜHER BILLIGER ✓' }, bumps: [1e9, T('k2', 1.6)] });
  o += pack(c, 270, 690, 1.25, th.a, '500 g', T('setup', .6));
  o += pack(c, 810, 690, 1.15, th.b, '450 g', T('setup2', .6));
  o += kCols(c, { max: 6, H: 300, baseY: 1230, w: 280, cols: [{ x: 270, color: th.a, label: 'FRÜHER', fmt: v => nf(v, 2) + ' €', val: A, at: T('k1', .1) }, { x: 810, color: th.b, label: 'HEUTE', fmt: v => nf(v, 2) + ' €', val: Bv, at: T('k2', .1) }] });
  o += kOpening(c, { l: '🍫', r: '🤏', guess: 'KLAR: GLEICH TEUER!', guessSize: 58, emojiOut: T('setup', .1) });
  o += kPunch(c, { at: T('k2', 1.5), dur: 1.3, text: '5,53 € / KG', color: th.b, sub: 'STATT 4,98 €' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '+ 11 %', color: th.a, sub: 'GLEICHER PREIS, WENIGER DRIN' });
  return o;
}
