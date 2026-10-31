// Rendert spec.json + stage.js zu MP4 (Chromium parallel, Bilder direkt in ffmpeg gestreamt).
// Aufruf: node render.mjs videos/001-pizza [--only 12.5,30]   (nur Standbilder bei diesen Sekunden -> work/frames)
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';
const dir = path.resolve(process.argv[2]); const here = path.dirname(new URL(import.meta.url).pathname);
const onlyIdx = process.argv.indexOf('--only'); const only = onlyIdx > 0 ? process.argv[onlyIdx + 1].split(',').map(Number) : null;
const spec = JSON.parse(fs.readFileSync(`${dir}/work/spec.json`, 'utf8'));
const FPS = spec.fps, N = Math.ceil(spec.duration * FPS), rd = f => fs.readFileSync(f, 'utf8');
const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}#root{width:1080px;height:1920px}</style><div id="root"></div>
<script>${rd(`${here}/mascot.js`)}</script><script>${rd(`${here}/base.js`)}</script><script>${rd(`${here}/kit.js`)}</script><script>${rd(`${dir}/stage.js`)}</script>
<script>window.SPEC=${JSON.stringify(spec)};window.draw=RENDER(SPEC,STAGE);</script>`;
const idxs = only ? only.map(s => Math.round(s * FPS)) : Array.from({ length: N }, (_, i) => i);
const WORKERS = Math.min(4, idxs.length), Q = only ? 93 : 88;
const framesDir = `${dir}/work/frames`;
if (only) { fs.rmSync(framesDir, { recursive: true, force: true }); fs.mkdirSync(framesDir, { recursive: true }); }
let ff = null; const out = `${dir}/../../out/${spec.id}.mp4`;
if (!only) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', `${dir}/work/audio.wav`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
}
const buf = new Map(); let next = 0, flushing = false;
async function flush() {                                   // Bilder in richtiger Reihenfolge an ffmpeg
  if (flushing) return; flushing = true;
  while (buf.has(next)) { const b = buf.get(next); buf.delete(next); next++; if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); }
  flushing = false;
}
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
await Promise.all(Array.from({ length: WORKERS }, async (_, k) => {
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  page.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exit(1); });
  await page.setContent(html); await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  for (let j = k; j < idxs.length; j += WORKERS) {
    const i = idxs[j]; await page.evaluate(t => window.draw(t), i / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: Q, optimizeForSpeed: true });
    const b = Buffer.from(data, 'base64');
    if (only) fs.writeFileSync(`${framesDir}/f${String(i).padStart(5, '0')}.jpg`, b);
    else { buf.set(i, b); await flush(); if (i % 400 === 0) console.log('Frame', i, '/', N); }
  }
}));
await browser.close();
if (ff) { await flush(); ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('Fertig:', path.resolve(out)); }
