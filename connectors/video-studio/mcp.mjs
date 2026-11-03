// Video studio: the MCP server the office agents talk to (stdio, JSON-RPC, no dependencies).
// An agent describes the video; the studio builds the HyperFrames project, checks it, renders it and returns
// the file. The agent never runs commands and never has to ask for brand assets: fonts, colours and logos are built in.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { FORMATS, MAX_ACTIVE, ROOT, WORKER, active, ensureDirs, listJobs, newId, readJob, tokens, workerAlive, writeJob } from './shared.mjs';
import { normaliseAoo } from './aoo.mjs';
import { KINDS, normalise, STYLES, TEXT_MOTIONS, TRANSITIONS, VOICES } from './compose.mjs';

const BRANDS = Object.keys(tokens());
const TOOLS = [
  { name: 'video_status', description: 'Is the video studio ready? Shows the brands, formats and grounds it knows and the queue. Free; read-only.', inputSchema: { type: 'object', properties: {} } },
  { name: 'video_build', description: 'Build title cards on this computer, as an MP4 video or as full-resolution slide images (a carousel): each card is one line of type, with an optional label above and a smaller line below, on a brand ground, the brand logo placed for you, slow even fades, optional music bed. Fonts, colours and logos are built in: never ask the owner for them. It checks its own work (type inside the safe area, contrast, HyperFrames check) and shrinks the type itself if a line is too long, so a job that comes back done has already passed. It returns a job id straight away: check it with video_job; a short video takes a few minutes. Use it for Reel title cards, stat cards, quote cards and Instagram carousels (deliver stills, format 4:5). For footage use ltx-local; for music use music-local first and pass its file path as `music`.', inputSchema: { type: 'object', required: ['cards'], properties: {
    title: { type: 'string', description: 'A short name for the video.' },
    brand: { type: 'string', enum: BRANDS, description: 'wrw (default) or creamy.' },
    format: { type: 'string', enum: Object.keys(FORMATS), description: '9:16 (default, Reels and Shorts), 16:9, 1:1 or 4:5.' },
    cards: { type: 'array', description: 'One entry per card, in order.', items: { type: 'object', required: ['text'], properties: {
      kind: { type: 'string', enum: KINDS, description: 'text (default): a line of type. stat: one big number that counts up (give value, prefix, suffix; text is its label). waterfall: a start-minus-costs-equals-end chart that draws row by row (give items; text is an optional heading): the right card for unit economics.' },
      text: { type: 'string', description: 'The line, exactly as it should read. Not changed or shortened. Wrap ONE word in *asterisks* to emphasise it (it turns the accent colour and gets an underline drawn in).' },
      say: { type: 'string', description: 'With voiceover: the line spoken over this card, if it should differ from the on-screen text (the screen punctuates, the voice tells the story). Shown as a live caption.' },
      value: { type: 'number', description: 'stat only: the number to count up to.' },
      prefix: { type: 'string', description: 'stat and waterfall: before the number, for example "£".' },
      suffix: { type: 'string', description: 'stat and waterfall: after the number, for example "%".' },
      decimals: { type: 'integer', description: 'stat only: decimal places (default 0 for whole numbers).' },
      items: { type: 'array', description: 'waterfall only: 2 to 7 rows top to bottom. A start or end row has type "total" (a bar from zero); a cost is a negative value (a bar that comes off the running total); an addition is positive.', items: { type: 'object', required: ['label', 'value'], properties: { label: { type: 'string' }, value: { type: 'number' }, type: { type: 'string', enum: ['total'] } } } },
      ground: { type: 'string', description: 'wrw: bone, red or ink (plus country, when `report` is given). creamy: black, panel or pink. Default: the first. With `report`: bone and ink take the report’s colours for figures and emphasis, and country is the report’s own cover: its country colour, bone type, its second flag colour for the emphasised word and the mountains.' },
      seconds: { type: 'number', description: 'How long the card shows, 1 to 60 (default 3). Slow is better for text people must read: about 0.4 s per word plus 1.5 s.' },
      kicker: { type: 'string', description: 'Optional small caps label above the line.' },
      sub: { type: 'string', description: 'Optional smaller line below.' },
    } } },
    report: { type: 'string', description: 'A Franchise Entry Report issue, for example "02-sweden" or "2": the country colours come from that issue’s issue.json and the PDF’s own palette, so slides about a report match it exactly. Use this and the `country` ground instead of typing any hex or colour name: never colour a report’s slides from memory, the flag or a brand guide.' },
    deliver: { type: 'string', enum: ['video', 'stills', 'both'], description: 'video (default): an MP4. stills: one full-resolution PNG per card in `slides`, no video: use this for a CAROUSEL or single post (format 4:5 for Instagram carousels, 1:1 for squares), with one slide per card. both: MP4 and slides.' },
    style: { type: 'string', enum: Object.keys(STYLES), description: 'The motion in one word. impact: the Reel look: cards push in, each line enters differently (slam, side snap, rise), mountains drift behind: the default choice for a Reel. punchy: cards push in, words arrive one by one. editorial: wipe between cards, words rise. bold: cards scale in. calm (default if omitted): slow fades, for information people must read.' },
    backdrop: { type: 'string', enum: ['ridges', 'none'], description: 'Optional: slow drifting mountain ridges behind the type. impact turns it on.' },
    voice: { type: 'object', description: 'Optional voiceover, made locally (free). Each card is spoken and held as long as the line takes, so the words and picture stay together. Music is lowered under it automatically.', properties: { voice: { type: 'string', enum: VOICES, description: 'wesley (default): the owner\'s own cloned voice, from VoiceStudio on this computer: always use this for WRW and for anything in his name; if VoiceStudio is not running a stand-in voice is used and the result says so. Stand-ins: bm_george (British man), bf_emma or bf_isabella (British women), am_adam or am_michael (American men), af_heart or af_nova (American women).' }, speed: { type: 'number', description: '0.8 to 1.25 (default 1).' } } },
    captions: { type: 'boolean', description: 'With voiceover: a caption of the spoken line near the bottom, lighting up word by word. Default: on when any card has a `say` line that differs from its text.' },
    transition: { type: 'string', enum: TRANSITIONS, description: 'Optional override of how one card gives way to the next: fade, cut, push, rise, wipe or scale.' },
    text_motion: { type: 'string', enum: TEXT_MOTIONS, description: 'Optional override of how the words arrive: fade, rise or words (one word at a time).' },
    overlap: { type: 'number', description: 'Seconds the next card takes to move in over the last one (0.3 to 1, default 0.6). Only for push, rise, wipe and scale.' },
    logo: { type: 'string', enum: ['auto', 'none'], description: 'auto (default): the brand logo top-left, the right version for each ground. none: no logo.' },
    align: { type: 'string', enum: ['left', 'center'], description: 'left (default, the brand) or center.' },
    music: { type: 'object', description: 'Optional music bed. Give `prompt` and the studio makes the music itself (free, local, instrumental), fits it to the exact length, fades it in and out and evens the loudness. Or give `file`, an audio file under the office output folder, to use as it is (it is fitted the same way).', properties: { prompt: { type: 'string', description: 'The music in plain English: mood, instruments, tempo, what it is for. Example: "driving but understated electronic pulse, confident, 100 bpm, no vocals, for a business Reel". Say no vocals.' }, file: { type: 'string', description: 'Full path of an audio file, from music_job.' }, volume: { type: 'number', description: '0.05 to 1 (default 0.25: a quiet bed under a Reel; 0.35 if there is no voice).' } } },
    requested_by: { type: 'string', description: 'Your desk name.' },
  } } },
  { name: 'aoo_reel_build', description: 'Build an Art of Operations Instagram reel: a 15 second maxim, English then Chinese, over a background clip graded into the black, white or red row of the grid, with music and the series end card. First make the background with ltx_submit_video (battle-inspired, one centred figure, plain unmarked cloth) and wait for it. The studio grades it, lays out the text, checks, takes stills and renders. Then poll video_job. Free and local.', inputSchema: { type: 'object', required: ['row', 'en', 'zh'], properties: {
    row: { type: 'string', enum: ['black', 'white', 'red'], description: 'The grid row: black reels 1 to 3, white 4 to 6, red 7 to 9.' },
    number: { type: 'integer', description: 'The reel number, 1 to 9 within the set (for the title only).' },
    en: { type: 'array', items: { type: 'string' }, description: '2 to 4 lines of the English maxim, each at most 24 characters so it stays on one centred line, in reading order. Wrap exactly ONE key word or phrase in *asterisks*.' },
    zh: { type: 'array', items: { type: 'string' }, description: '2 to 4 lines of the Chinese, each at most 9 characters, no 。 at the end, no "In Mandarin" label. Wrap exactly ONE key word or phrase in *asterisks*.' },
    background_job: { type: 'string', description: 'PREFERRED: the job id returned by ltx_submit_video. The studio waits for the footage itself (about half an hour), builds the reel, and sends it to Wesley on Telegram. Call this right after queueing the footage and then finish: do not wait for it.' },
    background: { type: 'string', description: 'Instead of background_job: the path of an already finished background clip, as returned by ltx_job (under the office output folder).' },
    notify: { type: 'boolean', description: 'Send the finished reel to Wesley on Telegram for approval (default true).' },
    music: { type: 'object', description: 'LEAVE THIS OUT. Every Art of Operations reel uses the series score (Chinese lute with a bell on each transition) so the set sounds the same. Only if Wesley asks for something different: prompt or file. Volume 0.05 to 1.', properties: { prompt: { type: 'string' }, file: { type: 'string' }, volume: { type: 'number' } } },
    grade: { type: 'object', description: 'Optional footage grade: black and white points (0 to 255) if it reads too dark or washed out; invert true for the black row when the footage has a pale sky and a dark figure (it becomes a dark ground with a light figure, so the bone text reads). Defaults per row.', properties: { black: { type: 'number' }, white: { type: 'number' }, invert: { type: 'boolean' }, gamma: { type: 'number', description: 'Above 1 darkens the midtones (try 2 to 2.5 for a dusk sky behind type); the type must keep 3:1 contrast or the check fails.' } } },
    title: { type: 'string' }, kicker: { type: 'string', description: 'End card title (default "The Art of Operations").' }, byline: { type: 'string', description: 'End card name (default "Wesley Williams").' },
    requested_by: { type: 'string', description: 'Your desk name.' },
  } } },
  { name: 'video_job', description: 'Check one video job: queued, running (with the step), done (with the MP4 path, the slide images, the preview stills and what was checked), failed (with the exact reason) or cancelled. Pass wait_seconds (up to 75) and the call waits for the job to finish before it answers: use this right after video_build and repeat it until the job is done or failed.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' }, wait_seconds: { type: 'integer', description: 'Wait up to this many seconds (max 75) for the job to finish.' } } } },
  { name: 'video_list_jobs', description: 'The ten most recent video jobs and their state.', inputSchema: { type: 'object', properties: {} } },
  { name: 'video_cancel', description: 'Cancel a video job that is queued or running.', inputSchema: { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string' } } } },
];

const brief = j => ({ id: j.id, state: j.state, step: j.step, title: j.spec?.title, format: j.spec?.format, seconds: j.spec?.totalSeconds, cards: j.spec?.cards?.length, requestedBy: j.requestedBy || '', file: j.file || undefined, slides: j.slides?.length ? j.slides : undefined, stills: j.stills?.length ? j.stills : undefined, qa: j.qa || undefined, error: j.error || undefined, minutesTaken: j.finishedAt && j.startedAt ? Math.round((j.finishedAt - j.startedAt) / 6000) / 10 : undefined });
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
  video_status() { kick(); const T = tokens(), jobs = listJobs(); return text({ ready: true, workerRunning: !!workerAlive(), queued: jobs.filter(j => j.state === 'queued').length, running: jobs.filter(j => j.state === 'running').length, brands: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, { grounds: Object.keys(v.grounds), notes: v.notes }])), formats: Object.keys(FORMATS), note: 'Free and local. One job at a time.' }); },
  video_build(a) {
    const n = normalise(a); if (n.problems) return fail('Fix and resubmit: ' + n.problems.join('; '));
    if (n.spec.music?.file) { const f = path.resolve(n.spec.music.file); if (!fs.existsSync(f) || !f.startsWith(path.join(ROOT, 'output'))) return fail('music.file must be a file under the office output folder, as returned by music_job.'); n.spec.music.file = f; }
    ensureDirs(); const act = active(listJobs()); if (act.length >= MAX_ACTIVE) return fail(`The queue is full (${act.length} jobs). Check video_list_jobs.`);
    const job = writeJob({ id: newId(), state: 'queued', spec: n.spec, requestedBy: String(a.requested_by || '').slice(0, 60), createdAt: Date.now() });
    return text({ jobId: job.id, state: 'queued', jobsAhead: act.length, workerStarted: startWorker(), next: 'Now call video_job with this job id and wait_seconds 75, and repeat until the state is done or failed (a short video takes about one to two minutes). Report the file or slide paths it returns. Do not hand back a plan or say it is queued.' });
  },
  aoo_reel_build(a) {
    const n = normaliseAoo(a); if (n.problems) return fail('Fix and resubmit: ' + n.problems.join('; '));
    ensureDirs(); const act = active(listJobs()); if (act.length >= MAX_ACTIVE) return fail(`The queue is full (${act.length} jobs). Check video_list_jobs.`);
    const job = writeJob({ id: newId(), state: 'queued', spec: n.spec, requestedBy: String(a.requested_by || '').slice(0, 60), createdAt: Date.now() });
    return text({ jobId: job.id, state: 'queued', jobsAhead: act.length, workerStarted: startWorker(), next: n.spec.backgroundJob ? 'The studio now waits for the footage (about half an hour), then grades, builds, renders and sends the reel to Wesley on Telegram by itself. Do NOT wait for it: finish now and report this job id (' + job.id + ') and that the reel arrives on Telegram and in video_list_jobs when ready.' : 'Now call video_job with this job id and wait_seconds 75, and repeat until the state is done or failed (about three to five minutes with music). Report the file and the preview stills. Do not hand back a plan.' });
  },
  async video_job(a) { // wait_seconds: the call itself waits for the job, so an agent that cannot sleep still gets the finished file
    kick(); const id = String(a.job_id || ''), until = Date.now() + Math.min(75, Math.max(0, +a.wait_seconds || 0)) * 1000;
    let j = readJob(id); if (!j) return fail('No such job: ' + a.job_id);
    while (j.state !== 'done' && j.state !== 'failed' && j.state !== 'cancelled' && Date.now() < until) { await new Promise(r => setTimeout(r, 2000)); j = readJob(id) || j; kick(); }
    return text(brief(j));
  },
  video_list_jobs() { kick(); return text(listJobs().slice(-10).reverse().map(brief)); },
  video_cancel(a) { const j = readJob(String(a.job_id || '')); if (!j) return fail('No such job: ' + a.job_id); if (j.state === 'queued' || j.state === 'running') { writeJob({ ...j, state: 'cancelled', finishedAt: Date.now() }); return text({ id: j.id, state: 'cancelled' }); } return fail(`Job ${j.id} is ${j.state}; only a queued or running job can be cancelled.`); },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'video-studio', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? Promise.resolve(t(m.params.arguments || {})).then(ok, e => ok(fail('Internal error: ' + (e.message || e)))) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
