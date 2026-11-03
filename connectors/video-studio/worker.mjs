// Video studio: the background worker. For each queued job it writes the HyperFrames project, measures the real
// page and shrinks the type itself if anything overflows, runs HyperFrames' own check, takes preview stills, then
// renders the MP4. Only a video that passed every check is handed back as done, so the people reading the result
// do not have to re-inspect it. One job at a time; it exits after 5 idle minutes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { HF, IDLE_MS, OUT, PIDFILE, PROJECTS, WORKER_LOG, ensureDirs, listJobs, readJob, writeJob } from './shared.mjs';
import { measure, settleTimes, writeProject } from './compose.mjs';
import { gradeArgs, writeAooProject } from './aoo.mjs';
import { findFfmpeg } from '../ltx-local/shared.mjs';
import { buildLibrary } from '../../storage.mjs';
import { available as vsAvailable, durationOf as vsDuration, findProfile as vsProfile, reference as vsReference, speak as vsSpeak, speakable as vsSpeakable } from './voicestudio.mjs';
import { ROOT as OFFICE, newId as musicId, readJob as readMusic, writeJob as writeMusic, workerAlive as musicAlive, WORKER as MUSIC_WORKER } from '../music-local/shared.mjs';

ensureDirs();
const log = (...a) => { try { fs.appendFileSync(WORKER_LOG, new Date().toISOString() + ' ' + a.join(' ') + '\n'); } catch {} };
try { const pid = +fs.readFileSync(PIDFILE, 'utf8'); if (pid && pid !== process.pid) { process.kill(pid, 0); process.exit(0); } } catch {}
fs.writeFileSync(PIDFILE, String(process.pid));
process.on('exit', () => { try { if (+fs.readFileSync(PIDFILE, 'utf8') === process.pid) fs.unlinkSync(PIDFILE); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cli(dir, args, timeoutMs = 20 * 60000) {
  return new Promise(resolve => {
    const p = spawn('cmd', ['/c', 'npx', '--yes', HF, ...args], { cwd: dir, windowsHide: true }); let out = '';
    const t = setTimeout(() => { out += '\n[timed out]'; p.kill(); }, timeoutMs);
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    p.on('close', code => { clearTimeout(t); resolve({ code, out: out.replace(/\x1b\[[0-9;]*m/g, '') }); });
  });
}
const tail = (s, n = 900) => s.trim().slice(-n);
const FFMPEG = findFfmpeg();
const ffmpeg = args => new Promise(res => { const p = spawn(FFMPEG, args, { windowsHide: true }); let o = ''; p.stderr.on('data', d => o += d); p.on('error', () => res({ code: -1, out: 'ffmpeg not found' })); p.on('close', code => res({ code, out: o })); });

/** The voiceover: each card is spoken by the local Kokoro voice (free, offline). The card is held as long as its line takes to say,
 *  so the words and the picture stay together; the spoken line is `say` if the card has one, otherwise the card's own text. */
async function prepareVoice(job, cancelled) {
  const v = job.spec.voice, warn = []; if (!v) return warn;
  const dir = path.join(PROJECTS, job.id + '-voice'); fs.mkdirSync(dir, { recursive: true });
  // the owner's own cloned voice (VoiceStudio, on this computer) when asked for by name; if it is not running the video still gets a voice, and says so
  let mine = null, ref = null;
  if (v.voice === 'wesley') {
    try {
      if (!(await vsAvailable())) throw new Error('VoiceStudio is not running');
      mine = await vsProfile('Wesley'); if (!mine) throw new Error('there is no voice profile called Wesley');
      ref = await vsReference(mine);
    } catch (e) { warn.push(`YOUR VOICE WAS NOT USED (${e.message}): a stand-in British voice was used instead. Open VoiceStudio and rebuild if the real voice is wanted.`); mine = null; v.voice = 'bm_george'; }
  }
  for (const [i, c] of job.spec.cards.entries()) {
    if (cancelled()) return warn;
    const line = (c.say || plainText(c.kind === 'stat' ? `${c.text}. ${c.prefix || ''}${c.value}${c.suffix || ''}` : c.kind === 'waterfall' ? (c.say || c.text || c.items.map(x => `${x.label} ${x.value}`).join('. ')) : c.text)).replace(/\s+/g, ' ').trim();
    const out = path.join(dir, `vo-${i + 1}.wav`); let dur = 0;
    if (mine) {
      try { await vsSpeak(mine, ref, line, out, v.speed); dur = await vsDuration(out); }
      catch (e) { warn.push(`card ${i + 1}: your voice could not be made (${e.message.slice(0, 160)})`); continue; }
      if (!(dur > 0.3)) { warn.push(`card ${i + 1}: your voice came back empty`); continue; }
    } else {
      const txt = path.join(dir, `vo-${i + 1}.txt`); fs.writeFileSync(txt, vsSpeakable(line), 'utf8'); // a file, not an argument: quotes and symbols in the line cannot break the command
      const r = await cli(dir, ['tts', '--text-file', txt, '-v', v.voice, '-s', String(v.speed), '-o', out, '--json'], 5 * 60000);
      const m = /"durationSeconds":\s*([0-9.]+)/.exec(r.out);
      if (r.code !== 0 || !m || !fs.existsSync(out)) { warn.push(`card ${i + 1}: the voice could not be made (${tail(r.out, 160)})`); continue; }
      dur = +m[1];
    }
    const lead = 0.35 + (i > 0 && job.spec.overlap ? job.spec.overlap * 0.7 : 0), need = Math.ceil((lead + dur + 0.55) * 10) / 10;
    c.vo = { file: out, dur }; if (need > c.seconds) c.seconds = need;
  }
  job.spec.totalSeconds = +job.spec.cards.reduce((n, c) => n + c.seconds, 0).toFixed(2);
  return warn;
}
const plainText = t => String(t).replace(/\*/g, '');

/** The music bed: make it from a prompt if asked (a job for the local music generator), then fit it to the video:
 *  loop or trim to the exact length, fade in and out, even loudness. A failure is a warning, never a failed video. */
async function prepareMusic(job, cancelled) {
  const m = job.spec.music, warn = []; if (!m) return warn;
  if (m.asIs && m.file && fs.existsSync(m.file)) return warn; // the series score is already the right length and level
  let file = m.file;
  if (!file && m.prompt) {
    const seconds = Math.min(240, Math.max(10, Math.ceil(job.spec.totalSeconds + 4)));
    const mj = writeMusic({ id: musicId(), state: 'queued', prompt: m.prompt, duration: seconds, instrumental: true, requestedBy: 'video-studio', createdAt: Date.now() });
    if (!musicAlive()) try { spawn(process.execPath, [MUSIC_WORKER], { cwd: OFFICE, detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch {}
    writeJob({ ...readJob(job.id), step: 'making the music' });
    for (let i = 0; i < 200 && !cancelled(); i++) { // up to ~10 minutes: the first music job after a long idle also loads the model
      await sleep(3000); const x = readMusic(mj.id);
      if (x?.state === 'done') { file = x.file; break; }
      if (x?.state === 'failed' || x?.state === 'cancelled') { warn.push('music was not made (' + (x.error || x.state) + '): the video is silent'); break; }
    }
    if (!file && !warn.length) warn.push('music took too long: the video is silent');
  }
  if (!file || !fs.existsSync(file)) { delete job.spec.music; return warn; }
  const out = path.join(PROJECTS, job.id + '-music.m4a'), D = job.spec.totalSeconds;
  const r = await ffmpeg(['-y', '-stream_loop', '-1', '-i', file, '-t', String(D), '-af', `afade=t=in:st=0:d=0.8,afade=t=out:st=${Math.max(0, D - 1.6).toFixed(2)}:d=1.5,loudnorm=I=-20:TP=-2:LRA=7`, '-c:a', 'aac', '-b:a', '192k', out]);
  if (r.code === 0 && fs.existsSync(out)) { job.spec.music = { ...m, file: out }; } else { warn.push('the music could not be fitted to the length, so it was used as it was'); job.spec.music = { ...m, file }; }
  return warn;
}

/** An Art of Operations reel: grade the background into the row's colours, write the project, check, look, render. */
async function runAoo(job, dir, cancelled) {
  const step = (s, extra = {}) => writeJob({ ...readJob(job.id), step: s, ...extra });
  if (job.spec.backgroundJob) { // the footage takes about half an hour: wait for it here, not in the agent's run
    const lf = path.join(OFFICE, 'data', 'ltx', 'jobs', job.spec.backgroundJob + '.json'); let lj;
    for (let i = 0; i < 1500 && !cancelled(); i++) { // up to ~100 minutes
      try { lj = JSON.parse(fs.readFileSync(lf, 'utf8')); } catch { lj = null; }
      if (lj?.state === 'done' && lj.file && fs.existsSync(lj.file)) break;
      if (lj && (lj.state === 'failed' || lj.state === 'cancelled')) throw new Error('the background footage ' + lj.state + (lj.error ? ': ' + lj.error : ''));
      step('waiting for the footage (ltx ' + (lj?.state || 'unknown') + ')'); await sleep(4000);
    }
    if (cancelled()) return; if (!(lj?.state === 'done' && lj.file)) throw new Error('the background footage did not finish in time');
    job.spec.background = lj.file; writeJob({ ...readJob(job.id), spec: job.spec });
  }
  step('making the music'); const musicWarn = await prepareMusic(job, cancelled); if (cancelled()) return;
  writeJob({ ...readJob(job.id), spec: job.spec });
  step('grading the footage'); fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
  const len = /Duration: (\d+):(\d+):([\d.]+)/.exec((await ffmpeg(['-hide_banner', '-i', job.spec.background])).out); // ffmpeg with no output prints the length and exits
  const g = await ffmpeg(gradeArgs(job.spec, job.spec.background, path.join(dir, 'media', 'bg.mp4'), len ? +len[1] * 3600 + +len[2] * 60 + +len[3] : 0));
  if (g.code !== 0) throw new Error('grading the footage failed: ' + tail(g.out));
  step('building'); const info = await writeAooProject(job.spec, dir);
  if (cancelled()) return;
  step('checking'); const chk = await cli(dir, ['check']);
  if (chk.code !== 0) throw new Error('HyperFrames check failed: ' + tail(chk.out));
  step('stills'); const stills = path.join(OUT, job.id + '-stills');
  const snap = await cli(dir, ['snapshot', '--at', info.snapshotTimes.join(','), '--no-end', '-o', stills, '--describe', 'false']);
  const pics = fs.existsSync(stills) ? fs.readdirSync(stills).filter(f => /^frame-.*\.png$/i.test(f)).sort().map(f => path.join(stills, f)) : [];
  if (cancelled()) return;
  step('rendering'); const mp4 = path.join(OUT, job.id + '.mp4');
  const rnd = await cli(dir, ['render', '-o', mp4, '--quiet']);
  if (rnd.code !== 0 || !fs.existsSync(mp4)) throw new Error('render failed: ' + tail(rnd.out));
  writeJob({ ...readJob(job.id), state: 'done', step: 'done', file: mp4, stills: pics, project: dir, finishedAt: Date.now(), qa: { hyperframesCheck: 'passed', row: job.spec.row, grade: job.spec.grade, chineseFont: info.chineseFont, warnings: musicWarn, music: job.spec.music ? 'fitted to 15 seconds, faded in and out' : 'none', checkedAt: Date.now(), snapshotOk: snap.code === 0, note: 'Look at the preview stills: the key word, the Chinese and the end card must be clear of the footage.' } });
  log('done', job.id, mp4); try { buildLibrary(OFFICE); } catch (e) { log('library:', e.message); }
  if (job.spec.notify) try { const n = await import('../../notify.mjs'); const r = await n.telegramVideo(mp4, `Art of Operations${job.spec.number ? ' - Reel ' + job.spec.number : ''}: ${job.spec.title}\nFor your approval: approve it in the office and it is filed as "Art of Operations - Reel ${job.spec.number || 'N'}.mp4". Job ${job.id}.`); log('telegram', job.id, r.ok ? 'sent' : r.reason); } catch (e) { log('telegram failed', e.message); }
}

async function run(job) {
  const dir = path.join(PROJECTS, job.id), cancelled = () => readJob(job.id)?.state === 'cancelled';
  if (job.spec?.type === 'aoo') {
    writeJob({ ...job, state: 'running', startedAt: Date.now(), step: 'building' });
    try { await runAoo(job, dir, cancelled); } catch (e) { log('failed', job.id, e.message); writeJob({ ...readJob(job.id), state: 'failed', step: 'failed', error: e.message.slice(0, 1200), finishedAt: Date.now() }); }
    return;
  }
  writeJob({ ...job, state: 'running', startedAt: Date.now(), step: 'building' });
  const step = (s, extra = {}) => writeJob({ ...readJob(job.id), step: s, ...extra });
  try {
    let scale = 1, m;
    const voiceWarn = await prepareVoice(job, cancelled); if (cancelled()) return;
    const musicWarn = await prepareMusic(job, cancelled); if (cancelled()) return;
    writeJob({ ...readJob(job.id), spec: job.spec }); // the lengths now include the time each spoken line takes
    for (let i = 0; i < 6; i++) {
      writeProject(job.spec, dir, scale); step('measuring');
      m = await measure(job.spec, dir);
      if (!(m.overflow && i < 5)) break;
      scale = +(scale * 0.88).toFixed(3); log(job.id, 'text overflowed, retrying at scale', scale);
    }
    if (!m.pass) throw new Error('layout check failed: ' + m.issues.join('; '));
    if (cancelled()) return;
    step('checking'); const chk = await cli(dir, ['check']);
    if (chk.code !== 0) throw new Error('HyperFrames check failed: ' + tail(chk.out));
    const at = settleTimes(job.spec).map(x => x.toFixed(2));
    step('stills'); const stills = path.join(OUT, job.id + '-stills');
    const snap = await cli(dir, ['snapshot', '--at', at.join(','), '--no-end', '-o', stills, '--describe', 'false']);
    if (cancelled()) return;
    const pics = fs.existsSync(stills) ? fs.readdirSync(stills).filter(f => /^frame-.*\.png$/i.test(f)).sort().map(f => path.join(stills, f)) : [];
    let slides;
    if (job.spec.deliver !== 'video') { // full-resolution slide images, one per card: for carousels and posts
      const sd = path.join(OUT, job.id + '-slides'); fs.mkdirSync(sd, { recursive: true });
      slides = pics.map((f, i) => { const d = path.join(sd, `slide-${String(i + 1).padStart(2, '0')}.png`); fs.copyFileSync(f, d); return d; });
    }
    let mp4;
    if (job.spec.deliver !== 'stills') {
      step('rendering'); mp4 = path.join(OUT, job.id + '.mp4');
      const rnd = await cli(dir, ['render', '-o', mp4, '--quiet']);
      if (rnd.code !== 0 || !fs.existsSync(mp4)) throw new Error('render failed: ' + tail(rnd.out));
    } else if (!slides?.length) throw new Error('no slide images were produced: ' + tail(snap.out));
    writeJob({ ...readJob(job.id), state: 'done', step: 'done', file: mp4, slides, stills: pics, project: dir, finishedAt: Date.now(), qa: { layout: 'passed', hyperframesCheck: 'passed', fontScale: scale, warnings: [...m.warnings, ...voiceWarn, ...musicWarn], voice: job.spec.voice ? `${job.spec.voice.voice}, ${job.spec.cards.filter(c => c.vo).length} of ${job.spec.cards.length} cards spoken${job.spec.captions ? ', captions on' : ''}` : undefined, music: job.spec.music ? 'fitted to the length, faded in and out' : undefined, motion: `${job.spec.style}: ${job.spec.transition} / ${job.spec.textMotion}`, checkedAt: Date.now(), snapshotOk: snap.code === 0 } });
    log('done', job.id, mp4); try { buildLibrary(OFFICE); } catch (e) { log('library:', e.message); } // file it where a person can find it
  } catch (e) { log('failed', job.id, e.message); writeJob({ ...readJob(job.id), state: 'failed', step: 'failed', error: e.message.slice(0, 1200), finishedAt: Date.now() }); }
}

log('worker started', process.pid); let lastWork = Date.now();
for (;;) {
  const lj = id => { try { return JSON.parse(fs.readFileSync(path.join(OFFICE, 'data', 'ltx', 'jobs', id + '.json'), 'utf8')); } catch { return null; } };
  const jobs = listJobs().filter(j => j.state === 'queued'); // a reel still waiting for its footage does not hold up the others
  const next = jobs.find(j => !j.spec?.backgroundJob || !['running', 'queued'].includes(lj(j.spec.backgroundJob)?.state));
  if (next) { await run(next); lastWork = Date.now(); continue; }
  if (Date.now() - lastWork > IDLE_MS) { log('idle, exiting'); process.exit(0); }
  await sleep(3000);
}
