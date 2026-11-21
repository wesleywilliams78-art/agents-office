"""Qamaria qamariya corner motif on a light cream ground (print-friendly SOP variant).
usage: python3 motif_light.py <outdir>  -> bg_first.png, bg_inner.png
"""
import math, sys
from PIL import Image, ImageDraw

# Qamaria Brand Guidelines palette (17 Nov 2026)
GROUND = (247, 237, 227)   # Warm Cream #F7EDE3
FOREST = (5, 92, 51)       # Dark Green #055C33 (fan centre)
DEEP = (105, 157, 122)     # #699D7A (halo arcs)
SAGE = (194, 145, 97)      # Camel Brown #C29161
MINT = (230, 239, 220)     # #E6EFDC


def ring(cx, cy, r0, r1, a0, a1, n, colours, gap_deg, steps=24):
    out, span = [], (a1 - a0) / n
    for i in range(n):
        s = math.radians(a0 + i * span + gap_deg / 2)
        e = math.radians(a0 + (i + 1) * span - gap_deg / 2)
        pts = [(cx + r1 * math.cos(s + (e - s) * k / steps), cy + r1 * math.sin(s + (e - s) * k / steps)) for k in range(steps + 1)]
        pts += [(cx + r0 * math.cos(s + (e - s) * k / steps), cy + r0 * math.sin(s + (e - s) * k / steps)) for k in range(steps, -1, -1)]
        col, op = colours[i % len(colours)]
        out.append(('fill', pts, col, op, 0))
    return out


def arc(cx, cy, r, a0, a1, col, op, width, steps=96):
    pts = [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * k / steps)),
            cy + r * math.sin(math.radians(a0 + (a1 - a0) * k / steps))) for k in range(steps + 1)]
    return [('stroke', pts, col, op, width)]


def fan(cx, cy, R, a0, a1):
    g = 1.4
    s = []
    s += arc(cx, cy, R * 1.16, a0, a1, DEEP, 0.25, 1.2)
    s += arc(cx, cy, R * 1.08, a0, a1, DEEP, 0.45, 1.2)
    s += ring(cx, cy, R * 0.90, R * 1.00, a0, a1, 18, [(MINT, 1.0), (SAGE, 1.0), (DEEP, 1.0)], g)
    s += ring(cx, cy, R * 0.64, R * 0.86, a0, a1, 9, [(SAGE, 1.0), (DEEP, 1.0), (MINT, 1.0)], g)
    s += ring(cx, cy, R * 0.30, R * 0.60, a0, a1, 4, [(DEEP, 1.0), (SAGE, 1.0)], g * 1.6)
    s += ring(cx, cy, 0, R * 0.26, a0, a1, 1, [(FOREST, 1.0)], 0)
    return s


def to_png(name, w, h, shapes, k=2, ss=2):
    img = Image.new('RGBA', (w * k * ss, h * k * ss), GROUND + (255,))
    sc = k * ss
    for kind, pts, col, op, sw in shapes:
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        dr = ImageDraw.Draw(layer)
        p = [(x * sc, y * sc) for x, y in pts]
        if kind == 'fill':
            dr.polygon(p, fill=col + (int(255 * op),))
        else:
            dr.line(p, fill=col + (int(255 * op),), width=max(1, int(sw * sc)), joint='curve')
        img.alpha_composite(layer)
    img.resize((w * k, h * k), Image.LANCZOS).convert('RGB').save(name, optimize=True)
    print('saved', name)


if __name__ == '__main__':
    out = sys.argv[1]
    W, H = 794, 1123
    to_png(out + '/bg_first.png', W, H, fan(W, 0, 140, 90, 180) + fan(0, H, 70, 270, 360))
    to_png(out + '/bg_inner.png', W, H, fan(W, 0, 88, 90, 180) + fan(0, H, 70, 270, 360))
