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

// Six weeks ahead (21 Nov 2026): every post on the calendar from this Monday for six weeks, by workstream and week, each at its stage.
// A week counts as planned when every workstream that has a post this week has at least one in it too; the goal is all six planned.
export const STAGES = ['planned', 'needs', 'working', 'built', 'scheduled', 'posted'];
export function board({ posts, done = {}, social = { tasks: {}, signed: {} }, tasks = [], today = Date.now(), weeks = 6 }) {
  const from = mondayOf(today), byId = new Map(tasks.map(t => [t.id, t])), todayYmd = ymd(new Date(today));
  const starts = [...Array(weeks)].map((_, i) => { const d = new Date(from + 'T12:00:00'); d.setDate(d.getDate() + 7 * i); return ymd(d); });
  const end = (() => { const d = new Date(starts[weeks - 1] + 'T12:00:00'); d.setDate(d.getDate() + 7); return ymd(d); })();
  const weekOf = date => starts.filter(s => s <= date).pop();
  const stageOf = p => {
    const key = keyOf(p), st = p.status || '', t = byId.get(social.tasks[key]);
    if (done[key] || /posted/.test(st)) return 'posted';
    if (/scheduled/.test(st)) return 'scheduled';
    if (social.signed[key] || (/built|approved|drafted|ready/.test(st) && !/not drafted/.test(st))) return 'built';
    if (t && ['next', 'doing', 'scheduled', 'waiting'].includes(t.state)) return 'working';
    if (/needs/.test(st)) return 'needs';
    return 'planned';
  };
  const mine = posts.filter(p => p.date >= from && p.date < end).map(p => {
    const stage = stageOf(p);
    return { key: keyOf(p), date: p.date, time: p.time || '', where: p.where, format: p.format, idea: p.idea || '', stage, late: p.date < todayYmd && !['posted', 'scheduled'].includes(stage), week: weekOf(p.date) };
  });
  const active = new Set(mine.filter(p => p.week === from).map(p => p.where)); // the workstreams running this week
  const wk = starts.map(s => {
    const ps = mine.filter(p => p.week === s), by = Object.fromEntries(STAGES.map(k => [k, ps.filter(p => p.stage === k).length]));
    const missing = [...active].filter(w => !ps.some(p => p.where === w));
    return { from: s, posts: ps.length, stages: by, late: ps.filter(p => p.late).length, planned: ps.length > 0 && !missing.length, missing };
  });
  let ahead = 0; for (const w of wk) { if (!w.planned) break; ahead++; } // weeks planned in a row from this one
  const gap = wk.find(w => !w.planned);
  return {
    from, target: weeks, ahead, nextGap: gap ? gap.from : null, weeks: wk,
    streams: [...STREAMS, ...[...new Set(mine.map(p => p.where))].filter(w => !STREAMS.some(s => s.id === w)).map(w => ({ id: w, name: w, sub: '', colour: '#8f8f8f' }))] // a calendar `where` with no Social card still gets a row
      .filter(s => mine.some(p => p.where === s.id)).map(s => ({ id: s.id, name: s.name, sub: s.sub, colour: s.colour, cells: starts.map(w => mine.filter(p => p.where === s.id && p.week === w)) })),
  };
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
