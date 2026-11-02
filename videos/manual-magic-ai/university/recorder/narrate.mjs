// Narrate: one clip per step in Wesley's cloned voice (VoiceStudio, profile "Wesley"). Writes work/<id>/voice/NN.wav and
// voice.json with each clip's length, which record.mjs uses to hold each step on screen long enough. No other voice is allowed.
// Usage: node recorder/narrate.mjs mmu-09 [--only 3,5]   (re-voice some steps)
import fs from 'node:fs';
import path from 'node:path';
import { available, findProfile, reference, speakable, durationOf } from '../../../../connectors/video-studio/voicestudio.mjs';

// Max quality pinned on every call (not left to VoiceStudio's current setting): 64 steps and post-processing. The profile's own
// recording is longer than the 20 s a transcript allows, so the trimmed reference from voicestudio.mjs goes instead of profile_id.
const MAX = { num_step: '64', postprocess_output: 'true', seed: '7' };
async function speak(profile, ref, line, out, speed) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ text: speakable(line), language: 'en', speed: String(speed), ref_text: ref.text, ...MAX })) fd.append(k, v);
  fd.append('ref_audio', new Blob([fs.readFileSync(ref.audio)], { type: 'audio/wav' }), 'ref.wav');
  const r = await fetch('http://127.0.0.1:3900/generate', { method: 'POST', body: fd, signal: AbortSignal.timeout(300000) });
  if (!r.ok) throw new Error('VoiceStudio refused the line: ' + (await r.text()).slice(0, 300));
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}
import { loadScript, WORK } from './lib.mjs';

const id = process.argv[2]; if (!id) throw new Error('usage: node recorder/narrate.mjs <video-id>');
const only = (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '').split(',').filter(Boolean).map(Number);
const script = await loadScript(id), dir = path.join(WORK(id), 'voice'); fs.mkdirSync(dir, { recursive: true });
if (!await available()) throw new Error('VoiceStudio is not running on 127.0.0.1:3900. Ask Wesley to start it; do not use another voice.');
const profile = await findProfile(script.voice || 'Wesley');
if (!profile) throw new Error(`VoiceStudio has no profile called "${script.voice || 'Wesley'}". Ask Wesley; do not use another voice.`);
const ref = await reference(profile);
const metaFile = path.join(WORK(id), 'voice.json');
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : { voice: profile.name, profile: profile.id, steps: [] };
for (const [i, step] of script.steps.entries()) {
  const n = i + 1; if (only.length && !only.includes(n)) continue;
  const raw = path.join(dir, `${String(n).padStart(2, '0')}-raw.wav`), wav = path.join(dir, `${String(n).padStart(2, '0')}.wav`);
  process.stdout.write(`step ${n}: ${step.narration.slice(0, 60)}… `);
  await speak(profile, ref, step.narration, raw, script.pace || 1);
  // trim silence at both ends so the line starts on its step
  const { spawnSync } = await import('node:child_process');
  const { findFfmpeg } = await import('../../../../connectors/ltx-local/shared.mjs');
  spawnSync(findFfmpeg(), ['-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '48000', '-ac', '1', wav], { windowsHide: true });
  const dur = await durationOf(wav);
  meta.steps[i] = { n, file: path.basename(wav), dur: +dur.toFixed(2), text: step.narration };
  console.log(dur.toFixed(2) + ' s');
}
meta.voice = profile.name; meta.profile = profile.id; meta.quality = { ...MAX, speed: script.pace || 1 }; meta.at = new Date().toISOString();
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 1));
console.log('total', meta.steps.reduce((a, s) => a + (s?.dur || 0), 0).toFixed(1), 's of narration →', metaFile);
