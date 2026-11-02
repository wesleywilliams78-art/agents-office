// Manual Magic University: shared pieces of the recorder. Paths, the browser, and the on-screen overlay
// (a visible cursor that glides, a click ring and the caption bar), plus a timeline of steps and waits for edit.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE = path.join(ROOT, '.auth', 'state.json');
export const WORK = id => path.join(ROOT, 'work', id);
export const SITE = 'https://www.manualmagic.ai';
export const DELIVER = 'G:\\My Drive\\006 - Manual Magic\\Manual Magic University';
// The platform gets 1920×988; edit.mjs adds the 92 px caption bar underneath, so a caption never covers a field.
export const W = 1920, H = 1080, BAR = 92, VIEW_H = H - BAR;
export const NAVY = '#042549', ORANGE = '#f5842c';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function loadScript(id) {
  const file = path.join(ROOT, 'videos', id, 'script.mjs');
  if (!fs.existsSync(file)) throw new Error(`no script at ${file}`);
  return (await import(pathToFileURL(file).href)).default;
}

/** This PC's Chrome, driven by Playwright. */
export async function browser({ headed = false } = {}) {
  return chromium.launch({ channel: 'chrome', headless: !headed, args: [`--window-size=${W},${H + 140}`] });
}

/** A context with Wesley's saved login. Fails plainly when he hasn't logged in yet. */
export async function context(b, extra = {}) {
  if (!fs.existsSync(STATE)) throw new Error('no saved login: ask Wesley to run `node recorder/login.mjs` and log in by hand');
  return b.newContext({ storageState: STATE, viewport: { width: W, height: VIEW_H }, deviceScaleFactor: 1, ...extra });
}

const font = f => fs.readFileSync(path.join(ROOT, 'assets', 'fonts', f)).toString('base64');
export const FONT_CSS = `@font-face{font-family:'MMU Jost';font-weight:500;src:url(data:font/woff2;base64,${font('jost-latin-500-normal.woff2')}) format('woff2')}
@font-face{font-family:'MMU Jost';font-weight:300;src:url(data:font/woff2;base64,${font('jost-latin-300-normal.woff2')}) format('woff2')}`;

// Runs in every page before its own scripts, so the overlay survives navigation. Node re-applies the caption and cursor after each load.
const OVERLAY = `(() => {
  const CSS = ${JSON.stringify(FONT_CSS)} + \`
  #mmu-cursor{position:fixed;left:0;top:0;width:34px;height:34px;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
  #mmu-ring{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border:3px solid ${ORANGE};border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0}
  #mmu-bar{display:none}\`;
  const ARROW = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 2.5v17.2l4.6-4.3 2.9 6.6 2.7-1.2-2.9-6.5h6.3z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  let pos = { x: -200, y: -200 };
  function build() {
    if (!document.body || document.getElementById('mmu-cursor')) return;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const c = document.createElement('div'); c.id = 'mmu-cursor'; c.innerHTML = ARROW; document.body.appendChild(c);
    const r = document.createElement('div'); r.id = 'mmu-ring'; document.body.appendChild(r);
    const b = document.createElement('div'); b.id = 'mmu-bar'; b.innerHTML = '<b></b><span></span>'; document.body.appendChild(b);
    place(pos.x, pos.y);
  }
  function place(x, y) { pos = { x, y }; const c = document.getElementById('mmu-cursor'); if (c) c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)'; }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  window.__mmu = {
    caption(n, html) { build(); const b = document.getElementById('mmu-bar'); if (!b) return; b.querySelector('b').textContent = n || ''; b.querySelector('b').style.display = n ? '' : 'none'; b.querySelector('span').innerHTML = html || ''; b.style.opacity = html ? 1 : 0; },
    jump(x, y) { build(); place(x, y); },
    glide(x, y, ms) { build(); const a = { ...pos }, t0 = performance.now(); return new Promise(done => { const f = now => { const k = Math.min(1, (now - t0) / ms), e = ease(k); place(a.x + (x - a.x) * e, a.y + (y - a.y) * e); k < 1 ? requestAnimationFrame(f) : done(); }; requestAnimationFrame(f); }); },
    ring(x, y) { const r = document.getElementById('mmu-ring'); if (!r) return; r.style.left = x + 'px'; r.style.top = y + 'px'; r.animate([{ opacity: .95, transform: 'scale(.45)' }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 520, easing: 'ease-out' }); },
    pos: () => pos,
  };
  document.addEventListener('DOMContentLoaded', build); if (document.readyState !== 'loading') build();
})();`;

/** The caption bar as a page of its own, rendered to a still by edit.mjs (and for rehearsal sheets). *word* turns orange. */
export const barHtml = (n, text) => `<html><head><style>${FONT_CSS}
body{margin:0;width:${W}px;height:${BAR}px;background:${NAVY};display:flex;align-items:center;gap:22px;padding:0 56px;box-sizing:border-box;font-family:'MMU Jost',sans-serif}
b{display:inline-flex;align-items:center;justify-content:center;min-width:46px;height:46px;border-radius:23px;background:${ORANGE};color:#fff;font-weight:500;font-size:26px}
span{color:#fff;font-weight:500;font-size:36px;letter-spacing:.2px} em{font-style:normal;color:${ORANGE}}</style></head>
<body>${n ? `<b>${n}</b>` : ''}<span>${String(text || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).replace(/\*(.+?)\*/g, '<em>$1</em>')}</span></body></html>`;

/** The director: owns the page, the cursor, the caption and the timeline. */
export async function director(page, { rehearse = false, reuse = false, pace = 1 } = {}) {
  const k = 1 / pace;   // pace 0.9 → every glide, pause and keystroke about 11% slower
  await page.addInitScript(OVERLAY);
  const t0 = Date.now(), events = [];
  let cursor = { x: W * 0.62, y: H * 0.42 }, cap = { n: '', html: '' };
  const t = () => (Date.now() - t0) / 1000;
  const reapply = async () => { await page.evaluate(([c, k]) => { window.__mmu.jump(c.x, c.y); window.__mmu.caption(k.n, k.html); }, [cursor, cap]).catch(() => {}); };
  page.on('load', () => { reapply(); });

  const ui = {
    page, rehearse, reuse, events, t,
    reapply,
    /** Caption text. *word* turns orange. */
    async caption(n, text) { cap = { n: String(n || ''), html: String(text || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).replace(/\*(.+?)\*/g, '<em>$1</em>') }; await reapply(); },
    /** Glide the cursor to a point, at a speed that reads as a hand, not a robot. */
    async moveTo(x, y) {
      const d = Math.hypot(x - cursor.x, y - cursor.y), ms = Math.round(k * Math.min(1100, Math.max(420, 300 + d * 0.55)));
      await page.evaluate(([x, y, ms]) => window.__mmu.glide(x, y, ms), [x, y, ms]);
      cursor = { x, y }; await page.mouse.move(x, y);
    },
    async point(locator) {
      await locator.waitFor({ state: 'visible', timeout: 15000 });
      await locator.scrollIntoViewIfNeeded();
      const b = await locator.boundingBox(); if (!b) throw new Error('no box for ' + locator);
      const x = Math.round(b.x + Math.min(b.width / 2, 120)), y = Math.round(b.y + b.height / 2);
      await ui.moveTo(x, y); return { x, y };
    },
    /** Move, pause, click, ring. */
    async click(locator) { const { x, y } = await ui.point(locator); await sleep(380 * k); await page.evaluate(([x, y]) => window.__mmu.ring(x, y), [x, y]); await page.mouse.click(x, y); await sleep(250); },
    /** A click that saves something in the platform. Skipped in a rehearsal (the cursor still goes there). */
    /** Point, pause and show the click ring without pressing: for a re-take when the thing it saves already exists (--reuse). */
    async mimic(locator) { const { x, y } = await ui.point(locator); await sleep(380 * k); await page.evaluate(([x, y]) => window.__mmu.ring(x, y), [x, y]); await sleep(250 * k); },
    async commit(locator) { if (rehearse) { await ui.point(locator); console.log('  (rehearsal: not pressing it)'); return false; } await ui.click(locator); return true; },
    async type(locator, text, delay = 42) { await ui.click(locator); await locator.pressSequentially(text, { delay: Math.round(delay * k) }); await sleep(200 * k); },
    /** A wait the edit cuts out (page loads, AI generation). */
    // keep: seconds left in either side of the cut (default 1; a page load that shows a blank page wants about 0.2)
    async wait(fn, label = 'wait', keep) { const from = t(); const r = await fn(); const to = t(); events.push({ type: 'wait', label, from, to, ...(keep != null && { keep }) }); return r; },
    pause: ms => sleep(ms * k),
  };
  return ui;
}
