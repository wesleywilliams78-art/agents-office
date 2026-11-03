#!/bin/bash
# build-passage.sh <passage dir> <voice> <tempo> [lines subfolder] [out name] : trims, slows, spaces and breathes the lines, then finishes the mix
D="$1"; V="$2"; TEMPO="${3:-0.9}"; SRC="${4:-$V}"; OUTN="${5:-$V-passage}"; W="$D/work/$V"; rm -rf "$W"; mkdir -p "$W"
F="aresample=48000,aformat=channel_layouts=mono:sample_fmts=s16"
sil(){ ffmpeg -v error -y -f lavfi -t "$(awk "BEGIN{print $1/1000}")" -i "anullsrc=r=48000:cl=mono" -af "$F" "$2"; }
# a soft inhale: pink noise, band-limited, swelling in and falling away
ffmpeg -v error -y -f lavfi -t 0.45 -i "anoisesrc=color=pink:amplitude=0.5:seed=3" -af "highpass=f=450,lowpass=f=2600,equalizer=f=1300:t=q:w=1:g=4,afade=t=in:d=0.3:curve=qsin,afade=t=out:st=0.32:d=0.13,volume=-33dB,$F" "$W/breath.wav"
: > "$W/list.txt"; add(){ echo "file '$1'" >> "$W/list.txt"; }
sil 480 "$W/lead.wav"; add lead.wav; add breath.wav
i=0
while IFS=$'\t' read -r pause breath text; do i=$((i+1)); n=$(printf %02d $i)
  ffmpeg -v error -y -i "$D/lines/$SRC/$n.wav" -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,$F,rubberband=tempo=$TEMPO:formant=preserved:pitchq=quality:window=standard,$F" "$W/$n.wav"
  add "$n.wav"
  if [ "$breath" = "1" ]; then sil $((pause-450)) "$W/g$n.wav"; add "g$n.wav"; add breath.wav; else sil "$pause" "$W/g$n.wav"; add "g$n.wav"; fi
done < "$D/lines.tsv"
ffmpeg -v error -y -f concat -safe 0 -i "$W/list.txt" -c:a pcm_s16le "$W/dry.wav"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/dry.wav")
ffmpeg -v error -y -i "$W/dry.wav" -f lavfi -t "$DUR" -i "anoisesrc=color=brown:amplitude=0.003:seed=5" -filter_complex "[0:a]highpass=f=55,equalizer=f=160:t=q:w=1.1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=-1.5,deesser=i=0.35,acompressor=threshold=-20dB:ratio=2.2:attack=6:release=180:makeup=2[v];[1:a]aresample=48000,lowpass=f=900[r];[v][r]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000[o]" -map "[o]" -c:a aac -b:a 192k "$D/$OUTN.m4a"
echo "$V $(printf %.1f $DUR)s"
