"""Find plosive pops: short bursts of energy below 120 Hz. Reports each burst with the word it falls on.
  python .vo/plosives.py <vo_dir> [--db 12]"""
import json, sys
import numpy as np, soundfile as sf

VO = sys.argv[1]
THRESH = float(sys.argv[sys.argv.index("--db") + 1]) if "--db" in sys.argv else 12.0
words = json.load(open(".vo/words-new.json"))

def low_band_db(x, sr, frame=0.02, cut=120):
    n = int(sr * frame); hop = n // 2
    win = np.hanning(n); freqs = np.fft.rfftfreq(n, 1 / sr); lo = freqs < cut
    out = []
    for i in range(0, len(x) - n, hop):
        spec = np.abs(np.fft.rfft(x[i:i + n] * win)) ** 2
        out.append((i / sr, 10 * np.log10(spec[lo].sum() + 1e-12), 10 * np.log10(spec.sum() + 1e-12)))
    return np.array(out)

total = 0
for sid in sorted(words):
    x, sr = sf.read(f"{VO}/{sid}.wav")
    if x.ndim > 1: x = x.mean(axis=1)
    a = low_band_db(x, sr)
    speech = a[a[:, 2] > np.percentile(a[:, 2], 40)]
    base = np.median(speech[:, 1])
    hits, last = [], -1
    for t, lo, al in a:
        if lo - base > THRESH and t - last > 0.15:
            w = min(words[sid]["words"], key=lambda w: abs(w["start"] - t))
            hits.append((round(t, 2), round(lo - base, 1), w["text"])); last = t
    total += len(hits)
    print(f"{sid}: {len(hits)} bursts", hits)
print("total", total)
