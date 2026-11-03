"""Soften hard "p", "b", "t" and "k" releases: a burst that leaps out of a short closure silence.
deplosive.py only catches low wind below 120 Hz. A synthetic voice's hard P is a sharp burst across the whole spectrum, so
this finds each burst (10 ms frames, quiet before, a jump of --jump dB) and dips the first 30 ms by --db, with 8 ms ramps.
Lengths are unchanged.
  python -I softp.py <in_dir> <out_dir> [--db 6] [--jump 18]"""
import os, sys
import numpy as np, soundfile as sf

IN, OUT = sys.argv[1], sys.argv[2]
arg = lambda k, d: float(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
DIP, JUMP = arg("--db", 6.0), arg("--jump", 18.0)
os.makedirs(OUT, exist_ok=True)

for name in sorted(f for f in os.listdir(IN) if f.endswith(".wav")):
    x, sr = sf.read(os.path.join(IN, name))
    mono = x if x.ndim == 1 else x.mean(1)
    fr = int(sr * 0.005)
    n = len(mono) // fr
    db = 20 * np.log10(np.sqrt((mono[:n * fr].reshape(n, fr) ** 2).mean(1)) + 1e-9)
    loud = np.percentile(db, 90)
    gain = np.ones(len(mono)); hits = 0; k = 6
    while k < n - 6:
        before = db[k - 6:k].max()                      # 30 ms before: the closure
        if before < loud - 30 and db[k:k + 2].max() - before > JUMP and db[k:k + 2].max() > loud - 14:
            a = k * fr; b = a + int(sr * 0.03); r = int(sr * 0.008)
            g = 10 ** (-DIP / 20)
            seg = np.full(b - a, g)
            seg[:r] = np.linspace(1, g, r); seg[-r:] = np.linspace(g, 1, r)
            gain[a:b] = np.minimum(gain[a:b], seg[:len(gain[a:b])]); hits += 1; k += 8
        else:
            k += 1
    y = x * (gain if x.ndim == 1 else gain[:, None])
    sf.write(os.path.join(OUT, name), y.astype(np.float32), sr, subtype="PCM_16")
    print(f"{name}: {hits} hard releases softened")
