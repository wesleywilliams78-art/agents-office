// Till reports → numbers for the AIOS dashboard of a single restaurant site (Imran's Diner). No model is involved.
// Two Presto reports: the Hourly Sales grid (24 hours × every date, each cell "orders (sales)") and Item Sales By Category
// (menus → categories → items with quantity, total and discount). The newest upload of each wins.

const num = s => { const n = parseFloat(String(s || '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const NL = String.fromCharCode(10);

export function parseHourly(text) {
  const rows = String(text || '').split(NL).filter(l => l.startsWith('|')).map(l => l.split('|').slice(1, -1).map(x => x.trim()));
  const hi = rows.findIndex(r => r[0] === 'Hour'); if (hi < 0) return null;
  const dates = rows[hi].slice(1).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)); if (!dates.length) return null;
  const hours = [], cells = []; // cells[h][d] = {o, s}
  for (const r of rows.slice(hi + 1)) {
    const hm = /^(\d{1,2}):\d{2}\s*(AM|PM)$/i.exec(r[0] || ''); if (!hm) continue;
    let h = +hm[1] % 12; if (/pm/i.test(hm[2])) h += 12;
    hours.push(h);
    cells.push(dates.map((_, i) => { const m = /^(\d+)\s*\(([-\d.,]+)\)/.exec(r[i + 1] || ''); return m ? { o: +m[1], s: num(m[2]) } : { o: 0, s: 0 }; }));
  }
  if (!hours.length) return null;
  const hdr = (String(text).match(/Hourly Sales for (.+?)\s+Generated/) || [])[1] || '';
  return { dates, hours, cells, site: hdr.replace(/\s*\(.*\)\s*$/, '').trim(), place: (hdr.match(/\((.+)\)/) || [])[1] || '' };
}

const MENU = /^[A-Za-z][A-Za-z' ]* Menu$/;
const CAPS = /^[A-Z0-9][A-Z0-9 &'/,.()+-]*$/;
export function parseItems(text) {
  const L = String(text || '').split(NL).map(l => l.trim());
  const period = /Generated for the period of (\d{4}-\d{2}-\d{2}) - (\d{4}-\d{2}-\d{2})/.exec(text) || [];
  let menu = '', cat = '', inTable = false; const cats = [], items = [];
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (MENU.test(l) && !CAPS.test(l)) { menu = l; continue; }
    if (/^Page \d+ of \d+$/.test(L[i + 1] || '') && CAPS.test(l) && !/^(PAGE|ITEM)/.test(l)) { cat = l; inTable = false; continue; }
    if (/^(Item Name|Name Unit Price)\b/.test(l)) { inTable = true; continue; } // a header can wrap onto two lines
    if (!inTable || !menu) continue;
    const t = /^Total\s+(\d+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)$/.exec(l);
    if (t) { cats.push({ menu, category: cat, qty: +t[1], sales: num(t[2]), discount: num(t[3]) }); continue; }
    const m = /^(.*?)\s+(-?\d+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)$/.exec(l);
    if (m) { let name = m[1].replace(/\s+(?:\d+\.\d{2}(?:,\s*\d+\.\d{2})*)?(?:\s*\+\+)?$/, '').trim() || m[1]; if (/^[\d.,\s+]+$/.test(name)) name = 'Misc (price lines)'; items.push({ menu, category: cat, name, qty: +m[2], sales: num(m[3]) }); }
  }
  if (!cats.length) return null;
  return { from: period[1] || '', to: period[2] || '', cats, items };
}

// V3.12 (30 Oct): the Presto summary reports. Columns are found by their header names, not their position.
// "Total" is what was taken (it equals cash + card + other in every report), so it is the turnover used everywhere;
// the reports disagree on whether Total is Sub Total plus or minus the discount, and the weekly report's headers are swapped.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON3 = MONTHS.map(m => m.slice(0, 3));
const cellsOf = l => l.split('|').slice(1, -1).map(x => x.trim());
function table(text, first) { // the rows under the header whose first cell is `first`, as objects keyed by header name
  const L = String(text || '').split(NL).filter(l => l.startsWith('|')).map(cellsOf);
  const hi = L.findIndex(r => r[0] === first); if (hi < 0) return [];
  const head = L[hi].map(h => h.toLowerCase().replace(/\s+/g, ''));
  return L.slice(hi + 1).filter(r => r[0] && !/^total$/i.test(r[0])).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
export function uploadedAt(text) { // "> Uploaded 30/10/2026, 12:35:29" (dd/mm/yyyy, the office's own stamp)
  const m = /Uploaded (\d{1,2})\/(\d{1,2})\/(\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(text || ''));
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)) : 0;
}
const money5 = r => ({ orders: num(r.orders), total: num(r.total), discount: num(r.discount), cash: num(r.cashpay), card: num(r.card ?? r.cardpay), other: num(r.otherpay) });
export function parseMonthly(text) {
  if (!/Monthly Sales for/.test(text)) return null;
  const rows = table(text, 'Month').map(r => { const m = /^(\d{4}) (\w+)$/.exec(r.month || ''); const i = m ? MONTHS.indexOf(m[2]) : -1; return i < 0 ? null : { month: `${m[1]}-${String(i + 1).padStart(2, '0')}`, ...money5(r) }; }).filter(Boolean);
  return rows.length ? rows : null;
}
export function parseDaily(text) {
  if (!/Daily Sale Summary Report for/.test(text)) return null;
  const rows = table(text, 'Date').map(r => { const m = /^(\w{3}) (\d{1,2}),\s*(\d{4})$/.exec(r.date || ''); const i = m ? MON3.indexOf(m[1]) : -1; return i < 0 ? null : { date: `${m[3]}-${String(i + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`, ...money5(r) }; }).filter(Boolean);
  return rows.length ? rows : null;
}

const monthName = m => m;
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const dow = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7; // Monday = 0

// notes: [{name, text}], match: text the report must mention (the site's name)
export function build(notes, { match } = {}) {
  const want = match ? String(match).toLowerCase() : '';
  const mine = notes.filter(n => !want || String(n.text).toLowerCase().includes(want)).sort((a, b) => (uploadedAt(a.text) - uploadedAt(b.text)) || (a.name < b.name ? -1 : 1));
  let hourly = null, hourlyNote = '', item = null, itemNote = '';
  const hourlies = [], monthly = new Map(), daily = new Map(), srcs = new Set();
  for (const n of mine) {
    if (/Hourly Sales/.test(n.text)) { const h = parseHourly(n.text); if (h) { hourlies.push(h); hourlyNote = n.name; srcs.add(n.name); } } // every year: merged below, a later upload wins a date
    const mo = parseMonthly(n.text); if (mo) { for (const r of mo) monthly.set(r.month, r); srcs.add(n.name); }
    const da = parseDaily(n.text); if (da) { for (const r of da) daily.set(r.date, r); srcs.add(n.name); }
    if (/Item Sales By Category/.test(n.text)) { const i = parseItems(n.text); if (i) { item = i; itemNote = n.name; } }
  }
  if (hourlies.length) {
    const byDate = new Map(); let site = '', place = '';
    for (const h of hourlies) { site = h.site || site; place = h.place || place; h.dates.forEach((d, di) => { const row = Array.from({ length: 24 }, () => ({ o: 0, s: 0 })); h.hours.forEach((hr, hi) => { row[hr] = h.cells[hi][di]; }); byDate.set(d, row); }); }
    const dates = [...byDate.keys()].sort(), hours = [...Array(24).keys()];
    hourly = { dates, hours, cells: hours.map(hr => dates.map(d => byDate.get(d)[hr])), site, place };
  }
  if (!hourly && !item && !daily.size && !monthly.size) return { available: false };
  const out = { available: true, kind: 'pos', currency: '£', currencyNote: 'currency and VAT basis are not stated in the reports (assumed £)', sources: [...new Set([...srcs, itemNote].filter(Boolean))] };

  if (hourly) {
    const { dates, hours, cells } = hourly, perDay = dates.map((d, i) => ({ date: d, o: cells.reduce((n, r) => n + r[i].o, 0), s: cells.reduce((n, r) => n + r[i].s, 0) }));
    const byMonth = new Map();
    for (const d of perDay) { const m = d.date.slice(0, 7), e = byMonth.get(m) || { month: m, turnover: 0, orders: 0, days: 0, last: d.date }; e.turnover += d.s; e.orders += d.o; if (d.o > 0) e.days++; e.last = d.date; byMonth.set(m, e); }
    const months = [...byMonth.values()].map(e => { const [y, mo] = e.month.split('-').map(Number), end = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return { month: e.month, turnover: round(e.turnover), orders: e.orders, avg: e.orders ? round(e.turnover / e.orders) : null, days: e.days, partial: e.last === dates[dates.length - 1] && +e.last.slice(8) < end }; });
    const cur = months[months.length - 1], prev = months[months.length - 2];
    const chg = (a, b) => (b ? round((a / b - 1) * 100, 1) : null);
    // like with like: a part month is compared with the same number of days of the month before
    const dayN = cur ? +dates[dates.length - 1].slice(8) : 0, sameDays = prev ? perDay.filter(d => d.date.startsWith(prev.month) && +d.date.slice(8) <= dayN) : [];
    const prevT = sameDays.reduce((n, d) => n + d.s, 0), prevO = sameDays.reduce((n, d) => n + d.o, 0), partial = !!cur && cur.partial;
    // heat map: average orders per trading day for each weekday and hour (only dates from the first full week so every weekday has equal weight)
    const dayCount = Array(7).fill(0); dates.forEach(d => { dayCount[dow(d)]++; });
    const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
    cells.forEach((r, hi) => r.forEach((c, di) => { heat[dow(dates[di])][hours[hi]] += c.o; }));
    for (let w = 0; w < 7; w++) for (let h = 0; h < 24; h++) heat[w][h] = dayCount[w] ? round(heat[w][h] / dayCount[w], 1) : 0;
    const hourTotals = Array(24).fill(0); cells.forEach((r, hi) => r.forEach(c => { hourTotals[hours[hi]] += c.o; }));
    const dayTotals = Array(7).fill(0); perDay.forEach(d => { dayTotals[dow(d.date)] += d.o; });
    const peakHour = hourTotals.indexOf(Math.max(...hourTotals)), peakDay = dayTotals.map((t, i) => t / (dayCount[i] || 1)).reduce((b, v, i, a) => (v > a[b] ? i : b), 0);
    out.hourly = { site: hourly.site, place: hourly.place, from: dates[0], to: dates[dates.length - 1], months, latest: cur && cur.month, partialLatest: partial, heat, peakHour, peakDay, totals: { turnover: round(perDay.reduce((n, d) => n + d.s, 0)), orders: perDay.reduce((n, d) => n + d.o, 0) } };
    out.totals = cur ? { turnover: Math.round(cur.turnover), orders: cur.orders, avg: cur.avg, turnoverVsPrev: chg(cur.turnover, prevT), ordersVsPrev: chg(cur.orders, prevO), partial, to: dates[dates.length - 1], vsNote: partial ? 'same days of the month before' : 'vs the month before' } : null;
  }

  if (item) {
    const menus = new Map(), cats = new Map(), items = new Map();
    for (const c of item.cats) { const m = menus.get(c.menu) || { name: c.menu, qty: 0, sales: 0 }; m.qty += c.qty; m.sales += c.sales; menus.set(c.menu, m);
      const k = c.category || '—', e = cats.get(k) || { name: k, qty: 0, sales: 0 }; e.qty += c.qty; e.sales += c.sales; cats.set(k, e); }
    for (const i of item.items) { const e = items.get(i.name) || { name: i.name, qty: 0, sales: 0 }; e.qty += i.qty; e.sales += i.sales; items.set(i.name, e); }
    const top = (m, n) => [...m.values()].sort((a, b) => b.sales - a.sales).slice(0, n).map(x => ({ name: x.name, qty: x.qty, sales: round(x.sales) }));
    out.items = { from: item.from, to: item.to, total: round([...menus.values()].reduce((n, m) => n + m.sales, 0)), qty: [...menus.values()].reduce((n, m) => n + m.qty, 0), menus: top(menus, 8), categories: top(cats, 7), top: top(items, 8), note: 'items are ranked by the name on the till; the same dish sold under a different name is counted separately' };
  }
  if (daily.size || monthly.size) out.yoy = yearOnYear([...daily.values()].sort((a, b) => (a.date < b.date ? -1 : 1)), [...monthly.values()].sort((a, b) => (a.month < b.month ? -1 : 1)));
  return out;
}

// This year against last year, like with like. A day that has barely started (under a quarter of the usual orders) is left out,
// so "to date" ends on the last full trading day.
function yearOnYear(days, months) {
  const out = { months: months.map(m => ({ ...m, avg: m.orders ? round(m.total / m.orders) : null, discountPct: m.total ? round(m.discount / m.total * 100, 1) : null })) };
  if (!days.length) return out;
  const recent = days.slice(-29, -1).map(d => d.orders).sort((a, b) => a - b), median = recent.length ? recent[Math.floor(recent.length / 2)] : 0;
  const lastFull = [...days].reverse().find(d => d.orders >= median * 0.25) || days[days.length - 1];
  const partialDay = days[days.length - 1].date !== lastFull.date ? days[days.length - 1].date : '';
  const to = lastFull.date, y = +to.slice(0, 4), ly = (y - 1) + to.slice(4);
  const span = (from, until) => days.filter(d => d.date >= from && d.date <= until);
  const add = list => { const t = { total: 0, orders: 0, discount: 0, cash: 0, card: 0, other: 0, days: list.length }; for (const d of list) for (const k of ['total', 'orders', 'discount', 'cash', 'card', 'other']) t[k] += d[k]; t.total = round(t.total); t.avg = t.orders ? round(t.total / t.orders) : null; return t; };
  const pct = (a, b) => (b ? round((a / b - 1) * 100, 1) : null);
  const pair = (cur, prev) => ({ cur, prev, total: pct(cur.total, prev.total), orders: pct(cur.orders, prev.orders), avg: cur.avg && prev.avg ? pct(cur.avg, prev.avg) : null });
  out.to = to; out.partialDay = partialDay; out.year = y;
  out.days = days.filter(d => d.date <= to).map(d => [d.date, round(d.total), d.orders]); // every full trading day, for the explorer on the page (filters, comparisons)
  out.ytd = pair(add(span(y + '-01-01', to)), add(span((y - 1) + '-01-01', ly)));
  out.mtd = pair(add(span(to.slice(0, 8) + '01', to)), add(span((y - 1) + to.slice(4, 8) + '01', ly)));
  const lm = new Date(Date.UTC(y, +to.slice(5, 7) - 1, 0)).toISOString().slice(0, 7), lmLy = (y - 1) + lm.slice(4);
  const mOf = k => out.months.find(m => m.month === k);
  if (mOf(lm) && mOf(lmLy)) out.lastMonth = { month: lm, ...pair(mOf(lm), mOf(lmLy)) };
  const mix = t => (t.total ? { cash: round(t.cash / t.total * 100, 1), card: round(t.card / t.total * 100, 1), other: round(t.other / t.total * 100, 1) } : null);
  out.mix = { cur: mix(out.ytd.cur), prev: mix(out.ytd.prev) };
  out.discount = { cur: out.ytd.cur.total ? round(out.ytd.cur.discount / out.ytd.cur.total * 100, 2) : null, prev: out.ytd.prev.total ? round(out.ytd.prev.discount / out.ytd.prev.total * 100, 2) : null };
  // the last 8 full weeks against the same 8 weeks a year ago (364 days back keeps the weekdays aligned)
  const back = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') - n * 86400000).toISOString().slice(0, 10);
  out.weeks = []; for (let w = 7; w >= 0; w--) { const end = back(to, w * 7), start = back(end, 6); const c = add(span(start, end)), p = add(span(back(start, 364), back(end, 364))); out.weeks.push({ start, end, total: c.total, orders: c.orders, prevTotal: p.total, change: pct(c.total, p.total) }); }
  // the average day of the week over the last 12 full weeks
  const wk = span(back(to, 83), to), dowT = Array.from({ length: 7 }, () => ({ total: 0, orders: 0, n: 0 }));
  for (const d of wk) { const e = dowT[dow(d.date)]; e.total += d.total; e.orders += d.orders; e.n++; }
  out.weekdays = dowT.map(e => ({ total: e.n ? round(e.total / e.n) : 0, orders: e.n ? Math.round(e.orders / e.n) : 0 }));
  return out;
}
