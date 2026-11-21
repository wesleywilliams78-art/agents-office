// Project plans for the Gantt fold-out under Delivery. The master stays a Google Sheet (a "Master Plan" tab); Claude reads it through the Google
// connector and hands back the task rows, never editing anything. Dates, overdue and the next milestone are worked out here, so they are true today.
// Stored in data/plans.json (runtime state). Config: office.config.local.json → aios.plans: [{ client, name, sheet, tab? }].
import fs from 'node:fs';
import path from 'node:path';
import { parseDate } from './trackers.mjs';

const file = dataDir => path.join(dataDir, 'plans.json');
export function load(dataDir) { try { return JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); } catch { return {}; } }
export function save(dataDir, all) { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(all, null, 2)); }

export function syncPrompt({ sheet, name, tab = 'Master Plan' }) {
  const system = 'You read one Google Sheet for its owner and copy plan rows out exactly. You never edit, create or share anything. ' +
    'Use the Google Sheets tool (get_values) or the Google Drive tool to read it, then reply with ONLY a JSON object: no prose, no code fences. Copy every value exactly as it appears; never round, estimate, shorten or invent a value or a row.';
  const user = `Read the Google Sheet "${name}" (file id ${sheet}), tab "${tab}". The header row is the one that starts with "ID". Find each column by its header text, not by position. Skip the long notes columns ("Deliverable / Notes", "Comments"). Read all task rows below the header (the rows continue past row 150; read to the last one).\n` +
    'Return: {"columns":{"start":<true if a Start Date column exists>,"end":<true if an End Date column exists>},"rows":[[id,phase,task,owner,start,end,dependencies,critical,milestone,status,percent],...]}\n' +
    'Use the Start Date and End Date columns (not the week-number columns), copied exactly as written. "critical" is the Critical Path column, "milestone" the Milestone column, "percent" the % Complete column. Use an empty string for a blank cell or a missing column. Include every task row, in sheet order, completed ones too.';
  return { system, user };
}

const iso = d => d.toISOString().slice(0, 10);
const day = ms => Math.floor(ms / 86400000);
function dateOf(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim()); if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return parseDate(s);
}
const yes = x => /^(y|yes|true|x|✓|1)$/i.test(String(x || '').trim());
function pct(x) { const m = /(\d+(?:\.\d+)?)\s*(%?)/.exec(String(x ?? '')); if (!m) return null; let n = +m[1]; if (!m[2] && n <= 1) n *= 100; return Math.max(0, Math.min(100, Math.round(n))); }

export function parse(j) {
  const cols = j?.columns || {};
  const rows = [];
  for (const r of Array.isArray(j?.rows) ? j.rows : []) {
    if (!Array.isArray(r)) continue;
    const [id, phase, task, owner, start, end, deps, critical, milestone, status, percent] = r.map(x => String(x ?? '').trim());
    if (!task) continue;
    const s = dateOf(start), e = dateOf(end);
    rows.push({ id, phase: phase || 'Plan', task, owner, start: s ? iso(s) : '', end: e ? iso(e) : '', deps, critical: yes(critical), milestone: yes(milestone), status, pct: pct(percent) });
  }
  return { rows, startCol: cols.start !== false, endCol: cols.end !== false };
}

export function snapshot(cfg, j) {
  const p = parse(j);
  return { client: cfg.client, name: cfg.name, sheet: cfg.sheet, tab: cfg.tab, syncedAt: Date.now(), startCol: p.startCol, endCol: p.endCol, rows: p.rows };
}

// the view the page draws: tasks grouped by phase, overdue worked out for today, the next milestone, and what the sheet is missing
export function view(snap, today = new Date()) {
  if (!snap) return null;
  const t0 = day(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const rows = snap.rows || [];
  const missing = [];
  if (!snap.startCol) missing.push('a "Start Date" column');
  if (!snap.endCol) missing.push('an "End Date" column');
  const dated = rows.filter(r => r.start && r.end);
  if (snap.startCol && snap.endCol && rows.length && dated.length < rows.length) missing.push(`dates on ${rows.length - dated.length} of ${rows.length} tasks (start and end)`);
  if (!rows.length) missing.push('task rows (header row starting "ID" and one row per task)');
  const isDone = r => /^(complete|done)/i.test(r.status) || r.pct === 100;
  const tasks = dated.map(r => {
    const dEnd = day(Date.parse(r.end)), dStart = day(Date.parse(r.start));
    const done = isDone(r);
    return { ...r, done, overdue: !done && dEnd < t0, started: dStart <= t0, daysLate: !done && dEnd < t0 ? t0 - dEnd : 0 };
  });
  const phases = [];
  for (const t of tasks) {
    let p = phases.find(x => x.name === t.phase); if (!p) phases.push(p = { name: t.phase, tasks: [] });
    p.tasks.push(t);
  }
  for (const p of phases) {
    const n = p.tasks.length, done = p.tasks.filter(t => t.done).length;
    p.start = p.tasks.reduce((a, t) => (t.start < a ? t.start : a), '9999'); p.end = p.tasks.reduce((a, t) => (t.end > a ? t.end : a), '');
    p.done = done; p.overdue = p.tasks.filter(t => t.overdue).length;
    p.pct = Math.round(p.tasks.reduce((a, t) => a + (t.done ? 100 : t.pct || 0), 0) / n);
  }
  const ms = tasks.filter(t => t.milestone).sort((a, b) => (a.end < b.end ? -1 : 1));
  const nextMs = ms.find(t => !t.done) || null;
  const first = tasks.reduce((a, t) => (!a || t.start < a ? t.start : a), ''), last = tasks.reduce((a, t) => (t.end > a ? t.end : a), '');
  const d = nextMs ? day(Date.parse(nextMs.end)) - t0 : null;
  return {
    client: snap.client, name: snap.name, sheet: snap.sheet, tab: snap.tab, syncedAt: snap.syncedAt,
    missing, total: rows.length, shown: tasks.length, done: tasks.filter(t => t.done).length, overdue: tasks.filter(t => t.overdue).length,
    first, last, nextMilestone: nextMs ? { id: nextMs.id, task: nextMs.task, end: nextMs.end, days: d } : null, phases,
  };
}
