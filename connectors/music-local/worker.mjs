// Local music connector: the background worker. Starts the ACE-Step API server when a job is waiting, runs jobs one
// at a time, saves the audio to output/music/, and shuts the server down after 10 idle minutes so the GPU is free
// again. It also waits while the local video generator is making a clip, because both want the same GPU.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { ACE_DIR, ACE_EXE, ACE_PORT, IDLE_MS, OUT, PIDFILE, WORKER_LOG, ensureDirs, listJobs, readJob, writeJob } from './shared.mjs';
import { listJobs as ltxJobs } from '../ltx-local/shared.mjs';

ensureDirs();
const log = (...a) => { try { fs.appendFileSync(WORKER_LOG, new Date().toISOString() + ' ' + a.join(' ') + '\n'); } catch {} };
try { const pid = +fs.readFileSync(PIDFILE, 'utf8'); if (pid && pid !== process.pid) { process.kill(pid, 0); process.exit(0); } } catch {}
fs.writeFileSync(PIDFILE, String(process.pid));
const cleanup = () => { try { if (+fs.readFileSync(PIDFILE, 'utf8') === process.pid) fs.unlinkSync(PIDFILE); } catch {} };
process.on('exit', cleanup);
let server = null, lastWork = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = `http://127.0.0.1:${ACE_PORT}`;
const post = async (p, body) => (await fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
const up = async () => { try { return (await fetch(B + '/v1/models', { signal: AbortSignal.timeout(4000) })).ok; } catch { return false; } };
const stopServer = () => { if (server) { try { spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {} server = null; log('server stopped'); } };
process.on('SIGTERM', () => { stopServer(); process.exit(0); });

async function ensureServer() {
  if (await up()) return;
  if (!fs.existsSync(ACE_EXE)) throw new Error('ACE-Step is not installed where expected (' + ACE_EXE + ')');
  const out = fs.openSync(ACE_DIR + '\\..\\ace-api.log', 'a');
  server = spawn(ACE_EXE, ['--host', '127.0.0.1', '--port', String(ACE_PORT)], { cwd: ACE_DIR, windowsHide: true, stdio: ['ignore', out, out], env: { ...process.env, ACESTEP_INIT_LLM: 'false', CHECK_UPDATE: 'false' } });
  server.on('exit', c => { log('server exited', c); server = null; });
  for (let i = 0; i < 90; i++) { await sleep(2000); if (await up()) { log('server up'); return; } if (!server) break; }
  throw new Error('the music server did not start; see ace-api.log in the ACE-Step folder');
}

async function run(job) {
  writeJob({ ...job, state: 'running', startedAt: Date.now() });
  try {
    await ensureServer();
    const r = await post('/release_task', { prompt: job.prompt, lyrics: job.instrumental ? '[Instrumental]' : (job.lyrics || ''), audio_duration: job.duration, thinking: false, batch_size: 1, ...(job.bpm ? { bpm: job.bpm } : {}) });
    const id = r.data?.task_id; if (!id) throw new Error('the music server refused the job: ' + JSON.stringify(r).slice(0, 200));
    for (let i = 0; i < 400; i++) { // up to ~20 minutes, which covers the first run's model download
      await sleep(3000);
      if (readJob(job.id)?.state === 'cancelled') return;
      const q = await post('/query_result', { task_id_list: [id] }), d = q.data?.[0];
      if (d?.status === 2) throw new Error('generation failed: ' + String(d.result).slice(0, 200));
      if (d?.status === 1) {
        const res = JSON.parse(d.result)[0], a = await fetch(B + res.file), type = a.headers.get('content-type') || '';
        const ext = /wav/i.test(type) ? 'wav' : /flac/i.test(type) ? 'flac' : 'mp3', dest = `${OUT}\\${job.id}.${ext}`;
        fs.writeFileSync(dest, Buffer.from(await a.arrayBuffer()));
        writeJob({ ...readJob(job.id), state: 'done', file: dest, finishedAt: Date.now(), meta: res.metas || undefined }); log('done', job.id, dest); return;
      }
    }
    throw new Error('timed out after 20 minutes');
  } catch (e) { log('failed', job.id, e.message); writeJob({ ...readJob(job.id), state: 'failed', error: e.message, finishedAt: Date.now() }); }
}

const videoBusy = () => { try { return ltxJobs().some(j => j.state === 'running'); } catch { return false; } };
log('worker started', process.pid);
for (;;) {
  const next = listJobs().find(j => j.state === 'queued');
  if (next && !videoBusy()) { await run(next); lastWork = Date.now(); continue; }
  if (next) lastWork = Date.now(); // waiting for the video job is not idling
  if (!next && Date.now() - lastWork > IDLE_MS) { stopServer(); log('idle, exiting'); process.exit(0); }
  await sleep(3000);
}
