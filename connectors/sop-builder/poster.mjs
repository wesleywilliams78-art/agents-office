// The A3 wall poster, built as HTML to the poster spec in the SOP skills and printed to PDF by headless Chrome.
// Layout A carries a whole SOP at a glance; layout B is a flow poster (a sequence, up to 8 stops).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { BRANDS } = require('./brands.cjs');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICONS = {
  queue: '<circle cx="17" cy="15" r="6"/><path d="M6 39c0-8 5-13 11-13s11 5 11 13"/><circle cx="35" cy="18" r="5"/><path d="M31 28c7-2 12 3 12 11"/>',
  menu: '<rect x="7" y="6" width="34" height="26" rx="3"/><path d="M13 14h22M13 20h22M13 26h14M16 32v10M32 32v10"/>',
  card: '<rect x="5" y="12" width="38" height="25" rx="4"/><path d="M5 20h38M11 30h10"/>',
  screen: '<rect x="5" y="8" width="38" height="25" rx="3"/><path d="M17 41h14M24 33v8M12 16h14M12 22h22"/>',
  flame: '<path d="M24 5c2 8 11 12 11 23a11 11 0 0 1-22 0c0-5 3-8 5-11 1 4 3 5 4 5-1-6 0-12 2-17z"/>',
  tick: '<circle cx="24" cy="24" r="17"/><path d="M15 25l7 7 12-14"/>',
  bag: '<path d="M10 17h28l-3 25H13z"/><path d="M17 17v-4a7 7 0 0 1 14 0v4"/>',
  table: '<path d="M6 17h36M10 17l-2 24M38 17l2 24M12 29h24"/>',
};
const iconSvg = (name, stroke) => `<svg viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.tick}</svg>`;

function waves(c) {
  return `<svg style="position:absolute;top:0;right:0;width:560px;height:330px" viewBox="0 0 560 380" preserveAspectRatio="none" aria-hidden="true">
    <path d="M96 0 C146 86 76 174 208 222 C334 268 328 148 432 182 C492 200 524 262 560 286" fill="none" stroke="#${c.ACCENT}" stroke-width="1.5" opacity=".4"/>
    <path d="M118 0 C168 78 98 162 218 206 C332 246 328 134 430 166 C488 183 522 246 560 268" fill="none" stroke="#${c.ACCENT}" stroke-width="1.5" opacity=".65"/>
    <path d="M140 0 C190 70 120 150 230 190 C330 226 330 120 430 150 C490 168 520 230 560 250 L560 0 Z" fill="#${c.WAVE2}"/>
    <path d="M230 0 C270 60 210 120 290 150 C370 180 380 100 450 120 C500 134 530 180 560 190 L560 0 Z" fill="#${c.ACCENT}"/>
    <path d="M330 0 C350 30 320 60 360 80 C410 104 430 50 480 62 C520 72 545 95 560 100 L560 0 Z" fill="#${c.SECOND}"/></svg>
  <svg style="position:absolute;bottom:0;left:0;width:560px;height:100px" viewBox="0 0 520 120" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 28 C60 8 115 50 185 58 C268 70 305 28 388 58 C440 78 490 100 520 108" fill="none" stroke="#${c.ACCENT}" stroke-width="1.5" opacity=".6"/>
    <path d="M0 120 L0 40 C60 20 110 60 180 70 C260 82 300 40 380 70 C430 90 480 110 520 120 Z" fill="#${c.WAVE2}"/>
    <path d="M0 120 L0 78 C60 62 110 96 180 104 C240 110 290 80 360 100 C400 111 450 118 470 120 Z" fill="#${c.ACCENT}"/></svg>`;
}

function shell(B, content, body, extraCss = '') {
  const c = B.c, f = B.fonts;
  const title = content.title || [];
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title.join(' '))}</title><link rel="stylesheet" href="${f.css}"><style>
  @page { size: 1123px 1587px; margin: 0 } * { box-sizing: border-box; margin: 0; padding: 0 }
  html, body { width: 1123px; height: 1587px; background: #${c.GROUND}; -webkit-print-color-adjust: exact; print-color-adjust: exact }
  .root { position: relative; overflow: hidden; width: 1123px; height: 1587px; background: #${c.GROUND}; color: #${c.TEXT}; font-family: '${f.head}', sans-serif }
  .wrap { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; padding: 44px 72px 36px }
  .mast { display: flex; align-items: center; gap: 18px; height: 52px }
  .mark { font-family: '${f.mark}', serif; font-weight: ${f.markWeight}; font-size: 58px; color: #${c.ACCENT}; line-height: 1 }
  .div { width: 1px; height: 24px; background: #${c.DIVIDER} }
  .lab { font-family: '${f.label}', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: .28em; color: #${c.MUTED}; text-transform: uppercase }
  .title { max-width: 600px; margin-top: 8px } h1 { font-weight: 800; font-size: 60px; line-height: 60px; color: #fff; text-transform: uppercase }
  h1 .acc { color: #${c.ACCENT} }
  .sub { display: inline-block; margin-top: 14px; padding-bottom: 14px; border-bottom: 2px solid #${c.ACCENT}; font-family: '${f.label}', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: .3em; color: #${c.ACCENT} }
  .foot { margin-top: auto; text-align: right; font-family: '${f.label}', sans-serif; font-size: 11px; letter-spacing: .14em; color: #${c.MUTED}; text-transform: uppercase }
  .tag { font-family: '${f.label}', sans-serif; font-weight: 700; letter-spacing: .2em; text-transform: uppercase }
  ${extraCss}</style></head><body><div class="root">${waves(c)}<div class="wrap">
  <div class="mast"><span class="mark">${esc(B.posterMark)}</span><span class="div"></span><span class="lab">${esc(B.posterHeaderRest)}</span></div>
  <div class="title"><h1>${esc(title[0] || '')}${title[1] ? `<br><span class="${content.poster?.accentSecondLine ? 'acc' : ''}">${esc(title[1])}</span>` : ''}</h1><div class="sub">STANDARD OPERATING PROCEDURE</div></div>
  ${body}
  <div class="foot">${esc((content.shortTitle || title.join(' ')).toUpperCase())} SOP | ${esc(B.posterFooterRest)}${content.poster?.layout === 'B' && content.poster.fullSopRef ? ` | FULL SOP: ${esc(content.poster.fullSopRef)}` : ''}</div>
  </div></div></body></html>`;
}

const table = (head, rows, c) => `<table class="t"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${i % 2 === 0 ? 's' : ''}">${r.map((x, j) => `<td class="${j === 0 ? 'f' : ''}">${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const steps = (list) => list.map((t, i) => `<div class="step"><span class="n">${i + 1}</span><span>${esc(t)}</span></div>`).join('');

function layoutA(B, content) {
  const c = B.c, p = content.poster, m = content.meta, f = B.fonts;
  const css = `.box { margin-top: 20px; background: #${c.PANEL}; border: 1px solid #${c.HAIR}; border-left: 5px solid #${c.ACCENT}; padding: 16px 22px; font-size: 16px; line-height: 23px }
  .box .tag { font-size: 12px; color: #${c.ACCENT}; margin-right: 10px }
  .meta { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 28px } .meta div { border-top: 1px solid #${c.HAIR}; padding-top: 10px; font-size: 16px; font-weight: 600 }
  .meta b { display: block; font-family: '${f.label}', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .2em; color: #${c.ACCENT}; text-transform: uppercase; margin-bottom: 4px }
  .row { display: grid; gap: 44px; margin-top: 28px } .r1 { grid-template-columns: 1fr 1fr } .r2 { grid-template-columns: 1.7fr 1fr } .r3 { grid-template-columns: 1fr 1fr }
  .sh { display: flex; align-items: center; gap: 14px; margin-bottom: 14px } .sh .no { font-family: '${f.label}', sans-serif; font-size: 13px; font-weight: 600; color: #${c.ACCENT} }
  .sh h2 { font-size: 26px; line-height: 32px; font-weight: 700; color: #fff } .sh .rule { flex: 1; height: 1px; background: #${c.HAIR} }
  h3 { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px } p { font-size: 16px; line-height: 23px; margin-bottom: 8px } .note { font-style: italic; font-size: 14px; color: #${c.MUTED} }
  table.t { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 20px } .t th { font-family: '${f.label}', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .16em; color: #${c.ACCENT}; text-transform: uppercase; text-align: left; padding: 8px 12px; border-bottom: 2px solid #${c.ACCENT} }
  .t td { padding: 8px 12px; border-bottom: 1px solid #${c.HAIR} } .t td.f { font-weight: 600 } .t tr.s td { background: #${c.STRIPE} }
  .co { margin-top: 16px; background: #${c.PANEL}; border: 1px solid #${c.HAIR}; padding: 14px 18px; font-size: 15px; line-height: 22px } .co .tag { font-size: 11px; margin-right: 10px }
  .co.cream { border-left: 5px solid #${c.SECOND} } .co.cream .tag { color: #${c.SECOND} } .co.acc { border-left: 5px solid #${c.ACCENT} } .co.acc .tag { color: #${c.ACCENT} }
  .lbl { font-family: '${f.label}', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: .1em; color: #${c.ACCENT}; margin-bottom: 10px }
  .step { display: flex; gap: 12px; margin-bottom: 6px; font-size: 16px; line-height: 26px } .step .n { flex: none; width: 26px; height: 26px; border: 1.5px solid #${c.ACCENT}; border-radius: 50%; display: grid; place-items: center; font-family: '${f.label}', sans-serif; font-size: 12px; font-weight: 600; color: #${c.ACCENT} }
  .res { font-size: 15px; line-height: 26px }`;
  const sh = (no, t) => `<div class="sh"><span class="no">${no}</span><h2>${esc(t)}</h2><span class="rule"></span></div>`;
  const body = `<div class="box"><span class="tag">PURPOSE</span>${esc(p.purpose || content.purpose)}</div>
  <div class="meta">${[['Category', m.category], ['Section', m.section], ['Applies to', m.appliesTo], ['Owner', m.owner], ['Status', m.status], ['Reporting owner', m.reportingOwner]].map(([k, v]) => `<div><b>${k}</b>${esc(v)}</div>`).join('')}</div>
  <div class="row r1"><div><h3>How to use this SOP</h3><p>${esc(p.howToUse)}</p>${sh('1', 'Introduction')}${p.intro.map(t => `<p>${esc(t)}</p>`).join('')}<p class="note">${esc(p.introNote)}</p></div>
    <div>${sh('2', 'Minimum Operating Standards')}${table(['Standard', 'Requirement'], p.standards.rows, c)}<div class="co cream"><span class="tag">KEY RULE</span>${esc(p.standards.keyRule)}</div></div></div>
  <div class="row r2"><div>${sh('3', 'Roles & Responsibilities')}${table(['Activity', 'Owner', 'Can Reassign', 'Escalation'], p.roles.rows, c)}</div>
    <div style="padding-top:52px"><div class="lbl">${esc(p.roles.procedureLabel)}</div>${steps(p.roles.procedure)}<p class="note">${esc(p.roles.procedureNote)}</p></div></div>
  <div class="row r3"><div>${sh('4', 'Measure, Analyse, Improve')}${table(['Metric', 'Type', 'Cadence'], p.metrics.rows, c)}<div class="co acc"><span class="tag">REVIEW OWNER</span>${esc(p.metrics.reviewOwner)}</div></div>
    <div>${sh('5', 'Tools & Resources')}<div class="lbl">${esc(p.tools.howLabel)}</div>${steps(p.tools.steps)}<div class="lbl" style="margin-top:14px">RELATED RESOURCES</div>${p.tools.resources.map(t => `<div class="res">${esc(t)}</div>`).join('')}</div></div>`;
  return shell(B, content, body, css);
}

function layoutB(B, content) {
  const c = B.c, p = content.poster, f = B.fonts, n = p.stops.length;
  const pts = p.stops.map((_, i) => [i % 2 === 0 ? 330 : 650, 62 + 122 * i]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < n; i++) d += ` C${pts[i - 1][0]} ${pts[i - 1][1] + 66} ${pts[i][0]} ${pts[i][1] - 66} ${pts[i][0]} ${pts[i][1]}`;
  const road = `<svg style="position:absolute;left:0;top:0" width="979" height="${n * 122}" viewBox="0 0 979 ${n * 122}"><path d="${d}" fill="none" stroke="#${c.WAVE2}" stroke-width="30" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#${c.ACCENT}" stroke-width="4" stroke-dasharray="3 16" stroke-linecap="round"/></svg>`;
  const stops = p.stops.map((s, i) => {
    const [x, y] = pts[i], left = i % 2 === 0, key = !!s.key, fill = key ? c.SECOND : c.ACCENT;
    const ring = key ? `0 0 0 6px #${c.GROUND}, 0 0 0 9px #${c.SECOND}` : `0 0 0 6px #${c.GROUND}`;
    const text = `<div style="position:absolute;top:${y - 44}px;${left ? 'left:0;width:262px;text-align:right' : 'left:718px;width:261px;text-align:left'}">
      ${key ? `<span class="tag" style="display:inline-block;background:#${c.SECOND};color:#${c.INK};font-size:12px;padding:3px 10px;border-radius:99px">KEY MOMENT</span>` : `<div class="tag" style="font-size:11px;font-weight:600;color:#${c.ACCENT}">${esc(s.owner)}</div>`}
      <div style="font-weight:800;font-size:30px;line-height:32px;text-transform:uppercase;color:${key ? '#' + c.SECOND : '#fff'};margin-top:4px">${esc(s.stage)}</div>
      <div style="font-size:17px;line-height:24px;margin-top:4px">${esc(s.standard)}</div></div>`;
    return `<div style="position:absolute;left:${x - 44}px;top:${y - 44}px;width:88px;height:88px;border-radius:50%;background:#${fill};box-shadow:${ring};display:grid;place-items:center">${iconSvg(s.icon, '#' + c.INK)}
      <span style="position:absolute;top:-6px;${left ? 'right' : 'left'}:-6px;width:30px;height:30px;border-radius:50%;background:#${c.GROUND};border:2px solid #${c.ACCENT};display:grid;place-items:center;font-family:'${f.label}',sans-serif;font-weight:700;font-size:14px;color:#${c.ACCENT}">${i + 1}</span></div>${text}`;
  }).join('');
  const body = `<div style="margin-top:20px;font-size:18px;line-height:26px"><span class="tag" style="font-size:12px;color:#${c.ACCENT};margin-right:10px">PURPOSE</span>${esc(p.purpose || content.purpose)}</div>
  <div style="position:relative;width:979px;height:${n * 122}px;margin-top:22px">${road}${stops}</div>
  <div style="margin-top:14px;background:#${c.SECOND};border-left:10px solid #${c.ACCENT};padding:16px 22px;display:flex;gap:16px;align-items:center;color:#${c.INK}"><span class="tag" style="font-size:14px;color:#${c.KEYTAG}">KEY RULE</span><span style="font-weight:700;font-size:18px;line-height:25px">${esc(p.keyRule)}</span></div>`;
  return shell(B, content, body);
}

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(p => fs.existsSync(p));
export function buildPoster(brandId, content, outDir, base) {
  const B = BRANDS[brandId], p = content.poster; if (!p) throw new Error('the content has no poster block');
  const html = p.layout === 'B' ? layoutB(B, content) : layoutA(B, content);
  const htmlFile = path.join(outDir, base + ' - Poster.html'), pdf = path.join(outDir, base + ' - Poster.pdf');
  fs.writeFileSync(htmlFile, html);
  if (!CHROME) return { html: htmlFile, pdf: null, note: 'Chrome was not found, so only the HTML poster was written' };
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=20000', `--print-to-pdf=${pdf}`, 'file:///' + htmlFile.replace(/\\/g, '/')], { timeout: 90000, stdio: 'ignore' });
  return { html: htmlFile, pdf: fs.existsSync(pdf) ? pdf : null };
}
