// Sales reports → numbers for the AIOS dashboard. No model is involved: the uploaded notes already hold the text of each
// ninito.com monthly report (a zip of them is one note, one section per PDF), so this just reads it.
// One report = one shop for one month: summary (orders, turnover, average order, change vs the previous month), payments, platforms, products.

const SPACES = /[\s  ]/g;
const num = s => { const t = String(s || '').replace(SPACES, '').replace(',', '.'); const n = Number(t); return Number.isFinite(n) ? n : null; };
const SIZE_CAP = 400000;

export function parseReports(text) {
  const out = [];
  // a report starts at its "SALES REPORT" line; cut there so a zip note with many reports splits cleanly
  const chunks = String(text || '').split(/^SALES REPORT\s*$/m).slice(1);
  for (const c of chunks) {
    const shop = (/^Shops?:\s*(.+)$/m.exec(c) || [])[1]?.trim(), per = /^Period:\s*(\d{4})-(\d{2})-(\d{2})\s*-\s*(\d{4})-(\d{2})-(\d{2})/m.exec(c);
    if (!shop || !per) continue;
    const row = label => { const m = new RegExp('^' + label + '\\s*\\t\\s*([^\\t\\n]+)\\t\\s*([^\\t\\n]+)\\t\\s*([^\\n]*)$', 'm').exec(c); return m ? { value: num(m[1]), prev: num(m[2]), change: /%/.test(m[3]) ? num(m[3].replace('%', '')) : null } : null; };
    const orders = row('Orders'), turnover = row('Turnover'), avg = row('Average order amount');
    if (!turnover) continue;
    const section = (name, next) => { const i = c.search(new RegExp('^' + name + '\\s*$', 'm')); if (i < 0) return ''; const rest = c.slice(i + name.length); const j = next ? rest.search(new RegExp('^(' + next.join('|') + ')\\s*$', 'm')) : -1; return j < 0 ? rest : rest.slice(0, j); };
    const rows = (txt, cols) => txt.split('\n').map(l => l.split('\t').map(x => x.trim())).filter(p => p.length >= cols && p[0] && !/^NAME$/i.test(p[0]) && num(p[1]) !== null && !/^Powered by/i.test(p[0])).map(p => p);
    const payments = rows(section('Payments', ['Platforms', 'Products']), 2).map(p => ({ name: p[0], turnover: num(p[1]) }));
    const platforms = rows(section('Platforms', ['Products']), 3).map(p => ({ name: p[0], turnover: num(p[1]), orders: num(p[2]) }));
    const products = rows(section('Products'), 3).map(p => ({ name: p[0], turnover: num(p[1]), qty: num(p[2]) }));
    out.push({ shop, month: `${per[1]}-${per[2]}`, orders: orders?.value ?? null, turnover: turnover.value, avg: avg?.value ?? null,
      turnoverChange: turnover.change, ordersChange: orders?.change ?? null, payments, platforms, products });
  }
  return out;
}

const sum = (a, f) => a.reduce((n, x) => n + (f(x) || 0), 0);
function top(list, key, n) { const m = new Map(); for (const x of list) { const e = m.get(x.name) || { name: x.name, turnover: 0, qty: 0 }; e.turnover += x.turnover || 0; e.qty += x.qty || 0; m.set(x.name, e); } return [...m.values()].sort((a, b) => b.turnover - a.turnover).slice(0, n); }

// notes: [{name, text}]. The newest note's report wins when the same shop and month appear twice.
export function build(notes) {
  const by = new Map(), sources = [];
  for (const n of [...notes].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const reps = parseReports(String(n.text || '').slice(0, SIZE_CAP * 3)); if (!reps.length) continue;
    sources.push({ note: n.name, reports: reps.length });
    for (const r of reps) by.set(r.shop + '|' + r.month, r);
  }
  const reports = [...by.values()]; if (!reports.length) return { available: false };
  const months = [...new Set(reports.map(r => r.month))].sort();
  const shops = [...new Set(reports.map(r => r.shop))].sort();
  const series = Object.fromEntries(shops.map(s => [s, months.map(m => { const r = by.get(s + '|' + m); return r ? { month: m, turnover: r.turnover, orders: r.orders, avg: r.avg } : null; })]));
  const latest = months[months.length - 1], prev = months[months.length - 2];
  const at = m => reports.filter(r => r.month === m);
  const cur = at(latest);
  const total = rs => ({ turnover: sum(rs, r => r.turnover), orders: sum(rs, r => r.orders) });
  const t = total(cur), p = prev ? total(at(prev).filter(r => cur.some(c => c.shop === r.shop))) : null; // compare like with like: only shops reporting in both months
  const change = (a, b) => (b ? Math.round((a / b - 1) * 1000) / 10 : null);
  const perShop = cur.map(r => { const before = prev && by.get(r.shop + '|' + prev); return { shop: r.shop, turnover: r.turnover, orders: r.orders, avg: r.avg, vsPrevMonth: before ? change(r.turnover, before.turnover) : null }; }).sort((a, b) => b.turnover - a.turnover);
  return {
    available: true, currency: 'kr', sources, months, shops, series, latest, prev,
    totals: { turnover: Math.round(t.turnover), orders: t.orders, avg: t.orders ? Math.round(t.turnover / t.orders * 100) / 100 : null, turnoverVsPrev: p ? change(t.turnover, p.turnover) : null, ordersVsPrev: p ? change(t.orders, p.orders) : null },
    perShop,
    payments: top(cur.flatMap(r => r.payments), 'turnover', 6),
    platforms: top(cur.flatMap(r => r.platforms), 'turnover', 5),
    products: top(cur.flatMap(r => r.products), 'turnover', 6),
  };
}
