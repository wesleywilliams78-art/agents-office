// Tracker digest picture (Wesley, 9 Nov 2026): due today, overdue, due tomorrow across the project trackers, drawn as one PNG in the WRW colours.
// Reads the office's own /api/trackers and /api/plans (the same cards the AIOS shows, no new Google reads) and renders with Chrome. Read only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.OFFICE_URL || 'http://localhost:4520';
const NAMES = { imran: "Imran's Diner", creamy: 'Creamy', qamaria: 'Qamaria UK' };
const HR = /\b(visa|immigration|warning|disciplin\w*|performance review|sick|sickness|absence|dismiss\w*|redundan\w*|grievance|probation)\b/i;
// Wesley, 13 Nov 2026: Status exactly "Delivered - not in use" counts as complete in the digest (sheet and Dashboard unchanged).
const DELIVERED = /^Delivered - not in use$/;
const esc =s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nice = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); };
const get = async p => { const r = await fetch(BASE + p, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(p + ' answered ' + r.status); return r.json(); };

export async function collect(now = new Date()) {
  const today = ymd(now), tom = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const out = { today: [], overdue: [], tomorrow: [], notes: [] };
  const add = (client, task, owner, date, late) => {
    const hr = HR.test(task);
    const it = { client, task: hr ? 'HR item: office only' : task, owner: hr ? 'Role holder' : owner || '-', date, late };
    if (late > 0) out.overdue.push(it); else if (date === today) out.today.push(it); else if (date === tom) out.tomorrow.push(it);
  };
  try {
    const t = await get('/api/trackers');
    for (const tr of t.trackers || []) {
      const v = tr.view; if (!v) { out.notes.push(`${NAMES[tr.client] || tr.name}: no data yet`); continue; }
      for (const r of [...v.overdue, ...v.due]) { if (!r.date || r.completed || DELIVERED.test(r.status || '')) continue; if (r.days < 0) add(NAMES[tr.client] || tr.name, r.action, r.owner, r.date, -r.days); else if (r.days <= 1) add(NAMES[tr.client] || tr.name, r.action, r.owner, r.date, 0); }
    }
  } catch (e) { out.notes.push('Trackers unreadable: ' + e.message); }
  try {
    const p = await get('/api/plans');
    for (const pl of p.plans || []) {
      const v = pl.view; if (!v) { out.notes.push(`${NAMES[pl.client] || pl.name}: no data yet`); continue; }
      for (const ph of v.phases || []) for (const r of ph.tasks || []) { if (r.done || !r.end) continue; if (r.end < today) add(NAMES[pl.client] || pl.name, r.task, r.owner, r.end, r.daysLate || 1); else add(NAMES[pl.client] || pl.name, r.task, r.owner, r.end, 0); }
    }
  } catch (e) { out.notes.push('Plans unreadable: ' + e.message); }
  out.overdue.sort((a, b) => b.late - a.late || a.client.localeCompare(b.client));
  for (const k of ['today', 'tomorrow']) out[k].sort((a, b) => a.client.localeCompare(b.client));
  out.date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: undefined });
  return out;
}

function block(title, items, head, bar, over) {
  const rows = items.length ? items.map(i => `<tr><td class=c>${esc(i.client)}</td><td>${esc(i.task)}</td><td class=o>${esc(i.owner)}</td><td class=d>${nice(i.date)}${over ? `<br><b>${i.late}d late</b>` : ''}</td></tr>`).join('') : '<tr><td colspan=4 class=n>Nothing</td></tr>';
  return `<div class=blk style="border-left:10px solid ${bar}"><div class=h style="background:${head}">${title} <span>${items.length}</span></div><table>${rows}</table></div>`;
}

export function html(d) {
  return `<!doctype html><meta charset=utf-8><style>
*{box-sizing:border-box;margin:0}body{width:1200px;background:#F3F2F2;color:#201E1D;font:22px/1.3 Georgia,serif;padding:44px}
.k{font:700 15px Arial,sans-serif;letter-spacing:3px;color:#B6240E}.t{font-size:40px;font-weight:300;margin:6px 0 4px}.cnt{font:20px Arial,sans-serif;color:#4A4644;margin-bottom:26px}
.blk{background:#fff;margin-bottom:22px}.h{color:#F3F2F2;padding:12px 18px;font:700 18px Arial,sans-serif;letter-spacing:2px}.h span{float:right;font-size:26px;line-height:20px}
table{width:100%;border-collapse:collapse;font:20px Arial,sans-serif}td{padding:11px 14px;border-top:1px solid #D6D2CF;vertical-align:top}.c{width:170px;font-weight:700}.o{width:150px;color:#4A4644}.d{width:140px;text-align:right;white-space:nowrap}.d b{color:#B6240E}.n{color:#4A4644}
.f{font:14px Arial,sans-serif;color:#4A4644;margin-top:6px}</style>
<div class=k>WRW HOSPITALITY &middot; TRACKER DIGEST</div><div class=t>${esc(d.date)}</div>
<div class=cnt>${d.today.length} due today &middot; ${d.overdue.length} overdue &middot; ${d.tomorrow.length} due tomorrow</div>
${block('DUE TODAY', d.today, '#201E1D', '#201E1D')}${block('OVERDUE', d.overdue, '#EC3013', '#EC3013', true)}${block('DUE TOMORROW', d.tomorrow, '#4A4644', '#4A4644')}
${d.notes.length ? `<div class=f>${esc(d.notes.join(' · '))}</div>` : ''}`;
}

export async function render() {
  const d = await collect(), dir = path.join(ROOT, 'output', 'library', 'tracker-digest');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `tracker-digest-${ymd(new Date())}.png`);
  let b; try { b = await chromium.launch({ channel: 'chrome' }); } catch { b = await chromium.launch(); }
  try { const pg = await b.newPage({ viewport: { width: 1288, height: 800 }, deviceScaleFactor: 1 }); await pg.setContent(html(d)); await pg.screenshot({ path: file, fullPage: true }); } finally { await b.close(); }
  return { path: file, today: d.today.length, overdue: d.overdue.length, tomorrow: d.tomorrow.length, notes: d.notes };
}
