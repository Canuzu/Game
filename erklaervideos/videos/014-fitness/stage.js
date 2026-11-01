function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DER TRICK', big: 'BEITRAG = FIX', bigColor: th.a, sub: 'NUR DEINE BESUCHE ÄNDERN DEN PREIS', lines: [['30 € ÷ BESUCHE', '#fff']] }) },
    { from: 'cost', fn: c => kRule(c, { at: T('cost'), tag: 'IM JAHR', big: '360 €', bigColor: th.a, sub: 'FÜR EIN STUDIO, DAS DU NICHT NUTZT' }) },
    { from: 'year', fn: c => kRule(c, { at: T('year'), tag: '12 BESUCHE IM MONAT', big: '144 BESUCHE', bigColor: th.b, sub: 'FÜR DIE GLEICHEN 360 € IM JAHR' }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'DEIN PLAN', big: 'FESTE TERMINE', bigColor: th.b, sub: 'ODER KÜNDIGEN, WENN DU NICHT HINGEHST', lines: [['EHRLICH SEIN SPART GELD', th.y]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'BEITRAG ÷ BESUCHE', bigColor: th.y, sub: 'DAS IST DEIN ECHTER PREIS' }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '30 € / MONAT', bigColor: th.a, sub: 'SETZ DEINEN BEITRAG EIN' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WIE OFT WARST', '#fff', 108], ['DU LETZTEN', th.a, 112], ['MONAT DA?', th.b, 120]], chips: [['0–1×', 'a'], ['4×+', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const n = t => tw(t, [[T('v1', .2), 1], [T('v4', .2), 1], [T('v4', 1.2), 4], [T('v8', .2), 4], [T('v8', 1.2), 8], [T('v12', .2), 8], [T('v12', 1.2), 12]], E.io);
  const price = t => 30 / Math.max(1, n(t));
  let o = kTitle(c, [['FITNESSSTUDIO', th.a, 120], ['30 € PRO BESUCH?', th.b, 104]], T('setup2', .1));
  o += kCards(c, { labels: ['BESUCHE IM MONAT', 'PREIS PRO BESUCH'], units: ['×', '€'], vals: [n, price], fmt: [v => nf(Math.round(v)), v => nf(v, 2)], showAt: T('setup2', .4), win: { side: 1, at: T('result', .1), text: '12× GÜNSTIGER ✓' }, bumps: [1e9, T('v12', 1.3)] });
  const mk = (x, id, lab, val, col) => ({ x, color: col, label: lab, fmt: v => nf(v, 2) + ' €', val: t => val * ramp(t, T(id, .2), T(id, 1.2)), at: T(id, .1) });
  o += kCols(c, { max: 30, H: 520, baseY: 1170, w: 190, cols: [mk(150, 'v1', '1×', 30, th.a), mk(400, 'v4', '4×', 7.5, th.y), mk(650, 'v8', '8×', 3.75, th.b), mk(900, 'v12', '12×', 2.5, '#fff')] });
  o += kOpening(c, { l: '🏋️', r: '💸', guess: 'KLAR: NORMALER PREIS!', guessSize: 56, emojiOut: T('setup2', .1) });
  o += kPunch(c, { at: T('v1', .05), dur: 1.1, text: '30 € PRO BESUCH', color: th.a, size: 140, sub: 'WENN DU NUR 1× HINGEHST' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '12× GÜNSTIGER', color: th.b, sub: 'GLEICHER VERTRAG' });
  return o;
}
