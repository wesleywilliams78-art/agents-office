// Episode 04 (STP), v3 (Ep 03 v3 format): generates index.html and compositions/*.html from the real voice timings.
//   node build.mjs   (reads ../../../../../data/motion/narration/ep04v2/words.json)
// Every time in the film comes from the cloned-voice word timings, so a retake means re-running this, not hand-editing.
import fs from 'node:fs'; import path from 'node:path';
const HERE = import.meta.dirname;
const W = JSON.parse(fs.readFileSync(path.resolve(HERE, '../../../../../data/motion/narration/ep04v2/words.json'), 'utf8'));
const LEAD = 0.15, LEAD1 = 0.3, TAIL = 0.3, TAIL8 = 1.0, END = 3.5;

// --- words: merge the spelled-out letters back into what the captions should show
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9']/g, '');
const lines = {};
for (const [id, L] of Object.entries(W)) {
  const ws = []; const src = L.words;
  for (let i = 0; i < src.length; i++) {
    const a = src[i], b = src[i + 1], c = src[i + 2];
    if (norm(a.text) === 's' && b && norm(b.text) === 't' && c && norm(c.text) === 'p') { ws.push({ text: 'STP' + (/[.?!,:]$/.test(c.text) ? c.text.slice(-1) : ''), start: a.start, end: c.end }); i += 2; }
    else if (norm(a.text) === 'a' && b && norm(b.text) === 'm') { ws.push({ text: 'a.m.' , start: a.start, end: b.end }); i += 1; }
    else ws.push({ ...a });
  }
  lines[id] = { duration: L.duration, words: ws };
}
// a.m. keeps its sentence stop only when the script has one ("seven A M." then "The other…")
for (const L of Object.values(lines)) L.words.forEach((w, i) => { if (w.text === 'a.m.') { const o = L.words[i]; o.text = 'a.m.'; } });

// --- scene timeline
const ids = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
let t = 0; const S = {};
ids.forEach((id, i) => { const lead = i === 0 ? LEAD1 : LEAD, tail = id === 's8' ? TAIL8 : TAIL; S[id] = { start: +t.toFixed(3), lead, dur: +(lead + lines[id].duration + tail).toFixed(3) }; t += S[id].dur; });
S.end = { start: +t.toFixed(3), dur: END }; const TOTAL = +(t + END).toFixed(3);
const cue = (id, key, n = 1) => { let c = 0; for (const w of lines[id].words) if (norm(w.text).startsWith(key) && ++c === n) return +(S[id].lead + w.start).toFixed(3); throw new Error(`cue ${id}/${key}/${n}`); };
const cueEnd = (id, key, n = 1) => { let c = 0; for (const w of lines[id].words) if (norm(w.text).startsWith(key) && ++c === n) return +(S[id].lead + w.end).toFixed(3); throw new Error(`cueEnd ${id}/${key}/${n}`); };

// --- shared css/js
const FONTS = `@font-face { font-family: "Newsreader"; font-weight: 300; src: url("assets/fonts/newsreader-latin-300-normal.woff2") format("woff2"); }
    @font-face { font-family: "Archivo"; font-weight: 500; src: url("assets/fonts/Archivo-Medium.ttf") format("truetype"); }
    @font-face { font-family: "Archivo"; font-weight: 400; src: url("assets/fonts/Archivo-Regular.ttf") format("truetype"); }`;
const BASE = `${FONTS}
    :root { --bone: #f3f2f2; --ink: #201e1d; --red: #ec3013; --deep: #b6240e; --sand: #e9d8bd; --grey: #736e6b; }
    #root { position: absolute; inset: 0; background: var(--bone); color: var(--ink); overflow: hidden; font-variant-numeric: tabular-nums; }
    .kick { position: absolute; left: 86px; font: 500 28px/1 "Archivo", sans-serif; letter-spacing: .22em; color: var(--deep); white-space: nowrap; }
    .serif { position: absolute; font-family: "Newsreader", serif; font-weight: 300; letter-spacing: -0.01em; white-space: nowrap; }
    .sans { position: absolute; font-family: "Archivo", sans-serif; font-weight: 500; white-space: nowrap; }
    .eye { position: absolute; left: 86px; top: 136px; font: 500 28px/1 "Archivo", sans-serif; letter-spacing: .13em; color: var(--deep); white-space: nowrap; }
    .abs { position: absolute; }
    .grey { color: var(--grey); }`;
const wrap = (id, dur, css, body, js) => `<template>
  <style>
    ${BASE}
    ${css}
  </style>
  <div id="root" data-composition-id="${id}" data-width="1080" data-height="1350">
${body}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    const pop = (sel, t, y = 12) => tl.fromTo(sel, { opacity: 0, y }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, t);
    const rise = (sel, t, d = 0.9) => tl.fromTo(sel, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: d, ease: "power3.out" }, t);
    const count = (sel, to, t, fmt, d = 1.1) => { const o = { v: 0 }; tl.to(o, { v: to, duration: d, ease: "power3.out", onUpdate: () => { document.querySelector(sel).textContent = fmt(Math.round(o.v)); } }, t); };
    const poses = (list, cur, t) => list.forEach((p) => tl.set(p, { opacity: p === cur ? 1 : 0 }, t));
    const gbp = (n) => "£" + n.toLocaleString("en-GB");
    ${js}
    tl.set({}, {}, ${dur});
    window.__timelines["${id}"] = tl;
  </script>
</template>
`;
const write = (name, html) => fs.writeFileSync(path.join(HERE, 'compositions', name + '.html'), html);
const tickAt = []; // absolute times for the soft tick when a number lands

// ===== 1. cold open: the poster at frame 0 ===================================================
{
  const d = S.s1.dur, tk = [cue('s1', 'packed'), cue('s1', 'saturday'), cue('s1', 'who')];
  const P = ['#a-n', '#a-l', '#a-r'];
  write('cold', wrap('cold', d, `
    #h1 { left: 86px; top: 196px; font-size: 90px; line-height: 1.06; } #h1 .l2 { color: var(--grey); }
    #ground { left: 86px; top: 893px; width: 908px; height: 5px; background: var(--ink); }
    #plat { left: 86px; top: 667px; width: 420px; height: 300px; } #str { left: 658px; top: 712px; width: 336px; height: 240px; }
    #shop1 { left: 86px; top: 540px; width: 270px; height: 360px; } #shop10 { left: 724px; top: 540px; width: 270px; height: 360px; }
    #ath { left: 390px; top: 460px; width: 300px; height: 462px; } #ath img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; } #ath #a-n { opacity: 1; }`, `
    <div class="eye">THE OPERATOR’S LEDGER · STP</div>
    <div id="h1" class="serif"><div class="l1">Same menu. Two sites.</div><div class="l2">Who is each for?</div></div>
    <img id="plat" class="abs" src="assets/props/station-platform.svg" alt="" /><img id="str" class="abs" src="assets/props/residential-street.svg" alt="" />
    <div id="ground" class="abs"></div>
    <img id="shop1" class="abs" src="assets/shops/site-1.svg" alt="" />
    <img id="shop10" class="abs" src="assets/shops/site-10.svg" alt="" />
    <div id="ath" class="abs"><img id="a-n" src="assets/athena/athena-standing-neutral.svg" alt="" /><img id="a-l" src="assets/athena/athena-looking-left.svg" alt="" /><img id="a-r" src="assets/athena/athena-looking-right.svg" alt="" /></div>`, `
    // frame 0 is the LinkedIn thumbnail: a finished poster at t = 0, no entrance motion. The story motion starts after 0.5 s.
    const P = ${JSON.stringify(P)};
    poses(P, "#a-l", ${Math.max(tk[0], 0.6)});
    poses(P, "#a-r", ${tk[1]});
    poses(P, "#a-n", ${tk[2]});`));
}

// ===== 2. the two sites, the two figures =========================================================
{
  const d = S.s2.dur, c20 = cue('s2', 'twenty'), c13 = cue('s2', 'thirteen'), cs1 = cue('s2', 'site', 1), cs10 = cue('s2', 'site', 2);
  tickAt.push([2, c20 + 1.0], [2, c13 + 1.0]);
  write('sites', wrap('sites', d, `
    #ground { left: 86px; top: 893px; width: 908px; height: 5px; background: var(--ink); }
    #plat { left: 86px; top: 667px; width: 420px; height: 300px; } #str { left: 658px; top: 712px; width: 336px; height: 240px; }
    #shop1 { left: 86px; top: 540px; width: 270px; height: 360px; } #shop10 { left: 724px; top: 540px; width: 270px; height: 360px; }
    #k1 { left: 86px; top: 330px; } #k10 { left: 664px; top: 330px; }
    #f1 { left: 86px; top: 372px; font-size: 96px; line-height: 1; } #f10 { left: 664px; top: 372px; font-size: 96px; line-height: 1; }
    #ath { left: 400px; top: 489px; width: 280px; height: 431px; } #ath img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; } #ath #a-n { opacity: 1; }`, `
    <div class="eye">THE STAKES · ILLUSTRATIVE FIGURES, WEEKLY</div>
    <img id="plat" class="abs" src="assets/props/station-platform.svg" alt="" /><img id="str" class="abs" src="assets/props/residential-street.svg" alt="" />
    <div id="ground" class="abs"></div>
    <img id="shop1" class="abs" src="assets/shops/site-1.svg" alt="" />
    <img id="shop10" class="abs" src="assets/shops/site-10.svg" alt="" />
    <div id="k1" class="kick">SITE 1</div><div id="f1" class="serif">£0</div>
    <div id="k10" class="kick">SITE 10</div><div id="f10" class="serif">£0</div>
    <div id="ath" class="abs"><img id="a-n" src="assets/athena/athena-standing-neutral.svg" alt="" /><img id="a-l" src="assets/athena/athena-looking-left.svg" alt="" /><img id="a-r" src="assets/athena/athena-looking-right.svg" alt="" /></div>`, `
    const P = ["#a-n", "#a-l", "#a-r"];
    ["#plat", "#str", "#ground", "#shop1", "#shop10", "#ath", ".eye"].forEach((s, i) => tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power3.out" }, 0));
    poses(P, "#a-l", ${cs1}); pop("#k1", ${cs1}); pop("#f1", ${cs1}); count("#f1", 20000, ${c20}, gbp);
    poses(P, "#a-r", ${cs10}); pop("#k10", ${cs10}); pop("#f10", ${cs10}); count("#f10", 13000, ${c13}, gbp);
    poses(P, "#a-n", ${cue('s2', 'both')});`));
}

// ===== 3 and 4. the stacked bars ===============================================================
const PX = 0.026, BASEY = 830, BW = 190, X1 = 86, X10 = 540;
const stack = (id, x, parts, hi) => { // parts: [value, colour] bottom to top
  let y = BASEY, out = '';
  parts.forEach(([v, col], i) => { const h = v * PX; y -= h; out += `<div class="seg" data-i="${i}" style="left:0;width:${BW}px;top:${y - (BASEY - parts.reduce((s, p) => s + p[0] * PX, 0))}px;height:${h}px;background:${col};${i ? 'border-top:3px solid #f3f2f2;' : ''}"></div>`; });
  const H = parts.reduce((s, p) => s + p[0] * PX, 0);
  return `<div id="${id}" class="abs" style="left:${x}px;top:${BASEY - H}px;width:${BW}px;height:${H}px;border:5px solid #201e1d;box-sizing:border-box;overflow:hidden">${out}</div>`;
};
const BAR_CSS = `
    #ground { left: 86px; top: ${BASEY}px; width: 908px; height: 5px; background: var(--ink); }
    #sh1 { left: ${X1}px; top: 848px; width: 112px; height: 150px; } #sh10 { left: ${X10}px; top: 848px; width: 112px; height: 150px; }
    .num { font-size: 64px; line-height: 1; } .lab { font-size: 30px; line-height: 1.1; }`;
const SH = `<img id="sh1" class="abs" src="assets/shops/site-1.svg" alt="" /><img id="sh10" class="abs" src="assets/shops/site-10.svg" alt="" />`;
{
  const d = S.s3.dur, cSplit = cue('s3', 'split'), c1 = cue('s3', 'eleven'), c10 = cue('s3', 'five'), cSeg = cue('s3', 'segmentation');
  const h1 = 11000 * PX, h10 = 5720 * PX;
  tickAt.push([3, cueEnd('s3', 'thousand', 2)], [3, cueEnd('s3', 'twenty')]);
  write('segmentation', wrap('segmentation', d, BAR_CSS + `
    #b1, #b10 { }
    .hi { position: absolute; left: 5px; width: ${BW - 10}px; background: var(--ink); bottom: 5px; }
    #l1 { left: ${X1 + BW + 22}px; top: ${BASEY - h1 / 2 - 60}px; } #l10 { left: ${X10 + BW + 22}px; top: ${BASEY - h10 / 2 - 60}px; }
    #l1 .lab, #l10 .lab { position: static; display: block; } #l1 .num, #l10 .num { position: static; display: block; margin-top: 8px; }`, `
    <div id="k" class="eye">SEGMENTATION · ILLUSTRATIVE FIGURES, WEEKLY</div>
    <div id="g" class="abs"></div>
    <div id="b1" class="abs" style="left:${X1}px;top:${BASEY - 20000 * PX}px;width:${BW}px;height:${20000 * PX}px;border:5px solid #201e1d;box-sizing:border-box;background:#e9d8bd"><div class="hi" id="h1" style="height:${h1 - 5}px"></div></div>
    <div id="b10" class="abs" style="left:${X10}px;top:${BASEY - 13000 * PX}px;width:${BW}px;height:${13000 * PX}px;border:5px solid #201e1d;box-sizing:border-box;background:#e9d8bd"><div class="hi" id="h10" style="height:${h10 - 5}px"></div></div>
    <div id="ground" class="abs"></div>
    ${SH}
    <div id="l1" class="abs"><span class="sans lab">7am commuters</span><span class="serif num" id="n1">£0</span></div>
    <div id="l10" class="abs"><span class="sans lab">Saturday brunch</span><span class="serif num" id="n10">£0</span></div>`, `
    tl.fromTo("#k", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.1);
    rise("#b1", ${cSplit}, 1.0); rise("#b10", ${cSplit + 0.25}, 1.0);
    rise("#h1", ${c1}, 1.1); pop("#l1", ${c1}); count("#n1", 11000, ${c1 + 0.2}, gbp, 1.2);
    rise("#h10", ${c10}, 1.1); pop("#l10", ${c10}); count("#n10", 5720, ${c10 + 0.2}, gbp, 1.2);`));
}
{
  const d = S.s4.dur, c1 = cue('s4', 'fifty'), c10 = cue('s4', 'forty'), cT = cue('s4', 'targeting');
  tickAt.push([4, c1 + 1.0], [4, c10 + 1.0]);
  const s1 = [[11000, '#201e1d'], [4000, '#e9d8bd'], [2000, '#e9d8bd'], [3000, '#e9d8bd']];
  const s10 = [[5720, '#201e1d'], [2600, '#e9d8bd'], [2080, '#e9d8bd'], [1300, '#e9d8bd'], [1300, '#e9d8bd']];
  write('targeting', wrap('targeting', d, BAR_CSS + `
    #l1 { left: ${X1 + BW + 22}px; top: ${BASEY - 11000 * PX + 10}px; } #l10 { left: ${X10 + BW + 22}px; top: ${BASEY - 5720 * PX - 10}px; }
    .gauge { position: absolute; width: 120px; height: 120px; } .gauge svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    #g1 { left: ${X1 + BW + 22}px; top: ${BASEY - 11000 * PX - 120}px; } #g10 { left: ${X10 + BW + 22}px; top: ${BASEY - 5720 * PX - 240}px; }
    #l1 .pct, #l10 .pct { position: static; display: block; font-size: 84px; line-height: 1; } #l1 .of, #l10 .of { position: static; display: block; font-size: 30px; margin-top: 8px; }`, `
    <div id="k" class="eye">TARGETING · ILLUSTRATIVE FIGURES, WEEKLY</div>
    ${stack('b1', X1, s1)}${stack('b10', X10, s10)}
    <div id="ground" class="abs"></div>
    ${SH}
    <div id="g1" class="gauge"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" fill="none" stroke="#e9d8bd" stroke-width="14"/><circle id="gc1" cx="60" cy="60" r="48" fill="none" stroke="#201e1d" stroke-width="14" stroke-dasharray="301.6" stroke-dashoffset="301.6"/></svg></div>
    <div id="g10" class="gauge"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" fill="none" stroke="#e9d8bd" stroke-width="14"/><circle id="gc10" cx="60" cy="60" r="48" fill="none" stroke="#201e1d" stroke-width="14" stroke-dasharray="301.6" stroke-dashoffset="301.6"/></svg></div>
    <div id="l1" class="abs"><span class="serif pct" id="p1">0%</span><span class="sans of">of £20,000</span></div>
    <div id="l10" class="abs"><span class="serif pct" id="p10">0%</span><span class="sans of">of £13,000</span></div>`, `
    tl.fromTo("#k", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.1);
    rise("#b1", 0.1, 0.8); rise("#b10", 0.2, 0.8);
    pop("#g1", ${c1}); tl.to("#gc1", { strokeDashoffset: 301.6 * 0.45, duration: 1.0, ease: "power3.out" }, ${c1});
    pop("#g10", ${c10}); tl.to("#gc10", { strokeDashoffset: 301.6 * 0.56, duration: 1.0, ease: "power3.out" }, ${c10});
    pop("#l1", ${c1}); count("#p1", 55, ${c1}, (n) => n + "%", 1.0);
    pop("#l10", ${c10}); count("#p10", 44, ${c10}, (n) => n + "%", 1.0);
    // the target stands out: the other groups step back
    tl.to("#b1 .seg:not([data-i='0'])", { opacity: 0.55, duration: 0.5, ease: "power3.out" }, ${c1 + 0.6});
    tl.to("#b10 .seg:not([data-i='0'])", { opacity: 0.55, duration: 0.5, ease: "power3.out" }, ${c10 + 0.6});`));
}

// ===== 5. positioning ============================================================================
{
  const d = S.s5.dur, cL = cue('s5', 'commuter'), cR = cue('s5', 'brunch'), cP = cue('s5', 'positioning');
  tickAt.push([5, cL + 0.2], [5, cR + 0.2]);
  write('positioning', wrap('positioning', d, `
    #gl { left: 86px; top: 730px; width: 394px; height: 5px; background: var(--ink); } #gr { left: 560px; top: 730px; width: 434px; height: 5px; background: var(--ink); }
    #plat { left: 86px; top: 520px; width: 390px; height: 279px; }
    #gu1 { left: 150px; top: 449px; width: 195px; height: 300px; }
    #tab { left: 640px; top: 480px; width: 260px; height: 260px; }
    #gu2 { left: 540px; top: 449px; width: 195px; height: 300px; } #gu3 { left: 800px; top: 449px; width: 195px; height: 300px; }
    .card { border: 4px solid var(--ink); } #cl { left: 86px; top: 800px; width: 410px; height: 190px; } #cr { left: 560px; top: 800px; width: 434px; height: 190px; }
    #pl { left: 118px; top: 836px; font-size: 56px; line-height: 1.08; } #pr { left: 592px; top: 836px; font-size: 56px; line-height: 1.08; }`, `
    <div id="k" class="eye">POSITIONING</div>
    <div id="left"><img id="plat" class="abs" src="assets/props/station-platform.svg" alt="" /><img id="gu1" class="abs" src="assets/guests/guest-4.svg" alt="" /><div id="gl" class="abs"></div><div id="cl" class="abs card"></div><div id="pl" class="serif">Served before<br />the train</div></div>
    <div id="right"><img id="gu2" class="abs" src="assets/guests/guest-3.svg" alt="" /><img id="gu3" class="abs" src="assets/guests/guest-6.svg" alt="" /><img id="tab" class="abs" src="assets/props/brunch-table.svg" alt="" /><div id="gr" class="abs"></div><div id="cr" class="abs card"></div><div id="pr" class="serif">Nobody<br />hurries you</div></div>`, `
    tl.fromTo("#k", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.1);
    pop("#plat", 0.6, 16); pop("#gu1", 0.6, 16); pop("#gl", 0.6, 4); pop("#gu2", 0.8, 16); pop("#gu3", 0.8, 16); pop("#tab", 0.8, 16); pop("#gr", 0.8, 4); pop("#cl", ${cL - 0.1}, 14); pop("#pl", ${cL - 0.1}, 14); pop("#cr", ${cR - 0.1}, 14); pop("#pr", ${cR - 0.1}, 14);
    `));
}

// ===== 6. the call ================================================================================
{
  const d = S.s6.dur, cA = cue('s6', 'site', 1), cB = cue('s6', 'site', 2), cC = cue('s6', 'call');
  tickAt.push([6, cA + 0.6], [6, cB + 0.6]);
  write('call', wrap('call', d, `
    #ground { left: 86px; top: 893px; width: 908px; height: 5px; background: var(--ink); }
    #plat { left: 86px; top: 667px; width: 400px; height: 286px; clip-path: inset(74% 0 0 0); } #str { left: 614px; top: 689px; width: 380px; height: 271px; clip-path: inset(74% 0 0 0); }
    #shop1 { left: 86px; top: 413px; width: 360px; height: 480px; } #shop10 { left: 634px; top: 413px; width: 360px; height: 480px; }
    #tab { left: 790px; top: 735px; width: 190px; height: 190px; }
    #ath { left: 390px; top: 460px; width: 300px; height: 462px; } #ath img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; } #ath #a-n { opacity: 1; }
    .v1 { left: 86px; top: 150px; font-size: 52px; line-height: 1.1; } .v1 b { display: block; font-weight: 300; font-size: 58px; color: var(--ink); } .v1 i { font-style: normal; color: var(--grey); }
    #v10 { left: 560px; }`, `
    <img id="plat" class="abs" src="assets/props/station-platform.svg" alt="" /><img id="str" class="abs" src="assets/props/residential-street.svg" alt="" />
    <div id="ground" class="abs"></div>
    <img id="shop1" class="abs" src="assets/shops/site-1.svg" alt="" /><img id="shop10" class="abs" src="assets/shops/site-10.svg" alt="" />
    <div id="ath" class="abs"><img id="a-n" src="assets/athena/athena-standing-neutral.svg" alt="" /><img id="a-p" src="assets/athena/athena-pointing.svg" alt="" /><img id="a-l" src="assets/athena/athena-looking-left.svg" alt="" /><img id="a-r" src="assets/athena/athena-looking-right.svg" alt="" /></div>
    <div id="v1" class="serif v1"><i>Site 1:</i><b>7am commuters</b></div>
    <div id="v10" class="serif v1"><i>Site 10:</i><b>Saturday brunch</b></div>`, `
    const P = ["#a-n", "#a-p", "#a-l", "#a-r"];
    poses(P, "#a-l", ${cA}); pop("#v1", ${cA}, 14);
    poses(P, "#a-r", ${cB}); pop("#v10", ${cB}, 14);
    poses(P, "#a-p", ${cB + 1.6});`));
}

// ===== 7 + 8. the Monday card (bone, as Ep 03 v3): it holds through "This is the Operator's Ledger." ===============
const WAVE = 0.8; // the ink wave starts this long before the end card, once the sign-off line has finished
{
  const d = S.s7.dur + S.s8.dur - WAVE, words = ['Which', 'customers', 'bring', 'each', 'site', 'the', 'most', 'sales?'];
  const keys = ['which', 'customers', 'bring', 'each', 'site', 'the', 'most', 'sales'];
  const cues = keys.map(k => cue('s7', k, k === 'site' ? 2 : 1));
  write('question', wrap('question', d, `
    #root { background: transparent; }
    #q { left: 86px; top: 250px; width: 908px; font-size: 124px; line-height: 1.07; color: var(--ink); white-space: normal; }
    #q .l3 { color: var(--grey); } #q span { display: inline-block; margin-right: 0.2em; }`, `
    <div id="q" class="serif">${words.slice(0, 2).map(w => `<span>${w}</span>`).join('')}<br />${words.slice(2, 5).map(w => `<span>${w}</span>`).join('')}<br /><div class="l3">${words.slice(5).map(w => `<span>${w}</span>`).join('')}</div></div>`, `
    const cues = ${JSON.stringify(cues)};
    document.querySelectorAll("#q span").forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, cues[i] - 0.1));`));
}

// ===== end card (as Ep 03 v3: ink wave, WRW tile at the top, kicker, episode line, brand, name, mountains) ===========
const ECD = END + WAVE;
write('endcard', `<template>
  <style>
    ${FONTS}
    #root { position: absolute; inset: 0; background: transparent; color: #f3f2f2; overflow: hidden; }
    .wv { position: absolute; left: 0; top: 0; width: 1080px; height: 1700px; }
    #ec-mtn { position: absolute; left: -200px; top: 990px; width: 1480px; height: 370px; }
    #ec-logo { position: absolute; left: 88px; top: 270px; width: 160px; height: 160px; }
    #ec-kick { position: absolute; left: 88px; top: 466px; font: 500 38px/1 "Archivo", sans-serif; letter-spacing: .2em; white-space: nowrap; }
    #ec-ep { position: absolute; left: 88px; top: 528px; font: 500 28px/1 "Archivo", sans-serif; letter-spacing: .2em; color: #a8a5a4; white-space: nowrap; }
    #ec-brand { position: absolute; left: 88px; top: 628px; font: 500 28px/1 "Archivo", sans-serif; letter-spacing: .22em; color: #a8a5a4; }
    #ec-name { position: absolute; left: 88px; top: 678px; font: 400 32px/1.2 "Archivo", sans-serif; }
  </style>
  <div id="root" data-composition-id="endcard" data-width="1080" data-height="1350">
    <svg id="w-grey" class="wv" viewBox="0 0 1080 1700"><path d="M0,90 C180,10 360,170 540,90 C720,10 900,170 1080,90 L1080,1700 L0,1700 Z" fill="#8f8d8c"/></svg>
    <svg id="w-ink" class="wv" viewBox="0 0 1080 1700"><path d="M0,120 C180,40 360,200 540,120 C720,40 900,200 1080,120 L1080,1700 L0,1700 Z" fill="#201e1d"/></svg>
    <img id="ec-mtn" src="assets/brand/mountains-bone-on-ink.svg" alt="" />
    <img id="ec-logo" src="assets/brand/WRW-logo-white-on-red.svg" alt="" />
    <div id="ec-kick">THE OPERATOR’S LEDGER</div>
    <div id="ec-ep">EPISODE 4 · STP</div>
    <div id="ec-brand">WRW HOSPITALITY</div>
    <div id="ec-name">Wesley Williams</div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    // the ledger's ground changes by an ink wave rising out of the bottom, on the sign-off, not a bang
    tl.fromTo("#w-grey", { y: 1360 }, { y: -190, duration: 1.0, ease: "power3.inOut" }, 0);
    tl.fromTo("#w-ink", { y: 1360 }, { y: -190, duration: 1.0, ease: "power3.inOut" }, 0.14);
    tl.fromTo("#ec-mtn", { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, ${WAVE + 0.2});
    // the one allowed overshoot: the WRW logo stamps on
    tl.fromTo("#ec-logo", { opacity: 0, scale: 1.15, rotation: 3 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, ease: "power3.out" }, ${WAVE + 0.1});
    tl.fromTo(["#ec-kick", "#ec-ep", "#ec-brand", "#ec-name"], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.1 }, ${WAVE + 0.2});
    tl.set({}, {}, ${ECD});
    window.__timelines["endcard"] = tl;
  </script>
</template>
`);

// ===== captions: word-synced, centred, plain (no band), Ep 03 v3 look: spoken ink, current word red, next words grey ====
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#x27;');
let caps = '', capJs = '', n = 0; const srt = [];
const ts = s => { const ms = Math.round(s * 1000); const p = (x, l = 2) => String(x).padStart(l, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
for (const id of ids) {
  const ws = lines[id].words, chunks = []; let cur = [];
  ws.forEach((w, i) => { cur.push(w); const brk = /[.?!:,]$/.test(w.text); if ((brk && cur.length >= 2) || cur.length >= 5 || /[.?!]$/.test(w.text)) { chunks.push(cur); cur = []; } });
  if (cur.length) { if (chunks.length && cur.length < 2) chunks[chunks.length - 1].push(...cur); else chunks.push(cur); }
  chunks.forEach((c, k) => {
    const base = S[id].start + S[id].lead;
    const a = base + c[0].start, nxt = chunks[k + 1] ? base + chunks[k + 1][0].start - 0.02 : base + c[c.length - 1].end + 0.2;
    const text = c.map(w => w.text).join(' ');
    caps += `    <div id="cap-${n}" class="cap clip" data-start="${a.toFixed(2)}" data-duration="${Math.max(0.3, nxt - a).toFixed(2)}" data-track-index="0">${c.map((w, j) => `<span id="w${n}-${j}">${esc(w.text)}</span>`).join(' ')}</div>\n`;
    c.forEach((w, j) => { const t0 = base + w.start, t1 = c[j + 1] ? base + c[j + 1].start : nxt; capJs += `    tl.set("#w${n}-${j}", { color: "#ec3013" }, ${t0.toFixed(2)}); tl.set("#w${n}-${j}", { color: "#201e1d" }, ${t1.toFixed(2)});\n`; });
    srt.push(`${n + 1}\n${ts(a)} --> ${ts(nxt)}\n${text}\n`); n++;
  });
}
write('captions', `<template>
  <style>
    @font-face { font-family: "Archivo"; font-weight: 500; src: url("assets/fonts/Archivo-Medium.ttf") format("truetype"); }
    #root { position: absolute; inset: 0; pointer-events: none; }
    .cap { position: absolute; left: 86px; bottom: 150px; width: 908px; text-align: center; font: 500 48px/1.16 "Archivo", sans-serif; letter-spacing: -0.012em; color: #201e1d; font-variant-numeric: tabular-nums; }
    .cap span { color: #8d8b8a; }
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1350">
${caps}  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
${capJs}    tl.set({}, {}, ${(S.s8.start + S.s8.dur).toFixed(2)});
    window.__timelines["captions"] = tl;
  </script>
</template>
`);
fs.mkdirSync(path.resolve(HERE, '../renders'), { recursive: true });
fs.writeFileSync(path.resolve(HERE, '../renders/operators-ledger-ep04-stp-v3.srt'), srt.join('\n'));

// ===== index.html ===================================================================================
const comp = { s1: 'cold', s2: 'sites', s3: 'segmentation', s4: 'targeting', s5: 'positioning', s6: 'call' };
let scenes = '';
for (const [sid, name] of Object.entries(comp)) scenes += `      <div id="${name}" data-composition-id="${name}" data-composition-src="compositions/${name}.html" data-start="${S[sid].start}" data-duration="${S[sid].dur}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1350"></div>\n`;
const qd = +(S.s7.dur + S.s8.dur - WAVE).toFixed(3);
scenes += `      <div id="question" data-composition-id="question" data-composition-src="compositions/question.html" data-start="${S.s7.start}" data-duration="${qd}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1350"></div>\n`;
scenes += `      <div id="endcard" data-composition-id="endcard" data-composition-src="compositions/endcard.html" data-start="${(S.end.start - WAVE).toFixed(3)}" data-duration="${ECD.toFixed(3)}" data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1350"></div>\n`;
let audio = '';
ids.forEach(id => { audio += `      <audio id="vo-${id}" class="clip" src="assets/vo/${id}.wav" data-start="${(S[id].start + S[id].lead).toFixed(3)}" data-duration="${lines[id].duration}" data-track-index="3" data-volume="1.1"></audio>\n`; });
const ticks = tickAt.map(([sc, tt], i) => `      <audio id="tick-${i}" class="clip" src="assets/sfx-tick.mp3" data-start="${(S['s' + sc].start + tt).toFixed(2)}" data-duration="0.366" data-track-index="5" data-volume="1.4"></audio>\n`).join('');
fs.writeFileSync(path.join(HERE, 'index.html'), `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1350" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      /* The Operator's Ledger, Episode 4 v3. Tokens from ../../DESIGN.md. Generated by build.mjs: edit there. */
      :root { --bone: #f3f2f2; --ink: #201e1d; --red: #ec3013; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1350px; overflow: hidden; background: var(--bone); }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1350">
${scenes}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${(S.s8.start + S.s8.dur).toFixed(2)}" data-track-index="3" data-track-kind="captions" data-width="1080" data-height="1350" style="z-index: 10"></div>

      <!-- voiceover: Wesley's cloned voice (VoiceStudio profile ca7acc09, VoxCPM2), de-plosived, breaths tightened -->
${audio}
      <!-- music bed: the series bed (ACE-Step, local), ducked low -->
      <audio id="music" class="clip" src="assets/music-bed.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="4" data-volume="0.148" data-fade-in="1.0" data-fade-out="2.5"></audio>
${ticks}    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
fs.writeFileSync(path.join(HERE, 'timing.json'), JSON.stringify({ total: TOTAL, scenes: S, ticks: tickAt }, null, 1));
console.log('total', TOTAL, JSON.stringify(S));
