// Meeting agendas (Wesley, 8 Nov 2026): every meeting on his Google Calendar collects agenda points from what the office already
// knows, Esme (elead) writes the one-page agenda Doc the day before, and 15 minutes before it starts a Telegram message brings him
// "Here is your agenda for <meeting>", or "No agenda to prepare for this meeting." Telegram, because the office never sends email.
// Signals: matrix cards he answered with "agenda" that name the meeting, open matrix cards about it due by that day, office tasks
// that name it and "agenda" (their Google Doc link is the agenda), and tracker rows due by that day for its client or person.
// State (what was sent, which prep task) lives in data/agendas.json.
import fs from 'node:fs';
import path from 'node:path';
import { parseDate } from './trackers.mjs';

const MIN = 60000, DAY = 86400000;
export const LEAD = 15 * MIN;      // the message goes 15 minutes before the start
export const PREP = 24 * 3600000;  // Esme writes the Doc from 24 hours before
const file = dataDir => path.join(dataDir, 'agendas.json');
export const loadState = dataDir => { try { return JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); } catch { return { sent: {}, prep: {} }; } };
export const saveState = (dataDir, s) => { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(s, null, 2)); };

// What counts as a meeting: a timed, busy entry of 15 minutes or more that has someone else invited, a call link, or a title that
// reads like a meeting. Reminders (short), focus blocks, chores and deadlines are not meetings.
const MEET = /\b(meeting|meet|call|check[- ]?in|catch[- ]?up|sync|1[:-]1|one[- ]to[- ]one|interview|intro(duction)?|demo|workshop|panel|webinar|review|sign[- ]?off|session|visit|hearing|consult(ation)?|dinner|lunch with|breakfast with|coffee with|presentation|pitch|kick[- ]?off|standup|stand[- ]up|onboarding|training)\b|\b\w+ x \w+/i;
const NOT = /\b(focus|deep work|block(ed)?|gym|commute|travel|reminder|pay|due|deadline|post |hold)\b/i;
export function meetingWhy(e) {
  if (!e || e.allDay || e.free || e.end - e.start < 15 * MIN) return '';
  if ((e.guests || 0) >= 2) return 'others are invited';
  if (e.link) return 'it has a call link';
  if (NOT.test(e.title || '')) return '';
  return MEET.test(e.title || '') ? 'the title reads like a meeting' : '';
}

// the names a meeting is known by: the capitalised words of its title that are not meeting words ("Wesley x Yousif - Weekly Check In" → yousif)
const STOP = new Set('wesley wes weekly week check in call with and the a of for meeting meet catch up sync intro introduction demo review sign off session visit panel webinar monthly daily fortnightly x co ltd usa uk project hq coffee dinner lunch breakfast'.split(' '));
export const keys = title => [...new Set(String(title || '').replace(/['’]s\b/g, '').split(/[^A-Za-z]+/).filter(w => /^[A-Z]/.test(w) && w.length >= 3).map(w => w.toLowerCase()).filter(w => !STOP.has(w)))];
const names = (text, ks) => { const t = String(text || '').toLowerCase(); return ks.some(k => new RegExp('\\b' + k + '\\b').test(t)); };
const docLink = s => (/https:\/\/docs\.google\.com\/document\/d\/[\w-]+[^\s)\]"'<>]*/.exec(String(s || '')) || [''])[0];
const dayEnd = t => { const d = new Date(t); d.setHours(23, 59, 59, 999); return d.getTime(); };
const isoDay = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// the agenda points for one meeting: [{ text, from }] (at most 8) and the Doc link if a task already wrote one
export function collect(m, { events = [], matrix = [], tasks = [], trackers = {} } = {}) {
  // the same day's other meetings: a name they share is dropped when this one has a name of its own (the Penny and Yousif call is about
  // Penny, not Yousif's weekly items), and a point that names one of their own names belongs to them, not here
  const sameDay = events.filter(e => e.id !== m.id && isoDay(e.start) === isoDay(m.start) && meetingWhy(e)).map(e => keys(e.title));
  let ks = keys(m.title); const own = ks.filter(k => !sameDay.some(o => o.includes(k))); if (own.length) ks = own;
  const others = [...new Set(sameDay.flat())].filter(k => !keys(m.title).includes(k));
  if (!ks.length) return { points: [], link: '', keys: ks };
  // since the last time this meeting (same title) took place, or the last two weeks
  const prev = events.filter(e => e.title === m.title && e.start < m.start).reduce((a, e) => Math.max(a, e.start), 0) || m.start - 14 * DAY;
  const until = isoDay(m.start), points = [], seen = new Set();
  const add = (text, from) => { if (others.length && names(text, others)) return; const k = String(text).toLowerCase().slice(0, 60); if (!seen.has(k)) { seen.add(k); points.push({ text: String(text).trim(), from }); } };
  for (const it of matrix) { // his own answers that put a card on the agenda
    const when = it.doneAt || it.sentAt || 0;
    if (/agenda/i.test(it.outcome || '') && when > prev && when <= m.start && names(`${it.title} ${it.outcome} ${it.detail}`, ks)) add(it.title, 'your answer on the matrix');
  }
  for (const it of matrix) if (it.state === 'open' && it.due && it.due <= until && names(it.title, ks)) add(it.title, 'open on the matrix, due ' + it.due);
  let link = '';
  for (const t of tasks) { // office tasks that name the meeting and its agenda; a finished one's Google Doc is the agenda
    if (!(t.addedAt > prev && t.addedAt <= m.start) || !/agenda/i.test(t.title || '') || !names(t.title, ks) || (others.length && names(t.title, others))) continue;
    link = docLink(t.result) || docLink(t.draft) || link;
  }
  const client = Object.keys(trackers).find(c => ks.includes(c.toLowerCase()));
  for (const [c, tr] of Object.entries(trackers)) for (const r of tr.rows || []) {
    if (/complete|done|cancel/i.test(r.status || '')) continue;
    const d = parseDate(r.target); if (!d || d.toISOString().slice(0, 10) > until) continue;
    if (c === client || names(r.owner, ks)) add(`${r.action.length > 110 ? r.action.slice(0, 107) + '…' : r.action} (${tr.name || c} row ${r.id}, ${r.owner || 'no owner'}, due ${d.toISOString().slice(0, 10)})`, 'tracker');
  }
  return { points: points.slice(0, 8), link, keys: ks };
}

const hhmm = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// the 15-minute message
export function message(m, { points, link }) {
  const head = `${m.title}, ${hhmm(m.start)}`;
  if (!points.length && !link) return `${head}\nNo agenda to prepare for this meeting.`;
  return [`Here is your agenda for ${head}`, ...(link ? [link] : []), ...points.map((p, i) => `${i + 1}. ${p.text}`), '', 'Aim: a decision, an owner and a date on each point.'].join('\n');
}
// the task Esme gets the day before a meeting with points
export function prepText(m, { points }) {
  return [`Write the one-page agenda for "${m.title}" on ${new Date(m.start).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}, as a Google Doc in My Drive, and put its link in your result.`,
    'Keep it short and outcome-focused: each point says the decision needed, who owns it and by when. No figures of your own on money points. Do not send it to anyone.',
    'The points the office has collected:', ...points.map((p, i) => `${i + 1}. ${p.text} (${p.from})`)].join('\n');
}

// what to do now: meetings to message (start within 15 minutes, not sent) and meetings to prepare (within 24 hours, points, no prep yet)
export function due(events, state, now = Date.now()) {
  const send = [], prep = [];
  for (const e of events) {
    if (!meetingWhy(e)) continue;
    if (e.start - LEAD <= now && now < e.start && !state.sent[e.id]) send.push(e);
    else if (e.start - PREP <= now && now < e.start - LEAD && (!state.prep[e.id] || (state.prep[e.id].none && now - state.prep[e.id].none > 3600000))) prep.push(e); // no points yet: look again hourly
  }
  return { send, prep };
}
