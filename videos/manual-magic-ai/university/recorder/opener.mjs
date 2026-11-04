// The opening card (Penny, 4 Nov 2026): Manual Magic AI's own artwork, assets/opening-card.png, moving with the whoosh into the platform.
// Frame 0 is the artwork untouched (it is the thumbnail), held completely still for HOLD seconds. Then a spark leaves the left-hand cluster and rides the light trail to the bright
// node beside the logo, the camera drifts and then rushes into that node, and the node flares to the dashboard's pale blue, which the
// platform rises out of. The rush and the spark's brightness follow the whoosh's loudness, the spark's speed its rising pitch (whoosh.py).
// Usage (edit.mjs calls it): await renderOpener({ image, outDir, peak }) → outDir/0001.png … one PNG per frame.
// Check the trace on its own: node recorder/opener.mjs --debug   (writes work/opener-debug/, the trail drawn over the art)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, ROOT, W, H } from './lib.mjs';

export const HOLD = 1.5;                     // seconds the artwork is held completely still before anything moves (Wesley, 4 Nov 2026)
export const OPEN_DUR = HOLD + 3;            // seconds; the whoosh (peak 1.9 s into its file) starts 2.6 s in, so it peaks on the cut
export const VEIL = '#eef5fb';               // the flare's colour: the dashboard's own pale blue, so the cut lands light on light
// The trail in the artwork, traced at 1920×1080: from the left-hand cluster, down through the trough under the headline, up to the node.
export const TRAIL = [[270, 585], [460, 650], [650, 702], [840, 736], [1000, 738], [1125, 702], [1245, 636], [1335, 556], [1405, 468], [1488, 384], [1566, 326]];
export const NODE = [1566, 326];

const page = (src, cfg) => `<html><body style="margin:0;background:#000;overflow:hidden"><canvas id="c" width="${W}" height="${H}"></canvas><script>
const C = ${JSON.stringify(cfg)};
const cv = document.getElementById('c'), g = cv.getContext('2d');
const acc = document.createElement('canvas'); acc.width = C.W; acc.height = C.H; const a = acc.getContext('2d');
const img = new Image(); img.src = ${JSON.stringify(src)}; window.ready = img.decode();
const clamp = (x, l = 0, h = 1) => Math.min(h, Math.max(l, x)), lerp = (p, q, k) => p + (q - p) * k;
const smooth = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };
// a critically damped spring released at t = 0: starts at rest, never overshoots
const spring = (t, w) => t <= 0 ? 0 : 1 - (1 + w * t) * Math.exp(-w * t);

// the trail as a Catmull-Rom curve, walked by arc length so the spark's speed is the sweep's, not the spacing of the points
const P = C.TRAIL, pts = [];
for (let i = 0; i < P.length - 1; i++) {
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
  for (let k = 0; k < 40; k++) { const u = k / 40, u2 = u * u, u3 = u2 * u;
    pts.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3))); }
}
pts.push(P[P.length - 1]);
const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
const at = p => { const d = clamp(p) * len[len.length - 1]; let i = 1; while (i < len.length - 1 && len[i] < d) i++;
  const k = (d - len[i - 1]) / (len[i] - len[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; };

// the whoosh, as whoosh.py shapes it: loudness rise^2.6, pitch sweep rise^1.4, over the PEAK seconds before the cut
function whoosh(s) { const rise = clamp((s - (C.DUR - C.PEAK)) / C.PEAK); return { rise, env: rise ** 2.6, sweep: rise ** 1.4 }; }

function camera(s) {
  const w = whoosh(s), drift = spring(s - C.HOLD, 1.6);         // still for the hold, then a slow push, then the rush rides the whoosh
  const rush = w.env ** 1.5;
  const S = 1 + 0.05 * drift + 1.95 * rush;
  const k = 1 - (1 - w.env) ** 2.2;                             // the aim moves onto the node as the whoosh builds
  let fx = lerp(lerp(960, 1010, drift), C.NODE[0], k), fy = lerp(lerp(540, 525, drift), C.NODE[1], k);
  const hw = C.W / (2 * S), hh = C.H / (2 * S);                 // never show past the artwork's edge
  fx = clamp(fx, hw, C.W - hw); fy = clamp(fy, hh, C.H - hh);
  return { S, fx, fy };
}

function spark(ctx, x, y, r, alpha) {
  const q = ctx.createRadialGradient(x, y, 0, x, y, r);
  q.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
  q.addColorStop(0.18, 'rgba(214,240,255,' + alpha * 0.85 + ')');
  q.addColorStop(0.45, 'rgba(107,199,237,' + alpha * 0.32 + ')');
  q.addColorStop(1, 'rgba(107,199,237,0)');
  ctx.fillStyle = q; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

function scene(ctx, s) {
  const w = whoosh(s), cam = camera(s);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#04122e'; ctx.fillRect(0, 0, C.W, C.H);
  ctx.translate(C.W / 2, C.H / 2); ctx.scale(cam.S, cam.S); ctx.translate(-cam.fx, -cam.fy);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, C.W, C.H);
  if (C.DEBUG) { ctx.strokeStyle = '#f5842c'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    C.TRAIL.forEach(([x, y]) => { ctx.fillStyle = '#f5842c'; ctx.fillRect(x - 5, y - 5, 10, 10); }); }
  // the spark: fades in as the whoosh starts, rides the trail at the pitch sweep's pace, arrives just before the peak
  const p = clamp(w.sweep / 0.9), born = smooth((s - (C.DUR - C.PEAK)) / 0.35), gone = 1 - smooth((p - 0.97) / 0.03 + 0);
  ctx.globalCompositeOperation = 'lighter';
  if (born > 0 && p < 1) {
    const glow = born * (0.8 + 0.2 * w.rise) * gone;
    for (let j = 11; j >= 0; j--) {                              // a tail behind it, longer as it speeds up
      const [x, y] = at(p - j * (0.005 + 0.016 * w.sweep)), f = 1 - j / 12;
      spark(ctx, x, y, (30 + 34 * w.rise) * (0.4 + 0.6 * f), glow * f * f * (j ? 0.6 : 1));
    }
    const [x, y] = at(p); spark(ctx, x, y, 9 + 6 * w.rise, glow);   // a hard white core, so it reads at phone size
  }
  // the node gathers light as the spark nears, then flares
  const near = smooth((p - 0.6) / 0.4);
  if (near > 0) spark(ctx, C.NODE[0], C.NODE[1], 40 + 90 * near, 0.25 + 0.6 * near);
  ctx.restore();
  // the flare, in screen space: light (added, never a grey wash) spreading from the node, then the dashboard's pale blue,
  // reaching it exactly on the last frame so the platform rises out of the same colour
  const nx = (C.NODE[0] - cam.fx) * cam.S + C.W / 2, ny = (C.NODE[1] - cam.fy) * cam.S + C.H / 2;
  const bloom = smooth((s - (C.DUR - 0.5)) / 0.45);
  if (bloom > 0) {
    const R = lerp(160, 2400, bloom ** 1.3), q = ctx.createRadialGradient(nx, ny, 0, nx, ny, R);
    q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.25, 'rgba(214,236,250,0.9)'); q.addColorStop(0.6, 'rgba(107,199,237,0.35)'); q.addColorStop(1, 'rgba(107,199,237,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = bloom; ctx.fillStyle = q; ctx.fillRect(0, 0, C.W, C.H);
  }
  const veil = clamp((s - (C.DUR - 0.25)) / (0.25 - 1 / C.FPS)) ** 2;
  if (veil > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = veil; ctx.fillStyle = C.VEIL; ctx.fillRect(0, 0, C.W, C.H); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

// one frame: N sub-frames over a 180° shutter, averaged, so the rush blurs the way a real camera would
window.render = t => {
  const N = C.SUB, shutter = 0.5 / C.FPS;
  for (let k = 0; k < N; k++) {
    const s = Math.max(0, t + (N === 1 ? 0 : (k / (N - 1) - 0.5) * shutter));
    scene(a, s); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1 / (k + 1); g.drawImage(acc, 0, 0);
  }
  g.globalAlpha = 1;
};
</script></body></html>`;

/** Writes the opener as numbered PNGs (0001.png …), dur × fps frames. Returns the frame count. */
export async function renderOpener({ image = path.join(ROOT, 'assets', 'opening-card.png'), outDir, dur = OPEN_DUR, fps = 30, peak = 1.9, debug = false, only = null }) {
  fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });
  const src = 'data:image/png;base64,' + fs.readFileSync(image).toString('base64');
  const b = await browser(), p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  await p.setContent(page(src, { W, H, DUR: dur, HOLD: Math.max(0, dur - 3), PEAK: peak, FPS: fps, SUB: debug ? 1 : 8, TRAIL, NODE, VEIL, DEBUG: debug }));
  await p.evaluate(() => window.ready);
  const n = Math.round(dur * fps), frames = only ?? [...Array(n).keys()];
  for (const i of frames) {
    await p.evaluate(t => window.render(t), i / fps);
    await p.screenshot({ path: path.join(outDir, `${String(i + 1).padStart(4, '0')}.png`), type: 'png' });
  }
  await b.close();
  return n;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // --debug: the trace drawn, no motion blur · --sample: finished frames, a handful · neither: every frame
  const out = path.join(ROOT, 'work', 'opener-debug'), debug = process.argv.includes('--debug'), sample = debug || process.argv.includes('--sample');
  const n = await renderOpener({ outDir: out, debug, only: sample ? [0, 44, 75, 95, 107, 117, 123, 127, 130, 132, 134] : null });
  console.log(`${sample ? 'sample frames' : n + ' frames'} → ${out}`);
}
