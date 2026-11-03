// Agents Office — the local server (Beta).
// Serves the office and makes it real on your own Claude login:
//   · the command bar routes a typed task through Claude to the right agent in the department
//   · the agent produces the deliverable, which is saved as a note in your brain folder
//   · the Brain is your vault's real wiki-link graph, rebuilt live as notes are written
//   · chat with any agent is a real conversation in that agent's persona, grounded in your notes
// Everything stays on this machine: data/tasks.json and <brain>/Agents Office/*.md.
//
//   npm start                 → http://localhost:4520
//   PORT=4600 npm start       → another port
//
// Claude backend: the Claude Code CLI (`claude -p`, your existing login) — or the official SDK
// if ANTHROPIC_API_KEY is set. AO_MODEL=<model> overrides the model.
//
// V3.1: the connectors are real — the MCP servers your Claude Code is connected to are what the
// top bar shows and what the agents can call (mcp.mjs); the roster is yours (office.agents.json,
// roster.mjs). Tool calls only happen on the CLI backend: the SDK path has no MCP servers.
// V3.2: how the work is done is yours too — each agent's `brief` (roster.mjs) and the skills
// bound to it (skills.mjs: skills/ + <brain>/Agents Office/skills/) go into every task and chat.
// V3.3: the agents learn — every "revise: …" is recorded and standing rules come back into the
// prompt (learn.mjs); a department lead interviews the owner in chat and writes the briefs and a
// skill for its team (onboard.mjs). Roster, skills and lessons are re-read before every task.
// V3.5: routines — the office keeps its own clock (routines.mjs + src/when.js). A routine in
// <brain>/Agents Office/routines.json fires at its minute whether or not the page is open; the
// server creates the task, runs it here, and a result that needs the owner's OK waits in
// WAITING ON APPROVAL until /approve (the agent then does the outbound step) or /reject (with a
// note, which the agent learns from). Emails, Accounting and Sales only in this release.
// V3.2 (16 Sep): AGENT TEAMS + CLAUDE IN CHROME. A team task (TEAM in the bar, "as a team" in the sentence,
// `team: true` on a routine) goes to the department lead, who plans the pieces; the office runs one
// Claude process per teammate at the same time (teams.mjs, pool of `teams.max`), keeps the shared
// piece list and the notes they leave each other on the task (`task.team`, polled by the page), and
// the lead writes the finished deliverable from the pieces. Every `claude -p` gets --chrome when
// `tools.browser` is on: the agents can drive the owner's own Chrome (mcp.mjs).
// V3.2.1: the CALENDAR (P). A task can be scheduled for a date (`at` on POST /api/tasks → state
// 'scheduled', `dueAt`; the clock below fires it, marked LATE if the office was off) and a routine
// can start from a date (`when.start`, src/when.js). Cancel = DELETE /api/tasks/:id.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadConfig, ROOT } from './config.mjs';
import { layoutGraph, readVault, readOfficeNotes } from './graph-build.mjs';
import { buildMap as buildBrainMap } from './brainmap.mjs';
let brainMapCache = { at: 0, map: null };
import { DEPTS, DEPT_KEYS } from './src/data.js';
import * as mcp from './mcp.mjs';
import { loadRoster } from './roster.mjs';
import { loadSkills } from './skills.mjs';
import * as learn from './learn.mjs';
import JSZip from 'jszip';
import * as onboard from './onboard.mjs';
import * as routines from './routines.mjs';
import * as usage from './usage.mjs';
import * as teams from './teams.mjs';
import * as aios from './aios.mjs';
import * as budget from './budget.mjs';
import * as brainnotes from './brainnotes.mjs';
import * as siteupdates from './siteupdates.mjs';
import * as handoff from './handoff.mjs';
import * as salesData from './sales.mjs';
import * as posData from './pos.mjs';
import * as social from './social.mjs'; // V3.12: the AIOS Social section, the next post per workstream
import * as gcal from './gcal.mjs'; // V3.12: Wesley's Google Calendar, read from its private feeds, on /aios and in the office calendar
import * as attention from './attention.mjs'; // V3.12: which Claude Code sessions are waiting on Wesley ("Needs you" on /aios)
import * as fixes from './fix.mjs'; // V3.12: the month's fix for a client restaurant, from all of its dashboard data
import * as ubereats from './ubereats.mjs'; // V3.12: Uber Eats Manager exports (order accuracy, downtime, pauses), kept raw in data/ubereats/
import * as deliverect from './deliverect.mjs'; // V3.12: delivery orders from Deliverect exports, kept raw in data/deliverect/
import * as trackers from './trackers.mjs';
import { kickWorkers } from './kickworkers.mjs';
import * as storage from './storage.mjs';
import * as tokens from './tokens.mjs'; // 3 Nov 2026: what the tokens go on (the AIOS Tokens section); every Claude run here is written to data/tokens.jsonl
import * as notify from './notify.mjs';
import * as weekpack from './weekpack.mjs';
import * as aoofile from './aoofile.mjs';
import * as ferfile from './ferfile.mjs';
import * as assistantMod from './assistant.mjs';
import * as motionMod from './motion.mjs';
import { pinnedNotes } from './pins.mjs';
import * as skillaudit from './skillaudit.mjs';
import { create as createWhatsApp } from './whatsapp.mjs';
import { recover } from './recover.mjs';
import { normModel, modelFor, modelArgs, modelId, modelName, MODEL_KEYS, DEFAULT_MODEL, normEffort, effortFor, effortName, EFFORT_KEYS } from './src/models.js';
import { parseWhen, describe, valid as validWhen, untilText } from './src/when.js';
import mammoth from 'mammoth';
import { toMarkdownBytes } from '@firecrawl/anydoc'; // local Rust converter: Office/OpenDocument/RTF/EPUB/CSV → Markdown (tables and headings kept)

const cfg = loadConfig();
const HTML = path.join(ROOT, 'dist', 'command-centre-v2.html'); // built by build.mjs; shipped so npm start works without a build
const DATA = path.join(ROOT, 'data');
const FILE = path.join(DATA, 'tasks.json');
const wa = createWhatsApp({ dataDir: DATA, cfg: cfg.whatsapp || {} });
const BRAIN = cfg.brainPath;
const NOTES_DIR = path.join(BRAIN, 'Agents Office');
const CLI_CWD = path.join(os.tmpdir(), 'agents-office-cli'); // an empty cwd: no CLAUDE.md, no repo context
const version = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; } catch { return '?'; } })();
const RUN_TIMEOUT = Math.max(60, +cfg.timeout || 300) * 1000; // agents with tools take longer than a plain draft
{ const m = normModel(cfg.model); if (cfg.model && !m) console.warn(`config: model must be sonnet, opus or fable (got "${cfg.model}") — using ${DEFAULT_MODEL}`); cfg.model = m || DEFAULT_MODEL; } // V3.6: three models, by name
{ const e = normEffort(cfg.effort); if (cfg.effort && !e) console.warn(`config: effort must be low, medium, high, xhigh or max (got "${cfg.effort}") — using the model's own`); cfg.effort = e || ''; } // V3.6.1: the office's effort, empty = the model's own
mcp.configure(cfg);
routines.allow(process.env.OFFICE_ROUTINE_DEPTS ? process.env.OFFICE_ROUTINE_DEPTS.split(',') : cfg.routines?.departments); // office.config.json: "routines": { "departments": ["emails", "fin", "sales", "ops", "delivery", "marketing"] }
const TEAMS = teams.settings(cfg); // V3.2 (16 Sep): { enabled, max }
const roster = loadRoster(BRAIN);
const AGENTS = roster.agents; // id · department · lead · name · role · does · tools · brief
for (const w of roster.problems) console.warn('agents:', w);
let skills = loadSkills(BRAIN, AGENTS); // reloaded before every task and chat, so a new skill needs no restart
for (const w of skills.problems) console.warn('skills:', w);
// the roster's editable fields are re-read too (a brief written by the lead's interview, or by hand, lands without a restart)
function reloadRoster() {
  const r = loadRoster(BRAIN);
  for (const a of r.agents) { const cur = AGENTS.find(x => x.id === a.id); if (cur) Object.assign(cur, { name: a.name, role: a.role, does: a.does, tools: a.tools, brief: a.brief }); }
  if (r.problems.join() !== roster.problems.join()) for (const w of r.problems) console.warn('agents:', w);
  Object.assign(roster, { problems: r.problems, customised: r.customised, briefed: r.briefed, files: r.files });
}
const refreshSkills = () => { reloadRoster(); const s = loadSkills(BRAIN, AGENTS); if (s.problems.join() !== skills.problems.join()) for (const w of s.problems) console.warn('skills:', w); skills = s; return s; };
const leadOf = dept => AGENTS.find(a => a.department === dept && a.lead) || AGENTS.find(a => a.department === dept);
// a handover to a department lead that says "as a team" runs as a team: the lead splits it across the desks (same as TEAM in the bar)
const teamFor = (agentId, text) => { const a = AGENTS.find(x => x.id === agentId); return TEAMS.enabled && a && a.lead && teams.intent(text) ? { lead: a.id, asked: 'text' } : undefined; };
const setupMap = () => Object.fromEntries(DEPT_KEYS.map(k => [k, onboard.isSetUp(AGENTS, skills, k)]));

let backend = 'claude-cli', sdk = null;
if (process.env.ANTHROPIC_API_KEY) {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    sdk = new Anthropic(); backend = 'anthropic-sdk';
  } catch (e) { console.warn('SDK not installed (npm install @anthropic-ai/sdk) — using the Claude CLI:', e.message.split('\n')[0]); }
}

/* ---------- storage ---------- */
const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } };
const save = list => { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(list, null, 2)); };
const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
/* ---------- the usage gauge (V3.6, A3): Claude's own numbers, the office's count underneath ---------- */
const USTATE = usage.loadState(DATA);
let usageCache = { at: 0, value: null, stale: true };
async function getUsage(force) {
  if (!force && !usageCache.stale && usageCache.value && Date.now() - usageCache.at < 60000) return usageCache.value;
  const u = await usage.fetchUsage();
  const v = u.ok ? { ...u, office: usage.fallback(USTATE).window } : { ...usage.fallback(USTATE), reason: u.reason };
  usageCache = { at: Date.now(), value: v, stale: false };
  return v;
}
function bumpUsage(u) { if (!u) return; Object.assign(USTATE, usage.record(USTATE, u)); usage.saveState(DATA, USTATE); usageCache.stale = true; }
// every Claude run the office starts: one row in data/tokens.jsonl (desk, department, routine, what kind of run) and onto the task it was for.
// job: { task, kind, agent, dept, mode } — kind names the run (task, piece, lead, plan, route, chat, chief, motion, upload, …), mode the pass (draft, revise, answer, approve)
function spent(job = {}, r) {
  if (!r) return;
  const t = job.task, agent = job.agent || t?.agent;
  const row = tokens.record(DATA, { kind: job.kind || (t ? 'task' : 'other'), task: t?.id, agent, dept: job.dept || t?.dept || AGENTS.find(a => a.id === agent)?.department, routine: t?.routine, mode: job.mode, ...r });
  if (t) tokens.addTo(t, row);
}
const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/* ---------- V3.7: document upload — a dropped file becomes a brain note, so agents read it the same
   way they read anything else (relevantNotes(), no new plumbing). Agents get no file tools, so the
   text has to already be in the note by the time a task runs.
   V3.8: images (and scanned/text-thin PDFs) go through a one-off vision call instead of OCR — Claude
   actually looks at the thing and writes a real digest (what it says, what it shows, what it's
   evidence of), not just a transcript. ---------- */
const IMAGE_MEDIA = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
const VISION_PROMPT = "Digest this for someone's personal work record. Transcribe all visible text, numbers and labels exactly, in full. Describe any charts, tables, screenshots or visual structure — what they show, not just that they exist. If it looks like evidence of something (a result, a metric, a message, a certificate, a review), say plainly what it's evidence of. Be thorough and literal: this write-up is the only record of what's in the file — nothing else will ever look at the original again.";
function visionDigest(block) {
  const msg = JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: VISION_PROMPT }, block] } });
  const env = mcp.freshEnv(); delete env.CLAUDECODE;
  return new Promise((resolve, reject) => {
    const p = spawn(mcp.resolveBin(), ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--no-session-persistence', // its cost goes to data/tokens.jsonl, not a transcript
      '--disallowedTools', 'Bash,Edit,Write,Read,Glob,Grep,Agent,NotebookEdit,Task,WebFetch,WebSearch', '--model', modelId('sonnet')],
      { cwd: CLI_CWD, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', text = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('vision digest took too long')); }, 120000);
    const feed = line => { if (!line.trim()) return; let j; try { j = JSON.parse(line); } catch { return; } if (j.type === 'result') { text = String(j.result || '').trim(); spent({ kind: 'upload' }, tokens.fromResult(j)); } };
    p.stdout.on('data', d => { out += d; let i; while ((i = out.indexOf('\n')) >= 0) { feed(out.slice(0, i)); out = out.slice(i + 1); } });
    p.stderr.on('data', d => { err += d; });
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => { clearTimeout(timer); if (text) resolve(text); else reject(new Error(err.trim() || `vision digest exited ${code}`)); });
    fs.mkdirSync(CLI_CWD, { recursive: true });
    p.stdin.write(msg + '\n'); p.stdin.end();
  });
}
const ANYDOC_EXT = new Set(['.docx', '.doc', '.docm', '.pptx', '.ppt', '.xlsx', '.xls', '.xlsm', '.odt', '.ods', '.odp', '.rtf', '.epub', '.csv']);
// A zip is opened in memory and every file inside is digested the same way a single upload is, then joined into one note with a heading per file.
// Limits keep one zip from running away: 80 files, 40 MB per file, 300 MB unpacked, 12 images or scans sent to vision, 60,000 characters per file.
const ZIP_LIMITS = { files: 80, fileBytes: 40 * 1024 * 1024, totalBytes: 300 * 1024 * 1024, vision: 12, chars: 60000 };
async function extractZip(buf, depth = 0) {
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files).filter(e => !e.dir && !/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|~\$)/.test(e.name) && !/(^|\/)\./.test(e.name));
  const parts = [], skipped = []; let total = 0, vision = 0, read = 0;
  for (const e of entries) {
    if (read >= ZIP_LIMITS.files) { skipped.push(`${e.name} (more than ${ZIP_LIMITS.files} files)`); continue; }
    const ext = path.extname(e.name).toLowerCase(), size = e._data?.uncompressedSize || 0;
    if (size > ZIP_LIMITS.fileBytes) { skipped.push(`${e.name} (over 40 MB)`); continue; }
    if (total + size > ZIP_LIMITS.totalBytes) { skipped.push(`${e.name} (zip is over 300 MB unpacked)`); continue; }
    if (ext === '.zip' && depth >= 1) { skipped.push(`${e.name} (a zip inside a zip inside a zip)`); continue; }
    const isVision = !!IMAGE_MEDIA[ext];
    if (isVision && vision >= ZIP_LIMITS.vision) { skipped.push(`${e.name} (image limit of ${ZIP_LIMITS.vision} reached)`); continue; }
    let data; try { data = Buffer.from(await e.async('uint8array')); } catch (er) { skipped.push(`${e.name} (could not unpack: ${er.message})`); continue; }
    total += data.length; read++; if (isVision) vision++;
    let txt; try { txt = ext === '.zip' ? await extractZip(data, depth + 1) : await extractText(e.name, data); } catch (er) { skipped.push(`${e.name} (could not read: ${er.message})`); continue; }
    if (txt === null) { skipped.push(`${e.name} (${ext || 'no extension'} is not a supported type)`); continue; }
    txt = String(txt).trim(); if (!txt) { skipped.push(`${e.name} (no readable text)`); continue; }
    if (txt.length > ZIP_LIMITS.chars) txt = txt.slice(0, ZIP_LIMITS.chars) + `${String.fromCharCode(10)}[…cut here: ${txt.length - ZIP_LIMITS.chars} more characters of this file are not in the note]`;
    parts.push(`## ${e.name}${String.fromCharCode(10, 10)}${txt}`);
  }
  const NL = String.fromCharCode(10), head = `This zip held ${entries.length} file${entries.length === 1 ? '' : 's'}; ${parts.length} read into this note${skipped.length ? ', ' + skipped.length + ' skipped' : ''}.` + (skipped.length ? NL + 'Skipped:' + NL + skipped.map(x => '- ' + x).join(NL) : '');
  return parts.length ? head + NL + NL + parts.join(NL + NL) : (skipped.length ? head : null);
}
async function extractText(filename, buf) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.zip') return extractZip(buf);
  if (ext === '.txt' || ext === '.md') return buf.toString('utf8');
  if (IMAGE_MEDIA[ext]) return visionDigest({ type: 'image', source: { type: 'base64', media_type: IMAGE_MEDIA[ext], data: buf.toString('base64') } });
  if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    const pdfText = result.text.trim();
    const pages = result.total || result.pages?.length || 1;
    await parser.destroy();
    // a real, complete text layer is cheap and exact — but pdf-parse can silently stop partway through
    // a multi-page or multi-column PDF (a two-column CV, say), so don't trust a short result just because
    // it cleared the noise floor: it has to be plausible for the page count too, or go to vision instead.
    if (pdfText.length > 200 && pdfText.length > pages * 400) return pdfText;
    return visionDigest({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } }); // scanned/image-only PDF
  }
  if (ANYDOC_EXT.has(ext)) {
    // keyless, offline: ocr stays 'reject' so nothing is ever sent to Firecrawl
    try { const md = (await toMarkdownBytes(new Uint8Array(buf), ext === '.csv' ? 'csv' : undefined)).trim(); if (md) return md; } catch (e) { if (ext !== '.docx') throw e; }
    if (ext === '.docx') return (await mammoth.extractRawText({ buffer: buf })).value; // fallback if anydoc fails or comes back empty
  }
  return null;
}

/* ---------- ask Claude ---------- */
// askX → { text, tools }: tools = the MCP/web tools the agent actually called (for the office to
// light up). On the CLI the agent gets --allowedTools = every connected server the config allows
// (+ web); file tools, Bash and sub-agents stay off — the office is not a coding session.
// the model the agent's turn ran on: a --chrome run (V3.2 (16 Sep)) also reports a small Haiku helper call in modelUsage, so the first key is not the answer —
// prefer the key of the family we asked for, else the biggest non-Haiku talker
function ranOn(mu, want) {
  const keys = Object.keys(mu || {}); if (!keys.length) return null;
  const fam = normModel(want) || cfg.model;
  return keys.find(k => k.includes(fam)) || keys.filter(k => !/haiku/.test(k)).sort((a, b) => (mu[b].outputTokens || 0) - (mu[a].outputTokens || 0))[0] || keys[0];
}
async function askX(system, user, { maxTokens = 4000, tools = true, timeout = RUN_TIMEOUT, model = cfg.model, effort = null, job } = {}) { // model: sonnet · opus · fable · effort: low…max or null = the model's own (src/models.js) · job: what the run is for (spent())
  if (sdk) {
    const res = await sdk.messages.create({ model: modelId(model), max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
    if (res.stop_reason === 'refusal') throw new Error('Claude declined this request');
    bumpUsage(res.usage); spent(job, tokens.fromApi(res.usage, res.model));
    return { text: res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim(), tools: [], usage: res.usage, modelId: res.model };
  }
  fs.mkdirSync(CLI_CWD, { recursive: true });
  const allowed = tools ? mcp.allowedTools() : [];
  // The system prompt carries the notes, so with a long uploaded document it can pass Windows' ~32k command-line limit
  // (spawn ENAMETOOLONG). Hand it over as a file instead of an argument.
  const sysFile = path.join(CLI_CWD, `system-${nid()}.txt`); fs.writeFileSync(sysFile, system);
  const rmSys = () => fs.rm(sysFile, { force: true }, () => {});
  const bigUser = String(user).length > 12000; // a team lead's final step carries every piece: over ~32k characters the command line fails, so it goes in on stdin
  const args = ['-p', ...(bigUser ? [] : [user]), '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--system-prompt-file', sysFile,
    '--disallowedTools', ['Bash,Edit,Write,Read,Glob,Grep,Agent,NotebookEdit,Task' + (allowed.includes('WebFetch') ? '' : ',WebFetch,WebSearch'), ...mcp.blockedTools()].join(',')]; // V3.9: never the email send tools
  if (allowed.length) args.push('--allowedTools', allowed.join(','));
  args.push(...(tools ? mcp.cliArgs() : ['--no-chrome'])); // V3.2 (16 Sep): the owner's Chrome, when tools.browser is on
  args.push(...modelArgs(model, effort));
  const env = mcp.freshEnv(); delete env.CLAUDECODE; // the CLI refuses to nest inside another Claude Code session
  return new Promise((resolve, reject) => {
    const p = spawn(mcp.resolveBin(), args, { cwd: CLI_CWD, env, stdio: [bigUser ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    if (bigUser) { p.stdin.on('error', () => {}); p.stdin.end(String(user)); }
    let out = '', err = '', text = '', used = [], gotResult = false, usageOut = null, modelUsed = null, ran = null; const partial = []; // partial: every piece of text the agent has written so far, so a run that is stopped does not lose its work
    const stopped = msg => { const e = new Error(msg); e.partial = partial.join(String.fromCharCode(10, 10)).trim(); e.used = used; return e; };
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(stopped(`Claude took longer than ${timeout / 1000} s`)); }, timeout);
    const feed = line => {
      if (!line.trim()) return;
      let j; try { j = JSON.parse(line); } catch { return; }
      if (j.type === 'system' && j.subtype === 'init') mcp.fromInit(j);
      if (j.type === 'assistant' && j.message?.content) for (const b of j.message.content) { if (b.type === 'tool_use' && b.name && !used.includes(b.name)) used.push(b.name); if (b.type === 'text' && String(b.text || '').trim()) partial.push(String(b.text).trim()); }
      if (j.type === 'result') { gotResult = true; text = String(j.result || '').trim(); if (j.is_error && !text) text = ''; usageOut = j.usage || null; modelUsed = ranOn(j.modelUsage, model); ran = tokens.fromResult(j, modelUsed); }
    };
    p.stdout.on('data', d => { out += d; let i; while ((i = out.indexOf('\n')) >= 0) { feed(out.slice(0, i)); out = out.slice(i + 1); } });
    p.stderr.on('data', d => { err += d; });
    p.on('error', e => { clearTimeout(timer); rmSys(); reject(new Error(e.code === 'ENOENT' ? 'Claude Code is not installed (claude not found on PATH)' : e.message)); });
    p.on('close', code => {
      clearTimeout(timer); rmSys(); feed(out);
      if (code !== 0 && !gotResult) return reject(stopped(`claude exited ${code}${err ? ': ' + err.trim().slice(0, 300) : ''}`));
      if (!gotResult) { try { text = String(JSON.parse(out).result || '').trim(); } catch { text = out.trim(); } }
      bumpUsage(usageOut); spent(job, ran);
      resolve({ text, tools: used, usage: usageOut, modelId: modelUsed });
    });
  });
}
const ask = async (system, user, opts) => (await askX(system, user, { tools: false, ...opts })).text;
// the same, labelled for the token ledger, for modules that are handed a function to call
const askLesson = (system, user, opts) => ask(system, user, { ...opts, job: { kind: 'lesson' } });
const askInterview = (system, user, opts) => ask(system, user, { ...opts, job: { kind: 'interview' } });

/* ---------- the Chief of Staff (assistant.mjs): one conversation for the side panel and Telegram ---------- */
const OFFICE_TOOLS = ['office_overview', 'office_list_tasks', 'office_get_task', 'office_add_task', 'office_routines', 'office_run_routine', 'office_agents', 'office_content_week', 'office_brain_search', 'office_brain_read'];
const TOOL_WORDS = { office_overview: 'looking at the office', office_list_tasks: 'checking the board', office_get_task: 'reading a task', office_add_task: 'adding a task', office_routines: 'checking the timetable', office_run_routine: 'starting a routine', office_agents: 'checking who does what', office_content_week: 'opening the content calendar', office_brain_search: 'searching your notes', office_brain_read: 'reading a note' };
// Claude Code with ONE tool server and nothing else: no shell, no files, no web, no connectors. It can only use the ten office actions above.
async function askAssistant(system, user, { onEvent = () => {}, timeout = 240000, model = 'opus', effort = 'medium' } = {}) {
  fs.mkdirSync(CLI_CWD, { recursive: true });
  const id = nid(), sysFile = path.join(CLI_CWD, `asst-${id}.txt`), mcpFile = path.join(CLI_CWD, `asst-${id}.mcp.json`);
  fs.writeFileSync(sysFile, system);
  fs.writeFileSync(mcpFile, JSON.stringify({ mcpServers: { 'office-control': { command: process.execPath, args: [path.join(ROOT, 'connectors', 'office-control', 'mcp.mjs')], env: { OFFICE_URL: `http://127.0.0.1:${cfg.port || 4520}`, OFFICE_ROOT: ROOT, OFFICE_BRAIN: BRAIN } } } }));
  const rm = () => { for (const f of [sysFile, mcpFile]) fs.rm(f, { force: true }, () => {}); };
  const args = ['-p', user, '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--system-prompt-file', sysFile, '--mcp-config', mcpFile, '--strict-mcp-config',
    '--allowedTools', 'mcp__office-control', '--disallowedTools', 'Bash,Edit,Write,Read,Glob,Grep,Agent,NotebookEdit,Task,WebFetch,WebSearch', '--no-chrome', ...modelArgs(model, effort)];
  const env = mcp.freshEnv(); delete env.CLAUDECODE;
  return new Promise((resolve, reject) => {
    const p = spawn(mcp.resolveBin(), args, { cwd: CLI_CWD, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', text = '', ok = false; const used = [];
    const timer = setTimeout(() => { p.kill('SIGKILL'); rm(); reject(new Error(`took longer than ${timeout / 1000} s`)); }, timeout);
    const feed = line => {
      if (!line.trim()) return; let j; try { j = JSON.parse(line); } catch { return; }
      if (j.type === 'assistant' && j.message?.content) for (const b of j.message.content) if (b.type === 'tool_use' && b.name) { const n = b.name.replace(/^mcp__office-control__/, ''); if (!used.includes(n)) used.push(n); onEvent({ t: 'tool', name: n, words: TOOL_WORDS[n] || n, input: n === 'office_add_task' ? { dept: b.input?.dept } : undefined }); }
      if (j.type === 'result') { ok = true; text = String(j.result || '').trim(); spent({ kind: 'chief' }, tokens.fromResult(j, ranOn(j.modelUsage, model))); }
    };
    p.stdout.on('data', d => { out += d; let i; while ((i = out.indexOf('\n')) >= 0) { feed(out.slice(0, i)); out = out.slice(i + 1); } });
    p.stderr.on('data', d => { err += d; });
    p.on('error', e => { clearTimeout(timer); rm(); reject(new Error(e.code === 'ENOENT' ? 'Claude Code is not installed (claude not found on PATH)' : e.message)); });
    p.on('close', code => { clearTimeout(timer); rm(); feed(out); if (!ok && code !== 0) return reject(new Error(`claude exited ${code}${err ? ': ' + err.trim().slice(0, 300) : ''}`)); resolve({ text, used }); });
  });
}
/* ---------- Motion Studio (motion.mjs): the Motion Director, the second conversation in the side panel ---------- */
const MOTION_WORDS = { brain_search: 'searching the Brain', brain_read: 'reading a Brain note', ToolSearch: 'opening the studio', motion_series: 'reading the series brief and the reels', motion_preview: 'painting stills', motion_draft: 'drafting every frame', motion_job: 'watching the render', motion_final: 'rendering the final', motion_narrate: 'voicing the narration', motion_source: 'reading the source', motion_list: 'checking the studio', motion_cancel: 'cancelling a render' };
// Claude Code with ONE tool server (connectors/motion-studio): no shell, no files, no web. Always Opus 5.5 at extra-high effort.
async function askMotion(system, user, { onEvent = () => {}, timeout = 100 * 60000 } = {}) {
  fs.mkdirSync(CLI_CWD, { recursive: true });
  const id = nid(), sysFile = path.join(CLI_CWD, `motion-${id}.txt`), mcpFile = path.join(CLI_CWD, `motion-${id}.mcp.json`);
  fs.writeFileSync(sysFile, system);
  fs.writeFileSync(mcpFile, JSON.stringify({ mcpServers: { 'motion-studio': { command: process.execPath, args: [path.join(ROOT, 'connectors', 'motion-studio', 'mcp.mjs')] } } }));
  const rm = () => { for (const f of [sysFile, mcpFile]) fs.rm(f, { force: true }, () => {}); };
  const args = ['-p', user, '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--system-prompt-file', sysFile, '--mcp-config', mcpFile, '--strict-mcp-config',
    '--allowedTools', 'mcp__motion-studio', '--disallowedTools', 'Bash,Edit,Write,Read,Glob,Grep,Agent,NotebookEdit,Task,WebFetch,WebSearch', '--no-chrome', '--model', motionMod.MODEL, '--effort', motionMod.EFFORT];
  const env = mcp.freshEnv(); delete env.CLAUDECODE;
  return new Promise((resolve, reject) => {
    const p = spawn(mcp.resolveBin(), args, { cwd: CLI_CWD, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', text = '', ok = false; const used = [], shown = new Set();
    const timer = setTimeout(() => { p.kill('SIGKILL'); rm(); reject(new Error(`took longer than ${timeout / 60000} minutes`)); }, timeout);
    const feed = line => {
      if (!line.trim()) return; let j; try { j = JSON.parse(line); } catch { return; }
      if (j.type === 'assistant' && j.message?.content) for (const b of j.message.content) {
        if (b.type === 'tool_use' && b.name) { const n = b.name.replace(/^mcp__motion-studio__/, ''); if (!used.includes(n)) used.push(n); onEvent({ t: 'tool', name: n, words: MOTION_WORDS[n] || n }); }
        if (b.type === 'text' && String(b.text || '').trim()) onEvent({ t: 'note', text: String(b.text).trim().slice(0, 400) });
      }
      if (j.type === 'user' && j.message?.content) for (const b of [].concat(j.message.content)) if (b.type === 'tool_result') { // contact sheets and videos as they are made
        const txt = [].concat(b.content || []).map(c => typeof c === 'string' ? c : c.type === 'text' ? c.text : '').join('\n');
        for (const m of motionMod.mediaIn(txt, ROOT)) if (!shown.has(m)) { shown.add(m); onEvent({ t: 'media', file: m, url: '/api/motion/file?p=' + encodeURIComponent(m) }); }
      }
      if (j.type === 'result') { ok = true; text = String(j.result || '').trim(); spent({ kind: 'motion' },tokens.fromResult(j, ranOn(j.modelUsage, motionMod.MODEL))); }
    };
    p.stdout.on('data', d => { out += d; let i; while ((i = out.indexOf('\n')) >= 0) { feed(out.slice(0, i)); out = out.slice(i + 1); } });
    p.stderr.on('data', d => { err += d; });
    p.on('error', e => { clearTimeout(timer); rm(); reject(new Error(e.code === 'ENOENT' ? 'Claude Code is not installed (claude not found on PATH)' : e.message)); });
    p.on('close', code => { clearTimeout(timer); rm(); feed(out); if (!ok && code !== 0) return reject(new Error(`claude exited ${code}${err ? ': ' + err.trim().slice(0, 300) : ''}`)); resolve({ text, used }); });
  });
}
let motionBusy = false;
// The render worker belongs to the office while a motion turn runs: a worker started from inside a Claude run did not survive there,
// so every 10 s, if a job is waiting and no worker is alive, the office starts one (detached, its errors in data/motion/worker.err.log).
let motionShared = null;
async function keepMotionWorker() {
  try {
    motionShared ||= await import('./connectors/motion-studio/shared.mjs');
    if (motionShared.workerAlive() || !motionShared.listJobs().some(j => j.state === 'queued')) return;
    const err = fs.openSync(path.join(motionShared.DATA, 'worker.err.log'), 'a');
    spawn(process.execPath, [motionShared.WORKER], { detached: true, windowsHide: true, stdio: ['ignore', err, err], cwd: ROOT }).unref();
  } catch (e) { console.warn('motion worker:', e.message); }
}
async function motionTurn(text, onEvent) {
  const a = motionMod.append(DATA, { who: 'user', text });
  const system = motionMod.buildSystem({ root: ROOT, now: new Date().toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) });
  const user = motionMod.transcript(a.slice(0, -1)) + (a.length > 1 ? '\n' : '') + `Wesley: ${text}\nYou:`;
  const keep = setInterval(keepMotionWorker, 10000);
  let r;
  try { r = await askMotion(system, user, { onEvent }); }
  catch (e) { // a turn that stops (time limit, crash) still leaves Wesley a note in the tab, naming the draft to carry on from
    clearInterval(keep);
    const last = (motionShared?.listJobs() || []).filter(j => j.mode === 'draft' && j.state === 'done').pop();
    const note = `I stopped before finishing (${e.message}).${last ? ` The latest draft is ${last.id}${last.critique?.min != null ? `: lowest frame ${last.critique.min}/10, overall ${last.critique.overall}` : ''}.` : ''} Say "carry on" and I will pick up from there.`;
    motionMod.append(DATA, { who: 'assistant', text: note, tools: [] });
    throw new Error(note);
  }
  clearInterval(keep);
  const reply = r.text || 'The studio stopped without an answer. Try again.';
  const media = motionMod.mediaIn(reply, ROOT).map(f => ({ file: f, url: '/api/motion/file?p=' + encodeURIComponent(f) }));
  motionMod.append(DATA, { who: 'assistant', text: reply, tools: r.used, media });
  return { reply, tools: r.used, media };
}
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
// the assistant can start work, so a web page you happen to have open must not be able to talk to it: same-machine pages only (or a host you list in office.config.json "assistant.allowHosts")
const assistantAllowed = req => { const host = String(req.headers.host || ''), extra = Array.isArray(cfg.assistant?.allowHosts) ? cfg.assistant.allowHosts : []; if (!LOCAL_HOST.test(host) && !extra.includes(host)) return false; const o = req.headers.origin; if (!o) return true; try { const u = new URL(o); return LOCAL_HOST.test(u.host) || extra.includes(u.host); } catch { return false; } };
let assistantBusy = false, assistantEmit = null; // assistantEmit: the open panel conversation, so a task the Chief of Staff adds can show up as a chip at once
const attachNote = list => (Array.isArray(list) ? list : []).slice(0, 6).map(a => ({ note: String(a?.note || '').replace(/[\r\n`]/g, ' ').trim().slice(0, 140), filename: String(a?.filename || '').replace(/[\r\n`]/g, ' ').trim().slice(0, 120) })).filter(a => /^Upload - /.test(a.note))
  .map(a => `\n[Attached by Wesley: "${a.filename || a.note}" is in the Brain as the note \`${a.note}\`. Name that note, in backticks, inside the text of any task you add about it, so the desk reads it.]`).join('');
async function assistantTurn(text, surface, onEvent) {
  const a = assistantMod.append(DATA, { who: 'user', text, surface });
  const roster = AGENTS.map(x => `- ${x.id} · ${x.name} · ${x.department}${x.lead ? ' (lead)' : ''} · ${String(x.does || '').slice(0, 110)}`).join('\n');
  const system = assistantMod.buildSystem({ business: cfg.name, now: new Date().toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), surface, roster });
  const m = modelFor({ agent: cfg.assistant?.model || 'opus', office: cfg.model }).model;
  const user = assistantMod.transcript(a.slice(0, -1)) + (a.length > 1 ? '\n' : '') + `Wesley${surface === 'telegram' ? ' (on Telegram)' : ''}: ${text}\nYou:`;
  const r = await askAssistant(system, user, { onEvent, model: m, effort: effortFor({ agent: cfg.assistant?.effort || 'medium', office: cfg.effort, model: m }).effort });
  const reply = r.text || 'I could not put an answer together. Try again.';
  assistantMod.append(DATA, { who: 'assistant', text: reply, surface, tools: r.used });
  return { reply, tools: r.used };
}
function parseJSON(text) {
  const s = text.replace(/```json|```/g, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return JSON.parse(s.slice(a, b + 1));
}

/* ---------- the brain: graph + context ---------- */
let graph = { notes: 0, nodes: [], links: [], floor: [] };
async function rebuildGraph() {
  try { graph = await layoutGraph(BRAIN); } catch (e) { console.warn('brain graph failed:', e.message); }
  return graph;
}
function vaultIndex() { // name → text (vault notes + live office notes)
  const { notes } = readVault(BRAIN); const m = new Map();
  for (const [name, n] of notes) m.set(name, n.text);
  for (const n of readOfficeNotes(BRAIN)) m.set(n.name, n.text);
  return m;
}
function businessContext(index) {
  const bits = [];
  for (const k of ['CLAUDE', 'index', 'business-model', 'voice']) if (index.has(k)) bits.push(`--- ${k}.md ---\n${index.get(k).slice(0, 1200)}`);
  return bits.join('\n\n');
}
// An uploaded document (a note named "Upload - …") is the thing the owner wants read, so it gets far more room
// than an ordinary note: 1,800 characters is about one page, and a proposal or contract is many.
const UPLOAD_CAP = 180000; // about 45,000 tokens: a long transcript or a zip of reports is read whole by the agent doing the task
const WHOLE_NOTE = 5000; // an ordinary note up to this long is given to the agent in full
const isUpload = name => String(name).startsWith('Upload - ');
// the notes an agent would read for this task: name/word overlap, department MOC first
const PIN_CAP = 9000; // a note the task or the agent's skills name outright is shown up to this length (pins.mjs)
function relevantNotes(index, dept, text, n = 4, agent = null) {
  const pinned = pinnedNotes(index.keys(), isUpload, text, agent ? skills.promptText(agent) || '' : '');
  const picks = relevantNotesBase(index, dept, text, n);
  const all = [...pinned, ...picks.filter(p => !pinned.includes(p))]; all.pinned = new Set(pinned);
  return all;
}
function relevantNotesBase(index, dept, text, n = 4) {
  const words = new Set(String(text).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3));
  const mocName = { emails: 'MOC-Emails', sales: 'MOC-Sales', marketing: 'MOC-Marketing', ops: 'MOC-Operations', fin: 'MOC-Finance', delivery: 'MOC-Delivery' }[dept];
  const scored = [];
  for (const [name, txt] of index) {
    if (['CLAUDE', 'index', 'log'].includes(name)) continue;
    const hay = (name + ' ' + txt.slice(0, isUpload(name) ? UPLOAD_CAP : 1500)).toLowerCase(); // an upload is matched on its whole text, not just the first page
    let s = 0; for (const w of words) if (hay.includes(w)) s += name.toLowerCase().includes(w) ? 3 : 1;
    if (name === mocName) s += 2;
    if (s) scored.push([s, name]);
  }
  // a task that names an uploaded file ("Read X.jpeg (just uploaded)") gets that upload first: word overlap alone lets long transcripts outrank a short image note
  const lower = String(text).toLowerCase();
  const named = [...index.keys()].filter(isUpload).filter(nm => { const base = nm.slice(9).replace(/ - [a-z0-9]+$/, '').toLowerCase(); return base.length > 4 && lower.includes(base); });
  for (const nm of named) { const e = scored.find(x => x[1] === nm); if (e) e[0] += 1e6; else scored.push([1e6, nm]); }
  scored.sort((a, b) => b[0] - a[0]);
  const picks = scored.slice(0, Math.max(n, named.length)).map(x => x[1]);
  if (mocName && index.has(mocName) && !picks.includes(mocName)) picks.push(mocName);
  return picks;
}
function contextText(index, names) {
  return names.map(n => {
    let txt = index.get(n) || '';
    if (!isUpload(n)) txt = txt.split('\n').filter(l => !/\bnotion\b/i.test(l)).join('\n'); // Notion is retired: old task notes still mention it, and agents kept acting on those lines
    const cap = isUpload(n) ? UPLOAD_CAP : names.pinned?.has(n) ? PIN_CAP : txt.length <= WHOLE_NOTE ? txt.length : 1800; // a short note is shown whole: billing.md's Outstanding section sits near the end and was being cut off
    return `--- ${n}.md ---\n${txt.slice(0, cap)}${txt.length > cap ? `\n[…the note continues: ${txt.length - cap} more characters not shown. Open the whole note with the brain_read tool: note "${n}"]` : ''}`;
  }).join('\n\n');
}

/* ---------- the roster, as Claude sees it ---------- */
const persona = a => `${a.name}${a.lead ? ' (lead)' : ''} · ${a.role} · ${a.does}`;
function rosterText(dept) { return AGENTS.filter(a => a.department === dept).map(a => { const sk = skills.names(a); return `- ${a.id} · ${persona(a)}${sk.length ? ' · skills: ' + sk.join(', ') : ''}`; }).join('\n'); }
// what an agent is told about itself: the job, the owner's standing instructions, the skills it follows
function agentBrief(a) {
  const lessons = learn.promptText(BRAIN, a);
  return (a.brief ? `\nSTANDING INSTRUCTIONS FROM THE OWNER\n${a.brief}\n` : '') + (skills.promptText(a) ? `\n${skills.promptText(a)}\n` : '') + (lessons ? `\n${lessons}\n` : '');
}
const toolKeys = names => [...new Set(names.map(n => /^mcp__/.test(n) ? mcp.keyOf(n) : n === 'WebSearch' || n === 'WebFetch' ? 'web' : null).filter(Boolean))];
async function route(dept, text) {
  const d = DEPTS[dept]; refreshSkills();
  const system = `You are the router for ${cfg.name}, a business whose departments are run by AI agents. ` +
    'Pick the single best agent for the owner\'s request — an agent whose skills match the request is the right one — and return ONLY a JSON object — no prose, no code fences.';
  const user = `Department: ${d.name}\nAgents (id · name · role · what they do):\n${rosterText(dept)}\n\nOwner's request: "${text}"\n\n` +
    'Return: {"agent":"<id from the list>","title":"<clean imperative task title, max 70 characters>","plan":["<step>","<step>","<step>"],"eta_minutes":<integer>,"why":"<one short sentence>","needs_ok":<true if doing this involves sending, posting, paying, deleting or changing anything outside this machine; false if it only reads and reports>,"channel":"<email if the outbound step is an email or a reply to one; post, payment or change for the others; none when it only reads>"}';
  const j = parseJSON(await ask(system, user, { maxTokens: 800, timeout: 150000, model: 'sonnet', job: { kind: 'route', dept } })); // routing is a one-line JSON job: always Sonnet
  const valid = AGENTS.find(a => a.id === j.agent && a.department === dept);
  const agent = valid ? valid.id : (AGENTS.find(a => a.department === dept && a.lead) || AGENTS.find(a => a.department === dept)).id;
  return { agent, title: String(j.title || text).slice(0, 90), plan: Array.isArray(j.plan) ? j.plan.slice(0, 4).map(String) : [],
    eta: Number.isFinite(j.eta_minutes) ? j.eta_minutes : 30, why: String(j.why || ''), needsOk: typeof j.needs_ok === 'boolean' ? j.needs_ok : routines.guessNeedsOk(text), channel: ['email', 'post', 'payment', 'change', 'none'].includes(j.channel) ? j.channel : '' };
}
// agents have no file tools, so a task that names a file on the owner's computer used to fail and leave a "capability gap".
// The office already turns an uploaded file into a note (extractText, /api/upload) and Drive files are readable, so say so.
const FILES_LINE = 'FILES\nA Brain note that is cut off or not in front of you can be opened in full with the brain_read tool (brain_search finds it): try that before saying you could not open it. You cannot open files on the owner\'s computer. If a task depends on one (a PDF, a document, an image), say so in one line and ask the owner to drop it into the office\'s upload box, where it becomes a note called "Upload - <file name>" that you can read, or to save it in Google Drive, where you can read it with the Drive tool. Do not ask for a file path and do not try to open one.';
// Wesley's standing rule: anything made for his review lands at the top level of his My Drive, where he reviews and files it himself
const DRIVE_RULE = 'WHERE FILES LAND\nEvery new file you create in Google Drive for Wesley (a Doc, Sheet, PDF or Word file) goes in the top level of his own My Drive. Do not pass a parent folder, do not search for or pick a client folder, and never create a file in a shared drive. He reviews each one and files it himself. The only exception is a task that names the exact folder itself. Editing a file that already exists leaves it where it is.';
// Every seat may end its result with one line suggesting who should take the next step. It costs about 40 tokens; the owner decides (HAND OVER on the review card).
const NEXT_LINE = 'NEXT STEP (optional)\nIf another seat should take the next step on what you have written, end with one last line: NEXT: <seat id or name> — <what it should do>. Leave it out when nothing follows.';
const usesDrive = a => (a.tools || []).some(t => /drive|sheet|docs/i.test(String(t)));
// the system prompt every agent run starts from: who it is, its brief, skills and lessons, its tools, the company, the notes for this task
function agentSystem(a, index, read, { extra = '', words = 260 } = {}) {
  const d = DEPTS[a.department];
  return `You are ${a.name}, ${a.role || 'an agent'}, in the ${d.name} department of ${cfg.name}. ${a.does}\n${agentBrief(a)}` + (BRAIN_WRITE ? `\n${brainnotes.INSTRUCTIONS}\n` : '') + (siteDesk(a) ? `\n${siteupdates.instructions(SITE_URL)}\n` : '') + (/HANDOFF/.test(agentBrief(a)) ? `\n${handoff.INSTRUCTIONS}\n` : '') + (usesDrive(a) ? `\n${DRIVE_RULE}\n` : '') + `\n${NEXT_LINE}\n` + `\n${FILES_LINE}\n` + (extra ? `\n${extra}\n` : '') +
    'Write the finished deliverable itself, not a description of what you would do. Plain text: a short heading, then short sections or bullets. ' +
    `At most ${words} words unless a skill or the owner\'s instructions set a different shape — those win. No preamble, no sign-off. Ground it in the company notes below; where a fact is missing, make a reasonable assumption and mark it (assumed). ` +
    'If you used a tool, say so in one line at the end ("Used: Gmail — searched the client thread").\n\n' +
    `${mcp.promptText(a.tools)}\n\nCOMPANY NOTES\n${businessContext(index)}\n\nNOTES YOU READ FOR THIS TASK\n${contextText(index, read)}`;
}
// V3.9: an email task — the router said so, or the words do (a routine written before the router named channels)
const isEmail = task => task.channel ? task.channel === 'email' : /\b(e-?mails?|reply|replies|respond|inbox|gmail|follow[- ]?up message)\b/i.test(task.title + ' ' + task.text + ' ' + String(task.draft || '').slice(-400));
const EMAIL_DRAFT = '\nThis is an email. Do NOT create anything in Gmail yet and never send: write the email here in full — To, Cc if any, Subject, then the body exactly as it would go. End with one line: "When approved, this goes into your Gmail drafts: <subject> to <recipient>."';
const EMAIL_APPROVE = task => `\nThe owner has APPROVED the email below. Put it in the owner's Gmail as a DRAFT now (create_draft; keep a reply in its thread when the tool allows), worded exactly as approved. Do NOT send it: sending is switched off for you and the owner sends it from their own inbox. If Gmail is not connected, say so and show the email. Then report in two lines: the draft's subject and recipient, and that it is waiting in Gmail drafts for the owner to send.\nApproved email:\n${task.draft || task.result}`;
const modeLineFor = (mode, task) => mode === 'draft' && isEmail(task) ? EMAIL_DRAFT : mode === 'approve' && isEmail(task) ? EMAIL_APPROVE(task) : mode === 'draft' ? '\nPrepare everything, but send, post, pay or change NOTHING outside this machine: the owner reads this first and approves it. End with one line saying exactly what will go out when approved (or that nothing needs to).'
  : mode === 'approve' ? `\nThe owner has APPROVED the draft below. Carry out the outbound step now, exactly as drafted, with your tools (send, post, update). If a tool you need is not connected, say so and show what you would have sent. Then report in one short section: what went out, to whom, and anything that did not.\nApproved draft:\n${task.draft || task.result}` : '';
const pickFor = (task, a) => { // model + effort: four places, one precedence (task > routine > agent > office)
  const pick = modelFor({ task: task.model, routine: task.routineModel, agent: a.model, office: cfg.model });
  const eff = effortFor({ task: task.effort, routine: task.routineEffort, agent: a.effort, office: cfg.effort, model: pick.model });
  return { pick, eff };
};
// which pass a run is, for the token ledger: the first draft, a revision after "revise: …", new facts from the owner, or the send after the OK
const passOf = (mode, feedback, asAnswer) => mode === 'approve' ? 'approve' : feedback ? (asAnswer ? 'answer' : 'revise') : 'draft';
// persist a task mid-run (a team's pieces move while the run is still going; the page polls /api/tasks)
function persist(task) { const l = load(); const i = l.findIndex(t => t.id === task.id); if (i >= 0) { l[i] = task; save(l); } }
async function run(task, feedback, mode, asAnswer) { // asAnswer: the owner is adding context, not rejecting. mode: undefined (a task from the bar) · 'routine' (read-only routine) · 'draft' (routine that waits for the OK) · 'approve' (the owner ticked it)
  if (task.team && TEAMS.enabled) { // V3.2 (16 Sep): a team task — the lead plans, the desks work at once, the lead writes the final
    if (mode === 'approve') return runTeamLead(task, feedback, mode); // the outbound step after the OK is the lead's alone
    if (feedback && task.team.pieces?.length) return runTeamLead(task, feedback, mode); // "revise: …" reworks the final from the same pieces
    return runTeam(task, mode);
  }
  const a = AGENTS.find(x => x.id === task.agent);
  refreshSkills();
  const index = vaultIndex();
  const read = relevantNotes(index, a.department, task.title + ' ' + task.text, 4, a);
  const system = agentSystem(a, index, read);
  const routineLine = task.routine ? `\nThis is a routine (${task.when}): it runs on the office's own clock and the owner is not at the keyboard. It is now ${new Date().toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}${task.late ? `; this run is late, it was due ${new Date(task.due).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}. Do the work for now.`
    : task.dueAt ? `\nThis task was scheduled in advance for ${new Date(task.dueAt).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} and is running now; the owner is not at the keyboard${task.late ? ' and this run is late' : ''}. Do the work for now.` : '';
  const modeLine = modeLineFor(mode, task);
  const user = `Task: ${task.title}\nOwner's request: ${task.text}` + (task.plan?.length ? `\nAgreed plan: ${task.plan.join(' → ')}` : '') + routineLine + modeLine +
    (feedback && mode !== 'approve' ? (asAnswer
      ? `\n\nThe owner is NOT rejecting your previous version. He is giving you information you did not have: "${feedback}"\nTreat it as fact. Update the work using it, keep everything that was already right, and do not apologise or mention a rejection.\nPrevious version:\n${task.result}`
      : `\n\nThe owner reviewed your previous version and asked for changes: "${feedback}"\nPrevious version:\n${task.result}`) : '');
  const { pick, eff } = pickFor(task, a);
  const { text, tools, modelId: ran } = await askX(system, user, { model: pick.model, effort: eff.effort, job: { task, kind: 'task', mode: passOf(mode, feedback, asAnswer) } });
  if (!text) throw new Error('Claude returned nothing');
  return { result: text, read, tools: toolKeys(tools), used: mcp.namesOf(tools), skills: skills.names(a), modelUsed: pick.model, modelFrom: pick.from, modelId: ran, effortUsed: eff.effort || '', effortFrom: eff.from };
}

/* ---------- V3.2 (16 Sep) Agent Teams: the lead plans, the desks work at once, the lead writes the final ---------- */
const nameOf = id => id === 'lead' ? 'the lead' : (AGENTS.find(a => a.id === id)?.name || id);
const routineLineFor = task => task.routine ? `\nThis is a routine (${task.when}): it runs on the office's own clock and the owner is not at the keyboard. It is now ${new Date().toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Do the work for now.`
  : task.dueAt ? `\nThis task was scheduled in advance for ${new Date(task.dueAt).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} and is running now; the owner is not at the keyboard. Do the work for now.` : '';
async function runTeam(task, mode) {
  const lead = AGENTS.find(x => x.id === task.agent), dept = lead.department;
  refreshSkills();
  const index = vaultIndex();
  const seats = AGENTS.filter(a => a.department === dept).map(a => ({ id: a.id, lead: a.lead, name: a.name, role: a.role, does: a.does, skills: skills.names(a) }));
  const max = Math.min(TEAMS.max, teams.askedSize(task.text) || TEAMS.max);
  // 1. the plan — the lead splits the request across the desks (Sonnet, no tools: a JSON job)
  const recipe = teams.recipeFor(dept, task.text);
  const pp = teams.planPrompt({ recipe, business: cfg.name, deptName: DEPTS[dept].name, lead, seats, text: task.text, title: task.title, max, notes: contextText(index, relevantNotes(index, dept, task.title + ' ' + task.text, 3)).slice(0, 4000) });
  let plan;
  try { plan = teams.parsePlan(await ask(pp.system, pp.user, { maxTokens: recipe?.multi ? 5000 : 1400, timeout: 150000, model: 'sonnet', job: { task, kind: 'plan', mode: 'draft' } }),{ seats, lead, max, fallback: task, multi: !!recipe?.multi }); }
  catch (e) { plan = { pieces: [{ agent: lead.id, title: task.title, text: task.text }], why: '', solo: true, error: e.message }; }
  task.team = { ...(task.team || {}), lead: lead.id, max, pieces: plan.pieces.map(p => ({ ...p, state: 'next' })), messages: [], why: plan.why, solo: plan.solo, plannedAt: Date.now() };
  persist(task);
  console.log(`  ⚑ ${task.id} team of ${plan.pieces.length}: ${plan.pieces.map(p => p.agent).join(' + ')}${plan.why ? ' — ' + plan.why : ''}`);
  // 2. the pieces — one Claude process per desk, at the same time (at most `max` in flight)
  const ids = task.team.pieces.map(p => p.agent);
  await teams.pool(task.team.pieces, max, async piece => {
    const a = AGENTS.find(x => x.id === piece.agent);
    piece.state = 'doing'; piece.startedAt = Date.now(); persist(task);
    try {
      const read = relevantNotes(index, dept, piece.title + ' ' + piece.text, 3, a);
      const system = agentSystem(a, index, read, { extra: teams.teamSection({ me: a, lead, pieces: task.team.pieces, nameOf, piece, long: !!recipe?.long }), words: recipe?.long ? 3000 : 220 });
      const user = `Task (the whole request, for context): ${task.title}\nOwner's request: ${task.text}\n\nYOUR PIECE: ${piece.title}\n${piece.text}` + routineLineFor(task) + (mode === 'draft' ? modeLineFor('draft', task) : '');
      const { pick, eff } = pickFor(task, a);
      const { text, tools, modelId: ran } = await askX(system, user, { model: pick.model, effort: eff.effort, job: { task, kind: 'piece', agent: a.id, mode: 'draft' }, ...(recipe?.long ? { timeout: 1500000, maxTokens: 12000 } : {}) }); // a research stream may read dozens of pages: 25 minutes, not 5
      const { body, messages } = teams.parseMessages(text, ids);
      Object.assign(piece, { result: body || '(empty)', tools: toolKeys(tools), used: mcp.namesOf(tools), read, modelId: ran, error: !text });
      for (const m of messages) task.team.messages.push({ from: a.id, to: m.to === lead.id ? 'lead' : m.to, text: m.text, at: Date.now() });
    } catch (e) { Object.assign(piece, { result: 'Could not complete this piece: ' + e.message + (e.partial ? `${String.fromCharCode(10, 10)}What it had written so far:${String.fromCharCode(10, 10)}${e.partial}` : ''), error: true }); }
    piece.state = 'done'; piece.doneAt = Date.now(); persist(task);
    console.log(`    ${piece.error ? '✗' : '✓'} ${a.name}: ${piece.title} (${(piece.result || '').length} chars${piece.tools?.length ? ', tools: ' + piece.tools.join(' ') : ''})`);
  });
  // 3. the final — the lead writes the deliverable from the pieces and the notes
  return runTeamLead(task, null, mode);
}
async function runTeamLead(task, feedback, mode) {
  const lead = AGENTS.find(x => x.id === task.agent), tm = task.team;
  refreshSkills();
  const index = vaultIndex();
  const read = relevantNotes(index, lead.department, task.title + ' ' + task.text, 4, lead);
  const system = agentSystem(lead, index, read, { extra: `TEAM\nYou lead this team. The pieces below were done by your teammates (one of them may be yours). You write the finished deliverable from them.`, words: (r => r ? (r.name === 'franchise-report' ? 7000 : 1500) : 450)(teams.recipeFor(lead.department, task.text)) }); // a recipe's package (a week of posts) is longer than a normal team answer
  const user = teams.synthPrompt({ recipe: teams.recipeFor(lead.department, task.text), task, pieces: tm.pieces || [], messages: tm.messages || [], nameOf, feedback: mode === 'approve' ? null : feedback }) + routineLineFor(task) + modeLineFor(mode, task);
  const { pick, eff } = pickFor(task, lead);
  const { text, tools, modelId: ran } = await askX(system, user, { model: pick.model, effort: eff.effort, maxTokens: 6000, job: { task, kind: 'lead', mode: passOf(mode, feedback) } });
  if (!text) throw new Error('Claude returned nothing');
  const allTools = [...new Set([...(tm.pieces || []).flatMap(p => p.tools || []), ...toolKeys(tools)])];
  const allUsed = [...new Set([...(tm.pieces || []).flatMap(p => p.used || []), ...mcp.namesOf(tools)])];
  const allRead = [...new Set([...read, ...(tm.pieces || []).flatMap(p => p.read || [])])];
  return { result: text, read: allRead, tools: allTools, used: allUsed, skills: skills.names(lead), modelUsed: pick.model, modelFrom: pick.from, modelId: ran, effortUsed: eff.effort || '', effortFrom: eff.from, team: tm };
}
// Reviewed Brain updates (brainnotes.mjs): an agent proposes a change to a note, the review card says what it would file,
// and the office files it only when the owner approves. brainWrite.enabled: false in office.config.json switches it off;
// brainWrite.deny: ["folder/"] keeps agents out of a folder or a note.
const BRAIN_WRITE = cfg.brainWrite?.enabled !== false;
const BRAIN_DENY = Array.isArray(cfg.brainWrite?.deny) ? cfg.brainWrite.deny : [];
function brainReview(task, text) { // what approving would file, for the review card
  const blocks = BRAIN_WRITE ? brainnotes.parse(text) : [];
  if (!blocks.length) { delete task.brain; return ''; }
  const plans = brainnotes.planAll(BRAIN, blocks, { deny: BRAIN_DENY });
  task.brain = plans.map(p => ({ note: p.rel || p.note, mode: p.mode, ok: p.ok, problem: p.problem || '' }));
  const good = plans.filter(p => p.ok), bad = plans.filter(p => !p.ok);
  return (good.length ? ` Approving also files ${good.length} Brain update${good.length === 1 ? '' : 's'}: ${good.map(p => `${p.mode} → ${p.rel}`).join(', ')}.` : '') +
    (bad.length ? ` Not filed: ${bad.map(p => `${p.note || '?'} (${p.problem})`).join('; ')}.` : '');
}
function fileBrainUpdates(task) { // only for a task the owner approved, and only what was on the card they approved
  if (!BRAIN_WRITE || !task.approved) return;
  const blocks = brainnotes.parse(task.draft || task.result); if (!blocks.length) return;
  const done = brainnotes.applyAll(BRAIN, blocks, { deny: BRAIN_DENY, backupDir: path.join(DATA, 'brain-backups') });
  task.brain = done;
  if (done.some(d => d.ok && /content-calendar/i.test(d.note || ''))) { try { weekpack.sync(ROOT, BRAIN); } catch (e) { console.warn('content calendar:', e.message); } } // an approved plan puts the week's folders and SCHEDULE.md in place
  task.result += '\n\n---\nFILED TO THE BRAIN\n' + done.map(d => `${d.ok ? '✓' : '✗'} ${d.note} (${d.mode}): ${d.message}`).join('\n');
  console.log(`▣ brain: ${done.filter(d => d.ok).length} of ${done.length} update(s) filed for ${task.id} — ${done.map(d => `${d.ok ? '✓' : '✗'} ${d.note}`).join(', ')}`);
}
// Reviewed site updates (siteupdates.mjs): a desk holding a website design, review or copy skill proposes exact edits to the site in
// sites/wrw-hospitality, the review card says which files would change, and the office applies them only when the owner
// approves. The office serves the site at /site/. siteWrite.enabled: false switches the edits off; site.root moves the folder.
const SITE_ROOT = path.resolve(ROOT, cfg.site?.root || 'sites/wrw-hospitality');
const SITE_URL = `http://localhost:${cfg.port || 4520}/site/`;
const SITE_WRITE = cfg.siteWrite?.enabled !== false && fs.existsSync(SITE_ROOT);
const SITE_SKILLS = ['website-design-system', 'website-ux-review', 'website-copy'];
const siteDesk = a => SITE_WRITE && !!a && skills.names(a).some(n => SITE_SKILLS.includes(n));
function siteReview(task, text) { // what approving would change on the site, for the review card
  const blocks = siteDesk(AGENTS.find(x => x.id === task.agent)) ? siteupdates.parse(text) : [];
  if (!blocks.length) { delete task.site; return ''; }
  const { plans } = siteupdates.planAll(SITE_ROOT, blocks);
  task.site = plans.map(p => ({ file: p.rel || p.file, mode: p.mode, ok: p.ok, problem: p.problem || '' }));
  const good = plans.filter(p => p.ok), bad = plans.filter(p => !p.ok), files = [...new Set(good.map(p => p.rel))];
  return (good.length ? ` Approving also changes the website: ${good.length} change${good.length === 1 ? '' : 's'} to ${files.join(', ')} (see it at ${SITE_URL}).` : '') +
    (bad.length ? ` Not applied: ${bad.map(p => `${p.file || '?'} (${p.problem})`).join('; ')}.` : '');
}
function fileSiteUpdates(task) { // only for a task the owner approved, and only what was on the card they approved
  if (!task.approved || !siteDesk(AGENTS.find(x => x.id === task.agent))) return;
  const blocks = siteupdates.parse(task.draft || task.result); if (!blocks.length) return;
  const done = siteupdates.applyAll(SITE_ROOT, blocks, { backupDir: path.join(DATA, 'site-backups') });
  task.site = done;
  task.result += '\n\n---\nAPPLIED TO THE WEBSITE\n' + done.map(d => `${d.ok ? '✓' : '✗'} ${d.file} (${d.mode}): ${d.message}`).join('\n') + `\nSee it at ${SITE_URL}`;
  console.log(`▣ site: ${done.filter(d => d.ok).length} of ${done.length} change(s) applied for ${task.id} — ${done.map(d => `${d.ok ? '✓' : '✗'} ${d.file}`).join(', ')}`);
}
function handoffReview(task, text) { // what approving would hand on, for the review card; the block itself is removed from the result
  const blocks = handoff.parse(text); if (!blocks.length) { delete task.handoffs; return ''; }
  task.handoffs = handoff.plan(blocks, AGENTS, task.agent);
  const good = task.handoffs.filter(h => h.ok), bad = task.handoffs.filter(h => !h.ok);
  return (good.length ? ` Approving also hands on ${good.length === 1 ? 'a task' : good.length + ' tasks'}: ${good.map(h => `${h.toName} — "${h.title}"`).join('; ')}.` : '') + (bad.length ? ` Not handed on: ${bad.map(h => `${h.toName || '?'} (${h.problem})`).join('; ')}.` : '');
}
function fireHandoffs(task) { // only for a task the owner approved, and only what was on the card he approved
  const hs = (task.handoffs || []).filter(h => h.ok && !h.fired); if (!hs.length || !task.approved) return;
  const list = load(); const made = [];
  // A chain of hand-overs stops after three in a row on the same job, and the same seat is never handed the same title twice in 12 hours. Without
  // this, a check that finds something missing hands back, which re-does and hands on again, and burns runs with nothing new coming out.
  let depth = 0; for (let cur = task; cur?.handoffTask && depth < 12; depth++) cur = list.find(x => x.id === cur.handoffTask);
  if (depth >= 3) { task.result += `\n\n---\nHAND-OVER STOPPED\nThis job has already been handed on ${depth} times in a row (${hs.map(h => `${h.toName}: "${h.title}"`).join('; ')} was next). It waits for you: say what you want done, or approve the step by adding it as a task.`; for (const h of hs) h.fired = 'stopped'; console.log(`✋ ${task.id}: hand-over chain stopped at depth ${depth}`); return; }
  for (const h of hs) {
    if (list.some(x => x.agent === h.to && x.title === h.title && Date.now() - (x.addedAt || 0) < 12 * 3600 * 1000)) { h.fired = 'duplicate'; task.result += `\n\n---\nNOT HANDED ON AGAIN\n${h.toName} already has "${h.title}" from the last 12 hours.`; continue; }
    const t = { id: nid(), dept: h.dept, agent: h.to, title: h.title, text: `${h.text}\n\n(Handed over by ${agentName(task.agent)} from the task "${task.title}", which Wesley approved.)`, plan: [], eta: 10, why: `Handed over by ${agentName(task.agent)}`, state: 'doing', startedAt: Date.now(), addedAt: Date.now(), by: 'handoff', handoffFrom: task.agent, handoffTask: task.id, needsOk: false, team: teamFor(h.to, h.text) };
    list.push(t); made.push(t); h.fired = t.id;
  }
  save(list);
  task.result += '\n\n---\nHANDED ON\n' + made.map(t => `→ ${agentName(t.agent)}: ${t.title}`).join('\n');
  for (const t of made) { console.log(`➜ ${task.id} hands on to ${t.agent}: ${t.title}`); enqueue(() => runServerTask(t.id)).catch(e => console.warn('handoff:', e.message)); }
}
function writeNote(task) { // the deliverable becomes a note in the brain, linked to what was read
  fs.mkdirSync(NOTES_DIR, { recursive: true });
  const a = AGENTS.find(x => x.id === task.agent);
  const name = `${new Date(task.doneAt).toISOString().slice(0, 10)} ${slug(task.title)}`;
  const body = `---\nagent: ${a.name}\ndepartment: ${DEPTS[a.department].name}\ntask: ${task.id}\ndone: ${new Date(task.doneAt).toISOString()}${task.used?.length ? '\ntools: ' + task.used.join(', ') : ''}${task.skills?.length ? '\nskills: ' + task.skills.join(', ') : ''}${task.routine ? '\nroutine: ' + task.when + (task.late ? ' (late)' : '') : ''}${task.modelUsed ? '\nmodel: ' + modelName(task.modelUsed) + (task.modelFrom && task.modelFrom !== 'office' ? ' (' + task.modelFrom + ')' : '') : ''}${task.effortUsed ? '\neffort: ' + task.effortUsed + (task.effortFrom && task.effortFrom !== 'model' ? ' (' + task.effortFrom + ')' : '') : ''}${task.approved ? '\napproved: ' + new Date(task.approvedAt).toISOString() : ''}${task.team?.pieces?.length ? '\nteam: ' + task.team.pieces.map(p => nameOf(p.agent)).join(', ') : ''}\n---\n` +
    `# ${task.title}\n\n${task.result}\n\n---\nRead: ${(task.read || []).map(n => `[[${n}]]`).join(' · ') || '—'}\n` + teams.noteExtra(task.team, nameOf);
  fs.writeFileSync(path.join(NOTES_DIR, name + '.md'), body);
  return name;
}
async function chat(agentId, text, history) {
  const a = AGENTS.find(x => x.id === agentId); if (!a) throw new Error('unknown agent');
  const d = DEPTS[a.department]; refreshSkills();
  const index = vaultIndex();
  const read = relevantNotes(index, a.department, text, 3, a);
  const mine = load().filter(t => t.agent === agentId).slice(-6).map(t => `- [${t.state}] ${t.title}`).join('\n');
  const system = `You are ${a.name}, ${a.role || 'an agent'}, in the ${d.name} department of ${cfg.name}. ${a.does}\n${agentBrief(a)}` +
    'You are talking to the owner. Answer as this agent, in first person, briefly (under 120 words unless asked for detail), plainly, no hype. ' +
    'Use the company notes; say when something is not in them. If the owner asks you to look something up, use your tools. Nothing outbound is sent without the owner\'s explicit say-so.\n\n' +
    `${mcp.promptText(a.tools)}\n\nCOMPANY NOTES\n${businessContext(index)}\n\nRELEVANT NOTES\n${contextText(index, read)}\n\nYOUR RECENT TASKS\n${mine || '—'}`;
  const convo = (history || []).slice(-8).map(m => `${m.who === 'user' ? 'Owner' : a.name}: ${m.text}`).join('\n');
  const { text: reply, tools } = await askX(system, (convo ? convo + '\n' : '') + `Owner: ${text}\n${a.name}:`, { maxTokens: 1200, job: { kind: 'chat', agent: a.id }, model: modelFor({ agent: a.model, office: cfg.model }).model, effort: effortFor({ agent: a.effort, office: cfg.effort, model: modelFor({ agent: a.model, office: cfg.model }).model }).effort });
  return { reply, read, tools: toolKeys(tools), used: mcp.namesOf(tools) };
}

/* ---------- routines: the office's own clock (V3.5) ---------- */
const RSTATE = routines.loadState(DATA);
let rlist = { routines: [], problems: [], path: routines.file(BRAIN) };
function loadRoutines() { // re-read from disk every time: a routine written by Claude Code, or by hand, lands without a restart
  const r = routines.load(BRAIN, AGENTS);
  if (r.problems.join() !== rlist.problems.join()) for (const w of r.problems) console.warn('routines:', w);
  rlist = r;
  const { list, changed } = routines.withState(r.routines, RSTATE);
  if (changed) routines.saveState(DATA, RSTATE);
  return list;
}
const routinesOut = () => { const list = loadRoutines(); return { routines: list, depts: routines.ALLOWED, path: rlist.path, problems: rlist.problems }; };
const agentName = id => AGENTS.find(a => a.id === id)?.name || id;
// routine-driven runs go one at a time, so a burst of catch-ups after a long sleep does not spawn five Claude processes at once
let queue = Promise.resolve();
const enqueue = fn => { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; };
function fire(r, { due = Date.now(), late = false, by = 'routine' } = {}) { // the routine becomes a task and runs here, page or no page
  const task = { id: nid(), dept: r.dept, agent: r.agent, title: r.title, text: r.text, plan: r.plan || [], eta: 15, why: '', state: 'next', addedAt: Date.now(), by, routine: r.id, when: r.desc || describe(r.when), needsOk: r.needsOk, due, late, routineModel: r.model || undefined, routineEffort: r.effort || undefined, noMatrix: r.matrix === false || undefined, team: r.team && TEAMS.enabled ? { lead: r.agent, asked: 'routine' } : undefined };
  const list = load(); list.push(task); save(list);
  routines.advance(RSTATE, r, Date.now(), task.id, late); routines.saveState(DATA, RSTATE);
  console.log(`⏱ ${task.id} → ${task.agent}: ${task.title}${late ? ' (LATE · was due ' + new Date(due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ')' : ''}`);
  enqueue(() => runServerTask(task.id));
  return task;
}
// V3.9: every finished task waits for the owner's review — approve marks it done, reject sends it back with a reason
// the agent learns from (learn.mjs). review.all: false in office.config.json goes back to straight-to-done
// (tasks that send, post or pay still wait for the OK either way).
const REVIEW_ALL = cfg.review?.all !== false;
const reviewLine = task => `"${task.title}" is ready for your review — approve to mark it done, or reject and tell me why.`;
const RUNNING = new Set(); // a task is never run twice at once: the page and the server may both ask to start the same new task
async function runServerTask(id, opts = {}) {
  if (RUNNING.has(id)) return null;
  RUNNING.add(id);
  try { return await runServerTaskNow(id, opts); } finally { RUNNING.delete(id); }
}
async function runServerTaskNow(id, { feedback, approve, answer } = {}) {
  let list = load(); const task = list.find(t => t.id === id); if (!task) return null;
  task.state = 'doing'; task.startedAt = Date.now(); delete task.ask; save(list);
  try {
    const out = await run(task, feedback, approve ? 'approve' : task.needsOk ? 'draft' : 'routine', answer);
    const hoText = out.result; if (handoff.parse(hoText).length) out.result = handoff.strip(hoText);
    if (!approve && /\[content-build\]/i.test(task.text || '')) { // the week's finished content is filed into the Content Calendar folder Wesley posts from
      try { const f = weekpack.fromResult(ROOT, BRAIN, out.result); out.result = weekpack.strip(out.result) + '\n\n---\nFILED IN THE CONTENT CALENDAR FOLDER\n' + (f.filed ? `${f.filed} item(s) in ${f.dir}` : 'not filed: ' + f.reason); console.log(`🗓 content calendar: ${f.filed ? f.filed + ' item(s) filed in ' + f.dir : 'not filed, ' + f.reason}`); } catch (e) { console.warn('content calendar:', e.message); }
    }
    if (!approve && ferfile.isIssue(task)) { // a finished Franchise Entry Report issue: file the text and build the A4 PDF
      try { const b = await ferfile.build(ROOT, task, out.result); out.result += '\n\n---\nA4 PDF\n' + ferfile.report(b); console.log(`📄 franchise report: ${b.pdf || 'not built, ' + b.reason}`); } catch (e) { console.warn('franchise report:', e.message); }
    }
    if (!approve) { // a NEXT: line is a suggestion for the review card, not part of the deliverable
      delete task.nextStep; const tn = handoff.takeNext(out.result, AGENTS, task.agent); if (tn.next) { task.nextStep = tn.next; out.result = tn.text; }
    }
    if (approve) {
      task.result = (task.draft || task.result) + '\n\n---\nAFTER YOUR OK\n' + out.result; task.approved = true; task.approvedAt = Date.now();
      if (ferfile.revisionLine(task.result)) { try { const p = ferfile.promote(ROOT, task.result); if (p) { task.result += '\n\n---\nREPORT UPDATED\n' + p.text; console.log(`📄 franchise report promoted: ${p.live}`); } } catch (e) { task.result += '\n\n---\nREPORT NOT UPDATED\n' + e.message; console.warn('franchise promote:', e.message); } } // an approved franchise_report_edit revision becomes the live issue
      if (aoofile.isAooReel(task)) { try { const f = aoofile.fileApproved(ROOT, task, task.result); task.result += '\n\n---\nFILED\n' + (f.filed ? f.files.join('\n') : 'not filed: ' + f.reason); } catch (e) { console.warn('aoo filing:', e.message); } } // an approved Art of Operations reel is filed under its fixed name
    }
    else task.result = out.result;
    Object.assign(task, { read: out.read, tools: [...new Set([...(task.tools || []), ...out.tools])], used: [...new Set([...(task.used || []), ...out.used])], skills: out.skills, error: false, modelUsed: out.modelUsed, modelFrom: out.modelFrom, modelId: out.modelId, effortUsed: out.effortUsed, effortFrom: out.effortFrom, ...(out.team ? { team: out.team } : {}) });
    if (task.needsOk && !task.channel && isEmail(task)) task.channel = 'email';
    if ((task.needsOk || REVIEW_ALL) && !approve && aoofile.isAooReel(task)) aoofile.sendForApproval(ROOT, task, out.result).then(s => console.log(`🎞 Art of Operations reel ${s.sent ? 'sent to Telegram for approval' : 'not sent: ' + s.reason}`)).catch(() => {}); // Wesley reads on his phone
    if ((task.needsOk || REVIEW_ALL) && !approve) { task.state = 'waiting'; task.draft = out.result; task.waitingAt = Date.now(); task.ask = (task.needsOk ? (task.channel === 'email' ? `"${task.title}" is written — approve to put it in your Gmail drafts, then send it from your inbox. Reject to tell me what to change.` : routines.askLine(task)) : reviewLine(task)) + brainReview(task, out.result) + siteReview(task, out.result) + (approve ? '' : handoffReview(task, hoText)); }
    else {
      task.state = 'done'; task.doneAt = Date.now();
      try { const sc = ubereats.fileScorecard(DATA, out.result); if (sc) { task.result += sc.ok ? `\n\n---\nUBER EATS SCORECARD FILED: ${sc.tier}, read ${sc.readOn}, on the Delivery dashboard.` : `\n\n---\nUBER EATS SCORECARD NOT FILED: ${sc.error}.`; console.log('  ubereats scorecard:', sc.ok ? 'filed' : sc.error); } } catch (e) { console.warn('scorecard:', e.message); } // V3.12: read-only figures for the dashboard, filed without review
      if (approve) { fileBrainUpdates(task); fileSiteUpdates(task); fireHandoffs(task); fileMatrixItems(task); }
      else if (handoff.parse(hoText).length) task.result += '\n\n---\nHANDOFF NOT SENT: this task did not wait for your review, and nothing is handed on without your OK.';
      else if (BRAIN_WRITE && brainnotes.parse(out.result).length) task.result += '\n\n---\nBRAIN UPDATE NOT FILED: this task did not wait for your review, and nothing is filed without your OK.';
      if (!approve && SITE_WRITE && siteupdates.parse(out.result).length) task.result += '\n\n---\nSITE UPDATE NOT APPLIED: this task did not wait for your review, and the website is not changed without your OK.';
      task.note = writeNote(task); await rebuildGraph();
    }
  } catch (e) {
    const kept = e.partial ? `${String.fromCharCode(10, 10)}---${String.fromCharCode(10)}WHAT IT HAD WRITTEN WHEN IT STOPPED (unfinished, kept so the work is not lost)${String.fromCharCode(10, 10)}${e.partial}` : '';
    Object.assign(task, { state: 'done', doneAt: Date.now(), result: 'Could not complete this task: ' + e.message + kept, error: true, ...(e.partial ? { partial: true } : {}), ...(e.used?.length ? { used: [...new Set([...(task.used || []), ...e.used])] } : {}) });
  }
  list = load(); const i = list.findIndex(t => t.id === task.id); if (i >= 0) list[i] = task; save(list);
  console.log(`${task.error ? '✗' : task.state === 'waiting' ? '⏸' : '✓'} ${task.id} ${task.error ? 'failed' : task.state === 'waiting' ? 'waiting for your OK' : 'done'} (${task.result.length} chars${task.tools?.length ? ', tools: ' + task.tools.join(' ') : ''}${task.note ? ', note: ' + task.note : ''})`);
  autoFeed(task);
  return task;
}
function tickRoutines() {
  let list; try { list = loadRoutines(); } catch (e) { console.warn('routines:', e.message); return; }
  for (const { routine, due, late } of routines.due(list, RSTATE)) fire(routine, { due, late });
  tickScheduled();
}
function tickScheduled() { // V3.2.1: a task scheduled for a date fires on its minute — late (once) if the office was off
  const now = Date.now(); let list = load(); let changed = false;
  for (const t of list) {
    if (t.state !== 'scheduled' || !(t.dueAt <= now)) continue;
    t.state = 'next'; t.due = t.dueAt; t.late = now - t.dueAt > routines.LATE_AFTER; t.addedAt = now; changed = true;
    console.log(`⏱ ${t.id} scheduled task fires → ${t.agent}: ${t.title}${t.late ? ' (LATE · was due ' + new Date(t.dueAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ')' : ''}`);
    enqueue(() => runServerTask(t.id));
  }
  if (changed) save(list);
}
const uniqueId = (base, list) => { let id = base || 'routine', n = 2; while (list.some(r => r.id === id)) id = `${base}-${n++}`; return id; };
function editRoutine(id, patch) { const r = rlist.routines.find(x => x.id === id); if (!r) return null; Object.assign(r, patch); routines.save(BRAIN, rlist.routines); return loadRoutines().find(x => x.id === id); }
function removeRoutine(id) { const n = rlist.routines.length; rlist.routines = rlist.routines.filter(x => x.id !== id); if (rlist.routines.length !== n) routines.save(BRAIN, rlist.routines); loadRoutines(); return rlist.routines.length !== n; }
// a sentence (or the REPEAT picker) → a routine in the brain file. Claude names the agent, the title and whether it needs the OK.
async function makeRoutine({ dept, text, when, agent, needsOk, model, effort }) {
  let taskText = String(text || '').trim(), w = when, parsed = null;
  if (!w) {
    parsed = parseWhen(taskText);
    if (!parsed) return { error: 'No schedule in that sentence. Say when: "every weekday at 8am, …", "Mondays 9am, …", "every hour 9-5, …".', noSchedule: true };
    if (parsed.needsDay) return { error: 'Which day? Say "every Monday …" or "Mon and Thu …".', needsDay: true };
    if (parsed.needsTime) return { error: 'What time? Say "… at 8am" or "… at 17:30".', needsTime: true };
    w = parsed.when; taskText = parsed.text;
  }
  if (!validWhen(w)) return { error: 'That schedule is not complete.' };
  if (!taskText) return { error: 'What should happen? The sentence has a time but no task.' };
  loadRoutines();
  const r = await route(dept, taskText);
  const a = agent && AGENTS.find(x => x.id === agent && x.department === dept) ? agent : r.agent;
  const v = routines.validate({ id: uniqueId(slug(r.title).slice(0, 40), rlist.routines), dept, agent: a, title: r.title, text: taskText, when: w, needsOk: typeof needsOk === 'boolean' ? needsOk : r.needsOk, plan: r.plan, model: normModel(model) || undefined, effort: normEffort(effort) || undefined }, AGENTS, rlist.routines);
  if (v.problems.length) return { error: v.problems.join('; ') };
  rlist.routines.push(v.routine); routines.save(BRAIN, rlist.routines);
  const out = loadRoutines().find(x => x.id === v.routine.id);
  console.log(`⏱ routine ${out.id} → ${out.agent}: ${out.title} (${out.desc} · next ${untilText(out.nextAt)}${out.needsOk ? ' · waits for the OK' : ''})`);
  return { ok: true, routine: out, why: r.why, guessed: parsed?.guessed ? parsed.guessWord : null };
}
// B2: a routine said to an agent in chat. The lead routes it inside the department; a specialist takes it on.
async function routinesChat(a, text) {
  const t = String(text).trim(), dept = a.department, allowed = routines.ALLOWED.includes(dept);
  if (/^\s*(routines?|schedule|timetable|what(?:'s| is) (?:scheduled|on the (?:schedule|timetable)))\s*\??\s*$/i.test(t)) return { reply: allowed ? routines.listText(loadRoutines(), dept, AGENTS) : routines.refusal(dept) };
  const cmd = /^\s*(pause|stop|resume|start|unpause|delete|remove|run)\b\s*(?:the\s+)?(.*?)\s*[.!]?$/i.exec(t);
  if (cmd && allowed && !parseWhen(t)) {
    const list = loadRoutines(); const words = cmd[2].replace(/\s+(routine|one)$/i, ''); const r = routines.matchRoutine(list, dept, words);
    if (!r) return { reply: (list.some(x => x.dept === dept) ? 'Which one? ' : '') + routines.listText(list, dept, AGENTS) };
    const verb = cmd[1].toLowerCase();
    if (verb === 'run') { const task = fire(r, { by: 'you' }); return { reply: `Running "${r.title}" now — ${r.agent === a.id ? 'I have it' : agentName(r.agent) + ' has it'}. It lands in the panel${r.needsOk ? ' and waits for your OK before anything is sent' : ''}.`, task }; }
    if (/pause|stop/.test(verb)) { editRoutine(r.id, { paused: true }); return { reply: `Paused "${r.title}". It stays on the timetable; say "resume ${r.title.toLowerCase()}" to start it again.` }; }
    if (/resume|start|unpause/.test(verb)) { const n = editRoutine(r.id, { paused: false }); return { reply: `"${r.title}" is back on — next ${untilText(n.nextAt)}.` }; }
    if (/delete|remove/.test(verb)) { removeRoutine(r.id); return { reply: `Deleted "${r.title}". It is off the timetable.` }; }
  }
  const p = parseWhen(t);
  if (!p) return null;
  if (!allowed) return { reply: routines.refusal(dept) };
  if (p.needsDay) return { reply: 'Which day? Say it again with the day: "every Monday at 9am, …".' };
  if (p.needsTime) return { reply: `What time? Say it again with the time, e.g. "every weekday at 8am, ${p.text ? p.text.slice(0, 60) : '…'}".` };
  if (!p.text) return { reply: 'I have the time but not the task. Say it again with what should happen.' };
  const made = await makeRoutine({ dept, text: p.text, when: p.when, agent: a.lead ? undefined : a.id });
  if (made.error) return { reply: made.error };
  const r = made.routine, who = r.agent === a.id ? 'I have it' : `${agentName(r.agent)} has it`;
  return { reply: `Done. ${r.desc.charAt(0).toUpperCase() + r.desc.slice(1)}, ${who}.${made.guessed ? ` I took "${made.guessed}" as ${r.when.at}; say a time to change it.` : ''} ${r.needsOk ? 'Anything to send waits for your OK first.' : 'It only reads, so it will not wait for you.'} Next run ${untilText(r.nextAt)}. Say "routines" to see the list, "pause ${r.title.toLowerCase()}" to stop it.`, routine: r };
}

/* ---------- V3.9 AIOS: the Eisenhower matrix — the owner feeds in what came out of a piece of work, the office says what follows ---------- */
// every finished task feeds the matrix on its own (aios.autoFeed: false in office.config.json turns it off).
// Runs after the task is saved, off the routine queue. A revised task replaces the actions its earlier version
// put there, unless the owner has already sent, finished or moved them on.
const AUTO_FEED = cfg.aios?.autoFeed !== false;
// the Clients sub-pages: one per entry in aios.dashboards, parsed from uploaded sales-report notes and the delivery exports (no model involved)
function dashboardsData() {
  const defs = Array.isArray(cfg.aios?.dashboards) && cfg.aios.dashboards.length ? cfg.aios.dashboards : [{ id: 'creamy', name: 'Creamy', match: 'Creamy' }];
  const notes = [...vaultIndex()].filter(([n, t]) => isUpload(n) && /^SALES REPORT\s*$/m.test(t)).map(([name, text]) => ({ name, text }));
  const tillNotes = [...vaultIndex()].filter(([n, t]) => isUpload(n) && /Hourly Sales|Item Sales By Category|Monthly Sales for|Daily Sale Summary Report for|Discount Summary Report for/.test(t)).map(([name, text]) => ({ name, text })); // a restaurant's till reports (kind: pos)
  const withDelivery = (d, data) => { // a restaurant's delivery orders (Deliverect), beside its till numbers
    if (data && data.available) { try { const dv = deliverect.build(DATA, { match: d.match }); if (dv.available) data.delivery = dv; } catch (e) { console.warn('deliverect:', e.message); } }
    if (data && data.delivery) { try { const ue = ubereats.build(DATA, { match: d.match, delivered: deliverect.delivered }); if (ue.available) data.delivery.accuracy = ue; } catch (e) { console.warn('ubereats:', e.message); } } // V3.12: Uber Eats Manager's accuracy and availability
    return data;
  };
  const withStarDog = (d, data) => { // an optional product-mix analysis (stars, plowhorses, puzzles, dogs) kept as a data file beside the sales numbers
    if (d.stardog && data && data.available) { try { data.stardog = JSON.parse(fs.readFileSync(path.join(DATA, path.basename(String(d.stardog))), 'utf8')); } catch {} }
    return data;
  };
  return defs.map(d => ({ id: String(d.id), name: String(d.name || d.id), fix: fixes.latest(DATA, String(d.id)), data: withStarDog(d, d.kind === 'pos' ? withDelivery(d, posData.build(tillNotes, { match: d.match })) : salesData.build(notes, { match: d.match })) }));
}
// the month's fix for one dashboard (fix.mjs): the evidence is worked out here, the model picks and writes the action
async function makeFix(id) {
  const d = dashboardsData().find(x => x.id === id);
  if (!d || !d.data || !d.data.available) throw Object.assign(new Error('no such dashboard, or no data in it'), { code: 404 });
  return fixes.make(DATA, id, d.name, d.data, (system, user) => ask(system, user, { maxTokens: 2500, timeout: 240000, model: 'opus', job: { kind: 'fix' } }));
}
// Wesley's Google calendars (office.config.local.json → aios.calendars: [{ name, ics, colour }]), read every five minutes
const GCALS = Array.isArray(cfg.aios?.calendars) ? cfg.aios.calendars.filter(c => c && c.name && c.ics) : [];
let gcalBusy = null;
const syncCalendars = () => { if (!GCALS.length) return Promise.resolve(); if (!gcalBusy) gcalBusy = gcal.sync(DATA, GCALS).then(g => { const bad = g.calendars.filter(c => !c.ok); if (bad.length) console.warn('google calendar:', bad.map(c => `${c.name}: ${c.error}`).join('; ')); }).catch(e => console.warn('google calendar:', e.message)).finally(() => { gcalBusy = null; }); return gcalBusy; };
const CLIENTS = Array.isArray(cfg.aios?.clients) ? cfg.aios.clients.filter(c => c && c.id && c.name) : []; // V3.10: the client-by-client boxes on /aios

// The owner's personal budget (office.config.local.json → budget: { sheet, name }): a Google Sheet Claude reads on request.
// Personal money, so these routes answer this machine only, and a snapshot older than BUDGET_STALE is refreshed in the background on the next visit.
const BUDGET = cfg.budget?.sheet ? { sheet: String(cfg.budget.sheet), name: cfg.budget.name || 'Personal Budget Ledger' } : null;
const BUDGET_STALE = 6 * 3600 * 1000;
let budgetSync = null, budgetError = '';
const isLoopback = req => /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '');
function syncBudget() {
  if (budgetSync) return budgetSync;
  const bp = budget.syncPrompt(BUDGET);
  budgetSync = askX(bp.system, bp.user, { tools: true, maxTokens: 16000, timeout: 170000, model: 'sonnet', effort: 'low', job: { kind: 'budget' } })
    .then(({ text }) => { const snap = budget.snapshot(BUDGET, parseJSON(text)); budget.save(DATA, snap); budgetError = ''; console.log(`£ budget: ${snap.rows.length} rows, ${snap.months.length} months${snap.check.ok ? ' · totals match the sheet' : ' · ⚠ ' + snap.check.mismatches.length + ' mismatch(es)'}`); return snap; })
    .catch(e => { budgetError = e.message; console.warn('budget:', e.message); throw e; })
    .finally(() => { budgetSync = null; });
  return budgetSync;
}
async function budgetApi(req, res, url) {
  if (!isLoopback(req)) return json(res, 403, { error: 'the personal budget is only shown on the machine the office runs on' });
  if (!BUDGET) return json(res, 200, { configured: false });
  if (url.pathname === '/api/budget/sync' && req.method === 'POST') {
    try { return json(res, 200, { ok: true, snapshot: await syncBudget() }); } catch (e) { return json(res, 500, { error: e.message }); }
  }
  const snap = budget.load(DATA);
  if (!budgetSync && (!snap || Date.now() - snap.syncedAt > BUDGET_STALE)) syncBudget().catch(() => {}); // background refresh — the page shows the last snapshot meanwhile
  return json(res, 200, { configured: true, sheet: BUDGET, snapshot: snap, syncing: !!budgetSync, error: budgetError });
}
// Client project trackers (office.config.local.json → aios.trackers: [{ client, name, sheet }]): Google Sheets Claude reads on request; the cards
// (overdue, due, up next) are worked out here from the stored rows, so they are right for today. A snapshot older than TRACKER_STALE refreshes in the background.
const TRACKERS = (Array.isArray(cfg.aios?.trackers) ? cfg.aios.trackers : []).filter(t => t && t.client && t.sheet).map(t => ({ client: String(t.client), name: String(t.name || t.client + ' project tracker'), sheet: String(t.sheet), tab: t.tab || 'Tracker' }));
const TRACKER_STALE = 6 * 3600 * 1000, trackerSync = new Map(), trackerError = {};
function syncTracker(t) {
  if (trackerSync.has(t.client)) return trackerSync.get(t.client);
  const tp = trackers.syncPrompt(t);
  const pr = askX(tp.system, tp.user, { tools: true, maxTokens: 14000, timeout: 170000, model: 'sonnet', effort: 'low', job: { kind: 'tracker' } })
    .then(({ text }) => { const snap = trackers.snapshot(t, parseJSON(text)); if (!snap.rows.length && !snap.complete) throw new Error('the tracker came back empty'); const all = trackers.load(DATA); all[t.client] = snap; trackers.save(DATA, all); trackerError[t.client] = ''; console.log(`▤ tracker ${t.client}: ${snap.rows.length} open of ${snap.total ?? '?'} actions`); return snap; })
    .catch(e => { trackerError[t.client] = e.message; console.warn('tracker:', t.client, e.message); throw e; })
    .finally(() => { trackerSync.delete(t.client); });
  trackerSync.set(t.client, pr); return pr;
}
async function trackersApi(req, res, url) {
  if (url.pathname === '/api/trackers/sync' && req.method === 'POST') {
    const want = String((await body(req)).client || ''); const list = TRACKERS.filter(t => !want || t.client === want);
    const r = await Promise.allSettled(list.map(syncTracker)); return json(res, 200, { ok: true, synced: r.filter(x => x.status === 'fulfilled').length, failed: r.filter(x => x.status === 'rejected').map(x => x.reason.message) });
  }
  const all = trackers.load(DATA), now = new Date();
  for (const t of TRACKERS) if (!trackerSync.has(t.client) && (!all[t.client] || Date.now() - all[t.client].syncedAt > TRACKER_STALE)) syncTracker(t).catch(() => {});
  return json(res, 200, { configured: TRACKERS.length > 0, trackers: TRACKERS.map(t => ({ client: t.client, name: t.name, sheet: t.sheet, syncing: trackerSync.has(t.client), error: trackerError[t.client] || '', view: trackers.view(all[t.client], now) })) });
}
// V3.11 (24 Oct): what stops the matrix filling itself (151 open, ~100 of them noise).
// 1. Housekeeping does not feed it: a fix, a re-file, a check or a tidy-up is the follow-up, not a source of new ones.
// 2. Work that came from the matrix does not feed back into it, nor anything handed over from it: one action, one card,
//    not a chain of follow-ups of follow-ups.
// (3. DROP-ranked actions are kept off the open list: see feedMatrix.)
const HOUSEKEEPING = /^(fix|file|re-?file|check|re-?check|verify|tidy|merge|delete|remove|rename|correct|proofread|qa|format|swap|re-?tag|record|log|mark|save|copy|move|add\b.*\b(row|rows|contact|tracker)\b|update\b.*\b(row|rows|tracker|note|draft|to line)\b)\b/i;
function fromMatrix(task, list = load(), depth = 0) {
  if (!task || depth > 8) return false;
  if (task.by === 'aios' || task.matrix) return true;
  return task.handoffTask ? fromMatrix(list.find(t => t.id === task.handoffTask), list, depth + 1) : false;
}
// V3.12 (30 Oct): the cards a desk put in a MATRIX ITEMS block go onto the matrix when the owner approves the task, exactly
// as listed (no extractor, no three-card cap). A card marked "calendar yes" on a task whose outbound step ran is shown as already
// on the calendar, so its + CALENDAR tag does not offer a second event.
function fileMatrixItems(task) {
  const feedId = 'f' + nid(), items = aios.parseMatrixBlock(task.draft || task.result, AGENTS, feedId);
  if (!items || !items.length) return 0;
  const m = aios.load(DATA), known = m.items.filter(i => i.state === 'open' || i.state === 'sent').map(i => i.title);
  const { kept, dropped } = aios.dedupe(items, known);
  for (const i of kept) { if (i.onCalendar && task.needsOk && !task.error) i.calendar = { at: Date.now(), by: task.agent }; delete i.onCalendar; }
  m.feeds.push({ id: feedId, at: Date.now(), source: `Filed by ${agentName(task.agent)} from "${task.title}"`, taskId: task.id, auto: false, summary: `${kept.length} card(s) put on the matrix by the desk`, count: kept.length, duplicates: dropped.length });
  m.items.push(...kept); aios.save(DATA, m);
  task.matrixFiled = kept.length;
  console.log(`  matrix: ${kept.length} card(s) filed by ${agentName(task.agent)} from ${task.id}${dropped.length ? ` (${dropped.length} already on it)` : ''}`);
  return kept.length;
}
function autoFeed(task) {
  if (!AUTO_FEED || task.noMatrix || task.state !== 'done' || task.error || !task.result) return; // noMatrix: a status routine's result is a report, not a to-do list
  if (task.matrixFiled) { console.log(`  matrix: not read, ${task.id} filed its own cards`); return; }
  if (fromMatrix(task)) { console.log(`  matrix: not read, ${task.id} came from the matrix (no follow-ups of follow-ups)`); return; }
  if (HOUSEKEEPING.test(String(task.title).trim())) { console.log(`  matrix: not read, ${task.id} is housekeeping: ${task.title}`); return; }
  const m = aios.load(DATA);
  const earlier = new Set(m.feeds.filter(f => f.taskId === task.id).map(f => f.id));
  if (earlier.size) { m.items = m.items.filter(i => !(earlier.has(i.feed) && i.state === 'open')); aios.save(DATA, m); }
  feedMatrix({ taskId: task.id, auto: true }).catch(e => console.warn(`matrix: could not read ${task.id}:`, e.message));
}
// A long document (a transcript runs to 40,000 characters and more) is read in full, never cut off: it is split into overlapping
// pieces of about 11,000 characters, each piece is read for its actions, and what earlier pieces found is passed on so the same action is not raised twice.
const CHUNK = 11000, OVERLAP = 600, MAX_ITEMS = 40;
function chunksOf(txt) {
  const out = []; let i = 0;
  while (i < txt.length) {
    let end = Math.min(txt.length, i + CHUNK);
    if (end < txt.length) { const nl = txt.lastIndexOf('\n', end); if (nl > i + CHUNK * 0.6) end = nl; }
    out.push(txt.slice(i, end)); if (end >= txt.length) break; i = end - OVERLAP;
  }
  return out;
}
const uploadsList = () => [...vaultIndex()].filter(([n]) => isUpload(n)).map(([n, txt]) => ({ name: n, chars: txt.length })).sort((a, b) => a.name < b.name ? 1 : -1);
async function feedMatrix({ text, source, taskId, auto, note }) {
  let input = String(text || '').trim(), src = String(source || '').trim();
  if (taskId) {
    const t = load().find(x => x.id === taskId);
    if (!t) throw Object.assign(new Error('no such task'), { code: 404 });
    if (!t.result) throw Object.assign(new Error('that task has no result yet'), { code: 400 });
    input = `${t.title}\n\n${t.draft || t.result}` + (input ? `\n\nTHE OWNER ADDS: ${input}` : '');
    src = src || `The result of the task "${t.title}", done by ${agentName(t.agent)} (${DEPTS[t.dept]?.name || t.dept}).`;
  }
  if (note) {
    const doc = vaultIndex().get(String(note));
    if (!doc) throw Object.assign(new Error('no such uploaded document'), { code: 404 });
    input = doc.replace(/^---[\s\S]*?---\s*/, '') + (input ? `\n\nTHE OWNER ADDS: ${input}` : '');
    src = src || `The uploaded document "${note}", read in full.`;
  }
  if (!input) throw Object.assign(new Error('nothing to read — paste the information, pick an uploaded document or pick a task'), { code: 400 });
  reloadRoster();
  const roster = AGENTS.map(a => `${a.department} · ${a.id} · ${a.name}${a.lead ? ' (lead)' : ''} · ${a.does}`).join('\n');
  const today = new Date().toLocaleDateString('en-CA') + ' (' + new Date().toLocaleDateString([], { weekday: 'long' }) + ')';
  // what the matrix already holds: everything open or sent to a seat, plus what finished or was dropped in the last week.
  // An item sent to its seat is no longer "open", and its finished result used to restate it as if it were new.
  const weekAgo = Date.now() - 7 * 86400000;
  const known = aios.load(DATA).items.filter(i => i.state === 'open' || i.state === 'sent' || (i.doneAt || i.droppedAt || i.addedAt || 0) > weekAgo);
  const existing = known.slice(-80).map(i => `${i.title}${i.state === 'open' ? '' : ' [' + i.state + (i.outcome ? ': ' + i.outcome.slice(0, 120) : '') + ']'}`);
  const feedId = 'f' + nid();
  const pieces = chunksOf(input), found = [], sums = [];
  for (let k = 0; k < pieces.length; k++) {
    const pr = aios.extractPrompt({ business: cfg.name, roster, input: pieces[k], today, existing: [...existing, ...found.map(i => i.title)].slice(-140), clients: CLIENTS,
      source: (src || 'The owner pasted it in.') + (pieces.length > 1 ? ` This is part ${k + 1} of ${pieces.length} of a longer document, read in order. Raise an action once, where it is first settled.` : '') });
    const part = aios.normalise(parseJSON(await ask(pr.system, pr.user, { maxTokens: 3000, timeout: 180000, model: 'sonnet', job: { kind: 'matrix' } })), AGENTS, feedId, CLIENTS);
    sums.push(part.summary); found.push(...part.items);
    if (found.length >= MAX_ITEMS) break;
  }
  const raw = { summary: (sums.find(Boolean) || '') + (pieces.length > 1 ? ` (read in full, ${pieces.length} parts)` : ''), items: found.slice(0, MAX_ITEMS).map((it, i) => ({ ...it, id: `${feedId}-${i}` })) };
  const dedupe = aios.dedupe(raw.items, known.map(i => i.title)); // belt and braces: the same action worded a little differently is not new
  // the weekly SkillSpector scan reports on itself: a report about the report never becomes an action (it kept looping back into the matrix)
  const SELF = /skill ?spector|skill (security|scan)/i;
  const kept = dedupe.kept.filter(i => !SELF.test(`${i.title} ${i.detail || ''}`)), dropped = [...dedupe.dropped, ...dedupe.kept.filter(i => !kept.includes(i))];
  // 3. An action the office itself ranks DROP (neither urgent nor important) is kept, but filed as dropped: it shows under ALL
  // and can be reopened, and never counts as open work. A finished task's own read keeps its three most pressing actions at most.
  const RANK = { do: 0, plan: 1, delegate: 2, drop: 3 };
  let live = kept.filter(i => i.q !== 'drop').sort((a, b) => RANK[a.q] - RANK[b.q]);
  const parked = kept.filter(i => i.q === 'drop').map(i => ({ ...i, state: 'dropped', droppedAt: Date.now(), outcome: 'Ranked DROP by the office when raised (neither urgent nor important). Reopen it if it matters.' }));
  if (auto && taskId && live.length > 3) { for (const i of live.slice(3)) parked.push({ ...i, state: 'dropped', droppedAt: Date.now(), outcome: 'Raised from a finished task beyond its three most pressing actions. Reopen it if it matters.' }); live = live.slice(0, 3); }
  const out = { summary: raw.summary, items: [...live, ...parked] };
  const m = aios.load(DATA);
  m.feeds.push({ id: feedId, at: Date.now(), source: src || 'Pasted by the owner', taskId: taskId || '', auto: !!auto, summary: out.summary, input: input.slice(0, 2000), chars: input.length, parts: pieces.length, count: live.length, parked: parked.length, duplicates: dropped.length });
  m.items.push(...out.items); aios.save(DATA, m);
  console.log(`▦ matrix: ${live.length} actions${parked.length ? ' (+' + parked.length + ' filed as dropped)' : ''} from ${taskId ? (auto ? 'finished task ' : 'task ') + taskId : 'a paste'} (${Object.keys(aios.QUADRANTS).map(q => q + ' ' + out.items.filter(i => i.q === q).length).join(' · ')})${dropped.length ? ` · ${dropped.length} already on the matrix, not repeated` : ''}`);
  return { feed: m.feeds[m.feeds.length - 1], items: out.items };
}
// a matrix item's "ADD TO CALENDAR" tag: one 10-minute to-do reminder on the owner's own Google
// Calendar, dated to the item's due date, so it pings his phone through the week like any other
// Google Calendar reminder — he doesn't have to ask the office to remember to make it.
async function calendarReminder(item) {
  const system = 'You are creating exactly one Google Calendar event on the owner\'s own primary Google Calendar. ' +
    'This is a short personal to-do reminder, not a meeting — a normal 10-minute timed event, not all-day. ' +
    'Use the Google Calendar tool directly and only that tool. First check that day\'s existing events (including any other 10-minute reminders already added the same way) and place this one in the first free 10-minute slot at or after 09:00, in 10-minute steps, so it never overlaps anything already on the calendar. ' +
    'Do not ask a clarifying question, do not explain your reasoning — check, create the event at the free slot you found, then reply with one short line confirming the time you used, or say plainly why it failed.';
  const user = `Create this event:\nTitle: ${item.title}\nDate: ${item.due}, 10 minutes long, earliest 09:00 — check the day first and use the next free slot if 09:00 is taken\nDescription: ${item.detail || ''}${item.why ? ` (${item.why})` : ''}${item.client ? `\nClient: ${item.client}` : ''}`;
  const { text } = await askX(system, user, { tools: true, maxTokens: 400, timeout: 60000, model: 'sonnet', effort: 'low', job: { kind: 'calendar' } });
  if (!text) throw new Error('Claude did not confirm the event was created');
  return text;
}
// a revision suggestion for one skill, from the audit's evidence; saved for the owner to action (or MARK DONE) in the Skills section
async function makeProposal(skill) {
  const sk = refreshSkills(); const s = sk.skills.find(x => x.name === skill);
  if (!s) return null;
  const tasks = load();
  const a = skillaudit.audit({ skills: sk.skills, agents: AGENTS, tasks, servers: mcp.summary().servers, brainPath: BRAIN });
  const item = a.skills.find(x => x.name === skill);
  const sent = tasks.filter(t => (t.skills || []).includes(skill) && t.revisions).map(t => t.title);
  const pr = skillaudit.proposalPrompt(item, s.text, sent);
  const text = String(await ask(pr.system, pr.user, { maxTokens: 900, timeout: 120000, model: 'sonnet', job: { kind: 'skill' } })).trim();
  return text ? skillaudit.saveProposal(DATA, skill, text) : null;
}
// a rejected job is a lesson: after it is recorded, the skill the agent followed is asked how it should change, and the answer waits in Skills.
// An open suggestion is left alone so the owner's list does not churn.
async function proposeFromRejection(task) {
  const names = (task.skills || []).filter(n => { const s = refreshSkills().skills.find(x => x.name === n); return s && !s.everyone; });
  for (const n of names.slice(0, 1)) {
    if (skillaudit.loadProposals(DATA)[n]?.text) continue;
    const p = await makeProposal(n);
    if (p) console.log('  ↳ skill "' + n + '" has a suggested revision waiting in Skills');
  }
}
async function matrixApi(req, res, url) {
  if (url.pathname === '/api/matrix' && req.method === 'GET') return json(res, 200, { ...aios.load(DATA), quadrants: aios.QUADRANTS, autoFeed: AUTO_FEED, clients: CLIENTS });
  if (url.pathname === '/api/matrix/feed' && req.method === 'POST') {
    try { return json(res, 200, await feedMatrix(await body(req))); } catch (e) { return json(res, e.code || 500, { error: e.message }); }
  }
  const mm = url.pathname.match(/^\/api\/matrix\/([^/]+)(?:\/(send|calendar))?$/);
  if (!mm) return json(res, 404, { error: 'not found' });
  const m = aios.load(DATA); const item = m.items.find(x => x.id === mm[1]);
  if (!item) return json(res, 404, { error: 'no such item' });
  if (req.method === 'DELETE') { m.items = m.items.filter(x => x.id !== item.id); aios.save(DATA, m); return json(res, 200, { ok: true }); }
  if (req.method !== 'POST') return json(res, 405, { error: 'POST or DELETE' });
  if (mm[2] === 'send') { // hand the action to its seat: a real task, run here; anything outbound waits for the OK
    if (!DEPTS[item.dept] || item.dept === 'brain') return json(res, 400, { error: 'this one is the owner\'s — no department to send it to' });
    const text = `${item.title}. ${item.detail}`.trim();
    const r = await route(item.dept, text);
    const agent = item.agent && AGENTS.find(a => a.id === item.agent && a.department === item.dept) ? item.agent : r.agent;
    const task = { id: nid(), dept: item.dept, agent, title: r.title, text, plan: r.plan, eta: r.eta, why: r.why, state: 'doing', startedAt: Date.now(), addedAt: Date.now(), by: 'aios', needsOk: r.needsOk, matrix: item.id };
    const list = load(); list.push(task); save(list);
    aios.patch(item, { state: 'sent', task: task.id }); aios.save(DATA, m);
    console.log(`▦ ${item.id} → task ${task.id} → ${agent}: ${task.title}${task.needsOk ? ' (waits for your OK)' : ''}`);
    enqueue(() => runServerTask(task.id));
    return json(res, 200, { ok: true, item, task });
  }
  if (mm[2] === 'calendar') { // a 10-min to-do reminder on the owner's own Google Calendar, dated to the item's due date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.due || '')) return json(res, 400, { error: 'this one has no due date to put on the calendar' });
    try {
      const at = await calendarReminder(item);
      item.calendar = { at: Date.now() }; aios.save(DATA, m);
      console.log(`▦ ${item.id} → Google Calendar: ${item.title} (${item.due})`);
      return json(res, 200, { ok: true, item, note: at });
    } catch (e) { return json(res, 500, { error: e.message }); }
  }
  const b = await body(req);
  aios.patch(item, b);
  if (b.state === 'done' && item.outcome) { // closing a card with an answer: file what happened where the agents read it
    try { item.outcomeNote = writeAnswerNote(item); console.log(`▦ ${item.id} closed with an answer → note "${item.outcomeNote}"`); }
    catch (e) { console.log('▦ could not file the answer note: ' + e.message); }
  }
  aios.save(DATA, m);
  return json(res, 200, { ok: true, item });
}
// the owner closed a matrix card and said what happened ("paid 10 Oct"): a fact, so it becomes a note in the brain
// that the agents find the same way as any other note (name and word overlap), instead of dying on the dashboard
function writeAnswerNote(item) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10), dept = DEPTS[item.dept]?.name || 'Owner';
  const name = `${day} owner answer - ${slug(item.title)}`;
  fs.writeFileSync(path.join(NOTES_DIR, name + '.md'),
    `---\nagent: OWNER\ndepartment: ${dept}\ntask: ${item.kind === 'task' ? 'task' : 'matrix'} ${item.id}\ndone: ${new Date().toISOString()}\n---\n# Owner answer: ${item.title}\n\n**${item.kind === 'task' ? 'What Wesley told the agent' : 'What happened'} (Wesley, ${day}):** ${item.outcome}\n\n` +
    (item.kind === 'task' ? `Given on the task: ${item.title}\n` : `The card said: ${item.detail || '—'}${item.why ? ` (${item.why})` : ''}\n`) + `Raised for: ${dept}${item.agent ? ' · ' + item.agent : ''}${item.client ? ' · client ' + item.client : ''}\n`);
  return name;
}

/* ---------- http ---------- */
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const body = req => new Promise((resolve, reject) => { let s = ''; req.on('data', d => { s += d; }); req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } }); });

await rebuildGraph();
const discovering = mcp.discover().then(l => { console.log(`  connectors: ${l.filter(s => s.status === 'connected').length} connected of ${l.length} (claude mcp list)`); return l; });
const agentsOut = () => { const setup = setupMap(); return AGENTS.map(a => ({ id: a.id, name: a.name, role: a.role, does: a.does, tools: a.tools, brief: a.brief || '', model: a.model || '', effort: a.effort || '', skills: skills.names(a), lessons: learn.count(BRAIN, a.id), department: a.department, lead: a.lead,
  interviewer: leadOf(a.department).id === a.id, setUp: setup[a.department] })); };
/** Add a task to the board: the task bar, the Chief of Staff and the AIOS Social section all come through here. → [status, task | error] */
async function addTask({ dept, text, model, effort, team, at, by } = {}) {
  const chief = by === 'chief'; // a task the Chief of Staff added: it waits 20 s before it starts, so Wesley can change the model or undo it
  if (!DEPTS[dept] || dept === 'brain') return [400, { error: 'unknown department' }];
  if (!text || !String(text).trim()) return [400, { error: 'empty task' }];
  const dueAt = at ? (typeof at === 'number' ? at : Date.parse(at)) : null; // V3.2.1: a task for a date
  if (at && !(dueAt > 0)) return [400, { error: 'at must be a time (ms or ISO)' }];
  if (dueAt && dueAt < Date.now() - 60000) return [400, { error: 'that time has passed — pick one that is still ahead' }];
  const r = await route(dept, String(text).trim());
  const asTeam = TEAMS.enabled && (team === true || teams.intent(text) || (dept === 'marketing' && /\breels?\b/i.test(text) && /\b(make|build|produce|create|finish\w*|ready|post|deliver)\b/i.test(text))); // a Reel asked for in Marketing is a team job: script, video, music, check // V3.2 (16 Sep): TEAM in the bar, or "as a team" in the sentence → the lead owns it and splits it
  const task = { id: nid(), dept, agent: asTeam ? leadOf(dept).id : r.agent, title: r.title, text: String(text).trim(), plan: r.plan, eta: r.eta, why: asTeam ? `team — ${leadOf(dept).name} splits it across the desks` : r.why, state: 'next', addedAt: Date.now(), by: chief ? 'chief' : 'you', model: normModel(model) || undefined, effort: normEffort(effort) || undefined, // model/effort: set on this task (beats routine, agent, office)
    team: asTeam ? { lead: leadOf(dept).id, asked: team === true ? 'you' : 'text' } : undefined };
  task.needsOk = r.needsOk; task.channel = r.channel || undefined; // V3.9: a task that sends, posts or pays is drafted first and only goes out after the owner's APPROVE & SEND
  if (dueAt) { task.state = 'scheduled'; task.dueAt = dueAt; } // waits for its minute, then waits for review
  const list = load(); list.push(task); save(list);
  console.log(`+ ${task.id} → ${task.agent}: ${task.title}${asTeam ? ' (team)' : ''}${dueAt ? ' · scheduled ' + untilText(dueAt) : ''}`);
  if (chief && assistantEmit) try { assistantEmit({ t: 'task', task: { id: task.id, dept, deptName: DEPTS[dept].name, agent: task.agent, agentName: agentName(task.agent), title: task.title, model: task.model || '', effort: task.effort || '', team: !!task.team, startsInMs: dueAt ? 0 : 20000 } }); } catch {} // the chip in the Chief of Staff panel
  if (!dueAt) setTimeout(() => { Promise.resolve(discovering).then(() => { const t = load().find(x => x.id === task.id); if (t && t.state === 'next') return runServerTask(task.id); }).catch(e => console.warn('start:', e.message)); }, chief ? 20000 : 4000); // no page needed: the server starts a new task itself (the page's own start, if open, wins and this is skipped)
  return [200, task];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/command-centre-v2.html' || url.pathname === '/dark' || url.pathname === '/light')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      const page = fs.readFileSync(HTML, 'utf8');
      return res.end(url.pathname === '/light' ? page : page.replace('<body>', '<body class="dark">')); // dark mode is the default on startup; /light opts back out
    }
    if (req.method === 'GET' && url.pathname === '/aios') { // V3.9: the AIOS dashboard — roles, live work, the Eisenhower matrix (plain HTML, no build)
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(fs.readFileSync(path.join(ROOT, 'src', 'aios.html'), 'utf8'));
    }
    if (url.pathname.startsWith('/api/matrix')) return matrixApi(req, res, url);
    if (url.pathname === '/api/budget' || url.pathname === '/api/budget/sync') return budgetApi(req, res, url);
    if (url.pathname === '/api/storage' && req.method === 'GET') { try { return json(res, 200, { ...storage.report(ROOT, cfg.storage), cleaned: undefined }); } catch (e) { return json(res, 500, { error: e.message }); } }
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, version, backend, model: cfg.model, modelName: modelName(cfg.model), models: MODEL_KEYS, effort: cfg.effort || '', efforts: EFFORT_KEYS, name: cfg.name, brain: BRAIN, notes: graph.notes, depts: DEPT_KEYS,
      agents: agentsOut(), setup: setupMap(), routines: (l => ({ count: l.length, paused: l.filter(r => r.paused).length, depts: routines.ALLOWED }))(loadRoutines()), roster: { customised: roster.customised, briefed: roster.briefed, files: roster.files, problems: roster.problems }, skills: (({ count, shipped, brain, problems }) => ({ count, shipped, brain, problems }))(skills.summary()), tools: backend === 'claude-cli', mcp: mcp.summary(), teams: TEAMS, browser: mcp.summary().browser });
    if (url.pathname === '/api/agents') return json(res, 200, { agents: agentsOut(), problems: roster.problems, files: roster.files });
    if (url.pathname === '/api/skills') return json(res, 200, refreshSkills().summary()); // reloads from disk: edit a skill, hit this, see it
    if (url.pathname.startsWith('/api/whatsapp')) { // AIOS Communications: counts from the local OpenWA (read-only); text goes to Claude only on READ INTO MATRIX
      try {
        if (url.pathname === '/api/whatsapp' && req.method === 'GET') return json(res, 200, await wa.build(url.searchParams.get('refresh') === '1'));
        if (url.pathname === '/api/whatsapp/tag' && req.method === 'POST') { const b = await body(req); wa.setTag(String(b.chatId || ''), b.tag || ''); return json(res, 200, await wa.build(false)); }
        if (url.pathname === '/api/whatsapp/matrix' && req.method === 'POST') {
          const b = await body(req); const w = await wa.waitingText(b.category || '');
          const r = await feedMatrix({ text: w.text, source: `WhatsApp: ${w.count} chat${w.count > 1 ? 's' : ''} waiting on a reply${b.category ? ' (' + b.category + ')' : ''}. Voice notes are not transcribed.` });
          return json(res, 200, { ...r, chats: w.count });
        }
      } catch (e) { return json(res, e.code || 500, { error: e.message }); }
      return json(res, 404, { error: 'not found' });
    }
    if (url.pathname === '/api/calendar-done') { // the tick on a calendar entry (posts and focus sessions): Wesley marks it done by hand
      const file = path.join(DATA, 'calendar-done.json'), read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
      if (req.method === 'GET') return json(res, 200, { done: read() });
      if (req.method === 'POST') { const { key, done } = await body(req); if (!key || typeof key !== 'string' || key.length > 300) return json(res, 400, { error: 'key required' }); const d = read(); if (done) d[key] = Date.now(); else delete d[key]; fs.writeFileSync(file, JSON.stringify(d, null, 1)); return json(res, 200, { ok: true, done: d }); }
    }
    if (url.pathname === '/api/timeboxes' && req.method === 'GET') { // FOCUS on the calendar: the Pomodoro sessions and blocks Wesley keeps here instead of in Google Calendar
      try { return json(res, 200, JSON.parse(fs.readFileSync(path.join(DATA, 'timeboxes.json'), 'utf8'))); } catch { return json(res, 200, { items: [] }); }
    }
    if (url.pathname === '/api/skill-audit' && req.method === 'GET') { // AIOS: which skills are used, refined, quiet, and whether their connectors are really wired
      const sk = refreshSkills();
      return json(res, 200, skillaudit.audit({ skills: sk.skills, agents: AGENTS, tasks: load(), servers: mcp.summary().servers, brainPath: BRAIN, proposals: skillaudit.loadProposals(DATA) }));
    }
    if (url.pathname === '/api/skill-audit/done' && req.method === 'POST') { // the owner has implemented the suggestion: mark it actioned, keep the skill open to future suggestions
      const { skill } = await body(req);
      const r = skillaudit.markProposalDone(DATA, String(skill || ''));
      return r ? json(res, 200, { ok: true }) : json(res, 404, { error: 'no open suggestion for that skill' });
    }
    if (url.pathname === '/api/skill-audit/propose' && req.method === 'POST') { // ask Claude for a concrete revision of one skill; it proposes, the owner decides
      const { skill } = await body(req);
      if (!refreshSkills().skills.find(x => x.name === skill)) return json(res, 404, { error: 'no such skill' });
      const p = await makeProposal(skill);
      return p ? json(res, 200, { ok: true, proposal: p }) : json(res, 502, { error: 'Claude did not answer' });
    }
    if (url.pathname.startsWith('/files/sops/') && req.method === 'GET') { // finished SOP files from the SOP builder, read-only, inside output/sops only
      const root = path.join(ROOT, 'output', 'sops'), rel = decodeURIComponent(url.pathname.slice('/files/sops/'.length)), file = path.resolve(root, rel);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'no such file' });
      const types = { '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pdf': 'application/pdf', '.html': 'text/html; charset=utf-8' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Disposition': 'inline; filename="' + path.basename(file).replace(/"/g, '') + '"' });
      return res.end(fs.readFileSync(file));
    }
    if (url.pathname === '/site' && req.method === 'GET') { res.writeHead(302, { Location: '/site/' }); return res.end(); }
    if (url.pathname.startsWith('/site/') && req.method === 'GET') return siteupdates.serve(SITE_ROOT, req, res, url); // the WRW website, read-only; ?src gives the exact source
    if ((url.pathname === '/site-preview' || url.pathname === '/site-preview/') && req.method === 'GET') return siteupdates.preview(SITE_ROOT, res, url); // a page in a phone-, tablet- or desktop-sized frame
    if (url.pathname === '/api/trackers' || url.pathname === '/api/trackers/sync') return trackersApi(req, res, url);
    if (url.pathname === '/api/dashboards' && req.method === 'GET') return json(res, 200, { dashboards: dashboardsData() });
    if (url.pathname === '/api/gcal' && req.method === 'GET') { // V3.12: Wesley's Google Calendar, read-only, from the private feeds (gcal.mjs); the feed addresses never leave the server
      if (url.searchParams.get('refresh') === '1') await syncCalendars();
      const g = gcal.load(DATA), from = +url.searchParams.get('from') || Date.now() - 7 * 86400000, to = +url.searchParams.get('to') || Date.now() + 42 * 86400000;
      return json(res, 200, { configured: GCALS.length > 0, at: g.at || 0, calendars: (g.calendars || []).map(({ name, colour, ok, error, events, at }) => ({ name, colour, ok, error, events, at })), events: (g.events || []).filter(e => e.start < to && e.end > from) });
    }
    if (url.pathname.startsWith('/api/attention')) { // V3.12: Claude Code sessions waiting on Wesley, from the hooks in his user settings (attention.mjs)
      if (url.pathname === '/api/attention' && req.method === 'GET') return json(res, 200, { sessions: attention.list(DATA) });
      if (url.pathname === '/api/attention' && req.method === 'POST') { try { attention.hook(DATA, await body(req)); } catch (e) { console.warn('attention:', e.message); } return json(res, 200, { ok: true }); }
      const dm = /^\/api\/attention\/([\w-]+)\/dismiss$/.exec(url.pathname);
      if (dm && req.method === 'POST') return json(res, 200, { ok: attention.dismiss(DATA, dm[1]) });
      return json(res, 404, { error: 'not found' });
    }
    const fixM = /^\/api\/dashboards\/([\w-]+)\/fix(\/matrix)?$/.exec(url.pathname);
    if (fixM) { // V3.12: the month's fix for a client restaurant (fix.mjs)
      const [, id, toMatrix] = fixM;
      if (req.method === 'GET') return json(res, 200, { fix: fixes.latest(DATA, id) });
      if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
      if (toMatrix) {
        const e = fixes.latest(DATA, id); if (!e) return json(res, 404, { error: 'no fix yet' });
        if (e.matrix) return json(res, 200, { ok: true, item: e.matrix, already: true });
        const d = dashboardsData().find(x => x.id === id), client = CLIENTS.find(c => d && c.name === d.name);
        const fri = new Date(); fri.setDate(fri.getDate() + ((5 - fri.getDay() + 7) % 7)); const feedId = 'f' + nid();
        const out = aios.normalise({ items: [{ title: e.fix.title, detail: [e.fix.issue, 'Actions: ' + e.fix.actions.join(' · '), 'Owner: ' + e.fix.owner, 'Check when next month\'s data is in: ' + e.fix.measure].join('\n'), urgent: true, important: true, dept: 'owner', due: fri.toLocaleDateString('en-CA'), why: 'This month\'s fix from the delivery data', client: client ? client.id : '' }] }, AGENTS, feedId, CLIENTS);
        const m = aios.load(DATA); m.feeds.push({ id: feedId, at: Date.now(), source: `This month's fix · ${d ? d.name : id}`, summary: e.fix.issue, input: e.fix.title, chars: 0, parts: 1, count: 1, parked: 0 }); m.items.push(...out.items); aios.save(DATA, m);
        fixes.markMatrix(DATA, id, out.items[0].id);
        return json(res, 200, { ok: true, item: out.items[0].id });
      }
      try { return json(res, 200, { fix: await makeFix(id) }); } catch (e) { return json(res, e.code || 500, { error: e.message }); }
    }
    if (url.pathname === '/api/uploads' && req.method === 'GET') return json(res, 200, { uploads: uploadsList().slice(0, 40) }); // uploaded documents the matrix can read in full
    if (url.pathname === '/api/lessons') return json(res, 200, { dir: learn.dir(BRAIN), agents: AGENTS.map(a => ({ id: a.id, name: a.name, ...learn.read(BRAIN, a.id) })).filter(x => x.rules.length || x.oneOffs.length) });
    if (url.pathname === '/api/mcp') { if (url.searchParams.get('refresh') === '1') await mcp.discover(); else await discovering; return json(res, 200, { ...mcp.summary(), tools: backend === 'claude-cli' }); }
    if (url.pathname === '/api/brain') return json(res, 200, graph);
    if (url.pathname === '/api/brainmap') { // the Brain as a map of the five strands of work, the desks that serve them, and every note under them (brainmap.mjs)
      try { if (!brainMapCache.at || Date.now() - brainMapCache.at > 20000) brainMapCache = { at: Date.now(), map: buildBrainMap({ vault: BRAIN, agents: AGENTS }) }; return json(res, 200, brainMapCache.map); } catch (e) { return json(res, 500, { error: e.message }); }
    }
    if (url.pathname === '/api/usage') return json(res, 200, await getUsage(url.searchParams.get('refresh') === '1')); // V3.6: the plan's gauge (never a 500: unavailable is an answer)
    if (url.pathname === '/api/tokens' && req.method === 'GET') { // 3 Nov 2026: what the tokens go on (tokens.mjs) — the chats' transcripts and the office's own ledger. Pages on this computer only, like the Chief of Staff
      if (!assistantAllowed(req)) return json(res, 403, { error: 'Token use is shown on this computer only.' });
      const sessions = await tokens.scanChats(DATA);
      return json(res, 200, tokens.report({ sessions, ledger: tokens.readLedger(DATA), tasks: load(), agents: AGENTS, depts: DEPTS, officeProject: tokens.projectKey(CLI_CWD),
        deliverable: [['Art of Operations reel', aoofile.isAooReel], ['Franchise Entry Report issue', ferfile.isIssue]] }));
    }
    if (url.pathname === '/api/tasks' && req.method === 'GET') return json(res, 200, load());
    if (url.pathname === '/api/routines' && req.method === 'GET') return json(res, 200, routinesOut());
    if (url.pathname === '/api/content' && req.method === 'GET') { try { return json(res, 200, { posts: weekpack.posts(ROOT, BRAIN) }); } catch (e) { return json(res, 200, { posts: [], error: e.message }); } } // the calendar's SOCIAL view: every post in the content calendar note
    if (url.pathname === '/api/routines' && req.method === 'POST') {
      const b = await body(req);
      if (!DEPTS[b.dept] || b.dept === 'brain') return json(res, 400, { error: 'unknown department' });
      if (!routines.ALLOWED.includes(b.dept)) return json(res, 400, { error: routines.refusal(b.dept), refused: true });
      const r = await makeRoutine({ dept: b.dept, text: b.text, when: b.when, agent: b.agent, needsOk: b.needsOk, model: b.model, effort: b.effort });
      return json(res, r.error ? 400 : 200, r);
    }
    const rm = url.pathname.match(/^\/api\/routines\/([^/]+)(?:\/(run|pause|resume))?$/);
    if (rm) {
      const r = loadRoutines().find(x => x.id === rm[1]);
      if (!r) return json(res, 404, { error: 'no such routine' });
      if (req.method === 'DELETE') { removeRoutine(r.id); return json(res, 200, { ok: true, routines: loadRoutines() }); }
      if (req.method !== 'POST') return json(res, 405, { error: 'POST or DELETE' });
      if (rm[2] === 'run') return json(res, 200, { ok: true, task: fire(r, { by: 'you' }), routines: loadRoutines() });
      if (rm[2] === 'pause' || rm[2] === 'resume') { editRoutine(r.id, { paused: rm[2] === 'pause' }); return json(res, 200, { ok: true, routines: loadRoutines() }); }
      const b = await body(req); const patch = {};
      if (typeof b.needsOk === 'boolean') patch.needsOk = b.needsOk; if (typeof b.paused === 'boolean') patch.paused = b.paused;
      if (typeof b.text === 'string' && b.text.trim()) patch.text = b.text.trim(); if (typeof b.title === 'string' && b.title.trim()) patch.title = b.title.trim().slice(0, 90);
      if (b.when && validWhen(b.when)) patch.when = b.when;
      if (b.model !== undefined) patch.model = normModel(b.model) || '';
      if (b.effort !== undefined) patch.effort = normEffort(b.effort) || '';
      editRoutine(r.id, patch); return json(res, 200, { ok: true, routines: loadRoutines() });
    }
    const calendarDone = () => { try { return JSON.parse(fs.readFileSync(path.join(DATA, 'calendar-done.json'), 'utf8')); } catch { return {}; } }; // the posts ticked as posted
    if (url.pathname === '/api/social' && req.method === 'GET') { // AIOS Social: the next post in each workstream and where it stands
      const list = social.streams({ posts: weekpack.posts(ROOT, BRAIN), done: calendarDone(), social: social.load(DATA), tasks: load() });
      return json(res, 200, { streams: list.map(s => s.task ? { ...s, task: { ...s.task, agentName: agentName(s.task.agent) } } : s) });
    }
    if (url.pathname.startsWith('/api/social/') && req.method === 'POST') { // hand · sign: the card's buttons (posted is the calendar's own tick)
      const act = url.pathname.slice(12), { key, on } = await body(req), st = social.load(DATA);
      const s = social.streams({ posts: weekpack.posts(ROOT, BRAIN), done: calendarDone(), social: st, tasks: load() }).find(x => x.key === key); // same ticks as the cards, or the "next" post differs
      if (!s) return json(res, 404, { error: 'that post is no longer next in its workstream' });
      if (act === 'sign') { if (on === false) delete st.signed[key]; else st.signed[key] = Date.now(); social.save(DATA, st); return json(res, 200, { ok: true }); }
      if (act === 'hand') {
        if (s.state === 'working' || s.state === 'review') return json(res, 409, { error: 'the office is already on it' });
        const [code, task] = await addTask({ dept: 'marketing', text: social.handText(s, s.post), by: 'chief' });
        if (code !== 200) return json(res, code, task);
        st.tasks[key] = task.id; delete st.signed[key]; social.save(DATA, st); return json(res, 200, { ok: true, task });
      }
      return json(res, 404, { error: 'unknown action' });
    }
    if (url.pathname === '/api/tasks' && req.method === 'POST') { const [code, out] = await addTask(await body(req)); return json(res, code, out); }
    if (url.pathname === '/api/files') { // AIOS Social's "save a copy": a finished file the office made, downloaded through the browser; inside the office, the Brain, Drive and the Desktop only
      if (!assistantAllowed(req)) return json(res, 403, { error: 'this page may not download files' });
      const want = String(url.searchParams.get('path') || '').trim(), abs = path.resolve(path.isAbsolute(want) ? want : path.join(ROOT, want));
      const roots = [ROOT, BRAIN, path.join(os.homedir(), 'Desktop'), 'G:\\My Drive'], inside = roots.some(r => { const rel = path.relative(path.resolve(r), abs); return !rel.startsWith('..') && !path.isAbsolute(rel); });
      if (!want || !inside) return json(res, 403, { error: 'that path is outside the office, the Brain and Drive' });
      let stat; try { stat = fs.statSync(abs); } catch { return json(res, 404, { error: 'not found' }); }
      if (!stat.isFile()) return json(res, 400, { error: 'that is a folder: open it instead' });
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': stat.size, 'Content-Disposition': `attachment; filename="${path.basename(abs).replace(/["\\\r\n]/g, '')}"` });
      return fs.createReadStream(abs).pipe(res);
    }
    if (url.pathname === '/api/open' && req.method === 'POST') { // open an output the office made, on this computer: only inside the office, the Brain, Drive and the Desktop, never a program
      if (!assistantAllowed(req)) return json(res, 403, { error: 'this page may not open files' });
      const b = await body(req), want = String(b.path || '').trim().replace(/^["'`]|["'`]$/g, '');
      if (!want || /[\0\r\n]/.test(want)) return json(res, 400, { error: 'no path' });
      const abs = path.resolve(path.isAbsolute(want) ? want : path.join(ROOT, want));
      const home = os.homedir(), roots = [ROOT, BRAIN, path.join(home, 'Desktop'), path.join(home, 'Downloads'), 'G:\\My Drive', ...(Array.isArray(cfg.openRoots) ? cfg.openRoots : [])];
      const inside = roots.some(r => { const rel = path.relative(path.resolve(r), abs); return !rel.startsWith('..') && !path.isAbsolute(rel); });
      if (!inside) return json(res, 403, { error: 'that path is outside the office, the Brain and Drive' });
      let st; try { st = fs.statSync(abs); } catch { return json(res, 404, { error: 'not found: ' + abs }); }
      if (st.isFile() && !/\.(mp4|mov|m4a|mp3|wav|pdf|docx?|xlsx?|pptx?|csv|png|jpe?g|gif|webp|svg|md|txt|html?|json|zip)$/i.test(abs)) return json(res, 403, { error: 'only documents, images, audio and video open from here' });
      try { spawn('explorer.exe', [abs], { detached: true, stdio: 'ignore' }).unref(); } catch (e) { return json(res, 500, { error: e.message }); }
      return json(res, 200, { ok: true, opened: abs });
    }
    if (url.pathname === '/api/upload' && req.method === 'POST') {
      const { filename, dataBase64, dept } = await body(req);
      if (!filename || !dataBase64) return json(res, 400, { error: 'filename and dataBase64 required' });
      const buf = Buffer.from(dataBase64, 'base64');
      if (buf.length > (/\.zip$/i.test(filename) ? 100 : 20) * 1024 * 1024) return json(res, 400, { error: `file too large (${/\.zip$/i.test(filename) ? 100 : 20}MB max)` });
      if (/\.csv$/i.test(filename) && deliverect.isExport(buf.subarray(0, 200).toString('utf8'))) {
        fs.mkdirSync(deliverect.dir(DATA), { recursive: true });
        const file = path.basename(filename).replace(/[^\w.\- ]+/g, '_');
        fs.writeFileSync(path.join(deliverect.dir(DATA), file), buf);
        const lines = buf.toString('utf8').split(/\r?\n/).filter(Boolean).length - 1;
        console.log(`▤ deliverect: ${file} filed for the dashboard (${lines} orders)`);
        return json(res, 200, { ok: true, note: 'Deliverect orders: ' + file, filename, chars: buf.length, deliverect: true, orders: lines, preview: `${lines.toLocaleString('en-GB')} delivery orders, filed for the client dashboard (not a Brain note).` });
      }
      if ((/\.csv$/i.test(filename) && ubereats.kindOf(buf.subarray(0, 600).toString('utf8'))) || ubereats.UBER_NAME.test(path.basename(filename))) { // an Uber Eats Manager report
        fs.mkdirSync(ubereats.dir(DATA), { recursive: true });
        const file = path.basename(filename).replace(/[^\w.\- ]+/g, '_');
        fs.writeFileSync(path.join(ubereats.dir(DATA), file), buf);
        console.log(`▤ ubereats: ${file} filed for the dashboard`);
        return json(res, 200, { ok: true, note: 'Uber Eats report: ' + file, filename, chars: buf.length, ubereats: true, preview: 'Uber Eats Manager report, filed for the client dashboard (not a Brain note).' });
      }
      if (/\.csv$/i.test(filename) && deliverect.isItems(buf.subarray(0, 200).toString('utf8'))) { // the Deliverect agent's top-items list
        fs.mkdirSync(deliverect.itemsDir(DATA), { recursive: true });
        const file = path.basename(filename).replace(/[^\w.\- ]+/g, '_');
        fs.writeFileSync(path.join(deliverect.itemsDir(DATA), file), buf);
        const s = deliverect.parseItems(buf.toString('utf8'));
        console.log(`▤ deliverect: ${file} filed for the dashboard (${s.top.length} of ${s.rows} items)`);
        return json(res, 200, { ok: true, note: 'Deliverect items: ' + file, filename, chars: buf.length, deliverect: true, preview: `Item sales, top ${s.top.length} of ${s.rows} items, ${s.from} to ${s.to}, filed for the client dashboard (not a Brain note).` });
      }
      let text; try { text = await extractText(filename, buf); } catch (e) { return json(res, 400, { error: `could not read ${filename}: ${e.message}` }); }
      if (text === null) return json(res, 400, { error: `${path.extname(filename) || 'that file type'} is not supported yet — .zip, .txt, .md, .pdf, Word, PowerPoint, Excel, OpenDocument, .rtf, .epub, .csv, .png, .jpg, .jpeg, .webp and .gif only` });
      text = text.trim();
      if (!text) return json(res, 400, { error: `${filename} has no extractable text (a scanned/image-only PDF, for instance)` });
      const base = path.basename(filename, path.extname(filename));
      const name = `Upload - ${base} - ${slug(Date.now().toString(36))}`;
      fs.mkdirSync(NOTES_DIR, { recursive: true });
      const deptLine = dept && DEPTS[dept] ? ` · uploaded for ${DEPTS[dept].name}` : '';
      fs.writeFileSync(path.join(NOTES_DIR, name + '.md'), `# ${filename}\n\n> Uploaded ${new Date().toLocaleString()}${deptLine} · ${text.length.toLocaleString()} characters\n\n${text}\n`);
      rebuildGraph();
      return json(res, 200, { ok: true, note: name, filename, chars: text.length, preview: text.slice(0, 400) });
    }
    const cm = url.pathname.match(/^\/api\/tasks\/([^/]+)\/change$/);
    if (cm && req.method === 'POST') { // the Chief of Staff's chip: take back a task that has not started yet, so it can be added again with another model, effort or team
      const list = load(), src = list.find(t => t.id === cm[1]); if (!src) return json(res, 404, { error: 'no such task' });
      if (src.state !== 'next') return json(res, 409, { error: 'it has already started: cancel it, or let it finish' });
      save(list.filter(t => t.id !== src.id)); return json(res, 200, { ok: true, dept: src.dept, text: src.text });
    }
    const hm = url.pathname.match(/^\/api\/tasks\/([^/]+)\/handover$/);
    if (hm && req.method === 'POST') { // the owner's click: hand a finished task to a seat (the suggested one, one he picks, or the Executive Assistant to decide)
      const src = load().find(t => t.id === hm[1]); if (!src) return json(res, 404, { error: 'no such task' });
      const { to, ea } = await body(req);
      if (!src.result || src.state === 'doing') return json(res, 400, { error: 'this task has no finished result to hand over yet' });
      if ((src.handoffDepth || 0) >= 3) return json(res, 400, { error: 'this has already been handed over three times: start a fresh task instead' });
      const target = ea ? AGENTS.find(a => a.id === 'elead') : AGENTS.find(a => a.id === (to || src.nextStep?.to));
      if (!target) return json(res, 400, { error: 'pick a seat to hand it to' });
      if (!ea && (target.id === src.agent || target.id === src.handoffFrom)) return json(res, 400, { error: 'a task is not handed back to the seat that wrote it or handed it over' });
      const hint = ea ? '' : String(src.nextStep?.what || '').trim();
      let title, text;
      if (ea) {
        title = ('Decide the next step: ' + src.title).slice(0, 90);
        text = `Wesley has asked you, as his Executive Assistant, to decide what happens next with this finished task from ${agentName(src.agent)}. Read the result below. Decide the best next step or steps and which seat should take each (use the roster you know), then end with one HANDOFF block per step so each starts when Wesley approves: write each block as a complete brief for that seat, with the figures and the files it needs and what it must deliver. If one piece of work forks (for example option 1 and option 2), write one block each. If nothing should happen next, say so in two lines and write no block. Never act on it yourself.\n\n=== THE FINISHED TASK: ${src.title} (${agentName(src.agent)}) ===\n${String(src.result).slice(0, 14000)}`;
      } else {
        try {
          const j = parseJSON(await ask('You write the brief for the next seat in an office of AI agents. Reply with ONLY a JSON object {"title":"<under 80 characters>","text":"<the task, written as Wesley would type it>"}. The brief must be self-contained: include the figures, names and files the seat needs, say exactly what to deliver, tell it not to reread what is already in the brief, and say that nothing goes out without Wesley.',
            `Next seat: ${target.name} (${target.role}). Its job: ${target.does}\nWhat the writer suggested: ${hint || 'take the next step'}\n\nThe finished task: ${src.title} (by ${agentName(src.agent)})\n${String(src.result).slice(0, 12000)}`, { maxTokens: 3500, timeout: 120000, model: 'sonnet', job: { kind: 'handover', agent: target.id } }));
          title = String(j.title || '').slice(0, 90); text = String(j.text || '');
        } catch (e) { console.warn('handover brief:', e.message); }
        if (!text) { title = (hint || 'Next step after: ' + src.title).slice(0, 90); text = `${hint || 'Take the next step on this finished task.'}\n\n=== FROM ${agentName(src.agent)}: ${src.title} ===\n${String(src.result).slice(0, 12000)}`; }
      }
      const nt = { id: nid(), dept: target.department, agent: target.id, title: title || ('Next step: ' + src.title).slice(0, 90), text: text + `\n\n(Handed over by ${agentName(src.agent)} from the task "${src.title}", on Wesley's click.)`, plan: [], eta: 10, why: `Handed over by ${agentName(src.agent)}`, state: 'doing', startedAt: Date.now(), addedAt: Date.now(), by: 'handoff', handoffFrom: src.agent, handoffTask: src.id, handoffDepth: (src.handoffDepth || 0) + 1, needsOk: false, team: teamFor(target.id, text) };
      const list = load(); list.push(nt); const si = list.findIndex(t => t.id === src.id); if (si >= 0) list[si].handedTo = [...(list[si].handedTo || []), nt.id]; save(list);
      console.log(`➜ ${src.id} handed to ${target.id} on the owner's click: ${nt.title}`); enqueue(() => runServerTask(nt.id)).catch(e => console.warn('handover:', e.message));
      return json(res, 200, { ok: true, id: nt.id, agent: target.id, agentName: target.name, title: nt.title });
    }
    const m = url.pathname.match(/^\/api\/tasks\/([^/]+)(?:\/(run|revise|approve|reject|answer))?$/);
    if (m && req.method === 'POST' && m[2] === 'answer') { // the owner is neither approving nor rejecting: he is giving the agent what it was missing
      const task = load().find(t => t.id === m[1]);
      if (!task) return json(res, 404, { error: 'no such task' });
      if (task.state !== 'waiting') return json(res, 400, { error: 'this task is not waiting for you' });
      const note = String((await body(req)).feedback || '').trim().slice(0, 4000);
      if (!note) return json(res, 400, { error: 'write the answer first' });
      // not a rejection: no revision count, no "sent back" mark, and nothing goes to learn.mjs, so it can never become a standing rule
      task.answers = (task.answers || 0) + 1; task.answeredAt = Date.now(); save(load().map(t => t.id === task.id ? task : t));
      try { writeAnswerNote({ kind: 'task', id: task.id, title: task.title, outcome: note, dept: task.dept, agent: task.agent }); } catch (e) { console.log('▦ could not file the answer note: ' + e.message); }
      console.log(`💬 ${task.id} answered by the owner: ${note.slice(0, 80)}`);
      enqueue(() => runServerTask(task.id, { feedback: note, answer: true })).catch(e => console.warn('answer:', e.message));
      return json(res, 200, { ok: true, id: task.id, state: 'doing' });
    }
    if (m && req.method === 'POST' && (m[2] === 'approve' || m[2] === 'reject')) { // D1: the owner's tick on a routine's draft
      const task = load().find(t => t.id === m[1]);
      if (!task) return json(res, 404, { error: 'no such task' });
      if (task.state !== 'waiting') return json(res, 400, { error: 'this task is not waiting for your OK' });
      const { feedback } = m[2] === 'reject' ? await body(req) : {};
      const note = String(feedback || '').trim();
      if (m[2] === 'approve' && !task.needsOk) { // V3.9: a reviewed task with nothing to send — the tick is the finish line, no second run
        Object.assign(task, { state: 'done', result: task.draft || task.result, approved: true, approvedAt: Date.now(), doneAt: Date.now() }); delete task.ask;
        fileBrainUpdates(task); fileSiteUpdates(task); fireHandoffs(task); fileMatrixItems(task);
        task.note = writeNote(task); save(load().map(t => t.id === task.id ? task : t)); await rebuildGraph();
        console.log(`✅ ${task.id} approved — done (note: ${task.note})`);
        autoFeed(task);
        return json(res, 200, { ok: true, id: task.id, state: 'done', task });
      }
      if (m[2] === 'reject') { task.revisions = (task.revisions || 0) + 1; task.rejectedAt = Date.now(); save(load().map(t => t.id === task.id ? task : t)); } // V3.8: a rejected draft is a real "sent back" too — persist before runServerTask reloads its own copy
      console.log(`${m[2] === 'approve' ? '✅' : '↩'} ${task.id} ${m[2] === 'approve' ? 'approved — ' + agentName(task.agent) + ' is sending' : 'sent back: ' + note.slice(0, 80)}`);
      enqueue(() => runServerTask(task.id, m[2] === 'approve' ? { approve: true } : { feedback: note || 'Not this. Rework it.' }))
        .then(t => { if (m[2] === 'reject' && note && t && !t.error) { const a = AGENTS.find(x => x.id === t.agent); return learn.classify(askLesson, a, t, note).then(v => { const r = learn.record(BRAIN, a, t, note, v); console.log(`  ↳ ${a.name} ${r.standing ? 'learned a rule' : 'noted a one-off'}: ${r.line.slice(0, 100)}`); }).then(() => proposeFromRejection(t)); } })
        .catch(e => console.warn('approval:', e.message));
      return json(res, 200, { ok: true, id: task.id, state: 'doing' });
    }
    if (m && req.method === 'POST' && (m[2] === 'run' || m[2] === 'revise')) {
      const list = load(); const task = list.find(t => t.id === m[1]);
      if (!task) return json(res, 404, { error: 'no such task' });
      const { feedback } = m[2] === 'revise' ? await body(req) : {};
      if (m[2] === 'revise') { task.revisions = (task.revisions || 0) + 1; task.rejectedAt = Date.now(); } // V3.8: a revise is a real "sent back" — the KPI rows below count these
      task.state = 'doing'; task.startedAt = Date.now(); save(list);
      const done = await runServerTask(task.id, { feedback }) || task; // V3.9: the same path as a routine — the result waits for the owner's review
      json(res, 200, done);
      if (feedback && !done.error) { // learn from the correction, after the reply is out the door
        const a = AGENTS.find(x => x.id === task.agent);
        learn.classify(askLesson, a, done, feedback).then(v => { const r = learn.record(BRAIN, a, done, feedback, v); console.log(`  ↳ ${a.name} ${r.standing ? 'learned a rule' : 'noted a one-off'}: ${r.line.slice(0, 100)}`); }).then(() => proposeFromRejection(done))
          .catch(e => console.warn('learn:', e.message));
      }
      return;
    }
    if (m && req.method === 'DELETE') { save(load().filter(t => t.id !== m[1])); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const { agent, text, history } = await body(req);
      if (!text || !String(text).trim()) return json(res, 400, { error: 'empty message' });
      const a = AGENTS.find(x => x.id === agent); if (!a) return json(res, 400, { error: 'unknown agent' });
      if (!onboard.active(DATA, a.department)) { // V3.5: "every weekday at 8am, …" · "routines" · "pause …" · "run … now" — unless the lead is mid-interview
        const rc = await routinesChat(a, String(text).trim());
        if (rc) return json(res, 200, { reply: rc.reply, read: [], tools: [], interview: false, routine: rc.routine || null, routines: true });
      }
      if (leadOf(a.department).id === a.id) { // the department lead can run the set-up interview
        refreshSkills();
        const o = await onboard.handle(String(text).trim(), { dept: a.department, deptName: DEPTS[a.department].name, lead: a, agents: AGENTS.filter(x => x.department === a.department),
          connected: mcp.summary().servers?.filter(x => x.status === 'connected').map(x => x.name || x.key) || [], brainPath: BRAIN, dataDir: DATA, ask: askInterview, business: cfg.name, afterWrite: refreshSkills });
        if (o) { if (o.wrote) console.log(`★ ${a.name} set up ${DEPTS[a.department].name}: ${o.wrote.briefs.length} briefs${o.wrote.skill ? ', skill ' + o.wrote.skill.name : ''}`); return json(res, 200, { reply: o.reply, read: [], tools: [], interview: !o.wrote, setup: setupMap() }); }
      }
      const r = await chat(agent, String(text).trim(), history);
      return json(res, 200, { ...r, interview: false });
    }
    if (url.pathname === '/api/motion/file') { // a contact sheet or a video from output/motion, for the Motion Studio panel
      if (!assistantAllowed(req)) return json(res, 403, { error: 'this computer only' });
      const base = path.join(ROOT, 'output', 'motion'), f = path.resolve(base, String(url.searchParams.get('p') || ''));
      if (!f.startsWith(base + path.sep) || !/\.(mp4|jpg|png)$/i.test(f) || !fs.existsSync(f)) return json(res, 404, { error: 'not found' });
      const size = fs.statSync(f).size, type = /\.mp4$/i.test(f) ? 'video/mp4' : /\.png$/i.test(f) ? 'image/png' : 'image/jpeg', range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (range) { const a = range[1] ? +range[1] : 0, b = range[2] ? Math.min(+range[2], size - 1) : size - 1; res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
      res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' }); return fs.createReadStream(f).pipe(res);
    }
    if (url.pathname === '/api/motion' || url.pathname === '/api/motion/clear') {
      if (!assistantAllowed(req)) return json(res, 403, { error: 'the motion studio answers only to the office page on this computer' });
      if (url.pathname === '/api/motion' && req.method === 'GET') return json(res, 200, { messages: motionMod.load(DATA).slice(-40), busy: motionBusy });
      if (url.pathname === '/api/motion/clear' && req.method === 'POST') { motionMod.clear(DATA); return json(res, 200, { ok: true }); }
      if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
      const b = await body(req), text = (String(b.text || '').trim().slice(0, 4000) + attachNote(b.attachments)).trim();
      if (!text) return json(res, 400, { error: 'say something first' });
      if (motionBusy) return json(res, 429, { error: 'the studio is still working on your last message' });
      motionBusy = true;
      res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-cache' });
      const line = o => { try { res.write(JSON.stringify(o) + '\n'); } catch {} };
      const alive = setInterval(() => line({ t: 'alive' }), 20000); // long renders: keep the stream open
      try { const r = await motionTurn(text, line); console.log(`🎬 motion: ${text.slice(0, 60)}${r.tools.length ? ' · ' + r.tools.join(', ') : ''}`); line({ t: 'reply', text: r.reply, tools: r.tools, media: r.media }); }
      catch (e) { console.warn('motion:', e.message); line({ t: 'error', error: e.message }); }
      finally { clearInterval(alive); motionBusy = false; res.end(); }
      return;
    }
    if (url.pathname === '/api/assistant' || url.pathname === '/api/assistant/clear') {
      if (!assistantAllowed(req)) return json(res, 403, { error: 'the assistant answers only to the office page on this computer' });
      if (url.pathname === '/api/assistant' && req.method === 'GET') return json(res, 200, { messages: assistantMod.load(DATA).slice(-40), busy: assistantBusy });
      if (url.pathname === '/api/assistant/clear' && req.method === 'POST') { assistantMod.clear(DATA); return json(res, 200, { ok: true }); }
      if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
      const b = await body(req), text = (String(b.text || '').trim().slice(0, 3400) + attachNote(b.attachments)).trim(), surface = b.surface === 'telegram' ? 'telegram' : 'panel';
      if (!text) return json(res, 400, { error: 'say something first' });
      if (assistantBusy) return json(res, 429, { error: 'still working on your last message: give it a moment' });
      assistantBusy = true;
      if (b.stream) res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-cache' });
      const line = o => { if (b.stream) res.write(JSON.stringify(o) + '\n'); };
      try {
        assistantEmit = b.stream ? ev => line(ev) : null;
        const r = await assistantTurn(text, surface, ev => line(ev));
        console.log(`💬 assistant (${surface}): ${text.slice(0, 60)}${r.tools.length ? ' · ' + r.tools.join(', ') : ''}`);
        if (b.stream) { line({ t: 'reply', text: r.reply, tools: r.tools }); res.end(); } else json(res, 200, r);
      } catch (e) { console.warn('assistant:', e.message); if (b.stream) { line({ t: 'error', error: e.message }); res.end(); } else json(res, 500, { error: e.message }); }
      finally { assistantBusy = false; assistantEmit = null; }
      return;
    }
    json(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); json(res, 500, { error: e.message }); }
});
{ const l = load(); let c = false; for (const t of l) if (t.state === 'waiting' && t.needsOk && !t.channel && isEmail(t)) { t.channel = 'email'; c = true; } if (c) save(l); } // V3.9: drafts from before the router named channels
{ const l = load(), r = recover(l); // tasks left at "doing" by a restart: start them again, or hold them for the owner (recover.mjs)
  if (r.requeue.length || r.held.length) { save(l); console.log(`↻ restart recovery: ${r.requeue.length} task(s) started again${r.requeue.length ? ' (' + r.requeue.join(', ') + ')' : ''}${r.held.length ? `, ${r.held.length} held for your OK (${r.held.join(', ')})` : ''}`); for (const id of r.requeue) enqueue(async () => { await discovering; return runServerTask(id); }); } } // wait for the connectors: a run that starts before they are found has none allowed
server.listen(cfg.port, cfg.host || '127.0.0.1', () => { // this computer only: other devices reach it through Tailscale Serve, never straight over the network
  console.log(`Agents Office ${version} → http://localhost:${cfg.port}`);
  console.log(`  business: ${cfg.name}   brain: ${BRAIN} (${graph.notes} notes, ${graph.links.length} links)   claude: ${backend} · ${modelName(cfg.model)}${cfg.effort ? ' · effort ' + cfg.effort : ''} by default (routing on Sonnet)`);
  getUsage(true).then(u => console.log(u.source === 'claude' ? `  usage: session ${u.session?.percent ?? '—'}% · week ${u.week?.percent ?? '—'}% (your Claude plan, as Claude Code shows it)` : `  usage: Claude's gauge unavailable (${u.reason}) — showing the office's own count`)).catch(() => {});
  console.log(`  tasks: ${FILE}   notes the agents write: ${NOTES_DIR}`);
  const rl = loadRoutines(); const nx = rl.filter(r => !r.paused && r.nextAt).sort((a, b) => a.nextAt - b.nextAt)[0];
  console.log(`  routines: ${rl.length} loaded${rl.some(r => r.paused) ? ' (' + rl.filter(r => r.paused).length + ' paused)' : ''}${nx ? ' · next ' + untilText(nx.nextAt) + ' ' + nx.title.toUpperCase() + ' (' + nx.agent + ')' : ''} · ${rlist.path}`);
  setInterval(() => { try { kickWorkers(ROOT, m => console.log('⚙ ' + m)); } catch {} }, 8000); // local generators: start a worker for any queued job (video studio, music, LTX)
  const tidy = async () => { try { weekpack.sync(ROOT, BRAIN); } catch (e) { console.warn('content calendar:', e.message); } try { const r = storage.daily(ROOT, cfg.storage);
    const af = path.join(DATA, 'storage-alert.json'); let st = {}; try { st = JSON.parse(fs.readFileSync(af, 'utf8')); } catch {} // tell Wesley on Telegram when the drive gets tight (once a day at most while it stays bad)
    const kind = storage.shouldAlert(st, r); if (kind) { const sent = await notify.telegram(storage.alertText(kind, r)); console.log(`📲 disk alert (${kind}): ${sent.ok ? 'sent' : 'not sent, ' + sent.reason}`); if (sent.ok) fs.writeFileSync(af, JSON.stringify({ level: r.level, at: Date.now() })); }
    console.log(`🗂 storage: ${r.freeGB} GB free · office files ${(r.officeMB).toFixed(0)} MB · filed ${r.library.items} item(s)${r.cleaned.freedMB ? ' · cleared ' + r.cleaned.freedMB + ' MB of rebuildable files' : ''}${r.warn.length ? ' · ' + r.warn.join(' ') : ''}`); } catch (e) { console.warn('storage:', e.message); } };
  setTimeout(tidy, 60000); setInterval(tidy, 6 * 3600000); // a minute after the office starts, then every six hours: file new work, clear rebuildable leftovers, update the report
  setInterval(tickRoutines, 20000); tickRoutines(); // the clock: every 20 s; the first tick catches up anything missed while the office was off (once, marked LATE)
  setTimeout(syncCalendars, 5000); setInterval(syncCalendars, 5 * 60000); // V3.12: Google Calendar every five minutes
  // V3.12: the fix follows the data (Wesley, 30 Oct: he uploads once a month, on the first Monday). When a restaurant's evidence differs
  // from the evidence its last fix was written from, and has not changed for 30 minutes (the month's files have all landed), a new fix
  // is written. Nothing new uploaded, no new fix. A failure waits three hours before the next try.
  let fixBusy = false, fixFailedAt = 0; const fixSeen = {};
  const fixTick = async () => {
    if (fixBusy || Date.now() - fixFailedAt < 3 * 3600000) return;
    fixBusy = true;
    try {
      for (const d of dashboardsData()) {
        if (!d.data?.delivery?.accuracy) continue;
        const ev = fixes.evidence(d.name, d.data), last = fixes.latest(DATA, d.id);
        if (last && last.evidence === ev) { delete fixSeen[d.id]; continue; }
        if (!fixSeen[d.id] || fixSeen[d.id].ev !== ev) { fixSeen[d.id] = { ev, at: Date.now() }; continue; }
        if (Date.now() - fixSeen[d.id].at < 30 * 60000) continue;
        try { const e = await makeFix(d.id); delete fixSeen[d.id]; console.log(`⚑ fix from the new data · ${d.name}: ${e.fix.title}`); } catch (e) { fixFailedAt = Date.now(); console.warn('fix:', e.message); }
      }
    } finally { fixBusy = false; }
  };
  setTimeout(fixTick, 90000); setInterval(fixTick, 10 * 60000);
  console.log(`  agents: 35 (${roster.customised} customised${roster.briefed ? ', ' + roster.briefed + ' briefed' : ''}${roster.files.length ? ' via ' + roster.files.join(' + ') : ''})   tools: ${backend === 'claude-cli' ? 'connected MCP servers' + (cfg.tools?.web === false ? '' : ' + web') + (mcp.browserOn() ? ' + the owner\'s Chrome (' + (mcp.browserState().installed ? 'extension paired' + (mcp.browserState().device ? ': ' + mcp.browserState().device : '') : 'extension NOT paired — run `claude --chrome` once') + ')' : '') : 'none on the API backend'}`);
  console.log(`  teams: ${TEAMS.enabled ? 'on — TEAM in the bar or "as a team" in the sentence; the lead splits it across up to ' + TEAMS.max + ' desks' : 'off (teams.enabled in office.config.json)'}`);
  const sk = skills.summary(); const setup = setupMap(); const notYet = DEPT_KEYS.filter(k => !setup[k]);
  console.log(`  skills: ${sk.count} (${sk.shipped} shipped in skills/, ${sk.brain} in ${path.join(NOTES_DIR, 'skills')})${sk.problems.length ? '   ⚠ ' + sk.problems.length + ' problem' + (sk.problems.length > 1 ? 's' : '') + ' — see npm run check' : ''}`);
  console.log(`  set up: ${notYet.length === DEPT_KEYS.length ? 'no department yet — open a lead\'s chat and say "set up"' : notYet.length ? DEPT_KEYS.length - notYet.length + ' of 6 departments (not yet: ' + notYet.map(k => DEPTS[k].name).join(', ') + ')' : 'all six departments'}   lessons: ${learn.dir(BRAIN)}`);
});
