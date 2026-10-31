// Rendert spec.json + stage.js zu Einzelbildern (Chromium, parallel) und schneidet mit ffmpeg zum MP4.
// Aufruf: node render.mjs videos/001-pizza [--only 12.5,30]   (nur Standbilder bei diesen Sekunden)
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const dir = path.resolve(process.argv[2]); const here = path.dirname(new URL(import.meta.url).pathname);
const onlyIdx = process.argv.indexOf('--only'); const only = onlyIdx > 0 ? process.argv[onlyIdx + 1].split(',').map(Number) : null;
const spec = JSON.parse(fs.readFileSync(`${dir}/work/spec.json`, 'utf8'));
const FPS = spec.fps, N = Math.ceil(spec.duration * FPS);
const frames = `${dir}/work/frames`; fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}#root{width:1080px;height:1920px}</style><div id="root"></div>
<script>${fs.readFileSync(`${here}/base.js`, 'utf8')}</script><script>${fs.readFileSync(`${dir}/stage.js`, 'utf8')}</script>
<script>window.SPEC=${JSON.stringify(spec)};window.draw=RENDER(SPEC,STAGE);</script>`;
const idxs = only ? only.map(s => Math.round(s * FPS)) : Array.from({ length: N }, (_, i) => i);
const WORKERS = Math.min(4, idxs.length);
const browser = await chromium.launch();
await Promise.all(Array.from({ length: WORKERS }, async (_, k) => {
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  page.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exit(1); });
  await page.setContent(html); await page.evaluate(() => document.fonts.ready);
  for (let j = k; j < idxs.length; j += WORKERS) {
    const i = idxs[j]; await page.evaluate(t => window.draw(t), i / FPS);
    await page.screenshot({ path: `${frames}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
    if (!only && i % 300 === 0) console.log('Frame', i, '/', N);
  }
}));
await browser.close();
if (!only) {
  const out = `${dir}/../../out/${spec.id}.mp4`; fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', `${frames}/f%05d.jpg`, '-i', `${dir}/work/audio.wav`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  console.log('Fertig:', path.resolve(out));
}
