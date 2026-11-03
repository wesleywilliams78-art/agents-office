// Local music connector (ACE-Step 1.5 on this machine): shared paths, limits and the job store.
// Same shape as ltx-local: jobs are JSON files, the MCP server is short-lived, one background worker owns the GPU.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = path.join(ROOT, 'data', 'music');
export const JOBS = path.join(DATA, 'jobs');
export const OUT = path.join(ROOT, 'output', 'music');
export const PIDFILE = path.join(DATA, 'worker.pid');
export const WORKER_LOG = path.join(DATA, 'worker.log');
export const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'worker.mjs');

export const ACE_DIR = process.env.ACE_STEP_DIR || 'C:\\Users\\Wesley\\tools\\ACE-Step-1.5';
export const ACE_EXE = path.join(ACE_DIR, '.venv', 'Scripts', 'acestep-api.exe');
export const ACE_PORT = 8001;
export const MIN_SECONDS = 10, MAX_SECONDS = 240, DEFAULT_SECONDS = 60;
export const MAX_ACTIVE = 6;
export const IDLE_MS = 10 * 60 * 1000; // the worker frees the GPU after this long with nothing to do

export const ensureDirs = () => { fs.mkdirSync(JOBS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true }); };
export const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
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
