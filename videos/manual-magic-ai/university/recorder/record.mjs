// Rehearse or record one video. Each step shows its caption, does its actions, then holds until its narration line
// (from narrate.mjs) plus a breath has played, so captions stay readable and the voice lands on its step.
// Usage: node recorder/record.mjs mmu-09 --rehearse [--fast] [--headed]   then   --test (a recorded take that presses nothing that saves)   then   no flag
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findFfmpeg } from '../../../../connectors/ltx-local/shared.mjs';
import { browser, context, director, loadScript, barHtml, WORK, SITE, W, VIEW_H, BAR, sleep } from './lib.mjs';

const id = process.argv[2]; if (!id) throw new Error('usage: node recorder/record.mjs <video-id> [--rehearse] [--fast] [--headed]');
const rehearse = process.argv.includes('--rehearse'), test = process.argv.includes('--test'), reuse = process.argv.includes('--reuse'), fast = process.argv.includes('--fast'), headed = process.argv.includes('--headed');
const script = await loadScript(id), work = WORK(id); fs.mkdirSync(work, { recursive: true });
const voiceFile = path.join(work, 'voice.json');
const voice = fs.existsSync(voiceFile) ? JSON.parse(fs.readFileSync(voiceFile, 'utf8')) : null;
if (!rehearse && !voice) throw new Error('narrate first: node recorder/narrate.mjs ' + id);
const BREATH = 0.8, MIN_HOLD = 2.5;

const b = await browser({ headed });
const raw = path.join(work, 'raw'); if (!rehearse) { fs.rmSync(raw, { recursive: true, force: true }); fs.mkdirSync(raw, { recursive: true }); }
const ctx = await context(b, rehearse ? {} : { recordVideo: { dir: raw, size: { width: W, height: VIEW_H } } });
// Settings pages save as you type (a debounced PUT), so a rehearsal, a --test take and a --reuse re-take must not reach the platform; they get a fake 200 so the page shows its normal "saved" state instead of an error toast.
if (rehearse || test || reuse) await ctx.route(/api\.manualmagic\.ai\/v1\//, r => ['PUT', 'PATCH', 'DELETE'].includes(r.request().method()) ? r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) : r.continue());
const page = await ctx.newPage();
const pace = script.pace || 1, ui = await director(page, { rehearse: rehearse || test, reuse, pace });
const log = { id, test, reuse, steps: [], waits: ui.events, startedAt: new Date().toISOString() };

try {
  // open on the starting page with the load cut out, and check it is the demo account
  await ui.wait(async () => { await page.goto(SITE + (script.start || '/'), { waitUntil: 'networkidle' }).catch(() => {}); await sleep(800); }, 'open');
  if (script.guard) await script.guard(page);
  await ui.reapply(); await sleep(900);
  for (const [i, step] of script.steps.entries()) {
    const n = i + 1, from = ui.t(), waitedBefore = ui.events.reduce((a, e) => a + (e.to - e.from), 0);
    console.log(`step ${n}: ${step.caption}`);
    await ui.caption(n, step.caption);
    await sleep((step.lead ?? 500) / pace);
    await step.act(page, ui);
    const waited = ui.events.reduce((a, e) => a + (e.to - e.from), 0) - waitedBefore;
    const need = Math.max(MIN_HOLD / pace, (voice?.steps[i]?.dur || 0) + BREATH / pace) + (step.tail || 0);
    const shown = ui.t() - from - waited;
    if (!fast && need > shown) await sleep((need - shown) * 1000);
    log.steps.push({ n, caption: step.caption, from, to: ui.t() });
    if (rehearse) { // the screen plus its caption bar, stacked as the video will show them
      const shot = path.join(work, 'shot.png'), bar = path.join(work, 'bar.png'), nn = String(n).padStart(2, '0');
      await page.screenshot({ path: shot });
      const bp = await ctx.newPage(); await bp.setViewportSize({ width: W, height: BAR }); await bp.setContent(barHtml(n, step.caption)); await bp.waitForTimeout(150); await bp.screenshot({ path: bar }); await bp.close();
      spawnSync(findFfmpeg(), ['-y', '-loglevel', 'error', '-i', shot, '-i', bar, '-filter_complex', 'vstack', path.join(work, `rehearsal-${nn}.png`)], { windowsHide: true });
    }
  }
  await ui.caption('', ''); await sleep(700);
  log.closeAt = ui.t();
} catch (e) {
  await page.screenshot({ path: path.join(work, 'failed.png') }).catch(() => {});
  console.error('FAILED at', page.url(), '\n', e.message, '\nscreenshot:', path.join(work, 'failed.png'));
  process.exitCode = 1;
}
const video = page.video();
await ctx.close(); await b.close();
if (rehearse) { console.log(process.exitCode ? 'rehearsal failed' : 'rehearsal passed: every step ran'); process.exit(); }
if (process.exitCode) process.exit();

// Playwright's video does not start exactly when the page does; measure the offset from the lengths.
const file = await video.path(), dest = path.join(work, 'recording.webm'); fs.renameSync(file, dest);
const probe = spawnSync(findFfmpeg(), ['-i', dest], { encoding: 'utf8', windowsHide: true }).stderr;
const m = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(probe), videoDur = m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
log.videoDur = videoDur; log.offset = +(videoDur - log.closeAt).toFixed(3);
fs.writeFileSync(path.join(work, 'timeline.json'), JSON.stringify(log, null, 1));
console.log(`recorded ${videoDur.toFixed(1)} s (offset ${log.offset} s) → ${dest}`);
