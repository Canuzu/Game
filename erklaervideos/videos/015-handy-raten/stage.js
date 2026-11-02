function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DER TRICK', big: 'KLEINE RATE', bigColor: th.a, sub: 'VERSTECKT DEN GESAMTPREIS' }) },
    { from: 'why2', fn: c => kRule(c, { at: T('why2'), tag: 'DEIN KOPF SIEHT', big: '24 €', bigColor: th.y, sub: 'NICHT DIE 576 €', lines: [['24 × 24 = 576', '#fff']] }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'DEIN PLAN', big: 'GESAMTBETRAG', bigColor: th.b, sub: 'UND EFFEKTIVEN JAHRESZINS ERFRAGEN' }) },
    { from: 'save', fn: c => kRule(c, { at: T('save'), tag: 'ODER SPAREN', big: '≈ 21 MONATE', bigColor: th.b, sub: '24 € ZURÜCKLEGEN = 500 €', lines: [['DANN BAR KAUFEN', th.y]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'RATE × MONATE', bigColor: th.y, sub: 'DAS IST DEIN ECHTER PREIS' }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '500 € HANDY', bigColor: th.a, sub: 'AUCH ANGEBOTE OHNE ZINSEN: GESAMTPREIS PRÜFEN' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WIE VIELE', '#fff', 120], ['RATEN LAUFEN', th.a, 104], ['BEI DIR?', th.b, 120]], chips: [['RATEN', 'a'], ['BAR', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const mo = t => tw(t, [[T('go', .3), 0], [T('m6', .2), 0], [T('m6', 2.0), 6], [T('m12', .2), 6], [T('m12', 2.0), 12], [T('m18', .2), 12], [T('m18', 2.0), 18], [T('m24', .2), 18], [T('m24', 3.4), 24]], E.lin);
  const A = t => 24 * mo(t), Bv = () => 500;
  let o = kTitle(c, [['HANDY AUF RATEN', th.a, 112], ['76 € MEHR?', th.b, 124]], T('setup2', .1));
  o += kCards(c, { labels: ['AUF RATEN BEZAHLT', 'BAR BEZAHLT'], units: ['€', '€'], vals: [A, Bv], showAt: T('setup2', .4), win: { side: 1, at: T('result', .1), text: 'SPARST 76 € ✓' }, bumps: [T('m24', 3.4), 1e9] });
  o += kCols(c, { max: 600, H: 470, baseY: 1200, w: 280, cols: [{ x: 270, color: th.a, label: 'RATEN', fmt: v => nf(v) + ' €', val: A, at: T('setup2', .6) }, { x: 810, color: th.b, label: 'BAR', fmt: v => nf(v) + ' €', val: Bv, at: T('setup2', .9) }],
    line: { val: 500, label: 'BARPREIS 500 €', at: T('setup2', 1.0) } });
  if (t > T('go', .1)) o += G(PILL(540, 590, 'MONAT ' + Math.max(1, Math.ceil(mo(t) - .001)), { size: 62, fill: th.y, ink: th.dark, px: 40 }), { s: pop(t, T('go', .3)), px: 540, py: 590, o: Math.min(1, pop(t, T('go', .3))) });
  o += kOpening(c, { l: '📱', r: '💶', guess: 'KLAR: NUR 24 € IM MONAT!', guessSize: 52, emojiOut: T('setup2', .1) });
  o += kPunch(c, { at: T('m24', 3.5), dur: 1.4, text: '576 €', color: th.a, sub: 'FÜR EIN 500-€-HANDY' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '+ 76 €', color: th.y, sub: 'ÜBER 15 % AUFPREIS' });
  return o;
}
