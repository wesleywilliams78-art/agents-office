"""The En Route Sweden score: an original 120 BPM travel cue composed in code (ours to use), plus every on-screen sound,
each placed so its measured peak lands on the frame it belongs to. 30 bars of 4/4 = 60.000 s.
Run: python -I score.py audio.wav   (numpy only; ./scipy is a one-pole lfilter stand-in)."""
import sys, pathlib, wave
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np
from scipy.signal import lfilter

SR = 48000; BPM = 120.0; BEAT = 60 / BPM; BAR = 4 * BEAT; NB = 30; DUR = NB * BAR; N = int((DUR + 3) * SR)
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)
def tt(d): return np.arange(int(d * SR)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def lp(x, fc): a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)
def hp(x, fc): return x - lp(x, fc)
def add(sig, t0, g=1.0, pan=0.0, at_peak=False):
    i0 = int(round(t0 * SR))
    if at_peak:   # place by the sound's measured peak, not its start
        env = np.convolve(np.abs(sig), np.ones(48) / 48, mode='same'); i0 -= int(np.argmax(env))
    a = max(i0, 0); s = sig[a - i0:]; s = s[: max(0, N - a)]
    l = g * np.cos((pan + 1) * np.pi / 4) * 1.4142; r = g * np.sin((pan + 1) * np.pi / 4) * 1.4142
    L[a:a + len(s)] += s * l; R[a:a + len(s)] += s * r

# ---------- instruments ----------
def kick():
    t = tt(.45); f = 44 + 110 * np.exp(-t * 30); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5) + np.exp(-t * 800) * .3) * .95
def snare():
    t = tt(.28); n = lp(hp(rng.standard_normal(len(t)), 1200), 7000) * np.exp(-t * 22) * .32
    return n + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .25
def hat(o=False):
    t = tt(.18 if o else .05); return hp(rng.standard_normal(len(t)), 8000) * np.exp(-t * (24 if o else 90)) * .14
def shaker():
    t = tt(.09); return lp(hp(rng.standard_normal(len(t)), 5000), 11000) * np.sin(np.pi * np.clip(t / .09, 0, 1)) ** 2 * .05
def bass(n, d):
    t = tt(d); f = midi(n); x = np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) + .08 * np.sin(2 * np.pi * 3 * f * t)
    return np.tanh(1.8 * x * np.minimum(1, t / .005) * np.exp(-t * 2.4)) * .4
def pluck(n, d=.42):
    t = tt(d); f = midi(n); x = sum(np.sin(2 * np.pi * f * h * t) / h ** 1.3 for h in (1, 2, 3, 4)) * (1 + .002 * np.sin(2 * np.pi * 5 * t))
    return lp(x, 4200) * np.minimum(1, t / .002) * np.exp(-t * 7) * .11
def pad(notes, d, bright=1500):
    t = tt(d); x = np.zeros(len(t))
    for nt in notes:
        for det in (-.07, 0, .07):
            f = midi(nt + det)
            for h in range(1, 6): x += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.3)) / h ** 1.7
    env = np.minimum(1, t / .6) * np.minimum(1, np.maximum(0, (d - t) / 1.0)); return lp(x, bright) * env * .018
def riser(d):
    t = tt(d); n = hp(rng.standard_normal(len(t)), 1500); k = (t / d) ** 2.4
    return (lp(n, 1500) * (1 - k) + lp(n, 10500) * k) * k * .09 + np.sin(2 * np.pi * np.cumsum(220 + 660 * k) / SR) * k * .025
def boom():
    t = tt(2.2); f = 38 + 50 * np.exp(-t * 9); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * .9
    return x + lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 6) * .25

# D major travel cue: Dmaj9 | A6 | Bm9 | Gmaj7#11, one chord per bar
CH = [(38, [62, 66, 69, 73, 76]), (45, [61, 64, 66, 69, 73]), (47, [62, 66, 69, 73, 74]), (43, [62, 66, 67, 71, 73])]
def sec(b):
    if b < 3: return 'intro'
    if b < 23: return 'drive'
    if b < 27: return 'verdict'
    return 'close'
for b in range(NB):
    t0 = b * BAR; root, notes = CH[b % 4]; s = sec(b)
    add(pad(notes, BAR + 1.2, 2400 if s == 'drive' and (8 <= b < 13 or 18 <= b < 23) else 1500), t0, 1.0 if s != 'verdict' else 1.25)
    arp = [notes[0] + 12, notes[2] + 12, notes[4], notes[1] + 12, notes[3] + 12, notes[2] + 12, notes[4], notes[1] + 12]
    for k in range(8):
        if s == 'verdict' and k % 2: continue
        add(pluck(arp[k]), t0 + k * BEAT / 2, (.9 if k % 2 == 0 else .62) * (.75 if s == 'intro' else 1), .38 if k % 2 else -.38)
    for k in range(4):
        tb = t0 + k * BEAT
        if s == 'drive' or (s == 'close' and b < 29):
            add(kick(), tb)
            if k in (1, 3): add(snare(), tb, .85, .05)
            add(hat(), tb + BEAT / 2, 1, .25); add(shaker(), tb + BEAT * .25, 1, -.3); add(shaker(), tb + BEAT * .75, .8, -.3)
            add(bass(root, BEAT * .42), tb + BEAT / 2)
            if k == 0: add(bass(root, BEAT * .4), tb, .8)
        elif s == 'verdict':
            if k == 0: add(bass(root, BAR * .9), tb, .55)
        elif s == 'intro' and b == 2:
            add(hat(), tb + BEAT / 2, .7, .25)
    if s == 'drive' and b % 4 == 3: add(hat(True), t0 + 3.5 * BEAT, .9, .3)
# swells into each change: the title shrink, the four tides, the end card
for tl, d in ((6, 1.6), (16, .85), (26, .85), (36, .85), (46, 1.0), (54, 1.0)): add(riser(d), tl - d, 1.0)
for tl in (6, 16, 26, 36, 54): add(boom(), tl, .7)
add(boom(), 46, .45)

# sidechain on the kicks
env = np.ones(N)
for b in range(NB):
    if not (sec(b) == 'drive' or (sec(b) == 'close' and b < 29)): continue
    for k in range(4):
        i0 = int((b * BAR + k * BEAT) * SR); n = int(.26 * SR); d = 1 - .4 * np.exp(-tt(.26) * 14); env[i0:i0 + n] = np.minimum(env[i0:i0 + n], d[:max(0, min(n, N - i0))])
L *= env; R *= env

# ---------- on-screen sounds, placed by peak ----------
def tick(): t = tt(.03); return np.sin(2 * np.pi * 2500 * t) * np.exp(-t * 380) * .3 + hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 500) * .07
def pop(): t = tt(.09); f = 500 + 400 * np.exp(-t * 40); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / .002) * np.exp(-t * 45) * .36
def shutter():   # a film-gate click: two mechanical clicks 22 ms apart
    t = tt(.08); x = np.zeros(len(t))
    for d, g in ((0, 1), (.022, .7)):
        k = int(d * SR); tk = t[:len(t) - k]; x[k:] += (hp(rng.standard_normal(len(tk)), 2000) * np.exp(-tk * 300) * .45 + np.sin(2 * np.pi * 1400 * tk) * np.exp(-tk * 260) * .2) * g
    return x
def swipe(): t = tt(.3); return lp(hp(rng.standard_normal(len(t)), 800), 3500) * np.sin(np.pi * np.clip(t / .3, 0, 1)) ** 2 * .08
def thud():      # a rubber stamp on paper: low body, papery slap
    t = tt(.35); f = 70 + 120 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * .8 + lp(hp(rng.standard_normal(len(t)), 300), 3000) * np.exp(-t * 60) * .45
def pen(d=.8):   # nib on paper: filtered scratch with stroke rhythm
    t = tt(d); n = lp(hp(rng.standard_normal(len(t)), 2500), 7000); strokes = .5 + .5 * np.sin(2 * np.pi * 7.5 * t) ** 2
    return n * strokes * np.minimum(1, t / .03) * np.minimum(1, (d - t) / .15) * .05
def whoosh(d=1.0):
    t = tt(d); n = rng.standard_normal(len(t)); k = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return (lp(hp(n, 300), 900) * (1 - t / d) + lp(hp(n, 300), 4100) * (t / d)) * k * .12

ev = []
def e(t, s, g=1.0, peak=True): ev.append((t, s, g, peak))
e(4.5, swipe, .9); e(6.0, shutter); e(6.15, tick, .6); e(6.4, pop); e(6.5, lambda: pen(.8), 1, False); e(6.9, tick, .5)
e(10.5, swipe, .7); e(11.0, shutter); e(11.0, pop, .9); e(11.4, tick, .5); e(11.8, tick, .6); e(12.05, tick, .6)
for tl in (16, 26, 36, 46): e(tl - .85, lambda: whoosh(.9), 1, False)
e(16.05, pop); e(16.5, pop); e(17.0, pop, .8); e(17.2, lambda: pen(.8), 1, False); e(18.2, tick, .5); e(20.0, tick, .5)
e(26.05, pop); e(26.5, pop); e(27.0, tick, .5); e(27.6, tick, .6); e(27.9, tick, .6); e(30.5, swipe, .7); e(31.0, shutter)
e(31.5, thud); e(32.3, tick, .5); e(33.0, tick, .5)
e(36.05, pop); e(36.5, tick, .5); e(36.6, lambda: pen(.7), 1, False); e(37.2, tick, .5); e(38.0, thud); e(40.5, swipe, .7); e(41.0, shutter); e(42.4, pop, .8)
e(46.6, lambda: pen(1.0), 1, False); e(47.4, tick, .35); e(48.6, tick, .35); e(50.4, tick, .4)
e(53.3, swipe, .8)
for i in range(6): e(54.55 + i * .07 + .18, tick, .45)
e(55.6, tick, .4); e(56.4, pop, .7)
ui = np.zeros(N)
for t0, s, g, peak in ev:
    sig = s(); i0 = int(round(t0 * SR))
    if peak: i0 -= int(np.argmax(np.convolve(np.abs(sig), np.ones(48) / 48, mode='same')))
    a = max(i0, 0); seg = sig[a - i0:][: N - a]; ui[a:a + len(seg)] += seg * g

n60 = int(DUR * SR)
mix = np.stack([L[:n60] + ui[:n60] * .6, R[:n60] + ui[:n60] * .6], 1)
fade = np.minimum(1, (DUR - np.arange(n60) / SR) / 1.6)[:, None]; mix *= fade      # ring out over the last bar
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
rms = np.sqrt(np.mean(mix ** 2)); k = 10 ** (-15 / 20) / rms; mix *= k
pk = np.max(np.abs(mix)); k *= min(1, 10 ** (-1 / 20) / pk); mix *= min(1, 10 ** (-1 / 20) / pk)
if len(sys.argv) > 2:   # effects only, at the level they sit in the full mix: the bed for a licensed track laid over in Canva
    fx = np.stack([ui[:n60] * .6, ui[:n60] * .6], 1) * k * fade
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(fx, -1, 1) * 32767).astype(np.int16).tobytes())
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{len(ev)} sounds placed, rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS')
