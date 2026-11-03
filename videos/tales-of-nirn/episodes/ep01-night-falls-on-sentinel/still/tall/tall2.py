"""The tall (9:16) still, take 2: the scene is trimmed at the sides and sits low and large, so the table keeps its true size.
Only the ceiling is painted (above); below the scene the near edge of the table simply falls into shadow.
  prep  <key-16x9.png> <ceiling-guide.png> <canvas.png>   ceiling-guide: an earlier painted tall frame whose top we reuse as a guide
  blend <painted.png> <key-16x9.png> <tall.png>
The scene: x 0..1440 of the 16:9 still, scaled to 1088x816, placed at y Y0 (the moving loop goes in the same place)."""
import sys
import numpy as np
from PIL import Image, ImageFilter

TW, TH = 1088, 1920
CX0, CX1 = 0, 1440              # the crop of the 16:9 still (keeps the window, Jomic, Haballa)
SW, SH = 1088, 816
Y0 = 954                        # top of the scene; 150 px of shadowed table below it
FEATHER = 56

def scene(key):
    return Image.open(key).convert('RGB').crop((CX0, 0, CX1, 1080)).resize((SW, SH), Image.LANCZOS)

def below(s):
    """The near edge of the table, carried on a little and falling into shadow."""
    a = np.asarray(s, np.float32); h = TH - Y0 - SH
    band = np.asarray(Image.fromarray(a[-10:].astype(np.uint8)).resize((TW, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6)), np.float32)
    fade = (1 - np.linspace(0, 1, h)) ** 2.2 * 0.6
    fade = fade[:, None, None]
    return band * fade

if sys.argv[1] == 'prep':
    s = scene(sys.argv[2]); g = Image.open(sys.argv[3]).convert('RGB').resize((TW, TH), Image.LANCZOS)
    c = np.zeros((TH, TW, 3), np.float32)
    top = np.asarray(g, np.float32)[:560]                                  # the earlier ceiling, as the lower part of the new one
    c[Y0 - 560:Y0] = top
    ext = np.asarray(Image.fromarray(top[:120].astype(np.uint8)).resize((TW, Y0 - 560), Image.BICUBIC).filter(ImageFilter.GaussianBlur(10)), np.float32)
    c[:Y0 - 560] = ext * np.linspace(0.45, 1, Y0 - 560)[:, None, None]      # rough beams above it, darker towards the top
    c[Y0:Y0 + SH] = np.asarray(s, np.float32); c[Y0 + SH:] = below(s)
    Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).save(sys.argv[4])
elif sys.argv[1] == 'blend':
    p = np.asarray(Image.open(sys.argv[2]).convert('RGB').resize((TW, TH), Image.LANCZOS), np.float32).copy()
    s = scene(sys.argv[3]); sa = np.asarray(s, np.float32)
    m = np.ones((SH, 1, 1), np.float32); m[:FEATHER] = np.linspace(0, 1, FEATHER)[:, None, None]
    p[Y0:Y0 + SH] = sa * m + p[Y0:Y0 + SH] * (1 - m)
    p[Y0 + SH:] = below(s)
    Image.fromarray(np.clip(p, 0, 255).astype(np.uint8)).crop((4, 0, 4 + 1080, TH)).save(sys.argv[4])
