/* ==========================================================================
   Fest eingebaute Folien (nach »FinanzKommissar – Kurzvorstellung Sportsponsoring«)
   Jede Funktion liefert eine 1920×1080-Folie; die Animationen starten beim Einblenden.
   ========================================================================== */
const FK_NAVY = '#092D3E', FK_LINE = '#1B7FA6';
const CUSTOM_PAGES = {
  fk1: { title: 'FinanzKommissar · Kurz vorgestellt', html: () => `<div class="cp cp-fk1">
      <i class="fk-glow"></i><i class="fk-rays"></i>
      <div class="fk-kick">${'KURZ VORGESTELLT'.split('').map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
      <img class="fk-logo" src="${FK_IMG.s1_Grafik_6}" alt="FinanzKommissar">
      <i class="fk-sweep" style="--fkmask:url(${FK_IMG.s1_Grafik_6})"></i>
      <p class="fk-sub">${'Ein spezialisiertes Netzwerk rund um die Zielgruppe Polizei.'.split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ')}</p>
      <i class="fk-bar"></i></div>` },
  fk2: { title: 'FinanzKommissar · Netzwerk', html: () => {
    const P = [ // Partner ohne Swiss Life Select und 11teamsports
      { img: 'dbb_vorsorgewerk', t: 'Netzwerkpartner des dbb', x: 330, y: 470, w: 380, a: [700, 520], b: [540, 478] },
      { img: 'DPolG', t: 'gewerkschaftliches Netzwerk', x: 330, y: 720, w: 360, a: [705, 640], b: [540, 712] },
      { img: 'PVD_Now', t: 'Nachhilfe im Studium', x: 1590, y: 470, w: 330, a: [1220, 520], b: [1380, 478] },
      { img: 'AdminSchool_NRW', t: 'Lernplattform, Crashkurse', x: 1590, y: 720, w: 400, a: [1215, 640], b: [1380, 712] },
    ];
    const lines = [...P.map((p) => [p.a, p.b]), [[960, 760], [930, 852]]];
    return `<div class="cp cp-fk2"><i class="fk2-bar"></i>
      <div class="fk2-kick">FINANZKOMMISSAR</div>
      <h3 class="fk2-h">${'Wir sind kein Einzelprojekt, sondern ein Netzwerk von Beamten für Beamte!'.split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ')}</h3>
      <svg class="fk2-lines" viewBox="0 0 1920 1080">${lines.map(([a, b], i) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" style="--i:${i}"/><line class="fl" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" style="--i:${i}"/>`).join('')}</svg>
      <div class="fk2-core"><i class="fk2-ring"></i><i class="fk2-ring r2"></i><img src="${FK_IMG.s2_Logo_FinanzKommissar}" alt="FinanzKommissar"></div>
      ${P.map((p, i) => `<div class="fk2-p" style="left:${p.x}px;top:${p.y}px;--i:${i}"><img src="${FK_IMG['s2_Logo_' + p.img]}" style="width:${p.w}px" alt=""><span>${p.t}</span></div>`).join('')}
      <div class="fk2-lf" style="--i:4"><img src="${FK_IMG.s2_Logo_LF_Coaching}" alt=""><span>Einstellungstest, Sport, Spezialeinheiten</span></div>
      <p class="fk2-soon">Im Aufbau: Lohnsteuerhilfe und Lern-App</p>
      <img class="fk2-corner" src="${FK_IMG.s2_Logo_FinanzKommissar}" alt=""></div>`;
  } },
};
