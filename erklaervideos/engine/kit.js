// Baukasten für Folgen: Zeitachse, Szenenwechsel, Titel, Zähler-Karten, Säulen, Regel- und Schluss-Szene.
const tw = (t, kf, f = E.io) => {                       // Keyframes [[zeit, wert], ...] mit Easing
  if (t <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) if (t <= kf[i][0]) { const [a, va] = kf[i - 1], [b, vb] = kf[i]; return va + (vb - va) * f(clamp((t - a) / (b - a))); }
  return kf[kf.length - 1][1];
};
const bump = (t, t0, amp = .16, d = .45) => t < t0 ? 1 : 1 + amp * Math.max(0, 1 - (t - t0) / d) * Math.cos((t - t0) * 14);
const nf = (n, dec = 0) => { const s = Math.abs(n).toFixed(dec).replace('.', ','); const [i, d] = s.split(','); return (n < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : ''); };

// Szenenliste: [{from:'beatId', fn:c=>svg}, ...]; Szene endet beim from der nächsten, Überblendung ~0.4 s
function SCENES(c, list) {
  let o = '';
  list.forEach((s, i) => {
    const B = c.B, a = i === 0 ? 1 : ramp(c.t, B[s.from].t0, B[s.from].t0 + .45);
    const nx = list[i + 1], b = nx ? 1 - ramp(c.t, B[nx.from].t0 - .2, B[nx.from].t0 + .25, E.io) : 1;
    if (a * b > .01) o += G(s.fn(c), { o: a * b, x: (1 - a) * 160 - (1 - b) * 160, s: .94 + .06 * a, px: 540, py: 850 });
  });
  return o;
}
// Große Zahl/Wort als harter Schnitt: Hintergrund wird abgedunkelt, Text knallt rein
function kPunch(c, { at, dur = 1.3, text, color, size = 190, sub }) {
  const { t, th } = c, a = ramp(t, at, at + .12) * (1 - ramp(t, at + dur - .25, at + dur)); if (a < .01) return '';
  const k = 1 + .45 * (1 - E.out3(clamp((t - at) / .3)));
  let sz = size; while (textW(text, sz, 900) > 980) sz -= 6;
  return `<rect x="-200" y="-200" width="1480" height="2300" fill="${th.dark}" opacity="${.72 * a}"/>` +
    G(TX(540, 860, text, { size: sz, w: 900, fill: color || th.y }) + (sub ? TX(540, 960, sub, { size: 50, w: 800, fill: '#fff', ls: 3 }) : ''), { s: k, px: 540, py: 820, o: a });
}
function kTitle(c, lines, until) {
  const { t, th } = c, a = 1 - ramp(t, until, until + .45); if (a < .01) return '';
  let o = G(PILL(540, 190, 'ALLTAGSDUELL', { size: 32, fill: th.y, ink: th.dark, px: 34 }), { s: pop(t, .05), px: 540, py: 190, o: a * Math.min(1, pop(t, .05)) });
  let y = 240 + lines[0][2] * .9;
  lines.forEach(([txt, col, size], i) => {
    while (textW(txt, size, 900) > 1000) size -= 4;
    if (i) y += size * .62 + lines[i - 1][2] * .5;
    o += G(TX(540, y, txt, { size, w: 900, fill: col }), { s: pop(t, .15 + i * .15), px: 540, py: y - size * .3, o: a });
  });
  return o;
}
// Zwei Zähler-Karten oben. o: {labels, units, vals:[fa,fb](t)->Zahl, fmt:[f,f], showAt, win:{side,at,text}, bumps:[ta,tb]}
function kCards(c, o) {
  const { t, th } = c, sb = ramp(t, o.showAt, o.showAt + .5); if (sb < .01) return '';
  const v = [o.vals[0](t), o.vals[1](t)], f = o.fmt || [nf, nf], won = o.win && t > o.win.at;
  let s = scoreCard(50, 215 - 30 * (1 - sb), 440, 230, o.labels[0], f[0](v[0]), o.units[0], th.a, th, { o: sb, s: bump(t, (o.bumps || [])[0] ?? 1e9), dim: won && o.win.side === 1 ? .5 : 1 }) +
          scoreCard(590, 215 - 30 * (1 - sb), 440, 230, o.labels[1], f[1](v[1]), o.units[1], th.b, th, { o: sb, s: bump(t, (o.bumps || [])[1] ?? 1e9), dim: won && o.win.side === 0 ? .5 : 1 });
  s += G(`<circle cx="540" cy="330" r="42" fill="${th.dark}" stroke="${th.line}" stroke-width="4"/>` + TX(540, 346, 'VS', { size: 40, w: 900, fill: th.y }), { o: sb });
  if (won) { const x = o.win.side ? 810 : 270; s += G(PILL(x, 183, o.win.text || 'GEWINNT ✓', { size: 36, fill: th.y, ink: th.dark }), { s: pop(t, o.win.at + .05), px: x, py: 183 }); }
  return s;
}
// Senkrechte Säulen. cols: [{x, color, label, val:(t)=>n, fmt, at}], max, line:{val,label}
function kCols(c, { cols, max, baseY = 1250, H = 640, w = 300, line }) {
  const { t, th } = c; let o = `<rect x="60" y="${baseY}" width="960" height="8" rx="4" fill="${th.line}"/>`;
  if (line) { const y = baseY - clamp(line.val / max) * H; o += `<line x1="60" y1="${y}" x2="1020" y2="${y}" stroke="${th.y}" stroke-width="5" stroke-dasharray="16 12" opacity="${.85 * ramp(t, line.at ?? 0, (line.at ?? 0) + .4)}"/>` + G(PILL(540, y + 40, line.label, { size: 25, fill: th.y, ink: th.dark, px: 14 }), { o: ramp(t, line.at ?? 0, (line.at ?? 0) + .4) }); }
  cols.forEach(cl => {
    const k = pop(t, cl.at ?? .3), v = cl.val(t), h = Math.max(10, clamp(v / max) * H);
    o += G(RECT(cl.x - w / 2, baseY - h, w, h, cl.color, { r: 28, shadow: true }) +
      PILL(cl.x, baseY - h - 52, (cl.fmt || nf)(v), { size: 50, fill: '#fff', ink: th.dark }) +
      PILL(cl.x, baseY + 72, cl.label, { size: 36, fill: cl.color, ink: th.dark }), { s: k, px: cl.x, py: baseY, o: Math.min(1, k) });
  });
  return o;
}
// Merksatz-Szene: tag, big (große Zeile), sub, lines [[text,farbe],...]
function kRule(c, { at, tag = 'MERKSATZ', big, bigColor, sub, lines = [] }) {
  const { t, th } = c; let o = G(PILL(540, 320, tag, { size: 50, fill: th.y, ink: th.dark, px: 44 }), { s: pop(t, at + .2), px: 540, py: 320 });
  let bs = 210; while (textW(big, bs, 900) > 980) bs -= 6;
  o += G(TX(540, 600, big, { size: bs, w: 900, fill: bigColor || th.y }), { s: pop(t, at + .9, .5), px: 540, py: 540 });
  let ss = 46; while (sub && ss > 22 && textW(sub, ss, 800) + sub.length * 2 > 1000) ss -= 2;
  if (sub) o += G(TX(540, 705, sub, { size: ss, w: 800, fill: th.mute, ls: 2 }), { s: pop(t, at + 1.3), px: 540, py: 690 });
  lines.forEach(([txt, col], i) => { let ps = 48; while (ps > 24 && textW(txt, ps, 800) + 80 > 1000) ps -= 2; o += G(PILL(540, 900 + i * 130, txt, { size: ps, fill: col || '#fff', ink: th.dark, px: 40 }), { s: pop(t, at + 1.8 + i * .5), px: 540, py: 900 + i * 130 }); });
  return o;
}
// Schluss-Szene: lines [[text,farbe,größe]], chips [[text,farbe],[text,farbe]]
function kCta(c, { at, lines, chips }) {
  const { t, th } = c; let o = '', y = 410;
  lines.forEach(([txt, col, size], i) => { while (textW(txt, size, 900) > 1000) size -= 4; o += G(TX(540, y, txt, { size, w: 900, fill: col }), { s: pop(t, at + .3 + i * .15), px: 540, py: y - size * .3 }); y += size * .95; });
  o += G(`<circle cx="540" cy="1000" r="125" fill="${th.y}" filter="url(#sh)"/>` + TX(540, 1042, 'VS', { size: 120, w: 900, fill: th.dark }), { s: pop(t, at + .8), px: 540, py: 1000 });
  chips.forEach(([txt, col], i) => o += G(PILL(i ? 810 : 270, 1000, txt, { size: 40, fill: col === 'a' ? th.a : th.b, ink: th.dark, px: 30 }), { s: pop(t, at + 1.0 + i * .12), px: i ? 810 : 270, py: 1000 }));
  o += G(PILL(540, 1250, '👇 SCHREIB ES IN DIE KOMMENTARE', { size: 34, fill: th.y, ink: th.dark, px: 32 }), { s: pop(t, at + 1.5), px: 540, py: 1250 });
  return o;
}
// Kette aus drei Kreisen mit Pfeil-Beschriftungen: steps [[text,farbe]], arrows [text,text], notes [[text,farbe]]
function kChain(c, { at, title, steps, arrows, notes = [] }) {
  const { t, th } = c; let o = G(TX(540, 330, title, { size: 56, w: 900, fill: '#fff' }), { s: pop(t, at + .2), px: 540, py: 320 });
  const xs = [150, 540, 930];
  steps.forEach(([txt, col], i) => o += G(`<circle cx="${xs[i]}" cy="820" r="125" fill="${th.card}" stroke="${col}" stroke-width="8" filter="url(#sh)"/>` + TX(xs[i], 845, txt, { size: 66, w: 900, fill: col }), { s: pop(t, at + .6 + i * .6), px: xs[i], py: 820 }));
  arrows.forEach((txt, i) => { const x = (xs[i] + xs[i + 1]) / 2; o += G(TX(x, 835, '→', { size: 90, w: 900, fill: th.y }) + PILL(x, 700, txt, { size: 40, fill: th.y, ink: th.dark }), { s: pop(t, at + 1.0 + i * .6), px: x, py: 790 }); });
  notes.forEach(([txt, col], i) => o += G(PILL(540, 1060 + i * 110, txt, { size: 44, fill: col || '#fff', ink: th.dark, px: 36 }), { s: pop(t, at + 2.4 + i * 1.0), px: 540, py: 1060 + i * 110 }));
  return o;
}
// Einstieg: Emoji-Hook (l, mid, r), "Klar, ..."-Sticker und "LOS GEHT'S!"; emojiOut = Zeit, ab der die Emojis ausblenden
function kOpening(c, { l, r, mid = 'VS', guess, guessSize = 70, guessY = 1100, emojiOut }) {
  const { t, th, B } = c; let o = '';
  const cv = 1 - ramp(t, emojiOut, emojiOut + .4);
  if (cv > .01) o += G(TX(270, 880, l, { size: 200 }) + TX(810, 880, r, { size: 200 }) + TX(540, 860, mid, { size: 100, w: 900, fill: th.y }), { s: pop(t, B.hook.t0 + .3), px: 540, py: 820, o: cv });
  const g = pop(t, B.guess.t0 + .5) * (1 - ramp(t, B.setup.t0, B.setup.t0 + .3));
  if (g > .01 && guess) o += G(PILL(540, guessY, guess, { size: guessSize, fill: th.y, ink: th.dark, px: 44 }), { s: g, px: 540, py: guessY, rot: -4, o: Math.min(1, g) });
  const go = pop(t, B.go.t0 + .02, .35) * (1 - ramp(t, B.go.t1 + .35, B.go.t1 + .6));
  if (go > .01) o += G(PILL(540, 880, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: go, px: 540, py: 880, rot: -6, o: Math.min(1, go) });
  return o;
}
