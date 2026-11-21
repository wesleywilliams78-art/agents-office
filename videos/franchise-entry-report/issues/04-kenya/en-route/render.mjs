// node render.mjs <page.html> <W> <H> <out.mp4> [workers]: 30 fps, 2 subframes blended (tmix) for motion blur, crf 12 intermediate.

import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { chromium } from 'file:///C:/Users/Wesley/agents-office/node_modules/playwright-core/index.mjs';
const [page, W, H, out, wk = '3'] = process.argv.slice(2); const FPS = 30, SUB = 2, N = 1800, workers = +wk;
const tmp = out.replace(/\.mp4$/, ''); fs.mkdirSync(tmp, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--force-color-profile=srgb', '--hide-scrollbars', '--allow-file-access-from-files'] });
const t0 = Date.now();
const parts = await Promise.all(Array.from({ length: workers }, async (_, i) => {
  const f0 = Math.round(i * N / workers), f1 = Math.round((i + 1) * N / workers), file = path.join(tmp, `c${i}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `tmix=frames=${SUB}:weights='1 1',select='eq(mod(n\,${SUB})\,${SUB - 1})',setpts=N/(${FPS}*TB)`,
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'ignore', 'inherit'] });
  const done = new Promise(r => ff.on('close', r));
  const pg = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
  await pg.goto(pathToFileURL(path.resolve(page)).href); await pg.evaluate(() => window.ready);
  for (let f = f0; f < f1; f++) for (let k = 0; k < SUB; k++) {
    await pg.evaluate(t => seek(t), f / FPS + k / (FPS * SUB));
    const img = await pg.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await done; await pg.close(); return file;
}));
await b.close();
fs.writeFileSync(path.join(tmp, 'list.txt'), parts.map(p => `file '${path.basename(p)}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', path.join(tmp, 'video.mp4')]);
console.log(`${W}x${H}: ${N} frames in ${Math.round((Date.now() - t0) / 1000)}s -> ${path.join(tmp, 'video.mp4')}`);
