// Opens Chrome at manualmagic.ai so Wesley can log in by hand. The session is saved to .auth/state.json (git-ignored)
// every two seconds while the window is open. No password is ever typed by a script or written to a file.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { STATE, SITE, W, H } from './lib.mjs';

fs.mkdirSync(path.dirname(STATE), { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: false, args: [`--window-size=${W},${H + 140}`] });
const ctx = await b.newContext(fs.existsSync(STATE) ? { storageState: STATE, viewport: { width: W, height: H } } : { viewport: { width: W, height: H } });
const page = await ctx.newPage();
await page.goto(SITE);
console.log('Log in to the DEMO account (Demo Operations Manual) in the Chrome window, then close the window.');
// Closing the window does not always end Chrome on Windows, so stop as soon as the last page is gone and quit the browser ourselves.
let open = true; b.on('disconnected', () => { open = false; }); ctx.on('page', p => p.on('close', () => { if (!ctx.pages().length) open = false; })); page.on('close', () => { if (!ctx.pages().length) open = false; });
while (open) {
  try { await ctx.storageState({ path: STATE }); } catch {}
  await new Promise(r => setTimeout(r, 2000));
}
await b.close().catch(() => {});
console.log('Saved the session to', STATE);
