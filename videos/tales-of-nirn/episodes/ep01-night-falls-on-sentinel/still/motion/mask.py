"""The cinemagraph mask: white where the generated motion shows through (fire, smoke, candle flames), black where the still holds.
Regions are soft ellipses in 1920x1080 still coordinates.
  python -I mask.py <out.png> [--debug <key still> <overlay.png>]"""
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = 1920, 1080
REGIONS = [  # (cx, cy, rx, ry, strength, feather px)
    (890, 600, 150, 125, 1.0, 40),   # the hearth fire and embers
    (885, 360, 125, 150, 0.9, 60),   # smoke rising from the hearth
    (793, 765, 26, 48, 1.0, 14),     # the candle flame on the table
    (1524, 612, 18, 30, 1.0, 10),    # a candle on the back table
]

def build():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    m = np.zeros((H, W), np.float32)
    for cx, cy, rx, ry, s, f in REGIONS:   # each region feathered by its own amount, so small flames keep a solid core
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        r = Image.fromarray(((d <= 1) * 255 * s).astype(np.uint8)).filter(ImageFilter.GaussianBlur(f / 2))
        m = np.maximum(m, np.asarray(r, np.float32) / 255)
    return Image.fromarray((m * 255).astype(np.uint8))

if __name__ == '__main__':
    out = sys.argv[1]; m = build(); m.save(out)
    if '--debug' in sys.argv:
        k, o = sys.argv[sys.argv.index('--debug') + 1:][:2]
        base = Image.open(k).convert('RGB'); red = Image.new('RGB', base.size, (255, 0, 0))
        Image.composite(Image.blend(base, red, 0.45), base, m).save(o)
