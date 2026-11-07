// Motion studio: the ears. After a clean draft, Earshot (github.com/Leonxlnx/earshot, local, CPU, no network) listens to the
// draft's finished mix and reports loudness, silence, ending, spectrum and sync to the picture. Advice only, like the critic:
// it never blocks a final. Skipped quietly when Earshot is not installed or fails, so a draft never depends on it.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const EARSHOT_DIR = process.env.EARSHOT_DIR || 'C:\\Users\\Wesley\\tools\\earshot';
const PY = path.join(EARSHOT_DIR, '.venv', 'Scripts', 'python.exe');
// Earshot's scorecard is a profile of fast, hard-cut product films (115-136 BPM, 2 to 8 hits a second). These metrics measure
// that style (or, for p_real, the fact that our score is synthesised on purpose), not whether the sound is broken, so they are shown as context and never as a fix.
const STYLE = new Set(['onset_rate', 'hit_rate', 'p_real', 'tempo', 'cut_rate', 'correlation']); // p_real: the score is synthesised on purpose
const TIMEOUT_MS = 4 * 60 * 1000;

export const installed = () => fs.existsSync(PY);

/** Listen to a finished draft. Returns { ok, verdict, score, fixes[], style[], loudness, notes } or { ok: false, reason }. */
export function listen(file, out) {
  return new Promise(resolve => {
    if (!installed()) return resolve({ ok: false, reason: 'Earshot is not installed (' + EARSHOT_DIR + ')' });
    const json = path.resolve(out, 'ears.json');
    fs.rmSync(json, { force: true });
    let err = '', done = false;
    const p = spawn(PY, ['-m', 'earshot', 'critique', path.resolve(file), '--json', '--out', json], { cwd: EARSHOT_DIR, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    const finish = v => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => { try { p.kill(); } catch {} finish({ ok: false, reason: 'Earshot took longer than 4 minutes' }); }, TIMEOUT_MS);
    p.stderr.on('data', d => { err = (err + d).slice(-600); });
    p.stdout.on('data', () => {});
    p.on('error', e => finish({ ok: false, reason: e.message }));
    p.on('close', code => {
      let d; try { d = JSON.parse(fs.readFileSync(json, 'utf8')); } catch {}
      if (code !== 0 || !d) return finish({ ok: false, reason: (err.trim().split('\n').pop() || 'Earshot gave no result').slice(0, 240) });
      const acts = d.actions || [];
      const metric = n => (d.metrics || []).find(m => m.metric === n);
      const lufs = metric('lufs_i'), tp = metric('true_peak');
      finish({
        ok: true,
        verdict: d.verdict, score: d.score, inRange: d.in_range, scored: d.scored,
        fixes: acts.filter(a => !STYLE.has(a.metric)).map(a => `[${a.weight}] ${a.action}`),
        style: acts.filter(a => STYLE.has(a.metric)).map(a => a.action),
        loudness: lufs ? `${lufs.value} LUFS` + (tp ? `, true peak ${tp.value} dBTP` : '') : undefined,
        sync: d.not_measured?.['fewer than 3 visual events'] ? undefined : metric('cuts_with_sound')?.value,
        notes: d.tips || [],
        file: json,
      });
    });
  });
}
