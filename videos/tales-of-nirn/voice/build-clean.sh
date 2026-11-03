#!/bin/bash
# build-clean.sh <dir> <lines subfolder> <out name> [pause scale]
# The light chain (Wesley, 2 Nov: "a lot of AI chop"): VoiceStudio raw output at max quality, no time-stretch, no gain dips.
# Each line: trimmed, the low plosive wind softened (deplosive.py, run before this), then spaced with the script's pauses
# and a soft breath; the whole read gets a gentle master only.
D="$1"; SRC="$2"; OUTN="$3"; PS="${4:-1.0}"; W="$D/work/$SRC"; rm -rf "$W"; mkdir -p "$W"
F="aresample=48000,aformat=channel_layouts=mono:sample_fmts=s16"
sil(){ ffmpeg -v error -y -f lavfi -t "$(awk "BEGIN{print $1*$PS/1000}")" -i "anullsrc=r=48000:cl=mono" -af "$F" "$2"; }
ffmpeg -v error -y -f lavfi -t 0.45 -i "anoisesrc=color=pink:amplitude=0.5:seed=3" -af "highpass=f=450,lowpass=f=2600,equalizer=f=1300:t=q:w=1:g=4,afade=t=in:d=0.3:curve=qsin,afade=t=out:st=0.32:d=0.13,volume=-36dB,$F" "$W/breath.wav"
: > "$W/list.txt"; add(){ echo "file '$1'" >> "$W/list.txt"; }
sil 480 "$W/lead.wav"; add lead.wav; add breath.wav
i=0
while IFS=$'\t' read -r pause breath text; do i=$((i+1)); n=$(printf %03d $i)
  src=$(ls "$D/lines/$SRC/" | sed -n "${i}p")
  # trim the silence (gently, so soft word endings survive), then fade both ends so no line starts or stops on a click
  ffmpeg -v error -y -i "$D/lines/$SRC/$src" -af "silenceremove=start_periods=1:start_threshold=-58dB:start_silence=0.06,areverse,silenceremove=start_periods=1:start_threshold=-58dB:start_silence=0.18,areverse,$F" "$W/t$n.wav"
  dl=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/t$n.wav")
  ffmpeg -v error -y -i "$W/t$n.wav" -af "afade=t=in:d=0.02:curve=qsin,afade=t=out:st=$(awk "BEGIN{print $dl-0.08}"):d=0.08:curve=qsin,$F" "$W/$n.wav"; rm -f "$W/t$n.wav"
  add "$n.wav"
  if [ "$breath" = "1" ]; then sil $((pause-450)) "$W/g$n.wav"; add "g$n.wav"; add breath.wav; else sil "$pause" "$W/g$n.wav"; add "g$n.wav"; fi
done < "$D/lines.tsv"
ffmpeg -v error -y -f concat -safe 0 -i "$W/list.txt" -c:a pcm_s16le "$W/dry.wav"
ffmpeg -v error -y -i "$W/dry.wav" -af "highpass=f=60,equalizer=f=180:t=q:w=1:g=1,deesser=i=0.2,acompressor=threshold=-24dB:ratio=1.6:attack=20:release=250:makeup=1,loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 256k "$D/$OUTN.m4a"
echo "$OUTN $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$D/$OUTN.m4a")s"
