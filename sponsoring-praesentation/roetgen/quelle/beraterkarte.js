/* ==========================================================================
   Beraterkarte + vier Bereiche
   Swiss-Life-Select-Karte mit zwei Beratern in der Mitte, vier Reiter drumherum.
   Ein Reiter klappt zu einem großen Fenster auf und zeigt seine Folien nacheinander;
   nach der letzten Folie klappt er zu und gilt als erledigt.
   Schritte: 0 Walkout · je Bereich: eine Stufe pro Folie, dann »schließen« · letzte Stufe = Finale
   ========================================================================== */
const AREA_DEFAULTS = [
  { t: 'Swiss Life Select', sub: 'Wer wir sind · persönliche Best-Select-Beratung', c: '#D82034', i: 'sls' },
  { t: 'Immobilien', sub: 'Eigenheim, Finanzierung & Kapitalanlage', c: '#0891B2', i: 'house' },
  { t: 'Finanzkommissar', sub: 'Der Finanz-Check für eure Mitglieder', c: '#7C3AED', i: 'search' },
  { t: '11TeamSports', sub: 'Ausstattung für euren Verein', c: '#EA580C', i: 'present' },
];
const AREA_ICONS = ['sls', 'house', 'search', 'present', 'ball', 'shield', 'building', 'key', 'chart', 'team', 'heart', 'star', 'trophy', 'coins', 'euro', 'doc', 'advisor', 'people', 'umbrella', 'palm'];
const areas = () => AREA_DEFAULTS.map((d, k) => {
  const a = Object.assign({}, d, (S.bereiche && S.bereiche[k]) || {});
  a.slides = Array.isArray(a.slides) ? a.slides.filter((id) => custom['fol_' + id]) : [];
  a.m = Math.max(1, a.slides.length); // ohne eigene Folien: ein Platzhalter
  return a;
});
const areaIcon = (a, cls = 'ico') => (a.i === 'sls' ? `<svg class="${cls} sls-rb" viewBox="124 42 212 210"><path fill-rule="evenodd" d="${D.logo.red}"/></svg>` : ico(a.i, cls));
const SILHOUETTE = '<svg viewBox="0 0 300 300" class="bc-sil"><circle cx="150" cy="112" r="62"/><path d="M34 300c8-78 56-120 116-120s108 42 116 120z"/></svg>';

hooks.profil = (() => {
  const s = $('#profil'), tilesBox = $('.pf-tiles', s), links = $('.pf-links', s), cardBox = $('.pf-card', s), pp = $('.pp', s);
  const cf = confetti($('.pf-cv', s));
  const W2 = 450, H2 = 190, P = { x: 580, y: 168, w: 1280, h: 838 };
  const TILE = [[110, 330], [110, 630], [1360, 330], [1360, 630]];
  const CARD = { cx: 960, cy: 588, w: 560, h: 620 };
  let A = [], tiles = [], seq = [], at = -1, timers = [], animUntil = 0;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const stopAll = () => {
    timers.forEach(clearTimeout); timers = []; animUntil = 0;
    pp.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  };
  const rgba = (hex, a) => { const n = parseInt((hex || '#D82034').slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  /* ---------- Ablauf ---------- */
  function buildSeq() {
    seq = [{ open: -1, slide: 0, done: 0, fin: false }];
    A.forEach((a, k) => {
      for (let j = 0; j < a.m; j++) seq.push({ open: k, slide: j, done: k, fin: false });
      seq.push({ open: -1, slide: 0, done: k + 1, fin: k === A.length - 1 });
    });
    s.dataset.steps = seq.length;
  }
  const stateOf = (n) => seq[clamp(n, 0, seq.length - 1)];

  /* ---------- Aufbau ---------- */
  function person(n) {
    const name = (S['b' + n + 'Name'] || '').trim() || `Berater ${n}`, rolle = (S['b' + n + 'Rolle'] || '').trim(), info = (S['b' + n + 'Info'] || '').trim();
    const photo = custom['berater' + n] ? `<img src="${custom['berater' + n]}" alt="">` : SILHOUETTE;
    return `<div class="bc-p bc-p${n}"><div class="bc-ph">${photo}</div><b class="bc-n">${esc(name)}</b>
      ${rolle ? `<span class="bc-r">${esc(rolle)}</span>` : ''}${info ? `<span class="bc-i">${esc(info).replace(/\n/g, '<br>')}</span>` : ''}</div>`;
  }
  function buildCard() {
    cardBox.innerHTML = `<div class="bc">
      <div class="bc-band"><svg class="bc-logo" viewBox="12 40 436 380"></svg><i class="bc-stripes"></i></div>
      <div class="bc-team">${person(1)}<i class="bc-and">&amp;</i>${person(2)}</div>
      <div class="bc-foot"><div class="bc-dots">${A.map((a, k) => `<i style="--ac:${a.c}" data-k="${k}">${areaIcon(a)}</i>`).join('')}</div>
        <span class="bc-f">${esc((S.bcFuss || '').trim())}</span></div>
      <i class="bc-shine"></i></div>`;
    logoSVG($('.bc-logo', cardBox), { white: 'all', vb: 'full' });
  }
  function buildTiles() {
    tilesBox.innerHTML = ''; let d = '';
    tiles = A.map((a, k) => {
      const [x, y] = TILE[k], right = k >= 2;
      const e = h('div', 'pf-tile' + (right ? ' r' : ''), `<i class="pt-ico">${areaIcon(a)}</i><span class="pt-n">${String(k + 1).padStart(2, '0')}</span>
        <b class="pt-t">${esc(a.t)}</b><span class="pt-sub">${esc(a.sub || '')}</span><i class="pt-ok">${ico('check')}</i>`, tilesBox);
      e.style.cssText = `left:${x}px;top:${y}px;--ac:${a.c};--ac-t:${rgba(a.c, 0.1)};--i:${k}`;
      const sx = right ? x : x + W2, sy = y + H2 / 2, ex = right ? CARD.cx + CARD.w / 2 - 8 : CARD.cx - CARD.w / 2 + 8, ey = CARD.cy - 110 + (k % 2) * 220;
      const mx = (sx + ex) / 2;
      d += `<path d="M${sx} ${sy}C${mx} ${sy} ${mx} ${ey} ${ex} ${ey}" stroke="${a.c}" style="--i:${k}"/><circle cx="${ex}" cy="${ey}" r="7" fill="${a.c}" style="--i:${k}"/>`;
      return e;
    });
    links.innerHTML = d;
  }
  function build() {
    A = areas(); stopAll();
    buildSeq(); buildCard(); buildTiles();
    $('.pf-head .kicker', s).textContent = (S.pfKicker || '').trim();
    $('.pf-head .hl', s).textContent = (S.pfTitel || '').trim() || 'Euer Team von Swiss Life Select';
    const w1 = $('.wk-1', s); w1.innerHTML = '<svg class="wk-logo" viewBox="12 40 436 380"></svg>'; logoSVG($('svg', w1), { vb: 'full' });
    $('.wk-2', s).innerHTML = '<div class="wk-big">×</div>';
    $('.wk-3', s).innerHTML = `<div class="wk-crest">${crestSVG()}</div>`;
    $('.pf-total', s).innerHTML = `<span class="tot-l">Alles aus einer Hand</span>
      <div class="tot-chips">${A.map((a) => `<span style="--ac:${a.c}">${areaIcon(a)}${esc(a.t)}</span>`).join('')}</div>`;
    if (at >= 0) apply(Math.min(at, seq.length - 1));
  }

  /* ---------- Fenster mit Folien ---------- */
  function slideHTML(a, k, j) {
    const id = a.slides[j];
    if (id) return `<div class="ps-slide"><img src="${custom['fol_' + id]}" alt=""></div>`;
    return `<div class="ps-slide ps-ph"><div><i class="ps-ph-ico">${areaIcon(a)}</i><b>${esc(a.t)}</b>
      <span>Folie ${j + 1} · Inhalt folgt</span><small>Folien hinzufügen: Einstellungen <kbd>E</kbd> → „Die vier Reiter“</small></div></div>`;
  }
  function panelHTML(a, k, j) {
    return `<div class="pp-in ps-in" style="--ac:${a.c};--ac-t:${rgba(a.c, 0.1)}">
      <div class="pp-head"><span class="pp-n">${String(k + 1).padStart(2, '0')}</span><i class="pp-ico">${areaIcon(a)}</i><b>${esc(a.t)}</b>
        <span class="ps-count"${a.m > 1 ? '' : ' hidden'}><b>${j + 1}</b> / ${a.m}</span></div>
      <div class="ps-stage">${slideHTML(a, k, j)}</div>
      <div class="ps-dots"${a.m > 1 ? '' : ' hidden'}>${Array.from({ length: a.m }, (_, i) => `<i class="${i === j ? 'on' : ''}"></i>`).join('')}</div></div>`;
  }
  const tileRect = (k) => ({ left: TILE[k][0] + 'px', top: TILE[k][1] + 'px', width: W2 + 'px', height: H2 + 'px', borderRadius: '22px' });
  const fullRect = { left: P.x + 'px', top: P.y + 'px', width: P.w + 'px', height: P.h + 'px', borderRadius: '30px' };
  function showPanel(k, j, anim) {
    const a = A[k];
    pp.innerHTML = panelHTML(a, k, j); pp.style.setProperty('--ac', a.c);
    pp.classList.remove('show'); pp.style.display = 'block'; Object.assign(pp.style, fullRect);
    if (!anim) { pp.classList.add('show'); return; }
    pp.animate([tileRect(k), fullRect], { duration: 640, easing: 'cubic-bezier(.65,0,.35,1)' });
    sfx('whoosh');
    later(() => pp.classList.add('show'), 480);
  }
  function switchSlide(k, j) { // nächste Folie fährt von rechts herein, die alte kippt nach links weg
    const a = A[k], st = $('.ps-stage', pp), old = $('.ps-slide', st);
    st.insertAdjacentHTML('beforeend', slideHTML(a, k, j));
    const nu = st.lastElementChild;
    $('.ps-count b', pp).textContent = j + 1;
    $$('.ps-dots i', pp).forEach((d, i) => d.classList.toggle('on', i === j));
    sfx('swoosh', { vol: 0.6 });
    const ez = 'cubic-bezier(.65,0,.35,1)';
    if (old) { const o = old.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(-90px) rotateY(16deg) scale(.94)', opacity: 0 }], { duration: 560, easing: ez, fill: 'forwards' }); o.onfinish = () => old.remove(); }
    nu.animate([{ transform: 'translateX(140px) rotateY(-18deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 90, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  }
  function hidePanel(k, anim, then) {
    if (pp.style.display !== 'block') { then && then(); return; }
    pp.classList.remove('show');
    if (!anim) { pp.style.display = 'none'; then && then(); return; }
    const an = pp.animate([fullRect, tileRect(k)], { duration: 540, delay: 120, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
    sfx('swoosh');
    an.onfinish = () => { pp.style.display = 'none'; an.cancel(); then && then(); };
  }

  /* ---------- Zustände ---------- */
  function markDone(done) {
    tiles.forEach((e, k) => { e.classList.toggle('done', k < done); e.classList.remove('pop'); });
    $$('path,circle', links).forEach((p, i) => p.classList.toggle('done', Math.floor(i / 2) < done));
    $$('.bc-dots i', cardBox).forEach((d, k) => d.classList.toggle('on', k < done));
  }
  function apply(n) { // Zustand ohne Animation herstellen
    stopAll();
    const st = stateOf(n);
    s.classList.add('pf-instant');
    s.classList.toggle('open', st.open >= 0); s.classList.toggle('fin', st.fin);
    markDone(st.done);
    $$('.bc-dots i', cardBox).forEach((d, k) => d.classList.toggle('cur', k === st.open));
    if (st.open >= 0) showPanel(st.open, st.slide, false); else { pp.style.display = 'none'; pp.innerHTML = ''; }
    void s.offsetWidth; s.classList.remove('pf-instant');
    at = n;
  }
  function animateTo(n) {
    const st = stateOf(n), prev = stateOf(at);
    at = n;
    if (st.open >= 0 && prev.open === st.open) { animUntil = performance.now() + 450; switchSlide(st.open, st.slide); return; }
    if (st.open >= 0) { // Bereich aufklappen
      animUntil = performance.now() + 900;
      s.classList.add('open');
      $$('.bc-dots i', cardBox).forEach((d, k) => d.classList.toggle('cur', k === st.open));
      showPanel(st.open, st.slide, true);
      return;
    }
    const k = prev.open; // Bereich schließen → Reiter erledigt
    animUntil = performance.now() + (st.fin ? 2600 : 1400);
    hidePanel(k, true, () => {
      s.classList.remove('open');
      $$('.bc-dots i', cardBox).forEach((d) => d.classList.remove('cur'));
      later(() => {
        const tile = tiles[k]; tile.classList.add('done', 'pop'); sfx('kaching', { vol: 0.6 });
        $$('path,circle', links).forEach((p, i) => { if (Math.floor(i / 2) === k) p.classList.add('done'); });
        const dot = $$('.bc-dots i', cardBox)[k]; if (dot) { dot.classList.add('on'); dot.animate([{ transform: 'scale(1.6)' }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
        cf.burst({ x: TILE[k][0] + W2 / 2, y: TILE[k][1] + H2 / 2, n: 30, power: 420, life: 1.2 });
      }, 380);
      if (st.fin) later(finale, 1500);
    });
  }
  function finale() {
    s.classList.add('fin');
    const c = $('.bc', cardBox);
    if (c) c.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(180deg)', filter: 'brightness(1.4)' }, { transform: 'rotateY(360deg)' }], { duration: 1000, easing: 'cubic-bezier(.6,0,.3,1)' });
    sfx('impact'); sfx('win', { delay: 300 });
    later(() => { cf.burst({ x: CARD.cx, y: CARD.cy - 60, n: 220, power: 1300 }); cf.rain(120); }, 450);
  }

  /* ---------- Walkout beim Betreten ---------- */
  function walkout() {
    stopAll();
    s.classList.remove('ready'); void s.offsetWidth; s.classList.add('wk');
    sfx('riser'); [500, 1450, 2400].forEach((d) => sfx('pop', { delay: d + 120 }));
    sfx('whoosh', { delay: 3200 }); sfx('impact', { delay: 3900 });
    later(() => { cf.firework(CARD.cx, CARD.cy - 120, '#E7B65C'); cf.burst({ x: CARD.cx, y: CARD.cy, n: 90, power: 900, life: 2 }); }, 3950);
    later(finishWalkout, 5600);
  }
  function finishWalkout() { s.classList.remove('wk'); s.classList.add('ready'); }

  /* ---------- Einstellungen: vier Bereiche mit Folien ---------- */
  let saveT = 0;
  const setArea = (k, patch) => { S.bereiche = (S.bereiche || []).slice(); S.bereiche[k] = Object.assign({}, S.bereiche[k] || {}, patch); saveS(); };
  const ownSlides = (k) => ((S.bereiche && S.bereiche[k] && S.bereiche[k].slides) || []).filter((id) => custom['fol_' + id]);
  async function addSlides(k, files) {
    const ids = ownSlides(k);
    for (const f of files) {
      if (!/^image\//.test(f.type)) { toast('Bitte Folien als Bild (PNG oder JPG) wählen'); continue; }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await idb.put('fol_' + id, f); custom['fol_' + id] = URL.createObjectURL(f); ids.push(id);
    }
    setArea(k, { slides: ids }); build(); settings(lastBox, k);
  }
  async function dropSlide(k, id) {
    const key = 'fol_' + id;
    if (FILE && FILE.images && FILE.images[key]) await idb.put(key, null); else await idb.del(key);
    if (custom[key]) URL.revokeObjectURL(custom[key]); delete custom[key];
    setArea(k, { slides: ownSlides(k).filter((x) => x !== id) }); build(); settings(lastBox, k);
  }
  function moveSlide(k, i, d) {
    const ids = ownSlides(k), j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]]; setArea(k, { slides: ids }); build(); settings(lastBox, k);
  }
  let lastBox = null;
  function settings(box, openK = -1) {
    if (!box) return; lastBox = box;
    box.innerHTML = A.map((a, k) => `<details class="set-area" style="--ac:${a.c}"${k === openK ? ' open' : ''}><summary><i></i>${k + 1} · ${esc(a.t)}</summary>
      <div class="set-row"><label>Name des Reiters<input data-k="t" value="${esc(a.t)}"></label><label>Farbe<input type="color" data-k="c" value="${esc(a.c)}"></label></div>
      <div class="set-row"><label>Zeile darunter<input data-k="sub" value="${esc(a.sub || '')}"></label>
        <label>Symbol<select data-k="i">${AREA_ICONS.map((x) => `<option value="${x}"${x === a.i ? ' selected' : ''}>${x === 'sls' ? 'Swiss-Life-Band' : x}</option>`).join('')}</select></label></div>
      <p class="set-note">Folien (als Bild, PNG oder JPG – mehrere auf einmal möglich). Ohne Folien zeigt der Reiter einen Platzhalter.</p>
      <div class="set-slides">${a.slides.map((id, i) => `<div class="ss" data-id="${id}"><img src="${custom['fol_' + id]}" alt=""><span>${i + 1}</span>
        <button type="button" data-mv="-1" title="nach vorne">‹</button><button type="button" data-mv="1" title="nach hinten">›</button><button type="button" data-del title="entfernen">×</button></div>`).join('')}
        <label class="ss-add">+ Folien hinzufügen<input type="file" accept="image/*" multiple></label></div></details>`).join('');
    $$('details', box).forEach((d, k) => {
      $$('[data-k]', d).forEach((i) => i.addEventListener(i.tagName === 'SELECT' || i.type === 'color' ? 'change' : 'input', () => {
        setArea(k, { [i.dataset.k]: i.value }); clearTimeout(saveT); saveT = setTimeout(build, 250);
        if (i.dataset.k === 't') $('summary', d).lastChild.textContent = `${k + 1} · ${i.value}`;
        if (i.dataset.k === 'c') d.style.setProperty('--ac', i.value);
      }));
      $('.ss-add input', d).addEventListener('change', (e) => { addSlides(k, [...e.target.files]); e.target.value = ''; });
      $$('.ss', d).forEach((el, i) => {
        $('[data-del]', el).addEventListener('click', () => dropSlide(k, el.dataset.id));
        $$('[data-mv]', el).forEach((b) => b.addEventListener('click', () => moveSlide(k, i, +b.dataset.mv)));
      });
      const zone = $('.set-slides', d);
      ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drop'); }));
      ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove('drop')));
      zone.addEventListener('drop', (e) => { e.preventDefault(); addSlides(k, [...e.dataTransfer.files]); });
    });
  }
  $('[data-act="reset-profil"]').addEventListener('click', () => {
    if (!confirm('Namen, Farben und Symbole der vier Reiter auf den Standard zurücksetzen? (Eingefügte Folien bleiben erhalten.)')) return;
    S.bereiche = A.map((a) => ({ slides: a.slides })); saveS(); build(); fillSettings();
  });

  return {
    build, settings,
    enter() { at = -1; stopAll(); cf.clear(); s.classList.remove('open', 'fin', 'wk', 'ready'); pp.style.display = 'none'; },
    step(_, n, dir, silent) {
      const fresh = at < 0;
      if (s.classList.contains('wk') && n > 0) { stopAll(); finishWalkout(); }
      if (fresh && n === 0 && !silent && !reduce) { apply(0); s.classList.remove('ready'); walkout(); return; }
      if (!s.classList.contains('wk')) s.classList.add('ready');
      const racing = performance.now() < animUntil; // Klick während einer laufenden Animation → sofort in den Zielzustand
      if (silent || fresh || dir < 0 || n !== at + 1 || reduce || racing) apply(n); else animateTo(n);
    },
    leave() { stopAll(); cf.clear(); at = -1; s.classList.remove('open', 'fin', 'wk', 'ready'); pp.style.display = 'none'; },
    final() { s.classList.remove('wk'); s.classList.add('ready'); apply(seq.length - 1); },
  };
})();

