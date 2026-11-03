// The Chief of Staff's hands: a small, fixed set of office actions, served over MCP (stdio, no dependencies).
// It talks to the running office through its own local API. By design it can look at the office, add a task, run a routine and read
// the Brain and the Content Calendar. It can NOT approve, reject, send, post, pay, delete, restart anything, run a command or edit a
// file: those stay with Wesley, on the review cards in the office.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URLBASE = process.env.OFFICE_URL || 'http://127.0.0.1:4520';
const ROOT = process.env.OFFICE_ROOT || path.resolve(HERE, '..', '..');
const BRAIN = process.env.OFFICE_BRAIN || '';
const DEPTS = ['emails', 'sales', 'marketing', 'ops', 'fin', 'delivery'];
const MAX_ADDS = 5; let adds = 0; // one assistant turn can queue at most five tasks
const clean = t => String(t).replace(/^﻿/, '');

const api = async (p, opts = {}) => {
  const r = await fetch(URLBASE + p, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) }, signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `${p} answered ${r.status}`); return j;
};
const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 90 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
const tasksOf = async () => { const t = await api('/api/tasks'); return Array.isArray(t) ? t : t.tasks || []; };
const brief = t => ({ id: t.id, dept: t.dept, agent: t.agent, state: t.state, title: t.title, when: ago(t.doneAt || t.waitingAt || t.startedAt || t.addedAt || 0) });

const TOOLS = [
  { name: 'office_overview', description: 'The state of the office right now: tasks running, waiting for Wesley\'s OK, the next routines, the Content Calendar and the disk. Start here for "what\'s happening", "what\'s waiting", "how are we doing".', inputSchema: { type: 'object', properties: {} } },
  { name: 'office_list_tasks', description: 'Recent tasks. Filter by state (next, doing, waiting, done, scheduled) and department.', inputSchema: { type: 'object', properties: { state: { type: 'string' }, dept: { type: 'string', enum: DEPTS }, limit: { type: 'integer', description: 'Default 12, at most 40.' } } } },
  { name: 'office_get_task', description: 'One task in full: state, which desk, the result so far (the start of it), any error, and for a team task each piece\'s state. Use it to answer "how did X go" or to quote a result.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
  { name: 'office_add_task', description: 'Add a task to the office. It starts by itself and waits for Wesley\'s review like any task; nothing is sent or posted by it. Write the text as a complete instruction (what, for which brand and channel, any facts, any deadline): the desk has not seen this conversation. A Reel request in marketing goes to the Marketing Lead as a team automatically. At most five per turn. Always set model, effort and team to suit the job (see your instructions); Wesley sees them on a chip and can overrule.', inputSchema: { type: 'object', required: ['dept', 'text', 'model', 'effort', 'team'], properties: { dept: { type: 'string', enum: DEPTS }, text: { type: 'string' }, team: { type: 'boolean', description: 'true to have the department lead split it across the desks.' }, model: { type: 'string', enum: ['sonnet', 'opus', 'fable'] }, effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'] } } } },
  { name: 'office_add_routine', description: 'Put a repeating task on the timetable ("every Monday at 9", "each weekday morning"). Use it only when Wesley asks for something to repeat. Write the task as a complete instruction WITHOUT the schedule words; give the schedule as cadence and time. It runs by itself on the office clock and its result waits for his OK unless it only reads and reports (then set needs_ok false and say so).', inputSchema: { type: 'object', required: ['dept', 'text', 'cadence'], properties: { dept: { type: 'string', enum: DEPTS }, text: { type: 'string' }, cadence: { type: 'string', enum: ['weekdays', 'daily', 'hourly', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], description: 'hourly means every hour, 09:00 to 17:00, weekdays.' }, at: { type: 'string', description: 'HH:MM on the office clock, 24 hour (default 08:00). Not for hourly.' }, start: { type: 'string', description: 'Optional first date, YYYY-MM-DD.' }, needs_ok: { type: 'boolean', description: 'Default true: the result waits for Wesley before anything is sent or changed.' }, model: { type: 'string', enum: ['sonnet', 'opus', 'fable'] }, effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'] } } } },
  { name: 'office_routines', description: 'The timetable: every routine, when it next runs and whether it is paused.', inputSchema: { type: 'object', properties: {} } },
  { name: 'office_run_routine', description: 'Run a routine now instead of waiting for its time (for example content-plan, content-build, meeting-actions-tue). It waits for Wesley\'s OK like any run.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
  { name: 'office_agents', description: 'The desks: who is in each department and what each does. Use it to choose where a task should go.', inputSchema: { type: 'object', properties: { dept: { type: 'string', enum: DEPTS } } } },
  { name: 'office_content_week', description: 'The Content Calendar folder Wesley posts from. With no week: lists the weeks. With a week (YYYY-MM-DD of its Monday, or "next" or "latest"): that week\'s SCHEDULE page, the folder path and how much is drafted.', inputSchema: { type: 'object', properties: { week: { type: 'string' } } } },
  { name: 'office_brain_search', description: 'Search the Brain (Wesley\'s notes) by words. Returns the best notes with a snippet.', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } },
  { name: 'office_brain_read', description: 'Read one Brain note by name (for example brands, content-calendar, idea-bank, linkedin-voice) or by path.', inputSchema: { type: 'object', required: ['note'], properties: { note: { type: 'string' } } } },
];

const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = s => ({ isError: true, content: [{ type: 'text', text: s }] });

function walk(dir, out = [], depth = 0) {
  if (depth > 6) return out;
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out, depth + 1); else if (/\.md$/i.test(e.name)) out.push(p); }
  return out;
}

const tools = {
  async office_overview() {
    const [h, tl, rt, st] = await Promise.all([api('/api/health'), tasksOf(), api('/api/routines'), api('/api/storage').catch(() => null)]);
    const by = {}; for (const t of tl) by[t.state] = (by[t.state] || 0) + 1;
    const next = (rt.routines || []).filter(r => !r.paused && r.nextAt).sort((a, b) => a.nextAt - b.nextAt).slice(0, 4).map(r => `${r.title} (${new Date(r.nextAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})`);
    let weeks = []; try { weeks = fs.readdirSync(path.join(ROOT, 'Content Calendar'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort(); } catch {}
    return text({
      office: `v${h.version}, up`, tasksByState: by,
      waitingForWesley: tl.filter(t => t.state === 'waiting').slice(-10).map(brief), running: tl.filter(t => t.state === 'doing').map(brief),
      nextRoutines: next, contentCalendarWeeks: weeks, disk: st ? { freeGB: st.freeGB, officeMB: st.officeMB, level: st.level, warn: st.warn } : undefined,
      note: 'Approving or rejecting is done by Wesley on the review cards in the office.',
    });
  },
  async office_list_tasks(a) {
    let tl = await tasksOf(); if (a.state) tl = tl.filter(t => t.state === a.state); if (a.dept) tl = tl.filter(t => t.dept === a.dept);
    return text(tl.slice(-Math.min(40, a.limit || 12)).reverse().map(brief));
  },
  async office_get_task(a) {
    const t = (await tasksOf()).find(x => x.id === String(a.id || '')); if (!t) return fail('No such task: ' + a.id);
    return text({ ...brief(t), text: String(t.text || '').slice(0, 1200), result: String(t.result || t.draft || '').slice(0, 5000), error: t.error || undefined, team: t.team?.pieces ? t.team.pieces.map(p => `${p.agent}: ${p.state}`) : undefined, approved: !!t.approved });
  },
  async office_add_task(a) {
    if (++adds > MAX_ADDS) return fail(`Already queued ${MAX_ADDS} tasks this turn. Ask Wesley before queuing more.`);
    const body = String(a.text || '').trim(); if (body.length < 15) return fail('The task text is too short: write a complete instruction.');
    if (!DEPTS.includes(a.dept)) return fail('dept must be one of ' + DEPTS.join(', '));
    const t = await api('/api/tasks', { method: 'POST', body: JSON.stringify({ dept: a.dept, text: body, team: a.team || undefined, model: a.model || undefined, effort: a.effort || undefined, by: 'chief' }) });
    return text({ added: true, id: t.id, dept: t.dept, desk: t.agent, title: t.title, team: !!t.team, note: 'It starts in about 20 seconds (Wesley can change the model or undo it until then) and waits for his review in the office.' });
  },
  async office_add_routine(a) {
    if (++adds > MAX_ADDS) return fail(`Already queued ${MAX_ADDS} things this turn. Ask Wesley before adding more.`);
    const body = String(a.text || '').trim(); if (body.length < 15) return fail('The text is too short: write the task as a complete instruction, without the schedule words.');
    if (!DEPTS.includes(a.dept)) return fail('dept must be one of ' + DEPTS.join(', '));
    const at = /^\d{1,2}:\d{2}$/.test(String(a.at || '')) ? String(a.at).padStart(5, '0') : '08:00', DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const when = a.cadence === 'hourly' ? { kind: 'hourly', every: 1, from: '09:00', to: '17:00', weekdaysOnly: true } : a.cadence === 'daily' ? { kind: 'daily', at } : a.cadence === 'weekdays' ? { kind: 'weekdays', at } : DAYS[a.cadence] !== undefined ? { kind: 'weekly', days: [DAYS[a.cadence]], at } : null;
    if (!when) return fail('cadence must be weekdays, daily, hourly, or a day: mon, tue, wed, thu, fri, sat, sun');
    if (a.start && /^\d{4}-\d{2}-\d{2}$/.test(String(a.start))) when.start = String(a.start);
    const r = await api('/api/routines', { method: 'POST', body: JSON.stringify({ dept: a.dept, text: body, when, needsOk: a.needs_ok !== false, model: a.model || undefined, effort: a.effort || undefined }) });
    const x = r.routine || r;
    return text({ added: true, routine: x.id, dept: x.dept, desk: x.agent, title: x.title, schedule: x.desc || JSON.stringify(when), waitsForOk: a.needs_ok !== false, note: 'It is on the timetable (SCHEDULED chip, RUN NOW to try it). Marketing routines are allowed in this office.' });
  },
  async office_routines() { const r = await api('/api/routines'); return text((r.routines || []).map(x => ({ id: x.id, dept: x.dept, agent: x.agent, title: x.title, schedule: x.desc, paused: !!x.paused, next: x.nextAt ? new Date(x.nextAt).toLocaleString('en-GB') : null, lastRun: x.lastAt ? ago(x.lastAt) : null }))); },
  async office_run_routine(a) { const id = String(a.id || ''); const r = await api(`/api/routines/${encodeURIComponent(id)}/run`, { method: 'POST', body: '{}' }); return text({ started: true, routine: id, task: r.task?.id || r.id || undefined, note: 'It waits for Wesley\'s OK like any run.' }); },
  async office_agents(a) { const r = await api('/api/agents'); return text((r.agents || []).filter(x => !a.dept || x.department === a.dept).map(x => ({ id: x.id, name: x.name, dept: x.department, lead: !!x.lead, does: String(x.does || '').slice(0, 160), model: x.model || undefined }))); },
  async office_content_week(a) {
    const base = path.join(ROOT, 'Content Calendar'); let dirs = []; try { dirs = fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort(); } catch {}
    if (!dirs.length) return text('The Content Calendar folder has no weeks yet. The Monday plan creates the next week.');
    const w = String(a.week || '').trim().toLowerCase();
    if (!w) return text({ weeks: dirs, folder: base, note: 'Pass a week to read its SCHEDULE.' });
    const pick = w === 'next' || w === 'latest' ? dirs[dirs.length - 1] : dirs.find(d => d.startsWith(w) || d.toLowerCase().includes(w));
    if (!pick) return fail('No such week. Weeks: ' + dirs.join(', '));
    const dir = path.join(base, pick); let sched = ''; try { sched = fs.readFileSync(path.join(dir, 'SCHEDULE.md'), 'utf8'); } catch {}
    return text({ week: pick, folder: dir, schedule: sched.slice(0, 7000) });
  },
  async office_brain_search(a) {
    if (!BRAIN) return fail('The Brain folder is not configured.');
    const words = String(a.query || '').toLowerCase().split(/[^a-z0-9£%]+/).filter(w => w.length > 2); if (!words.length) return fail('Give some words to search for.');
    const hits = [];
    for (const f of walk(BRAIN)) { let t = ''; try { t = clean(fs.readFileSync(f, 'utf8')); } catch { continue; } const name = path.basename(f, '.md').toLowerCase(), low = t.toLowerCase(); let s = 0; for (const w of words) { if (name.includes(w)) s += 4; const n = low.split(w).length - 1; s += Math.min(n, 5); } if (s) { const i = Math.max(0, low.indexOf(words.find(w => low.includes(w)) || '')); hits.push({ s, note: path.basename(f, '.md'), path: path.relative(BRAIN, f).replace(/\\/g, '/'), snippet: t.slice(Math.max(0, i - 60), i + 220).replace(/\s+/g, ' ') }); } }
    return text(hits.sort((x, y) => y.s - x.s).slice(0, 8).map(({ s, ...h }) => h));
  },
  async office_brain_read(a) {
    if (!BRAIN) return fail('The Brain folder is not configured.');
    const want = String(a.note || '').replace(/\.md$/i, '').toLowerCase().replace(/\\/g, '/'), files = walk(BRAIN);
    const f = files.find(x => path.relative(BRAIN, x).replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase() === want) || files.find(x => path.basename(x, '.md').toLowerCase() === want);
    if (!f) return fail('No such note: ' + a.note);
    const t = clean(fs.readFileSync(f, 'utf8')); return text({ note: path.basename(f, '.md'), path: path.relative(BRAIN, f).replace(/\\/g, '/'), text: t.slice(0, 9000), truncated: t.length > 9000 });
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'office-control', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? Promise.resolve(t(m.params.arguments || {})).then(ok, e => ok(fail('Could not do that: ' + (e.message || e)))) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
