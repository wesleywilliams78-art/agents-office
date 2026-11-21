// Prints the three demo documents to PDF and the logo to a transparent PNG, with this PC's Chrome.
// Run from the repo root: node videos/manual-magic-ai/ravi-call-2026-11-04/portal-load/src/render.mjs
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'upload');
fs.mkdirSync(out, { recursive: true });
const docs = [
  ['a-operations-standards.html', 'Patisserie Penelope - Store Operations Standards v3.2.pdf'],
  ['b-franchise-agreement-schedule-3.html', 'Patisserie Penelope - Franchise Agreement Schedule 3 (sample).pdf'],
  ['c-coffee-standards-flat-white.html', 'Patisserie Penelope - Coffee Standards Flat White.pdf'],
];
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage();
for (const [src, name] of docs) {
  await page.goto(pathToFileURL(path.join(here, src)).href, { waitUntil: 'load' });
  await page.pdf({ path: path.join(out, name), format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log('wrote', name);
}
await page.goto(pathToFileURL(path.join(here, 'logo.html')).href, { waitUntil: 'load' });
await page.locator('#logo').screenshot({ path: path.join(out, 'Patisserie Penelope - logo.png'), omitBackground: true });
console.log('wrote logo');
await b.close();
