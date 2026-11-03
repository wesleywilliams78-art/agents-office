// Media on the external drive (Wesley, 3 Nov 2026): every heavy media folder the office and Claude Code make lives on D:,
// with a junction left at its old path so the office, the Motion Studio and every script keep working unchanged.
//   npm run media            move anything new (and report), then rebuild the library's hard links on D:
//   npm run media -- --dry   say what would move, move nothing
// What moves: the output/ folders (motion, library, blender, video, ltx, music, sops, teleprompter) and, under videos/, every
// renders, out*, proxies*, stills, footage, frames, work, snapshots or music-samples folder of 20 MB or more that git does not
// track. Source (compositions, scripts, issue.json, READMEs) stays on C:. The root is media.root in office.config(.local).json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const cfg = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { return {}; } };
const MEDIA = (cfg('office.config.local.json').media || cfg('office.config.json').media || {}).root || 'D:\\Agents Office Media';
const OUTPUT_DIRS = ['motion', 'library', 'blender', 'video', 'ltx', 'music', 'sops', 'teleprompter'];
const HEAVY = /^(renders|out|out\d+|proxies|proxies\d+|stills|footage|frames|work|snapshots|music-samples)$/;
const MIN = 20 * 1024 * 1024;

const isLink = p => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };
const size = p => { let n = 0; try { const s = fs.lstatSync(p); if (s.isSymbolicLink()) return 0; if (!s.isDirectory()) return s.size; for (const f of fs.readdirSync(p)) n += size(path.join(p, f)); } catch {} return n; };
const tracked = rel => { try { return execFileSync('git', ['ls-files', rel], { cwd: ROOT, encoding: 'utf8' }).trim().length > 0; } catch { return true; } };

if (!fs.existsSync(path.parse(MEDIA).root)) { console.error(`The media drive (${MEDIA}) is not connected. Plug in D: and run again; nothing was moved.`); process.exit(2); }

const todo = [];
for (const d of OUTPUT_DIRS) { const rel = path.join('output', d); if (fs.existsSync(path.join(ROOT, rel)) && !isLink(path.join(ROOT, rel))) todo.push(rel); }
(function walk(rel) {
  for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name), abs = path.join(ROOT, r);
    if (!e.isDirectory() || isLink(abs) || e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'kit') continue;
    if (HEAVY.test(e.name)) { if (size(abs) >= MIN && !tracked(r)) todo.push(r); continue; }
    walk(r);
  }
})('videos');

let moved = 0, bytes = 0;
for (const rel of todo) {
  const src = path.join(ROOT, rel), dst = path.join(MEDIA, rel), n = size(src);
  console.log(`${DRY ? 'would move' : 'moving'} ${(n / 1048576).toFixed(0).padStart(6)} MB  ${rel.replace(/\\/g, '/')}`);
  if (DRY) continue;
  fs.mkdirSync(dst, { recursive: true });
  const rc = spawnSync('robocopy', [src, dst, '/E', '/MOVE', '/COPY:DAT', '/DCOPY:T', '/R:2', '/W:2', '/NFL', '/NDL', '/NP', '/NJH', '/NJS'], { encoding: 'utf8' });
  if (rc.status >= 8) { console.error(`  robocopy failed (${rc.status}) for ${rel}: left in place. ${rc.stdout || ''}`); continue; }
  if (fs.existsSync(src) && fs.readdirSync(src).length) { console.error(`  ${rel} still has files on C: (in use?): left as it is, run again later.`); continue; }
  fs.rmSync(src, { recursive: true, force: true });
  execFileSync('cmd', ['/c', 'mklink', '/J', src, dst], { stdio: 'ignore' });
  moved++; bytes += n;
}
if (!DRY && moved) {
  try { const { buildLibrary } = await import('../storage.mjs'); buildLibrary(ROOT); console.log('library hard links rebuilt on the media drive'); } catch (e) { console.log('note: the library links were not rebuilt (' + e.message + '); they rebuild on the next daily storage pass'); }
}
console.log(DRY ? `${todo.length} folder(s) would move to ${MEDIA}` : `${moved} folder(s), ${(bytes / 1073741824).toFixed(1)} GB moved to ${MEDIA}; each old path is a junction to it`);
