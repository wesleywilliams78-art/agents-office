// Local music connector: the MCP server the office agents talk to (stdio, JSON-RPC, no dependencies).
// It validates a request, writes a job file and makes sure the background worker (worker.mjs) is running.
// Music is made on this computer with ACE-Step 1.5: free, no account, no credits.
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { DEFAULT_SECONDS, MAX_ACTIVE, MAX_SECONDS, MIN_SECONDS, WORKER, active, ensureDirs, listJobs, newId, readJob, workerAlive, writeJob } from './shared.mjs';

const TOOLS = [
  { name: 'music_status', description: 'Is the local music generator ready? Shows the queue and the limits. Free; read-only.', inputSchema: { type: 'object', properties: {} } },
  { name: 'music_submit', description: 'Queue a piece of music to be generated locally on the owner\'s computer with ACE-Step (free, no credits). Instrumental by default, which is what a video music bed needs. Roughly a minute or two of waiting for a 60-second piece once the model is warm; the first job after a long idle takes longer because the model loads. It returns a job id straight away: check it later with music_job. The file is saved under output/music/ and the path appears in music_job, ready for HyperFrames or Canva as a music bed. For a voiceover use `hyperframes tts` (Kokoro) instead.', inputSchema: { type: 'object', required: ['prompt'], properties: {
    prompt: { type: 'string', description: 'The style in plain English: mood, instruments, tempo feel, what it is for. For a calm business presentation: "slow, warm ambient piano and soft pads, minimal, unobtrusive, no drums". Say what to avoid.' },
    duration_seconds: { type: 'integer', description: `Length in seconds, ${MIN_SECONDS} to ${MAX_SECONDS} (default ${DEFAULT_SECONDS}). Make it at least as long as the video; a bed can be looped or faded.` },
    instrumental: { type: 'boolean', description: 'Default true: no vocals.' },
    lyrics: { type: 'string', description: 'Only when instrumental is false.' },
    bpm: { type: 'integer', description: 'Optional tempo, 40 to 200.' },
    requested_by: { type: 'string', description: 'Your desk name, so the owner can see who asked.' },
  } } },
  { name: 'music_job', description: 'Check one music job: queued, running, done (with the saved file path), failed (with the reason) or cancelled. Pass wait_seconds (up to 75) and the call waits for the job to finish before answering; repeat until it is done or failed.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' }, wait_seconds: { type: 'integer', description: 'Wait up to this many seconds (max 75).' } } } },
  { name: 'music_list_jobs', description: 'The ten most recent music jobs and their state.', inputSchema: { type: 'object', properties: {} } },
  { name: 'music_cancel', description: 'Cancel a music job that is still queued or running.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } } },
];

const brief = j => ({ id: j.id, state: j.state, seconds: j.duration, instrumental: j.instrumental, requestedBy: j.requestedBy || '', file: j.file || undefined, error: j.error || undefined, prompt: j.prompt.slice(0, 120), minutesTaken: j.finishedAt && j.startedAt ? Math.round((j.finishedAt - j.startedAt) / 6000) / 10 : undefined });
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = s => ({ isError: true, content: [{ type: 'text', text: s }] });

function startWorker() {
  if (workerAlive()) return false;
  const cmd = `"${process.execPath}" "${WORKER}"`; // started through WMI so it outlives the agent run that asked for it
  try { execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='${cmd.replace(/'/g, "''")}'}; if ($r.ReturnValue -ne 0) { exit 1 }`], { windowsHide: true, timeout: 20000, stdio: 'ignore' }); } catch { return false; }
  return true;
}
const kick = () => { if (listJobs().some(j => j.state === 'queued')) startWorker(); };

const tools = {
  music_status() { kick(); const jobs = listJobs(); return text({ ready: true, workerRunning: !!workerAlive(), queued: jobs.filter(j => j.state === 'queued').length, running: jobs.filter(j => j.state === 'running').length, maxActiveJobs: MAX_ACTIVE, minSeconds: MIN_SECONDS, maxSeconds: MAX_SECONDS, note: 'Free and local. One job at a time. It waits while a local video clip is being generated, because both use the GPU.' }); },
  music_submit(a) {
    const prompt = String(a.prompt || '').trim();
    if (prompt.length < 10) return fail('Give a fuller prompt: mood, instruments, tempo feel and what the music is for.');
    if (prompt.length > 1000) return fail('Prompt is too long (max 1000 characters).');
    const duration = a.duration_seconds ?? DEFAULT_SECONDS;
    if (!Number.isInteger(duration) || duration < MIN_SECONDS || duration > MAX_SECONDS) return fail(`duration_seconds must be a whole number from ${MIN_SECONDS} to ${MAX_SECONDS}.`);
    const bpm = a.bpm === undefined ? undefined : a.bpm;
    if (bpm !== undefined && (!Number.isInteger(bpm) || bpm < 40 || bpm > 200)) return fail('bpm must be a whole number from 40 to 200.');
    ensureDirs();
    const act = active(listJobs()); if (act.length >= MAX_ACTIVE) return fail(`The queue is full (${act.length} jobs). Check music_list_jobs.`);
    const job = writeJob({ id: newId(), state: 'queued', prompt, duration, instrumental: a.instrumental !== false, lyrics: String(a.lyrics || '').slice(0, 3000), bpm, requestedBy: String(a.requested_by || '').slice(0, 60), createdAt: Date.now() });
    const started = startWorker();
    return text({ jobId: job.id, state: 'queued', jobsAhead: act.length, workerStarted: started, next: 'Now call music_job with this job id and wait_seconds 75, and repeat until it is done or failed (a minute or two). The finished file is saved under output/music/.' });
  },
  async music_job(a) { // wait_seconds: the call waits for the job, so an agent that cannot sleep still gets the file
    kick(); const id = String(a.job_id || ''), until = Date.now() + Math.min(75, Math.max(0, +a.wait_seconds || 0)) * 1000;
    let j = readJob(id); if (!j) return fail('No such job: ' + a.job_id);
    while (j.state !== 'done' && j.state !== 'failed' && j.state !== 'cancelled' && Date.now() < until) { await new Promise(r => setTimeout(r, 2000)); j = readJob(id) || j; kick(); }
    return text(brief(j));
  },
  music_list_jobs() { kick(); return text(listJobs().slice(-10).reverse().map(brief)); },
  music_cancel(a) { const j = readJob(String(a.job_id || '')); if (!j) return fail('No such job: ' + a.job_id); if (j.state === 'queued' || j.state === 'running') { writeJob({ ...j, state: 'cancelled', finishedAt: Date.now() }); return text({ id: j.id, state: 'cancelled' }); } return fail(`Job ${j.id} is ${j.state}; only a queued or running job can be cancelled.`); },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'music-local', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? Promise.resolve(t(m.params.arguments || {})).then(ok, e => ok(fail('Internal error: ' + (e.message || e)))) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
