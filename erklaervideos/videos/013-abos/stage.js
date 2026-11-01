function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DER TRICK', big: '1–2 MONATE', bigColor: th.b, sub: 'SO LANG BRAUCHT EINE STAFFEL OFT' }) },
    { from: 'why2', fn: c => kRule(c, { at: T('why2'), tag: 'DANACH', big: '0 € NUTZEN', bigColor: th.a, sub: 'ABER 10 € PRO MONAT WEITER', lines: [['NICHTS ZURÜCK FÜR DEIN GELD', '#fff']] }) },
    { from: 'tip', fn: c => kRule(c, { at: T('tip'), tag: 'DEIN PLAN', big: 'KÜNDIGEN', bigColor: th.b, sub: 'DIREKT NACH DEM DURCHSCHAUEN', lines: [['KÜNDIGUNGSFRIST IM KALENDER', th.y]] }) },
    { from: 'extra', fn: c => kRule(c, { at: T('extra'), tag: 'PRÜF VORHER', big: 'MONATLICH KÜNDBAR?', bigColor: th.b, sub: 'STEHT IN DEN BEDINGUNGEN' }) },
    { from: 'years', fn: c => kRule(c, { at: T('years'), tag: 'ÜBER 3 JAHRE', big: '1.080 €', bigColor: th.y, sub: '3 × 360 € GESPART' }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: '1 MONAT = 10 €', bigColor: th.y, sub: 'JEDER UNGENUTZTE MONAT IST WEG' }) },
    { from: 'note', fn: c => kRule(c, { at: T('note'), tag: 'ANNAHME', big: '10 € / ABO', bigColor: th.a, sub: 'SCHAU AUF DEINEN KONTOAUSZUG' }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['WIE VIELE', '#fff', 120], ['ABOS ZAHLST', th.a, 110], ['DU GERADE?', th.b, 110]], chips: [['4+', 'a'], ['1–2', 'b']] }) },
  ]);
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const mo = t => tw(t, [[T('go', .3), 0], [T('m3', .2), 0], [T('m3', 2.2), 3], [T('m6', .2), 3], [T('m6', 2.2), 6], [T('m12', .2), 6], [T('m12', 3.4), 12]], E.lin);
  const A = t => 40 * mo(t), Bv = t => 10 * mo(t);
  let o = kTitle(c, [['4 STREAMING-ABOS', th.a, 100], ['480 € IM JAHR?', th.b, 112]], T('setup2', .1));
  o += kCards(c, { labels: ['ALLE 4 BEHALTEN', '1 ABO IM WECHSEL'], units: ['€', '€'], vals: [A, Bv], showAt: T('setup2', .4), win: { side: 1, at: T('result', .1), text: 'SPARST 360 € ✓' }, bumps: [T('m12', 3.3), 1e9] });
  const cols = [th.a, th.b, th.y, '#fff'], idx = Math.min(3, Math.floor(mo(t) / 3 + .0001));
  const tile = (x, y, col, label, at) => G(RECT(x - 170, y - 50, 340, 100, col, { r: 28, shadow: true }) + TX(x, y + 16, '▶ ' + label, { size: 46, w: 900, fill: th.dark }), { s: pop(t, at), px: x, py: y, o: Math.min(1, pop(t, at)) });
  for (let i = 0; i < 4; i++) o += tile(270, 640 + i * 125, cols[i], 'ABO ' + (i + 1), T('setup2', .4 + i * .3));
  o += tile(810, 640 + idx * 125, cols[idx], 'ABO ' + (idx + 1), T('setup2', 1.9));
  if (t > T('setup2', 1.9)) o += G(PILL(810, 1160, 'WECHSEL ALLE 3 MONATE', { size: 32, fill: th.card, ink: '#fff', px: 22 }), { s: pop(t, T('setup2', 2.1)), px: 810, py: 1160 });
  if (t > T('go', .1)) o += G(PILL(540, 1280, 'MONAT ' + Math.max(1, Math.ceil(mo(t) - .001)) + '  ·  GESPART ' + nf(A(t) - Bv(t)) + ' €', { size: 42, fill: th.y, ink: th.dark, px: 36 }), { s: pop(t, T('go', .3)), px: 540, py: 1280 });
  o += kOpening(c, { l: '📺', r: '💸', guess: 'KLAR: NUR 10 € PRO ABO!', guessSize: 52, emojiOut: T('setup2', .1) });
  o += kPunch(c, { at: T('m12', 3.3), dur: 1.4, text: '480 €', color: th.a, sub: 'VIER ABOS IM JAHR' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '− 360 €', color: th.b, sub: 'GESPART' });
  return o;
}
