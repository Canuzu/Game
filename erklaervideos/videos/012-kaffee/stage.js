function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DIE GEWOHNHEIT', big: '1,87 € / TAG', bigColor: th.a, sub: 'NICHT DER EINE KAFFEE, SONDERN JEDER TAG' }) },
    { from: 'habit', fn: c => kRule(c, { at: T('habit'), tag: 'ANDERS GESAGT', big: 'FAST 2 € AM TAG', bigColor: th.y, sub: '682 € ÷ 365 TAGE', lines: [['EINFACH WEGGETRUNKEN', '#fff']] }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'DEIN PLAN', big: '1× PRO WOCHE', bigColor: th.b, sub: 'TO GO NUR EINMAL, REST ZUHAUSE', lines: [['DU SPARST TROTZDEM 546 €', th.y]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: '× 220', bigColor: th.y, sub: 'TÄGLICHE AUSGABE × ARBEITSTAGE', lines: [['3,50 € × 220 = 770 €', '#fff']] }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '3,50 € / KAFFEE', bigColor: th.a, sub: 'SETZ DEINE EIGENEN PREISE EIN' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WAS GIBST DU', '#fff', 104], ['AM TAG FÜR', th.a, 110], ['KLEINKRAM AUS?', th.b, 104]], chips: [['KAFFEE', 'a'], ['ALLES', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const mo = t => tw(t, [[T('go', .3), 0], [T('m3', .2), 0], [T('m3', 2.2), 3], [T('m6', .2), 3], [T('m6', 2.2), 6], [T('m12', .2), 6], [T('m12', 3.2), 12]], E.lin);
  const A = t => 770 * mo(t) / 12, Bv = t => 88 * mo(t) / 12;
  let o = kTitle(c, [['KAFFEE TO GO', th.a, 124], ['770 € IM JAHR?', th.b, 112]], T('setup2', .1));
  o += kCards(c, { labels: ['KAFFEE TO GO', 'EIGENER KAFFEE'], units: ['€', '€'], vals: [A, Bv], showAt: T('setup2', .4), win: { side: 1, at: T('result', .1), text: 'SPARST 682 € ✓' }, bumps: [T('m12', 3.0), 1e9] });
  o += kCols(c, { max: 770, H: 520, baseY: 1140, w: 280, cols: [{ x: 270, color: th.a, label: 'TO GO', fmt: v => nf(v) + ' €', val: A, at: T('setup2', .6) }, { x: 810, color: th.b, label: 'ZUHAUSE', fmt: v => nf(v) + ' €', val: Bv, at: T('setup2', .9) }] });
  if (t > T('go', .1)) o += G(PILL(540, 690, 'MONAT ' + Math.max(1, Math.ceil(mo(t) - .001)), { size: 84, fill: th.y, ink: th.dark, px: 46 }), { s: pop(t, T('go', .3)), px: 540, py: 690, o: Math.min(1, pop(t, T('go', .3))) });
  o += kOpening(c, { l: '☕', r: '🏠', guess: 'KLAR: NUR EIN KAFFEE!', guessSize: 58, emojiOut: T('setup2', .1) });
  o += kPunch(c, { at: T('m12', 3.1), dur: 1.4, text: '770 €', color: th.a, sub: 'IM JAHR NUR FÜR KAFFEE' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '− 682 €', color: th.b, sub: 'DER UNTERSCHIED' });
  return o;
}
