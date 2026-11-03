"""The one-voice gate (Wesley, 2 Nov: "only the female voice we've curated reads the story"). Every narration line must sit
in the Night Reader's register. A line whose median pitch falls well below hers, or whose low share is too high, is
read as a different (male-sounding) voice and fails; so does an empty or near-silent file.
  python -I gate.py <lines dir> [--ref-median 143] [--min-hz 118]
Prints one row per line and a FAILED list; exit code 1 if any line fails."""
import sys, os, wave
import numpy as np

D = sys.argv[1]
arg = lambda k, d: float(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
REF, MIN = arg('--ref-median', 143.0), arg('--min-hz', 118.0)

def f0s(path):
    w = wave.open(path); sr = w.getframerate(); n = w.getnchannels(); sw = w.getsampwidth()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype={2: np.int16, 4: np.int32}[sw]).astype(float)
    if n > 1: x = x.reshape(-1, n).mean(1)
    peak = abs(x).max() if len(x) else 0
    if peak == 0: return np.array([]), 0.0
    x /= peak; fr = int(0.04 * sr); hop = fr // 2; out = []
    for i in range(0, len(x) - fr, hop):
        s = x[i:i + fr] * np.hanning(fr)
        if np.sqrt((s ** 2).mean()) < 0.03: continue
        c = np.correlate(s, s, 'full')[fr - 1:]; lo, hi = int(sr / 400), int(sr / 60)
        k = lo + np.argmax(c[lo:hi])
        if c[k] / c[0] > 0.45: out.append(sr / k)
    return np.array(out), len(x) / sr

failed = []
for name in sorted(f for f in os.listdir(D) if f.endswith('.wav')):
    try: f, dur = f0s(os.path.join(D, name))
    except Exception as e: f, dur = np.array([]), 0.0
    if len(f) < 8 and not (len(f) >= 3 and dur < 1.6 and np.median(f) >= MIN): why = 'no voice'   # a one-word line has few voiced frames
    elif len(f) < 8: why = ''
    else:
        med = np.median(f); low = (f < MIN).mean()
        why = '' if (med >= MIN and low < 0.45) else f'too low ({med:.0f} Hz, {low:.0%} of voiced frames under {MIN:.0f})'
    if why: failed.append(name[:-4])
    print(f"{name}  {np.median(f) if len(f) else 0:5.0f} Hz  {dur:5.1f}s  {'FAIL ' + why if why else 'ok'}")
print('FAILED:', ' '.join(failed) or 'none')
sys.exit(1 if failed else 0)
