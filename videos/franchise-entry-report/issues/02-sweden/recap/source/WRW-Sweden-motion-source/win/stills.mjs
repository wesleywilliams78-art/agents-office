// Windows port of stills.py: node win/stills.mjs <page.html> <W> <H> <outdir> <t,t,...>  (also writes events.json from window.EVENTS)
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { chromium } from 'file:///C:/Users/Wesley/agents-office/node_modules/playwright-core/index.mjs';
const [page, W, H, out, list] = process.argv.slice(2); if (!list) { console.error('pass the times explicitly'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const pg = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 }); const msgs = [];
pg.on('console', m => msgs.push(m.text())); pg.on('pageerror', e => msgs.push('ERR ' + e.message));
await pg.goto(pathToFileURL(path.resolve(page)).href); await pg.evaluate(() => window.ready);
for (const t of list.split(',').map(Number)) { await pg.evaluate(t => seek(t), t); await pg.screenshot({ path: path.join(out, `b${t.toFixed(2).padStart(6, '0')}.png`) }); }
fs.writeFileSync(path.join(out, 'events.json'), JSON.stringify(await pg.evaluate(() => window.EVENTS)));
await b.close(); if (msgs.length) console.log(msgs.slice(0, 20).join('\n'));
