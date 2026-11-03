"""UI sounds placed by measured peak on the beat grid, mixed with the original track. Output: 60.000 s loopable WAV."""
import numpy as np, json, sys, wave
from scipy.signal import lfilter
SR = 48000; DUR = 60.0; N = int(SR * DUR)
music = np.load(sys.argv[1]); events = json.load(open(sys.argv[2])); out = sys.argv[3]
rng = np.random.default_rng(3)

def lp(x, fc): a = np.exp(-2*np.pi*fc/SR); return lfilter([1-a], [1, -a], x)
def hp(x, fc): return x - lp(x, fc)
def tt(d): return np.arange(int(d*SR)) / SR

def click():
    t = tt(0.04); x = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t*260) * 0.5 + np.sin(2*np.pi*1800*t) * np.exp(-t*320) * 0.35
    return x
def tick():
    t = tt(0.03); return np.sin(2*np.pi*2600*t) * np.exp(-t*380) * 0.32 + hp(rng.standard_normal(len(t)), 5000) * np.exp(-t*500) * 0.08
def pop():
    t = tt(0.09); f = 520 + 380*np.exp(-t*40); return np.sin(2*np.pi*np.cumsum(f)/SR) * np.minimum(1, t/0.002) * np.exp(-t*45) * 0.38
def toggle():
    t = tt(0.07); f = 700 + 500*(1-np.exp(-t*60)); return np.sin(2*np.pi*np.cumsum(f)/SR) * np.minimum(1, t/0.002) * np.exp(-t*55) * 0.34 + np.pad(click(), (0, len(t)))[:len(t)] * 0.5
def key():
    t = tt(0.035); return lp(hp(rng.standard_normal(len(t)), 1200), 6000) * np.exp(-t*210) * 0.42
def enter():
    t = tt(0.06); return lp(hp(rng.standard_normal(len(t)), 600), 4000) * np.exp(-t*120) * 0.5 + np.sin(2*np.pi*900*t)*np.exp(-t*90)*0.2
def check():
    t = tt(0.32); x = np.zeros(len(t))
    for i, (f, d) in enumerate([(1318.5, 0.0), (1975.5, 0.075)]):
        k = int(d*SR); tk = t[:len(t)-k]; x[k:] += np.sin(2*np.pi*f*tk) * np.minimum(1, tk/0.003) * np.exp(-tk*14) * 0.22
    return x
def swipe():
    t = tt(0.26); n = rng.standard_normal(len(t)); env = np.sin(np.pi*np.clip(t/0.26, 0, 1))**2
    return lp(hp(n, 900), 3200) * env * 0.06
def grab():
    return click() * 0.8
def release():
    t = tt(0.05); return np.sin(2*np.pi*1200*t) * np.exp(-t*160) * 0.25
def drop():
    t = tt(0.16); f = 300 + 500*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*24) * 0.42
def flood():
    t = tt(0.55); n = rng.standard_normal(len(t)); env = (t / 0.55) ** 2 * np.exp(-np.maximum(0, t - 0.45) * 40)
    return lp(hp(n, 400), 2500) * env * 0.10 + np.sin(2*np.pi*(90 + 60*t/0.55)*t) * env * 0.18
SND = dict(flood=flood, click=click, tick=tick, pop=pop, toggle=toggle, key=key, enter=enter, check=check, swipe=swipe, grab=grab, release=release, drop=drop)
GAIN = dict(tick=0.7, swipe=1.0, key=0.9, pop=0.9)

ui = np.zeros(N + SR)
placed = []
for e in events:
    s = SND[e["type"]]()
    env = np.abs(s); pk = int(np.argmax(np.convolve(env, np.ones(48)/48, mode="same")))   # measured peak of the sound
    if e["type"] == "swipe": pk = int(len(s) * 0.5)
    if e["type"] == "flood": pk = 0          # the swell starts with the trigger and blooms with the circle
    i0 = int(round(e["t"] * SR)) - pk
    g = GAIN.get(e["type"], 1.0)
    if i0 < 0: ui[N + i0:N] += 0  # handled by wrap below
    a = max(i0, 0); s2 = s[a - i0:]
    ui[a:a + len(s2)] += s2 * g
    if i0 < 0: ui[N + i0:N] += s[:-i0] * g      # sound starting before 0 belongs to the end of the loop
    placed.append((e["t"], e["type"], round((i0 + pk) / SR - e["t"], 5)))
ui[:SR] += ui[N:N + SR]; ui = ui[:N]                       # wrap tails for a seamless loop
mix = music.copy()
mix[:, 0] += ui * 0.55; mix[:, 1] += ui * 0.55
pk = np.max(np.abs(mix)); mix *= 10 ** (-1.0 / 20) / pk
rms = 20*np.log10(np.sqrt(np.mean(mix**2)))
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"events {len(events)}  max peak alignment error {max(abs(p[2]) for p in placed)*1000:.3f} ms  rms {rms:.1f} dBFS  -> {out}")
