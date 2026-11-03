// Franchise Entry Report: turns the agents' finished text (seven "## Page N. headline" sections plus "## Sources") into the A4 PDF.
//   node connectors/franchise-report/build.mjs <issue-text.md> <out.pdf>
// The look follows Issue 01: red cover, bone pages, Playfair Display headlines, Inter body, the WRW logo top-left, the mountain line on the
// cover and the last page, and the footer "WRW Hospitality · Franchise Entry Report · Issue NN" with "Page X of 7". Each page shrinks its own
// type until it fits one A4 sheet, and the build fails unless the PDF is exactly seven pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const RED = '#FF3131', BONE = '#F1ECE2', BONE2 = '#E6DFD2', INK = '#111111', TEXT2 = '#4A4743', MUTED = '#8A857D';
const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) { console.error('usage: node build.mjs <issue-text.md> <out.pdf>'); process.exit(2); }

const src = fs.readFileSync(inFile, 'utf8').replace(/\r/g, '');
const title = (/^# (.+)$/m.exec(src) || [])[1] || '';
const issue = ((/Issue\s+(\d+)/i.exec(title) || /Issue\s+(\d+)/i.exec(src) || [])[1] || '00').padStart(2, '0');
const country = ((/Issue\s+\d+:\s*([^.\n]+)/i.exec(title) || [])[1] || '').trim();
const sections = [...src.matchAll(/^## Page (\d)\.\s*(.*)\n([\s\S]*?)(?=^## |\n---\s*\n## |$(?![\s\S]))/gm)].map(m => ({ n: +m[1], head: m[2].trim(), body: m[3].trim() }));
// only the numbered lines straight under "## Sources": the agents' working notes that follow (caption, brain update) never reach the PDF
const sourcesRaw = (() => { const out = []; for (const l of ((/^## Sources\s*\n([\s\S]*)$/m.exec(src) || [])[1] || '').split('\n')) { if (/^## /.test(l)) break; if (/^\s*\d+\.\s/.test(l)) out.push(l); } return out.join('\n'); })();
if (sections.length !== 7) { console.error(`expected 7 "## Page N." sections, found ${sections.length}`); process.exit(1); }

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(S\d+)\]/g, '<sup class="src">$1</sup>').replace(/\*(.+?)\*/g, '<i>$1</i>');
function md(text) {
  const lines = text.split('\n'); let html = '', i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim() || /^---+$/.test(l.trim())) { i++; continue; }
    if (/^\|/.test(l)) { // a table
      const rows = []; while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]), body = rows.slice(2).map(cells);
      html += `<table><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; continue;
    }
    if (/^\s*[-*] /.test(l)) { const items = []; while (i < lines.length && /^\s*[-*] /.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*] /, '')); i++; } html += `<ul>${items.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`; continue; }
    if (/^\s*\d+\. /.test(l)) { const items = []; while (i < lines.length && /^\s*\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\. /, '')); i++; } html += `<ol>${items.map(x => `<li>${inline(x)}</li>`).join('')}</ol>`; continue; }
    let para = l; i++; while (i < lines.length && lines[i].trim() && !/^(\||\s*[-*] |\s*\d+\. |---)/.test(lines[i])) { para += ' ' + lines[i]; i++; }
    // a line made only of bold text is a sub-heading; "**Label:** text" stays a paragraph
    html += /^\*\*[^*]+\*\*:?$/.test(para.trim()) ? `<h3>${inline(para.trim().replace(/:$/, ''))}</h3>` : (/^If I had a brand/i.test(para.replace(/\*/g, '')) ? '' : `<p>${inline(para)}</p>`);
  }
  return html;
}

const png = f => 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'connectors', 'video-studio', 'brand', 'logos', f)).toString('base64');
const svg = f => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'assets', 'brand', f)).toString('base64');
const logoRed = png('wrw-logo-red-rounded-original.png'), logoWhite = png('wrw-mark-white.png');
const mountInk = svg('mountains-ink-on-bone.svg'), mountWhite = svg('mountains-white-on-red.svg');
const kicker = `WRW HOSPITALITY · FRANCHISE ENTRY REPORT · ISSUE ${issue}`;
const footer = n => `<div class="foot"><span>WRW Hospitality · Franchise Entry Report · Issue ${issue}</span><span>Page ${n} of 7</span></div>`;

// the cover: country, verdict, three numbers
const c = sections[0].body, coverLine = (/^\*\*(.+?)\*\*\s*·\s*(.+)$/m.exec(c) || []);
const verdict = ((/\*\*Verdict:\*\*\s*([\s\S]*?)(?=\n\s*\n|\*\*Three)/.exec(c) || [])[1] || '').trim();
const nums = [...(/\*\*Three numbers\*\*\s*\n([\s\S]*)$/.exec(c) || [, ''])[1].matchAll(/^\s*[-*] (.+)$/gm)].map(m => m[1].trim()).slice(0, 3);
const stat = t => { const m = /^((?:About|Over|Under|Around)\s+)?([£$]?[\d][\d.,]*\s?(?:%|bn|billion|m|million|kr)?)\s*(.*)$/i.exec(t.replace(/\[S\d+\]/g, '').trim()); return m ? { big: ((m[1] || '') + m[2]).trim(), small: m[3] } : { big: '', small: t.replace(/\[S\d+\]/g, '') }; };
const cover = `<section class="page cover" data-n="1"><img class="logo" src="${logoWhite}"><div class="ck">${kicker}</div>
<h1>Franchise<br>Entry Report</h1><div class="country">${esc(coverLine[1] || country)}</div><div class="issueline">Issue ${issue} · ${esc((coverLine[2] || '').replace(/^Issue\s+\d+\s*·\s*/i, ''))}</div>
<p class="verdict">${inline(verdict)}</p><div class="tiles">${nums.map(stat).map(s => `<div class="tile"><div class="big">${esc(s.big)}</div><div class="sm">${esc(s.small)}</div></div>`).join('')}</div>
<img class="mount" src="${mountWhite}">${footer(1)}</section>`;

const page = s => {
  s = { ...s, body: s.body.split('\n').filter(l => !/^\*\*Footer on every page/i.test(l)).join('\n') };
  const last = s.n === 7, srcs = last ? `<h3>Sources</h3><ol class="sources">${sourcesRaw.split('\n').map(l => l.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean).map(l => `<li>${inline(l)}</li>`).join('')}</ol>` : '';
  const brand = (() => { const m = /\*\*If I had a brand\*\*[^\n:]*:\s*["“]?([^\n]*?)["”]?\s*$/m.exec(s.body); return m ? m[1] : ''; })();
  return `<section class="page" data-n="${s.n}"><img class="logo" src="${logoRed}"><div class="kick">${kicker}</div><h2>${inline(s.head)}</h2><div class="body">${md(s.body)}${brand ? `<div class="position"><div class="pl">IF I HAD A BRAND</div><p>${inline(brand)}</p><div class="sig">Wesley Williams, WRW Hospitality</div></div>` : ''}${srcs}</div>${last ? `<img class="mountfoot" src="${mountInk}">` : ''}${footer(s.n)}</section>`;
};

const css = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap');
@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,Arial,sans-serif;color:${INK};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:${BONE};padding:22mm 16mm 18mm 16mm;--s:1;font-size:calc(9.4pt*var(--s));line-height:1.42}
.page:last-child{page-break-after:auto}.logo{position:absolute;left:16mm;top:9mm;height:9mm}.kick{position:absolute;right:16mm;top:11mm;font-size:6.5pt;letter-spacing:.2em;color:${MUTED};font-weight:600}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:calc(19pt*var(--s));line-height:1.18;margin:8mm 0 5mm;max-width:172mm}
h3{font-size:calc(8pt*var(--s));letter-spacing:.14em;text-transform:uppercase;color:${RED};margin:4mm 0 1.5mm;font-weight:600}
p{margin:0 0 2.2mm;color:${TEXT2}}ul,ol{margin:0 0 3mm 4.5mm;color:${TEXT2}}li{margin-bottom:1.2mm}b{color:${INK};font-weight:600}sup.src{font-size:.62em;color:${MUTED};margin-left:.5mm}
table{width:100%;border-collapse:collapse;margin:2mm 0 3mm;font-size:calc(7.6pt*var(--s));line-height:1.3}th{background:${INK};color:#fff;text-align:left;padding:1.6mm 2mm;font-weight:600;font-size:.92em}td{padding:1.6mm 2mm;border-bottom:.3mm solid ${BONE2};vertical-align:top;color:${TEXT2};background:#fff}tr:nth-child(even) td{background:${BONE}}
.position{background:${RED};color:#fff;padding:5mm 6mm;margin:4mm 0}.position .pl{font-size:7pt;letter-spacing:.2em;font-weight:600;margin-bottom:2mm}.position p{color:#fff;font-family:'Playfair Display',Georgia,serif;font-size:calc(11pt*var(--s));line-height:1.35;margin:0}.position .sig{font-size:7pt;margin-top:2.5mm;letter-spacing:.06em}
.sources{columns:2;column-gap:6mm;font-size:calc(6.2pt*var(--s));line-height:1.28;margin-left:4mm;color:${MUTED}}.sources li{margin-bottom:.8mm;break-inside:avoid}.mountfoot{position:absolute;left:0;right:0;bottom:11mm;width:100%;opacity:.9;height:14mm;object-fit:cover}
.foot{position:absolute;left:16mm;right:16mm;bottom:6mm;display:flex;justify-content:space-between;font-size:6.5pt;color:${MUTED};letter-spacing:.04em}
.cover{background:${RED};color:#fff;padding:0 16mm}.cover .logo{top:12mm;height:11mm}.cover .ck{position:absolute;right:16mm;top:15mm;font-size:6.5pt;letter-spacing:.2em;font-weight:600}
.cover h1{position:absolute;left:16mm;top:62mm;font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:46pt;line-height:1.02}.cover .country{position:absolute;left:16mm;top:100mm;font-family:'Playfair Display',Georgia,serif;font-size:64pt;font-weight:600;color:${INK}}
.cover .issueline{position:absolute;left:16mm;top:130mm;font-size:9pt;letter-spacing:.12em;text-transform:uppercase;font-weight:600}.cover .verdict{position:absolute;left:16mm;top:142mm;width:150mm;font-size:12.5pt;line-height:1.4;color:#fff}
.cover .tiles{position:absolute;left:16mm;right:16mm;top:185mm;display:flex;gap:5mm}.tile{flex:1;background:${INK};padding:5mm;min-height:36mm}.tile .big{font-family:'Playfair Display',Georgia,serif;font-size:19pt;color:#fff;margin-bottom:2mm}.tile .sm{font-size:7.4pt;color:#d8d3ca;line-height:1.35}
.cover .mount{position:absolute;left:0;right:0;bottom:12mm;width:100%;height:30mm;object-fit:cover}.cover .foot{color:#fff}.cover p{color:#fff}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Franchise Entry Report ${issue} ${esc(country)}</title><style>${css}</style></head><body>${cover}${sections.slice(1).map(page).join('')}</body></html>`;
fs.writeFileSync(outFile.replace(/\.pdf$/i, '.html'), html);

let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const pg = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await pg.setContent(html, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
await pg.evaluate(() => document.fonts.ready);
const report = await pg.evaluate(() => { const out = []; for (const el of document.querySelectorAll('.page:not(.cover)')) { const body = el.querySelector('.body'); let s = 1; const avail = () => el.clientHeight - parseFloat(getComputedStyle(el).paddingTop) - parseFloat(getComputedStyle(el).paddingBottom) - 14; const used = () => el.querySelector('.foot').getBoundingClientRect().top > 0 ? body.getBoundingClientRect().bottom - el.getBoundingClientRect().top : 0; for (let i = 0; i < 14 && body.getBoundingClientRect().bottom - el.getBoundingClientRect().top > el.clientHeight - 62 - (el.dataset.n === '7' ? 60 : 0); i++) { s = +(s - 0.04).toFixed(2); el.style.setProperty('--s', s); } out.push({ page: el.dataset.n, scale: s }); } return out; });
await pg.pdf({ path: outFile, format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true });
await browser.close();
const pages = (fs.readFileSync(outFile, 'latin1').match(/\/Type\s*\/Page(?![a-z])/g) || []).length;
console.log(JSON.stringify({ out: outFile, pages, bytes: fs.statSync(outFile).size, scales: report }));
if (pages !== 7) { console.error(`the PDF has ${pages} pages, not 7`); process.exit(1); }
