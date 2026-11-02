// Uber Eats Manager exports → order accuracy and availability for a client's AIOS dashboard (V3.12, 30 Oct 2026). No model is involved.
// Uber keeps 12 weeks, so each Monday's download is kept raw in data/ubereats/ and merged with the earlier ones (an order, item line,
// hour or pause in two files counts once): the history here grows past Uber's window. Files are recognised by their header row;
// downloads named the way Uber names them are also picked up from this PC's Downloads folder, so a browser download needs no upload.
// The accuracy workbook (.xlsx) is kept but not read: the CSVs carry every figure in it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const dir = dataDir => path.join(dataDir, 'ubereats');
const KINDS = { errors: 'Ticket size', items: 'Item issue', downtime: 'Menu available', pauses: 'Event summary' };
// the 12-month summaries from the Order accuracy and Operations pages: a month table, an item leaderboard, weekday-by-hour grids
const SUMMARY = { monthly: /^Period,Day,Total inaccurate orders/, cancels: /^Period,Day,Orders,Shop unaccepted/, leaderboard: /^Item,Volume,Rate,Issue count/,
  hInaccurate: /^Day,Hour,Items missing/, hQuality: /^Day,Hour,Food quality issues/, hOnline: /^Day,Hour,Online rate/, hUnfulfilled: /^Day,Hour,Unaccepted/ };
export const kindOf = text => {
  const h = String(text || '').replace(/^﻿/, '').split(/\r?\n/)[0] || '';
  const s = Object.keys(SUMMARY).find(k => SUMMARY[k].test(h)); if (s) return s;
  if (!/^Restaurant,External restaurant ID/.test(h)) return null;
  return Object.keys(KINDS).find(k => h.includes(KINDS[k])) || null;
};
export const UBER_NAME = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(orders_with_errors|items_with_errors(_local)?|restaurant_menu_downtime(_local)?|store_availability|order_accuracy_analytics)_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}|order_accuracy_issues_(all|canceled)_\d{4}-\d{2}-\d{2}|item_issues_leaderboard_\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}|(Food orders with taste and quality issues|Online rate|Unfulfilled orders|Inaccurate orders)_hourly_data)( \(\d+\))?\.(csv|xlsx)$/;

// copy any Uber Eats Manager download not filed yet from Downloads into data/ubereats/. A second download of the same report
// ("… (1).csv", or the hourly grids, which always carry the same name) replaces the filed copy when it is newer.
export function importDownloads(dataDir, from = path.join(os.homedir(), 'Downloads')) {
  let names = []; try { names = fs.readdirSync(from).filter(f => UBER_NAME.test(f)); } catch { return 0; }
  fs.mkdirSync(dir(dataDir), { recursive: true }); let n = 0;
  for (const f of names.sort((a, b) => fs.statSync(path.join(from, a)).mtimeMs - fs.statSync(path.join(from, b)).mtimeMs)) {
    const to = path.join(dir(dataDir), f.replace(/ \(\d+\)(\.\w+)$/, '$1')), src = path.join(from, f);
    if (!fs.existsSync(to) || fs.statSync(src).mtimeMs > fs.statSync(to).mtimeMs + 1000) { fs.copyFileSync(src, to); n++; }
  }
  return n;
}

// a CSV reader that respects quotes (item names and feedback hold commas)
export function parse(text) {
  const t = String(text || '').replace(/^﻿/, ''), rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); rows.push(r); r = []; c = ''; }
    else c += ch;
  }
  if (c || r.length) { r.push(c); rows.push(r); }
  const head = rows.shift() || [];
  return rows.filter(x => x.length > 1).map(x => Object.fromEntries(head.map((k, i) => [k, x[i] ?? ''])));
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const dow = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
const monday = iso => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - dow(iso)); return d.toISOString().slice(0, 10); };
// the menu's badges are not part of the dish: "Chicken Fillet Burger ⭐(Best Seller) ⭐" is the Chicken Fillet Burger
export const dish = s => String(s || '').replace(/⭐[^⭐]*⭐/g, '').replace(/\((Best seller|Popular)\)/gi, '').replace(/⭐/g, '').replace(/\s+/g, ' ').trim();
// a side, drink or sauce: the missing part when there is one ("Zinger Box meal → Rubicon mango can"), else the item itself ("Pot Sauce 4oz")
const SIDE = /fries|wedge|chips|drink|coke|pepsi|fanta|sprite|tango|rubicon|ribena|water|\bcan\b|bottle|sauce|dip\b|mayo|ketchup|garlic bread|coleslaw|salad|rice|naan/i;
const SIDE_ITEM = /^(fries|wedges|chips|pot |can |coke|pepsi|fanta|sprite|tango|rubicon|water|.*garlic bread|coleslaw|.*sauce|.*dip\b)/i;
const isSide = r => r['Inaccurate customisation'] && !/^(REG|Large|Small|Medium|\d+ inch.*)$/i.test(r['Inaccurate customisation']) ? SIDE.test(r['Inaccurate customisation']) : SIDE_ITEM.test(dish(r['Item name']));
const INACCURATE = new Set(['MISSING_ITEM', 'PARTIAL_MISSING_ITEM', 'WRONG_ITEM', 'WRONG_ORDER', 'MISSING_CUSTOMIZATION', 'WRONG_CUSTOMIZATION', 'MISSING_CUSTOMISATION', 'WRONG_CUSTOMISATION']);

let cache = { key: '', value: null };
export function build(dataDir, { match, delivered, downloads } = {}) {
  try { importDownloads(dataDir, downloads); } catch {}
  const d = dir(dataDir); let files = [];
  try { files = fs.readdirSync(d).filter(f => /\.csv$/i.test(f)).sort(); } catch { return { available: false }; }
  let sc = 0; try { sc = fs.statSync(path.join(d, 'scorecard.json')).mtimeMs; } catch {}
  const key = files.map(f => f + ':' + fs.statSync(path.join(d, f)).mtimeMs).join('|') + '|' + match + '|' + sc;
  if (cache.key === key && !delivered) return cache.value;
  const want = String(match || '').toLowerCase(), mine = r => !want || String(r.Restaurant || '').toLowerCase().includes(want);
  const sets = { errors: new Map(), items: new Map(), downtime: new Map(), pauses: new Map() }; let from = '', to = '';
  for (const f of files) {
    const text = fs.readFileSync(path.join(d, f), 'utf8'), kind = kindOf(text); if (!kind || !sets[kind]) continue;
    const m = /_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv$/i.exec(f); if (m) { if (!from || m[1] < from) from = m[1]; if (!to || m[2] > to) to = m[2]; }
    const seen = {}; // two identical lines in one file are two lines (the same item twice in an order); in two files, one
    for (const r of parse(text).filter(mine)) {
      const k = kind === 'errors' ? r['Order UUID'] : kind === 'items' ? [r['Order UUID'], r['Item name'], r['Inaccurate customisation'], r['Item issue']].join('|')
        : kind === 'downtime' ? r['Restaurant opened at'] : r['Start time (local)'];
      seen[k] = (seen[k] || 0) + 1; sets[kind].set(k + '#' + seen[k], r);
    }
  }
  const E = [...sets.errors.values()], I = [...sets.items.values()], M = [...sets.downtime.values()], P = [...sets.pauses.values()];
  const year = yearOf(d, files, delivered);
  // the success score and the market benchmark: screens with no download, read into scorecard.json by hand or from the Monday report
  let scorecard = null; try { scorecard = JSON.parse(fs.readFileSync(path.join(d, 'scorecard.json'), 'utf8')); } catch {}
  if (!E.length && !M.length) { cache = { key, value: year || scorecard ? { available: true, app: 'Uber Eats', weeks: [], items: [], pauses: [], issues: {}, kinds: { main: 0, side: 0 }, hours: Array(24).fill(0), year, scorecard } : { available: false } }; return cache.value; }
  if (!from) { const ds = [...E.map(r => r['Time customer ordered']), ...M.map(r => r.Date)].map(s => String(s).slice(0, 10)).sort(); from = ds[0]; to = ds[ds.length - 1]; }
  // an order is inaccurate (Uber's definition) when one of its item lines is missing or wrong; food quality is counted beside it
  const inaccurate = new Set(I.filter(r => INACCURATE.has(r['Item issue'])).map(r => r['Order UUID']));
  for (const r of E) if (r['Order issue'] === 'WRONG_ORDER') inaccurate.add(r['Order UUID']);
  const weeks = {}, hours = Array(24).fill(0), issues = {};
  const wk = w => (weeks[w] = weeks[w] || { w, problems: 0, inaccurate: 0, refunded: 0, chargeback: 0, offline: 0, menu: 0 });
  for (const r of E) {
    const day = String(r['Time customer ordered']).slice(0, 10), x = wk(monday(day));
    x.problems++; if (inaccurate.has(r['Order UUID'])) x.inaccurate++;
    x.refunded += +r['Customer refunded'] || 0; x.chargeback += +r['Chargeback amount'] || 0;
    if (inaccurate.has(r['Order UUID'])) hours[+String(r['Time customer ordered']).slice(11, 13)]++;
  }
  const items = {}, kinds = { main: 0, side: 0 };
  for (const r of I) {
    issues[r['Item issue']] = (issues[r['Item issue']] || 0) + 1;
    if (!INACCURATE.has(r['Item issue'])) continue;
    const n = dish(r['Item name']); items[n] = (items[n] || 0) + 1;
    kinds[isSide(r) ? 'side' : 'main']++;
  }
  for (const r of M) { const x = wk(monday(String(r.Date).slice(0, 10))); x.offline += +r['Restaurant offline'] || 0; x.menu += +r['Menu available'] || 0; }
  const sum = (l, k) => round(l.reduce((n, r) => n + (+r[k] || 0), 0));
  const weekList = Object.values(weeks).sort((a, b) => (a.w < b.w ? -1 : 1)).map(x => ({ ...x, refunded: round(x.refunded), chargeback: round(x.chargeback) }));
  const value = {
    available: true, app: 'Uber Eats', restaurant: (E[0] || M[0]).Restaurant, from, to, files: files.length,
    problems: E.length, inaccurate: inaccurate.size, refunded: sum(E, 'Customer refunded'), chargeback: sum(E, 'Chargeback amount'), uberCovered: sum(E, 'Refund Not Covered by Merchant'),
    lines: I.length, issues, kinds, noCode: I.filter(r => !r['External Item ID']).length,
    items: Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, k]) => ({ n, k })),
    weeks: weekList, hours, menuMin: sum(M, 'Menu available'), offlineMin: sum(M, 'Restaurant offline'),
    pauses: P.map(r => ({ at: String(r['Start time (local)']).slice(0, 16), dur: String(r.Duration || '').replace(/^0 /, '').replace(/\.000$/, ''), why: r['Event summary'], back: r.Recovery })).sort((a, b) => (a.at < b.at ? 1 : -1)),
  };
  // orders completed, from the delivery orders (Deliverect), so every count above has a rate
  if (delivered) { const o = delivered('Uber Eats', from, to); value.orders = o.orders; value.ordersByHour = o.hours; for (const x of value.weeks) x.orders = o.weeks[x.w] || 0; }
  if (year) value.year = year;
  if (scorecard) value.scorecard = scorecard;
  cache = { key, value };
  return value;
}

// The Monday report ends with the success score and the benchmark as read off the screens (the uber-eats-weekly skill):
//   UBER EATS SCORECARD
//   {"readOn":"YYYY-MM-DD","tier":"Good","next":"Great","metrics":[{"name","current","goal","met"}],"operational":[{"name","current","goal","impact"}],
//    "benchmark12w":[{"name","shop","market","diff"}],"benchmark7d":[…]}
//   END UBER EATS SCORECARD
// It replaces those parts of scorecard.json; the benefits table and which way each benchmark row is better are kept from the file.
export function fileScorecard(dataDir, text) {
  const m = /UBER EATS SCORECARD\s*([\s\S]*?)\s*END UBER EATS SCORECARD/.exec(String(text || '')); if (!m) return null;
  let j; try { j = JSON.parse(m[1].replace(/^```(json)?|```$/g, '').trim()); } catch { return { error: 'the scorecard block is not valid JSON' }; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(j.readOn || '') || !j.tier || !Array.isArray(j.metrics) || !Array.isArray(j.operational)) return { error: 'the scorecard block is missing readOn, tier, metrics or operational' };
  const f = path.join(dir(dataDir), 'scorecard.json'); let old = {}; try { old = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  const os_ = old.success || {}, ob = old.benchmark || { rows: [] }, num = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };
  const success = { ...os_, tier: String(j.tier), next: String(j.next || os_.next || ''), tiers: os_.tiers || ['Poor', 'Fair', 'Good', 'Great', 'Excellent'],
    metrics: j.metrics.map(x => ({ name: String(x.name), current: String(x.current), goal: String(x.goal), met: x.met === true ? true : x.met === false ? false : null })),
    operational: j.operational.map(x => ({ name: String(x.name), current: num(x.current), goal: num(x.goal), impact: String(x.impact || '') })).filter(x => x.current != null && x.goal != null) };
  const names = [...new Set([...(j.benchmark12w || []), ...(j.benchmark7d || [])].map(r => String(r.name)))];
  const pick = (list, n) => { const r = (list || []).find(x => String(x.name) === n); return r ? [String(r.shop), String(r.market), num(r.diff)] : ['—', '—', null]; };
  const benchmark = names.length ? { periods: { w12: 'last 12 weeks, to ' + j.readOn, d7: 'last 7 days, to ' + j.readOn }, rows: names.map(n => ({ name: n, better: (ob.rows.find(r => r.name === n) || {}).better || (/inaccurate|quality|unfulfilled|wait/i.test(n) ? 'down' : 'up'), w12: pick(j.benchmark12w, n), d7: pick(j.benchmark7d, n) })) } : old.benchmark;
  fs.mkdirSync(dir(dataDir), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ ...old, readOn: j.readOn, success, benchmark }, null, 2));
  return { ok: true, readOn: j.readOn, tier: success.tier };
}

// The 12-month view (V3.12, 30 Oct): the month table (this period and last), cancellations, the item leaderboard and the weekday-by-hour
// grids. Month rows from several downloads merge, the newest file winning a month; the leaderboard and the grids are the newest download.
// The grids carry no dates: Uber builds them over the last 12 months, the same months as the month table. Day 1 is Monday.
const FIELDS = { inaccurate: 'Total inaccurate orders', cust: 'Inaccurate orders with missing customisation', items: 'Inaccurate orders with items missing',
  wrongOrder: 'Inaccurate orders with wrong order delivered', wrongItem: 'Inaccurate orders with wrong item delivered', wrongCust: 'Inaccurate orders with wrong customisation delivered',
  quality: 'Orders with food quality issues', qty: 'Orders with food inadequate quantity issue', refunds: 'Total refunds paid' };
export const cleanItem = s => dish(s).replace(/\(Most liked[^)]*\)|❤️|♥️|\(New item\)|\(popular ?\)|⭐️?NEW⭐️?|️/gi, '').replace(/\s+/g, ' ').trim();
function yearOf(d, files, delivered) {
  const byMtime = files.map(f => ({ f, at: fs.statSync(path.join(d, f)).mtimeMs, text: fs.readFileSync(path.join(d, f), 'utf8') })).sort((a, b) => a.at - b.at);
  const of = k => byMtime.filter(x => kindOf(x.text) === k), newest = k => of(k).pop();
  const months = {};
  for (const x of of('monthly')) for (const r of parse(x.text)) { const m = String(r.Day).slice(0, 7); months[m] = { ...(months[m] || {}), m, ...Object.fromEntries(Object.entries(FIELDS).map(([k, c]) => [k, +r[c] || 0])) }; }
  for (const x of of('cancels')) for (const r of parse(x.text)) { const m = String(r.Day).slice(0, 7); months[m] = { ...(months[m] || { m }), cancelled: +r.Orders || 0, timedOut: +r['Shop unaccepted (timed out)'] || 0, rejected: +r['Shop rejected'] || 0 }; }
  const list = Object.values(months).sort((a, b) => (a.m < b.m ? -1 : 1));
  const lb = newest('leaderboard'), grids = ['hInaccurate', 'hQuality', 'hUnfulfilled', 'hOnline'].map(newest);
  if (!list.length && !lb && !grids.some(Boolean)) return null;
  const last12 = list.slice(-12), from = last12.length ? last12[0].m + '-01' : '', lastM = last12.length ? last12[last12.length - 1].m : '';
  const to = lastM ? new Date(Date.UTC(+lastM.slice(0, 4), +lastM.slice(5, 7), 0)).toISOString().slice(0, 10) : '';
  if (delivered && list.length) { const o = delivered('Uber Eats', list[0].m + '-01', to); for (const x of list) x.orders = (o.months || {})[x.m] || 0; }
  // the leaderboard: one dish listed several times on the app is one dish here; its main problem is the one with the most reports
  let items = [];
  if (lb) {
    const m = {};
    for (const r of parse(lb.text)) {
      const n = cleanItem(r.Item), v = +r.Volume || 0, rate = +r.Rate || 0, x = (m[n] = m[n] || { n, k: 0, listings: 0, orders: 0, issues: {} });
      x.k += v; x.listings++; if (rate) x.orders += v / rate * 100; x.issues[r['Top issue']] = (x.issues[r['Top issue']] || 0) + v;
      if (!x.big || v > x.big) { x.big = v; x.chg = +r['Issue count %Δ']; } // the change on last year, from the dish's busiest listing (1.00 = doubled)
    }
    items = Object.values(m).map(x => ({ n: x.n, k: x.k, listings: x.listings, rate: x.orders ? round(x.k / x.orders * 100) : null, chg: Number.isFinite(x.chg) ? x.chg : null, top: Object.entries(x.issues).sort((a, b) => b[1] - a[1])[0][0] })).sort((a, b) => b.k - a.k);
  }
  const grid = (x, col) => { const g = Array.from({ length: 7 }, () => Array(24).fill(0)); if (x) for (const r of parse(x.text)) { const dd = +r.Day - 1, h = +r.Hour; if (dd >= 0 && dd < 7 && h >= 0 && h < 24) g[dd][h] += +r[col] || 0; } return x ? g : null; };
  const [gI, gQ, gU, gO] = grids;
  const out = { from, to, months: list, items, leaderboard: lb ? (/(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})/.exec(lb.f) || []).slice(1) : null,
    heat: { inaccurate: grid(gI, 'Total'), quality: grid(gQ, 'Total'), unfulfilled: grid(gU, 'Total'), timedOut: grid(gU, 'Unaccepted (timed out)'), offline: grid(gO, 'Offline time (minutes)') } };
  if (delivered && from) out.heat.orders = delivered('Uber Eats', from, to).heat;
  return out;
}
