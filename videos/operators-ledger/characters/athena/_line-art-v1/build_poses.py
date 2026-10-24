"""Athena (Option A, The Blazer) pose library. Figure space: head centre (0,0), feet at y=644.
Every pose shares one viewBox so poses swap in place. Colours are CSS variables:
--line (default ink) and --fill (default bone)."""
import os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
BONE, INK, RED, DEEP, GREY = "#F3F2F2", "#201E1D", "#EC3013", "#B6240E", "#4A4644"
VIEW = (-260, -130, 520, 800)

def S(d): return f'<path class="s" d="{d}"/>'
def L(d): return f'<path class="l" d="{d}"/>'
def dot(x, y, r=4.5): return f'<circle class="d" cx="{x}" cy="{y}" r="{r}"/>'
def g(inner, t=""): return f'<g transform="{t}">{inner}</g>' if t else inner
def mirror(inner): return g(inner, "scale(-1 1)")

FACES = {
    "neutral":  dot(-16, -2) + dot(16, -2) + L("M -10 26 Q 0 30 10 26"),
    "puzzled":  dot(-16, -2) + dot(16, -2) + L("M 8 -20 Q 17 -26 26 -20") + L("M -24 -15 L -10 -15") + L("M -10 28 L 10 23"),
    "worried":  dot(-16, 0) + dot(16, 0) + L("M -26 -12 L -9 -18") + L("M 9 -18 L 26 -12") + L("M -10 30 Q 0 23 10 30"),
    "resolved": dot(-16, -2) + dot(16, -2) + L("M -24 -16 L -9 -16") + L("M 9 -16 L 24 -16") + L("M -12 24 Q 0 33 12 24"),
    "down":     L("M -21 6 Q -16 9 -11 6") + L("M 11 6 Q 16 9 21 6") + L("M -8 30 L 8 30"),
}
HEAD = "M -46 -6 C -46 -42 -25 -58 0 -58 C 25 -58 46 -42 46 -6 C 46 26 28 56 0 56 C -28 56 -46 26 -46 -6 Z"

def head(face="neutral", dx=0, dy=0):
    return "".join([
        S("M -24 -64 A 28 28 0 1 1 24 -64 Z"),
        S("M -45 0 C -57 -2 -57 22 -44 22 Z"), S("M 45 0 C 57 -2 57 22 44 22 Z"),
        '<rect class="d" x="-53" y="25" width="6" height="6"/><rect class="d" x="47" y="25" width="6" height="6"/>',
        S(HEAD),
        S("M -48 2 C -54 -48 -28 -68 0 -68 C 28 -68 54 -48 48 2 C 44 -22 30 -36 0 -40 C -30 -36 -44 -22 -48 2 Z"),
        L("M -16 -66 Q 0 -60 16 -66"),
        g(FACES[face], f"translate({dx} {dy})" if (dx or dy) else ""),
    ])

def shoe(x0, x1, y, h=22):
    s = 1 if x1 > x0 else -1
    return S(f"M {x0} {y} C {x0 - 4*s} {y+h-6} {x0 - 2*s} {y+h} {x0 + 10*s} {y+h} L {x1 - 4*s} {y+h} C {x1 + 4*s} {y+h} {x1 + 4*s} {y+h-10} {x1} {y} Z")

LEGS = S("M -52 320 L -50 622 L -9 622 L -6 404 L 6 404 L 9 622 L 50 622 L 52 320 Z") + shoe(-50, -9, 620) + shoe(50, 9, 620)
NECK = S("M -11 48 L -11 82 L 11 82 L 11 48 Z")
TORSO = "".join([
    S("M -14 76 L -62 88 C -68 150 -66 250 -62 334 L 62 334 C 66 250 68 150 62 88 L 14 76 Z"),
    L("M -14 76 L -34 120 L -22 130 L 0 174"), L("M 14 76 L 34 120 L 22 130 L 0 174"),
    L("M 0 174 L 0 334"), dot(-9, 220, 4), L("M -50 272 L -24 272"), L("M 24 272 L 50 272"),
])

def ledger_closed(x, y, w=62, h=84, rot=0):
    inner = S(f"M {x} {y} L {x+w} {y} L {x+w} {y+h} L {x} {y+h} Z") + L(f"M {x+8} {y} L {x+8} {y+h}") + L(f"M {x+w-10} {y} L {x+w-10} {y+h}")
    return g(inner, f"rotate({rot} {x+w/2} {y+h/2})" if rot else "")

# --- arms (viewer-left versions; mirror() makes the viewer-right one) ---
SLEEVE_HANG = S("M -62 88 C -78 140 -82 230 -80 306 L -56 306 C -56 240 -54 170 -48 128 Z")
HAND_HANG = S("M -79 304 C -81 330 -73 342 -66 342 C -58 342 -55 328 -57 304 Z") + L("M -60 314 Q -55 322 -60 330")
ARM_HANG = HAND_HANG + SLEEVE_HANG
ARM_HANG_LEDGER = ledger_closed(-102, 300, 54, 76, -4) + HAND_HANG + SLEEVE_HANG

ARM_LEDGER_CHEST = "".join([          # viewer-right arm, ledger held to the chest
    S("M 62 88 C 76 140 80 190 80 222 L 58 228 C 54 190 52 160 48 128 Z"),
    ledger_closed(-40, 118, 80, 102, -6),
    S("M 74 210 L 0 180 L -8 200 L 64 234 Q 86 232 74 210 Z"),
    S("M 0 178 L -24 182 Q -32 190 -26 199 L -6 202 Z"),
    L("M -25 189 L -10 190"), L("M -25 195 L -10 196"),
    L("M 6 182 L -2 202"),            # cuff
])

ARM_SCRATCH = "".join([               # viewer-right arm up to the side of the head
    S("M 60 88 L 102 18 Q 118 10 128 30 L 58 130 Z"),
    S("M 106 34 L 46 -28 L 62 -44 L 124 18 Q 124 34 106 34 Z"),
    L("M 70 -36 L 54 -20"),
])
HAND_SCRATCH = S("M 46 -26 C 30 -36 30 -62 46 -66 C 58 -68 66 -56 62 -44 Z") + L("M 38 -56 L 50 -50") + L("M 36 -46 L 50 -42")

ARM_POINT = "".join([                 # viewer-right arm out, index finger pointing
    S("M 56 94 L 182 58 L 190 82 L 64 124 Z"),
    L("M 176 60 L 184 84"),
    S("M 184 58 L 206 54 L 238 50 Q 246 52 240 60 L 216 64 Q 222 80 206 84 L 190 82 Z"),
    L("M 212 66 L 204 72"),
])

UPPER_FOLD = S("M -62 88 C -78 130 -82 180 -82 214 L -56 222 C -56 180 -54 150 -48 128 Z")
ARMS_FOLDED = "".join([
    UPPER_FOLD, mirror(UPPER_FOLD),
    S("M 86 186 L -46 184 L -46 208 L 80 212 Q 92 200 86 186 Z"),
    S("M -46 184 Q -64 182 -66 196 Q -64 210 -46 208 Z"), L("M -54 190 L -62 192"),
    S("M -86 206 L 50 204 L 50 230 L -80 232 Q -92 220 -86 206 Z"),
    S("M 50 204 Q 68 204 70 217 Q 68 230 50 230 Z"), L("M 58 210 L 66 212"), L("M 58 222 L 66 222"),
])

COUNTER = S("M -230 300 L 230 300 L 230 320 L -230 320 Z") + S("M -214 320 L 214 320 L 214 644 L -214 644 Z") + L("M -214 360 L 214 360")
LEDGER_OPEN = S("M -88 302 L -76 280 L 0 286 L 76 280 L 88 302 L 0 304 Z") + L("M 0 286 L 0 304") + \
    L("M -66 288 L -18 292") + L("M -70 294 L -18 297") + L("M 18 292 L 62 288")
UPPER_DESK = S("M -62 88 C -76 140 -82 200 -82 250 L -58 254 C -58 200 -54 160 -48 128 Z")
FORE_DESK = S("M -84 244 C -84 270 -70 290 -50 300 L -38 286 C -52 278 -60 264 -60 250 Z")
HAND_DESK_L = S("M -52 302 C -64 302 -62 284 -46 282 L -34 288 L -38 300 Z")
HAND_DESK_R = S("M 52 298 C 64 300 62 282 46 280 L 32 284 L 34 298 Z")
PEN = S("M 30 296 L 56 252 L 63 256 L 37 300 Z") + L("M 30 296 L 28 304")

def standing(arms_back, arms_front, face, dx=0, extra=""):
    return LEGS + NECK + arms_back + TORSO + head(face, dx) + arms_front + extra

POSES = {
    "standing-neutral": standing(ARM_HANG, ARM_LEDGER_CHEST, "neutral"),
    "looking-left":     standing(ARM_HANG, ARM_LEDGER_CHEST, "neutral", -9),
    "looking-right":    standing(ARM_HANG, ARM_LEDGER_CHEST, "neutral", 9),
    "head-scratch":     standing(ARM_HANG_LEDGER, ARM_SCRATCH + HAND_SCRATCH, "puzzled"),
    "pointing":         LEGS + NECK + ARM_HANG_LEDGER + ARM_POINT + TORSO + head("resolved", 7),
    "worried":          standing(ARM_HANG, ARM_LEDGER_CHEST, "worried"),
    "at-counter-writing": NECK + TORSO + UPPER_DESK + mirror(UPPER_DESK) + COUNTER + LEDGER_OPEN +
                          FORE_DESK + mirror(FORE_DESK) + HAND_DESK_L + HAND_DESK_R + PEN + head("down", 0, 4),
    "arms-folded":      LEGS + NECK + TORSO + head("resolved") + ARMS_FOLDED,
}

CSS = (f".s{{fill:var(--fill,{BONE});stroke:var(--line,{INK});stroke-width:4;stroke-linecap:round;stroke-linejoin:round}}"
       f".l{{fill:none;stroke:var(--line,{INK});stroke-width:4;stroke-linecap:round;stroke-linejoin:round}}"
       f".d{{fill:var(--line,{INK})}}")
vb = " ".join(map(str, VIEW))

for name, body in POSES.items():
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{VIEW[2]}" height="{VIEW[3]}">'
           f'<style>{CSS}</style><g id="athena-{name}">{body}</g></svg>')
    open(os.path.join(OUT, f"athena-{name}.svg"), "w", encoding="utf-8").write(svg)

# review sheet: 4 x 2 on bone, plus the red-ground and ink-ground versions of one pose
cells = []
names = list(POSES)
for k, n in enumerate(names):
    x, y = 30 + (k % 4) * 260, 250 + (k // 4) * 470
    cells.append(f'<svg x="{x}" y="{y}" width="260" height="400" viewBox="{vb}">{POSES[n]}</svg>')
    cells.append(f'<text class="lab" x="{x+40}" y="{y+430}">{n.replace("-", " ").upper()}</text>')
head_sheet = (f'<text class="kick" x="86" y="118">THE OPERATOR\'S LEDGER · ATHENA</text>'
              f'<text class="title" x="86" y="190">Pose library</text>'
              f'<line x1="86" y1="226" x2="994" y2="226" stroke="#D6D2CF" stroke-width="2"/>')
sheet = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">'
         f'<style>@import url(\'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300&amp;display=swap\');'
         f'@font-face{{font-family:Archivo;font-weight:500;src:url(\'../../../../assets/fonts/archivo/Archivo-Medium.ttf\')}}'
         f'{CSS}.kick{{font-family:Archivo,sans-serif;font-weight:500;font-size:20px;letter-spacing:.22em;fill:{DEEP}}}'
         f'.title{{font-family:Newsreader,Georgia,serif;font-weight:300;font-size:64px;fill:{INK}}}'
         f'.lab{{font-family:Archivo,sans-serif;font-weight:500;font-size:15px;letter-spacing:.18em;fill:{GREY}}}</style>'
         f'<rect width="1080" height="1350" fill="{BONE}"/>{head_sheet}{"".join(cells)}</svg>')
open(os.path.join(OUT, "athena-pose-sheet.svg"), "w", encoding="utf-8").write(sheet)

# colourway strip: the same pose on each ground, to prove the variables work
strip = "".join(
    f'<rect x="{i*360}" y="0" width="360" height="560" fill="{bg}"/>'
    f'<svg x="{i*360+20}" y="20" width="320" height="520" viewBox="{vb}" style="--fill:{fill};--line:{line}">{POSES["standing-neutral"]}</svg>'
    for i, (bg, fill, line) in enumerate([(BONE, BONE, INK), (RED, RED, BONE), (INK, INK, BONE)]))
open(os.path.join(OUT, "athena-colourways.svg"), "w", encoding="utf-8").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 560" width="1080" height="560"><style>{CSS}</style>{strip}</svg>')

html = ('<!doctype html><meta charset="utf-8"><title>Athena poses</title>'
        '<style>body{margin:0;background:#D6D2CF;padding:16px;display:grid;gap:16px;justify-items:start}'
        'body>svg{width:min(760px,100%);height:auto}</style>' + sheet + open(os.path.join(OUT, "athena-colourways.svg"), encoding="utf-8").read())
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
print("ok", len(POSES))
