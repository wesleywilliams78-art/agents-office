"""Measure tempo, beats and downbeats of a track with numpy only.

usage: python beatgrid.py <audio> <out.json> [bars=30]
Decodes with ffmpeg to mono 22.05 kHz, builds a spectral-flux onset envelope,
finds the period by autocorrelation, the beat phase by comb fit, snaps each beat
to its local kick peak, then picks the bar phase where harmonic change and low-end
weight are highest (the downbeat). Chooses the 60 s window of `bars` bars that
starts on a downbeat with the steadiest tempo and the closest loop seam.
Windows must sit where the kick is present; FORCE=1 lifts that, START=<s> picks
the window nearest that track time.
"""
import json, os, subprocess, sys
import numpy as np

SR = 22050
HOP = 128          # 5.8 ms per frame
NFFT = 2048
FORCE = os.environ.get("FORCE") == "1"
START = float(os.environ.get("START", "-1"))

def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR),
                          '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def stft_mag(x):
    win = np.hanning(NFFT).astype(np.float32)
    n = 1 + (len(x) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    return np.abs(np.fft.rfft(x[idx] * win, axis=1)).astype(np.float32)

def band(mag, lo, hi):
    f = np.fft.rfftfreq(NFFT, 1 / SR)
    return mag[:, (f >= lo) & (f < hi)]

def flux(m):
    lm = np.log1p(100 * m)
    d = np.diff(lm, axis=0, prepend=lm[:1])
    return np.maximum(d, 0).sum(axis=1)

def smooth(v, w):
    k = np.hanning(w); k /= k.sum()
    return np.convolve(v, k, mode='same')

def main():
    path, out = sys.argv[1], sys.argv[2]
    bars = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    x = decode(path)
    dur = len(x) / SR
    mag = stft_mag(x)
    fps = SR / HOP
    t = (np.arange(len(mag)) * HOP + NFFT / 2) / SR

    onset = flux(mag)
    onset = onset - smooth(onset, int(fps * 0.4))
    onset = np.maximum(onset, 0)
    low = flux(band(mag, 30, 160))          # kick
    low = np.maximum(low - smooth(low, int(fps * 0.4)), 0)

    # tempo by autocorrelation, searched 90-150 BPM, folded toward 120
    o = onset - onset.mean()
    ac = np.correlate(o, o, mode='full')[len(o) - 1:]
    lags = np.arange(len(ac)) / fps
    bpms = 60 / np.maximum(lags, 1e-9)
    sel = (bpms >= 90) & (bpms <= 150)
    lag0 = np.argmax(ac * sel)
    # parabolic refine
    a, b, c = ac[lag0 - 1], ac[lag0], ac[lag0 + 1]
    lagf = lag0 + 0.5 * (a - c) / (a - 2 * b + c)
    period = lagf / fps
    bpm_ac = 60 / period

    # beat phase by comb fit on kick + full onset
    env = low / (low.max() + 1e-9) + 0.5 * onset / (onset.max() + 1e-9)
    phases = np.linspace(0, period, 400, endpoint=False)
    def comb(ph):
        bt = np.arange(ph, dur - 0.05, period)
        fi = np.clip(np.round((bt * SR - NFFT / 2) / HOP).astype(int), 0, len(env) - 1)
        return env[fi].sum()
    ph = phases[np.argmax([comb(p) for p in phases])]

    # snap each grid beat to the local envelope peak within +-35 ms
    grid = np.arange(ph, dur - 0.05, period)
    beats, strength = [], []
    rad = int(0.035 * fps)
    for g in grid:
        fi = int(round((g * SR - NFFT / 2) / HOP))
        lo_, hi_ = max(fi - rad, 0), min(fi + rad + 1, len(env))
        if hi_ <= lo_: continue
        j = lo_ + int(np.argmax(env[lo_:hi_]))
        beats.append(float(t[j])); strength.append(float(env[j]))
    beats = np.array(beats); strength = np.array(strength)

    # straight-line fit through the snapped beats = the track's real grid
    k = np.arange(len(beats))
    A = np.vstack([k, np.ones_like(k)]).T
    (p_fit, t_fit), *_ = np.linalg.lstsq(A, beats, rcond=None)
    resid = beats - (k * p_fit + t_fit)
    bpm_fit = 60 / p_fit

    # downbeat: harmonic novelty (chord change) and low weight per beat, by bar phase
    harm = band(mag, 160, 2000)
    nb = 24
    edges = np.linspace(0, harm.shape[1], nb + 1).astype(int)
    hb = np.stack([harm[:, edges[i]:edges[i + 1]].sum(1) for i in range(nb)], 1)
    hb = np.log1p(hb)
    def seg(tc, w=0.22):
        a_ = np.searchsorted(t, tc); b_ = np.searchsorted(t, tc + w)
        return hb[a_:max(b_, a_ + 1)].mean(0)
    nov = []
    for bt in beats:
        before = seg(bt - 0.24); after = seg(bt + 0.01)
        nov.append(float(np.linalg.norm(after - before)))
    nov = np.array(nov)
    score = np.zeros(4)
    for p4 in range(4):
        sl = slice(p4, None, 4)
        score[p4] = (nov[sl].mean() / nov.mean()) + 0.5 * (strength[sl].mean() / strength.mean())
    down = int(np.argmax(score))
    down_conf = float((score.max() - np.sort(score)[-2]) / score.max())

    # pick the window: `bars` bars from a downbeat, steadiest residuals, seam match
    nbeats = bars * 4
    rms_frames = np.sqrt(smooth((x ** 2), int(SR * 0.05))[::HOP][:len(t)])
    # groove mask: a bar counts when the kick band carries real weight (no intro, no fade)
    fr = np.fft.rfftfreq(NFFT, 1 / SR)
    pw = mag.astype(np.float64) ** 2
    lowp = pw[:, (fr > 30) & (fr < 150)].sum(1); allp = pw.sum(1) + 1e-12
    def groove(a_, b_):
        i0, i1 = np.searchsorted(t, a_), np.searchsorted(t, b_)
        return 10 * np.log10(lowp[i0:i1].sum() / allp[i0:i1].sum() + 1e-12)
    cand = []
    for s in range(down, len(beats) - nbeats, 4):
        bar_ok = all(groove(beats[s + 4 * i], beats[s + 4 * i + 4]) > -4 for i in range(bars))
        if not bar_ok and not FORCE: continue
        w = slice(s, s + nbeats + 1)
        if s + nbeats >= len(beats): break
        jitter = float(np.std(resid[w]) * 1000)
        t0, t1 = beats[s], beats[s + nbeats]
        # loudness of the first bar vs the bar before the seam: a loop should match
        def level(a_, b_):
            i0, i1 = np.searchsorted(t, a_), np.searchsorted(t, b_)
            return float(rms_frames[i0:i1].mean())
        seam = abs(20 * np.log10(level(t0, t0 + 2) / max(level(t1 - 2, t1), 1e-9)))
        # avoid the generated intro/outro: first and last 4 s weighted down
        edge = (t0 < 2.0) * 2.0 + (t1 > dur - 2.0) * 2.0
        cand.append((jitter + 2 * seam + edge, s, t0, t1, jitter, seam))
    if START >= 0: cand = [c for c in cand if abs(c[2] - START) < 0.3] or cand
    cand.sort()
    best = cand[0]
    _, s, t0, t1, jit, seam = best
    win_beats = beats[s:s + nbeats + 1] - t0

    res = {
        'file': path, 'duration_s': round(dur, 3),
        'bpm_autocorr': round(float(bpm_ac), 3), 'bpm_fit': round(float(bpm_fit), 3),
        'period_s': round(float(p_fit), 5),
        'beat_count': int(len(beats)),
        'residual_ms_rms': round(float(np.sqrt((resid ** 2).mean()) * 1000), 2),
        'residual_ms_max': round(float(np.abs(resid).max() * 1000), 2),
        'downbeat_phase': down, 'downbeat_scores': [round(float(v), 3) for v in score],
        'downbeat_confidence': round(down_conf, 3),
        'window': {'start_beat': int(s), 'start_s': round(float(t0), 4), 'end_s': round(float(t1), 4),
                   'length_s': round(float(t1 - t0), 4), 'jitter_ms': round(jit, 2),
                   'seam_db': round(seam, 2)},
        'beats_in_window_s': [round(float(v), 4) for v in win_beats],
        'beat_offsets_from_ideal_ms': [round(float((v - i * 0.5) * 1000), 1) for i, v in enumerate(win_beats)],
        'all_beats_s': [round(float(v), 4) for v in beats],
    }
    json.dump(res, open(out, 'w'), indent=1)
    show = {k_: v for k_, v in res.items() if k_ not in ('beats_in_window_s', 'beat_offsets_from_ideal_ms', 'all_beats_s')}
    print(json.dumps(show, indent=1))
    offs = np.array(res['beat_offsets_from_ideal_ms'])
    print('offset from ideal 120 grid in window: mean %.1f ms, max |%.1f| ms' % (offs.mean(), np.abs(offs).max()))
    for bar in (1, 8, 15, 22, 30):
        i = (bar - 1) * 4
        print('bar %2d b1 at %.3f s (ideal %.3f)' % (bar, win_beats[i], i * 0.5))

if __name__ == '__main__':
    main()
