// Render a Manual Magic AI composition with this PC's Chrome (headless) and ffmpeg.
// usage: node render.mjs <project dir> <square|vertical> <sounds|stills|poster|video> [--lanes 6] [--sub 4] [--from s --to s]
// The page exposes window.MM { ready, seek(t), sounds, duration, fps, width, height }. Every frame is seek(t) then a
// compositor capture. Video: 4 subframes per frame over a 180° shutter, blended with ffmpeg tmix, painted in parallel lanes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { FFMPEG, findChrome } from '../../../connectors/motion-studio/shared.mjs';

const [dir, format = 'square', mode = 'stills', ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d; };
const DIR = path.resolve(dir), OUT = path.join(DIR, 'out', format);
fs.mkdirSync(OUT, { recursive: true });
const page_url = pathToFileURL(path.join(DIR, format + '.html')).href;

const run = (args, input) => new Promise((res, rej) => { const p = spawn(FFMPEG, args, { windowsHide: true }); let o = ''; p.stderr.on('data', d => o += d); p.on('close', c => c ? rej(new Error(o.slice(-2000))) : res(o)); if (input) p.stdin.end(input); });

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(page_url, { waitUntil: 'load' });
  const meta = await page.evaluate(async () => { await window.MM.ready; const m = window.MM; return { w: m.width, h: m.height, fps: m.fps, duration: m.duration, sounds: m.sounds }; });
  await page.setViewportSize({ width: meta.w, height: meta.h });
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  return { ctx, page, meta, cdp: await ctx.newCDPSession(page), errors };
}
const grab = async (L, t, format = 'png', quality = 95) => {
  await L.page.evaluate(t => window.MM.seek(t), t);
  return Buffer.from((await L.cdp.send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality } : {}), optimizeForSpeed: true, fromSurface: true, captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: L.meta.w, height: L.meta.h, scale: 1 } })).data, 'base64');
};

const browser = await chromium.launch({ executablePath: findChrome(), headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files', '--mute-audio'] });
try {
  if (mode === 'sounds') {
    const L = await open(browser);
    fs.writeFileSync(path.join(DIR, 'audio', 'sounds.json'), JSON.stringify(L.meta.sounds, null, 1));
    console.log(`${L.meta.sounds.length} sounds written`);
  } else if (mode === 'poster') {
    const L = await open(browser);
    fs.writeFileSync(path.join(OUT, 'poster-frame0.png'), await grab(L, 0));
    fs.writeFileSync(path.join(OUT, 'last-frame.png'), await grab(L, L.meta.duration - 1 / L.meta.fps));
    fs.writeFileSync(path.join(OUT, 'frame-60s.png'), await grab(L, L.meta.duration));
    console.log('poster written');
  } else if (mode === 'stills') {
    // one still per beat, taken 0.3 s after the beat so the beat's action has landed, then sheets of 4 bars
    const off = +opt('offset', 0.3), L = await open(browser), sd = path.join(OUT, 'stills');
    fs.mkdirSync(sd, { recursive: true });
    const n = Math.round(L.meta.duration * 2), list = [];
    for (let i = 0; i < n; i++) {
      const t = i * 0.5 + off, f = path.join(sd, `b${String(i + 1).padStart(3, '0')}.png`);
      fs.writeFileSync(f, await grab(L, t));
      list.push({ f: path.basename(f), label: `bar ${Math.floor(i / 4) + 1} · b${(i % 4) + 1} · ${t.toFixed(2)} s` });
    }
    const per = 16, cols = 4, tw = 420, th = Math.round(tw * L.meta.h / L.meta.w);
    for (let s = 0; s * per < n; s++) {
      const chunk = list.slice(s * per, s * per + per);
      const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0b1622;font:600 15px Segoe UI,Arial;color:#cfd8e3}
        .g{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:14px;padding:16px}figure{margin:0}img{width:${tw}px;height:${th}px;display:block}
        figcaption{padding:5px 2px}</style><div class="g">${chunk.map(c => `<figure><img src="stills/${c.f}"><figcaption>${c.label}</figcaption></figure>`).join('')}</div>`;
      const hf = path.join(OUT, `sheet-${String(s + 1).padStart(2, '0')}.html`);
      fs.writeFileSync(hf, html);
      const sp = await L.ctx.newPage();
      await sp.setViewportSize({ width: cols * (tw + 14) + 18, height: 400 });
      await sp.goto(pathToFileURL(hf).href, { waitUntil: 'load' });
      await sp.screenshot({ path: hf.replace(/\.html$/, '.jpg'), fullPage: true, type: 'jpeg', quality: 88 });
      await sp.close(); fs.unlinkSync(hf);
    }
    console.log(`${n} stills, ${Math.ceil(n / per)} sheets in ${OUT}`);
  } else if (mode === 'video') {
    const lanes = +opt('lanes', 6), sub = +opt('sub', 4), fmtCap = opt('cap', 'jpeg');
    const first = Math.round(+opt('from', 0) * 60), last = Math.round(+opt('to', 60) * 60);
    const frames = last - first, per = Math.ceil(frames / lanes), segs = [];
    const t0 = Date.now(); let done = 0;
    await Promise.all(Array.from({ length: lanes }, async (_, k) => {
      const a = first + k * per, b = Math.min(last, a + per); if (a >= b) return;
      const L = await open(browser), fps = L.meta.fps, seg = path.join(OUT, `seg-${k}.mkv`); segs[k] = seg;
      const vf = sub > 1 ? `tmix=frames=${sub}:weights='${Array(sub).fill(1).join(' ')}',select='not(mod(n+1\\,${sub}))',setpts=N/${fps}/TB` : `setpts=N/${fps}/TB`;
      const p = spawn(FFMPEG, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-c:v', fmtCap === 'png' ? 'png' : 'mjpeg', '-i', '-', '-vf', vf, '-r', String(fps),
        '-c:v', 'libx264', '-preset', 'veryfast', '-qp', '0', '-pix_fmt', 'yuv444p', seg], { windowsHide: true });
      let err = ''; p.stderr.on('data', d => err += d);
      const closed = new Promise((res, rej) => p.on('close', c => c ? rej(new Error(err)) : res()));
      for (let f = a; f < b; f++) {
        for (let s = 0; s < sub; s++) {
          const t = f / fps + (sub > 1 ? ((s + 0.5) / sub - 0.5) * 0.5 / fps : 0);   // 180° shutter, centred on the frame
          const buf = await grab(L, t, fmtCap);
          if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r));
        }
        if (++done % 300 === 0) console.log(`${done}/${frames} frames · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
      p.stdin.end(); await closed; await L.ctx.close();
    }));
    const listFile = path.join(OUT, 'segs.txt');
    fs.writeFileSync(listFile, segs.filter(Boolean).map(s => `file '${s.replace(/\\/g, '/')}'`).join('\n'));
    await run(['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', path.join(OUT, 'video-444.mkv')]);
    for (const s of segs.filter(Boolean)) fs.unlinkSync(s); fs.unlinkSync(listFile);
    console.log(`video painted: ${frames} frames x ${sub} subframes in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally { await browser.close(); }
