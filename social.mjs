// The AIOS Social section (Wesley, 3 Nov 2026): one card per workstream (each Instagram account, each LinkedIn voice, the newsletter)
// holding only its NEXT post from the content calendar. Wesley hands it to the Chief of Staff, the office prepares it, the card finds
// where the result lives, he signs it off, opens it, posts it himself and ticks it posted; then the card moves on to the next one.
//   streams({ posts, done, social, tasks, today })  the cards
//   handText(stream, post)                         what the office is asked to do
//   places(text)                                    file paths and links named in a result
// State lives in data/social.json: { tasks: { postKey: taskId }, signed: { postKey: ms } }. "Posted" is the calendar's own tick
// (data/calendar-done.json), so ticking it here or in the calendar is the same thing.
import fs from 'node:fs';
import path from 'node:path';

export const STREAMS = [ // calendar `where` → the card
  { id: 'Instagram', name: 'WRW Hospitality', sub: 'Instagram', colour: '#C13584' },
  { id: 'Art of Operations', name: 'The Art of Operations', sub: 'Instagram', colour: '#EC3013' },
  { id: 'Tales of Nirn', name: 'Tales of Nirn', sub: 'Instagram', colour: '#B07A2A' },
  { id: 'Collab LinkedIn', name: 'WRW Hospitality + Wesley', sub: 'LinkedIn, collaborative', colour: '#7A5CC8' },
  { id: 'Wesley LinkedIn', name: 'Wesley', sub: 'LinkedIn, personal', colour: '#16908F' },
  { id: 'WRW page LinkedIn', name: 'WRW Hospitality page', sub: 'LinkedIn', colour: '#0A66C2' },
  { id: 'Newsletter', name: 'Scaling Without Borders', sub: 'LinkedIn newsletter', colour: '#B4830B' },
];
export const keyOf = p => 'p|' + p.date + '|' + (p.time || '') + '|' + p.where + '|' + p.format; // the calendar's tick key (src/calendar.js postKey)

const FILE = dir => path.join(dir, 'social.json');
export function load(dir) { try { const s = JSON.parse(fs.readFileSync(FILE(dir), 'utf8')); return { tasks: s.tasks || {}, signed: s.signed || {} }; } catch { return { tasks: {}, signed: {} }; } }
export function save(dir, s) { fs.writeFileSync(FILE(dir), JSON.stringify(s, null, 1)); }

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = now => { const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); };
const gone = p => /posted|scheduled/.test(p.status || ''); // Wesley has already put it out (or queued it in the app)
const looksLikePath = s => /[\\/]/.test(s) && !/^needs/i.test(s) && !/^none$/i.test(s);

/** File paths and web links named in a piece of text (a task's result, a calendar row's Files cell). */
export function places(text) {
  const s = String(text || ''), out = new Set();
  for (const m of s.matchAll(/https?:\/\/[^\s)>\]"'`|]+/g)) out.add(m[0].replace(/[.,;:]+$/, ''));
  for (const m of s.matchAll(/(?:[A-Za-z]:[\\/]|(?:output|videos|sites|Content Calendar|connectors)[\\/])[^\n`"'|<>*?]*?\.(?:mp4|mov|png|jpe?g|webp|gif|pdf|md|txt|srt|html|zip|pptx|docx|xlsx|csv)\b/gi)) out.add(m[0].trim());
  return [...out].slice(0, 8);
}

/** One card per workstream: its next post (this week's overdue ones first), and where that post stands. */
export function streams({ posts, done = {}, social = { tasks: {}, signed: {} }, tasks = [], today = Date.now() }) {
  const from = mondayOf(today), byId = new Map(tasks.map(t => [t.id, t]));
  return STREAMS.filter(s => posts.some(p => p.where === s.id)).map(s => { // a workstream the calendar never uses gets no card
    const mine = posts.filter(p => p.where === s.id && p.date >= from && !gone(p) && !done[keyOf(p)]);
    const p = mine[0]; if (!p) return { ...s, post: null };
    const key = keyOf(p), t = byId.get(social.tasks[key]), signedAt = social.signed[key] || null;
    const files = String(p.files || '').split(/\s*;\s*|\s+\((?![^()]*\)\.[A-Za-z0-9]{2,5}\b)/).map(x => x.trim()).filter(looksLikePath); // " (note)" ends a path; "(no audio).mp4" is part of one
    const found = [...new Set([...(p.folder ? [p.folder] : []), ...files, ...places(t && t.result)])];
    const ready = /built|approved|drafted|ready/.test(p.status || '') && !/not drafted/.test(p.status || ''); // "planned, not drafted yet" is not ready
    const state = t && ['next', 'doing', 'scheduled'].includes(t.state) ? 'working'
      : t && t.state === 'waiting' ? 'review'
      : signedAt ? 'signed'
      : t && t.state === 'done' ? 'check'
      : ready ? 'ready'
      : /needs/.test(p.status || '') ? 'needs' : 'handoff';
    return { ...s, key, state, signedAt, post: p, places: found, later: mine.length - 1,
      task: t ? { id: t.id, state: t.state, title: t.title, agent: t.agent, team: !!t.team, doneAt: t.doneAt || null } : null };
  });
}

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** What the office is asked to do for a card. Written for the Marketing department; the router picks the desk. */
export function handText(s, p) {
  const d = new Date(p.date + 'T12:00:00'), when = `${DAY[d.getDay()]} ${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}${p.time ? ' at ' + p.time : ''}`;
  return [
    `Social workstream "${s.name}" (${s.sub}): get the next post ready. It goes out ${when} on ${p.account || s.name}, ${p.channel || s.sub}.`,
    `Format: ${p.format}.`, p.idea ? `Brief: ${p.idea}` : '', p.owner ? `Calendar owner: ${p.owner}. Status now: ${p.status}.` : '',
    p.files && !/^none$/i.test(p.files) ? `On the calendar so far: ${p.files}` : '',
    'Follow the skills for this kind of work and the week in 20-Brand/content-calendar.md. Put anything only Wesley can supply (a photo, a clip, a download OK, a fact) at the top under NEEDS WESLEY. If Claude Code has to build it (video, footage, motion), write the full spec ready for that.',
    'End with WHERE IT IS: every file as a full path or a Drive link. Nothing is posted or scheduled.',
  ].filter(Boolean).join(' ');
}
