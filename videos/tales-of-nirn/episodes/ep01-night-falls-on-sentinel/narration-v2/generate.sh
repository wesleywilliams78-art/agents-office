#!/bin/bash
# generate.sh <narration dir>: every line of lines.tsv in the approved take A (2 Nov): the Night Reader reference,
# steered to a deep, slow, intimate read; VoiceStudio raw output at max quality (no effect preset, no denoiser).
D="$1"; R="$D/../../../voice/passage/ref"; mkdir -p "$D/lines/raw"; REF="$(cat "$R/ref.txt")"; i=0
INS="A woman narrator with a warm, low contralto female voice, speaking slowly and calmly, unhurried, clear and intimate"   # always a woman: the old wording tipped lines male
while IFS=$'\t' read -r pause breath text; do i=$((i+1)); n=$(printf %03d $i); out="$D/lines/raw/$n.wav"
  [ -s "$out" ] && continue
  t=$(echo "$text" | tr -d '"')
  for try in 1 2 3; do
    code=$(curl -s -m 600 -X POST http://127.0.0.1:3900/generate -F "text=$t" -F engine=voxcpm2 -F language=en -F "ref_audio=@$R/night-reader.wav" -F "ref_text=$REF" -F seed=${SEED:-53} -F effect_preset=raw -F denoise=false -F "instruct=$INS" -o "$out" -w "%{http_code}")
    [ "$code" = "200" ] && break
  done
  echo "$n $code"
done < "$D/lines.tsv"
