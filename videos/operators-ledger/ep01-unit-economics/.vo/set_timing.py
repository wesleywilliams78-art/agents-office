"""Set data-start / data-duration (and optionally data-volume) on elements of index.html by id.
Attribute-order and extra-attribute safe (Studio adds data-hf-id). Usage: edit TIMING below, run once."""
import json, re, subprocess

NEW = json.load(open(".vo/words-new.json"))
TOTAL = 104.7
TIMING = {  # id: (start, duration, volume or None)
    "root": (0, TOTAL, None),
    "cold": (0, 9.2, None), "define": (9.2, 12.8, None), "bars": (22.0, 42.2, None), "breakeven": (64.2, 17.4, None),
    "model": (81.6, 11.4, None), "question": (93.0, 8.7, None), "endcard": (101.7, 3, None), "captions": (0, 101.7, None),
    "music": (0, TOTAL, 0.125),
    "sfx-tick-1": (19.89, None, None), "sfx-tick-2": (24.54, None, None), "sfx-tick-3": (33.17, None, None),
    "sfx-tick-4": (44.81, None, None), "sfx-thud": (60.05, None, None), "sfx-tick-5": (73.56, None, None),
}
VO_START = {"s1": 0.3, "s2": 9.4, "s3": 22.4, "s4": 39.0, "s5": 64.5, "s6": 81.9, "s7": 93.3}

# voice gain: bring the cloned read to about -17 LUFS before the mix (true peak kept under -1 dBTP)
def lufs(path):
    out = subprocess.run(["npx", "hyperframes", "audio", path, "--json"], capture_output=True, text=True, shell=True).stdout
    return json.loads(out)["items"][0]["loudness"]
loud = [lufs(f"assets/vo/{s}.wav") for s in VO_START]
avg = sum(l["lufsIntegrated"] for l in loud) / len(loud)
peak = max(l["truePeakDb"] for l in loud)
gain_db = min(-17 - avg, -1.0 - peak)
vo_vol = round(10 ** (gain_db / 20), 2)
print(f"voice: {avg:.1f} LUFS avg, peak {peak:.1f} dBTP -> gain {gain_db:+.1f} dB (volume {vo_vol})")
for sid, st in VO_START.items():
    TIMING[f"vo-{sid}"] = (st, NEW[sid]["duration"], vo_vol)

s = open("index.html", encoding="utf-8").read()
def set_attr(tag, name, val):
    if re.search(rf'\b{name}="[^"]*"', tag):
        return re.sub(rf'\b{name}="[^"]*"', f'{name}="{val}"', tag, count=1)
    return tag.replace(">", f' {name}="{val}">', 1) if tag.endswith(">") else tag
for el, (st, du, vol) in TIMING.items():
    m = re.search(rf'<(div|audio)\b[^>]*?\bid="{re.escape(el)}"[^>]*>', s, flags=re.S)
    assert m, el
    tag = m.group(0)
    new = set_attr(tag, "data-start", st)
    if du is not None: new = set_attr(new, "data-duration", du)
    if vol is not None: new = set_attr(new, "data-volume", vol)
    s = s[:m.start()] + new + s[m.end():]
s = s.replace("<!-- voiceover (Kokoro bm_george, pilot only: replace with Wesley's recording) -->",
              "<!-- voiceover: Wesley's cloned voice (VoiceStudio profile ca7acc09, VoxCPM2, Apache-2.0) -->")
s = s.replace("<!-- music bed: ACE-Step 1.5 local (job mmvm9y22n31k), ~ -17 dB under the voice -->",
              "<!-- music bed: ACE-Step 1.5 local (job mmvmdhehecoz, 112 s), ~ -17 dB under the voice -->")
open("index.html", "w", encoding="utf-8").write(s)
print("ok")
