// Local video connector (LTX 2.5 on this machine): shared paths, limits and the job store.
// Jobs are plain JSON files in data/ltx/jobs, so the MCP server (one short-lived process per agent run)
// and the background worker (one long-lived process that owns the GPU) can share them without talking.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = path.join(ROOT, 'data', 'ltx');
export const JOBS = path.join(DATA, 'jobs');
export const OUT = path.join(ROOT, 'output', 'ltx');
export const PIDFILE = path.join(DATA, 'worker.pid');
export const WORKER_LOG = path.join(DATA, 'worker.log');
export const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'worker.mjs');

const LOCAL = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
export const LTX = {
  appData: process.env.LTX_APP_DATA_DIR || path.join(LOCAL, 'LTXDesktop'),
  python: path.join(LOCAL, 'LTXDesktop', 'python', 'python.exe'),
  backend: path.join(LOCAL, 'Programs', 'LTX Desktop', 'resources', 'backend'),
};

// what the local LTX 2.5 Fast pipeline accepts in ONE generation on this machine (24 fps). A longer video is made
// as a chain of these: each segment starts from the last frame of the one before, and ffmpeg joins them.
export const PER_SEGMENT = { '540p': [5, 6, 8, 10], '720p': [5, 6, 8, 10], '1080p': [5] };
export const SEGMENT_TARGET = { '540p': 10, '720p': 10, '1080p': 5 }; // the length we aim for per segment (10 s is a measured-safe size for memory)
export const ALLOWED = Object.fromEntries(Object.keys(PER_SEGMENT).map(k => [k, [5]])); // resolutions accepted; any total length of 5 s or more
export const MIN_SECONDS = 5;
export const MAX_SECONDS = 3600; // a sanity ceiling, not a model limit
// rough minutes of GPU time per second of video, measured 6.5 min for 5 s at 540p; 720p and 1080p are estimates
export const MIN_PER_SECOND = { '540p': 1.3, '720p': 2.4, '1080p': 4.5 };
/** The list of segment lengths that make up a video of `total` seconds. */
export function planSegments(resolution, total) {
  const allowed = PER_SEGMENT[resolution], target = SEGMENT_TARGET[resolution];
  const out = []; let left = Math.max(MIN_SECONDS, Math.ceil(total));
  while (left > 0) { const want = Math.min(target, left); out.push(allowed.find(a => a >= want) ?? allowed[allowed.length - 1]); left -= want; }
  return out;
}
export const ASPECTS = ['9:16', '16:9'];
export const CAMERA = ['none', 'dolly_in', 'dolly_out', 'dolly_left', 'dolly_right', 'jib_up', 'jib_down', 'static', 'focus_shift'];
export const TMP = path.join(DATA, 'tmp');   // segments of a long video while it is being made
export const MAX_ACTIVE = 4;          // queued + running jobs at once
export const MIN_FREE_RAM_GB = 8;     // below this the backend is likely to run out of memory and crash
export const IDLE_MS = 10 * 60 * 1000; // the worker frees the GPU and exits after this long with nothing to do
export const PORT = 18765;

export const ensureDirs = () => { fs.mkdirSync(JOBS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true }); };
/** ffmpeg: PATH first, then the winget install. Returns '' when not found. */
export function findFfmpeg() {
  const pk = path.join(LOCAL, 'Microsoft', 'WinGet', 'Packages');
  try {
    for (const d of fs.readdirSync(pk)) if (/ffmpeg/i.test(d)) {
      const root = path.join(pk, d);
      for (const s of fs.readdirSync(root)) { const f = path.join(root, s, 'bin', 'ffmpeg.exe'); if (fs.existsSync(f)) return f; }
    }
  } catch {}
  return 'ffmpeg';
}
export const newId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const file = id => path.join(JOBS, id.replace(/[^a-z0-9]/gi, '') + '.json');

export function readJob(id) { try { return JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch { return null; } }
export function writeJob(job) { ensureDirs(); const f = file(job.id); fs.writeFileSync(f + '.tmp', JSON.stringify(job, null, 2)); fs.renameSync(f + '.tmp', f); return job; }
export function listJobs() {
  ensureDirs();
  return fs.readdirSync(JOBS).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(JOBS, f), 'utf8')); } catch { return null; } })
    .filter(Boolean).sort((a, b) => a.createdAt - b.createdAt);
}
export const active = jobs => jobs.filter(j => j.state === 'queued' || j.state === 'running');

export function workerAlive() {
  try { const pid = +fs.readFileSync(PIDFILE, 'utf8'); if (!pid) return 0; process.kill(pid, 0); return pid; } catch { return 0; }
}
