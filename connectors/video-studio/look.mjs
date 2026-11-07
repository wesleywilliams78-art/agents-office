// Video studio: a picture of a finished job, so the desk that made it can look before it hands it back (plan: docs/plan-agent-visibility.md).
// All slides as one numbered contact sheet, or one slide alone. Drawn by the installed Chrome (headless screenshot of a small HTML page):
// no new dependency. Reads only a job's own slides or stills under output/video.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { OUT } from './shared.mjs';

export const CHROMES = [
  path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
];
export const chrome = () => CHROMES.find(f => f && fs.existsSync(f)) || null;

/** Width and height from a PNG's header. */
export function pngSize(file) {
  const b = Buffer.alloc(24); const fd = fs.openSync(file, 'r');
  try { fs.readSync(fd, b, 0, 24, 0); } finally { fs.closeSync(fd); }
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG: ' + path.basename(file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** The pictures a job made: its slides, or for a video its preview stills. Only files under output/video. */
export function pictures(job) {
  const out = path.resolve(OUT) + path.sep;
  return (job.slides?.length ? job.slides : job.stills || []).map(f => path.resolve(f)).filter(f => f.startsWith(out) && fs.existsSync(f));
}

const GAP = 20, TAG = 30;

/** Draw the sheet (slide omitted) or one slide (1-based). Returns { file, count, width, height }. */
export function look(job, slide) {
  const pics = pictures(job);
  if (!pics.length) throw new Error('this job has no slide images or stills to look at');
  if (slide !== undefined && !(Number.isInteger(slide) && slide >= 1 && slide <= pics.length)) throw new Error(`slide must be 1 to ${pics.length}`);
  const exe = chrome(); if (!exe) throw new Error('Chrome is not installed on this computer, so the studio cannot draw a picture');
  const chosen = slide ? [pics[slide - 1]] : pics, { w, h } = pngSize(chosen[0]);
  const cols = slide ? 1 : Math.min(3, chosen.length), rows = Math.ceil(chosen.length / cols);
  const cw = slide ? Math.min(1080, w) : chosen.length > 9 ? 360 : 520, ch = Math.round(cw * h / w);
  const W = cols * cw + (cols + 1) * GAP, H = rows * (ch + TAG) + (rows + 1) * GAP - (slide ? TAG : 0);
  const cells = chosen.map((f, i) => `<figure>${slide ? '' : `<b>${i + 1}</b>`}<img src="${'file:///' + f.replace(/\\/g, '/').replace(/ /g, '%20')}"></figure>`).join('');
  const page = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#8a8785}main{display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:${GAP}px;padding:${GAP}px}figure{margin:0}b{display:block;height:${TAG}px;font:600 22px/1 Arial,sans-serif;color:#fff}img{display:block;width:${cw}px;height:${ch}px}</style><main>${cells}</main>`;
  const dir = path.join(OUT, job.id + '-look'); fs.mkdirSync(dir, { recursive: true });
  const html = path.join(dir, 'look.html'), file = path.join(dir, slide ? `slide-${String(slide).padStart(2, '0')}.png` : 'sheet.png');
  fs.writeFileSync(html, page); fs.rmSync(file, { force: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-look-'));
  try {
    execFileSync(exe, ['--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--allow-file-access-from-files',
      `--screenshot=${file}`, `--window-size=${W},${H}`, '--virtual-time-budget=3000', 'file:///' + html.replace(/\\/g, '/')], { timeout: 60000, stdio: 'ignore', windowsHide: true });
  } finally { fs.rmSync(profile, { recursive: true, force: true }); }
  let got; try { got = pngSize(file); } catch { got = null; }
  if (!got || got.w !== W || got.h !== H) throw new Error('Chrome did not draw the picture');
  return { file, count: pics.length, width: W, height: H };
}
