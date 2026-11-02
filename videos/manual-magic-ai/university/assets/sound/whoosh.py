# The opening whoosh for Manual Magic University: filtered noise that swells over the title card, sweeping low to bright,
# peaks exactly on the cut into the platform (PEAK seconds into the file), then lands on a soft low thump and tails off.
# Synthesised, no samples. Usage: python whoosh.py out.wav   (edit.mjs places it so PEAK lands on the cut)
import sys, wave
import numpy as np

SR, LEN, PEAK = 48000, 2.6, 1.9
rng = np.random.default_rng(7)
t = np.arange(int(SR * LEN)) / SR

def bandpass(x, fc, q):
    """State-variable band-pass with a moving centre frequency (one value per sample)."""
    out = np.empty_like(x); low = band = 0.0
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    for i in range(len(x)):
        high = x[i] - low - q * band
        band += f[i] * high; low += f[i] * band
        out[i] = band
    return out

# centre sweeps 220 Hz → 5.2 kHz up to the peak (exponential, so it reads as speed), then eases back to 1.6 kHz
rise = np.clip(t / PEAK, 0, 1)
fc = np.where(t <= PEAK, 220 * (5200 / 220) ** (rise ** 1.4), 5200 * np.exp(-(t - PEAK) / 0.35) + 1600 * (1 - np.exp(-(t - PEAK) / 0.35)))
env = np.where(t <= PEAK, rise ** 2.6, np.exp(-(t - PEAK) / 0.16))

left = bandpass(rng.standard_normal(len(t)), fc, 1.1)
right = bandpass(rng.standard_normal(len(t)), fc * 1.04, 1.1)
air = np.diff(rng.standard_normal(len(t) + 1)) * 0.08            # a little hiss on top, rising with the sweep
pan = np.clip(0.25 + 0.75 * rise, 0, 1)                        # drifts from the left into the centre as it arrives
L = (left * (1.25 - 0.25 * pan) + air) * env
R = (right * (0.75 + 0.25 * pan) + air) * env

# the landing: a soft sub thump (58 → 42 Hz) right on the cut, felt more than heard
tt = np.clip(t - PEAK, 0, None)
thump = np.where(t >= PEAK, np.sin(2 * np.pi * (58 * tt - 8 * tt ** 2)) * np.exp(-tt / 0.22) * (1 - np.exp(-tt / 0.004)), 0) * 0.55
L += thump; R += thump

stereo = np.stack([L, R], axis=1)
fade = np.clip((LEN - t) / 0.12, 0, 1)[:, None]                 # no click at the end
stereo = stereo * fade
stereo *= 10 ** (-3 / 20) / np.abs(stereo).max()                # peak at -3 dBFS
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'whoosh.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype('<i2').tobytes())
print(f'whoosh: {LEN} s, peak on the cut at {PEAK} s')
