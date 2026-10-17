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

const monthName = m => m;
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const dow = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7; // Monday = 0

// notes: [{name, text}], match: text the report must mention (the site's name)
export function build(notes, { match } = {}) {
  const want = match ? String(match).toLowerCase() : '';
  const mine = notes.filter(n => !want || String(n.text).toLowerCase().includes(want)).sort((a, b) => (a.name < b.name ? -1 : 1));
  let hourly = null, hourlyNote = '', item = null, itemNote = '';
  for (const n of mine) {
    if (/Hourly Sales/.test(n.text)) { const h = parseHourly(n.text); if (h) { hourly = h; hourlyNote = n.name; } }
    if (/Item Sales By Category/.test(n.text)) { const i = parseItems(n.text); if (i) { item = i; itemNote = n.name; } }
  }
  if (!hourly && !item) return { available: false };
  const out = { available: true, kind: 'pos', currency: '£', currencyNote: 'currency and VAT basis are not stated in the reports (assumed £)', sources: [hourlyNote, itemNote].filter(Boolean) };

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
  return out;
}
