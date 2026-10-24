"""Soften plosive pops ("p", "b" wind on the mic) without touching the rest of the voice.
1) a gentle 75 Hz low cut on the whole line (rumble only, below the speaking voice);
2) where a burst below 120 Hz is detected, crossfade for ~50 ms to a copy with everything below 180 Hz removed.
Lengths are unchanged, so word timings stay valid.
  python .vo/deplosive.py <in_dir> <out_dir> [--db 8]"""
import os, subprocess, sys, tempfile
import numpy as np, soundfile as sf

IN, OUT = sys.argv[1], sys.argv[2]
THRESH = float(sys.argv[sys.argv.index("--db") + 1]) if "--db" in sys.argv else 8.0
os.makedirs(OUT, exist_ok=True)

def ff(src, dst, af):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", af, "-c:a", "pcm_f32le", dst], check=True)

def low_db(x, sr, frame, hop, cut=120):
    win = np.hanning(frame); lo = np.fft.rfftfreq(frame, 1 / sr) < cut
    lows, alls = [], []
    for i in range(0, len(x) - frame, hop):
        s = np.abs(np.fft.rfft(x[i:i + frame] * win)) ** 2
        lows.append(10 * np.log10(s[lo].sum() + 1e-12)); alls.append(10 * np.log10(s.sum() + 1e-12))
    return np.array(lows), np.array(alls)

tmp = tempfile.mkdtemp()
for name in sorted(f for f in os.listdir(IN) if f.endswith(".wav") and len(f) <= 6):   # s1.wav … s7.wav only
    src = os.path.join(IN, name)
    base_f, hp_f = os.path.join(tmp, "base.wav"), os.path.join(tmp, "hp.wav")
    ff(src, base_f, "highpass=f=75:poles=2")
    ff(src, hp_f, "highpass=f=180:poles=2,highpass=f=180:poles=2")
    x, sr = sf.read(base_f); h, _ = sf.read(hp_f)
    frame, hop = int(sr * 0.02), int(sr * 0.01)
    lows, alls = low_db(x, sr, frame, hop)
    ref = np.median(lows[alls > np.percentile(alls, 40)])
    mask = np.zeros(len(x))
    hits = 0
    for k, l in enumerate(lows):
        if l - ref > THRESH:
            a = k * hop; mask[max(0, a - int(sr * 0.01)): a + frame + int(sr * 0.03)] = 1; hits += 1
    # smooth the switch so it never clicks (15 ms ramps)
    ramp = int(sr * 0.015); kern = np.ones(ramp) / ramp
    mask = np.clip(np.convolve(mask, kern, mode="same"), 0, 1)
    y = x * (1 - mask) + h * mask
    sf.write(os.path.join(OUT, name), y.astype(np.float32), sr, subtype="PCM_16")
    print(f"{name}: {hits} burst frames softened")
