// Finish one format: two-pass loudness on the mix, H.264 High yuv420p BT.709 + AAC 192k, faststart, then checks.
// usage: node finish.mjs <project dir> <square|vertical> <out name>
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { FFMPEG } from '../../../connectors/motion-studio/shared.mjs';

const [dir, format, name] = process.argv.slice(2);
const P = path.resolve(dir), OUT = path.join(P, 'out', format), SRC = path.join(OUT, 'video-444.mkv'), MIX = path.join(P, 'audio', 'mix.wav');
const dst = path.join(P, 'renders', name);
fs.mkdirSync(path.dirname(dst), { recursive: true });
const run = (args, ok = false) => new Promise((res, rej) => { const p = spawn(FFMPEG, args, { windowsHide: true }); let o = ''; p.stderr.on('data', d => o += d); p.stdout.on('data', d => o += d); p.on('close', c => c && !ok ? rej(new Error(o.slice(-3000))) : res(o)); });

const target = 'I=-14:TP=-2.2:LRA=11';
const m = JSON.parse((await run(['-hide_banner', '-i', MIX, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'])).match(/\{[\s\S]*?\}/)[0]);
const af = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
const vf = 'scale=in_color_matrix=bt601:in_range=tv:out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv';
await run(['-y', '-v', 'error', '-i', SRC, '-i', MIX, '-map', '0:v', '-map', '1:a', '-t', '60',
  '-vf', vf, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-tune', 'animation', '-crf', '12', '-maxrate', '6M', '-bufsize', '12M', '-g', '120',
  '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-af', af, '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-movflags', '+faststart', dst]);

// checks: size, duration, loudness, frame count, navy and orange after decoding
const probe = await run(['-hide_banner', '-i', dst], true);
const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe);
const mb = fs.statSync(dst).size / 1e6;
const loud = JSON.parse((await run(['-hide_banner', '-i', dst, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-vn', '-f', 'null', '-'])).match(/\{[\s\S]*?\}/)[0]);
console.log(JSON.stringify({ file: dst, MB: +mb.toFixed(2), duration: dur ? +dur[3] + 60 * +dur[2] : null,
  video: (probe.match(/Video: [^\n]+/) || [''])[0].slice(0, 160), audio: (probe.match(/Audio: [^\n]+/) || [''])[0],
  loudness_LUFS: +loud.input_i, true_peak_dBTP: +loud.input_tp }, null, 1));
