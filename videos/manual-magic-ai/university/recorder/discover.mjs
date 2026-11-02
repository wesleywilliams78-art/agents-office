// Discover: opens a platform page with the saved login and writes a screenshot plus every visible control's role and label,
// so a script's selectors come from the real screen. Usage: node recorder/discover.mjs [url-or-path] [--click "Label"]...
// Each --click presses a button or link by its visible text first (e.g. --click "Add SOP"). Nothing is saved in the platform.
import fs from 'node:fs';
import path from 'node:path';
import { browser, context, ROOT, SITE, sleep } from './lib.mjs';

const args = process.argv.slice(2), clicks = [];
let where = '/';
for (let i = 0; i < args.length; i++) args[i] === '--click' ? clicks.push(args[++i]) : (where = args[i]);
const out = path.join(ROOT, 'work', 'discover'); fs.mkdirSync(out, { recursive: true });

const b = await browser(), ctx = await context(b), page = await ctx.newPage();
await page.goto(where.startsWith('http') ? where : SITE + where, { waitUntil: 'networkidle' }).catch(() => {});
await sleep(1500);
for (const label of clicks) {
  const el = page.getByRole('button', { name: label, exact: true }).or(page.getByRole('link', { name: label, exact: true })).or(page.getByText(label, { exact: true })).first();
  await el.click(); await page.waitForLoadState('networkidle').catch(() => {}); await sleep(1500);
}
const name = (clicks.at(-1) || new URL(page.url()).pathname || 'home').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
await page.screenshot({ path: path.join(out, name + '.png') });
const controls = await page.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const sel = 'a,button,input,textarea,select,[role=button],[role=combobox],[role=option],[role=tab],[contenteditable=true],label,h1,h2,h3';
  return [...document.querySelectorAll(sel)].filter(vis).map(e => { const r = e.getBoundingClientRect(); return {
    tag: e.tagName.toLowerCase(), role: e.getAttribute('role') || '', type: e.getAttribute('type') || '',
    text: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80), aria: e.getAttribute('aria-label') || '', title: e.getAttribute('title') || '',
    name: e.getAttribute('name') || '', placeholder: e.getAttribute('placeholder') || '', id: e.id || '', testid: e.getAttribute('data-testid') || '',
    box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; });
});
fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({ url: page.url(), controls }, null, 1));
console.log(page.url()); console.log('wrote', path.join(out, name + '.png'), 'and .json,', controls.length, 'controls');
await b.close();
