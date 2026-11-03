// The office server keeps the local generators moving. A connector (video studio, music, LTX video) queues a job as a file
// and starts its own background worker; when an agent's run cannot start the worker, the job would sit queued for ever.
// Every few seconds the server looks for queued jobs with no live worker and starts one. Cheap: a few small directory reads.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CONNECTORS = [
  { name: 'video-studio', data: 'data/video', worker: 'connectors/video-studio/worker.mjs' },
  { name: 'music-local', data: 'data/music', worker: 'connectors/music-local/worker.mjs' },
  { name: 'ltx-local', data: 'data/ltx', worker: 'connectors/ltx-local/worker.mjs' },
];

const alive = pidfile => { try { const pid = +fs.readFileSync(pidfile, 'utf8'); if (!pid) return false; process.kill(pid, 0); return true; } catch { return false; } };
const hasQueued = dir => { try { return fs.readdirSync(dir).some(f => { if (!f.endsWith('.json')) return false; try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).state === 'queued'; } catch { return false; } }); } catch { return false; } };

/** Start the worker of every connector that has a queued job and no running worker. Returns the names started. */
export function kickWorkers(root, log = () => {}) {
  const started = [];
  for (const c of CONNECTORS) {
    const dir = path.join(root, c.data);
    if (!hasQueued(path.join(dir, 'jobs')) || alive(path.join(dir, 'worker.pid'))) continue;
    const worker = path.join(root, c.worker); if (!fs.existsSync(worker)) continue;
    try { spawn(process.execPath, [worker], { cwd: root, detached: true, stdio: 'ignore', windowsHide: true }).unref(); started.push(c.name); log(`started the ${c.name} worker for a queued job`); } catch (e) { log(`could not start the ${c.name} worker: ${e.message}`); }
  }
  return started;
}
