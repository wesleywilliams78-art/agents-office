// Video studio: a plain spec in, a HyperFrames project out, and a measured check of the result.
// Card kinds: text (a line of type), stat (a number that counts up), waterfall (start minus costs equals end). Motion: transitions
// between cards, kinetic entrances, a drifting mountain backdrop, emphasis on a marked word, optional voiceover with live captions.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BRAND, FORMATS, MAX_CARDS, MAX_SECONDS, HF, tokens } from './shared.mjs';
import { html as emHtml, kindCss, kineticEntrance, plain, ridges, stat as statKind, waterfall as waterfallKind } from './kinds.mjs';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = rgb => { const c = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const at = n => (+n).toFixed(2);

export const TRANSITIONS = ['fade', 'cut', 'push', 'rise', 'wipe', 'scale'];
export const TEXT_MOTIONS = ['fade', 'rise', 'words', 'kinetic'];
export const KINDS = ['text', 'stat', 'waterfall'];
export const VOICES = ['wesley', 'bm_george', 'bf_emma', 'bf_isabella', 'am_adam', 'am_michael', 'af_heart', 'af_nova'];
// the motion presets: how one card gives way to the next, how the words arrive, and whether mountains drift behind. Nothing bounces.
export const STYLES = {
  calm: { transition: 'fade', textMotion: 'fade', backdrop: 'none' },        // slow, even: information the viewer must read
  editorial: { transition: 'wipe', textMotion: 'rise', backdrop: 'none' },   // a clean reveal: opinion and teaching
  punchy: { transition: 'push', textMotion: 'words', backdrop: 'none' },     // words arrive one by one
  bold: { transition: 'scale', textMotion: 'rise', backdrop: 'none' },       // statement cards
  impact: { transition: 'push', textMotion: 'kinetic', backdrop: 'ridges' }, // a different entrance per card, drifting mountains: the Reel look
};

/** Check a spec and fill in the defaults. Returns { spec } or { problems }. */
export function normalise(input) {
  const T = tokens(), p = [], s = input || {};
  const brand = T[s.brand || 'wrw']; if (!brand) p.push('brand must be one of ' + Object.keys(T).join(', '));
  const format = s.format || '9:16'; if (!FORMATS[format]) p.push('format must be one of ' + Object.keys(FORMATS).join(', '));
  const cards = Array.isArray(s.cards) ? s.cards : [];
  if (!cards.length) p.push('cards: give at least one card'); if (cards.length > MAX_CARDS) p.push(`cards: at most ${MAX_CARDS}`);
  const out = [];
  cards.forEach((c, i) => {
    const n = `card ${i + 1}`, kind = c?.kind || 'text'; if (!KINDS.includes(kind)) return p.push(`${n}: kind must be one of ${KINDS.join(', ')}`);
    const text = String(c?.text || '').trim();
    if (!text && kind !== 'waterfall') return p.push(`${n}: text is empty`);
    if (text.length > 300) p.push(`${n}: text is over 300 characters`);
    const ground = c.ground || Object.keys(brand?.grounds || {})[0];
    if (brand && !brand.grounds[ground]) p.push(`${n}: ground must be one of ${Object.keys(brand.grounds).join(', ')}`);
    const seconds = c.seconds ?? 3; if (!(seconds >= 1 && seconds <= 60)) p.push(`${n}: seconds must be 1 to 60`);
    const card = { kind, text, ground, seconds, kicker: String(c.kicker || '').slice(0, 60), sub: String(c.sub || '').slice(0, 200), say: c.say ? String(c.say).slice(0, 400) : undefined };
    if (kind === 'stat') {
      if (typeof c.value !== 'number' || !Number.isFinite(c.value)) p.push(`${n}: a stat card needs a numeric value`);
      Object.assign(card, { value: c.value, prefix: String(c.prefix || '').slice(0, 4), suffix: String(c.suffix || '').slice(0, 4), decimals: c.decimals });
    }
    if (kind === 'waterfall') {
      const items = Array.isArray(c.items) ? c.items : [];
      if (items.length < 2 || items.length > 7) p.push(`${n}: a waterfall card needs 2 to 7 items`);
      if (items.some(it => typeof it?.value !== 'number' || !String(it?.label || '').trim())) p.push(`${n}: every waterfall item needs a label and a numeric value`);
      Object.assign(card, { prefix: String(c.prefix || '').slice(0, 4), suffix: String(c.suffix || '').slice(0, 4), items: items.map(it => ({ label: String(it.label || '').slice(0, 24), value: +it.value, type: it.type === 'total' ? 'total' : undefined })) });
    }
    out.push(card);
  });
  const total = out.reduce((n, c) => n + c.seconds, 0); if (total > MAX_SECONDS) p.push('the video is over ' + MAX_SECONDS + ' seconds');
  const deliver = ['video', 'stills', 'both'].includes(s.deliver) ? s.deliver : 'video';
  if (s.style !== undefined && !STYLES[s.style]) p.push('style must be one of ' + Object.keys(STYLES).join(', '));
  if (s.transition !== undefined && !TRANSITIONS.includes(s.transition)) p.push('transition must be one of ' + TRANSITIONS.join(', '));
  if (s.text_motion !== undefined && !TEXT_MOTIONS.includes(s.text_motion)) p.push('text_motion must be one of ' + TEXT_MOTIONS.join(', '));
  if (s.backdrop !== undefined && !['ridges', 'none'].includes(s.backdrop)) p.push('backdrop must be ridges or none');
  const vIn = s.voice === true ? {} : s.voice && typeof s.voice === 'object' ? s.voice : null;
  if (vIn?.voice && !VOICES.includes(vIn.voice)) p.push('voice.voice must be one of ' + VOICES.join(', '));
  if (p.length) return { problems: p };
  const st = STYLES[s.style || 'calm'], transition = s.transition || st.transition, textMotion = s.text_motion || st.textMotion;
  const overlap = ['push', 'rise', 'wipe', 'scale'].includes(transition) ? Math.min(1, Math.max(0.3, s.overlap ?? 0.6)) : 0;
  const music = s.music && (s.music.file || s.music.prompt) ? { file: s.music.file ? String(s.music.file) : undefined, prompt: s.music.prompt ? String(s.music.prompt).slice(0, 500) : undefined, volume: Math.min(1, Math.max(0.05, s.music.volume ?? 0.25)) } : undefined;
  const voice = vIn ? { voice: vIn.voice || 'wesley', speed: Math.min(1.25, Math.max(0.8, vIn.speed ?? 1)) } : undefined;
  const captions = s.captions ?? (!!voice && out.some(c => c.say && plain(c.say).trim() !== plain(c.text).trim()));
  return { spec: { deliver, title: String(s.title || 'video').slice(0, 80), brand: s.brand || 'wrw', format, cards: out, logo: s.logo === 'none' ? 'none' : 'auto', style: s.style || 'calm', transition, textMotion, backdrop: s.backdrop || st.backdrop, overlap, align: s.align === 'center' ? 'center' : 'left', fade: Math.min(1.2, Math.max(0.2, s.fade ?? 0.5)), music, voice, captions: !!(voice && captions), totalSeconds: total } };
}

/** The timing of one card: when it starts, when its words start, and when everything on it has settled (measure and still time). */
export function cardTiming(spec, i) {
  const ov = spec.overlap || 0; let start = 0; for (let k = 0; k < i; k++) start += spec.cards[k].seconds;
  const c = spec.cards[i], ts = start + (i > 0 && ov ? ov * 0.7 : 0.15), n = Math.max(1, plain(c.text).split(/\s+/).length);
  const stagger = c.vo ? Math.min(0.3, Math.max(0.06, c.vo.dur * 0.85 / n)) : 0.08;
  let done;
  if (c.kind === 'stat') done = ts + 0.25 + Math.min(1.6, Math.max(0.9, c.seconds * 0.45)) + 0.5;
  else if (c.kind === 'waterfall') { const step = Math.max(0.45, Math.min(0.8, (c.seconds - 1.2) / c.items.length)); done = ts + 0.35 + c.items.length * step + 0.8; }
  else done = ts + (spec.textMotion === 'words' ? n * stagger + 0.5 : spec.textMotion === 'rise' ? 0.8 : spec.textMotion === 'kinetic' ? 0.7 : spec.fade + 0.1) + 0.2;
  return { start, ts, stagger, n, settle: Math.max(0.2, Math.min(done, start + c.seconds - 0.3)) };
}
/** When each card's words have settled (seconds from the start of the video): the moment to measure and to take its still. */
export const settleTimes = spec => spec.cards.map((_, i) => cardTiming(spec, i).settle);

// the biggest size at which the words (estimated) fit the safe box; the measured check then corrects the estimate
function fit(text, boxW, boxH, brandFont, scale) {
  const cw = brandFont === 'Newsreader' ? 0.46 : 0.56, lh = 1.1;
  for (let size = 160; size >= 48; size -= 4) {
    const per = Math.max(4, Math.floor(boxW / (size * cw))); let lines = 1, cur = 0;
    for (const w of plain(text).split(/\s+/)) { const n = w.length + (cur ? 1 : 0); if (cur + n > per && cur) { lines++; cur = w.length; } else cur += n; }
    if (lines * size * lh <= boxH) return Math.round(size * scale);
  }
  return Math.round(48 * scale);
}
const wordsHtml = text => text.split(/\s+/).map(w => { const m = /^\*([^*]+)\*([.,!?;:]*)$/.exec(w); return m ? `<span class="w"><span class="em">${esc(m[1])}<i class="ul"></i></span>${esc(m[2])}</span>` : `<span class="w">${esc(plain(w))}</span>`; }).join(' ');

/** Write the HyperFrames project for a normalised spec into dir. `scale` shrinks the type when the check found overflow. */
export function writeProject(spec, dir, scale = 1) {
  const T = tokens()[spec.brand], F = FORMATS[spec.format];
  fs.rmSync(dir, { recursive: true, force: true });
  for (const d of ['fonts', 'assets', 'audio']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const fonts = Object.values(T.fonts); const faces = [];
  for (const f of fonts) for (const file of [f.file, f.italic].filter(Boolean)) { fs.copyFileSync(path.join(BRAND, 'fonts', file), path.join(dir, 'fonts', file)); faces.push(`@font-face { font-family: "${f.family}"; font-weight: ${f.weight}; font-style: ${file.includes('italic') ? 'italic' : 'normal'}; src: url("fonts/${file}") format("woff2"); }`); }
  const used = new Set(spec.cards.map(c => T.grounds[c.ground].logo).filter(Boolean));
  if (spec.logo !== 'none') for (const l of used) fs.copyFileSync(path.join(BRAND, 'logos', l), path.join(dir, 'assets', l));
  const hasVoice = spec.cards.some(c => c.vo);
  let audio = '';
  if (spec.music?.file) { const ext = path.extname(spec.music.file) || '.mp3'; fs.copyFileSync(spec.music.file, path.join(dir, 'audio', 'music' + ext)); audio += `<audio id="music" src="audio/music${ext}" data-start="0" data-duration="${spec.totalSeconds}" data-track-index="9" data-volume="${(spec.music.volume * (hasVoice ? 0.55 : 1)).toFixed(2)}"></audio>`; }
  const display = T.fonts.display, text = T.fonts.text, boxW = F.w - 2 * F.side, capSpace = spec.captions ? Math.round(F.h * 0.13) : 0, boxH = F.h - F.top - F.bottom - 220 - capSpace;
  const ov = spec.overlap || 0, last = spec.cards.length - 1, tm = spec.textMotion || 'fade', tr = spec.transition || 'fade';
  const logoW = Math.round(Math.min(F.w, F.h) * 0.2), logoTop = Math.max(48, Math.round(F.top * 0.4));
  let scenes = '', js = '';
  spec.cards.forEach((c, i) => {
    const g = T.grounds[c.ground], id = 's' + (i + 1), tg = cardTiming(spec, i), t = tg.start, f = spec.fade;
    const accent = contrast(g.accent, g.bg) >= 3 ? g.accent : g.fg;
    const size = fit(c.text, boxW, boxH, display.family, scale);
    const logo = spec.logo !== 'none' && g.logo ? `<img class="logo" src="assets/${g.logo}" alt="" style="left:${F.side}px;top:${logoTop}px;width:${logoW}px">` : spec.logo !== 'none' && g.wordmark ? `<div class="logo wordmark" style="left:${F.side}px;top:${logoTop}px;color:${g.accent}">creamy</div>` : '';
    const dur = c.seconds + (ov && i < last ? ov : 0);
    const back = spec.backdrop === 'ridges' ? ridges(id, g, F, t, dur) : { html: '', js: '' };
    let body = '', bodyJs = '';
    if (c.kind === 'stat') { const k = statKind(id, c, g, F, tg.ts, c.seconds, accent, scale, capSpace); body = k.html; bodyJs = k.js; }
    else if (c.kind === 'waterfall') { const k = waterfallKind(id, c, g, F, tg.ts, c.seconds, accent, capSpace); body = k.html; bodyJs = k.js; }
    else {
      body = `
        <div class="stack" style="left:${F.side}px;top:${F.top}px;width:${boxW}px;height:${F.h - F.top - F.bottom - capSpace}px;text-align:${spec.align}">
          ${c.kicker ? `<div class="kicker" style="color:${accent}">${esc(c.kicker)}</div>` : ''}
          <div class="txt" style="font-size:${size}px">${tm === 'words' ? wordsHtml(c.text) : emHtml(c.text)}</div>
          ${c.sub ? `<div class="sub">${esc(c.sub)}</div>` : ''}
        </div>`;
      if (c.kicker) bodyJs += `
      tl.fromTo("#${id} .kicker", { opacity: 0 }, { opacity: 1, duration: ${f}, ease: "power1.out" }, ${at(tg.ts - 0.1)});`;
      if (tm === 'words') bodyJs += `
      tl.fromTo("#${id} .txt .w", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, stagger: ${tg.stagger.toFixed(3)}, ease: "power2.out" }, ${at(tg.ts)});`;
      else if (tm === 'rise') bodyJs += `
      tl.fromTo("#${id} .txt", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${at(tg.ts)});`;
      else if (tm === 'kinetic') bodyJs += kineticEntrance(id, i, tg.ts);
      else bodyJs += `
      tl.fromTo("#${id} .txt", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: ${f}, ease: "power1.out" }, ${at(tg.ts)});`;
      if (/\*[^*]+\*/.test(c.text)) bodyJs += `
      tl.fromTo("#${id} .txt .em .ul", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, ${at(tg.settle - 0.35)});`;
      if (c.sub) bodyJs += `
      tl.fromTo("#${id} .sub", { opacity: 0 }, { opacity: 1, duration: ${f}, ease: "power1.out" }, ${at(tg.ts + 0.4)});`;
      if (tr === 'fade' && c.seconds >= 1.5) bodyJs += `
      tl.to("#${id} .stack", { opacity: 0, duration: 0.3, ease: "power1.in" }, ${at(t + c.seconds - 0.32)});`;
    }
    // voiceover: the spoken line starts as the card lands; the caption below it lights word by word as it is said
    let cap = '', capJs = '';
    if (c.vo) {
      const vs = tg.ts + 0.1, ext = path.extname(c.vo.file) || '.wav'; fs.copyFileSync(c.vo.file, path.join(dir, 'audio', `vo-${i + 1}${ext}`));
      audio += `
      <audio id="vo${i + 1}" src="audio/vo-${i + 1}${ext}" data-start="${at(vs)}" data-duration="${at(c.vo.dur)}" data-track-index="${10 + i}" data-volume="1"></audio>`;
      if (spec.captions) {
        const said = plain(c.say || c.text).split(/\s+/), chars = said.reduce((n, w) => n + w.length + 1, 0); let run = 0;
        cap = `<div class="cap" style="left:${F.side}px;bottom:${F.bottom + 28}px;width:${boxW}px">${said.map(w => `<span class="cw">${esc(w)}</span>`).join(' ')}</div>`;
        capJs = `
      tl.fromTo("#${id} .cap", { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out" }, ${at(vs)});` + said.map((w, k) => { const s0 = vs + (run / chars) * c.vo.dur * 0.97; run += w.length + 1; return `
      tl.to("#${id} .cap .cw:nth-child(${k + 1})", { opacity: 1, duration: 0.12, ease: "none" }, ${at(s0)});`; }).join('');
      }
    }
    scenes += `
      <div id="${id}" class="scene clip" data-start="${t}" data-duration="${dur}" data-track-index="${i % 2}" style="background:${g.bg};color:${g.fg};--accent:${accent}">
        ${back.html}
        ${logo}${body}
        ${cap}
      </div>`;
    if (i > 0 && ov) { // how this card arrives over the one before (which stays under it for the overlap)
      const prev = '#s' + i;
      if (tr === 'push') js += `
      tl.fromTo("#${id}", { xPercent: 100 }, { xPercent: 0, duration: ${ov}, ease: "power3.inOut" }, ${at(t)});
      tl.to("${prev}", { xPercent: -28, duration: ${ov}, ease: "power3.inOut" }, ${at(t)});`;
      else if (tr === 'rise') js += `
      tl.fromTo("#${id}", { yPercent: 100 }, { yPercent: 0, duration: ${ov}, ease: "power3.inOut" }, ${at(t)});`;
      else if (tr === 'wipe') js += `
      tl.fromTo("#${id}", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: ${ov}, ease: "power2.inOut" }, ${at(t)});`;
      else if (tr === 'scale') js += `
      tl.fromTo("#${id}", { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: ${ov}, ease: "power2.out" }, ${at(t)});`;
    }
    js += back.js + bodyJs + capJs;
  });
  const center = spec.align === 'center';
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${F.w}, height=${F.h}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      ${faces.join('\n      ')}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${F.w}px; height: ${F.h}px; overflow: hidden; background: ${T.grounds[spec.cards[0].ground].bg}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .logo { position: absolute; height: auto; z-index: 3; }
      .wordmark { font-family: "${(T.fonts.script || display).family}", cursive; font-size: ${Math.round(logoW * 0.5)}px; line-height: 1; }
      .stack { position: absolute; z-index: 2; display: flex; flex-direction: column; justify-content: center; align-items: ${center ? 'center' : 'flex-start'}; gap: 28px; }
      .kicker { font-family: "${text.family}", sans-serif; font-weight: ${text.weight}; font-size: ${Math.round(F.w * 0.03)}px; letter-spacing: 0.2em; text-transform: uppercase; }
      .txt { font-family: "${display.family}", Georgia, serif; font-weight: ${display.weight}; line-height: 1.1; letter-spacing: -0.01em; width: 100%; text-wrap: balance; }
      .w { display: inline-block; }
      .sub { font-family: "${text.family}", sans-serif; font-weight: ${text.weight}; font-size: ${Math.round(F.w * 0.026)}px; line-height: 1.35; opacity: 0.85; width: 100%; }
      .cap { position: absolute; z-index: 4; font-family: "${text.family}", sans-serif; font-weight: ${text.weight}; font-size: ${Math.round(F.w * 0.04)}px; line-height: 1.3; text-align: ${center ? 'center' : 'left'}; opacity: 0; }
      .cap .cw { opacity: 0.38; display: inline-block; }${kindCss(F, T)}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${spec.totalSeconds}" data-width="${F.w}" data-height="${F.h}">${scenes}
      ${audio}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });${js}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'hyperframes.json'), JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry', paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: true }, authoringSkill: 'motion-graphics' }, null, 2));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id: path.basename(dir), name: spec.title, createdAt: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: path.basename(dir), private: true, type: 'module', scripts: { check: `npx --yes ${HF} check`, render: `npx --yes ${HF} render` } }, null, 2));
}

/** Measure the real page: everything inside the safe area, captions clear of the type, logo clear, fonts loaded, contrast. Returns { pass, issues, overflow }. */
export async function measure(spec, dir) {
  const T = tokens()[spec.brand], F = FORMATS[spec.format], issues = [], warnings = []; let overflow = false;
  for (const [i, c] of spec.cards.entries()) { const g = T.grounds[c.ground], r = contrast(g.fg, g.bg); if (r < 3) issues.push(`card ${i + 1}: contrast ${r.toFixed(1)}:1 is below 3:1 (${g.fg} on ${g.bg})`); else if (r < 4.5) warnings.push(`card ${i + 1}: contrast ${r.toFixed(1)}:1 (large type only)`); }
  let chromium; try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('playwright-core')); } catch {} }
  if (!chromium) return { pass: !issues.length, issues, warnings: [...warnings, 'layout was not measured: playwright is not installed'], overflow: false };
  let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
  try {
    const page = await browser.newPage({ viewport: { width: F.w, height: F.h } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(pathToFileURL(path.join(dir, 'index.html')).href); await page.waitForFunction(() => !!(window.__timelines && window.__timelines.main), null, { timeout: 30000, polling: 200 });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
    const settle = settleTimes(spec);
    for (const [i, c] of spec.cards.entries()) {
      const att = settle[i];
      const m = await page.evaluate(({ att, id }) => {
        window.__timelines.main.seek(att);
        const q = s => { const e = document.querySelector(`#${id} ${s}`); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; };
        const all = s => [...document.querySelectorAll(`#${id} ${s}`)].map(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; });
        const txt = document.querySelector(`#${id} .txt`), sc = txt ? { w: txt.scrollWidth, cw: txt.clientWidth } : null;
        return { txt: q('.txt'), kicker: q('.kicker'), sub: q('.sub'), logo: q('.logo'), stack: q('.stack'), cap: q('.cap'), blocks: [...all('.statlabel'), ...all('.statnum'), ...all('.wftitle'), ...all('.wfrow')], over: sc ? sc.w > sc.cw + 2 : false, op: txt ? +getComputedStyle(txt).opacity : 1 };
      }, { att, id: 's' + (i + 1) });
      const inside = (b, name) => { if (!b) return; if (b.x < F.side - 2 || b.r > F.w - F.side + 2 || b.y < F.top - 2 || b.b > F.h - F.bottom + 2) { issues.push(`card ${i + 1}: the ${name} runs outside the safe area`); if (['text', 'subline', 'content'].includes(name)) overflow = true; } };
      inside(m.txt, 'text'); inside(m.kicker, 'label'); inside(m.sub, 'subline'); inside(m.cap, 'caption'); m.blocks.forEach(b => inside(b, 'content'));
      if (m.over) { issues.push(`card ${i + 1}: a word is wider than the frame`); overflow = true; }
      if (m.op < 0.9) warnings.push(`card ${i + 1}: text not fully visible at ${att.toFixed(1)} s (opacity ${m.op.toFixed(2)})`);
      if (m.logo && m.txt && m.logo.b > m.txt.y - 12 && m.logo.r > m.txt.x) issues.push(`card ${i + 1}: the logo touches the text`);
      if (m.cap && m.txt && m.txt.b > m.cap.y - 10) { issues.push(`card ${i + 1}: the caption touches the text`); overflow = true; }
      if (m.cap && m.blocks.some(b => b.b > m.cap.y - 10)) { issues.push(`card ${i + 1}: the caption touches the chart or number`); overflow = true; }
      if (m.cap && m.sub && m.sub.b > m.cap.y - 10) issues.push(`card ${i + 1}: the caption touches the small line`);
    }
    if (errs.length) issues.push('the page raised an error: ' + errs[0]);
  } finally { await browser.close(); }
  return { pass: !issues.length, issues, warnings, overflow };
}
