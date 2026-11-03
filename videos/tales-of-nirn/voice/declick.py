"""Remove the voice model's tiny clicks (Wesley, 2 Nov: "a nasty little clip ... throughout").
VoxCPM2 leaves short broadband spikes at some sound onsets, reaching right up to 15-23 kHz. They live almost entirely in the
top band, where her voice carries only air. So: split each line at 7 kHz, find spikes in the top band (2 ms energy far above
its 30 ms surroundings), turn only the top band down by 20 dB for those few milliseconds (smooth 2 ms ramps), and add the
body of the voice back untouched. Nothing below 7 kHz is changed, so the voice cannot chop. Also rolls the top off above 14 kHz.
  python -I declick.py <in dir> <out dir> [--db 11]
Prints the clicks repaired per line."""
import os, sys
import numpy as np, soundfile as sf

IN, OUT = sys.argv[1], sys.argv[2]
TH = float(sys.argv[sys.argv.index('--db') + 1]) if '--db' in sys.argv else 11.0
os.makedirs(OUT, exist_ok=True)

def split(x, sr, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr)
    w = 1 / (1 + (f / fc) ** 8)                       # a smooth crossover, so low + high == x
    low = np.fft.irfft(X * w, len(x)); return low, x - low

def roll_off(x, sr, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** 6), len(x))

total = 0
for name in sorted(f for f in os.listdir(IN) if f.endswith('.wav')):
    x, sr = sf.read(os.path.join(IN, name)); mono = x.ndim == 1
    if not mono: x = x.mean(1)
    low, high = split(x, sr, 7000)
    fr = int(sr * 0.002); n = len(x) // fr
    e = 10 * np.log10(np.array([(high[i * fr:(i + 1) * fr] ** 2).mean() for i in range(n)]) + 1e-14)
    med = np.array([np.median(e[max(0, i - 8):i + 8]) for i in range(n)])
    hits = np.where(e - med > TH)[0]
    g = np.ones(len(x)); r = int(sr * 0.002)
    for i in hits:
        a, b = max(0, i * fr - r), min(len(x), (i + 1) * fr + r)
        seg = np.full(b - a, 0.1)                        # -20 dB in the top band only
        seg[:r] = np.linspace(1, 0.1, r)[:len(seg[:r])]; seg[-r:] = np.minimum(seg[-r:], np.linspace(0.1, 1, r)[-len(seg[-r:]):])
        g[a:b] = np.minimum(g[a:b], seg)
    y = roll_off(low + high * g, sr, 14000)
    sf.write(os.path.join(OUT, name), y.astype(np.float32), sr, subtype='PCM_16')
    groups = (np.diff(hits) > 2).sum() + 1 if len(hits) else 0; total += groups
    print(f'{name}: {groups} clicks repaired')
print('total', total)
