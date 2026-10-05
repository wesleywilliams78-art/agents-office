// Personal budget — the owner's own ledger in Google Sheets, shown on /aios.
// Claude reads the sheet through the Google Drive connector and hands back the raw rows; everything
// after that (month totals, categories) is plain arithmetic done here, then checked against the
// sheet's own summary block so a mis-copied row shows up as a warning, not a wrong number.
// Stored in data/budget.json — runtime state like data/matrix.json, never in the brain.
import fs from 'node:fs';
import path from 'node:path';

const file = dataDir => path.join(dataDir, 'budget.json');
export function load(dataDir) { try { return JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); } catch { return null; } }
export function save(dataDir, snap) { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(snap, null, 2)); }

export function syncPrompt({ sheet, name }) {
  const system = 'You read one Google Sheet for its owner and copy its contents out exactly. You never edit, create or share anything. ' +
    'Use the Google Drive tool to read the file, then reply with ONLY a JSON object: no prose, no code fences. Copy every value exactly as it appears; never round, merge, estimate or invent a row.';
  const user = `Read the Google Sheet "${name || 'Personal Budget Ledger'}" (Drive file id ${sheet}).\n` +
    'The ledger table has the columns Month, Flow, Item, Category, Amount (GBP), Recurrence, Status, Note. A separate summary block beside it has Month, Income, Outgoings, Net, Recurring income, Recurring outgoings, Recurring net.\n' +
    'Return: {"rows":[[month,flow,item,category,amount,recurrence,status,note],...],"summary":[[month,income,outgoings,net,recurringIncome,recurringOutgoings,recurringNet],...]}\n' +
    'Month is YYYY-MM-DD exactly as in the sheet. Amount and the summary figures are plain numbers with no currency symbol or commas. Include every ledger row in sheet order, and every summary row that has a month. If a table is empty return an empty list for it.';
  return { system, user };
}

const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[£,\s]/g, '')); return Number.isFinite(n) ? n : null; };
const MONTH = /^20\d{2}-\d{2}-\d{2}$/;
const r2 = n => Math.round(n * 100) / 100;

// the model's JSON → clean rows + summary, with a count of what was dropped
export function parse(j) {
  const rows = [], dropped = [];
  for (const r of Array.isArray(j?.rows) ? j.rows : []) {
    const [month, flow, item, category, amount, recurrence, status, note] = Array.isArray(r) ? r : [];
    const a = num(amount), f = /^income$/i.test(String(flow).trim()) ? 'Income' : /^outgo/i.test(String(flow).trim()) ? 'Outgoing' : '';
    if (!MONTH.test(String(month || '')) || !f || a === null || !String(item || '').trim()) { dropped.push(String(item || month || '?').slice(0, 40)); continue; }
    rows.push({ month: String(month), flow: f, item: String(item).trim(), category: String(category || 'Uncategorised').trim() || 'Uncategorised', amount: a,
      recurrence: /^recurring$/i.test(String(recurrence).trim()) ? 'Recurring' : 'One-off', status: /^actual$/i.test(String(status).trim()) ? 'Actual' : 'Forecast', note: String(note || '').trim() });
  }
  const summary = [];
  for (const s of Array.isArray(j?.summary) ? j.summary : []) {
    if (!Array.isArray(s) || !MONTH.test(String(s[0] || ''))) continue;
    const v = s.slice(1, 7).map(num); if (v.some(x => x === null)) continue;
    summary.push({ month: String(s[0]), income: v[0], outgoings: v[1], net: v[2], recurringIncome: v[3], recurringOutgoings: v[4], recurringNet: v[5] });
  }
  return { rows, summary, dropped };
}

// month totals and the outgoings-by-category split, from the rows alone
export function compute(rows) {
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.month)) by.set(r.month, { month: r.month, income: 0, outgoings: 0, recurringIncome: 0, recurringOutgoings: 0, actual: 0, forecast: 0, categories: {} });
    const m = by.get(r.month);
    if (r.flow === 'Income') { m.income += r.amount; if (r.recurrence === 'Recurring') m.recurringIncome += r.amount; }
    else { m.outgoings += r.amount; if (r.recurrence === 'Recurring') m.recurringOutgoings += r.amount; m.categories[r.category] = (m.categories[r.category] || 0) + r.amount; }
    r.status === 'Actual' ? m.actual++ : m.forecast++;
  }
  return [...by.values()].sort((a, b) => a.month < b.month ? -1 : 1).map(m => ({
    month: m.month, income: r2(m.income), outgoings: r2(m.outgoings), net: r2(m.income - m.outgoings),
    recurringIncome: r2(m.recurringIncome), recurringOutgoings: r2(m.recurringOutgoings), recurringNet: r2(m.recurringIncome - m.recurringOutgoings),
    status: m.forecast === 0 ? 'Actual' : m.actual === 0 ? 'Forecast' : 'Mixed',
    categories: Object.entries(m.categories).map(([name, amount]) => ({ name, amount: r2(amount) })).sort((a, b) => b.amount - a.amount),
  }));
}

// the sheet's own summary block against our own sums — a difference of more than a penny is named
export function verify(months, summary) {
  const mismatches = []; let checked = 0;
  for (const s of summary) {
    const m = months.find(x => x.month === s.month);
    if (!m) { mismatches.push(`${s.month.slice(0, 7)}: the summary lists it but no ledger rows were read`); continue; }
    checked++;
    for (const [label, ours, theirs] of [['income', m.income, s.income], ['outgoings', m.outgoings, s.outgoings], ['net', m.net, s.net], ['recurring net', m.recurringNet, s.recurringNet]])
      if (Math.abs(ours - theirs) > 0.011) mismatches.push(`${s.month.slice(0, 7)} ${label}: rows add to ${ours.toFixed(2)}, the sheet says ${theirs.toFixed(2)}`);
  }
  return { ok: mismatches.length === 0, checked, mismatches };
}

export function snapshot({ sheet, name }, j) {
  const { rows, summary, dropped } = parse(j);
  if (!rows.length) throw new Error('Claude read the sheet but returned no ledger rows');
  const months = compute(rows);
  return { syncedAt: Date.now(), sheet: { id: sheet, name: name || 'Personal Budget Ledger' }, rows, months, check: { ...verify(months, summary), dropped } };
}
