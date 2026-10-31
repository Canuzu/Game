import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
const base = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
<defs><linearGradient id="bg" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#2B1F63"/><stop offset="1" stop-color="#15113A"/></linearGradient>
<filter id="sh"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#06041a" flood-opacity=".5"/></filter>
<clipPath id="c"><circle cx="540" cy="540" r="300"/></clipPath></defs>
<rect width="1080" height="1080" fill="url(#bg)"/>${inner}</svg>`;
// A: geteilter Kreis Coral gegen Mint mit VS-Plakette
const A = base(`<g filter="url(#sh)"><circle cx="540" cy="540" r="330" fill="#15113A"/>
<g clip-path="url(#c)"><rect x="200" y="200" width="680" height="680" fill="#FF7A59"/><polygon points="640,200 880,200 880,880 400,880" fill="#2EE6C5"/></g></g>
<circle cx="540" cy="540" r="300" fill="none" stroke="#fff" stroke-width="10"/>
<g filter="url(#sh)"><circle cx="540" cy="540" r="112" fill="#FFC93C"/>
<text x="540" y="582" font-family="Inter" font-weight="900" font-size="118" fill="#15113A" text-anchor="middle">VS</text></g>`);
// B: zwei Balken (Rennen) mit Zähler-Look
const B = base(`<g filter="url(#sh)"><rect x="200" y="260" width="680" height="560" rx="90" fill="#231A55" stroke="#4A3C97" stroke-width="8"/></g>
<rect x="260" y="330" width="520" height="130" rx="40" fill="#FF7A59"/><rect x="260" y="560" width="340" height="130" rx="40" fill="#2EE6C5"/>
<text x="740" y="425" font-family="Inter" font-weight="900" font-size="80" fill="#15113A" text-anchor="end">804</text>
<text x="560" y="655" font-family="Inter" font-weight="900" font-size="80" fill="#15113A" text-anchor="end">760</text>
<g filter="url(#sh)"><circle cx="800" cy="610" r="92" fill="#FFC93C"/><text x="800" y="648" font-family="Inter" font-weight="900" font-size="100" fill="#15113A" text-anchor="middle">&gt;</text></g>`);
const b = await chromium.launch();
for (const [n, svg] of [['avatar-A', A], ['avatar-B', B]]) {
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1080 } })).newPage();
  await p.setContent(`<body style="margin:0">${svg}</body>`); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${n}.png` });
}
await b.close();
