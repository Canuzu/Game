function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'factor', fn: c => kRule(c, { at: T('factor'), tag: 'PRO LITER', big: '≈ 250×', bigColor: th.a, sub: 'FLASCHE GEGEN HAHN', lines: [['1 € GEGEN 0,4 CENT', '#fff']] }) },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DER TRICK', big: 'FLASCHE + TRANSPORT', bigColor: th.a, sub: 'DU ZAHLST NICHT NUR FÜRS WASSER' }) },
    { from: 'why2', fn: c => kRule(c, { at: T('why2'), tag: 'LEITUNGSWASSER', big: 'STRENG KONTROLLIERT', bigColor: th.b, sub: 'GEREGELT IN DER TRINKWASSERVERORDNUNG' }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'DEIN PLAN', big: 'TRINKFLASCHE', bigColor: th.b, sub: 'MITNEHMEN UND ZUHAUSE AUFFÜLLEN' }) },
    { from: 'tip2', fn: c => kRule(c, { at: T('tip2'), tag: 'SPRUDEL?', big: 'WASSERSPRUDLER', bigColor: th.y, sub: 'RECHNE, OB ER SICH FÜR DICH LOHNT' }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: '× 365', bigColor: th.y, sub: 'TAGESPREIS × 365 = JAHRESKOSTEN', lines: [['1 € × 365 = 365 €', '#fff']] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '1 € / FLASCHE', bigColor: th.a, sub: 'HAHN: GROB 0,4 CENT PRO LITER' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WIE VIELE', '#fff', 120], ['FLASCHEN', th.a, 120], ['PRO WOCHE?', th.b, 110]], chips: [['FLASCHE', 'a'], ['HAHN', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const mo = t => tw(t, [[T('go', .3), 0], [T('m1', .2), 0], [T('m1', 2.0), 1], [T('m3', .2), 1], [T('m3', 2.0), 3], [T('m6', .2), 3], [T('m6', 2.0), 6], [T('m12', .2), 6], [T('m12', 3.2), 12]], E.lin);
  const A = t => 365 * mo(t) / 12, Bv = t => 1.46 * mo(t) / 12;
  let o = kTitle(c, [['WASSER KAUFEN', th.a, 124], ['365 € IM JAHR?', th.b, 112]], T('setup2', .1));
  o += kCards(c, { labels: ['FLASCHE KAUFEN', 'HAHNWASSER'], units: ['€', '€'], vals: [A, Bv], fmt: [v => nf(v), v => nf(v, 2)], showAt: T('setup2', .4), win: { side: 1, at: T('result', .1), text: 'SPARST 363 € ✓' }, bumps: [T('m12', 3.0), 1e9] });
  o += kCols(c, { max: 365, H: 470, baseY: 1200, w: 280, cols: [{ x: 270, color: th.a, label: 'FLASCHE', fmt: v => nf(v) + ' €', val: A, at: T('setup2', .6) }, { x: 810, color: th.b, label: 'HAHN', fmt: v => nf(v, 2) + ' €', val: Bv, at: T('setup2', .9) }] });
  if (t > T('go', .1)) o += G(PILL(540, 590, 'MONAT ' + Math.max(1, Math.ceil(mo(t) - .001)), { size: 62, fill: th.y, ink: th.dark, px: 40 }), { s: pop(t, T('go', .3)), px: 540, py: 590, o: Math.min(1, pop(t, T('go', .3))) });
  o += kOpening(c, { l: '🍼', r: '🚰', guess: 'KLAR: NUR EIN EURO!', guessSize: 60, emojiOut: T('setup2', .1) });
  o += kPunch(c, { at: T('m12', 3.1), dur: 1.4, text: '365 €', color: th.a, sub: 'FÜR WASSER IN FLASCHEN' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '− 363 €', color: th.b, sub: 'IM JAHR GESPART' });
  return o;
}
