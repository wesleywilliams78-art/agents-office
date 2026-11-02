// Deliverect order exports → delivery numbers for a client's AIOS dashboard (V3.12, 30 Oct 2026). No model is involved.
// An export is a CSV with one row per order (placed time, order id, status, channel, location, type, revenue, discount, failure type).
// Deliverect caps an export at 50,000 orders, so a client's history arrives in several files: they are kept raw in data/deliverect/,
// merged (an order in two files counts once) and summarised by day, month and hour. A day an export starts part-way through
// (its first order after 15:00) is marked partial and left out of comparisons.
import fs from 'node:fs';
import path from 'node:path';

export const HEADER = 'OrderPlacedLocal,OrderID,Status,Channel';
export const isExport = text => String(text || '').replace(/^﻿/, '').startsWith(HEADER);
export const dir = dataDir => path.join(dataDir, 'deliverect');

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const dow = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7; // Monday = 0

export function parse(text) {
  const L = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
  const head = L.shift().split(',').map(h => h.trim());
  const at = k => head.indexOf(k), I = { t: at('OrderPlacedLocal'), id: at('OrderID'), st: at('Status'), ch: at('Channel'), loc: at('Location'), type: at('OrderType'), rev: at('Revenue'), disc: at('Discount'), fail: at('FailureType') };
  const out = [];
  for (const l of L) {
    if (!l.trim()) continue;
    // the Brand and Location columns hold commas without quotes ("Imrans, Imran's Diner - London Road"): read from both ends
    const c = l.split(','), extra = c.length - head.length, pick = i => (i > I.loc ? c[i + extra] : c[i]);
    const loc = extra > 0 ? c.slice(I.loc, I.loc + extra + 1).join(',') : c[I.loc];
    out.push({ t: c[I.t], id: c[I.id], st: c[I.st], ch: c[I.ch], loc: String(loc || '').trim(), type: pick(I.type), rev: +pick(I.rev) || 0, disc: +pick(I.disc) || 0, fail: pick(I.fail) || '' });
  }
  return out;
}

// Item lists (V3.12, 30 Oct): the Deliverect agent's "top items" CSVs, one per app and period, kept raw in data/deliverect/items/.
// A list is capped (top 50) but carries the totals of every item, so the share the top makes up is known. Item revenue is base price
// times units: no fees, tips or paid add-ons, so it sits below the orders' revenue for the same dates. The app comes from the file name
// (uber / deliveroo); a pooled list counts as the one app that had orders in its dates, or as all apps.
export const ITEMS_HEADER = 'product_name,units,revenue';
export const isItems = text => String(text || '').replace(/^﻿/, '').startsWith(ITEMS_HEADER);
export const itemsDir = dataDir => path.join(dir(dataDir), 'items');
export function parseItems(text) {
  const L = String(text || '').replace(/^﻿/, '').split(/\r?\n/), head = L.shift().split(',').map(h => h.trim()), at = k => head.indexOf(k);
  const out = { from: '', to: '', units: 0, revenue: 0, rows: 0, top: [] };
  for (const l of L) {
    if (!l.trim()) continue;
    // a product name may hold a comma: the six columns after it are fixed, so read them from the end
    const c = l.split(','), tail = c.slice(-(head.length - 1)), name = c.slice(0, c.length - tail.length).join(',').replace(/^"|"$/g, '').trim();
    const v = k => tail[at(k) - 1];
    out.top.push({ n: name, u: +v('units') || 0, r: round(+v('revenue') || 0) });
    out.from = v('data_from') || out.from; out.to = v('data_through') || out.to;
    out.units = +v('grand_total_units') || out.units; out.revenue = round(+v('grand_total_revenue') || out.revenue); out.rows = +v('total_rows') || out.rows;
  }
  return out;
}
function items(dataDir, rows, channels) {
  const d = itemsDir(dataDir); let files = [];
  try { files = fs.readdirSync(d).filter(f => /\.csv$/i.test(f)).sort((a, b) => fs.statSync(path.join(d, a)).mtimeMs - fs.statSync(path.join(d, b)).mtimeMs); } catch { return []; }
  const sets = new Map();
  for (const f of files) {
    const s = parseItems(fs.readFileSync(path.join(d, f), 'utf8')); if (!s.top.length || !s.from || !s.to) continue;
    const inRange = rows.filter(x => x.st === 'Delivered' && x.t.slice(0, 10) >= s.from && x.t.slice(0, 10) <= s.to);
    const named = channels.find(ch => f.toLowerCase().replace(/[^a-z]/g, '').includes(ch.toLowerCase().replace(/[^a-z]/g, '').replace('eats', '')));
    const had = [...new Set(inRange.map(x => x.ch))];
    const ch = named || (had.length === 1 ? had[0] : 'all');
    const mine = inRange.filter(x => ch === 'all' || x.ch === ch);
    sets.set(ch + '|' + s.from + '|' + s.to, { ch, file: f, ...s, orderRevenue: round(mine.reduce((n, x) => n + x.rev, 0)), orders: mine.length }); // the newest file for the same app and dates wins
  }
  return [...sets.values()].sort((a, b) => (a.from < b.from ? -1 : 1));
}

// delivered orders on one app between two dates, by Monday-start week and by hour: the count other reports are rated against
// (Uber Eats Manager's accuracy report, V3.12 30 Oct). Reads the orders of the last build.
const monday = iso => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - dow(iso)); return d.toISOString().slice(0, 10); };
export function delivered(ch, from, to) {
  const out = { orders: 0, weeks: {}, months: {}, hours: Array(24).fill(0), heat: Array.from({ length: 7 }, () => Array(24).fill(0)) }; // heat: Monday first
  for (const x of cache.rows || []) {
    const day = x.t.slice(0, 10); if (x.ch !== ch || x.st !== 'Delivered' || day < from || day > to) continue;
    out.orders++; const w = monday(day), h = +x.t.slice(11, 13); out.weeks[w] = (out.weeks[w] || 0) + 1; out.months[day.slice(0, 7)] = (out.months[day.slice(0, 7)] || 0) + 1;
    out.hours[h]++; out.heat[dow(day)][h]++;
  }
  return out;
}

let cache = { key: '', value: null, rows: [] };
export function build(dataDir, { match } = {}) {
  const d = dir(dataDir); let files = [];
  try { files = fs.readdirSync(d).filter(f => /\.csv$/i.test(f)).sort(); } catch { return { available: false }; }
  let itemFiles = []; try { itemFiles = fs.readdirSync(itemsDir(dataDir)).map(f => 'items/' + f + ':' + fs.statSync(path.join(itemsDir(dataDir), f)).mtimeMs); } catch {}
  const key = files.map(f => f + ':' + fs.statSync(path.join(d, f)).mtimeMs).concat(itemFiles).join('|') + '|' + match;
  if (cache.key === key) return cache.value;
  const want = String(match || '').toLowerCase(), seen = new Set(), rows = [], fileStarts = [];
  for (const f of files) {
    const r = parse(fs.readFileSync(path.join(d, f), 'utf8')).filter(x => !want || x.loc.toLowerCase().includes(want));
    if (r.length) fileStarts.push(r.map(x => x.t).sort()[0]);
    for (const x of r) { const k = x.ch + '|' + x.id + '|' + x.t; if (!seen.has(k)) { seen.add(k); rows.push(x); } }
  }
  if (!rows.length) { cache = { key, value: { available: false } }; return cache.value; }
  // partial days: an export that starts after 15:00 on a day no other file covers earlier
  const first = new Map(); for (const x of rows) { const day = x.t.slice(0, 10); if (!first.has(day) || x.t < first.get(day)) first.set(day, x.t); }
  const partial = fileStarts.filter(t => t.slice(11) > '15:00' && first.get(t.slice(0, 10)) === t).map(t => t.slice(0, 10));
  const channels = [...new Set(rows.map(x => x.ch))].sort((a, b) => rows.filter(x => x.ch === b).length - rows.filter(x => x.ch === a).length);
  const blank = () => Object.fromEntries(channels.map(c => [c, [0, 0, 0, 0]])); // revenue, orders, discount £, discounted orders (delivered orders only)
  const days = new Map(), months = new Map(), fails = {}, launch = {};
  for (const x of rows) {
    const day = x.t.slice(0, 10), mo = day.slice(0, 7);
    if (!days.has(day)) days.set(day, { d: day, ch: blank(), x: 0, f: 0, n: 0 });
    if (!months.has(mo)) months.set(mo, { m: mo, ch: blank(), x: 0, f: 0, n: 0 });
    for (const e of [days.get(day), months.get(mo)]) {
      e.n++;
      if (x.st === 'Delivered') { const v = e.ch[x.ch]; v[0] += x.rev; v[1]++; if (x.disc < 0) { v[2] += -x.disc; v[3]++; } }
      else if (x.st === 'Cancelled') e.x++;
      else if (x.st === 'Failed') e.f++;
    }
    if (x.fail) { const y = day.slice(0, 4); fails[y] = fails[y] || {}; fails[y][x.fail] = (fails[y][x.fail] || 0) + 1; }
    if (!launch[x.ch] || day < launch[x.ch]) launch[x.ch] = day;
  }
  const tidy = e => ({ ...e, ch: Object.fromEntries(Object.entries(e.ch).map(([c, v]) => [c, [round(v[0]), v[1], round(v[2]), v[3]]])) });
  const dayList = [...days.values()].sort((a, b) => (a.d < b.d ? -1 : 1)).map(tidy), to = dayList[dayList.length - 1].d;
  // when delivery orders come in: average delivered orders per day, weekday by hour, this year to date
  const y0 = to.slice(0, 4) + '-01-01', heat = Array.from({ length: 7 }, () => Array(24).fill(0)), nDays = Array(7).fill(0);
  for (const e of dayList) if (e.d >= y0 && !partial.includes(e.d)) nDays[dow(e.d)]++;
  for (const x of rows) { const day = x.t.slice(0, 10); if (x.st === 'Delivered' && day >= y0 && !partial.includes(day)) heat[dow(day)][+x.t.slice(11, 13)]++; }
  for (let w = 0; w < 7; w++) for (let h = 0; h < 24; h++) heat[w][h] = nDays[w] ? round(heat[w][h] / nDays[w], 1) : 0;
  const value = { available: true, location: rows[0].loc, files: files.length, orders: rows.length, from: dayList[0].d, to, partial, channels, launch,
    days: dayList, months: [...months.values()].sort((a, b) => (a.m < b.m ? -1 : 1)).map(tidy), fails, heat, heatFrom: y0, items: items(dataDir, rows, channels) };
  cache = { key, value, rows };
  return value;
}
