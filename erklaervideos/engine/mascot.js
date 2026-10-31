// Maskottchen "Duelli": gelbes Rundlicht mit Coral/Mint-Wangen und -Füßen (Anspielung auf A gegen B).
// mascot(x, y, s, mood, t, o): (x,y) = Fußpunkt, s = Skalierung, mood = neutral | think | watch | cheer | wave
function mascot(x, y, s = 1, mood = 'neutral', t = 0, o = 1) {
  const Y = '#FFC93C', D = '#15113A', A = '#FF7A59', B = '#2EE6C5';
  const hop = mood === 'cheer' ? -Math.abs(Math.sin(t * 7)) * 16 : Math.sin(t * 3) * 3;
  const blink = (t % 3.4) > 3.27 ? .12 : 1;
  const look = mood === 'think' ? [-5, -7] : mood === 'watch' ? [Math.sin(t * 2.2) * 7, 2] : [0, 0];
  const arm = (d) => `<path d="${d}" fill="none" stroke="${Y}" stroke-width="19" stroke-linecap="round"/>`;
  let arms;
  if (mood === 'cheer') arms = arm('M-54 -78 Q-96 -112 -86 -160') + arm('M54 -78 Q96 -112 86 -160');
  else if (mood === 'wave') arms = arm('M-54 -62 Q-84 -46 -80 -26') + arm(`M54 -78 Q100 -100 ${88 + Math.sin(t * 11) * 14} -150`);
  else if (mood === 'think') arms = arm('M-54 -62 Q-84 -46 -80 -26') + arm('M54 -66 Q86 -56 30 -44');
  else arms = arm('M-54 -62 Q-86 -46 -82 -24') + arm('M54 -62 Q86 -46 82 -24');
  const brows = mood === 'think'
    ? `<path d="M-38 -108 L-10 -116" stroke="${D}" stroke-width="6" stroke-linecap="round"/><path d="M10 -104 L36 -104" stroke="${D}" stroke-width="6" stroke-linecap="round"/>`
    : mood === 'cheer'
      ? `<path d="M-38 -112 Q-22 -122 -8 -112" fill="none" stroke="${D}" stroke-width="6" stroke-linecap="round"/><path d="M8 -112 Q22 -122 38 -112" fill="none" stroke="${D}" stroke-width="6" stroke-linecap="round"/>`
      : `<path d="M-36 -106 L-10 -108" stroke="${D}" stroke-width="6" stroke-linecap="round"/><path d="M10 -108 L36 -106" stroke="${D}" stroke-width="6" stroke-linecap="round"/>`;
  const mouth = mood === 'cheer' ? `<path d="M-20 -56 Q0 -22 20 -56 Z" fill="${D}"/><path d="M-10 -40 Q0 -33 10 -40 Q0 -46 -10 -40Z" fill="#FF7A59"/>`
    : mood === 'think' ? `<ellipse cx="8" cy="-46" rx="6" ry="8" fill="${D}"/>`
    : `<path d="M-15 -52 Q0 -38 15 -52" fill="none" stroke="${D}" stroke-width="6" stroke-linecap="round"/>`;
  const eye = (cx) => `<g transform="translate(${cx} -82) scale(1 ${blink})"><circle r="18" fill="#fff"/><circle cx="${look[0]}" cy="${look[1]}" r="9" fill="${D}"/><circle cx="${look[0] + 3}" cy="${look[1] - 3}" r="3" fill="#fff"/></g>`;
  return `<g opacity="${o}" transform="translate(${x} ${y + hop * s}) scale(${s})">
    <ellipse cx="0" cy="2" rx="52" ry="9" fill="#000" opacity=".25" transform="translate(0 ${-hop})"/>
    <ellipse cx="-26" cy="-6" rx="24" ry="12" fill="${A}"/><ellipse cx="26" cy="-6" rx="24" ry="12" fill="${B}"/>
    ${arms}
    <ellipse cx="0" cy="-72" rx="64" ry="66" fill="${Y}"/><ellipse cx="-22" cy="-108" rx="22" ry="12" fill="#FFE9A8" opacity=".7"/>
    <circle cx="-42" cy="-56" r="12" fill="${A}" opacity=".9"/><circle cx="42" cy="-56" r="12" fill="${B}" opacity=".9"/>
    ${eye(-23)}${eye(23)}${brows}${mouth}</g>`;
}
