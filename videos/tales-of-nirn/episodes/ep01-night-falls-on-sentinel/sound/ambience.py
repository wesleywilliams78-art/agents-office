"""The tavern bed, all synthesised: a hearth fire leads (low roar, crackle, the odd log snap), and now and then a quiet
sign of the room (a tankard set down, a coin, a stool scraping the flagstones). No music.
  python -I ambience.py <out.wav> <seconds> [--seed 7] [--crackle-only]
--crackle-only (Wesley, 2 Nov): just the crackle of the fire. No roar or hiss (they read as wind), no room sounds."""
import sys, wave
import numpy as np

SR = 48000
out, secs = sys.argv[1], float(sys.argv[2])
seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 7
rng = np.random.default_rng(seed)
CRACKLE = '--crackle-only' in sys.argv
N = int(SR * secs)

def lowpass(x, fc):      # one-pole
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y

def fft_filter(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def slow(n, rate, depth):   # a slow random swell, 0..1 around 1
    k = max(4, int(n / SR * rate)); pts = rng.normal(0, 1, k + 3)
    env = np.interp(np.linspace(0, k, n), np.arange(k + 3), np.convolve(pts, np.ones(3) / 3, 'same'))
    return 1 + depth * env / (np.abs(env).max() + 1e-9)

L = np.zeros(N); R = np.zeros(N)

# 1. the roar: brown-ish noise, band-limited, breathing slowly
chunk = SR * 30
for a in (range(0, N, chunk) if not CRACKLE else []):
    n = min(chunk, N - a)
    w = rng.normal(0, 1, n + SR); b = np.cumsum(w); b -= np.convolve(b, np.ones(2400) / 2400, 'same')
    roar = fft_filter(b, 40, 900)[:n]; roar /= np.abs(roar).max() + 1e-9
    hiss = fft_filter(rng.normal(0, 1, n), 2500, 9000); hiss /= np.abs(hiss).max() + 1e-9
    sw = slow(n, 0.35, 0.35)
    L[a:a + n] += 0.16 * roar * sw + 0.012 * hiss * slow(n, 0.8, 0.6)
    R[a:a + n] += 0.16 * np.roll(roar, 900) * sw + 0.012 * np.roll(hiss, 1700) * slow(n, 0.8, 0.6)

# 2. crackle: short noise bursts, bright and tiny, a few a second, in clusters
def burst(ms, lo, hi, amp):
    n = max(16, int(SR * ms / 1000)); x = fft_filter(rng.normal(0, 1, n * 4), lo, hi)[:n]
    env = np.exp(-np.linspace(0, 7, n)); env[:max(2, n // 40)] *= np.linspace(0, 1, max(2, n // 40))
    return amp * x / (np.abs(x).max() + 1e-9) * env
t = 0.0
while t < secs - 1:
    t += rng.exponential(1 / 5.5) * (0.4 if rng.random() < 0.25 else 1.0)
    i = int(t * SR); big = rng.random() < 0.04
    b = burst(rng.uniform(25, 70) if big else rng.uniform(2, 14), 300 if big else 1200, 5000 if big else 9000,
              (rng.uniform(0.10, 0.20) if big else rng.lognormal(-3.3, 0.6)))
    p = rng.uniform(0.25, 0.75); j = min(N, i + len(b))
    L[i:j] += b[:j - i] * (1 - p) * 2; R[i:j] += b[:j - i] * p * 2

# 3. the room, rarely: a tankard down, a coin, a stool scrape, a distant thud
def tankard():
    n = int(SR * 0.9); tt = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, a, d in ((1180, 0.5, 9), (2310, 0.35, 12), (3570, 0.2, 16)))
    thud = fft_filter(rng.normal(0, 1, n), 60, 400) * np.exp(-tt * 40) * 2
    return 0.05 * (x + thud) / 2
def coin():
    n = int(SR * 0.6); tt = np.arange(n) / SR
    return 0.025 * sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14) for f in (4120, 6890, 9350)) / 3
def scrape():
    n = int(SR * rng.uniform(0.4, 0.8)); x = fft_filter(rng.normal(0, 1, n), 200, 1600)
    am = np.abs(np.sin(np.linspace(0, np.pi * rng.uniform(8, 14), n))) ** 2 * np.sin(np.linspace(0, np.pi, n))
    return 0.03 * x / (np.abs(x).max() + 1e-9) * am
def thud():
    n = int(SR * 0.5); tt = np.arange(n) / SR
    return 0.04 * fft_filter(rng.normal(0, 1, n), 40, 220) / 0.3 * np.exp(-tt * 18) * 0.3
t = rng.uniform(14, 24)
while t < secs - 2 and not CRACKLE:
    s = rng.choice([tankard, coin, scrape, thud], p=[0.35, 0.2, 0.25, 0.2])(); i = int(t * SR); j = min(N, i + len(s))
    s = lowpass(s, 2800)                                    # across the room: duller
    p = rng.uniform(0.15, 0.85); L[i:j] += s[:j - i] * (1 - p) * 2; R[i:j] += s[:j - i] * p * 2
    t += rng.uniform(22, 55)

# a short cellar room: a few early reflections
for d_ms, g in ((17, 0.22), (29, 0.16), (43, 0.11), (71, 0.07)):
    d = int(SR * d_ms / 1000); L[d:] += g * R[:-d]; R[d:] += g * L[:-d] * 0.9

st = np.stack([L, R], 1); st /= np.abs(st).max() + 1e-9; st *= 0.7
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print(f'wrote {out}: {secs:.0f}s')
