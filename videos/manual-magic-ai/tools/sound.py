"""Synthesise the UI sounds, place each by its measured peak, mix them over the track and write a seamless 60 s loop.

usage: python -I sound.py <project dir>
Reads audio/beatgrid.json (track and offset) and audio/sounds.json (events from the composition).
The track's bar before bar 1 is faded in under bar 30, so the end of the file runs straight into its start.
Writes audio/mix.wav (48 kHz stereo, float) and audio/ui-only.wav for checking.
"""
import json, os, subprocess, sys
import numpy as np

SR = 48000
LOOP = 60.0
rng_seed = 7

def decode(path, start, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{start:.4f}', '-t', f'{dur:.4f}', '-i', path,
                          '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

def env(n, a, d):
    """attack a s, exponential decay with time constant d s"""
    t = np.arange(n) / SR
    e = np.exp(-np.maximum(t - a, 0) / d)
    e[t < a] = t[t < a] / a if a > 0 else 1
    return e

def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)

def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def sine_sweep(n, f0, f1):
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / t[-1])
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def make(kind, seed):
    if kind == 'click':
        n = int(.06 * SR)
        x = .55 * bandpass(noise(n, seed), 1500, 7000) * env(n, .0006, .006) + .5 * np.sin(2 * np.pi * 2300 * np.arange(n) / SR) * env(n, .0004, .008)
    elif kind == 'release':
        n = int(.05 * SR)
        x = .35 * bandpass(noise(n, seed), 2500, 9000) * env(n, .0005, .004) + .3 * np.sin(2 * np.pi * 3100 * np.arange(n) / SR) * env(n, .0004, .005)
    elif kind in ('key', 'enter'):
        n = int(.07 * SR); p = 1 + .08 * ((seed % 5) - 2)
        body = 180 * p if kind == 'key' else 120
        x = .45 * bandpass(noise(n, seed), 2000 * p, 9000) * env(n, .0004, .004) + .35 * np.sin(2 * np.pi * body * np.arange(n) / SR) * env(n, .001, .012)
        if kind == 'enter': x *= 1.3
    elif kind == 'check':
        n = int(.22 * SR)
        x = .32 * sine_sweep(n, 880, 1320) * env(n, .006, .06) + .1 * sine_sweep(n, 1760, 2640) * env(n, .006, .04)
    elif kind == 'tick':
        n = int(.05 * SR)
        x = .3 * np.sin(2 * np.pi * 1650 * np.arange(n) / SR) * env(n, .001, .01)
    elif kind == 'drop':
        n = int(.16 * SR)
        x = .6 * sine_sweep(n, 170, 85) * env(n, .002, .045) + .15 * bandpass(noise(n, seed), 800, 4000) * env(n, .0005, .006)
    elif kind in ('sort', 'swoosh'):
        n = int((.13 if kind == 'sort' else .18) * SR)
        e = np.sin(np.pi * np.arange(n) / n) ** 2
        x = .22 * bandpass(noise(n, seed), 1800, 6500) * e
    elif kind == 'write':
        n = int(.28 * SR); t = np.arange(n) / SR
        x = .12 * bandpass(noise(n, seed), 3000, 9000) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t)) * np.sin(np.pi * t / t[-1])
    elif kind == 'toggle':
        n = int(.09 * SR)
        x = .5 * bandpass(noise(n, seed), 1200, 6000) * env(n, .0005, .006) + .45 * np.sin(2 * np.pi * 260 * np.arange(n) / SR) * env(n, .001, .018)
    elif kind == 'morph':
        n = int(.26 * SR); t = np.arange(n) / SR
        e = (t / .1) ** 2 * np.exp(-(t - .1) / .07 * (t > .1)); e = np.minimum(e, 1)
        x = .16 * bandpass(noise(n, seed), 250, 1800) * e
    elif kind == 'logo':
        n = int(1.4 * SR); t = np.arange(n) / SR
        e = np.minimum(t / .25, 1) * np.exp(-np.maximum(t - .25, 0) / .5)
        x = .16 * e * (np.sin(2 * np.pi * 110 * t) + .7 * np.sin(2 * np.pi * 164.8 * t) + .5 * np.sin(2 * np.pi * 220 * t) + .25 * np.sin(2 * np.pi * 329.6 * t))
    else:
        raise ValueError(kind)
    return x

LEVEL = {'click': .9, 'release': .55, 'key': .55, 'enter': .8, 'check': .8, 'tick': .7, 'drop': .8, 'sort': .7, 'swoosh': .6,
         'write': .6, 'toggle': .85, 'morph': .55, 'logo': .9}
LAG = {'morph': .06}   # the whoosh peaks a touch after the morph starts, when the shape moves fastest

def main():
    proj = sys.argv[1]
    grid = json.load(open(os.path.join(proj, 'audio', 'beatgrid.json')))
    events = json.load(open(os.path.join(proj, 'audio', 'sounds.json')))
    src = os.path.join(proj, 'audio', grid['track'] if os.path.exists(os.path.join(proj, 'audio', grid['track'])) else 'track-ace-step-mmvpu9bjlv2x.mp3')
    t0 = grid['track_offset_s']
    N = int(LOOP * SR)
    head = decode(src, t0, LOOP)[:N]
    pre = decode(src, t0 - 2.0, 2.0)[:int(2 * SR)]
    if len(head) < N: head = np.vstack([head, np.zeros((N - len(head), 2))])
    # bar 30 is the track's own tail; the bar before bar 1 rises under it, so t = 60 continues into t = 0
    m = len(pre); r = np.sin(np.linspace(0, np.pi / 2, m))[:, None] ** 2
    head[N - m:] += pre * r

    ui = np.zeros((N, 2))
    for i, ev in enumerate(events):
        x = make(ev['type'], rng_seed + i) * LEVEL[ev['type']] * ev.get('gain', 1)
        pk = int(np.argmax(np.abs(x)))                       # place the sound by its measured peak
        start = int(round((ev['t'] + LAG.get(ev['type'], 0)) * SR)) - pk
        pan = .5 + .12 * np.sin(i * 1.7)                      # a little width, deterministic
        st = np.stack([x * np.sqrt(1 - pan), x * np.sqrt(pan)], 1)
        idx = (start + np.arange(len(x))) % N                 # wrap past the end into the start: the loop is seamless
        np.add.at(ui, idx, st)
    track_gain = 10 ** (-4 / 20)
    mix = head * track_gain + ui * 10 ** (-6 / 20)
    peak = np.abs(mix).max()
    if peak > .98: mix *= .98 / peak
    out = os.path.join(proj, 'audio')
    for name, data in (('mix.wav', mix), ('ui-only.wav', ui * .5)):
        p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', os.path.join(out, name)],
                           input=data.astype(np.float32).tobytes(), capture_output=True)
        if p.returncode: raise SystemExit(p.stderr.decode()[-500:])
    seam = 20 * np.log10((np.sqrt((mix[-int(.05 * SR):] ** 2).mean()) + 1e-9) / (np.sqrt((mix[:int(.05 * SR)] ** 2).mean()) + 1e-9))
    jump = np.abs(mix[0] - mix[-1]).max()
    print(f'{len(events)} sounds placed · peak {peak:.2f} · seam level {seam:+.1f} dB · sample jump at the loop {jump:.4f}')

if __name__ == '__main__':
    main()
