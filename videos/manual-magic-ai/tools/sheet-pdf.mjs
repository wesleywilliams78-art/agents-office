// Combine the beat-grid contact sheets of one format into a single A4 PDF.
// usage: node sheet-pdf.mjs <project dir> <format> <out.pdf>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from '../../../connectors/motion-studio/shared.mjs';

const [dir, format, out] = process.argv.slice(2);
const sd = path.resolve(dir, 'out', format);
const sheets = fs.readdirSync(sd).filter(f => /^sheet-\d+\.jpg$/.test(f)).sort();
const html = `<!doctype html><meta charset="utf-8"><style>@page{size:A4 portrait;margin:10mm}body{margin:0;font:600 11pt Segoe UI,Arial;color:#042549}
h1{font-size:14pt;margin:0 0 3mm}p{margin:0 0 4mm;font-weight:400}img{width:100%;display:block;page-break-after:always}</style>
<h1>Operational Insurance™ · Manual Magic AI · beat grid, draft 5 (${format})</h1>
<p>120 BPM, 30 bars, one still per beat taken 0.3 s after the beat. Bars 1–5 sparse, the groove enters on bar 6 b1. The loop: t = 60 s is frame 0.</p>
${sheets.map(s => `<img src="${pathToFileURL(path.join(sd, s)).href}">`).join('')}`;
const hf = path.join(sd, 'sheets.html');
fs.writeFileSync(hf, html);
const b = await chromium.launch({ executablePath: findChrome(), headless: true, args: ['--allow-file-access-from-files'] });
const p = await (await b.newContext()).newPage();
await p.goto(pathToFileURL(hf).href, { waitUntil: 'load' });
await p.pdf({ path: path.resolve(out), format: 'A4', printBackground: true });
await b.close(); fs.unlinkSync(hf);
console.log('written', out);
