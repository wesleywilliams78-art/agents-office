"""Style test: a warmer, cartoon-leaning Athena and shopfronts for The Operator's Ledger.
Run from anywhere: python build_style_test.py <out-dir>"""
import os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

# brand frame
BONE, INK, RED, DEEP, GREY = "#F3F2F2", "#201E1D", "#EC3013", "#B6240E", "#4A4644"
# proposed character palette: only for characters and buildings, never type or charts
SAND, STONE, OCHRE, SAGE, BLUSH = "#E9D8BD", "#C8BFB3", "#F2C14E", "#7E9C82", "#F4A28C"
MUSTARD, MUSTARD_DEEP = "#E3A23B", "#B9781F"  # Athena's blazer: red stays the loss colour
VARIANTS = [
    dict(key="a", label="Light skin, chestnut hair", skin="#F3CDB0", hair="#6B3B24"),
    dict(key="b", label="Medium skin, dark hair", skin="#C68A5E", hair="#2E2422"),
    dict(key="c", label="Deep skin, dark hair", skin="#8B5A3C", hair="#2E2422"),
]
SW = 5

def P(d, fill, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def Ln(d, color=INK, w=SW, extra=""):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def eye(x, y, rx=5.5, ry=7.5):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{INK}"/><circle cx="{x+2}" cy="{y-3}" r="2" fill="{BONE}"/>'
def g(inner, t=""): return f'<g transform="{t}">{inner}</g>'
def mirror(inner): return g(inner, "scale(-1 1)")

def face(kind, v, dx=0):
    hair = v["hair"]
    cheeks = f'<circle cx="-29" cy="20" r="8" fill="{BLUSH}" opacity=".75"/><circle cx="29" cy="20" r="8" fill="{BLUSH}" opacity=".75"/>'
    nose = Ln("M -1 8 Q 4 15 -1 19", INK, 3.5)
    if kind == "neutral":
        f = eye(-17, 0) + eye(17, 0) + Ln("M -27 -19 Q -18 -24 -8 -20", hair) + Ln("M 8 -20 Q 18 -24 27 -19", hair) + Ln("M -11 31 Q 0 39 11 31")
    elif kind == "puzzled":
        f = eye(-17, 1) + eye(17, -1) + Ln("M -27 -16 Q -18 -18 -8 -16", hair) + Ln("M 8 -24 Q 18 -32 28 -24", hair) + Ln("M -10 34 Q 2 29 12 32")
    elif kind == "worried":
        f = eye(-17, 2, 6, 8.5) + eye(17, 2, 6, 8.5) + Ln("M -28 -14 Q -18 -16 -8 -24", hair) + Ln("M 8 -24 Q 18 -16 28 -14", hair) + Ln("M -11 37 Q 0 29 11 37")
    elif kind == "resolved":
        f = eye(-17, 0) + eye(17, 0) + Ln("M -27 -20 L -8 -20", hair) + Ln("M 8 -20 L 27 -20", hair) + P("M -14 28 Q 0 44 14 28 Z", BONE)
    else:  # down, writing
        f = Ln("M -23 4 Q -17 9 -11 4") + Ln("M 11 4 Q 17 9 23 4") + Ln("M -27 -14 Q -18 -18 -8 -15", hair) + Ln("M 8 -15 Q 18 -18 27 -14", hair) + Ln("M -8 33 Q 0 37 8 33")
    return g(cheeks + nose + f, f"translate({dx} 0)") if dx else cheeks + nose + f

HEAD = "M -50 -6 C -50 -44 -27 -60 0 -60 C 27 -60 50 -44 50 -6 C 50 30 30 58 0 58 C -30 58 -50 30 -50 -6 Z"

def head(v, expr="neutral", dx=0):
    hair, skin = v["hair"], v["skin"]
    pencil = g(P("M -58 -6 L 40 -6 L 40 6 L -58 6 Z", OCHRE) + P("M 40 -6 L 56 0 L 40 6 Z", BONE) + P("M -66 -6 L -58 -6 L -58 6 L -66 6 Z", BLUSH),
               "translate(0 -92) rotate(-18)")
    return "".join([
        pencil,
        f'<circle cx="0" cy="-90" r="34" fill="{hair}" stroke="{INK}" stroke-width="{SW}"/>',
        Ln("M -14 -110 Q 2 -100 10 -76", BONE, 3, 'opacity=".35"'),
        P("M -48 -2 C -63 -6 -64 22 -47 24 Z", skin), P("M 48 -2 C 63 -6 64 22 47 24 Z", skin),
        f'<rect x="-60" y="26" width="9" height="9" fill="{OCHRE}" stroke="{INK}" stroke-width="2.5"/>',
        f'<rect x="51" y="26" width="9" height="9" fill="{OCHRE}" stroke="{INK}" stroke-width="2.5"/>',
        P(HEAD, skin),
        P("M -54 6 C -60 -46 -30 -72 2 -72 C 34 -72 60 -48 54 6 C 50 -18 40 -30 24 -38 C 8 -26 -16 -22 -36 -32 C -44 -22 -50 -10 -54 6 Z", hair),
        Ln("M 52 -8 C 62 10 58 28 49 36", hair, 5),
        face(expr, v, dx),
    ])

def body_standing(v):
    skin = v["skin"]
    return "".join([
        P("M -54 296 L -52 576 L -10 576 L -6 382 L 6 382 L 10 576 L 52 576 L 54 296 Z", INK),
        P("M -54 572 C -60 594 -52 600 -40 600 L -8 600 C 0 600 0 588 -8 572 Z", DEEP),
        P("M 54 572 C 60 594 52 600 40 600 L 8 600 C 0 600 0 588 8 572 Z", DEEP),
        P("M -12 46 L -12 80 L 12 80 L 12 46 Z", skin),
        # viewer-left arm hanging (behind torso)
        P("M -86 286 C -90 318 -78 330 -70 330 C -60 330 -57 314 -60 286 Z", skin),
        P("M -66 90 C -84 150 -88 220 -86 292 L -60 292 C -60 230 -58 170 -50 130 Z", MUSTARD),
        Ln("M -86 278 L -60 278", BONE, 4),
        # blazer
        P("M -16 72 C -40 74 -62 80 -68 92 C -74 150 -72 240 -66 304 L 66 304 C 72 240 74 150 68 92 C 62 80 40 74 16 72 Z", MUSTARD),
        P("M -16 72 L 0 160 L 16 72 Z", BONE),
        P("M -16 72 L -38 116 L -22 128 L 0 160 Z", MUSTARD_DEEP), P("M 16 72 L 38 116 L 22 128 L 0 160 Z", MUSTARD_DEEP),
        Ln("M 0 160 L 0 304"), f'<rect x="-11" y="206" width="9" height="9" fill="{INK}"/>',
        Ln("M -52 256 L -26 256"), Ln("M 26 256 L 52 256"),
    ])

def arm_ledger(v):
    skin = v["skin"]
    ledger = g(P("M -42 112 L 42 112 L 42 218 L -42 218 Z", INK) + f'<rect x="34" y="116" width="5" height="98" fill="{BONE}"/>' +
               P("M 18 214 L 28 214 L 28 244 L 23 238 L 18 244 Z", RED) + f'<rect x="-30" y="132" width="40" height="8" fill="{OCHRE}"/>',
               "rotate(-6 0 165)")
    return "".join([
        P("M 68 92 C 84 140 88 180 88 214 L 62 222 C 58 186 56 160 50 130 Z", MUSTARD),
        ledger,
        P("M 80 206 L 2 176 L -8 198 L 70 232 Q 94 230 80 206 Z", MUSTARD),
        Ln("M 10 180 L 2 200", BONE, 4),
        P("M 2 174 L -24 178 Q -34 188 -26 199 L -6 202 Z", skin),
    ])

def athena(v, expr="neutral", dx=0):
    return body_standing(v) + head(v, expr, dx) + arm_ledger(v)

# ---------- shopfronts (viewBox 0 0 300 400) ----------
def shop(label, happy=True):
    facade = SAND if happy else STONE
    stripes = "".join(f'<rect x="{14 + i*34}" y="146" width="17" height="50" fill="{RED if happy else DEEP}"/>' for i in range(8))
    awning_clip = "M 24 146 L 276 146 L 292 196 L 8 196 Z" if happy else "M 24 146 L 276 146 L 290 206 Q 150 186 10 206 Z"
    eyes = (f'<rect x="46" y="216" width="76" height="70" fill="{OCHRE}" stroke="{INK}" stroke-width="{SW}"/>'
            f'<rect x="178" y="216" width="76" height="70" fill="{OCHRE}" stroke="{INK}" stroke-width="{SW}"/>'
            f'<circle cx="94" cy="252" r="10" fill="{INK}"/><circle cx="226" cy="252" r="10" fill="{INK}"/>'
            f'<circle cx="97" cy="248" r="3" fill="{BONE}"/><circle cx="229" cy="248" r="3" fill="{BONE}"/>') if happy else (
            f'<rect x="46" y="216" width="76" height="70" fill="#3A3533" stroke="{INK}" stroke-width="{SW}"/>'
            f'<rect x="178" y="216" width="76" height="70" fill="#3A3533" stroke="{INK}" stroke-width="{SW}"/>'
            f'<circle cx="72" cy="266" r="9" fill="{BONE}"/><circle cx="204" cy="266" r="9" fill="{BONE}"/>'
            f'<rect x="46" y="216" width="76" height="34" fill="{facade}" stroke="{INK}" stroke-width="{SW}"/>'
            f'<rect x="178" y="216" width="76" height="34" fill="{facade}" stroke="{INK}" stroke-width="{SW}"/>')
    cheeks = f'<rect x="58" y="296" width="18" height="10" fill="{BLUSH}"/><rect x="224" y="296" width="18" height="10" fill="{BLUSH}"/>' if happy else ""
    mouth = Ln("M 118 300 Q 150 324 182 300") if happy else Ln("M 116 310 Q 133 302 150 310 Q 167 318 184 310")
    door = P("M 124 328 L 176 328 L 176 392 L 124 392 Z", SAGE if happy else "#8C857C") + f'<rect x="164" y="356" width="6" height="8" fill="{OCHRE if happy else INK}"/>'
    plants = (P("M 206 364 L 274 364 L 270 392 L 210 392 Z", DEEP) + P("M 216 364 Q 210 336 226 330 Q 232 346 226 364 Z", SAGE) +
              P("M 236 364 Q 236 326 250 318 Q 256 342 246 364 Z", SAGE) + P("M 256 364 Q 262 340 274 338 Q 272 356 264 364 Z", SAGE)) if happy else \
             Ln("M 40 330 L 52 352 L 46 370 L 58 392", INK, 3.5)
    sign = (f'<rect x="40" y="86" width="220" height="50" fill="{INK}"/>'
            f'<text x="150" y="121" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="500" font-size="30" letter-spacing="5" fill="{BONE}">{label}</text>')
    if not happy:
        sign = g(sign, "rotate(-4 150 111)")
    return "".join([
        f'<rect x="14" y="70" width="272" height="322" fill="{facade}" stroke="{INK}" stroke-width="{SW}"/>',
        f'<rect x="4" y="56" width="292" height="20" fill="{INK}"/>',
        sign,
        f'<clipPath id="aw-{label.replace(" ", "")}"><path d="{awning_clip}"/></clipPath>',
        f'<path d="{awning_clip}" fill="{BONE}"/>',
        f'<g clip-path="url(#aw-{label.replace(" ", "")})">{stripes}</g>',
        P(awning_clip, "none"),
        eyes, cheeks, mouth, door, plants,
        Ln("M 4 392 L 296 392", INK, SW),
    ])

FONTS = ("<style>@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300&amp;display=swap');"
         "@font-face{font-family:Archivo;font-weight:500;src:url('../../../../assets/fonts/archivo/Archivo-Medium.ttf')}"
         f".kick{{font-family:Archivo,sans-serif;font-weight:500;font-size:24px;letter-spacing:.22em;fill:{DEEP}}}"
         f".title{{font-family:Newsreader,Georgia,serif;font-weight:300;font-size:60px;fill:{INK}}}"
         f".lab{{font-family:Archivo,sans-serif;font-weight:500;font-size:20px;fill:{GREY}}}</style>")

def svg(w, h, inner, bg=BONE):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{FONTS}<rect width="{w}" height="{h}" fill="{bg}"/>{inner}</svg>'

# sheet 1: three variants + expressions + shopfronts
parts = ['<text class="kick" x="70" y="90">THE OPERATOR’S LEDGER · STYLE TEST</text>',
         '<text class="title" x="70" y="160">A warmer Athena</text>']
for i, v in enumerate(VARIANTS):
    x = 200 + i * 340
    parts.append(g(athena(v), f"translate({x} 330) scale(.62)"))
    parts.append(f'<text class="lab" x="{x-110}" y="740">{v["key"].upper()} · {v["label"]}</text>')
vb = VARIANTS[1]
for k, e in enumerate(["neutral", "puzzled", "worried", "resolved"]):
    x = 150 + k * 190
    parts.append(g(head(vb, e), f"translate({x} 880) scale(.95)"))
    parts.append(f'<text class="lab" x="{x-50}" y="990">{e.upper()}</text>')
parts.append(g(shop("SITE 1", True), "translate(110 1010) scale(.8)"))
parts.append(g(shop("SITE 10", False), "translate(560 1010) scale(.8)"))
sheet = svg(1080, 1350, "".join(parts))
open(os.path.join(OUT, "style-test.svg"), "w", encoding="utf-8").write(sheet)

# sheet 2: scene 1 mock on red, variant B
m = ['<text x="86" y="214" font-family="Archivo, sans-serif" font-weight="500" font-size="28" letter-spacing="6" fill="#F3F2F2">THE OPERATOR’S LEDGER · EPISODE 1</text>',
     '<text x="86" y="340" font-family="Newsreader, Georgia, serif" font-weight="300" font-size="112" fill="#F3F2F2">Unit economics</text>',
     f'<rect x="86" y="956" width="908" height="5" fill="{INK}"/>',
     g(shop("SITE 1", True), "translate(80 600) scale(.9)"),
     g(shop("SITE 10", False), "translate(730 600) scale(.9)"),
     g(athena(vb, "puzzled", 6), "translate(540 520) scale(.73)"),
     f'<rect x="86" y="1052" width="352" height="70" fill="{INK}"/>',
     '<text x="106" y="1100" font-family="Archivo, sans-serif" font-weight="500" font-size="44" fill="#F3F2F2">What changed?</text>']
open(os.path.join(OUT, "scene-1-mock.svg"), "w", encoding="utf-8").write(svg(1080, 1350, "".join(m), RED))

html = ('<!doctype html><meta charset="utf-8"><title>Athena style test</title>'
        '<style>body{margin:0;background:#D6D2CF;padding:16px;display:flex;flex-wrap:wrap;gap:16px}body>svg{width:min(560px,100%);height:auto}</style>'
        + sheet + open(os.path.join(OUT, "scene-1-mock.svg"), encoding="utf-8").read())
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
print("ok")
