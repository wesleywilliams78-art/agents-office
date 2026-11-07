// Motion studio: the frame engine. A composition is a web page that paints any moment from the time alone
// (window.motion = { width, height, fps, duration, bpm, cuts, render(t), score(S) }). Playwright opens it in this
// machine's Chrome, headless, with the clock taken away; the engine asks it to paint frame 0, 1, 2 …, captures each
// frame straight from the compositor and pipes the frames into ffmpeg. Long videos are painted in parallel lanes and
// joined without re-encoding. The score is synthesised in the same page (OfflineAudioContext) on the same beat grid.
//
// The house rules are enforced here, not suggested: motion on real springs (M.spring), no CSS transitions, keyframes
// or fake bounce curves, the score synthesised on the beat grid (recorded sounds only from the licensed library, sfx.mjs,
// placed with S.sample), cuts on the beat, no dead stretches, frame 0 held.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { FFMPEG, FORMATS, MAX_SECONDS, SERIES, findChrome, formatFor } from './shared.mjs';
import { readNarration, srt } from './voice.mjs';
import { LICENCES, creditsText, idsIn, readSound, soundsFor } from './sfx.mjs';

export const SHEET = 12; // stills per contact sheet

// Runs before the page's own scripts: real time is replaced by the frame's time, random is seeded per frame,
// requestAnimationFrame callbacks run once per painted frame, CSS and Web Animations are paused and set to the frame.
const INIT = `(() => {
  let T = 0, s = 1; const EPOCH = 1767225600000, nraf = window.requestAnimationFrame.bind(window), q = [];
  const ND = Date; class D extends ND { constructor(...a) { a.length ? super(...a) : super(EPOCH + T * 1000); } static now() { return EPOCH + T * 1000; } }
  window.Date = D; performance.now = () => T * 1000;
  Math.random = () => { s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  window.requestAnimationFrame = cb => (q.push(cb), q.length); window.cancelAnimationFrame = () => {};
  const painted = () => Promise.race([new Promise(r => nraf(() => nraf(r))), new Promise(r => setTimeout(r, 120))]);
  window.__seek = async t => {
    T = t; s = 1;
    const r = window.motion.render(t); if (r && typeof r.then === 'function') await r;
    for (const cb of q.splice(0)) cb(t * 1000);
    for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t * 1000; } catch {} }
    await painted();
  };
  window.__score = async (rate, sounds = {}) => {
    const m = window.motion; s = 7; T = 0;
    const ac = new OfflineAudioContext(2, Math.ceil(m.duration * rate), rate), S = new SoundKit(ac, m.bpm);
    S.samples = {}; S.sampleInfo = {}; // the library sounds the page names, decoded here so S.sample can place them on the grid
    for (const [id, x] of Object.entries(sounds)) { const bin = atob(x.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); S.samples[id] = await ac.decodeAudioData(u8.buffer); S.sampleInfo[id] = { onset: x.onset, peakAt: x.peakAt }; }
    await m.score(S);
    const buf = await ac.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
    const wav = new DataView(new ArrayBuffer(44 + n * 4)), str = (o, x) => { for (let i = 0; i < x.length; i++) wav.setUint8(o + i, x.charCodeAt(i)); };
    str(0, 'RIFF'); wav.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 2, true);
    wav.setUint32(24, rate, true); wav.setUint32(28, rate * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true); str(36, 'data'); wav.setUint32(40, n * 4, true);
    let peak = 0;
    for (let i = 0; i < n; i++) { const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i])); peak = Math.max(peak, Math.abs(l), Math.abs(r)); wav.setInt16(44 + i * 4, l * 32767, true); wav.setInt16(46 + i * 4, r * 32767, true); }
    const u8 = new Uint8Array(wav.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return { b64: btoa(bin), peak };
  };
  // two pieces of text from different blocks drawn over each other, both visibly on screen
  // is either text covered at this point by something opaque (a panel, a filled canvas pixel) lying between or over them?
  const hidden = (x, y, A, B) => {
    let seen = 0;
    for (const e of document.elementsFromPoint(x, y)) { // topmost first
      const inA = A.contains(e), inB = B.contains(e);
      if (inA || inB) { seen |= (inA ? 1 : 0) | (inB ? 2 : 0); if (seen === 3) return false; continue; }
      if (e.contains(A) && e.contains(B)) continue; // a common ancestor paints beneath both
      let opaque = false;
      if (e.tagName === 'CANVAS') { try { const r = e.getBoundingClientRect(), g = e.getContext('2d'); opaque = !!g && g.getImageData((x - r.left) * e.width / r.width, (y - r.top) * e.height / r.height, 1, 1).data[3] > 200; } catch {} }
      else { const cs = getComputedStyle(e); opaque = +cs.opacity > .5 && !!cs.backgroundColor && !['rgba(0, 0, 0, 0)', 'transparent'].includes(cs.backgroundColor); }
      if (opaque) return true; // something solid lies over whichever text has not been reached yet
    }
    return false;
  };
  window.__overlaps = () => {
    const bx = window.__textBoxes().filter(b => b.op >= .15), hits = [];
    for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) {
      const a = bx[i], b = bx[j]; if (a.blk === b.blk) continue;
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 3 && h > 3 && !hidden((Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2, (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2, window.__blkEl[a.blk], window.__blkEl[b.blk])) hits.push(a.text + '" over "' + b.text);
    }
    return hits;
  };
  window.__textBoxes = () => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue.trim()) continue; let op = 1, hidden = false, clip = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
      for (let e = n.parentElement; e; e = e.parentElement) {
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; } op *= +cs.opacity;
        if (cs.overflow !== 'visible' && e !== document.body && e !== document.documentElement) { const b = e.getBoundingClientRect(); clip = { l: Math.max(clip.l, b.left), t: Math.max(clip.t, b.top), r: Math.min(clip.r, b.right), b: Math.min(clip.b, b.bottom) }; }
      }
      if (hidden || op < .05) continue;
      const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect();
      const box = { l: Math.max(b.left, clip.l), t: Math.max(b.top, clip.t), r: Math.min(b.right, clip.r), b: Math.min(b.bottom, clip.b) };
      if (box.r - box.l < 2 || box.b - box.t < 2) continue;
      let blk = n.parentElement; while (blk && blk !== document.body && /^inline/.test(getComputedStyle(blk).display)) blk = blk.parentElement;
      if (!window.__blk) { window.__blk = new WeakMap(); window.__blkN = 0; } if (!window.__blk.has(blk)) { window.__blk.set(blk, ++window.__blkN); (window.__blkEl ||= {})[window.__blkN] = blk; }
      out.push({ text: n.nodeValue.trim().slice(0, 40), ...box, op, blk: window.__blk.get(blk) });
    }
    return out;
  };
})();`;

const wait = (page, ms = 20000) => page.waitForFunction(() => window.motion && typeof window.motion.render === 'function', null, { timeout: ms })
  .then(() => page.evaluate(async () => {
    if (window.motion.ready) await window.motion.ready;
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    const m = window.motion, bad = [...document.fonts].filter(f => f.status === 'error').map(f => f.family);
    return { width: m.width, height: m.height, fps: m.fps, duration: m.duration, bpm: m.bpm, cuts: Array.isArray(m.cuts) ? m.cuts : [], voice: Array.isArray(m.voice) ? m.voice : [], subframes: Math.max(1, Math.min(4, Math.round(+m.subframes || 1))), holds: Array.isArray(m.holds) ? m.holds : [], score: typeof m.score === 'function', soundKit: typeof window.SoundKit === 'function', badFonts: bad };
  }));

async function open(browser, url, meta, log) {
  const ctx = await browser.newContext({ viewport: { width: meta?.width || 1080, height: meta?.height || 1920 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  if (log) {
    page.on('pageerror', e => log.push('page error: ' + String(e.message || e).slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error') log.push('console error: ' + m.text().slice(0, 300)); });
    page.on('requestfailed', r => { if (!/favicon/.test(r.url())) log.push('could not load ' + decodeURIComponent(r.url().split('/').slice(-2).join('/'))); });
  }
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  return { ctx, page, cdp: await ctx.newCDPSession(page) };
}
const grab = async (cdp, meta, { format = 'png', quality = 92, scale = 1 } = {}) =>
  Buffer.from((await cdp.send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality } : {}), optimizeForSpeed: true, fromSurface: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width: meta.width, height: meta.height, scale } })).data, 'base64');

const run = (args, input) => new Promise(res => { const p = spawn(FFMPEG, args, { windowsHide: true }); let o = ''; p.stderr.on('data', d => o += d); p.on('error', e => res({ code: -1, out: String(e.message) })); p.on('close', code => res({ code, out: o })); if (input) p.stdin.end(input); });
const durationOf = async f => { const r = await run(['-hide_banner', '-i', f]); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.out); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };

/** Every frame as captured (before any encoder), small and grey, compared with the frame half a second before: a frame is alive when at least 0.4% of the
 *  picture changed visibly. Soft drifting mist counts; a sub-pixel push or a frozen hold does not. Returns the still stretches
 *  [from, to] in seconds and the share of the picture moving, second by second (for the critic). */
const GREY = { w: 180, h: 320 };
function motionScan(raw, fps) {
  const size = GREY.w * GREY.h, lag = Math.max(1, Math.round(fps / 2)), frames = [];
  for (let o = 0; o + size <= raw.length; o += size) frames.push(raw.subarray(o, o + size));
  const moving = frames.map((f, i) => { if (i < lag) return 1; const g = frames[i - lag]; let n = 0; for (let k = 0; k < size; k++) if (Math.abs(f[k] - g[k]) > 2) n++; return n / size; });
  const still = []; let from = -1;
  moving.forEach((m, i) => { const alive = m >= .004; if (!alive && from < 0) from = i; if ((alive || i === moving.length - 1) && from >= 0) { still.push([Math.max(0, from - lag) / fps, (alive ? i : i + 1) / fps]); from = -1; } });
  for (let k = still.length - 1; k > 0; k--) if (still[k][0] <= still[k - 1][1]) { still[k - 1][1] = Math.max(still[k - 1][1], still[k][1]); still.splice(k, 1); } // overlapping stretches are one
  const perSecond = []; for (let s = 0; s * fps < moving.length; s++) { const sl = moving.slice(s * fps, (s + 1) * fps); perSecond.push(+(100 * sl.reduce((a, b) => a + b, 0) / sl.length).toFixed(1)); }
  // a change of ground colour (bone 242, red 86, ink 31 in grey) that happens within two frames is a hard colour cut
  const mean = frames.map(f => { let t = 0; for (let k = 0; k < size; k += 4) t += f[k]; return t / (size / 4); }), jumps = [];
  for (let i = 2; i < mean.length; i++) if (Math.abs(mean[i] - mean[i - 2]) > 30) { const last = jumps[jumps.length - 1]; if (last && i - last.i <= 3) { last.i = i; last.to = mean[i]; } else jumps.push({ i, at: (i - 1) / fps, from: mean[i - 2], to: mean[i] }); }
  return { still, perSecond, jumps };
}

/** The house rules, read from the source. Rules are errors (nothing renders). `brand` stays in the result, now always empty. */
export function lint(html) {
  const rules = [], brand = [];
  const css = (html.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n') + '\n' + (html.match(/style\s*=\s*"[^"]*"/gi) || []).join('\n');
  if (/(^|[\s;{])transition(-[a-z]+)?\s*:/im.test(css) || /\.style\.transition\b/.test(html)) rules.push('a CSS transition: basic CSS motion is banned, paint every move in render(t)');
  if (/@keyframes|(^|[\s;{])animation(-[a-z]+)?\s*:/im.test(css) || /\.animate\s*\(\s*[\[{]/.test(html)) rules.push('CSS keyframes or the Web Animations API: basic CSS motion is banned, paint every move in render(t)');
  if (/\b(back|elastic|bounce)\.(in|out|inOut)\b|ease\s*:\s*["'`]\s*(back|elastic|bounce)\b|CustomBounce|CustomWiggle|cubic-bezier\([^)]*-|cubic-bezier\([^)]*1\.[1-9]/i.test(html)) rules.push('a fake bounce curve (back/elastic/bounce/overshooting cubic-bezier): overshoot comes from real springs, M.spring');
  if (!/M\.spring\s*\(/.test(html)) rules.push('no M.spring: everything that pops, lands, drops or stamps must move on real spring physics');
  if (/<audio|<video|\.(mp3|wav|m4a|ogg|aac|flac)\b|new\s+Audio\s*\(|decodeAudioData/i.test(html)) rules.push('an audio or video file in the page: synthesise with the sound kit, and take recorded sounds only from the library with S.sample(t, \'ov-…\') (sfx_search, sfx_fetch)');
  if (!/kit\/sound-kit\.js/.test(html)) rules.push('the sound kit is not loaded (<script src="kit/sound-kit.js">): every video has a score on the beat grid');
  for (const id of idsIn(html)) { const s = readSound(id); if (!s) rules.push(`the sound ${id} is not in the library: fetch it first with sfx_fetch`); else if (!LICENCES.includes(s.licence)) rules.push(`the sound ${id} is ${s.licence}: only CC0, PDM and CC BY sounds may be used`); }
  if (/https?:\/\/|cdn\.|unpkg\.|cdnjs/i.test(html.replace(/xmlns(:\w+)?="http[^"]*"/g, ''))) rules.push('a library or file from the internet: compositions are self-contained (kit/ only: three.js and GSAP are in kit/three and kit/gsap)');
  if (/\bgsap\b/.test(html)) {
    if (/\bgsap\.(to|from|fromTo|delayedCall|ticker|quickTo)\b/.test(html)) rules.push('GSAP moving on its own (gsap.to/from/fromTo/delayedCall/ticker): GSAP may only move through one paused timeline seeked in render(t)');
    const tls = html.match(/gsap\.timeline\s*\(([^)]*)\)/g) || [];
    if (tls.some(x => !/paused\s*:\s*true/.test(x))) rules.push('a GSAP timeline that is not paused: build it with gsap.timeline({ paused: true }) and seek it in render(t)');
    if (tls.length && !/\.(seek|time|totalTime|progress)\s*\(/.test(html)) rules.push('a GSAP timeline that is never seeked: call tl.seek(t) inside render(t)');
    if (/\.play\s*\(|\.restart\s*\(|\.resume\s*\(/.test(html)) rules.push('a GSAP timeline set playing (play/restart/resume): it must stay paused and be seeked in render(t)');
  }
  if (/setAnimationLoop|THREE\.Clock|new\s+Clock\s*\(/.test(html)) rules.push('three.js running on its own clock (setAnimationLoop or THREE.Clock): set every object from t in render(t) and call renderer.render once there');
  // brand look (gradients, circles, rounded corners, shadows, alignment) is no longer policed here: Wesley lifted those rules on 27 Oct 2026.
  // The brand is its palette, its fonts and its logo; the structural rules above stay.
  return { rules, brand };
}

/** stills on the beat grid: every beat (thinned to fit 24), the first and last frame, and any moments asked for */
function stillTimes(meta, last, at) {
  const snap = t => Math.round(t * meta.fps) / meta.fps, spb = 60 / meta.bpm, half = spb / 2;
  const cuts = []; for (const c of meta.cuts || []) for (const d of [-half, 0, half]) { const t = c * spb + d; if (t > 0 && t < last) cuts.push(t); } // every transition is looked at: before, on, after
  const extra = [...cuts, ...at.filter(x => x >= 0 && x <= last)].slice(0, SHEET), grid = [];
  for (let t = half; t < last - 1e-6; t += half) grid.push(t);           // every half beat: the hits and the moments between them
  const keep = 2 * SHEET - 2 - extra.length, step = Math.max(1, grid.length / Math.max(1, keep));
  const picked = []; for (let k = 0; k < grid.length && picked.length < keep; k += step) picked.push(grid[Math.floor(k)]);
  return [...new Set([0, last, ...picked, ...extra].map(snap))].sort((a, b) => a - b).slice(0, 2 * SHEET);
}

/**
 * Paint a composition. mode: 'stills' (checks and contact sheets only), 'draft' (every frame at half size: dead-frame and beat scan) or 'final'.
 * Returns { meta, stills, sheets, audio, file, errors, warnings, checks, dead, cuts, seconds }. No video is made if a rule is broken.
 */
export async function render({ dir, out, mode = 'final', at = [], series = null, narration = null, onStep = () => {}, cancelled = () => false }) {
  let seriesCfg = null; try { seriesCfg = series ? JSON.parse(fs.readFileSync(path.join(SERIES, series, 'series.json'), 'utf8')) : null; } catch {}
  const N = narration ? readNarration(narration) : null;
  const started = Date.now(), errors = [], warnings = [], checks = [];
  const chrome = findChrome(); if (!chrome) throw new Error('Chrome was not found on this computer');
  fs.mkdirSync(out, { recursive: true });
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), L = lint(html);
  errors.push(...L.rules.map(r => 'rule: ' + r)); warnings.push(...L.brand.map(b => 'brand: ' + b));
  const url = pathToFileURL(path.join(dir, 'index.html')).href;
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
  try {
    onStep('opening the composition');
    const plog = [];
    let probe = await open(browser, url, null, plog), meta;
    try { meta = await wait(probe.page); } catch (e) { if (plog.some(l => /narration\/words\.js/.test(l)) && !narration) throw new Error('the page loads narration/words.js but no narration is attached: pass narration: <the motion_narrate job id> and series on motion_preview or motion_draft'); throw new Error('the page never defined window.motion = { width, height, fps, duration, bpm, cuts, render(t), score(S) }' + (plog.length ? ' (' + plog.slice(0, 3).join('; ') + ')' : '')); }
    const bad = [];
    if (!(meta.width >= 64 && meta.width <= 3840 && meta.width % 2 === 0)) bad.push('width must be an even number of pixels, 64 to 3840');
    if (!(meta.height >= 64 && meta.height <= 3840 && meta.height % 2 === 0)) bad.push('height must be an even number of pixels, 64 to 3840');
    if (!(meta.fps >= 12 && meta.fps <= 60)) bad.push('fps must be 12 to 60');
    if (!(meta.duration > 0 && meta.duration <= MAX_SECONDS)) bad.push(`duration must be 0 to ${MAX_SECONDS} seconds`);
    if (!(meta.bpm >= 60 && meta.bpm <= 200)) bad.push('bpm must be set, 60 to 200: the picture and the score share one beat grid');
    for (const h of meta.holds) if (!(Array.isArray(h) && h[0] >= 0 && h[1] > h[0] && h[1] <= meta.duration && h[1] - h[0] <= 8)) bad.push(`hold ${JSON.stringify(h)} must be [from, to] in seconds inside the piece, at most 8 s long`);
    if (bad.length) throw new Error(bad.join('; '));
    if (!meta.score || !meta.soundKit) errors.push('rule: no score(S): every video carries a synthesised score on the beat grid');
    if (meta.badFonts.length) errors.push('fonts failed to load: ' + [...new Set(meta.badFonts)].join(', '));
    const spb = 60 / meta.bpm, onGrid = t => { const b = t / spb * 2; return Math.abs(b - Math.round(b)) * spb / 2 <= .5 / meta.fps + 1e-6; };
    if (meta.duration > 4 && meta.cuts.length === 0) errors.push('rule: no cuts declared: list the beats the scenes change on in cuts: [ … ]');
    for (const c of meta.cuts) { const t = c * spb; if (Math.abs(c * 2 - Math.round(c * 2)) > 1e-6) errors.push(`rule: cut at beat ${c} is not on a beat or half beat`); else if (Math.abs(t * meta.fps - Math.round(t * meta.fps)) > .5) warnings.push(`cut at beat ${c} (${t.toFixed(3)} s) falls between frames at ${meta.fps} fps: choose a bpm that divides the frame rate (e.g. 120 or 90 at 30 fps)`); }
    // reopen at the composition's own size, so layout is measured exactly as it will be painted
    await probe.ctx.close(); plog.length = 0; probe = await open(browser, url, meta, plog); await wait(probe.page);
    const frames = Math.round(meta.duration * meta.fps), last = (frames - 1) / meta.fps, fmt = formatFor(meta.width, meta.height), safe = seriesCfg?.safe || (fmt ? FORMATS[fmt] : null);
    const snap = t => Math.round(t * meta.fps) / meta.fps;

    onStep('taking stills on the beat grid');
    const times = stillTimes(meta, last, at), stills = [], shots = [], an = await (await browser.newContext()).newPage();
    const stats = (a, b) => an.evaluate(async ([a, b]) => {
      const load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
      const px = async src => { const i = await load(src), w = 180, h = Math.round(w * i.height / i.width), c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.drawImage(i, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
      const A = await px(a); let sum = 0, sq = 0, n = A.length / 4;
      for (let k = 0; k < A.length; k += 4) { const l = .2126 * A[k] + .7152 * A[k + 1] + .0722 * A[k + 2]; sum += l; sq += l * l; }
      const std = Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)); if (!b) return { std };
      const B = await px(b); let d = 0; for (let k = 0; k < A.length; k += 4) if (Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]) > 24) d++;
      return { std, diff: d / n };
    }, [a, b]);
    const uri = b => 'data:image/png;base64,' + b.toString('base64');
    for (const [i, t] of times.entries()) {
      if (cancelled()) throw new Error('cancelled');
      await probe.page.evaluate(t => window.__seek(t), t);
      const png = await grab(probe.cdp, meta), f = path.join(out, `still-${String(i + 1).padStart(2, '0')}-${t.toFixed(2)}s.png`);
      fs.writeFileSync(f, png); stills.push({ n: i + 1, t, beat: +(t / spb).toFixed(2), file: f }); shots.push(png);
      const s = await stats(uri(png));
      if (s.std < 1.5) warnings.push(`at ${t.toFixed(2)} s the frame is one flat colour (nothing on screen)`);
      if (safe) {
        const boxes = await probe.page.evaluate(() => window.__textBoxes());
        const outFrame = boxes.filter(b => b.l < -1 || b.t < -1 || b.r > meta.width + 1 || b.b > meta.height + 1);
        const outSafe = boxes.filter(b => !outFrame.includes(b) && (b.l < safe.side - 2 || b.r > meta.width - safe.side + 2 || b.t < safe.top - 2 || b.b > meta.height - safe.bottom + 2));
        if (outFrame.length) warnings.push(`at ${t.toFixed(2)} s text runs off the frame: "${outFrame.map(b => b.text).slice(0, 3).join('", "')}"`);
        if (outSafe.length) warnings.push(`at ${t.toFixed(2)} s text sits outside the ${fmt} safe area: "${outSafe.map(b => b.text).slice(0, 3).join('", "')}"`);
      }
    }
    checks.push(`${stills.length} stills taken on the beat grid`);
    // overlapping text, checked every quarter second across the whole piece (not only at the stills)
    onStep('checking every quarter second for overlapping text');
    const over = new Map();
    for (let t = 0; t <= last + 1e-6; t += .25) {
      if (cancelled()) throw new Error('cancelled');
      const tt = snap(t); await probe.page.evaluate(t => window.__seek(t), tt);
      for (const h of await probe.page.evaluate(() => window.__overlaps())) { const k = h; if (!over.has(k)) over.set(k, [tt, tt]); else over.get(k)[1] = tt; }
    }
    if (over.size) errors.push(`overlapping text: ${[...over].slice(0, 30).map(([k, [a, b]]) => `"${k}" at ${a.toFixed(2)}${b > a ? '–' + b.toFixed(2) : ''} s`).join('; ')}${over.size > 30 ? ` (and ${over.size - 30} more)` : ''}. No two pieces of text may sit over each other: move one, or clear the first before the second arrives.`);
    else checks.push('no overlapping text anywhere (checked every quarter second)');
    { await probe.page.evaluate(t => window.__seek(t), snap(.3)); const p03 = await grab(probe.cdp, meta), s = await stats(uri(shots[0]), uri(p03));
      if (s.std < 1.5) errors.push('frame 0 is blank: LinkedIn and Instagram use frame 0 as the thumbnail, so open on a finished title card');
      else if (s.diff > .004) warnings.push(`frame 0 is not held: ${(s.diff * 100).toFixed(1)}% of the picture moves in the first 0.3 s, and frame 0 is the thumbnail`);
      else checks.push('frame 0 is a finished, held picture'); }
    { const t = snap(last * .37); await probe.page.evaluate(t => window.__seek(t), t); const a = await grab(probe.cdp, meta); await probe.page.evaluate(t => window.__seek(t), snap(last * .81)); await probe.page.evaluate(t => window.__seek(t), t); const b = await grab(probe.cdp, meta);
      const s = await stats(uri(a), uri(b));
      if (s.diff > .001) errors.push(`the page is not a function of time: ${t.toFixed(2)} s painted twice gave different pictures (${(s.diff * 100).toFixed(1)}% differs). Paint everything inside render(t) from t alone; no setTimeout, setInterval or state carried between frames.`);
      else checks.push('the page paints the same picture for the same moment'); }

    // narration (narrated series only): every placed line exists, fits in the piece, and the voice is Wesley's for a final
    if (meta.voice.length || narration) {
      if (!seriesCfg?.narration) errors.push(`rule: narration is only for narrated series (The Operator's Ledger); every sound here is synthesised`);
      else if (!N) errors.push(narration ? `rule: narration ${narration} was not found: make it with motion_narrate` : 'rule: voice lines are placed but no narration is attached: pass narration: <the motion_narrate job id>');
      else {
        if (!meta.voice.length) warnings.push('a narration is attached but no line is placed: add voice: [{ line, at }] to M.scene');
        const placed = [];
        for (const v of meta.voice) {
          const L = N.words[v.line]; if (!L) { errors.push(`voice line ${v.line} is not in narration ${narration} (it has ${Object.keys(N.words).join(', ')})`); continue; }
          const end = v.at + L.duration; placed.push([v.at, end, v.line]);
          if (v.at < 0 || end > meta.duration + .01) errors.push(`voice line ${v.line} runs from ${v.at.toFixed(2)} to ${end.toFixed(2)} s, outside the ${meta.duration} s piece`);
        }
        placed.sort((a, b) => a[0] - b[0]); for (let k = 1; k < placed.length; k++) if (placed[k][0] < placed[k - 1][1] - .05) errors.push(`voice lines ${placed[k - 1][2]} and ${placed[k][2]} overlap (${placed[k][0].toFixed(2)} s starts before ${placed[k - 1][1].toFixed(2)} s)`);
        const missing = Object.keys(N.words).filter(l => !meta.voice.some(v => v.line === l)); if (missing.length) warnings.push(`narration lines never placed: ${missing.join(', ')}`);
        if (N.meta.standIn) warnings.push('the narration is a STAND-IN voice: fine for a draft, but the final needs Wesley\'s voice (motion_narrate with source clone or recording)');
        else checks.push(`narration: ${N.meta.voice}`);
      }
    }

    // the score, synthesised in the page on the composition's beat grid, with any library sounds it names decoded beside it
    let audio = null, credits = null;
    const lib = soundsFor(html);
    for (const id of lib.missing) errors.push(`rule: the sound ${id} is not in the library (or its file is gone): fetch it with sfx_fetch`);
    if (lib.records.length) {
      const by = lib.records.filter(r => r.needsCredit).length;
      credits = path.join(out, 'credits.txt'); fs.writeFileSync(credits, creditsText(lib.records));
      checks.push(`${lib.records.length} recorded sound${lib.records.length > 1 ? 's' : ''} from the library (${lib.records.length - by} CC0/public domain, ${by} CC BY${by ? ': the credit lines are in credits.txt and must go with the post' : ''})`);
      for (const r of lib.records) for (const f of r.flags || []) warnings.push(`sound ${r.id} ("${r.title}"): ${f}`);
    }
    if (meta.score && meta.soundKit && !lib.missing.length) {
      onStep('synthesising the score');
      try {
        const a = await probe.page.evaluate(([r, sounds]) => window.__score(r, sounds), [48000, lib.sounds]);
        audio = path.join(out, 'score.wav'); fs.writeFileSync(audio, Buffer.from(a.b64, 'base64'));
        const v = await run(['-hide_banner', '-i', audio, '-af', 'volumedetect', '-f', 'null', '-']), mean = +(/mean_volume: (-?[\d.]+)/.exec(v.out)?.[1] ?? -99);
        if (a.peak < .02) errors.push('the score is silent: score(S) placed no sounds');
        else if (a.peak >= .999) warnings.push('the score clips (peak at full scale): lower some gains');
        else if (mean < -32) warnings.push(`the score is very quiet (mean ${mean} dB): raise the gains`);
        else checks.push(`score synthesised: peak ${(20 * Math.log10(a.peak)).toFixed(1)} dB, mean ${mean} dB`);
      } catch (e) { errors.push('the score could not be synthesised: ' + String(e.message || e).split('\n')[0].slice(0, 300)); }
    }
    // a series with a loudness target and no narration: the score itself is finished to it (two-pass loudnorm, then a limiter)
    if (audio && !N && seriesCfg?.loudness && !errors.length) {
      onStep('finishing the loudness');
      const L = seriesCfg.loudness, p1 = await run(['-hide_banner', '-i', audio, '-af', `loudnorm=I=${L.lufs}:TP=${L.truePeak}:LRA=11:print_format=json`, '-f', 'null', '-']), j = /\{[\s\S]*?\}/.exec(p1.out.slice(p1.out.lastIndexOf('{') - 1));
      let ln = `loudnorm=I=${L.lufs}:TP=${L.truePeak}:LRA=11`; try { const v = JSON.parse(j[0]); ln += `:measured_I=${v.input_i}:measured_TP=${v.input_tp}:measured_LRA=${v.input_lra}:measured_thresh=${v.input_thresh}:offset=${v.target_offset}:linear=true`; } catch {}
      const fin = path.join(out, 'score-finished.wav'), p2 = await run(['-y', '-loglevel', 'error', '-i', audio, '-af', `${ln},alimiter=limit=${Math.pow(10, L.truePeak / 20).toFixed(3)}:level=disabled`, '-ar', '48000', fin]);
      if (p2.code !== 0) errors.push('the loudness pass failed: ' + p2.out.trim().slice(-300)); else { audio = fin; checks.push(`score finished to ${L.lufs} LUFS, true peak ${L.truePeak} dBTP`); }
    }
    // the mix: the narration over the score, the music ducked under the voice, then the series' loudness
    if (audio && N && meta.voice.length && !errors.length) {
      onStep('mixing the narration over the score');
      const lines = meta.voice.filter(v => N.words[v.line]), ins = lines.flatMap(v => ['-i', path.join(N.dir, v.line + '.wav')]);
      const vo = lines.map((v, i) => `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(v.at * 1000)}|${Math.round(v.at * 1000)},volume=1.6[v${i}]`).join(';');
      const graph = `${vo};${lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${lines.length}:normalize=0:duration=longest,apad=whole_dur=${meta.duration}[vo];[vo]asplit[vk][vm];[0:a][vk]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=350[duck];[duck][vm]amix=inputs=2:normalize=0:duration=first[mix]`;
      const mixed = path.join(out, 'mix.wav'), m1 = await run(['-y', '-loglevel', 'error', '-i', audio, ...ins, '-filter_complex', graph, '-map', '[mix]', '-ar', '48000', mixed]);
      if (m1.code !== 0) errors.push('the narration could not be mixed: ' + m1.out.trim().slice(-300));
      else {
        const L = seriesCfg.loudness || { lufs: -15, truePeak: -1.5 };
        const p1 = await run(['-hide_banner', '-i', mixed, '-af', `loudnorm=I=${L.lufs}:TP=${L.truePeak}:LRA=11:print_format=json`, '-f', 'null', '-']), j = /\{[\s\S]*?\}/.exec(p1.out.slice(p1.out.lastIndexOf('{') - 1));
        let ln = `loudnorm=I=${L.lufs}:TP=${L.truePeak}:LRA=11`; try { const v = JSON.parse(j[0]); ln += `:measured_I=${v.input_i}:measured_TP=${v.input_tp}:measured_LRA=${v.input_lra}:measured_thresh=${v.input_thresh}:offset=${v.target_offset}:linear=true`; } catch {}
        const fin = path.join(out, 'score-mixed.wav'), p2 = await run(['-y', '-loglevel', 'error', '-i', mixed, '-af', `${ln},alimiter=limit=${Math.pow(10, L.truePeak / 20).toFixed(3)}:level=disabled`, '-ar', '48000', fin]);
        if (p2.code !== 0) errors.push('the loudness pass failed: ' + p2.out.trim().slice(-300));
        else { audio = fin; fs.rmSync(mixed, { force: true }); checks.push(`narration mixed over the score, music ducked under the voice, loudness finished to ${L.lufs} LUFS`); }
      }
      fs.writeFileSync(path.join(out, 'captions.srt'), srt(N.words, meta.voice));
    }
    errors.push(...plog);
    await probe.ctx.close();

    // contact sheets: twelve stills each, numbered with time and beat
    onStep('laying out the contact sheets');
    const port = meta.height > meta.width, cols = port ? 6 : 4, tw = port ? 300 : 440, th = Math.round(tw * meta.height / meta.width), sheets = [];
    await an.setViewportSize({ width: cols * (tw + 12) + 12, height: 400 });
    for (let k = 0; k < shots.length; k += SHEET) {
      const part = shots.slice(k, k + SHEET);
      await an.setContent(`<body style="margin:0;background:#111;font:500 15px Arial;color:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:12px;padding:12px">${part.map((b, i) => { const s = stills[k + i]; return `<div><img src="${uri(b)}" style="width:${tw}px;height:${th}px;display:block"><div style="padding:5px 0 0">#${s.n} · ${s.t.toFixed(2)} s · beat ${s.beat}</div></div>`; }).join('')}</div></body>`);
      await an.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
      const f = path.join(out, `contact-sheet-${sheets.length + 1}.jpg`); fs.writeFileSync(f, await an.screenshot({ type: 'jpeg', quality: 84, fullPage: true })); sheets.push(f);
    }
    await an.context().close();

    const result = { meta: { ...meta, frames, format: fmt }, stills, sheets, audio, captions: fs.existsSync(path.join(out, 'captions.srt')) ? path.join(out, 'captions.srt') : null, credits, sounds: lib.records.map(r => ({ id: r.id, licence: r.licence, credit: r.credit })), standIn: !!N?.meta.standIn, errors, warnings, checks, dead: [], offBeatCuts: [], hardColourCuts: [] };
    if (mode === 'stills' || errors.length) return { ...result, seconds: Math.round((Date.now() - started) / 1000) };

    // the video: parallel lanes of frames, each piped straight into its own encoder, then joined
    const draft = mode === 'draft', cap = draft ? { format: 'jpeg', quality: 88, scale: .5 } : { format: 'png', scale: 1 };
    const enc = draft ? ['-preset', 'veryfast', '-crf', '22'] : ['-preset', 'slow', '-crf', '15', '-tune', 'animation'];
    const lanes = Math.max(1, Math.min(6, Math.floor(os.cpus().length / 3), Math.ceil(frames / 90)));
    const per = Math.ceil(frames / lanes), segs = [], greys = []; let done = 0;
    onStep(`painting ${frames} frames in ${lanes} lane${lanes > 1 ? 's' : ''}`);
    await Promise.all(Array.from({ length: lanes }, async (_, k) => {
      const from = k * per, to = Math.min(frames, from + per); if (from >= to) return;
      const seg = path.join(out, `seg-${String(k).padStart(3, '0')}.mp4`); segs[k] = seg;
      const lane = await open(browser, url, meta, errors); await wait(lane.page);
      // motion blur (subframes: 2–4): each frame is painted that many times across the shutter and the samples are averaged (tmix)
      const sub = meta.subframes, blur = sub > 1 ? `tmix=frames=${sub}:weights=${Array(sub).fill(1).join(' ')},select='not(mod(n+1,${sub}))',setpts=N/(${meta.fps}*TB),` : '';
      const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps * sub), '-c:v', cap.format === 'png' ? 'png' : 'mjpeg', '-i', '-',
        '-vf', blur + 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', ...enc, '-pix_fmt', 'yuv420p', '-r', String(meta.fps), '-g', String(meta.fps * 2), seg], { windowsHide: true });
      let ferr = ''; ff.stderr.on('data', d => ferr += d); const closed = new Promise(r => ff.on('close', r)); ff.stdin.on('error', () => {});
      const th = spawn(FFMPEG, ['-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-c:v', cap.format === 'png' ? 'png' : 'mjpeg', '-i', '-', '-vf', `scale=${GREY.w}:${GREY.h},format=gray`, '-f', 'rawvideo', '-'], { windowsHide: true });
      const gch = []; th.stdout.on('data', d => gch.push(d)); th.stdin.on('error', () => {}); const gdone = new Promise(r => th.on('close', r));
      try {
        for (let i = from; i < to; i++) {
          if (cancelled()) throw new Error('cancelled');
          for (let k = 0; k < sub; k++) { // the samples sit across the frame's shutter: i, i + 1/sub, … (the first one is the frame itself)
            await lane.page.evaluate(t => window.__seek(t), (i + k / sub) / meta.fps);
            const img = await grab(lane.cdp, meta, cap); if (k === 0) th.stdin.write(img);
            if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
          }
          if (++done % 15 === 0) onStep(`painting frame ${done} of ${frames}`);
        }
      } finally { ff.stdin.end(); th.stdin.end(); await lane.ctx.close(); }
      await gdone; greys[k] = Buffer.concat(gch);
      const code = await closed; if (code !== 0) throw new Error('ffmpeg could not encode the frames: ' + ferr.trim().slice(-300));
    }));
    onStep('stitching');
    const list = path.join(out, 'segments.txt'); fs.writeFileSync(list, segs.filter(Boolean).map(s => `file '${s.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
    const silent = path.join(out, 'picture.mp4');
    const j = await run(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
    if (j.code !== 0) throw new Error('ffmpeg could not join the pieces: ' + j.out.trim().slice(-300));
    for (const s of segs) if (s) fs.rmSync(s, { force: true }); fs.rmSync(list, { force: true });

    // every frame scanned: dead stretches (nothing moves) and hard cuts that miss the beat
    onStep('scanning every frame for dead stretches and off-beat cuts');
    const scan = await run(['-hide_banner', '-i', silent, '-vf', `select='gt(scene,0.28)',metadata=print`, '-an', '-f', 'null', '-']);
    const motion = motionScan(Buffer.concat(greys.filter(Boolean)), meta.fps); result.motion = motion.perSecond;
    for (const [s, e] of motion.still) {
      const len = e - s;
      if (s < .05 && e <= .8) continue;                       // the thumbnail hold on frame 0
      if (e >= meta.duration - .05 && len <= 1.0) continue;    // the last card may rest a beat
      if (len < .5) continue;
      // a declared reading hold (holds: [[from, to]] in M.scene): stillness there is intended, so the words can land
      if (meta.holds.some(([a, b]) => s >= a - .25 && e <= b + .6)) { result.heldStill = (result.heldStill || 0) + 1; continue; }
      result.dead.push({ from: +s.toFixed(2), to: +e.toFixed(2), beats: `${(s / spb).toFixed(1)}–${(e / spb).toFixed(1)}` });
    }
    result.hardColourCuts = motion.jumps.map(j => +j.at.toFixed(2));
    if (result.hardColourCuts.length) errors.push(`hard colour cuts at ${result.hardColourCuts.join(', ')} s: the ground changes colour (bone, ink, red, or dark to light) in one bang. A change of colour scheme is never a hard cut. Build a transition of at least half a second to two seconds that belongs to the theme and lands on the beat, for example: ink bleeding through the paper from the key word, mist rolling in and clearing onto the new colour, a ridge or a banner passing across the lens, the red horizon glow rising to flood the frame, dusk to night or night to dawn, the seal's red spreading. Let the sound carry it (a bell, a swell, a roll). The theme is the rule; the imagery can be new.`);
    else checks.push('every change of colour scheme is a managed transition, not a hard cut');
    const cutsAt = [...scan.out.matchAll(/pts_time:([\d.]+)[\s\S]*?lavfi\.scene_score=([\d.]+)/g)].map(m => +m[1]);
    for (const t of cutsAt) if (!onGrid(t)) result.offBeatCuts.push(+t.toFixed(2));
    if (result.dead.length) errors.push(`dead frames: nothing moves ${result.dead.map(d => `${d.from}–${d.to} s (beats ${d.beats})`).join(', ')}. Keep something alive on every frame: a drift, a pulse on the beat, the next element arriving.`);
    else checks.push('every frame scanned: no dead stretches' + (result.heldStill ? ` (${result.heldStill} still stretch${result.heldStill === 1 ? '' : 'es'} inside declared reading holds)` : ''));
    if (result.offBeatCuts.length) errors.push(`hard cuts off the beat at ${result.offBeatCuts.join(', ')} s: every cut lands on a beat or half beat (${spb.toFixed(3)} s per beat)`);
    else checks.push(`${cutsAt.length} hard cut${cutsAt.length === 1 ? '' : 's'} found, all on the beat`);

    const file = path.join(out, draft ? 'draft.mp4' : 'video.mp4');
    const m = audio ? await run(['-y', '-loglevel', 'error', '-i', silent, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', file])
      : await run(['-y', '-loglevel', 'error', '-i', silent, '-c', 'copy', '-movflags', '+faststart', file]);
    if (m.code !== 0) throw new Error('ffmpeg could not lay the score under the picture: ' + m.out.trim().slice(-300));
    fs.rmSync(silent, { force: true });
    const got = await durationOf(file);
    if (Math.abs(got - meta.duration) > 2 / meta.fps + .05) errors.push(`the video is ${got.toFixed(2)} s long, not ${meta.duration} s`);
    else checks.push(`${frames} frames painted and stitched, ${got.toFixed(2)} s at ${meta.fps} fps${meta.subframes > 1 ? `, ${meta.subframes} subframes blended per frame for motion blur` : ''}${audio ? ' with the score' : ''}${draft ? ' (draft, half size)' : ''}`);
    return { ...result, file, seconds: Math.round((Date.now() - started) / 1000) };
  } finally { await browser.close().catch(() => {}); }
}
