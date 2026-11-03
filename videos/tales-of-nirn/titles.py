"""Tales of Nirn type: the book's name in tracked condensed capitals, a hairline rule that fades out at its ends, and
TALES OF NIRN smaller beneath it, in the manner of Skyrim's menus (Futura Condensed there; Tw Cen MT Condensed here, the
nearest face installed). Writes transparent PNG overlays for ffmpeg.
  python -I titles.py <out dir> "<Book Title>" [--size 1920x1080]"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT, BOOK = sys.argv[1], sys.argv[2]
W, H = map(int, (sys.argv[sys.argv.index('--size') + 1] if '--size' in sys.argv else '1920x1080').split('x'))
FACE = r'C:\Windows\Fonts\TCCM____.TTF'
INK = (237, 230, 214)
os.makedirs(OUT, exist_ok=True)

def tracked(draw, xy, text, font, track, fill, anchor_left=True):
    """Draw capitals with letter-spacing `track` (fraction of the font size). Returns the drawn width."""
    x, y = xy; sp = font.size * track
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + sp * (len(text) - 1)
    if not anchor_left: x -= total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill); x += w + sp
    return total

def rule(draw, x0, x1, y, fill, fade_left=True, fade_right=True, thick=1):
    n = int(x1 - x0)
    for i in range(n):
        t = i / max(1, n - 1); a = 1.0
        if fade_left: a = min(a, t / 0.18)
        if fade_right: a = min(a, (1 - t) / 0.18)
        draw.line([(x0 + i, y), (x0 + i, y + thick - 1)], fill=fill + (int(255 * max(0, min(1, a))),))

def with_shadow(layer, blur=6, strength=200):
    """A soft dark halo behind the type so it reads on any part of the picture."""
    a = layer.split()[3].filter(ImageFilter.GaussianBlur(blur))
    shadow = Image.new('RGBA', layer.size, (0, 0, 0, 0)); shadow.putalpha(a.point(lambda v: min(255, int(v * strength / 255 * 1.6))))
    return Image.alpha_composite(shadow, layer)

def block(scale, centre, top_frac=0.40, small_ratio=0.52):
    """Title, rule, TALES OF NIRN. Returns an RGBA layer the size of the frame."""
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    big = ImageFont.truetype(FACE, int(H * scale)); small = ImageFont.truetype(FACE, int(H * scale * small_ratio))
    title = BOOK.upper(); brand = 'TALES OF NIRN'
    if centre:
        cx, top = W / 2, H * top_frac
        tw = tracked(d, (cx, top), title, big, 0.16, INK + (255,), anchor_left=False)
        ry = top + big.size * 1.18
        rule(d, cx - tw / 2 - big.size * 0.6, cx + tw / 2 + big.size * 0.6, int(ry), INK, thick=2)
        tracked(d, (cx, ry + big.size * 0.38), brand, small, 0.30, INK + (225,), anchor_left=False)
    else:
        x, top = H * 0.06, H * 0.05
        tw = tracked(d, (x, top), title, big, 0.16, INK + (240,))
        ry = top + big.size * 1.2
        rule(d, x, x + tw + big.size * 0.8, int(ry), INK, fade_left=False, thick=1 if H <= 1080 else 2)
        tracked(d, (x, ry + big.size * 0.36), brand, small, 0.30, INK + (215,))
    return with_shadow(lay)

if W > H:
    block(0.034, centre=False, small_ratio=0.6).save(os.path.join(OUT, 'banner.png'))
    block(0.075, centre=True).save(os.path.join(OUT, 'titlecard.png'))
else:   # vertical: the banner centred above the picture, the title card across the middle
    block(0.021, centre=True, top_frac=0.15, small_ratio=0.6).save(os.path.join(OUT, 'banner.png'))
    block(0.034, centre=True, top_frac=0.45).save(os.path.join(OUT, 'titlecard.png'))

# the end card: the rights line, small and centred low
lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); f = ImageFont.truetype(FACE, int(H * 0.024 if W > H else W * 0.022))
if W > H:
    RY = float(sys.argv[sys.argv.index('--rights-y') + 1]) if '--rights-y' in sys.argv else 0.86   # lower it when the scene's focal point sits there
    tracked(d, (W / 2, H * RY), 'THE ELDER SCROLLS © ZENIMAX MEDIA INC.  ·  A FAN ADAPTATION, NOT AFFILIATED WITH OR ENDORSED BY BETHESDA', f, 0.08, INK + (220,), anchor_left=False)
else:   # too long for a phone's width on one line
    tracked(d, (W / 2, H * 0.30), 'THE ELDER SCROLLS © ZENIMAX MEDIA INC.', f, 0.08, INK + (220,), anchor_left=False)
    tracked(d, (W / 2, H * 0.30 + f.size * 1.6), 'A FAN ADAPTATION, NOT AFFILIATED WITH OR ENDORSED BY BETHESDA', f, 0.08, INK + (220,), anchor_left=False)
# the next book, on the last part of an episode (--next "The Alik'r"): NEXT IN THE LIBRARY, the title in the series capitals, a rule
if '--next' in sys.argv:
    nxt = sys.argv[sys.argv.index('--next') + 1].upper()
    big = ImageFont.truetype(FACE, int((H if W > H else W) * (0.05 if W > H else 0.06))); small = ImageFont.truetype(FACE, int(big.size * 0.42))
    cy = H * (0.08 if W > H else 0.215)
    tracked(d, (W / 2, cy), 'NEXT IN THE LIBRARY', small, 0.35, INK + (215,), anchor_left=False)
    tw = tracked(d, (W / 2, cy + small.size * 1.7), nxt, big, 0.16, INK + (255,), anchor_left=False)
    rule(d, W / 2 - tw / 2 - big.size * 0.5, W / 2 + tw / 2 + big.size * 0.5, int(cy + small.size * 1.7 + big.size * 1.2), INK, thick=2)
with_shadow(lay).save(os.path.join(OUT, 'endcard.png'))
print('wrote banner.png, titlecard.png, endcard.png in', OUT)
