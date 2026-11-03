"""Beat-grid analysis with numpy: onset envelope (spectral flux), tempo by autocorrelation, phase by comb fit."""
import numpy as np, sys, json
SR = 48000
x = np.load(sys.argv[1]).mean(1)
hop = 480  # 10 ms
win = 2048
frames = 1 + (len(x) - win) // hop
w = np.hanning(win)
mag_prev = None; flux = np.zeros(frames)
for i in range(frames):
    seg = x[i * hop:i * hop + win] * w
    m = np.abs(np.fft.rfft(seg))
    freqs = np.fft.rfftfreq(win, 1 / SR)
    m = np.log1p(100 * m[(freqs > 25) & (freqs < 75)])  # kick band carries the beat
    if mag_prev is not None:
        flux[i] = np.maximum(0, m - mag_prev).sum()
    mag_prev = m
flux = (flux - flux.mean()) / (flux.std() + 1e-9)
fps = SR / hop
# tempo: autocorrelation over 60-180 BPM
ac = np.correlate(flux, flux, mode="full")[len(flux) - 1:]
lags = np.arange(len(ac))
bpm_range = (lags > fps * 60 / 180) & (lags < fps * 60 / 60)
best_lag = lags[bpm_range][np.argmax(ac[bpm_range])]
bpm = 60 * fps / best_lag
# refine around 120
cands = np.linspace(110, 130, 2001)
def score(b, ph):
    period = 60 / b * fps
    idx = (ph + np.arange(0, len(flux) / period) * period).astype(int)
    idx = idx[idx < len(flux)]
    return flux[idx].mean()
best = max(((score(b, 0), b) for b in cands))
bpm_ref = best[1]
period = 60 / bpm_ref * fps
phases = np.arange(0, int(period))
ph_scores = [score(bpm_ref, p) for p in phases]
ph = phases[int(np.argmax(ph_scores))]
first_beat = (ph + win / hop / 2) / fps % (60 / bpm_ref)
# downbeat: which beat phase (of 4) has the strongest mean onset (kick + chord changes on bar starts)
beat_idx = (ph + np.arange(0, len(flux) / period) * period).astype(int)
beat_idx = beat_idx[beat_idx < len(flux)]
strength = [flux[beat_idx[k::4]].mean() for k in range(4)]
down = int(np.argmax(strength))
res = dict(bpm_autocorr=round(bpm, 2), bpm=round(bpm_ref, 3), first_beat_s=round(first_beat, 3),
           downbeat_offset_beats=down, beat_strength_by_position=[round(s, 2) for s in strength])
print(json.dumps(res))

# Cross-check: kick-band amplitude peaks, measured directly in the time domain
from scipy.signal import butter, sosfiltfilt, find_peaks
sos = butter(4, [30, 80], btype="band", fs=SR, output="sos")
env = np.abs(sosfiltfilt(sos, x))
env = np.convolve(env, np.ones(240) / 240, mode="same")
pk, _ = find_peaks(env, height=env.max() * 0.35, distance=int(0.3 * SR))
t = pk / SR
offs = ((t + 0.25) % 0.5) - 0.25
print(json.dumps(dict(kick_peaks=len(t), first_peak_s=round(float(t[0]), 4),
      median_offset_from_grid_ms=round(float(np.median(offs)) * 1000, 2),
      spread_ms=round(float(np.std(offs)) * 1000, 2))))
