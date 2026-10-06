// Local video connector: the background worker. One instance owns the LTX backend (headless, on a private
// port with a random token), runs queued jobs one at a time, and shuts the backend down when idle so the
// GPU and memory come back. Video is always generated LOCALLY: it switches the app's "use the cloud API
// for video" preference off before every job, because cloud video is billed per second.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { LTX, OUT, DATA, PIDFILE, WORKER_LOG, PORT, IDLE_MS, MIN_FREE_RAM_GB, ensureDirs, listJobs, readJob, writeJob } from './shared.mjs';

ensureDirs();
const log = (...a) => { try { fs.appendFileSync(WORKER_LOG, new Date().toISOString() + ' ' + a.join(' ') + '\n'); } catch {} };

// single instance
try { const pid = +fs.readFileSync(PIDFILE, 'utf8'); if (pid && pid !== process.pid) { process.kill(pid, 0); process.exit(0); } } catch {}
fs.writeFileSync(PIDFILE, String(process.pid));
const cleanup = () => { try { if (+fs.readFileSync(PIDFILE, 'utf8') === process.pid) fs.unlinkSync(PIDFILE); } catch {} };
process.on('exit', cleanup);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { stopBackend().finally(() => process.exit(0)); });

const TOKEN = crypto.randomBytes(20).toString('hex'); // lives in this process and the backend's environment only
let backend = null;                                   // the child python process
let lastWork = Date.now();

// plain http (not fetch): a generation holds one request open for many minutes, longer than fetch's header timeout
function call(method, p, body, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method, headers: { Authorization: 'Bearer ' + TOKEN, ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) } }, res => {
      let s = ''; res.on('data', d => s += d); res.on('end', () => { let j = null; try { j = JSON.parse(s); } catch {} resolve({ status: res.statusCode, json: j, text: s }); });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timed out after ' + Math.round(timeoutMs / 1000) + 's')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function appOpen() {
  try { return /LTX Desktop\.exe/i.test(execFileSync('tasklist', ['/FI', 'IMAGENAME eq LTX Desktop.exe', '/NH'], { encoding: 'utf8' })); } catch { return false; }
}

async function backendUp() { try { return (await call('GET', '/health', null, 4000)).status === 200; } catch { return false; } }

async function ensureBackend() {
  if (backend && backend.exitCode === null && await backendUp()) return;
  backend = null;
  if (!fs.existsSync(LTX.python) || !fs.existsSync(path.join(LTX.backend, 'ltx2_server.py'))) throw new Error('LTX Desktop is not installed where expected (' + LTX.backend + ')');
  const out = fs.openSync(path.join(DATA, 'backend.log'), 'w');
  const code = "import os,sys,runpy;b=os.environ['LTX_BACKEND_DIR'];sys.path.insert(0,b);os.chdir(b);runpy.run_path(os.path.join(b,'ltx2_server.py'),run_name='__main__')";
  backend = spawn(LTX.python, ['-u', '-c', code], {
    cwd: LTX.backend, windowsHide: true, stdio: ['ignore', out, out],
    env: { ...process.env, LTX_APP_DATA_DIR: LTX.appData, LTX_BACKEND_DIR: LTX.backend, LTX_PORT: String(PORT), LTX_AUTH_TOKEN: TOKEN, PYTHONUNBUFFERED: '1' },
  });
  backend.on('exit', c => { log('backend exited', c); backend = null; });
  for (let i = 0; i < 90; i++) { await sleep(2000); if (await backendUp()) { log('backend up'); return; } if (!backend) break; }
  throw new Error('the LTX backend did not start (see data/ltx/backend.log)');
}

async function stopBackend() {
  if (!backend) return;
  try { await call('POST', '/api/system/shutdown', null, 8000); } catch {}
  await sleep(3000);
  try { if (backend && backend.exitCode === null) backend.kill(); } catch {}
  backend = null;
}

async function run(job) {
  const freeGb = os.freemem() / 2 ** 30;
  if (appOpen()) throw new Error('LTX Desktop is open and holds the GPU. Close it and submit again.');
  if (freeGb < MIN_FREE_RAM_GB) throw new Error(`Only ${freeGb.toFixed(1)} GB of RAM is free (needs ${MIN_FREE_RAM_GB}+). Close Chrome and other heavy apps, then submit again.`);
  await ensureBackend();
  // never the paid cloud API for video: force local generation every time
  await call('POST', '/api/settings', { userPrefersLtxApiVideoGenerations: false });
  const body = { prompt: job.prompt, resolution: job.resolution, model: 'fast', duration: job.duration, fps: 24, aspectRatio: job.aspectRatio, cameraMotion: job.cameraMotion, audio: false };
  if (job.negativePrompt) body.negativePrompt = job.negativePrompt;
  const r = await call('POST', '/api/generate', body, 45 * 60 * 1000);
  if (r.status !== 200 || r.json?.status !== 'complete' || !r.json?.video_path) {
    const msg = r.json?.error || r.json?.detail || r.text || ('HTTP ' + r.status);
    throw new Error('the backend refused the job: ' + String(msg).slice(0, 300));
  }
  const dest = path.join(OUT, job.id + '.mp4');
  fs.copyFileSync(r.json.video_path, dest);
  return dest;
}

async function loop() {
  log('worker started, pid', process.pid);
  for (;;) {
    const next = listJobs().find(j => j.state === 'queued');
    if (!next) {
      if (Date.now() - lastWork > IDLE_MS) { log('idle, shutting down'); await stopBackend(); process.exit(0); }
      await sleep(3000); continue;
    }
    lastWork = Date.now();
    const job = writeJob({ ...next, state: 'running', startedAt: Date.now() });
    log('job', job.id, 'start', job.resolution, job.duration + 's');
    try {
      const file = await run(job);
      const cur = readJob(job.id);
      writeJob({ ...cur, state: cur?.state === 'cancelled' ? 'cancelled' : 'done', file, finishedAt: Date.now(), seconds: Math.round((Date.now() - job.startedAt) / 1000) });
      log('job', job.id, 'done', file);
    } catch (e) {
      const cur = readJob(job.id) || job;
      const crashed = !backend;
      writeJob({ ...cur, state: cur.state === 'cancelled' ? 'cancelled' : 'failed', finishedAt: Date.now(), error: String(e.message || e) + (crashed && !/RAM|Desktop|installed/.test(String(e.message)) ? ' The backend stopped; this is usually Windows running out of memory. Close other apps and try again.' : '') });
      log('job', job.id, 'failed', e.message);
      if (crashed) await sleep(2000);
    }
    lastWork = Date.now();
  }
}
loop().catch(e => { log('fatal', e.stack || e); process.exit(1); });
