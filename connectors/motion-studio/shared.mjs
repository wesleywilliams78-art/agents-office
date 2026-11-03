// Motion studio: shared paths, the job store and the tools it drives (Chrome, ffmpeg). Same shape as video-studio:
// jobs are JSON files, the MCP server is short-lived, one background worker paints, captures and stitches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFfmpeg } from '../ltx-local/shared.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const KIT = path.join(HERE, 'kit');
export const SERIES = path.join(HERE, 'series');
export const DATA = path.join(ROOT, 'data', 'motion');
export const JOBS = path.join(DATA, 'jobs');
export const PROJECTS = path.join(DATA, 'projects');
export const OUT = path.join(ROOT, 'output', 'motion');
export const PIDFILE = path.join(DATA, 'worker.pid');
export const WORKER_LOG = path.join(DATA, 'worker.log');
export const WORKER = path.join(HERE, 'worker.mjs');
export const IDLE_MS = 5 * 60 * 1000;
export const MAX_ACTIVE = 6;
export const MAX_SECONDS = 180;
export const FFMPEG = findFfmpeg();

// width, height and the safe area for text (px kept clear at the top, bottom and sides: platform UI sits there)
export const FORMATS = {
  '9:16': { w: 1080, h: 1920, top: 250, bottom: 340, side: 90 },
  '16:9': { w: 1920, h: 1080, top: 120, bottom: 120, side: 154 },
  '1:1': { w: 1080, h: 1080, top: 130, bottom: 130, side: 90 },
  '4:5': { w: 1080, h: 1350, top: 150, bottom: 170, side: 90 },
};
export const formatFor = (w, h) => Object.entries(FORMATS).find(([, f]) => f.w === w && f.h === h)?.[0] || null;

/** Chrome on this machine: the installed browser, so nothing has to be downloaded. */
export function findChrome() {
  const c = [process.env.MOTION_CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return c.find(f => f && fs.existsSync(f)) || null;
}

export const ensureDirs = () => { for (const d of [JOBS, PROJECTS, OUT]) fs.mkdirSync(d, { recursive: true }); };
export const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const file = id => path.join(JOBS, String(id).replace(/[^a-z0-9]/gi, '') + '.json');
export function readJob(id) { try { return JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch { return null; } }
// Windows refuses to replace a file another process has open (the tool server polls job files), so the swap is retried briefly
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
export function writeJob(job) {
  ensureDirs(); const f = file(job.id), body = JSON.stringify(job, null, 2); fs.writeFileSync(f + '.tmp', body);
  for (let i = 0; ; i++) { try { fs.renameSync(f + '.tmp', f); return job; } catch (e) { if (e.code !== 'EPERM' && e.code !== 'EBUSY' && e.code !== 'EACCES' || i >= 20) { fs.writeFileSync(f, body); fs.rmSync(f + '.tmp', { force: true }); return job; } pause(25); } }
}
export function listJobs() {
  ensureDirs();
  return fs.readdirSync(JOBS).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(JOBS, f), 'utf8')); } catch { return null; } })
    .filter(Boolean).sort((a, b) => a.createdAt - b.createdAt);
}
export const active = jobs => jobs.filter(j => j.state === 'queued' || j.state === 'running');
export function workerAlive() { try { const pid = +fs.readFileSync(PIDFILE, 'utf8'); process.kill(pid, 0); return pid; } catch { return 0; } }
export const projectDir = id => path.join(PROJECTS, String(id).replace(/[^a-z0-9]/gi, ''));
export const sourceOf = id => { try { return fs.readFileSync(path.join(projectDir(id), 'index.html'), 'utf8'); } catch { return null; } };

/** A project folder: the composition as index.html, with the kit (helpers, brand fonts, logos, seal, ridges, series plates and fonts, three.js, GSAP) beside it in kit/. */
export function writeProject(id, html, { narration = null } = {}) {
  const dir = projectDir(id); fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(KIT, path.join(dir, 'kit'), { recursive: true });
  const brand = path.join(ROOT, 'connectors', 'video-studio', 'brand'), assets = path.join(ROOT, 'assets', 'brand');
  for (const [from, to] of [[path.join(brand, 'fonts'), 'fonts'], [path.join(brand, 'logos'), 'logos'], [assets, 'brand'], [SERIES, 'series']]) if (fs.existsSync(from)) fs.cpSync(from, path.join(dir, 'kit', to), { recursive: true });
  const nm = path.join(ROOT, 'node_modules');
  for (const [pkg, files, to] of [['three/build', ['three.module.min.js', 'three.core.min.js'], 'three'], ['gsap/dist', ['gsap.min.js', 'SplitText.min.js', 'DrawSVGPlugin.min.js', 'MorphSVGPlugin.min.js'], 'gsap']]) {
    fs.mkdirSync(path.join(dir, 'kit', to), { recursive: true });
    for (const f of files) { const src = path.join(nm, ...pkg.split('/'), f); if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, 'kit', to, f)); }
  }
  if (narration) { // the narration's word timings, for cues and captions in the page (the audio itself is mixed by the engine)
    const words = fs.readFileSync(path.join(DATA, 'narration', String(narration).replace(/[^a-z0-9]/gi, ''), 'words.json'), 'utf8');
    fs.mkdirSync(path.join(dir, 'narration'), { recursive: true }); fs.writeFileSync(path.join(dir, 'narration', 'words.js'), 'window.NARRATION = ' + words + ';\n');
  }
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return dir;
}

/** a series brief (series/<name>/BRIEF.md) and its reference images, or null */
export function seriesInfo(name) {
  const dir = path.join(SERIES, String(name || '').replace(/[^a-z0-9-]/gi, ''));
  if (!name || !fs.existsSync(path.join(dir, 'BRIEF.md'))) return null;
  return { name, brief: fs.readFileSync(path.join(dir, 'BRIEF.md'), 'utf8'), refs: fs.readdirSync(dir).filter(f => /^reference.*\.(png|jpe?g)$/i.test(f)).map(f => path.join(dir, f)) };
}
export const seriesList = () => fs.existsSync(SERIES) ? fs.readdirSync(SERIES).filter(d => fs.existsSync(path.join(SERIES, d, 'BRIEF.md'))) : [];
