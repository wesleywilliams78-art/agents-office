// Google Calendar, read-only (V3.12, 3 Nov 2026): Wesley's own calendars beside the office's work on /aios and in the office calendar (P).
// Each calendar's private feed ("Secret address in iCal format") is listed in office.config.local.json under aios.calendars:
//   "calendars": [{ "name": "Wesley", "ics": "https://calendar.google.com/calendar/ical/…/private-…/basic.ics", "colour": "#4285F4" }]
// The office downloads each feed every five minutes, reads the events (repeating ones expanded: daily, weekly, monthly, yearly with
// INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, EXDATE and moved or cancelled single instances) and keeps the six weeks either side of
// today in data/gcal.json. No model and no login is involved. The feed addresses are secrets: they stay in the local config file and
// are never sent to the page.
import fs from 'node:fs';
import path from 'node:path';

const DAY = 86400000;
const file = dataDir => path.join(dataDir, 'gcal.json');
export const load = dataDir => { try { return JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); } catch { return { events: [], calendars: [] }; } };

// ---- the iCalendar text: unfold lines, read properties with their parameters
function props(text) {
  const lines = String(text || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/), out = [];
  for (const l of lines) {
    const i = l.indexOf(':'); if (i < 0) continue;
    const [name, ...ps] = l.slice(0, i).split(';'), params = {};
    for (const p of ps) { const j = p.indexOf('='); if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1).replace(/^"|"$/g, ''); }
    out.push({ name: name.toUpperCase(), params, value: l.slice(i + 1) });
  }
  return out;
}
const unescape = s => String(s || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

// a wall-clock time in a named zone → epoch ms (two passes of the zone's offset, right across clock changes)
function zoned(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  if (!tz) return new Date(y, mo - 1, d, h, mi, s).getTime(); // floating time: this PC's clock
  const off = t => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t; };
  try { let t = guess - off(guess); t = guess - off(t); return t; } catch { return new Date(y, mo - 1, d, h, mi, s).getTime(); }
}
// a DTSTART / DTEND / EXDATE / RECURRENCE-ID value → { t, allDay }
export function when(value, params = {}) {
  const v = String(value || '').trim(), m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v); if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || params.VALUE === 'DATE') return { t: new Date(+y, +mo - 1, +d).getTime(), allDay: true };
  if (z) return { t: Date.UTC(+y, +mo - 1, +d, +h, +mi, +s), allDay: false };
  return { t: zoned(+y, +mo, +d, +h, +mi, +s, params.TZID), allDay: false };
}

// the events of one feed: [{ uid, title, location, start, end, allDay, rrule, exdates, recurId, cancelled }]
export function parse(text) {
  const out = []; let cur = null;
  for (const p of props(text)) {
    if (p.name === 'BEGIN' && p.value === 'VEVENT') { cur = { exdates: [] }; continue; }
    if (p.name === 'END' && p.value === 'VEVENT') { if (cur && cur.start) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (p.name === 'UID') cur.uid = p.value;
    else if (p.name === 'SUMMARY') cur.title = unescape(p.value);
    else if (p.name === 'LOCATION') cur.location = unescape(p.value);
    else if (p.name === 'STATUS') cur.cancelled = /CANCELLED/i.test(p.value);
    else if (p.name === 'TRANSP') cur.free = /TRANSPARENT/i.test(p.value);
    else if (p.name === 'DTSTART') { const w = when(p.value, p.params); if (w) { cur.start = w.t; cur.allDay = w.allDay; cur.tz = p.params.TZID || ''; cur.raw = p.value; } }
    else if (p.name === 'DTEND') { const w = when(p.value, p.params); if (w) cur.end = w.t; }
    else if (p.name === 'DURATION') cur.duration = p.value;
    else if (p.name === 'RRULE') cur.rrule = Object.fromEntries(p.value.split(';').map(x => x.split('=')).map(([k, v]) => [k.toUpperCase(), v]));
    else if (p.name === 'EXDATE') for (const v of p.value.split(',')) { const w = when(v, p.params); if (w) cur.exdates.push(w.t); }
    else if (p.name === 'RECURRENCE-ID') { const w = when(p.value, p.params); if (w) cur.recurId = w.t; }
  }
  for (const e of out) {
    if (!e.end) { const d = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(e.duration || ''); e.end = e.start + (d ? ((+d[1] || 0) * DAY + (+d[2] || 0) * 3600000 + (+d[3] || 0) * 60000) : e.allDay ? DAY : 0); }
  }
  return out;
}

// ---- repeating events: every start between from and to (local wall-clock arithmetic, so a weekly 9am stays 9am across clock changes)
const BYDAY = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };
export function expand(e, from, to, cap = 1500) {
  if (!e.rrule) return e.start < to && e.end > from ? [e.start] : [];
  const r = e.rrule, freq = r.FREQ, step = Math.max(1, +r.INTERVAL || 1), count = +r.COUNT || 0;
  const until = r.UNTIL ? (when(r.UNTIL, /T/.test(r.UNTIL) ? {} : { VALUE: 'DATE' }) || {}).t + (/T/.test(r.UNTIL) ? 0 : DAY - 1) : Infinity;
  const utc = !e.allDay && !e.tz && /Z$/.test(e.raw || ''); // a start in UTC repeats in UTC; one with a zone (or a date) on the local clock
  const mk = (y, m, d, h = 0, mi = 0) => utc ? Date.UTC(y, m, d, h, mi) : new Date(y, m, d, h, mi).getTime();
  const P = t => { const x = new Date(t); return utc ? { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), wd: x.getUTCDay(), h: x.getUTCHours(), mi: x.getUTCMinutes() } : { y: x.getFullYear(), m: x.getMonth(), d: x.getDate(), wd: x.getDay(), h: x.getHours(), mi: x.getMinutes() }; };
  const s = P(e.start), H = s.h, Mi = s.mi, dur = e.end - e.start;
  const at = (y, m, d) => mk(y, m, d, H, Mi), dim = (y, m) => P(mk(y, m + 1, 0)).d, wdOf = (y, m, d) => P(mk(y, m, d)).wd;
  const days = r.BYDAY ? r.BYDAY.split(',').map(x => { const m = /^([+-]?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/.exec(x); return m ? { n: m[1] ? +m[1] : 0, wd: BYDAY[m[2]] } : null; }).filter(Boolean) : [];
  const monthDays = r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : [];
  const exKey = t => { const p = P(t); return [p.y, p.m, p.d].join('-') + (e.allDay ? '' : ' ' + p.h + ':' + p.mi); }, ex = new Set(e.exdates.map(exKey));
  const out = []; let n = 0;
  const take = t => { if (t < e.start) return true; if (t > until || (count && n >= count)) return false; n++; if (!ex.has(exKey(t)) && t < to && t + dur > from) out.push(t); return out.length < cap; };
  // the dates in one period (a week, a month, a year) that the rule picks, in order
  const nthOf = (y, m, wd, k) => { if (k > 0) { const f = wdOf(y, m, 1); const d = 1 + ((wd - f + 7) % 7) + (k - 1) * 7; return d <= dim(y, m) ? d : null; } const last = dim(y, m), l = wdOf(y, m, last); const d = last - ((l - wd + 7) % 7) + (k + 1) * 7; return d >= 1 ? d : null; };
  const monthDates = (y, m) => {
    const len = dim(y, m); let ds = [];
    if (monthDays.length) ds = monthDays.map(d => (d < 0 ? len + d + 1 : d)).filter(d => d >= 1 && d <= len);
    else if (days.length) for (const b of days) { if (b.n) { const d = nthOf(y, m, b.wd, b.n); if (d) ds.push(d); } else for (let d = 1; d <= len; d++) if (wdOf(y, m, d) === b.wd) ds.push(d); }
    else if (s.d <= len) ds = [s.d];
    return [...new Set(ds)].sort((a, b) => a - b).map(d => at(y, m, d));
  };
  const stopAt = Math.min(until, to);
  if (freq === 'DAILY') { for (let i = 0; ; i += step) { const d = mk(s.y, s.m, s.d + i, H, Mi); if (d > stopAt && !count) break; if (days.length && !days.some(b => b.wd === P(d).wd)) continue; if (!take(d) || d > stopAt) break; } }
  else if (freq === 'WEEKLY') {
    const wds = days.length ? days.map(b => b.wd) : [s.wd], wk0 = s.d - ((s.wd + 6) % 7);
    outer: for (let w = 0; ; w += step) {
      const mon = mk(s.y, s.m, wk0 + w * 7);
      const list = wds.map(wd => mk(s.y, s.m, wk0 + w * 7 + ((wd + 6) % 7), H, Mi)).sort((a, b) => a - b);
      for (const d of list) { if (d > stopAt && !count) break outer; if (!take(d) || d > stopAt) break outer; }
      if (mon > stopAt) break;
    }
  } else if (freq === 'MONTHLY') { for (let i = 0; ; i += step) { const first = mk(s.y, s.m + i, 1), fp = P(first); if (first > stopAt) break; let stop = false; for (const d of monthDates(fp.y, fp.m)) { if (!take(d) || d > stopAt) { stop = true; break; } } if (stop) break; } }
  else if (freq === 'YEARLY') { for (let i = 0; ; i += step) { const y = s.y + i; if (mk(y, 0, 1) > stopAt) break; const ms = r.BYMONTH ? r.BYMONTH.split(',').map(x => +x - 1) : [s.m]; let stop = false; for (const m of ms) for (const d of (days.length || monthDays.length ? monthDates(y, m) : [at(y, m, s.d)])) { if (!take(d) || d > stopAt) { stop = true; break; } } if (stop) break; } }
  else if (e.start < to && e.end > from) out.push(e.start);
  return out;
}

// every event instance of one feed between from and to: moved single instances replace their slot, cancelled ones remove it
export function instances(events, from, to, cal) {
  const moved = new Map(), out = [];
  for (const e of events) if (e.recurId) moved.set(e.uid + '|' + e.recurId, e);
  for (const e of events) {
    if (e.recurId) continue;
    for (const t of expand(e, from, to)) {
      const m = moved.get(e.uid + '|' + t), src = m || e, start = m ? m.start : t, end = m ? m.end : t + (e.end - e.start);
      if (src.cancelled || start >= to || end <= from) continue;
      out.push({ id: (cal ? cal.name + ':' : '') + e.uid + '|' + start, cal: cal ? cal.name : '', colour: cal ? cal.colour || '' : '', title: src.title || '(busy)', location: src.location || '', start, end, allDay: !!src.allDay, free: !!src.free });
    }
  }
  // a moved instance whose original slot falls outside the window can still land inside it
  for (const m of moved.values()) if (!m.cancelled && m.start < to && m.end > from && !out.some(x => x.id === (cal ? cal.name + ':' : '') + m.uid + '|' + m.start)) out.push({ id: (cal ? cal.name + ':' : '') + m.uid + '|' + m.start, cal: cal ? cal.name : '', colour: cal ? cal.colour || '' : '', title: m.title || '(busy)', location: m.location || '', start: m.start, end: m.end, allDay: !!m.allDay, free: !!m.free });
  return out.sort((a, b) => a.start - b.start);
}

// download every feed and keep six weeks either side of today; a feed that fails keeps its last good events
export async function sync(dataDir, calendars, { now = Date.now(), fetchFn = fetch } = {}) {
  const prev = load(dataDir), from = now - 42 * DAY, to = now + 42 * DAY, events = [], status = [];
  for (const c of calendars || []) {
    if (!c || !c.name || !/^https:\/\//.test(c.ics || '')) { status.push({ name: c && c.name || '?', ok: false, error: 'no https feed address' }); continue; }
    try {
      const r = await fetchFn(c.ics, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text(); if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('not a calendar feed');
      const list = instances(parse(text), from, to, c); events.push(...list); status.push({ name: c.name, colour: c.colour || '', ok: true, events: list.length, at: now });
    } catch (e) {
      const old = (prev.events || []).filter(x => x.cal === c.name); events.push(...old);
      status.push({ name: c.name, colour: c.colour || '', ok: false, error: e.message, events: old.length, at: (prev.calendars || []).find(x => x.name === c.name)?.at || 0 });
    }
  }
  const out = { at: now, from, to, calendars: status, events: events.sort((a, b) => a.start - b.start) };
  fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(out));
  return out;
}
