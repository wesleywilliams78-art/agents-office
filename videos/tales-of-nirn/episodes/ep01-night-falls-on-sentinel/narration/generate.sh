#!/bin/bash
# generate.sh <narration dir>: every line of lines.tsv in the Tales of Nirn narrator (VoxCPM2, cloned from the Night Reader audition)
D="$1"; R="$D/../../../voice/passage/ref"; mkdir -p "$D/lines/raw"; REF="$(cat "$R/ref.txt")"; i=0
while IFS=$'\t' read -r pause breath text; do i=$((i+1)); n=$(printf %03d $i); out="$D/lines/raw/$n.wav"
  [ -s "$out" ] && continue
  t=$(echo "$text" | tr -d '"')
  for try in 1 2 3; do
    code=$(curl -s -m 300 -X POST http://127.0.0.1:3900/generate -F "text=$t" -F engine=voxcpm2 -F language=en -F "ref_audio=@$R/night-reader.wav" -F "ref_text=$REF" -F seed=53 -o "$out" -w "%{http_code}")
    [ "$code" = "200" ] && break
  done
  echo "$n $code"
done < "$D/lines.tsv"
