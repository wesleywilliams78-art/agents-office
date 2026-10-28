/* Operational Insurance™ for Manual Magic AI®: 60 s, 120 BPM, 30 bars, one shape, seamless loop.
   Every style is a pure function of t and is set in seek(t). Springs are closed-form step responses.
   A value that changes target many times is the sum of one spring per change, and each sum also carries
   the previous loop's changes, so t = 60 is exactly t = 0, cursor position and speed included. */
(() => {
'use strict';
const F = Object.assign({ w: 1440, h: 1440, k: 1, cx: 720, cy: 720 }, window.MM_FORMAT || {});
const LOOP = 60;
const B = (bar, beat = 1, sub = 0) => (bar - 1) * 2 + (beat - 1) * 0.5 + sub;
const COL = { navy: [4, 37, 73], white: [255, 255, 255], mist: [242, 242, 243], orange: [245, 132, 44], sky: [107, 199, 237] };
const rgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ---------- springs ----------
const SP = { ui: [17, .8], cam: [7, .96], cur: [12, 1], col: [15, 1], press: [42, .72], lead: [27, .82], trail: [12, .92],
  enter: [18, 1], exit: [28, 1], drop: [15, .8], key: [70, 1], draw: [11, 1], reveal: [9, 1], logo: [10, .85] };
function S(tau, [w, z]) {
  if (tau <= 0) return 0;
  if (z >= 1) return 1 - Math.exp(-w * tau) * (1 + w * tau);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + (z * w / wd) * Math.sin(wd * tau));
}
const chans = [];
function chan(sp, v0 = 0) { const c = { sp, ev: [], v0 }; c.at = (t, v) => { c.ev.push([t, v]); return c; }; chans.push(c); return c; }
function compile(c) {
  const ev = c.ev.slice().sort((a, b) => a[0] - b[0]);
  if (!ev.length) { c.f = () => c.v0; return; }
  const last = ev[ev.length - 1][1], d = [];
  ev.forEach(([t, v], i) => { const dv = v - (i ? ev[i - 1][1] : last); if (dv) d.push([t, dv]); });
  c.f = t => { let x = last; for (const [ti, dv] of d) x += dv * (S(t - ti, c.sp) + S(t - ti + LOOP, c.sp)); return x; };
}
function pulse(times, dur, sp = SP.press) {
  return t => { let p = 0; for (const ti of times) for (const o of [0, LOOP]) { const u = t - ti + o; if (u > 0) p += S(u, sp) - S(u - dur, sp); } return p; };
}
// local time inside an element's life [tin, tout + 1.5], looking one loop either side
function life(t, tin, tout) { for (const o of [0, LOOP, -LOOP]) { const u = t + o; if (u >= tin - 1e-6 && u <= tout + 1.5) return u; } return null; }

// ---------- DOM ----------
const frame = document.getElementById('frame'), world = document.getElementById('world'), press = document.getElementById('press');
const shape = document.getElementById('shape'), layer = document.getElementById('layer'), top = document.getElementById('top');
const cursor = document.getElementById('cursor');
frame.style.width = F.w + 'px'; frame.style.height = F.h + 'px';
function mk(tag, cls, html, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || layer).appendChild(e); return e; }
const ICONS = {
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  note: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  cmd: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
  check: '<path class="dr" pathLength="1" d="M20 6 9 17l-5-5"/>',
  ccheck: '<circle cx="12" cy="12" r="10"/><path class="dr" pathLength="1" d="m8 12 2.7 2.7L16.2 9"/>',
};
const icon = (n, size, extra = '') => `<svg class="ico" ${extra} width="${size}" height="${size}" viewBox="0 0 24 24">${ICONS[n]}</svg>`;

// ---------- items: text and small parts that enter and exit with a short blur ----------
const items = [], draws = [], sounds = [];
const snd = (t, type, gain = 1) => sounds.push({ t: +(((t % LOOP) + LOOP) % LOOP).toFixed(4), type, gain });
function words(html) { return html.replace(/<[^>]*>/g, m => m.replace(/ /g, '\u0001')).split(' ').filter(Boolean).map(w => w.replace(/\u0001/g, ' ')); }
function item(o) {
  const el = mk('div', 'it ' + (o.cls || ''));
  if (o.css) el.style.cssText += ';' + o.css;
  if (o.wrap) { el.style.whiteSpace = 'normal'; el.style.width = o.wrap + 'px'; }
  const gs = [];
  if (o.groups) {
    const parts = [];
    for (const [html, gt] of o.groups) for (const wd of (o.byWord ? words(html) : [html])) parts.push([wd, gt]);
    el.innerHTML = parts.map(([h]) => `<span class="g">${h}</span>`).join(o.byWord ? ' ' : '');
    [...el.querySelectorAll(':scope > .g')].forEach((s, i) => gs.push({ el: s, tin: parts[i][1] }));
  } else el.innerHTML = o.html;
  const it = Object.assign({ a: 'c', x: 0, y: 0, dy: 14 }, o, { el, gs, drs: [...el.querySelectorAll('.dr')] });
  items.push(it);
  return it;
}
const val = (v, t) => typeof v === 'function' ? v(t) : v;
const AX = { c: '-50%', l: '0px', r: '-100%' };
function drawItem(it, t) {
  const st = it.el.style, u = life(t, it.tin, it.tout);
  if (u === null) { if (st.visibility !== 'hidden') st.visibility = 'hidden'; return; }
  const e = it.gs.length ? (u >= it.tin ? 1 : 0) : S(u - it.tin, SP.enter), x = S(u - it.tout, SP.exit), a = e * (1 - x);
  if (a < 0.003) { st.visibility = 'hidden'; return; }
  st.visibility = 'visible'; st.opacity = a.toFixed(4);
  const blur = (1 - e) * 9 + x * 9;
  st.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
  const sc = it.scale ? it.scale(t, u) : 1;
  st.transform = `translate(${val(it.x, t).toFixed(2)}px,${(val(it.y, t) + (1 - e) * it.dy - x * 10).toFixed(2)}px) scale(${sc.toFixed(4)}) translate(${AX[it.a]},-50%)`;
  if (it.color) st.color = it.color(t, u);
  for (const g of it.gs) {
    const ge = u >= g.tin ? S(u - g.tin, SP.enter) : 0, gs = g.el.style;
    gs.opacity = ge.toFixed(4);
    gs.transform = `translateY(${((1 - ge) * 16).toFixed(2)}px)`;
    gs.filter = ge < 0.995 ? `blur(${((1 - ge) * 9).toFixed(2)}px)` : 'none';
  }
  if (it.reveal != null) { const r = clamp(S(u - it.reveal, SP.reveal) * 1.02); st.clipPath = `inset(-20px ${((1 - r) * 100).toFixed(2)}% -20px -40px)`; }
  if (it.drs.length) for (const [i, d] of it.drs.entries()) { const td = it.drawAt[i] ?? it.drawAt[0]; d.style.strokeDasharray = '1 1'; d.style.strokeDashoffset = (1 - (u >= td ? S(u - td, SP.draw) : 0)).toFixed(4); }
  if (it.extra) it.extra(t, u, it);
}
// a plain box (rectangle, pill) with its own enter and exit
function box(o) { const el = mk('div', 'box', null, o.parent); if (o.css) el.style.cssText += ';' + o.css; const b = Object.assign({ el }, o); return b; }

// ---------- channels ----------
const sw = chan(SP.ui), sh = chan(SP.ui), sr = chan(SP.ui), sy = chan(SP.ui), sx = chan(SP.ui);
const cr = chan(SP.col), cg = chan(SP.col), cb = chan(SP.col);
const camK = chan(SP.cam), camY = chan(SP.cam);
const curX = chan(SP.cur), curY = chan(SP.cur);
function state(t, o) {
  if (o.w != null) sw.at(t, o.w); if (o.h != null) sh.at(t, o.h); if (o.r != null) sr.at(t, o.r); if (o.y != null) sy.at(t, o.y);
  if (o.x != null) sx.at(t, o.x);
  if (o.col) { cr.at(t, o.col[0]); cg.at(t, o.col[1]); cb.at(t, o.col[2]); }
  if (o.cam != null) camK.at(t, o.cam); if (o.fy != null) camY.at(t, o.fy);
}
// A slide change through an element of the old slide: on the beat T the shape collapses into that element (a button, a
// checkbox, a handle, a small pill), and an eighth later it opens back up as the next slide. The old content leaves on T;
// the new slide's content waits for the opening (see shiftIn).
const bridges = [];
function via(T, el, next, open = .25, delay = open + .1) {
  state(T, { x: 0, ...el });
  state(T + open, { x: 0, ...next });
  bridges.push([T, delay]);
  snd(T, 'morph', .5); snd(T + open, 'morph', .35);
}
function shiftIn() {
  for (const [T, delay] of bridges) for (const it of items) {
    if (it.noShift) continue;
    if (it.tin >= T - 1e-6 && it.tin < T + .2) it.tin += delay;
    for (const g of it.gs) if (g.tin >= T - 1e-6 && g.tin < T + .2) g.tin += delay;
  }
}
const cur = (t, x, y) => { curX.at(t, x); curY.at(t, y); };
const width = (it) => it.el.offsetWidth;

// first time a spring reaches 98%, so a landing can be put on the beat
const reach = (sp, v = .98) => { for (let u = 0; u < 2; u += 0.001) if (S(u, sp) >= v) return u; return 0.3; };

function markMetrics(glyph, share) {
  const c = document.createElement('canvas').getContext('2d'), out = {};
  for (const wgt of [500, 800]) {
    c.font = `${wgt} 100px Jost`;
    const H = c.measureText('H'), T = c.measureText(glyph);
    const cap = H.actualBoundingBoxAscent / 100, asc = T.actualBoundingBoxAscent / 100, hgt = (T.actualBoundingBoxAscent + T.actualBoundingBoxDescent) / 100;
    const f = share * cap / hgt;                      // the mark is this share of the cap height
    const lift = (cap - asc * f) / f;                 // its top sits on the cap line
    out[wgt] = `font-size:${f.toFixed(3)}em;position:relative;top:${(-lift).toFixed(3)}em;margin-left:.03em;font-weight:${wgt}`;
  }
  return out;
}

// Penny (27 Oct 2026): "Manual Magic AI®" every time. ® is lawful in the UK only on a registered mark (Trade Marks
// Act 1994 s.95); if it is not registered, set BRAND_MARK to '™'.
const BRAND_MARK = '®';
let TM, RM;
const tm = w => `<span class="tm" style="${TM[w]}">™</span>`;
const brand = w => `Manual Magic AI<span class="rm" style="${RM[w]}">${BRAND_MARK}</span>`;

function build() {
  TM = markMetrics('™', .52); RM = markMetrics(BRAND_MARK, .5);
  const CTA_Y = 262;
  const pressT = [B(2, 1), B(3, 1), B(6, 4), B(21, 4), B(22, 4), B(29, 4)];

  // ===== bar 1 · the hook: scaling breaks consistency (frame 0 is this card, settled) =====
  // The CTA folds into it on bar 30 b3, so it is on screen from 59.3 s and on frame 0. Ten marks under the line fall
  // out of step on b2–b4: ten ways of doing the same job.
  const HOOK_IN = B(30, 3, .3), HOOK_OUT = B(2, 1) + LOOP;
  const fix = o => Object.assign(item(o), { noShift: true });
  fix({ html: 'Ten teams.', cls: 'j8 n', css: 'font-size:72px', y: -60, tin: HOOK_IN, tout: HOOK_OUT });
  const hook2 = fix({ html: 'Ten ways of doing the same job.', cls: 'j5 n', css: 'font-size:48px', y: 10, tin: HOOK_IN + .1, tout: HOOK_OUT });
  const hookW = Math.max(820, width(hook2) + 150), hookH = 300;
  via(B(30, 3), { w: 160, h: 64, r: 32, y: CTA_Y, col: COL.orange }, { w: hookW, h: hookH, r: 44, y: 0, col: COL.white, cam: 1.45, fy: -126 });
  const markW = [], markDy = [], markRot = [];
  for (let i = 0; i < 10; i++) {
    const dy = [-14, 9, -4, 16, -11, 5, -17, 12, -6, 10][i], w = [34, 22, 46, 30, 18, 52, 26, 40, 20, 36][i], rot = [-14, 8, 0, -22, 18, -6, 26, -10, 12, -30][i];
    markDy.push(chan(SP.ui).at(B(30, 3), 0).at(B(1, 2), dy));
    markW.push(chan(SP.ui).at(B(30, 3), 34).at(B(1, 3), w));
    markRot.push(chan(SP.ui).at(B(30, 3), 0).at(B(1, 4), rot));
    const m = box({ css: 'height:12px;border-radius:6px;background:var(--navy);transform-origin:50% 50%' });
    draws.push(t => {
      const u = life(t, B(30, 3, .45 + i * .015), HOOK_OUT); const st = m.el.style;
      if (u === null) { st.visibility = 'hidden'; return; }
      const e = S(u - B(30, 3, .45 + i * .015), SP.ui), x = S(u - HOOK_OUT, SP.exit), w = markW[i].f(t);
      st.visibility = 'visible'; st.opacity = (clamp(e * 1.5) * (1 - x)).toFixed(4); st.width = w.toFixed(2) + 'px';
      st.transform = `translate(${(-198 + i * 44 - w / 2).toFixed(2)}px,${(84 - 6 + markDy[i].f(t)).toFixed(2)}px) rotate(${markRot[i].f(t).toFixed(2)}deg) scale(${(.6 + .4 * e).toFixed(4)})`;
    });
  }
  [2, 3, 4].forEach(b => snd(B(1, b), 'sort', .8));

  // ===== bar 2 · the question: the hook card folds into a pill on b1 and opens as the question =====
  via(B(2, 1), { w: 180, h: 64, r: 32 }, { w: 820, h: 300, r: 44, cam: 1.45, fy: -126 });
  item({ groups: [['What happens ', B(2, 1)], ['when your', B(2, 2)]], cls: 'j5 n', css: 'font-size:64px', y: -40, tin: B(2, 1), tout: B(3, 1) });
  item({ groups: [['best manager ', B(2, 3)], ['leaves?', B(2, 4)]], cls: 'j5 n', css: 'font-size:64px', y: 40, tin: B(2, 1), tout: B(3, 1) });

  // ===== bars 3–4 · search =====
  via(B(3, 1), { w: 180, h: 64, r: 32 }, { w: 700, h: 112, r: 56, cam: 1.6, fy: 0 });
  item({ html: icon('search', 36), cls: 'n', x: -306, y: 0, tin: B(3, 1, .05), tout: B(5, 1) });
  typed({ text: 'steamer wand', cls: 'g5 n', size: 40, x: -262, y: 0, t0: B(3, 2), step: .125, tin: B(3, 1, .05), tout: B(5, 1) });
  state(B(4, 1), { h: 220, r: 40, y: 54, cam: 1.5, fy: 110 });
  item({ html: '0 results', cls: 'g5 n6', css: 'font-size:32px', a: 'l', x: -306, y: 112, tin: B(4, 1), tout: B(5, 1) });
  item({ groups: [['The answer ', B(4, 2)], ['left with ', B(4, 3)], ['them.', B(4, 4)]], cls: 'j5 w', css: 'font-size:54px', y: 268, tin: B(4, 2), tout: B(5, 1) });

  // ===== bar 5 · toast =====
  const toasts = [[icon('folder', 34) + '&nbsp;&nbsp;Buried in a bloated drive', B(5, 1)], [icon('note', 34) + '&nbsp;&nbsp;On a fading Post-it', B(5, 2)],
    [icon('user', 34) + '&nbsp;&nbsp;In a manager’s head', B(5, 3)]];
  toasts.forEach(([html, t0], i) => {
    const it = item({ html, cls: 'g6 n', css: 'font-size:38px', tin: t0 + .03, tout: t0 + .5 });
    state(t0, { w: width(it) + 110, h: 120, r: 30, y: 0, ...(i ? {} : { cam: 1.85, fy: 0 }) });
  });
  const scat = item({ html: 'Scattered.', cls: 'j8 n', css: 'font-size:48px', tin: B(5, 4, .03), tout: B(6, 1) });
  state(B(5, 4), { w: width(scat) + 130, cam: 2.2 });

  // ===== bar 6 · the turn: the groove enters on b1 =====
  const btn6 = item({ html: 'Get your team on the same page', cls: 'g6 n', css: 'font-size:38px', tin: B(6, 1, .03), tout: B(7, 1) });
  state(B(6, 1), { w: width(btn6) + 120, h: 120, r: 60, cam: 1.7 });

  // ===== bars 7–8 · upload, loader, check =====
  state(B(7, 1), { w: 560, h: 420, r: 40, cam: 1.75 });
  const dropLead = reach(SP.drop, .97);
  ['PDF', 'DOCX', 'TXT', 'MD'].forEach((lab, i) => {
    const c = box({ css: 'width:200px;height:84px;border-radius:42px;background:var(--mist);display:flex;align-items:center;justify-content:center;transform-origin:50% 50%' });
    c.el.innerHTML = `<span class="g6 n" style="font-size:32px;letter-spacing:.02em">${lab}</span>`;
    const tx = i % 2 ? 112 : -112, ty = i < 2 ? -66 : 66, land = B(7, i + 1), t0 = land - dropLead;
    snd(land, 'drop');
    draws.push(t => {
      const u = life(t, t0 - .05, B(8, 1)); const st = c.el.style;
      if (u === null) { st.visibility = 'hidden'; return; }
      const d = S(u - t0, SP.drop), ex = S(u - B(8, 1), SP.exit);
      const x = tx * (1 - ex), y = (ty - 520 * (1 - d)) * (1 - ex);
      st.visibility = 'visible'; st.opacity = (clamp((u - t0 + .05) * 12) * (1 - ex)).toFixed(4);
      st.transform = `translate(${(x - 100).toFixed(2)}px,${(y - 42).toFixed(2)}px) scale(${(1 - .55 * ex).toFixed(4)})`;
    });
  });
  state(B(8, 1), { w: 240, h: 240, r: 120, cam: 1.9, fy: 40 });
  const prog = chan(SP.ui).at(B(7, 1), 0).at(B(8, 1), .34).at(B(8, 2), .67).at(B(8, 3), 1);
  const ring = box({ css: 'width:0;height:0' });
  ring.el.innerHTML = '<svg width="340" height="340" viewBox="-170 -170 340 340" style="position:absolute;left:-170px;top:-170px;overflow:visible">' +
    '<circle r="150" fill="none" stroke="#F2F2F3" stroke-opacity=".22" stroke-width="12"/>' +
    '<circle class="pr" r="150" fill="none" stroke="#6BC7ED" stroke-width="12" stroke-linecap="round" pathLength="1" transform="rotate(-90)"/></svg>';
  const pr = ring.el.querySelector('.pr');
  draws.push(t => {
    const u = life(t, B(8, 1), B(8, 4)); const st = ring.el.style;
    if (u === null) { st.visibility = 'hidden'; return; }
    const e = S(u - B(8, 1), SP.enter), x = S(u - B(8, 4), SP.exit), p = clamp(prog.f(t));
    st.visibility = 'visible'; st.opacity = (e * (1 - x)).toFixed(4); st.transform = `scale(${(0.86 + .14 * e + .08 * x).toFixed(4)})`;
    pr.style.strokeDasharray = `${Math.max(0.0001, p).toFixed(4)} 1`;
  });
  [8, 9].forEach(b => snd(B(8, b - 7), 'tick', .35));
  cr.at(B(8, 4), COL.sky[0]); cg.at(B(8, 4), COL.sky[1]); cb.at(B(8, 4), COL.sky[2]);
  item({ html: icon('check', 112), cls: 'n', tin: B(8, 4), tout: B(9, 1), drawAt: [B(8, 4, .04)], css: 'line-height:0' });
  snd(B(8, 4), 'check');
  item({ html: 'Your IP, uploaded', cls: 'g6 w', css: 'font-size:34px', y: 232, tin: B(8, 4, .04), tout: B(9, 1) });

  // ===== bars 9–10 · dynamic island, sorted into groups, then a board =====
  state(B(9, 1), { w: 760, h: 280, r: 60, col: COL.white, cam: 1.5, fy: 0 });
  const labs = ['PDF', 'DOCX', 'TXT', 'MD', 'PDF', 'DOCX', 'MD', 'TXT', 'PDF'];
  const scatter = [[-280, -70], [-110, 60], [50, -34], [212, 74], [280, -82], [-212, 8], [-34, 88], [128, -88], [256, 20]];
  labs.forEach((lab, j) => {
    const c = box({ css: 'width:128px;height:42px;border-radius:21px;background:var(--mist);display:flex;align-items:center;justify-content:center;transform-origin:50% 50%' });
    c.el.innerHTML = `<span class="g6 n6" style="font-size:20px;letter-spacing:.03em">${lab}</span>`;
    const g = Math.floor(j / 3), slot = j % 3, tg = B(9, g + 2), [x0, y0] = scatter[j], tx = [-220, 0, 220][g];
    const tin = B(9, 1, j * .03), tout = B(10, 4);
    draws.push(t => {
      const u = life(t, tin, tout); const st = c.el.style;
      if (u === null) { st.visibility = 'hidden'; return; }
      const e = S(u - tin, SP.ui), m = S(u - tg, SP.ui), lock = S(u - B(10, 1), SP.ui), ex = S(u - tout, SP.exit);
      const ty = (slot - 1) * (56 - 8 * lock);
      const x = x0 + (tx - x0) * m, y = y0 + (ty - y0) * m + 30 * ex;
      st.visibility = 'visible'; st.opacity = (clamp(e * 1.4) * (1 - ex)).toFixed(4);
      st.transform = `translate(${(x - 64).toFixed(2)}px,${(y - 21).toFixed(2)}px) scale(${(0.6 + .4 * e).toFixed(4)})`;
    });
  });
  [2, 3, 4].forEach(b => snd(B(9, b), 'sort'));
  item({ html: icon('check', 32) + '&nbsp;Auto-sorted', cls: 'g6 n', css: 'font-size:34px', y: -106, tin: B(10, 1), tout: B(10, 2), drawAt: [B(10, 1, .03)] });
  snd(B(10, 1), 'check', .8);
  state(B(10, 2), { w: 820, h: 560, r: 36, cam: 1.6 });

  // tabs with the liquid indicator
  const tabs = ['Draft', 'Review', 'Approved', 'Published'], tabX = [-282, -98, 94, 284], tabY = -214;
  const tabIt = tabs.map((lab, i) => item({ html: lab, cls: 'g6', css: 'font-size:28px', x: tabX[i], y: tabY, tin: B(10, 3), tout: B(14, 1) }));
  const tabW = tabIt.map(width);
  const indL = chan(SP.trail), indR = chan(SP.lead);
  const moveInd = (t, i) => { indL.at(t, tabX[i] - tabW[i] / 2 - 22); indR.at(t, tabX[i] + tabW[i] / 2 + 22); };
  moveInd(B(10, 1), 0); moveInd(B(12, 1), 1); moveInd(B(12, 2), 2); moveInd(B(12, 3), 3);
  const ind = box({ css: 'height:54px;border-radius:27px;background:var(--orange)' });
  layer.insertBefore(ind.el, tabIt[0].el);
  draws.push(t => {
    const u = life(t, B(11, 1), B(14, 1)); const st = ind.el.style;
    if (u === null) { st.visibility = 'hidden'; return; }
    const e = S(u - B(11, 1), SP.ui), x = S(u - B(14, 1), SP.exit), L = indL.f(t), R = indR.f(t), cx = (L + R) / 2, w = (R - L) * (.7 + .3 * e);
    st.visibility = 'visible'; st.opacity = (clamp(e * 2) * (1 - x)).toFixed(4);
    st.width = w.toFixed(2) + 'px'; st.transform = `translate(${(cx - w / 2).toFixed(2)}px,${(tabY - 27).toFixed(2)}px)`;
  });
  tabIt.forEach((it, i) => { it.color = t => { const on = life(t, B(11, 1), B(14, 1)) === null ? 0 : clamp(1 - Math.abs((indL.f(t) + indR.f(t)) / 2 - tabX[i]) / 110) * clamp(S(t - B(11, 1), SP.ui) * 2); return `rgba(4,37,73,${(.6 + .4 * on).toFixed(3)})`; }; });
  [1, 2, 3].forEach(b => snd(B(12, b), 'swoosh', .5));

  // bar 11: a card drafts itself under Draft
  const card = box({ css: 'width:700px;height:336px;border-radius:24px;background:var(--mist)' });
  layer.insertBefore(card.el, tabIt[0].el);
  draws.push(t => {
    const u = life(t, B(11, 1), B(14, 1)); const st = card.el.style;
    if (u === null) { st.visibility = 'hidden'; return; }
    const e = S(u - B(11, 1), SP.ui), x = S(u - B(14, 1), SP.exit);
    st.visibility = 'visible'; st.opacity = (clamp(e * 1.5) * (1 - x)).toFixed(4);
    st.transform = `translate(-350px,${(52 - 168 + (1 - e) * 24).toFixed(2)}px)`;
  });
  item({ html: 'Closing checklist', cls: 'g6 n', css: 'font-size:32px', a: 'l', x: -310, y: -58, tin: B(11, 1), tout: B(14, 1), reveal: B(11, 1) });
  const lines = ['Purge the steamer wand', 'Cash up the till', 'Lock the back door'];
  lines.forEach((l, i) => {
    item({ html: `<span class="cbx" style="width:28px;height:28px;margin-right:16px"></span>${l}`, cls: 'g5 n', css: 'font-size:28px', a: 'l', x: -310, y: 4 + i * 50, tin: B(11, i + 2), tout: B(14, 1), reveal: B(11, i + 2), dy: 0 });
    snd(B(11, i + 2), 'write', .5);
  });
  snd(B(11, 1), 'write', .5);
  // the button a person presses to move the card on
  const btnLabels = [['Send for review', B(11, 4, -.1), B(12, 1)], ['Approve', B(12, 1, .05), B(12, 2)], ['Publish', B(12, 2, .05), B(12, 3)], ['Published', B(12, 3, .05), B(14, 1)]];
  const btnW = chan(SP.ui);
  const bIt = btnLabels.map(([lab, tin, tout]) => item({ html: lab, cls: 'g6 w', css: 'font-size:24px', tin, tout, dy: 8 }));
  bIt.forEach((it, i) => btnW.at(btnLabels[i][1], width(it) + 48));
  const btnRight = 300, btnY = 168, btnPress = pulse([B(12, 1), B(12, 2), B(12, 3)], .12);
  bIt.forEach(it => { it.x = t => btnRight - btnW.f(t) / 2; it.y = btnY; it.scale = t => 1 - .05 * btnPress(t); });
  const btn = box({ css: 'height:56px;border-radius:28px;background:var(--navy);transform-origin:50% 50%' });
  layer.insertBefore(btn.el, bIt[0].el);
  draws.push(t => {
    const u = life(t, B(11, 4, -.1), B(14, 1)); const st = btn.el.style;
    if (u === null) { st.visibility = 'hidden'; return; }
    const e = S(u - B(11, 4, -.1), SP.ui), x = S(u - B(14, 1), SP.exit), w = btnW.f(t);
    st.visibility = 'visible'; st.opacity = (clamp(e * 1.6) * (1 - x)).toFixed(4); st.width = w.toFixed(2) + 'px';
    st.transform = `translate(${(btnRight - w).toFixed(2)}px,${(btnY - 28).toFixed(2)}px) scale(${(1 - .05 * btnPress(t)).toFixed(4)})`;
  });
  item({ html: `<span style="display:inline-flex;width:46px;height:46px;border-radius:23px;background:var(--navy);color:#fff;align-items:center;justify-content:center">${icon('check', 26)}</span>`,
    css: 'line-height:0', x: 300, y: -58, tin: B(12, 4), tout: B(14, 1), drawAt: [B(12, 4, .03)], scale: (t, u) => .7 + .3 * S(u - B(12, 4), SP.ui) });
  snd(B(12, 4), 'check');

  // bar 13: the caption, camera pulls back
  state(B(13, 1), { cam: 1.3, fy: 80 });
  item({ groups: [['AI accelerates the draft;', B(13, 1)]], cls: 'j5 w', css: 'font-size:46px', y: 350, tin: B(13, 1), tout: B(14, 1) });
  item({ groups: [['your experts and ours ', B(13, 2)], ['make sure it’s right.', B(13, 3)]], cls: 'j5 w', css: 'font-size:46px', y: 408, tin: B(13, 2), tout: B(14, 1) });

  // ===== bars 14–15 · ⌘K =====
  const pubW = width(bIt[3]) + 48;
  via(B(14, 1), { w: pubW, h: 56, r: 28, x: btnRight - pubW / 2, y: btnY }, { w: 680, h: 104, r: 28, y: 0, cam: 1.75, fy: 0 });
  item({ html: icon('search', 34), cls: 'n', x: -298, y: 0, tin: B(14, 1, .05), tout: B(15, 2) });
  item({ html: `<span class="kbd">${icon('cmd', 24)}<span class="g6 n6" style="font-size:26px">K</span></span>`, cls: 'n6', css: 'line-height:1', x: 272, y: 0, tin: B(14, 1, .05), tout: B(15, 2) });
  typed({ text: 'closing checklist', cls: 'g5 n', size: 38, x: -258, y: 0, t0: B(14, 2), step: 1 / 12, tin: B(14, 1, .05), tout: B(15, 2) });
  state(B(15, 1), { h: 212, y: 54, cam: 1.65, fy: 54 });
  const rowHi = box({ css: 'width:640px;height:78px;border-radius:18px;background:var(--mist);transform-origin:50% 50%' });
  const rowP = pulse([B(15, 2)], .1);
  draws.push(t => {
    const u = life(t, B(15, 1), B(15, 2)); const st = rowHi.el.style;
    if (u === null) { st.visibility = 'hidden'; return; }
    const e = S(u - B(15, 1), SP.enter), x = S(u - B(15, 2, .05), SP.exit);
    st.visibility = 'visible'; st.opacity = (e * (1 - x)).toFixed(4);
    st.transform = `translate(-320px,${(108 - 39 + (1 - e) * 12).toFixed(2)}px) scale(${(1 - .03 * rowP(t)).toFixed(4)})`;
  });
  item({ html: `${icon('doc', 32)}&nbsp;&nbsp;Closing checklist<span class="g5 n6">&nbsp;· Published</span>`, cls: 'g6 n', css: 'font-size:30px', a: 'l', x: -294, y: 108, tin: B(15, 1), tout: B(15, 2) });
  snd(B(15, 2), 'enter');
  via(B(15, 2), { w: 640, h: 78, r: 18, y: 108 }, { w: 700, h: 360, r: 32, y: 0, cam: 1.75, fy: 0 }, .2, .22);
  item({ html: 'Closing checklist', cls: 'g6 n', css: 'font-size:34px', a: 'l', x: -296, y: -112, tin: B(15, 2, .08), tout: B(16, 1) });
  const ticks = [B(15, 3), B(15, 4), null];
  lines.forEach((l, i) => {
    const t0 = ticks[i];
    const it = item({ html: `<span class="cbx" style="width:34px;height:34px;margin-right:18px">${icon('check', 24)}</span>${l}`, cls: 'g5 n', css: 'font-size:31px', a: 'l', x: -296, y: -34 + i * 64,
      tin: B(15, 2, .1 + i * .05), tout: B(16, 1), drawAt: [t0 ?? 999] });
    const cbx = it.el.querySelector('.cbx');
    if (t0 != null) {
      snd(t0, 'check');
      it.extra = (t, u) => { const f = u >= t0 ? S(u - t0, SP.col) : 0; cbx.style.background = `rgba(107,199,237,${f.toFixed(3)})`; cbx.style.borderColor = `rgba(${Math.round(4 + 103 * f)},${Math.round(37 + 162 * f)},${Math.round(73 + 164 * f)},${(.6 + .4 * f).toFixed(3)})`; };
    }
  });

  // ===== bars 16–17 · toggles =====
  via(B(16, 1), { w: 34, h: 34, r: 9, x: -279, y: 30, col: COL.sky }, { w: 760, h: 150, r: 36, y: 0, col: COL.white, cam: 1.65, fy: 0 });
  const toggle = (rowY, tin, flipAt, fromRight, onColour) => {
    const tr = box({ css: 'width:104px;height:60px;border-radius:30px;box-shadow:inset 0 0 0 2px rgba(4,37,73,.18)' }), kn = box({ css: 'height:46px;border-radius:23px;background:var(--navy)' });
    const L = chan(fromRight ? SP.lead : SP.trail), R = chan(fromRight ? SP.trail : SP.lead);
    const off = 275 - 22, on = 275 + 22;
    const a = fromRight ? on : off, b = fromRight ? off : on;
    L.at(tin - 1, a - 23).at(flipAt, b - 23); R.at(tin - 1, a + 23).at(flipAt, b + 23);
    draws.push(t => {
      const u = life(t, tin, B(18, 1));
      for (const p of [tr, kn]) p.el.style.visibility = u === null ? 'hidden' : 'visible';
      if (u === null) return;
      const e = S(u - tin, SP.enter), x = S(u - B(18, 1), SP.exit), op = (e * (1 - x)).toFixed(4);
      const f = onColour && u >= flipAt ? S(u - flipAt, SP.col) : 0;
      tr.el.style.background = rgb(onColour ? COL.mist.map((m, i) => m + (onColour[i] - m) * f) : COL.mist); tr.el.style.opacity = op; tr.el.style.transform = `translate(${275 - 52}px,${rowY - 30}px)`;
      const l = L.f(t), r = R.f(t);
      kn.el.style.opacity = op; kn.el.style.width = (r - l).toFixed(2) + 'px'; kn.el.style.transform = `translate(${l.toFixed(2)}px,${(rowY - 23).toFixed(2)}px)`;
    });
  };
  const q1 = item({ html: 'Your data trains AI?', cls: 'g6', css: 'font-size:34px', a: 'l', x: -340, y: 0, tin: B(16, 1), tout: B(18, 1) });
  const settle = at => t => `rgba(4,37,73,${(.6 + .4 * (t >= at ? S(t - at, SP.col) : 0)).toFixed(3)})`;
  q1.color = settle(B(16, 2));
  toggle(0, B(16, 1, .4), B(16, 1, .45), true, null);
  item({ html: 'No', cls: 'j8 n', css: 'font-size:38px', a: 'r', x: 200, y: 0, tin: B(16, 1, .48), tout: B(18, 1) });
  snd(B(16, 1, .45), 'toggle');
  state(B(16, 3), { h: 270, y: 60, fy: 60 });
  const q2 = item({ html: 'Hosted in', cls: 'g6', css: 'font-size:34px', a: 'l', x: -340, y: 120, tin: B(16, 3), tout: B(18, 1) });
  q2.color = settle(B(17, 2));
  toggle(120, B(16, 3), B(17, 1, .02), false, COL.sky);
  item({ html: 'UK', cls: 'j8 n', css: 'font-size:38px', a: 'r', x: 200, y: 120, tin: B(17, 1, .06), tout: B(18, 1) });
  snd(B(17, 1), 'toggle');
  state(B(17, 3), { h: 382, y: 116, fy: 116 });
  item({ html: 'Ring-fenced per client account', cls: 'g6 n', css: 'font-size:28px;background:var(--sky);border-radius:30px;padding:13px 26px', a: 'l', x: -340, y: 236, tin: B(17, 4), tout: B(18, 1),
    scale: (t, u) => .9 + .1 * S(u - B(17, 4), SP.ui) });
  snd(B(17, 4), 'tick', .6);

  // ===== bars 18–19 · progress bar → slider, dragged from Months to Weeks =====
  via(B(18, 1), { w: 104, h: 60, r: 30, x: 275, y: 120, col: COL.sky }, { w: 840, h: 36, r: 18, y: 0, col: COL.mist, cam: 1.4, fy: -44 });
  const fillTo = chan(SP.ui).at(B(17, 1), -420).at(B(18, 2), 252);
  const hold0 = B(18, 4), hold1 = B(19, 2), detent = -280;
  // the drag starts so that the handle crosses the middle exactly on bar 19 b1
  let dragT = hold0 + .25;
  {
    const cx = (t0, t) => 252 + (-340 - 252) * S(t - t0, SP.cur);
    let lo = hold0, hi = B(19, 1);
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (cx(mid, B(19, 1)) > 0) hi = mid; else lo = mid; }
    dragT = (lo + hi) / 2;
  }
  cur(B(18, 3, .05), 252, 4); cur(dragT, -340, 4); cur(B(19, 2, .2), -150, 230);
  // direct manipulation: while held the handle is wherever the cursor is; on release it springs from there to the detent
  const handleX = t => {
    if (t < hold0) return fillTo.f(t);
    const off = curX.f(hold0) - fillTo.f(hold0);
    if (t < hold1) return clamp(curX.f(t) - off, -420, 420);
    const xr = clamp(curX.f(hold1) - off, -420, 420);
    return xr + (detent - xr) * S(t - hold1, SP.ui);
  };
  const crossT = B(19, 1);
  const fill = box({ css: 'height:36px;border-radius:18px;background:var(--sky)' });
  const knob = box({ css: 'width:76px;height:76px;border-radius:38px;background:#fff;box-sizing:border-box;border:3px solid rgba(4,37,73,.6);transform-origin:50% 50%' });
  const holdP = pulse([hold0], hold1 - hold0, SP.press);
  draws.push(t => {
    const u = life(t, B(18, 1), B(20, 1));
    for (const p of [fill, knob]) p.el.style.visibility = u === null ? 'hidden' : 'visible';
    if (u === null) return;
    const x = S(u - B(20, 1), SP.exit), hx = u >= B(18, 3) ? handleX(t) : fillTo.f(t);
    const L = -420, w = Math.max(36, hx - L + 18);
    fill.el.style.opacity = ((u >= B(18, 2) ? 1 : 0) * (1 - x)).toFixed(4); fill.el.style.width = w.toFixed(2) + 'px'; fill.el.style.transform = `translate(${L}px,-18px)`;
    const ke = u >= B(18, 3) ? S(u - B(18, 3), SP.ui) : 0;
    knob.el.style.opacity = (clamp(ke * 2) * (1 - x)).toFixed(4);
    knob.el.style.transform = `translate(${(hx - 38).toFixed(2)}px,-38px) scale(${((.5 + .5 * ke) * (1 - .08 * holdP(t))).toFixed(4)})`;
  });
  item({ html: 'Months', cls: 'j8 w', css: 'font-size:58px', x: t => handleX(t), y: -100, tin: B(18, 3, .05), tout: crossT });
  const weeks = item({ html: 'Weeks', cls: 'j8 w', css: 'font-size:58px', x: t => handleX(t), y: -100, tin: crossT + .02, tout: B(20, 1) });
  const weeksW = width(weeks);
  item({ html: ', not months', cls: 'j3 w7', css: 'font-size:58px', a: 'l', x: t => handleX(t) + weeksW / 2, y: -100, tin: B(19, 3), tout: B(20, 1) });
  snd(hold0, 'click'); snd(crossT, 'tick', .7); snd(hold1, 'release');
  state(B(19, 4), { cam: 1.46 });

  // ===== bars 20–21 · the quote (no photo) =====
  via(B(20, 1), { w: 76, h: 76, r: 38, x: detent, y: 0, col: COL.white }, { w: 860, h: 430, r: 44, y: 0, cam: 1.5, fy: 0 });
  item({ html: '“', cls: 'j8 n', css: 'font-size:150px;line-height:1', a: 'l', x: -372, y: -120, tin: B(20, 1, .04), tout: B(22, 1) });
  item({ groups: [[brand(500), B(20, 2)]], cls: 'j5 n', css: 'font-size:56px', a: 'l', x: -360, y: -40, tin: B(20, 2), tout: B(22, 1) });
  item({ groups: [['is a real innovation', B(20, 3)]], cls: 'j5 n', css: 'font-size:56px', a: 'l', x: -360, y: 30, tin: B(20, 3), tout: B(22, 1) });
  item({ groups: [['for franchising”', B(20, 4)]], cls: 'j5 n', css: 'font-size:56px', a: 'l', x: -360, y: 100, tin: B(20, 4), tout: B(22, 1) });
  item({ html: 'Pip Wilkins QFP, CEO, the British Franchise Association', cls: 'g5 n6', css: 'font-size:28px', a: 'l', x: -360, y: 170, tin: B(21, 1), tout: B(22, 1) });
  state(B(21, 2), { cam: 1.56 });

  // ===== bar 22 · BFA chip =====
  const bfa = item({ html: 'Methodology endorsed by<br>the British Franchise Association', cls: 'g6 n', css: 'font-size:32px;line-height:1.3;text-align:center', tin: B(22, 1, .04), tout: B(23, 1) });
  state(B(22, 1), { w: width(bfa) + 110, h: 150, r: 40, cam: 1.9, fy: 22 });
  item({ html: 'BFA', cls: 'g5 w7', css: 'font-size:10px;letter-spacing:.08em', y: 98, tin: B(22, 2), tout: B(23, 1) });

  // ===== bars 23–25 · Operational Insurance™ =====
  state(B(23, 1), { w: 860, h: 530, r: 44, col: COL.orange, cam: 1.45, fy: 0 });
  item({ groups: [['Operational', B(23, 2)]], cls: 'j8 n', css: 'font-size:74px', a: 'l', x: -372, y: -176, tin: B(23, 2), tout: B(25, 1) });
  item({ groups: [['Insurance' + tm(800), B(23, 3)]], cls: 'j8 n', css: 'font-size:74px', a: 'l', x: -372, y: -96, tin: B(23, 3), tout: B(25, 1) });
  const rule = box({ css: 'height:3px;width:744px;background:var(--navy);transform-origin:0 50%' });
  draws.push(t => {
    const u = life(t, B(23, 4), B(25, 1)); const st = rule.el.style;
    if (u === null) { st.visibility = 'hidden'; return; }
    const d = S(u - B(23, 4), SP.reveal), x = S(u - B(25, 1), SP.exit);
    st.visibility = 'visible'; st.opacity = (1 - x).toFixed(4); st.transform = `translate(-372px,-36px) scaleX(${d.toFixed(4)})`;
  });
  snd(B(23, 4), 'write', .6);
  ['Key-person dependency', 'Brand dilution', 'Knowledge loss'].forEach((r, i) => {
    const t0 = B(24, i + 1);
    item({ html: `${icon('ccheck', 40)}&nbsp;&nbsp;${r}`, cls: 'g6 n', css: 'font-size:36px', a: 'l', x: -372, y: 30 + i * 70, tin: t0, tout: B(25, 1), drawAt: [t0 + .05] });
    snd(t0, 'check');
  });
  state(B(24, 4), { cam: 1.49 });
  item({ groups: [['Operational Insurance' + tm(500) + ':', B(25, 1)], ['protection against key-person dependency,', B(25, 2)], ['brand dilution and knowledge loss.', B(25, 3)]], byWord: true,
    cls: 'j5 n', css: 'font-size:52px;line-height:1.2', wrap: 744, a: 'l', x: -372, y: 0, tin: B(25, 1, .02), tout: B(26, 1) });
  state(B(25, 4), { cam: 1.53 });

  // ===== bars 26–27 · author chip =====
  const chipCss = 'font-size:32px;line-height:1.3;text-align:center';
  const a1 = item({ html: 'Built on Penny Hopkinson’s<br>three-step methodology', cls: 'g6 n', css: chipCss, tin: B(26, 1, .04), tout: B(27, 1) });
  const a1W = width(a1) + 110 + 140;
  via(B(26, 1), { w: 160, h: 64, r: 32, col: COL.white }, { w: a1W, h: 150, r: 40, col: COL.white, cam: 1.85, fy: 0 });
  a1.x = -(a1W / 2) + 55 + width(a1) / 2;
  [0, 1, 2].forEach(i => {
    const x0 = a1W / 2 - 55 - 13 - (2 - i) * 40, tf = B(26, i + 2);
    const ring = box({ css: 'width:26px;height:26px;border-radius:13px;box-sizing:border-box;border:2.6px solid var(--navy)' });
    const dot = box({ css: 'width:26px;height:26px;border-radius:13px;background:var(--navy);transform-origin:50% 50%' });
    draws.push(t => {
      const u = life(t, B(26, 1, .35), B(27, 1));
      for (const p of [ring, dot]) p.el.style.visibility = u === null ? 'hidden' : 'visible';
      if (u === null) return;
      const e = S(u - B(26, 1, .35 + i * .06), SP.enter), x = S(u - B(27, 1), SP.exit), f = u >= tf ? S(u - tf, SP.ui) : 0;
      ring.el.style.opacity = (e * (1 - x)).toFixed(4); ring.el.style.transform = `translate(${x0 - 13}px,-13px)`;
      dot.el.style.opacity = ((1 - x) * clamp(f * 3)).toFixed(4); dot.el.style.transform = `translate(${x0 - 13}px,-13px) scale(${f.toFixed(4)})`;
    });
    snd(tf, 'tick', .5);
  });
  const a2 = item({ html: 'Over 40 years of franchising<br>and operational expertise', cls: 'g6 n', css: chipCss, tin: B(27, 1, .04), tout: B(27, 3) });
  state(B(27, 1), { w: width(a2) + 120 });
  const a3 = item({ html: '<span class="ji" style="font-size:36px">Manual Magic</span><br>Amazon international bestseller', cls: 'g6 n', css: chipCss, tin: B(27, 3, .04), tout: B(28, 1) });
  state(B(27, 3), { w: width(a3) + 120 });

  // ===== bars 28–30 · CTA with the logo, held to bar 30 b3 =====
  state(B(28, 1), { w: 100, h: 100, r: 50, y: CTA_Y, cam: 1.2, fy: -26 });
  const ctaG = item({ html: 'Get Started', cls: 'g6 n', css: 'font-size:48px', y: CTA_Y, tin: B(28, 3), tout: B(30, 3) });
  const ctaS = item({ html: '&nbsp;· manualmagic.ai', cls: 'g6 n', css: 'font-size:48px', a: 'l', y: CTA_Y, tin: B(28, 4), tout: B(30, 3) });
  const wG = width(ctaG), wF = wG + width(ctaS);
  ctaG.x = t => (-wF / 2 + wG / 2) * (t >= B(28, 4) && t < B(30, 4) ? S(t - B(28, 4), SP.ui) : 0);
  ctaS.x = -wF / 2 + wG;
  state(B(28, 2), { w: wG + 120, h: 112, r: 56, col: COL.orange });
  state(B(28, 4), { w: wF + 120 });
  const hov = chan(SP.ui).at(B(29, 3), 1).at(B(29, 4, .1), 0);
  ctaG.scale = ctaS.scale = t => 1 + .03 * hov.f(t);
  const LOGO_W = 456;   // 456 × camera 1.2 = 547 px, inside the 549 px source
  const logo = document.createElement('img');
  logo.src = 'assets/logo-549-screenshot.png'; logo.className = 'box'; logo.style.width = logo.style.height = LOGO_W + 'px'; logo.style.transformOrigin = '50% 50%';
  // feather only the plain navy margin of the square file, so its edge never shows against the canvas; the artwork is untouched
  logo.style.webkitMaskImage = logo.style.maskImage = 'radial-gradient(closest-side, #000 88%, transparent 100%)';
  top.appendChild(logo);
  // One logo from the CTA round the loop to the opening: it scales in on bar 28, and as the CTA button folds into the hook
  // card on bar 30 b3 it glides up and settles above the card (300 world units, 435 px on screen), staying through the
  // question and leaving on bar 3 b1. The navy margin of the file plus the gap keep more than 20% clear space above the card.
  const LOGO_IN = B(28, 1), LOGO_OUT = B(3, 1) + LOOP;
  const logoW = chan(SP.cam).at(B(27, 1), LOGO_W).at(B(30, 3), 300), logoY = chan(SP.cam).at(B(27, 1), -140).at(B(30, 3), -300);   // on the camera's spring, so its screen size only shrinks
  draws.push(t => {
    const u = life(t, LOGO_IN, LOGO_OUT); const st = logo.style;
    if (u === null) { st.visibility = 'hidden'; return; }
    const s = S(u - LOGO_IN, SP.logo), x = S(u - LOGO_OUT, SP.exit);
    let sc = (logoW.f(t) / LOGO_W) * (0.72 + .28 * s) * (1 - .05 * x);
    const screen = LOGO_W * camK.f(t) * F.k;               // never shown above the 549 px source
    sc = Math.min(sc, 549 / screen);
    const rot = -3 + 6 * clamp((u - LOGO_IN) / (LOGO_OUT - LOGO_IN));   // 6° in all across its 10 s on screen
    st.visibility = 'visible'; st.opacity = (clamp(s * 1.6) * (1 - x)).toFixed(4);
    st.transform = `translate(${-LOGO_W / 2}px,${(logoY.f(t) - LOGO_W / 2).toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
  });
  snd(LOGO_IN, 'logo');

  // ===== bar 30 · home =====
  // (the CTA folds into the hook on b3: see bar 1 above; the logo carries over)

  // ===== cursor =====
  cur(B(1, 3), 300, 110);          // enters from off-frame on bar 1 b3 and presses the hook card on bar 2 b1
  cur(B(2, 1, .15), 330, 330);
  cur(B(3, 1, -.45), 300, 8);
  cur(B(3, 1, .3), 350, 230);
  cur(B(5, 1), 330, 200);
  cur(B(6, 2), 120, 20);
  cur(B(6, 4, .25), 260, 290);
  cur(B(7, 4, .4), 210, 232);
  cur(B(9, 1), 330, 220);
  cur(B(10, 2), 300, 330);
  cur(B(11, 4, -.05), 240, btnY);
  cur(B(12, 3, .3), 330, 330);
  cur(B(13, 4), 300, 250);
  cur(B(14, 1, .1), 300, 190);
  cur(B(15, 2, .1), -296 + 17, -34);
  cur(B(15, 3, .05), -296 + 17, 30);
  cur(B(15, 4, .25), 275, 0);
  cur(B(16, 2, .1), 360, 90);
  cur(B(16, 3, .05), 275, 120);
  cur(B(17, 1, .3), 360, 330);
  // bar 18–19 cursor set above with the drag
  cur(B(20, 1, .2), 330, 330);
  cur(B(20, 4, .3), 300, 40);       // rests right of the quote before the credit line lands
  cur(B(21, 4, .3), 330, 250);
  cur(B(22, 2, .1), 250, 30);
  cur(B(22, 4, .3), 380, 360);
  cur(B(26, 1, .2), 300, 200);
  cur(B(28, 1, .2), 330, 430);
  cur(B(29, 2, .1), 150, CTA_Y + 6);
  cur(B(30, 1, .15), 520, 520);     // leaves the frame; it is off-frame on frame 0
  const curPress = pulse([B(2, 1), B(3, 1), B(6, 4), B(12, 1), B(12, 2), B(12, 3), B(15, 3), B(15, 4), B(16, 1, .45), B(17, 1), B(21, 4), B(22, 4), B(29, 4)], .12);
  [B(2, 1), B(3, 1), B(6, 4), B(12, 1), B(12, 2), B(12, 3), B(21, 4), B(22, 4), B(29, 4)].forEach(t => snd(t, 'click'));
  snd(B(2, 1, .12), 'release'); snd(B(29, 4, .12), 'release');
  const shapePress = pulse(pressT, .12);

  // morph whooshes on the larger changes, very quiet
  [B(5, 1), B(6, 1), B(7, 1), B(8, 1), B(9, 1), B(10, 2), B(22, 1), B(23, 1), B(28, 1), B(28, 2)]   // the bridged changes sound in via()
    .forEach(t => snd(t, 'morph', .5));

  return { shapePress, curPress, holdP };
}

// typing: one keystroke per character, a caret that blinks on the beat when idle
function typed(o) {
  const boxEl = mk('div', 'it ' + o.cls); boxEl.style.fontSize = o.size + 'px'; boxEl.style.whiteSpace = 'pre';
  const spans = [...o.text].map(ch => mk('span', '', ch, boxEl));
  const keys = spans.map((_, i) => o.t0 + i * o.step);
  keys.forEach(k => snd(k, 'key'));
  const it = { el: boxEl, x: o.x, y: o.y, a: 'l', tin: o.tin, tout: o.tout, gs: [], drs: [], dy: 0 };
  items.push(it);
  const caret = mk('div', 'caret'); caret.style.height = Math.round(o.size * 1.15) + 'px';
  let offs = null;
  draws.push(t => {
    if (!offs) offs = spans.map(s => s.offsetLeft + s.offsetWidth);
    const u = life(t, it.tin, it.tout);
    spans.forEach((s, i) => { s.style.opacity = u === null || u < keys[i] ? 0 : S(u - keys[i], SP.key).toFixed(3); });
    if (u === null) { caret.style.visibility = 'hidden'; return; }
    let n = 0; for (const k of keys) if (u >= k) n++;
    const last = n ? keys[n - 1] : it.tin, typing = u - last < .3 && n < keys.length;
    const on = typing || ((u - it.tin) % .5) < .3;
    const a = (on ? 1 : 0) * (1 - S(u - it.tout, SP.exit)) * S(u - it.tin, SP.enter);
    caret.style.visibility = 'visible'; caret.style.opacity = a.toFixed(3);
    caret.style.transform = `translate(${(o.x + (n ? offs[n - 1] : 0) + 3).toFixed(2)}px,${o.y}px) translate(0,-50%)`;
  });
}

// ---------- background: a dot field that breathes slowly and ripples out from the shape on the beat ----------
// Bars 1–5 (no kick yet) send a soft wave on each downbeat only; from bar 6, where the groove enters, every beat sends a
// wave and every downbeat a stronger one. A downbeat wave turns orange only in states that hold no other orange and no
// sky, so each state keeps one orange element at most and orange never meets sky.
const bg = document.createElement('canvas');
bg.width = F.w; bg.height = F.h; bg.style.cssText = 'position:absolute;left:0;top:0';
frame.insertBefore(bg, world);
const bgx = bg.getContext('2d');
const ORANGE_BARS = new Set([6, 9, 10, 14, 20, 21, 22, 26, 27]);
const waves = [];
for (let bar = 1; bar <= 30; bar++) for (let beat = 1; beat <= 4; beat++) {
  const groove = bar >= 6 && bar <= 29, t = B(bar, beat), orange = groove && ORANGE_BARS.has(bar);
  if (beat === 1) waves.push({ t, a: groove ? (orange ? .85 : .5) : .22, o: orange, tau: .8 });
  else if (groove) waves.push({ t, a: .2, o: false, tau: .5 });
}
const DOT = { gap: 46, r: 2.7, base: .11, breathe: .035, speed: 1150, width: 80, depth: .3 };
function drawDots(t, ck, cy, sy, sxv) {
  const k = Math.pow(ck, DOT.depth) * F.k, fy = cy * DOT.depth, gap = DOT.gap * k;   // a slower camera: the field sits deeper than the UI
  const ox = F.cx + sxv * ck * F.k, oy = F.cy + (sy - cy) * ck * F.k;                                    // waves start at the shape's centre
  const live = [];
  for (const w of waves) for (const o of [0, LOOP]) { const u = t - w.t + o; if (u >= 0 && u < 3) live.push([u, w]); }
  bgx.clearRect(0, 0, F.w, F.h);
  const i0 = Math.floor(-F.cx / gap) - 1, i1 = Math.ceil((F.w - F.cx) / gap) + 1;
  const j0 = Math.floor((-F.cy + fy * k) / gap) - 1, j1 = Math.ceil((F.h - F.cy + fy * k) / gap) + 1;
  const front = live.map(([u, w]) => [DOT.speed * F.k * u, DOT.width * F.k, w.a * Math.exp(-u / w.tau), w.o]);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const X = F.cx + i * gap, Y = F.cy + j * gap - fy * k, d = Math.hypot(X - ox, Y - oy);
    let wI = 0, oI = 0;
    for (const [f, wd, a, o] of front) { const g = a * Math.exp(-(((d - f) / wd) ** 2)); if (o) oI += g; else wI += g; }
    const I = Math.min(1, wI + oI), m = oI > .005 ? oI / (wI + oI) : 0;
    const alpha = Math.min(.9, DOT.base + DOT.breathe * Math.sin(2 * Math.PI * t / 7.5 - d / 380) + I);
    bgx.fillStyle = `rgba(${Math.round(255 - 10 * m)},${Math.round(255 - 123 * m)},${Math.round(255 - 211 * m)},${alpha.toFixed(3)})`;
    bgx.beginPath(); bgx.arc(X, Y, DOT.r * F.k * (1 + 1.5 * I), 0, 2 * Math.PI); bgx.fill();
  }
}

// ---------- seek ----------
let P;
function seek(time) {
  const t = ((time % LOOP) + LOOP) % LOOP;
  const k = camK.f(t) * F.k, fy = camY.f(t);
  world.style.transform = `translate(${F.cx}px,${F.cy}px) scale(${k.toFixed(5)}) translate(0px,${(-fy).toFixed(3)}px)`;
  const w = sw.f(t), h = sh.f(t), x = sx.f(t), y = sy.f(t), r = Math.max(0, Math.min(sr.f(t), w / 2, h / 2));
  const st = shape.style;
  st.width = w.toFixed(2) + 'px'; st.height = h.toFixed(2) + 'px'; st.borderRadius = r.toFixed(2) + 'px';
  st.transform = `translate(${(x - w / 2).toFixed(2)}px,${(y - h / 2).toFixed(2)}px)`;
  st.background = rgb([clamp(cr.f(t), 0, 255), clamp(cg.f(t), 0, 255), clamp(cb.f(t), 0, 255)]);
  const p = 1 - .035 * P.shapePress(t);
  press.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${p.toFixed(5)}) translate(${(-x).toFixed(2)}px,${(-y).toFixed(2)}px)`;
  drawDots(t, camK.f(t), fy, y, x);
  for (const it of items) drawItem(it, t);
  for (const d of draws) d(t);
  // cursor in screen space, following its spring in world space
  const cx = F.cx + curX.f(t) * k, cy = F.cy + (curY.f(t) - fy) * k;
  const cs = 1.7 * F.k * (1 - .14 * clamp(P.curPress(t) + P.holdP(t)));
  cursor.style.transform = `translate(${cx.toFixed(2)}px,${cy.toFixed(2)}px) scale(${cs.toFixed(4)})`;
}

const ready = (async () => {
  await Promise.all(['300 40px Jost', '500 40px Jost', 'italic 500 40px Jost', '800 40px Jost', '400 40px Geist', '500 40px Geist', '600 40px Geist'].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  P = build();
  shiftIn();
  for (const c of chans) compile(c);
  const img = top.querySelector('img'); if (img && !img.complete) await new Promise(r => { img.onload = img.onerror = r; });
  sounds.sort((a, b) => a.t - b.t);
  seek(0);
})();
window.MM = { ready, seek, sounds, duration: LOOP, fps: 60, bpm: 120, width: F.w, height: F.h };
})();
