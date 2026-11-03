// node stills.mjs <W> <H> <outdir> <t1,t2,...>: one PNG per time, then a contact sheet
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url'; import { execFileSync } from 'node:child_process';
import { chromium } from 'file:///C:/Users/Wesley/agents-office/node_modules/playwright-core/index.mjs';
const [W, H, out, ts] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--force-color-profile=srgb', '--hide-scrollbars', '--allow-file-access-from-files'] });
const pg = await b.newPage({ viewport: { width: +W, height: +H } }); pg.on('pageerror', e => console.log('PAGE ERROR', e.message)); pg.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
await pg.goto(pathToFileURL(path.resolve('en-route.html')).href); await pg.evaluate(() => window.ready);
const files = [];
for (const t of ts.split(',').map(Number)) { await pg.evaluate(t => seek(t), t); const f = path.join(out, `t${String(t.toFixed(2)).padStart(6, '0')}.png`); await pg.screenshot({ path: f }); files.push(f); }
await b.close();
const cols = +W > +H ? 3 : 5;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex', files.map((_, i) => `[${i}]scale=${+W > +H ? 640 : 360}:-2[s${i}]`).join(';') + ';' + files.map((_, i) => `[s${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => { const c = i % cols, r = Math.floor(i / cols); const cw = +W > +H ? 640 : 360, ch = Math.round(cw * H / W); return `${c * cw}_${r * ch}`; }).join('|')}:fill=black`, path.join(out, 'sheet.jpg')]);
console.log('sheet', path.join(out, 'sheet.jpg'));
