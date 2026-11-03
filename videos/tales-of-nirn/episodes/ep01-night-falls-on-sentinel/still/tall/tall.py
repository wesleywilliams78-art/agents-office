"""The tall (9:16) still: the 16:9 scene across the middle, the ceiling painted above it and the floor below.
  prep  <key-16x9.png> <canvas.png>               a 1088x1920 canvas: the scene at Y0, stretched edges as rough fills to paint over
  blend <painted.png> <key-16x9.png> <tall.png>   the painted extensions, with the original scene blended back in (feathered seams)
The scene sits at x 0..1088, y Y0..Y0+612 in the tall frame (the moving loop goes in the same place)."""
import sys
import numpy as np
from PIL import Image, ImageFilter

TW, TH = 1088, 1920
SW, SH = 1088, 612          # the 16:9 scene scaled to the tall frame's width
Y0 = 560                    # top of the scene in the tall frame
FEATHER = 48

def scene(key):
    return Image.open(key).convert('RGB').resize((SW, SH), Image.LANCZOS)

if sys.argv[1] == 'prep':
    s = scene(sys.argv[2]); a = np.asarray(s, np.float32)
    top = Image.fromarray(a[:90].astype(np.uint8)).resize((TW, Y0), Image.BICUBIC).filter(ImageFilter.GaussianBlur(14))
    bot = Image.fromarray(a[-110:].astype(np.uint8)).resize((TW, TH - Y0 - SH), Image.BICUBIC).filter(ImageFilter.GaussianBlur(14))
    c = Image.new('RGB', (TW, TH)); c.paste(top, (0, 0)); c.paste(s, (0, Y0)); c.paste(bot, (0, Y0 + SH))
    # darken the fills towards the frame edges: a ceiling in shadow, a floor in shadow
    g = np.asarray(c, np.float32); yy = np.arange(TH)[:, None, None]
    shade = np.where(yy < Y0, 0.35 + 0.65 * (yy / Y0), np.where(yy > Y0 + SH, 0.35 + 0.65 * (1 - (yy - Y0 - SH) / (TH - Y0 - SH)), 1.0))
    Image.fromarray(np.clip(g * shade, 0, 255).astype(np.uint8)).save(sys.argv[3])
elif sys.argv[1] == 'blend':
    p = Image.open(sys.argv[2]).convert('RGB').resize((TW, TH), Image.LANCZOS); s = scene(sys.argv[3])
    out = np.asarray(p, np.float32).copy(); sa = np.asarray(s, np.float32)
    m = np.ones((SH, 1, 1), np.float32); r = np.linspace(0, 1, FEATHER)[:, None, None]
    m[:FEATHER] = r; m[-FEATHER:] = r[::-1]
    out[Y0:Y0 + SH] = sa * m + out[Y0:Y0 + SH] * (1 - m)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).crop((4, 0, 4 + 1080, TH)).save(sys.argv[4])
