// Filing and housekeeping for everything the office makes on this computer (video, slides, music, generated clips).
//  library   a readable copy of the finished work, newest first, with an INDEX.md you can open: output/library/
//            (hard links to the real files, so it costs no extra space and a rename here never breaks a task's path)
//  cleanup   removes only what can be rebuilt: the working folders behind a finished video (project, voice clips, fitted music).
//            A finished video, slide or music file is never deleted by this; test builds are only deleted when asked.
//  report    sizes, free space on the drive, and a warning when either is getting tight.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MB = 1024 * 1024, GB = 1024 * MB, DAY = 86400000;
export const DEFAULTS = { warnFreeGB: 50, criticalFreeGB: 25, warnOutputGB: 5, keepWorkingDays: 3, keepTestDays: 14 };
const TEST_WHO = new Set(['test', 'showcase']);
const isTest = j => TEST_WHO.has(String(j.requestedBy || '').toLowerCase()) || /\b(test|showcase)\b/i.test(j.spec?.title || j.title || '');

const clean = t => String(t).replace(/^﻿/, '');
const jobsOf = dir => { try { return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(clean(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch { return null; } }).filter(Boolean); } catch { return []; } };
export function size(p) { let n = 0; try { const st = fs.lstatSync(p); if (!st.isDirectory()) return st.size; for (const f of fs.readdirSync(p)) n += size(path.join(p, f)); } catch {} return n; }
const exists = p => { try { return !!p && fs.existsSync(p); } catch { return false; } };
const slug = s => String(s || 'untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'untitled';
const day = ts => new Date(ts || Date.now()).toISOString().slice(0, 10);
const link = (src, dst) => { try { fs.mkdirSync(path.dirname(dst), { recursive: true }); if (exists(dst)) fs.rmSync(dst, { force: true }); fs.linkSync(src, dst); return true; } catch { try { fs.copyFileSync(src, dst); return true; } catch { return false; } } };

/** The finished work, filed so a person can find it: output/library/<kind>/<date> <title> (<id>)/ and an INDEX.md. */
export function buildLibrary(root) {
  const lib = path.join(root, 'output', 'library'), rows = [];
  for (const j of jobsOf(path.join(root, 'data', 'video', 'jobs'))) {
    if (j.state !== 'done' || (!exists(j.file) && !(j.slides || []).some(exists))) continue;
    const test = isTest(j), title = j.spec?.title || j.title || j.id, dir = path.join(lib, test ? '_tests' : 'video', `${day(j.finishedAt || j.createdAt)} ${slug(title)} (${j.id})`);
    if (!exists(dir)) {
      if (exists(j.file)) link(j.file, path.join(dir, 'video' + path.extname(j.file)));
      for (const s of j.slides || []) if (exists(s)) link(s, path.join(dir, 'slides', path.basename(s)));
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'about.txt'), [title, `Built ${new Date(j.finishedAt || j.createdAt).toLocaleString('en-GB')} for ${j.requestedBy || 'unknown'} (job ${j.id})`, `Format ${j.spec?.format || ''}, ${j.spec?.totalSeconds || ''} s, style ${j.spec?.style || ''}, voice ${j.spec?.voice?.voice || 'none'}`, '', 'Cards:', ...(j.spec?.cards || []).map((c, i) => `${i + 1}. [${c.kind || 'text'}] ${String(c.text || '').replace(/\*/g, '')}${c.say ? '   (says: ' + c.say + ')' : ''}`)].join('\n'), 'utf8');
      } catch {}
    }
    rows.push({ at: j.finishedAt || j.createdAt, kind: j.spec?.deliver === 'stills' ? 'slides' : 'video', title, who: j.requestedBy || '', test, rel: path.relative(lib, dir).replace(/\\/g, '/'), MB: exists(j.file) ? size(j.file) / MB : (j.slides || []).reduce((n, s) => n + size(s), 0) / MB, secs: j.spec?.totalSeconds });
  }
  for (const j of jobsOf(path.join(root, 'data', 'music', 'jobs'))) { // music made on its own (a bed made for a video lives inside that video's folder)
    if (j.state !== 'done' || !exists(j.file) || j.requestedBy === 'video-studio') continue;
    const title = String(j.prompt || j.id).slice(0, 50), dst = path.join(lib, 'music', `${day(j.finishedAt || j.createdAt)} ${slug(title)} (${j.id})${path.extname(j.file)}`);
    if (!exists(dst)) link(j.file, dst);
    rows.push({ at: j.finishedAt || j.createdAt, kind: 'music', title, who: j.requestedBy || '', test: isTest(j), rel: path.relative(lib, dst).replace(/\\/g, '/'), MB: size(j.file) / MB, secs: j.duration });
  }
  rows.sort((a, b) => b.at - a.at);
  const line = r => `| ${day(r.at)} | ${r.kind} | ${r.title.replace(/\|/g, '/')} | ${r.who || '-'} | ${r.secs ? Math.round(r.secs) + ' s' : ''} | ${r.MB.toFixed(1)} MB | [open](${encodeURI(r.rel)}) |`;
  const head = '| Date | Kind | Title | Made by | Length | Size | Where |\n|---|---|---|---|---|---|---|';
  const real = rows.filter(r => !r.test), tests = rows.filter(r => r.test);
  const md = `# Everything the office has made\n\nUpdated ${new Date().toLocaleString('en-GB')}. Finished work only, newest first. The files here are links to the real ones, so they cost no extra space. Test builds are listed last and are the first thing to delete.\n\n## Work\n\n${head}\n${real.map(line).join('\n') || '| | | nothing yet | | | | |'}\n\n## Test builds\n\n${head}\n${tests.map(line).join('\n') || '| | | none | | | | |'}\n`;
  fs.mkdirSync(lib, { recursive: true }); fs.writeFileSync(path.join(lib, 'INDEX.md'), md, 'utf8');
  return { items: rows.length, tests: tests.length, dir: lib };
}

/** What is on the drive and what could go. */
export function report(root, cfg = {}) {
  const t = { ...DEFAULTS, ...(cfg || {}) }, out = path.join(root, 'output'), data = path.join(root, 'data');
  const parts = {
    'finished video and slides': size(path.join(out, 'video')), 'music': size(path.join(out, 'music')), 'generated clips': size(path.join(out, 'ltx')),
    'working folders (rebuildable)': size(path.join(data, 'video', 'projects')) + size(path.join(data, 'ltx', 'tmp')),
  };
  const officeMB = Object.values(parts).reduce((a, b) => a + b, 0) / MB;
  let freeGB = null, totalGB = null; try { const s = fs.statfsSync(root); freeGB = s.bavail * s.bsize / GB; totalGB = s.blocks * s.bsize / GB; } catch {}
  const now = Date.now(), old = jobsOf(path.join(data, 'video', 'jobs')).filter(j => j.state === 'done' && isTest(j) && now - (j.finishedAt || j.createdAt) > t.keepTestDays * DAY);
  const warn = [];
  if (freeGB !== null && freeGB < t.criticalFreeGB) warn.push(`The drive is almost full: ${freeGB.toFixed(0)} GB free.`);
  else if (freeGB !== null && freeGB < t.warnFreeGB) warn.push(`The drive is getting full: ${freeGB.toFixed(0)} GB free of ${totalGB.toFixed(0)} GB.`);
  if (officeMB / 1024 > t.warnOutputGB) warn.push(`The office's own files are ${(officeMB / 1024).toFixed(1)} GB: time to clear old work.`);
  if (old.length) warn.push(`${old.length} old test build(s) can be deleted: npm run storage -- --delete-tests`);
  return { at: now, freeGB: freeGB === null ? null : +freeGB.toFixed(1), totalGB: totalGB === null ? null : +totalGB.toFixed(0), officeMB: +officeMB.toFixed(1), parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, +(v / MB).toFixed(1)])), oldTests: old.length, warn, level: freeGB !== null && freeGB < t.criticalFreeGB ? 'critical' : warn.length ? 'warn' : 'ok' };
}

/** Remove the rebuildable leftovers of finished jobs. With deleteTests, also old test builds (the only deliverables ever removed). */
export function cleanup(root, cfg = {}, { deleteTests = false } = {}) {
  const t = { ...DEFAULTS, ...(cfg || {}) }, data = path.join(root, 'data'), now = Date.now(); let freed = 0; const removed = [];
  const rm = p => { if (!exists(p)) return; const n = size(p); try { fs.rmSync(p, { recursive: true, force: true }); freed += n; removed.push(path.basename(p)); } catch {} };
  for (const j of jobsOf(path.join(data, 'video', 'jobs'))) {
    const fin = j.finishedAt || j.createdAt; if (!['done', 'failed', 'cancelled'].includes(j.state)) continue;
    if (now - fin > (j.state === 'done' ? t.keepWorkingDays : 1) * DAY) { const pr = path.join(data, 'video', 'projects'); rm(path.join(pr, j.id)); rm(path.join(pr, j.id + '-voice')); rm(path.join(pr, j.id + '-music.m4a')); }
    if (deleteTests && j.state === 'done' && isTest(j) && now - fin > t.keepTestDays * DAY) {
      rm(j.file); rm(path.join(root, 'output', 'video', j.id + '-stills')); rm(path.join(root, 'output', 'video', j.id + '-slides'));
      for (const d of ['_tests', 'video']) { const dd = path.join(root, 'output', 'library', d); for (const f of exists(dd) ? fs.readdirSync(dd) : []) if (f.includes(`(${j.id})`)) rm(path.join(dd, f)); }
      try { fs.rmSync(path.join(data, 'video', 'jobs', j.id + '.json')); } catch {}
    }
  }
  for (const j of jobsOf(path.join(data, 'music', 'jobs'))) if (j.requestedBy === 'video-studio' && exists(j.file) && now - (j.finishedAt || j.createdAt) > t.keepWorkingDays * DAY) rm(j.file); // the bed made for a video: the video keeps its own fitted copy
  const tmp = path.join(data, 'ltx', 'tmp'); try { for (const f of fs.readdirSync(tmp)) { const p = path.join(tmp, f); if (now - fs.statSync(p).mtimeMs > 2 * DAY) rm(p); } } catch {}
  return { freedMB: +(freed / MB).toFixed(1), removed: removed.length };
}

/** The daily pass the server runs: tidy the rebuildable files, refresh the library, write the report. */
export function daily(root, cfg = {}) {
  const c = cleanup(root, cfg), l = buildLibrary(root), r = report(root, cfg), all = { ...r, cleaned: c, library: l };
  try { fs.mkdirSync(path.join(root, 'data'), { recursive: true }); fs.writeFileSync(path.join(root, 'data', 'storage.json'), JSON.stringify(all, null, 2)); } catch {}
  return all;
}

/** Should Wesley be told now? Tell him when the level gets worse, once a day while it stays bad (every 6 hours when critical), and once when it recovers. */
export function shouldAlert(state, r, now = Date.now()) {
  const rank = { ok: 0, warn: 1, critical: 2 }, last = state?.level || 'ok', since = now - (state?.at || 0);
  if (rank[r.level] > rank[last]) return 'worse';
  if (r.level === 'ok') return last !== 'ok' ? 'recovered' : null;
  if (since > (r.level === 'critical' ? 6 : 24) * 3600000) return 'reminder';
  return null;
}
export function alertText(kind, r) {
  const head = kind === 'recovered' ? 'Office disk: back to normal.' : r.level === 'critical' ? 'OFFICE DISK ALERT: almost full.' : 'Office disk: getting full.';
  const body = r.freeGB === null ? '' : `${r.freeGB} GB free of ${r.totalGB} GB. The office's own files: ${Math.round(r.officeMB)} MB.`;
  return [head, body, ...(kind === 'recovered' ? [] : r.warn)].filter(Boolean).join('\n');
}

// npm run storage              the daily pass, printed
// npm run storage -- --alert-test      sends one clearly labelled test message to Telegram
// npm run storage -- --delete-tests    also removes test builds older than 14 days (the only finished files this ever deletes)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.dirname(fileURLToPath(import.meta.url)); let cfg = {};
  for (const f of ['office.config.json', 'office.config.local.json']) try { Object.assign(cfg, JSON.parse(clean(fs.readFileSync(path.join(root, f), 'utf8'))).storage || {}); } catch {}
  if (process.argv.includes('--alert-test')) { const { telegram } = await import('./notify.mjs'); const r = report(root, cfg); console.log(JSON.stringify(await telegram(`Test message from the office: the disk alert is switched on. Right now ${r.freeGB} GB are free of ${r.totalGB} GB and the office's own files are ${Math.round(r.officeMB)} MB. You will only hear from me again if the drive gets tight (under ${(cfg.warnFreeGB ?? DEFAULTS.warnFreeGB)} GB free).`))); }
  else if (process.argv.includes('--delete-tests')) { const c = cleanup(root, cfg, { deleteTests: true }); buildLibrary(root); console.log(JSON.stringify({ deleted: c, after: report(root, cfg) }, null, 2)); }
  else console.log(JSON.stringify(daily(root, cfg), null, 2));
}
