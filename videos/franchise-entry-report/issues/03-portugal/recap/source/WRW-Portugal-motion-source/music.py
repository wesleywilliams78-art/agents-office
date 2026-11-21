"""Original 120 BPM loop for the Norway motion video (composed in code, so it is ours to use).
30 bars of 4/4 = exactly 60.000 s. Tails past 60 s are wrapped to the start so the loop is seamless.
"""
import numpy as np, wave, sys

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
NBARS = 30
DUR = NBARS * BAR            # 60.0
PAD = 3.0                    # render tail, wrapped later
N = int((DUR + PAD) * SR)
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def add(sig, t0, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N: return
    seg = sig[: N - i0]
    l = gain * np.cos((pan + 1) * np.pi / 4); r = gain * np.sin((pan + 1) * np.pi / 4)
    L[i0:i0 + len(seg)] += seg * l * 1.4142
    R[i0:i0 + len(seg)] += seg * r * 1.4142

from scipy.signal import lfilter
def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)

def hp(x, fc):
    return x - onepole_lp(x, fc)

# ---------- instruments ----------
def kick():
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t * 7.5)
    click = np.exp(-t * 900) * 0.35
    return (np.sin(ph) * env + click) * 0.95

def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = hp(noise, 900); noise = onepole_lp(noise, 5200)
    env = np.zeros(n)
    for k, d in enumerate([0.0, 0.011, 0.022]):
        i = int(d * SR); env[i:] += np.exp(-(t[: n - i]) * (180 if k < 2 else 26)) * (0.7 if k < 2 else 1.0)
    return noise * env * 0.30

_hat_noise = hp(rng.standard_normal(int(0.08 * SR)), 7000)
def hat(open_=False):
    n = int((0.16 if open_ else 0.05) * SR); t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7500)
    return x * np.exp(-t * (28 if open_ else 95)) * 0.16

def bass(note, length):
    n = int(length * SR); t = np.arange(n) / SR
    f = midi(note)
    x = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 3.2)
    return np.tanh(1.6 * x * env) * 0.42

def pluck(note, length=0.32):
    n = int(length * SR); t = np.arange(n) / SR
    f = midi(note)
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t))
    env = np.minimum(1, t / 0.003) * np.exp(-t * 11)
    return x * env * 0.13

def pad(notes, length):
    n = int(length * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for nt in notes:
        for det in (-0.08, 0.0, 0.08):
            f = midi(nt + det)
            for h in range(1, 7):
                x += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) / (h ** 1.6)
    att, rel = 0.45, 0.9
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (length - t) / rel))
    x = onepole_lp(x, 1500)
    return x * env * 0.020

# ---------- harmony: Am9 | Fmaj7 | Cmaj7 | G6, two bars each ----------
CHORDS = [
    (45, [57, 60, 64, 67, 71]),   # A minor 9 (A C E G B)
    (41, [57, 60, 64, 65, 69]),   # F major 7 (F A C E) voiced around A3
    (48, [55, 59, 60, 64, 67]),   # C major 7
    (43, [55, 59, 62, 64, 67]),   # G6 (G B D E)
]
def chord_for_bar(b): return CHORDS[(b // 2) % 4]

# arrangement flags per bar (0-based bar index)
def sec(b):
    if b in (0, 1): return "hook"
    if b in (24, 25, 26): return "verdict"
    if b == 14: return "build"
    if b == 29: return "tail"
    return "full"

for b in range(NBARS):
    t0 = b * BAR; root, notes = chord_for_bar(b); s = sec(b)
    if b % 2 == 0:
        add(pad(notes, 2 * BAR + 0.9), t0, 1.0, 0.0)
    for k in range(4):
        tb = t0 + k * BEAT
        if s in ("full",):
            add(kick(), tb, 1.0)
        if s in ("full", "build") and k in (1, 3):
            add(clap(), tb, 0.9, 0.05)
        if s != "verdict":
            add(hat(), tb + BEAT / 2, 1.0, 0.25)
        if s in ("full", "build"):
            add(hat(), tb + BEAT * 0.25, 0.45, -0.2)
            add(hat(), tb + BEAT * 0.75, 0.45, -0.2)
        if s in ("full", "verdict", "build"):
            add(bass(root, BEAT * 0.45), tb + BEAT / 2, 1.0)
    if s == "full" and b % 4 == 3:
        add(hat(True), t0 + 3.5 * BEAT, 0.9, 0.3)
    # pluck arpeggio on hook, chart and CTA sections
    if s in ("hook", "tail") or 15 <= b <= 23 or b in (27, 28):
        arp = [notes[0] + 12, notes[2] + 12, notes[1] + 12, notes[3] + 12]
        for k in range(8):
            add(pluck(arp[k % 4]), t0 + k * BEAT / 2, 0.9 if k % 2 == 0 else 0.6, 0.35 if k % 2 else -0.35)
    if s == "build":
        n = int(BAR * SR); tt = np.arange(n) / SR
        rise = hp(rng.standard_normal(n), 3000) * (tt / BAR) ** 2 * 0.06
        add(rise, t0, 1.0)

# sidechain ducking on kick beats (bars that have a kick)
env = np.ones(N)
for b in range(NBARS):
    if sec(b) != "full": continue
    for k in range(4):
        i0 = int((b * BAR + k * BEAT) * SR); n = int(0.28 * SR); tt = np.arange(n) / SR
        d = 1 - 0.45 * np.exp(-tt * 14)
        env[i0:i0 + n] = np.minimum(env[i0:i0 + n], d[: max(0, min(n, N - i0))])
# apply ducking to everything (kick is short and loud, so the effect lands on pad/bass tails)
L *= env; R *= env

# wrap tail into the head for a seamless loop
n60 = int(DUR * SR)
L[: N - n60] += L[n60:]; R[: N - n60] += R[n60:]
L = L[:n60]; R = R[:n60]

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
rms = np.sqrt(np.mean(mix ** 2)); target = 10 ** (-17 / 20)
mix *= target / rms
pk = np.max(np.abs(mix))
if pk > 10 ** (-1.5 / 20): mix *= 10 ** (-1.5 / 20) / pk
np.save(sys.argv[1] if len(sys.argv) > 1 else "music.npy", mix.astype(np.float32))
print("music", mix.shape, "rms dBFS", 20 * np.log10(np.sqrt(np.mean(mix ** 2))), "peak", 20 * np.log10(np.max(np.abs(mix))))
