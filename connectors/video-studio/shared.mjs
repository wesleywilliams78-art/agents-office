// Local video-studio connector: shared paths, formats and the job store. Same shape as ltx-local and music-local:
// jobs are JSON files, the MCP server is short-lived, one background worker builds, checks and renders.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const BRAND = path.join(HERE, 'brand');
export const DATA = path.join(ROOT, 'data', 'video');
export const JOBS = path.join(DATA, 'jobs');
export const PROJECTS = path.join(DATA, 'projects');
export const OUT = path.join(ROOT, 'output', 'video');
export const PIDFILE = path.join(DATA, 'worker.pid');
export const WORKER_LOG = path.join(DATA, 'worker.log');
export const WORKER = path.join(HERE, 'worker.mjs');
export const HF = 'hyperframes@0.8.137'; // pinned, so a project renders the same weeks later
export const IDLE_MS = 5 * 60 * 1000;
export const MAX_ACTIVE = 6;

// width, height, and the text safe area (px kept clear at the top, bottom and sides)
export const FORMATS = {
  '9:16': { w: 1080, h: 1920, top: 250, bottom: 340, side: 90 },
  '16:9': { w: 1920, h: 1080, top: 120, bottom: 120, side: 154 },
  '1:1': { w: 1080, h: 1080, top: 130, bottom: 130, side: 90 },
  '4:5': { w: 1080, h: 1350, top: 150, bottom: 170, side: 90 },
};
export const MAX_CARDS = 20, MAX_SECONDS = 600;

export const tokens = () => JSON.parse(fs.readFileSync(path.join(BRAND, 'tokens.json'), 'utf8'));
export const ensureDirs = () => { for (const d of [JOBS, PROJECTS, OUT]) fs.mkdirSync(d, { recursive: true }); };
export const newId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
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
