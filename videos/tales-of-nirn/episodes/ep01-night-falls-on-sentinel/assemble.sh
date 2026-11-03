#!/bin/bash
# assemble.sh <frames dir> <start s> <end s> <out.mp4> [title]
# 12 fps renders -> 24 fps (each pose held two frames), the narration for that stretch, and the title card on the first part.
# The title card is fully up on frame 0 (it is the cover) and fades out over the first line.
FR="$1"; A="$2"; B="$3"; OUT="$4"; TITLE="${5:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"; NAR="$HERE/narration/ep01-narration.m4a"
DUR=$(awk "BEGIN{print $B-$A}")
FONT="C\\:/Windows/Fonts/CENTAUR.TTF"; FONTI="C\\:/Windows/Fonts/BELLI.TTF"
VF="fps=24,format=yuv420p"
if [ -n "$TITLE" ]; then
  VF="fps=24,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.7:t=fill:enable='lt(t,3.9)',\
drawtext=fontfile='$FONTI':text='Tales of Nirn':fontcolor=0xE8D9B8:fontsize=h*0.055:x=(w-tw)/2:y=h*0.31:alpha='if(lt(t,3.0),1,max(0,1-(t-3.0)/0.9))',\
drawtext=fontfile='$FONT':text='$TITLE':fontcolor=0xF2E6CC:fontsize=h*0.12:x=(w-tw)/2:y=h*0.45:alpha='if(lt(t,3.0),1,max(0,1-(t-3.0)/0.9))',\
drawtext=fontfile='$FONTI':text='a book from the shelves of Skyrim':fontcolor=0xB9A888:fontsize=h*0.038:x=(w-tw)/2:y=h*0.6:alpha='if(lt(t,3.0),0.9,max(0,0.9-(t-3.0)/0.9))',\
format=yuv420p"
fi
ffmpeg -v error -y -framerate 12 -i "$FR/f_%04d.png" -ss "$A" -t "$DUR" -i "$NAR" \
  -vf "$VF" -af "afade=t=in:d=0.05,afade=t=out:st=$(awk "BEGIN{print $DUR-1.2}"):d=1.2" \
  -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "wrote $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
