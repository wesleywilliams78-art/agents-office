"""Voice audition: read scenes 1-2 sentence by sentence (slower, with breathing pauses) and lay them over the music bed.
Writes .vo/try/sample-<voice>.mp3."""
import re, subprocess, os, sys

VOICES = sys.argv[1:] or ["bf_emma", "bf_isabella", "bm_fable", "bm_daniel"]
SPEED, PAUSE, PARA = 0.9, 0.45, 0.9
lines = dict(l.rstrip("\n").split("\t") for l in open(".vo/lines.tsv", encoding="utf-8"))
paras = [lines["s1"], lines["s2"]]
os.makedirs(".vo/try", exist_ok=True)

def tts(text, voice, out):
    subprocess.run(f'npx hyperframes tts "{text}" -v {voice} -s {SPEED} -o {out}', shell=True, check=True, capture_output=True)

for v in VOICES:
    parts, k = [], 0
    for pi, para in enumerate(paras):
        for sent in re.findall(r"[^.?!]+[.?!]", para):
            f = f".vo/try/{v}-{k}.wav"; tts(sent.strip(), v, f); parts.append((f, PAUSE)); k += 1
        parts[-1] = (parts[-1][0], PARA)
    # concat with silences, then mix over the music at the episode's levels
    inputs, filt = [], []
    for i, (f, gap) in enumerate(parts):
        inputs += ["-i", f]
        filt.append(f"[{i}:a]aresample=24000,apad=pad_dur={gap}[p{i}]")
    n = len(parts)
    filt.append("".join(f"[p{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,volume=1.7,adelay=600|600[vo]")
    filt.append(f"[{n}:a]volume=0.14,afade=t=in:d=1[mu]")
    filt.append("[vo][mu]amix=inputs=2:duration=first:normalize=0,apad=pad_dur=1.5[out]")
    cmd = ["ffmpeg", "-y", *inputs, "-i", "assets/music-bed.mp3", "-filter_complex", ";".join(filt), "-map", "[out]", "-b:a", "192k", f".vo/try/sample-{v}.mp3"]
    subprocess.run(cmd, check=True, capture_output=True)
    print("ok", v)
