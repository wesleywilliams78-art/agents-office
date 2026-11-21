// Prints agenda.html to two PDFs in the Manual Magic Drive folder: the full one, and one for Ravi with Wesley's notes hidden.
// Page-break rule (Wesley, 5 Nov 2026): a title never sits apart from its content. A section that fits on one page is kept
// whole; a section longer than a page starts on a new page, and its blocks (questions, notes, tables) are kept whole.
// Run from the repo root: node videos/manual-magic-ai/ravi-call-2026-11-04/agenda-pdf.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = 'G:\\My Drive\\006 - Manual Magic\\Ravi call 2026-11-04';
const MM = 96 / 25.4;                                   // CSS px per mm
const margin = { top: 14, bottom: 14, left: 12, right: 12 };
const pageW = Math.floor((210 - margin.left - margin.right) * MM);
const pageH = Math.floor((297 - margin.top - margin.bottom) * MM);

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ colorScheme: 'light', viewport: { width: pageW, height: pageH } });
await page.goto(pathToFileURL(path.join(here, 'agenda.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await page.emulateMedia({ media: 'print', colorScheme: 'light' });
await page.addStyleTag({ content: `
  #toggleNotes, #shareBanner, nav[aria-label="Sections"] { display: none !important; }
  h1, h2, h3, .qhead, .tag { break-after: avoid; page-break-after: avoid; }
  body { font-size: 13.5px; line-height: 1.45; }
  .mast { padding-top: 22px !important; padding-bottom: 20px !important; }
  .mast h1 { font-size: 30px !important; margin: 6px 0 8px !important; }
  main > section { margin-top: 0 !important; padding-top: 14px !important; }
  h2 { font-size: 21px !important; margin: 0 0 8px !important; }
  .agenda .row { padding-top: 7px !important; padding-bottom: 7px !important; }
  .qa { padding: 11px 14px !important; margin: 9px 0 !important; }
  .qa, .note, .tablebox, .phases, .phase, .row, ol.beats > li, tr { break-inside: avoid; page-break-inside: avoid; }
` });

// Decide each section's break once the layout matches the printed page width.
const paginate = () => page.evaluate((pageH) => {
  const secs = [...document.querySelectorAll('main > section')].filter(s => s.offsetParent !== null);
  secs.forEach(s => { s.style.breakBefore = ''; s.style.breakInside = ''; });
  const report = [];
  secs.forEach((s, i) => {
    const h = s.getBoundingClientRect().height;
    if (h <= pageH * 0.97) s.style.breakInside = 'avoid';
    else if (i > 0) s.style.breakBefore = 'page';
    report.push(`${s.id}:${Math.round(h)}${h <= pageH * 0.97 ? ' keep' : ' new page'}`);
  });
  return report.join(' | ');
}, pageH);

const opts = { format: 'A4', printBackground: true, margin: Object.fromEntries(Object.entries(margin).map(([k, v]) => [k, v + 'mm'])) };
console.log('full:', await paginate());
await page.pdf({ ...opts, path: path.join(out, 'Call with Ravi 4 Nov 2026 - what we covered (full, with my notes).pdf') });
await page.evaluate(() => document.body.classList.add('screen-share'));
console.log('ravi:', await paginate());
await page.pdf({ ...opts, path: path.join(out, 'Call with Ravi 4 Nov 2026 - what we covered (for Ravi).pdf') });
await b.close();
console.log('done');
