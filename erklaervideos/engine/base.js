// Basis-Engine: Theme, Easing, SVG-Helfer, Untertitel. Szenen-Code liegt je Video in stage.js
const W = 1080, H = 1920;
const THEMES = {
  indigo: { bg1:'#15113A', bg2:'#2B1F63', ink:'#FFFFFF', mute:'#A9A3D6', card:'#231A55', line:'#4A3C97',
            a:'#FF7A59', b:'#2EE6C5', y:'#FFC93C', dark:'#15113A',
            capA:'#E5421F', capB:'#0B9C84', capY:'#C47600' }
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const E = {
  lin: x => x,
  out3: x => 1 - Math.pow(1 - x, 3),
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const ramp = (t, a, b, f = E.out3) => f(clamp((t - a) / (b - a)));
const pop = (t, t0, d = .45) => t < t0 ? 0 : E.back(clamp((t - t0) / d));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = (n, dec = 0) => n.toFixed(dec).replace('.', ',');
let UID = 0;
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// <g> mit Transform: x,y Verschiebung, s Skalierung um (px,py), rot in Grad, o Deckkraft
function G(inner, { x = 0, y = 0, s = 1, px = 0, py = 0, rot = 0, o = 1 } = {}) {
  if (o <= 0.001 || s <= 0.001) return '';
  return `<g opacity="${o.toFixed(3)}" transform="translate(${x + px} ${y + py}) rotate(${rot}) scale(${s}) translate(${-px} ${-py})">${inner}</g>`;
}
function TX(x, y, str, { size = 48, w = 800, fill = '#fff', anchor = 'middle', ls = 0, o = 1, rot = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="Inter, sans-serif" font-weight="${w}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${o}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${esc(str)}</text>`;
}
function RECT(x, y, w, h, fill, { r = 24, stroke = '', sw = 0, shadow = false, o = 1 } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}"` : ''} opacity="${o}" ${shadow ? 'filter="url(#sh)"' : ''}/>`;
}
// Pille mit Text (mittig bei x,y), Breite aus Messung
const _cv = document.createElement('canvas').getContext('2d');
function textW(str, size, w = 800) { _cv.font = `${w} ${size}px Inter`; return _cv.measureText(str).width; }
function PILL(x, y, str, { size = 40, fill = '#fff', ink = '#15113A', px = 30, h = 0, w = 800, shadow = true } = {}) {
  const tw = textW(str, size, w), hh = h || size * 1.7, ww = tw + px * 2;
  return RECT(x - ww / 2, y - hh / 2, ww, hh, fill, { r: hh / 2, shadow }) + TX(x, y + size * .36, str, { size, fill: ink, w });
}

function background(t, th) {
  const drift = Math.sin(t * .4) * 40;
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${th.bg2}"/><stop offset="1" stop-color="${th.bg1}"/></linearGradient>
    <radialGradient id="gl1" cx=".2" cy=".15" r=".6"><stop offset="0" stop-color="${th.a}" stop-opacity=".22"/><stop offset="1" stop-color="${th.a}" stop-opacity="0"/></radialGradient>
    <radialGradient id="gl2" cx=".85" cy=".8" r=".6"><stop offset="0" stop-color="${th.b}" stop-opacity=".18"/><stop offset="1" stop-color="${th.b}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="54" height="54" patternUnits="userSpaceOnUse" patternTransform="translate(${drift} ${drift / 2})"><circle cx="3" cy="3" r="2.2" fill="#fff" opacity=".07"/></pattern>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#06041a" flood-opacity=".45"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#gl1)"/><rect width="${W}" height="${H}" fill="url(#gl2)"/><rect width="${W}" height="${H}" fill="url(#dots)"/>`;
}

// ---------- Untertitel ----------
function buildChunks(spec) {
  const chunks = [];
  for (const b of spec.beats) {
    let cur = [];
    const flush = () => { if (cur.length) { chunks.push({ t0: cur[0].t0, words: cur, beatEnd: b.t1 }); cur = []; } };
    for (const w of b.words) {
      if (cur.length && cur.map(x => x.w).join(' ').length + w.w.length + 1 > 19) flush();
      cur.push(w);
      if (/[.,?!:]$/.test(w.w) || cur.length >= 3) flush();
    }
    flush();
  }
  chunks.forEach((c, i) => { const n = chunks[i + 1]; c.t1 = Math.min(c.beatEnd + .12, n ? n.t0 : 1e9); });
  return chunks;
}
function captions(t, th, chunks) {
  const c = chunks.find(c => t >= c.t0 - .02 && t < c.t1);
  if (!c) return '';
  let size = 58; const y = 1500;
  while (textW(c.words.map(w => w.w).join(' '), size, 800) + 76 > 1000) size -= 2;
  const full = c.words.map(w => w.w).join(' ');
  const tw = textW(full, size, 800), ww = tw + 76, hh = 112;
  const k = .8 + .2 * E.back(clamp((t - c.t0) / .2));
  const col = { a: th.capA, b: th.capB, y: th.capY };
  let spans = c.words.map((w, i) => `<tspan fill="${w.key ? col[w.key] : th.dark}">${esc(w.w)}${i < c.words.length - 1 ? ' ' : ''}</tspan>`).join('');
  return G(RECT(540 - ww / 2, y - hh / 2, ww, hh, '#fff', { r: 34, shadow: true }) +
    `<text x="540" y="${y + size * .35}" font-family="Inter" font-weight="800" font-size="${size}" text-anchor="middle" xml:space="preserve">${spans}</text>`,
    { px: 540, py: y, s: k });
}

// ---------- Szenenbausteine ----------
function scoreCard(x, y, w, h, label, valueStr, unit, color, th, { s = 1, o = 1, dim = 1 } = {}) {
  let vs = 92; while (vs > 40 && textW(valueStr, vs, 900) + textW(unit, 34, 800) + 62 > w - 40) vs -= 4;
  const tv = textW(valueStr, vs, 900), uw = textW(unit, 34, 800), x0 = (w - (tv + uw + 12)) / 2;
  const inner = RECT(0, 0, w, h, th.card, { r: 30, stroke: th.line, sw: 3, shadow: true }) +
    RECT(0, 0, w, 62, color, { r: 30 }) + RECT(0, 40, w, 22, color, { r: 0 }) +
    TX(w / 2, 43, label, { size: 29, fill: th.dark, w: 900, ls: 1 }) +
    `<text x="${x0}" y="${h - 50}" font-family="Inter" font-weight="900" font-size="${vs}" fill="#fff">${esc(valueStr)}</text>` +
    TX(x0 + tv + 12, h - 52, unit, { size: 34, fill: th.mute, w: 800, anchor: 'start' });
  return G(inner, { x, y, s, px: w / 2, py: h / 2, o: o * dim });
}

function pizza(cx, cy, r, { sweep = 1, rot = 0, seed = 1, o = 1, ghost = true } = {}) {
  const id = 'pz' + (UID++);
  const ghostC = ghost ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.35)" stroke-width="4" stroke-dasharray="14 12"/>` : '';
  if (sweep <= 0.002) return `<g opacity="${o}">${ghostC}</g>`;
  let clip;
  if (sweep >= .998) clip = `<circle cx="${cx}" cy="${cy}" r="${r + 4}"/>`;
  else {
    const R = r * 1.3, a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI * sweep;
    clip = `<path d="M${cx} ${cy} L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A${R} ${R} 0 ${sweep > .5 ? 1 : 0} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} Z"/>`;
  }
  const rnd = rng(seed * 977 + 13);
  let pep = '';
  const n = Math.max(5, Math.round(r / 20));
  for (let i = 0; i < n; i++) {
    const ang = rnd() * 6.283, d = Math.sqrt(rnd()) * r * .68, pr = r * (.10 + rnd() * .03);
    const px = cx + Math.cos(ang) * d, py = cy + Math.sin(ang) * d;
    pep += `<circle cx="${px}" cy="${py}" r="${pr}" fill="#C7432F"/><circle cx="${px - pr * .25}" cy="${py - pr * .25}" r="${pr * .55}" fill="#DE5A44"/>`;
    if (rnd() > .4) pep += `<ellipse cx="${px + pr * 1.7}" cy="${py + pr * .5}" rx="${pr * .55}" ry="${pr * .28}" fill="#4CAF50" transform="rotate(${rnd() * 90} ${px + pr * 1.7} ${py + pr * .5})"/>`;
  }
  return `<g opacity="${o}">${ghostC}<clipPath id="${id}">${clip}</clipPath><g clip-path="url(#${id})">
    <g transform="rotate(${rot} ${cx} ${cy})">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#D99A4E"/><circle cx="${cx}" cy="${cy}" r="${r * .97}" fill="#EFB665"/>
      <circle cx="${cx}" cy="${cy}" r="${r * .86}" fill="#D4412E"/><circle cx="${cx}" cy="${cy}" r="${r * .82}" fill="#FFD25E"/>
      <circle cx="${cx - r * .15}" cy="${cy - r * .2}" r="${r * .5}" fill="#FFE08A" opacity=".55"/>${pep}
    </g></g></g>`;
}

// Maskottchen links unten über der Untertitel-Zeile (rechts liegen die TikTok-Buttons). Stimmung je Video über MOOD(ctx).
function mascotLayer(c) {
  const cur = c.spec.beats.find(b => c.t >= b.t0 && c.t < c.nextT(b.id));
  const mood = (typeof MOOD === 'function' && MOOD(c)) || (cur && cur.mood) || 'neutral';
  const k = pop(c.t, .3, .5);
  return k > .01 ? mascot(82, 1432, .78 * k, mood, c.t, Math.min(1, k)) : '';
}
// Kamera: Zoom-Stoß zu Beginn jedes Satzes, langsamer Push, kleine Schräglage, Wackeln bei Treffer-Sounds
function camera(c) {
  const bs = c.spec.beats, i = bs.findIndex(b => c.t >= b.t0 && c.t < c.nextT(b.id)); if (i < 0) return {};
  const b = bs[i], loc = c.t - b.t0, len = c.nextT(b.id) - b.t0;
  const punch = .07 * (1 - E.out3(clamp(loc / .5))), push = .03 * clamp(loc / len);
  const rot = (i % 2 ? 1 : -1) * 1.2 * (1 - E.out3(clamp(loc / .45)));
  let sx = 0, sy = 0;
  for (const bb of bs) for (const [n, off] of (bb.sfx || [])) if (n === 'ding') {
    const d = c.t - (bb.t0 + off); if (d > 0 && d < .6) { const a = 14 * Math.exp(-d * 8); sx += a * Math.sin(d * 70); sy += a * Math.cos(d * 55); }
  }
  return { s: 1 + punch + push, rot, x: sx, y: sy };
}
window.RENDER = function (spec, stage) {
  const th = THEMES[spec.theme || 'indigo'];
  const chunks = buildChunks(spec);
  const B = {}; spec.beats.forEach(b => B[b.id] = b);
  const root = document.getElementById('root');
  return function draw(t) {
    UID = 0;
    const ctx = {
      t, th, B, spec,
      p: (id, f = E.lin) => f(clamp((t - B[id].t0) / (B[id].t1 - B[id].t0))),
      since: id => t - B[id].t0,
      keys: id => B[id].words.filter(w => w.key).map(w => w.t0),
      nextT: id => { const i = spec.beats.findIndex(b => b.id === id); return i + 1 < spec.beats.length ? spec.beats[i + 1].t0 : spec.duration; },
    };
    const prog = `<rect x="0" y="0" width="${W * clamp(t / spec.duration)}" height="10" fill="${th.b}"/>`;
    root.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      ${background(t, th)}${(() => { const k = camera(ctx); return G(stage(ctx), { x: k.x || 0, y: 50 + (k.y || 0), s: k.s || 1, rot: k.rot || 0, px: 540, py: 850 }); })()}${mascotLayer(ctx)}${captions(t, th, chunks)}${prog}</svg>`;
  };
};
