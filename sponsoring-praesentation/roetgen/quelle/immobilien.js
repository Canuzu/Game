/* Immobilien: Logo · Traum vom Eigenheim · Haus und Wohnen (vorher → nachher, 2 Klicks) */
CUSTOM_PAGES.imo1 = { title: 'Immobilien Einkommen', html: () => `<div class="cp cp-imo1">
    <i class="im-glow"></i><i class="im-grid"></i>
    <div class="im-logo"><img src="${FK_IMG.imo_logo}" alt="Immobilien Einkommen"><i class="im-sweep" style="--m:url(${FK_IMG.imo_logo})"></i></div>
    <i class="im-line"></i></div>` };
CUSTOM_PAGES.imo2 = { title: 'Traum vom Eigenheim', html: () => {
  const T = [['c1', 80, 196, 560, 410], ['c2', 660, 196, 1180, 410], ['c3', 80, 626, 676, 410], ['c4', 776, 626, 450, 410], ['c5', 1246, 626, 594, 410]];
  return `<div class="cp cp-imo2"><h3 class="im2-h">${'Traum vom Eigenheim'.split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ')}</h3>
    ${T.map(([k, x, y, w, hh], i) => `<div class="im2-t" style="left:${x}px;top:${y}px;width:${w}px;height:${hh}px;--i:${i}"><img src="${FK_IMG['imo_' + k]}" alt=""></div>`).join('')}</div>`;
} };
CUSTOM_PAGES.hw = { title: 'Haus und Wohnen', n: 2, html: () => {
  const R = [
    { p: 'Eigenheim', i: 'house', v: 'Kauf mit Hausbank · z. B. 4,2 % Zins', n: 'Kauf mit Marktvergleich · z. B. 3,7 % Zins' },
    { p: 'Kapitalanlage-Immobilie', i: 'key', v: '800.000 € Miete zahlen', n: '800.000 € Miete kassieren' },
  ];
  return `<div class="cp cp-hw">
    <div class="hw-head"><span class="hw-k">Haus und Wohnen</span><span class="hw-vn"><b class="hw-v">Vorher</b><i>→</i><b class="hw-n">Nachher</b></span></div>
    <div class="hw-rows">${R.map((r, i) => `<div class="hw-r" style="--i:${i}"><i class="hw-ico">${ico(r.i)}</i><b class="hw-p">${r.p}</b>
      <span class="hw-old"><span>${r.v}</span></span><svg class="hw-a" viewBox="0 0 60 24"><path d="M2 12h52M44 3l10 9-10 9"/></svg>
      <span class="hw-new">${ico('check')}<span>${r.n}</span></span></div>`).join('')}</div>
    <div class="hw-save"><span>Ergebnis</span><b class="hw-big">+875.000 €</b><small>75.000 € weniger Zinszahlung<br>+ 800.000 € Mieteinnahmen</small></div></div>`;
}, step(cp, sub, anim) {
  cp.classList.toggle('st1', sub >= 1);
  const big = $('.hw-big', cp);
  if (!(anim && sub >= 1)) { big.textContent = '+875.000 €'; return; }
  sfx('swoosh', { vol: 0.5 }); sfx('pop', { delay: 450, vol: 0.45 }); sfx('pop', { delay: 750, vol: 0.45 });
  const t0 = performance.now() + 900, to = 875000;
  const run = (now) => {
    const e = clamp((now - t0) / 1500, 0, 1), v = Math.round(to * (1 - Math.pow(2, -10 * e)) / 1000) * 1000;
    big.textContent = '+' + (e >= 1 ? to : v).toLocaleString('de-DE') + ' €';
    if (e < 1 && big.isConnected) requestAnimationFrame(run); else if (e >= 1) sfx('kaching');
  };
  requestAnimationFrame(run);
} };
