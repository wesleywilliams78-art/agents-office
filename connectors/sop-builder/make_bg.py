"""Full-page images of the corner waves on a transparent ground, for the dark Word SOPs (the ground itself is the page colour).
usage: python make_bg.py <out dir> GROUND ACCENT WAVE2 SECOND   (colours as hex, no #)
Writes bg_first.png (large waves, first page) and bg_inner.png (smaller top wave, other pages). Same drawing as the SOP skills."""
import sys
from PIL import Image, ImageDraw

CW, CH = 794, 1123
K = 2
W, H = CW * K, CH * K
SS = 2

def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

out_dir = sys.argv[1]
GROUND, ACCENT, WAVE2, SECOND = (rgb(x) for x in sys.argv[2:6])

TR = [
    ('stroke', 'M96 0 C146 86 76 174 208 222 C334 268 328 148 432 182 C492 200 524 262 560 286', ACCENT, 0.40, 1.5),
    ('stroke', 'M118 0 C168 78 98 162 218 206 C332 246 328 134 430 166 C488 183 522 246 560 268', ACCENT, 0.65, 1.5),
    ('fill', 'M140 0 C190 70 120 150 230 190 C330 226 330 120 430 150 C490 168 520 230 560 250 L560 0 Z', WAVE2, 1.0, 0),
    ('fill', 'M230 0 C270 60 210 120 290 150 C370 180 380 100 450 120 C500 134 530 180 560 190 L560 0 Z', ACCENT, 1.0, 0),
    ('fill', 'M330 0 C350 30 320 60 360 80 C410 104 430 50 480 62 C520 72 545 95 560 100 L560 0 Z', SECOND, 1.0, 0),
]
BL = [
    ('stroke', 'M0 28 C60 8 115 50 185 58 C268 70 305 28 388 58 C440 78 490 100 520 108', ACCENT, 0.60, 1.5),
    ('fill', 'M0 120 L0 40 C60 20 110 60 180 70 C260 82 300 40 380 70 C430 90 480 110 520 120 Z', WAVE2, 1.0, 0),
    ('fill', 'M0 120 L0 78 C60 62 110 96 180 104 C240 110 290 80 360 100 C400 111 450 118 470 120 Z', ACCENT, 1.0, 0),
]

def flatten(d, steps=48):
    toks = d.replace('M', ' M ').replace('C', ' C ').replace('L', ' L ').replace('Z', ' Z ').replace(',', ' ').split()
    pts, i, cur = [], 0, (0.0, 0.0)
    while i < len(toks):
        t = toks[i]
        if t == 'M' or t == 'L':
            cur = (float(toks[i + 1]), float(toks[i + 2])); pts.append(cur); i += 3
        elif t == 'C':
            x1, y1, x2, y2, x3, y3 = [float(v) for v in toks[i + 1:i + 7]]
            x0, y0 = cur
            for s in range(1, steps + 1):
                u = s / steps; v = 1 - u
                pts.append((v**3*x0 + 3*v*v*u*x1 + 3*v*u*u*x2 + u**3*x3,
                            v**3*y0 + 3*v*v*u*y1 + 3*v*u*u*y2 + u**3*y3))
            cur = (x3, y3); i += 7
        else:
            i += 1
    return pts

def draw_wave(img, spec, vb, box, origin):
    vw, vh = vb; bw, bh = box; ox, oy = origin
    sx, sy = bw / vw * K * SS, bh / vh * K * SS
    for kind, d, col, op, sw in spec:
        pts = [(ox * K * SS + x * sx, oy * K * SS + y * sy) for x, y in flatten(d)]
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        dr = ImageDraw.Draw(layer)
        a = int(255 * op)
        if kind == 'fill':
            dr.polygon(pts, fill=col + (a,))
        else:
            dr.line(pts, fill=col + (a,), width=int(sw * K * SS * 1.2), joint='curve')
        img.alpha_composite(layer)

def make(name, tr_scale, bl_scale):
    img = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))  # transparent: only the waves are opaque, so the header and footer text stay visible; the ground is the page colour
    tw, th = 560 * tr_scale, 330 * tr_scale
    draw_wave(img, TR, (560, 380), (tw, th), (CW - tw, 0))
    bw, bh = 560 * bl_scale, 100 * bl_scale
    draw_wave(img, BL, (520, 120), (bw, bh), (0, CH - bh))
    img.resize((W, H), Image.LANCZOS).save(name, optimize=True)
    print('saved', name)

make(out_dir + '/bg_first.png', 0.62, 0.62)
make(out_dir + '/bg_inner.png', 0.36, 0.62)
