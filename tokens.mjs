// Tokens (3 Nov 2026): what the tokens go on, for the AIOS Tokens section (GET /api/tokens).
// Two sources. 1. Wesley's Claude Code chats: the transcripts under ~/.claude/projects carry every API call's usage; they are
// read line by line and only the bytes added since the last read are read again (the cache is data/tokens-cache.json).
// 2. The office's own runs: every Claude run the office starts is written to data/tokens.jsonl from its final result event
// (tokens, cost, model, time), with the desk, department, routine and task it was for; a task also keeps its own sum (task.usage).
// Office runs before capture started were never saved and cannot be recovered. Local only: nothing here leaves the machine.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
export const projectKey = dir => path.resolve(dir).replace(/[^a-zA-Z0-9]/g, '-'); // how Claude Code names a project's transcript folder
const LEDGER = 'tokens.jsonl', CACHE = 'tokens-cache.json', DAY = 86400000;
export const dayOf = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const cents = n => Math.round(n * 10000) / 10000;

/* ---------- 1. the office's own runs ---------- */
// the final result event of `claude -p --output-format stream-json` → the numbers for one ledger row. modelUsage covers every model
// the run touched (a --chrome run also calls a small Haiku helper), so the tokens are summed from it when it is there.
export function fromResult(j, model) {
  const mu = j.modelUsage && typeof j.modelUsage === 'object' ? Object.values(j.modelUsage) : [], u = j.usage || {};
  const sum = k => mu.reduce((n, m) => n + (m[k] || 0), 0);
  return {
    model: model || Object.keys(j.modelUsage || {})[0] || '',
    in: mu.length ? sum('inputTokens') : u.input_tokens || 0, out: mu.length ? sum('outputTokens') : u.output_tokens || 0,
    cr: mu.length ? sum('cacheReadInputTokens') : u.cache_read_input_tokens || 0, cw: mu.length ? sum('cacheCreationInputTokens') : u.cache_creation_input_tokens || 0,
    cost: typeof j.total_cost_usd === 'number' ? cents(j.total_cost_usd) : null, ms: j.duration_ms || 0, turns: j.num_turns || 0,
  };
}
// the API backend (an ANTHROPIC_API_KEY run) reports usage but no cost
export const fromApi = (u, model) => ({ model: model || '', in: u?.input_tokens || 0, out: u?.output_tokens || 0, cr: u?.cache_read_input_tokens || 0, cw: u?.cache_creation_input_tokens || 0, cost: null, ms: 0, turns: 1 });
export function record(dataDir, row) {
  const r = { at: Date.now(), ...row };
  for (const k of Object.keys(r)) if (r[k] === undefined || r[k] === '') delete r[k];
  try { fs.mkdirSync(dataDir, { recursive: true }); fs.appendFileSync(path.join(dataDir, LEDGER), JSON.stringify(r) + '\n'); } catch (e) { console.warn('tokens:', e.message); }
  return r;
}
export function readLedger(dataDir) {
  let t = ''; try { t = fs.readFileSync(path.join(dataDir, LEDGER), 'utf8'); } catch { return []; }
  return t.split('\n').map(l => { try { return l ? JSON.parse(l) : null; } catch { return null; } }).filter(Boolean);
}
// a task's own running sum: every run for it (the plan, each piece, the final, a revision, the send after the OK)
export function addTo(task, r) {
  const u = task.usage ||= { runs: 0, in: 0, out: 0, cr: 0, cw: 0, cost: 0, ms: 0, models: {} };
  u.runs++; for (const k of ['in', 'out', 'cr', 'cw', 'ms']) u[k] += r[k] || 0;
  u.cost = cents(u.cost + (r.cost || 0));
  if (r.model) u.models[r.model] = cents((u.models[r.model] || 0) + (r.cost || 0));
  if (r.mode === 'revise') u.reviseCost = cents((u.reviseCost || 0) + (r.cost || 0));
  return u;
}

/* ---------- 2. the chats ---------- */
// One state per transcript file, kept in the cache with the byte offset read up to. A partial last line is left for next time.
const fresh = (rel, sub) => ({ rel, sub, size: 0, offset: 0, cwd: '', title: '', first: '', telegram: false, turns: 0, calls: 0, peak: 0, firstCtx: 0, lastCtx: 0, start: 0, last: 0, days: {}, models: {}, recent: [] });
const textOf = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join('\n') : '';
// [input, output, cache read, cache write, calls] per day and per model
const ADD = (o, k, v, s) => { const a = o[k] ||= [0, 0, 0, 0, 0]; for (let i = 0; i < 4; i++) a[i] += s * v[i]; a[4] += s; };
const MERGE = (o, k, v) => { const a = o[k] ||= [0, 0, 0, 0, 0]; for (let i = 0; i < 5; i++) a[i] += v[i]; };
function apply(st, r, s) { ADD(st.days, r[1], r.slice(3, 7), s); ADD(st.models, r[2], r.slice(3, 7), s); }
const NEEDLES = { assistant: Buffer.from('"type":"assistant"'), usage: Buffer.from('"usage"'), user: Buffer.from('"type":"user"'), tool: Buffer.from('"tool_use_id"'), title: Buffer.from('"type":"custom-title"'), cwd: Buffer.from('"cwd"') };
function eat(st, buf) {
  // cheap tests on the raw bytes first: most of a transcript is tool output that nobody needs to parse. JSON inside a tool result is
  // escaped (\"type\"), so these only match the line's own keys.
  const isA = buf.indexOf(NEEDLES.assistant) >= 0 && buf.indexOf(NEEDLES.usage) >= 0;
  const isU = !isA && buf.length < 5e6 && buf.indexOf(NEEDLES.user) >= 0 && buf.indexOf(NEEDLES.tool) < 0;
  const isT = !isA && !isU && buf.indexOf(NEEDLES.title) >= 0;
  if (!isA && !isU && !isT && (st.cwd || buf.length > 20000 || buf.indexOf(NEEDLES.cwd) < 0)) return;
  let j; try { j = JSON.parse(buf.toString('utf8')); } catch { return; }
  if (!st.cwd && j.cwd) st.cwd = String(j.cwd);
  if (j.type === 'custom-title' && j.customTitle) { st.title = String(j.customTitle).slice(0, 120); return; }
  const ts = Date.parse(j.timestamp) || st.last || 0;
  if (j.type === 'assistant' && j.message?.usage) {
    const m = j.message, u = m.usage; if (m.model === '<synthetic>') return;
    const v = [u.input_tokens || 0, u.output_tokens || 0, u.cache_read_input_tokens || 0, u.cache_creation_input_tokens || 0];
    const id = m.id || j.requestId || j.uuid || String(st.calls), r = [id, dayOf(ts || Date.now()), m.model || '?', ...v];
    // one API response is written as several lines (a line per content block) carrying the same id: the last one counts
    const i = st.recent.findIndex(x => x[0] === id);
    if (i >= 0) { apply(st, st.recent[i], -1); st.recent[i] = r; } else { st.calls++; st.recent.push(r); if (st.recent.length > 40) st.recent.shift(); }
    apply(st, r, 1);
    if (!st.sub && !j.isSidechain) { const ctx = v[0] + v[2] + v[3]; st.peak = Math.max(st.peak, ctx); st.firstCtx ||= ctx; st.lastCtx = ctx; } // the context the main thread carried into this call: the most, the first (what a fresh chat costs) and the latest
    if (ts) { st.start ||= ts; st.last = Math.max(st.last, ts); }
    return;
  }
  if (j.type === 'user' && !st.sub && !j.isSidechain && !j.isMeta && !j.isCompactSummary) {
    const t = textOf(j.message?.content).trim(); if (!t) return;
    // newer transcripts say who started the turn; older ones are judged by the words (the app's own wrappers are not his)
    const human = j.turnOrigin ? j.turnOrigin === 'human' : !/^<(command|local-command|system-reminder|task-notification|side-sessions-event|ci-monitor-event)/.test(t);
    if (!human && !/^<channel source="telegram"/.test(t)) return;
    st.turns++;
    if (!st.first) { st.first = t.slice(0, 200); st.telegram = /^<channel source="telegram"/.test(t); }
    if (ts) { st.start ||= ts; st.last = Math.max(st.last, ts); }
  }
}
async function readFrom(file, st) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const size = (await fh.stat()).size; let pos = st.offset, carry = null;
    const CH = 8 << 20, buf = Buffer.alloc(CH);
    while (pos < size) {
      const { bytesRead } = await fh.read(buf, 0, Math.min(CH, size - pos), pos); if (!bytesRead) break;
      pos += bytesRead;
      const data = carry ? Buffer.concat([carry, buf.subarray(0, bytesRead)]) : buf.subarray(0, bytesRead);
      let s = 0, nl; while ((nl = data.indexOf(10, s)) >= 0) { if (nl > s) eat(st, data.subarray(s, nl)); s = nl + 1; }
      carry = s < data.length ? Buffer.from(data.subarray(s)) : null;
    }
    st.offset = pos - (carry ? carry.length : 0); st.size = size;
  } finally { await fh.close(); }
}
// every transcript touched in the last `days` days: <project>/<session>.jsonl and the sub-agents' <project>/<session>/subagents/*.jsonl
function listFiles(root, days) {
  const since = Date.now() - days * DAY, out = [];
  let projects = []; try { projects = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch { return out; }
  for (const p of projects) {
    const dir = path.join(root, p); let items = []; try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const it of items) {
      if (it.isFile() && it.name.endsWith('.jsonl')) out.push({ project: p, session: it.name.slice(0, -6), rel: `${p}/${it.name}`, sub: false });
      else if (it.isDirectory()) { const sd = path.join(dir, it.name, 'subagents'); let subs = []; try { subs = fs.readdirSync(sd).filter(f => f.endsWith('.jsonl')); } catch {} for (const f of subs) out.push({ project: p, session: it.name, rel: `${p}/${it.name}/subagents/${f}`, sub: true }); }
    }
  }
  return out.map(f => { try { const s = fs.statSync(path.join(root, f.rel)); return { ...f, size: s.size, mtime: s.mtimeMs }; } catch { return null; } }).filter(f => f && f.mtime >= since);
}
let scanning = null;
export function scanChats(dataDir, opts = {}) { // one scan at a time; a second caller waits for the same one
  return scanning ||= scanNow(dataDir, opts).finally(() => { scanning = null; });
}
async function scanNow(dataDir, { root = PROJECTS, days = 35 } = {}) {
  const cfile = path.join(dataDir, CACHE);
  let cache; try { cache = JSON.parse(fs.readFileSync(cfile, 'utf8')); } catch {} if (!cache || cache.v !== 2) cache = { v: 2, files: {} }; // v2 (3 Nov): first and latest context per chat, so the old cache is read again
  const files = listFiles(root, days), keep = {}; let changed = false;
  for (const f of files) {
    let st = cache.files[f.rel];
    if (!st || f.size < st.offset) st = fresh(f.rel, f.sub); // new, or rewritten shorter: read it from the top
    if (f.size > st.offset) { try { await readFrom(path.join(root, f.rel), st); changed = true; } catch (e) { console.warn('tokens: ' + f.rel + ': ' + e.message); } }
    keep[f.rel] = Object.assign(st, { project: f.project, session: f.session });
  }
  if (changed || Object.keys(keep).length !== Object.keys(cache.files).length) { cache.files = keep; try { fs.writeFileSync(cfile, JSON.stringify(cache)); } catch (e) { console.warn('tokens cache:', e.message); } }
  // one row per chat: the main transcript plus its sub-agents (their tokens count; their context and turns do not)
  const by = new Map();
  for (const st of Object.values(keep)) {
    const k = st.project + '/' + st.session;
    const s = by.get(k) || by.set(k, { id: st.session, project: st.project, cwd: '', title: '', first: '', telegram: false, turns: 0, calls: 0, subagents: 0, peak: 0, firstCtx: 0, lastCtx: 0, start: 0, last: 0, days: {}, models: {} }).get(k);
    for (const [d, v] of Object.entries(st.days)) MERGE(s.days, d, v);
    for (const [m, v] of Object.entries(st.models)) MERGE(s.models, m, v);
    s.calls += st.calls; if (st.start) s.start = s.start ? Math.min(s.start, st.start) : st.start; s.last = Math.max(s.last, st.last);
    if (st.sub) { s.subagents++; continue; }
    Object.assign(s, { cwd: st.cwd, title: st.title, first: st.first, telegram: st.telegram, turns: st.turns, peak: st.peak, firstCtx: st.firstCtx, lastCtx: st.lastCtx });
  }
  return [...by.values()].filter(s => s.calls);
}

/* ---------- 3. the report ---------- */
const T = () => ({ in: 0, out: 0, cr: 0, cw: 0, total: 0, cost: 0, runs: 0, costed: 0 }); // costed: runs whose cost is known (the ledger's; a transcript has none)
const addT = (t, v, cost = null, runs = 0) => { t.in += v[0]; t.out += v[1]; t.cr += v[2]; t.cw += v[3]; t.total += v[0] + v[1] + v[2] + v[3]; t.cost = cents(t.cost + (cost || 0)); t.runs += runs; if (cost != null) t.costed += runs; return t; };
const rowV = r => [r.in || 0, r.out || 0, r.cr || 0, r.cw || 0];
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const WINDOW = 1000000; // the context window the chats run in (Opus 5.5 and Sonnet 5.5: 1M)
// a chat's verdict: how close it came to the window, and how much it re-read for each token it wrote
export function verdict(s) {
  const perOut = s.cr / Math.max(1, s.out);
  if (s.peak >= 0.6 * WINDOW) return { key: 'handover', text: 'Should have handed over', why: `carried ${Math.round(s.peak / 1000)}k of context into one call` };
  if (s.peak >= 0.3 * WINDOW || (perOut >= 400 && s.cr >= 20e6)) return { key: 'heavy', text: 'Hand over sooner', why: s.peak >= 0.3 * WINDOW ? `peaked at ${Math.round(s.peak / 1000)}k of context` : `re-read ${Math.round(perOut)} tokens for every token written` };
  return { key: 'ok', text: 'Fine', why: '' };
}
// which deliverable a task was (for cost per approved deliverable); the server passes its own test for reels and report issues
const DELIVERABLE = [
  ['Reel', t => /\breels?\b/i.test(`${t.title} ${t.text}`)],
  ['Franchise Entry Report issue', t => /franchise entry report/i.test(`${t.title} ${t.text}`) && /issue\s*\d+/i.test(`${t.title} ${t.text}`)],
  ['Newsletter', t => /newsletter|scaling without borders/i.test(`${t.title} ${t.text}`)],
  ['Content plan or build', t => /content[- ](plan|build)|\[content-build\]/i.test(`${t.title} ${t.text} ${t.routine || ''}`)],
  ['LinkedIn post', t => /linkedin/i.test(`${t.title} ${t.text}`)],
  ['Email', t => t.channel === 'email'],
];
// The coach: the one action worth taking now, from the numbers above (rules, not a model call, so it costs nothing to ask).
// In order: a chat used today that is carrying a heavy context (hand it over; the biggest saving per turn wins), then a desk whose
// Opus runs Sonnet could do, then a desk that is often sent back (each send-back is a second full run), then the habit, else all good.
export const FRESH = 90000; // what a new chat in this project costs before the first word, when a chat's own first call is not known
export function coach({ chats = [], rework = [], modelFit = {}, now = Date.now() } = {}) {
  const hot = chats.filter(c => c.last >= now - DAY && c.lastCtx >= 0.3 * WINDOW).map(c => {
    const fresh = Math.min(c.firstCtx || FRESH, 0.2 * WINDOW), callsPerTurn = Math.max(1, Math.round(c.calls / Math.max(1, c.turns)));
    return { kind: 'handover', chat: { id: c.id, title: c.title, project: c.project, telegram: c.telegram, last: c.last }, lastCtx: c.lastCtx, fresh, callsPerTurn, perTurn: (c.lastCtx - fresh) * callsPerTurn };
  }).sort((a, b) => b.perTurn - a.perTurn);
  if (hot.length) return { ...hot[0], others: hot.length - 1 };
  const light = (modelFit.lightBy || []).find(x => x.cost >= 1);
  if (light) return { kind: 'model', desk: light.k, agent: light.agent, cost: light.cost, runs: light.runs };
  const rw = rework.find(g => g.tasks >= 4 && g.rate >= 0.3);
  if (rw) return { kind: 'rework', desk: rw.desk, revised: rw.revised, tasks: rw.tasks, rate: rw.rate };
  const late = chats.filter(c => c.peak >= 0.6 * WINDOW);
  if (late.length >= 2) return { kind: 'habit', late: late.length, chats: chats.length, cr: late.reduce((n, c) => n + c.cr, 0) };
  return { kind: 'ok' };
}
export function report({ sessions = [], ledger = [], tasks = [], agents = [], depts = {}, officeProject = '', now = Date.now(), deliverable } = {}) {
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  const from = n => midnight.getTime() - (n - 1) * DAY, d30 = from(30), dayKeys = [...Array(30)].map((_, i) => dayOf(from(30 - i)));
  const inWin = (day, n) => day >= dayOf(from(n));
  const name = id => agents.find(a => a.id === id)?.name || id || '—';
  const since = ledger.length ? Math.min(...ledger.map(r => r.at)) : null;
  // the office's runs, and its few runs from before capture that left a transcript (the temp folder its runs work in)
  const chats = sessions.filter(s => s.project !== officeProject), oldOffice = sessions.filter(s => s.project === officeProject);
  const win = n => {
    const c = T(), o = T();
    for (const s of chats) for (const [d, v] of Object.entries(s.days)) if (inWin(d, n)) addT(c, v, null, v[4]);
    for (const r of ledger) if (r.at >= from(n)) addT(o, rowV(r), r.cost, 1);
    for (const s of oldOffice) for (const [d, v] of Object.entries(s.days)) if (inWin(d, n)) addT(o, v, null, v[4]);
    return { chats: c, office: o, total: c.total + o.total };
  };
  const days = dayKeys.map(d => {
    const c = T(), o = T();
    for (const s of chats) if (s.days[d]) addT(c, s.days[d], null, s.days[d][4]);
    for (const s of oldOffice) if (s.days[d]) addT(o, s.days[d], null, s.days[d][4]);
    for (const r of ledger) if (dayOf(r.at) === d) addT(o, rowV(r), r.cost, 1);
    return { d, chats: c, office: o };
  });
  // chats active in the last 30 days, biggest first; their numbers are the whole chat
  const chatRows = chats.filter(s => s.last >= d30).map(s => {
    const t = T(); for (const v of Object.values(s.models)) addT(t, v, null, v[4]);
    const models = Object.entries(s.models).sort((a, b) => (b[1][1] + b[1][2]) - (a[1][1] + a[1][2])).map(([m]) => m);
    const row = { id: s.id, title: s.telegram ? 'Telegram listener' : s.title || s.first.replace(/\s+/g, ' ').slice(0, 80) || s.id.slice(0, 8), project: path.basename(s.cwd || '') || s.project, telegram: s.telegram,
      start: s.start, last: s.last, turns: s.turns, calls: s.calls, subagents: s.subagents, peak: s.peak, firstCtx: s.firstCtx, lastCtx: s.lastCtx, ...t, models, share: t.total ? t.cr / t.total : 0, perOut: t.cr / Math.max(1, t.out) };
    return { ...row, verdict: verdict(row) };
  }).sort((a, b) => b.total - a.total);
  // the office's jobs, grouped five ways; a task's outcome (approved, sent back) comes from the board
  const byId = new Map(tasks.map(t => [t.id, t]));
  const group = keyOf => {
    const m = new Map();
    for (const r of ledger) {
      const k = keyOf(r); if (k == null) continue;
      const g = m.get(k) || m.set(k, { key: k, ...T(), tasks: new Set(), opus: 0 }).get(k);
      addT(g, rowV(r), r.cost, 1); if (r.task) g.tasks.add(r.task); if (/opus/.test(r.model || '')) g.opus = cents(g.opus + (r.cost || 0));
    }
    return [...m.values()].map(g => {
      const ts = [...g.tasks].map(id => byId.get(id)).filter(Boolean), approved = ts.filter(t => t.approved), revised = ts.filter(t => t.revisions > 0);
      const waits = approved.filter(t => t.approvedAt && t.addedAt).map(t => (t.approvedAt - t.addedAt) / 3600000);
      return { key: g.key, runs: g.runs, in: g.in, out: g.out, cr: g.cr, cw: g.cw, total: g.total, cost: g.cost, opus: g.opus, tasks: ts.length, approved: approved.length, revised: revised.length,
        perApproved: approved.length ? cents(g.cost / approved.length) : null, hoursToOk: median(waits) };
    }).sort((a, b) => b.cost - a.cost || b.total - a.total);
  };
  const KIND = { task: 'Desk work', piece: 'Team piece', lead: 'Team lead final', plan: 'Team plan', 'lead-review': 'Lead review', route: 'Routing a task', chat: 'Desk chat', chief: 'Chief of Staff', motion: 'Motion Director', critic: 'Motion critic',upload: 'Reading an upload', lesson: 'Learning from a correction', interview: 'Set-up interview', budget: 'Budget sync', tracker: 'Tracker sync', matrix: 'Matrix extraction', calendar: 'Calendar reminder', skill: 'Skill revision', fix: 'Dashboard fix', handover: 'Hand-over brief', other: 'Other' };
  const jobs = {
    desk: group(r => r.agent ? name(r.agent) : null),
    dept: group(r => r.dept ? (depts[r.dept]?.name || r.dept) : null),
    routine: group(r => r.routine || null),
    model: group(r => r.model || 'unknown'),
    kind: group(r => KIND[r.kind] || r.kind || 'Other'),
  };
  // ROI. Cost per approved deliverable counts every run on those tasks, revisions and the send after the OK included.
  const kindOf = t => { for (const [k, test] of deliverable ? [...deliverable, ...DELIVERABLE] : DELIVERABLE) if (test(t)) return k; return null; };
  const costed = tasks.filter(t => t.usage);
  const per = new Map();
  for (const t of costed) {
    const k = kindOf(t); if (!k) continue;
    const g = per.get(k) || per.set(k, { kind: k, tasks: 0, approved: 0, cost: 0, revisions: 0, reviseCost: 0 }).get(k);
    g.tasks++; if (t.approved) g.approved++; g.cost = cents(g.cost + (t.usage.cost || 0)); g.revisions += t.revisions || 0; g.reviseCost = cents(g.reviseCost + (t.usage.reviseCost || 0));
  }
  const perDeliverable = [...per.values()].map(g => ({ ...g, perApproved: g.approved ? cents(g.cost / g.approved) : null })).sort((a, b) => b.cost - a.cost);
  // rework and time to approval come from the board itself, so they have history before capture started
  const recent = tasks.filter(t => (t.addedAt || 0) >= d30 && !t.error && (t.approved || t.revisions > 0 || t.state === 'waiting' || t.state === 'done'));
  const rw = new Map();
  for (const t of recent) { const g = rw.get(t.agent) || rw.set(t.agent, { desk: name(t.agent), tasks: 0, revised: 0, revisions: 0 }).get(t.agent); g.tasks++; if (t.revisions > 0) g.revised++; g.revisions += t.revisions || 0; }
  const rework = [...rw.values()].map(g => ({ ...g, rate: g.revised / g.tasks })).sort((a, b) => b.rate - a.rate || b.tasks - a.tasks);
  const okd = recent.filter(t => t.approved && t.approvedAt);
  const approval = {
    tasks: okd.length,
    endToEnd: median(okd.filter(t => t.addedAt).map(t => (t.approvedAt - t.addedAt) / 3600000)),
    yourTurn: median(okd.filter(t => t.waitingAt && t.approvedAt >= t.waitingAt).map(t => (t.approvedAt - t.waitingAt) / 3600000)),
  };
  // model fit: Opus runs that read no tools and wrote little are the ones Sonnet could have done
  const opusRuns = ledger.filter(r => /opus/.test(r.model || '') && r.at >= d30);
  const light = opusRuns.filter(r => (r.turns || 1) <= 1 && (r.out || 0) < 1500 && !['motion', 'critic', 'chief'].includes(r.kind)); // those three are on Opus by design
  const lightBy = new Map(); for (const r of light) { const k = r.agent ? name(r.agent) : KIND[r.kind] || r.kind || 'Other', g = lightBy.get(k) || lightBy.set(k, { k, agent: r.agent || '', cost: 0, runs: 0 }).get(k); g.cost = cents(g.cost + (r.cost || 0)); g.runs++; }
  const modelFit = { opusCost: cents(opusRuns.reduce((n, r) => n + (r.cost || 0), 0)), opusRuns: opusRuns.length, lightCost: cents(light.reduce((n, r) => n + (r.cost || 0), 0)), lightRuns: light.length, lightBy: [...lightBy.values()].sort((a, b) => b.cost - a.cost).slice(0, 5) };
  const heavy = chatRows.filter(c => c.verdict.key !== 'ok');
  return {
    at: now, since, window: WINDOW,
    headline: { today: win(1), d7: win(7), d30: win(30) },
    days, chats: chatRows.filter((c, i) => i < 40 || c.last >= now - DAY), chatCount: chatRows.length, heavy: heavy.length, // every chat used in the last 24 hours, however small: the page lists those on top
    jobs, roi: { perDeliverable, rework: rework.slice(0, 12), approval, modelFit },
    coach: coach({ chats: chatRows, rework, modelFit, now }),
    oldOffice: oldOffice.reduce((n, s) => n + s.calls, 0),
  };
}
