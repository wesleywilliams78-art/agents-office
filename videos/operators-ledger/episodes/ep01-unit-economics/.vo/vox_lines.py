"""Generate voiceover with VoiceStudio + VoxCPM2 from a saved voice profile, sentence by sentence.
  python .vo/vox_lines.py <profile_id> <out_dir> s1 s2 ...   -> <out_dir>/<scene>.wav (sentences joined with breathing pauses)
Pauses: PAUSE after each sentence, a shorter COMMA_PAUSE is left to the model."""
import json, os, re, subprocess, sys

PROFILE, OUT, SCENES = sys.argv[1], sys.argv[2], sys.argv[3:]
PAUSE = 0.42           # breath between sentences
SPEED = float(os.environ.get("VOX_SPEED", "1.0"))
SEED = int(os.environ.get("VOX_SEED", "7"))
lines = dict(l.rstrip("\n").split("\t") for l in open(".vo/lines.tsv", encoding="utf-8"))
os.makedirs(OUT, exist_ok=True)

def speak(text, out):
    body = {"model": "voxcpm2", "input": text, "voice": PROFILE, "language": "en", "seed": SEED, "speed": SPEED, "response_format": "wav"}
    r = subprocess.run(["curl", "-s", "-m", "900", "-X", "POST", "http://127.0.0.1:3900/v1/audio/speech", "-H", "content-type: application/json",
                        "-d", json.dumps(body), "-o", out, "-w", "%{http_code}"], capture_output=True, text=True)
    if r.stdout != "200":
        raise SystemExit(f"speech failed ({r.stdout}) for: {text}\n" + open(out, errors="ignore").read()[:400])

def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)

for sid in SCENES:
    sents = [s.strip() for s in re.findall(r"[^.?!]+[.?!]", lines[sid])]
    parts = []
    for i, s in enumerate(sents):
        f = os.path.join(OUT, f"{sid}-{i:02d}.wav"); speak(s, f)
        # trim the model's own leading/trailing silence so the pauses are ours
        t = f.replace(".wav", "-t.wav")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f, "-af",
                        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse",
                        "-ar", "48000", t], check=True)
        parts.append(t)
    inputs, filt = [], []
    for i, p in enumerate(parts):
        inputs += ["-i", p]
        pad = PAUSE if i < len(parts) - 1 else 0
        filt.append(f"[{i}:a]aresample=48000,apad=pad_dur={pad}[p{i}]")
    filt.append("".join(f"[p{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=0:a=1[o]")
    out = os.path.join(OUT, f"{sid}.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[o]", "-ar", "48000", "-ac", "1", out], check=True)
    words = len(lines[sid].split()); d = dur(out)
    print(f"{sid}: {d:.2f}s, {words} words, {words / d * 60:.0f} wpm")
