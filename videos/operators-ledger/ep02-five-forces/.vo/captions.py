"""Build compositions/captions.html from .vo/words.json and the scene voiceover offsets."""
import json, re, html

OFFSETS = {"s1": 0.3, "s2": 12.6, "s3": 28.6, "s4": 49.1, "s5": 65.2, "s6": 80.2, "s7": 96.3}
MAX_WORDS = 6
data = json.load(open(".vo/words-new.json"))

groups = []
for sid, off in OFFSETS.items():
    cur = []
    words = data[sid]["words"]
    for i, w in enumerate(words):
        cur.append(w)
        end_here = re.search(r"[.?:]$", w["text"]) or (re.search(r",$", w["text"]) and len(cur) >= 3) or len(cur) >= MAX_WORDS
        if end_here or i == len(words) - 1:
            groups.append(dict(text=" ".join(x["text"] for x in cur).replace("P and L", "P&L"), start=cur[0]["start"] + off, end=cur[-1]["end"] + off))
            cur = []

# open slightly before the first word, close after the last, never overlapping the next group
for i, g in enumerate(groups):
    g["open"] = round(max(0.1, g["start"] - 0.05), 2)
    nxt = groups[i + 1]["start"] - 0.05 if i + 1 < len(groups) else g["end"] + 0.4
    g["close"] = round(min(g["end"] + 0.35, nxt), 2)

items = "\n".join(
    f'    <div id="cap-{i}" class="cap clip" data-start="{g["open"]}" data-duration="{round(g["close"] - g["open"], 2)}" data-track-index="0"><span>{html.escape(g["text"])}</span></div>'
    for i, g in enumerate(groups))
doc = f"""<template>
  <style>
    @font-face {{ font-family: "Archivo"; font-weight: 500; src: url("assets/fonts/Archivo-Medium.ttf") format("truetype"); }}
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cap {{ position: absolute; left: 86px; bottom: 168px; width: 908px; text-align: center; }}
    .cap span {{ display: inline; background: #201e1d; color: #f3f2f2; font: 500 44px/1.5 "Archivo", sans-serif;
      padding: 8px 20px; -webkit-box-decoration-break: clone; box-decoration-break: clone; font-variant-numeric: tabular-nums; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1350">
{items}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.set({{}}, {{}}, 103.9);
    window.__timelines["captions"] = tl;
  </script>
</template>
"""
open("compositions/captions.html", "w", encoding="utf-8").write(doc)
print(len(groups), "groups")
for g in groups:
    print(f'{g["open"]:6.2f}-{g["close"]:6.2f}  {g["text"]}')
