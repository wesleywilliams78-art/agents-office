"""Episode 2's tall (9:16) still, made without the image model: the scene trimmed at the sides and set low and large,
the night sky carried on above it (each column's own sky colour, deepening towards the zenith, with stars at the density of
the stars already in the picture), and the sand in front falling into shadow below.
  python -I tall.py <key-16x9.png> <out tall.png> <out band-mask.png>
The scene: x CX0..CX1 of the 16:9 still, scaled to 1080 x SH, at y Y0 (the moving loop goes in the same place)."""
import sys
import numpy as np
from PIL import Image, ImageFilter

KEY, OUT, MASK = sys.argv[1:4]
TW, TH = 1080, 1920
CX0, CX1 = 240, 1680                       # keeps the arch, the ruins, the fire, the reader and the tent's front
SW, SH = 1080, 810
Y0 = 960                                   # top of the scene: the sky above, 150 px of shaded sand below
FEATHER = 70

k = Image.open(KEY).convert('RGB').crop((CX0, 0, CX1, 1080)).resize((SW, SH), Image.LANCZOS)
s = np.asarray(k, np.float32)
out = np.zeros((TH, TW, 3), np.float32)

# the sky: each column's colour from the top of the scene, darker and a touch bluer towards the zenith
sky_rows = s[4:40].copy(); lum = sky_rows.mean(2)
top = np.array([np.median(sky_rows[:, x][lum[:, x] < np.percentile(lum[:, x], 60)], axis=0) for x in range(TW)])   # ignore the moon's glow
pad = 300; tp = np.pad(top, ((pad, pad), (0, 0)), mode='edge')
top = np.stack([np.convolve(tp[:, c], np.ones(2 * pad + 1) / (2 * pad + 1), 'valid') for c in range(3)], 1)       # one smooth sky, no streaks
t = (np.arange(Y0 + FEATHER) / (Y0 + FEATHER))[:, None, None]               # 0 at the very top, 1 at the scene
zenith = top[None] * np.array([0.42, 0.48, 0.62])
out[:Y0 + FEATHER] = zenith * (1 - t ** 0.8) + top[None] * t ** 0.8

# stars at the picture's own density: count the bright points in the scene's sky
sky = s[:300]; lum = sky.mean(2); base = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.MedianFilter(7)), np.float32)
density = ((lum - base) > 40).sum() / sky[..., 0].size
rng = np.random.default_rng(11); n = int(density * TW * Y0 * 0.9)
star = np.zeros((TH, TW), np.float32)
ys = rng.integers(0, Y0, n); xs = rng.integers(0, TW, n); br = rng.pareto(2.2, n) * 55 + 25
np.add.at(star, (ys, xs), np.clip(br, 0, 230))
star = np.asarray(Image.fromarray(np.clip(star, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), np.float32) * 1.8
out += star[..., None] * np.array([0.92, 0.95, 1.0])

# the scene, blended in at its top edge
m = np.ones((SH, 1, 1), np.float32); m[:FEATHER] = np.linspace(0, 1, FEATHER)[:, None, None]
out[Y0:Y0 + SH] = s * m + out[Y0:Y0 + SH] * (1 - m)
# the sand in front, carried on a little and falling into shadow
h = TH - Y0 - SH
band = np.asarray(Image.fromarray(s[-12:].astype(np.uint8)).resize((TW, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6)), np.float32)
out[Y0 + SH:] = band * ((1 - np.linspace(0, 1, h)) ** 2.0 * 0.65)[:, None, None]

Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT)
mk = np.ones((SH, TW), np.float32); mk[:FEATHER] = np.linspace(0, 1, FEATHER)[:, None]
Image.fromarray((mk * 255).astype(np.uint8)).save(MASK)
print(f'tall still {OUT}: scene at y {Y0}, {n} stars (density {density:.5f})')
