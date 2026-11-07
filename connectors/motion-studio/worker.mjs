// Motion studio: the background worker. One job at a time: stills (a quick look), draft (every frame at half size, scanned;
// the critic scores it only when the draft asks for one) or final (full size, from a draft with no broken rule). Exits after 5 idle minutes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { FFMPEG, IDLE_MS, OUT, PIDFILE, WORKER_LOG, ensureDirs, listJobs, projectDir, readJob, writeJob } from './shared.mjs';
import * as notify from '../../notify.mjs';
import { render } from './engine.mjs';
import { critique } from './critic.mjs';
import { narrate, readNarration } from './voice.mjs';
import { listen as listenEars } from './earshot.mjs';

ensureDirs();
const log = (...a) => { try { fs.appendFileSync(WORKER_LOG, new Date().toISOString() + ' ' + a.join(' ') + '\n'); } catch {} };
try { const pid = +fs.readFileSync(PIDFILE, 'utf8'); if (pid && pid !== process.pid) { process.kill(pid, 0); process.exit(0); } } catch {}
fs.writeFileSync(PIDFILE, String(process.pid));
process.on('exit', () => { try { if (+fs.readFileSync(PIDFILE, 'utf8') === process.pid) fs.unlinkSync(PIDFILE); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => String(s || 'motion').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'motion';

/** A finished final goes to Wesley on Telegram for review (the office's bot, his allow-listed chat only). Over Telegram's 50 MB
 *  limit, a smaller copy is sent and the full file stays on this PC. If the video cannot go, a text message names the file. */
async function sendForReview(job, res, out, step) {
  step('sending the final to Telegram for your review');
  const secs = Math.round(res.meta?.duration || 0);
  const by = (res.sounds || []).filter(s => s.licence === 'by');
  const srtNote = (res.captions ? `\nCaptions file for the post: ${res.captions}` : '') + (by.length ? `\nCredit these sounds where it is posted (CC BY):\n${by.map(s => '- ' + s.credit).join('\n')}` : '');
  const caption = `Motion Studio: ${job.title || 'new piece'}${job.series ? ` (${job.series.replace(/-/g, ' ')})` : ''}\n${secs} s.\nReview it, then approve or ask for changes in the office's Motion Studio tab. Nothing is posted or filed until you say so.${srtNote}`;
  try {
    let f = res.file;
    if (fs.statSync(f).size > 45 * 1024 * 1024) {
      const small = path.join(out, 'telegram.mp4');
      await new Promise(r => { const p = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-i', f, '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-c:a', 'copy', '-movflags', '+faststart', small], { windowsHide: true }); p.on('close', r); p.on('error', r); });
      if (fs.existsSync(small)) f = small;
    }
    const v = await notify.telegramVideo(f, caption + (f !== res.file ? '\n(A smaller copy: the full file is on the PC.)' : ''));
    if (v.ok) return { sent: true, file: f };
    const t = await notify.telegram(`${caption}\n\nThe video could not be attached (${v.reason}). It is at ${res.file}`);
    return { sent: t.ok, videoAttached: false, reason: v.reason };
  } catch (e) { return { sent: false, reason: e.message }; }
}

async function runJob(job) {
  const id = job.id, cancelled = () => readJob(id)?.state === 'cancelled';
  const step = s => { try { const j = readJob(id); if (j && j.state === 'running') writeJob({ ...j, step: s }); } catch {} }; // progress is a courtesy: it never fails a render
  writeJob({ ...job, state: 'running', step: 'starting', startedAt: Date.now() });
  log('start', id, job.mode, job.title || '');
  const out = path.join(OUT, id);
  if (job.mode === 'narrate') { // narration has no picture: voice the lines, time the words, done
    const n = await narrate({ id, lines: job.lines, source: job.source, recordings: job.recordings || [], series: job.series || 'operators-ledger', onStep: step });
    const cur = readJob(id); if (cur?.state === 'cancelled') return;
    writeJob({ ...cur, state: 'done', step: null, narration: n, finishedAt: Date.now() }); log('done', id, 'narrate', n.source); return;
  }
  const r = await render({ dir: projectDir(id), out, mode: job.mode, at: job.at || [], series: job.series, narration: job.narration, onStep: step, cancelled });
  const res = { ...r, stills: r.stills.map(s => ({ n: s.n, t: s.t, beat: s.beat, file: s.file })) };
  let crit = null;
  if (job.mode === 'draft' && job.critic && !r.errors.length) { // the critic is opt-in: it costs a full Opus run per draft
    step('the critic is scoring the stills (Opus 5.5, extra-high)');
    try { crit = await critique(r, { title: job.title, brief: job.brief, series: job.series, narration: job.narration ? readNarration(job.narration)?.words : null }); }
    catch (e) { crit = { error: e.message, passed: false }; }
  }
  let ears = null;
  if (job.mode === 'draft' && !r.errors.length && r.file && r.audio) { // Earshot listens to the clean draft's mix: advice only, never blocks, skipped if it is not installed
    step('Earshot is listening to the mix');
    ears = await listenEars(r.file, out).catch(e => ({ ok: false, reason: e.message }));
  }
  if (job.mode === 'final' && r.file) { const named = path.join(out, slug(job.title) + '.mp4'); fs.renameSync(r.file, named); res.file = named; }
  const cur = readJob(id); if (cur?.state === 'cancelled') return;
  const telegram = job.mode === 'final' && res.file && !r.errors.length ? await sendForReview(job, res, out, step) : undefined;
  writeJob({ ...cur, state: 'done', step: null, result: res, critique: crit, ears, telegram, passed: job.mode === 'draft' || job.mode === 'final' ? !r.errors.length : null, finishedAt: Date.now() });
  log('done', id, job.mode, r.errors.length ? 'errors:' + r.errors.length : 'clean', crit ? `min ${crit.min} passed ${crit.passed}` : '');
}

// a worker started before its code was changed must not keep running the old code: it leaves, and the next start picks up the new
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const stamp = () => ['worker.mjs', 'engine.mjs', 'critic.mjs', 'shared.mjs', '../../mcp.mjs', '../../notify.mjs', 'voice.mjs', 'earshot.mjs', '../video-studio/voicestudio.mjs'].map(f => { try { return fs.statSync(path.join(HERE, f)).mtimeMs; } catch { return 0; } }).join();
const born = stamp();

let idleSince = Date.now();
for (;;) {
  if (stamp() !== born) { log('code changed, exiting so a fresh worker starts'); process.exit(0); }
  const next = listJobs().find(j => j.state === 'queued');
  if (!next) { if (Date.now() - idleSince > IDLE_MS) process.exit(0); await sleep(1500); continue; }
  try { await runJob(next); }
  catch (e) { const j = readJob(next.id) || next; if (j.state !== 'cancelled') writeJob({ ...j, state: 'failed', step: null, error: String(e.message || e).slice(0, 800), finishedAt: Date.now() }); log('fail', next.id, e.stack || e); }
  idleSince = Date.now();
}
