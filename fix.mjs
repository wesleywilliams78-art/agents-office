// The fix (V3.12, 30 Oct 2026): one issue for a client restaurant to fix this month, picked by a model from everything the
// dashboard holds (till, delivery orders, item lists, Uber Eats accuracy and operations). The numbers are worked out here, without a
// model, into a short evidence pack: the model only chooses and writes the action, and may use no figure that is not in the pack.
// A new fix is written when new data lands (serve.mjs: the evidence changed and settled), kept in data/fixes.json with the earlier ones,
// so the next one can follow it up. The data is uploaded once a month, on the first Monday.
import fs from 'node:fs';
import path from 'node:path';

const file = dataDir => path.join(dataDir, 'fixes.json');
export const load = dataDir => { try { return JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); } catch { return {}; } };
const save = (dataDir, all) => { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(all, null, 2)); };
export const weekOf = (now = new Date()) => { const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toLocaleDateString('en-CA'); };
export const latest = (dataDir, id) => (load(dataDir)[id] || []).slice(-1)[0] || null;

const pct = (a, b) => (b ? ((a / b - 1) * 100).toFixed(1) + '%' : 'n/a');
const r2 = (n, d) => (d ? (n / d * 100).toFixed(2) + '%' : 'n/a');
const gbp = n => '£' + Math.round(n).toLocaleString('en-GB');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// the evidence pack: plain lines, each a fact with its number and its period
export function evidence(name, data) {
  const L = [], Y = data.yoy, dv = data.delivery, a = dv && dv.accuracy, y = a && a.year;
  L.push(`Business: ${name}, a hot-food takeaway and restaurant (chicken, burgers, doner, pizza), in-house plus Uber Eats and Deliveroo.`);
  if (Y && Y.ytd) L.push(`Till, year to date to ${Y.to}: takings ${gbp(Y.ytd.cur.total)} against ${gbp(Y.ytd.prev.total)} last year (${Y.ytd.total >= 0 ? '+' : ''}${Number(Y.ytd.total).toFixed(1)}%), like for like.`);
  if (Y && Y.lastMonth) L.push(`Till, last full month ${Y.lastMonth.month}: ${gbp(Y.lastMonth.cur.total)} (${Number(Y.lastMonth.total).toFixed(1)}% on the same month last year).`);
  if (dv && dv.available) {
    const yr = dv.to.slice(0, 4), ly = String(+yr - 1), sum = (yy, ch) => dv.days.filter(e => e.d.startsWith(yy) && e.d.slice(5) <= dv.to.slice(5) && !(dv.partial || []).includes(e.d)).reduce((n, e) => n + (e.ch[ch] || [0])[0], 0);
    for (const ch of dv.channels) { const c = sum(yr, ch), p = sum(ly, ch); L.push(`Delivery ${ch}, 1 Jan to ${dv.to}: ${gbp(c)}${p ? ` against ${gbp(p)} last year (${pct(c, p)})` : ` (new since ${dv.launch[ch]})`}.`); }
  }
  for (const s of (dv && dv.items) || []) { const top = s.top.slice(0, 6).map(x => `${x.n} ${gbp(x.r)} (${x.u} sold)`).join('; '); L.push(`Item sales ${s.ch} ${s.from} to ${s.to}: ${gbp(s.revenue)} over ${s.rows} items. Top: ${top}.`); }
  const ue = (dv && dv.items || []).filter(s => s.ch === 'Uber Eats').sort((p, q) => (p.from < q.from ? -1 : 1));
  if (ue.length >= 2) {
    const [p, c] = ue.slice(-2), P = new Map(p.top.map(x => [x.n, x])), moves = c.top.filter(x => P.has(x.n)).map(x => ({ n: x.n, d: x.r - P.get(x.n).r, u: pct(x.u, P.get(x.n).u), pr: pct(x.r / x.u, P.get(x.n).r / P.get(x.n).u) })).sort((m, n) => m.d - n.d);
    L.push(`Uber Eats dishes, ${c.from.slice(0, 4)} against ${p.from.slice(0, 4)} on the same dates, biggest falls: ${moves.slice(0, 5).map(m => `${m.n} ${gbp(m.d)} (units ${m.u}, price ${m.pr})`).join('; ')}. Biggest rises: ${moves.slice(-3).reverse().map(m => `${m.n} +${gbp(m.d)} (units ${m.u})`).join('; ')}.`);
  }
  if (y) {
    const tp = y.months.slice(-12), lp = y.months.slice(-24, -12), s = (l, k) => l.reduce((n, m) => n + (m[k] || 0), 0);
    L.push(`Uber Eats monthly accuracy report, ${y.from} to ${y.to}: ${s(tp, 'inaccurate')} inaccurate-order reports against ${s(tp, 'orders') || 'n/a'} orders (${r2(s(tp, 'inaccurate'), s(tp, 'orders'))} per 100; this report counts higher than Uber's own 84-day inaccurate rate, so use it for trend, not level); the 12 months before: ${s(lp, 'inaccurate')}. Refunds the restaurant paid: ${gbp(s(tp, 'refunds'))} (the year before ${gbp(s(lp, 'refunds'))}).`);
    L.push(`Problem mix, last 12 months (orders): missing customisation ${s(tp, 'cust')}, items missing ${s(tp, 'items')}, wrong item ${s(tp, 'wrongItem')}, wrong order ${s(tp, 'wrongOrder')}, food quality ${s(tp, 'quality')}, portion too small ${s(tp, 'qty')}.`);
    L.push(`Month by month (inaccurate / orders / refunds £): ${tp.map(m => `${m.m} ${m.inaccurate}/${m.orders || '?'}/${Math.round(m.refunds || 0)}`).join(', ')}.`);
    const last3 = tp.slice(-3), same3 = lp.slice(-3);
    if (same3.length === 3) L.push(`Last three months against the same three a year earlier: inaccurate reports per 100 orders ${r2(s(last3, 'inaccurate'), s(last3, 'orders'))} against ${r2(s(same3, 'inaccurate'), s(same3, 'orders'))}; food quality ${s(last3, 'quality')} against ${s(same3, 'quality')}.`);
    L.push(`Cancelled by the shop, last 12 months: ${s(tp, 'cancelled')} (${s(tp, 'timedOut')} timed out unaccepted, ${s(tp, 'rejected')} rejected); by month: ${tp.map(m => `${m.m} ${m.cancelled || 0}`).join(', ')}.`);
    if (y.items.length) {
      L.push(`Items with the most problem reports, last 12 months (reports, rate per 100 of that item's orders, change on last year where 1.00 means doubled, main problem): ${y.items.slice(0, 12).map(x => `${x.n} ${x.k} (${x.rate ?? '?'}%, ${x.chg ?? '?'}, ${x.top})`).join('; ')}.`);
      L.push(`Highest problem rates (at least 6 reports): ${y.items.filter(x => x.k >= 6 && x.rate).sort((p, q) => q.rate - p.rate).slice(0, 6).map(x => `${x.n} ${x.rate}% (${x.k}, ${x.top})`).join('; ')}.`);
      const fast = y.items.filter(x => x.k >= 15 && x.chg >= 3).map(x => `${x.n} ${x.k} reports, change ${x.chg} (${x.top})`); if (fast.length) L.push(`Fastest-growing problems on last year: ${fast.join('; ')}.`);
      const dup = y.items.filter(x => x.listings > 1).length; if (dup) L.push(`${dup} dishes are listed on Uber Eats more than once (the Chicken Fillet Burger ${(y.items.find(x => /Chicken Fillet Burger/.test(x.n)) || {}).listings || '?'} times).`);
    }
    const h = y.heat, o = h.orders;
    if (o && (h.inaccurate || h.quality)) {
      const cells = []; for (let d = 0; d < 7; d++) for (let hr = 0; hr < 24; hr++) { const n = o[d][hr], p = ((h.inaccurate || [])[d] || [])[hr] + ((h.quality || [])[d] || [])[hr]; if (n >= 150) cells.push({ d, hr, n, p, r: p / n * 100 }); }
      const worst = cells.sort((p, q) => q.r - p.r).slice(0, 5).map(c => `${DAYS[c.d]} ${c.hr}:00 ${c.r.toFixed(1)}% (${c.p} of ${c.n})`), all = cells.reduce((n, c) => n + c.p, 0) / cells.reduce((n, c) => n + c.n, 0) * 100;
      L.push(`Inaccurate or poor-quality orders by weekday and hour, last 12 months, worst hours with at least 150 orders: ${worst.join('; ')}; the average across those hours ${all.toFixed(2)}%.`);
    }
    if (h.timedOut) { const t = []; h.timedOut.forEach((r, d) => r.forEach((v, hr) => { if (v >= 3) t.push(`${DAYS[d]} ${hr}:00 ${v}`); })); if (t.length) L.push(`Orders that timed out unaccepted, clusters: ${t.join('; ')}.`); }
    if (h.offline) { let tot = 0; const t = []; h.offline.forEach((r, d) => r.forEach((v, hr) => { tot += v; if (v >= 30 && hr >= 11) t.push(`${DAYS[d]} ${hr}:00 ${v} min`); })); L.push(`Offline while open, last 12 months: ${Math.round(tot)} minutes; the worst open hours: ${t.slice(0, 6).join('; ') || 'none over 30 min'}.`); }
  }
  const sc = a && a.scorecard;
  if (sc && sc.success) {
    const s = sc.success, unlock = s.benefits.filter(b => b.from === s.next || (b.values && b.values[s.next] && b.values[s.tier] !== b.values[s.next])).map(b => b.name + (b.values && b.values[s.next] ? ` (${b.values[s.tier] || 'none'} → ${b.values[s.next]})` : ''));
    L.push(`Uber Eats success score, read ${sc.readOn}: tier ${s.tier}, next ${s.next}. ${s.metrics.map(m => `${m.name} ${m.current} (goal ${m.goal}${m.met === false ? ', NOT MET' : ''})`).join('; ')}. Operational excellence parts over ${s.window}: ${s.operational.map(o => `${o.name} ${o.current}% (goal under ${o.goal}%, impact ${o.impact}${o.current >= o.goal ? ', NOT MET' : ''})`).join('; ')}. Reaching ${s.next} unlocks: ${unlock.join('; ')}.`);
  }
  if (sc && sc.benchmark) L.push(`Uber Eats market benchmark, ${sc.benchmark.periods.w12} (this shop / market average / difference): ${sc.benchmark.rows.map(r => `${r.name} ${r.w12[0]} / ${r.w12[1]}${r.w12[2] == null ? '' : ` / ${r.w12[2] > 0 ? '+' : ''}${r.w12[2]}%`}`).join('; ')}.`);
  if (a && a.weeks && a.weeks.length) {
    const w = a.weeks.filter(x => x.orders), last = w[w.length - 1];
    L.push(`Uber Eats, last 12 weeks ${a.from} to ${a.to}: ${a.inaccurate} inaccurate of ${a.orders} (${r2(a.inaccurate, a.orders)}); ${gbp(a.chargeback)} charged back; sides, drinks and sauces were ${a.kinds.side} of ${a.kinds.side + a.kinds.main} missing or wrong items. Last full week ${last ? `${last.w}: ${last.inaccurate} of ${last.orders} (${r2(last.inaccurate, last.orders)})` : 'n/a'}.`);
    if (a.ordersByHour) { const sl = [[12, 16, '12-5pm'], [17, 19, '5-8pm'], [20, 21, '8-10pm'], [22, 23, '10pm-midnight']].map(([f, t, l]) => { let o = 0, e = 0; for (let h = f; h <= t; h++) { o += a.ordersByHour[h]; e += a.hours[h]; } return `${l} ${r2(e, o)}`; }); L.push(`Inaccurate rate by time of day, last 12 weeks: ${sl.join(', ')}.`); }
  }
  return L.join('\n');
}

export function prompt(name, ev, history) {
  const system = `You are the operations analyst for WRW Hospitality, a multi-site operations consultancy, advising ${name}. From the evidence pack you pick ONE issue for the restaurant to fix over the coming month and turn it into an action the owner can run with the team, starting this week.
How to choose: the issue that is frequent, costly or rising, that customers feel, and that a month of focused work can move (an SOP, retraining, a check at the pass, a menu or packaging change). Prefer a specific dish, station or hour over a general theme. Name one runner-up.
Rules: use only numbers that are in the evidence pack, quoted exactly with their period; never invent a figure, a cause you cannot see, a supplier or a name. Where the cause is not in the data, say what to check to find it. If the last fix is given and its issue has not clearly improved in the new data, you may keep it for a second month and say why. British English, plain and short.
Reply with JSON only: {"title": "the fix in under 70 characters, starting with a verb", "issue": "one sentence: what is going wrong", "why": ["three or four facts from the pack, each with its number"], "actions": ["three to five steps, concrete: who does what, where, when, starting this week"], "owner": "who leads it (the owner, the kitchen lead, the shift manager on the pass)", "measure": "what to look at when next month's data is in, and the number that says it worked", "runnerUp": "the second issue, one sentence"}`;
  const user = `EVIDENCE PACK (${new Date().toLocaleDateString('en-GB')})\n${ev}\n\n${history.length ? 'EARLIER FIXES (newest last):\n' + history.slice(-3).map(h => `- written ${h.week}: ${h.fix.title}. Measure: ${h.fix.measure}`).join('\n') : 'No earlier fixes.'}`;
  return { system, user };
}

export function parse(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/); if (!m) throw new Error('the analysis did not come back as JSON');
  const j = JSON.parse(m[0]), arr = v => (Array.isArray(v) ? v : [v]).filter(Boolean).map(String).slice(0, 6);
  if (!j.title || !j.actions) throw new Error('the analysis has no title or actions');
  return { title: String(j.title).slice(0, 120), issue: String(j.issue || ''), why: arr(j.why), actions: arr(j.actions), owner: String(j.owner || ''), measure: String(j.measure || ''), runnerUp: String(j.runnerUp || '') };
}

// write a fix for this week (or again, on request), keeping the earlier weeks
export async function make(dataDir, id, name, data, ask) {
  const all = load(dataDir), history = all[id] || [], ev = evidence(name, data);
  const { system, user } = prompt(name, ev, history.filter(h => h.evidence !== ev));
  const fix = parse(await ask(system, user));
  const entry = { week: new Date().toLocaleDateString('en-CA'), at: Date.now(), fix, evidence: ev };
  all[id] = [...history.filter(h => h.evidence !== ev), entry].slice(-24); // asking again on the same data replaces that fix
  save(dataDir, all);
  return entry;
}
export function markMatrix(dataDir, id, itemId) { const all = load(dataDir), e = (all[id] || []).slice(-1)[0]; if (e) { e.matrix = itemId; save(dataDir, all); } }
