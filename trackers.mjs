// Client project trackers (Google Sheets on a shared drive) → three cards per client: overdue, due, up next.
// Claude reads each tracker through the Google connector and hands back the raw action rows (it never edits anything); the sorting is plain date
// arithmetic done here, so the cards are the same every time. Stored in data/trackers.json (runtime state, never in the brain).
import fs from 'node:fs';
import path from 'node:path';

const file = dataDir => path.join(dataDir, 'trackers.json');
export function load(dataDir) { try { return JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); } catch { return {}; } }
export function save(dataDir, all) { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(all, null, 2)); }

export function syncPrompt({ sheet, name, tab = 'Tracker' }) {
  const system = 'You read one Google Sheet for its owner and copy action rows out exactly. You never edit, create or share anything. ' +
    'Use the Google Sheets tool (get_values) or the Google Drive tool to read it, then reply with ONLY a JSON object: no prose, no code fences. Copy every value exactly as it appears; never round, merge, shorten, estimate or invent a row.';
  const user = `Read the Google Sheet "${name}" (file id ${sheet}), tab "${tab}". The header row is the one that starts with "ID" (about row 4); the actions are below it. ` +
    'Do not read the long notes columns. Read only the columns up to "Date Completed", and the "Horizon" and "Waiting on" columns if the sheet has them (they are usually at the far right).\n' +
    'Return: {"total":<number of action rows>,"complete":<how many have Status Complete>,"rows":[[id,action,workstream,owner,status,priority,targetDate,dateCompleted,horizon,waitingOn],...]}\n' +
    'Leave out every row whose Status is Complete (they are counted in "complete" only). Include every other row, in sheet order. Use an empty string for a blank cell or a missing column. Copy targetDate exactly as written, even if it says TBC or has extra words.';
  return { system, user };
}

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// the first date in free text such as "22-Sep-2026 (all inputs) / 30-Sep-2026", "28-Aug-26", "17 Oct 2026"; null for TBC and the like
export function parseDate(s) {
  const m = /(\d{1,2})[-\s/]([A-Za-z]{3})[a-z]*[-\s/,]*(\d{2,4})/.exec(String(s || '')); if (!m) return null;
  const mo = MON[m[2].toLowerCase()]; if (mo === undefined) return null;
  let y = +m[3]; if (y < 100) y += 2000; if (y < 2000 || y > 2100) return null;
  return new Date(Date.UTC(y, mo, +m[1]));
}
const iso = d => d.toISOString().slice(0, 10);
const day = ms => Math.floor(ms / 86400000);

export function parse(j) {
  const rows = [];
  for (const r of Array.isArray(j?.rows) ? j.rows : []) {
    if (!Array.isArray(r)) continue;
    const [id, action, workstream, owner, status, priority, target, completed, horizon, waitingOn] = r.map(x => String(x ?? '').trim());
    if (!action) continue;
    if (/^complete/i.test(status) || (completed && /^(complete|done)/i.test(status))) continue;
    const blank = x => (/^(none|n\/a|na|-|—|tbc)$/i.test(x) ? '' : x);
    rows.push({ id, action, workstream, owner, status, priority, target, completed, horizon: blank(horizon), waitingOn: blank(waitingOn) });
  }
  return { rows, total: Number.isFinite(+j?.total) ? +j.total : null, complete: Number.isFinite(+j?.complete) ? +j.complete : null };
}

const PRI = { high: 0, medium: 1, low: 2 };
const HOR = { now: 0, next: 1, later: 2 };
// overdue = target date passed · due = within the next 14 days · up next = everything else open that is dated, in progress or flagged Now/Next
export function classify(rows, today = new Date(), dueDays = 14) {
  const t0 = day(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const item = r => { const d = parseDate(r.target); return { ...r, date: d ? iso(d) : '', days: d ? day(d.getTime()) - t0 : null }; };
  const all = rows.map(item), overdue = [], due = [], next = [];
  for (const r of all) {
    if (r.days !== null && r.days < 0) overdue.push(r);
    else if (r.days !== null && r.days <= dueDays) due.push(r);
    else {
      const h = String(r.horizon || '').toLowerCase();
      if (r.days !== null || /^(now|next)$/.test(h) || /progress/i.test(r.status)) next.push(r);
    }
  }
  const pri = r => PRI[String(r.priority).toLowerCase()] ?? 3;
  overdue.sort((a, b) => a.days - b.days || pri(a) - pri(b));                       // the longest overdue first
  due.sort((a, b) => a.days - b.days || pri(a) - pri(b));
  next.sort((a, b) => (a.days === null) - (b.days === null) || (a.days ?? 0) - (b.days ?? 0) || (HOR[String(a.horizon).toLowerCase()] ?? 3) - (HOR[String(b.horizon).toLowerCase()] ?? 3) || pri(a) - pri(b));
  const undated = all.filter(r => r.days === null).length;
  return { overdue, due, next, open: all.length, undated };
}

// the raw open rows are what is stored; the cards are worked out afresh on every view, so "overdue" is true today and not as at the last sync
export function snapshot(cfg, j) {
  const p = parse(j);
  return { client: cfg.client, name: cfg.name, sheet: cfg.sheet, syncedAt: Date.now(), total: p.total, complete: p.complete, rows: p.rows };
}
export function view(snap, today = new Date()) {
  if (!snap) return null;
  const c = classify(snap.rows || [], today);
  return { client: snap.client, name: snap.name, sheet: snap.sheet, syncedAt: snap.syncedAt, total: snap.total, complete: snap.complete, open: c.open, undated: c.undated, overdue: c.overdue, due: c.due, next: c.next };
}
