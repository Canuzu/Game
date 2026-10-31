// Szenen für Folge 1: eine große Pizza (Ø 32) gegen zwei kleine (Ø 22)
const PX = 15, A_BIG = Math.PI * 16 * 16, A_S = Math.PI * 11 * 11;
const BIG = { x: 285, y: 900, r: 16 * PX }, SM = [{ x: 795, y: 725, r: 11 * PX }, { x: 795, y: 1075, r: 11 * PX }];
const bump = (t, t0, amp = .16, d = .45) => t < t0 ? 1 : 1 + amp * Math.max(0, 1 - (t - t0) / d) * Math.cos((t - t0) * 14);
const fadeIn = (t, a, d = .4) => ramp(t, a, a + d), fadeOut = (t, a, d = .4) => 1 - ramp(t, a, a + d);

function STAGE(c) {
  const { t, th, B } = c; let out = '';
  const x1 = id => 1 - ramp(t, B[id].t0 - .15, B[id].t0 + .25);    // Gruppe verlässt Bühne vor Beat id
  const x2 = id => ramp(t, B[id].t0, B[id].t0 + .4);               // Gruppe kommt ab Beat id
  const g1 = x1('why'), g2 = x2('why') * x1('ratio'), g3 = x2('ratio') * x1('rule'), g4 = x2('rule') * x1('cta'), g5 = x2('cta');
  if (g1 > .01) out += G(scene1(c), { o: g1 });
  if (g2 > .01) out += G(scene2(c), { o: g2 });
  if (g3 > .01) out += G(scene3(c), { o: g3 });
  if (g4 > .01) out += G(scene4(c), { o: g4 });
  if (g5 > .01) out += G(scene5(c), { o: g5 });
  return out;
}

function scene1(c) {
  const { t, th, B } = c; let o = '';
  const rot = t * 9;
  // Titel
  const tt = fadeOut(t, B.setup.t1 + .05, .45);
  if (tt > .01) {
    o += G(PILL(540, 190, 'ALLTAGSDUELL', { size: 32, fill: th.y, ink: th.dark, px: 34 }), { o: tt * pop(t, .05), s: pop(t, .05), px: 540, py: 190 });
    o += G(TX(540, 345, 'EINE GROSSE', { size: 118, w: 900, fill: th.a }), { s: pop(t, .15), px: 540, py: 320, o: tt });
    o += G(TX(540, 455, 'ODER ZWEI KLEINE?', { size: 86, w: 900, fill: th.b }), { s: pop(t, .3), px: 540, py: 430, o: tt });
  }
  // Scoreboard
  const sbA = fadeIn(t, B.rules.t0 + .15, .5);
  const sw = (() => { const a = B.race.t0 + .25, b = c.nextT('race') - .6; return t < a ? 0 : E.io(clamp((t - a) / (b - a))); })();
  if (sbA > .01) {
    const vA = A_BIG * sw, vB = 2 * A_S * sw, ks = c.keys('result');
    const winT = B.win.t0 + .1, won = t > winT;
    o += scoreCard(50, 215 - 30 * (1 - sbA), 440, 230, '1 × Ø 32 CM', fmt(vA), 'cm²', th.a, th, { o: sbA, s: bump(t, ks[0] ?? 1e9) });
    o += scoreCard(590, 215 - 30 * (1 - sbA), 440, 230, '2 × Ø 22 CM', fmt(vB), 'cm²', th.b, th, { o: sbA, s: bump(t, ks[1] ?? 1e9), dim: won ? .5 : 1 });
    o += G(`<circle cx="540" cy="330" r="42" fill="${th.dark}" stroke="${th.line}" stroke-width="4"/>` + TX(540, 346, 'VS', { size: 40, w: 900, fill: th.y }), { o: sbA });
    if (won) o += G(PILL(270, 183, 'GEWINNT ✓', { size: 36, fill: th.y, ink: th.dark }), { s: pop(t, winT + .05), px: 270, py: 183 });
  }
  // Pizzen
  const goT = B.go.t0 + .35, full = t < goT;
  const reveal = full ? 1 : sw;
  const ps = [pop(t, .35), pop(t, .5), pop(t, .62)];
  const pz = (p, i, sc) => G(pizza(p.x, p.y, p.r, { sweep: reveal, rot: rot * (i ? -1 : 1), seed: i + 2 }), { s: sc, px: p.x, py: p.y, o: Math.min(1, sc) });
  o += pz(BIG, 0, ps[0]) + pz(SM[0], 1, ps[1]) + pz(SM[1], 2, ps[2]);
  // Gewinner-Glanz / Verlierer gedimmt
  if (t > B.win.t0 + .1) o += `<circle cx="${BIG.x}" cy="${BIG.y}" r="${BIG.r + 14}" fill="none" stroke="${th.y}" stroke-width="8" opacity="${.5 + .4 * Math.sin(t * 6)}"/>`;
  // Sticker "Klar!"
  const gA = pop(t, B.guess.t0 + .45) * fadeOut(t, B.setup.t0 + .1, .3);
  if (gA > .01) o += G(PILL(795, 900, 'KLAR: ZWEI KLEINE!', { size: 40, fill: th.y, ink: th.dark }), { s: gA, px: 795, py: 900, rot: -5, o: Math.min(1, gA) });
  // Durchmesser-Linien
  const dl = 1 - ramp(t, B.rules.t0 + .3, B.rules.t0 + .7);
  const kS = c.keys('setup');
  if (dl > .01 && kS.length > 1) {
    const L = (x0, x1_, y, p, lab, col) => p > 0 ? `<g opacity="${dl}"><line x1="${x0}" y1="${y}" x2="${x0 + (x1_ - x0) * p}" y2="${y}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
       <line x1="${x0}" y1="${y - 22}" x2="${x0}" y2="${y + 22}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
       <line x1="${x0 + (x1_ - x0) * p}" y1="${y - 22}" x2="${x0 + (x1_ - x0) * p}" y2="${y + 22}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
       ${p > .9 ? G(PILL((x0 + x1_) / 2, y, lab, { size: 38, fill: col, ink: th.dark }), { s: pop(t, kS[col === th.a ? 0 : 1] + .5), px: (x0 + x1_) / 2, py: y }) : ''}</g>` : '';
    o += L(BIG.x - BIG.r, BIG.x + BIG.r, BIG.y, ramp(t, kS[0] - .1, kS[0] + .5), '32 cm', th.a);
    o += SM.map(p => L(p.x - p.r, p.x + p.r, p.y, ramp(t, kS[1] - .1, kS[1] + .5), '22 cm', th.b)).join('');
  }
  // Labels
  const lb = pop(t, B.setup.t0 + .2);
  o += G(PILL(285, 1290, '1 GROSSE', { size: 38, fill: th.a, ink: th.dark }), { s: lb, px: 285, py: 1290 });
  o += G(PILL(795, 1290, '2 KLEINE', { size: 38, fill: th.b, ink: th.dark }), { s: lb, px: 795, py: 1290 });
  // Los geht's
  const gb = pop(t, B.go.t0 + .02, .35) * fadeOut(t, B.go.t1 + .35, .25);
  if (gb > .01) o += G(PILL(540, 900, "LOS GEHT'S!", { size: 92, fill: th.y, ink: th.dark, px: 50 }), { s: gb, px: 540, py: 900, rot: -6, o: Math.min(1, gb) });
  // Differenz
  const dA = pop(t, B.win.t0 + 1.9);
  if (dA > .01) o += G(PILL(BIG.x, BIG.y, '+44 cm²', { size: 74, fill: th.dark, ink: th.y, px: 38 }), { s: dA, px: BIG.x, py: BIG.y, o: Math.min(1, dA) });
  return o;
}

function scene2(c) {
  const { t, th, B } = c; let o = '';
  const R = 120, cells = [[180, 760], [420, 760], [180, 1000], [420, 1000]], Bg = { x: 800, y: 880, r: 240 };
  const sq = t >= B.square.t0;
  o += G(TX(540, 330, sq ? 'Ø × 2  →  FLÄCHE × 4' : 'FLÄCHE ≠ DURCHMESSER', { size: sq ? 70 : 64, w: 900, fill: sq ? th.y : '#fff' }),
         { s: pop(t, sq ? B.square.t0 : B.why.t0 + .3, .35), px: 540, py: 320 });
  const tS = [B.why.t0 + .5, B.square.t0 + 1.0, B.square.t0 + 1.6, B.square.t0 + 2.2];
  let n = 0;
  cells.forEach((p, i) => { const s = pop(t, tS[i]); if (s > .01) { n++; o += G(pizza(p[0], p[1], R, { rot: t * 9, seed: i + 5, ghost: false }), { s, px: p[0], py: p[1], o: Math.min(1, s) }); } });
  const sb = pop(t, B.why.t0 + 1.0);
  o += G(pizza(Bg.x, Bg.y, Bg.r, { rot: -t * 9, seed: 9, ghost: false }), { s: sb, px: Bg.x, py: Bg.y, o: Math.min(1, sb) });
  o += G(PILL(300, 1190, n > 1 ? `${n} × Ø 16 cm` : 'Ø 16 cm', { size: 40, fill: th.b, ink: th.dark }), { s: pop(t, B.why.t0 + .7), px: 300, py: 1190 });
  o += G(PILL(800, 1190, 'Ø 32 cm', { size: 40, fill: th.a, ink: th.dark }), { s: pop(t, B.why.t0 + 1.2), px: 800, py: 1190 });
  o += G(PILL(300, 1275, fmt(201.06 * n) + ' cm²', { size: 44, fill: '#fff', ink: th.dark }), { s: pop(t, B.why.t0 + .9), px: 300, py: 1275 });
  o += G(PILL(800, 1275, '804 cm²', { size: 44, fill: '#fff', ink: th.dark }), { s: pop(t, B.why.t0 + 1.4), px: 800, py: 1275 });
  const eq = pop(t, B.square.t0 + 2.9);
  if (eq > .01) o += G(`<circle cx="550" cy="880" r="40" fill="${th.y}"/>` + TX(550, 902, '=', { size: 70, w: 900, fill: th.dark }), { s: eq, px: 550, py: 880 });
  return o;
}

function scene3(c) {
  const { t, th, B } = c; let o = '';
  const x0 = 190, maxW = 780, t0 = B.ratio.t0;
  o += G(TX(540, 330, 'FLÄCHE IM VERGLEICH', { size: 62, w: 900, fill: '#fff' }), { s: pop(t, t0 + .1), px: 540, py: 320 });
  const bar = (y, label, val, w, col, ts) => {
    const k = ramp(t, ts, ts + .8, E.io);
    return G(`${pizza(105, y + 55, 58, { rot: t * 9, seed: 3, ghost: false })}
      ${TX(x0, y - 22, label, { size: 40, w: 800, fill: col, anchor: 'start' })}
      ${RECT(x0, y, Math.max(40, w * k), 110, col, { r: 22, shadow: true })}
      ${k > .6 ? TX(x0 + Math.max(40, w * k) - 28, y + 74, fmt(val * k) + ' cm²', { size: 52, w: 900, fill: th.dark, anchor: 'end' }) : ''}`,
      { o: ramp(t, ts - .2, ts + .2), y: 0 });
  };
  o += bar(640, 'Ø 32 cm', 804, maxW, th.a, t0 + .3);
  o += bar(920, 'Ø 22 cm', 380, maxW * .473, th.b, t0 + 1.0);
  const k0 = c.keys('ratio')[0] ?? t0 + 2;
  o += G(PILL(x0 + maxW * .473 + 190, 975, '47 %', { size: 72, fill: th.y, ink: th.dark, px: 36 }), { s: pop(t, k0), px: x0 + maxW * .473 + 190, py: 975 });
  o += G(TX(540, 1190, 'NICHT MAL HALB SO VIEL', { size: 56, w: 900, fill: th.y }), { s: pop(t, k0 + .2), px: 540, py: 1170 });
  return o;
}

function scene4(c) {
  const { t, th, B } = c; let o = '';
  const t0 = B.rule.t0, kk = c.keys('rule');
  o += G(PILL(540, 320, 'FAUSTREGEL', { size: 50, fill: th.y, ink: th.dark, px: 44 }), { s: pop(t, t0 + .2), px: 540, py: 320 });
  const kx = kk[0] ?? t0 + 3;
  o += G(TX(540, 600, '× 1,41', { size: 210, w: 900, fill: th.y }), { s: pop(t, kx - .1, .5), px: 540, py: 540 });
  o += G(TX(540, 700, 'AUF DEN DURCHMESSER', { size: 44, w: 800, fill: th.mute, ls: 3 }), { s: pop(t, kx + .2), px: 540, py: 690 });
  const r22 = 110, r31 = 155, y = 960;
  const s1 = pop(t, t0 + 1.0), s2 = pop(t, t0 + 2.2);
  [[150, 0], [380, 1]].forEach(([x, i]) => o += G(pizza(x, y, r22, { rot: t * 9 * (i ? -1 : 1), seed: 20 + i, ghost: false }), { s: s1, px: x, py: y, o: Math.min(1, s1) }));
  o += G(TX(545, y + 28, '→', { size: 100, w: 900, fill: '#fff' }), { s: pop(t, t0 + 1.9), px: 545, py: y });
  o += G(pizza(800, y, r31, { rot: t * 9, seed: 30, ghost: false }), { s: s2, px: 800, py: y, o: Math.min(1, s2) });
  o += G(PILL(265, 1165, '2 × Ø 22 cm', { size: 40, fill: th.b, ink: th.dark }), { s: s1, px: 265, py: 1165 });
  o += G(PILL(800, 1165, '1 × Ø 31 cm', { size: 40, fill: th.a, ink: th.dark }), { s: s2, px: 800, py: 1165 });
  o += G(PILL(540, 1265, 'beide ≈ 760 cm²', { size: 44, fill: '#fff', ink: th.dark }), { s: pop(t, t0 + 2.9), px: 540, py: 1265 });
  return o;
}

function scene5(c) {
  const { t, th, B } = c; let o = '';
  const t0 = B.cta.t0;
  o += G(TX(540, 400, 'WELCHE', { size: 140, w: 900, fill: '#fff' }), { s: pop(t, t0 + .3), px: 540, py: 360 });
  o += G(TX(540, 545, 'PIZZA BESTELLST', { size: 100, w: 900, fill: th.a }), { s: pop(t, t0 + .45), px: 540, py: 510 });
  o += G(TX(540, 715, 'DU?', { size: 150, w: 900, fill: th.b }), { s: pop(t, t0 + .6), px: 540, py: 665 });
  const s = pop(t, t0 + .7), k = .62;
  const big = { x: 280, y: 990, r: 16 * PX * k }, sm = [{ x: 790, y: 890, r: 11 * PX * k }, { x: 790, y: 1090, r: 11 * PX * k }];
  o += G(pizza(big.x, big.y, big.r, { rot: t * 9, seed: 2, ghost: false }), { s, px: big.x, py: big.y, o: Math.min(1, s) });
  sm.forEach((p, i) => o += G(pizza(p.x, p.y, p.r, { rot: -t * 9, seed: 3 + i, ghost: false }), { s: pop(t, t0 + .8 + i * .1), px: p.x, py: p.y, o: 1 }));
  o += G(PILL(280, 1195, '1 GROSSE', { size: 40, fill: th.a, ink: th.dark }), { s, px: 280, py: 1195 });
  o += G(PILL(790, 1235, '2 KLEINE', { size: 40, fill: th.b, ink: th.dark }), { s, px: 790, py: 1235 });
  o += G(PILL(540, 1345, '👇 SCHREIB ES IN DIE KOMMENTARE', { size: 34, fill: th.y, ink: th.dark, px: 32 }), { s: pop(t, t0 + 1.4), px: 540, py: 1345 });
  return o;
}

// Stimmung des Maskottchens je Beat
function MOOD(c) {
  const { t, B } = c, id = Object.keys(B).find(k => t >= B[k].t0 && t < c.nextT(k));
  return { hook: 'wave', guess: 'think', setup: 'neutral', rules: 'neutral', go: 'cheer', race: 'watch', result: 'watch',
           win: 'cheer', why: 'think', square: 'neutral', ratio: 'neutral', rule: 'think', cta: 'cheer' }[id] || 'neutral';
}
