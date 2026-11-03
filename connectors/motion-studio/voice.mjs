// Motion studio: narration for narrated series (The Operator's Ledger). The one audio that is not synthesised in the page.
// Three sources, in the order of preference:
//  - clone: Wesley's cloned voice from VoiceStudio on this PC (127.0.0.1:3900), the VoxCPM2 engine and his profile, one sentence
//    at a time with a breath between, de-plosived with the series' own script, then word-timed with Whisper and aligned to the script;
//  - recording: Wesley's own recording of a line, converted, de-plosived and word-timed the same way;
//  - stand-in: a local Kokoro voice for drafts while VoiceStudio is off. Marked stand-in; the studio refuses a final with it.
// A narration lives in data/motion/narration/<id>/: one wav per line (s1.wav …), words.json (script words with real times), meta.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DATA, FFMPEG, ROOT, SERIES } from './shared.mjs';
import { speakable } from '../video-studio/voicestudio.mjs';

export const NARRATION = path.join(DATA, 'narration');
const VS = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
const HF = 'hyperframes@0.8.137';
export const narrationDir = id => path.join(NARRATION, String(id).replace(/[^a-z0-9]/gi, ''));
export function readNarration(id) { try { const d = narrationDir(id); return { dir: d, words: JSON.parse(fs.readFileSync(path.join(d, 'words.json'), 'utf8')), meta: JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf8')) }; } catch { return null; } }

const run = (cmd, args, opts = {}) => new Promise(res => { const p = spawn(cmd, args, { windowsHide: true, ...opts }); let o = ''; p.stdout?.on('data', d => o += d); p.stderr?.on('data', d => o += d); p.on('error', e => res({ code: -1, out: String(e.message) })); p.on('close', code => res({ code, out: o })); });
const ff = args => run(FFMPEG, ['-y', '-loglevel', 'error', ...args]);
const durationOf = async f => { const r = await run(FFMPEG, ['-hide_banner', '-i', f]); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.out); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };
export async function voiceStudioUp() { try { return (await fetch(VS + '/health', { signal: AbortSignal.timeout(3000) })).ok; } catch { return false; } }

/** one sentence in the cloned voice (VoxCPM2: its weights are cleared for commercial use; never VoiceStudio's default OmniVoice) */
async function speakClone(text, voice, out) {
  const r = await fetch(VS + '/v1/audio/speech', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15 * 60000),
    body: JSON.stringify({ model: voice.engine || 'voxcpm2', input: speakable(text), voice: voice.profile, language: 'en', seed: voice.seed ?? 7, speed: 1, response_format: 'wav' }) });
  if (!r.ok) throw new Error(`VoiceStudio refused a sentence (${r.status}): ${(await r.text()).slice(0, 200)}`);
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}
/** Whisper large-v3 word timings, through VoiceStudio */
async function transcribe(file) {
  const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/wav' }), path.basename(file));
  fd.append('model', 'Systran/faster-whisper-large-v3'); fd.append('response_format', 'verbose_json'); fd.append('timestamp_granularities[]', 'word'); fd.append('language', 'en');
  const r = await fetch(VS + '/v1/audio/transcriptions', { method: 'POST', body: fd, signal: AbortSignal.timeout(10 * 60000) });
  if (!r.ok) throw new Error(`Whisper refused the line (${r.status})`);
  return r.json();
}
const norm = w => String(w).toLowerCase().replace(/labor/g, 'labour').replace(/[^a-z0-9]/g, '');
/** script words with the times Whisper heard them (longest common run alignment; unmatched words interpolated) */
function align(script, heard, dur) {
  const a = script.map(norm), b = heard.map(w => norm(w.word)), n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const times = Array(n).fill(null), missing = [], pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) { if (a[i] && a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  for (const [i, j] of pairs) times[i] = [heard[j].start, heard[j].end];
  // between two matches, script words heard differently ("ten" as "10", "three hundred pounds" as "£300") share the heard span;
  // only script words with nothing heard in their gap are missing
  const bounds = [[-1, -1], ...pairs, [n, m]];
  for (let k = 1; k < bounds.length; k++) {
    const [i0, j0] = bounds[k - 1], [i1, j1] = bounds[k], si = i1 - i0 - 1, sj = j1 - j0 - 1; if (si <= 0) continue;
    if (sj > 0) { const s = heard[j0 + 1].start, e = heard[j1 - 1].end; for (let q = 0; q < si; q++) times[i0 + 1 + q] = [s + (e - s) * q / si, s + (e - s) * (q + 1) / si]; }
    else for (let q = 0; q < si; q++) missing.push(script[i0 + 1 + q]);
  }
  for (let i = 0; i < n; i++) if (!times[i]) { const p = times.slice(0, i).reverse().find(Boolean)?.[1] ?? 0, q = times.slice(i + 1).find(Boolean)?.[0] ?? dur; times[i] = [p, q]; }
  return { words: script.map((w, i) => ({ text: w, start: +times[i][0].toFixed(3), end: +times[i][1].toFixed(3) })), missing: missing.filter(w => norm(w)) };
}
/** no transcription available: spread the words over the line by their length */
function estimate(script, dur) { const total = script.reduce((s, w) => s + w.length + 1, 0); let t = 0; return script.map(w => { const d = dur * (w.length + 1) / total, x = { text: w, start: +t.toFixed(3), end: +(t + d).toFixed(3) }; t += d; return x; }); }

/**
 * Make a narration. lines: [{ id: 's1', text }]. source: 'clone' | 'recording' | 'stand-in'. recordings: [{ line, file }] for 'recording'.
 * Returns { id, source, lines: [{ id, duration, wpm }], warnings }.
 */
export async function narrate({ id, lines, source = 'clone', recordings = [], series = 'operators-ledger', onStep = () => {} }) {
  const cfg = JSON.parse(fs.readFileSync(path.join(SERIES, series, 'series.json'), 'utf8')), voice = cfg.voice || {}, pause = voice.pause ?? .42;
  const dir = narrationDir(id), raw = path.join(dir, 'raw'), out = dir, warnings = [], words = {};
  fs.mkdirSync(raw, { recursive: true });
  const up = await voiceStudioUp();
  if (source === 'clone' && !up) throw new Error('VoiceStudio is not running on this PC, so Wesley\'s cloned voice is not available. Start VoiceStudio and try again, or narrate with source "stand-in" for drafts (a final needs Wesley\'s voice).');
  for (const [k, line] of lines.entries()) {
    const f = path.join(raw, line.id + '.wav');
    onStep(`voicing line ${k + 1} of ${lines.length}`);
    if (source === 'clone') {
      const sents = String(line.text).match(/[^.?!]+[.?!]+["”’]?|[^.?!]+$/g).map(s => s.trim()).filter(Boolean), parts = [];
      for (const [i, s] of sents.entries()) {
        const a = path.join(raw, `${line.id}-${i}.wav`), b = path.join(raw, `${line.id}-${i}-t.wav`);
        await speakClone(s, voice, a);
        // trim the model's own leading and trailing silence so the breaths are ours
        const r = await ff(['-i', a, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse', '-ar', '48000', '-ac', '1', b]);
        if (r.code !== 0) throw new Error('could not trim a sentence: ' + r.out.slice(-200)); parts.push(b);
      }
      const filt = parts.map((p, i) => `[${i}:a]aresample=48000,apad=pad_dur=${i < parts.length - 1 ? pause : 0}[p${i}]`).join(';') + ';' + parts.map((_, i) => `[p${i}]`).join('') + `concat=n=${parts.length}:v=0:a=1[o]`;
      const r = await ff([...parts.flatMap(p => ['-i', p]), '-filter_complex', filt, '-map', '[o]', '-ar', '48000', '-ac', '1', f]);
      if (r.code !== 0) throw new Error('could not join the sentences: ' + r.out.slice(-200));
    } else if (source === 'recording') {
      const rec = recordings.find(x => x.line === line.id); if (!rec) throw new Error(`no recording given for line ${line.id}`);
      const src = path.resolve(rec.file); if (!fs.existsSync(src)) throw new Error('recording not found: ' + rec.file);
      const r = await ff(['-i', src, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '48000', '-ac', '1', f]);
      if (r.code !== 0) throw new Error('could not read the recording for ' + line.id + ': ' + r.out.slice(-200));
    } else {
      const txt = path.join(raw, line.id + '.txt'); fs.writeFileSync(txt, speakable(line.text), 'utf8');
      const r = await run('cmd', ['/c', 'npx', '--yes', HF, 'tts', '--text-file', txt, '-v', 'bm_george', '-s', '1', '-o', path.join(raw, line.id + '-k.wav'), '--json'], { cwd: raw });
      const k = path.join(raw, line.id + '-k.wav'); if (!fs.existsSync(k)) throw new Error('the stand-in voice failed: ' + r.out.slice(-300));
      await ff(['-i', k, '-ar', '48000', '-ac', '1', f]);
    }
  }
  // de-plosive (the clone copies the mic wind on "p" and "b" from the reference): the series' own script, lengths unchanged
  if (source !== 'stand-in') {
    onStep('softening the plosives');
    const r = await run('python', [path.join(SERIES, series, 'voice', 'deplosive.py'), raw, out]);
    if (r.code !== 0) { warnings.push('the de-plosive pass could not run (' + r.out.trim().split('\n').pop().slice(0, 160) + '), so the lines are unsoftened'); for (const l of lines) fs.copyFileSync(path.join(raw, l.id + '.wav'), path.join(out, l.id + '.wav')); }
  } else for (const l of lines) fs.copyFileSync(path.join(raw, l.id + '.wav'), path.join(out, l.id + '.wav'));
  // word timings: Whisper large-v3 when VoiceStudio is up, otherwise an estimate (and a warning)
  const summary = [];
  for (const [k, line] of lines.entries()) {
    onStep(`timing the words of line ${k + 1}`);
    const f = path.join(out, line.id + '.wav'), dur = await durationOf(f), script = String(line.text).split(/\s+/).filter(Boolean);
    let w;
    if (up) { const t = await transcribe(f); const a = align(script, (t.words || []).filter(x => norm(x.word)), dur); w = a.words; if (a.missing.length) warnings.push(`line ${line.id}: Whisper did not hear "${a.missing.slice(0, 6).join(' ')}": retake that line`); }
    else { w = estimate(script, dur); warnings.push(`line ${line.id}: word times are estimated (VoiceStudio is off, so Whisper could not time them)`); }
    words[line.id] = { duration: +dur.toFixed(3), text: line.text, words: w };
    summary.push({ id: line.id, duration: +dur.toFixed(2), wpm: Math.round(script.length / dur * 60) });
  }
  fs.writeFileSync(path.join(dir, 'words.json'), JSON.stringify(words, null, 1));
  const meta = { id, series, source, standIn: source === 'stand-in', voice: source === 'clone' ? `${voice.profileName || 'Wesley'} (VoiceStudio ${voice.engine}, profile ${voice.profile})` : source === 'recording' ? 'Wesley (own recording)' : 'stand-in (Kokoro bm_george): not for a final', createdAt: Date.now(), lines: summary };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  fs.rmSync(raw, { recursive: true, force: true });
  return { id, source, standIn: meta.standIn, voice: meta.voice, lines: summary, warnings };
}

/** captions as an .srt: sentences, long ones split into even chunks of at most `max` words (the same chunks as M.caption on screen) */
export function srt(words, placements, max = 7) {
  const sentences = ws => { const out = []; let cur = []; ws.forEach((w, i) => { cur.push(w); const nx = ws[i + 1]; if (/[.?!]["”’]?$/.test(w.text) || (nx && nx.start - w.end > .6)) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; };
  const chunksOf = (ws, max) => sentences(ws).flatMap(s => { const k = Math.ceil(s.length / max), size = Math.ceil(s.length / k), r = []; for (let i = 0; i < s.length; i += size) r.push(s.slice(i, i + size)); return r; }); // break at sentence ends first, then split long sentences evenly
  const cues = [];
  for (const p of placements) { const L = words[p.line]; if (!L) continue; for (const c of chunksOf(L.words, max)) cues.push({ a: p.at + c[0].start, b: p.at + c[c.length - 1].end, t: c.map(w => w.text).join(' ') }); }
  const ts = s => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  return cues.map((c, i) => `${i + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${c.t}\n`).join('\n');
}
