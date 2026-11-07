#!/usr/bin/env node
// Motion studio MCP server: the Motion Director's tools. It writes a composition (HTML that paints any frame from t),
// looks at stills, drafts it (every frame painted and scanned by the engine; the critic only on request), and renders the final
// from a draft that breaks no rule. Free and local: Chrome paints, ffmpeg stitches, the score is synthesised.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync, spawn } from 'node:child_process';
import { MAX_ACTIVE, ROOT, SERIES, WORKER, active, ensureDirs, listJobs, newId, readJob, seriesInfo, seriesList, sourceOf, workerAlive, writeJob, writeProject } from './shared.mjs';
import { readNarration } from './voice.mjs';
import { lint } from './engine.mjs';
import * as sfx from './sfx.mjs';
import { loadConfig } from '../../config.mjs';

/* ---------- the Brain, read only: the Director can open any note, including an uploaded master prompt ---------- */
const BRAIN_DIR = (() => { try { return loadConfig().brainPath; } catch { return ''; } })();
const brainFiles = () => { const out = []; (function walk(d, depth) { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) { if (depth < 4) walk(p, depth + 1); } else if (e.name.endsWith('.md')) out.push(p); } })(BRAIN_DIR, 0); return out; };
const noteName = f => path.basename(f, '.md');

const src = { html: { type: 'string', description: 'The whole composition: a complete HTML page (see the contract in your instructions).' },
  from: { type: 'string', description: 'Instead of html: the job id whose source to start from, with edits applied.' },
  edits: { type: 'array', description: 'With from: exact find/replace edits, each find must occur exactly once in that source.', items: { type: 'object', required: ['find', 'replace'], properties: { find: { type: 'string' }, replace: { type: 'string' } } } },
  title: { type: 'string', description: 'Short name for the piece.' },
  series: { type: 'string', description: 'The series this piece belongs to (e.g. art-of-operations).' },
  narration: { type: 'string', description: 'Narrated series only: the motion_narrate job id whose lines this piece places with voice: [{ line, at }].' } };
const TOOLS = [
  { name: 'brain_search', description: 'Find notes in Wesley\'s Brain by words in their name or text (read only). Use it when he names a note or a master prompt you cannot place, then open the match with brain_read. Uploaded documents are notes named Upload - something.', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } },
  { name: 'brain_read', description: 'Read a Brain note in full (read only). Pass the note name exactly as given, for example Upload - mba-motion-explainer-prompt - mvqkchj3. Long notes come in parts: pass offset (next_offset from the last call) to read on. Follow what a master prompt says exactly.', inputSchema: { type: 'object', required: ['note'], properties: { note: { type: 'string' }, offset: { type: 'integer' } } } },
  { name: 'motion_preview', description: 'Quick look (about 10–30 s): checks the house rules, paints stills on the beat grid and returns them as contact-sheet images with the engine\'s checks. No video. Use it while composing; it waits for the result.', inputSchema: { type: 'object', properties: { ...src, at: { type: 'array', items: { type: 'number' }, description: 'Extra moments (seconds) to paint as stills.' } } } },
  { name: 'motion_draft', description: 'Draft: paints EVERY frame (half size) with the synthesised score and scans every frame for dead stretches, hard colour cuts and off-beat cuts. Returns a job id; then call motion_job. A draft is clean when no rule is broken and no frame is dead. The critic (a separate Opus 5.5 that scores the stills) runs only when critic: true is passed; it costs a full model run, so use it only when Wesley asks for one.', inputSchema: { type: 'object', properties: { ...src, brief: { type: 'string', description: 'What Wesley asked for, in a line.' }, critic: { type: 'boolean', description: 'Also have the critic score the stills (slow and costly; only when Wesley asks).' } } } },
  { name: 'motion_job', description: 'One job\'s state; when done, its checks, dead frames, the critic\'s scores and fixes, the file, and the contact sheets as images. Pass wait_seconds (up to 75) to wait for it to finish; repeat until done or failed.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' }, wait_seconds: { type: 'integer' }, look: { type: 'boolean', description: 'Attach the contact sheets (default true when done).' } } } },
  { name: 'motion_final', description: 'Render the full-size final from a clean draft (no broken rule, no dead frames). Refused otherwise. Returns a job id; then motion_job.', inputSchema: { type: 'object', required: ['draft_id'], properties: { draft_id: { type: 'string' } } } },
  { name: 'motion_series', description: 'A series brief (what it is, the look, the motion language, the sound) with its reference images: the delivered work the piece must sit beside. Call it FIRST for any piece that belongs to a series. Without a name, lists the series. For a planned series, pass episode for that week\'s plan row (topic, angle, worked example).', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'e.g. art-of-operations, operators-ledger' }, episode: { type: 'integer', description: 'Episode number, for the plan row.' } } } },
  { name: 'motion_narrate', description: 'Narrated series only (The Operator\'s Ledger): voice the script, one line per scene (ids s1 to s9). source "clone" (default) is Wesley\'s cloned voice from VoiceStudio on this PC (VoxCPM2), de-plosived and word-timed with Whisper; "recording" uses Wesley\'s own recordings (give recordings: [{ line, file }]); "stand-in" is a local voice for drafts while VoiceStudio is off (a final is refused with it). Returns a job id; call motion_job until done, then pass that id as narration on motion_preview and motion_draft and place the lines with voice: [{ line, at }] in M.scene. Timings reach the page as narration/words.js (M.cue, M.at, M.caption).', inputSchema: { type: 'object', required: ['lines'], properties: { lines: { type: 'array', items: { type: 'object', required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' } } } }, source: { type: 'string', enum: ['clone', 'recording', 'stand-in'] }, recordings: { type: 'array', items: { type: 'object', required: ['line', 'file'], properties: { line: { type: 'string' }, file: { type: 'string' } } } }, series: { type: 'string' } } } },
  { name: 'motion_source', description: 'The HTML source of a job, to revise it.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } } },
  { name: 'motion_list', description: 'The ten most recent motion jobs and their state.', inputSchema: { type: 'object', properties: {} } },
  { name: 'motion_cancel', description: 'Cancel a queued or running job.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } } },
  { name: 'sfx_library', description: 'The recorded sounds already in the library (fetched before, ready for S.sample), optionally filtered by words in their title or tags. Look here before sfx_search: reuse is instant and needs no internet.', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words to filter by, e.g. "glass" or "page turn". Empty lists everything.' } } } },
  { name: 'sfx_search', description: 'Search Openverse (Freesound and Wikimedia Commons, about 590,000 sound effects and field recordings) for a recorded sound the synth cannot fake: glass, pours, paper, doors, crowds, kitchens, cutlery, footsteps, weather, machines. Only CC0, public-domain and CC BY sounds are returned. Openverse matches every word, so use two or three: the thing and the action ("glass clink", "page turn", "espresso steam", "door slam"); add a word only to narrow a long list. 20 results a page; pass page for more. Then sfx_fetch the best one or two.', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, max_seconds: { type: 'number', description: 'Longest sound to list (default 30; up to 90 for ambiences).' }, source: { type: 'string', enum: ['freesound', 'wikimedia_audio', 'any'], description: 'Default freesound (the sound-effects archive). Wikimedia is mostly music and speech.' }, licences: { type: 'array', items: { type: 'string', enum: ['cc0', 'pdm', 'by'] }, description: 'Default all three. Pass ["cc0", "pdm"] for sounds that need no credit.' }, page: { type: 'integer' } } } },
  { name: 'sfx_fetch', description: 'Fetch a sound from sfx_search into the library: downloaded, converted to 48 kHz stereo WAV, trailing silence trimmed, peak set to -3 dBFS, measured (onset, peak, noise floor, clipping) and drawn as a waveform you can see. Returns its library id (ov-xxxxxxxx) for S.sample(t, id, { align, gain, … }) and any quality flags. You cannot hear it: judge it by the waveform (one clean event, no long tail of noise) and the flags, and fetch an alternative when in doubt.', inputSchema: { type: 'object', required: ['fetch'], properties: { fetch: { type: 'string', description: 'The "fetch" field of a search result (the 36-character Openverse id).' } } } },
];

const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = s => ({ isError: true, content: [{ type: 'text', text: s }] });
const images = files => files.filter(f => fs.existsSync(f)).map(f => ({ type: 'image', data: fs.readFileSync(f).toString('base64'), mimeType: /\.png$/i.test(f) ? 'image/png' : 'image/jpeg' }));

function startWorker() {
  if (workerAlive()) return false;
  if (process.platform !== 'win32') { spawn(process.execPath, [WORKER], { detached: true, stdio: 'ignore' }).unref(); return true; }
  const cmd = `"${process.execPath}" "${WORKER}"`; // started through WMI so it outlives the Claude run that asked for it
  try { execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='${cmd.replace(/'/g, "''")}'}; if ($r.ReturnValue -ne 0) { exit 1 }`], { windowsHide: true, timeout: 20000, stdio: 'ignore' }); }
  catch { spawn(process.execPath, [WORKER], { detached: true, windowsHide: true, stdio: 'ignore' }).unref(); } // the office also keeps one alive during a motion turn (serve.mjs keepMotionWorker)
  return true;
}
const kick = () => { if (listJobs().some(j => j.state === 'queued')) startWorker(); };

/** the source for a new job: whole html, or a previous job's source with exact edits */
function sourceFrom(a) {
  if (a.html) return { html: String(a.html) };
  if (!a.from) return { problem: 'Give html (the whole page) or from (a job id) with edits.' };
  let html = sourceOf(a.from); if (html == null) return { problem: 'No source for job ' + a.from };
  for (const [i, e] of (a.edits || []).entries()) {
    const n = html.split(e.find).length - 1;
    if (n !== 1) return { problem: `edit ${i + 1}: the find text occurs ${n} times in ${a.from}'s source; it must occur exactly once. Make it longer or call motion_source.` };
    html = html.replace(e.find, () => e.replace);
  }
  return { html };
}
function queue(mode, a, extra = {}) {
  const s = sourceFrom(a); if (s.problem) return { problem: s.problem };
  const series = a.series || extra.series || null; if (series && !seriesInfo(series)) return { problem: `No series called ${series}. Known: ${seriesList().join(', ')}.` };
  const narration = a.narration || extra.narration || null;
  if (narration) { const n = readNarration(narration); if (!n) return { problem: `No finished narration ${narration}: make it with motion_narrate and wait for motion_job to say done.` }; if (!series || !n.meta.series || n.meta.series !== series) return { problem: `Narration ${narration} belongs to the series ${n.meta.series}: pass series: "${n.meta.series}" too.` }; }
  const L = lint(s.html); if (L.rules.length) return { problem: 'House rules broken, nothing rendered:\n- ' + L.rules.join('\n- ') };
  ensureDirs(); const act = active(listJobs()); if (act.length >= MAX_ACTIVE) return { problem: `The queue is full (${act.length} jobs). Check motion_list.` };
  const id = newId(); writeProject(id, s.html, { narration });
  const job = writeJob({ id, state: 'queued', mode, title: String(a.title || '').slice(0, 80), brief: String(a.brief || '').slice(0, 400), at: (a.at || []).map(Number).filter(Number.isFinite).slice(0, 6), parent: a.from || extra.parent || null, createdAt: Date.now(), ...extra, series, narration });
  startWorker(); return { job, ahead: act.length };
}

function brief(j) {
  const r = j.result, c = j.critique, o = { id: j.id, mode: j.mode, title: j.title, state: j.state, step: j.step || undefined, error: j.error || undefined };
  if (j.narration && j.mode === 'narrate') Object.assign(o, { narration: j.narration, next: j.state === 'done' ? `Pass narration: "${j.id}" and series: "${j.series}" on motion_preview and motion_draft; place the lines with voice: [{ line, at }].` : undefined });
  if (r?.captions) o.captions = r.captions;
  if (r?.credits) o.credits = r.credits + (r.sounds?.some(s => s.licence === 'by') ? ' (CC BY sounds: the credit lines must go with the post; tell Wesley)' : ' (no credit needed)'); if (r?.standIn) o.voice = 'STAND-IN narration: a final is refused until it is Wesley\'s voice';
  if (r) Object.assign(o, { file: r.file || undefined, sheets: r.sheets, score: r.audio || undefined, seconds: r.seconds, errors: r.errors.length ? r.errors : undefined, warnings: r.warnings.length ? r.warnings : undefined, checks: r.checks, dead: r.dead?.length ? r.dead : undefined });
  if (j.telegram) o.telegram = j.telegram.sent ? (j.telegram.videoAttached === false ? 'sent to Wesley on Telegram as a message (video not attached: ' + j.telegram.reason + ')' : 'sent to Wesley on Telegram for review') : 'not sent to Telegram: ' + j.telegram.reason;
  if (c?.error) o.critic = { error: c.error };
  else if (c) o.critic = { lowest: c.min, overall: c.overall, fixes: c.fixes, verdict: c.verdict }; // advice only: it never blocks the final
  if (j.ears?.ok) o.ears = { verdict: j.ears.verdict, loudness: j.ears.loudness, fixes: j.ears.fixes.length ? j.ears.fixes : undefined, sync: j.ears.sync ?? undefined, style: j.ears.style.length ? 'Earshot scores against fast product-launch films; these are style differences, not faults: ' + j.ears.style.join(' | ') : undefined }; // advice only: it never blocks the final
  else if (j.ears) o.ears = { skipped: j.ears.reason };
  if (j.state === 'done' && j.mode === 'draft') o.next = j.passed ? `Clean. Look at the contact sheets yourself; if it is good, call motion_final with draft_id ${j.id}.`
    : 'Fix the errors (rules, dead frames, off-beat cuts), then motion_draft again with from: ' + j.id + ' and edits.';
  return o;
}

const tools = {
  async motion_preview(a) {
    const q = queue('stills', a); if (q.problem) return fail(q.problem);
    const until = Date.now() + 90000; let j = q.job;
    while (!['done', 'failed', 'cancelled'].includes(j.state) && Date.now() < until) { await new Promise(r => setTimeout(r, 1500)); j = readJob(j.id) || j; kick(); }
    if (j.state !== 'done') return text(brief(j));
    return { content: [{ type: 'text', text: JSON.stringify(brief(j), null, 2) }, ...images(j.result.sheets)] };
  },
  motion_draft(a) {
    const q = queue('draft', a, { critic: !!a.critic }); if (q.problem) return fail(q.problem);
    return text({ jobId: q.job.id, state: 'queued', jobsAhead: q.ahead, next: 'Call motion_job with this id and wait_seconds 75; repeat until done. A draft takes about a minute (plus a few with the critic).' });
  },
  async motion_job(a) {
    kick(); const id = String(a.job_id || ''), until = Date.now() + Math.min(75, Math.max(0, +a.wait_seconds || 0)) * 1000;
    let j = readJob(id); if (!j) return fail('No such job: ' + a.job_id);
    while (!['done', 'failed', 'cancelled'].includes(j.state) && Date.now() < until) { await new Promise(r => setTimeout(r, 2000)); j = readJob(id) || j; kick(); }
    const look = a.look ?? (j.state === 'done');
    return { content: [{ type: 'text', text: JSON.stringify(brief(j), null, 2) }, ...(look && j.result ? images(j.result.sheets) : [])] };
  },
  motion_final(a) {
    const d = readJob(String(a.draft_id || '')); if (!d) return fail('No such job: ' + a.draft_id);
    if (d.mode !== 'draft' || d.state !== 'done') return fail(`Job ${d.id} is not a finished draft.`);
    if (d.result?.standIn) return fail(`Refused: draft ${d.id} is narrated by a stand-in voice. Make the narration with Wesley's voice (motion_narrate, source clone once VoiceStudio is running, or his recordings), redraft with it, and then the final.`);
    if (!d.passed) return fail(`Refused: draft ${d.id} breaks a rule (${d.result?.errors.length || 0} errors, ${d.result?.dead?.length || 0} dead stretches). Fix them and draft again first.`);
    const q = queue('final', { from: d.id, edits: [], title: d.title, brief: d.brief }, { parent: d.id, series: d.series || null, narration: d.narration || null }); if (q.problem) return fail(q.problem);
    return text({ jobId: q.job.id, state: 'queued', next: 'Call motion_job with this id and wait_seconds 75 until done; report the file path. When it is done the studio sends it to Wesley on Telegram for review by itself: say whether it went (the telegram field).' });
  },
  motion_series(a) {
    if (!a.name) return text({ series: seriesList(), next: 'Call motion_series with a name.' });
    const s = seriesInfo(a.name); if (!s) return fail(`No series called ${a.name}. Known: ${seriesList().join(', ')}.`);
    let row = '';
    if (a.episode) { try { const cfg = JSON.parse(fs.readFileSync(path.join(SERIES, s.name, 'series.json'), 'utf8')), plan = fs.readFileSync(path.join(ROOT, cfg.plan), 'utf8').split(/\r?\n/), head = plan.find(l => /^\|\s*#\s*\|/.test(l)) || '', hit = plan.find(l => new RegExp('^\\|\\s*0?' + a.episode + '\\s*\\|').test(l)); row = hit ? `\n\nPLAN ROW FOR EPISODE ${a.episode}\n${head}\n${hit}` : `\n\nThere is no plan row for episode ${a.episode}.`; } catch { row = '\n\n(This series has no plan.)'; } }
    return { content: [{ type: 'text', text: s.brief + row + `\n\nPass series: "${s.name}" on motion_preview and motion_draft so its checks apply. Assets: kit/series/${s.name}/ (plates/, zh.css, fonts/).` }, ...images(s.refs)] };
  },
  motion_narrate(a) {
    const series = a.series || 'operators-ledger', cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(SERIES, series, 'series.json'), 'utf8')); } catch { return null; } })();
    if (!cfg?.narration) return fail(`Narration is only for narrated series; ${series} is not one. Every sound there is synthesised.`);
    const lines = (a.lines || []).map(l => ({ id: String(l.id || '').trim(), text: String(l.text || '').replace(/\s+/g, ' ').trim() }));
    const bad = lines.filter(l => !/^s[1-9]$/.test(l.id) || l.text.split(' ').length < 2);
    if (!lines.length || bad.length || new Set(lines.map(l => l.id)).size !== lines.length) return fail('Give one line per scene with ids s1 to s9 (unique), each a sentence or more.');
    const source = a.source || 'clone';
    if (source === 'recording') for (const r of a.recordings || []) { const f = path.resolve(String(r.file || '')); if (!fs.existsSync(f)) return fail('Recording not found: ' + r.file); }
    ensureDirs(); const act = active(listJobs()); if (act.length >= MAX_ACTIVE) return fail(`The queue is full (${act.length} jobs).`);
    const job = writeJob({ id: newId(), state: 'queued', mode: 'narrate', title: 'Narration: ' + lines[0].text.slice(0, 40), series, source, lines, recordings: a.recordings || [], createdAt: Date.now() });
    startWorker();
    return text({ jobId: job.id, state: 'queued', next: `Call motion_job with this id and wait_seconds 75 until done (the cloned voice takes a minute or two a line). Then pass narration: "${job.id}" and series: "${series}" on motion_preview and motion_draft.` });
  },
  brain_search(a) {
    if (!BRAIN_DIR) return fail('The Brain folder is not configured.');
    const q = String(a.query || '').toLowerCase().trim(); if (!q) return fail('Say what to look for.');
    const words = q.split(/\s+/).filter(Boolean), hits = [];
    for (const f of brainFiles()) { let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; } const n = noteName(f).toLowerCase(), low = t.toLowerCase(); let s = 0; for (const w of words) { if (n.includes(w)) s += 6; const m = low.split(w).length - 1; s += Math.min(m, 8); } if (s) { const i = low.indexOf(words[0]); hits.push({ s, note: noteName(f), chars: t.length, snippet: i >= 0 ? t.slice(Math.max(0, i - 60), i + 160).replace(/\s+/g, ' ') : '' }); } }
    return text(hits.sort((x, y) => y.s - x.s).slice(0, 10).map(({ s, ...h }) => h));
  },
  brain_read(a) {
    if (!BRAIN_DIR) return fail('The Brain folder is not configured.');
    const want = String(a.note || '').replace(/\.md$/i, '').trim().toLowerCase(), files = brainFiles();
    const f = files.find(x => noteName(x).toLowerCase() === want) || files.find(x => path.relative(BRAIN_DIR, x).replace(/\\\\/g, '/').replace(/\.md$/i, '').toLowerCase() === want) || files.find(x => noteName(x).toLowerCase().includes(want));
    if (!f) return fail('No such note: ' + a.note + '. Try brain_search.');
    const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''), off = Math.max(0, a.offset | 0), part = t.slice(off, off + 30000);
    return text({ note: noteName(f), chars: t.length, offset: off, next_offset: off + part.length < t.length ? off + part.length : null, text: part });
  },
  sfx_library(a) {
    try { const all = sfx.library(a.query || ''); return text({ count: all.length, sounds: all.slice(0, 60), next: all.length ? "Place one with S.sample(t, 'ov-…', { align, gain }) in score(S)." : 'Nothing matches: try sfx_search.' }); }
    catch (e) { return fail(e.message); }
  },
  async sfx_search(a) {
    try { const r = await sfx.search({ query: a.query, maxSeconds: a.max_seconds ?? 30, source: a.source || 'freesound', licences: a.licences, page: a.page }); return text({ ...r, next: r.results.length ? 'sfx_fetch the best match by its "fetch" field (look at the waveform it returns), then S.sample(t, its id).' : 'Nothing found: describe the sound differently (the thing, the action, close or distant).' }); }
    catch (e) { return fail(e.message); }
  },
  async sfx_fetch(a) {
    try {
      const s = await sfx.fetchSound(a.fetch), { waveform, attribution, file, ...rest } = s;
      const use = `S.sample(t, '${s.id}', { align: '${/whoosh|swoosh|swell|riser|rise|sweep/i.test(s.title + ' ' + (s.tags || []).join(' ')) ? 'peak' : 'onset'}', gain: 1 })`;
      return { content: [{ type: 'text', text: JSON.stringify({ ...rest, use, credit: s.needsCredit ? 'CC BY: the engine writes the credit line into credits.txt beside the video; tell Wesley it needs crediting where it is posted.' : 'No credit needed.' }, null, 2) }, ...images(waveform ? [waveform] : [])] };
    } catch (e) { return fail(e.message); }
  },
  motion_source(a) { const h = sourceOf(String(a.job_id || '')); return h == null ? fail('No source for job ' + a.job_id) : text(h); },
  motion_list() { kick(); return text(listJobs().slice(-10).reverse().map(j => ({ id: j.id, mode: j.mode, title: j.title, state: j.state, step: j.step || undefined, passed: j.passed ?? undefined, lowest: j.critique?.min }))); },
  motion_cancel(a) { const j = readJob(String(a.job_id || '')); if (!j) return fail('No such job: ' + a.job_id); if (j.state === 'queued' || j.state === 'running') { writeJob({ ...j, state: 'cancelled', finishedAt: Date.now() }); return text({ id: j.id, state: 'cancelled' }); } return fail(`Job ${j.id} is ${j.state}.`); },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'motion-studio', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? Promise.resolve(t(m.params.arguments || {})).then(ok, e => ok(fail('Internal error: ' + (e.message || e)))) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
