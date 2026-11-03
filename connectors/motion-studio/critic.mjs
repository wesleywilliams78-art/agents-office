// Motion studio: the critic. After every draft a separate Claude (Opus 5.5, extra-high effort, no tools at all) looks at the
// contact sheets and the frame scan and scores every still out of 10 against the brand and a top-studio bar. It did not
// write the composition, so it has no reason to be kind to it. Since 26 Oct 2026 it is advice only and runs only when Wesley asks (critic: true); it never blocks a final.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freshEnv, resolveBin } from '../../mcp.mjs';
import * as tokens from '../../tokens.mjs'; // 3 Nov 2026: its run goes into the office's token ledger (the AIOS Tokens section) like every other
import { ROOT, seriesInfo } from './shared.mjs';

export const MODEL = 'claude-opus-5-5', EFFORT = 'xhigh', PASS = 8;

/** The Claude CLI, found without trusting this process's PATH: the worker runs detached and may not inherit the shell's. */
function findClaude() {
  const b = resolveBin(); if (b !== 'claude') return b;
  const exe = d => path.join(d, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  const dirs = [path.join(process.env.APPDATA || '', 'npm'), ...String(freshEnv().PATH || '').split(path.delimiter)].filter(Boolean);
  for (const d of dirs) { if (fs.existsSync(exe(d))) return exe(d); if (fs.existsSync(path.join(d, 'claude.exe'))) return path.join(d, 'claude.exe'); }
  return b;
}

const SYSTEM = () => `You are the CRITIC in a motion design studio: the creative director who signs off every frame before it goes out under WRW Hospitality's name. You did not make this piece. Your job is to find what is not good enough yet, frame by frame, and say exactly how to fix it.

You see contact sheets: numbered stills (#n · time · beat) taken on the beat grid across the whole video, including the moments between the hits, plus the engine's scan of every frame. Score EVERY still 1–10:
- 10: a frame a top motion studio would put in its reel.
- 8: shippable by a top studio. This is the bar. Every frame must reach it, including frames mid-transition.
- 6–7: competent but generic, unbalanced, empty, cramped, or the type is weak.
- 1–5: broken: blank or half-empty frame, text cut off or colliding, illegible at phone size, off-brand, an obvious template look.

Judge each still on: composition and balance (strong focal point, generous margins, nothing stranded); hierarchy and type (the brand fonts set with real typographic care, line breaks that read well, no widows); brand (the palette and its variants, the brand fonts, the WRW logo; shapes, gradients and alignment are free); energy (in a moving frame you can read the motion: things mid-spring, choreographed staggers, never a dead or empty frame); legibility at phone size; and whether it looks designed by a professional motion editor rather than generated. A frame where nothing is on screen, or where the main element has not yet arrived on a beat hit, is a dead frame: score it 4 or lower.

TRANSITIONS
- The stills include the frames half a beat before, on and after every declared cut. Score them hard: a change of colour scheme (bone, ink, red, dark to light) must be a crafted transition that belongs to the theme (ink bleeding, mist clearing, a glow rising, light changing), never a bang, a flat dissolve that looks like a default, or a hard-edged wipe. A mid-transition frame must itself look designed. An abrupt colour change scores 5 or lower on the frames around it.
- Judge whether the piece stays true to the theme, not whether it copies earlier content. New imagery and structure are welcome when they serve the theme.

CRAFT (Disney's principles in film terms; weigh them by the piece's personality)
- Staging: a clear focal point at that moment, nothing competing.
- Overlap and follow-through: a frame caught mid-move shows parts at different stages (a word still rising while its neighbour settles), not one rigid block sliding together.
- Arcs and weight: motion reads as travelling on curves with believable weight, not mechanical straight-line sliding.
- Layers: a primary, a supporting secondary and a living ambient layer are present; a frame with only one reads flat.
- Anticipation and resolution: a hit is prepared (a breath, a gathering, a swell) and settles cleanly.
- Exaggeration matches the personality (near none for The Art of Operations).
- Appeal: it would still feel right on the hundredth viewing.
A mid-move frame showing a rigid block or mechanical motion scores 7 at most. Name the principle in each fix ("follow-through: the three words rise as one block; stagger them 0.12 s and give the last a softer spring").

CALIBRATION (so the scale means the same thing every round)
- When the piece belongs to a series, the delivered work in the reference images was approved by the owner: a frame as good as those, in their manner, scores 8 to 9. Frames from those reels are the definition of the bar, including their spec (type sizes, end card sizes and positions, calm holds, word-by-word reveals). Never mark down something the series brief or the reference asks for.
- Score each still as a picture at that moment. A frame mid-reveal (part of a line risen, a line on its own while the next is coming) scores on whether it is well composed and clean (no glyph sliced into a broken shape, nothing misaligned), not for being incomplete. A held line is not a fault in itself: score the held frame on its own merits and give it the same score as an identical neighbour.
- Pacing problems (a hold too long, a scene too still, a tail that drags) go ONCE into "fixes", with the times. Dock a still for pacing only if the engine flagged it dead, or the frame on its own is empty or broken.
- Be consistent: the same picture gets the same score in every round. Raise a score when a fix lands.

Be harsh and specific. Never round up because the idea is good. Fixes must be concrete enough to code: which element, what to change, by how much, on which beat (e.g. "#7 beat 4: the cut lands on an empty red panel; bring the first word in on beat 3.5 riding the panel so the hit lands on type").

THE BRAND (motion.md, verbatim)
${fs.readFileSync(path.join(ROOT, 'motion.md'), 'utf8')}

THE HOUSE RULES the engine already enforces: real spring physics for every pop, land, drop and stamp; no CSS transitions, keyframes or fake bounce curves; a synthesised score on the beat grid; scene cuts on beats; no dead stretches; frame 0 is a finished, held title card (the thumbnail).

Answer with ONLY a JSON object, no prose before or after:
{"scores":[{"n":1,"t":0.00,"score":8,"why":"one line"}, … one per still, every still],
 "overall":7.5,
 "weakest":[n, n, …],
 "fixes":["concrete, codeable fix", …],
 "verdict":"one or two plain sentences"}`;

/** Score a draft. result: the engine's result. Returns { scores, min, overall, fixes, weakest, verdict, passed }. */
export function critique(result, { title = '', brief = '', series = null, narration = null, timeout = 12 * 60000 } = {}) {
  const S = seriesInfo(series);
  const facts = [
    `Title: ${title}`, brief && `Brief: ${brief}`,
    `Format ${result.meta.width}×${result.meta.height}, ${result.meta.duration} s at ${result.meta.fps} fps, ${result.meta.bpm} bpm (${(60 / result.meta.bpm).toFixed(3)} s per beat), cuts on beats ${result.meta.cuts.join(', ') || 'none'}.`,
    `Stills: ${result.stills.map(s => `#${s.n} ${s.t.toFixed(2)}s (beat ${s.beat})`).join(', ')}.`,
    `Engine checks passed: ${result.checks.join('; ')}.`,
    result.warnings.length && `Engine warnings: ${result.warnings.join('; ')}.`,
    result.errors.length && `Engine errors: ${result.errors.join('; ')}.`,
    narration && `Narration (Wesley's voice; captions must match it word for word): ${Object.entries(narration).map(([k, v]) => `${k}: "${v.text || v.words.map(w => w.text).join(' ')}"`).join(' · ')}.`,
    result.motion?.length && `Share of the picture visibly moving, second by second (%): ${result.motion.join(', ')}.`,
    result.dead?.length ? `Dead stretches found by the frame scan: ${result.dead.map(d => `${d.from}–${d.to} s`).join(', ')}.` : 'The frame scan found no dead stretches.',
  ].filter(Boolean).join('\n');
  const refs = S ? S.refs.filter(f => fs.statSync(f).size < 3.5e6).map(f => ({ type: 'image', source: { type: 'base64', media_type: /\.png$/i.test(f) ? 'image/png' : 'image/jpeg', data: fs.readFileSync(f).toString('base64') } })) : [];
  const content = [...(S ? [{ type: 'text', text: `THIS PIECE BELONGS TO THE SERIES "${S.name}". The next images are the series reference: the delivered work this piece must sit beside. Then the series brief. Consistency with the series is part of every score: a frame that would look out of place next to these, or breaks the brief (wrong mood, wrong motion language, wrong type), cannot score 8.\n\n${S.brief}` }, ...refs, { type: 'text', text: 'Now the contact sheets of the piece to score:' }] : []), ...result.sheets.map(f => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(f).toString('base64') } })),
    { type: 'text', text: facts + `\n\nScore all ${result.stills.length} stills. JSON only.` }];
  const dir = path.dirname(result.sheets[0]), sys = path.join(dir, 'critic-system.txt'); fs.writeFileSync(sys, SYSTEM());
  const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--system-prompt-file', sys,
    '--tools', '', '--strict-mcp-config', '--no-chrome', '--model', MODEL, '--effort', EFFORT];
  const env = freshEnv(); delete env.CLAUDECODE;
  return new Promise((resolve, reject) => {
    const p = spawn(findClaude(), args, { cwd: dir, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let out = '', err = '', text = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(`the critic took longer than ${timeout / 60000} minutes`)); }, timeout);
    p.stdin.on('error', () => {}); p.stdin.end(JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n');
    p.stdout.on('data', d => { out += d; let i; while ((i = out.indexOf('\n')) >= 0) { const l = out.slice(0, i); out = out.slice(i + 1); try { const j = JSON.parse(l); if (j.type === 'result') { text = String(j.result || ''); tokens.record(path.join(ROOT, 'data'), { kind: 'critic', ...tokens.fromResult(j, MODEL) }); } } catch {} } });
    p.stderr.on('data', d => err += d);
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => {
      clearTimeout(timer); fs.rmSync(sys, { force: true });
      const m = /\{[\s\S]*\}/.exec(text); if (!m) return reject(new Error(`the critic gave no verdict${code ? ` (exit ${code}${err ? ': ' + err.trim().slice(0, 200) : ''})` : ''}`));
      let j; try { j = JSON.parse(m[0]); } catch { return reject(new Error('the critic\'s verdict was not readable JSON')); }
      const scores = (j.scores || []).map(s => ({ n: +s.n, t: +s.t, score: +s.score, why: String(s.why || '') }));
      const missing = result.stills.filter(s => !scores.some(x => x.n === s.n)).map(s => s.n);
      const min = scores.length ? Math.min(...scores.map(s => s.score)) : 0;
      resolve({ scores, min, overall: +j.overall || 0, weakest: j.weakest || [], fixes: j.fixes || [], verdict: String(j.verdict || ''), missing,
        passed: !missing.length && min >= PASS && !result.errors.length && !result.dead?.length });
    });
  });
}
