// Video studio: the richer card kinds and the backdrop. Each function returns { html, js } for one card, where `js` are GSAP
// calls on the shared timeline `tl` (seek-safe: no randomness, no clock). Techniques follow HyperFrames' own animation rules:
// count-up with scale (counting-dynamic-scale), bars that grow from their baseline by scaleX/scaleY (stat-bars-and-fills),
// one beat grid with a different entrance per phrase (kinetic-beat-slam).

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const at = n => (+n).toFixed(2);
const money = (v, prefix = '', suffix = '', dp = 0) => `${v < 0 ? '-' : ''}${prefix}${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}${suffix}`;

/** `*word*` marks the word to emphasise. plain() strips the marks (for speech and captions); html() draws them. */
export const plain = t => String(t).replace(/\*/g, '');
export const html = t => esc(t).replace(/\*([^*]+)\*/g, '<span class="em">$1<i class="ul"></i></span>');

/** Slow drifting mountain ridges behind the type (the WRW motif), three layers that move at different speeds. */
export function ridges(id, g, F, start, dur) {
  const c = g.fg, rc = g.ridge, h = rc ? F.bottom - 10 : Math.round(F.h * 0.3); // g.ridge: [back, mid, front] in the report's second flag colour (a country ground)
  const layer = (cls, d, op) => { const i = cls === 'rb' ? 0 : cls === 'rm' ? 1 : 2; return `<svg class="ridge ${cls}" style="height:${h}px;opacity:${rc ? (g.ridgeOp ?? 1) : op}" viewBox="0 0 1920 480" preserveAspectRatio="none"><path d="${d}" fill="${rc ? rc[i] : c}"/></svg>`; };
  const html = layer('rb', 'M0,260 C220,120 420,90 640,170 C860,250 1000,60 1260,90 C1520,120 1700,230 1920,150 L1920,480 L0,480 Z', 0.05)
    + layer('rm', 'M0,330 C260,230 470,210 720,290 C970,370 1130,200 1400,230 C1670,260 1800,330 1920,290 L1920,480 L0,480 Z', 0.08)
    + layer('rf', 'M0,400 C300,350 560,330 840,380 C1120,430 1380,340 1640,350 C1760,356 1850,372 1920,366 L1920,480 L0,480 Z', 0.12);
  const js = `
      tl.fromTo("#${id} .rb", { x: 0 }, { x: -${Math.round(F.w * 0.04)}, duration: ${at(dur)}, ease: "none" }, ${at(start)});
      tl.fromTo("#${id} .rm", { x: 0 }, { x: -${Math.round(F.w * 0.07)}, duration: ${at(dur)}, ease: "none" }, ${at(start)});
      tl.fromTo("#${id} .rf", { x: 0 }, { x: -${Math.round(F.w * 0.11)}, duration: ${at(dur)}, ease: "none" }, ${at(start)});`;
  return { html, js };
}

/** A stat card: one number counts up while it grows into place, a rule fills under it, the label arrives first. */
export function stat(id, c, g, F, t0, dur, accent, scale = 1, capSpace = 0) {
  const v = +c.value, dp = Number.isInteger(v) ? 0 : (c.decimals ?? 1), size = Math.round(F.w * 0.3 * scale);
  const html = `
        <div class="stat" style="left:${F.side}px;top:${F.top}px;width:${F.w - 2 * F.side}px;height:${F.h - F.top - F.bottom - capSpace}px">
          <div class="statlabel" style="color:${accent}">${esc(plain(c.text))}</div>
          <div class="statnum" style="font-size:${size}px${g.figure ? `;color:${g.figure}` : ''}"><span class="num">${money(0, c.prefix, c.suffix, dp)}</span></div>
          <div class="statrule"><i style="background:${accent}"></i></div>
          ${c.sub ? `<div class="sub">${esc(c.sub)}</div>` : ''}
        </div>`;
  const cd = Math.min(1.6, Math.max(0.9, dur * 0.45));
  const js = `
      tl.fromTo("#${id} .statlabel", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${at(t0)});
      (function () { const s = { v: 0 }, el = document.querySelector("#${id} .num");
        tl.to(s, { v: ${v}, duration: ${at(cd)}, ease: "power3.out", onUpdate: () => { el.textContent = ${JSON.stringify(c.prefix || '')} + s.v.toLocaleString("en-GB", { minimumFractionDigits: ${dp}, maximumFractionDigits: ${dp} }) + ${JSON.stringify(c.suffix || '')}; } }, ${at(t0 + 0.25)}); })();
      tl.fromTo("#${id} .statnum", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: ${at(cd)}, ease: "power3.out", transformOrigin: "left center" }, ${at(t0 + 0.25)});
      tl.fromTo("#${id} .statrule i", { scaleX: 0 }, { scaleX: 1, duration: ${at(cd)}, ease: "power3.out" }, ${at(t0 + 0.25)});` + (c.sub ? `
      tl.fromTo("#${id} .sub", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, ${at(t0 + cd + 0.3)});` : '');
  return { html, js };
}

/** A waterfall card: rows top to bottom, each a bar placed where the running total puts it, drawn in on a beat. Built for unit
 *  economics ("£20 in, minus food, minus labour, minus fees, £6 left") but works for any start-minus-costs-equals-end story. */
export function waterfall(id, c, g, F, t0, dur, accent, capSpace = 0) {
  const items = c.items, max = Math.max(...items.map(i => Math.abs(i.value)), 1) * 1;
  const total = items.filter(i => i.type === 'total').reduce((m, i) => Math.max(m, i.value), 0) || max;
  let run = 0; const rows = items.map(i => {
    let from, to;
    if (i.type === 'total') { from = 0; to = i.value; run = i.value; }
    else if (i.value < 0) { to = run; from = run + i.value; run += i.value; }
    else { from = run; to = run + i.value; run += i.value; }
    return { ...i, left: Math.max(0, from) / total * 100, width: Math.max(0.5, (to - from) / total * 100) };
  });
  const boxW = F.w - 2 * F.side, rowH = Math.min(150, Math.floor((F.h - F.top - F.bottom - capSpace - 200) / items.length));
  const html = `
        <div class="wf" style="left:${F.side}px;top:${F.top}px;width:${boxW}px;height:${F.h - F.top - F.bottom - capSpace}px">
          ${c.text ? `<div class="wftitle">${esc(plain(c.text))}</div>` : ''}
          ${rows.map((r, k) => `<div class="wfrow" style="height:${rowH}px"><div class="wfhead"><span class="wflab">${esc(r.label)}</span><span class="wfval" data-v="${r.value}">${money(r.type === 'total' || r.value > 0 ? r.value : r.value, c.prefix, c.suffix)}</span></div><div class="wftrack"><i class="wfbar ${r.type === 'total' ? (k === rows.length - 1 ? 'final' : 'tot') : 'neg'}" style="left:${r.left.toFixed(2)}%;width:${r.width.toFixed(2)}%;background:${r.type === 'total' ? (k === rows.length - 1 ? accent : g.fg) : accent};${r.type !== 'total' ? 'opacity:.55;' : ''}"></i></div></div>`).join('')}
        </div>`;
  const step = Math.max(0.45, Math.min(0.8, (dur - 1.2) / items.length));
  const js = (c.text ? `
      tl.fromTo("#${id} .wftitle", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${at(t0)});` : '') + rows.map((r, k) => {
    const s = t0 + 0.35 + k * step;
    return `
      tl.fromTo("#${id} .wfrow:nth-child(${k + (c.text ? 2 : 1)}) .wfhead", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${at(s)});
      tl.fromTo("#${id} .wfrow:nth-child(${k + (c.text ? 2 : 1)}) .wfbar", { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power3.out", transformOrigin: "${r.type === 'total' || r.value >= 0 ? 'left' : 'right'} center" }, ${at(s + 0.05)});`;
  }).join('');
  return { html, js, rows: items.length };
}

/** Different entrance per card on one beat grid (kinetic-beat-slam): scale-and-blur slam, side snap, rise with a little rotation. */
export function kineticEntrance(id, i, t0) {
  const v = i % 3;
  if (v === 0) return `
      tl.fromTo("#${id} .txt", { scale: 1.35, filter: "blur(14px)", opacity: 0, transformOrigin: "left center" }, { scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.5, ease: "power4.out" }, ${at(t0)});`;
  if (v === 1) return `
      tl.fromTo("#${id} .txt", { x: -260, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "expo.out" }, ${at(t0)});`;
  return `
      tl.fromTo("#${id} .txt", { y: 90, rotation: 4, opacity: 0, transformOrigin: "left bottom" }, { y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "circ.out" }, ${at(t0)});`;
}

export const kindCss = (F, T) => `
      .em { position: relative; color: var(--accent); white-space: nowrap; }
      .em .ul { position: absolute; left: 0; right: 0; bottom: -0.04em; height: 0.07em; background: var(--accent); transform: scaleX(0); transform-origin: left center; }
      .ridge { position: absolute; left: -12%; width: 124%; bottom: 0; }
      .stat, .wf { position: absolute; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
      .statlabel { font-family: "${T.fonts.text.family}", sans-serif; font-weight: ${T.fonts.text.weight}; font-size: ${Math.round(F.w * 0.04)}px; letter-spacing: 0.18em; text-transform: uppercase; }
      .statnum { font-family: "${T.fonts.display.family}", Georgia, serif; font-weight: ${T.fonts.display.weight}; line-height: 1; font-variant-numeric: tabular-nums; }
      .statnum .num { display: inline-block; }
      .statrule { width: 100%; height: 8px; } .statrule i { display: block; width: 100%; height: 100%; transform-origin: left center; }
      .wftitle { font-family: "${T.fonts.text.family}", sans-serif; font-weight: ${T.fonts.text.weight}; font-size: ${Math.round(F.w * 0.036)}px; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 16px; }
      .wfrow { display: flex; flex-direction: column; justify-content: center; gap: 10px; }
      .wfhead { display: flex; justify-content: space-between; align-items: baseline; font-family: "${T.fonts.display.family}", Georgia, serif; font-weight: ${T.fonts.display.weight}; font-size: ${Math.round(F.w * 0.06)}px; line-height: 1; }
      .wflab { font-family: "${T.fonts.text.family}", sans-serif; font-weight: ${T.fonts.text.weight}; font-size: ${Math.round(F.w * 0.032)}px; letter-spacing: 0.14em; text-transform: uppercase; opacity: .85; }
      .wfval { font-variant-numeric: tabular-nums; }
      .wftrack { position: relative; width: 100%; height: ${Math.round(F.w * 0.036)}px; background: rgba(127,127,127,.14); }
      .wfbar { position: absolute; top: 0; bottom: 0; display: block; }`;
