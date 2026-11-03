#!/bin/bash
# cut.sh <start s> <end s> <out.mp4> <first|middle|last|full> [vertical]
# The living still (still/motion/loop.mp4, a seamless loop), the narration on top, the fire bed under it (crackle only, Wesley 2 Nov), and the type:
#  - first/full: the title card, fully up on frame 0 (the cover), fading over the first line;
#  - always: the banner (book title, rule, TALES OF NIRN), arriving as the title card leaves, or there from frame 0;
#  - last/full: the rights line for the final seconds.
# vertical: a 1080x1920 Reel from the tall loop (the scene with its ceiling and floor painted in).
A="$1"; B="$2"; OUT="$3"; MODE="$4"; VERT="${5:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LOOP="$HERE/still/motion/loop.mp4"; NAR="${NAR:-$HERE/narration/ep02-narration.m4a}"   # take A, clean chain (2 Nov)
# the fire: real-sounding crackle (generated locally with LTX audio, rumble filtered out), far behind the voice,
# and ducked further while she speaks so it only breathes in the pauses (Wesley, 2 Nov: "sit very loosely in the background")
BED="${BED:-$HERE/../ep01-night-falls-on-sentinel/sound/fire/fire-bed.wav}"   # the same natural campfire crackle
BEDVOL="${BEDVOL:-1.2}"   # the level Wesley approved on Reel 1
DUR=$(awk "BEGIN{print $B-$A}")
if [ "$VERT" = "vertical" ]; then T="$HERE/titles/vertical"; W=1080; H=1920
  # the tall loop: the same scene, with its ceiling painted above and its floor below (still/key-9x16.png)
  LOOP="$HERE/still/motion/loop-9x16.mp4"; PIC="[0:v]format=rgba[pic]"
else T="$HERE/titles"; W=1920; H=1080; PIC="[0:v]format=rgba[pic]"; fi
case "$MODE" in first|full) CARD=1;; *) CARD=0;; esac
case "$MODE" in last|full) END=1;; *) END=0;; esac
ES=$(awk "BEGIN{print $DUR-7}")
# the end card: the rights line, plus "next in the library" when titles/next/ exists (the last part of an episode)
EC="$T/endcard.png"; TN="${T/\/titles/\/titles\/next}"; [ -f "$TN/endcard.png" ] && EC="$TN/endcard.png"

F="$PIC"; L="pic"
if [ $CARD = 1 ]; then
  F="$F;color=c=black:s=${W}x${H}:r=24:d=4,format=rgba,colorchannelmixer=aa=0.55,fade=t=out:st=3.0:d=0.9:alpha=1[dim];[$L][dim]overlay=eof_action=pass[c1]"
  F="$F;[3:v]format=rgba,fade=t=out:st=3.0:d=0.9:alpha=1[tc];[c1][tc]overlay=eof_action=pass[c2]"
  F="$F;[4:v]format=rgba,fade=t=in:st=3.9:d=1.0:alpha=1[bn];[c2][bn]overlay[c3]"; L="c3"
else
  F="$F;[4:v]format=rgba[bn];[$L][bn]overlay[c3]"; L="c3"
fi
if [ $END = 1 ]; then F="$F;[5:v]format=rgba,fade=t=in:st=$ES:d=1.5:alpha=1[ec];[$L][ec]overlay[c4]"; L="c4"; fi
# captions, burned in (Wesley, 2 Nov: legible, Skyrim-style, low over the table; never rely on Instagram's own)
mkdir -p "$HERE/captions"; CAP="$HERE/captions/cut-$$.ass"
CF=(--from "$A" --to "$B"); [ "$VERT" = "vertical" ] && CF+=(--vertical --margin 70) || CF+=(--margin 26)   # below the campfire
[ $CARD = 1 ] && CF+=(--skip-first)
CF+=(--speed 1.0)   # this episode is read at normal speed (Wesley, 3 Nov)
python -I "$HERE/../../captions.py" "$(dirname "$NAR")" "$CAP" "${CF[@]}" >/dev/null
CAPW="$(cd "$HERE/captions" && pwd -W)/cut-$$.ass"; CAPW="${CAPW/:/\\:}"
F="$F;[$L]subtitles='$CAPW':fontsdir='C\:/Windows/Fonts',format=yuv420p[v]"

ffmpeg -v error -y -stream_loop -1 -i "$LOOP" -ss "$A" -t "$DUR" -i "$NAR" -ss "$A" -t "$DUR" -i "$BED" \
  -loop 1 -t "$DUR" -i "$T/titlecard.png" -loop 1 -t "$DUR" -i "$T/banner.png" -loop 1 -t "$DUR" -i "$EC" \
  -filter_complex "[1:a]aresample=48000,asplit=2[n][sc];[2:a]aresample=48000,volume=$BEDVOL[b0];[b0][sc]sidechaincompress=threshold=0.012:ratio=8:attack=40:release=900:knee=4[b];[n][b]amix=inputs=2:duration=longest:normalize=0,afade=t=in:d=0.4,afade=t=out:st=$(awk "BEGIN{print $DUR-1.5}"):d=1.5,alimiter=limit=0.84:level=false[a];$F" \
  -map "[v]" -map "[a]" -t "$DUR" -r 24 -c:v libx264 -crf 16 -preset slow -tune film -c:a aac -b:a 192k -movflags +faststart "$OUT"
rm -f "$CAP"; echo "wrote $(basename "$OUT") ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
