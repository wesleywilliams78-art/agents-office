"""Athena pose library, style v2 (variant B, mustard blazer), plus the shopfronts.
Figure space: head centre (0,0), feet at y=600. Every pose shares one viewBox so poses swap in place.
Run from the repo root:
  python videos/operators-ledger/characters/athena/build_poses.py videos/operators-ledger/characters"""
import os, sys

ROOT = sys.argv[1]
A_OUT, S_OUT = os.path.join(ROOT, "athena"), os.path.join(ROOT, "shops")
os.makedirs(A_OUT, exist_ok=True); os.makedirs(S_OUT, exist_ok=True)

# brand frame
BONE, INK, RED, DEEP, GREY = "#F3F2F2", "#201E1D", "#EC3013", "#B6240E", "#4A4644"
# character palette (characters and buildings only, never type or charts)
SAND, STONE, OCHRE, SAGE, BLUSH = "#E9D8BD", "#C8BFB3", "#F2C14E", "#7E9C82", "#F4A28C"
MUSTARD, MUSTARD_DEEP = "#E3A23B", "#B9781F"
SKIN, HAIR = "#C68A5E", "#2E2422"
SW = 5
VIEW = (-260, -150, 520, 800)

def P(d, fill):
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round" stroke-linecap="round"/>'
def Ln(d, color=INK, w=SW, extra=""):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def R(x, y, w, h, fill, stroke=True):
    s = f' stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round"' if stroke else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"{s}/>'
def eye(x, y, rx=5.5, ry=7.5):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{INK}"/><circle cx="{x+2}" cy="{y-3}" r="2" fill="{BONE}"/>'
def g(inner, t=""): return f'<g transform="{t}">{inner}</g>' if t else inner
def mirror(inner): return g(inner, "scale(-1 1)")

# ---------- head ----------
def face(kind, dx=0):
    cheeks = f'<circle cx="-29" cy="20" r="8" fill="{BLUSH}" opacity=".75"/><circle cx="29" cy="20" r="8" fill="{BLUSH}" opacity=".75"/>'
    nose = Ln("M -1 8 Q 4 15 -1 19", INK, 3.5)
    f = {
        "neutral": eye(-17, 0) + eye(17, 0) + Ln("M -27 -19 Q -18 -24 -8 -20", HAIR) + Ln("M 8 -20 Q 18 -24 27 -19", HAIR) + Ln("M -11 31 Q 0 39 11 31"),
        "puzzled": eye(-17, 1) + eye(17, -1) + Ln("M -27 -16 Q -18 -18 -8 -16", HAIR) + Ln("M 8 -24 Q 18 -32 28 -24", HAIR) + Ln("M -10 34 Q 2 29 12 32"),
        "worried": eye(-17, 2, 6, 8.5) + eye(17, 2, 6, 8.5) + Ln("M -28 -14 Q -18 -16 -8 -24", HAIR) + Ln("M 8 -24 Q 18 -16 28 -14", HAIR) + Ln("M -11 37 Q 0 29 11 37"),
        "resolved": eye(-17, 0) + eye(17, 0) + Ln("M -27 -20 L -8 -20", HAIR) + Ln("M 8 -20 L 27 -20", HAIR) + P("M -14 28 Q 0 44 14 28 Z", BONE),
        "down": Ln("M -23 4 Q -17 9 -11 4") + Ln("M 11 4 Q 17 9 23 4") + Ln("M -27 -14 Q -18 -18 -8 -15", HAIR) + Ln("M 8 -15 Q 18 -18 27 -14", HAIR) + Ln("M -8 33 Q 0 37 8 33"),
    }[kind]
    inner = cheeks + nose + f
    return g(inner, f"translate({dx} 0)") if dx else inner

HEAD = "M -50 -6 C -50 -44 -27 -60 0 -60 C 27 -60 50 -44 50 -6 C 50 30 30 58 0 58 C -30 58 -50 30 -50 -6 Z"

def head(expr="neutral", dx=0):
    pencil = g(P("M -58 -6 L 40 -6 L 40 6 L -58 6 Z", OCHRE) + P("M 40 -6 L 56 0 L 40 6 Z", BONE) + P("M -66 -6 L -58 -6 L -58 6 L -66 6 Z", BLUSH),
               "translate(0 -92) rotate(-18)")
    return "".join([
        pencil,
        f'<circle cx="0" cy="-90" r="34" fill="{HAIR}" stroke="{INK}" stroke-width="{SW}"/>',
        Ln("M -14 -110 Q 2 -100 10 -76", BONE, 3, 'opacity=".35"'),
        P("M -48 -2 C -63 -6 -64 22 -47 24 Z", SKIN), P("M 48 -2 C 63 -6 64 22 47 24 Z", SKIN),
        f'<rect x="-60" y="26" width="9" height="9" fill="{OCHRE}" stroke="{INK}" stroke-width="2.5"/>',
        f'<rect x="51" y="26" width="9" height="9" fill="{OCHRE}" stroke="{INK}" stroke-width="2.5"/>',
        P(HEAD, SKIN),
        P("M -54 6 C -60 -46 -30 -72 2 -72 C 34 -72 60 -48 54 6 C 50 -18 40 -30 24 -38 C 8 -26 -16 -22 -36 -32 C -44 -22 -50 -10 -54 6 Z", HAIR),
        Ln("M 52 -8 C 62 10 58 28 49 36", HAIR, 5),
        face(expr, dx),
    ])

# ---------- body ----------
LEGS = (P("M -54 296 L -52 576 L -10 576 L -6 382 L 6 382 L 10 576 L 52 576 L 54 296 Z", INK) +
        P("M -54 572 C -60 594 -52 600 -40 600 L -8 600 C 0 600 0 588 -8 572 Z", DEEP) +
        P("M 54 572 C 60 594 52 600 40 600 L 8 600 C 0 600 0 588 8 572 Z", DEEP))
NECK = P("M -12 46 L -12 80 L 12 80 L 12 46 Z", SKIN)
TORSO = "".join([
    P("M -16 72 C -40 74 -62 80 -68 92 C -74 150 -72 240 -66 304 L 66 304 C 72 240 74 150 68 92 C 62 80 40 74 16 72 Z", MUSTARD),
    P("M -16 72 L 0 160 L 16 72 Z", BONE),
    P("M -16 72 L -38 116 L -22 128 L 0 160 Z", MUSTARD_DEEP), P("M 16 72 L 38 116 L 22 128 L 0 160 Z", MUSTARD_DEEP),
    Ln("M 0 160 L 0 304"), R(-11, 206, 9, 9, INK, False),
    Ln("M -52 256 L -26 256"), Ln("M 26 256 L 52 256"),
])

def ledger_closed(x, y, w, h, rot=0):
    inner = (R(x, y, w, h, INK) + R(x + w - 8, y + 4, 5, h - 8, BONE, False) +
             P(f"M {x+w-24} {y+h-4} L {x+w-14} {y+h-4} L {x+w-14} {y+h+26} L {x+w-19} {y+h+20} L {x+w-24} {y+h+26} Z", RED) +
             R(x + 12, y + 20, w * 0.48, 8, OCHRE, False))
    return g(inner, f"rotate({rot} {x+w/2} {y+h/2})" if rot else "")

# arms are drawn for the viewer-left side; mirror() gives the viewer-right one
HAND_HANG = P("M -86 286 C -90 318 -78 330 -70 330 C -60 330 -57 314 -60 286 Z", SKIN)
SLEEVE_HANG = P("M -66 90 C -84 150 -88 220 -86 292 L -60 292 C -60 230 -58 170 -50 130 Z", MUSTARD) + Ln("M -86 280 L -60 280", BONE, 4)
ARM_HANG = HAND_HANG + SLEEVE_HANG
ARM_HANG_LEDGER = ledger_closed(-116, 288, 60, 80, -4) + HAND_HANG + SLEEVE_HANG

ARM_LEDGER_CHEST = "".join([
    P("M 68 92 C 84 140 88 180 88 214 L 62 222 C 58 186 56 160 50 130 Z", MUSTARD),
    ledger_closed(-42, 112, 84, 106, -6),
    P("M 80 206 L 2 176 L -8 198 L 70 232 Q 94 230 80 206 Z", MUSTARD),
    Ln("M 10 180 L 2 200", BONE, 4),
    P("M 2 174 L -24 178 Q -34 188 -26 199 L -6 202 Z", SKIN),
    Ln("M -25 186 L -12 187", INK, 3), Ln("M -25 193 L -12 194", INK, 3),
])

ARM_SCRATCH = "".join([
    P("M 64 92 L 108 12 Q 126 4 134 26 L 60 134 Z", MUSTARD),
    P("M 112 31 L 46 -31 L 62 -49 L 128 13 Q 132 30 112 31 Z", MUSTARD),
    Ln("M 75 -36 L 59 -19", BONE, 4),
])
HAND_SCRATCH = P("M 48 -30 C 30 -40 32 -66 50 -70 C 64 -72 72 -58 66 -46 Z", SKIN) + Ln("M 40 -60 L 52 -54", INK, 3) + Ln("M 38 -50 L 52 -46", INK, 3)

ARM_POINT = "".join([
    P("M 56 94 L 182 58 L 190 84 L 64 124 Z", MUSTARD),
    Ln("M 176 60 L 184 84", BONE, 4),
    P("M 186 58 L 206 54 L 240 50 Q 248 52 242 60 L 216 64 Q 222 80 206 84 L 192 82 Z", SKIN),
    Ln("M 212 66 L 204 72", INK, 3),
])

UPPER_FOLD = P("M -66 90 C -82 130 -86 180 -86 214 L -58 222 C -58 180 -56 150 -50 128 Z", MUSTARD)
ARMS_FOLDED = "".join([
    UPPER_FOLD, mirror(UPPER_FOLD),
    P("M 88 186 L -46 184 L -46 210 L 82 214 Q 96 200 88 186 Z", MUSTARD),
    P("M -46 184 Q -66 182 -68 197 Q -66 212 -46 210 Z", SKIN),
    P("M -88 206 L 50 204 L 50 232 L -82 234 Q -96 220 -88 206 Z", MUSTARD),
    Ln("M 42 206 L 42 230", BONE, 4),
    P("M 50 204 Q 70 204 72 218 Q 70 232 50 232 Z", SKIN), Ln("M 58 211 L 66 212", INK, 3), Ln("M 58 224 L 66 224", INK, 3),
])

COUNTER = (P("M -232 298 L 232 298 L 232 322 L -232 322 Z", SAND) +
           P("M -214 322 L 214 322 L 214 600 L -214 600 Z", SAGE) +
           Ln("M -214 372 L 214 372") + Ln("M -100 372 L -100 600") + Ln("M 100 372 L 100 600"))
LEDGER_OPEN = (P("M -90 302 L -78 278 L 0 284 L 78 278 L 90 302 L 0 305 Z", BONE) + Ln("M 0 284 L 0 305") +
               Ln("M -68 287 L -18 291", GREY, 3) + Ln("M -72 294 L -18 297", GREY, 3) + Ln("M 18 291 L 64 287", GREY, 3) +
               P("M 30 303 L 38 303 L 38 330 L 34 325 L 30 330 Z", RED))
UPPER_DESK = P("M -66 90 C -80 140 -86 200 -86 250 L -60 254 C -60 200 -56 160 -50 128 Z", MUSTARD)
FORE_DESK = P("M -88 244 C -88 270 -74 290 -54 300 L -40 286 C -54 278 -62 264 -62 250 Z", MUSTARD)
HAND_DESK_L = P("M -54 302 C -66 302 -64 284 -48 282 L -36 288 L -40 300 Z", SKIN)
HAND_DESK_R = P("M 54 298 C 66 300 64 282 48 280 L 34 284 L 36 298 Z", SKIN)
PEN = P("M 30 296 L 56 252 L 64 256 L 38 300 Z", OCHRE) + P("M 30 296 L 38 300 L 29 306 Z", INK)

def standing(back, front, face_kind, dx=0):
    return LEGS + NECK + back + TORSO + head(face_kind, dx) + front

POSES = {
    "standing-neutral":   standing(ARM_HANG, ARM_LEDGER_CHEST, "neutral"),
    "looking-left":       standing(ARM_HANG, ARM_LEDGER_CHEST, "neutral", -9),
    "looking-right":      standing(ARM_HANG, ARM_LEDGER_CHEST, "neutral", 9),
    "head-scratch":       standing(ARM_HANG_LEDGER, ARM_SCRATCH + HAND_SCRATCH, "puzzled"),
    "pointing":           LEGS + NECK + ARM_HANG_LEDGER + ARM_POINT + TORSO + head("resolved", 7),
    "worried":            standing(ARM_HANG, ARM_LEDGER_CHEST, "worried"),
    "at-counter-writing": NECK + TORSO + UPPER_DESK + mirror(UPPER_DESK) + COUNTER + LEDGER_OPEN + FORE_DESK + mirror(FORE_DESK) +
                          HAND_DESK_L + HAND_DESK_R + PEN + head("down"),
    "arms-folded":        LEGS + NECK + TORSO + head("resolved") + ARMS_FOLDED,
}

# ---------- shopfronts (viewBox 0 0 300 400, ground at y 392) ----------
def shop(label, happy=True, stripe=None):
    uid = label.replace(" ", "").lower() + ("h" if happy else "d") + (stripe or "").strip("#")
    facade = SAND if happy else STONE
    stripes = "".join(R(14 + i * 34, 146, 17, 64, stripe or (RED if happy else DEEP), False) for i in range(8))
    awning = "M 24 146 L 276 146 L 292 196 L 8 196 Z" if happy else "M 24 146 L 276 146 L 290 206 Q 150 186 10 206 Z"
    if happy:
        eyes = (R(46, 216, 76, 70, OCHRE) + R(178, 216, 76, 70, OCHRE) +
                f'<circle cx="94" cy="252" r="10" fill="{INK}"/><circle cx="226" cy="252" r="10" fill="{INK}"/>'
                f'<circle cx="97" cy="248" r="3" fill="{BONE}"/><circle cx="229" cy="248" r="3" fill="{BONE}"/>')
        extra = (R(58, 296, 18, 10, BLUSH, False) + R(224, 296, 18, 10, BLUSH, False) + Ln("M 118 300 Q 150 324 182 300") +
                 P("M 206 364 L 274 364 L 270 392 L 210 392 Z", DEEP) + P("M 216 364 Q 210 336 226 330 Q 232 346 226 364 Z", SAGE) +
                 P("M 236 364 Q 236 326 250 318 Q 256 342 246 364 Z", SAGE) + P("M 256 364 Q 262 340 274 338 Q 272 356 264 364 Z", SAGE))
        door = P("M 124 328 L 176 328 L 176 392 L 124 392 Z", SAGE) + R(164, 356, 6, 8, OCHRE, False)
    else:
        eyes = (R(46, 216, 76, 70, "#3A3533") + R(178, 216, 76, 70, "#3A3533") +
                f'<circle cx="72" cy="266" r="9" fill="{BONE}"/><circle cx="204" cy="266" r="9" fill="{BONE}"/>' +
                R(46, 216, 76, 34, facade) + R(178, 216, 76, 34, facade))
        extra = Ln("M 116 310 Q 133 302 150 310 Q 167 318 184 310") + Ln("M 40 330 L 52 352 L 46 370 L 58 392", INK, 3.5)
        door = P("M 124 328 L 176 328 L 176 392 L 124 392 Z", "#8C857C") + R(164, 356, 6, 8, INK, False)
    sign = (R(40, 86, 220, 50, INK, False) +
            f'<text x="150" y="121" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-weight="500" font-size="30" letter-spacing="5" fill="{BONE}">{label}</text>')
    if not happy:
        sign = g(sign, "rotate(-4 150 111)")
    return "".join([
        R(14, 70, 272, 322, facade), R(4, 56, 292, 20, INK, False), sign,
        f'<clipPath id="aw-{uid}"><path d="{awning}"/></clipPath>',
        f'<path d="{awning}" fill="{BONE}"/><g clip-path="url(#aw-{uid})">{stripes}</g>', P(awning, "none"),
        eyes, extra, door, Ln("M 4 392 L 296 392", INK, SW),
    ])

vb = " ".join(map(str, VIEW))
for name, body in POSES.items():
    open(os.path.join(A_OUT, f"athena-{name}.svg"), "w", encoding="utf-8").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{VIEW[2]}" height="{VIEW[3]}"><g id="athena-{name}">{body}</g></svg>')

def to_let():
    """An empty unit: no awning, whitewashed windows, a red TO LET board. A rival in waiting (Episode 02)."""
    board = g(R(70, 236, 160, 54, RED, True) +
              f'<text x="150" y="272" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-weight="500" font-size="28" letter-spacing="4" fill="{BONE}">TO LET</text>',
              "rotate(-6 150 263)")
    return "".join([
        R(14, 70, 272, 322, STONE), R(4, 56, 292, 20, INK, False), R(40, 86, 220, 50, "#8C857C", False),
        R(30, 196, 240, 116, BONE), Ln("M 150 196 L 150 312", INK, 4),
        Ln("M 46 214 Q 80 230 70 260", "#D6D2CF", 6) + Ln("M 170 220 Q 210 240 196 280", "#D6D2CF", 6),
        board, P("M 124 328 L 176 328 L 176 392 L 124 392 Z", "#8C857C"), Ln("M 4 392 L 296 392", INK, SW),
    ])

SHOPS = {"site-1": shop("SITE 1", True), "site-10": shop("SITE 10", False), "site-10-early": shop("SITE 10", True), "site": shop("SITE", True),
         "rival-cafe": shop("CAFÉ", True, SAGE), "to-let": to_let()}
for name, body in SHOPS.items():
    open(os.path.join(S_OUT, f"{name}.svg"), "w", encoding="utf-8").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">{body}</svg>')

# review sheet: the eight poses, then the shopfronts and Athena on each ground
cells = []
for k, n in enumerate(POSES):
    x, y = 30 + (k % 4) * 260, 240 + (k // 4) * 450
    cells.append(f'<svg x="{x}" y="{y}" width="260" height="400" viewBox="{vb}">{POSES[n]}</svg>')
    cells.append(f'<text class="lab" x="{x+40}" y="{y+420}">{n.replace("-", " ").upper()}</text>')
for k, (n, b) in enumerate(SHOPS.items()):
    cells.append(f'<svg x="{60 + k*250}" y="1150" width="165" height="220" viewBox="0 0 300 400">{b}</svg>')
style = ("<style>@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300&amp;display=swap');"
         "@font-face{font-family:Archivo;font-weight:500;src:url('../../../../assets/fonts/archivo/Archivo-Medium.ttf')}"
         f".kick{{font-family:Archivo,sans-serif;font-weight:500;font-size:20px;letter-spacing:.22em;fill:{DEEP}}}"
         f".title{{font-family:Newsreader,Georgia,serif;font-weight:300;font-size:60px;fill:{INK}}}"
         f".lab{{font-family:Archivo,sans-serif;font-weight:500;font-size:15px;letter-spacing:.18em;fill:{GREY}}}</style>")
sheet = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1400" width="1080" height="1400">{style}'
         f'<rect width="1080" height="1400" fill="{BONE}"/><text class="kick" x="86" y="110">THE OPERATOR’S LEDGER · ATHENA · STYLE V2</text>'
         f'<text class="title" x="86" y="180">Pose library</text>{"".join(cells)}</svg>')
open(os.path.join(A_OUT, "athena-pose-sheet.svg"), "w", encoding="utf-8").write(sheet)
grounds = "".join(f'<rect x="{i*360}" y="0" width="360" height="520" fill="{bg}"/><svg x="{i*360+20}" y="10" width="320" height="500" viewBox="{vb}">{POSES["standing-neutral"]}</svg>'
                  for i, bg in enumerate([BONE, RED, INK]))
open(os.path.join(A_OUT, "index.html"), "w", encoding="utf-8").write(
    '<!doctype html><meta charset="utf-8"><title>Athena poses v2</title><style>body{margin:0;background:#D6D2CF;padding:16px;display:grid;gap:16px;justify-items:start}body>svg{width:min(760px,100%);height:auto}</style>'
    + sheet + f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 520" width="1080" height="520">{grounds}</svg>')
print("ok", len(POSES), "poses,", len(SHOPS), "shops")
