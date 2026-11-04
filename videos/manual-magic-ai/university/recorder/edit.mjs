// Edit: cut the waits (keeping 1 s either side), add the 2 s opening and end cards, lay each narration clip on its step,
// and make an H.264 MP4 that plays on a phone. Also writes a contact sheet and the script as Markdown.
// Usage: node recorder/edit.mjs mmu-09 [--deliver]   (--deliver copies the MP4, script and recorder to the Drive folder)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findFfmpeg } from '../../../../connectors/ltx-local/shared.mjs';
import { browser, loadScript, barHtml, WORK, ROOT, DELIVER, FONT_CSS, NAVY, ORANGE, W, H, VIEW_H, BAR } from './lib.mjs';
import { renderOpener, OPEN_DUR, VEIL } from './opener.mjs';

const id = process.argv[2]; if (!id) throw new Error('usage: node recorder/edit.mjs <video-id> [--deliver]');
const script = await loadScript(id), work = WORK(id), FF = findFfmpeg();
const tl = JSON.parse(fs.readFileSync(path.join(work, 'timeline.json'), 'utf8'));
const voice = JSON.parse(fs.readFileSync(path.join(work, 'voice.json'), 'utf8'));
const CARD = 2, KEEP = 1, VOICE_IN = 0.15;
// The opening: Manual Magic AI's artwork moving with the whoosh into the platform (Penny, 4 Nov 2026; opener.mjs).
// `opener: false` in a script falls back to the plain 2 s title card.
const OPENER = script.opener !== false, OPEN = OPENER ? OPEN_DUR : CARD, LIFT = 0.3;   // LIFT: the platform rises out of the flare's pale blue
const ff = args => { const r = spawnSync(FF, ['-hide_banner', '-y', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error(r.stderr.slice(-1500)); return r.stderr; };

// 1. what to keep, in recorder time: from 1 s before step 1 to the close, minus the middle of every wait longer than 2 s
const begin = Math.max(0, tl.steps[0].from - KEEP), end = tl.closeAt;
const cuts = tl.waits.map(w => ({ ...w, k: w.keep ?? KEEP })).filter(w => w.to - w.from > 2 * w.k && w.to > begin).map(w => [Math.max(begin, w.from + w.k), w.to - w.k]).filter(([a, b]) => b > a);
const keep = []; let at = begin;
for (const [a, b] of cuts) { if (a > at) keep.push([at, a]); at = Math.max(at, b); }
keep.push([at, end]);
const toBody = t => { let out = 0; for (const [a, b] of keep) { if (t >= b) out += b - a; else { if (t > a) out += t - a; break; } } return out; };
const bodyLen = keep.reduce((s, [a, b]) => s + b - a, 0);

// 2. the cards, as stills in the Manual Magic colours
const logo = fs.readFileSync(path.join(ROOT, 'assets', 'logo.png')).toString('base64');
const card = (kicker, title) => `<html><head><style>${FONT_CSS}
body{margin:0;width:${W}px;height:${H}px;background:${NAVY};font-family:'MMU Jost',sans-serif;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 160px;box-sizing:border-box}
.k{font-weight:500;font-size:40px;letter-spacing:6px;text-transform:uppercase;color:${ORANGE};margin-bottom:28px}
.t{font-weight:500;font-size:92px;line-height:1.08;max-width:1500px}
.rule{width:120px;height:8px;background:${ORANGE};margin:44px 0 0}
img{position:absolute;right:120px;bottom:96px;height:84px;background:#fff;padding:14px 22px;border-radius:12px}</style></head>
<body><div class="k">${kicker}</div><div class="t">${title}</div><div class="rule"></div><img src="data:image/png;base64,${logo}"></body></html>`;
const b = await browser(), p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
const open = path.join(work, 'card-open.png'), close = path.join(work, 'card-end.png');
await p.setContent(card('Manual Magic University', script.title)); await p.waitForTimeout(300); await p.screenshot({ path: open });
await p.setContent(card('Next', script.next)); await p.waitForTimeout(300); await p.screenshot({ path: close });
// one caption bar per step, shown under the footage for exactly that step
await p.setViewportSize({ width: W, height: BAR });
const bars = [];
for (const [i, s] of tl.steps.entries()) { const f = path.join(work, `bar-${String(i + 1).padStart(2, '0')}.png`); await p.setContent(barHtml(s.n, script.steps[i].caption)); await p.waitForTimeout(120); await p.screenshot({ path: f }); bars.push(f); }
await b.close();
const openerDir = path.join(work, 'opener');
if (OPENER) await renderOpener({ outDir: openerDir, dur: OPEN, peak: script.sting?.peak ?? 1.9 });

// 3. the cut, the cards and the voice, in one pass
const off = tl.offset, total = OPEN + bodyLen + CARD;
const inputs = [...(OPENER ? ['-framerate', '30', '-i', path.join(openerDir, '%04d.png')] : ['-loop', '1', '-t', String(CARD), '-i', open]),
  '-i', path.join(work, 'recording.webm'), '-loop', '1', '-t', String(CARD), '-i', close];
const fv = ['[0:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p[c0]', '[2:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p[c1]'];
const nBars = bars.length, barIn = 3; bars.forEach(f => inputs.push('-i', f));
keep.forEach(([a, c], k) => fv.push(`[1:v]trim=start=${(a + off).toFixed(3)}:end=${(c + off).toFixed(3)},setpts=PTS-STARTPTS,fps=30,setsar=1,format=yuv420p[s${k}]`));
fv.push(`${keep.map((_, k) => `[s${k}]`).join('')}concat=n=${keep.length}:v=1:a=0,pad=${W}:${H}:0:0:color=${NAVY.replace('#', '0x')}[b0]`);
tl.steps.forEach((s, i) => { const a = toBody(s.from).toFixed(3), z = (i + 1 < tl.steps.length ? toBody(tl.steps[i + 1].from) : bodyLen).toFixed(3);
  fv.push(`[b${i}][${barIn + i}:v]overlay=0:${VIEW_H}:enable='between(t,${a},${z})'[b${i + 1}]`); });
fv.push(`[b${nBars}]${OPENER ? `fade=t=in:st=0:d=${LIFT}:color=${VEIL.replace('#', '0x')},` : ''}format=yuv420p[body]`, `[c0][body][c1]concat=n=3:v=1:a=0[v]`);
// The audio is built as its own graph (inputs numbered from 0, written {k}), so it can be measured on its own before the encode.
const ain = [], fa = [], addA = (...args) => { ain.push(...args); return ain.filter(x => x === '-i').length - 1; };
const sync = [];
tl.steps.forEach((s, i) => {
  const v = voice.steps[i]; if (!v) return;
  const k = addA('-i', path.join(work, 'voice', v.file));
  const startAt = OPEN + toBody(s.from) + VOICE_IN, shown = toBody(s.to) - toBody(s.from);
  sync.push({ n: s.n, caption: s.caption, step: +(OPEN + toBody(s.from)).toFixed(2), voice: +startAt.toFixed(2), late: VOICE_IN, line: v.dur, shown: +shown.toFixed(2) });
  const ms = Math.round(startAt * 1000);
  fa.push(`[{${k}}]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[a${i}]`);
});
// the opening sting (a synthesised whoosh): placed so its peak lands on the cut from the opening into the platform
const lanes = sync.map((_, i) => `[a${i}]`);
if (script.sting?.file) {
  const at = Math.max(0, OPEN - (script.sting.peak ?? 0)), ms = Math.round(at * 1000), k = addA('-i', path.resolve(ROOT, script.sting.file));
  fa.push(`[{${k}}]aresample=48000,aformat=channel_layouts=stereo,volume=${script.sting.gainDb ?? 0}dB,adelay=${ms}|${ms}[sting]`); lanes.push('[sting]');
}
const voiceMix = `${lanes.join('')}amix=inputs=${lanes.length}:normalize=0,apad,atrim=0:${total.toFixed(3)}`;
if (script.music?.file) {
  // an optional quiet bed: looped to length, faded in and out, and ducked under the voice so it never competes with a word
  const m = script.music, k = addA('-stream_loop', '-1', '-i', path.resolve(ROOT, m.file));
  fa.push(`${voiceMix},asplit=2[vo][key]`,
    `[{${k}}]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${total.toFixed(3)},volume=${m.gainDb ?? -24}dB,afade=t=in:d=1.5,afade=t=out:st=${(total - 2.5).toFixed(3)}:d=2.5[bed]`,
    `[bed][key]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=500[duck]`,
    `[vo][duck]amix=inputs=2:normalize=0[mix]`);
} else fa.push(`${voiceMix}[mix]`);
const audio = base => fa.join(';').replace(/\{(\d+)\}/g, (_, k) => `${base + +k}:a`);
// Loudness in two passes: measure the whole mix, then apply one fixed gain (linear). One-pass loudnorm rides its gain as it goes,
// so a quiet opening got turned right up (the bed's chords louder than the whoosh) and pulled back down under the whoosh.
const LUFS = -16, TP = -1.5;
const meas = JSON.parse(ff([...ain, '-filter_complex', `${audio(0)};[mix]loudnorm=I=${LUFS}:TP=${TP}:LRA=11:print_format=json[m]`, '-map', '[m]', '-f', 'null', '-']).match(/\{[^{}]*"input_i"[^{}]*\}/)[0]);
const target = Math.min(LUFS, +meas.input_i + (TP - 0.2 - +meas.input_tp));   // never so loud that the peaks would need limiting
const lra = Math.min(50, Math.max(11, Math.ceil(+meas.input_lra + 1)));        // linear mode needs a target range at least the mix's own
fa.push(`[mix]loudnorm=I=${target.toFixed(2)}:TP=${TP}:LRA=${lra}:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}:linear=true,aresample=48000[a]`);
const vIn = inputs.filter(x => x === '-i').length; inputs.push(...ain);
fv.push(audio(vIn));
const mp4 = path.join(work, `${script.file}.mp4`);
ff([...inputs, '-filter_complex', fv.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', script.preset || 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', total.toFixed(3), mp4]);
console.log(`loudness: mix measured ${meas.input_i} LUFS, peak ${meas.input_tp} dBTP → one fixed gain to ${target.toFixed(1)} LUFS`);
if (OPENER) fs.rmSync(openerDir, { recursive: true, force: true });   // ~100 MB of frames, rebuilt on every edit

// 4. a contact sheet (a frame every 2 s) to check every frame for private data, and the sync table
const sheet = path.join(work, 'contact-sheet.jpg');
ff(['-i', mp4, '-vf', 'fps=1/2,scale=480:-1,tile=6x' + Math.ceil(total / 12), '-frames:v', '1', '-q:v', '3', sheet]);
console.log(`${mp4}\n${total.toFixed(1)} s (${OPENER ? 'opener' : 'card'} ${OPEN} + end card ${CARD}, ${cuts.length} waits cut, ${(tl.closeAt - begin - bodyLen).toFixed(1)} s removed)`);
console.table(sync.map(s => ({ step: s.n, at: s.step, voice: s.voice, 'line s': s.line, 'shown s': s.shown, ok: s.shown >= s.line ? 'yes' : 'LINE RUNS OVER' })));
console.log('contact sheet:', sheet);

// 5. the script as Markdown, and delivery
const md = [`# ${script.file}: script`, '', `Manual Magic University · ${script.title}. Guide section ${script.section}. Voice: ${voice.voice} (VoiceStudio, profile ${voice.profile}). Length ${total.toFixed(0)} s.`, '',
  OPENER ? `**Opening (${OPEN} s):** Manual Magic AI University artwork; a light rides the trail with the whoosh into the platform` : `**Opening card (2 s):** Manual Magic University · ${script.title}`, '', '| # | On screen | Caption | Narration | Starts at |', '|---|---|---|---|---|',
  ...script.steps.map((s, i) => `| ${i + 1} | ${s.screen} | ${s.caption.replace(/\*/g, '')} | ${s.narration} | ${sync[i] ? sync[i].voice.toFixed(1) + ' s' : ''} |`), '',
  `**End card (2 s):** Next: ${script.next}`, ''].join('\n');
fs.writeFileSync(path.join(work, `${script.file.split(' ')[0]} script.md`), md);
if (process.argv.includes('--deliver')) {
  const rs = path.join(DELIVER, 'recording-scripts'); fs.mkdirSync(path.join(rs, 'recorder'), { recursive: true }); fs.mkdirSync(path.join(rs, 'videos', id), { recursive: true });
  fs.copyFileSync(mp4, path.join(DELIVER, `${script.file}.mp4`));
  fs.writeFileSync(path.join(DELIVER, `${script.file.split(' ')[0]} script.md`), md);
  for (const f of fs.readdirSync(path.join(ROOT, 'recorder'))) fs.copyFileSync(path.join(ROOT, 'recorder', f), path.join(rs, 'recorder', f));
  fs.copyFileSync(path.join(ROOT, 'videos', id, 'script.mjs'), path.join(rs, 'videos', id, 'script.mjs'));
  fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(rs, 'README.md'));
  console.log('delivered to', DELIVER);
}
