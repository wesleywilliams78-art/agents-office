#!/bin/bash
# Tuesday Edition 02 (Sweden): render_v2.sh adapted for this PC (Git Bash). Paths, PAGE, audio and output names updated;
# frames come from win/render.mjs (the Node port of render.py: 60 fps, 4 subframes, tmix), then mux with the mix.
set -e
cd "$(dirname "$0")"
PAGE=sweden-motion.html; AUDIO=audio-sweden.wav; OUT=out
mkdir -p $OUT
for spec in "1440 1440 1x1" "1080 1350 4x5" "1080 1920 9x16" "1920 1080 16x9"; do
  set -- $spec
  node win/render.mjs $PAGE $1 $2 $OUT/$3.mp4 3
  ffmpeg -y -loglevel error -i $OUT/$3/video.mp4 -i $AUDIO -map 0:v -map 1:a -c:v libx264 -profile:v high -preset slow -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -t 60 -movflags +faststart "$OUT/WRW-Sweden-Franchise-Entry-motion-$3.mp4"
  echo "done $3 $(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT/WRW-Sweden-Franchise-Entry-motion-$3.mp4) frames"
done
