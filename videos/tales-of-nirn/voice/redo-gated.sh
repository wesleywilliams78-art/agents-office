#!/bin/bash
# redo-gated.sh <narration dir> <line numbers...>
# Re-voice the given lines in the series voice and keep a take only when it passes BOTH gates:
# her pitch register (gate.py: a woman's voice, never a male-sounding one) and the words (Whisper hears the line).
# Tries up to six seeds per line; reports any line that never passed.
D="$1"; shift; V="$(cd "$(dirname "$0")" && pwd)"; R="$V/passage/ref"; REF="$(cat "$R/ref.txt")"
INS="A woman narrator with a warm, low contralto female voice, speaking slowly and calmly, unhurried, clear and intimate"
mkdir -p "$D/lines/try" "$D/lines/heard"; fails=""
for n in "$@"; do i=$((10#$n)); ok=0
  t=$(sed -n "${i}p" "$D/lines.tsv" | cut -f3 | tr -d '"' | sed 's/Jomic/Joe-mick/g; s/Haballa/Ha-bah-la/g' | { [ -f "$D/respell.sed" ] && sed -f "$D/respell.sed" || cat; })   # the episode's own respellings for the voice
  for seed in ${SEEDS:-53 61 67 71 79 83}; do
    rm -f "$D/lines/try/"*.wav
    code=$(curl -s -m 600 -X POST http://127.0.0.1:3900/generate -F "text=$t" -F engine=voxcpm2 -F language=en -F "ref_audio=@$R/night-reader.wav" -F "ref_text=$REF" -F seed=$seed -F effect_preset=raw -F denoise=false -F "instruct=$INS" -o "$D/lines/try/$n.wav" -w "%{http_code}")
    [ "$code" = "200" ] || { echo "$n s$seed: engine error"; continue; }
    g=$(python -I "$V/gate.py" "$D/lines/try" | head -1)
    if echo "$g" | grep -q FAIL; then echo "$n s$seed: pitch gate: $g"; continue; fi
    h=$(curl -s -m 120 -X POST http://127.0.0.1:3900/v1/audio/transcriptions -F "file=@$D/lines/try/$n.wav" -F model=whisper-1 -F language=en | python -I -c "import sys,json;print(json.load(sys.stdin).get('text',''))")
    [ -n "$h" ] || { echo "$n s$seed: no words heard"; continue; }
    cp "$D/lines/try/$n.wav" "$D/lines/raw/$n.wav"; echo "$h" > "$D/lines/heard/$n.txt"
    echo "$n ok s$seed | $g | $h"; ok=1; break
  done
  [ $ok = 1 ] || fails="$fails $n"
done
echo "NEVER PASSED:${fails:- none}"
