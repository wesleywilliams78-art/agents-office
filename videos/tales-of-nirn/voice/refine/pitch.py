"""How much a reading moves: median pitch, and the spread of pitch in semitones (stdev and the 10th-90th percentile range)
across the voiced frames of every wav given. More spread = more rise and fall.
  python -I pitch.py a.wav b.wav ..."""
import sys, wave
import numpy as np

def f0s(path):
    w = wave.open(path); sr = w.getframerate(); n = w.getnchannels(); sw = w.getsampwidth()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype={2: np.int16, 4: np.int32}[sw]).astype(float)
    if n > 1: x = x.reshape(-1, n).mean(1)
    x /= (abs(x).max() or 1); fr = int(0.04 * sr); hop = fr // 2; out = []
    for i in range(0, len(x) - fr, hop):
        s = x[i:i + fr] * np.hanning(fr)
        if np.sqrt((s ** 2).mean()) < 0.03: continue
        c = np.correlate(s, s, 'full')[fr - 1:]; lo, hi = int(sr / 400), int(sr / 60)
        k = lo + np.argmax(c[lo:hi])
        if c[k] / c[0] > 0.45: out.append(sr / k)
    return np.array(out)

for p in sys.argv[1:]:
    f = f0s(p); st = 12 * np.log2(f / np.median(f))
    print(f"{p.split('/')[-1]:28s} median {np.median(f):5.0f} Hz   stdev {st.std():4.2f} st   p10-p90 {np.percentile(st, 90) - np.percentile(st, 10):4.1f} st")
