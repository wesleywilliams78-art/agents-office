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

// what the local LTX 2.5 Fast pipeline accepts on this machine (24 fps); we cap it lower than the model so
// one request cannot hold the only GPU for half an hour
export const ALLOWED = { '540p': [5, 6, 8, 10], '720p': [5, 6, 8, 10], '1080p': [5] };
export const ASPECTS = ['9:16', '16:9'];
export const CAMERA = ['none', 'dolly_in', 'dolly_out', 'dolly_left', 'dolly_right', 'jib_up', 'jib_down', 'static', 'focus_shift'];
export const MAX_ACTIVE = 4;          // queued + running jobs at once
export const MIN_FREE_RAM_GB = 8;     // below this the backend is likely to run out of memory and crash
export const IDLE_MS = 10 * 60 * 1000; // the worker frees the GPU and exits after this long with nothing to do
export const PORT = 18765;

export const ensureDirs = () => { fs.mkdirSync(JOBS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true }); };
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
