"""Exact word timings for the voiceover: transcribe each scene with VoiceStudio's Whisper, align the transcript to the
script word by word, and write .vo/words.json in the shape captions.py expects (script words, real times).
Also reports missing or extra words and long gaps so a bad take can be regenerated.
  python .vo/whisper_words.py <vo_dir>"""
import difflib, json, re, subprocess, sys

VO = sys.argv[1]
lines = dict(l.rstrip("\n").split("\t") for l in open(".vo/lines.tsv", encoding="utf-8"))
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower().replace("labor", "labour"))

def transcribe(path):
    r = subprocess.run(["curl", "-s", "-m", "600", "-X", "POST", "http://127.0.0.1:3900/v1/audio/transcriptions", "-F", f"file=@{path}",
                        "-F", "model=Systran/faster-whisper-large-v3", "-F", "response_format=verbose_json",
                        "-F", "timestamp_granularities[]=word", "-F", "language=en"], capture_output=True, text=True)
    return json.loads(r.stdout)

out, ok = {}, True
for sid, text in lines.items():
    path = f"{VO}/{sid}.wav"
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout)
    d = transcribe(path)
    heard = [w for w in d.get("words", []) if norm(w["word"])]
    script = text.split()
    # whisper may split "twenty-eight" or "four-wall" differently: compare on a joined, hyphen-free basis
    sm = difflib.SequenceMatcher(a=[norm(w) for w in script], b=[norm(w["word"]) for w in heard], autojunk=False)
    times = [None] * len(script)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k]["start"], heard[j1 + k]["end"])
        elif tag == "replace" and j2 > j1:  # e.g. "twenty-eight" heard as "28" or as two words: spread the span
            s, e = heard[j1]["start"], heard[j2 - 1]["end"]
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
    # any word still without a time: interpolate between neighbours
    for i, t in enumerate(times):
        if t is None:
            prev = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.0)
            nxt = next((times[j][0] for j in range(i + 1, len(times)) if times[j]), dur)
            times[i] = (prev, nxt)
    diffs = [(tag, script[i1:i2], [w["word"] for w in heard[j1:j2]]) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != "equal"]
    real = [(t, a, b) for t, a, b in diffs if not (t == "replace" and norm("".join(a)) == norm("".join(b)))]
    gaps = [(round(heard[k + 1]["start"] - heard[k]["end"], 2), heard[k]["word"]) for k in range(len(heard) - 1) if heard[k + 1]["start"] - heard[k]["end"] > 0.9]
    print(f"{sid}: {dur:.2f}s heard: {d.get('text', '').strip()}")
    if real: print("   DIFF:", real); ok = False
    if gaps: print("   long gaps:", gaps)
    out[sid] = dict(duration=round(dur, 3), words=[dict(text=w, start=round(a, 3), end=round(b, 3)) for w, (a, b) in zip(script, times)])
json.dump(out, open(".vo/words-new.json", "w"), indent=1)
print("ALL WORDS MATCH" if ok else "CHECK DIFFS ABOVE")
