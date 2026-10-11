// Local video connector: the MCP server the office agents talk to (stdio, JSON-RPC, no dependencies).
// It never generates anything itself. It validates a request, writes a job file, and makes sure the background
// worker (worker.mjs) is running; the worker owns the GPU. Free, local, slow: about 6-7 minutes for 5 seconds.
import os from 'node:os';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { ALLOWED, ASPECTS, CAMERA, MAX_ACTIVE, MAX_SECONDS, MIN_FREE_RAM_GB, MIN_PER_SECOND, MIN_SECONDS, WORKER, active, ensureDirs, listJobs, newId, planSegments, readJob, workerAlive, writeJob } from './shared.mjs';

const eta = (res, secs) => { const m = Math.round(secs * (MIN_PER_SECOND[res] || 2)); return m < 90 ? `about ${m} minutes` : `about ${(m / 60).toFixed(1)} hours`; };

const TOOLS = [
  { name: 'ltx_status', description: 'Is the local video generator ready? Shows the queue, free memory and the limits. Free; read-only.', inputSchema: { type: 'object', properties: {} } },
  { name: 'ltx_submit_video', description: 'Queue a video to be generated locally on the owner\'s computer with LTX 2.5 (free, no credits), of ANY length the task needs (5 seconds up). There is no length limit: a long video is made as a chain of short parts, each starting from the last frame of the one before, then joined. It is SLOW and proportional to length: 540p takes about 1.3 minutes per second of video (a 5-second clip is 6-7 minutes, one minute of video about 80 minutes), 720p and 1080p longer. Jobs run one at a time, so this returns a job id straight away; check it later with ltx_job (it shows parts done). Good for atmosphere, backgrounds and b-roll. It cannot draw exact logos, seals, type or brand colours: those are added afterwards in HyperFrames or Canva. Only submit when the task asks for generated footage.', inputSchema: { type: 'object', required: ['prompt'], properties: {
    prompt: { type: 'string', description: 'What the video shows, in plain English: subject, setting, light, colours, movement. State the palette (for WRW: ink black, bone white, one red accent). Say "no text, no logos, no people" unless people are wanted.' },
    scenes: { type: 'array', items: { type: 'string' }, description: 'Optional, for long videos: one prompt per ~10-second part, in order, so the story moves on. If shorter than the number of parts, the last one repeats; if absent, `prompt` is used for every part.' },
    resolution: { type: 'string', enum: Object.keys(ALLOWED), description: '540p (default, fastest) or 720p or 1080p.' },
    duration_seconds: { type: 'integer', description: 'Total seconds, 5 or more (default 5). Any length; time scales with it.' },
    aspect_ratio: { type: 'string', enum: ASPECTS, description: '9:16 vertical (default, for Reels and Shorts) or 16:9.' },
    camera_motion: { type: 'string', enum: CAMERA, description: 'Optional camera move; default none.' },
    negative_prompt: { type: 'string', description: 'Optional: what to avoid, e.g. "text, watermark, people, flicker".' },
    requested_by: { type: 'string', description: 'Your desk name, so the owner can see who asked.' },
  } } },
  { name: 'ltx_job', description: 'Check one video job: queued, running, done (with the saved file path), failed (with the reason) or cancelled.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } } },
  { name: 'ltx_list_jobs', description: 'The ten most recent video jobs and their state.', inputSchema: { type: 'object', properties: {} } },
  { name: 'ltx_cancel', description: 'Cancel a video job that is still queued. A job that is already running cannot be stopped; it finishes in a few minutes.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } } },
];

const mins = j => j.finishedAt && j.startedAt ? Math.round((j.finishedAt - j.startedAt) / 60000 * 10) / 10 : null;
const brief = j => ({ id: j.id, state: j.state, resolution: j.resolution, seconds: j.duration, aspect: j.aspectRatio, requestedBy: j.requestedBy || '', file: j.file || undefined, error: j.error || undefined, minutesTaken: mins(j) ?? undefined, parts: j.segments?.length > 1 ? j.segments.length : undefined, partsDone: j.progress?.done, prompt: j.prompt.slice(0, 120) });
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = s => ({ isError: true, content: [{ type: 'text', text: s }] });

function startWorker() {
  if (workerAlive()) return false;
  // a Windows process created through WMI sits outside this process's job object, so it outlives the agent run that asked for it
  const cmd = `"${process.execPath}" "${WORKER}"`;
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='${cmd.replace(/'/g, "''")}'}; if ($r.ReturnValue -ne 0) { exit 1 }`], { windowsHide: true, timeout: 20000, stdio: 'ignore' });
  } catch { return false; }
  return true;
}
// a queued job with no worker (the worker idled out, or the machine restarted) gets one
const kick = () => { if (listJobs().some(j => j.state === 'queued')) startWorker(); };

const tools = {
  ltx_status() {
    kick();
    const jobs = listJobs(), act = active(jobs);
    return text({
      ready: true, workerRunning: !!workerAlive(), queued: jobs.filter(j => j.state === 'queued').length, running: jobs.filter(j => j.state === 'running').length,
      freeRamGb: +(os.freemem() / 2 ** 30).toFixed(1), needsFreeRamGb: MIN_FREE_RAM_GB, maxActiveJobs: MAX_ACTIVE, canAcceptMore: act.length < MAX_ACTIVE,
      resolutions: Object.keys(ALLOWED), minSeconds: MIN_SECONDS, maxSeconds: 'no practical limit; time scales with length', note: 'Free and local, but slow: about 1.3 minutes per second of 540p video (6-7 minutes for 5 seconds). One job at a time.',
    });
  },
  ltx_submit_video(a) {
    const prompt = String(a.prompt || '').trim();
    if (prompt.length < 10) return fail('Give a fuller prompt: subject, setting, light, colours and movement.');
    if (prompt.length > 1500) return fail('Prompt is too long (max 1500 characters).');
    const resolution = a.resolution || '540p', duration = a.duration_seconds ?? 5, aspectRatio = a.aspect_ratio || '9:16', cameraMotion = a.camera_motion || 'none';
    if (!ALLOWED[resolution]) return fail('resolution must be one of ' + Object.keys(ALLOWED).join(', '));
    if (!Number.isInteger(duration) || duration < MIN_SECONDS || duration > MAX_SECONDS) return fail(`duration_seconds must be a whole number from ${MIN_SECONDS} to ${MAX_SECONDS}.`);
    const scenes = Array.isArray(a.scenes) ? a.scenes.map(s => String(s).trim().slice(0, 1500)).filter(s => s.length >= 10).slice(0, 400) : [];
    const segments = planSegments(resolution, duration);
    if (!ASPECTS.includes(aspectRatio)) return fail('aspect_ratio must be 9:16 or 16:9.');
    if (!CAMERA.includes(cameraMotion)) return fail('camera_motion must be one of ' + CAMERA.join(', '));
    ensureDirs();
    const act = active(listJobs());
    if (act.length >= MAX_ACTIVE) return fail(`The queue is full (${act.length} jobs waiting or running). Wait for some to finish; check ltx_list_jobs.`);
    const job = writeJob({ id: newId(), state: 'queued', prompt, negativePrompt: String(a.negative_prompt || '').slice(0, 400), resolution, duration, segments, scenes: scenes.length ? segments.map((_, i) => scenes[Math.min(i, scenes.length - 1)]) : undefined, aspectRatio, cameraMotion, requestedBy: String(a.requested_by || '').slice(0, 60), createdAt: Date.now() });
    const started = startWorker();
    const ahead = act.length;
    const aheadSecs = act.reduce((n, j) => n + (j.duration || 5), 0);
    return text({ jobId: job.id, state: 'queued', jobsAhead: ahead, parts: segments.length, workerStarted: started,
      expect: `${eta(resolution, duration + aheadSecs)} if nothing else goes wrong (${eta(resolution, duration)} for this video${ahead ? ', plus the jobs ahead' : ''}; one job at a time)`,
      next: 'Do not wait for it. Tell the owner the job id and that it is queued; check it later with ltx_job. The finished file is saved on the owner\'s computer under output/ltx/ and the path appears in ltx_job.' });
  },
  ltx_job(a) { kick(); const j = readJob(String(a.job_id || '')); return j ? text(brief(j)) : fail('No such job: ' + a.job_id); },
  ltx_list_jobs() { kick(); return text(listJobs().slice(-10).reverse().map(brief)); },
  ltx_cancel(a) {
    const j = readJob(String(a.job_id || '')); if (!j) return fail('No such job: ' + a.job_id);
    if (j.state === 'queued') { writeJob({ ...j, state: 'cancelled', finishedAt: Date.now() }); return text({ id: j.id, state: 'cancelled' }); }
    if (j.state === 'running') { writeJob({ ...j, state: 'cancelled' }); return text({ id: j.id, state: 'cancelled', note: 'It stops when the part now being made finishes.' }); }
    return fail(`Job ${j.id} is ${j.state}; only a queued or running job can be cancelled.`);
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return; // notifications need no reply
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'ltx-local', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? ok(t(m.params.arguments || {})) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
