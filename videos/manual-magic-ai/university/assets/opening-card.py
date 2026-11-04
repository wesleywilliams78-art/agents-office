# The opening card, full bleed (Wesley, 4 Nov 2026). Penny's artwork (opening-card-source.png, 960x540 as supplied) is a 960x360
# banner sitting on a flat navy card, so the banner's edges show as lines. This continues the banner's own blue up to the top of the
# frame and down to the bottom, without moving or rescaling anything in it, then lays the bottom line ("Manual Magic AI University —
# Operational Insurance™ for the AI Age") back over the new blue exactly where it was. Output 1920x1080 for opener.mjs.
# Usage: python -I assets/opening-card.py   (from the university folder)
import sys
import numpy as np
from PIL import Image

SRC, OUT = 'assets/opening-card-source.png', 'assets/opening-card.png'
TOP, BOT = 90, 450                       # the banner's rows in the source (measured: flat #042549 above and below)
CARD = np.array([4, 37, 73], float)      # the card's flat navy, behind the bottom line
FEATHER, DARKEN = 8, 0.16                # rows blended at each seam; how much darker the frame's top and bottom edges get

a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
H, W, _ = a.shape

def smooth_x(row, sigma=14):
    k = np.exp(-0.5 * (np.arange(-3 * sigma, 3 * sigma + 1) / sigma) ** 2); k /= k.sum()
    pad = np.pad(row, ((3 * sigma, 3 * sigma), (0, 0)), mode='edge')
    return np.stack([np.convolve(pad[:, c], k, 'valid') for c in range(3)], 1)

# the banner's background along each edge: a per-column median of its first and last few rows, smoothed sideways
top_edge = smooth_x(np.median(a[TOP:TOP + 8], axis=0))
bot_edge = smooth_x(np.median(a[BOT - 8:BOT], axis=0))

out = a.copy()
rng = np.random.default_rng(4)
for y in range(H):
    if y < TOP:   d = (TOP - y) / TOP;            out[y] = top_edge * (1 - DARKEN * d ** 1.6)
    elif y >= BOT: d = (y - BOT + 1) / (H - BOT); out[y] = bot_edge * (1 - DARKEN * d ** 1.6)
    else: continue
    out[y] += rng.normal(0, 0.8, (W, 3))       # the banner's own grain (measured 0.77), so the extension doesn't band
# the seams: the banner's first and last rows fade from the edge colour into the picture, so no line is left
for i in range(FEATHER):
    w = (i + 1) / (FEATHER + 1)
    out[TOP + i] = w * a[TOP + i] + (1 - w) * top_edge
    out[BOT - 1 - i] = w * a[BOT - 1 - i] + (1 - w) * bot_edge

# the bottom line: its coverage from the red channel (the card is red 4, the type is white and orange), then moved onto the new blue.
# c' = c + (1 - coverage) * (new - old), so the letters keep Penny's exact rendering and only the ground under them changes.
strip = a[BOT:]
cov = np.clip((strip[..., 0] - CARD[0]) / (240 - CARD[0]), 0, 1)[..., None]
out[BOT:] = strip + (1 - cov) * (out[BOT:] - CARD)

img = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
img.resize((1920, 1080), Image.LANCZOS).save(OUT)
print(f'{OUT}: 1920x1080, banner rows {TOP}-{BOT - 1} untouched, blue continued to the edges, bottom line kept')
