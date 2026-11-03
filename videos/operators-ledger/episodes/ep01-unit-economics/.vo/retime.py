"""Retime Episode 01 to a new voiceover.
Every animation was keyed to a word in the old read (.vo/words.json). This maps each old word time to the same word in the
new read (.vo/words-new.json) with a piecewise-linear warp per scene, sets new scene slots from the new line lengths,
moves the sound effects with their pictures, and rewrites index.html timings. Run once per new voiceover."""
import json, re

OLD = json.load(open(".vo/words.json"))
NEW = json.load(open(".vo/words-new.json"))
VO_DIR = "assets/vo"
SCENES = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"]
OFFSET = {"s1": 0.3, "s2": 0.2, "s3": 0.4, "s4": 0.3, "s5": 0.3, "s6": 0.3, "s7": 0.3}
TAIL = {"s1": 0.8, "s2": 0.8, "s3": 2.4, "s4": 2.1, "s5": 2.5, "s6": 2.4, "s7": 2.4}   # hold after the last word
END_CARD = 3.0

def pairs(sid):
    o, n = OLD[sid]["words"], NEW[sid]["words"]
    assert len(o) == len(n), sid
    P = [(0.0, 0.0)]
    for a, b in zip(o, n):
        if a["start"] > P[-1][0] + 1e-3 and b["start"] > P[-1][1] + 1e-3:
            P.append((round(a["start"], 3), round(b["start"], 3)))
    P.append((round(OLD[sid]["duration"], 3), round(NEW[sid]["duration"], 3)))
    return P

def warp(P, t):
    if t <= P[0][0]: return P[0][1] + t - P[0][0]
    for (a0, b0), (a1, b1) in zip(P, P[1:]):
        if t <= a1: return b0 + (b1 - b0) * (t - a0) / ((a1 - a0) or 1)
    return P[-1][1] + t - P[-1][0]

W = {s: pairs(s) for s in SCENES}
dur = {s: NEW[s]["duration"] for s in SCENES}
slot = {s: round(OFFSET[s] + dur[s] + TAIL[s] + 0.049, 1) for s in SCENES}
hosts = [("cold", ["s1"]), ("define", ["s2"]), ("bars", ["s3", "s4"]), ("breakeven", ["s5"]), ("model", ["s6"]), ("question", ["s7"])]
start, t = {}, 0.0
for h, ss in hosts:
    start[h] = round(t, 2); t += sum(slot[s] for s in ss)
start["endcard"] = round(t, 2); TOTAL = round(t + END_CARD, 2)
S4 = slot["s3"]                                     # where scene 4 begins inside bars.html
vo_abs = {"s1": start["cold"] + OFFSET["s1"], "s2": start["define"] + OFFSET["s2"], "s3": start["bars"] + OFFSET["s3"],
          "s4": start["bars"] + S4 + OFFSET["s4"], "s5": start["breakeven"] + OFFSET["s5"], "s6": start["model"] + OFFSET["s6"],
          "s7": start["question"] + OFFSET["s7"]}

JS_WARP = ("const warp = (P, t) => { if (t <= P[0][0]) return P[0][1] + t - P[0][0];"
           " for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [a0, b0] = P[i - 1], [a1, b1] = P[i];"
           " return b0 + (b1 - b0) * (t - a0) / ((a1 - a0) || 1); } const L = P[P.length - 1]; return L[1] + t - L[0]; };")
js = lambda P: json.dumps([list(p) for p in P])

def edit(path, pairs_):
    s = open(path, encoding="utf-8").read()
    for a, b in pairs_:
        assert a in s, (path, a); s = s.replace(a, b, 1)
    open(path, "w", encoding="utf-8").write(s)

HEAD = "const tl = gsap.timeline({ paused: true });"
edit("compositions/cold.html", [
    (HEAD, HEAD + f"\n    // retimed to the voiceover: old word time -> new word time\n    {JS_WARP}\n    const T = (w) => {OFFSET['s1']} + warp({js(W['s1'])}, w);"),
    ('pose("#s1-p-left", 1.4);', 'pose("#s1-p-left", T(1.1));'),
    ('pose("#s1-p-right", 2.5);', 'pose("#s1-p-right", T(2.2));'),
    ('ease: "power2.inOut" }, 2.9);', 'ease: "power2.inOut" }, T(2.6));'),
    ('ease: "power2.inOut" }, 2.9);', 'ease: "power2.inOut" }, T(2.6));'),
    ('ease: "power3.out" }, 2.9);', 'ease: "power3.out" }, T(2.6));'),
    ('pose("#s1-p-neutral", 3.8);', 'pose("#s1-p-neutral", T(3.5));'),
    ('ease: "power2.out" }, 5.4);', 'ease: "power2.out" }, T(5.1));'),
    ('pose("#s1-p-scratch", 5.55);', 'pose("#s1-p-scratch", T(5.25));'),
    ('ease: "power3.out" }, 5.55);', 'ease: "power3.out" }, T(5.25));'),
    ("tl.set({}, {}, 7);", f"tl.set({{}}, {{}}, {slot['s1']});"),
])
edit("compositions/define.html", [
    ("const T = (w) => w + 0.2; // voiceover starts 0.2 s into the scene",
     f"{JS_WARP}\n    const T = (w) => {OFFSET['s2']} + warp({js(W['s2'])}, w); // voiceover starts 0.2 s in; old word time -> new"),
    ("tl.set({}, {}, 11);", f"tl.set({{}}, {{}}, {slot['s2']});"),
])
edit("compositions/bars.html", [
    ("const A = (w) => w + 0.4;", f"{JS_WARP}\n    const A = (w) => {OFFSET['s3']} + warp({js(W['s3'])}, w); // old word time -> new"),
    ("const B = (w) => w + 15.3;", f"const S4 = {S4}; // scene 4 starts here\n    const B = (w) => S4 + {OFFSET['s4']} + warp({js(W['s4'])}, w);"),
    ('ease: "power2.in" }, 15.0);', 'ease: "power2.in" }, S4);'),
    ("// ---- Scene 4: SITE 10 (scene starts at 15 s, voiceover at 15.3 s) ----", "// ---- Scene 4: SITE 10 (starts at S4, voiceover 0.3 s later) ----"),
    ("tl.set({}, {}, 35);", f"tl.set({{}}, {{}}, {round(slot['s3'] + slot['s4'], 2)});"),
])
edit("compositions/breakeven.html", [
    ("const T = (w) => w + 0.3; // voiceover starts 0.3 s into the scene",
     f"{JS_WARP}\n    const T = (w) => {OFFSET['s5']} + warp({js(W['s5'])}, w); // voiceover starts 0.3 s in; old word time -> new"),
    ("duration: 3.2, ease", "duration: T(7.3) - T(4.1), ease"),
    ("tl.set({}, {}, 16);", f"tl.set({{}}, {{}}, {slot['s5']});"),
])
for name, sid in (("model", "s6"), ("question", "s7")):
    edit(f"compositions/{name}.html", [
        ("const T = (w) => w + 0.3; // voiceover starts 0.3 s into the scene",
         f"{JS_WARP}\n    const T = (w) => {OFFSET[sid]} + warp({js(W[sid])}, w); // voiceover starts 0.3 s in; old word time -> new"),
        ({"model": "tl.set({}, {}, 10);", "question": "tl.set({}, {}, 8);"}[name], f"tl.set({{}}, {{}}, {slot[sid]});"),
    ])

# sound effects follow their pictures (picture time in old scene words -> new); tick/thud peak 0.073 s in, land 1 frame late
def at(host, sid, w):  # absolute time of an event keyed to old word time w in scene sid
    base = start[host] + (S4 if sid == "s4" else 0)
    return base + OFFSET[sid] + warp(W[sid], w)
sfx = {
    "sfx-tick-1": at("define", "s2", 9.4) + 0.2,          # profit block fills
    "sfx-tick-2": at("bars", "s3", 1.1) + 1.4,            # £20,000 lands (count runs 1.4 s)
    "sfx-tick-3": at("bars", "s3", 8.7) + 0.7,            # profit segment lands
    "sfx-tick-4": at("bars", "s4", 3.0) + 1.4,            # £13,000 lands
    "sfx-thud":   at("bars", "s4", 16.0),                 # −£300 lands
    "sfx-tick-5": at("breakeven", "s5", 8.2),             # break-even label
}
s = open("index.html", encoding="utf-8").read()
s = re.sub(r'(id="root" data-composition-id="main" data-start="0" data-duration=")[\d.]+', rf"\g<1>{TOTAL}", s)
for h, ss in hosts + [("endcard", [])]:
    d = END_CARD if h == "endcard" else round(sum(slot[x] for x in ss), 2)
    s = re.sub(rf'(<div id="{h}" data-composition-id="{h}" data-composition-src="compositions/{h}.html"\s+data-start=")[\d.]+(" data-duration=")[\d.]+',
               rf"\g<1>{start[h]}\g<2>{d}", s)
s = re.sub(r'(<div id="captions"[^>]*?data-start="0" data-duration=")[\d.]+', rf"\g<1>{start['endcard']}", s, flags=re.S)
for sid in SCENES:
    s = re.sub(rf'(<audio id="vo-{sid}" class="clip" src=")[^"]+(" data-duration=")[\d.]+(" data-start=")[\d.]+',
               rf"\g<1>{VO_DIR}/{sid}.wav\g<2>{dur[sid]}\g<3>{round(vo_abs[sid], 2)}", s)
for k, v in sfx.items():
    s = re.sub(rf'(<audio id="{k}" class="clip" src="[^"]+" data-start=")[\d.]+', rf"\g<1>{round(v - 0.04, 2)}", s)
s = re.sub(r'(<audio id="music" class="clip" src="assets/music-bed.mp3" data-start="0" data-duration=")[\d.]+', rf"\g<1>{TOTAL}", s)
open("index.html", "w", encoding="utf-8").write(s)

# captions: new offsets and length
c = open(".vo/captions.py", encoding="utf-8").read()
c = re.sub(r"OFFSETS = \{[^}]*\}", "OFFSETS = " + json.dumps({k: round(v, 2) for k, v in vo_abs.items()}), c)
c = c.replace('data = json.load(open(".vo/words.json"))', 'data = json.load(open(".vo/words-new.json"))')
c = re.sub(r"tl\.set\(\{\{\}\}, \{\{\}\}, [\d.]+\);", f"tl.set({{{{}}}}, {{{{}}}}, {start['endcard']});", c)
open(".vo/captions.py", "w", encoding="utf-8").write(c)

print("slots", slot); print("starts", start, "total", TOTAL); print("vo", {k: round(v, 2) for k, v in vo_abs.items()})
print("sfx", {k: round(v, 2) for k, v in sfx.items()})
