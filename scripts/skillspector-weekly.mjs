// Weekly skill security check: scans every skill the office and Claude Code use with NVIDIA's SkillSpector
// (static checks only, nothing is sent anywhere), compares with last week, and writes a short report note
// into the Brain for the Monday 07:30 routine to turn into a Gmail draft.
// Run by Windows Task Scheduler ("Skill Spector Weekly"), or by hand: node scripts/skillspector-weekly.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadConfig();
const BIN = process.env.SKILLSPECTOR_BIN || 'C:\\Users\\Wesley\\skillspector\\.venv\\Scripts\\skillspector.exe';
const DATA = path.join(ROOT, 'data', 'skillspector');
const NOTES = path.join(cfg.brainPath, 'Agents Office');
const today = new Date().toISOString().slice(0, 10);
const nice = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
fs.mkdirSync(DATA, { recursive: true });

// skills Wesley has looked at and chosen to keep: not raised again until they change or get worse
const ACCEPTED = path.join(DATA, 'accepted.json');
const loadAccepted = () => { try { return JSON.parse(fs.readFileSync(ACCEPTED, 'utf8')); } catch { return {}; } };
const acc = process.argv.indexOf('--accept');
if (acc > -1) { // node scripts/skillspector-weekly.mjs --accept hyperframes,media-use   (or --accept all)
  const names = String(process.argv[acc + 1] || '').split(',').map(s => s.trim()).filter(Boolean);
  const snaps0 = fs.readdirSync(DATA).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!snaps0.length) { console.error('Run a scan first.'); process.exit(1); }
  const last = JSON.parse(fs.readFileSync(path.join(DATA, snaps0[snaps0.length - 1]), 'utf8'));
  const a = loadAccepted(); let n = 0;
  for (const r of last.results) if ((names.includes('all') ? ['HIGH', 'CRITICAL'].includes(r.severity) : names.includes(r.name))) { a[r.label + '/' + r.name] = { hash: r.hash, severity: r.severity, at: Date.now() }; n++; }
  fs.writeFileSync(ACCEPTED, JSON.stringify(a, null, 2)); console.log(`accepted ${n} skill(s): they will not be raised again unless they change or get worse`); process.exit(0);
}

if (!fs.existsSync(BIN)) { console.error('SkillSpector is not installed at ' + BIN); process.exit(2); }

// where skills live: the office's own, the repo's, and the ones Claude Code loads for you
const SOURCES = [
  ['office (Brain)', path.join(NOTES, 'skills')],
  ['office (shipped)', path.join(ROOT, 'skills')],
  ['repo (Claude Code)', path.join(ROOT, '.claude', 'skills')],
  ['your Claude Code', path.join(os.homedir(), '.claude', 'skills')],
];
const targets = [];
for (const [label, dir] of SOURCES) {
  if (!fs.existsSync(dir)) continue;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue; // a symlinked skill folder counts too
    const p = path.join(dir, e.name);
    if (fs.existsSync(path.join(p, 'SKILL.md'))) targets.push({ label, name: e.name, path: p });
  }
}

// a fingerprint of the skill's files, so "changed since last week" is a fact, not a guess
const fingerprint = dir => {
  const h = crypto.createHash('sha256');
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else { h.update(e.name); try { h.update(fs.readFileSync(f)); } catch {} } } };
  try { walk(dir); } catch {}
  return h.digest('hex').slice(0, 16);
};

const results = [];
for (const t of targets) {
  const out = path.join(DATA, `tmp-${process.pid}.json`);
  const r = spawnSync(BIN, ['scan', t.path, '--no-llm', '--format', 'json', '--output', out], { encoding: 'utf8', timeout: 300000, windowsHide: true });
  let j = null; try { j = JSON.parse(fs.readFileSync(out, 'utf8')); } catch {}
  try { fs.unlinkSync(out); } catch {}
  const ra = j?.risk_assessment || {};
  const issues = (j?.issues || []).map(i => ({ severity: String(i.severity || '').toUpperCase(), code: i.id || '', coverage: (i.tags || []).includes('coverage'), // "could not fully inspect a file" is a scanner limit, not a risk
    message: [i.pattern, i.finding ? `(${String(i.finding).replace(/\s+/g, ' ').slice(0, 70)})` : ''].filter(Boolean).join(' ').slice(0, 150), where: i.location?.file ? `${i.location.file}${i.location.start_line ? ':' + i.location.start_line : ''}` : '' }));
  results.push({ ...t, hash: fingerprint(t.path), ok: !!j, score: ra.score ?? null, severity: String(ra.severity || (j ? 'LOW' : 'ERROR')).toUpperCase(), issues, scripts: !!j?.metadata?.has_executable_scripts });
}

// compare with the last snapshot
const snaps = fs.readdirSync(DATA).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f !== today + '.json').sort();
const prev = snaps.length ? JSON.parse(fs.readFileSync(path.join(DATA, snaps[snaps.length - 1]), 'utf8')) : null;
const prevBy = new Map((prev?.results || []).map(r => [r.label + '/' + r.name, r]));
const RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3, ERROR: 4 };
const key = r => r.label + '/' + r.name;
const added = results.filter(r => prev && !prevBy.has(key(r)));
const removed = prev ? [...prevBy.values()].filter(p => !results.some(r => key(r) === key(p))) : [];
const changed = results.filter(r => prev && prevBy.has(key(r)) && prevBy.get(key(r)).hash !== r.hash);
const worse = results.filter(r => prev && prevBy.has(key(r)) && (RANK[r.severity] ?? 0) > (RANK[prevBy.get(key(r)).severity] ?? 0));
const accepted = loadAccepted();
const isAccepted = r => { const a = accepted[key(r)]; return !!a && a.hash === r.hash && (RANK[r.severity] ?? 0) <= (RANK[a.severity] ?? 0); };
const riskier = results.filter(r => (RANK[r.severity] ?? 0) >= 2);
const bad = riskier.filter(r => !isAccepted(r)); // high or critical, and not already looked at and kept
const keptCount = riskier.length - bad.length;
const failed = results.filter(r => !r.ok);

fs.writeFileSync(path.join(DATA, today + '.json'), JSON.stringify({ at: Date.now(), results }, null, 2));

// the short note the 07:30 routine reads: actions first, and under 4,500 characters (an agent sees a note this short whole)
const L = [];
L.push(`# SkillSpector weekly report: ${nice(today)}`, '');
L.push(`Scanned ${results.length} skills with SkillSpector, static checks only (nothing sent anywhere). ${prev ? 'Compared with the scan of ' + nice(snaps[snaps.length - 1].slice(0, 10)) + '.' : 'This is the first scan, so there is nothing to compare with.'}`, '');
const actions = [];
const top = r => { const real = r.issues.filter(i => !i.coverage); return (real.find(i => (RANK[i.severity] ?? 0) >= 2) || real[0] || r.issues[0])?.message || 'see the full report'; };
const realCount = r => r.issues.filter(i => !i.coverage).length;
for (const r of bad) actions.push(`**${r.name}** (${r.label}) scored ${r.severity}: ${realCount(r)} real finding${realCount(r) === 1 ? '' : 's'}${r.scripts ? ', and it ships scripts that run on your PC' : ''}. Top finding: ${top(r)}. Decide: keep (then tell me to accept it), fix or remove.`);
for (const r of worse) if (!bad.includes(r)) actions.push(`**${r.name}** got worse since last week (${prevBy.get(key(r)).severity} to ${r.severity}).`);
for (const r of added) actions.push(`New skill **${r.name}** (${r.label}), scored ${r.severity}. Check it is one you meant to install.`);
for (const r of changed) if (!bad.includes(r) && !worse.includes(r) && !isAccepted(r)) actions.push(`**${r.name}** changed since last week (score ${r.score ?? 'n/a'}, ${r.severity}). Fine if you or an update changed it.`);
for (const r of failed) actions.push(`**${r.name}** could not be scanned. Check that SkillSpector runs.`);
L.push('## Actions needed', '');
if (!actions.length) L.push('None. Every skill scored LOW, and nothing new or changed needs a look.');
else actions.slice(0, 12).forEach((a, i) => L.push(`${i + 1}. ${a}`));
if (actions.length > 12) L.push(`...and ${actions.length - 12} more in the full report.`);
L.push('', '## Summary', '');
for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) L.push(`- ${sev}: ${results.filter(r => r.severity === sev).length}`);
if (keptCount) L.push(`- High or critical but already looked at and kept by Wesley: ${keptCount} (not raised again unless they change)`);
if (removed.length) L.push(`- Removed since last scan: ${removed.map(r => r.name).slice(0, 8).join(', ')}`);
L.push('', `Full results: data/skillspector/${today}.json in the office folder.`);
let note = L.join('\n');
if (note.length > 4500) note = note.slice(0, 4400) + '\n\n[trimmed: see the full results file]';
fs.mkdirSync(NOTES, { recursive: true });
const noteFile = path.join(NOTES, `SkillSpector weekly report ${today}.md`);
fs.writeFileSync(noteFile, note + '\n');
console.log(`scanned ${results.length}: ${bad.length} need a decision, ${added.length} new, ${changed.length} changed, ${failed.length} failed`);
console.log('note: ' + noteFile + ` (${note.length} chars)`);
