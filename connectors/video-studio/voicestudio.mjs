// Video studio: the owner's own cloned voice, from VoiceStudio (OmniVoice) running on this computer: private, free, offline.
// VoiceStudio serves its engine on 127.0.0.1:3900. A cloned profile stores a reference recording and its transcript; the engine
// accepts a reference of at most about 10 seconds when a transcript is given, so a longer reference is trimmed here, at a natural
// pause, to the matching first sentences of its transcript (the stored profile itself is never changed).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { DATA } from './shared.mjs';
import { findFfmpeg } from '../ltx-local/shared.mjs';

const BASE = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
const VOICES_DIR = process.env.OMNIVOICE_VOICES_DIR || path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'OmniVoice', 'voices');
const CACHE = path.join(DATA, 'voice-ref');
const FFMPEG = findFfmpeg();
const MAX_REF = 10;

const run = (args) => new Promise(res => { const p = spawn(FFMPEG, args, { windowsHide: true }); let o = ''; p.stderr.on('data', d => o += d); p.on('error', () => res({ code: -1, out: 'ffmpeg not found' })); p.on('close', code => res({ code, out: o })); });

/** Is VoiceStudio running? */
export async function available() { try { const r = await fetch(BASE + '/health', { signal: AbortSignal.timeout(3000) }); return r.ok; } catch { return false; } }

/** The profile called `name` (case-insensitive) that is a clone of a real voice, or null. */
export async function findProfile(name) {
  const r = await fetch(BASE + '/profiles', { signal: AbortSignal.timeout(5000) }); if (!r.ok) return null;
  const list = await r.json();
  return (Array.isArray(list) ? list : list.profiles || []).find(p => String(p.name).toLowerCase() === String(name).toLowerCase() && p.kind !== 'design') || null;
}

const seconds = out => { const m = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(out); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };
export async function durationOf(file) { return seconds((await run(['-i', file])).out); }

/** A reference clip of 10 s or less and the transcript that matches it exactly. Cached per profile. */
export async function reference(profile) {
  fs.mkdirSync(CACHE, { recursive: true });
  const src = path.join(VOICES_DIR, profile.ref_audio_path), key = `${profile.id}-${Math.round(fs.statSync(src).mtimeMs)}`;
  const wav = path.join(CACHE, key + '.wav'), txt = path.join(CACHE, key + '.txt');
  if (fs.existsSync(wav) && fs.existsSync(txt)) return { audio: wav, text: fs.readFileSync(txt, 'utf8') };
  const total = await durationOf(src), full = String(profile.ref_text || '').trim();
  if (!full) throw new Error('the voice profile has no reference transcript');
  if (total <= MAX_REF) { fs.copyFileSync(src, wav); fs.writeFileSync(txt, full); return { audio: wav, text: full }; }
  // find the pauses, cut at the last one before 10 s, and take the same share of the transcript's sentences
  const sil = await run(['-hide_banner', '-nostats', '-i', src, '-af', 'silencedetect=noise=-38dB:d=0.25', '-f', 'null', '-']);
  const starts = [...sil.out.matchAll(/silence_start:\s*([\d.]+)/g)].map(m => +m[1]);
  const speechEnd = starts.filter(s => s > total - 3).pop() ?? total, cuts = starts.filter(s => s >= 4 && s <= MAX_REF - 0.1);
  if (!cuts.length) throw new Error('no natural pause in the first 10 seconds of the voice reference: re-record it with a pause after the first sentence or two');
  const cut = cuts[cuts.length - 1], sentences = full.match(/[^.!?]+[.!?]+(\s|$)/g)?.map(s => s.trim()) || [full], chars = sentences.map(s => s.length), sum = chars.reduce((a, b) => a + b, 0);
  let run2 = 0, best = 1, bestD = 9; sentences.forEach((s, k) => { run2 += chars[k]; const d = Math.abs(run2 / sum - cut / speechEnd); if (d < bestD) { bestD = d; best = k + 1; } });
  const piece = sentences.slice(0, best).join(' ');
  const r = await run(['-y', '-i', src, '-t', cut.toFixed(2), '-c:a', 'pcm_s16le', wav]); if (r.code !== 0) throw new Error('could not trim the voice reference: ' + r.out.slice(-200));
  fs.writeFileSync(txt, piece); return { audio: wav, text: piece };
}

/** What a voice should be given to say: pounds and percentages written out, symbols spoken. */
export const speakable = t => String(t).replace(/\*/g, '').replace(/£\s?([0-9][0-9,]*(?:\.[0-9]+)?)\s?([kK])\b/g, '$1 thousand pounds').replace(/£\s?([0-9][0-9,]*(?:\.[0-9]+)?)/g, '$1 pounds').replace(/%/g, ' percent').replace(/&/g, ' and ').replace(/\s+/g, ' ').trim();

/** Speak one line in the cloned voice. Returns the wav path. */
export async function speak(profile, ref, line, out, speed = 1) {
  const fd = new FormData();
  fd.append('text', speakable(line)); fd.append('language', 'en'); fd.append('speed', String(speed));
  fd.append('ref_text', ref.text); fd.append('ref_audio', new Blob([fs.readFileSync(ref.audio)], { type: 'audio/wav' }), 'ref.wav');
  const r = await fetch(BASE + '/generate', { method: 'POST', body: fd, signal: AbortSignal.timeout(180000) });
  if (!r.ok) { let m = ''; try { m = (await r.json()).detail; } catch {} throw new Error(`VoiceStudio refused the line (${r.status}): ${String(m).slice(0, 200)}`); }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  return out;
}
