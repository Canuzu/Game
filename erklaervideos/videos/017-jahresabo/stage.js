function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'years', fn: c => kRule(c, { at: T('years'), tag: 'GANZES JAHR', big: '+ 20,88 € GESPART', bigColor: th.b, sub: '119,88 € − 99 €' }) },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DER TRICK', big: 'IM VORAUS', bigColor: th.a, sub: 'JAHR KOMPLETT BEZAHLT, EGAL OB DU ES NUTZT' }) },
    { from: 'why2', fn: c => kRule(c, { at: T('why2'), tag: 'NUR 6 MONATE?', big: '+ 39 €', bigColor: th.a, sub: 'ZU VIEL BEZAHLT', lines: [['99 € − 59,94 € = 39,06 €', '#fff']] }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'DEIN PLAN', big: 'WIE LANGE WIRKLICH?', bigColor: th.b, sub: 'VOR DEM ABSCHLUSS EHRLICH SCHÄTZEN' }) },
    { from: 'tip2', fn: c => kRule(c, { at: T('tip2'), tag: 'UNSICHER?', big: 'MONATSABO', bigColor: th.y, sub: 'JEDERZEIT KÜNDBAR, WENN MÖGLICH' }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: '99 ÷ 9,99 ≈ 10', bigColor: th.y, sub: 'DAS IST DEIN BREAK-EVEN IN MONATEN' }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '9,99 € / MONAT', bigColor: th.a, sub: 'JAHRESPREIS 99 €, RECHNE MIT DEINEN ZAHLEN' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['HAST DU', '#fff', 120], ['JAHRESABOS', th.a, 104], ['VERGESSEN?', th.b, 120]], chips: [['JA', 'a'], ['NEIN', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const mo = t => tw(t, [[T('go', .3), 0], [T('m3', .2), 0], [T('m3', 2.0), 3], [T('m6', .2), 3], [T('m6', 2.0), 6], [T('m10', .2), 6], [T('m10', 2.4), 10], [T('m12', .2), 10], [T('m12', 2.2), 12]], E.lin);
  const A = t => 9.99 * mo(t), Bv = () => 99;
  let o = kTitle(c, [['JAHRESABO', th.a, 124], ['IMMER BILLIGER?', th.b, 100]], T('setup2', .1));
  o += kCards(c, { labels: ['MONATSABO BEZAHLT', 'JAHRESABO BEZAHLT'], units: ['€', '€'], vals: [A, Bv], fmt: [v => nf(v, 2), v => nf(v, 2)], showAt: T('setup2', .4), bumps: [T('m10', 2.4), 1e9] });
  o += kCols(c, { max: 130, H: 470, baseY: 1200, w: 280, cols: [{ x: 270, color: th.a, label: 'MONATLICH', fmt: v => nf(v, 2) + ' €', val: A, at: T('setup2', .6) }, { x: 810, color: th.b, label: 'JAHRESABO', fmt: v => nf(v) + ' €', val: Bv, at: T('setup2', .9) }],
    line: { val: 99, label: 'JAHRESPREIS 99 €', at: T('setup2', 1.0) } });
  if (t > T('go', .1)) o += G(PILL(540, 590, 'MONAT ' + Math.max(1, Math.ceil(mo(t) - .001)), { size: 62, fill: th.y, ink: th.dark, px: 40 }), { s: pop(t, T('go', .3)), px: 540, py: 590, o: Math.min(1, pop(t, T('go', .3))) });
  o += kOpening(c, { l: '📅', r: '💳', guess: 'KLAR: JAHR IST BESSER!', guessSize: 56, emojiOut: T('setup2', .1) });
  o += kPunch(c, { at: T('m10', 2.3), dur: 1.3, text: 'GLEICHSTAND', color: th.y, size: 150, sub: 'NACH 10 MONATEN' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '10 MONATE', color: th.b, sub: 'AB DA LOHNT SICH DAS JAHR' });
  return o;
}
