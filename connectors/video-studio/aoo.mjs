// Art of Operations reels in the video studio: a 15 second maxim (English, then Chinese) over a graded background clip,
// in the black, white or red row of the Instagram grid, ending on the series card (the 略 seal). Same job store, worker and checks as
// video_build; this file turns a short spec into the HyperFrames project and grades the footage with ffmpeg.
// The look is generalised from the nine approved reels (videos/art-of-operations/clips/clip-01 to clip-09).
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { BRAND, ROOT } from './shared.mjs';

const AOO = path.join(BRAND, 'aoo');
export const SECONDS = 15;
const INK = '#201E1D', BONE = '#F3F2F2', RED = '#EC3013', DEEP = '#B6240E';

// text colour, key-word colour, the ground the reel fades to, the seal, and the footage grade (ink to X)
// this series keeps the 略 (strategy) seal on its end card: Wesley's call on 30 Oct 2026, an exception to the WRW logo rule
export const ROWS = {
  black: { text: BONE, key: RED, cover: INK, seal: 'seal-red.svg', kicker: BONE, rule: RED, from: [14, 13, 13], to: [196, 192, 189], black: 18, white: 235 },
  white: { text: INK, key: DEEP, cover: BONE, seal: 'seal-red.svg', kicker: INK, rule: RED, from: [32, 30, 29], to: [243, 242, 242], black: 25, white: 200 },
  red: { text: BONE, key: INK, cover: RED, seal: 'seal-bone.svg', kicker: BONE, rule: BONE, from: [32, 30, 29], to: [236, 48, 19], black: 25, white: 225 },
};

const plain = s => String(s).replace(/\*/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Check the spec and fill the defaults. Returns { spec } or { problems }. */
export function normaliseAoo(a) {
  const problems = [], row = String(a.row || '').toLowerCase();
  if (!ROWS[row]) problems.push('row must be black, white or red (the grid is three rows of three, one colour per row)');
  const lines = (v, name, max, maxLen) => {
    const l = Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : [];
    if (l.length < 2 || l.length > max) problems.push(`${name} needs 2 to ${max} lines`);
    l.forEach((x, i) => { if (plain(x).length > maxLen) problems.push(`${name} line ${i + 1} is ${plain(x).length} characters: keep it to ${maxLen} so it stays on one line, centred`); });
    return l;
  };
  const en = lines(a.en, 'en', 4, 26), zh = lines(a.zh, 'zh', 4, 9);
  if (en.filter(x => /\*[^*]+\*/.test(x)).length !== 1) problems.push('en: wrap exactly one key word or phrase in *asterisks*');
  if (zh.filter(x => /\*[^*]+\*/.test(x)).length !== 1) problems.push('zh: wrap exactly one key word or phrase in *asterisks*');
  if (zh.some(x => /[。]/.test(x))) problems.push('zh: no full stop (。) at the end of a line');
  if (zh.some(x => /mandarin/i.test(x))) problems.push('zh: no "In Mandarin" label');
  const bg = path.resolve(String(a.background || '')), bgJob = String(a.background_job || '').replace(/[^a-z0-9]/gi, '');
  if (bgJob) { if (!fs.existsSync(path.join(ROOT, 'data', 'ltx', 'jobs', bgJob + '.json'))) problems.push('background_job is not a known ltx job id'); }
  else if (!a.background || !fs.existsSync(bg) || !(bg.startsWith(path.join(ROOT, 'output')) || bg.startsWith(path.join(ROOT, 'videos')))) problems.push('give background_job (the ltx job id, the studio waits for it) or background (an existing video file under the office output folder)');
  if (a.music?.file) { const f = path.resolve(String(a.music.file)); if (!fs.existsSync(f) || !f.startsWith(path.join(ROOT, 'output'))) problems.push('music.file must be a file under the office output folder, as returned by music_job'); }
  if (problems.length) return { problems };
  const R = ROWS[row], g = a.grade || {};
  return {
    spec: {
      type: 'aoo', title: String(a.title || `Art of Operations reel ${a.number || ''}`).trim().slice(0, 80), number: a.number ? +a.number : undefined, row, en, zh,
      kicker: String(a.kicker || 'The Art of Operations').slice(0, 40), byline: String(a.byline || 'Wesley Williams').slice(0, 40),
      background: bgJob ? undefined : bg, backgroundJob: bgJob || undefined, notify: a.notify !== false, grade: { black: clamp(g.black, 0, 200, R.black), white: clamp(g.white, 60, 255, R.white), invert: !!g.invert, gamma: clamp(g.gamma, 0.5, 4, 1), keepRed: g.keepRed === undefined ? row === 'black' : !!g.keepRed, redKeep: clamp(g.redKeep, 0.05, 0.8, 0.16), redSat: clamp(g.redSat, 1, 4, 2.2) },
      // the series score (Chinese lute with a bell on each transition) is the default and is used exactly as made; a prompt or file overrides it
      music: a.music?.prompt || a.music?.file ? { prompt: a.music.prompt ? String(a.music.prompt).slice(0, 500) : undefined, file: a.music.file ? path.resolve(String(a.music.file)) : undefined, volume: clamp(a.music.volume, 0.05, 1, 1) } : { file: path.join(AOO, 'scores', 'aoo-score.m4a'), volume: 1, asIs: true },
      totalSeconds: SECONDS, deliver: 'video', cards: [], brand: 'wrw', format: '9:16', style: 'aoo', transition: 'fade', textMotion: 'rise',
    },
  };
}
const clamp = (v, lo, hi, d) => (Number.isFinite(+v) && v !== undefined && v !== null && v !== '' ? Math.min(hi, Math.max(lo, +v)) : d);

/** Grade the footage into the row's palette: grey it, set the black and white points, then map dark to X and light to Y.
 *  Also fits it to 1080 by 1920, 30 fps and exactly 15 seconds. A clip of 10 seconds or more (LTX makes 10) is slowed to fill
 *  the 15 seconds, so there is no jump cut in the middle of the reel; a shorter one is looped. srcSeconds is the clip's length. */
export function gradeArgs(spec, input, output, srcSeconds = 0) {
  // invert turns a light footage (pale sky, dark figure) into a dark ground with a light figure, which is what the black row's bone text needs
  // gamma above 1 darkens the midtones (a dusk sky behind red or bone type has to be near black to keep 3:1 contrast)
  const R = ROWS[spec.row], { black: B, white: W, invert, gamma = 1 } = spec.grade, n = `clip((val-${B})/(${W - B}),0,1)`, ch = i => `clip(${R.from[i]}+(${R.to[i] - R.from[i]})*pow(${invert ? `(1-${n})` : n},${gamma}),0,255)`;
  const stretch = srcSeconds > 0 && srcSeconds < SECONDS && SECONDS / srcSeconds <= 1.6 ? (SECONDS + 0.1) / srcSeconds : 0; // 0.1 s spare, -t trims it
  const src = stretch ? ['-i', input] : ['-stream_loop', '-1', '-i', input]; // framerate blends the in-between frames of the slowed clip
  const fit = `${stretch ? `setpts=${stretch.toFixed(4)}*PTS,framerate=fps=30,` : ''}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30`, lut = `format=gray,format=rgb24,lutrgb=r='${ch(0)}':g='${ch(1)}':b='${ch(2)}'`;
  const enc = ['-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', output];
  if (!spec.grade.keepRed) return ['-y', ...src, '-t', String(SECONDS), '-an', '-vf', `${fit},${lut},format=yuv420p`, ...enc];
  // keepRed: the black row keeps the red glow on the horizon as the one colour. colorhold greys everything except colours near brand red,
  // saturation lifts the glow, and the tone curve is then applied to luma only (lutyuv) so the red survives it.
  const yv = `clip(${R.from[0]}+(${R.to[0] - R.from[0]})*pow(${invert ? `(1-clip((val-${B})/(${W - B}),0,1))` : `clip((val-${B})/(${W - B}),0,1)`},${gamma}),16,235)`;
  return ['-y', ...src, '-t', String(SECONDS), '-an', '-vf', `${fit},colorhold=color=0xEC3013:similarity=${spec.grade.redKeep}:blend=0.12,eq=saturation=${spec.grade.redSat},lutyuv=y='${yv}',format=yuv420p`, ...enc];
}

function get(url, headers = {}) {
  return new Promise((res, rej) => https.get(url, { headers }, r => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return res(get(r.headers.location, headers));
    if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
    const b = []; r.on('data', d => b.push(d)); r.on('end', () => res(Buffer.concat(b)));
  }).on('error', rej).setTimeout(20000, function () { this.destroy(new Error('timed out')); }));
}
/** The Chinese text can use any character, so ask Google Fonts for a Noto Serif SC (Light) file holding exactly these. */
async function chineseFont(text, dir) {
  const chars = [...new Set([...text].filter(c => c.trim()))].join('');
  try {
    const css = (await get('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300&text=' + encodeURIComponent(chars), { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' })).toString();
    const url = /url\((https:[^)]+)\)/.exec(css)?.[1]; if (!url) return false;
    fs.writeFileSync(path.join(dir, 'fonts', 'zh-exact.woff2'), await get(url)); return true;
  } catch { return false; }
}

// one span per word (per character in Chinese), spaced only where the line has a space, so "*appear large*;" stays "large;".
// An English key phrase and any punctuation glued to it sit in one .kp span, so the press on the beat moves them as one piece.
const wordSpans = (line, cls = '') => {
  const w = (t, k) => `<span class="w${k ? ' key' : ''}">${esc(t)}</span>`;
  let key = false;
  if (cls === 'zh') return line.split('*').map(p => { const s = [...p].filter(c => c.trim()).map(c => w(c, key)).join(''); key = !key; return s; }).join('');
  const toks = []; let gap = false;
  for (const part of line.split('*')) {
    for (const bit of part.split(/(\s+)/)) { if (!bit) continue; if (!bit.trim()) { gap = true; continue; } toks.push({ t: bit, key, gap }); gap = false; }
    key = !key;
  }
  let html = '', inKp = false;
  toks.forEach((k, i) => {
    if (inKp && !k.key && k.gap) { html += '</span>'; inKp = false; }
    if (i && k.gap) html += ' ';
    if (k.key && !inKp) { html += '<span class="kp">'; inKp = true; }
    html += w(k.t, k.key);
  });
  return html + (inKp ? '</span>' : '');
};

export async function writeAooProject(spec, dir) {
  const R = ROWS[spec.row];
  for (const d of ['fonts', 'assets', 'media', 'audio']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  for (const f of fs.readdirSync(path.join(AOO, 'fonts'))) fs.copyFileSync(path.join(AOO, 'fonts', f), path.join(dir, 'fonts', f));
  fs.copyFileSync(path.join(AOO, 'assets', R.seal), path.join(dir, 'assets', R.seal));
  fs.copyFileSync(path.join(AOO, 'hyperframes.json'), path.join(dir, 'hyperframes.json'));
  const pkg = JSON.parse(fs.readFileSync(path.join(AOO, 'package.json'), 'utf8')); pkg.name = path.basename(dir);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id: path.basename(dir), name: spec.title, createdAt: new Date().toISOString() }, null, 2));
  const exact = await chineseFont(spec.zh.map(plain).join(''), dir);
  const slices = fs.readFileSync(path.join(AOO, 'noto-slices.css'), 'utf8').replace(/^﻿/, '');
  const zhFace = exact ? `@font-face { font-family: "AooZh"; font-weight: 300; src: url("fonts/zh-exact.woff2") format("woff2"); }\n` : '';
  let audio = '';
  if (spec.music?.file) { const ext = path.extname(spec.music.file) || '.m4a'; fs.copyFileSync(spec.music.file, path.join(dir, 'audio', 'music' + ext)); audio = `<audio id="music" src="audio/music${ext}" data-start="0" data-duration="${SECONDS}" data-track-index="9" data-volume="${spec.music.volume}"></audio>`; }
  const enH = spec.en.map(l => `<span class="line" data-layout-allow-overflow>${wordSpans(l)}</span>`).join('\n          ');
  const zhH = spec.zh.map(l => `<span class="line" data-layout-allow-overflow>${wordSpans(l, 'zh')}</span>`).join('\n          ');
  // the approved reels set the text in the upper part of the frame (English at 480, Chinese at 450) so the figure below it is clear
  const enTop = 480, zhTop = 450;
  // timing, the shared skeleton of the series (the score is cued to it). Frame 0 is the finished English line on the footage, static,
  // because Instagram and LinkedIn show frame 0 as the thumbnail (owner's rule since 24 Oct 2026; reels 1 to 9 opened on a blank fade).
  // The score's strongest bell (1.68 s) once revealed the first English line: it now lands a spring press on the key word.
  // English out at 7.0, Chinese lines from 8.4, the seal at 12.6, fade out at 14.1, all as in reels 1 to 9.
  const zhAt = i => +(8.4 + i * 0.8).toFixed(2);
  const zhJs = spec.zh.map((_, i) => `words("#t2 .line:nth-child(${i + 1}) .w", ${zhAt(i)}, 0.14, 1.3);`).join('\n      ');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Newsreader"; font-weight: 300; src: url("fonts/newsreader-latin-300-normal.woff2") format("woff2"); }
      @font-face { font-family: "Archivo"; font-weight: 500; src: url("fonts/archivo-latin-500-normal.woff2") format("woff2"); }
      ${zhFace}${slices}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: ${R.cover}; }
      #root { position: relative; width: 100%; height: 100%; background: ${R.cover}; overflow: hidden; }
      .abs { position: absolute; }
      #stage { position: absolute; inset: 0; transform-origin: 50% 78%; }
      #bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: ${R.cover}; }
      .center { position: absolute; left: 0; width: 1080px; text-align: center; }
      .kicker { font-family: "Archivo", sans-serif; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; white-space: nowrap; color: ${R.kicker}; padding-left: 0.22em; }
      .serif { font-family: "Newsreader", Georgia, serif; font-weight: 300; }
      .zhf { font-family: ${exact ? '"AooZh", ' : ''}"Noto Serif SC", "Newsreader", serif; font-weight: 300; }
      .line { display: block; overflow: hidden; padding: 26px 0 20px; margin: -26px 0 -20px; }
      .line .w { display: inline-block; }
      .key { color: ${R.key}; }
      .kp { display: inline-block; }
      .seal { position: absolute; left: 504px; top: 160px; width: 72px; height: 72px; }
      .rule { position: absolute; left: 480px; width: 120px; height: 4px; background: ${R.rule}; transform-origin: center center; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${SECONDS}" data-width="1080" data-height="1920">
      <div id="stage">
        <video id="bg" class="clip" src="media/bg.mp4" muted playsinline data-start="0" data-duration="${SECONDS}" data-track-index="0"></video>
      </div>
      <h1 id="t1" class="center serif" style="top:${enTop}px;font-size:78px;line-height:1.14;color:${R.text}">
          ${enH}
      </h1>
      <h1 id="t2" class="center zhf" style="top:${zhTop}px;font-size:100px;line-height:1.3;color:${R.text}">
          ${zhH}
      </h1>
      <img id="seal" class="seal" src="assets/${R.seal}" alt="" />
      <div id="k3" class="center kicker" style="top:248px;font-size:26px">${esc(spec.kicker)}</div>
      <div id="rule3" class="rule" style="top:298px"></div>
      <div id="k4" class="center kicker" style="top:322px;font-size:22px;opacity:.9">${esc(spec.byline)}</div>
      <div id="cover" class="abs" style="inset:0;background:${R.cover};opacity:0"></div>
      ${audio}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const pop = "back.out(1.5)";
      // real damped springs, not bounce curves: settle carries a value to its end, kick presses it and lets it come back
      const settle = (z, w, d) => p => { if (p >= 1) return 1; const t = p * d, wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); };
      const kick = (z, w, d) => { const wd = w * Math.sqrt(1 - z * z), f = t => Math.exp(-z * w * t) * Math.sin(wd * t), peak = f(Math.atan(wd / (z * w)) / wd); return p => (p >= 1 ? 0 : f(p * d) / peak); };
      const words = (sel, t, st, dur, ease) => {
        tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: st }, t);
        return tl.fromTo(sel, { yPercent: 160 }, { yPercent: 0, duration: dur, ease: ease || pop, stagger: st }, t);
      };
      tl.fromTo("#stage", { scale: 1 }, { scale: 1.03, duration: ${SECONDS}, ease: "none" }, 0);
      tl.to("#cover", { opacity: 1, duration: 0.9, ease: "power2.in" }, 14.1);
      tl.to("#t1 .kp", { scale: 1.07, transformOrigin: "50% 60%", duration: 1.0, ease: kick(0.55, 14, 1.0) }, 1.59); // peaks on the 1.68 s bell
      tl.to("#t1 .w", { yPercent: -160, duration: 0.8, ease: "power2.in", stagger: 0.02 }, 7.0);
      tl.set("#t1", { opacity: 0 }, 8.0);
      ${zhJs}
      tl.fromTo("#seal", { opacity: 0, scale: 3, rotation: -12, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, rotation: 0, duration: 1.0, ease: settle(0.5, 12, 1.0) }, 12.6); // stamped down on a spring
      tl.fromTo("#k3", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, ease: pop }, 12.9);
      tl.fromTo("#rule3", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: pop }, 13.1);
      tl.fromTo("#k4", { opacity: 0, y: 20 }, { opacity: 0.9, y: 0, duration: 0.9, ease: pop }, 13.3);
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return { chineseFont: exact ? 'exact subset from Google Fonts' : 'bundled slices (offline: a rare character may fall back to a system font)', snapshotTimes: [0, 3.2, 9.4, 11.8, 13.9] }; // 0 is the thumbnail
}
