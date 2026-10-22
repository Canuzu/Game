/* ==========================================================================
   Sponsoringvorgespräch · Swiss Life Select — Präsentations-Engine
   Keine Abhängigkeiten. Läuft offline per Doppelklick.
   ========================================================================== */
(() => {
'use strict';

const D = window.DECK_DATA;
const IMG = window.DECK_IMAGES;
const W = 1920, H = 1080;
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const E = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
};
function rng(seed) { // deterministischer Zufall, damit Karten & Wolken immer gleich aussehen
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const fmt = (n, dec = 0, plain = false) =>
  plain ? String(Math.round(n)) : n.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const stage = $('#stage');
const slides = $$('.slide');
const N = slides.length;

/* ------------------------------------------------------------------------
   Einstellungen & Texte
   ------------------------------------------------------------------------ */
const store = {
  get(k, d) { try { const v = localStorage.getItem('slsDeck.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('slsDeck.' + k, JSON.stringify(v)); } catch { /* privat/blockiert */ } },
};
const DEFAULTS = {
  vereinName: '', art: 'sport', beraterName: '', kontakt: '', ort: 'Köln', kanzleiName: '', adresse: '',
  refs: 'VfL Berghausen-Gimborn 1949 e. V., The Wizards · 1. BBC Düren, SV Linde 1957 e. V., SpVg Porz 1919 e. V., Sportfreunde Hörn',
};
let S = Object.assign({}, DEFAULTS, store.get('settings', {}));
(() => { // Schnelllinks: …html?verein=SV%20Beispiel&art=chor&berater=Max%20Muster
  const q = new URLSearchParams(location.search);
  const map = { verein: 'vereinName', art: 'art', berater: 'beraterName', ort: 'ort', kontakt: 'kontakt' };
  for (const [k, v] of Object.entries(map)) if (q.get(k)) S[v] = q.get(k);
})();

const WORDS = {
  sport: {
    team: 'Mannschaft', teams: 'Mannschaften', teamAll: 'der gesamten Mannschaft', meet: 'zum Training oder Spiel',
    gear: 'Taschen, Trikots, Trainingsanzüge …', home: 'Vereinsheim', branche: 'Mannschaft/Verein',
    h1: 'Kreisliga auf dem Platz.', h2: 'Europameister im Trikot.', stickerB: 'deinen Verein!', group: 'SV Musterstadt',
  },
  chor: {
    team: 'Chor', teams: 'Stimmgruppen bzw. Ensembles', teamAll: 'dem gesamten Chor', meet: 'zur Probe oder zum Auftritt',
    gear: 'Chorkleidung, Notenmappen, Taschen …', home: 'Proberaum', branche: 'Chor/Verein',
    h1: 'Gemeindesaal bei der Probe.', h2: 'Philharmonie im Outfit.', stickerB: 'deinen Chor!', group: 'Chor Musterstadt',
  },
  verein: {
    team: 'Gruppe', teams: 'Abteilungen bzw. Gruppen', teamAll: 'allen Mitgliedern', meet: 'zu einem Treffen oder einer Veranstaltung',
    gear: 'Vereinskleidung, Taschen, Ausstattung …', home: 'Vereinsheim', branche: 'Gruppe/Verein',
    h1: 'Ehrenamt im Alltag.', h2: 'Profi-Auftritt im Outfit.', stickerB: 'deinen Verein!', group: 'Verein Musterstadt',
  },
};
const words = () => WORDS[S.art] || WORDS.sport;
const isChor = () => S.art === 'chor';
const VAL_DEFAULTS = { ort: () => 'Köln', kanzleiName: () => 'Finanzkanzlei für Swiss Life Select', adresse: () => val('ort') };
const val = (k) => (S[k] || '').trim() || (VAL_DEFAULTS[k] ? VAL_DEFAULTS[k]() : '');

/* ------------------------------------------------------------------------
   Logo-Bausteine
   ------------------------------------------------------------------------ */
const L = D.logo;
const VB = { full: '12 40 436 380', ribbon: '124 42 212 210', word: '12 252 436 166', corner: '10 38 440 384' };
function logoSVG(svg, { ribbon = true, word = true, select = true, white = false, letters = false, vb = 'full' } = {}) {
  let h = '';
  const ink = white ? '#fff' : '#000';
  const gry = white ? 'rgba(255,255,255,.82)' : '#808080';
  if (ribbon) h += `<path class="rb" fill="${white === 'all' ? '#fff' : '#D82034'}" fill-rule="evenodd" d="${L.red}"/>`;
  if (word) {
    if (letters) L.letters.black.forEach((l, i) => { h += `<path class="lt" style="--i:${i}" fill="${ink}" fill-rule="evenodd" d="${l.d}"/>`; });
    else h += `<path fill="${ink}" fill-rule="evenodd" d="${L.black}"/>`;
  }
  if (word && select) {
    if (letters) L.letters.grey.forEach((l, i) => { h += `<path class="lt g" style="--i:${i}" fill="${gry}" fill-rule="evenodd" d="${l.d}"/>`; });
    else h += `<path fill="${gry}" fill-rule="evenodd" d="${L.grey}"/>`;
  }
  svg.setAttribute('viewBox', VB[vb] || vb);
  svg.innerHTML = h;
  return svg;
}
function newSVG(cls, vb) { const s = document.createElementNS(NS, 'svg'); if (cls) s.setAttribute('class', cls); if (vb) s.setAttribute('viewBox', vb); return s; }
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function h(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

/* ------------------------------------------------------------------------
   Bühne skalieren
   ------------------------------------------------------------------------ */
let scale = 1;
function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
}
addEventListener('resize', fit);
fit();
const toStage = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; };

/* ------------------------------------------------------------------------
   Hintergrund (Facetten), Wasserzeichen, Lichtkegel
   ------------------------------------------------------------------------ */
(function buildBg() {
  const s = newSVG(null, '0 0 1980 1140');
  s.setAttribute('preserveAspectRatio', 'none');
  const polys = [
    [[0, 0], [980, 0], [0, 640], 0.62, 'w'], [[1980, 0], [1980, 820], [1420, 0], 0.45, 'w'], [[1260, 0], [1660, 0], [1980, 420], [1980, 560], 0.3, 'w'],
    [[1980, 1140], [1080, 1140], [1980, 520], 0.06, 'g'], [[0, 1140], [760, 1140], [0, 720], 0.05, 'g'], [[1500, 1140], [1980, 880], [1760, 1140], 0.55, 'w'],
    [[0, 420], [420, 1140], [0, 1140], 0.28, 'w'], [[640, 1140], [1200, 790], [1540, 1140], 0.045, 'g'], [[520, 0], [860, 0], [300, 380], 0.25, 'w'],
    [[1980, 300], [1600, 1140], [1980, 1140], 0.035, 'g'],
  ];
  const defs = el('defs', {}, s);
  polys.forEach((p, i) => {
    const op = p[p.length - 2], kind = p[p.length - 1], pts = p.slice(0, -2);
    const g = el('linearGradient', { id: 'bgg' + i, x1: i % 2 ? '1' : '0', y1: '0', x2: i % 2 ? '0' : '1', y2: '1' }, defs);
    const c = kind === 'w' ? '#ffffff' : '#6b6b72';
    el('stop', { offset: '0', 'stop-color': c, 'stop-opacity': op }, g);
    el('stop', { offset: '1', 'stop-color': c, 'stop-opacity': 0 }, g);
    el('polygon', { points: pts.map((q) => q.join(',')).join(' '), fill: `url(#bgg${i})` }, s);
  });
  const rg = el('radialGradient', { id: 'bgr', cx: '.55', cy: '.4', r: '.8' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fafafa' }, rg);
  el('stop', { offset: '1', 'stop-color': '#e6e6e9' }, rg);
  s.insertBefore(el('rect', { width: 1980, height: 1140, fill: 'url(#bgr)' }), s.children[1]);
  $('#bg').appendChild(s);
})();

const RIBBON_ONLY = L.red.split(/(?=M)/).filter((c) => !c.includes('Q')).join(''); // Band ohne Kreuz
$('#wm-p').setAttribute('d', RIBBON_ONLY);
$('#wm-p').setAttribute('fill-rule', 'evenodd');
const WM = { // Lage des großen Bandes je Folie (Morph-artiges Gleiten)
  agenda: [-1112, 458, 4.4, 0, 0.05], swisslife: [1030, -634, 4, 0, 0.045], premium: [-620, 566, 4, -6, 0.05],
  vergleich: [1072, -446, 3.6, 4, 0.045], finanzierung: [-670, 416, 4, 6, 0.045], bestselect: [-720, 466, 4, -4, 0.045],
  hub: [-722, 584, 3.4, 8, 0.045], verein: [1026, -495, 3.8, -4, 0.045], konzept: [-762, 458, 4.4, 4, 0.05],
  ausstattung: [1072, -526, 3.6, 6, 0.04], tester: [-720, 466, 4, -6, 0.045], besuch: [1168, -456, 3.4, 4, 0.045],
  kommunikation: [1072, 174, 3.6, -8, 0.045], schritte: [-678, 524, 3.6, 4, 0.04],
};
function setWatermark(id) {
  const g = $('#wm-g');
  const p = WM[id];
  if (!p) { g.style.opacity = 0; return; }
  const [x, y, s, r, o] = p;
  // Die Ebene zeigt nur den Bandausschnitt (ab Logo-Punkt 124/42) – Versatz mitdrehen und -skalieren
  const a = (r * Math.PI) / 180, ox = 124 * s, oy = 42 * s;
  const tx = x + ox * Math.cos(a) - oy * Math.sin(a), ty = y + ox * Math.sin(a) + oy * Math.cos(a);
  g.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${r}deg) scale(${s})`;
  g.style.opacity = o;
}

let mouseT = 0;
let ptr = null, ptrRaf = 0;
stage.addEventListener('pointermove', (e) => {
  ptr = toStage(e);
  if (ptrRaf) return;
  ptrRaf = requestAnimationFrame(() => { // höchstens ein Stil-Update pro Bild
    ptrRaf = 0;
    const [x, y] = ptr;
    $('#spot').style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
    $('#bg').style.transform = `translate(${((x / W - 0.5) * -18).toFixed(1)}px,${((y / H - 0.5) * -12).toFixed(1)}px)`;
  });
});
addEventListener('pointermove', () => {
  document.body.classList.add('mouse');
  clearTimeout(mouseT);
  mouseT = setTimeout(() => document.body.classList.remove('mouse'), 2600);
});

/* ------------------------------------------------------------------------
   Bilder (inkl. eigener Fotos aus IndexedDB)
   ------------------------------------------------------------------------ */
const custom = {}; // key -> objectURL
const imgKey = (spec) => { const [a, b] = spec.split('|'); return isChor() && b ? b : a; };
const imgSrc = (k) => custom[k] || IMG[k];
function applyImages(root = document) {
  $$('.print-shirt', root).forEach((p) => { if (!p.firstChild) p.innerHTML = printLogo(false); });
  $$('img[data-img]', root).forEach((im) => {
    const k = imgKey(im.dataset.img);
    const src = imgSrc(k);
    if (im.getAttribute('src') !== src) im.src = src;
  });
  $$('[data-print]', root).forEach((p) => {
    const k = imgKey(p.dataset.print);
    p.dataset.k = k;
    p.style.display = custom[k] ? 'none' : '';
  });
}
const idb = {
  db: null,
  open() {
    return new Promise((res) => {
      try {
        const r = indexedDB.open('slsDeck', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('img');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => res(null);
      } catch { res(null); }
    });
  },
  tx(mode, fn) {
    return new Promise((res) => {
      if (!this.db) return res(null);
      try {
        const t = this.db.transaction('img', mode); const st = t.objectStore('img');
        const r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => res(null);
      } catch { res(null); }
    });
  },
};
async function loadCustomImages() {
  if (!(await idb.open())) return;
  const keys = (await idb.tx('readonly', (s) => s.getAllKeys())) || [];
  for (const k of keys) {
    const blob = await idb.tx('readonly', (s) => s.get(k));
    if (blob) custom[k] = URL.createObjectURL(blob);
  }
  applyImages();
}

/* ------------------------------------------------------------------------
   Texte binden & Überschriften zerlegen
   ------------------------------------------------------------------------ */
function splitText(node) {
  if (!node.dataset.src) node.dataset.src = node.innerHTML;
  node.innerHTML = node.dataset.src;
  fillTokens(node);
  let i = 0;
  const walk = (n) => {
    [...n.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const parts = c.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++);
          wi.textContent = p; w.appendChild(wi); frag.appendChild(w);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && !c.classList.contains('w')) walk(c);
    });
  };
  walk(node);
}
function fillTokens(root = document) {
  const w = words();
  $$('[data-t]', root).forEach((e) => { e.textContent = w[e.dataset.t] ?? ''; });
  $$('[data-bind]', root).forEach((e) => { e.textContent = val(e.dataset.bind); });
}
function applySettings() {
  document.body.classList.remove('mode-sport', 'mode-chor', 'mode-verein');
  document.body.classList.add('mode-' + (WORDS[S.art] ? S.art : 'sport'));
  fillTokens();
  $$('.split').forEach(splitText);
  $$('[data-show]').forEach((e) => { e.style.display = val(e.dataset.show) ? '' : 'none'; });
  applyImages();
  buildRefs();
  buildProducts();
  buildPhones();
  $$('.slide').forEach((s) => { if (s.classList.contains('active')) setStep(s, step, 0, true); });
  presenter.update();
}

/* ------------------------------------------------------------------------
   Zahlen hochzählen
   ------------------------------------------------------------------------ */
function countUp(e, delay = 0) {
  const to = parseFloat(e.dataset.to), from = parseFloat(e.dataset.from || 0);
  const dec = +(e.dataset.dec || 0), plain = 'plain' in e.dataset;
  const dur = +(e.dataset.dur || 1700);
  cancelAnimationFrame(e._raf); clearTimeout(e._t);
  e.textContent = fmt(from, dec, plain);
  e._t = setTimeout(() => {
    const t0 = performance.now();
    const tick = (now) => {
      const t = clamp((now - t0) / dur, 0, 1);
      e.textContent = fmt(lerp(from, to, E.outExpo(t)), dec, plain);
      if (t < 1) e._raf = requestAnimationFrame(tick);
    };
    e._raf = requestAnimationFrame(tick);
  }, delay);
}
const delayOf = (e) => (parseFloat(getComputedStyle(e).getPropertyValue('--d')) || 0) * 1000;

/* ------------------------------------------------------------------------
   Folien-Hooks
   ------------------------------------------------------------------------ */
const hooks = {};
let step = 0, cur = -1;
const timers = new Set();
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearLater = () => { timers.forEach(clearTimeout); timers.clear(); };

function stepsOf(i) { return +slides[i].dataset.steps || 1; }
function setStep(s, n, dir, silent = false) {
  for (let k = 0; k < 8; k++) s.classList.toggle('st' + k, k === n);
  $$('[data-s]', s).forEach((x) => {
    const on = +x.dataset.s <= n;
    if (on === x.classList.contains('in')) return;
    x.classList.toggle('in', on);
    if (on && !silent) $$('.count', x).concat(x.classList.contains('count') ? [x] : []).forEach((c) => countUp(c, delayOf(x) + 150));
  });
  const hk = hooks[s.id];
  if (hk && hk.step) hk.step(s, n, dir, silent);
}

/* Canvas nur so groß rendern, wie er wirklich angezeigt wird (spart Zeichen- und Übertragungsarbeit) */
function fitCanvas(cv, ctx, w = W, h = H, q = 1) {
  const k = clamp(scale * (window.devicePixelRatio || 1), 0.5, 1) * q; // q < 1: bewusst niedrigere Auflösung für weiche Teilchen
  const bw = Math.round(w * k), bh = Math.round(h * k);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return k;
}

/* ---------- 1 · Titel: Partikel formen das Swiss-Life-Band ---------- */
hooks.titel = (() => {
  const s = $('#titel');
  const cv = $('.particles', s), ctx = cv.getContext('2d');
  logoSVG($('.t-ribbon', s), { word: false });
  logoSVG($('.t-word', s), { ribbon: false, letters: true });
  const BOX = { x: 660, y: 28, k: 600 / 460 };
  let pts = null, raf = 0, t0 = 0, dust = [];
  const mouse = { x: -999, y: -999 };
  s.addEventListener('pointermove', (e) => { [mouse.x, mouse.y] = toStage(e); });
  s.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
  function sample() {
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const c = off.getContext('2d');
    c.setTransform(BOX.k, 0, 0, BOX.k, BOX.x, BOX.y);
    c.fill(new Path2D(L.red), 'evenodd');
    const d = c.getImageData(0, 0, W, H).data, out = [], R = rng(7), stp = 3.4;
    for (let yy = 0; yy < H; yy += stp) for (let xx = 0; xx < W; xx += stp) {
      const x = Math.round(xx), y = Math.round(yy);
      if (d[(y * W + x) * 4 + 3] > 140) {
        const a = R() * Math.PI * 2, rad = 700 + R() * 900;
        const sx = 960 + Math.cos(a) * rad, sy = 330 + Math.sin(a) * rad * 0.62;
        const sw = (R() - 0.5) * 900;
        out.push({ tx: x + (R() - 0.5) * 1.6, ty: y + (R() - 0.5) * 1.6, sx, sy, cx: (sx + x) / 2 - Math.sin(a) * sw, cy: (sy + y) / 2 + Math.cos(a) * sw * 0.6, d: R() * 0.75 + Math.hypot(x - 1040, y - 160) / 1400 * 0.25, sz: 1.9 + R() * 1.6, sh: R() });
      }
    }
    return out;
  }
  function makeDust() {
    const R = rng(11); dust = [];
    for (let i = 0; i < 110; i++) dust.push({ x: 300 + R() * 1320, y: 40 + R() * 940, vx: (R() - 0.5) * 0.25, vy: -0.08 - R() * 0.25, r: 0.8 + R() * 2.2, a: 0.08 + R() * 0.22, ph: R() * 6.28 });
  }
  // Partikel nach Farbe und Deckkraft bündeln: wenige Füllvorgänge statt tausender Einzelfarben
  const BUCKETS = 6, COLS = ['#D82034', '#E8465A'];
  let skip = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    if (t > 3.2 && lite()) { cancelAnimationFrame(raf); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); return; } // Leistungsmodus: kein Staub
    if (t > 3.2 && (skip ^= 1)) return; // nach dem Intro reicht der Staub mit halber Bildrate
    const k0 = fitCanvas(cv, ctx, W, H, t > 3.2 ? 0.5 : 0.75);
    ctx.clearRect(0, 0, W, H);
    const DUR = 1.25;
    if (t < 2.6) {
      const fade = t > 1.9 ? 1 - (t - 1.9) / 0.7 : 1;
      const paths = [];
      for (let c = 0; c < 2; c++) for (let b = 0; b < BUCKETS; b++) paths.push(new Path2D());
      for (const p of pts) {
        const k = clamp((t - p.d) / DUR, 0, 1);
        if (k <= 0) continue;
        const e = E.outCubic(k), ie = 1 - e;
        const x = ie * ie * p.sx + 2 * ie * e * p.cx + e * e * p.tx;
        const y = ie * ie * p.sy + 2 * ie * e * p.cy + e * e * p.ty;
        const sz = p.sz * (1 + (1 - k) * 1.4);
        paths[(p.sh > 0.85 ? BUCKETS : 0) + Math.min(BUCKETS - 1, (k * BUCKETS) | 0)].rect(x - sz / 2, y - sz / 2, sz, sz);
      }
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = COLS[c];
        for (let b = 0; b < BUCKETS; b++) {
          ctx.globalAlpha = (0.25 + 0.75 * ((b + 0.5) / BUCKETS)) * fade;
          ctx.fill(paths[c * BUCKETS + b]);
        }
      }
      ctx.globalAlpha = 1;
    }
    const da = clamp((t - 1.4) / 1.5, 0, 1);
    if (da > 0) {
      const dp = [new Path2D(), new Path2D(), new Path2D()];
      for (const p of dust) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, dd = dx * dx + dy * dy;
        if (dd < 22000) { const f = (22000 - dd) / 22000 * 0.9; p.vx += dx / Math.sqrt(dd + 1) * f; p.vy += dy / Math.sqrt(dd + 1) * f; }
        p.vx *= 0.96; p.vy = p.vy * 0.96 - 0.004;
        p.x += p.vx + Math.sin(now / 1700 + p.ph) * 0.15; p.y += p.vy;
        if (p.y < -10) { p.y = 1090; p.x = 300 + Math.random() * 1320; }
        if (p.x < -10 || p.x > 1930) p.x = 960;
        const path = dp[Math.min(2, ((p.a - 0.08) / 0.22 * 3) | 0)];
        path.moveTo(p.x + p.r, p.y); path.arc(p.x, p.y, p.r, 0, 6.283);
      }
      ctx.fillStyle = '#D82034';
      dp.forEach((path, i) => { ctx.globalAlpha = (0.1 + i * 0.07) * da; ctx.fill(path); });
      ctx.globalAlpha = 1;
    }
    void k0;
  }
  return {
    enter() {
      if (!pts) pts = sample();
      makeDust();
      s.classList.remove('play');
      void s.offsetWidth;
      s.classList.add('play');
      cancelAnimationFrame(raf);
      t0 = performance.now() - (reduce ? 2600 : 0);
      raf = requestAnimationFrame(frame);
    },
    leave() { cancelAnimationFrame(raf); s.classList.remove('play'); ctx.clearRect(0, 0, W, H); },
    final() { s.classList.add('play'); },
  };
})();

/* ---------- 3 · Swiss Life: Europakarte ---------- */
hooks.swisslife = (() => {
  const s = $('#swisslife');
  const eu = $('.eu', s), base = $('.eu-base', s), red = $('.eu-red', s), arcsSvg = $('.eu-arcs', s);
  const E_ = D.europe;
  const [zx, zy] = E_.zurich;
  red.style.transformOrigin = `${(zx / 9).toFixed(2)}% ${(zy / 8.2).toFixed(2)}%`;
  const ring = $('.eu-ring', s);
  ring.style.left = (zx / 9).toFixed(2) + '%'; ring.style.top = (zy / 8.2).toFixed(2) + '%';
  const hl = [];
  E_.countries.forEach((c) => {
    el('path', { d: c.d }, base);
    if (c.hl) {
      el('path', { d: c.d, class: ['703', '203', '040'].includes(c.id) ? 'lt' : '' }, red);
      hl.push({ c, dist: Math.hypot(c.c[0] - zx, c.c[1] - zy) });
    }
  });
  hl.sort((a, b) => a.dist - b.dist);
  const arcs = hl.filter((x) => x.dist > 40 && x.c.id !== '438').map(({ c, dist }) => {
    const [x, y] = c.c, mx = (zx + x) / 2, my = (zy + y) / 2 - dist * 0.35;
    const path = el('path', { class: 'arc', d: `M${zx},${zy} Q${mx},${my} ${x},${y}` }, arcsSvg);
    const dot = el('circle', { class: 'arc-dot', r: 5, cx: x, cy: y }, arcsSvg);
    dot.style.transformBox = 'fill-box'; dot.style.transformOrigin = '50% 50%';
    return { path, dot, dist };
  });
  el('circle', { class: 'hq', cx: zx, cy: zy, r: 7 }, arcsSvg);
  const lab = el('text', { class: 'hq-l', x: zx + 16, y: zy + 30 }, arcsSvg); lab.textContent = 'ZÜRICH';
  let anims = [];
  const stop = () => { anims.forEach((a) => a.cancel()); anims = []; };
  const playArcs = () => {
    stop();
    arcs.forEach(({ path, dot, dist }) => {
      const len = path.getTotalLength();
      const delay = 350 + dist * 1.4;
      anims.push(path.animate([{ opacity: 0, strokeDashoffset: len }, { opacity: 0.9, strokeDashoffset: 0 }], { duration: 1100, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }));
      anims.push(dot.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 500, delay: delay + 700, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }));
    });
  };
  return {
    step(_, n) {
      requestAnimationFrame(() => eu.classList.add('on'));
      const was = eu.classList.contains('hl');
      eu.classList.toggle('hl', n >= 1);
      if (n >= 1 && !was) playArcs();
      if (n < 1) stop();
    },
    leave() { eu.classList.remove('on', 'hl'); stop(); arcs.forEach(({ path, dot }) => { path.style.opacity = ''; dot.style.opacity = ''; }); },
    final() { eu.classList.add('on', 'hl'); arcs.forEach(({ path, dot }) => { path.style.opacity = 0.9; dot.style.opacity = 1; }); },
  };
})();

/* ---------- 4 · Premiummarke: Deutschlandkarte mit Standorten ---------- */
hooks.premium = (() => {
  const s = $('#premium');
  const svg = $('.de', s);
  const cv = $('.de-dots', s), ctx = cv.getContext('2d');
  const states = {};
  D.germany.states.forEach((st) => { states[st.id] = el('path', { d: st.d, class: 'st' }, svg); });
  const CW = 650, CH = 880, SC = Math.min(CW / 586, CH / 793), OY = (CH - 793 * SC) / 2;
  let dots = null, raf = 0, t0 = 0, on = false;
  // Gewichtung grob nach Bevölkerung / Vertriebsdichte (Symbolpunkte, keine echten Adressen)
  const WEIGHTS = { nw: 82, by: 44, bw: 40, ni: 26, he: 28, sn: 18, rp: 15, be: 12, hh: 7, sh: 8, th: 7, st: 6, bb: 6, mv: 4, sl: 4, hb: 3 };
  function build() {
    if (dots) return;
    dots = [];
    const R = rng(1857);
    for (const [id, n] of Object.entries(WEIGHTS)) {
      const p = states[id]; if (!p) continue;
      const bb = p.getBBox();
      const clusters = [];
      for (let c = 0; c < Math.max(1, Math.round(n / 7)); c++) {
        for (let tries = 0; tries < 60; tries++) {
          const pt = new DOMPoint(bb.x + R() * bb.width, bb.y + R() * bb.height);
          if (p.isPointInFill(pt)) { clusters.push(pt); break; }
        }
      }
      let placed = 0, guard = 0;
      while (placed < n && guard++ < 4000) {
        const c = clusters[Math.floor(R() * clusters.length)] || { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
        const spread = R() < 0.6 ? 18 : 55;
        const pt = new DOMPoint(c.x + (R() - 0.5) * spread * 2, c.y + (R() - 0.5) * spread * 2);
        if (!p.isPointInFill(pt)) continue;
        dots.push({ x: pt.x, y: pt.y, d: 0.35 + R() * 2.0, r: 3.4 + R() * 1.4 });
        placed++;
      }
    }
  }
  const back = (t) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function draw(t) {
    const k = fitCanvas(cv, ctx, CW, CH);
    ctx.clearRect(0, 0, CW, CH);
    ctx.setTransform(k * SC, 0, 0, k * SC, 0, k * OY);
    ctx.fillStyle = '#D82034'; ctx.strokeStyle = '#D82034'; ctx.lineWidth = 1.2;
    let busy = false;
    const landed = new Path2D(); // fertig gelandete Punkte in einem Rutsch füllen
    for (const p of dots) {
      const u = t - p.d;
      if (u <= 0) { busy = true; continue; }
      if (u >= 1) { landed.moveTo(p.x + p.r, p.y); landed.arc(p.x, p.y, p.r, 0, 6.283); continue; }
      busy = true;
      const a = Math.min(1, u / 0.35), m = Math.min(1, u / 0.75), e = back(m);
      const y = p.y - 46 * (1 - e), r = p.r * (0.4 + 0.6 * e);
      ctx.globalAlpha = 0.92 * a;
      ctx.beginPath(); ctx.arc(p.x, y, Math.max(0.1, r), 0, 6.283); ctx.fill();
      const q = E.outCubic(u); // Welle beim Aufsetzen
      ctx.globalAlpha = 0.7 * (1 - q);
      ctx.beginPath(); ctx.arc(p.x, p.y, (p.r + 1) * (0.3 + 2.7 * q), 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 0.92;
    ctx.fill(landed);
    ctx.globalAlpha = 1;
    return busy;
  }
  function frame(now) {
    if (draw((now - t0) / 1000)) raf = requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { if (on && dots) draw(99); });
  return {
    prebuild: build,
    step() { build(); on = true; cancelAnimationFrame(raf); t0 = performance.now() - (reduce ? 9000 : 0); raf = requestAnimationFrame(frame); },
    leave() { on = false; cancelAnimationFrame(raf); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); },
    final() { build(); on = true; cancelAnimationFrame(raf); draw(99); },
  };
})();

/* ---------- 5 · Institute / Vergleichsportale → Verschmelzung ---------- */
hooks.vergleich = (() => {
  const s = $('#vergleich');
  const h1 = $('.v-h1', s), h2 = $('.v-h2', s);
  const rows = {};
  $$('.vw-row', s).forEach((r) => { rows[r.dataset.k] = r; });
  // Zeilen in den Karten (Start) und ihre Plätze unter dem Logo (Ziel)
  const START = { A1: [220, 600], A2: [220, 690], A3: [220, 780], B1: [1180, 600], B2: [1180, 690], B3: [1180, 780] };
  const FINAL = { A1: [155, 748], A2: [700, 748], B1: [1245, 748] };
  for (const [k, [x, y]] of Object.entries(START)) { rows[k].style.left = x + 'px'; rows[k].style.top = y + 'px'; }
  for (const [k, [x, y]] of Object.entries(FINAL)) {
    rows[k].style.setProperty('--fx', x - START[k][0] + 'px');
    rows[k].style.setProperty('--fy', y - START[k][1] + 'px');
  }

  // Das rote Band in seine drei Bögen zerlegen; das Schweizerkreuz gehört zum Bogen, der es umschließt
  const LB = { x: 770, y: 322 }, K = 380 / 436;
  const contours = L.red.split(/(?=M)/);
  const hole = contours.find((c) => c.includes('Q'));
  const box = (d) => {
    const n = d.match(/-?\d*\.?\d+/g).map(Number); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let q = 0; q + 1 < n.length; q += 2) { x0 = Math.min(x0, n[q]); x1 = Math.max(x1, n[q]); y0 = Math.min(y0, n[q + 1]); y1 = Math.max(y1, n[q + 1]); }
    return [x0, y0, x1, y1];
  };
  const hb = box(hole), hc = [(hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2];
  const tctx = document.createElement('canvas').getContext('2d');
  const pieces = contours.filter((c) => c !== hole).map((d) => ({ d, b: box(d) })).sort((a, b) => a.b[1] - b.b[1]);
  pieces.forEach((pc) => { if (tctx.isPointInPath(new Path2D(pc.d), hc[0], hc[1])) pc.d += hole; });
  const ORDER = ['A1', 'A2', 'B1']; // oben → unten: persönliche Beratung, Betreuung, Produktpalette
  const pieceEls = $$('.vw-piece', s);
  const flights = pieces.map((pc, idx) => {
    const svg = pieceEls[idx];
    svg.setAttribute('viewBox', '12 40 436 380');
    svg.innerHTML = `<path fill-rule="evenodd" d="${pc.d}"/>`;
    const cx = ((pc.b[0] + pc.b[2]) / 2 - 12) * K, cy = ((pc.b[1] + pc.b[3]) / 2 - 40) * K;
    svg.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
    const row = ORDER[idx], [rx, ry] = START[row];
    const sx = rx + 14 + 25, sy = ry + 39; // Mitte des Symbols in der Zeile
    return { svg, row, dx: sx - (LB.x + cx), dy: sy - (LB.y + cy), px: LB.x + cx, py: LB.y + cy };
  });
  logoSVG($('.vw-word', s), { ribbon: false, letters: true, vb: '12 40 436 380' });
  const trails = $('.vw-trails', s);
  const logo = $('.vw-logo', s), rings = $$('.vw-ring', s);

  let anims = [], tm = [];
  const stopAll = () => { anims.forEach((a) => a.cancel()); anims = []; tm.forEach(clearTimeout); tm = []; trails.innerHTML = ''; };
  const EZ = 'cubic-bezier(.65,0,.35,1)';

  function fuse(instant) {
    stopAll();
    h1.classList.add('out'); h2.classList.add('in');
    if (instant) {
      s.classList.add('instant', 'fused');
      requestAnimationFrame(() => requestAnimationFrame(() => s.classList.remove('instant')));
      return;
    }
    s.classList.add('fused');
    // 1) Stärken heben ab und gleiten auf ihre Plätze
    ORDER.forEach((k, n) => {
      const fx = FINAL[k][0] - START[k][0], fy = FINAL[k][1] - START[k][1];
      anims.push(rows[k].animate([
        { transform: 'translate(0,0) scale(1)' },
        { transform: 'translate(0,-14px) scale(1.04)', offset: 0.2 },
        { transform: `translate(${fx * 0.55}px,${fy * 0.55 - 70}px) scale(1.05)`, offset: 0.6 },
        { transform: `translate(${fx}px,${fy}px) scale(1)` },
      ], { duration: 1250, delay: 380 + n * 140, easing: EZ, fill: 'backwards' }));
    });
    // 2) Jede Stärke gibt ihren Bogen frei – die Bögen fliegen zusammen und bilden das Logo
    flights.forEach((f, n) => {
      const delay = 520 + n * 230, dur = 1150;
      const mx = f.dx * 0.42, my = f.dy * 0.42 - 240;
      const path = [
        { transform: `translate(${f.dx}px,${f.dy}px) scale(.12) rotate(-120deg)`, opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: `translate(${mx}px,${my}px) scale(.72) rotate(-30deg)`, offset: 0.58 },
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      ];
      anims.push(f.svg.animate(path, { duration: dur, delay, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'backwards' }));
      // Leuchtspur
      for (let t = 0; t < 6; t++) {
        const dot = h('i', null, null, trails);
        dot.style.left = f.px + 'px'; dot.style.top = f.py + 'px';
        const sc = 1 - t * 0.13;
        anims.push(dot.animate([
          { transform: `translate(${f.dx}px,${f.dy}px) scale(${sc})`, opacity: 0 },
          { opacity: 0.55 - t * 0.07, offset: 0.15 },
          { transform: `translate(${mx}px,${my}px) scale(${sc})`, offset: 0.58 },
          { opacity: 0.4 - t * 0.05, offset: 0.9 },
          { transform: `translate(0,0) scale(${sc * 0.4})`, opacity: 0 },
        ], { duration: dur, delay: delay + 40 + t * 38, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'both' }));
      }
    });
    // 3) Logo rastet ein: Puls und zwei Ringwellen
    const lock = 520 + 2 * 230 + 1150;
    anims.push(logo.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 650, delay: lock - 40, easing: 'cubic-bezier(.3,1.4,.5,1)' }));
    rings.forEach((r, n) => anims.push(r.animate([
      { transform: 'scale(.55)', opacity: 0.7 },
      { transform: `scale(${2.3 + n * 0.8})`, opacity: 0 },
    ], { duration: 1100 + n * 300, delay: lock + n * 160, easing: 'cubic-bezier(.16,1,.3,1)' })));
  }
  function unfuse() {
    stopAll();
    s.classList.remove('fused');
    h1.classList.remove('out'); h2.classList.remove('in');
  }
  return {
    step(_, n, dir, silent) { if (n >= 2) { if (!s.classList.contains('fused')) fuse(silent); } else unfuse(); },
    leave() { s.classList.add('instant'); unfuse(); requestAnimationFrame(() => s.classList.remove('instant')); },
    final() { fuse(true); },
  };
})();

/* ---------- 6 · Finanzierungen: Bankenwolke ---------- */
hooks.finanzierung = (() => {
  const s = $('#finanzierung');
  const box = $('.banks', s);
  const BANKS = [
    ['NRW.BANK', '#1B4F9C', 300, 10, 1.0], ['ING', '#FF6200', 740, 60, 1.35], ['Commerzbank', '#FFC20E', 20, 150, 1.2],
    ['Deutsche Bank', '#0018A8', 520, 210, 1.15], ['Sparkasse', '#FF0000', 140, 330, 1.45], ['Hanseatic Bank', '#E30613', 640, 380, 1.0],
    ['Volksbanken Raiffeisenbanken', '#0066B3', 40, 500, 0.95, '#F39200'], ['Santander', '#EC0000', 600, 540, 1.25], ['Postbank', '#FFCC00', 230, 650, 1.3, '#0F2B8F'],
    ['DSL Bank', '#A4123F', 700, 700, 1.05], ['PSD Bank', '#00843D', 20, 790, 1.05], ['KfW', '#005A8C', 430, 800, 1.3],
  ];
  const R = rng(42);
  const cards = BANKS.map(([n, c, x, y, sc, c2], i) => {
    const b = h('div', 'bank', `<div class="bank-i"><i></i><span>${n}</span></div>`, box);
    b.style.left = x + 'px'; b.style.top = y + 'px';
    b.style.setProperty('--c', c); if (c2) b.style.setProperty('--c2', c2);
    b.style.setProperty('--s', sc); b.style.setProperty('--z', (0.4 + sc * 0.9).toFixed(2));
    b.style.setProperty('--d', (0.35 + R() * 0.9).toFixed(2) + 's');
    const bi = b.firstChild;
    bi.style.setProperty('--bd', (6 + R() * 4).toFixed(1) + 's'); bi.style.setProperty('--bo', (-R() * 6).toFixed(1) + 's');
    bi.style.setProperty('--rot', ((R() - 0.5) * 2.4).toFixed(2) + 'deg');
    return b;
  });
  s.addEventListener('pointermove', (e) => {
    const [x, y] = toStage(e);
    box.style.setProperty('--px', ((x / W - 0.5) * -14).toFixed(2));
    box.style.setProperty('--py', ((y / H - 0.5) * -10).toFixed(2));
  });
  return {
    step() { requestAnimationFrame(() => cards.forEach((c) => c.classList.add('in'))); },
    leave() { cards.forEach((c) => c.classList.remove('in')); },
    final() { cards.forEach((c) => c.classList.add('in')); },
  };
})();

/* ---------- 7 · Best-Select: 3D-Partnerkugel ---------- */
hooks.bestselect = (() => {
  const s = $('#bestselect');
  logoSVG($('.sphere-core svg', s), { vb: 'full' });
  const P = ['Allianz', 'Allianz Global Investors', 'Alte Oldenburger', 'Augsburger Aktienbank', 'Agila', 'AXA', 'ARAG', 'Alte Leipziger', 'Hanseatic Bank', 'HanseMerkur', 'HDI', 'HEK', 'Helvetia', 'Baden-Badener', 'Basler', 'Barmenia', 'BavariaDirekt', 'Bayerische Beamtenkrankenkasse', 'IDEAL', 'INTER', 'InterRisk', 'J.P. Morgan Asset Management', 'LBN', 'die Bayerische', 'BGV', 'BHW', 'BKK Pfalz', 'Canada Life', 'Care Concept', 'LKH', 'Mobil Krankenkasse', 'Münchener Hypothekenbank', 'Münchener Verein', 'neue leben', 'Commerzbank', 'Commerz Real', 'C-Quadrat', 'Die Continentale', 'D.A.S.', 'Nordland', 'Nordvers', 'Nürnberger', 'OVAG', 'P&P Gruppe', 'DBV', 'Deurag', 'DEVK', 'Dialog', 'Die Dortmunder', 'DKV', 'Postbank', 'PVAG', 'RREEF', 'Roland', 'Salus BKK', 'Santander', 'Domicil', 'DSL Bank', 'DWS', 'ebase', 'energie-BKK', 'ERGO', 'Schleswiger', 'SKG Bank', 'Signal Iduna', 'Die Stuttgarter', 'Swiss Life', 'Europa', 'Europace', 'FondsDepot Bank', 'Franklin Templeton', 'Frankfurt-Trust', 'Die Techniker', 'Uelzener', 'UKV', 'Universa', 'Verti', 'VHV', 'Generali', 'Gothaer', 'Grundeigentümer-Versicherung', 'Die Haftpflichtkasse', 'Hallesche', 'Die Hannoversche', 'Volkswohl Bund', 'Wertinvestition', 'Wüstenrot', 'WWK', 'Zurich'];
  const rot = $('.sphere-rot', s);
  const n = P.length, RAD = 385, GA = Math.PI * (3 - Math.sqrt(5));
  const tags = P.map((name, i) => {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), th = i * GA;
    const t = h('span', 'tag' + (name === 'Swiss Life' ? ' me' : ''), name.replace(/&/g, '&amp;'), rot);
    return { t, x: Math.cos(th) * r * RAD * 1.28, y: y * RAD, z: Math.sin(th) * r * RAD, w: 0, zb: -1 };
  });
  let ay = 0, ax = -0.22, vy = 0.0032, vx = 0, raf = 0, drag = null, intro = 0;
  const measure = () => tags.forEach((o) => { o.w = o.t.offsetWidth; });
  const sph = $('.sphere', s);
  sph.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; sph.setPointerCapture(e.pointerId); e.stopPropagation(); });
  sph.addEventListener('pointermove', (e) => {
    if (!drag) return;
    vy = (e.clientX - drag.x) * 0.00012 / scale * 10; vx = -(e.clientY - drag.y) * 0.00012 / scale * 10;
    drag = { x: e.clientX, y: e.clientY };
  });
  sph.addEventListener('pointerup', () => { drag = null; });
  sph.addEventListener('click', (e) => e.stopPropagation());
  function frame(now) {
    if (!intro) intro = now;
    const k = E.outCubic(clamp((now - intro) / 1600, 0, 1));
    ay += vy + (1 - k) * 0.05; ax += vx;
    ax = clamp(ax, -1.1, 1.1);
    if (!drag) { vy += (0.0032 - vy) * 0.02; vx *= 0.94; }
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    for (const o of tags) {
      const x1 = o.x * cy + o.z * sy, z1 = -o.x * sy + o.z * cy;
      const y2 = o.y * cx - z1 * sx, z2 = o.y * sx + z1 * cx;
      const f = 1000 / (1000 - z2), rr = lerp(0.35, 1, k);
      const depth = (z2 + RAD) / (2 * RAD);
      // nur transform/opacity (GPU); Tiefenebene nur bei echtem Wechsel neu setzen
      o.t.style.transform = `translate(${(x1 * f * rr - o.w / 2).toFixed(1)}px,${(y2 * f * rr - 20).toFixed(1)}px) scale(${(f * 0.88).toFixed(3)})`;
      o.t.style.opacity = ((0.12 + depth * 0.88) * k).toFixed(3);
      const zb = Math.round(depth * 12);
      if (zb !== o.zb) { o.zb = zb; o.t.style.zIndex = z2 > 0 ? 1100 + zb : 900 + zb; }
    }
    raf = requestAnimationFrame(frame);
  }
  return {
    step() { measure(); cancelAnimationFrame(raf); intro = 0; raf = requestAnimationFrame(frame); },
    leave() { cancelAnimationFrame(raf); },
    final() { measure(); cancelAnimationFrame(raf); intro = performance.now() - 5000; frame(performance.now()); cancelAnimationFrame(raf); },
  };
})();

/* ---------- 8 · Alles aus einer Hand ---------- */
hooks.hub = (() => {
  const s = $('#hub');
  logoSVG($('.hub-core svg', s), { vb: 'full' });
  const C = [960, 620], RX = 640, RY = 300;
  const NODES = [
    [0, 'key', 'Finanzierungen', 'über Interhyp'], [40, 'building', 'Firmenberatung', ''], [90, 'chart', 'Investment', ''],
    [140, 'shield', 'Finanzen + Versicherung', 'Best-Select-System'], [180, 'jersey', 'Sponsoring', 'für Vereine'], [220, 'globe', 'Expats-Beratung', ''],
    [270, 'columns', 'dbb beamtenbund', 'und tarifunion'], [320, 'houseup', 'Immobilien Einkommen', ''],
  ];
  const svg = $('.hub-lines', s), box = $('.hub-nodes', s);
  const pbox = h('div', 'hub-pulses', null, s);
  s.insertBefore(pbox, box);
  const lines = [], pulses = [];
  NODES.forEach(([deg, ic, t, sub], i) => {
    const a = (deg * Math.PI) / 180, x = C[0] + Math.cos(a) * RX, y = C[1] + Math.sin(a) * RY;
    const d0 = 160, dx = x - C[0], dy = y - C[1], len = Math.hypot(dx, dy);
    const x0 = C[0] + (dx / len) * d0, y0 = C[1] + (dy / len) * d0 * 0.98;
    const x1 = x - (dx / len) * 58, y1 = y - (dy / len) * 58;
    const ln = el('line', { class: 'ln', x1: x0, y1: y0, x2: x1, y2: y1 }, svg);
    const L_ = Math.hypot(x1 - x0, y1 - y0);
    ln.style.strokeDasharray = L_; ln.style.strokeDashoffset = L_;
    lines.push({ ln, L: L_, i });
    pulses.push({ c: h('i', 'pulse', null, pbox), x0, y0, x1, y1, ph: i / NODES.length });
    const n = h('div', 'hub-node', `<div class="hn-i"><svg class="ico"><use href="#i-${ic}"/></svg></div><div class="hn-t">${t}${sub ? `<small>${sub}</small>` : ''}</div>`, box);
    n.style.left = x + 'px'; n.style.top = y + 'px';
    if (deg === 270) n.classList.add('top');
    n.style.setProperty('--d', (0.75 + i * 0.09).toFixed(2) + 's');
  });
  let anims = [], pulseAnims = [];
  // Datenpunkte laufen als eigene GPU-Ebenen (transform/opacity) – kein Neuzeichnen der Linien
  function startPulses() {
    pulseAnims.forEach((a) => a.cancel());
    pulseAnims = pulses.map((p) => p.c.animate([
      { transform: `translate(${p.x0.toFixed(1)}px,${p.y0.toFixed(1)}px)`, opacity: 0 },
      { opacity: 0.9, offset: 0.5 },
      { transform: `translate(${p.x1.toFixed(1)}px,${p.y1.toFixed(1)}px)`, opacity: 0 },
    ], { duration: 3125, delay: 2000, iterationStart: p.ph, iterations: Infinity, easing: 'cubic-bezier(.65,0,.35,1)' }));
  }
  return {
    step() {
      anims.forEach((a) => a.cancel());
      anims = lines.map(({ ln, L: l, i }) => ln.animate([{ strokeDashoffset: l }, { strokeDashoffset: 0 }], { duration: 900, delay: 500 + i * 90, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }));
      requestAnimationFrame(() => $$('.hub-node', s).forEach((n) => n.classList.add('in')));
      startPulses();
    },
    leave() { pulseAnims.forEach((a) => a.cancel()); pulseAnims = []; anims.forEach((a) => a.cancel()); anims = []; $$('.hub-node', s).forEach((n) => n.classList.remove('in')); },
    final() { lines.forEach(({ ln }) => { ln.style.strokeDashoffset = 0; }); $$('.hub-node', s).forEach((n) => n.classList.add('in')); },
  };
})();

/* ---------- 9 · Vereinsstruktur ---------- */
function buildRefs() {
  const row = $('#verein .refs-row');
  const names = (S.refs || '').split(',').map((x) => x.trim()).filter(Boolean);
  const list = names.length ? names : ['—'];
  const html = list.map((n) => `<span>${n.replace(/</g, '&lt;')}</span>`).join('');
  row.innerHTML = html + html + html + html;
  $('#verein .refs').style.display = names.length ? '' : 'none';
}
hooks.verein = (() => {
  const s = $('#verein');
  const qs = $$('.q', s);
  const key = () => 'answers.' + (S.vereinName || '_');
  function loadAnswers() { const a = store.get(key(), {}); $$('.q-a', s).forEach((i) => { i.value = a[i.dataset.q] || ''; }); }
  $$('.q-a', s).forEach((i) => {
    i.addEventListener('input', () => { const a = store.get(key(), {}); a[i.dataset.q] = i.value; store.set(key(), a); });
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); i.blur(); } e.stopPropagation(); });
    i.addEventListener('click', (e) => e.stopPropagation());
  });
  return {
    loadAnswers,
    step(_, n) {
      loadAnswers();
      qs.forEach((q, i) => { q.classList.toggle('cur', i === n && n < 6); q.classList.toggle('past', i < n && n < 6); });
    },
    final() { qs.forEach((q) => q.classList.remove('cur', 'past')); },
  };
})();

/* ---------- 10 · Konzept: Anzeige kippt mit der Maus ---------- */
hooks.konzept = (() => {
  const s = $('#konzept');
  logoSVG($('.ad-tab svg', s), { vb: 'full' });
  const ad = $('.ad', s);
  s.addEventListener('pointermove', (e) => {
    if (!ad.classList.contains('in')) return;
    const [x, y] = toStage(e);
    ad.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1), opacity .6s';
    ad.style.transform = `rotateY(${((x - 1370) / 1370) * 7}deg) rotateX(${((540 - y) / 540) * 5}deg)`;
  });
  s.addEventListener('pointerleave', () => { if (ad.classList.contains('in')) ad.style.transform = ''; });
  return { leave() { ad.style.transform = ''; ad.style.transition = ''; } };
})();

/* ---------- 11 · Ausstattung: Produkte & Logodruck ---------- */
function printLogo(white) {
  const s = newSVG(null);
  logoSVG(s, { vb: 'full', white: !!white });
  return s.outerHTML;
}
function buildProducts() {
  const box = $('#ausstattung .products');
  if (!box) return;
  const ort = val('ort');
  const back = `<div class="back-print">${printLogo(false)}${val('beraterName') ? `<b>${val('beraterName')}</b>` : ''}<span>Finanzkanzlei für</span><span>Swiss Life Select</span><span>in ${ort}</span></div>`;
  const list = isChor() || S.art === 'verein'
    ? [
      { img: 'produkt-polo', l: 'Polo · Vorderseite', p: { x: 62, y: 33, w: 17, white: true } },
      { img: 'produkt-trikot-weiss', l: 'Shirt · Rückseite', p: { x: 50, y: 41, w: 30, html: back } },
      { img: 'produkt-tasche', l: 'Tasche', p: { x: 50, y: 53, w: 27, white: true } },
    ]
    : [
      { img: 'produkt-trikot-schwarz', l: 'Trikot · Vorderseite', p: { x: 50, y: 36, w: 25, white: true } },
      { img: 'produkt-trikot-weiss', l: 'Trikot · Rückseite', p: { x: 50, y: 41, w: 30, html: back } },
      { img: 'produkt-tasche', l: 'Sporttasche', p: { x: 50, y: 53, w: 27, white: true } },
    ];
  box.innerHTML = '';
  list.forEach((it, i) => {
    const c = h('div', 'prod', `<img src="${imgSrc(it.img)}" alt=""><span class="pl">${it.l}</span><span class="plus">+</span><div class="print${it.p.white ? ' white' : ''}">${it.p.html || printLogo(it.p.white)}</div><i class="scan"></i><i class="glint"></i>`, box);
    const p = $('.print', c);
    p.style.left = it.p.x + '%'; p.style.top = it.p.y + '%'; p.style.width = it.p.w + '%';
    p.style.transform = 'translate(-50%,-50%)';
    c.style.setProperty('--d', (0.55 + i * 0.14).toFixed(2) + 's');
    c.style.setProperty('--pd', (0.2 + i * 0.45).toFixed(2) + 's');
  });
  const s = $('#ausstattung');
  if (s.classList.contains('active')) hooks.ausstattung.step(s, step, 0, true);
}
hooks.ausstattung = (() => {
  const s = $('#ausstattung');
  const odo = $('.odo', s);
  function buildOdo(target) {
    const str = fmt(target); // "1.000"
    odo.innerHTML = '';
    let di = 0;
    [...str].forEach((ch) => {
      if (!/\d/.test(ch)) { h('span', 'sep', ch, odo); return; }
      const dg = h('span', 'dg', null, odo);
      const strip = h('i', null, null, dg);
      const turns = 2 + di;
      for (let r = 0; r <= turns; r++) for (let k = 0; k < 10; k++) h('b', null, String(k), strip);
      h('b', null, ch, strip);
      strip.dataset.n = (turns + 1) * 10;
      strip.style.setProperty('--dd', (0.25 + di * 0.12).toFixed(2) + 's');
      di++;
    });
  }
  buildOdo(1000);
  const roll = (on) => $$('.dg i', odo).forEach((st) => { st.style.transform = on ? `translateY(-${st.dataset.n}em)` : 'none'; });
  return {
    step(_, n, dir, silent) {
      requestAnimationFrame(() => roll(true));
      $$('.prod', s).forEach((p) => { p.classList.add('in'); p.classList.toggle('printed', n >= 1); });
    },
    leave() { roll(false); $$('.prod', s).forEach((p) => p.classList.remove('in', 'printed')); },
    final() { $$('.dg i', odo).forEach((st) => { st.style.transition = 'none'; st.style.transform = `translateY(-${st.dataset.n}em)`; }); $$('.prod', s).forEach((p) => p.classList.add('in', 'printed')); },
  };
})();

/* ---------- 12 · Tester ---------- */
hooks.tester = (() => {
  const s = $('#tester');
  const dots = $$('.testers i', s), cnt = $('.t-count', s);
  const app = $('.p-app', s), gain = $('.p-gain', s);
  let tt = [];
  function fill(instant) {
    tt.forEach(clearTimeout); tt = [];
    dots.forEach((d) => d.classList.remove('on')); cnt.textContent = '0/4';
    dots.forEach((d, i) => {
      const f = () => { d.classList.add('on'); cnt.textContent = `${i + 1}/4`; if (i === 3) cnt.textContent = '4/4 ✓'; };
      if (instant) f(); else tt.push(setTimeout(f, 900 + i * 380));
    });
  }
  return {
    step(_, n, dir, silent) {
      if (n === 0 || silent) fill(silent || dir < 0);
      app.classList.toggle('on', n === 1);
      app.classList.toggle('gone', n >= 2);
      gain.classList.toggle('on', n >= 2);
    },
    leave() { tt.forEach(clearTimeout); app.classList.remove('on', 'gone'); gain.classList.remove('on'); },
    final() { fill(true); gain.classList.add('on'); },
  };
})();

/* ---------- 15 · Kommunikation: Chats schreiben sich live ---------- */
function chatScript() {
  const B = val('beraterName') || 'Euer Berater';
  const group = 'Sponsoring ' + (val('vereinName') || words().group);
  const ini = (val('vereinName') || words().group).replace(/[^A-Za-zÄÖÜ ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'SV';
  const chor = isChor();
  return [
    { title: group, sub: 'Du, ' + B + ', Vorstand, Trainer', av: ini, msgs: [
      { sys: `${B} hat die Gruppe „${group}“ erstellt` },
      { sys: `${B} hat dich hinzugefügt` },
      { them: 1, who: B, t: `Hallo zusammen! 👋 Schön, dass es losgeht. Hier halten wir euch rund ums Sponsoring auf dem Laufenden – Bestellung, Lieferung und Übergabe.`, time: '18:02' },
      { me: 1, t: chor ? 'Super, danke! Der Chor freut sich schon 🎶' : 'Super, danke! Die Jungs freuen sich schon 💪', time: '18:05' },
    ] },
    { title: group, sub: 'Du, ' + B + ', +4', av: ini, msgs: [
      { day: '15. Januar' },
      { them: 1, who: B, t: chor
        ? 'Hallo zusammen und noch ein frohes neues Jahr! Kurzes Update zum Sponsoring:'
        : 'Servus zusammen und noch ein frohes Neues! Hier ein Update zum Sponsoring der 1. Herren, 2. Herren und der Alten Herren:', time: '11:45' },
      { them: 1, who: B, t: chor
        ? 'Die Chorkleidung ist bestellt, wir warten auf die Lieferung von 11teamsports. Sobald ich mehr weiß, sag ich Bescheid und wir planen die Übergabe 👍'
        : '1. Herren: Ist bestellt, wir warten auf die Lieferung von 11teamsports. Sobald ich mehr weiß, geb ich euch Bescheid und wir planen die Übergabe 👍', time: '11:46' },
      { them: 1, who: B, t: 'Termine bisher:<br>• Jonas – beide Termine ✅<br>• Lukas – zweiter Termin fehlt noch', time: '11:47' },
    ] },
    { title: group, sub: 'Du, ' + B, av: ini, msgs: [
      { them: 1, who: B, t: 'Sprechen wir das Freitag bei unserem Termin nochmal durch, oder kann ich vorher noch was tun?', time: '16:46' },
      { me: 1, t: 'Ja, machen wir so 👍 alles gut', time: '18:25' },
      { them: 1, who: B, img: 'paket', t: 'Die Ware ist da! 📦', time: '12:30' },
      { me: 1, t: '👍 Bis morgen Abend dann. Die Adresse hast du noch?', time: '16:34' },
      { them: 1, who: B, t: chor ? 'Gemeindesaal, oder?' : 'Am Sportplatz, oder?', time: '19:16' },
      { me: 1, t: 'Ja genau 👍', time: '19:26' },
    ] },
  ];
}
function buildPhones() {
  const box = $('#kommunikation .phones');
  if (!box) return;
  box.innerHTML = '';
  chatScript().forEach((p, i) => {
    const ph = h('div', 'phone', `<div class="scr"><div class="ph-head"><span class="back">‹</span><span class="ph-av">${p.av}</span><span class="ph-n"><b>${p.title}</b><small>${p.sub}</small></span></div><div class="chat"></div><div class="ph-foot"><i></i><b></b></div></div>`, box);
    ph.style.setProperty('--d', (0.35 + i * 0.18).toFixed(2) + 's');
    ph.style.setProperty('--r', ['-3deg', '0deg', '3deg'][i]);
    ph.style.setProperty('--y', ['34px', '0px', '34px'][i]);
    ph._script = p.msgs;
  });
}
function msgEl(m) {
  if (m.sys) return h('div', 'msg sys', m.sys);
  if (m.day) return h('div', 'msg sys', m.day);
  const e = h('div', 'msg' + (m.me ? ' me' : ''));
  e.innerHTML = (m.them && m.who ? `<span class="who">${m.who}</span>` : '') + (m.img ? `<img src="${imgSrc(m.img)}" alt="">` : '') + `${m.t || ''}<time>${m.time || ''}${m.me ? ' ✓✓' : ''}</time>`;
  return e;
}
hooks.kommunikation = (() => {
  const s = $('#kommunikation');
  function play(instant) {
    clearLater();
    $$('.phone', s).forEach((ph, pi) => {
      const chat = $('.chat', ph);
      chat.innerHTML = '';
      requestAnimationFrame(() => ph.classList.add('in'));
      if (instant) { ph._script.forEach((m) => chat.appendChild(msgEl(m))); return; }
      let t = 1100 + pi * 650;
      ph._script.forEach((m) => {
        if (m.them && !m.sys) {
          const tStart = t;
          later(() => { const ty = h('div', 'msg typing', '<i></i><i></i><i></i>', chat); ty.dataset.typing = 1; }, tStart);
          t += 900;
          later(() => { $$('[data-typing]', chat).forEach((x) => x.remove()); chat.appendChild(msgEl(m)); }, t);
        } else {
          later(() => chat.appendChild(msgEl(m)), t);
        }
        t += m.sys || m.day ? 420 : 820;
      });
    });
  }
  return {
    step(_, n, dir, silent) { play(silent || dir < 0); },
    leave() { clearLater(); $$('.phone', s).forEach((p) => p.classList.remove('in')); },
    final() { play(true); $$('.phone', s).forEach((p) => p.classList.add('in')); },
  };
})();

/* ---------- 16 · Fünf Schritte: Kreislauf ---------- */
hooks.schritte = (() => {
  const s = $('#schritte');
  const svg = $('.cyc', s), box = $('.cyc-nodes', s), head = $('.sch-h', s);
  const C = [960, 628], R = 282;
  const STEPS = () => [
    ['thumb', 'Ihr stimmt euch ab.<br>Passt alles?', 'r'],
    ['hand', `Wir kommen ${words().meet} vorbei.`, 'r'],
    ['people', 'Mindestens 4 Tester testen uns.', 'r'],
    ['bag', 'Wir bestellen eure Ware.', 'l'],
    ['present', `Wir kommen vorbei und stellen uns ${words().teamAll} vor.`, 'l'],
  ];
  const angs = [-90, -18, 54, 126, 198];
  const base = el('circle', { class: 'base', cx: C[0], cy: C[1], r: R }, svg);
  const CIRC = 2 * Math.PI * R;
  const prog = el('circle', { class: 'prog', cx: C[0], cy: C[1], r: R, transform: `rotate(-90 ${C[0]} ${C[1]})`, 'stroke-dasharray': CIRC.toFixed(1), 'stroke-dashoffset': CIRC.toFixed(1) }, svg);
  // Komet als eigene GPU-Ebene: ein Arm, der sich um die Kreismitte dreht
  const arm = h('div', 'cyc-arm', '<i class="comet-g"></i><i class="comet"></i>', s);
  arm.style.left = C[0] + 'px'; arm.style.top = C[1] + 'px'; arm.style.setProperty('--R', R + 'px');
  const cm = arm;
  let nodes = [], labels = [], ang = -90, raf = 0;
  function build() {
    box.innerHTML = ''; nodes = []; labels = [];
    STEPS().forEach(([ic, t, side], i) => {
      const a = (angs[i] * Math.PI) / 180, x = C[0] + Math.cos(a) * R, y = C[1] + Math.sin(a) * R;
      const n = h('div', 'cyc-node', `<svg class="ico"><use href="#i-${ic}"/></svg><span class="no">${i + 1}</span>`, box);
      n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.setProperty('--d', (0.2 + i * 0.12).toFixed(2) + 's');
      const l = h('div', 'cyc-l ' + side, t, box);
      l.dataset.n = i + 1;
      if (i === 0) { l.style.left = x + 110 + 'px'; l.style.top = y - 50 + 'px'; }
      else if (side === 'r') { l.style.left = x + 110 + 'px'; l.style.top = y - 34 + 'px'; }
      else { l.style.left = x - 110 - 430 + 'px'; l.style.top = y - 34 + 'px'; }
      nodes.push(n); labels.push(l);
    });
  }
  build();
  function setAng(a) {
    ang = a;
    prog.style.strokeDashoffset = (CIRC * (1 - (a + 90) / 360)).toFixed(1);
    arm.style.transform = `rotate(${a.toFixed(2)}deg)`;
  }
  function tweenTo(a1, ms) {
    cancelAnimationFrame(raf);
    const a0 = ang, t0 = performance.now();
    const f = (now) => { const t = clamp((now - t0) / ms, 0, 1); setAng(lerp(a0, a1, E.inOutCubic(t))); if (t < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
  }
  function headPos(center) {
    if (!center) { head.style.transform = 'none'; return; }
    const w = head.offsetWidth, k = 1.22;
    head.style.transform = `translate(${(W - w * k) / 2 - 150}px, ${540 - 166 - 50 * k}px) scale(${k})`;
  }
  return {
    rebuild: build,
    enter(_, dir) {
      if (dir < 0) return;
      head.style.transition = 'none';
      headPos(true);
      requestAnimationFrame(() => requestAnimationFrame(() => { head.style.transition = ''; }));
    },
    step(_, n, dir, silent) {
      if (silent) head.style.transition = 'none';
      headPos(n === 0);
      if (silent) requestAnimationFrame(() => { head.style.transition = ''; });
      svg.classList.toggle('on', n >= 1);
      const active = n - 1; // 0..4
      nodes.forEach((nd, i) => { nd.classList.toggle('cur', i === active); nd.classList.toggle('done', i < active); });
      labels.forEach((l, i) => { l.classList.toggle('cur', i === active); l.classList.toggle('done', i < active); l.classList.toggle('vis', n >= 1); });
      cm.style.opacity = n >= 1 ? 1 : 0;
      const target = n >= 1 ? angs[active] : -90;
      if (silent) setAng(target); else tweenTo(target, n <= 1 ? 600 : 1000);
    },
    leave() { cancelAnimationFrame(raf); setAng(-90); },
    final() { headPos(false); svg.classList.add('on'); nodes.forEach((nd) => nd.classList.add('done')); labels.forEach((l) => l.classList.add('done')); setAng(198); },
  };
})();

/* ---------- 17 · Finale: Konfetti ---------- */
hooks.finale = (() => {
  const s = $('#finale');
  logoSVG($('.f-logo svg', s), { vb: 'full' });
  const cv = $('.confetti', s), ctx = cv.getContext('2d');
  let parts = [], raf = 0;
  const COLS = ['#D82034', '#E8394E', '#8B1C34', '#ffffff', '#C9A46D', '#9a9aa0'];
  function burst(x, y, n, spread, power) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * spread, v = power * (0.45 + Math.random() * 0.75);
      const cross = Math.random() < 0.12;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: cross ? 16 : 8 + Math.random() * 10, h: cross ? 16 : 5 + Math.random() * 7, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.35, ci: (Math.random() * COLS.length) | 0, cross, t: Math.random() * 6.28, life: 1 });
    }
  }
  function frame() {
    const k = fitCanvas(cv, ctx, W, H, 0.75);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.32; p.x += p.vx + Math.sin(p.t) * 1.2; p.y += p.vy; p.r += p.vr; p.t += 0.08;
      if (p.y > H + 40) p.life = 0;
    }
    // nach Farbe gebündelt zeichnen; Drehung/Kippen direkt als Matrix (kein save/restore)
    for (let ci = 0; ci <= COLS.length; ci++) {
      ctx.fillStyle = ci < COLS.length ? COLS[ci] : '#D82034';
      for (const p of parts) {
        if (ci < COLS.length ? (p.cross || p.ci !== ci) : !p.cross) continue;
        const c = Math.cos(p.r), sn = Math.sin(p.r), sy = Math.abs(Math.cos(p.t)) * 0.8 + 0.2;
        ctx.setTransform(c * k, sn * k, -sn * sy * k, c * sy * k, p.x * k, p.y * k);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
    }
    ctx.fillStyle = '#fff';
    for (const p of parts) {
      if (!p.cross) continue;
      const c = Math.cos(p.r), sn = Math.sin(p.r), sy = Math.abs(Math.cos(p.t)) * 0.8 + 0.2;
      ctx.setTransform(c * k, sn * k, -sn * sy * k, c * sy * k, p.x * k, p.y * k);
      ctx.fillRect(-1.8, -5.5, 3.6, 11); ctx.fillRect(-5.5, -1.8, 11, 3.6);
    }
    parts = parts.filter((p) => p.life > 0);
    if (parts.length) raf = requestAnimationFrame(frame); else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
  }
  function go() {
    cancelAnimationFrame(raf); parts = [];
    burst(300, 1100, 110, 1.0, 34); burst(1620, 1100, 110, 1.0, 34);
    later(() => burst(960, 1120, 150, 1.4, 38), 350);
    later(() => { burst(560, 1100, 60, 0.8, 30); burst(1360, 1100, 60, 0.8, 30); }, 900);
    raf = requestAnimationFrame(frame);
  }
  return {
    step(_, n, dir, silent) { if (n >= 1 && dir > 0 && !silent) go(); if (n < 1) { parts = []; } },
    leave() { cancelAnimationFrame(raf); parts = []; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); },
    final() {},
  };
})();

/* ------------------------------------------------------------------------
   Kapitel-Übergang (Band-Wischer)
   ------------------------------------------------------------------------ */
const CHAPTERS = { 1: ['I', 'Wir stellen uns vor'], 2: ['II', 'Wie sieht eure Vereinsstruktur aus?'], 3: ['III', 'Unser Sponsoringkonzept'], 4: ['IV', 'Wie geht es weiter?'] };
const wipe = $('#wipe');
$('.w-rib path', wipe).setAttribute('d', L.red);
$('.w-rib path', wipe).setAttribute('fill-rule', 'evenodd');
function chapterWipe(ch, swap) {
  return new Promise((done) => {
    const [n, t] = CHAPTERS[ch] || ['', ''];
    $('.w-n', wipe).textContent = n; $('.w-t', wipe).textContent = t;
    wipe.style.visibility = 'visible';
    const cin = $('.w-in', wipe), cout = $('.w-out', wipe), rib = $('.w-rib', wipe), ln = $('.w-n', wipe), lt = $('.w-t', wipe);
    const IN = 650, HOLD = 950, OUT = 700, FULL = 4.6; // Kreis (Ø 1000 px) deckt bei 4,6-facher Größe die ganze Bühne
    cout.style.visibility = 'hidden';
    cin.style.visibility = 'visible';
    cin.animate([{ transform: 'scale(0)' }, { transform: `scale(${FULL})` }], { duration: IN, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    rib.animate([
      { transform: 'translate(-1500px,900px) rotate(-30deg) scale(.7)' },
      { transform: 'translate(-80px,40px) rotate(-8deg) scale(1)', offset: 0.45 },
      { transform: 'translate(1600px,-1000px) rotate(16deg) scale(1.3)' },
    ], { duration: IN + HOLD + OUT, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
    const lab = { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' };
    ln.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 0.9, transform: 'none' }], { ...lab, delay: IN - 250 });
    lt.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], { ...lab, delay: IN - 120 });
    setTimeout(swap, IN + 30);
    setTimeout(() => {
      ln.animate([{ opacity: 0.9 }, { opacity: 0, transform: 'translateY(-30px)' }], { duration: 400, fill: 'forwards' });
      lt.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-30px)' }], { duration: 400, fill: 'forwards' });
      cout.style.visibility = 'visible';
      cin.style.visibility = 'hidden';
      cout.animate([{ transform: `scale(${FULL})` }, { transform: 'scale(0)' }], { duration: OUT, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    }, IN + HOLD);
    setTimeout(() => { wipe.style.visibility = 'hidden'; cout.style.visibility = 'hidden'; wipe.getAnimations({ subtree: true }).forEach((a) => a.cancel()); done(); }, IN + HOLD + OUT + 20);
  });
}

/* ------------------------------------------------------------------------
   Navigation
   ------------------------------------------------------------------------ */
let busy = false;
const brand = $('#brand');
logoSVG($('svg', brand), { vb: 'corner' });

function placeBrand(s, animateFromTitle) {
  const mode = s.dataset.logo;
  brand.classList.toggle('tab', mode === 'tab');
  brand.classList.toggle('hide', mode === 'none');
  if (animateFromTitle && !reduce) {
    // vom großen Titel-Logo in die Ecke fliegen (FLIP, Ursprung unten rechts)
    const k0 = 600 / 460;
    const fx1 = 660 + (10 + 440) * k0, fy1 = 28 + (38 + 384) * k0; // rechte untere Ecke des Logos im Titel
    const k = (384 * k0) / 110;
    brand.animate([
      { transform: `translate(${fx1 - (W - 46)}px,${fy1 - (H - 28)}px) scale(${k})`, opacity: 1 },
      { transform: 'none', opacity: 1 },
    ], { duration: 1150, easing: 'cubic-bezier(.65,0,.35,1)' });
  }
}

function resetSlide(s) {
  s.classList.remove('quick');
  $$('[data-s]', s).forEach((x) => x.classList.remove('in'));
  for (let k = 0; k < 8; k++) s.classList.remove('st' + k);
}

function show(i, st = 0, opts = {}) {
  i = clamp(i, 0, N - 1);
  const prev = cur >= 0 ? slides[cur] : null;
  const next = slides[i];
  const dir = opts.dir ?? (i >= cur ? 1 : -1);
  st = clamp(st, 0, stepsOf(i) - 1);
  if (prev === next) { step = st; setStep(next, st, dir); afterChange(); return; }
  clearLater();
  if (prev) {
    const hk = hooks[prev.id];
    prev.classList.remove('active');
    prev.classList.add('leaving');
    const anim = prev.animate([
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: `translateX(${-dir * 70}px) scale(.985)` },
    ], { duration: opts.instant ? 1 : 520, easing: 'cubic-bezier(.4,0,.2,1)' });
    const done = () => { prev.classList.remove('leaving'); if (!prev.classList.contains('active')) { resetSlide(prev); hk && hk.leave && hk.leave(prev); } };
    anim.onfinish = done; anim.oncancel = done;
  }
  cur = i; step = st;
  resetSlide(next);
  next.classList.toggle('quick', dir < 0);
  next.classList.add('active');
  next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: opts.instant ? 1 : 450, easing: 'ease-out' });
  void next.offsetWidth;
  const hk = hooks[next.id];
  if (hk && hk.enter) hk.enter(next, dir);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (slides[cur] !== next) return;
    // beim Rückwärtsgehen Zwischenschritte ohne Effekte setzen, letzten Schritt animieren
    if (st > 0 && dir < 0) setStep(next, st, dir, true); else setStep(next, st, dir);
  }));
  placeBrand(next, prev && prev.id === 'titel' && dir > 0);
  setWatermark(next.id);
  afterChange();
}

async function go(i, st = 0, dir) {
  if (busy) return;
  i = clamp(i, 0, N - 1);
  const prev = slides[cur];
  const next = slides[i];
  const d = dir ?? (i >= cur ? 1 : -1);
  if (prev && d > 0 && i === cur + 1 && +next.dataset.chapter > 0 && next.dataset.chapter !== prev.dataset.chapter && !reduce) {
    busy = true;
    await chapterWipe(next.dataset.chapter, () => show(i, st, { dir: d, instant: true }));
    busy = false;
    return;
  }
  show(i, st, { dir: d });
}
function next() {
  if (ovOn) return;
  if (step < stepsOf(cur) - 1) { step++; setStep(slides[cur], step, 1); afterChange(); }
  else if (cur < N - 1) go(cur + 1, 0, 1);
}
function prev() {
  if (ovOn) return;
  if (step > 0) { step--; setStep(slides[cur], step, -1); afterChange(); }
  else if (cur > 0) go(cur - 1, stepsOf(cur - 1) - 1, -1);
}

function afterChange() {
  const s = slides[cur];
  $('#progress').style.setProperty('--p', ((cur + (step + 1) / stepsOf(cur)) / N).toFixed(4));
  $('.hud-c').textContent = `${cur + 1} / ${N}`;
  $('.hud-t').textContent = s.dataset.title;
  try { history.replaceState(null, '', `#${cur + 1}${step ? '.' + (step + 1) : ''}`); } catch { /* file:// in manchen Browsern */ }
  presenter.update();
}

/* ------------------------------------------------------------------------
   Übersicht
   ------------------------------------------------------------------------ */
let ovOn = false;
function overview(on) {
  if (on === ovOn || busy) return;
  ovOn = on;
  const cols = 5, k = 0.172, cw = W / cols, gx = (cw - W * k) / 2, rows = Math.ceil(N / cols), ch = H / rows, gy = (ch - H * k) / 2;
  const cell = (i) => `translate(${((i % cols) * cw + gx).toFixed(1)}px,${(Math.floor(i / cols) * ch + gy).toFixed(1)}px) scale(${k})`;
  const EZ = 'cubic-bezier(.65,0,.35,1)';
  if (on) {
    clearLater();
    slides.forEach((s, i) => {
      s.getAnimations().forEach((a) => a.finish());
      s.classList.remove('leaving');
      s.classList.add('final');
      $$('[data-s]', s).forEach((x) => x.classList.add('in'));
      const hk = hooks[s.id];
      if (hk && hk.final) hk.final(s);
      s.classList.toggle('cur-ov', i === cur);
      if (!s.querySelector('.ov-num')) h('div', 'ov-num', String(i + 1), s);
    });
    stage.classList.add('ov');
    slides.forEach((s, i) => {
      const t = cell(i);
      s.style.transform = t;
      if (i === cur) s.animate([{ transform: 'none' }, { transform: t }], { duration: 850, easing: EZ });
      else s.animate([{ opacity: 0, transform: t + ' translateY(140px)' }, { opacity: 1, transform: t }], { duration: 700, delay: 250 + i * 28, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    });
  } else {
    const target = slides[cur];
    slides.forEach((s) => { if (s !== target) s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' }); });
    target.style.zIndex = 50;
    const from = target.style.transform;
    target.style.transform = 'none';
    const a = target.animate([{ transform: from }, { transform: 'none' }], { duration: 800, easing: EZ });
    a.onfinish = () => {
      stage.classList.remove('ov');
      slides.forEach((s) => {
        s.getAnimations().forEach((an) => an.cancel());
        s.classList.remove('final', 'cur-ov', 'active');
        s.style.transform = ''; s.style.zIndex = '';
        resetSlide(s);
        const hk = hooks[s.id]; if (hk && hk.leave) hk.leave(s);
      });
      const c = cur; cur = -1;
      show(c, step, { dir: 1, instant: true });
    };
  }
}
slides.forEach((s, i) => s.addEventListener('click', (e) => {
  if (!ovOn) return;
  e.stopPropagation();
  slides[cur].classList.remove('cur-ov');
  cur = i; step = stepsOf(i) - 1;
  overview(false);
}));

/* ------------------------------------------------------------------------
   Eingaben: Tastatur, Klicker, Maus, Touch
   ------------------------------------------------------------------------ */
let numBuf = '', numT = 0;
const started = () => $('#start').classList.contains('gone');
function startDeck() {
  if (started()) return;
  $('#start').classList.add('gone');
  fullscreen(true);
  if (cur < 0) show(0, 0); else { const c = cur; cur = -1; show(c, step, { dir: 1 }); }
  perfProbe();
}

/* Leistungsmodus: misst die ersten Sekunden; ruckelt es deutlich, werden Dauer-Effekte abgeschaltet */
let toastT = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
}
function setLite(on, auto) {
  document.body.classList.toggle('lite', on);
  if (!auto) store.set('lite', on);
  toast(on ? 'Leistungsmodus an – Dauer-Effekte aus (L zum Umschalten)' : 'Leistungsmodus aus – alle Effekte an (L)');
}
const lite = () => document.body.classList.contains('lite');
function perfProbe() {
  if (store.get('lite', null) !== null) return; // eigene Wahl hat Vorrang
  let n = 0, slow = 0, last = 0;
  const f = (now) => {
    if (last && n > 10) { if (now - last > 34) slow++; }
    last = now;
    if (++n < 300) requestAnimationFrame(f);
    else if (slow / (n - 11) > 0.3 && !lite()) setLite(true, true);
  };
  requestAnimationFrame(f);
}
if (store.get('lite', false)) document.body.classList.add('lite');
$('#st-go').addEventListener('click', (e) => { e.stopPropagation(); startDeck(); });

function fullscreen(on) {
  try {
    if (on ?? !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  } catch { /* nicht erlaubt */ }
}
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('fs', !!document.fullscreenElement));

function panel(id, on) {
  const p = $('#' + id);
  const show_ = on ?? p.hidden;
  $$('.panel-ui').forEach((x) => { x.hidden = true; });
  p.hidden = !show_;
  if (show_ && id === 'settings') fillSettings();
}

addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) { if (e.key === 'Escape') { e.target.blur(); $$('.panel-ui').forEach((x) => { x.hidden = true; }); } return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (!started()) {
    if ([' ', 'Enter', 'ArrowRight', 'PageDown', 'ArrowDown', 'F5'].includes(k)) { e.preventDefault(); startDeck(); }
    return;
  }
  if (!$('#settings').hidden || !$('#help').hidden) { if (k === 'Escape') panel('settings', false); return; }
  if (/^[0-9]$/.test(k)) { numBuf += k; clearTimeout(numT); numT = setTimeout(() => { numBuf = ''; }, 1500); return; }
  switch (k) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'n': case 'N':
      e.preventDefault(); if (ovOn) return; next(); break;
    case 'Enter':
      e.preventDefault();
      if (numBuf) { go(clamp(+numBuf - 1, 0, N - 1), 0); numBuf = ''; }
      else if (ovOn) overview(false); else next();
      break;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': case 'p': case 'P':
      e.preventDefault(); prev(); break;
    case 'Home': e.preventDefault(); go(0, 0, -1); break;
    case 'End': e.preventDefault(); go(N - 1, 0, 1); break;
    case 'f': case 'F': case 'F5': e.preventDefault(); fullscreen(); break;
    case 'o': case 'O': case 'Escape': if (k !== 'Escape' || ovOn) overview(!ovOn); break;
    case 'b': case 'B': case '.': $('#blank').classList.remove('white'); $('#blank').classList.toggle('on'); break;
    case 'w': case 'W': $('#blank').classList.add('white'); $('#blank').classList.toggle('on'); break;
    case 'e': case 'E': case 's': case 'S': panel('settings'); break;
    case 'r': case 'R': presenter.open(); break;
    case '?': case 'h': case 'H': panel('help'); break;
    case 'l': case 'L': setLite(!lite()); break;
    default:
  }
});

const isUI = (t) => t.closest('a,button,input,textarea,select,label,.sphere,.panel-ui,#hud');
stage.addEventListener('click', (e) => {
  if (ovOn || !started() || isUI(e.target)) return;
  if ($('#blank').classList.contains('on')) { $('#blank').classList.remove('on'); return; }
  next();
});
stage.addEventListener('contextmenu', (e) => { if (ovOn) return; e.preventDefault(); prev(); });
let wheelAcc = 0, wheelT = 0;
addEventListener('wheel', (e) => {
  if (!started() || ovOn || e.target.closest('.panel-ui,.sphere')) return;
  wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) > 70 && performance.now() - wheelT > 650) { wheelT = performance.now(); wheelAcc > 0 ? next() : prev(); wheelAcc = 0; }
}, { passive: true });
let touch = null;
addEventListener('touchstart', (e) => { touch = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
addEventListener('touchend', (e) => {
  if (!touch || !started()) return;
  const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1];
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
  touch = null;
});
$('#hud').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'overview') overview(!ovOn);
  if (a === 'settings') panel('settings');
  if (a === 'presenter') presenter.open();
  if (a === 'fullscreen') fullscreen();
});
$$('.panel-ui .x').forEach((b) => b.addEventListener('click', () => { b.closest('.panel-ui').hidden = true; }));

/* ------------------------------------------------------------------------
   Einstellungen
   ------------------------------------------------------------------------ */
const IMG_LABELS = {
  'uebergabe-nacht': 'Trikotübergabe (Flutlicht)', 'uebergabe-tor': 'Trikotübergabe (am Tor)', mannschaft: 'Mannschaftsfoto', 'vortrag-vereinsheim': 'Vorstellung im Vereinsheim',
  'held-fussball': 'Anzeige Sport', 'held-chor': 'Anzeige Chor', 'chor-probe': 'Chorprobe', 'uebergabe-chor': 'Übergabe Chor', 'koeln-ausblick': 'Kanzlei / Ausblick',
  'vortrag-chor': 'Vorstellung beim Chor', 'berater-buero': 'Berater im Büro', kundin: 'Zufriedene Kundin', paket: 'Lieferung (Chat)',
};
function fillSettings() {
  $$('[data-set]').forEach((i) => { i.value = S[i.dataset.set] ?? ''; });
  const box = $('.set-imgs');
  box.innerHTML = '';
  Object.keys(IMG_LABELS).forEach((k) => {
    const d = h('div', 'si', `<img src="${imgSrc(k)}" alt=""><span>${IMG_LABELS[k]}${custom[k] ? ' · eigenes Foto' : ''}</span><label>Foto wählen …<input type="file" accept="image/*"></label>${custom[k] ? '<button type="button">zurücksetzen</button>' : ''}`, box);
    $('input', d).addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      await idb.tx('readwrite', (st) => st.put(f, k));
      if (custom[k]) URL.revokeObjectURL(custom[k]);
      custom[k] = URL.createObjectURL(f);
      applySettings(); fillSettings();
    });
    const rb = $('button', d);
    if (rb) rb.addEventListener('click', async () => { await idb.tx('readwrite', (st) => st.delete(k)); URL.revokeObjectURL(custom[k]); delete custom[k]; applySettings(); fillSettings(); });
  });
}
$$('[data-set]').forEach((i) => i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => {
  S[i.dataset.set] = i.value;
  store.set('settings', S);
  clearTimeout(i._t);
  i._t = setTimeout(() => { applySettings(); hooks.schritte.rebuild(); hooks.verein.loadAnswers(); if (slides[cur]) setStep(slides[cur], step, 0, true); }, 250);
}));
$('[data-act="reset-answers"]').addEventListener('click', () => { store.set('answers.' + (S.vereinName || '_'), {}); hooks.verein.loadAnswers(); });
$('[data-act="reset-all"]').addEventListener('click', async () => {
  S = Object.assign({}, DEFAULTS); store.set('settings', S);
  for (const k of Object.keys(custom)) { await idb.tx('readwrite', (st) => st.delete(k)); URL.revokeObjectURL(custom[k]); delete custom[k]; }
  applySettings(); hooks.schritte.rebuild(); fillSettings();
});

/* ------------------------------------------------------------------------
   Referentenansicht (zweites Fenster mit Notizen & Timer)
   ------------------------------------------------------------------------ */
const NOTES = {
  titel: 'Begrüßung und kurze Vorstellung. Ziel des Termins: Sponsoring vorstellen, euren Verein kennenlernen, nächste Schritte vereinbaren.',
  agenda: 'Ablauf in vier Teilen: erst wir, dann ihr, dann unser Konzept, dann die nächsten Schritte.',
  swisslife: 'Finanzkraft und Erfahrung der Swiss Life-Gruppe: gegründet 1857, Hauptsitz Zürich, 10 Mrd. CHF Eigenkapital, 250 Mrd. CHF verwaltetes Vermögen, 4 Mio. Kundinnen und Kunden, einer der größten Immobilienbesitzer der Schweiz.\nKlick: Länderkarte – Swiss Life in Europa.',
  premium: 'Swiss Life Select in Deutschland: über 35 Jahre Erfahrung, 1,6 Millionen Kunden, über 300 Standorte. Persönliche Best-Select-Beratung, Partner in allen Finanzfragen.',
  vergleich: 'Frage in die Runde: Wo holt ihr euch heute Finanzrat?\nInstitute (Banken/Versicherer): persönlich, aber begrenzte Produktpalette.\nVergleichsportale: große Auswahl, aber keine persönliche Beratung und Betreuung.\nKlick 1: Nachteile. Klick 2: Swiss Life Select verbindet das Beste aus beiden Welten.',
  finanzierung: 'Finanzierungen: Wir vergleichen die Angebote vieler Banken und Förderinstitute (z. B. KfW, NRW.BANK). Optional Erklärvideo.',
  bestselect: 'Best-Select-System: rund 90 Produktpartner, ein Ansprechpartner. Die Kugel lässt sich mit der Maus drehen.',
  hub: 'Alles aus einer Hand: Finanzen & Versicherung, Sponsoring, Expats-Beratung, Kooperation mit dbb beamtenbund und tarifunion, Immobilien Einkommen, Finanzierungen über Interhyp, Firmenberatung, Investment.',
  verein: 'Jetzt seid ihr dran: Fragen nacheinander stellen – jeder Klick blendet die nächste Frage ein. Antworten können direkt ins Feld getippt werden (werden lokal gespeichert).',
  konzept: 'Unser Sponsoringkonzept: 1.000 € Ausstattung über 11teamsports, Gegenleistung: mindestens 4 Tester, persönliche Übergabe vor Ort.',
  ausstattung: '1.000 € über 11teamsports: Der Verein sucht aus (Trikots, Taschen, Trainingsanzüge …).\nKlick: Logos werden „aufgedruckt“.',
  tester: 'Mindestens 4 Tester: Alter 18–35, sollten Vollzeit arbeiten.\nKlick 1: So sieht die Analyse aus (Altersvorsorge).\nKlick 2: Beispielhafter Vorteil – im Schnitt 5.000 € in fünf Jahren.\nKlick 3: Niemand muss Kunde werden!',
  besuch: 'Übergabe vor Ort: Wir kommen mit den Artikeln ins Vereinsheim und stellen uns allen vor – mit Fotos für eure Kanäle.',
  kanzlei: 'Alternativ: Termin in unserer Kanzlei über Köln.',
  kommunikation: 'Eine gemeinsame WhatsApp-Gruppe: Bestellstatus, Termine, Übergabe – alles transparent für alle.',
  schritte: () => `Die fünf Schritte – jeder Klick zeigt den nächsten:\n1. Ihr stimmt euch ab.\n2. Wir kommen ${words().meet} vorbei.\n3. Mindestens 4 Tester testen uns.\n4. Wir bestellen eure Ware.\n5. Wir stellen uns ${words().teamAll} vor.`,
  finale: 'Abschlussfrage stellen – und bewusst eine Pause lassen.\nKlick: Konfetti und „Wir freuen uns auf euch!“',
};
const presenter = (() => {
  let win = null, t0 = 0, iv = 0;
  const css = `body{margin:0;font:16px/1.45 'Source Sans 3','Segoe UI',Arial,sans-serif;background:#141518;color:#eee;display:grid;grid-template-rows:auto 1fr auto;height:100vh}
  header{display:flex;align-items:center;gap:20px;padding:16px 24px;background:#1d1e22}
  header b{font-size:30px;font-variant-numeric:tabular-nums}#clock{margin-left:auto;font-size:20px;opacity:.7}#timer{font-size:30px;font-weight:700;color:#ff5a6e;font-variant-numeric:tabular-nums}
  button{border:0;border-radius:10px;padding:10px 16px;background:#2c2d33;color:#fff;font:600 15px inherit;cursor:pointer}button:hover{background:#D82034}
  main{display:grid;grid-template-columns:1.3fr 1fr;gap:24px;padding:24px;overflow:auto}
  .now{font:600 34px/1.2 Georgia,serif;margin:0 0 8px}.stp{color:#ff8a98;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:13px}
  .notes{font-size:24px;line-height:1.5;white-space:pre-wrap;margin-top:18px}.next{background:#1d1e22;border-radius:14px;padding:18px}.next small{display:block;opacity:.6;text-transform:uppercase;letter-spacing:.12em;font-size:12px;margin-bottom:6px}.next div{font:600 22px Georgia,serif}
  footer{display:flex;gap:10px;padding:14px 24px;background:#1d1e22}`;
  function tick() {
    if (!win || win.closed) { clearInterval(iv); return; }
    const s = Math.floor((Date.now() - t0) / 1000);
    const d = win.document;
    d.getElementById('timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    d.getElementById('clock').textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return {
    open() {
      if (win && !win.closed) { win.focus(); return; }
      win = open('', 'sls-referent', 'width=1100,height=720');
      if (!win) { alert('Bitte Pop-ups für diese Datei erlauben, um die Referentenansicht zu öffnen.'); return; }
      const d = win.document;
      d.open();
      d.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Referentenansicht</title><style>${css}</style></head><body><header><b id="num"></b><span id="timer">00:00</span><button id="reset">Timer neu</button><span id="clock"></span></header><main><section><div class="stp" id="stp"></div><h1 class="now" id="now"></h1><div class="notes" id="notes"></div></section><aside><div class="next"><small>Als Nächstes</small><div id="nx"></div></div></aside></main><footer><button id="b-prev">← Zurück</button><button id="b-next">Weiter →</button><button id="b-ov">Übersicht</button><button id="b-black">Schwarz</button></footer></body></html>`);
      d.close();
      t0 = Date.now();
      d.getElementById('reset').onclick = () => { t0 = Date.now(); };
      d.getElementById('b-prev').onclick = () => prev();
      d.getElementById('b-next').onclick = () => next();
      d.getElementById('b-ov').onclick = () => overview(!ovOn);
      d.getElementById('b-black').onclick = () => $('#blank').classList.toggle('on');
      d.addEventListener('keydown', (e) => {
        if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); next(); }
        if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); prev(); }
      });
      clearInterval(iv); iv = setInterval(tick, 500); tick();
      this.update();
    },
    update() {
      if (!win || win.closed || cur < 0) return;
      const d = win.document, s = slides[cur], n = stepsOf(cur);
      d.getElementById('num').textContent = `${cur + 1} / ${N}`;
      d.getElementById('now').textContent = s.dataset.title;
      d.getElementById('stp').textContent = n > 1 ? `Schritt ${step + 1} von ${n}` : '';
      const note = typeof NOTES[s.id] === 'function' ? NOTES[s.id]() : NOTES[s.id] || '';
      d.getElementById('notes').textContent = note.replace('über Köln', 'über ' + val('ort'));
      const nx = step < n - 1 ? `${s.dataset.title} – Schritt ${step + 2}` : cur < N - 1 ? slides[cur + 1].dataset.title : 'Ende';
      d.getElementById('nx').textContent = nx;
    },
  };
})();

/* ------------------------------------------------------------------------
   Start
   ------------------------------------------------------------------------ */
document.documentElement.style.setProperty('--person', `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="15" r="9"/><path d="M6 46c0-10 8-17 18-17s18 7 18 17z"/></svg>')}")`);
logoSVG($('.st-logo'), { vb: 'full' });

window.__deck = { next, prev, go, overview: () => overview(!ovOn), get cur() { return cur; }, get step() { return step; }, N, show, setStep, slides };

(async function init() {
  applySettings();
  try { await document.fonts.ready; } catch { /* egal */ }
  $$('.split').forEach(splitText);
  loadCustomImages();
  // Standortpunkte vorab berechnen (sonst stockt die Deutschlandkarte beim ersten Öffnen)
  setTimeout(() => hooks.premium.prebuild(), 300);
  // alle Fotos vorab dekodieren, damit der erste Folienwechsel nicht hakt
  $$('img').forEach((im) => { if (im.decode) im.decode().catch(() => {}); });
  const m = /^#(\d+)(?:\.(\d+))?/.exec(location.hash);
  if (m) {
    $('#start').classList.add('gone');
    show(clamp(+m[1] - 1, 0, N - 1), m[2] ? +m[2] - 1 : 0, { dir: 1, instant: true });
  } else {
    cur = -1;
  }
})();
})();
