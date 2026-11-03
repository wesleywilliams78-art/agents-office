#!/bin/bash
# check.sh <narration dir> [line numbers...]: transcribe lines with Whisper and score them against the script
D="$1"; shift; mkdir -p "$D/lines/heard"
for f in "$D"/lines/raw/*.wav; do n=$(basename "$f" .wav)
  if [ $# -gt 0 ] && [[ ! " $* " =~ " $n " ]]; then continue; fi
  curl -s -m 120 -X POST http://127.0.0.1:3900/v1/audio/transcriptions -F "file=@$f" -F model=whisper-1 -F language=en | python -I -c "import sys,json;print(json.load(sys.stdin).get('text',''))" > "$D/lines/heard/$n.txt"
done
python -I "$D/score.py" "$D"
