"""Approximate word timings for a known script: find speech runs with ffmpeg
silencedetect, then spread the words across speech time by character weight.
Writes .vo/words.json: {scene: {"duration": s, "words": [{text,start,end}]}}."""
import json, re, subprocess, sys

def speech_runs(wav):
    out = subprocess.run(["ffmpeg", "-i", wav, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    dur = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups()[2]) + \
        60 * float(re.search(r"Duration: (\d+):(\d+)", out).groups()[1])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    runs, t = [], 0.0
    for s, e in zip(starts, ends + [dur] * (len(starts) - len(ends))):
        if s > t + 0.02:
            runs.append((t, s))
        t = e
    if t < dur - 0.02:
        runs.append((t, dur))
    return dur, runs

def align(text, runs):
    words = text.split()
    # each pause in the audio should fall after a punctuated word; match runs to phrase groups
    phrases, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[.,:?;]$", w):
            phrases.append(cur); cur = []
    if cur: phrases.append(cur)
    weight = lambda ws: sum(len(w) + 1 for w in ws)
    out = []
    if len(runs) == len(phrases):
        groups = list(zip(phrases, runs))
    else:  # fall back: one stretch of speech time across all words
        groups = [(words, None)]
    for ws, run in groups:
        if run is None:
            # concatenate runs into one speech timeline
            total = sum(e - s for s, e in runs)
            pos, acc = 0.0, []
            for w in ws:
                acc.append((w, pos, pos + total * (len(w) + 1) / weight(ws))); pos = acc[-1][2]
            def to_t(x):
                for s, e in runs:
                    if x <= e - s: return s + x
                    x -= e - s
                return runs[-1][1]
            out += [dict(text=w, start=round(to_t(a), 3), end=round(to_t(b), 3)) for w, a, b in acc]
        else:
            s, e = run
            t = s
            for w in ws:
                d = (e - s) * (len(w) + 1) / weight(ws)
                out.append(dict(text=w, start=round(t, 3), end=round(t + d, 3))); t += d
    return out

res = {}
for line in open(".vo/lines.tsv", encoding="utf-8"):
    sid, text = line.rstrip("\n").split("\t")
    dur, runs = speech_runs(f"assets/vo/{sid}.wav")
    words = align(text, runs)
    res[sid] = dict(duration=round(dur, 3), runs=len(runs), words=words)
    print(sid, f"{dur:.2f}s runs={len(runs)} phrases-matched={'yes' if len(runs) == len(re.findall(r'[.,:?;](?:\s|$)', text + ' ')) else 'no'}")
    print("   ", " ".join(f"{w['text']}@{w['start']:.2f}" for w in words))
json.dump(res, open(".vo/words.json", "w"), indent=1)
