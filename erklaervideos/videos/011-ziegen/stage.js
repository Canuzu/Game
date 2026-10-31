function STAGE(c) {
  const { th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  return SCENES(c, [
    { from: 'hook', fn: main },
    { from: 'why', fn: c => kRule(c, { at: T('why'), tag: 'DER TRICK', big: 'ER WEISS ES', bigColor: th.a, sub: 'ER ÖFFNET NIE DIE AUTO-TÜR', lines: [['SEINE WAHL IST KEIN ZUFALL', '#fff']] }) },
    { from: 'why2', fn: c => kChain(c, { at: T('why2'), title: 'WO STECKT DAS AUTO?', steps: [['1/3', th.a], ['2/3', th.b], ['100 %', th.y]], arrows: ['DEINE TÜR', 'ANDERE TÜREN'], notes: [['2/3 LANDEN BEI DER ÜBRIGEN TÜR', '#fff']] }) },
    { from: 'hundred', fn: c => kRule(c, { at: T('hundred'), tag: '100 TÜREN', big: '99 %', bigColor: th.b, sub: 'WENN DU WECHSELST', lines: [['MODERATOR ÖFFNET 98 ZIEGEN', th.y]] }) },
    { from: 'test', fn: c => kRule(c, { at: T('test'), tag: 'SELBST TESTEN', big: '2 VON 3', bigColor: th.b, sub: 'GEWINNEN DIE WECHSLER', lines: [['100 RUNDEN MIT FREUNDEN', th.y]] }) },
    { from: 'rule', fn: c => kRule(c, { at: T('rule'), tag: 'FAUSTREGEL', big: 'NEUES WISSEN', bigColor: th.y, sub: 'ÄNDERT DIE WAHRSCHEINLICHKEIT', lines: [['ABER NICHT GLEICHMÄSSIG', th.a]] }) },
    { from: 'cta', fn: c => kCta(c, { at: T('cta'), lines: [['HÄTTEST DU', '#fff', 120], ['GEWECHSELT?', th.y, 120]], chips: [['BLEIBEN', 'a'], ['WECHSELN', 'b']] }) },
  ]);
}
function door(x, y, label, th, { open = 0, content = '', glow = null, t = 0 }) {
  const w = 230, h = 420, ang = open * 62;
  return `<g transform="translate(${x - w / 2} ${y})">
    <rect x="-10" y="-10" width="${w + 20}" height="${h + 20}" rx="20" fill="${th.dark}" stroke="${glow || th.line}" stroke-width="${glow ? 8 : 4}"/>
    <rect x="0" y="0" width="${w}" height="${h}" rx="12" fill="#0d0a26"/>
    ${open > .15 ? TX(w / 2, h / 2 + 50, content, { size: 150 }) : ''}
    <g transform="translate(0 0) scale(${1 - open * .55} 1)"><rect x="0" y="0" width="${w}" height="${h}" rx="12" fill="${th.card}" stroke="${th.line}" stroke-width="4"/><circle cx="${w - 36}" cy="${h / 2}" r="14" fill="${th.y}"/>${TX(w / 2, 130, String(label), { size: 110, w: 900, fill: '#fff' })}</g></g>`;
}
function main(c) {
  const { t, th, B } = c, T = (id, o = 0) => B[id].t0 + o;
  const A = t => 33.3, Bv = t => tw(t, [[T('r3', 2.0), 33.3], [T('r4', 3.0), 66.7]]);
  let o = kTitle(c, [['TÜR WECHSELN', th.a, 118], ['ODER BLEIBEN?', th.b, 118]], T('setup', 1.8));
  o += kCards(c, { labels: ['BLEIBEN', 'WECHSELN'], units: ['%', '%'], vals: [A, Bv], fmt: [v => nf(v, 1), v => nf(v, 1)], showAt: T('setup', 2.1), win: { side: 1, at: T('result', .1), text: 'WECHSELN GEWINNT ✓' }, bumps: [1e9, T('result', 1.2)] });
  const k = pop(t, T('hook', .15)), xs = [190, 540, 890], y = 640;
  const open3 = ramp(t, T('r2', 1.4), T('r2', 2.0)), open2 = ramp(t, T('result', 1.6), T('result', 2.2));
  o += G([door(xs[0], y, 1, th, { glow: t > T('r1', .3) ? th.a : null }), door(xs[1], y, 2, th, { open: open2, content: '🚗', glow: t > T('r4', .3) ? th.b : null }), door(xs[2], y, 3, th, { open: open3, content: '🐐' })].join(''), { s: Math.min(1, k), px: 540, py: 850, o: Math.min(1, k) });
  const pill = (txt, x, at, col, yy = 1160) => G(PILL(x, yy, txt, { size: 40, fill: col, ink: th.dark }), { s: pop(t, at), px: x, py: yy });
  o += pill('DEINE WAHL', xs[0], T('r1', .4), th.a) + pill('ZIEGE!', xs[2], T('r2', 2.0), th.y) + pill('WECHSELN ⇒ 2/3', xs[1], T('r4', .5), th.b);
  const g = pop(t, T('setup', .5)) * (1 - ramp(t, T('setup', 1.4), T('setup', 1.8)));
  if (g > .01) o += G(PILL(540, 1290, 'KLAR: 50 : 50!', { size: 64, fill: th.y, ink: th.dark, px: 40 }), { s: g, px: 540, py: 1290, rot: -4, o: Math.min(1, g) });
  const go = pop(t, T('go', .02), .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  o += kPunch(c, { at: T('r4', 3.3), dur: 1.4, text: '2 VON 3', color: th.b, sub: 'WENN DU WECHSELST' });
  o += kPunch(c, { at: T('result', .15), dur: 1.6, text: '× 2', color: th.y, sub: 'DOPPELTE CHANCE' });
  return o;
}
